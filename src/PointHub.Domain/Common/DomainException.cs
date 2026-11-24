namespace PointHub.Domain.Common;

/// <summary>
/// A business-rule violation. <see cref="Code"/> is the stable identifier the API returns and the
/// client translates (see docs/api.md); the message is English and only meant for logs.
/// </summary>
public sealed class DomainException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

public static class ErrorCodes
{
    public const string ValidationFailed = "validation_failed";
    public const string NotFound = "not_found";
    public const string EventNotOpen = "event_not_open";
    public const string AlreadyCheckedIn = "already_checked_in";
    public const string NotOnRoster = "not_on_roster";
    public const string EventFull = "event_full";
    public const string CheckInAlreadyDecided = "checkin_already_decided";
    public const string CheckInCodeInvalid = "checkin_code_invalid";
    public const string EmailInUse = "email_in_use";
    public const string CardNotRegistered = "card_not_registered";
    public const string CardAlreadyRegistered = "card_already_registered";
    public const string InvalidCardUid = "invalid_card_uid";
    public const string EmployeeInactive = "employee_inactive";
    public const string InsufficientPoints = "insufficient_points";
    public const string OutOfStock = "out_of_stock";
    public const string GiftLimitReached = "gift_limit_reached";
    public const string GiftInactive = "gift_inactive";
    public const string AlreadyReversed = "already_reversed";
    public const string NotReversible = "not_reversible";
    public const string RedemptionAlreadyClosed = "redemption_already_closed";
    public const string InvalidCsv = "invalid_csv";
    public const string InvalidImage = "invalid_image";
    public const string TooManyImages = "too_many_images";
    public const string LastSystemAdmin = "last_system_admin";
    public const string Conflict = "conflict";
}
