using System.Globalization;
using PointHub.Domain.Common;

namespace PointHub.Domain.Employees;

/// <summary>
/// Card readers report the same card UID in different shapes. Everything is reduced to upper-case
/// hex without separators so that one card always maps to one stored value.
/// </summary>
public static class CardUid
{
    /// <summary>ISO 14443-A UID lengths in bytes: single (MIFARE Classic), double (Ultralight/DESFire), triple.</summary>
    private static readonly int[] ValidByteLengths = [4, 7, 10];

    public static string Normalize(string? raw)
    {
        var text = new string((raw ?? "").Where(c => c is not (' ' or ':' or '-' or '\t' or '\r' or '\n')).ToArray());
        if (text.StartsWith("0x", StringComparison.OrdinalIgnoreCase)) text = text[2..];

        // Many keyboard-wedge readers type a 4-byte UID as a zero-padded 10-digit decimal number.
        // Ten hex digits would be five bytes, which is not a valid UID length, so this is unambiguous.
        if (text.Length == 10 && text.All(char.IsAsciiDigit) && uint.TryParse(text, CultureInfo.InvariantCulture, out var number))
            return number.ToString("X8", CultureInfo.InvariantCulture);

        if (text.Length % 2 != 0 || !text.All(char.IsAsciiHexDigit) || !ValidByteLengths.Contains(text.Length / 2))
            throw new DomainException(ErrorCodes.InvalidCardUid, "Card UID must be 4, 7 or 10 bytes of hex.");

        return text.ToUpperInvariant();
    }
}
