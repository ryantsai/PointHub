using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PointHub.Domain.Events;
using PointHub.Domain.Gifts;
using PointHub.Domain.Points;
using PointHub.Infrastructure.Persistence;

namespace PointHub.Infrastructure.Services;

public sealed record WeekTotals(DateOnly WeekStart, int Issued, int Redeemed);

public sealed record AdminStats(
    int PointsIssuedThisMonth, int PointsIssuedLastMonth, int PointsRedeemedThisMonth, int PointsRedeemedLastMonth,
    int ActiveParticipants, int TotalEmployees, long OutstandingPoints, int PendingCheckIns, int OpenClaims,
    IReadOnlyList<WeekTotals> Weeks);

/// <summary>The numbers on the admin dashboard, all derived from the ledger and current state (nothing is stored).</summary>
public sealed class AdminStatsService(PointHubDbContext db, IOptions<SiteOptions> site, TimeProvider clock)
{
    private const int Weeks = 12;
    private static readonly PointTransactionType[] IssuedTypes = [PointTransactionType.EventAward, PointTransactionType.Adjustment, PointTransactionType.ExternalCredit];
    private static readonly PointTransactionType[] RedeemedTypes = [PointTransactionType.Redemption, PointTransactionType.ExternalDebit];

    public async Task<AdminStats> GetAsync(CancellationToken ct)
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById(site.Value.TimeZone);
        var now = clock.GetUtcNow();
        DateOnly LocalDay(DateTimeOffset instant) => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, zone).DateTime);

        var today = LocalDay(now);
        var thisMonth = new DateOnly(today.Year, today.Month, 1);
        var lastMonth = thisMonth.AddMonths(-1);
        var thisWeek = today.AddDays(-(((int)today.DayOfWeek + 6) % 7)); // Monday
        var firstWeek = thisWeek.AddDays(-7 * (Weeks - 1));
        var firstDay = firstWeek < lastMonth ? firstWeek : lastMonth;
        // One day of slack so the UTC cut-off cannot drop a row that is inside the local-time range.
        var since = new DateTimeOffset(firstDay.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero).AddDays(-1);

        // A reversal counts against whatever it reverses, so a reverted award lowers "issued" and a refund lowers "redeemed".
        // Read as rows and bucket here: the buckets are in the site's time zone, which SQL cannot do portably.
        // Fine for a quarter of ledger rows; move to a nightly rollup table if the ledger grows past that.
        var rows = await db.PointTransactions.AsNoTracking()
            .Where(t => t.CreatedAt >= since)
            .Select(t => new { t.CreatedAt, t.Amount, Root = t.Type == PointTransactionType.Reversal ? t.ReversesTransaction!.Type : t.Type })
            .ToListAsync(ct);

        var movements = rows.Select(r => new
        {
            Day = LocalDay(r.CreatedAt),
            Issued = IssuedTypes.Contains(r.Root) ? r.Amount : 0,
            Redeemed = RedeemedTypes.Contains(r.Root) ? -r.Amount : 0,
        }).ToList();

        int Month(DateOnly start, bool issued) => movements
            .Where(m => m.Day >= start && m.Day < start.AddMonths(1)).Sum(m => issued ? m.Issued : m.Redeemed);

        var weeks = Enumerable.Range(0, Weeks).Select(i => firstWeek.AddDays(7 * i)).Select(start =>
        {
            var inWeek = movements.Where(m => m.Day >= start && m.Day < start.AddDays(7)).ToList();
            return new WeekTotals(start, inWeek.Sum(m => m.Issued), inWeek.Sum(m => m.Redeemed));
        }).ToList();

        var participationSince = now.AddDays(-90);
        return new AdminStats(
            Month(thisMonth, issued: true), Month(lastMonth, issued: true),
            Month(thisMonth, issued: false), Month(lastMonth, issued: false),
            ActiveParticipants: await db.CheckIns.Where(c => c.Status == CheckInStatus.Approved && c.CheckedInAt >= participationSince && c.Employee.IsActive)
                .Select(c => c.EmployeeId).Distinct().CountAsync(ct),
            TotalEmployees: await db.Employees.CountAsync(e => e.IsActive, ct),
            OutstandingPoints: await db.PointAccounts.SumAsync(a => (long)a.Balance, ct),
            PendingCheckIns: await db.CheckIns.CountAsync(c => c.Status == CheckInStatus.Pending, ct),
            OpenClaims: await db.Redemptions.CountAsync(r => r.Status == RedemptionStatus.Requested, ct),
            weeks);
    }
}
