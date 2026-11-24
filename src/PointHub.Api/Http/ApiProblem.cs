using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using PointHub.Domain.Common;
using PointHub.Infrastructure.Persistence;

namespace PointHub.Api.Http;

/// <summary>Builds the problem+json responses described in docs/api.md: every error carries a stable <c>code</c>.</summary>
public static class ApiProblem
{
    public const string CodeKey = "code";
    public const string CsrfHeader = "X-Requested-With";
    public const string CsrfHeaderMissing = "csrf_header_missing";

    public static IResult Create(string code, string title) => Results.Problem(
        title: title, statusCode: StatusFor(code), extensions: new Dictionary<string, object?> { [CodeKey] = code });

    public static IResult NotFound(string what = "Resource") => Create(ErrorCodes.NotFound, $"{what} not found.");

    public static int StatusFor(string code) => code switch
    {
        ErrorCodes.ValidationFailed or ErrorCodes.InvalidCardUid or ErrorCodes.InvalidCsv or ErrorCodes.InvalidImage or CsrfHeaderMissing => StatusCodes.Status400BadRequest,
        ErrorCodes.NotOnRoster or ErrorCodes.CheckInCodeInvalid => StatusCodes.Status403Forbidden,
        ErrorCodes.NotFound or ErrorCodes.CardNotRegistered => StatusCodes.Status404NotFound,
        _ => StatusCodes.Status409Conflict,
    };

    /// <summary>Gives framework-generated problems (401/403/404, model binding, validation, 500) a code too.</summary>
    public static void AddDefaultCode(ProblemDetailsContext context)
    {
        var problem = context.ProblemDetails;
        if (problem.Extensions.ContainsKey(CodeKey)) return;
        problem.Extensions[CodeKey] = problem.Status switch
        {
            StatusCodes.Status400BadRequest => ErrorCodes.ValidationFailed,
            StatusCodes.Status401Unauthorized => "unauthenticated",
            StatusCodes.Status403Forbidden => "forbidden",
            StatusCodes.Status404NotFound => ErrorCodes.NotFound,
            StatusCodes.Status409Conflict => ErrorCodes.Conflict,
            _ => "server_error",
        };
    }
}

/// <summary>
/// Wraps every /api endpoint: business-rule violations become problem responses, and a lost optimistic
/// concurrency race (two writers on the same point account or gift) is retried from a clean DbContext.
/// </summary>
public sealed class ApiErrorFilter(PointHubDbContext db, ILogger<ApiErrorFilter> logger) : IEndpointFilter
{
    private const int MaxAttempts = 3;

    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await next(context);
            }
            catch (DomainException ex)
            {
                return ApiProblem.Create(ex.Code, ex.Message);
            }
            catch (DbUpdateConcurrencyException) when (attempt < MaxAttempts)
            {
                logger.LogInformation("Concurrency conflict on {Path}, retrying (attempt {Attempt})", context.HttpContext.Request.Path, attempt);
                db.ChangeTracker.Clear();
            }
            catch (DbUpdateConcurrencyException)
            {
                return ApiProblem.Create(ErrorCodes.Conflict, "The record was changed by someone else. Try again.");
            }
            catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
            {
                // Unique index violation: a concurrent request got there first (double check-in, double revert, same card).
                return ApiProblem.Create(ErrorCodes.Conflict, "The same change was already made by another request.");
            }
        }
    }
}

public static class CsrfHeaderMiddleware
{
    /// <summary>
    /// Browsers cannot add a custom header to a cross-site form post or simple fetch without a CORS
    /// preflight, and the API allows no cross-origin callers. Requiring the header on every write is
    /// therefore enough to stop cross-site request forgery against the auth cookie.
    /// </summary>
    public static IApplicationBuilder UseCsrfHeaderCheck(this IApplicationBuilder app, string integrationPathPrefix) => app.Use(async (context, next) =>
    {
        var request = context.Request;
        var isWrite = !(HttpMethods.IsGet(request.Method) || HttpMethods.IsHead(request.Method) || HttpMethods.IsOptions(request.Method));
        // The integration API is exempt: it authenticates with an explicit API key, never with the ambient cookie.
        var cookieAuthenticated = request.Path.StartsWithSegments("/api") && !request.Path.StartsWithSegments(integrationPathPrefix);
        if (isWrite && cookieAuthenticated && !request.Headers.ContainsKey(ApiProblem.CsrfHeader))
        {
            await ApiProblem.Create(ApiProblem.CsrfHeaderMissing, $"The {ApiProblem.CsrfHeader} header is required.").ExecuteAsync(context);
            return;
        }
        await next(context);
    });
}
