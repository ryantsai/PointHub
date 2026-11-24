using System.Globalization;

namespace PointHub.Domain.Site;

/// <summary>Theme keys shared with the web client (web/src/themes). Add a key here and a theme there together.</summary>
public static class ThemeKeys
{
    public const string Default = "default";
    public const string NewYear = "new-year";
    public const string LunarNewYear = "lunar-new-year";
    public const string LanternFestival = "lantern-festival";
    public const string Qingming = "qingming";
    public const string DragonBoat = "dragon-boat";
    public const string Qixi = "qixi";
    public const string GhostFestival = "ghost-festival";
    public const string MidAutumn = "mid-autumn";
    public const string NationalDay = "national-day";
    public const string DoubleNinth = "double-ninth";
    public const string WinterSolstice = "winter-solstice";
    public const string Christmas = "christmas";

    public static readonly IReadOnlyList<string> Festivals =
    [
        NewYear, LunarNewYear, LanternFestival, Qingming, DragonBoat, Qixi, GhostFestival,
        MidAutumn, NationalDay, DoubleNinth, WinterSolstice, Christmas,
    ];

    public static bool IsKnown(string? key) => key == Default || Festivals.Contains(key);
}

/// <summary>The days (inclusive) on which a festival theme is shown.</summary>
public sealed record ThemeWindow(string ThemeKey, DateOnly FestivalDate, DateOnly StartsOn, DateOnly EndsOn)
{
    public int Days => EndsOn.DayNumber - StartsOn.DayNumber + 1;
    public bool Contains(DateOnly date) => StartsOn <= date && date <= EndsOn;
}

/// <summary>
/// Taiwan's common festivals for any year, so the seasonal theme never needs a hand-maintained schedule.
/// Lunar festivals come from the lunisolar calendar; Qingming and the winter solstice are solar terms.
/// </summary>
public static class FestivalCalendar
{
    private static readonly ChineseLunisolarCalendar Lunar = new();

    /// <summary>Festival, how to date it, and how many days before and after the day itself the theme shows.</summary>
    private static readonly (string Key, Func<int, DateOnly> Date, int LeadDays, int TrailDays)[] Rules =
    [
        (ThemeKeys.NewYear, year => new DateOnly(year, 1, 1), 2, 1),
        (ThemeKeys.LunarNewYear, year => FromLunar(year, 1, 1), 10, 5),
        (ThemeKeys.LanternFestival, year => FromLunar(year, 1, 15), 4, 1),
        (ThemeKeys.Qingming, year => new DateOnly(year, 4, SolarTermDay(year, 4.81)), 2, 1),
        (ThemeKeys.DragonBoat, year => FromLunar(year, 5, 5), 7, 1),
        (ThemeKeys.Qixi, year => FromLunar(year, 7, 7), 3, 0),
        (ThemeKeys.GhostFestival, year => FromLunar(year, 7, 15), 1, 0),
        (ThemeKeys.MidAutumn, year => FromLunar(year, 8, 15), 10, 1),
        (ThemeKeys.NationalDay, year => new DateOnly(year, 10, 10), 5, 0),
        (ThemeKeys.DoubleNinth, year => FromLunar(year, 9, 9), 1, 0),
        (ThemeKeys.WinterSolstice, year => new DateOnly(year, 12, SolarTermDay(year, 21.94)), 2, 0),
        (ThemeKeys.Christmas, year => new DateOnly(year, 12, 25), 15, 1),
    ];

    /// <summary>Every window that touches the given range, ordered by start date.</summary>
    public static IReadOnlyList<ThemeWindow> Between(DateOnly from, DateOnly to)
    {
        var windows = new List<ThemeWindow>();
        // A window can start in the previous year (New Year's Day) and the range may span a year end.
        for (var year = from.Year; year <= to.Year + 1; year++)
        {
            foreach (var (key, date, lead, trail) in Rules)
            {
                var day = date(year);
                var window = new ThemeWindow(key, day, day.AddDays(-lead), day.AddDays(trail));
                if (window.EndsOn >= from && window.StartsOn <= to) windows.Add(window);
            }
        }
        return windows.OrderBy(w => w.StartsOn).ThenBy(w => w.Days).ToList();
    }

    /// <summary>
    /// The theme the calendar shows on a date. When festivals overlap the shorter window wins, so a one-day
    /// festival is not hidden by a long season around it (winter solstice inside the Christmas period).
    /// </summary>
    public static string ThemeOn(DateOnly date, IReadOnlyCollection<string>? disabled = null) =>
        Between(date, date)
            .Where(w => w.Contains(date) && disabled?.Contains(w.ThemeKey) != true)
            .OrderBy(w => w.Days)
            .Select(w => w.ThemeKey)
            .FirstOrDefault(ThemeKeys.Default);

    /// <param name="year">The Gregorian year in which that lunar year begins.</param>
    private static DateOnly FromLunar(int year, int month, int day)
    {
        // In a leap year the calendar numbers months 1..13; every month after the leap month shifts by one.
        var leapMonth = Lunar.GetLeapMonth(year);
        var monthIndex = leapMonth > 0 && month >= leapMonth ? month + 1 : month;
        return DateOnly.FromDateTime(Lunar.ToDateTime(year, monthIndex, day, 0, 0, 0, 0));
    }

    /// <summary>
    /// Day of the month of a solar term in Taiwan time, by the standard 21st-century approximation
    /// (century constant <paramref name="c"/>; exact for the years this application will see, valid 2001–2099).
    /// </summary>
    private static int SolarTermDay(int year, double c)
    {
        var y = year % 100;
        return (int)Math.Floor(y * 0.2422 + c) - y / 4;
    }
}
