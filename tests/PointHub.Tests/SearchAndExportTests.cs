using PointHub.Api.Http;
using PointHub.Domain.Common;
using PointHub.Domain.Events;
using PointHub.Domain.Gifts;

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
