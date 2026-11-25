using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using PointHub.Domain.Common;

namespace PointHub.Domain.Notifications;

public enum EmailStatus
{
    Pending = 0,
    Sent = 1,
    Failed = 2,
    /// <summary>Not sent because no SMTP server is configured.</summary>
    Skipped = 3,
}

/// <summary>An admin's edited version of a built-in template. No row means the default from <see cref="EmailTemplates"/> is used.</summary>
public class EmailTemplate
{
    public required string Key { get; set; }
    public required string Locale { get; set; }
    public required string Subject { get; set; }
    public required string Body { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public int? UpdatedById { get; set; }
}

/// <summary>
/// The outbox. A row is written in the same database transaction as the change it reports,
/// so an email is never sent for a change that was rolled back, and never lost if SMTP is down.
/// </summary>
public class EmailMessage
{
    public const int MaxAttempts = 5;

    public long Id { get; set; }
    public required string To { get; set; }
    public string? ToName { get; set; }
    public required string Subject { get; set; }
    public required string TextBody { get; set; }
    public required string HtmlBody { get; set; }
    public string? TemplateKey { get; set; }
    public EmailStatus Status { get; private set; } = EmailStatus.Pending;
    public int Attempts { get; private set; }
    public string? LastError { get; private set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset NextAttemptAt { get; private set; }
    public DateTimeOffset? SentAt { get; private set; }

    public void MarkSent(DateTimeOffset now)
    {
        Attempts++;
        Status = EmailStatus.Sent;
        SentAt = now;
        LastError = null;
    }

    /// <summary>Retries with a growing delay (1, 4, 9, 16 minutes), then gives up.</summary>
    public void MarkFailed(string error, DateTimeOffset now)
    {
        Attempts++;
        LastError = error.Length > 1000 ? error[..1000] : error;
        if (Attempts >= MaxAttempts) Status = EmailStatus.Failed;
        else NextAttemptAt = now.AddMinutes(Attempts * Attempts);
    }

    public void MarkSkipped(string reason)
    {
        Status = EmailStatus.Skipped;
        LastError = reason;
    }
}

public sealed record EmailContent(string Subject, string Body);

public sealed record RenderedEmail(string Subject, string Text, string Html);

/// <summary>The notifications PointHub sends, their placeholders, and the built-in wording in three languages.</summary>
public static partial class EmailTemplates
{
    public const string CheckInApproved = "checkInApproved";
    public const string CheckInRejected = "checkInRejected";
    public const string RedemptionRequested = "redemptionRequested";
    public const string RedemptionFulfilled = "redemptionFulfilled";
    public const string RedemptionCancelled = "redemptionCancelled";
    public const string RedemptionRefunded = "redemptionRefunded";
    public const string PointsAdjusted = "pointsAdjusted";

    private static readonly string[] Common = ["employeeName", "appName", "siteUrl", "balance"];

    /// <summary>Template key → the placeholders it may use (besides the common ones).</summary>
    private static readonly Dictionary<string, string[]> Specific = new()
    {
        [CheckInApproved] = ["eventTitle", "points"],
        [CheckInRejected] = ["eventTitle", "reason"],
        [RedemptionRequested] = ["giftName", "quantity", "points"],
        [RedemptionFulfilled] = ["giftName", "quantity"],
        [RedemptionCancelled] = ["giftName", "quantity", "points", "reason"],
        [RedemptionRefunded] = ["giftName", "quantity", "points", "reason"],
        [PointsAdjusted] = ["points", "reason"],
    };

    public static IReadOnlyList<string> Keys { get; } = [.. Specific.Keys];

    public static bool IsKnown(string key) => Specific.ContainsKey(key);

    public static IReadOnlyList<string> Placeholders(string key) => [.. Common, .. Specific[key]];

    public static EmailContent Default(string key, string locale) =>
        Defaults.GetValueOrDefault((key, locale)) ?? Defaults[(key, Locales.English)];

    /// <summary>Placeholders used in the text that this template does not offer. Empty means the text is valid.</summary>
    public static IReadOnlyList<string> UnknownPlaceholders(string key, params string[] texts)
    {
        var allowed = Placeholders(key);
        return texts.SelectMany(text => Placeholder().Matches(text).Select(m => m.Groups[1].Value))
            .Where(name => !allowed.Contains(name)).Distinct().ToList();
    }

    /// <summary>
    /// Fills the placeholders. Templates are plain text: values and wording are HTML-escaped for the HTML part,
    /// so neither an admin's template nor a value such as an event title can inject markup into the message.
    /// </summary>
    public static RenderedEmail Render(EmailContent template, IReadOnlyDictionary<string, string> values, string appName)
    {
        string Fill(string text) => Placeholder().Replace(text, m => values.GetValueOrDefault(m.Groups[1].Value, ""));

        var subject = Fill(template.Subject).ReplaceLineEndings(" ").Trim();
        var text = Fill(template.Body).ReplaceLineEndings("\n").Trim();

        var html = new StringBuilder();
        html.Append("<div style=\"font-family:'Segoe UI','Noto Sans TC','Microsoft JhengHei','Noto Sans JP',sans-serif;font-size:15px;line-height:1.6;color:#1f2933;max-width:560px\">");
        html.Append("<p style=\"font-size:13px;font-weight:600;color:#147ea6;margin:0 0 16px\">").Append(WebUtility.HtmlEncode(appName)).Append("</p>");
        foreach (var paragraph in text.Split("\n\n", StringSplitOptions.RemoveEmptyEntries))
        {
            var escaped = WebUtility.HtmlEncode(paragraph).Replace("\n", "<br>");
            html.Append("<p style=\"margin:0 0 14px\">").Append(Link().Replace(escaped, "<a href=\"$0\">$0</a>")).Append("</p>");
        }
        html.Append("</div>");
        return new RenderedEmail(subject, text, html.ToString());
    }

    /// <summary>Values for previews and test messages.</summary>
    public static IReadOnlyDictionary<string, string> SampleValues(string locale, string appName, string siteUrl) => new Dictionary<string, string>
    {
        ["employeeName"] = locale switch { Locales.Japanese => "田中 太郎", Locales.TraditionalChinese => "陳 志明", _ => "Taylor Lin" },
        ["appName"] = appName,
        ["siteUrl"] = siteUrl,
        ["balance"] = "1,280",
        ["eventTitle"] = locale switch { Locales.Japanese => "年末キックオフ", Locales.TraditionalChinese => "年終啟動大會", _ => "Year-end Kickoff" },
        ["giftName"] = locale switch { Locales.Japanese => "オリジナルマグカップ", Locales.TraditionalChinese => "公司馬克杯", _ => "Company Mug" },
        ["points"] = "50",
        ["quantity"] = "1",
        ["reason"] = locale switch { Locales.Japanese => "（理由がここに入ります）", Locales.TraditionalChinese => "（此處顯示原因）", _ => "(the reason appears here)" },
    };

    private static readonly Dictionary<(string Key, string Locale), EmailContent> Defaults = new()
    {
        [(CheckInApproved, Locales.English)] = new("You earned {{points}} points – {{eventTitle}}",
            "Hi {{employeeName}},\n\nYour check-in for {{eventTitle}} was approved and {{points}} points were added. Your balance is now {{balance}} points.\n\nSee your points and the gift catalogue: {{siteUrl}}"),
        [(CheckInApproved, Locales.Japanese)] = new("{{points}} ポイントを獲得しました – {{eventTitle}}",
            "{{employeeName}} さん\n\n「{{eventTitle}}」のチェックインが承認され、{{points}} ポイントが付与されました。現在の残高は {{balance}} ポイントです。\n\nポイントとギフトの確認はこちら：{{siteUrl}}"),
        [(CheckInApproved, Locales.TraditionalChinese)] = new("您已獲得 {{points}} 點 – {{eventTitle}}",
            "{{employeeName}} 您好：\n\n您在「{{eventTitle}}」的報到已通過審核，已為您加上 {{points}} 點，目前餘額為 {{balance}} 點。\n\n查看點數與禮品：{{siteUrl}}"),

        [(CheckInRejected, Locales.English)] = new("Your check-in for {{eventTitle}} was not approved",
            "Hi {{employeeName}},\n\nYour check-in for {{eventTitle}} was not approved, so no points were added.\n\nReason: {{reason}}\n\nIf you think this is a mistake, please contact the event organiser."),
        [(CheckInRejected, Locales.Japanese)] = new("「{{eventTitle}}」のチェックインは承認されませんでした",
            "{{employeeName}} さん\n\n「{{eventTitle}}」のチェックインは承認されなかったため、ポイントは付与されていません。\n\n理由：{{reason}}\n\nお心当たりがない場合は、イベント担当者にお問い合わせください。"),
        [(CheckInRejected, Locales.TraditionalChinese)] = new("您在「{{eventTitle}}」的報到未通過審核",
            "{{employeeName}} 您好：\n\n您在「{{eventTitle}}」的報到未通過審核，因此沒有加點。\n\n原因：{{reason}}\n\n如有疑問，請洽活動承辦人。"),

        [(RedemptionRequested, Locales.English)] = new("We received your claim: {{giftName}}",
            "Hi {{employeeName}},\n\nYou claimed {{quantity}} × {{giftName}} for {{points}} points. Your balance is now {{balance}} points.\n\nWe will let you know when it is ready to collect."),
        [(RedemptionRequested, Locales.Japanese)] = new("交換申請を受け付けました：{{giftName}}",
            "{{employeeName}} さん\n\n{{giftName}} × {{quantity}} を {{points}} ポイントで交換申請しました。現在の残高は {{balance}} ポイントです。\n\n受け取りの準備ができましたらお知らせします。"),
        [(RedemptionRequested, Locales.TraditionalChinese)] = new("已收到您的兌換申請：{{giftName}}",
            "{{employeeName}} 您好：\n\n您已使用 {{points}} 點兌換 {{giftName}} × {{quantity}}，目前餘額為 {{balance}} 點。\n\n禮品備妥後會再通知您領取。"),

        [(RedemptionFulfilled, Locales.English)] = new("Your gift has been handed over: {{giftName}}",
            "Hi {{employeeName}},\n\nYour claim for {{quantity}} × {{giftName}} is now marked as fulfilled. Enjoy!\n\nIf you have not received it, please contact the gift team."),
        [(RedemptionFulfilled, Locales.Japanese)] = new("ギフトをお渡ししました：{{giftName}}",
            "{{employeeName}} さん\n\n{{giftName}} × {{quantity}} の交換申請は「お渡し済み」になりました。どうぞお楽しみください。\n\nまだ受け取っていない場合は、ギフト担当までご連絡ください。"),
        [(RedemptionFulfilled, Locales.TraditionalChinese)] = new("您的禮品已發放：{{giftName}}",
            "{{employeeName}} 您好：\n\n您兌換的 {{giftName}} × {{quantity}} 已標示為「已發放」，祝您使用愉快！\n\n若尚未收到，請與禮品承辦人聯絡。"),

        [(RedemptionCancelled, Locales.English)] = new("Your claim was cancelled: {{giftName}}",
            "Hi {{employeeName}},\n\nYour claim for {{quantity}} × {{giftName}} was cancelled and {{points}} points were returned. Your balance is now {{balance}} points.\n\nReason: {{reason}}"),
        [(RedemptionCancelled, Locales.Japanese)] = new("交換申請が取り消されました：{{giftName}}",
            "{{employeeName}} さん\n\n{{giftName}} × {{quantity}} の交換申請が取り消され、{{points}} ポイントが返還されました。現在の残高は {{balance}} ポイントです。\n\n理由：{{reason}}"),
        [(RedemptionCancelled, Locales.TraditionalChinese)] = new("您的兌換申請已取消：{{giftName}}",
            "{{employeeName}} 您好：\n\n您兌換的 {{giftName}} × {{quantity}} 已取消，並已退還 {{points}} 點，目前餘額為 {{balance}} 點。\n\n原因：{{reason}}"),

        [(RedemptionRefunded, Locales.English)] = new("Your gift was refunded: {{giftName}}",
            "Hi {{employeeName}},\n\n{{quantity}} × {{giftName}} was taken back and {{points}} points were returned to you. Your balance is now {{balance}} points.\n\nReason: {{reason}}"),
        [(RedemptionRefunded, Locales.Japanese)] = new("ギフトが返品処理されました：{{giftName}}",
            "{{employeeName}} さん\n\n{{giftName}} × {{quantity}} が返品処理され、{{points}} ポイントが返還されました。現在の残高は {{balance}} ポイントです。\n\n理由：{{reason}}"),
        [(RedemptionRefunded, Locales.TraditionalChinese)] = new("您的禮品已退還：{{giftName}}",
            "{{employeeName}} 您好：\n\n您兌換的 {{giftName}} × {{quantity}} 已辦理退還，並已退回 {{points}} 點，目前餘額為 {{balance}} 點。\n\n原因：{{reason}}"),

        [(PointsAdjusted, Locales.English)] = new("Your points were adjusted: {{points}}",
            "Hi {{employeeName}},\n\nAn administrator adjusted your points by {{points}}. Your balance is now {{balance}} points.\n\nReason: {{reason}}"),
        [(PointsAdjusted, Locales.Japanese)] = new("ポイントが調整されました：{{points}}",
            "{{employeeName}} さん\n\n管理者によりポイントが {{points}} 調整されました。現在の残高は {{balance}} ポイントです。\n\n理由：{{reason}}"),
        [(PointsAdjusted, Locales.TraditionalChinese)] = new("您的點數已調整：{{points}}",
            "{{employeeName}} 您好：\n\n管理員已將您的點數調整 {{points}} 點，目前餘額為 {{balance}} 點。\n\n原因：{{reason}}"),
    };

    [GeneratedRegex(@"\{\{\s*(\w+)\s*\}\}")]
    private static partial Regex Placeholder();

    [GeneratedRegex(@"https?://[^\s<]+")]
    private static partial Regex Link();
}
