using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PointHub.Domain.Common;
using PointHub.Domain.Notifications;
using PointHub.Domain.Employees;
using PointHub.Domain.Events;
using PointHub.Domain.Points;
using PointHub.Infrastructure.Persistence;

namespace PointHub.Infrastructure.Services;

public sealed class CheckInOptions
{
    public const string Section = "CheckIn";

    /// <summary>How long one rotating QR code is shown.</summary>
    public int RotatingPeriodSeconds { get; set; } = 30;

    /// <summary>How many previous codes are still accepted (time to sign in after scanning). 2 = up to ~90 s old.</summary>
    public int RotatingGraceSteps { get; set; } = 2;

    public TimeSpan RotatingPeriod => TimeSpan.FromSeconds(Math.Max(5, RotatingPeriodSeconds));
}

public sealed record RosterAwardSkip(string EmployeeNo, string? Name, RosterAwardOutcome Reason);

/// <param name="Awarded">New attendance recorded and points awarded.</param>
/// <param name="ApprovedPending">Waiting self check-ins that were approved.</param>
/// <param name="AlreadyAwarded">Already approved before; left alone.</param>
public sealed record RosterAwardSummary(int Awarded, int ApprovedPending, int AlreadyAwarded, IReadOnlyList<RosterAwardSkip> Skipped);

public sealed class CheckInService(PointHubDbContext db, PointLedger ledger, EmailService email, TimeProvider clock, IOptions<CheckInOptions> options)
{
    private static readonly CheckInStatus[] CountsTowardsCapacity = [CheckInStatus.Pending, CheckInStatus.Approved];

    /// <summary>Returns the error code that would block this employee from checking in, or null.</summary>
    /// <param name="method">Only self check-in by link is subject to the rotating code; a host scanning a card is present in person.</param>
    public async Task<string?> GetBlockerAsync(Event ev, Employee employee, CheckInMethod method, string? rotatingCode, CancellationToken ct)
    {
        if (ev.Status != EventStatus.Open) return ErrorCodes.EventNotOpen;
        if (!employee.IsActive) return ErrorCodes.EmployeeInactive;
        // Checked before the code on purpose: the check-in page keeps polling with a code that has since expired.
        if (await db.CheckIns.AnyAsync(c => c.EventId == ev.Id && c.EmployeeId == employee.Id, ct)) return ErrorCodes.AlreadyCheckedIn;
        if (method == CheckInMethod.Link && ev.CheckInMode == CheckInMode.Rotating
            && !ev.IsRotatingCodeValid(rotatingCode, clock.GetUtcNow(), options.Value.RotatingPeriod, options.Value.RotatingGraceSteps))
            return ErrorCodes.CheckInCodeInvalid;
        if (ev.RosterOnly && !await IsOnRosterAsync(ev.Id, employee.Id, ct)) return ErrorCodes.NotOnRoster;
        if (ev.MaxParticipants is { } max
            && await db.CheckIns.CountAsync(c => c.EventId == ev.Id && CountsTowardsCapacity.Contains(c.Status), ct) >= max)
            return ErrorCodes.EventFull;
        return null;
    }

    /// <summary>
    /// Records attendance. A host scanning a card or typing an employee number (<paramref name="hostId"/> set)
    /// approves on the spot; a self check-in from the link follows the event's approval mode.
    /// </summary>
    public async Task<EventCheckIn> CheckInAsync(Event ev, Employee employee, CheckInMethod method, int? hostId, CancellationToken ct, string? rotatingCode = null)
    {
        if (await GetBlockerAsync(ev, employee, method, rotatingCode, ct) is { } code)
            throw new DomainException(code, $"Check-in blocked: {code}.");

        var onRoster = await IsOnRosterAsync(ev.Id, employee.Id, ct);
        var checkIn = new EventCheckIn
        {
            Event = ev,
            EmployeeId = employee.Id,
            Employee = employee,
            Method = method,
            OnRoster = onRoster,
            CheckedInAt = clock.GetUtcNow(),
        };
        db.CheckIns.Add(checkIn);

        if (hostId is not null || ev.AutoApproves(onRoster))
            await ApproveAndAwardAsync(checkIn, hostId, ct);

        await db.SaveChangesAsync(ct);
        return checkIn;
    }

    /// <summary>A host approves a waiting self check-in. The employee is told by email, because they are no longer looking at the page.</summary>
    /// <param name="checkIn">Loaded with its Event and Employee.</param>
    public async Task ApproveAsync(EventCheckIn checkIn, int hostId, CancellationToken ct)
    {
        await ApproveAndAwardAsync(checkIn, hostId, ct);
        await NotifyAsync(EmailTemplates.CheckInApproved, checkIn, reason: null, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task<int> ApproveAllAsync(Event ev, bool onlyRoster, int hostId, CancellationToken ct)
    {
        var pending = await db.CheckIns.Include(c => c.Event).Include(c => c.Employee)
            .Where(c => c.EventId == ev.Id && c.Status == CheckInStatus.Pending && (!onlyRoster || c.OnRoster))
            .ToListAsync(ct);

        foreach (var checkIn in pending)
        {
            await ApproveAndAwardAsync(checkIn, hostId, ct);
            await NotifyAsync(EmailTemplates.CheckInApproved, checkIn, reason: null, ct);
        }

        db.Audit(hostId, "checkin.approve-all", nameof(Event), ev.Id, $"{pending.Count} approved (roster only: {onlyRoster})", clock);
        await db.SaveChangesAsync(ct);
        return pending.Count;
    }

    /// <summary>
    /// Records attendance for every matched person on the roster and awards the points: for events whose attendance
    /// is known from elsewhere, such as an online session's completion list. Safe to run again after a re-import or
    /// re-match; people already approved are left alone. Everyone awarded gets the "check-in approved" email.
    /// </summary>
    public async Task<RosterAwardSummary> AwardRosterAsync(Event ev, int hostId, CancellationToken ct)
    {
        if (!RosterAward.AllowedFor(ev.Status))
            throw new DomainException(ErrorCodes.EventNotOpen, "Open the event, or close it after it has ended, before awarding points from the roster.");

        var roster = await db.RosterEntries.Include(r => r.Employee)
            .Where(r => r.EventId == ev.Id).OrderBy(r => r.Id).ToListAsync(ct);
        var checkIns = await db.CheckIns.Include(c => c.Event).Include(c => c.Employee)
            .Where(c => c.EventId == ev.Id).ToDictionaryAsync(c => c.EmployeeId, ct);
        int? placesLeft = ev.MaxParticipants is { } max
            ? Math.Max(0, max - checkIns.Values.Count(c => CountsTowardsCapacity.Contains(c.Status)))
            : null;

        var plan = RosterAward.Plan(
            roster.Select(r => new RosterAwardRow(r.MatchStatus, r.EmployeeId, r.Employee?.IsActive ?? false)).ToList(),
            checkIns.ToDictionary(pair => pair.Key, pair => pair.Value.Status),
            placesLeft);

        var now = clock.GetUtcNow();
        var skipped = new List<RosterAwardSkip>();
        int awarded = 0, approved = 0, already = 0;
        for (var i = 0; i < roster.Count; i++)
        {
            var entry = roster[i];
            switch (plan[i])
            {
                case RosterAwardOutcome.Award:
                    var checkIn = new EventCheckIn
                    {
                        Event = ev, EmployeeId = entry.Employee!.Id, Employee = entry.Employee,
                        Method = CheckInMethod.Roster, OnRoster = true, CheckedInAt = now,
                    };
                    db.CheckIns.Add(checkIn);
                    await ApproveAndAwardAsync(checkIn, hostId, ct);
                    await NotifyAsync(EmailTemplates.CheckInApproved, checkIn, reason: null, ct);
                    awarded++;
                    break;
                case RosterAwardOutcome.ApprovePending:
                    var pending = checkIns[entry.EmployeeId!.Value];
                    await ApproveAndAwardAsync(pending, hostId, ct);
                    await NotifyAsync(EmailTemplates.CheckInApproved, pending, reason: null, ct);
                    approved++;
                    break;
                case RosterAwardOutcome.AlreadyAwarded:
                    already++;
                    break;
                default:
                    skipped.Add(new RosterAwardSkip(entry.EmployeeNo, entry.Name ?? entry.Employee?.DisplayName, plan[i]));
                    break;
            }
        }

        db.Audit(hostId, "roster.award", nameof(Event), ev.Id,
            $"{awarded} awarded, {approved} pending approved, {already} already awarded, {skipped.Count} skipped", clock);
        await db.SaveChangesAsync(ct);
        return new RosterAwardSummary(awarded, approved, already, skipped);
    }

    public async Task RejectAsync(EventCheckIn checkIn, int hostId, string? reason, CancellationToken ct)
    {
        checkIn.Reject(hostId, clock.GetUtcNow(), reason);
        db.Audit(hostId, "checkin.reject", nameof(EventCheckIn), checkIn.Id, reason, clock);
        await NotifyAsync(EmailTemplates.CheckInRejected, checkIn, reason, ct);
        await db.SaveChangesAsync(ct);
    }

    private Task NotifyAsync(string templateKey, EventCheckIn checkIn, string? reason, CancellationToken ct) =>
        email.QueueAsync(templateKey, checkIn.Employee, locale => new()
        {
            ["eventTitle"] = checkIn.Event.Title.For(locale),
            ["points"] = checkIn.Event.Points.ToString("N0", CultureInfo.InvariantCulture),
            ["reason"] = string.IsNullOrWhiteSpace(reason) ? "–" : reason,
        }, ct);

    private async Task ApproveAndAwardAsync(EventCheckIn checkIn, int? decidedById, CancellationToken ct)
    {
        checkIn.Approve(decidedById, clock.GetUtcNow());
        if (checkIn.Event.Points <= 0) return;

        var award = await ledger.PostAsync(checkIn.EmployeeId, checkIn.Event.Points, PointTransactionType.EventAward,
            reason: null, actorId: decidedById, ct);
        award.Event = checkIn.Event;
        checkIn.AwardTransaction = award;
    }

    private Task<bool> IsOnRosterAsync(int eventId, int employeeId, CancellationToken ct) =>
        db.RosterEntries.AnyAsync(r => r.EventId == eventId && r.EmployeeId == employeeId && r.MatchStatus != RosterMatchStatus.Inactive, ct);
}
