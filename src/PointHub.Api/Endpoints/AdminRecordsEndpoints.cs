using System.Globalization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PointHub.Api.Auth;
using PointHub.Api.Contracts;
using PointHub.Api.Http;
using PointHub.Domain.Common;
using PointHub.Domain.Employees;
using PointHub.Domain.Events;
using PointHub.Domain.Gifts;
using PointHub.Domain.Points;
using PointHub.Infrastructure;
using PointHub.Infrastructure.Persistence;
using PointHub.Infrastructure.Services;

namespace PointHub.Api.Endpoints;

/// <summary>
/// The searchable record lists of the back office (ledger, attendance, claims, employees), each with a CSV
/// export that takes exactly the same filters, and the lookup of one employee.
/// </summary>
public static class AdminRecordsEndpoints
{
    /// <summary>Filters shared by a list and its export, bound from the query string.</summary>
    public sealed record RecordFilter(string? Q, string? From, string? To, int? EmployeeId, int? EventId, int? GiftId, string? Type, string? Status, string? Locale);

    public static void MapAdminRecordsEndpoints(this RouteGroupBuilder admin)
    {
        var read = admin.MapGroup("").RequireAuthorization(Policies.AdminRead);
        var claims = admin.MapGroup("/redemptions").RequireAuthorization(Policies.ClaimsRead);

        // ---- Ledger ----------------------------------------------------------------------------------------------
        read.MapGet("/transactions", async ([AsParameters] RecordFilter filter, int? page, int? pageSize, PointHubDbContext db, IOptions<SiteOptions> site, CancellationToken ct) =>
            await Ledger(db, filter, site.Value).OrderByDescending(t => t.Id).Select(TransactionDto.Projection).ToPagedAsync(page, pageSize, ct));

        read.MapGet("/transactions/export", async ([AsParameters] RecordFilter filter, HttpContext http, PointHubDbContext db, IOptions<SiteOptions> site, TimeProvider clock, CancellationToken ct) =>
        {
            var export = await BeginAsync(http, db, site.Value, clock, filter, "ledger", Ledger(db, filter, site.Value), ct);
            var rows = Ledger(db, filter, site.Value).OrderByDescending(t => t.Id).Take(CsvExport.MaxRows).Select(t => new
            {
                t.Id, t.CreatedAt, t.Employee.EmployeeNo, t.Employee.DisplayName, t.Employee.Department, t.Type, t.Amount,
                Event = t.Event!.Title, Gift = t.Redemption!.Gift.Name, t.Reason, Source = t.ApiClient!.Name, t.ExternalReference,
                t.ReversesTransactionId, ReversedBy = (long?)t.ReversedByTransaction!.Id, EnteredBy = t.CreatedBy!.DisplayName,
            }).AsAsyncEnumerable();

            return export.File(
                ["id", "time", "employeeNo", "employee", "department", "type", "points", "event", "gift", "reason", "source", "reference", "reverses", "reversedBy", "enteredBy"],
                rows, r =>
                [
                    r.Id, export.Time(r.CreatedAt), r.EmployeeNo, r.DisplayName, r.Department, export.Label(r.Type), r.Amount,
                    r.Event?.For(export.Locale), r.Gift?.For(export.Locale), r.Reason, r.Source, r.ExternalReference,
                    r.ReversesTransactionId, r.ReversedBy, r.EnteredBy,
                ]);
        });

        // ---- Attendance ---------------------------------------------------------------------------------------------
        read.MapGet("/checkins", async ([AsParameters] RecordFilter filter, int? page, int? pageSize, PointHubDbContext db, IOptions<SiteOptions> site, CancellationToken ct) =>
            await CheckIns(db, filter, site.Value).OrderByDescending(c => c.Id).Select(CheckInDto.Projection).ToPagedAsync(page, pageSize, ct));

        read.MapGet("/checkins/export", async ([AsParameters] RecordFilter filter, HttpContext http, PointHubDbContext db, IOptions<SiteOptions> site, TimeProvider clock, CancellationToken ct) =>
        {
            var export = await BeginAsync(http, db, site.Value, clock, filter, "attendance", CheckIns(db, filter, site.Value), ct);
            var rows = CheckIns(db, filter, site.Value).OrderByDescending(c => c.Id).Take(CsvExport.MaxRows).Select(c => new
            {
                c.Id, c.CheckedInAt, c.Employee.EmployeeNo, c.Employee.DisplayName, c.Employee.Department, Event = c.Event.Title,
                c.Method, c.Status, c.OnRoster, c.Event.Points, c.DecidedAt, DecidedBy = c.DecidedBy!.DisplayName, c.Note,
            }).AsAsyncEnumerable();

            return export.File(
                ["id", "time", "employeeNo", "employee", "department", "event", "method", "status", "onRoster", "points", "decidedAt", "decidedBy", "note"],
                rows, r =>
                [
                    r.Id, export.Time(r.CheckedInAt), r.EmployeeNo, r.DisplayName, r.Department, r.Event.For(export.Locale),
                    export.Label(r.Method), export.Label(r.Status), r.OnRoster, r.Points, export.Time(r.DecidedAt), r.DecidedBy, r.Note,
                ]);
        });

        // ---- Claims ---------------------------------------------------------------------------------------------------
        claims.MapGet("", async ([AsParameters] RecordFilter filter, int? page, int? pageSize, PointHubDbContext db, IOptions<SiteOptions> site, CancellationToken ct) =>
            await Claims(db, filter, site.Value).OrderByDescending(r => r.Id).Select(RedemptionDto.Projection).ToPagedAsync(page, pageSize, ct));

        claims.MapGet("/export", async ([AsParameters] RecordFilter filter, HttpContext http, PointHubDbContext db, IOptions<SiteOptions> site, TimeProvider clock, CancellationToken ct) =>
        {
            var export = await BeginAsync(http, db, site.Value, clock, filter, "claims", Claims(db, filter, site.Value), ct);
            var rows = Claims(db, filter, site.Value).OrderByDescending(r => r.Id).Take(CsvExport.MaxRows).Select(r => new
            {
                r.Id, r.RequestedAt, r.Employee.EmployeeNo, r.Employee.DisplayName, r.Employee.Department, Gift = r.Gift.Name,
                r.Quantity, r.PointsSpent, r.Status, r.ClosedAt, ClosedBy = r.ClosedBy!.DisplayName, r.Note,
            }).AsAsyncEnumerable();

            return export.File(
                ["id", "claimedAt", "employeeNo", "employee", "department", "gift", "quantity", "points", "status", "closedAt", "closedBy", "reason"],
                rows, r =>
                [
                    r.Id, export.Time(r.RequestedAt), r.EmployeeNo, r.DisplayName, r.Department, r.Gift.For(export.Locale),
                    r.Quantity, r.PointsSpent, export.Label(r.Status), export.Time(r.ClosedAt), r.ClosedBy, r.Note,
                ]);
        });

        // ---- Employees ----------------------------------------------------------------------------------------------------
        read.MapGet("/employees", async (string? q, int? page, int? pageSize, PointHubDbContext db, CancellationToken ct) =>
        {
            var result = await db.Employees.AsNoTracking().Include(e => e.Account).Include(e => e.Cards).AsSplitQuery()
                .Matching(q).OrderBy(e => e.EmployeeNo).ToPagedAsync(page, pageSize, ct);
            return new Paged<EmployeeDto>(result.Items.Select(EmployeeDto.From).ToList(), result.Total, result.Page, result.PageSize);
        });

        read.MapGet("/employees/export", async ([AsParameters] RecordFilter filter, HttpContext http, PointHubDbContext db, IOptions<SiteOptions> site, TimeProvider clock, CancellationToken ct) =>
        {
            var query = db.Employees.AsNoTracking().Matching(filter.Q);
            var export = await BeginAsync(http, db, site.Value, clock, filter, "employees", query, ct);
            var rows = query.OrderBy(e => e.EmployeeNo).Take(CsvExport.MaxRows).Select(e => new
            {
                e.EmployeeNo, e.DisplayName, e.Email, e.Department, e.IsActive, e.Roles,
                e.Account.Balance, e.Account.LifetimeEarned, e.Account.LifetimeSpent, Cards = e.Cards.Count, e.CreatedAt,
            }).AsAsyncEnumerable();

            return export.File(
                ["employeeNo", "employee", "email", "department", "active", "roles", "balance", "earned", "spent", "cards", "createdAt"],
                rows, r =>
                [
                    r.EmployeeNo, r.DisplayName, r.Email, r.Department, r.IsActive,
                    string.Join(" / ", Employee.RoleNames(r.Roles).Select(role => export.Label(role))),
                    r.Balance, r.LifetimeEarned, r.LifetimeSpent, r.Cards, export.Time(r.CreatedAt),
                ]);
        });

        // One person: profile and totals. Their history is the three lists above filtered by employeeId.
        read.MapGet("/employees/{id:int}", async (int id, PointHubDbContext db, CancellationToken ct) =>
        {
            var employee = await db.Employees.AsNoTracking().Include(e => e.Account).Include(e => e.Cards).AsSplitQuery().FirstOrDefaultAsync(e => e.Id == id, ct);
            if (employee is null) return ApiProblem.NotFound("Employee");

            var checkIns = await db.CheckIns.CountAsync(c => c.EmployeeId == id && c.Status == CheckInStatus.Approved, ct);
            var claimCount = await db.Redemptions.CountAsync(r => r.EmployeeId == id && (r.Status == RedemptionStatus.Requested || r.Status == RedemptionStatus.Fulfilled), ct);
            return Results.Ok(EmployeeDetailDto.From(employee, checkIns, claimCount));
        });
    }

    // ---- Filters (one definition per list, used by the list and by its export) --------------------------------------------

    private static IQueryable<PointTransaction> Ledger(PointHubDbContext db, RecordFilter filter, SiteOptions site)
    {
        var (from, until) = DateRange(filter, site);
        var query = db.PointTransactions.AsNoTracking().Matching(filter.Q);
        if (filter.EmployeeId is { } employeeId) query = query.Where(t => t.EmployeeId == employeeId);
        if (filter.EventId is { } eventId) query = query.Where(t => t.EventId == eventId);
        if (QueryEnum.Parse<PointTransactionType>(filter.Type) is { } type) query = query.Where(t => t.Type == type);
        if (from is not null) query = query.Where(t => t.CreatedAt >= from);
        if (until is not null) query = query.Where(t => t.CreatedAt < until);
        return query;
    }

    private static IQueryable<EventCheckIn> CheckIns(PointHubDbContext db, RecordFilter filter, SiteOptions site)
    {
        var (from, until) = DateRange(filter, site);
        var query = db.CheckIns.AsNoTracking().Matching(filter.Q);
        if (filter.EmployeeId is { } employeeId) query = query.Where(c => c.EmployeeId == employeeId);
        if (filter.EventId is { } eventId) query = query.Where(c => c.EventId == eventId);
        if (QueryEnum.Parse<CheckInStatus>(filter.Status) is { } status) query = query.Where(c => c.Status == status);
        if (from is not null) query = query.Where(c => c.CheckedInAt >= from);
        if (until is not null) query = query.Where(c => c.CheckedInAt < until);
        return query;
    }

    private static IQueryable<Redemption> Claims(PointHubDbContext db, RecordFilter filter, SiteOptions site)
    {
        var (from, until) = DateRange(filter, site);
        var query = db.Redemptions.AsNoTracking().Matching(filter.Q);
        if (filter.EmployeeId is { } employeeId) query = query.Where(r => r.EmployeeId == employeeId);
        if (filter.GiftId is { } giftId) query = query.Where(r => r.GiftId == giftId);
        if (QueryEnum.Parse<RedemptionStatus>(filter.Status) is { } status) query = query.Where(r => r.Status == status);
        if (from is not null) query = query.Where(r => r.RequestedAt >= from);
        if (until is not null) query = query.Where(r => r.RequestedAt < until);
        return query;
    }

    /// <summary><c>from</c> and <c>to</c> are calendar days in the site time zone, both inclusive.</summary>
    private static (DateTimeOffset? From, DateTimeOffset? Until) DateRange(RecordFilter filter, SiteOptions site)
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById(site.TimeZone);
        DateTimeOffset? StartOf(string? value, int addDays)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            if (!DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day))
                throw new DomainException(ErrorCodes.ValidationFailed, $"'{value}' is not a date (YYYY-MM-DD).");
            var local = day.AddDays(addDays).ToDateTime(TimeOnly.MinValue);
            return new DateTimeOffset(local, zone.GetUtcOffset(local)).ToUniversalTime();
        }
        return (StartOf(filter.From, 0), StartOf(filter.To, 1));
    }

    // ---- Export plumbing ----------------------------------------------------------------------------------------------------

    private sealed class Export(HttpContext http, string name, string locale, TimeZoneInfo zone, DateTimeOffset now, bool truncated)
    {
        public string Locale => locale;
        public string Label(object value) => ExportLabels.Label(value, locale);
        public string? Time(DateTimeOffset? value) => value is { } time ? TimeZoneInfo.ConvertTime(time, zone).ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture) : null;

        public IResult File<T>(string[] columns, IAsyncEnumerable<T> rows, Func<T, object?[]> cells) =>
            CsvExport.File(http, $"pointhub-{name}", TimeZoneInfo.ConvertTime(now, zone), ExportLabels.Headings(locale, columns), rows, cells, truncated);
    }

    /// <summary>Counts the rows, writes the audit line, and works out the language of the headings.</summary>
    private static async Task<Export> BeginAsync<T>(HttpContext http, PointHubDbContext db, SiteOptions site, TimeProvider clock, RecordFilter filter,
        string name, IQueryable<T> query, CancellationToken ct)
    {
        var me = http.User.EmployeeId();
        var locale = Locales.IsSupported(filter.Locale) ? filter.Locale!
            : await db.Employees.Where(e => e.Id == me).Select(e => e.PreferredLocale).FirstOrDefaultAsync(ct) is { } mine && Locales.IsSupported(mine) ? mine
            : site.DefaultLocale;

        var total = await query.CountAsync(ct);
        string?[] used =
        [
            filter.Q is { Length: > 0 } ? $"q=\"{filter.Q}\"" : null, filter.From is { Length: > 0 } ? $"from={filter.From}" : null, filter.To is { Length: > 0 } ? $"to={filter.To}" : null,
            filter.EmployeeId is { } e ? $"employee={e}" : null, filter.EventId is { } ev ? $"event={ev}" : null, filter.GiftId is { } g ? $"gift={g}" : null,
            filter.Type is { Length: > 0 } ? $"type={filter.Type}" : null, filter.Status is { Length: > 0 } ? $"status={filter.Status}" : null,
        ];
        var filters = string.Join(", ", used.Where(part => part is not null));
        db.Audit(me, $"export.{name}", "Export", null, $"{Math.Min(total, CsvExport.MaxRows)} of {total} rows{(filters.Length > 0 ? $"; {filters}" : "")}", clock);
        await db.SaveChangesAsync(ct);

        return new Export(http, name, locale, TimeZoneInfo.FindSystemTimeZoneById(site.TimeZone), clock.GetUtcNow(), total > CsvExport.MaxRows);
    }
}
