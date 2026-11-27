namespace PointHub.Domain.Events;

/// <summary>What awarding points from the roster does with one roster row.</summary>
public enum RosterAwardOutcome
{
    /// <summary>No check-in yet: record attendance (method <see cref="CheckInMethod.Roster"/>) and award the points.</summary>
    Award,
    /// <summary>The person checked in themselves and is waiting for approval: approve it and award the points.</summary>
    ApprovePending,
    /// <summary>Already approved: nothing to do, so running the award twice is safe.</summary>
    AlreadyAwarded,
    /// <summary>A host rejected the check-in, or an admin reverted its points. That decision stands.</summary>
    AlreadyDecided,
    /// <summary>The row does not point at exactly one employee (not found, or a duplicate row).</summary>
    NotMatched,
    /// <summary>The employee has left; they can no longer earn points.</summary>
    Inactive,
    /// <summary>The event's participant limit is reached.</summary>
    EventFull,
}

/// <param name="EmployeeId">Null when the row matched nobody.</param>
/// <param name="EmployeeActive">The employee's current state (they may have left since the roster was matched).</param>
public readonly record struct RosterAwardRow(RosterMatchStatus Match, int? EmployeeId, bool EmployeeActive);

/// <summary>
/// Plans "award points to everyone on the roster", the way to record attendance that happened elsewhere:
/// an online event whose completion list comes from another system, or a sign-in sheet typed up afterwards.
/// Pure, so the rules can be tested without a database; <c>CheckInService.AwardRosterAsync</c> carries it out.
/// </summary>
public static class RosterAward
{
    /// <summary>Award from the roster is possible while check-in is open and after the event has been closed.</summary>
    public static bool AllowedFor(EventStatus status) => status is EventStatus.Open or EventStatus.Closed;

    /// <param name="rows">Roster rows in roster order.</param>
    /// <param name="existing">Check-in status per employee for this event.</param>
    /// <param name="placesLeft">Free places (<c>maxParticipants</c> minus pending and approved check-ins), or null for no limit.</param>
    public static IReadOnlyList<RosterAwardOutcome> Plan(
        IReadOnlyList<RosterAwardRow> rows, IReadOnlyDictionary<int, CheckInStatus> existing, int? placesLeft)
    {
        var left = placesLeft;
        var handled = new HashSet<int>();
        var plan = new List<RosterAwardOutcome>(rows.Count);
        foreach (var row in rows)
        {
            plan.Add(Decide(row));
        }
        return plan;

        RosterAwardOutcome Decide(RosterAwardRow row)
        {
            if (row.Match == RosterMatchStatus.Inactive) return RosterAwardOutcome.Inactive;
            if (row.Match != RosterMatchStatus.Matched || row.EmployeeId is not { } id) return RosterAwardOutcome.NotMatched;
            if (!row.EmployeeActive) return RosterAwardOutcome.Inactive;
            // Two rows can point at one person (number in one row, email in another); only the first counts.
            if (!handled.Add(id)) return RosterAwardOutcome.AlreadyAwarded;

            if (existing.TryGetValue(id, out var status))
                return status switch
                {
                    CheckInStatus.Pending => RosterAwardOutcome.ApprovePending, // already holds a place
                    CheckInStatus.Approved => RosterAwardOutcome.AlreadyAwarded,
                    _ => RosterAwardOutcome.AlreadyDecided,
                };

            if (left is <= 0) return RosterAwardOutcome.EventFull;
            left--;
            return RosterAwardOutcome.Award;
        }
    }
}
