using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using PointHub.Domain.Common;
using PointHub.Domain.Gifts;
using PointHub.Infrastructure.Persistence;
using SkiaSharp;

namespace PointHub.Infrastructure.Services;

public sealed class UploadOptions
{
    public const string Section = "Uploads";
    public const string AssetsRequestPath = "/uploads/assets";

    /// <summary>Folder for uploaded pictures; relative paths are under the application's content root.</summary>
    public string AssetsPath { get; set; } = "uploads/assets";
    public int MaxImageMegabytes { get; set; } = 8;

    public long MaxImageBytes => MaxImageMegabytes * 1024L * 1024L;

    public string ResolveAssetsPath(string contentRoot) => Path.GetFullPath(Path.Combine(contentRoot, AssetsPath));
}

/// <summary>
/// Gift pictures: every upload is decoded, normalised to one square frame and stored as a flat file named
/// by a random id. Nothing a user sends (file name, extension, content type) is used for the stored file.
/// </summary>
public sealed class GiftImageService(PointHubDbContext db, IOptions<UploadOptions> options, IHostEnvironment environment, TimeProvider clock)
{
    /// <summary>Refuse to decode absurd dimensions (a tiny file can describe a huge bitmap).</summary>
    private const int MaxSourcePixels = 40_000_000;
    private const int WebpQuality = 85;

    private string Folder => options.Value.ResolveAssetsPath(environment.ContentRootPath);

    public async Task<IReadOnlyList<GiftImage>> AddAsync(int giftId, IReadOnlyList<Stream> uploads, int actorId, CancellationToken ct)
    {
        var gift = await db.Gifts.Include(g => g.Images).FirstOrDefaultAsync(g => g.Id == giftId, ct)
            ?? throw new DomainException(ErrorCodes.NotFound, "Gift not found.");
        if (uploads.Count == 0) throw new DomainException(ErrorCodes.InvalidImage, "No file was uploaded.");
        if (gift.Images.Count + uploads.Count > GiftImage.MaxPerGift)
            throw new DomainException(ErrorCodes.TooManyImages, $"A gift can have at most {GiftImage.MaxPerGift} pictures.");

        Directory.CreateDirectory(Folder);
        var next = gift.Images.Count == 0 ? 0 : gift.Images.Max(i => i.SortOrder) + 1;
        var added = new List<GiftImage>();
        try
        {
            foreach (var upload in uploads)
            {
                var bytes = Normalize(upload);
                var image = new GiftImage
                {
                    Id = Guid.NewGuid(), GiftId = gift.Id, SortOrder = next++,
                    Width = GiftImage.FrameSize, Height = GiftImage.FrameSize, SizeBytes = bytes.Length, CreatedAt = clock.GetUtcNow(),
                };
                await File.WriteAllBytesAsync(Path.Combine(Folder, image.FileName), bytes, ct);
                added.Add(image);
            }

            gift.Images.AddRange(added);
            db.Audit(actorId, "gift.image.add", nameof(Gift), gift.Id, $"{added.Count} picture(s) added", clock);
            await db.SaveChangesAsync(ct);
            return added;
        }
        catch
        {
            // Do not leave files behind that no row points to.
            foreach (var image in added) TryDelete(image.FileName);
            throw;
        }
    }

    public async Task RemoveAsync(int giftId, Guid imageId, int actorId, CancellationToken ct)
    {
        var image = await db.GiftImages.FirstOrDefaultAsync(i => i.Id == imageId && i.GiftId == giftId, ct)
            ?? throw new DomainException(ErrorCodes.NotFound, "Picture not found.");
        db.GiftImages.Remove(image);
        db.Audit(actorId, "gift.image.remove", nameof(Gift), giftId, null, clock);
        await db.SaveChangesAsync(ct);
        TryDelete(image.FileName); // after the commit: a leftover file is harmless, a row without its file is not
    }

    public async Task ReorderAsync(int giftId, IReadOnlyList<Guid> imageIds, CancellationToken ct)
    {
        var images = await db.GiftImages.Where(i => i.GiftId == giftId).ToListAsync(ct);
        if (images.Count != imageIds.Count || images.Any(i => !imageIds.Contains(i.Id)) || imageIds.Distinct().Count() != imageIds.Count)
            throw new DomainException(ErrorCodes.ValidationFailed, "The order must list every picture of the gift exactly once.");

        var order = imageIds.ToList();
        foreach (var image in images) image.SortOrder = order.IndexOf(image.Id);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Decodes the upload, applies the EXIF orientation, scales the picture to fit a
    /// <see cref="GiftImage.FrameSize"/> square (up or down, aspect ratio kept), centres it on a transparent
    /// canvas and re-encodes it as WebP. Re-encoding also drops metadata such as GPS position.
    /// </summary>
    public byte[] Normalize(Stream upload)
    {
        using var buffer = new MemoryStream();
        upload.CopyTo(buffer);
        if (buffer.Length == 0 || buffer.Length > options.Value.MaxImageBytes)
            throw new DomainException(ErrorCodes.InvalidImage, $"The file is empty or larger than {options.Value.MaxImageMegabytes} MB.");

        buffer.Position = 0;
        using var codec = SKCodec.Create(buffer);
        if (codec is null || codec.Info.Width <= 0 || codec.Info.Height <= 0)
            throw new DomainException(ErrorCodes.InvalidImage, "The file is not a picture PointHub can read (JPEG, PNG, WebP or GIF).");
        if ((long)codec.Info.Width * codec.Info.Height > MaxSourcePixels)
            throw new DomainException(ErrorCodes.InvalidImage, "The picture has too many pixels.");

        using var decoded = SKBitmap.Decode(codec)
            ?? throw new DomainException(ErrorCodes.InvalidImage, "The picture could not be decoded.");
        using var source = SKImage.FromBitmap(decoded);

        // Orientations 5-8 are stored rotated by 90°, so the visible width and height are swapped.
        var origin = codec.EncodedOrigin;
        var quarterTurn = origin is SKEncodedOrigin.LeftTop or SKEncodedOrigin.RightTop or SKEncodedOrigin.RightBottom or SKEncodedOrigin.LeftBottom;
        var (visibleWidth, visibleHeight) = quarterTurn ? (source.Height, source.Width) : (source.Width, source.Height);

        const int frame = GiftImage.FrameSize;
        var scale = Math.Min((float)frame / visibleWidth, (float)frame / visibleHeight);

        using var surface = SKSurface.Create(new SKImageInfo(frame, frame, SKColorType.Rgba8888, SKAlphaType.Premul));
        var canvas = surface.Canvas;
        canvas.Clear(SKColors.Transparent);
        canvas.Translate(frame / 2f, frame / 2f);
        canvas.Scale(scale);
        ApplyOrientation(canvas, origin);
        canvas.DrawImage(source, new SKRect(-source.Width / 2f, -source.Height / 2f, source.Width / 2f, source.Height / 2f),
            new SKSamplingOptions(SKCubicResampler.Mitchell), null);

        using var snapshot = surface.Snapshot();
        using var encoded = snapshot.Encode(SKEncodedImageFormat.Webp, WebpQuality);
        return encoded.ToArray();
    }

    /// <summary>The canvas origin is at the centre of the picture, so each EXIF orientation is a plain rotate and/or mirror.</summary>
    private static void ApplyOrientation(SKCanvas canvas, SKEncodedOrigin origin)
    {
        switch (origin)
        {
            case SKEncodedOrigin.TopRight: canvas.Scale(-1, 1); break;
            case SKEncodedOrigin.BottomRight: canvas.RotateDegrees(180); break;
            case SKEncodedOrigin.BottomLeft: canvas.Scale(1, -1); break;
            case SKEncodedOrigin.LeftTop: canvas.RotateDegrees(90); canvas.Scale(1, -1); break;
            case SKEncodedOrigin.RightTop: canvas.RotateDegrees(90); break;
            case SKEncodedOrigin.RightBottom: canvas.RotateDegrees(270); canvas.Scale(1, -1); break;
            case SKEncodedOrigin.LeftBottom: canvas.RotateDegrees(270); break;
        }
    }

    private void TryDelete(string fileName)
    {
        try { File.Delete(Path.Combine(Folder, fileName)); }
        catch (IOException) { }
        catch (UnauthorizedAccessException) { }
    }
}
