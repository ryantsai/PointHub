using System.DirectoryServices.AccountManagement;
using System.Runtime.InteropServices;
using System.Runtime.Versioning;
using System.Security.Claims;

namespace PointHub.Api.Auth;

/// <summary>What PointHub needs to know about a Windows account to match it to an employee.</summary>
public sealed record WindowsAccount(string AccountName, string? Email, string? EmployeeNo, string? DisplayName);

/// <summary>
/// Windows authentication tells us the logon name (<c>DOMAIN\name</c>). Employees are matched by email and
/// employee number, so this looks those up in Active Directory, or derives the email from the logon name
/// when the directory cannot be asked (<c>Auth:Windows:EmailDomain</c>).
/// </summary>
public sealed class WindowsAccountResolver(AuthOptions options, ILogger<WindowsAccountResolver> logger)
{
    /// <summary>Returns null when the account is from a domain that is not allowed to sign in.</summary>
    public WindowsAccount? Resolve(ClaimsPrincipal principal)
    {
        var name = principal.Identity?.Name ?? "";
        var (domain, logon) = name.Split('\\') is [var d, var l] ? (d, l) : ("", name.Split('@')[0]);
        if (logon.Length == 0) return null;

        var allowed = options.Windows.AllowedDomains;
        if (allowed.Length > 0 && !allowed.Contains(domain, StringComparer.OrdinalIgnoreCase))
        {
            logger.LogWarning("Windows sign-in refused: domain '{Domain}' is not in Auth:Windows:AllowedDomains", domain);
            return null;
        }

        var account = options.Windows.UseDirectoryLookup && OperatingSystem.IsWindows() ? Lookup(name) : null;
        var email = account?.Email;
        if (string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(options.Windows.EmailDomain))
            email = $"{logon}@{options.Windows.EmailDomain.TrimStart('@')}";

        return new WindowsAccount(name, email, account?.EmployeeNo, account?.DisplayName ?? logon);
    }

    [SupportedOSPlatform("windows")]
    private WindowsAccount? Lookup(string name)
    {
        try
        {
            using var context = new PrincipalContext(ContextType.Domain);
            using var user = UserPrincipal.FindByIdentity(context, name);
            return user is null ? null : new WindowsAccount(name, user.EmailAddress, user.EmployeeId, user.DisplayName);
        }
        catch (Exception ex) when (ex is PrincipalException or COMException or InvalidOperationException or UnauthorizedAccessException)
        {
            // Not joined to a domain, a domain controller is unreachable, or the app pool identity may not read the directory.
            logger.LogWarning("Active Directory lookup failed ({Reason}); falling back to Auth:Windows:EmailDomain", ex.Message);
            return null;
        }
    }
}
