using PointHub.Domain.Common;
using PointHub.Domain.Employees;
using PointHub.Domain.Events;
using PointHub.Domain.Gifts;
using PointHub.Domain.Points;

namespace PointHub.Infrastructure.Persistence;

/// <summary>
/// What the search box looks at on each list. Every term must match somewhere (AND); each term is a
/// case-insensitive "contains", which EF sends as a parameter, so wildcard characters typed by a user are literal.
/// </summary>
public static class SearchExtensions
{
    public static IQueryable<Event> Matching(this IQueryable<Event> query, string? text)
    {
        foreach (var term in SearchText.Terms(text))
            query = query.Where(e => e.SearchText.Contains(term));
        return query;
    }

    public static IQueryable<Gift> Matching(this IQueryable<Gift> query, string? text)
    {
        foreach (var term in SearchText.Terms(text))
            query = query.Where(g => g.SearchText.Contains(term));
        return query;
    }

    public static IQueryable<Employee> Matching(this IQueryable<Employee> query, string? text)
    {
        foreach (var term in SearchText.Terms(text))
            query = query.Where(e => e.EmployeeNo.Contains(term) || e.DisplayName.Contains(term) || e.Email.Contains(term)
                || e.Department!.Contains(term));
        return query;
    }

    /// <summary>The ledger: who, why, which event or gift, and where an external transaction came from.</summary>
    public static IQueryable<PointTransaction> Matching(this IQueryable<PointTransaction> query, string? text)
    {
        foreach (var term in SearchText.Terms(text))
            query = query.Where(t =>
                t.Employee.EmployeeNo.Contains(term) || t.Employee.DisplayName.Contains(term) || t.Employee.Email.Contains(term)
                || t.Reason!.Contains(term) || t.ExternalReference!.Contains(term) || t.ApiClient!.Name.Contains(term)
                || t.Event!.SearchText.Contains(term) || t.Redemption!.Gift.SearchText.Contains(term));
        return query;
    }

    public static IQueryable<Redemption> Matching(this IQueryable<Redemption> query, string? text)
    {
        foreach (var term in SearchText.Terms(text))
            query = query.Where(r =>
                r.Employee.EmployeeNo.Contains(term) || r.Employee.DisplayName.Contains(term) || r.Employee.Email.Contains(term)
                || r.Gift.SearchText.Contains(term) || r.Note!.Contains(term));
        return query;
    }

    public static IQueryable<EventCheckIn> Matching(this IQueryable<EventCheckIn> query, string? text)
    {
        foreach (var term in SearchText.Terms(text))
            query = query.Where(c =>
                c.Employee.EmployeeNo.Contains(term) || c.Employee.DisplayName.Contains(term) || c.Employee.Email.Contains(term)
                || c.Event.SearchText.Contains(term));
        return query;
    }
}
