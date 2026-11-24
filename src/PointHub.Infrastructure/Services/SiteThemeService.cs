using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PointHub.Domain.Common;
using PointHub.Domain.Site;
using PointHub.Infrastructure.Persistence;

namespace PointHub.Infrastructure.Services;

public enum ThemeMode { Calendar = 0, Forced = 1 }

public sealed record ThemeSettings(
    ThemeMode Mode, string? ForcedThemeKey, IReadOnlyList<string> DisabledThemeKeys,
    string ActiveTheme, string CalendarTheme, DateOnly Today, IReadOnlyList<ThemeWindow> Calendar);

/// <summary>
/// Which seasonal theme the site shows. By default it follows Taiwan's festival calendar
/// (<see cref="FestivalCalendar"/>); a system admin can skip individual festivals or force one theme.
/// </summary>
public sealed class SiteThemeService(PointHubDbContext db, IOptions<SiteOptions> options, TimeProvider clock)
{
    public async Task<string> GetActiveThemeAsync(CancellationToken ct) => (await GetSettingsAsync(ct)).ActiveTheme;

    public async Task<ThemeSettings> GetSettingsAsync(CancellationToken ct)
    {
        var stored = await db.SiteSettings.AsNoTracking()
            .Where(s => s.Key.StartsWith("theme.")).ToDictionaryAsync(s => s.Key, s => s.Value, ct);

        var forced = stored.GetValueOrDefault(SiteSetting.ThemeForced);
        var mode = stored.GetValueOrDefault(SiteSetting.ThemeMode) == nameof(ThemeMode.Forced) && ThemeKeys.IsKnown(forced)
            ? ThemeMode.Forced
            : ThemeMode.Calendar;
        var disabled = (stored.GetValueOrDefault(SiteSetting.ThemeDisabled) ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries).Where(ThemeKeys.Festivals.Contains).ToList();

        var zone = TimeZoneInfo.FindSystemTimeZoneById(options.Value.TimeZone);
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(clock.GetUtcNow(), zone).DateTime);
        var calendarTheme = FestivalCalendar.ThemeOn(today, disabled);

        return new ThemeSettings(
            mode, mode == ThemeMode.Forced ? forced : null, disabled,
            ActiveTheme: mode == ThemeMode.Forced ? forced! : calendarTheme,
            calendarTheme, today,
            FestivalCalendar.Between(today, today.AddYears(1)));
    }

    public async Task<ThemeSettings> UpdateAsync(ThemeMode mode, string? forcedThemeKey, IReadOnlyCollection<string> disabledThemeKeys, int actorId, CancellationToken ct)
    {
        if (mode == ThemeMode.Forced && !ThemeKeys.IsKnown(forcedThemeKey))
            throw new DomainException(ErrorCodes.ValidationFailed, "Choose the theme to force.");
        if (disabledThemeKeys.Any(key => !ThemeKeys.Festivals.Contains(key)))
            throw new DomainException(ErrorCodes.ValidationFailed, "Unknown festival theme.");

        await SetAsync(SiteSetting.ThemeMode, mode.ToString(), ct);
        await SetAsync(SiteSetting.ThemeForced, mode == ThemeMode.Forced ? forcedThemeKey : null, ct);
        await SetAsync(SiteSetting.ThemeDisabled, string.Join(',', disabledThemeKeys.Distinct()), ct);

        var summary = mode == ThemeMode.Forced ? $"Forced: {forcedThemeKey}" : "Follow the festival calendar";
        if (disabledThemeKeys.Count > 0) summary += $"; skipped: {string.Join(", ", disabledThemeKeys)}";
        db.Audit(actorId, "site.theme", nameof(SiteSetting), "theme", summary, clock);
        await db.SaveChangesAsync(ct);
        return await GetSettingsAsync(ct);
    }

    private async Task SetAsync(string key, string? value, CancellationToken ct)
    {
        var setting = await db.SiteSettings.FirstOrDefaultAsync(s => s.Key == key, ct);
        if (setting is null) db.SiteSettings.Add(setting = new SiteSetting { Key = key });
        setting.Value = value;
    }
}
