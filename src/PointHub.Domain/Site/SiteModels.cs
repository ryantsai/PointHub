using PointHub.Domain.Employees;

namespace PointHub.Domain.Site;

/// <summary>Small key/value store for runtime-editable settings (e.g. the admin theme override).</summary>
public class SiteSetting
{
    public const string ThemeMode = "theme.mode";
    public const string ThemeForced = "theme.forced";
    public const string ThemeDisabled = "theme.disabled";
    public const string EmailDisabledTemplates = "email.disabled";

    public required string Key { get; set; }
    public string? Value { get; set; }
}

/// <summary>Append-only record of every privileged or point-affecting action.</summary>
public class AuditLog
{
    public long Id { get; set; }
    public int? ActorId { get; set; }
    public Employee? Actor { get; set; }
    public required string Action { get; set; }
    public required string EntityType { get; set; }
    public string? EntityId { get; set; }
    public string? Summary { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
