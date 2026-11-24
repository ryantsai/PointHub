using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.EntityFrameworkCore;
using PointHub.Domain.Employees;
using PointHub.Domain.Integration;
using PointHub.Infrastructure.Persistence;
using PointHub.Infrastructure.Services;

namespace PointHub.Api.Auth;

public sealed class AuthOptions
{
    public const string Section = "Auth";

    /// <summary>One-click sign-in as any seeded employee. Development only; the app refuses to start with it in Production.</summary>
    public bool DevLoginEnabled { get; set; }

    /// <summary>Email addresses that become administrators when they sign in with SSO (bootstraps the first admins).</summary>
    public string[] BootstrapAdminEmails { get; set; } = [];
    public OidcOptions Oidc { get; set; } = new();

    public bool OidcEnabled => !string.IsNullOrWhiteSpace(Oidc.Authority);
    public string Mode => OidcEnabled ? "oidc" : "dev";

    public sealed class OidcOptions
    {
        public string? Authority { get; set; }
        public string? ClientId { get; set; }
        public string? ClientSecret { get; set; }
        /// <summary>Claim that carries the address matched against Employee.Email (falls back to preferred_username).</summary>
        public string EmailClaim { get; set; } = "email";

        /// <summary>Optional claim with the HR employee number, if the tenant is configured to emit one.</summary>
        public string EmployeeNoClaim { get; set; } = "employeeid";

        /// <summary>Create a provisional employee at first sign-in when HR has not pushed the person yet.</summary>
        public bool AutoCreateEmployees { get; set; } = true;
    }
}

public static class Policies
{
    public const string EventAdmin = "eventAdmin";
    public const string GiftAdmin = "giftAdmin";
    public const string SystemAdmin = "systemAdmin";
    public const string AdminRead = "adminRead";
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
        if (options.DevLoginEnabled && environment.IsProduction())
            throw new InvalidOperationException("Auth:DevLoginEnabled must not be set in Production.");
        if (!options.DevLoginEnabled && !options.OidcEnabled)
            throw new InvalidOperationException("No sign-in method configured: set Auth:Oidc:* (or Auth:DevLoginEnabled for local debugging).");
        services.AddSingleton(options);

        var auth = services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(cookie =>
        {
            cookie.Cookie.Name = "pointhub.auth";
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

        if (options.OidcEnabled)
        {
            auth.AddOpenIdConnect(oidc =>
            {
                oidc.Authority = options.Oidc.Authority;
                oidc.ClientId = options.Oidc.ClientId;
                oidc.ClientSecret = options.Oidc.ClientSecret;
                oidc.ResponseType = "code";
                oidc.CallbackPath = "/api/auth/callback";
                oidc.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                oidc.MapInboundClaims = false;
                oidc.Scope.Add("email");
                oidc.Scope.Add("profile");
                oidc.Events.OnTokenValidated = context => MapToEmployeeAsync(context, options);
            });
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
            .AddPolicy(Policies.EventAdmin, p => p.RequireRole(RoleName.EventAdmin, RoleName.SystemAdmin))
            .AddPolicy(Policies.GiftAdmin, p => p.RequireRole(RoleName.GiftAdmin, RoleName.SystemAdmin))
            .AddPolicy(Policies.SystemAdmin, p => p.RequireRole(RoleName.SystemAdmin))
            .AddPolicy(Policies.AdminRead, p => p.RequireRole(RoleName.SystemAdmin, RoleName.Auditor));
        return services;
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
        var oidc = options.Oidc;
        var identity = context.Principal;
        var email = identity?.FindFirstValue(oidc.EmailClaim) ?? identity?.FindFirstValue("preferred_username");
        var directory = context.HttpContext.RequestServices.GetRequiredService<EmployeeDirectory>();
        var employee = string.IsNullOrWhiteSpace(email)
            ? null
            : await directory.ResolveForSignInAsync(email.Trim(), identity?.FindFirstValue(oidc.EmployeeNoClaim), identity?.FindFirstValue("name"),
                oidc.AutoCreateEmployees, context.HttpContext.RequestAborted);

        if (employee is null)
        {
            context.Fail("No active PointHub employee matches this account.");
            return;
        }
        if (options.BootstrapAdminEmails.Contains(employee.Email, StringComparer.OrdinalIgnoreCase))
            await directory.EnsureBootstrapAdminAsync(employee, context.HttpContext.RequestAborted);

        var clock = context.HttpContext.RequestServices.GetRequiredService<TimeProvider>();
        context.Principal = CreatePrincipal(employee, clock.GetUtcNow());
    }
}
