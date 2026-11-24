using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PointHub.Api.Auth;
using PointHub.Api.Contracts;
using PointHub.Api.Http;
using PointHub.Domain.Common;
using PointHub.Domain.Events;
using PointHub.Infrastructure.Persistence;
using PointHub.Infrastructure.Services;

namespace PointHub.Api.Endpoints;

/// <summary>Everything a regular signed-in employee can do: see points, check in, redeem gifts.</summary>
public static class EmployeeEndpoints
{
    public static void MapEmployeeEndpoints(this RouteGroupBuilder api)
    {
        var group = api.MapGroup("").RequireAuthorization();

        group.MapGet("/me/points", async (int? page, int? pageSize, ClaimsPrincipal user, PointHubDbContext db, CancellationToken ct) =>
        {
            var me = user.EmployeeId();
            var account = await db.PointAccounts.AsNoTracking().SingleAsync(a => a.EmployeeId == me, ct);
            var transactions = await db.PointTransactions.AsNoTracking().Where(t => t.EmployeeId == me)
                .OrderByDescending(t => t.Id).Select(TransactionDto.Projection).ToPagedAsync(page, pageSize, ct);
            return new MyPointsDto(account.Balance, account.LifetimeEarned, account.LifetimeSpent, transactions);
        });

        group.MapPut("/me/locale", async (LocaleRequest request, ClaimsPrincipal user, PointHubDbContext db, CancellationToken ct) =>
        {
            if (!Locales.IsSupported(request.Locale)) return ApiProblem.Create(ErrorCodes.ValidationFailed, "Unsupported locale.");
            await db.Employees.Where(e => e.Id == user.EmployeeId())
                .ExecuteUpdateAsync(set => set.SetProperty(e => e.PreferredLocale, request.Locale), ct);
            return Results.NoContent();
        });

        group.MapGet("/me/redemptions", async (ClaimsPrincipal user, PointHubDbContext db, CancellationToken ct) =>
            await db.Redemptions.AsNoTracking().Where(r => r.EmployeeId == user.EmployeeId())
                .OrderByDescending(r => r.Id).Select(RedemptionDto.Projection).Take(200).ToListAsync(ct));

        group.MapGet("/events", async (ClaimsPrincipal user, PointHubDbContext db, CancellationToken ct) =>
            await db.Events.AsNoTracking().Where(e => e.Status == EventStatus.Open)
                .OrderBy(e => e.StartsAt).Select(EventSummaryDto.ProjectionFor(user.EmployeeId())).ToListAsync(ct));

        // `k` is the rotating code from the QR; it is only checked for events in rotating mode.
        group.MapGet("/checkin/{token}", async (string token, string? k, ClaimsPrincipal user, PointHubDbContext db, CheckInService checkIns, CancellationToken ct) =>
        {
            var ev = await db.Events.AsNoTracking().FirstOrDefaultAsync(e => e.CheckInToken == token, ct);
            if (ev is null) return ApiProblem.NotFound("Event");

            var employee = await db.Employees.AsNoTracking().SingleAsync(e => e.Id == user.EmployeeId(), ct);
            var summary = await db.Events.AsNoTracking().Where(e => e.Id == ev.Id).Select(EventSummaryDto.ProjectionFor(employee.Id)).SingleAsync(ct);
            var blocker = await checkIns.GetBlockerAsync(ev, employee, CheckInMethod.Link, k, ct);
            return Results.Ok(new CheckInPreviewDto(summary, blocker is null, blocker));
        });

        group.MapPost("/checkin/{token}", async (string token, string? k, ClaimsPrincipal user, PointHubDbContext db, CheckInService checkIns, CancellationToken ct) =>
        {
            var ev = await db.Events.FirstOrDefaultAsync(e => e.CheckInToken == token, ct);
            if (ev is null) return ApiProblem.NotFound("Event");

            var employee = await db.Employees.SingleAsync(e => e.Id == user.EmployeeId(), ct);
            var checkIn = await checkIns.CheckInAsync(ev, employee, CheckInMethod.Link, hostId: null, ct, rotatingCode: k);
            return Results.Ok(await db.CheckInDtoAsync(checkIn.Id, ct));
        });

        group.MapGet("/gifts", async (PointHubDbContext db, CancellationToken ct) =>
            await db.Gifts.AsNoTracking().Where(g => g.IsActive).OrderBy(g => g.PointCost).Select(GiftDto.Projection).ToListAsync(ct));

        group.MapPost("/gifts/{id:int}/redeem", async (int id, RedeemRequest request, ClaimsPrincipal user, PointHubDbContext db, RedemptionService redemptions, CancellationToken ct) =>
        {
            var redemption = await redemptions.RedeemAsync(id, user.EmployeeId(), request.Quantity, ct);
            return await db.Redemptions.AsNoTracking().Where(r => r.Id == redemption.Id).Select(RedemptionDto.Projection).SingleAsync(ct);
        });
    }

    public static Task<CheckInDto> CheckInDtoAsync(this PointHubDbContext db, int checkInId, CancellationToken ct) =>
        db.CheckIns.AsNoTracking().Where(c => c.Id == checkInId).Select(CheckInDto.Projection).SingleAsync(ct);
}
