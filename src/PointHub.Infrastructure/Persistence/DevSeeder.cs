using Microsoft.EntityFrameworkCore;
using PointHub.Domain.Common;
using PointHub.Domain.Employees;
using PointHub.Domain.Events;
using PointHub.Domain.Gifts;
using PointHub.Infrastructure.Services;
using SkiaSharp;

namespace PointHub.Infrastructure.Persistence;

/// <summary>
/// Sample data for local debugging only (called from Program.cs when Database:SeedDevData is true):
/// a small company, twelve weeks of events and claims, and something waiting in every queue.
/// All people and card numbers here are made up.
/// </summary>
public sealed class DevSeeder(PointHubDbContext db, CheckInService checkIns, RedemptionService redemptions, GiftImageService images, TimeProvider clock)
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        if (await db.Employees.AnyAsync(ct)) return;

        var now = clock.GetUtcNow();
        Employee Person(string no, string name, string department, EmployeeRoles roles = EmployeeRoles.None, string? locale = null, bool active = true) => new()
        {
            EmployeeNo = no, DisplayName = name, Email = $"{no.ToLowerInvariant()}@example.test", Department = department,
            Roles = roles, PreferredLocale = locale, IsActive = active, CreatedAt = now.AddDays(-120),
        };

        var admin = Person("E0001", "Alex Admin", "People Operations", EmployeeRoles.SystemAdmin);
        var host = Person("E0002", "佐藤 花子", "総務部", EmployeeRoles.EventAdmin, Locales.Japanese);
        var giftManager = Person("E0003", "林 怡君", "福利委員會", EmployeeRoles.GiftAdmin, Locales.TraditionalChinese);
        var auditor = Person("E0004", "Aiko Auditor", "Internal Audit", EmployeeRoles.Auditor);
        Employee[] staff =
        [
            Person("E0101", "Taylor Staff", "Engineering"),
            Person("E0102", "田中 太郎", "営業部", locale: Locales.Japanese),
            Person("E0103", "陳 志明", "研發部", locale: Locales.TraditionalChinese),
            Person("E0104", "Morgan Lee", "Engineering"),
            Person("E0106", "王 美玲", "財務部", locale: Locales.TraditionalChinese),
            Person("E0107", "李 建宏", "製造部", locale: Locales.TraditionalChinese),
            Person("E0108", "張 雅婷", "品保部", locale: Locales.TraditionalChinese),
            Person("E0109", "鈴木 一郎", "技術部", locale: Locales.Japanese),
            Person("E0110", "Jamie Chen", "Customer Support"),
            Person("E0111", "黃 俊傑", "研發部", locale: Locales.TraditionalChinese),
            Person("E0112", "吳 淑芬", "人力資源部", locale: Locales.TraditionalChinese),
            Person("E0113", "高橋 美咲", "総務部", locale: Locales.Japanese),
            Person("E0114", "Riley Wu", "Field Service"),
            Person("E0115", "蔡 宗翰", "製造部", locale: Locales.TraditionalChinese),
        ];
        var former = Person("E0105", "Former Employee", "Engineering", active: false);
        db.Employees.AddRange([admin, host, giftManager, auditor, .. staff, former]);

        staff[0].Cards.Add(new EmployeeCard { Uid = "04A23B1C", Label = "Staff badge", RegisteredAt = now });
        staff[1].Cards.Add(new EmployeeCard { Uid = "04D1E2F3A4B5C6", Label = "Staff badge", RegisteredAt = now });
        await db.SaveChangesAsync(ct);

        Event NewEvent(LocalizedText title, string location, DateTimeOffset startsAt, double hours, int points, ApprovalMode approval, Employee owner,
            EventStatus status = EventStatus.Open, CheckInMode mode = CheckInMode.Static, LocalizedText? description = null) => new()
        {
            Title = title, Description = description, Location = location, StartsAt = startsAt, EndsAt = startsAt.AddHours(hours),
            Points = points, Status = status, ApprovalMode = approval, CheckInMode = mode,
            CreatedById = owner.Id, CreatedAt = startsAt.AddDays(-10), Hosts = [new EventHost { EmployeeId = owner.Id }],
        };

        // ---- Twelve weeks of history ------------------------------------------------------------------------
        // (days ago, title, location, points, who attended: every staff member whose index passes the filter)
        (int DaysAgo, LocalizedText Title, string Location, int Points, Func<int, bool> Attended)[] past =
        [
            (77, new("Summer Family Day", "サマーファミリーデー", "夏季家庭日"), "Riverside Park", 100, i => i % 2 == 0),
            (63, new("Mid-Autumn BBQ", "中秋バーベキュー", "中秋烤肉"), "HQ Rooftop", 80, i => i % 3 != 1),
            (56, new("Fire Safety Drill", "消防訓練", "消防演練"), "HQ 1F", 30, i => true),
            (42, new("Autumn Hackathon", "秋のハッカソン", "秋季黑客松"), "Lab 2", 200, i => i % 4 == 0 || i == 2),
            (35, new("Blood Donation Day", "献血デー", "捐血日"), "HQ Lobby", 80, i => i % 3 == 0),
            (21, new("Wellness Walk", "ウェルネスウォーク", "健走活動"), "Science Park", 60, i => i % 2 == 1 || i == 0),
            (14, new("Beach Clean-up Volunteer Day", "ビーチクリーン・ボランティア", "淨灘志工日"), "Seaside Park", 120, i => i < 9),
            (7, new("Quality Month Seminar", "品質月間セミナー", "品質月講座"), "HQ 12F Hall", 50, i => i % 5 != 4),
        ];
        foreach (var (daysAgo, title, location, points, attended) in past)
        {
            var when = now.AddDays(-daysAgo);
            var ev = NewEvent(title, location, when, 3, points, ApprovalMode.AutoApproveAll, host);
            db.Events.Add(ev);
            await db.SaveChangesAsync(ct);
            await BackdatedAsync(when, async () =>
            {
                for (var i = 0; i < staff.Length; i++)
                    if (attended(i)) await checkIns.CheckInAsync(ev, staff[i], CheckInMethod.Link, hostId: null, ct);
            }, ct);
            ev.Status = EventStatus.Closed;
            await db.SaveChangesAsync(ct);
        }

        // ---- What is on now ----------------------------------------------------------------------------------
        var kickoff = NewEvent(new("Year-end Kickoff", "年末キックオフ", "年終啟動大會"), "HQ 12F Hall", now.AddHours(-1), 4, 50, ApprovalMode.Manual, host,
            description: new("All-hands with dinner afterwards.", "全社ミーティングと懇親会。", "全員大會，會後聚餐。"));
        kickoff.Roster =
        [
            new() { EmployeeNo = "E0101", Name = "Taylor Staff", MatchStatus = RosterMatchStatus.Matched, EmployeeId = staff[0].Id, ImportedAt = now },
            new() { EmployeeNo = "E0102", Name = "田中 太郎", MatchStatus = RosterMatchStatus.Matched, EmployeeId = staff[1].Id, ImportedAt = now },
            new() { EmployeeNo = "E0103", Name = "陳 志明", MatchStatus = RosterMatchStatus.Matched, EmployeeId = staff[2].Id, ImportedAt = now },
            new() { EmployeeNo = "E0999", Name = "New Joiner", MatchStatus = RosterMatchStatus.NotFound, ImportedAt = now },
        ];
        var townHall = NewEvent(new("Monthly Town Hall", "月例タウンホール", "每月員工大會"), "HQ 3F Auditorium", now.AddMinutes(-15), 1.25, 20,
            ApprovalMode.AutoApproveAll, host, mode: CheckInMode.Rotating);
        var charityRun = NewEvent(new("Winter Charity Run", "ウィンターチャリティラン", "冬季公益路跑"), "Riverside Park", now.AddDays(12), 3.5, 150,
            ApprovalMode.AutoApproveRoster, host);
        charityRun.MaxParticipants = 120;
        var workshop = NewEvent(new("Security Awareness Workshop", "セキュリティ研修", "資安意識工作坊"), "Online", now.AddDays(8), 2, 30,
            ApprovalMode.AutoApproveAll, admin);
        var draft = NewEvent(new("New Year Party", "新年会", "新春聯歡"), "HQ 12F Hall", now.AddDays(45), 4, 100, ApprovalMode.Manual, admin, EventStatus.Draft);
        // Saved one at a time so the ids are stable: 9 kickoff, 10 town hall, 11 charity run, 12 workshop, 13 draft.
        foreach (var ev in new[] { kickoff, townHall, charityRun, workshop, draft })
        {
            db.Events.Add(ev);
            await db.SaveChangesAsync(ct);
        }

        // Waiting for the event admin: two from the list, one walk-in.
        foreach (var index in new[] { 1, 2, 5 })
            await checkIns.CheckInAsync(kickoff, staff[index], CheckInMethod.Link, hostId: null, ct);

        // ---- Gifts -----------------------------------------------------------------------------------------------
        Gift NewGift(LocalizedText name, LocalizedText description, int cost, int stock, int? limit = null)
        {
            var gift = new Gift { Name = name, Description = description, PointCost = cost, PerEmployeeLimit = limit, CreatedAt = now.AddDays(-90) };
            if (stock > 0) gift.ChangeStock(stock);
            return gift;
        }
        var voucher = NewGift(new("Coffee Voucher", "コーヒーチケット", "咖啡兌換券"), new("One drink at the lobby café.", "ロビーカフェのドリンク1杯。", "大廳咖啡廳飲品一杯。"), 30, 200, limit: 5);
        var mug = NewGift(new("Company Mug", "オリジナルマグカップ", "公司馬克杯"), new("Ceramic, 350 ml.", "陶器製、350ml。", "陶瓷，350 毫升。"), 80, 40);
        var movie = NewGift(new("Movie Ticket Pair", "映画ペアチケット", "電影雙人票"), new("Valid at partner cinemas for 6 months.", "提携映画館で6か月有効。", "合作影城，六個月內有效。"), 400, 12);
        var earbuds = NewGift(new("Wireless Earbuds", "ワイヤレスイヤホン", "無線耳機"), new("Noise cancelling, 24 h battery.", "ノイズキャンセリング、24時間バッテリー。", "主動降噪，24 小時續航。"), 1500, 3, limit: 1);
        var dayOff = NewGift(new("Extra Half-day Off", "半日休暇", "半天特休"), new("Subject to manager approval.", "上長の承認が必要です。", "需經主管核准。"), 500, 10, limit: 1);
        var donation = NewGift(new("Charity Donation", "チャリティ寄付", "公益捐款"), new("We donate NT$300 in your name.", "あなたの名義でNT$300を寄付します。", "以您的名義捐出新台幣 300 元。"), 100, 0);
        foreach (var gift in new[] { voucher, mug, movie, earbuds, dayOff, donation })
        {
            db.Gifts.Add(gift);
            await db.SaveChangesAsync(ct);
        }

        // Claims spread over the weeks (days ago, who, gift, quantity, handed over?).
        (int DaysAgo, int Staff, Gift Gift, int Quantity, bool HandedOver)[] claims =
        [
            (60, 0, voucher, 2, true), (52, 2, mug, 1, true), (40, 3, voucher, 1, true), (33, 0, mug, 1, true),
            (27, 6, voucher, 3, true), (19, 8, movie, 1, true), (12, 8, mug, 1, true), (9, 4, voucher, 2, true),
            (5, 1, voucher, 2, false), (3, 3, mug, 1, false), (1, 0, voucher, 1, false),
        ];
        foreach (var (daysAgo, index, gift, quantity, handedOver) in claims)
        {
            var when = now.AddDays(-daysAgo);
            await BackdatedAsync(when, async () =>
            {
                var claim = await redemptions.RedeemAsync(gift.Id, staff[index].Id, quantity, ct);
                if (handedOver) await redemptions.FulfillAsync(claim.Id, giftManager.Id, ct);
            }, ct);
        }

        // Drawn placeholder pictures in different shapes, to show the gallery and the size normalisation.
        var (blue, green) = (new SKColor(0x19, 0x9E, 0xCF), new SKColor(0x75, 0xB4, 0x2B));
        var (amber, rose) = (new SKColor(0xF5, 0x9E, 0x0B), new SKColor(0xE1, 0x1D, 0x48));
        var (violet, navy) = (new SKColor(0x8B, 0x5C, 0xF6), new SKColor(0x1E, 0x3A, 0x8A));
        async Task PicturesAsync(Gift gift, params (int Width, int Height, SKColor From, SKColor To, SampleShape Shape)[] pictures)
        {
            var streams = pictures.Select(p => SamplePicture(p.Width, p.Height, p.From, p.To, p.Shape)).ToList();
            try { await images.AddAsync(gift.Id, [.. streams], giftManager.Id, ct); }
            finally { streams.ForEach(stream => stream.Dispose()); }
        }
        await PicturesAsync(voucher, (800, 520, amber, new SKColor(0x92, 0x40, 0x0E), SampleShape.Ticket));
        await PicturesAsync(mug, (900, 600, blue, green, SampleShape.Mug), (480, 720, amber, rose, SampleShape.Mug));
        await PicturesAsync(movie, (820, 540, violet, navy, SampleShape.Ticket), (600, 600, rose, violet, SampleShape.Heart));
        await PicturesAsync(earbuds, (640, 640, navy, blue, SampleShape.Headphones));
        await PicturesAsync(dayOff, (640, 640, new SKColor(0x38, 0xBD, 0xF8), green, SampleShape.Sun));
        await PicturesAsync(donation, (700, 560, rose, amber, SampleShape.Heart));

        // Seeding went through the real services, which queue notifications and audit lines.
        // Nobody should get mail about sample data, and the audit log should start with real actions.
        await db.EmailMessages.ExecuteDeleteAsync(ct);
        await db.AuditLogs.ExecuteDeleteAsync(ct);
    }

    /// <summary>Runs <paramref name="work"/> and then moves everything it created to <paramref name="when"/>.</summary>
    private async Task BackdatedAsync(DateTimeOffset when, Func<Task> work, CancellationToken ct)
    {
        var lastTransaction = await db.PointTransactions.MaxAsync(t => (long?)t.Id, ct) ?? 0;
        var lastCheckIn = await db.CheckIns.MaxAsync(c => (int?)c.Id, ct) ?? 0;
        var lastClaim = await db.Redemptions.MaxAsync(r => (int?)r.Id, ct) ?? 0;

        await work();

        DateTimeOffset? decided = when;
        DateTimeOffset? closed = when.AddDays(1);
        await db.PointTransactions.Where(t => t.Id > lastTransaction).ExecuteUpdateAsync(set => set.SetProperty(t => t.CreatedAt, when), ct);
        await db.CheckIns.Where(c => c.Id > lastCheckIn)
            .ExecuteUpdateAsync(set => set.SetProperty(c => c.CheckedInAt, when).SetProperty(c => c.DecidedAt, decided), ct);
        await db.Redemptions.Where(r => r.Id > lastClaim).ExecuteUpdateAsync(set => set.SetProperty(r => r.RequestedAt, when), ct);
        await db.Redemptions.Where(r => r.Id > lastClaim && r.Status == RedemptionStatus.Fulfilled)
            .ExecuteUpdateAsync(set => set.SetProperty(r => r.ClosedAt, closed), ct);
    }

    private enum SampleShape { Mug, Ticket, Sun, Headphones, Heart }

    /// <summary>A simple white drawing on a gradient; stands in for a product photo.</summary>
    private static MemoryStream SamplePicture(int width, int height, SKColor from, SKColor to, SampleShape shape)
    {
        using var surface = SKSurface.Create(new SKImageInfo(width, height));
        var canvas = surface.Canvas;
        using var background = new SKPaint { IsAntialias = true };
        background.Shader = SKShader.CreateLinearGradient(new SKPoint(0, 0), new SKPoint(width, height), [from, to], SKShaderTileMode.Clamp);
        canvas.DrawRoundRect(new SKRect(0, 0, width, height), 48, 48, background);

        var unit = Math.Min(width, height) / 10f;
        var (cx, cy) = (width / 2f, height / 2f);
        using var white = new SKPaint { Color = SKColors.White, IsAntialias = true };
        using var line = new SKPaint { Color = SKColors.White, IsAntialias = true, Style = SKPaintStyle.Stroke, StrokeWidth = unit * 0.7f, StrokeCap = SKStrokeCap.Round };
        switch (shape)
        {
            case SampleShape.Mug:
                canvas.DrawOval(new SKRect(cx + unit * 1.2f, cy - unit * 1.5f, cx + unit * 3.4f, cy + unit * 1.5f), line);
                canvas.DrawRoundRect(new SKRect(cx - unit * 2.4f, cy - unit * 2.6f, cx + unit * 1.8f, cy + unit * 2.6f), unit * 0.6f, unit * 0.6f, white);
                break;
            case SampleShape.Ticket:
                canvas.DrawRoundRect(new SKRect(cx - unit * 3.6f, cy - unit * 2f, cx + unit * 3.6f, cy + unit * 2f), unit * 0.5f, unit * 0.5f, white);
                // A dashed tear line instead of cut-outs: it reads as a ticket on any background.
                using (var tear = new SKPaint { Color = from, IsAntialias = true, Style = SKPaintStyle.Stroke, StrokeWidth = unit * 0.22f, PathEffect = SKPathEffect.CreateDash([unit * 0.4f, unit * 0.35f], 0) })
                    canvas.DrawLine(cx + unit * 1.6f, cy - unit * 1.7f, cx + unit * 1.6f, cy + unit * 1.7f, tear);
                using (var star = new SKPaint { Color = to, IsAntialias = true })
                    canvas.DrawCircle(cx - unit * 1.1f, cy, unit * 0.9f, star);
                break;
            case SampleShape.Sun:
                canvas.DrawCircle(cx, cy, unit * 1.9f, white);
                for (var i = 0; i < 8; i++)
                {
                    var (dx, dy) = (MathF.Cos(i * MathF.PI / 4), MathF.Sin(i * MathF.PI / 4));
                    canvas.DrawLine(cx + dx * unit * 2.7f, cy + dy * unit * 2.7f, cx + dx * unit * 3.6f, cy + dy * unit * 3.6f, line);
                }
                break;
            case SampleShape.Headphones:
                canvas.DrawArc(new SKRect(cx - unit * 2.6f, cy - unit * 2.8f, cx + unit * 2.6f, cy + unit * 2.4f), 180, 180, false, line);
                canvas.DrawRoundRect(new SKRect(cx - unit * 3.3f, cy - unit * 0.4f, cx - unit * 1.9f, cy + unit * 2.4f), unit * 0.5f, unit * 0.5f, white);
                canvas.DrawRoundRect(new SKRect(cx + unit * 1.9f, cy - unit * 0.4f, cx + unit * 3.3f, cy + unit * 2.4f), unit * 0.5f, unit * 0.5f, white);
                break;
            case SampleShape.Heart:
                // Two circles on a square standing on its corner.
                var lobe = unit * 1.45f;
                canvas.DrawCircle(cx - lobe * 0.72f, cy - lobe * 0.72f, lobe, white);
                canvas.DrawCircle(cx + lobe * 0.72f, cy - lobe * 0.72f, lobe, white);
                canvas.Save();
                canvas.RotateDegrees(45, cx, cy);
                canvas.DrawRect(new SKRect(cx - lobe, cy - lobe, cx + lobe, cy + lobe), white);
                canvas.Restore();
                break;
        }

        using var picture = surface.Snapshot();
        var stream = new MemoryStream();
        picture.Encode(SKEncodedImageFormat.Png, 100).SaveTo(stream);
        stream.Position = 0;
        return stream;
    }
}
