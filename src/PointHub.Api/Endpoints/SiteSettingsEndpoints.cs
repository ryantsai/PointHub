using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PointHub.Api.Auth;
using PointHub.Api.Contracts;
using PointHub.Api.Http;
using PointHub.Domain.Common;
using PointHub.Domain.Notifications;
using PointHub.Infrastructure;
using PointHub.Infrastructure.Persistence;
using PointHub.Infrastructure.Services;

namespace PointHub.Api.Endpoints;

/// <summary>System-admin settings: the seasonal theme and email notifications.</summary>
public static class SiteSettingsEndpoints
{
    public static void MapSiteSettingsEndpoints(this RouteGroupBuilder admin)
    {
        var theme = admin.MapGroup("/site/theme").RequireAuthorization(Policies.SystemAdmin);

        theme.MapGet("", async (SiteThemeService themes, CancellationToken ct) =>
            ThemeSettingsDto.From(await themes.GetSettingsAsync(ct)));

        theme.MapPut("", async (ThemeSettingsInput input, ClaimsPrincipal user, SiteThemeService themes, CancellationToken ct) =>
            ThemeSettingsDto.From(await themes.UpdateAsync(input.Mode, input.ForcedThemeKey, input.DisabledThemeKeys, user.EmployeeId(), ct)));

        MapEmail(admin.MapGroup("/email").RequireAuthorization(Policies.SystemAdmin));
    }

    private static void MapEmail(RouteGroupBuilder email)
    {
        email.MapGet("", SettingsAsync);

        email.MapPut("/templates/{key}/enabled", async (string key, EmailEnabledRequest request, ClaimsPrincipal user, EmailService emails, PointHubDbContext db, IOptions<SmtpOptions> smtp, TimeProvider clock, CancellationToken ct) =>
        {
            await emails.SetEnabledAsync(key, request.IsEnabled, user.EmployeeId(), ct);
            return await SettingsAsync(emails, db, smtp, clock, ct);
        });

        email.MapPut("/templates/{key}/{locale}", async (string key, string locale, EmailTemplateInput input, ClaimsPrincipal user, EmailService emails, PointHubDbContext db, CancellationToken ct) =>
        {
            await emails.SaveTemplateAsync(key, locale, input.Subject, input.Body, user.EmployeeId(), ct);
            return await TemplateAsync(emails, db, key, locale, ct);
        });

        email.MapDelete("/templates/{key}/{locale}", async (string key, string locale, ClaimsPrincipal user, EmailService emails, PointHubDbContext db, CancellationToken ct) =>
        {
            await emails.ResetTemplateAsync(key, locale, user.EmployeeId(), ct);
            return await TemplateAsync(emails, db, key, locale, ct);
        });

        email.MapPost("/preview", (EmailPreviewRequest request, IOptions<SiteOptions> site) =>
        {
            EmailService.EnsureKnown(request.Key, request.Locale);
            EmailService.EnsureValid(request.Key, request.Subject, request.Body);
            var rendered = Sample(new EmailContent(request.Subject, request.Body), request.Locale, site.Value);
            return new EmailPreviewDto(rendered.Subject, rendered.Text, rendered.Html);
        });

        // Sends straight away (not through the outbox) so the admin sees the SMTP server's answer.
        email.MapPost("/test", async (EmailTestRequest request, ClaimsPrincipal user, EmailService emails, SmtpSender sender, IOptions<SiteOptions> site, PointHubDbContext db, TimeProvider clock, ILoggerFactory loggers, CancellationToken ct) =>
        {
            EmailService.EnsureKnown(request.Key, request.Locale);
            if (!sender.IsConfigured) return new EmailTestResultDto(false, "SMTP is not configured (Smtp:Host and Smtp:FromAddress).");

            var rendered = Sample(await emails.GetContentAsync(request.Key, request.Locale, ct), request.Locale, site.Value);
            db.Audit(user.EmployeeId(), "email.test", nameof(EmailTemplate), $"{request.Key}/{request.Locale}", null, clock);
            await db.SaveChangesAsync(ct);
            try
            {
                await sender.SendAsync(request.To.Trim(), null, $"[Test] {rendered.Subject}", rendered.Text, rendered.Html, ct);
                return new EmailTestResultDto(true, null);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                loggers.CreateLogger("PointHub.Email").LogWarning("Test email failed: {Error}", ex.Message);
                return new EmailTestResultDto(false, ex.Message);
            }
        });

        email.MapGet("/outbox", async (string? status, int? page, int? pageSize, PointHubDbContext db, CancellationToken ct) =>
        {
            var filter = QueryEnum.Parse<EmailStatus>(status);
            return await db.EmailMessages.AsNoTracking().Where(m => filter == null || m.Status == filter)
                .OrderByDescending(m => m.Id).Select(EmailLogEntryDto.Projection).ToPagedAsync(page, pageSize, ct);
        });
    }

    private static async Task<EmailSettingsDto> SettingsAsync(EmailService emails, PointHubDbContext db, IOptions<SmtpOptions> smtp, TimeProvider clock, CancellationToken ct)
    {
        var options = smtp.Value;
        var since = clock.GetUtcNow().AddHours(-24);
        var queue = new EmailQueueDto(
            await db.EmailMessages.CountAsync(m => m.Status == EmailStatus.Pending, ct),
            await db.EmailMessages.CountAsync(m => m.Status == EmailStatus.Failed, ct),
            await db.EmailMessages.CountAsync(m => m.Status == EmailStatus.Sent && m.SentAt >= since, ct));

        var custom = await db.EmailTemplates.AsNoTracking().ToListAsync(ct);
        var disabled = await emails.GetDisabledKeysAsync(ct);
        var templates =
            from key in EmailTemplates.Keys
            from locale in Locales.All
            let mine = custom.FirstOrDefault(t => t.Key == key && t.Locale == locale)
            let content = mine is null ? EmailTemplates.Default(key, locale) : new EmailContent(mine.Subject, mine.Body)
            select new EmailTemplateDto(key, locale, content.Subject, content.Body, mine is not null, !disabled.Contains(key), EmailTemplates.Placeholders(key));

        // The password is deliberately absent: it is configuration, and is never returned by the API.
        return new EmailSettingsDto(
            new SmtpStatusDto(options.IsConfigured, NullIfEmpty(options.Host), options.Port, options.Security,
                NullIfEmpty(options.FromAddress), NullIfEmpty(options.FromName), !string.IsNullOrEmpty(options.Username)),
            queue, templates.ToList());
    }

    private static async Task<EmailTemplateDto> TemplateAsync(EmailService emails, PointHubDbContext db, string key, string locale, CancellationToken ct)
    {
        var content = await emails.GetContentAsync(key, locale, ct);
        var customized = await db.EmailTemplates.AnyAsync(t => t.Key == key && t.Locale == locale, ct);
        var disabled = await emails.GetDisabledKeysAsync(ct);
        return new EmailTemplateDto(key, locale, content.Subject, content.Body, customized, !disabled.Contains(key), EmailTemplates.Placeholders(key));
    }

    private static RenderedEmail Sample(EmailContent content, string locale, SiteOptions site) =>
        EmailTemplates.Render(content, EmailTemplates.SampleValues(locale, site.AppName, site.PublicBaseUrl?.TrimEnd('/') ?? "https://pointhub.example"), site.AppName);

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;
}
