using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
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

        auth.MapGet("/login", (string? returnUrl, AuthOptions options) => options.OidcEnabled
            ? Results.Challenge(new AuthenticationProperties { RedirectUri = LocalUrlOrRoot(returnUrl) }, [OpenIdConnectDefaults.AuthenticationScheme])
            : ApiProblem.NotFound("Single sign-on")).AllowAnonymous();

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
        auth.Mode,
        string.IsNullOrWhiteSpace(site.Value.PublicBaseUrl) ? null : site.Value.PublicBaseUrl.TrimEnd('/'),
        await themes.GetActiveThemeAsync(ct),
        Locales.All,
        site.Value.DefaultLocale);

    /// <summary>Only same-site paths are accepted as a post-login destination (no open redirect).</summary>
    private static string LocalUrlOrRoot(string? url) =>
        url is ['/', ..] && !url.StartsWith("//", StringComparison.Ordinal) && !url.StartsWith("/\\", StringComparison.Ordinal) ? url : "/";
}
