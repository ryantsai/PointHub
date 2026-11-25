namespace PointHub.Domain.Common;

/// <summary>
/// Free-text search, kept deliberately simple: a search box value is split into terms and every term must be
/// found somewhere in the searched text. Titles and descriptions exist in three languages inside one JSON
/// column each, so events and gifts also carry a plain <c>SearchText</c> column with all of that wording,
/// which the database can match directly (and which finds Chinese and Japanese as easily as English).
/// </summary>
public static class SearchText
{
    public const int MaxTerms = 5;
    private const int MaxTermLength = 50;

    /// <summary>The distinct terms of a search box value; empty when there is nothing to search for.</summary>
    public static IReadOnlyList<string> Terms(string? query) =>
        (query ?? "").Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(term => term.Length > MaxTermLength ? term[..MaxTermLength] : term)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(MaxTerms)
            .ToList();

    /// <summary>Everything a record can be found by, in one line. Empty and repeated parts are dropped.</summary>
    public static string Join(params string?[] parts) =>
        string.Join(" ", parts.Where(part => !string.IsNullOrWhiteSpace(part)).Select(part => part!.Trim()).Distinct());

    public static string Join(LocalizedText? first, LocalizedText? second = null, params string?[] more) =>
        Join([first?.En, first?.Ja, first?.ZhHant, second?.En, second?.Ja, second?.ZhHant, .. more]);
}
