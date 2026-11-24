// Small shared building blocks of the Arcade look.
import { Box, Center, Flex, Heading, Text, type BoxProps, type FlexProps } from '@chakra-ui/react';
import { Star, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../../i18n/hooks';
import { PixelSprite } from '../../themes/sprites/PixelSprite';
import type { Sprite } from '../../themes/sprites/types';

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

interface PointsProps extends Omit<FlexProps, 'children'> {
  value: number;
  /** Show an explicit sign: "+50". */
  signed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/** Coin + number + unit: the cost of a gift, the points of an event. */
export function Points({ value, signed, size = 'md', ...rest }: PointsProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const coin = size === 'lg' ? 22 : size === 'sm' ? 15 : 18;
  return (
    <Flex as="span" display="inline-flex" align="center" gap="1.5" fontWeight="black" fontSize={size} lineHeight="1" whiteSpace="nowrap" {...rest}>
      <Coin size={coin} />
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{signed ? format.signed(value) : format.number(value)}</span>
      <Text as="span" fontSize="xs" fontWeight="bold" opacity={0.75}>
        {t('app.pointsUnit')}
      </Text>
    </Flex>
  );
}

interface SectionTitleProps {
  icon: LucideIcon;
  title: string;
  compact?: boolean;
  /** Sits on the right: counts, actions. */
  children?: ReactNode;
}

/** Icon tile + heading used for every section of a page. */
export function SectionTitle({ icon: IconCmp, title, compact, children }: SectionTitleProps) {
  return (
    <Flex align="center" gap="3" minW="0" wrap="wrap">
      <Center flexShrink={0} boxSize="9" borderRadius="l2" bg="brand.subtle" color="brand.fg" borderWidth="2px" borderColor="brand.muted">
        <IconCmp size={18} strokeWidth={2.5} aria-hidden />
      </Center>
      <Heading
        as="h2"
        fontSize={compact ? 'lg' : 'xl'}
        lineHeight="1.25"
        fontWeight="extrabold"
        letterSpacing="-0.01em"
        flex="1"
        minW="0"
        // halo: keeps an ambient sprite behind the heading away from the letters
        textShadow="0 0 2px {colors.bg}, 0 0 6px {colors.bg}, 0 0 10px {colors.bg}"
      >
        {title}
      </Heading>
      {children}
    </Flex>
  );
}

interface SpriteTileProps extends BoxProps {
  sprite: Sprite;
  scale?: number;
  /** Side of the tile in px (default: the sprite plus a margin). */
  size?: number;
}

/** A pixel sprite on a tinted sticker tile: artwork for events, gifts without pictures, list rows. */
export function SpriteTile({ sprite, scale = 2, size, ...rest }: SpriteTileProps) {
  const side = size ?? sprite.w * scale + 20;
  return (
    <Center
      aria-hidden
      flexShrink={0}
      w={`${side}px`}
      h={`${side}px`}
      borderRadius="l2"
      bgImage="linear-gradient(160deg, {colors.brand.subtle}, {colors.accent.subtle})"
      borderWidth="2px"
      borderColor="brand.muted"
      {...rest}
    >
      <PixelSprite sprite={sprite} scale={scale} />
    </Center>
  );
}

/** Uppercase mini-heading above a group ("Open now"). */
export function Eyebrow({ children, ...rest }: BoxProps) {
  return (
    <Box as="span" fontSize="xs" fontWeight="extrabold" letterSpacing="0.05em" textTransform="uppercase" color="fg.muted" {...rest}>
      {children}
    </Box>
  );
}
