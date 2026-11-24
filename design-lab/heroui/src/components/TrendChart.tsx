import { motion, useReducedMotion } from 'motion/react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { Locale } from '@shared/data';
import { formatNumber, t } from '@shared/strings';
import { spring } from '../lib/motion';

type Point = [x: number, y: number];

/** Monotone cubic interpolation (Fritsch–Carlson): smooth, and never overshoots the data. */
function monotonePath(points: Point[]): string {
  const n = points.length;
  if (n < 2) return '';
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1][0] - points[i][0];
    slope[i] = (points[i + 1][1] - points[i][1]) / dx[i];
  }
  const tangent: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    tangent[i] =
      slope[i - 1] * slope[i] <= 0
        ? 0
        : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / slope[i - 1] + (dx[i] + 2 * dx[i - 1]) / slope[i]);
  }
  tangent[n - 1] = slope[n - 2];
  let d = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const h = dx[i] / 3;
    d += `C${(x0 + h).toFixed(2)},${(y0 + tangent[i] * h).toFixed(2)},${(x1 - h).toFixed(2)},${(y1 - tangent[i + 1] * h).toFixed(2)},${x1.toFixed(2)},${y1.toFixed(2)}`;
  }
  return d;
}

const pad = { top: 14, right: 14, bottom: 28, left: 50 };

/**
 * Issued vs redeemed, hand-drawn SVG (HeroUI v3 has no chart). Colours are the theme's CSS
 * variables, so the chart follows the season. Issued is a solid line with a filled area; redeemed is
 * dashed, so the series differ by more than colour. Hover, touch or arrow keys move the read-out.
 */
export function TrendChart({ locale, issued, redeemed }: { locale: Locale; issued: number[]; redeemed: number[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [active, setActive] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  useLayoutEffect(() => {
    const element = wrap.current;
    if (!element) return;
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { width, height } = size;
  const count = issued.length;
  const peak = Math.max(...issued, ...redeemed);
  const step = 10 ** Math.floor(Math.log10(peak)) / 2;
  const top = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  const innerWidth = Math.max(0, width - pad.left - pad.right);
  const innerHeight = Math.max(0, height - pad.top - pad.bottom);
  const xAt = (i: number) => pad.left + (count > 1 ? (i / (count - 1)) * innerWidth : 0);
  const yAt = (value: number) => pad.top + (1 - value / top) * innerHeight;
  const baseline = pad.top + innerHeight;

  const issuedPoints = issued.map((value, i): Point => [xAt(i), yAt(value)]);
  const redeemedPoints = redeemed.map((value, i): Point => [xAt(i), yAt(value)]);
  const issuedLine = monotonePath(issuedPoints);
  const redeemedLine = monotonePath(redeemedPoints);
  const closed = (line: string) => `${line}L${xAt(count - 1).toFixed(2)},${baseline}L${xAt(0).toFixed(2)},${baseline}Z`;

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left - pad.left) / Math.max(1, innerWidth);
    setActive(Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1)))));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = count - 1;
    const next =
      event.key === 'ArrowLeft'
        ? active == null
          ? last
          : Math.max(0, active - 1)
        : event.key === 'ArrowRight'
          ? active == null
            ? last
            : Math.min(last, active + 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (event.key === 'Escape') setActive(null);
    if (next == null) return;
    event.preventDefault();
    setActive(next);
  };

  const tooltipWidth = 168;
  const activeX = active == null ? 0 : xAt(active);
  const tooltipX =
    active == null ? 0 : activeX + 14 + tooltipWidth > width - 4 ? activeX - 14 - tooltipWidth : activeX + 14;

  return (
    <div
      ref={wrap}
      aria-label={`${t(locale, 'issuedVsRedeemed')}: ${t(locale, 'issued')}, ${t(locale, 'redeemedSeries')}`}
      className="relative min-h-[260px] w-full flex-1 touch-pan-y rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-focus"
      role="group"
      tabIndex={0}
      onBlur={() => setActive(null)}
      onKeyDown={onKeyDown}
      onPointerLeave={() => setActive(null)}
      onPointerMove={onPointerMove}
    >
      {width > 0 && height > 0 && (
        <svg aria-hidden className="absolute inset-0 overflow-visible" height={height} width={width}>
          <defs>
            <linearGradient id={`${uid}-issued`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${uid}-redeemed`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--aurora-accent)" stopOpacity="0.26" />
              <stop offset="100%" stopColor="var(--aurora-accent)" stopOpacity="0" />
            </linearGradient>
            {/* left-to-right wipe: one transform animates, the paths stay static */}
            <clipPath id={`${uid}-reveal`}>
              <motion.rect
                animate={{ scaleX: 1 }}
                height={height + 16}
                initial={{ scaleX: 0 }}
                style={{ originX: 0 }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
                width={width + 16}
                x={-8}
                y={-8}
              />
            </clipPath>
          </defs>

          {ticks.map((tick) => (
            <g key={tick}>
              <line
                stroke="var(--separator)"
                strokeDasharray={tick === 0 ? undefined : '3 5'}
                x1={pad.left}
                x2={width - pad.right}
                y1={yAt(tick)}
                y2={yAt(tick)}
              />
              <text
                className="num"
                dominantBaseline="middle"
                fill="var(--muted)"
                fontSize="11"
                textAnchor="end"
                x={pad.left - 10}
                y={yAt(tick)}
              >
                {formatNumber(locale, tick)}
              </text>
            </g>
          ))}
          {issued.map((_, i) => (
            <text
              key={i}
              className="num"
              fill={active === i ? 'var(--foreground)' : 'var(--muted)'}
              fontSize="11"
              fontWeight={active === i ? 600 : 400}
              textAnchor="middle"
              x={xAt(i)}
              y={height - 6}
            >
              {i + 1}
            </text>
          ))}

          <g clipPath={`url(#${uid}-reveal)`}>
            <path d={closed(issuedLine)} fill={`url(#${uid}-issued)`} />
            <path d={closed(redeemedLine)} fill={`url(#${uid}-redeemed)`} />
            <path
              d={redeemedLine}
              fill="none"
              stroke="var(--aurora-accent)"
              strokeDasharray="1 7"
              strokeLinecap="round"
              strokeWidth="3"
            />
            <path d={issuedLine} fill="none" stroke="var(--accent)" strokeLinecap="round" strokeWidth="2.75" />
          </g>

          {/* the latest week is always marked */}
          <motion.circle
            animate={{ scale: 1, opacity: 1 }}
            cx={xAt(count - 1)}
            cy={yAt(issued[count - 1])}
            fill="var(--accent)"
            initial={{ scale: 0, opacity: 0 }}
            r="5"
            stroke="var(--background)"
            strokeWidth="2.5"
            transition={{ ...spring, delay: reduce ? 0 : 1.5 }}
          />

          {active != null && (
            <motion.g animate={{ x: activeX }} initial={{ x: activeX }} transition={spring}>
              <line stroke="var(--border-tertiary)" strokeWidth="1" x1="0" x2="0" y1={pad.top} y2={baseline} />
              <motion.circle
                animate={{ cy: yAt(redeemed[active]) }}
                cx="0"
                fill="var(--aurora-accent)"
                initial={{ cy: yAt(redeemed[active]) }}
                r="5"
                stroke="var(--background)"
                strokeWidth="2.5"
                transition={spring}
              />
              <motion.circle
                animate={{ cy: yAt(issued[active]) }}
                cx="0"
                fill="var(--accent)"
                initial={{ cy: yAt(issued[active]) }}
                r="5.5"
                stroke="var(--background)"
                strokeWidth="2.5"
                transition={spring}
              />
            </motion.g>
          )}
        </svg>
      )}

      {active != null && width > 0 && (
        <motion.div
          animate={{ x: tooltipX, y: Math.max(4, yAt(issued[active]) - 30), opacity: 1 }}
          className="tooltip pointer-events-none absolute top-0 left-0 flex flex-col gap-1 px-3 py-2"
          initial={{ x: tooltipX, y: Math.max(4, yAt(issued[active]) - 30), opacity: 0 }}
          style={{ width: tooltipWidth }}
          transition={spring}
        >
          <span className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-0.5 w-3 rounded-full bg-accent" />
              {t(locale, 'issued')}
            </span>
            <span className="num font-semibold">{formatNumber(locale, issued[active])}</span>
          </span>
          <span className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-0.5 w-3 rounded-full border-t-2 border-dotted border-aurora" />
              {t(locale, 'redeemedSeries')}
            </span>
            <span className="num font-semibold">{formatNumber(locale, redeemed[active])}</span>
          </span>
        </motion.div>
      )}

      <p aria-live="polite" className="sr-only">
        {active != null
          ? `${active + 1} / ${count} · ${t(locale, 'issued')} ${formatNumber(locale, issued[active])} · ${t(locale, 'redeemedSeries')} ${formatNumber(locale, redeemed[active])}`
          : ''}
      </p>
    </div>
  );
}
