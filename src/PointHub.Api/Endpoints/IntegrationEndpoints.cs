using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.EntityFrameworkCore;
using PointHub.Api.Auth;
using PointHub.Api.Contracts;
using PointHub.Api.Http;
using PointHub.Domain.Common;
using PointHub.Domain.Employees;
using PointHub.Infrastructure.Persistence;
using PointHub.Infrastructure.Services;

namespace PointHub.Api.Endpoints;

/// <summary>
/// Server-to-server API for other applications, authenticated with an API key and versioned in the path
/// so the contract can evolve without breaking callers. See "Integration API" in docs/api.md.
/// </summary>
public static class IntegrationEndpoints
{
    public const string PathPrefix = "/api/integration";
    private const string RateLimitPolicy = "integration";

    public static IServiceCollection AddIntegrationRateLimit(this IServiceCollection services, IConfiguration configuration)
    {
        var perMinute = configuration.GetValue("Integration:RequestsPerMinute", 120);
        return services.AddRateLimiter(limiter =>
        {
            limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            // One bucket per API key; unauthenticated callers share a bucket per address so key guessing is throttled too.
            limiter.AddPolicy(RateLimitPolicy, http => RateLimitPartition.GetFixedWindowLimiter(
                http.User.FindFirstValue(ApiKeyAuthenticationHandler.ClientIdClaim) ?? $"ip:{http.Connection.RemoteIpAddress}",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = perMinute, Window = TimeSpan.FromMinutes(1) }));
        });
    }

    public static void MapIntegrationEndpoints(this RouteGroupBuilder api)
    {
        var v1 = api.MapGroup("/integration/v1").RequireRateLimiting(RateLimitPolicy);
        var read = v1.MapGroup("").RequireAuthorization(Policies.IntegrationRead);
        var write = v1.MapGroup("").RequireAuthorization(Policies.IntegrationWrite);

        read.MapGet("/employees/{employeeNo}/points", async (string employeeNo, PointHubDbContext db, CancellationToken ct) =>
            await db.Employees.AsNoTracking().Include(e => e.Account).FirstOrDefaultAsync(e => e.EmployeeNo == employeeNo, ct) is { } employee
                ? Results.Ok(EmployeePointsDto.From(employee))
                : ApiProblem.NotFound("Employee"));

        read.MapGet("/employees/{employeeNo}/transactions", async (string employeeNo, int? page, int? pageSize, PointHubDbContext db, CancellationToken ct) =>
            await db.Employees.AnyAsync(e => e.EmployeeNo == employeeNo, ct)
                ? Results.Ok(await db.PointTransactions.AsNoTracking().Where(t => t.Employee.EmployeeNo == employeeNo)
                    .OrderByDescending(t => t.Id).Select(TransactionDto.Projection).ToPagedAsync(page, pageSize, ct))
                : ApiProblem.NotFound("Employee"));

        read.MapGet("/cards/{uid}/points", async (string uid, PointHubDbContext db, CancellationToken ct) =>
        {
            var normalized = CardUid.Normalize(uid);
            var card = await db.EmployeeCards.AsNoTracking().Include(c => c.Employee.Account)
                .FirstOrDefaultAsync(c => c.Uid == normalized && c.IsActive, ct);
            return card is null
                ? ApiProblem.Create(ErrorCodes.CardNotRegistered, "No active card with this UID.")
                : Results.Ok(EmployeePointsDto.From(card.Employee));
        });

        v1.MapPut("/employees/{employeeNo}", async (string employeeNo, EmployeeUpsertInput input, ClaimsPrincipal caller, EmployeeDirectory directory, CancellationToken ct) =>
        {
            var number = employeeNo.Trim();
            if (number.Length is 0 or > 32) return ApiProblem.Create(ErrorCodes.ValidationFailed, "Employee number must be 1 to 32 characters.");

            var profile = new EmployeeDirectory.Profile(input.DisplayName.Trim(), input.Email.Trim(), string.IsNullOrWhiteSpace(input.Department) ? null : input.Department.Trim(), input.IsActive);
            var (employee, created) = await directory.UpsertFromHrAsync(number, profile, caller.Identity?.Name ?? "API client", ct);
            var dto = EmployeeRecordDto.From(employee);
            return created ? Results.Created($"{PathPrefix}/v1/employees/{dto.EmployeeNo}/points", dto) : Results.Ok(dto);
        }).RequireAuthorization(Policies.IntegrationEmployees);

        write.MapPost("/transactions", async (ExternalTransactionInput input, ClaimsPrincipal caller, PointLedger ledger, PointHubDbContext db, CancellationToken ct) =>
        {
            if (input.Amount == 0) return ApiProblem.Create(ErrorCodes.ValidationFailed, "Amount must not be zero.");

            var (transaction, created) = await ledger.PostExternalAsync(
                caller.ApiClientId(), input.EmployeeNo.Trim(), input.Amount, input.Reason.Trim(), input.ExternalReference.Trim(), ct);
            var dto = await db.PointTransactions.AsNoTracking().Where(t => t.Id == transaction.Id).Select(TransactionDto.Projection).SingleAsync(ct);
            return created ? Results.Created($"{PathPrefix}/v1/employees/{dto.EmployeeNo}/transactions", dto) : Results.Ok(dto);
        });
    }
}
