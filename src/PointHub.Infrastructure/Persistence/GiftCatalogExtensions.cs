using PointHub.Domain.Gifts;

namespace PointHub.Infrastructure.Persistence;

/// <summary>The orders an employee can put the gift catalogue in. The names are the values of <c>?sort=</c>.</summary>
public enum GiftSort
{
    /// <summary>Most claimed first. The default.</summary>
    Popular = 0,
    CostAsc = 1,
    CostDesc = 2,
    /// <summary>Latest additions first.</summary>
    Newest = 3,
}

public static class GiftCatalogExtensions
{
    /// <summary>
    /// Orders the catalogue. "Popular" counts the units people hold or are waiting for: cancelled and refunded
    /// claims do not count, so a gift cannot stay on top because of claims that were taken back. Gifts with the
    /// same count go cheapest first, and every order ends on the id, so the list never shuffles between two calls.
    /// </summary>
    public static IQueryable<Gift> Sorted(this IQueryable<Gift> gifts, GiftSort sort, IQueryable<Redemption> redemptions) => sort switch
    {
        GiftSort.CostAsc => gifts.OrderBy(g => g.PointCost).ThenBy(g => g.Id),
        GiftSort.CostDesc => gifts.OrderByDescending(g => g.PointCost).ThenBy(g => g.Id),
        GiftSort.Newest => gifts.OrderByDescending(g => g.CreatedAt).ThenByDescending(g => g.Id),
        _ => gifts
            .OrderByDescending(g => redemptions
                .Where(r => r.GiftId == g.Id && (r.Status == RedemptionStatus.Requested || r.Status == RedemptionStatus.Fulfilled))
                .Sum(r => (int?)r.Quantity) ?? 0)
            .ThenBy(g => g.PointCost).ThenBy(g => g.Id),
    };
}
