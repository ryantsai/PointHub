using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Net.Http.Headers;

namespace PointHub.Api.Auth;

/// <summary>
/// Reads the session cookie the browser sent first. When PointHub runs in a folder (<c>/PointHub</c>), a cookie of the
/// same name with a wider path (<c>/</c>, from another deployment on the same host) can arrive as well. Browsers send
/// the most specific path first, but <see cref="HttpRequest.Cookies"/> keeps the last value, which would sign the
/// person out on every request.
/// </summary>
internal sealed class FirstCookieManager : ICookieManager
{
    private readonly ChunkingCookieManager inner = new();

    public string? GetRequestCookie(HttpContext context, string key)
    {
        if (CookieHeaderValue.TryParseList(context.Request.Headers.Cookie, out var cookies))
        {
            foreach (var cookie in cookies)
            {
                if (!cookie.Name.Equals(key, StringComparison.Ordinal)) continue;
                var value = Uri.UnescapeDataString(cookie.Value.ToString());
                // A chunked cookie ("chunks-N" plus keyC1..CN) is reassembled by the default manager.
                return value.StartsWith("chunks-", StringComparison.Ordinal) ? inner.GetRequestCookie(context, key) : value;
            }
        }
        return null;
    }

    public void AppendResponseCookie(HttpContext context, string key, string? value, CookieOptions options) =>
        inner.AppendResponseCookie(context, key, value, options);

    public void DeleteCookie(HttpContext context, string key, CookieOptions options) =>
        inner.DeleteCookie(context, key, options);
}
