using System.Security.Cryptography;
using System.Text;
using PointHub.Domain.Employees;

namespace PointHub.Domain.Integration;

[Flags]
public enum ApiScopes
{
    None = 0,
    PointsRead = 1,
    PointsWrite = 2,
    /// <summary>Create, update and deactivate employees (the HR system's sync).</summary>
    EmployeesWrite = 4,
}

/// <summary>
/// Another application that may call the integration API. The key itself is shown once at creation
/// and never stored: only its SHA-256 hash is kept, so a database leak does not leak usable keys.
/// (Keys are 256 bits of randomness, so a fast unsalted hash is appropriate, unlike for passwords.)
/// </summary>
public class ApiClient
{
    public const string KeyPrefixMarker = "phk_";
    private const int StoredPrefixLength = 12;

    public int Id { get; set; }
    public required string Name { get; set; }
    public required string KeyPrefix { get; set; }
    public required string KeyHash { get; set; }
    public ApiScopes Scopes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public int? CreatedById { get; set; }
    public Employee? CreatedBy { get; set; }
    public DateTimeOffset? LastUsedAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; private set; }

    public static (ApiClient Client, string ApiKey) Create(string name, ApiScopes scopes, DateTimeOffset? expiresAt, int createdById, DateTimeOffset now)
    {
        var apiKey = KeyPrefixMarker + Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');
        var client = new ApiClient
        {
            Name = name, KeyPrefix = apiKey[..StoredPrefixLength], KeyHash = Hash(apiKey),
            Scopes = scopes, ExpiresAt = expiresAt, CreatedById = createdById, CreatedAt = now,
        };
        return (client, apiKey);
    }

    public static string Hash(string apiKey) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(apiKey)));

    public bool IsUsable(DateTimeOffset now) => RevokedAt is null && (ExpiresAt is null || ExpiresAt > now);

    public void Revoke(DateTimeOffset now) => RevokedAt ??= now;

    public IEnumerable<string> ScopeNames()
    {
        if (Scopes.HasFlag(ApiScopes.PointsRead)) yield return ScopeName.PointsRead;
        if (Scopes.HasFlag(ApiScopes.PointsWrite)) yield return ScopeName.PointsWrite;
        if (Scopes.HasFlag(ApiScopes.EmployeesWrite)) yield return ScopeName.EmployeesWrite;
    }
}

public static class ScopeName
{
    public const string PointsRead = "points:read";
    public const string PointsWrite = "points:write";
    public const string EmployeesWrite = "employees:write";

    public static ApiScopes? Parse(IEnumerable<string> names)
    {
        var scopes = ApiScopes.None;
        foreach (var name in names)
        {
            switch (name)
            {
                case PointsRead: scopes |= ApiScopes.PointsRead; break;
                case PointsWrite: scopes |= ApiScopes.PointsWrite; break;
                case EmployeesWrite: scopes |= ApiScopes.EmployeesWrite; break;
                default: return null;
            }
        }
        return scopes == ApiScopes.None ? null : scopes;
    }
}
