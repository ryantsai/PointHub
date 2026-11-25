using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using PointHub.Domain.Common;
using PointHub.Domain.Employees;
using PointHub.Domain.Events;
using PointHub.Domain.Gifts;
using PointHub.Domain.Integration;
using PointHub.Domain.Points;
using PointHub.Domain.Notifications;
using PointHub.Domain.Site;
using PointHub.Infrastructure.Services;

namespace PointHub.Api.Contracts;

// Shapes in this file mirror docs/api.md. Change the document first, then this file and web/src/api/types.ts.

public record Paged<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

public record SiteConfigDto(string AppName, string AuthMode, string? PublicBaseUrl, string ActiveTheme, IReadOnlyList<string> SupportedLocales, string DefaultLocale);

public record MeDto(int Id, string EmployeeNo, string DisplayName, string Email, string? Department, IEnumerable<string> Roles, string? PreferredLocale, int Balance)
{
    public static MeDto From(Employee e) => new(e.Id, e.EmployeeNo, e.DisplayName, e.Email, e.Department, e.RoleNames(), e.PreferredLocale, e.Account.Balance);
}

public record DevUserDto(string EmployeeNo, string DisplayName, IEnumerable<string> Roles);

public record TransactionDto(
    long Id, int EmployeeId, string EmployeeNo, string EmployeeName, int Amount, PointTransactionType Type, string? Reason,
    int? EventId, LocalizedText? EventTitle, int? RedemptionId, LocalizedText? GiftName, long? ReversesTransactionId, long? ReversedByTransactionId,
    DateTimeOffset CreatedAt, string? CreatedByName, string? ApiClientName, string? ExternalReference)
{
    public static readonly Expression<Func<PointTransaction, TransactionDto>> Projection = t => new TransactionDto(
        t.Id, t.EmployeeId, t.Employee.EmployeeNo, t.Employee.DisplayName, t.Amount, t.Type, t.Reason,
        t.EventId, t.Event!.Title, t.RedemptionId, t.Redemption!.Gift.Name, t.ReversesTransactionId, (long?)t.ReversedByTransaction!.Id,
        t.CreatedAt, t.CreatedBy!.DisplayName, t.ApiClient!.Name, t.ExternalReference);
}

public record EmployeePointsDto(string EmployeeNo, string DisplayName, bool IsActive, int Balance, int LifetimeEarned, int LifetimeSpent)
{
    public static EmployeePointsDto From(Employee e) =>
        new(e.EmployeeNo, e.DisplayName, e.IsActive, e.Account.Balance, e.Account.LifetimeEarned, e.Account.LifetimeSpent);
}

public record ApiClientDto(
    int Id, string Name, string KeyPrefix, IEnumerable<string> Scopes, bool IsActive, DateTimeOffset CreatedAt,
    string? CreatedByName, DateTimeOffset? LastUsedAt, DateTimeOffset? ExpiresAt, DateTimeOffset? RevokedAt)
{
    public static ApiClientDto From(ApiClient c, DateTimeOffset now) => new(
        c.Id, c.Name, c.KeyPrefix, c.ScopeNames(), c.IsUsable(now), c.CreatedAt, c.CreatedBy?.DisplayName, c.LastUsedAt, c.ExpiresAt, c.RevokedAt);
}

public record ApiClientCreatedDto(ApiClientDto Client, string ApiKey);

public record MyPointsDto(int Balance, int LifetimeEarned, int LifetimeSpent, Paged<TransactionDto> Transactions);

public record EventSummaryDto(
    int Id, LocalizedText Title, LocalizedText? Description, string? Location, DateTimeOffset StartsAt, DateTimeOffset EndsAt,
    int Points, EventStatus Status, ApprovalMode ApprovalMode, CheckInMode CheckInMode, CheckInStatus? MyCheckInStatus)
{
    public static Expression<Func<Event, EventSummaryDto>> ProjectionFor(int employeeId) => e => new EventSummaryDto(
        e.Id, e.Title, e.Description, e.Location, e.StartsAt, e.EndsAt, e.Points, e.Status, e.ApprovalMode, e.CheckInMode,
        e.CheckIns.Where(c => c.EmployeeId == employeeId).Select(c => (CheckInStatus?)c.Status).FirstOrDefault());
}

public record EventHostDto(int Id, string DisplayName);

public record EventCountsDto(int Pending, int Approved, int Rejected, int Roster, int RosterUnmatched);

public record EventDetailDto(
    int Id, LocalizedText Title, LocalizedText? Description, string? Location, DateTimeOffset StartsAt, DateTimeOffset EndsAt,
    int Points, EventStatus Status, ApprovalMode ApprovalMode, CheckInMode CheckInMode, CheckInStatus? MyCheckInStatus,
    string CheckInToken, bool RosterOnly, int? MaxParticipants, IReadOnlyList<EventHostDto> Hosts, EventCountsDto Counts);

public record RotatingCodeDto(string Code, DateTimeOffset ExpiresAt, int PeriodSeconds);

public record EmployeeRecordDto(string EmployeeNo, string DisplayName, string Email, string? Department, bool IsActive)
{
    public static EmployeeRecordDto From(Employee e) => new(e.EmployeeNo, e.DisplayName, e.Email, e.Department, e.IsActive);
}

public record CheckInPreviewDto(EventSummaryDto Event, bool CanCheckIn, string? BlockedCode);

public record CheckInDto(
    int Id, int EventId, LocalizedText EventTitle, int EmployeeId, string EmployeeNo, string EmployeeName, string? Department,
    CheckInMethod Method, CheckInStatus Status, bool OnRoster, int Points,
    DateTimeOffset CheckedInAt, DateTimeOffset? DecidedAt, string? DecidedByName, string? Note)
{
    public static readonly Expression<Func<EventCheckIn, CheckInDto>> Projection = c => new CheckInDto(
        c.Id, c.EventId, c.Event.Title, c.EmployeeId, c.Employee.EmployeeNo, c.Employee.DisplayName, c.Employee.Department,
        c.Method, c.Status, c.OnRoster, c.Event.Points, c.CheckedInAt, c.DecidedAt, c.DecidedBy!.DisplayName, c.Note);
}

public record RosterEntryDto(int Id, string EmployeeNo, string? Name, string? Email, RosterMatchStatus MatchStatus, int? EmployeeId, string? EmployeeName, CheckInStatus? CheckInStatus);

public record RosterImportResultDto(int Total, int Matched, int NotFound, int Inactive, int Duplicate, IReadOnlyList<RosterEntryDto> Entries)
{
    public static RosterImportResultDto From(IReadOnlyList<RosterEntryDto> entries) => new(
        entries.Count,
        entries.Count(e => e.MatchStatus == RosterMatchStatus.Matched),
        entries.Count(e => e.MatchStatus == RosterMatchStatus.NotFound),
        entries.Count(e => e.MatchStatus == RosterMatchStatus.Inactive),
        entries.Count(e => e.MatchStatus == RosterMatchStatus.Duplicate),
        entries);
}

public record GiftImageDto(Guid Id, int Width, int Height)
{
    /// <summary>Site-relative; the file is served by the API from the uploads/assets folder.</summary>
    public string Url => $"/uploads/assets/{Id:N}.webp";
}

public record GiftDto(
    int Id, LocalizedText Name, LocalizedText? Description, IReadOnlyList<GiftImageDto> Images, int PointCost, int Stock,
    bool IsActive, int? PerEmployeeLimit, int ClaimedByMe)
{
    /// <param name="redemptions">The claims table, so the caller's own count is one subquery in the same statement.</param>
    /// <param name="employeeId">Whose claims <c>ClaimedByMe</c> counts. Cancelled and refunded claims are left out.</param>
    public static Expression<Func<Gift, GiftDto>> ProjectionFor(IQueryable<Redemption> redemptions, int employeeId) => g => new GiftDto(
        g.Id, g.Name, g.Description,
        g.Images.OrderBy(i => i.SortOrder).Select(i => new GiftImageDto(i.Id, i.Width, i.Height)).ToList(),
        g.PointCost, g.Stock, g.IsActive, g.PerEmployeeLimit,
        redemptions.Where(r => r.GiftId == g.Id && r.EmployeeId == employeeId
                && (r.Status == RedemptionStatus.Requested || r.Status == RedemptionStatus.Fulfilled))
            .Sum(r => (int?)r.Quantity) ?? 0);
}

public record RedemptionDto(
    int Id, int GiftId, LocalizedText GiftName, GiftImageDto? GiftImage, int Quantity, int PointsSpent, RedemptionStatus Status,
    int EmployeeId, string EmployeeNo, string EmployeeName, DateTimeOffset RequestedAt, DateTimeOffset? ClosedAt, string? ClosedByName, string? Note)
{
    // The picture comes with the claim, so it is still there when the gift has been disabled since.
    public static readonly Expression<Func<Redemption, RedemptionDto>> Projection = r => new RedemptionDto(
        r.Id, r.GiftId, r.Gift.Name,
        r.Gift.Images.OrderBy(i => i.SortOrder).Select(i => new GiftImageDto(i.Id, i.Width, i.Height)).FirstOrDefault(),
        r.Quantity, r.PointsSpent, r.Status,
        r.EmployeeId, r.Employee.EmployeeNo, r.Employee.DisplayName, r.RequestedAt, r.ClosedAt, r.ClosedBy!.DisplayName, r.Note);
}

public record CardDto(int Id, string Uid, string? Label, bool IsActive, DateTimeOffset RegisteredAt)
{
    public static CardDto From(EmployeeCard c) => new(c.Id, c.Uid, c.Label, c.IsActive, c.RegisteredAt);
}

public record EmployeeDto(int Id, string EmployeeNo, string DisplayName, string Email, string? Department, bool IsActive, IEnumerable<string> Roles, int Balance, IEnumerable<CardDto> Cards)
{
    public static EmployeeDto From(Employee e) => new(e.Id, e.EmployeeNo, e.DisplayName, e.Email, e.Department, e.IsActive, e.RoleNames(), e.Account.Balance, e.Cards.Select(CardDto.From));
}

public record EmployeeDetailDto(
    int Id, string EmployeeNo, string DisplayName, string Email, string? Department, bool IsActive, IEnumerable<string> Roles, int Balance,
    IEnumerable<CardDto> Cards, int LifetimeEarned, int LifetimeSpent, string? PreferredLocale, DateTimeOffset CreatedAt, bool IsProvisional,
    int CheckInCount, int ClaimCount)
{
    public static EmployeeDetailDto From(Employee e, int checkInCount, int claimCount) => new(
        e.Id, e.EmployeeNo, e.DisplayName, e.Email, e.Department, e.IsActive, e.RoleNames(), e.Account.Balance, e.Cards.Select(CardDto.From),
        e.Account.LifetimeEarned, e.Account.LifetimeSpent, e.PreferredLocale, e.CreatedAt, e.IsProvisional, checkInCount, claimCount);
}

public record AuditEntryDto(long Id, string? ActorName, string Action, string EntityType, string? EntityId, string? Summary, DateTimeOffset CreatedAt)
{
    public static readonly Expression<Func<AuditLog, AuditEntryDto>> Projection = a =>
        new AuditEntryDto(a.Id, a.Actor!.DisplayName, a.Action, a.EntityType, a.EntityId, a.Summary, a.CreatedAt);
}

// ---- Request bodies -------------------------------------------------------------------------

public record LocalizedTextInput([Required, StringLength(200)] string En, [StringLength(200)] string? Ja, [StringLength(200)] string? ZhHant)
{
    public LocalizedText ToDomain() => new(En.Trim(), Blank(Ja), Blank(ZhHant));
    private static string? Blank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public record LocalizedLongTextInput([Required(AllowEmptyStrings = true), StringLength(2000)] string En, [StringLength(2000)] string? Ja, [StringLength(2000)] string? ZhHant)
{
    /// <summary>A description with no text in any language is stored as null.</summary>
    public LocalizedText? ToDomain() => new[] { En, Ja, ZhHant }.All(string.IsNullOrWhiteSpace)
        ? null
        : new(En.Trim(), string.IsNullOrWhiteSpace(Ja) ? null : Ja.Trim(), string.IsNullOrWhiteSpace(ZhHant) ? null : ZhHant.Trim());
}

public record DevLoginRequest([Required] string EmployeeNo);
public record LocaleRequest([Required] string Locale);

public record EventInput(
    [Required] LocalizedTextInput Title, LocalizedLongTextInput? Description, [StringLength(300)] string? Location,
    DateTimeOffset StartsAt, DateTimeOffset EndsAt, [Range(0, 100_000)] int Points,
    ApprovalMode ApprovalMode, CheckInMode CheckInMode, bool RosterOnly, [Range(1, 1_000_000)] int? MaxParticipants);

public record EmployeeUpsertInput(
    [Required, StringLength(200)] string DisplayName, [Required, EmailAddress, StringLength(320)] string Email,
    [StringLength(200)] string? Department, bool IsActive);

public record EventStatusRequest(EventStatus Status);
public record ApproveAllRequest(bool OnlyRoster);
public record RejectRequest([StringLength(500)] string? Reason);
public record CardCheckInRequest([Required] string CardUid);
public record ManualCheckInRequest([Required] string EmployeeNo);

public record RedeemRequest([Range(1, 100)] int Quantity);

public record GiftInput(
    [Required] LocalizedTextInput Name, LocalizedLongTextInput? Description,
    [Range(0, 10_000_000)] int PointCost, bool IsActive, [Range(1, 1_000_000)] int? PerEmployeeLimit, [Range(0, 1_000_000)] int? InitialStock);

public record StockRequest(int Delta, [Required, StringLength(500)] string Reason);
public record ReasonRequest([Required, StringLength(500)] string Reason);
public record RefundRequest([Required, StringLength(500)] string Reason, bool Restock);
public record ActiveRequest(bool IsActive);
public record AdjustmentRequest(int EmployeeId, [Range(-1_000_000, 1_000_000)] int Amount, [Required, StringLength(500)] string Reason);
public record RegisterCardRequest([Required] string CardUid, [StringLength(100)] string? Label);
public record ThemeSettingsInput(ThemeMode Mode, string? ForcedThemeKey, [Required] string[] DisabledThemeKeys);
public record RolesRequest([Required] string[] Roles);
public record ImageOrderRequest([Required] Guid[] ImageIds);
public record EmailTemplateInput([Required, StringLength(300)] string Subject, [Required, StringLength(8000)] string Body);
public record EmailEnabledRequest(bool IsEnabled);
public record EmailPreviewRequest([Required] string Key, [Required] string Locale, [Required, StringLength(300)] string Subject, [Required, StringLength(8000)] string Body);
public record EmailTestRequest([Required, EmailAddress, StringLength(320)] string To, [Required] string Key, [Required] string Locale);

public record ThemeWindowDto(string ThemeKey, DateOnly FestivalDate, DateOnly StartsOn, DateOnly EndsOn);

public record ThemeSettingsDto(
    ThemeMode Mode, string? ForcedThemeKey, IReadOnlyList<string> DisabledThemeKeys,
    string ActiveTheme, string CalendarTheme, DateOnly Today, IReadOnlyList<ThemeWindowDto> Calendar)
{
    public static ThemeSettingsDto From(ThemeSettings s) => new(
        s.Mode, s.ForcedThemeKey, s.DisabledThemeKeys, s.ActiveTheme, s.CalendarTheme, s.Today,
        s.Calendar.Select(w => new ThemeWindowDto(w.ThemeKey, w.FestivalDate, w.StartsOn, w.EndsOn)).ToList());
}

public record SmtpStatusDto(bool Configured, string? Host, int Port, SmtpSecurity Security, string? FromAddress, string? FromName, bool Authenticated);
public record EmailQueueDto(int Pending, int Failed, int SentLast24Hours);
public record EmailTemplateDto(string Key, string Locale, string Subject, string Body, bool IsCustomized, bool IsEnabled, IReadOnlyList<string> Placeholders);
public record EmailSettingsDto(SmtpStatusDto Smtp, EmailQueueDto Queue, IReadOnlyList<EmailTemplateDto> Templates);
public record EmailPreviewDto(string Subject, string Text, string Html);
public record EmailTestResultDto(bool Ok, string? Error);

public record AdminStatsWeekDto(DateOnly WeekStart, int Issued, int Redeemed);

public record AdminStatsDto(
    int PointsIssuedThisMonth, int PointsIssuedLastMonth, int PointsRedeemedThisMonth, int PointsRedeemedLastMonth,
    int ActiveParticipants, int TotalEmployees, long OutstandingPoints, int PendingCheckIns, int OpenClaims,
    IReadOnlyList<AdminStatsWeekDto> Weeks);

public record EmailLogEntryDto(long Id, string To, string Subject, string? TemplateKey, EmailStatus Status, int Attempts, string? LastError, DateTimeOffset CreatedAt, DateTimeOffset? SentAt)
{
    public static readonly Expression<Func<EmailMessage, EmailLogEntryDto>> Projection = m =>
        new EmailLogEntryDto(m.Id, m.To, m.Subject, m.TemplateKey, m.Status, m.Attempts, m.LastError, m.CreatedAt, m.SentAt);
}
public record CreateApiClientRequest([Required, StringLength(100)] string Name, [Required, MinLength(1)] string[] Scopes, DateTimeOffset? ExpiresAt);

public record ExternalTransactionInput(
    [Required, StringLength(32)] string EmployeeNo, [Range(-1_000_000, 1_000_000)] int Amount,
    [Required, StringLength(500)] string Reason, [Required, StringLength(100)] string ExternalReference);

public static class QueryEnum
{
    /// <summary>
    /// Parses an optional enum filter from the query string ignoring case, so the camelCase names used in
    /// JSON (<c>?status=pending</c>) work. Minimal API's built-in enum binding is case-sensitive.
    /// </summary>
    public static T? Parse<T>(string? value) where T : struct, Enum =>
        string.IsNullOrWhiteSpace(value) ? null
        : Enum.TryParse<T>(value, ignoreCase: true, out var parsed) && Enum.IsDefined(parsed) ? parsed
        : throw new DomainException(ErrorCodes.ValidationFailed, $"'{value}' is not a valid {typeof(T).Name}.");
}

public static class Paging
{
    public static async Task<Paged<T>> ToPagedAsync<T>(this IQueryable<T> query, int? page, int? pageSize, CancellationToken ct)
    {
        var size = Math.Clamp(pageSize ?? 50, 1, 200);
        var number = Math.Max(page ?? 1, 1);
        var total = await query.CountAsync(ct);
        var items = await query.Skip((number - 1) * size).Take(size).ToListAsync(ct);
        return new Paged<T>(items, total, number, size);
    }
}
