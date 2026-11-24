using System.Security.Cryptography;
using System.Text;
using PointHub.Domain.Common;
using PointHub.Domain.Employees;
using PointHub.Domain.Points;

namespace PointHub.Domain.Events;

public enum EventStatus { Draft = 0, Open = 1, Closed = 2, Cancelled = 3 }

public enum ApprovalMode
{
    /// <summary>A host approves every check-in.</summary>
    Manual = 0,
    /// <summary>Employees on the imported roster are approved at once; walk-ins wait for a host.</summary>
    AutoApproveRoster = 1,
    AutoApproveAll = 2,
}

public enum CheckInMode
{
    /// <summary>One link / QR code for the whole event. Can be printed on posters; pair it with host approval.</summary>
    Static = 0,
    /// <summary>The QR code on the host's screen changes every few seconds, so a forwarded photo or link stops working.</summary>
    Rotating = 1,
}

public enum CheckInStatus { Pending = 0, Approved = 1, Rejected = 2, Reverted = 3 }

public enum CheckInMethod { Link = 0, Card = 1, Manual = 2 }

public enum RosterMatchStatus { Matched = 0, NotFound = 1, Inactive = 2, Duplicate = 3 }

public class Event
{
    public int Id { get; set; }
    public required LocalizedText Title { get; set; }
    public LocalizedText? Description { get; set; }
    public string? Location { get; set; }
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }

    /// <summary>Points awarded for one approved attendance.</summary>
    public int Points { get; set; }
    public EventStatus Status { get; set; } = EventStatus.Draft;
    public ApprovalMode ApprovalMode { get; set; } = ApprovalMode.Manual;
    public bool RosterOnly { get; set; }
    public int? MaxParticipants { get; set; }

    public CheckInMode CheckInMode { get; set; } = CheckInMode.Static;

    /// <summary>Identifies the event in the check-in link / QR code. Anyone who has the link knows it.</summary>
    public string CheckInToken { get; private set; } = NewToken(16);

    /// <summary>Server-side key the rotating codes are derived from. Never sent to a client.</summary>
    public string CheckInSecret { get; private set; } = NewToken(32);

    public int CreatedById { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public List<EventHost> Hosts { get; set; } = [];
    public List<EventRosterEntry> Roster { get; set; } = [];
    public List<EventCheckIn> CheckIns { get; set; } = [];

    public void RegenerateToken()
    {
        CheckInToken = NewToken(16);
        CheckInSecret = NewToken(32);
    }

    /// <summary>The code shown in the QR right now. It is the same for everyone and changes every <paramref name="period"/>.</summary>
    public string RotatingCode(DateTimeOffset now, TimeSpan period) => CodeForStep(StepAt(now, period));

    public static DateTimeOffset RotatingCodeExpiry(DateTimeOffset now, TimeSpan period) =>
        DateTimeOffset.FromUnixTimeSeconds((StepAt(now, period) + 1) * (long)period.TotalSeconds);

    /// <summary>
    /// Accepts the current code and the previous <paramref name="graceSteps"/> codes, which gives an employee
    /// time to sign in after scanning. A larger grace is friendlier and lets a forwarded photo live longer.
    /// </summary>
    public bool IsRotatingCodeValid(string? code, DateTimeOffset now, TimeSpan period, int graceSteps)
    {
        if (string.IsNullOrEmpty(code)) return false;
        var presented = Encoding.ASCII.GetBytes(code);
        var current = StepAt(now, period);
        var valid = false;
        for (var step = current; step >= current - graceSteps; step--)
            valid |= CryptographicOperations.FixedTimeEquals(presented, Encoding.ASCII.GetBytes(CodeForStep(step)));
        return valid;
    }

    private static long StepAt(DateTimeOffset now, TimeSpan period) => now.ToUnixTimeSeconds() / (long)period.TotalSeconds;

    private string CodeForStep(long step)
    {
        var counter = BitConverter.GetBytes(step);
        if (BitConverter.IsLittleEndian) Array.Reverse(counter);
        var mac = HMACSHA256.HashData(Encoding.ASCII.GetBytes(CheckInSecret), counter);
        return Base64Url(mac)[..10];
    }

    /// <summary>v0 rule: hosts open and close check-in by hand; the scheduled times are informational.</summary>
    public void EnsureOpen()
    {
        if (Status != EventStatus.Open)
            throw new DomainException(ErrorCodes.EventNotOpen, "The event is not open for check-in.");
    }

    public bool AutoApproves(bool onRoster) => ApprovalMode switch
    {
        ApprovalMode.AutoApproveAll => true,
        ApprovalMode.AutoApproveRoster => onRoster,
        _ => false,
    };

    private static string NewToken(int bytes) => Base64Url(RandomNumberGenerator.GetBytes(bytes));

    private static string Base64Url(byte[] data) => Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}

public class EventHost
{
    public int EventId { get; set; }
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
}

/// <summary>One line of an imported participant list, with the result of matching it to the employee master.</summary>
public class EventRosterEntry
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public required string EmployeeNo { get; set; }
    public string? Name { get; set; }
    public string? Email { get; set; }
    public RosterMatchStatus MatchStatus { get; set; }
    public int? EmployeeId { get; set; }
    public Employee? Employee { get; set; }
    public DateTimeOffset ImportedAt { get; set; }
}

public class EventCheckIn
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public Event Event { get; set; } = null!;
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
    public CheckInMethod Method { get; set; }
    public CheckInStatus Status { get; private set; } = CheckInStatus.Pending;
    public bool OnRoster { get; set; }
    public DateTimeOffset CheckedInAt { get; set; }
    public DateTimeOffset? DecidedAt { get; private set; }
    public int? DecidedById { get; private set; }
    public Employee? DecidedBy { get; private set; }
    public string? Note { get; private set; }

    /// <summary>The award written to the ledger when this check-in was approved.</summary>
    public PointTransaction? AwardTransaction { get; set; }
    public long? AwardTransactionId { get; set; }

    /// <param name="decidedById">Null when the system approved automatically.</param>
    public void Approve(int? decidedById, DateTimeOffset now) => Decide(CheckInStatus.Approved, decidedById, now, null);

    public void Reject(int decidedById, DateTimeOffset now, string? reason) => Decide(CheckInStatus.Rejected, decidedById, now, reason);

    /// <summary>Called when an admin reverts the award in the ledger.</summary>
    public void MarkReverted(string? reason)
    {
        if (Status != CheckInStatus.Approved)
            throw new DomainException(ErrorCodes.CheckInAlreadyDecided, "Only an approved check-in can be reverted.");
        Status = CheckInStatus.Reverted;
        Note = reason;
    }

    private void Decide(CheckInStatus status, int? decidedById, DateTimeOffset now, string? note)
    {
        if (Status != CheckInStatus.Pending)
            throw new DomainException(ErrorCodes.CheckInAlreadyDecided, "The check-in has already been decided.");
        Status = status;
        DecidedById = decidedById;
        DecidedAt = now;
        Note = note;
    }
}
