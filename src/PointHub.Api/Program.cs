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

// Running in a sub-folder (https://host/PointHub): IIS sets the path base of an application folder by itself.
// Site:PathBase does the same behind another reverse proxy, or with Kestrel alone.
var pathBase = app.Configuration["Site:PathBase"]?.TrimEnd('/');
if (!string.IsNullOrEmpty(pathBase))
{
    app.UsePathBase(pathBase.StartsWith('/') ? pathBase : "/" + pathBase);
    app.UseRouting(); // explicitly after UsePathBase, so endpoints are matched on the path below the folder
}

await PrepareDatabaseAsync(app);

app.UseExceptionHandler();
app.UseStatusCodePages();
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseStaticFiles(); // the built React app (web/dist is published into wwwroot); index.html itself: MapSpaShell
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

app.MapSpaShell(); // index.html for "/" and every client-side route, with <base href> = the path base

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
