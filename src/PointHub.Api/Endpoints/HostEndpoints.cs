using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PointHub.Api.Auth;
using PointHub.Api.Contracts;
using PointHub.Api.Http;
using PointHub.Domain.Common;
using PointHub.Domain.Employees;
using PointHub.Domain.Events;
using PointHub.Infrastructure.Persistence;
using PointHub.Infrastructure.Services;

namespace PointHub.Api.Endpoints;

/// <summary>Event management for hosts. A host only reaches events they host; admins reach all of them.</summary>
public static class HostEndpoints
{
    private const long MaxRosterFileBytes = 2 * 1024 * 1024;

    public static void MapHostEndpoints(this RouteGroupBuilder api)
    {
        var group = api.MapGroup("/host").RequireAuthorization(Policies.EventAdmin);

        group.MapGet("/events", async (ClaimsPrincipal user, PointHubDbContext db, CancellationToken ct) =>
            await Hosted(db, user).AsNoTracking().OrderByDescending(e => e.StartsAt)
                .Select(EventSummaryDto.ProjectionFor(user.EmployeeId())).ToListAsync(ct));

        group.MapPost("/events", async (EventInput input, ClaimsPrincipal user, PointHubDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            if (input.EndsAt <= input.StartsAt) return ApiProblem.Create(ErrorCodes.ValidationFailed, "The event must end after it starts.");
            var me = user.EmployeeId();
            var ev = new Event { Title = input.Title.ToDomain(), CreatedById = me, CreatedAt = clock.GetUtcNow(), Hosts = [new EventHost { EmployeeId = me }] };
            Apply(input, ev);
            db.Events.Add(ev);
            await db.SaveChangesAsync(ct);
            return Results.Ok(await DetailAsync(db, ev, me, ct));
        });

        group.MapGet("/events/{id:int}", async (int id, ClaimsPrincipal user, PointHubDbContext db, CancellationToken ct) =>
            await Hosted(db, user).AsNoTracking().FirstOrDefaultAsync(e => e.Id == id, ct) is { } ev
                ? Results.Ok(await DetailAsync(db, ev, user.EmployeeId(), ct))
                : ApiProblem.NotFound("Event"));

        group.MapPut("/events/{id:int}", async (int id, EventInput input, ClaimsPrincipal user, PointHubDbContext db, CancellationToken ct) =>
        {
            if (input.EndsAt <= input.StartsAt) return ApiProblem.Create(ErrorCodes.ValidationFailed, "The event must end after it starts.");
            if (await Hosted(db, user).FirstOrDefaultAsync(e => e.Id == id, ct) is not { } ev) return ApiProblem.NotFound("Event");
            Apply(input, ev);
            await db.SaveChangesAsync(ct);
            return Results.Ok(await DetailAsync(db, ev, user.EmployeeId(), ct));
        });

        group.MapPost("/events/{id:int}/status", async (int id, EventStatusRequest request, ClaimsPrincipal user, PointHubDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            if (await Hosted(db, user).FirstOrDefaultAsync(e => e.Id == id, ct) is not { } ev) return ApiProblem.NotFound("Event");
            db.Audit(user.EmployeeId(), "event.status", nameof(Event), ev.Id, $"{ev.Status} -> {request.Status}", clock);
            ev.Status = request.Status;
            await db.SaveChangesAsync(ct);
            return Results.Ok(await DetailAsync(db, ev, user.EmployeeId(), ct));
        });

        group.MapPost("/events/{id:int}/token", async (int id, ClaimsPrincipal user, PointHubDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            if (await Hosted(db, user).FirstOrDefaultAsync(e => e.Id == id, ct) is not { } ev) return ApiProblem.NotFound("Event");
            ev.RegenerateToken();
            db.Audit(user.EmployeeId(), "event.token", nameof(Event), ev.Id, "Check-in link regenerated", clock);
            await db.SaveChangesAsync(ct);
            return Results.Ok(await DetailAsync(db, ev, user.EmployeeId(), ct));
        });

        group.MapGet("/events/{id:int}/checkin-code", async (int id, ClaimsPrincipal user, PointHubDbContext db, TimeProvider clock, IOptions<CheckInOptions> options, CancellationToken ct) =>
        {
            if (await Hosted(db, user).AsNoTracking().FirstOrDefaultAsync(e => e.Id == id, ct) is not { } ev) return ApiProblem.NotFound("Event");
            if (ev.CheckInMode != CheckInMode.Rotating) return ApiProblem.Create(ErrorCodes.Conflict, "This event uses a static check-in link.");

            var (now, period) = (clock.GetUtcNow(), options.Value.RotatingPeriod);
            return Results.Ok(new RotatingCodeDto(ev.RotatingCode(now, period), Event.RotatingCodeExpiry(now, period), (int)period.TotalSeconds));
        });

        group.MapGet("/events/{id:int}/roster", async (int id, ClaimsPrincipal user, PointHubDbContext db, CancellationToken ct) =>
            await Hosted(db, user).AnyAsync(e => e.Id == id, ct) ? Results.Ok(await RosterAsync(db, id, ct)) : ApiProblem.NotFound("Event"));

        group.MapPost("/events/{id:int}/roster/import", async (int id, IFormFile file, bool? replace, ClaimsPrincipal user, PointHubDbContext db, RosterService roster, CancellationToken ct) =>
        {
            if (await Hosted(db, user).FirstOrDefaultAsync(e => e.Id == id, ct) is not { } ev) return ApiProblem.NotFound("Event");
            if (file.Length is 0 or > MaxRosterFileBytes) return ApiProblem.Create(ErrorCodes.InvalidCsv, "The file is empty or larger than 2 MB.");

            await using var stream = file.OpenReadStream();
            await roster.ImportAsync(ev, stream, replace ?? false, user.EmployeeId(), ct);
            return Results.Ok(RosterImportResultDto.From(await RosterAsync(db, id, ct)));
        }).DisableAntiforgery(); // CSRF is covered by the X-Requested-With check on every write

        group.MapPost("/events/{id:int}/roster/rematch", async (int id, ClaimsPrincipal user, PointHubDbContext db, RosterService roster, CancellationToken ct) =>
        {
            if (await Hosted(db, user).FirstOrDefaultAsync(e => e.Id == id, ct) is not { } ev) return ApiProblem.NotFound("Event");
            await roster.RematchAsync(ev, ct);
            return Results.Ok(RosterImportResultDto.From(await RosterAsync(db, id, ct)));
        });

        group.MapGet("/events/{id:int}/checkins", async (int id, string? status, ClaimsPrincipal user, PointHubDbContext db, CancellationToken ct) =>
        {
            var filter = QueryEnum.Parse<CheckInStatus>(status);
            return await Hosted(db, user).AnyAsync(e => e.Id == id, ct)
                ? Results.Ok(await db.CheckIns.AsNoTracking().Where(c => c.EventId == id && (filter == null || c.Status == filter))
                    .OrderByDescending(c => c.Id).Select(CheckInDto.Projection).ToListAsync(ct))
                : ApiProblem.NotFound("Event");
        });

        group.MapPost("/events/{id:int}/checkins/approve-all", async (int id, ApproveAllRequest request, ClaimsPrincipal user, PointHubDbContext db, CheckInService checkIns, CancellationToken ct) =>
            await Hosted(db, user).FirstOrDefaultAsync(e => e.Id == id, ct) is { } ev
                ? Results.Ok(new { approved = await checkIns.ApproveAllAsync(ev, request.OnlyRoster, user.EmployeeId(), ct) })
                : ApiProblem.NotFound("Event"));

        group.MapPost("/events/{id:int}/checkins/card", async (int id, CardCheckInRequest request, ClaimsPrincipal user, PointHubDbContext db, CheckInService checkIns, CancellationToken ct) =>
        {
            if (await Hosted(db, user).FirstOrDefaultAsync(e => e.Id == id, ct) is not { } ev) return ApiProblem.NotFound("Event");
            var uid = CardUid.Normalize(request.CardUid);
            var card = await db.EmployeeCards.Include(c => c.Employee).FirstOrDefaultAsync(c => c.Uid == uid && c.IsActive, ct);
            if (card is null) return ApiProblem.Create(ErrorCodes.CardNotRegistered, "No active card with this UID.");

            var checkIn = await checkIns.CheckInAsync(ev, card.Employee, CheckInMethod.Card, user.EmployeeId(), ct);
            return Results.Ok(await db.CheckInDtoAsync(checkIn.Id, ct));
        });

        group.MapPost("/events/{id:int}/checkins/manual", async (int id, ManualCheckInRequest request, ClaimsPrincipal user, PointHubDbContext db, CheckInService checkIns, CancellationToken ct) =>
        {
            if (await Hosted(db, user).FirstOrDefaultAsync(e => e.Id == id, ct) is not { } ev) return ApiProblem.NotFound("Event");
            var employeeNo = request.EmployeeNo.Trim();
            var employee = await db.Employees.FirstOrDefaultAsync(e => e.EmployeeNo == employeeNo, ct);
            if (employee is null) return ApiProblem.NotFound("Employee");

            var checkIn = await checkIns.CheckInAsync(ev, employee, CheckInMethod.Manual, user.EmployeeId(), ct);
            return Results.Ok(await db.CheckInDtoAsync(checkIn.Id, ct));
        });

        group.MapPost("/checkins/{id:int}/approve", async (int id, ClaimsPrincipal user, PointHubDbContext db, CheckInService checkIns, CancellationToken ct) =>
        {
            if (await HostedCheckInAsync(db, user, id, ct) is not { } checkIn) return ApiProblem.NotFound("Check-in");
            await checkIns.ApproveAsync(checkIn, user.EmployeeId(), ct);
            return Results.Ok(await db.CheckInDtoAsync(id, ct));
        });

        group.MapPost("/checkins/{id:int}/reject", async (int id, RejectRequest request, ClaimsPrincipal user, PointHubDbContext db, CheckInService checkIns, CancellationToken ct) =>
        {
            if (await HostedCheckInAsync(db, user, id, ct) is not { } checkIn) return ApiProblem.NotFound("Check-in");
            await checkIns.RejectAsync(checkIn, user.EmployeeId(), request.Reason, ct);
            return Results.Ok(await db.CheckInDtoAsync(id, ct));
        });
    }

    private static IQueryable<Event> Hosted(PointHubDbContext db, ClaimsPrincipal user)
    {
        if (user.IsInRole(RoleName.SystemAdmin)) return db.Events;
        var me = user.EmployeeId();
        return db.Events.Where(e => e.Hosts.Any(h => h.EmployeeId == me));
    }

    private static async Task<EventCheckIn?> HostedCheckInAsync(PointHubDbContext db, ClaimsPrincipal user, int id, CancellationToken ct)
    {
        var checkIn = await db.CheckIns.Include(c => c.Event).Include(c => c.Employee).FirstOrDefaultAsync(c => c.Id == id, ct);
        return checkIn is not null && await Hosted(db, user).AnyAsync(e => e.Id == checkIn.EventId, ct) ? checkIn : null;
    }

    private static void Apply(EventInput input, Event ev)
    {
        ev.Title = input.Title.ToDomain();
        ev.Description = input.Description?.ToDomain();
        ev.Location = string.IsNullOrWhiteSpace(input.Location) ? null : input.Location.Trim();
        ev.StartsAt = input.StartsAt;
        ev.EndsAt = input.EndsAt;
        ev.Points = input.Points;
        ev.ApprovalMode = input.ApprovalMode;
        ev.CheckInMode = input.CheckInMode;
        ev.RosterOnly = input.RosterOnly;
        ev.MaxParticipants = input.MaxParticipants;
    }

    private static async Task<EventDetailDto> DetailAsync(PointHubDbContext db, Event ev, int me, CancellationToken ct)
    {
        var summary = await db.Events.AsNoTracking().Where(e => e.Id == ev.Id).Select(EventSummaryDto.ProjectionFor(me)).SingleAsync(ct);
        var hosts = await db.EventHosts.AsNoTracking().Where(h => h.EventId == ev.Id)
            .Select(h => new EventHostDto(h.EmployeeId, h.Employee.DisplayName)).ToListAsync(ct);
        var checkIns = await db.CheckIns.AsNoTracking().Where(c => c.EventId == ev.Id)
            .GroupBy(c => c.Status).Select(g => new { Status = g.Key, Count = g.Count() }).ToDictionaryAsync(g => g.Status, g => g.Count, ct);
        var roster = await db.RosterEntries.CountAsync(r => r.EventId == ev.Id, ct);
        var unmatched = await db.RosterEntries.CountAsync(r => r.EventId == ev.Id && r.MatchStatus != RosterMatchStatus.Matched, ct);

        return new EventDetailDto(
            summary.Id, summary.Title, summary.Description, summary.Location, summary.StartsAt, summary.EndsAt,
            summary.Points, summary.Status, summary.ApprovalMode, summary.CheckInMode, summary.MyCheckInStatus,
            ev.CheckInToken, ev.RosterOnly, ev.MaxParticipants, hosts,
            new EventCountsDto(
                checkIns.GetValueOrDefault(CheckInStatus.Pending), checkIns.GetValueOrDefault(CheckInStatus.Approved),
                checkIns.GetValueOrDefault(CheckInStatus.Rejected), roster, unmatched));
    }

    private static async Task<List<RosterEntryDto>> RosterAsync(PointHubDbContext db, int eventId, CancellationToken ct) =>
        await db.RosterEntries.AsNoTracking().Where(r => r.EventId == eventId).OrderBy(r => r.Id)
            .Select(r => new RosterEntryDto(
                r.Id, r.EmployeeNo, r.Name, r.Email, r.MatchStatus, r.EmployeeId, r.Employee!.DisplayName,
                db.CheckIns.Where(c => c.EventId == eventId && c.EmployeeId == r.EmployeeId).Select(c => (CheckInStatus?)c.Status).FirstOrDefault()))
            .ToListAsync(ct);
}
