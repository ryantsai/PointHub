using PointHub.Domain.Employees;

namespace PointHub.Domain.Events;

public readonly record struct RosterRow(string EmployeeNo, string? Name, string? Email);

public readonly record struct RosterMatch(RosterRow Row, RosterMatchStatus Status, Employee? Employee);

/// <summary>
/// Compares an imported participant list with the employee master. Run again (re-match) whenever the
/// master changes, e.g. after new joiners are synced, so "not found" rows resolve without a re-import.
/// </summary>
public static class RosterMatcher
{
    public static IReadOnlyList<RosterMatch> Match(IEnumerable<RosterRow> rows, IEnumerable<Employee> employees)
    {
        var all = employees.ToList();
        var byNumber = all.GroupBy(e => Key(e.EmployeeNo)).ToDictionary(g => g.Key, g => g.First());
        var byEmail = all.Where(e => !string.IsNullOrWhiteSpace(e.Email))
            .GroupBy(e => Key(e.Email)).ToDictionary(g => g.Key, g => g.First());

        var seen = new HashSet<int>();
        var result = new List<RosterMatch>();
        foreach (var row in rows)
        {
            var employee = byNumber.GetValueOrDefault(Key(row.EmployeeNo))
                ?? (string.IsNullOrWhiteSpace(row.Email) ? null : byEmail.GetValueOrDefault(Key(row.Email)));

            var status = employee switch
            {
                null => RosterMatchStatus.NotFound,
                _ when !seen.Add(employee.Id) => RosterMatchStatus.Duplicate,
                { IsActive: false } => RosterMatchStatus.Inactive,
                _ => RosterMatchStatus.Matched,
            };
            result.Add(new RosterMatch(row, status, employee));
        }
        return result;
    }

    private static string Key(string? value) => (value ?? "").Trim().ToUpperInvariant();
}
