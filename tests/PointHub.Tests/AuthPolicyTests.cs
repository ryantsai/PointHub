using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using PointHub.Api.Auth;
using PointHub.Domain.Employees;

namespace PointHub.Tests;

/// <summary>
/// Under IIS with Windows authentication on, the server puts the Windows account on HttpContext.User whenever the
/// browser sends Windows credentials. That identity has no PointHub employee id, so it must never get past the
/// employee/admin policies: those accept only the PointHub session cookie.
/// </summary>
public class AuthPolicyTests
{
    private static readonly ClaimsPrincipal WindowsAccount =
        new(new ClaimsIdentity([new Claim(ClaimTypes.Name, @"CORP\tstaff")], "Negotiate"));

    private static IServiceProvider Services()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDataProtection();
        services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie();
        services.AddAuthorization();
        return services.BuildServiceProvider();
    }

    private static async Task<PolicyAuthorizationResult> EvaluateAsync(AuthorizationPolicy policy, HttpContext context)
    {
        var evaluator = new PolicyEvaluator(context.RequestServices.GetRequiredService<IAuthorizationService>());
        var authentication = await evaluator.AuthenticateAsync(policy, context);
        return await evaluator.AuthorizeAsync(policy, authentication, context, resource: null);
    }

    private static DefaultHttpContext Request(IServiceProvider services, ClaimsPrincipal user) =>
        new() { RequestServices = services, User = user };

    [Fact]
    public async Task A_windows_account_without_a_session_is_challenged_not_let_through()
    {
        var services = Services();

        // What the endpoints used before: any authenticated identity passes, then EmployeeId() fails (HTTP 500).
        var anyIdentity = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
        Assert.True((await EvaluateAsync(anyIdentity, Request(services, WindowsAccount))).Succeeded);

        // Now: no session cookie means a challenge (401), so the web app starts a sign-in.
        foreach (var policy in new[] { AuthSetup.SessionPolicy().Build(), AuthSetup.SessionPolicy(RoleName.SystemAdmin).Build() })
        {
            var result = await EvaluateAsync(policy, Request(services, WindowsAccount));
            Assert.True(result.Challenged);
            Assert.False(result.Succeeded);
        }
    }

    [Fact]
    public async Task A_session_cookie_wins_over_the_windows_account_on_the_same_request()
    {
        var services = Services();
        var employee = new Employee { Id = 42, EmployeeNo = "E0101", DisplayName = "Taylor Staff", Email = "taylor@example.test", IsActive = true };
        var cookie = services.GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>().Get(CookieAuthenticationDefaults.AuthenticationScheme);
        var ticket = new AuthenticationTicket(AuthSetup.CreatePrincipal(employee, DateTimeOffset.UtcNow), CookieAuthenticationDefaults.AuthenticationScheme);

        var context = Request(services, WindowsAccount);
        context.Request.Headers.Cookie = $"{cookie.Cookie.Name}={cookie.TicketDataFormat.Protect(ticket)}";

        var result = await EvaluateAsync(AuthSetup.SessionPolicy().Build(), context);

        Assert.True(result.Succeeded);
        Assert.Equal(42, context.User.EmployeeId()); // the endpoint sees the employee, not the Windows account
    }
}
