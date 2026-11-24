using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PointHub.Domain.Common;
using PointHub.Domain.Employees;
using PointHub.Domain.Notifications;
using PointHub.Domain.Points;
using PointHub.Domain.Site;
using PointHub.Infrastructure.Persistence;

namespace PointHub.Infrastructure.Services;

/// <summary>
/// The only place that writes point transactions. Every method stages changes on the DbContext and
/// leaves <c>SaveChangesAsync</c> to the caller, so a ledger line and the business change that caused
/// it (check-in approval, redemption, ...) commit in one database transaction.
/// </summary>
public sealed class PointLedger(PointHubDbContext db, EmailService email, TimeProvider clock)
{
    public async Task<PointTransaction> PostAsync(
        int employeeId, int amount, PointTransactionType type, string? reason, int? actorId,
        CancellationToken ct, PointTransaction? reverses = null, bool allowNegativeBalance = false)
    {
        var account = await db.PointAccounts.FirstOrDefaultAsync(a => a.EmployeeId == employeeId, ct)
            ?? throw new DomainException(ErrorCodes.NotFound, "Employee has no point account.");

        account.Apply(amount, reverses?.Type ?? type, allowNegativeBalance);

        var transaction = new PointTransaction
        {
            EmployeeId = employeeId,
            Amount = amount,
            Type = type,
            Reason = reason,
            ReversesTransaction = reverses,
            EventId = reverses?.EventId,
            RedemptionId = reverses?.RedemptionId,
            CreatedById = actorId,
            CreatedAt = clock.GetUtcNow(),
        };
        db.PointTransactions.Add(transaction);
        return transaction;
    }

    /// <summary>
    /// A credit or debit requested by another application. Replaying the same <paramref name="externalReference"/>
    /// returns the transaction that was created the first time instead of moving points twice.
    /// </summary>
    public async Task<(PointTransaction Transaction, bool Created)> PostExternalAsync(
        int apiClientId, string employeeNo, int amount, string reason, string externalReference, CancellationToken ct)
    {
        var existing = await db.PointTransactions
            .FirstOrDefaultAsync(t => t.ApiClientId == apiClientId && t.ExternalReference == externalReference, ct);
        if (existing is not null) return (existing, false);

        var employee = await db.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.EmployeeNo == employeeNo, ct)
            ?? throw new DomainException(ErrorCodes.NotFound, "Employee not found.");
        if (!employee.IsActive) throw new DomainException(ErrorCodes.EmployeeInactive, "The employee is deactivated.");

        var type = amount > 0 ? PointTransactionType.ExternalCredit : PointTransactionType.ExternalDebit;
        var transaction = await PostAsync(employee.Id, amount, type, reason, actorId: null, ct);
        transaction.ApiClientId = apiClientId;
        transaction.ExternalReference = externalReference;
        await db.SaveChangesAsync(ct);
        return (transaction, true);
    }

    /// <summary>Admin correction: add or remove points with a mandatory reason.</summary>
    public async Task<PointTransaction> AdjustAsync(int employeeId, int amount, string reason, int actorId, CancellationToken ct)
    {
        var employee = await db.Employees.FirstOrDefaultAsync(e => e.Id == employeeId, ct)
            ?? throw new DomainException(ErrorCodes.NotFound, "Employee not found.");

        var transaction = await PostAsync(employeeId, amount, PointTransactionType.Adjustment, reason, actorId, ct, allowNegativeBalance: true);
        await NotifyAdjustedAsync(employee, amount, reason, ct);
        db.Audit(actorId, "points.adjust", "Employee", employeeId, $"{amount:+#;-#} points: {reason}", clock);
        await db.SaveChangesAsync(ct);
        return transaction;
    }

    /// <summary>
    /// Admin revert: writes the opposite transaction and, for an event award, flips the check-in to reverted.
    /// Redemption debits are not reverted here; cancel the redemption instead so stock is returned too.
    /// </summary>
    public async Task<PointTransaction> RevertAsync(long transactionId, string reason, int actorId, CancellationToken ct)
    {
        var original = await db.PointTransactions.Include(t => t.ReversedByTransaction)
            .FirstOrDefaultAsync(t => t.Id == transactionId, ct)
            ?? throw new DomainException(ErrorCodes.NotFound, "Transaction not found.");

        if (original.Type is PointTransactionType.Reversal or PointTransactionType.Redemption)
            throw new DomainException(ErrorCodes.NotReversible, "This kind of transaction cannot be reverted directly.");
        if (original.ReversedByTransaction is not null)
            throw new DomainException(ErrorCodes.AlreadyReversed, "The transaction has already been reverted.");

        var reversal = await PostAsync(original.EmployeeId, -original.Amount, PointTransactionType.Reversal, reason, actorId, ct,
            reverses: original, allowNegativeBalance: true);

        var checkIn = await db.CheckIns.FirstOrDefaultAsync(c => c.AwardTransactionId == original.Id, ct);
        checkIn?.MarkReverted(reason);

        await NotifyAdjustedAsync(await db.Employees.FirstAsync(e => e.Id == original.EmployeeId, ct), reversal.Amount, reason, ct);
        db.Audit(actorId, "points.revert", nameof(PointTransaction), original.Id, reason, clock);
        await db.SaveChangesAsync(ct);
        return reversal;
    }

    private Task NotifyAdjustedAsync(Employee employee, int amount, string reason, CancellationToken ct) =>
        email.QueueAsync(EmailTemplates.PointsAdjusted, employee, _ => new()
        {
            ["points"] = amount.ToString("+#,0;-#,0", CultureInfo.InvariantCulture),
            ["reason"] = reason,
        }, ct);
}

public static class AuditExtensions
{
    /// <summary>Stages an audit line; it is saved with the change it describes.</summary>
    public static void Audit(this PointHubDbContext db, int? actorId, string action, string entityType, object? entityId, string? summary, TimeProvider clock)
        => db.AuditLogs.Add(new AuditLog
        {
            ActorId = actorId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId?.ToString(),
            Summary = summary is { Length: > 1000 } ? summary[..1000] : summary,
            CreatedAt = clock.GetUtcNow(),
        });
}
