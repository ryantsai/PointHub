using System.Globalization;
using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using PointHub.Domain.Common;
using PointHub.Domain.Employees;
using PointHub.Domain.Notifications;
using PointHub.Domain.Site;
using PointHub.Infrastructure.Persistence;

namespace PointHub.Infrastructure.Services;

public enum SmtpSecurity { None = 0, StartTls = 1, Ssl = 2 }

/// <summary>SMTP server settings. They come from configuration (environment variables in production), never from the database.</summary>
public sealed class SmtpOptions
{
    public const string Section = "Smtp";

    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public SmtpSecurity Security { get; set; } = SmtpSecurity.StartTls;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? FromAddress { get; set; }
    public string? FromName { get; set; }
    public int TimeoutSeconds { get; set; } = 15;
    /// <summary>How often the outbox is checked for mail to send.</summary>
    public int PollSeconds { get; set; } = 10;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host) && !string.IsNullOrWhiteSpace(FromAddress);
}

/// <summary>Resolves templates and writes notifications to the outbox. It never talks to the SMTP server.</summary>
public sealed class EmailService(PointHubDbContext db, IOptions<SiteOptions> site, TimeProvider clock)
{
    /// <summary>
    /// Stages a notification for an employee in their language. Nothing is written until the caller saves,
    /// so the message commits together with the change it reports. Does nothing when the notification is
    /// switched off or the employee has no address.
    /// </summary>
    /// <param name="valuesFor">Builds the template values for the employee's language (event and gift names are localised).</param>
    public async Task QueueAsync(string templateKey, Employee employee, Func<string, Dictionary<string, string>> valuesFor, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(employee.Email) || !await IsEnabledAsync(templateKey, ct)) return;

        var locale = Locales.IsSupported(employee.PreferredLocale) ? employee.PreferredLocale! : site.Value.DefaultLocale;
        var account = await db.PointAccounts.FindAsync([employee.Id], ct); // the tracked instance, so it reflects this request's changes
        var all = new Dictionary<string, string>(valuesFor(locale))
        {
            ["employeeName"] = employee.DisplayName,
            ["appName"] = site.Value.AppName,
            ["siteUrl"] = site.Value.PublicBaseUrl?.TrimEnd('/') ?? "",
            ["balance"] = (account?.Balance ?? 0).ToString("N0", CultureInfo.InvariantCulture),
        };

        var rendered = EmailTemplates.Render(await GetContentAsync(templateKey, locale, ct), all, site.Value.AppName);
        var now = clock.GetUtcNow();
        db.EmailMessages.Add(new EmailMessage
        {
            To = employee.Email, ToName = employee.DisplayName, TemplateKey = templateKey,
            Subject = rendered.Subject, TextBody = rendered.Text, HtmlBody = rendered.Html, CreatedAt = now,
        });
    }

    public async Task<EmailContent> GetContentAsync(string key, string locale, CancellationToken ct)
    {
        var custom = await db.EmailTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.Key == key && t.Locale == locale, ct);
        return custom is null ? EmailTemplates.Default(key, locale) : new EmailContent(custom.Subject, custom.Body);
    }

    public async Task<IReadOnlySet<string>> GetDisabledKeysAsync(CancellationToken ct)
    {
        var value = (await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == SiteSetting.EmailDisabledTemplates, ct))?.Value;
        return (value ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries).ToHashSet();
    }

    public async Task SetEnabledAsync(string key, bool enabled, int actorId, CancellationToken ct)
    {
        EnsureKnown(key);
        var disabled = (await GetDisabledKeysAsync(ct)).ToHashSet();
        if (enabled) disabled.Remove(key); else disabled.Add(key);

        var setting = await db.SiteSettings.FirstOrDefaultAsync(s => s.Key == SiteSetting.EmailDisabledTemplates, ct);
        if (setting is null) db.SiteSettings.Add(setting = new SiteSetting { Key = SiteSetting.EmailDisabledTemplates });
        setting.Value = string.Join(',', disabled.Order());
        db.Audit(actorId, "email.template.enabled", nameof(EmailTemplate), key, enabled ? "on" : "off", clock);
        await db.SaveChangesAsync(ct);
    }

    public async Task SaveTemplateAsync(string key, string locale, string subject, string body, int actorId, CancellationToken ct)
    {
        EnsureKnown(key, locale);
        EnsureValid(key, subject, body);

        var template = await db.EmailTemplates.FirstOrDefaultAsync(t => t.Key == key && t.Locale == locale, ct);
        if (template is null) db.EmailTemplates.Add(template = new EmailTemplate { Key = key, Locale = locale, Subject = subject, Body = body });
        template.Subject = subject.Trim();
        template.Body = body.Trim();
        template.UpdatedAt = clock.GetUtcNow();
        template.UpdatedById = actorId;
        db.Audit(actorId, "email.template.save", nameof(EmailTemplate), $"{key}/{locale}", template.Subject, clock);
        await db.SaveChangesAsync(ct);
    }

    public async Task ResetTemplateAsync(string key, string locale, int actorId, CancellationToken ct)
    {
        EnsureKnown(key, locale);
        var template = await db.EmailTemplates.FirstOrDefaultAsync(t => t.Key == key && t.Locale == locale, ct);
        if (template is null) return;
        db.EmailTemplates.Remove(template);
        db.Audit(actorId, "email.template.reset", nameof(EmailTemplate), $"{key}/{locale}", null, clock);
        await db.SaveChangesAsync(ct);
    }

    public static void EnsureValid(string key, string subject, string body)
    {
        if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(body))
            throw new DomainException(ErrorCodes.ValidationFailed, "Subject and body are required.");
        if (EmailTemplates.UnknownPlaceholders(key, subject, body) is { Count: > 0 } unknown)
            throw new DomainException(ErrorCodes.ValidationFailed, $"Unknown placeholder: {string.Join(", ", unknown.Select(name => $"{{{{{name}}}}}"))}.");
    }

    public static void EnsureKnown(string key, string? locale = null)
    {
        if (!EmailTemplates.IsKnown(key)) throw new DomainException(ErrorCodes.NotFound, "Unknown email template.");
        if (locale is not null && !Locales.IsSupported(locale)) throw new DomainException(ErrorCodes.NotFound, "Unsupported language.");
    }

    private async Task<bool> IsEnabledAsync(string key, CancellationToken ct) => !(await GetDisabledKeysAsync(ct)).Contains(key);
}

/// <summary>The one place that speaks SMTP.</summary>
public sealed class SmtpSender(IOptions<SmtpOptions> options)
{
    public bool IsConfigured => options.Value.IsConfigured;

    public async Task SendAsync(string to, string? toName, string subject, string text, string html, CancellationToken ct)
    {
        var smtp = options.Value;
        if (smtp.Host is not { Length: > 0 } host || smtp.FromAddress is not { Length: > 0 } from)
            throw new InvalidOperationException("SMTP is not configured (Smtp:Host and Smtp:FromAddress).");

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(smtp.FromName ?? "", from));
        message.To.Add(new MailboxAddress(toName ?? "", to));
        message.Subject = subject;
        message.Body = new BodyBuilder { TextBody = text, HtmlBody = html }.ToMessageBody();

        using var client = new SmtpClient { Timeout = smtp.TimeoutSeconds * 1000 };
        var security = smtp.Security switch
        {
            SmtpSecurity.Ssl => SecureSocketOptions.SslOnConnect,
            SmtpSecurity.StartTls => SecureSocketOptions.StartTls,
            _ => SecureSocketOptions.None,
        };
        await client.ConnectAsync(host, smtp.Port, security, ct);
        if (!string.IsNullOrEmpty(smtp.Username))
            await client.AuthenticateAsync(smtp.Username, smtp.Password ?? "", ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(quit: true, ct);
    }
}

/// <summary>Delivers the outbox in the background, oldest first, retrying failures with a growing delay.</summary>
public sealed class EmailDispatcher(IServiceScopeFactory scopes, SmtpSender sender, IOptions<SmtpOptions> options, TimeProvider clock, ILogger<EmailDispatcher> logger)
    : BackgroundService
{
    private const int BatchSize = 20;

    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        if (!sender.IsConfigured)
            logger.LogInformation("SMTP is not configured (Smtp:Host, Smtp:FromAddress); notifications will be recorded as skipped.");

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(Math.Max(2, options.Value.PollSeconds)));
        try
        {
            do
            {
                try
                {
                    await DeliverDueAsync(stop);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    // Usually the database being briefly unavailable; try again on the next tick.
                    logger.LogWarning(ex, "Email dispatcher could not read the outbox");
                }
            }
            while (await timer.WaitForNextTickAsync(stop));
        }
        catch (OperationCanceledException) { }
    }

    public async Task DeliverDueAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<PointHubDbContext>();
        var now = clock.GetUtcNow();
        var due = await db.EmailMessages
            .Where(m => m.Status == EmailStatus.Pending && m.NextAttemptAt <= now)
            .OrderBy(m => m.Id).Take(BatchSize).ToListAsync(ct);

        foreach (var message in due)
        {
            if (!sender.IsConfigured)
            {
                message.MarkSkipped("SMTP is not configured.");
                continue;
            }
            try
            {
                await sender.SendAsync(message.To, message.ToName, message.Subject, message.TextBody, message.HtmlBody, ct);
                message.MarkSent(clock.GetUtcNow());
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning("Email {Id} failed (attempt {Attempt}): {Error}", message.Id, message.Attempts + 1, ex.Message);
                message.MarkFailed(ex.Message, clock.GetUtcNow());
            }
        }
        if (due.Count > 0) await db.SaveChangesAsync(ct);
    }
}
