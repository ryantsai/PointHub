using System.Globalization;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PointHub.Domain.Integration;
using PointHub.Infrastructure.Persistence;

namespace PointHub.Api.Auth;

/// <summary>
/// Authenticates other applications on /api/integration with a key issued in the admin UI
/// (<c>X-Api-Key: phk_...</c> or <c>Authorization: Bearer phk_...</c>). Employees never use this scheme.
/// </summary>
public sealed class ApiKeyAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder, PointHubDbContext db)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "ApiKey";
    public const string HeaderName = "X-Api-Key";
    public const string ClientIdClaim = "pointhub:api_client_id";
    public const string ScopeClaim = "scope";
    private static readonly TimeSpan LastUsedResolution = TimeSpan.FromMinutes(1);

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var apiKey = ReadKey();
        if (apiKey is null) return AuthenticateResult.NoResult();
        if (!apiKey.StartsWith(ApiClient.KeyPrefixMarker, StringComparison.Ordinal)) return AuthenticateResult.Fail("Malformed API key.");

        var hash = ApiClient.Hash(apiKey);
        var now = TimeProvider.GetUtcNow();
        var client = await db.ApiClients.AsNoTracking().FirstOrDefaultAsync(c => c.KeyHash == hash, Context.RequestAborted);
        if (client is null || !client.IsUsable(now)) return AuthenticateResult.Fail("Unknown, revoked or expired API key.");

        // Good enough for "is this key still in use?" without a write on every request.
        if (client.LastUsedAt is null || now - client.LastUsedAt > LastUsedResolution)
            await db.ApiClients.Where(c => c.Id == client.Id).ExecuteUpdateAsync(set => set.SetProperty(c => c.LastUsedAt, now), Context.RequestAborted);

        var identity = new ClaimsIdentity(SchemeName);
        identity.AddClaim(new Claim(ClientIdClaim, client.Id.ToString(CultureInfo.InvariantCulture)));
        identity.AddClaim(new Claim(ClaimTypes.Name, client.Name));
        identity.AddClaims(client.ScopeNames().Select(scope => new Claim(ScopeClaim, scope)));
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName));
    }

    private string? ReadKey()
    {
        if (Request.Headers.TryGetValue(HeaderName, out var header) && !string.IsNullOrWhiteSpace(header))
            return header.ToString().Trim();

        var authorization = Request.Headers.Authorization.ToString();
        return authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) ? authorization[7..].Trim() : null;
    }
}

public static class ApiKeyPrincipalExtensions
{
    public static int ApiClientId(this ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue(ApiKeyAuthenticationHandler.ClientIdClaim)!, CultureInfo.InvariantCulture);
}
