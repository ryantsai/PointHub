namespace PointHub.Domain.Common;

/// <summary>
/// User-entered text in the three supported languages. English is mandatory and is the fallback.
/// Stored as one JSON column so adding a language later does not need a schema change.
/// </summary>
public sealed record LocalizedText(string En, string? Ja = null, string? ZhHant = null)
{
    public string For(string? locale) => locale switch
    {
        Locales.Japanese when !string.IsNullOrWhiteSpace(Ja) => Ja,
        Locales.TraditionalChinese when !string.IsNullOrWhiteSpace(ZhHant) => ZhHant,
        _ => En,
    };
}

public static class Locales
{
    public const string English = "en";
    public const string Japanese = "ja";
    public const string TraditionalChinese = "zh-Hant";

    public static readonly IReadOnlyList<string> All = [English, Japanese, TraditionalChinese];

    public static bool IsSupported(string? locale) => locale is not null && All.Contains(locale);
}
