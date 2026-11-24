using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using PointHub.Domain.Common;
using PointHub.Domain.Notifications;
using PointHub.Domain.Employees;
using PointHub.Domain.Events;
using PointHub.Domain.Gifts;
using PointHub.Domain.Integration;
using PointHub.Domain.Points;
using PointHub.Domain.Site;

namespace PointHub.Infrastructure.Persistence;

public class PointHubDbContext(DbContextOptions<PointHubDbContext> options) : DbContext(options)
{
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<EmployeeCard> EmployeeCards => Set<EmployeeCard>();
    public DbSet<PointAccount> PointAccounts => Set<PointAccount>();
    public DbSet<PointTransaction> PointTransactions => Set<PointTransaction>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<EventHost> EventHosts => Set<EventHost>();
    public DbSet<EventRosterEntry> RosterEntries => Set<EventRosterEntry>();
    public DbSet<EventCheckIn> CheckIns => Set<EventCheckIn>();
    public DbSet<Gift> Gifts => Set<Gift>();
    public DbSet<GiftStockMovement> GiftStockMovements => Set<GiftStockMovement>();
    public DbSet<Redemption> Redemptions => Set<Redemption>();
    public DbSet<SiteSetting> SiteSettings => Set<SiteSetting>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<ApiClient> ApiClients => Set<ApiClient>();
    public DbSet<GiftImage> GiftImages => Set<GiftImage>();
    public DbSet<EmailTemplate> EmailTemplates => Set<EmailTemplate>();
    public DbSet<EmailMessage> EmailMessages => Set<EmailMessage>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configuration)
    {
        // Enums are stored by name so the tables stay readable in SSMS and reports.
        configuration.Properties<PointTransactionType>().HaveConversion<string>().HaveMaxLength(20);
        configuration.Properties<EventStatus>().HaveConversion<string>().HaveMaxLength(20);
        configuration.Properties<ApprovalMode>().HaveConversion<string>().HaveMaxLength(20);
        configuration.Properties<CheckInStatus>().HaveConversion<string>().HaveMaxLength(20);
        configuration.Properties<CheckInMode>().HaveConversion<string>().HaveMaxLength(20);
        configuration.Properties<CheckInMethod>().HaveConversion<string>().HaveMaxLength(20);
        configuration.Properties<RosterMatchStatus>().HaveConversion<string>().HaveMaxLength(20);
        configuration.Properties<RedemptionStatus>().HaveConversion<string>().HaveMaxLength(20);
        configuration.Properties<EmailStatus>().HaveConversion<string>().HaveMaxLength(20);
        configuration.Properties<LocalizedText>().HaveConversion<LocalizedTextConverter>();
    }

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<Employee>(e =>
        {
            e.Property(x => x.EmployeeNo).HasMaxLength(32);
            e.Property(x => x.DisplayName).HasMaxLength(200);
            e.Property(x => x.Email).HasMaxLength(320);
            e.Property(x => x.Department).HasMaxLength(200);
            e.Property(x => x.PreferredLocale).HasMaxLength(10);
            e.HasIndex(x => x.EmployeeNo).IsUnique();
            e.HasIndex(x => x.Email);
            e.HasOne(x => x.Account).WithOne().HasForeignKey<PointAccount>(a => a.EmployeeId);
        });

        model.Entity<PointAccount>(e =>
        {
            e.HasKey(x => x.EmployeeId);
            e.Property(x => x.RowVersion).IsRowVersion();
        });

        model.Entity<EmployeeCard>(e =>
        {
            e.Property(x => x.Uid).HasMaxLength(20).IsUnicode(false);
            e.Property(x => x.Label).HasMaxLength(100);
            e.HasIndex(x => x.Uid).IsUnique();
            e.HasOne(x => x.Employee).WithMany(x => x.Cards).HasForeignKey(x => x.EmployeeId);
        });

        model.Entity<PointTransaction>(e =>
        {
            e.Property(x => x.Reason).HasMaxLength(500);
            e.HasIndex(x => new { x.EmployeeId, x.CreatedAt });
            e.HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId);
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedById);
            e.HasOne(x => x.Event).WithMany().HasForeignKey(x => x.EventId);
            e.HasOne(x => x.Redemption).WithMany().HasForeignKey(x => x.RedemptionId);
            // One-to-one: the unique index is what guarantees a transaction can be reversed only once.
            e.HasOne(x => x.ReversesTransaction).WithOne(x => x.ReversedByTransaction)
                .HasForeignKey<PointTransaction>(x => x.ReversesTransactionId);
            e.Property(x => x.ExternalReference).HasMaxLength(100);
            e.HasOne(x => x.ApiClient).WithMany().HasForeignKey(x => x.ApiClientId);
            // Idempotency for the integration API: one transaction per (client, reference).
            e.HasIndex(x => new { x.ApiClientId, x.ExternalReference }).IsUnique();
        });

        model.Entity<ApiClient>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.KeyPrefix).HasMaxLength(16).IsUnicode(false);
            e.Property(x => x.KeyHash).HasMaxLength(64).IsUnicode(false);
            e.HasIndex(x => x.KeyHash).IsUnique();
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedById);
        });

        model.Entity<Event>(e =>
        {
            e.Property(x => x.Location).HasMaxLength(300);
            e.Property(x => x.CheckInToken).HasMaxLength(64).IsUnicode(false);
            e.Property(x => x.CheckInSecret).HasMaxLength(64).IsUnicode(false);
            e.HasIndex(x => x.CheckInToken).IsUnique();
            e.HasMany(x => x.Hosts).WithOne().HasForeignKey(x => x.EventId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Roster).WithOne().HasForeignKey(x => x.EventId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.CheckIns).WithOne(x => x.Event).HasForeignKey(x => x.EventId);
        });

        model.Entity<EventHost>(e =>
        {
            e.HasKey(x => new { x.EventId, x.EmployeeId });
            e.HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId);
        });

        model.Entity<EventRosterEntry>(e =>
        {
            e.Property(x => x.EmployeeNo).HasMaxLength(32);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Email).HasMaxLength(320);
            e.HasIndex(x => new { x.EventId, x.EmployeeNo });
            e.HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId);
        });

        model.Entity<EventCheckIn>(e =>
        {
            e.Property(x => x.Note).HasMaxLength(500);
            // One check-in per employee per event, enforced by the database, not just by the service.
            e.HasIndex(x => new { x.EventId, x.EmployeeId }).IsUnique();
            e.HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId);
            e.HasOne(x => x.DecidedBy).WithMany().HasForeignKey(x => x.DecidedById);
            e.HasOne(x => x.AwardTransaction).WithMany().HasForeignKey(x => x.AwardTransactionId);
        });

        model.Entity<Gift>(e =>
        {
            e.Property(x => x.RowVersion).IsRowVersion();
            e.HasMany(x => x.Images).WithOne().HasForeignKey(x => x.GiftId);
            e.ToTable(t => t.HasCheckConstraint("CK_Gifts_Stock_NonNegative", "[Stock] >= 0"));
        });

        model.Entity<GiftImage>(e =>
        {
            e.Property(x => x.Id).ValueGeneratedNever();
            e.HasIndex(x => new { x.GiftId, x.SortOrder });
        });

        model.Entity<EmailTemplate>(e =>
        {
            e.HasKey(x => new { x.Key, x.Locale });
            e.Property(x => x.Key).HasMaxLength(50).IsUnicode(false);
            e.Property(x => x.Locale).HasMaxLength(10).IsUnicode(false);
            e.Property(x => x.Subject).HasMaxLength(300);
            e.Property(x => x.Body).HasMaxLength(8000);
        });

        model.Entity<EmailMessage>(e =>
        {
            e.Property(x => x.To).HasMaxLength(320);
            e.Property(x => x.ToName).HasMaxLength(200);
            e.Property(x => x.Subject).HasMaxLength(300);
            e.Property(x => x.TemplateKey).HasMaxLength(50).IsUnicode(false);
            e.Property(x => x.LastError).HasMaxLength(1000);
            // The dispatcher's query: what is due, oldest first.
            e.HasIndex(x => new { x.Status, x.NextAttemptAt });
            e.HasIndex(x => x.CreatedAt);
        });

        model.Entity<GiftStockMovement>(e =>
        {
            e.Property(x => x.Reason).HasMaxLength(500);
            e.HasOne(x => x.Gift).WithMany().HasForeignKey(x => x.GiftId);
            e.HasOne(x => x.Redemption).WithMany().HasForeignKey(x => x.RedemptionId);
        });

        model.Entity<Redemption>(e =>
        {
            e.Property(x => x.Note).HasMaxLength(500);
            e.HasIndex(x => new { x.EmployeeId, x.GiftId });
            e.HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId);
            e.HasOne(x => x.Gift).WithMany().HasForeignKey(x => x.GiftId);
            e.HasOne(x => x.ClosedBy).WithMany().HasForeignKey(x => x.ClosedById);
        });

        model.Entity<SiteSetting>(e =>
        {
            e.HasKey(x => x.Key);
            e.Property(x => x.Key).HasMaxLength(100);
            e.Property(x => x.Value).HasMaxLength(2000);
        });

        model.Entity<AuditLog>(e =>
        {
            e.Property(x => x.Action).HasMaxLength(100);
            e.Property(x => x.EntityType).HasMaxLength(100);
            e.Property(x => x.EntityId).HasMaxLength(64);
            e.Property(x => x.Summary).HasMaxLength(1000);
            e.HasIndex(x => x.CreatedAt);
            e.HasOne(x => x.Actor).WithMany().HasForeignKey(x => x.ActorId);
        });

        // History must survive: only an event's host list and roster are deleted along with it.
        // (Restrict everywhere else also avoids SQL Server's "multiple cascade paths" error.)
        Type[] cascading = [typeof(EventHost), typeof(EventRosterEntry)];
        foreach (var foreignKey in model.Model.GetEntityTypes().SelectMany(t => t.GetForeignKeys()))
        {
            var ownedByEvent = cascading.Contains(foreignKey.DeclaringEntityType.ClrType)
                && foreignKey.PrincipalEntityType.ClrType == typeof(Event);
            foreignKey.DeleteBehavior = ownedByEvent ? DeleteBehavior.Cascade : DeleteBehavior.Restrict;
        }
    }

    private sealed class LocalizedTextConverter() : ValueConverter<LocalizedText, string>(
        value => JsonSerializer.Serialize(value, JsonOptions),
        json => JsonSerializer.Deserialize<LocalizedText>(json, JsonOptions)!)
    {
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    }
}
