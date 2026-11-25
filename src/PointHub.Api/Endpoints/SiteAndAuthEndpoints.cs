using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PointHub.Api.Auth;
using PointHub.Api.Contracts;
using PointHub.Api.Http;
using PointHub.Domain.Common;
using PointHub.Infrastructure;
using PointHub.Infrastructure.Persistence;
using PointHub.Infrastructure.Services;

namespace PointHub.Api.Endpoints;

public static class SiteAndAuthEndpoints
{
    public static void MapSiteAndAuthEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/health", () => new { status = "ok" }).AllowAnonymous();
        api.MapGet("/site/config", GetSiteConfigAsync).AllowAnonymous();

        var auth = api.MapGroup("/auth");
        auth.MapGet("/me", async (ClaimsPrincipal user, PointHubDbContext db, CancellationToken ct) =>
            MeDto.From(await db.Employees.AsNoTracking().Include(e => e.Account).SingleAsync(e => e.Id == user.EmployeeId(), ct)))
            .RequireAuthorization();

        auth.MapPost("/logout", async (HttpContext http) =>
        {
            await http.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.NoContent();
        }).AllowAnonymous();

        // Single sign-on entry point. The browser navigates here (not fetch); it always ends in a redirect.
        auth.MapGet("/login", async (string? returnUrl, AuthOptions options, HttpContext http, CancellationToken ct) =>
        {
            var destination = LocalUrlOrRoot(returnUrl);
            switch (options.Mode)
            {
                case AuthMode.EntraId:
                    return Results.Challenge(new AuthenticationProperties { RedirectUri = destination }, [OpenIdConnectDefaults.AuthenticationScheme]);

                case AuthMode.Windows:
                    // First pass: no credentials yet, so answer 401 with "WWW-Authenticate: Negotiate". The browser
                    // repeats the request with the Windows identity (silently on a domain PC in the intranet zone).
                    var windows = await http.AuthenticateAsync(NegotiateDefaults.AuthenticationScheme);
                    if (!windows.Succeeded || windows.Principal is null)
                        return Results.Challenge(authenticationSchemes: [NegotiateDefaults.AuthenticationScheme]);

                    var account = http.RequestServices.GetRequiredService<WindowsAccountResolver>().Resolve(windows.Principal);
                    var principal = account is null ? null
                        : await http.RequestServices.GetRequiredService<SignInService>().ResolveAsync(account.Email, account.EmployeeNo, account.DisplayName, ct);
                    if (principal is null) return Results.LocalRedirect($"/login?error={SignInService.NoAccountError}");

                    await http.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);
                    return Results.LocalRedirect(destination);

                default:
                    return ApiProblem.NotFound("Single sign-on");
            }
        }).AllowAnonymous();

        auth.MapGet("/dev-users", async (AuthOptions options, PointHubDbContext db, CancellationToken ct) =>
        {
            if (!options.DevLoginEnabled) return ApiProblem.NotFound();
            var employees = await db.Employees.AsNoTracking().Where(e => e.IsActive).OrderBy(e => e.EmployeeNo).Take(50).ToListAsync(ct);
            return Results.Ok(employees.Select(e => new DevUserDto(e.EmployeeNo, e.DisplayName, e.RoleNames())));
        }).AllowAnonymous();

        auth.MapPost("/dev-login", async (DevLoginRequest request, AuthOptions options, PointHubDbContext db, TimeProvider clock, HttpContext http, CancellationToken ct) =>
        {
            if (!options.DevLoginEnabled) return ApiProblem.NotFound();
            var employee = await db.Employees.AsNoTracking().Include(e => e.Account)
                .FirstOrDefaultAsync(e => e.EmployeeNo == request.EmployeeNo && e.IsActive, ct);
            if (employee is null) return ApiProblem.NotFound("Employee");

            await http.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, AuthSetup.CreatePrincipal(employee, clock.GetUtcNow()));
            return Results.Ok(MeDto.From(employee));
        }).AllowAnonymous();
    }

    public static async Task<SiteConfigDto> GetSiteConfigAsync(IOptions<SiteOptions> site, AuthOptions auth, SiteThemeService themes, CancellationToken ct) => new(
        site.Value.AppName,
        auth.ClientMode,
        string.IsNullOrWhiteSpace(site.Value.PublicBaseUrl) ? null : site.Value.PublicBaseUrl.TrimEnd('/'),
        await themes.GetActiveThemeAsync(ct),
        Locales.All,
        site.Value.DefaultLocale);

    /// <summary>Only same-site paths are accepted as a post-login destination (no open redirect).</summary>
    private static string LocalUrlOrRoot(string? url) =>
        url is ['/', ..] && !url.StartsWith("//", StringComparison.Ordinal) && !url.StartsWith("/\\", StringComparison.Ordinal) ? url : "/";
}
