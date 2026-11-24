using Microsoft.EntityFrameworkCore;
using PointHub.Domain.Common;
using PointHub.Domain.Employees;
using PointHub.Domain.Events;
using PointHub.Domain.Gifts;
using PointHub.Infrastructure.Services;
using SkiaSharp;

namespace PointHub.Infrastructure.Persistence;

/// <summary>
/// Sample data for local debugging only (called from Program.cs when Database:SeedDevData is true).
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
            Roles = roles, PreferredLocale = locale, IsActive = active, CreatedAt = now,
        };

        var admin = Person("E0001", "Alex Admin", "People Operations", EmployeeRoles.SystemAdmin);
        var host = Person("E0002", "佐藤 花子", "総務部", EmployeeRoles.EventAdmin, Locales.Japanese);
        var giftManager = Person("E0003", "林 怡君", "福利委員會", EmployeeRoles.GiftAdmin, Locales.TraditionalChinese);
        var auditor = Person("E0004", "Aiko Auditor", "Internal Audit", EmployeeRoles.Auditor);
        var staff = new[]
        {
            Person("E0101", "Taylor Staff", "Engineering"),
            Person("E0102", "田中 太郎", "営業部", locale: Locales.Japanese),
            Person("E0103", "陳 志明", "研發部", locale: Locales.TraditionalChinese),
            Person("E0104", "Morgan Lee", "Engineering"),
            Person("E0105", "Former Employee", "Engineering", active: false),
        };
        db.Employees.AddRange([admin, host, giftManager, auditor, .. staff]);

        staff[0].Cards.Add(new EmployeeCard { Uid = "04A23B1C", Label = "Staff badge", RegisteredAt = now });
        staff[1].Cards.Add(new EmployeeCard { Uid = "04D1E2F3A4B5C6", Label = "Staff badge", RegisteredAt = now });
        await db.SaveChangesAsync(ct);

        var kickoff = new Event
        {
            Title = new("Year-end Kickoff", "年末キックオフ", "年終啟動大會"),
            Description = new("All-hands with dinner afterwards.", "全社ミーティングと懇親会。", "全員大會，會後聚餐。"),
            Location = "HQ 12F Hall",
            StartsAt = now.AddHours(-1), EndsAt = now.AddHours(3),
            Points = 50, Status = EventStatus.Open, ApprovalMode = ApprovalMode.Manual,
            CreatedById = host.Id, CreatedAt = now,
            Hosts = [new EventHost { EmployeeId = host.Id }],
            Roster =
            [
                new() { EmployeeNo = "E0101", Name = "Taylor Staff", MatchStatus = RosterMatchStatus.Matched, EmployeeId = staff[0].Id, ImportedAt = now },
                new() { EmployeeNo = "E0102", Name = "田中 太郎", MatchStatus = RosterMatchStatus.Matched, EmployeeId = staff[1].Id, ImportedAt = now },
                new() { EmployeeNo = "E0999", Name = "New Joiner", MatchStatus = RosterMatchStatus.NotFound, ImportedAt = now },
            ],
        };
        var cleanup = new Event
        {
            Title = new("Beach Clean-up Volunteer Day", "ビーチクリーン・ボランティア", "淨灘志工日"),
            Location = "Seaside Park",
            StartsAt = now.AddDays(-14), EndsAt = now.AddDays(-14).AddHours(4),
            Points = 120, Status = EventStatus.Open, ApprovalMode = ApprovalMode.AutoApproveAll,
            CreatedById = host.Id, CreatedAt = now.AddDays(-20),
            Hosts = [new EventHost { EmployeeId = host.Id }],
        };
        var workshop = new Event
        {
            Title = new("Security Awareness Workshop", "セキュリティ研修", "資安意識工作坊"),
            Location = "Online",
            StartsAt = now.AddDays(10), EndsAt = now.AddDays(10).AddHours(2),
            Points = 30, Status = EventStatus.Draft, ApprovalMode = ApprovalMode.AutoApproveRoster,
            CreatedById = admin.Id, CreatedAt = now,
            Hosts = [new EventHost { EmployeeId = admin.Id }],
        };
        var townHall = new Event
        {
            Title = new("Monthly Town Hall", "月例タウンホール", "每月員工大會"),
            Location = "HQ 3F Auditorium",
            StartsAt = now.AddMinutes(-15), EndsAt = now.AddHours(1),
            Points = 20, Status = EventStatus.Open, ApprovalMode = ApprovalMode.AutoApproveAll, CheckInMode = CheckInMode.Rotating,
            CreatedById = host.Id, CreatedAt = now,
            Hosts = [new EventHost { EmployeeId = host.Id }],
        };
        db.Events.AddRange(kickoff, cleanup, workshop, townHall);

        Gift NewGift(LocalizedText name, LocalizedText description, int cost, int stock, int? limit = null)
        {
            var gift = new Gift { Name = name, Description = description, PointCost = cost, PerEmployeeLimit = limit, CreatedAt = now };
            gift.ChangeStock(stock);
            return gift;
        }
        var mug = NewGift(new("Company Mug", "オリジナルマグカップ", "公司馬克杯"), new("Ceramic, 350 ml.", "陶器製、350ml。", "陶瓷，350 毫升。"), 80, 40);
        var voucher = NewGift(new("Coffee Voucher", "コーヒーチケット", "咖啡兌換券"), new("One drink at the lobby café.", "ロビーカフェのドリンク1杯。", "大廳咖啡廳飲品一杯。"), 30, 200, limit: 5);
        var dayOff = NewGift(new("Extra Half-day Off", "半日休暇", "半天特休"), new("Subject to manager approval.", "上長の承認が必要です。", "需經主管核准。"), 500, 10, limit: 1);
        db.Gifts.AddRange(mug, voucher, dayOff);
        await db.SaveChangesAsync(ct);

        // Go through the real services so the sample ledger, accounts and stock are consistent.
        foreach (var employee in staff.Take(4))
            await checkIns.CheckInAsync(cleanup, employee, CheckInMethod.Link, hostId: null, ct);
        cleanup.Status = EventStatus.Closed;
        await checkIns.CheckInAsync(kickoff, staff[1], CheckInMethod.Link, hostId: null, ct);
        await checkIns.CheckInAsync(kickoff, staff[2], CheckInMethod.Link, hostId: null, ct);
        await redemptions.RedeemAsync(mug.Id, staff[0].Id, 1, ct);
        await redemptions.RedeemAsync(voucher.Id, staff[1].Id, 2, ct);
        var handedOver = await redemptions.RedeemAsync(voucher.Id, staff[3].Id, 1, ct);
        await redemptions.FulfillAsync(handedOver.Id, giftManager.Id, ct);

        // Drawn placeholder pictures in different shapes, to show the gallery and the size normalisation.
        var (blue, green) = (new SKColor(0x19, 0x9E, 0xCF), new SKColor(0x75, 0xB4, 0x2B));
        var (amber, rose) = (new SKColor(0xF5, 0x9E, 0x0B), new SKColor(0xE1, 0x1D, 0x48));
        using var mugWide = SamplePicture(900, 600, blue, green, SampleShape.Mug);
        using var mugTall = SamplePicture(480, 720, amber, rose, SampleShape.Mug);
        using var ticket = SamplePicture(800, 520, amber, new SKColor(0x92, 0x40, 0x0E), SampleShape.Ticket);
        using var sun = SamplePicture(640, 640, new SKColor(0x38, 0xBD, 0xF8), green, SampleShape.Sun);
        await images.AddAsync(mug.Id, [mugWide, mugTall], giftManager.Id, ct);
        await images.AddAsync(voucher.Id, [ticket], giftManager.Id, ct);
        await images.AddAsync(dayOff.Id, [sun], giftManager.Id, ct);
    }

    private enum SampleShape { Mug, Ticket, Sun }

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
                using (var cut = new SKPaint { IsAntialias = true, BlendMode = SKBlendMode.DstOut, Color = SKColors.Black })
                {
                    canvas.DrawCircle(cx - unit * 3.6f, cy, unit * 0.7f, cut);
                    canvas.DrawCircle(cx + unit * 3.6f, cy, unit * 0.7f, cut);
                    canvas.DrawCircle(cx, cy, unit * 1.1f, cut);
                }
                break;
            case SampleShape.Sun:
                canvas.DrawCircle(cx, cy, unit * 1.9f, white);
                for (var i = 0; i < 8; i++)
                {
                    var angle = i * MathF.PI / 4;
                    var (dx, dy) = (MathF.Cos(angle), MathF.Sin(angle));
                    canvas.DrawLine(cx + dx * unit * 2.7f, cy + dy * unit * 2.7f, cx + dx * unit * 3.6f, cy + dy * unit * 3.6f, line);
                }
                break;
        }

        using var picture = surface.Snapshot();
        var stream = new MemoryStream();
        picture.Encode(SKEncodedImageFormat.Png, 100).SaveTo(stream);
        stream.Position = 0;
        return stream;
    }
}
