// Small shared building blocks of the Arcade look.
import { Box, Center, Flex, Heading, type BoxProps } from '@chakra-ui/react';
import { Star, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Locale } from '@shared/data';
import { formatNumber } from '@shared/strings';

/** The points "coin": the accent colour as a token you can collect. */
export function Coin({ size = 20, ...rest }: { size?: number } & BoxProps) {
  return (
    <Center
      aria-hidden
      flexShrink={0}
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="full"
      bg="accent.solid"
      color="accent.contrast"
      boxShadow="inset 0 -2px 0 0 {colors.accent.depth}, 0 0 0 1.5px {colors.accent.depth}"
      {...rest}
    >
      <Star size={size * 0.56} fill="currentColor" strokeWidth={0} />
    </Center>
  );
}

/** Icon tile + heading used for every section of both views. */
export function SectionTitle({ icon: IconCmp, title, compact, children }: { icon: LucideIcon; title: string; compact?: boolean; children?: ReactNode }) {
  return (
    <Flex align="center" gap="3" minW="0" wrap="wrap">
      <Center flexShrink={0} boxSize="9" borderRadius="l2" bg="brand.subtle" color="brand.fg" borderWidth="2px" borderColor="brand.muted">
        <IconCmp size={18} strokeWidth={2.5} aria-hidden />
      </Center>
      <Heading as="h2" fontSize={compact ? 'lg' : 'xl'} lineHeight="1.25" fontWeight="extrabold" letterSpacing="-0.01em" flex="1" minW="0">
        {title}
      </Heading>
      {children}
    </Flex>
  );
}

/** "+50" / "−80" with a real minus sign and locale-aware digits. */
export const signed = (locale: Locale, amount: number) =>
  `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${formatNumber(locale, Math.abs(amount))}`;

/** Emoji artwork on a tinted sticker tile. */
export function EmojiTile({ emoji, size = 56, ...rest }: { emoji: string; size?: number } & BoxProps) {
  return (
    <Center
      aria-hidden
      flexShrink={0}
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="l2"
      bg="brand.subtle"
      borderWidth="2px"
      borderColor="brand.muted"
      fontSize={`${Math.round(size * 0.5)}px`}
      lineHeight="1"
      {...rest}
    >
      <Box as="span" display="block" transform="translateY(1px)">
        {emoji}
      </Box>
    </Center>
  );
}

/** Avatar text: one character for CJK names (two full-width glyphs crowd a small circle), two letters otherwise. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  if (/[぀-ヿ㐀-鿿]/.test(first)) return first.slice(0, 1);
  const last = parts.length > 1 ? parts[parts.length - 1]! : '';
  return (first.slice(0, 1) + last.slice(0, 1)).toUpperCase();
}
