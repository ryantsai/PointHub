using PointHub.Domain.Points;

namespace PointHub.Domain.Employees;

/// <summary>Elevated roles. Every signed-in employee can earn and spend points without any of these.</summary>
[Flags]
public enum EmployeeRoles
{
    None = 0,
    /// <summary>Runs events: creates them, imports rosters, approves check-ins. Sees only the events they run.</summary>
    EventAdmin = 1,
    /// <summary>Runs the gift catalogue: gifts, pictures, stock, and marking claims as fulfilled.</summary>
    GiftAdmin = 2,
    /// <summary>Everything, including the ledger, roles, API keys, themes and email.</summary>
    SystemAdmin = 4,
    Auditor = 8,
}

public class Employee
{
    public int Id { get; set; }

    /// <summary>The HR employee number. This is the key used for roster imports and directory sync.</summary>
    public required string EmployeeNo { get; set; }
    public required string DisplayName { get; set; }
    public required string Email { get; set; }
    public string? Department { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// True for a record created automatically at first single sign-on, before HR has pushed the employee.
    /// Its <see cref="EmployeeNo"/> is a placeholder until the HR system confirms the real one (matched by email).
    /// </summary>
    public bool IsProvisional { get; set; }
    public EmployeeRoles Roles { get; set; }
    public string? PreferredLocale { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public PointAccount Account { get; set; } = new();
    public List<EmployeeCard> Cards { get; set; } = [];

    /// <summary>Role names exactly as the API and the auth cookie carry them.</summary>
    public IEnumerable<string> RoleNames() => RoleNames(Roles);

    public static IEnumerable<string> RoleNames(EmployeeRoles roles)
    {
        if (roles.HasFlag(EmployeeRoles.EventAdmin)) yield return RoleName.EventAdmin;
        if (roles.HasFlag(EmployeeRoles.GiftAdmin)) yield return RoleName.GiftAdmin;
        if (roles.HasFlag(EmployeeRoles.SystemAdmin)) yield return RoleName.SystemAdmin;
        if (roles.HasFlag(EmployeeRoles.Auditor)) yield return RoleName.Auditor;
    }
}

public static class RoleName
{
    public const string EventAdmin = "eventAdmin";
    public const string GiftAdmin = "giftAdmin";
    public const string SystemAdmin = "systemAdmin";
    public const string Auditor = "auditor";

    /// <summary>Turns role names from the API into flags; null when a name is unknown. An empty list is a normal user.</summary>
    public static EmployeeRoles? Parse(IEnumerable<string> names)
    {
        var roles = EmployeeRoles.None;
        foreach (var name in names)
        {
            switch (name)
            {
                case EventAdmin: roles |= EmployeeRoles.EventAdmin; break;
                case GiftAdmin: roles |= EmployeeRoles.GiftAdmin; break;
                case SystemAdmin: roles |= EmployeeRoles.SystemAdmin; break;
                case Auditor: roles |= EmployeeRoles.Auditor; break;
                default: return null;
            }
        }
        return roles;
    }
}

/// <summary>An NFC / MIFARE card (usually the staff badge) bound to an employee.</summary>
public class EmployeeCard
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;

    /// <summary>Normalized by <see cref="CardUid.Normalize"/>. Unique across all cards.</summary>
    public required string Uid { get; set; }
    public string? Label { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset RegisteredAt { get; set; }
    public int? RegisteredById { get; set; }
}
