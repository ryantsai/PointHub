using Microsoft.EntityFrameworkCore;
using PointHub.Domain.Common;
using PointHub.Domain.Employees;
using PointHub.Infrastructure.Persistence;

namespace PointHub.Infrastructure.Services;

/// <summary>
/// The two ways an employee record comes into existence (decision D-02 in docs/decisions.md):
/// the HR system pushes it through the integration API, or it is created provisionally the first time
/// someone signs in with single sign-on before HR has pushed them.
/// </summary>
public sealed class EmployeeDirectory(PointHubDbContext db, TimeProvider clock)
{
    public sealed record Profile(string DisplayName, string Email, string? Department, bool IsActive);

    /// <summary>HR push: create or update by employee number. Returns whether a new record was created.</summary>
    public async Task<(Employee Employee, bool Created)> UpsertFromHrAsync(string employeeNo, Profile profile, string source, CancellationToken ct)
    {
        var employee = await db.Employees.FirstOrDefaultAsync(e => e.EmployeeNo == employeeNo, ct);
        var sameEmail = await db.Employees.FirstOrDefaultAsync(e => e.Email == profile.Email && e.EmployeeNo != employeeNo, ct);

        if (employee is null && sameEmail is { IsProvisional: true })
        {
            // The person signed in before HR pushed them: keep their record (and any points) and give it the real number.
            employee = sameEmail;
            employee.EmployeeNo = employeeNo;
            sameEmail = null;
        }
        if (sameEmail is not null)
            throw new DomainException(ErrorCodes.EmailInUse, $"The email address already belongs to employee {sameEmail.EmployeeNo}.");

        var created = employee is null;
        if (employee is null)
        {
            employee = new Employee { EmployeeNo = employeeNo, DisplayName = profile.DisplayName, Email = profile.Email, CreatedAt = clock.GetUtcNow() };
            db.Employees.Add(employee);
        }

        employee.DisplayName = profile.DisplayName;
        employee.Email = profile.Email;
        employee.Department = profile.Department;
        employee.IsActive = profile.IsActive;
        employee.IsProvisional = false;

        db.Audit(null, created ? "employee.create" : "employee.update", nameof(Employee), employeeNo, $"by {source}; active {profile.IsActive}", clock);
        await db.SaveChangesAsync(ct);
        return (employee, created);
    }

    /// <summary>
    /// Makes the people listed in Auth:BootstrapAdminEmails administrators when they sign in. This is how the
    /// first admin of a new installation gets in; everyone else is granted roles by an existing admin.
    /// </summary>
    public async Task EnsureBootstrapAdminAsync(Employee employee, CancellationToken ct)
    {
        if (employee.Roles.HasFlag(EmployeeRoles.SystemAdmin)) return;
        employee.Roles |= EmployeeRoles.SystemAdmin;
        db.Audit(null, "employee.bootstrap-admin", nameof(Employee), employee.EmployeeNo, "Listed in Auth:BootstrapAdminEmails", clock);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Single sign-on: find the employee for an authenticated identity, or create a provisional one.
    /// Returns null when the person may not sign in (deactivated, or unknown and auto-creation is off).
    /// </summary>
    public async Task<Employee?> ResolveForSignInAsync(string email, string? employeeNoClaim, string? displayName, bool autoCreate, CancellationToken ct)
    {
        var employee = await db.Employees.Include(e => e.Account).FirstOrDefaultAsync(e => e.Email == email, ct);
        if (employee is null && !string.IsNullOrWhiteSpace(employeeNoClaim))
            employee = await db.Employees.Include(e => e.Account).FirstOrDefaultAsync(e => e.EmployeeNo == employeeNoClaim, ct);

        if (employee is not null) return employee.IsActive ? employee : null;
        if (!autoCreate) return null;

        // Without an employee-number claim the mailbox name stands in until HR pushes the real number.
        var employeeNo = string.IsNullOrWhiteSpace(employeeNoClaim) ? email.Split('@')[0] : employeeNoClaim.Trim();
        employee = new Employee
        {
            EmployeeNo = employeeNo.Length > 32 ? employeeNo[..32] : employeeNo,
            DisplayName = string.IsNullOrWhiteSpace(displayName) ? email : displayName,
            Email = email,
            IsProvisional = true,
            CreatedAt = clock.GetUtcNow(),
        };
        db.Employees.Add(employee);
        db.Audit(null, "employee.auto-create", nameof(Employee), employee.EmployeeNo, "First single sign-on", clock);
        await db.SaveChangesAsync(ct);
        return employee;
    }
}
