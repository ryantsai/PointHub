using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using PointHub.Infrastructure.Services;

namespace PointHub.Api.Http;

public static class UploadedAssets
{
    /// <summary>
    /// Serves the flat uploads/assets folder at /uploads/assets. Only files the server itself wrote are in it
    /// (re-encoded WebP under random ids), and they never change, so they can be cached for a long time.
    /// </summary>
    public static IApplicationBuilder UseUploadedAssets(this WebApplication app)
    {
        var folder = app.Services.GetRequiredService<IOptions<UploadOptions>>().Value.ResolveAssetsPath(app.Environment.ContentRootPath);
        Directory.CreateDirectory(folder);

        return app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(folder),
            RequestPath = UploadOptions.AssetsRequestPath,
            OnPrepareResponse = context =>
            {
                context.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
                context.Context.Response.Headers.XContentTypeOptions = "nosniff";
            },
        });
    }
}
