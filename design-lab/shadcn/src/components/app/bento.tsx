import type { ComponentProps, ReactNode } from 'react';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { item } from '@/lib/motion';

/**
 * Ruled bento: a 1px grid gap over a border-coloured backdrop draws every hairline exactly once,
 * so cells never double up their borders. Cells must tile the grid completely.
 */
export function Bento({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('grid gap-px overflow-hidden rounded-xl border border-border bg-border', className)}
      {...props}
    />
  );
}

type CellProps = ComponentProps<typeof Card> & { contentClassName?: string };

/**
 * A bento cell: shadcn's Card with its own ring, radius and padding removed, because the grid draws
 * the rules. The surface is static; its content takes part in the page stagger.
 */
export function Cell({ className, contentClassName, children, ...props }: CellProps) {
  return (
    <Card
      role={props['aria-labelledby'] ? 'region' : undefined}
      className={cn('relative min-w-0 gap-0 rounded-none py-0 text-base ring-0', className)}
      {...props}
    >
      <motion.div variants={item} className={cn('flex h-full min-w-0 flex-col', contentClassName)}>
        {children}
      </motion.div>
    </Card>
  );
}

type CellHeaderProps = {
  index: string;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
  id?: string;
};

/** Numbered section header, like a magazine department: "02  Gifts". */
export function CellHeader({ index, title, children, className, id }: CellHeaderProps) {
  return (
    <header
      className={cn(
        'flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-5 py-3 sm:px-6',
        className,
      )}
    >
      <h2 id={id} className="flex min-w-0 items-baseline gap-3 text-[0.9375rem] font-semibold tracking-tight">
        <span aria-hidden className="eyebrow text-primary">
          {index}
        </span>
        <span className="truncate">{title}</span>
      </h2>
      {children ? <div className="flex min-w-0 items-center gap-2">{children}</div> : null}
    </header>
  );
}

/**
 * Hatched filler for the unused remainder of a cell. In a ruled grid every cell is as tall as its
 * row, so shorter lists end in this instead of in blank card.
 */
export function CellFill({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'min-h-0 flex-1 bg-[repeating-linear-gradient(135deg,transparent_0_7px,var(--border)_7px_8px)] opacity-60',
        className,
      )}
    />
  );
}
