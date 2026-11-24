/** Avatar text: one character for CJK names (two full-width glyphs crowd a small circle), two letters otherwise. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  if (/[぀-ヿ㐀-鿿]/.test(first)) return first.slice(0, 1);
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  return (first.slice(0, 1) + last.slice(0, 1)).toUpperCase();
}
