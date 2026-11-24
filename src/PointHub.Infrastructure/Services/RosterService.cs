using System.Text;
using Microsoft.EntityFrameworkCore;
using PointHub.Domain.Common;
using PointHub.Domain.Events;
using PointHub.Infrastructure.Persistence;

namespace PointHub.Infrastructure.Services;

public sealed class RosterService(PointHubDbContext db, TimeProvider clock)
{
    public const int MaxRows = 20_000;

    // Header names hosts are likely to have in an HR export, in the three supported languages.
    private static readonly string[] NumberHeaders = ["employeeno", "employee_no", "employee no", "employeenumber", "employee number", "employeeid", "employee id", "社員番号", "員工編號", "工號"];
    private static readonly string[] NameHeaders = ["name", "displayname", "display name", "氏名", "名前", "姓名"];
    private static readonly string[] EmailHeaders = ["email", "e-mail", "mail", "メール", "メールアドレス", "電子郵件", "信箱"];

    public async Task<IReadOnlyList<EventRosterEntry>> ImportAsync(Event ev, Stream csv, bool replace, int actorId, CancellationToken ct)
    {
        var rows = await ParseAsync(csv, ct);

        var existing = await db.RosterEntries.Where(r => r.EventId == ev.Id).ToListAsync(ct);
        if (replace)
        {
            db.RosterEntries.RemoveRange(existing);
            existing.Clear();
        }

        var known = existing.Select(r => r.EmployeeNo).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var now = clock.GetUtcNow();
        var added = rows.Where(r => known.Add(r.EmployeeNo))
            .Select(r => new EventRosterEntry { EventId = ev.Id, EmployeeNo = r.EmployeeNo, Name = r.Name, Email = r.Email, ImportedAt = now })
            .ToList();
        db.RosterEntries.AddRange(added);

        var roster = existing.Concat(added).ToList();
        await MatchAsync(roster, ct);
        db.Audit(actorId, "roster.import", nameof(Event), ev.Id, $"{added.Count} rows imported (replace: {replace})", clock);
        await db.SaveChangesAsync(ct);
        return roster;
    }

    /// <summary>Re-compares the stored roster with the current employee master (new joiners, leavers).</summary>
    public async Task<IReadOnlyList<EventRosterEntry>> RematchAsync(Event ev, CancellationToken ct)
    {
        var roster = await db.RosterEntries.Where(r => r.EventId == ev.Id).OrderBy(r => r.Id).ToListAsync(ct);
        await MatchAsync(roster, ct);
        await db.SaveChangesAsync(ct);
        return roster;
    }

    private async Task MatchAsync(List<EventRosterEntry> roster, CancellationToken ct)
    {
        var numbers = roster.Select(r => r.EmployeeNo).Distinct().ToList();
        var emails = roster.Where(r => !string.IsNullOrWhiteSpace(r.Email)).Select(r => r.Email!).Distinct().ToList();
        var employees = await db.Employees
            .Where(e => numbers.Contains(e.EmployeeNo) || emails.Contains(e.Email))
            .ToListAsync(ct);

        var matches = RosterMatcher.Match(roster.Select(r => new RosterRow(r.EmployeeNo, r.Name, r.Email)), employees);
        for (var i = 0; i < roster.Count; i++)
        {
            roster[i].MatchStatus = matches[i].Status;
            roster[i].Employee = matches[i].Employee;
            roster[i].EmployeeId = matches[i].Employee?.Id;
        }
    }

    private static async Task<List<RosterRow>> ParseAsync(Stream csv, CancellationToken ct)
    {
        using var reader = new StreamReader(csv, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        var lines = Csv.Parse(await reader.ReadToEndAsync(ct));
        if (lines.Count == 0) throw new DomainException(ErrorCodes.InvalidCsv, "The file is empty.");

        var header = lines[0].Select(h => h.Trim().ToLowerInvariant()).ToList();
        var numberAt = header.FindIndex(NumberHeaders.Contains);
        var nameAt = header.FindIndex(NameHeaders.Contains);
        var emailAt = header.FindIndex(EmailHeaders.Contains);
        if (numberAt < 0) throw new DomainException(ErrorCodes.InvalidCsv, "The header row needs an employeeNo column.");
        if (lines.Count - 1 > MaxRows) throw new DomainException(ErrorCodes.InvalidCsv, $"At most {MaxRows} rows are supported.");

        string? Cell(List<string> line, int at, int max)
        {
            var value = at >= 0 && at < line.Count ? line[at].Trim() : "";
            return value.Length == 0 ? null : value[..Math.Min(value.Length, max)];
        }

        return lines.Skip(1)
            .Select(line => new RosterRow(Cell(line, numberAt, 32) ?? "", Cell(line, nameAt, 200), Cell(line, emailAt, 320)))
            .Where(row => row.EmployeeNo.Length > 0)
            .ToList();
    }
}

/// <summary>Minimal RFC 4180 reader: quoted fields, doubled quotes, commas and line breaks inside quotes.</summary>
public static class Csv
{
    public static List<List<string>> Parse(string text)
    {
        var rows = new List<List<string>>();
        var row = new List<string>();
        var field = new StringBuilder();
        var quoted = false;

        void EndField() { row.Add(field.ToString()); field.Clear(); }
        void EndRow()
        {
            EndField();
            if (row.Any(cell => cell.Length > 0)) rows.Add(row);
            row = [];
        }

        for (var i = 0; i < text.Length; i++)
        {
            var c = text[i];
            if (quoted)
            {
                if (c == '"' && i + 1 < text.Length && text[i + 1] == '"') { field.Append('"'); i++; }
                else if (c == '"') quoted = false;
                else field.Append(c);
            }
            else if (c == '"' && field.Length == 0) quoted = true;
            else if (c == ',') EndField();
            else if (c == '\n') EndRow();
            else if (c != '\r') field.Append(c);
        }
        if (field.Length > 0 || row.Count > 0) EndRow();
        return rows;
    }
}
