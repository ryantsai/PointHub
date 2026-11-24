import { Card } from '@heroui/react';
import { motion } from 'motion/react';
import type { HTMLAttributes, ReactNode, Ref } from 'react';

type CardLikeProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement>;
  variant?: 'default' | 'secondary' | 'tertiary' | 'transparent';
  children?: ReactNode;
};

/**
 * HeroUI's Card driven by Motion. Card spreads its props (ref included) onto its root <div>, so
 * motion.create() can animate the pane itself — which matters for glass: fading a wrapper instead
 * would make it the backdrop root and the blur would pop when the fade ends.
 */
export const MotionCard = motion.create(Card as (props: CardLikeProps) => ReactNode);

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 px-1">
      <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
      {aside}
    </div>
  );
}

export function Emoji({ children, className = '' }: { children: string; className?: string }) {
  return (
    <span aria-hidden className={`emoji select-none ${className}`}>
      {children}
    </span>
  );
}
