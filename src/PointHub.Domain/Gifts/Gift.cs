using PointHub.Domain.Common;
using PointHub.Domain.Employees;

namespace PointHub.Domain.Gifts;

public enum RedemptionStatus
{
    /// <summary>Claimed: points taken and stock reserved, waiting to be handed over.</summary>
    Requested = 0,
    /// <summary>Handed over to the employee.</summary>
    Fulfilled = 1,
    /// <summary>Called off before hand-over; points and stock returned.</summary>
    Cancelled = 2,
    /// <summary>Taken back after hand-over; points returned, stock returned if the item came back.</summary>
    Refunded = 3,
}

public class Gift
{
    public int Id { get; set; }
    public required LocalizedText Name { get; set; }
    public LocalizedText? Description { get; set; }
    /// <summary>Pictures in display order; the first one is the cover.</summary>
    public List<GiftImage> Images { get; set; } = [];
    public int PointCost { get; set; }
    public int Stock { get; private set; }
    public bool IsActive { get; set; } = true;

    /// <summary>Maximum quantity one employee may redeem in total (cancelled redemptions do not count).</summary>
    public int? PerEmployeeLimit { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public byte[] RowVersion { get; set; } = [];

    /// <summary>Name and description in every language, for search. Refreshed by the DbContext on save.</summary>
    public string SearchText { get; private set; } = "";

    public void RefreshSearchText() => SearchText = Common.SearchText.Join(Name, Description);

    /// <summary>Every stock change goes through here and is mirrored by a <see cref="GiftStockMovement"/>.</summary>
    public void ChangeStock(int delta)
    {
        if (Stock + delta < 0) throw new DomainException(ErrorCodes.OutOfStock, "Not enough stock.");
        Stock += delta;
    }

    public void EnsureRedeemable()
    {
        if (!IsActive) throw new DomainException(ErrorCodes.GiftInactive, "The gift is not available.");
    }
}

/// <summary>
/// One normalised picture of a gift. The file lives flat in the application's uploads/assets folder
/// under <see cref="FileName"/>; the row is what ties it to a gift and orders it.
/// </summary>
public class GiftImage
{
    public const int MaxPerGift = 8;
    /// <summary>Every stored picture is a square of this many pixels with the original fitted inside.</summary>
    public const int FrameSize = 1024;

    public Guid Id { get; set; }
    public int GiftId { get; set; }
    public int SortOrder { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public long SizeBytes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public string FileName => $"{Id:N}.webp";
}

public class GiftStockMovement
{
    public int Id { get; set; }
    public int GiftId { get; set; }
    public Gift Gift { get; set; } = null!;
    public int Delta { get; set; }
    public required string Reason { get; set; }
    public int? RedemptionId { get; set; }
    public Redemption? Redemption { get; set; }
    public int? CreatedById { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class Redemption
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
    public int GiftId { get; set; }
    public Gift Gift { get; set; } = null!;
    public int Quantity { get; set; }
    public int PointsSpent { get; set; }
    public RedemptionStatus Status { get; private set; } = RedemptionStatus.Requested;
    public DateTimeOffset RequestedAt { get; set; }
    public DateTimeOffset? ClosedAt { get; private set; }
    public int? ClosedById { get; private set; }
    public Employee? ClosedBy { get; private set; }
    public string? Note { get; private set; }

    public void Fulfill(int byId, DateTimeOffset now) => Close(RedemptionStatus.Fulfilled, byId, now, null);

    public void Cancel(int byId, DateTimeOffset now, string reason) => Close(RedemptionStatus.Cancelled, byId, now, reason);

    /// <summary>A gift that was already handed over is taken back. Before hand-over, <see cref="Cancel"/> is the right action.</summary>
    public void Refund(int byId, DateTimeOffset now, string reason)
    {
        if (Status != RedemptionStatus.Fulfilled)
            throw new DomainException(ErrorCodes.RedemptionAlreadyClosed, "Only a claim that was handed over can be refunded.");
        Status = RedemptionStatus.Refunded;
        ClosedById = byId;
        ClosedAt = now;
        Note = reason;
    }

    /// <summary>Takes back a "fulfilled" mark. A cancelled claim stays cancelled: its points were already refunded.</summary>
    public void Reopen()
    {
        if (Status != RedemptionStatus.Fulfilled)
            throw new DomainException(ErrorCodes.RedemptionAlreadyClosed, "Only a fulfilled claim can be reopened.");
        Status = RedemptionStatus.Requested;
        ClosedAt = null;
        ClosedById = null;
        ClosedBy = null;
    }

    private void Close(RedemptionStatus status, int byId, DateTimeOffset now, string? note)
    {
        if (Status != RedemptionStatus.Requested)
            throw new DomainException(ErrorCodes.RedemptionAlreadyClosed, "The redemption is already closed.");
        Status = status;
        ClosedById = byId;
        ClosedAt = now;
        Note = note;
    }
}
