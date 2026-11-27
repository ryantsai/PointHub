using System.Globalization;
using System.Text;
using PointHub.Domain.Common;

namespace PointHub.Api.Http;

/// <summary>
/// CSV downloads for admins. UTF-8 with a byte-order mark (Excel then reads Chinese and Japanese correctly),
/// streamed row by row, and safe to open in a spreadsheet.
/// </summary>
public static class CsvExport
{
    public const int MaxRows = 50_000;
    public const string TruncatedHeader = "X-Export-Truncated";

    /// <summary>Streams <paramref name="rows"/> as a download named <c>{name}-{yyyyMMdd-HHmm}.csv</c>.</summary>
    public static IResult File<T>(HttpContext http, string name, DateTimeOffset localNow, IReadOnlyList<string> headings,
        IAsyncEnumerable<T> rows, Func<T, object?[]> cells, bool truncated)
    {
        if (truncated) http.Response.Headers[TruncatedHeader] = "true";
        var fileName = $"{name}-{localNow:yyyyMMdd-HHmm}.csv";

        return Results.Stream(async stream =>
        {
            await using var writer = new StreamWriter(stream, new UTF8Encoding(encoderShouldEmitUTF8Identifier: true), leaveOpen: true);
            await writer.WriteLineAsync(Line(headings));
            await foreach (var row in rows.WithCancellation(http.RequestAborted))
                await writer.WriteLineAsync(Line(cells(row)));
        }, "text/csv; charset=utf-8", fileName);
    }

    public static string Line(IEnumerable<object?> cells) => string.Join(',', cells.Select(Cell));

    /// <summary>One CSV cell: quoted when needed, and never something a spreadsheet would run.</summary>
    public static string Cell(object? value)
    {
        var text = value switch
        {
            null => "",
            bool flag => flag ? "1" : "0",
            IFormattable number => number.ToString(null, CultureInfo.InvariantCulture),
            _ => value.ToString() ?? "",
        };

        // Names, reasons and titles are typed by people. A cell that begins with one of these characters is
        // treated as a formula by Excel and others ("CSV injection"); a leading apostrophe makes it plain text.
        // Numbers produced by the server (such as -80) are left alone.
        if (value is string && text.Length > 0 && text[0] is '=' or '+' or '-' or '@' or '\t' or '\r')
            text = "'" + text;

        return text.AsSpan().IndexOfAny(",\"\r\n") >= 0 ? $"\"{text.Replace("\"", "\"\"")}\"" : text;
    }
}

/// <summary>Column headings and value labels for exports, in the three UI languages.</summary>
public static class ExportLabels
{
    private static readonly Dictionary<string, (string En, string Ja, string ZhHant)> Text = new()
    {
        ["id"] = ("ID", "ID", "編號"),
        ["time"] = ("Time", "日時", "時間"),
        ["employeeNo"] = ("Employee no.", "社員番号", "員工編號"),
        ["employee"] = ("Employee", "社員", "員工"),
        ["email"] = ("Email", "メール", "電子郵件"),
        ["department"] = ("Department", "部署", "部門"),
        ["type"] = ("Type", "種別", "類型"),
        ["points"] = ("Points", "ポイント", "點數"),
        ["event"] = ("Event", "イベント", "活動"),
        ["gift"] = ("Gift", "ギフト", "禮品"),
        ["reason"] = ("Reason", "理由", "原因"),
        ["source"] = ("Source", "連携元", "來源系統"),
        ["reference"] = ("External reference", "外部参照番号", "外部參考編號"),
        ["reverses"] = ("Reverses ID", "取消対象ID", "撤銷對象編號"),
        ["reversedBy"] = ("Reverted by ID", "取消したID", "被撤銷編號"),
        ["enteredBy"] = ("Entered by", "登録者", "操作人"),
        ["quantity"] = ("Quantity", "数量", "數量"),
        ["status"] = ("Status", "状態", "狀態"),
        ["claimedAt"] = ("Claimed at", "申請日時", "申請時間"),
        ["closedAt"] = ("Closed at", "処理日時", "處理時間"),
        ["closedBy"] = ("Closed by", "処理者", "處理人"),
        ["method"] = ("Method", "方法", "方式"),
        ["onRoster"] = ("On roster", "名簿あり", "名單內"),
        ["decidedAt"] = ("Decided at", "承認日時", "審核時間"),
        ["decidedBy"] = ("Decided by", "承認者", "審核人"),
        ["note"] = ("Note", "備考", "備註"),
        ["active"] = ("Active", "在籍", "在職"),
        ["roles"] = ("Roles", "ロール", "角色"),
        ["balance"] = ("Balance", "残高", "餘額"),
        ["earned"] = ("Earned in total", "累計獲得", "累計獲得"),
        ["spent"] = ("Spent in total", "累計利用", "累計使用"),
        ["cards"] = ("Cards", "カード数", "卡片數"),
        ["createdAt"] = ("Created at", "登録日時", "建立時間"),
        // values
        ["EventAward"] = ("Event", "イベント", "活動"),
        ["Redemption"] = ("Claim", "交換", "兌換"),
        ["Adjustment"] = ("Adjustment", "調整", "調整"),
        ["Reversal"] = ("Reversal", "取消", "撤銷"),
        ["Expiry"] = ("Expiry", "失効", "到期"),
        ["ExternalCredit"] = ("External credit", "外部付与", "外部加點"),
        ["ExternalDebit"] = ("External debit", "外部利用", "外部扣點"),
        ["Requested"] = ("To hand over", "受付済み", "待發放"),
        ["Fulfilled"] = ("Handed over", "お渡し済み", "已發放"),
        ["Cancelled"] = ("Cancelled", "キャンセル", "已取消"),
        ["Refunded"] = ("Refunded", "返品済み", "已退還"),
        ["Pending"] = ("Pending", "承認待ち", "待核准"),
        ["Approved"] = ("Approved", "承認済み", "已核准"),
        ["Rejected"] = ("Rejected", "却下", "已退回"),
        ["Reverted"] = ("Reverted", "取消済み", "已撤銷"),
        ["Link"] = ("QR / link", "QR / リンク", "QR／連結"),
        ["Card"] = ("Card tap", "カードタッチ", "刷卡"),
        ["Manual"] = ("Manual", "手入力", "人工輸入"),
        ["Roster"] = ("From roster", "名簿から一括", "名單匯入"),
        ["systemAdmin"] = ("System admin", "システム管理者", "系統管理員"),
        ["eventAdmin"] = ("Event admin", "イベント管理者", "活動管理員"),
        ["giftAdmin"] = ("Gift admin", "ギフト管理者", "禮品管理員"),
        ["auditor"] = ("Auditor", "監査", "稽核"),
    };

    /// <summary>The label for a column key or an enum value; an unknown key comes back unchanged.</summary>
    public static string Label(object key, string locale)
    {
        var name = key.ToString() ?? "";
        if (!Text.TryGetValue(name, out var label)) return name;
        return locale switch { Locales.Japanese => label.Ja, Locales.TraditionalChinese => label.ZhHant, _ => label.En };
    }

    public static string[] Headings(string locale, params string[] keys) => [.. keys.Select(key => Label(key, locale))];
}
