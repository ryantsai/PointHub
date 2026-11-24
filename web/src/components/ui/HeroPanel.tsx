import { Box, type BoxProps } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface HeroPanelProps extends BoxProps {
  children: ReactNode;
  /** Pixel sprites or other decoration, absolutely positioned inside the clipped background layer. */
  decoration?: ReactNode;
}

/**
 * The bold gradient surface of the Arcade look (balance card, sign-in panel, later the kiosk and projector
 * screens). Text on it is white: both gradient stops that sit behind text are held to AA in palette.ts.
 * The third stop is a corner glow only, and decorations live in a clipped layer behind the content.
 */
export function HeroPanel({ children, decoration, ...rest }: HeroPanelProps) {
  return (
    <Box
      position="relative"
      borderRadius={{ base: '3xl', md: '4xl' }}
      color="white"
      p={{ base: '5', md: '7' }}
      bgImage="linear-gradient(140deg, {colors.hero.from} 0%, {colors.hero.via} 68%)"
      boxShadow="0 6px 0 0 {colors.brand.depth}"
      {...rest}
    >
      <Box aria-hidden position="absolute" inset="0" borderRadius="inherit" overflow="hidden" pointerEvents="none">
        <Box
          position="absolute"
          right="-90px"
          bottom="-120px"
          boxSize="300px"
          borderRadius="full"
          opacity="0.45"
          bgImage="radial-gradient(circle, {colors.hero.to} 0%, transparent 68%)"
        />
        <Box position="absolute" inset="0" opacity="0.12" bgImage="radial-gradient(white 1.2px, transparent 1.2px)" bgSize="18px 18px" />
        {decoration}
      </Box>
      <Box position="relative">{children}</Box>
    </Box>
  );
}
