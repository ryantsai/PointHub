using System.Text.Encodings.Web;
using Microsoft.Net.Http.Headers;

namespace PointHub.Api.Http;

/// <summary>
/// Serves the React app's index.html with its <c>&lt;base href&gt;</c> set to the request's path base, so the same
/// build runs at the site root and in an application folder (IIS sets the path base of an app at
/// <c>https://host/PointHub</c> to <c>/PointHub</c>; <c>Site:PathBase</c> does it elsewhere). The web client takes its
/// API, picture and router paths from that base.
/// </summary>
public static class SpaShell
{
    private const string BasePlaceholder = "<base href=\"/\" />";

    public static void MapSpaShell(this WebApplication app)
    {
        var file = app.Environment.WebRootFileProvider.GetFileInfo("index.html");
        // Read once: a deployment replaces the file and restarts the app. Development reads it on every request.
        string? cached = null;

        async Task<IResult> Serve(HttpContext http)
        {
            if (!file.Exists) return Results.NotFound();
            var template = cached;
            if (template is null)
            {
                using var reader = new StreamReader(file.CreateReadStream());
                template = await reader.ReadToEndAsync(http.RequestAborted);
                if (!app.Environment.IsDevelopment()) cached = template;
            }

            var baseHref = $"<base href=\"{HtmlEncoder.Default.Encode(http.Request.PathBase.Value ?? "")}/\" />";
            http.Response.Headers.CacheControl = "no-cache"; // the shell names the hashed bundles of the current release
            return Results.Content(template.Replace(BasePlaceholder, baseHref, StringComparison.Ordinal), "text/html; charset=utf-8");
        }

        Delegate handler = Serve; // a route handler, so the IResult is written to the response

        // "/" and "/index.html" explicitly (a matched endpoint keeps the static-file middleware from sending the raw
        // file). Client-side routes (/c/{token}, /admin/ledger, ...) get the shell too. `nonfile` keeps the fallback
        // away from anything that looks like a file, so scripts, styles and uploaded pictures are never answered
        // with index.html; unknown /api paths stay 404.
        app.MapGet("/", handler).ExcludeFromDescription();
        app.MapGet("/index.html", handler).ExcludeFromDescription();
        app.MapFallback("{*path:nonfile:regex(^(?!api/).*$)}", handler);
    }
}
