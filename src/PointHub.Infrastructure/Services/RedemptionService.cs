using System.Globalization;
using Microsoft.EntityFrameworkCore;
using PointHub.Domain.Common;
using PointHub.Domain.Gifts;
using PointHub.Domain.Notifications;
using PointHub.Domain.Points;
using PointHub.Infrastructure.Persistence;

namespace PointHub.Infrastructure.Services;

public sealed class RedemptionService(PointHubDbContext db, PointLedger ledger, EmailService email, TimeProvider clock)
{
    /// <summary>Takes the points and reserves the stock immediately; a gift manager fulfils or cancels later.</summary>
    public async Task<Redemption> RedeemAsync(int giftId, int employeeId, int quantity, CancellationToken ct)
    {
        if (quantity < 1) throw new DomainException(ErrorCodes.ValidationFailed, "Quantity must be at least 1.");

        var gift = await db.Gifts.FirstOrDefaultAsync(g => g.Id == giftId, ct)
            ?? throw new DomainException(ErrorCodes.NotFound, "Gift not found.");
        gift.EnsureRedeemable();

        if (gift.PerEmployeeLimit is { } limit)
        {
            var already = await db.Redemptions
                .Where(r => r.GiftId == giftId && r.EmployeeId == employeeId && r.Status != RedemptionStatus.Cancelled)
                .SumAsync(r => (int?)r.Quantity, ct) ?? 0;
            if (already + quantity > limit)
                throw new DomainException(ErrorCodes.GiftLimitReached, "Per-employee limit reached.");
        }

        var now = clock.GetUtcNow();
        var redemption = new Redemption
        {
            EmployeeId = employeeId,
            Gift = gift,
            Quantity = quantity,
            PointsSpent = checked(gift.PointCost * quantity),
            RequestedAt = now,
        };
        db.Redemptions.Add(redemption);

        gift.ChangeStock(-quantity);
        db.GiftStockMovements.Add(new GiftStockMovement
        {
            Gift = gift, Delta = -quantity, Reason = "Redemption", Redemption = redemption, CreatedById = employeeId, CreatedAt = now,
        });

        if (redemption.PointsSpent > 0)
        {
            var debit = await ledger.PostAsync(employeeId, -redemption.PointsSpent, PointTransactionType.Redemption, null, employeeId, ct);
            debit.Redemption = redemption;
        }

        redemption.Employee = await db.Employees.FirstAsync(e => e.Id == employeeId, ct);
        await NotifyAsync(EmailTemplates.RedemptionRequested, redemption, reason: null, ct);
        await db.SaveChangesAsync(ct);
        return redemption;
    }

    /// <summary>A gift admin marks the claim as handed over.</summary>
    public async Task<Redemption> FulfillAsync(int redemptionId, int actorId, CancellationToken ct)
    {
        var redemption = await LoadAsync(redemptionId, ct);
        redemption.Fulfill(actorId, clock.GetUtcNow());
        db.Audit(actorId, "redemption.fulfill", nameof(Redemption), redemption.Id, null, clock);
        await NotifyAsync(EmailTemplates.RedemptionFulfilled, redemption, reason: null, ct);
        await db.SaveChangesAsync(ct);
        return redemption;
    }

    /// <summary>Undoes a "fulfilled" mark made by mistake. Points and stock are untouched; no email is sent.</summary>
    public async Task<Redemption> ReopenAsync(int redemptionId, int actorId, CancellationToken ct)
    {
        var redemption = await LoadAsync(redemptionId, ct);
        redemption.Reopen();
        db.Audit(actorId, "redemption.reopen", nameof(Redemption), redemption.Id, "Fulfilled mark removed", clock);
        await db.SaveChangesAsync(ct);
        return redemption;
    }

    /// <summary>Refunds the points with a reversal and puts the stock back.</summary>
    public async Task<Redemption> CancelAsync(int redemptionId, int actorId, string reason, CancellationToken ct)
    {
        var redemption = await LoadAsync(redemptionId, ct);
        var now = clock.GetUtcNow();
        redemption.Cancel(actorId, now, reason);

        var debit = await db.PointTransactions.FirstOrDefaultAsync(
            t => t.RedemptionId == redemption.Id && t.Type == PointTransactionType.Redemption, ct);
        if (debit is not null)
            await ledger.PostAsync(redemption.EmployeeId, -debit.Amount, PointTransactionType.Reversal, reason, actorId, ct, reverses: debit);

        redemption.Gift.ChangeStock(redemption.Quantity);
        db.GiftStockMovements.Add(new GiftStockMovement
        {
            Gift = redemption.Gift, Delta = redemption.Quantity, Reason = $"Redemption cancelled: {reason}",
            Redemption = redemption, CreatedById = actorId, CreatedAt = now,
        });

        db.Audit(actorId, "redemption.cancel", nameof(Redemption), redemption.Id, reason, clock);
        await NotifyAsync(EmailTemplates.RedemptionCancelled, redemption, reason, ct);
        await db.SaveChangesAsync(ct);
        return redemption;
    }

    private Task NotifyAsync(string templateKey, Redemption redemption, string? reason, CancellationToken ct) =>
        email.QueueAsync(templateKey, redemption.Employee, locale => new()
        {
            ["giftName"] = redemption.Gift.Name.For(locale),
            ["quantity"] = redemption.Quantity.ToString(CultureInfo.InvariantCulture),
            ["points"] = redemption.PointsSpent.ToString("N0", CultureInfo.InvariantCulture),
            ["reason"] = string.IsNullOrWhiteSpace(reason) ? "–" : reason,
        }, ct);

    public async Task<Gift> AdjustStockAsync(int giftId, int delta, string reason, int actorId, CancellationToken ct)
    {
        var gift = await db.Gifts.FirstOrDefaultAsync(g => g.Id == giftId, ct)
            ?? throw new DomainException(ErrorCodes.NotFound, "Gift not found.");
        if (delta == 0) throw new DomainException(ErrorCodes.ValidationFailed, "Delta must not be zero.");

        gift.ChangeStock(delta);
        db.GiftStockMovements.Add(new GiftStockMovement
        {
            Gift = gift, Delta = delta, Reason = reason, CreatedById = actorId, CreatedAt = clock.GetUtcNow(),
        });
        db.Audit(actorId, "gift.stock", nameof(Gift), gift.Id, $"{delta:+#;-#}: {reason}", clock);
        await db.SaveChangesAsync(ct);
        return gift;
    }

    private async Task<Redemption> LoadAsync(int id, CancellationToken ct) =>
        await db.Redemptions.Include(r => r.Gift).Include(r => r.Employee).FirstOrDefaultAsync(r => r.Id == id, ct)
        ?? throw new DomainException(ErrorCodes.NotFound, "Redemption not found.");
}
