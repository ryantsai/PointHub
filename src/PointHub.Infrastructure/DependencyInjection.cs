using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using PointHub.Domain.Site;
using PointHub.Infrastructure.Persistence;
using PointHub.Infrastructure.Services;

namespace PointHub.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddPointHubInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("PointHub")
            ?? throw new InvalidOperationException("Connection string 'PointHub' is not configured.");

        services.AddDbContext<PointHubDbContext>(options => options.UseSqlServer(connectionString));
        services.Configure<SiteOptions>(configuration.GetSection(SiteOptions.Section));
        services.Configure<CheckInOptions>(configuration.GetSection(CheckInOptions.Section));
        services.Configure<UploadOptions>(configuration.GetSection(UploadOptions.Section));
        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.Section));
        services.AddScoped<GiftImageService>();
        services.AddScoped<EmailService>();
        services.AddSingleton<SmtpSender>();
        services.AddSingleton<EmailDispatcher>();
        services.AddHostedService(provider => provider.GetRequiredService<EmailDispatcher>());
        services.AddScoped<EmployeeDirectory>();
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<PointLedger>();
        services.AddScoped<CheckInService>();
        services.AddScoped<RedemptionService>();
        services.AddScoped<RosterService>();
        services.AddScoped<SiteThemeService>();
        services.AddScoped<DevSeeder>();
        return services;
    }
}

public sealed class SiteOptions
{
    public const string Section = "Site";

    public string AppName { get; set; } = "PointHub";

    /// <summary>Origin employees reach the site on, used in QR codes. Leave empty to use the browser's origin.</summary>
    public string? PublicBaseUrl { get; set; }
    public string DefaultLocale { get; set; } = "en";

    /// <summary>IANA or Windows time zone id that decides on which calendar day a seasonal theme starts.</summary>
    public string TimeZone { get; set; } = "UTC";
}
