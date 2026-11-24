import { Box, type BoxProps } from '@chakra-ui/react';
import { useActiveTheme } from '../../themes/activeTheme';
import type { ThemeDefinition } from '../../themes/registry';
import { PixelSprite } from '../../themes/sprites/PixelSprite';

interface ThemeSpriteProps extends Omit<BoxProps, 'title'> {
  /** Defaults to the theme on screen; pass one to preview another theme (the admin theme page). */
  theme?: ThemeDefinition;
  which?: 'motif' | 'companion';
  scale?: number;
  /** Two-step pixel bob. Stops under reduced motion and while the tab is hidden. */
  bob?: boolean;
  title?: string;
}

/** The pixel-art motif of a theme. Use it wherever a theme shows itself; never an emoji. */
export function ThemeSprite({ theme, which = 'motif', scale = 2, bob, title, ...rest }: ThemeSpriteProps) {
  const active = useActiveTheme();
  const source = theme ?? active;
  const sprite = which === 'companion' ? (source.companion ?? source.motif) : source.motif;
  return (
    <Box
      data-ambient=""
      display="inline-block"
      flexShrink={0}
      lineHeight="0"
      animation={bob ? 'phBob 1.1s linear infinite' : undefined}
      css={{ '--ph-bob': `${scale}px` }}
      {...rest}
    >
      <PixelSprite sprite={sprite} scale={scale} title={title} />
    </Box>
  );
}
