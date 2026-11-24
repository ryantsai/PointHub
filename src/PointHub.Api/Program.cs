using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using PointHub.Api.Auth;
using PointHub.Api.Endpoints;
using PointHub.Api.Http;
using PointHub.Infrastructure;
using PointHub.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddPointHubInfrastructure(builder.Configuration);
builder.Services.AddPointHubAuth(builder.Configuration, builder.Environment);
builder.Services.AddProblemDetails(options => options.CustomizeProblemDetails = ApiProblem.AddDefaultCode);
builder.Services.AddIntegrationRateLimit(builder.Configuration);
builder.Services.AddValidation();
builder.Services.AddOpenApi();
// A malformed query string or body is the caller's mistake: answer 400 instead of throwing (the Development default).
builder.Services.Configure<RouteHandlerOptions>(options => options.ThrowOnBadRequest = false);
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));

var app = builder.Build();

await PrepareDatabaseAsync(app);

app.UseExceptionHandler();
app.UseStatusCodePages();
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseDefaultFiles(); // "/" → index.html (the route fallback below only covers paths below the root)
app.UseStaticFiles();  // the built React app (web/dist is published into wwwroot)
app.UseUploadedAssets(); // gift pictures from the uploads/assets folder
app.UseCsrfHeaderCheck(IntegrationEndpoints.PathPrefix);
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter(); // after authorization so integration calls are counted per API key

if (app.Environment.IsDevelopment())
    app.MapOpenApi(); // /openapi/v1.json

var api = app.MapGroup("/api").AddEndpointFilter<ApiErrorFilter>();
api.MapSiteAndAuthEndpoints();
api.MapEmployeeEndpoints();
api.MapHostEndpoints();
api.MapAdminEndpoints();
api.MapIntegrationEndpoints();

// Client-side routes (/c/{token}, /admin/ledger, ...) are served the SPA shell. `nonfile` keeps the fallback
// away from anything that looks like a file: a matched endpoint makes the static-file middleware stand down,
// so without it scripts, styles and uploaded pictures would all be answered with index.html. Unknown /api
// paths stay 404.
app.MapFallbackToFile("{*path:nonfile:regex(^(?!api/).*$)}", "index.html");

app.Run();

static async Task PrepareDatabaseAsync(WebApplication app)
{
    var database = app.Configuration.GetSection("Database");
    await using var scope = app.Services.CreateAsyncScope();

    if (database.GetValue<bool>("AutoMigrate"))
        await scope.ServiceProvider.GetRequiredService<PointHubDbContext>().Database.MigrateAsync();

    if (database.GetValue<bool>("SeedDevData"))
    {
        if (app.Environment.IsProduction())
            throw new InvalidOperationException("Database:SeedDevData must not be set in Production.");
        await scope.ServiceProvider.GetRequiredService<DevSeeder>().SeedAsync();
    }
}
