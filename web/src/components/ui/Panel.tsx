import { Card, type CardBodyProps, type CardRootProps } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface PanelProps extends Omit<CardRootProps, 'children'> {
  children: ReactNode;
  /** Padding of the body (default: 4 on phones, 5 from md). */
  padding?: CardBodyProps['p'];
  /** Gap between direct children (the body is a column flexbox). */
  gap?: CardBodyProps['gap'];
}

/** The Arcade "sticker" card: thick outline, hard drop shadow. Replaces Mantine's `<Card withBorder>` / `<Paper withBorder>`. */
export function Panel({ children, padding = { base: '4', md: '5' }, gap = '4', ...root }: PanelProps) {
  return (
    <Card.Root variant="outline" minW="0" {...root}>
      <Card.Body p={padding} gap={gap}>
        {children}
      </Card.Body>
    </Card.Root>
  );
}
