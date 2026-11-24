using PointHub.Domain.Common;
using PointHub.Domain.Employees;
using PointHub.Domain.Events;
using PointHub.Domain.Gifts;
using PointHub.Domain.Integration;

namespace PointHub.Domain.Points;

public enum PointTransactionType
{
    EventAward = 1,
    Redemption = 2,
    Adjustment = 3,
    Reversal = 4,
    Expiry = 5,
    /// <summary>Points added by another application through the integration API.</summary>
    ExternalCredit = 6,
    /// <summary>Points spent in another application through the integration API.</summary>
    ExternalDebit = 7,
}

/// <summary>
/// Cached totals for one employee. The ledger (<see cref="PointTransaction"/>) is the source of truth;
/// this row exists so balance checks are one read and concurrent writers collide on <see cref="RowVersion"/>.
/// </summary>
public class PointAccount
{
    public int EmployeeId { get; set; }
    public int Balance { get; private set; }
    public int LifetimeEarned { get; private set; }
    public int LifetimeSpent { get; private set; }
    public byte[] RowVersion { get; set; } = [];

    /// <param name="amount">Signed: positive credits, negative debits.</param>
    /// <param name="rootType">The transaction type, or for a reversal the type of the transaction being reversed.</param>
    /// <param name="allowNegativeBalance">Admin corrections may push a balance below zero; spending may not.</param>
    public void Apply(int amount, PointTransactionType rootType, bool allowNegativeBalance)
    {
        if (amount == 0) throw new DomainException(ErrorCodes.ValidationFailed, "Amount must not be zero.");
        if (amount < 0 && !allowNegativeBalance && Balance + amount < 0)
            throw new DomainException(ErrorCodes.InsufficientPoints, "Not enough points.");

        Balance = checked(Balance + amount);
        switch (rootType)
        {
            case PointTransactionType.EventAward or PointTransactionType.Adjustment or PointTransactionType.ExternalCredit:
                LifetimeEarned += amount;
                break;
            case PointTransactionType.Redemption or PointTransactionType.ExternalDebit:
                LifetimeSpent -= amount;
                break;
        }
    }
}

/// <summary>One immutable ledger line. Rows are never updated or deleted; corrections are new rows.</summary>
public class PointTransaction
{
    public long Id { get; set; }
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
    public int Amount { get; set; }
    public PointTransactionType Type { get; set; }
    public string? Reason { get; set; }

    public int? EventId { get; set; }
    public Event? Event { get; set; }
    public int? RedemptionId { get; set; }
    public Redemption? Redemption { get; set; }

    public long? ReversesTransactionId { get; set; }
    public PointTransaction? ReversesTransaction { get; set; }
    public PointTransaction? ReversedByTransaction { get; set; }

    /// <summary>Set when another application created the transaction through the integration API.</summary>
    public int? ApiClientId { get; set; }
    public ApiClient? ApiClient { get; set; }

    /// <summary>The calling application's own id for the operation. Unique per client, which makes retries idempotent.</summary>
    public string? ExternalReference { get; set; }

    public int? CreatedById { get; set; }
    public Employee? CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
