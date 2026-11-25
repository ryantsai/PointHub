using PointHub.Api.Http;
using PointHub.Domain.Common;
using PointHub.Domain.Events;
using PointHub.Domain.Gifts;
using PointHub.Infrastructure.Persistence;

namespace PointHub.Tests;

public class SearchTextTests
{
    [Fact]
    public void A_search_box_value_becomes_distinct_terms()
    {
        Assert.Equal(["mug", "coffee"], SearchText.Terms("  mug   coffee MUG "));
        Assert.Empty(SearchText.Terms(null));
        Assert.Empty(SearchText.Terms("   "));
        Assert.Equal(SearchText.MaxTerms, SearchText.Terms("a b c d e f g").Count);
    }

    [Fact]
    public void An_event_can_be_found_by_any_language_and_by_its_location()
    {
        var ev = new Event
        {
            Title = new("Year-end Kickoff", "年末キックオフ", "年終啟動大會"),
            Description = new("All-hands with dinner", null, "全員大會，會後聚餐"),
            Location = "HQ 12F Hall",
        };
        ev.RefreshSearchText();

        foreach (var word in new[] { "Kickoff", "キックオフ", "啟動", "聚餐", "12F" })
            Assert.Contains(word, ev.SearchText);
        Assert.DoesNotContain("zhHant", ev.SearchText); // plain wording only, no JSON keys to match by accident
    }

    [Fact]
    public void A_gift_can_be_found_by_name_or_description()
    {
        var gift = new Gift { Name = new("Company Mug", "オリジナルマグカップ", "公司馬克杯"), Description = new("Ceramic, 350 ml.") };
        gift.RefreshSearchText();

        Assert.Contains("馬克杯", gift.SearchText);
        Assert.Contains("Ceramic", gift.SearchText);
    }
}

public class GiftCatalogTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 25, 9, 0, 0, TimeSpan.Zero);

    private static Gift NewGift(int id, int cost, int addedDaysAgo) =>
        new() { Id = id, Name = new($"Gift {id}"), PointCost = cost, CreatedAt = Now.AddDays(-addedDaysAgo) };

    private static Redemption Claim(int giftId, int quantity) => new() { GiftId = giftId, Quantity = quantity };

    private static int[] Ids(IEnumerable<Gift> gifts) => [.. gifts.Select(g => g.Id)];

    private static readonly Gift[] Gifts = [NewGift(1, 500, 10), NewGift(2, 30, 90), NewGift(3, 80, 40), NewGift(4, 30, 5)];

    [Fact]
    public void The_most_claimed_gift_comes_first_and_ties_go_cheapest_first()
    {
        var handedOver = Claim(3, 2);
        handedOver.Fulfill(byId: 7, Now);
        Redemption[] claims = [Claim(1, 1), handedOver, Claim(3, 1)];

        // 3 has three units out, 1 has one; 2 and 4 have none and cost the same, so the older id leads.
        Assert.Equal([3, 1, 2, 4], Ids(Gifts.AsQueryable().Sorted(GiftSort.Popular, claims.AsQueryable())));
    }

    [Fact]
    public void Claims_that_were_cancelled_or_refunded_do_not_make_a_gift_popular()
    {
        var cancelled = Claim(1, 5);
        cancelled.Cancel(byId: 7, Now, "Changed their mind");
        var refunded = Claim(1, 5);
        refunded.Fulfill(byId: 7, Now);
        refunded.Refund(byId: 7, Now, "Arrived broken");
        Redemption[] claims = [cancelled, refunded, Claim(3, 1)];

        Assert.Equal([3, 2, 4, 1], Ids(Gifts.AsQueryable().Sorted(GiftSort.Popular, claims.AsQueryable())));
    }

    [Fact]
    public void The_catalogue_can_be_ordered_by_cost_and_by_age()
    {
        var none = Array.Empty<Redemption>().AsQueryable();

        Assert.Equal([2, 4, 3, 1], Ids(Gifts.AsQueryable().Sorted(GiftSort.CostAsc, none)));
        Assert.Equal([1, 3, 2, 4], Ids(Gifts.AsQueryable().Sorted(GiftSort.CostDesc, none)));
        Assert.Equal([4, 1, 3, 2], Ids(Gifts.AsQueryable().Sorted(GiftSort.Newest, none)));
    }
}

public class CsvExportTests
{
    [Theory]
    [InlineData("plain", "plain")]
    [InlineData("Staff, Taylor", "\"Staff, Taylor\"")]
    [InlineData("He said \"hi\"", "\"He said \"\"hi\"\"\"")]
    [InlineData("line1\nline2", "\"line1\nline2\"")]
    [InlineData("陳 志明", "陳 志明")]
    public void Text_is_quoted_only_when_it_has_to_be(string value, string expected) =>
        Assert.Equal(expected, CsvExport.Cell(value));

    [Theory]
    [InlineData("=HYPERLINK(\"http://evil\")", "\"'=HYPERLINK(\"\"http://evil\"\")\"")]
    [InlineData("+1 bonus", "'+1 bonus")]
    [InlineData("-refund", "'-refund")]
    [InlineData("@SUM(A1)", "'@SUM(A1)")]
    public void Text_that_a_spreadsheet_would_run_as_a_formula_is_defused(string value, string expected) =>
        Assert.Equal(expected, CsvExport.Cell(value));

    [Fact]
    public void Numbers_dates_and_flags_are_written_plainly()
    {
        Assert.Equal("-80", CsvExport.Cell(-80));          // a real negative number is not text and stays a number
        Assert.Equal("1234567", CsvExport.Cell(1234567L));
        Assert.Equal("1", CsvExport.Cell(true));
        Assert.Equal("", CsvExport.Cell(null));
        Assert.Equal("7,-80,\"a,b\",", CsvExport.Line([7, -80, "a,b", null]));
    }
}
