using PointHub.Domain.Common;
using PointHub.Domain.Employees;
using PointHub.Domain.Events;
using PointHub.Domain.Gifts;
using PointHub.Domain.Integration;
using PointHub.Domain.Notifications;
using PointHub.Domain.Points;
using PointHub.Domain.Site;
using PointHub.Infrastructure.Services;

namespace PointHub.Tests;

public class CardUidTests
{
    [Theory]
    [InlineData("04:a2:3b:1c", "04A23B1C")]
    [InlineData("04 A2 3B 1C", "04A23B1C")]
    [InlineData("0x04a23b1c", "04A23B1C")]
    [InlineData("04-D1-E2-F3-A4-B5-C6", "04D1E2F3A4B5C6")]
    [InlineData("0077740828", "04A23B1C")] // 10-digit decimal from a keyboard-wedge reader
    public void Normalizes_common_reader_formats(string raw, string expected) =>
        Assert.Equal(expected, CardUid.Normalize(raw));

    [Theory]
    [InlineData("")]
    [InlineData("04A23B")]        // 3 bytes
    [InlineData("04A23B1C5")]     // odd length
    [InlineData("hello world")]
    public void Rejects_anything_that_is_not_a_uid(string raw) =>
        Assert.Equal(ErrorCodes.InvalidCardUid, Assert.Throws<DomainException>(() => CardUid.Normalize(raw)).Code);
}

public class PointAccountTests
{
    [Fact]
    public void Award_then_redemption_tracks_balance_and_lifetime_totals()
    {
        var account = new PointAccount();
        account.Apply(100, PointTransactionType.EventAward, allowNegativeBalance: false);
        account.Apply(-30, PointTransactionType.Redemption, allowNegativeBalance: false);

        Assert.Equal((70, 100, 30), (account.Balance, account.LifetimeEarned, account.LifetimeSpent));
    }

    [Fact]
    public void Spending_more_than_the_balance_is_refused()
    {
        var account = new PointAccount();
        account.Apply(20, PointTransactionType.EventAward, allowNegativeBalance: false);

        var error = Assert.Throws<DomainException>(() => account.Apply(-21, PointTransactionType.Redemption, allowNegativeBalance: false));
        Assert.Equal(ErrorCodes.InsufficientPoints, error.Code);
        Assert.Equal(20, account.Balance);
    }

    [Fact]
    public void Reverting_an_award_after_the_points_were_spent_may_go_negative()
    {
        var account = new PointAccount();
        account.Apply(50, PointTransactionType.EventAward, allowNegativeBalance: false);
        account.Apply(-50, PointTransactionType.Redemption, allowNegativeBalance: false);
        account.Apply(-50, PointTransactionType.EventAward, allowNegativeBalance: true); // the reversal carries the root type

        Assert.Equal((-50, 0, 50), (account.Balance, account.LifetimeEarned, account.LifetimeSpent));
    }
}

public class CheckInTests
{
    [Fact]
    public void A_decided_check_in_cannot_be_decided_again()
    {
        var checkIn = new EventCheckIn();
        checkIn.Approve(decidedById: 1, DateTimeOffset.UtcNow);

        Assert.Equal(CheckInStatus.Approved, checkIn.Status);
        Assert.Equal(ErrorCodes.CheckInAlreadyDecided,
            Assert.Throws<DomainException>(() => checkIn.Reject(1, DateTimeOffset.UtcNow, "late")).Code);
    }

    [Theory]
    [InlineData(ApprovalMode.Manual, true, false)]
    [InlineData(ApprovalMode.AutoApproveRoster, true, true)]
    [InlineData(ApprovalMode.AutoApproveRoster, false, false)]
    [InlineData(ApprovalMode.AutoApproveAll, false, true)]
    public void Approval_mode_decides_whether_a_self_check_in_waits_for_a_host(ApprovalMode mode, bool onRoster, bool expected)
    {
        var ev = new Event { Title = new("Test"), ApprovalMode = mode };
        Assert.Equal(expected, ev.AutoApproves(onRoster));
    }

    [Fact]
    public void Regenerating_the_token_invalidates_the_old_link()
    {
        var ev = new Event { Title = new("Test") };
        var before = ev.CheckInToken;
        ev.RegenerateToken();

        Assert.NotEqual(before, ev.CheckInToken);
        Assert.Matches("^[A-Za-z0-9_-]{22}$", ev.CheckInToken);
    }
}

public class RotatingCodeTests
{
    private static readonly TimeSpan Period = TimeSpan.FromSeconds(30);
    private static readonly DateTimeOffset Start = new(2026, 11, 25, 6, 0, 0, TimeSpan.Zero); // on a 30 s boundary

    [Fact]
    public void Code_is_stable_within_a_period_and_changes_at_the_boundary()
    {
        var ev = new Event { Title = new("Test") };

        Assert.Equal(ev.RotatingCode(Start, Period), ev.RotatingCode(Start.AddSeconds(29), Period));
        Assert.NotEqual(ev.RotatingCode(Start, Period), ev.RotatingCode(Start.AddSeconds(30), Period));
        Assert.Equal(Start.AddSeconds(30), Event.RotatingCodeExpiry(Start.AddSeconds(12), Period));
    }

    [Fact]
    public void A_scanned_code_survives_the_grace_window_and_then_expires()
    {
        var ev = new Event { Title = new("Test") };
        var scanned = ev.RotatingCode(Start, Period);

        Assert.True(ev.IsRotatingCodeValid(scanned, Start.AddSeconds(89), Period, graceSteps: 2));   // two periods later
        Assert.False(ev.IsRotatingCodeValid(scanned, Start.AddSeconds(90), Period, graceSteps: 2));  // three periods later
        Assert.False(ev.IsRotatingCodeValid(null, Start, Period, graceSteps: 2));
        Assert.False(ev.IsRotatingCodeValid("not-a-code", Start, Period, graceSteps: 2));
    }

    [Fact]
    public void Codes_cannot_be_derived_from_the_public_link_and_die_with_a_regenerated_secret()
    {
        var (first, second) = (new Event { Title = new("A") }, new Event { Title = new("B") });
        Assert.NotEqual(first.RotatingCode(Start, Period), second.RotatingCode(Start, Period));

        var before = first.RotatingCode(Start, Period);
        first.RegenerateToken();
        Assert.False(first.IsRotatingCodeValid(before, Start, Period, graceSteps: 2));
    }
}

public class FestivalCalendarTests
{
    private static DateOnly DateOf(string themeKey, int year) =>
        FestivalCalendar.Between(new DateOnly(year, 1, 1), new DateOnly(year, 12, 31))
            .Single(w => w.ThemeKey == themeKey && w.FestivalDate.Year == year).FestivalDate;

    [Theory]
    // Published dates for Taiwan. 2025 has a leap sixth lunar month, which shifts every later lunar festival.
    [InlineData(ThemeKeys.LunarNewYear, 2025, 1, 29)]
    [InlineData(ThemeKeys.Qixi, 2025, 8, 29)]
    [InlineData(ThemeKeys.MidAutumn, 2025, 10, 6)]
    [InlineData(ThemeKeys.DragonBoat, 2026, 6, 19)]
    [InlineData(ThemeKeys.MidAutumn, 2026, 9, 25)]
    [InlineData(ThemeKeys.WinterSolstice, 2026, 12, 22)]
    [InlineData(ThemeKeys.LunarNewYear, 2027, 2, 6)]
    [InlineData(ThemeKeys.LanternFestival, 2027, 2, 20)]
    [InlineData(ThemeKeys.Qingming, 2027, 4, 5)]
    [InlineData(ThemeKeys.DragonBoat, 2027, 6, 9)]
    [InlineData(ThemeKeys.Qixi, 2027, 8, 8)]
    [InlineData(ThemeKeys.GhostFestival, 2027, 8, 16)]
    [InlineData(ThemeKeys.MidAutumn, 2027, 9, 15)]
    [InlineData(ThemeKeys.DoubleNinth, 2027, 10, 8)]
    [InlineData(ThemeKeys.WinterSolstice, 2028, 12, 21)]
    public void Festival_dates_match_the_published_calendar(string themeKey, int year, int month, int day) =>
        Assert.Equal(new DateOnly(year, month, day), DateOf(themeKey, year));

    [Fact]
    public void An_ordinary_day_has_the_standard_theme()
    {
        Assert.Equal(ThemeKeys.Default, FestivalCalendar.ThemeOn(new DateOnly(2026, 11, 25)));
        Assert.Equal(ThemeKeys.MidAutumn, FestivalCalendar.ThemeOn(new DateOnly(2027, 9, 10)));
    }

    [Fact]
    public void The_shorter_festival_wins_an_overlap_and_a_disabled_one_is_skipped()
    {
        var solstice = new DateOnly(2026, 12, 22); // inside the Christmas period
        Assert.Equal(ThemeKeys.WinterSolstice, FestivalCalendar.ThemeOn(solstice));
        Assert.Equal(ThemeKeys.Christmas, FestivalCalendar.ThemeOn(solstice, [ThemeKeys.WinterSolstice]));
        Assert.Equal(ThemeKeys.Default, FestivalCalendar.ThemeOn(solstice, [ThemeKeys.WinterSolstice, ThemeKeys.Christmas]));
    }

    [Fact]
    public void New_years_theme_starts_in_the_old_year()
    {
        Assert.Equal(ThemeKeys.NewYear, FestivalCalendar.ThemeOn(new DateOnly(2026, 12, 31)));
        Assert.Equal(ThemeKeys.NewYear, FestivalCalendar.ThemeOn(new DateOnly(2027, 1, 2)));
    }
}

public class EmailTemplateTests
{
    [Fact]
    public void Every_notification_has_valid_built_in_wording_in_every_language()
    {
        foreach (var key in EmailTemplates.Keys)
        foreach (var locale in Locales.All)
        {
            var template = EmailTemplates.Default(key, locale);
            Assert.False(string.IsNullOrWhiteSpace(template.Subject));
            Assert.Empty(EmailTemplates.UnknownPlaceholders(key, template.Subject, template.Body));
        }
    }

    [Fact]
    public void Placeholders_are_filled_and_values_cannot_inject_markup()
    {
        var template = new EmailContent("{{points}} points – {{eventTitle}}", "Hi {{ employeeName }},\n\nSee {{siteUrl}}\nBye");
        var values = new Dictionary<string, string>
        {
            ["points"] = "50", ["eventTitle"] = "<script>alert(1)</script>", ["employeeName"] = "Taylor & Co", ["siteUrl"] = "https://pointhub.example/x?a=1&b=2",
        };

        var email = EmailTemplates.Render(template, values, "PointHub");

        Assert.Equal("50 points – <script>alert(1)</script>", email.Subject); // subjects are plain text
        Assert.Contains("Hi Taylor & Co,", email.Text);
        Assert.Contains("Hi Taylor &amp; Co,", email.Html);
        Assert.DoesNotContain("<script>", email.Html);
        Assert.Contains("<a href=\"https://pointhub.example/x?a=1&amp;b=2\">", email.Html);
        Assert.Contains("<br>Bye", email.Html);
    }

    [Fact]
    public void A_template_may_only_use_the_placeholders_its_notification_offers()
    {
        Assert.Equal(["giftName", "password"], EmailTemplates.UnknownPlaceholders(EmailTemplates.CheckInApproved, "{{giftName}}", "{{employeeName}} {{password}}"));
        Assert.Empty(EmailTemplates.UnknownPlaceholders(EmailTemplates.RedemptionFulfilled, "{{giftName}}", "{{quantity}} {{balance}}"));
    }

    [Fact]
    public void A_failing_message_is_retried_later_and_given_up_after_five_attempts()
    {
        var now = DateTimeOffset.UtcNow;
        var message = new EmailMessage { To = "a@example.test", Subject = "s", TextBody = "t", HtmlBody = "h" };

        message.MarkFailed("connection refused", now);
        Assert.Equal((EmailStatus.Pending, 1), (message.Status, message.Attempts));
        Assert.Equal(now.AddMinutes(1), message.NextAttemptAt);

        for (var i = 0; i < 4; i++) message.MarkFailed("connection refused", now);
        Assert.Equal((EmailStatus.Failed, EmailMessage.MaxAttempts), (message.Status, message.Attempts));
    }
}

public class RoleTests
{
    [Fact]
    public void Role_names_round_trip_and_unknown_names_are_rejected()
    {
        Assert.Equal(EmployeeRoles.SystemAdmin | EmployeeRoles.GiftAdmin, RoleName.Parse(["systemAdmin", "giftAdmin"]));
        Assert.Equal(EmployeeRoles.None, RoleName.Parse([])); // a normal user
        Assert.Null(RoleName.Parse(["admin"]));               // the old name is no longer accepted
        Assert.Equal(["eventAdmin", "auditor"], Employee.RoleNames(EmployeeRoles.EventAdmin | EmployeeRoles.Auditor));
    }

    [Fact]
    public void A_fulfilled_claim_can_be_reopened_but_a_cancelled_one_cannot()
    {
        var now = DateTimeOffset.UtcNow;
        var fulfilled = new Redemption();
        fulfilled.Fulfill(byId: 3, now);
        fulfilled.Reopen();
        Assert.Equal((RedemptionStatus.Requested, null), (fulfilled.Status, fulfilled.ClosedAt));

        var cancelled = new Redemption();
        cancelled.Cancel(byId: 3, now, "out of stock after all");
        Assert.Equal(ErrorCodes.RedemptionAlreadyClosed, Assert.Throws<DomainException>(cancelled.Reopen).Code);
    }
}

public class ApiClientTests
{
    [Fact]
    public void Only_a_hash_of_the_key_is_kept_and_it_matches_the_issued_key()
    {
        var now = DateTimeOffset.UtcNow;
        var (client, apiKey) = ApiClient.Create("Canteen kiosk", ApiScopes.PointsRead | ApiScopes.PointsWrite, expiresAt: null, createdById: 1, now);

        Assert.StartsWith(ApiClient.KeyPrefixMarker, apiKey);
        Assert.Equal(ApiClient.Hash(apiKey), client.KeyHash);
        Assert.DoesNotContain(apiKey, client.KeyHash);
        Assert.StartsWith(client.KeyPrefix, apiKey);
        Assert.Equal([ScopeName.PointsRead, ScopeName.PointsWrite], client.ScopeNames());
    }

    [Fact]
    public void A_revoked_or_expired_key_is_not_usable()
    {
        var now = DateTimeOffset.UtcNow;
        var (expiring, _) = ApiClient.Create("Temp", ApiScopes.PointsRead, now.AddHours(1), 1, now);
        var (revoked, _) = ApiClient.Create("Old", ApiScopes.PointsRead, null, 1, now);
        revoked.Revoke(now);

        Assert.True(expiring.IsUsable(now));
        Assert.False(expiring.IsUsable(now.AddHours(2)));
        Assert.False(revoked.IsUsable(now));
    }

    [Fact]
    public void Unknown_or_empty_scope_lists_are_rejected()
    {
        Assert.Null(ScopeName.Parse(["points:read", "everything"]));
        Assert.Null(ScopeName.Parse([]));
        Assert.Equal(ApiScopes.EmployeesWrite, ScopeName.Parse(["employees:write"]));
    }
}

public class RosterMatcherTests
{
    private static Employee Person(int id, string no, bool active = true) =>
        new() { Id = id, EmployeeNo = no, DisplayName = no, Email = $"{no}@example.test", IsActive = active };

    [Fact]
    public void Classifies_every_row_against_the_employee_master()
    {
        Employee[] employees = [Person(1, "E0101"), Person(2, "E0102"), Person(3, "E0105", active: false)];
        RosterRow[] rows =
        [
            new("e0101 ", null, null),                       // number match, case and whitespace ignored
            new("UNKNOWN", null, "E0102@EXAMPLE.TEST"),      // falls back to email
            new("E0105", null, null),                        // left the company
            new("E0999", "New Joiner", null),                // not in the master yet
            new("E0101", null, null),                        // listed twice
        ];

        var statuses = RosterMatcher.Match(rows, employees).Select(m => m.Status);

        Assert.Equal(
            [RosterMatchStatus.Matched, RosterMatchStatus.Matched, RosterMatchStatus.Inactive, RosterMatchStatus.NotFound, RosterMatchStatus.Duplicate],
            statuses);
    }
}

public class GiftTests
{
    [Fact]
    public void Stock_never_goes_below_zero()
    {
        var gift = new Gift { Name = new("Mug") };
        gift.ChangeStock(2);

        Assert.Equal(ErrorCodes.OutOfStock, Assert.Throws<DomainException>(() => gift.ChangeStock(-3)).Code);
        Assert.Equal(2, gift.Stock);
    }
}

public class CsvTests
{
    [Fact]
    public void Reads_quoted_fields_and_skips_blank_lines()
    {
        var rows = Csv.Parse("employeeNo,name\r\nE0101,\"Staff, Taylor\"\r\n\r\nE0102,\"He said \"\"hi\"\"\"\n");

        Assert.Equal(3, rows.Count);
        Assert.Equal(["E0101", "Staff, Taylor"], rows[1]);
        Assert.Equal(["E0102", "He said \"hi\""], rows[2]);
    }
}
