using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using PointHub.Domain.Employees;
using PointHub.Domain.Integration;
using PointHub.Infrastructure.Persistence;
using PointHub.Infrastructure.Services;

namespace PointHub.Api.Auth;

/// <summary>How employees sign in. Exactly one mode is active; it is chosen in configuration (<c>Auth:Mode</c>).</summary>
public enum AuthMode
{
    /// <summary>Password-less sign-in as a sample person. Local debugging only; refused in Production.</summary>
    Dev = 0,
    /// <summary>Microsoft Entra ID single sign-on (OpenID Connect).</summary>
    EntraId = 1,
    /// <summary>Integrated Windows authentication against on-premises Active Directory (IIS, or Kestrel with Negotiate).</summary>
    Windows = 2,
}

public sealed class AuthOptions
{
    public const string Section = "Auth";

    public AuthMode Mode { get; set; } = AuthMode.EntraId;

    /// <summary>Email addresses that become system admins when they sign in (bootstraps the first admins). Both SSO modes.</summary>
    public string[] BootstrapAdminEmails { get; set; } = [];

    /// <summary>Create a provisional employee at first sign-in when HR has not pushed the person yet. Both SSO modes.</summary>
    public bool AutoCreateEmployees { get; set; } = true;

    public EntraIdOptions EntraId { get; set; } = new();
    public WindowsOptions Windows { get; set; } = new();

    public bool DevLoginEnabled => Mode == AuthMode.Dev;

    /// <summary>The value the web client sees in <c>SiteConfig.authMode</c>.</summary>
    public string ClientMode => Mode switch { AuthMode.EntraId => "oidc", AuthMode.Windows => "windows", _ => "dev" };

    public sealed class EntraIdOptions
    {
        /// <summary>Directory (tenant) id. Used to build the authority unless <see cref="Authority"/> is set.</summary>
        public string? TenantId { get; set; }
        /// <summary>Full authority URL; overrides <see cref="TenantId"/> (sovereign clouds, or another OpenID Connect provider).</summary>
        public string? Authority { get; set; }
        public string? ClientId { get; set; }
        public string? ClientSecret { get; set; }
        /// <summary>Claim that carries the address matched against Employee.Email (falls back to preferred_username).</summary>
        public string EmailClaim { get; set; } = "email";
        /// <summary>Optional claim with the HR employee number, if the tenant is configured to emit one.</summary>
        public string EmployeeNoClaim { get; set; } = "employeeid";

        public string? ResolvedAuthority => !string.IsNullOrWhiteSpace(Authority) ? Authority
            : !string.IsNullOrWhiteSpace(TenantId) ? $"https://login.microsoftonline.com/{TenantId}/v2.0" : null;
    }

    public sealed class WindowsOptions
    {
        /// <summary>Read mail, employeeID and displayName of the signed-in account from Active Directory.</summary>
        public bool UseDirectoryLookup { get; set; } = true;
        /// <summary>
        /// Fallback when the directory gives no address (or the lookup is off): the email is taken to be
        /// <c>{logon name}@{EmailDomain}</c>. Leave empty to refuse sign-in when no address can be found.
        /// </summary>
        public string? EmailDomain { get; set; }
        /// <summary>NetBIOS domain names whose accounts may sign in. Empty = any domain the server trusts.</summary>
        public string[] AllowedDomains { get; set; } = [];
    }
}

public static class Policies
{
    public const string EventAdmin = "eventAdmin";
    public const string GiftAdmin = "giftAdmin";
    public const string SystemAdmin = "systemAdmin";
    public const string AdminRead = "adminRead";
    /// <summary>May look at claims: gift admins and system admins, plus auditors (read-only).</summary>
    public const string ClaimsRead = "claimsRead";
    public const string IntegrationRead = "integration:read";
    public const string IntegrationWrite = "integration:write";
    public const string IntegrationEmployees = "integration:employees";
}

public static class AuthSetup
{
    private const string ValidatedAtClaim = "pointhub:validated_at";
    private static readonly TimeSpan RevalidateAfter = TimeSpan.FromMinutes(5);

    public static IServiceCollection AddPointHubAuth(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        var options = configuration.GetSection(AuthOptions.Section).Get<AuthOptions>() ?? new AuthOptions();
        switch (options.Mode)
        {
            case AuthMode.Dev when environment.IsProduction():
                throw new InvalidOperationException("Auth:Mode 'Dev' must not be used in Production. Use 'EntraId' or 'Windows'.");
            case AuthMode.EntraId when options.EntraId.ResolvedAuthority is null || string.IsNullOrWhiteSpace(options.EntraId.ClientId):
                throw new InvalidOperationException("Auth:Mode is 'EntraId' but Auth:EntraId:TenantId (or Authority) and Auth:EntraId:ClientId are not set.");
        }
        services.AddSingleton(options);
        services.AddScoped<SignInService>();

        var auth = services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(cookie =>
        {
            cookie.Cookie.Name = "pointhub.auth";
            cookie.CookieManager = new FirstCookieManager(); // in a folder, a same-named cookie from "/" must not win
            cookie.Cookie.HttpOnly = true;
            cookie.Cookie.SameSite = SameSiteMode.Lax; // Lax, not Strict: the OIDC redirect back must carry the cookie
            cookie.Cookie.SecurePolicy = environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            cookie.ExpireTimeSpan = TimeSpan.FromHours(12);
            cookie.SlidingExpiration = true;
            // This is an API for a SPA: answer with status codes, never with redirects to a login page.
            cookie.Events.OnRedirectToLogin = context => { context.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
            cookie.Events.OnRedirectToAccessDenied = context => { context.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; };
            cookie.Events.OnValidatePrincipal = RevalidateAsync;
        });

        // Either single sign-on only establishes who the person is. The session itself is always PointHub's own
        // cookie, issued after the identity has been matched to an employee, so the rest of the API is the same
        // in every mode.
        if (options.Mode == AuthMode.EntraId)
        {
            auth.AddOpenIdConnect(oidc =>
            {
                oidc.Authority = options.EntraId.ResolvedAuthority;
                oidc.ClientId = options.EntraId.ClientId;
                oidc.ClientSecret = options.EntraId.ClientSecret;
                oidc.ResponseType = "code";
                oidc.CallbackPath = "/api/auth/callback";
                oidc.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                oidc.MapInboundClaims = false;
                oidc.Scope.Add("email");
                oidc.Scope.Add("profile");
                oidc.Events.OnTokenValidated = context => MapToEmployeeAsync(context, options);
                // Back to the SPA's sign-in page with a reason, instead of an error page from the middleware.
                oidc.Events.OnRemoteFailure = context =>
                {
                    var reason = context.Failure?.Message == SignInService.NoAccountMessage ? SignInService.NoAccountError : SignInService.FailedError;
                    context.Response.Redirect($"{context.Request.PathBase}/login?error={reason}");
                    context.HandleResponse();
                    return Task.CompletedTask;
                };
            });
        }
        else if (options.Mode == AuthMode.Windows)
        {
            // Under IIS this hands over to IIS's own Windows authentication; on Kestrel it speaks Negotiate itself.
            // It is only ever used by the /api/auth/login endpoint, never as the default scheme.
            auth.AddNegotiate();
            services.AddSingleton<WindowsAccountResolver>();
        }

        auth.AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>(ApiKeyAuthenticationHandler.SchemeName, null);

        services.AddAuthorizationBuilder()
            // Integration policies name the API-key scheme explicitly, so a browser cookie can never satisfy
            // them and an API key can never satisfy the employee/admin policies below (default scheme: cookie).
            .AddPolicy(Policies.IntegrationRead, p => p.AddAuthenticationSchemes(ApiKeyAuthenticationHandler.SchemeName)
                .RequireClaim(ApiKeyAuthenticationHandler.ScopeClaim, ScopeName.PointsRead))
            .AddPolicy(Policies.IntegrationWrite, p => p.AddAuthenticationSchemes(ApiKeyAuthenticationHandler.SchemeName)
                .RequireClaim(ApiKeyAuthenticationHandler.ScopeClaim, ScopeName.PointsWrite))
            .AddPolicy(Policies.IntegrationEmployees, p => p.AddAuthenticationSchemes(ApiKeyAuthenticationHandler.SchemeName)
                .RequireClaim(ApiKeyAuthenticationHandler.ScopeClaim, ScopeName.EmployeesWrite))
            // Employee and admin endpoints accept only PointHub's own session cookie. Any other identity on the
            // request (IIS puts the Windows account there whenever the browser sends Windows credentials) gets a
            // 401, so the web app starts a sign-in instead of an endpoint failing on a missing employee id.
            .SetDefaultPolicy(SessionPolicy().Build())
            .AddPolicy(Policies.EventAdmin, SessionPolicy(RoleName.EventAdmin, RoleName.SystemAdmin).Build())
            .AddPolicy(Policies.GiftAdmin, SessionPolicy(RoleName.GiftAdmin, RoleName.SystemAdmin).Build())
            .AddPolicy(Policies.SystemAdmin, SessionPolicy(RoleName.SystemAdmin).Build())
            .AddPolicy(Policies.AdminRead, SessionPolicy(RoleName.SystemAdmin, RoleName.Auditor).Build())
            .AddPolicy(Policies.ClaimsRead, SessionPolicy(RoleName.GiftAdmin, RoleName.SystemAdmin, RoleName.Auditor).Build());

        // Belt and braces for IIS: never let the server put the Windows account on HttpContext.User by itself.
        // /api/auth/login still asks for it explicitly (Negotiate defers to IIS) to establish the session.
        services.Configure<IISServerOptions>(iis => iis.AutomaticAuthentication = false); // in-process hosting
        services.Configure<IISOptions>(iis => iis.AutomaticAuthentication = false);       // out-of-process hosting
        return services;
    }

    /// <summary>
    /// A signed-in employee: authenticated by the session cookie (not whatever else is on the request) and carrying
    /// the employee id that every endpoint reads, plus one of <paramref name="roles"/> when any are given.
    /// </summary>
    public static AuthorizationPolicyBuilder SessionPolicy(params string[] roles)
    {
        var policy = new AuthorizationPolicyBuilder(CookieAuthenticationDefaults.AuthenticationScheme)
            .RequireAuthenticatedUser()
            .RequireClaim(ClaimTypes.NameIdentifier);
        return roles.Length > 0 ? policy.RequireRole(roles) : policy;
    }

    /// <summary>The cookie identity: employee id, display name and roles. Nothing else is trusted from the cookie.</summary>
    public static ClaimsPrincipal CreatePrincipal(Employee employee, DateTimeOffset now)
    {
        var identity = new ClaimsIdentity(CookieAuthenticationDefaults.AuthenticationScheme, ClaimTypes.Name, ClaimTypes.Role);
        identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, employee.Id.ToString(CultureInfo.InvariantCulture)));
        identity.AddClaim(new Claim(ClaimTypes.Name, employee.DisplayName));
        identity.AddClaim(new Claim(ValidatedAtClaim, now.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture)));
        identity.AddClaims(employee.RoleNames().Select(role => new Claim(ClaimTypes.Role, role)));
        return new ClaimsPrincipal(identity);
    }

    public static int EmployeeId(this ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!, CultureInfo.InvariantCulture);

    /// <summary>
    /// Every few minutes re-reads the employee so a deactivated account is signed out and a role change
    /// (granted or revoked) takes effect without waiting for the cookie to expire.
    /// </summary>
    private static async Task RevalidateAsync(CookieValidatePrincipalContext context)
    {
        var clock = context.HttpContext.RequestServices.GetRequiredService<TimeProvider>();
        var now = clock.GetUtcNow();
        var stamp = context.Principal?.FindFirstValue(ValidatedAtClaim);
        if (long.TryParse(stamp, CultureInfo.InvariantCulture, out var seconds)
            && now - DateTimeOffset.FromUnixTimeSeconds(seconds) < RevalidateAfter)
            return;

        var db = context.HttpContext.RequestServices.GetRequiredService<PointHubDbContext>();
        var id = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        var employee = int.TryParse(id, CultureInfo.InvariantCulture, out var employeeId)
            ? await db.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == employeeId, context.HttpContext.RequestAborted)
            : null;

        if (employee is not { IsActive: true })
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return;
        }
        context.ReplacePrincipal(CreatePrincipal(employee, now));
        context.ShouldRenew = true;
    }

    /// <summary>Swaps the identity provider's claims for the matching PointHub employee, or fails the sign-in.</summary>
    private static async Task MapToEmployeeAsync(TokenValidatedContext context, AuthOptions options)
    {
        var entra = options.EntraId;
        var identity = context.Principal;
        var email = identity?.FindFirstValue(entra.EmailClaim) ?? identity?.FindFirstValue("preferred_username");
        var signIn = context.HttpContext.RequestServices.GetRequiredService<SignInService>();
        var principal = await signIn.ResolveAsync(email, identity?.FindFirstValue(entra.EmployeeNoClaim), identity?.FindFirstValue("name"),
            context.HttpContext.RequestAborted);

        if (principal is null) context.Fail(SignInService.NoAccountMessage);
        else context.Principal = principal;
    }
}

/// <summary>
/// The step both single sign-on modes share: turn "the identity provider says this is X" into a PointHub
/// session for the matching employee, creating a provisional employee or a bootstrap admin where configured.
/// </summary>
public sealed class SignInService(EmployeeDirectory directory, AuthOptions options, TimeProvider clock)
{
    public const string NoAccountMessage = "No active PointHub employee matches this account.";
    /// <summary>Values of <c>/login?error=</c> that the web client translates.</summary>
    public const string NoAccountError = "no_account";
    public const string FailedError = "sign_in_failed";

    /// <summary>Returns the cookie principal, or null when this person may not sign in.</summary>
    public async Task<ClaimsPrincipal?> ResolveAsync(string? email, string? employeeNo, string? displayName, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(email)) return null;

        var employee = await directory.ResolveForSignInAsync(email.Trim(), employeeNo, displayName, options.AutoCreateEmployees, ct);
        if (employee is null) return null;

        if (options.BootstrapAdminEmails.Contains(employee.Email, StringComparer.OrdinalIgnoreCase))
            await directory.EnsureBootstrapAdminAsync(employee, ct);
        return AuthSetup.CreatePrincipal(employee, clock.GetUtcNow());
    }
}
