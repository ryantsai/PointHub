using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PointHub.Api.Auth;
using PointHub.Api.Contracts;
using PointHub.Api.Http;
using PointHub.Domain.Common;
using PointHub.Domain.Employees;
using PointHub.Domain.Gifts;
using PointHub.Domain.Integration;
using PointHub.Domain.Points;
using PointHub.Infrastructure;
using PointHub.Infrastructure.Persistence;
using PointHub.Infrastructure.Services;

namespace PointHub.Api.Endpoints;

/// <summary>Back office: ledger, adjustments, employees and cards, gifts and redemptions, audit log, site theme.</summary>
public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this RouteGroupBuilder api)
    {
        var admin = api.MapGroup("/admin");
        MapLedger(admin);
        MapEmployees(admin);
        MapGifts(admin.MapGroup("").RequireAuthorization(Policies.GiftAdmin));
        MapApiClients(admin.MapGroup("/api-clients").RequireAuthorization(Policies.SystemAdmin));

        admin.MapGet("/audit", async (int? page, int? pageSize, PointHubDbContext db, CancellationToken ct) =>
            await db.AuditLogs.AsNoTracking().OrderByDescending(a => a.Id).Select(AuditEntryDto.Projection).ToPagedAsync(page, pageSize, ct))
            .RequireAuthorization(Policies.AdminRead);

        admin.MapSiteSettingsEndpoints();

        admin.MapGet("/stats", async (AdminStatsService stats, CancellationToken ct) =>
        {
            var s = await stats.GetAsync(ct);
            return new AdminStatsDto(
                s.PointsIssuedThisMonth, s.PointsIssuedLastMonth, s.PointsRedeemedThisMonth, s.PointsRedeemedLastMonth,
                s.ActiveParticipants, s.TotalEmployees, s.OutstandingPoints, s.PendingCheckIns, s.OpenClaims,
                s.Weeks.Select(w => new AdminStatsWeekDto(w.WeekStart, w.Issued, w.Redeemed)).ToList());
        }).RequireAuthorization(Policies.AdminRead);
    }

    private static void MapLedger(RouteGroupBuilder admin)
    {
        admin.MapGet("/transactions", async (int? employeeId, string? type, int? eventId, string? q, int? page, int? pageSize, PointHubDbContext db, CancellationToken ct) =>
        {
            var query = db.PointTransactions.AsNoTracking();
            if (employeeId is not null) query = query.Where(t => t.EmployeeId == employeeId);
            if (QueryEnum.Parse<PointTransactionType>(type) is { } typeFilter) query = query.Where(t => t.Type == typeFilter);
            if (eventId is not null) query = query.Where(t => t.EventId == eventId);
            if (!string.IsNullOrWhiteSpace(q)) query = query.Where(t => t.Employee.EmployeeNo.Contains(q) || t.Employee.DisplayName.Contains(q));
            return await query.OrderByDescending(t => t.Id).Select(TransactionDto.Projection).ToPagedAsync(page, pageSize, ct);
        }).RequireAuthorization(Policies.AdminRead);

        admin.MapPost("/transactions/{id:long}/revert", async (long id, ReasonRequest request, ClaimsPrincipal user, PointLedger ledger, PointHubDbContext db, CancellationToken ct) =>
        {
            var reversal = await ledger.RevertAsync(id, request.Reason.Trim(), user.EmployeeId(), ct);
            return await TransactionAsync(db, reversal.Id, ct);
        }).RequireAuthorization(Policies.SystemAdmin);

        admin.MapPost("/adjustments", async (AdjustmentRequest request, ClaimsPrincipal user, PointLedger ledger, PointHubDbContext db, CancellationToken ct) =>
        {
            if (request.Amount == 0) return ApiProblem.Create(ErrorCodes.ValidationFailed, "Amount must not be zero.");
            var adjustment = await ledger.AdjustAsync(request.EmployeeId, request.Amount, request.Reason.Trim(), user.EmployeeId(), ct);
            return Results.Ok(await TransactionAsync(db, adjustment.Id, ct));
        }).RequireAuthorization(Policies.SystemAdmin);
    }

    private static void MapEmployees(RouteGroupBuilder admin)
    {
        admin.MapGet("/employees", async (string? q, int? page, int? pageSize, PointHubDbContext db, CancellationToken ct) =>
        {
            var query = db.Employees.AsNoTracking().Include(e => e.Account).Include(e => e.Cards).AsSplitQuery();
            if (!string.IsNullOrWhiteSpace(q))
                query = query.Where(e => e.EmployeeNo.Contains(q) || e.DisplayName.Contains(q) || e.Email.Contains(q));

            var result = await query.OrderBy(e => e.EmployeeNo).ToPagedAsync(page, pageSize, ct);
            return new Paged<EmployeeDto>(result.Items.Select(EmployeeDto.From).ToList(), result.Total, result.Page, result.PageSize);
        }).RequireAuthorization(Policies.AdminRead);

        // Roles: system admin, event admin, gift admin, auditor. An empty list makes the person a normal user.
        admin.MapPut("/employees/{id:int}/roles", async (int id, RolesRequest request, ClaimsPrincipal user, PointHubDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            if (RoleName.Parse(request.Roles) is not { } roles) return ApiProblem.Create(ErrorCodes.ValidationFailed, "Unknown role.");
            var employee = await db.Employees.Include(e => e.Account).Include(e => e.Cards).FirstOrDefaultAsync(e => e.Id == id, ct);
            if (employee is null) return ApiProblem.NotFound("Employee");

            // Never let the last system admin remove the role (from themselves or anyone): nobody could give it back.
            var removesSystemAdmin = employee.Roles.HasFlag(EmployeeRoles.SystemAdmin) && !roles.HasFlag(EmployeeRoles.SystemAdmin);
            if (removesSystemAdmin && !await db.Employees.AnyAsync(e => e.Id != id && e.IsActive && (e.Roles & EmployeeRoles.SystemAdmin) != 0, ct))
                return ApiProblem.Create(ErrorCodes.LastSystemAdmin, "There must be at least one system admin.");

            db.Audit(user.EmployeeId(), "employee.roles", nameof(Employee), employee.EmployeeNo,
                $"{string.Join(", ", employee.RoleNames().DefaultIfEmpty("none"))} -> {string.Join(", ", Employee.RoleNames(roles).DefaultIfEmpty("none"))}", clock);
            employee.Roles = roles;
            await db.SaveChangesAsync(ct);
            return Results.Ok(EmployeeDto.From(employee));
        }).RequireAuthorization(Policies.SystemAdmin);

        admin.MapPost("/employees/{id:int}/cards", async (int id, RegisterCardRequest request, ClaimsPrincipal user, PointHubDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var uid = CardUid.Normalize(request.CardUid);
            if (!await db.Employees.AnyAsync(e => e.Id == id, ct)) return ApiProblem.NotFound("Employee");
            if (await db.EmployeeCards.AnyAsync(c => c.Uid == uid, ct))
                return ApiProblem.Create(ErrorCodes.CardAlreadyRegistered, "This card is already registered.");

            var card = new EmployeeCard { EmployeeId = id, Uid = uid, Label = request.Label, RegisteredAt = clock.GetUtcNow(), RegisteredById = user.EmployeeId() };
            db.EmployeeCards.Add(card);
            db.Audit(user.EmployeeId(), "card.register", nameof(Employee), id, $"Card {uid}", clock);
            await db.SaveChangesAsync(ct);
            return Results.Ok(CardDto.From(card));
        }).RequireAuthorization(Policies.SystemAdmin);

        admin.MapDelete("/cards/{id:int}", async (int id, ClaimsPrincipal user, PointHubDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            if (await db.EmployeeCards.FirstOrDefaultAsync(c => c.Id == id, ct) is not { } card) return ApiProblem.NotFound("Card");
            db.EmployeeCards.Remove(card);
            db.Audit(user.EmployeeId(), "card.remove", nameof(Employee), card.EmployeeId, $"Card {card.Uid}", clock);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization(Policies.SystemAdmin);
    }

    private static void MapGifts(RouteGroupBuilder gifts)
    {
        gifts.MapGet("/gifts", async (PointHubDbContext db, CancellationToken ct) =>
            await db.Gifts.AsNoTracking().OrderBy(g => g.Id).Select(GiftDto.Projection).ToListAsync(ct));

        gifts.MapPost("/gifts", async (GiftInput input, ClaimsPrincipal user, PointHubDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var now = clock.GetUtcNow();
            var gift = new Gift { Name = input.Name.ToDomain(), CreatedAt = now };
            Apply(input, gift);
            db.Gifts.Add(gift);
            if (input.InitialStock is > 0)
            {
                gift.ChangeStock(input.InitialStock.Value);
                db.GiftStockMovements.Add(new GiftStockMovement { Gift = gift, Delta = input.InitialStock.Value, Reason = "Initial stock", CreatedById = user.EmployeeId(), CreatedAt = now });
            }
            await db.SaveChangesAsync(ct);
            db.Audit(user.EmployeeId(), "gift.create", nameof(Gift), gift.Id, gift.Name.En, clock);
            await db.SaveChangesAsync(ct);
            return await GiftAsync(db, gift.Id, ct);
        });

        gifts.MapPut("/gifts/{id:int}", async (int id, GiftInput input, ClaimsPrincipal user, PointHubDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            if (await db.Gifts.FirstOrDefaultAsync(g => g.Id == id, ct) is not { } gift) return ApiProblem.NotFound("Gift");
            Apply(input, gift);
            db.Audit(user.EmployeeId(), "gift.update", nameof(Gift), gift.Id, $"{gift.Name.En}: {gift.PointCost} points, active {gift.IsActive}, limit {gift.PerEmployeeLimit?.ToString() ?? "none"}", clock);
            await db.SaveChangesAsync(ct);
            return Results.Ok(await GiftAsync(db, id, ct));
        });

        gifts.MapPost("/gifts/{id:int}/stock", async (int id, StockRequest request, ClaimsPrincipal user, RedemptionService redemptions, PointHubDbContext db, CancellationToken ct) =>
        {
            await redemptions.AdjustStockAsync(id, request.Delta, request.Reason.Trim(), user.EmployeeId(), ct);
            return await GiftAsync(db, id, ct);
        });

        // Pictures: normalised to one square frame and stored as flat files (see GiftImageService).
        gifts.MapPost("/gifts/{id:int}/images", async (int id, IFormFileCollection files, ClaimsPrincipal user, GiftImageService images, PointHubDbContext db, CancellationToken ct) =>
        {
            var streams = files.Select(file => file.OpenReadStream()).ToList();
            try
            {
                await images.AddAsync(id, streams, user.EmployeeId(), ct);
            }
            finally
            {
                foreach (var stream in streams) await stream.DisposeAsync();
            }
            return await GiftAsync(db, id, ct);
        }).DisableAntiforgery(); // CSRF is covered by the X-Requested-With check on every write

        gifts.MapDelete("/gifts/{id:int}/images/{imageId:guid}", async (int id, Guid imageId, ClaimsPrincipal user, GiftImageService images, PointHubDbContext db, CancellationToken ct) =>
        {
            await images.RemoveAsync(id, imageId, user.EmployeeId(), ct);
            return await GiftAsync(db, id, ct);
        });

        gifts.MapPut("/gifts/{id:int}/images/order", async (int id, ImageOrderRequest request, GiftImageService images, PointHubDbContext db, CancellationToken ct) =>
        {
            await images.ReorderAsync(id, request.ImageIds, ct);
            return await GiftAsync(db, id, ct);
        });

        // Claims. `q` matches the employee number or name, `giftId` narrows to one gift.
        gifts.MapGet("/redemptions", async (string? status, string? q, int? giftId, int? page, int? pageSize, PointHubDbContext db, CancellationToken ct) =>
        {
            var filter = QueryEnum.Parse<RedemptionStatus>(status);
            var query = db.Redemptions.AsNoTracking().Where(r => filter == null || r.Status == filter);
            if (giftId is not null) query = query.Where(r => r.GiftId == giftId);
            if (!string.IsNullOrWhiteSpace(q)) query = query.Where(r => r.Employee.EmployeeNo.Contains(q) || r.Employee.DisplayName.Contains(q));
            return await query.OrderByDescending(r => r.Id).Select(RedemptionDto.Projection).ToPagedAsync(page, pageSize, ct);
        });

        gifts.MapPost("/redemptions/{id:int}/fulfill", async (int id, ClaimsPrincipal user, RedemptionService redemptions, PointHubDbContext db, CancellationToken ct) =>
        {
            await redemptions.FulfillAsync(id, user.EmployeeId(), ct);
            return await RedemptionAsync(db, id, ct);
        });

        gifts.MapPost("/redemptions/{id:int}/reopen", async (int id, ClaimsPrincipal user, RedemptionService redemptions, PointHubDbContext db, CancellationToken ct) =>
        {
            await redemptions.ReopenAsync(id, user.EmployeeId(), ct);
            return await RedemptionAsync(db, id, ct);
        });

        gifts.MapPost("/redemptions/{id:int}/cancel", async (int id, ReasonRequest request, ClaimsPrincipal user, RedemptionService redemptions, PointHubDbContext db, CancellationToken ct) =>
        {
            await redemptions.CancelAsync(id, user.EmployeeId(), request.Reason.Trim(), ct);
            return await RedemptionAsync(db, id, ct);
        });
    }

    /// <summary>Keys for other applications that call the integration API.</summary>
    private static void MapApiClients(RouteGroupBuilder clients)
    {
        clients.MapGet("", async (PointHubDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var now = clock.GetUtcNow();
            var all = await db.ApiClients.AsNoTracking().Include(c => c.CreatedBy).OrderByDescending(c => c.Id).ToListAsync(ct);
            return all.Select(c => ApiClientDto.From(c, now));
        });

        clients.MapPost("", async (CreateApiClientRequest request, ClaimsPrincipal user, PointHubDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var now = clock.GetUtcNow();
            if (ScopeName.Parse(request.Scopes) is not { } scopes) return ApiProblem.Create(ErrorCodes.ValidationFailed, "Unknown scope.");
            if (request.ExpiresAt <= now) return ApiProblem.Create(ErrorCodes.ValidationFailed, "The expiry date must be in the future.");

            var (client, apiKey) = ApiClient.Create(request.Name.Trim(), scopes, request.ExpiresAt, user.EmployeeId(), now);
            db.ApiClients.Add(client);
            await db.SaveChangesAsync(ct);
            db.Audit(user.EmployeeId(), "apiclient.create", nameof(ApiClient), client.Id, $"{client.Name} ({string.Join(", ", client.ScopeNames())})", clock);
            await db.SaveChangesAsync(ct);

            await db.Entry(client).Reference(c => c.CreatedBy).LoadAsync(ct);
            return Results.Ok(new ApiClientCreatedDto(ApiClientDto.From(client, now), apiKey));
        });

        clients.MapPost("/{id:int}/revoke", async (int id, ClaimsPrincipal user, PointHubDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            if (await db.ApiClients.Include(c => c.CreatedBy).FirstOrDefaultAsync(c => c.Id == id, ct) is not { } client) return ApiProblem.NotFound("API client");
            var now = clock.GetUtcNow();
            client.Revoke(now);
            db.Audit(user.EmployeeId(), "apiclient.revoke", nameof(ApiClient), client.Id, client.Name, clock);
            await db.SaveChangesAsync(ct);
            return Results.Ok(ApiClientDto.From(client, now));
        });
    }

    private static void Apply(GiftInput input, Gift gift)
    {
        gift.Name = input.Name.ToDomain();
        gift.Description = input.Description?.ToDomain();
        gift.PointCost = input.PointCost;
        gift.IsActive = input.IsActive;
        gift.PerEmployeeLimit = input.PerEmployeeLimit;
    }

    private static Task<GiftDto> GiftAsync(PointHubDbContext db, int id, CancellationToken ct) =>
        db.Gifts.AsNoTracking().Where(g => g.Id == id).Select(GiftDto.Projection).SingleAsync(ct);

    private static Task<TransactionDto> TransactionAsync(PointHubDbContext db, long id, CancellationToken ct) =>
        db.PointTransactions.AsNoTracking().Where(t => t.Id == id).Select(TransactionDto.Projection).SingleAsync(ct);

    private static Task<RedemptionDto> RedemptionAsync(PointHubDbContext db, int id, CancellationToken ct) =>
        db.Redemptions.AsNoTracking().Where(r => r.Id == id).Select(RedemptionDto.Projection).SingleAsync(ct);
}
