// Issued vs redeemed, hand-drawn SVG. Ant Design core ships no chart; @ant-design/plots would add
// ~1 MB for one area chart, and drawing it here lets the series follow the season's CSS variables.
import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { motion } from 'motion/react';
import { useLab } from '../lab';
import { EASE, SPRING } from '../motion';

const MIN_HEIGHT = 268;
const PAD = { left: 50, right: 16, top: 16, bottom: 28 };

const niceMax = (value: number) => {
  const step = 10 ** Math.floor(Math.log10(value)) / 2;
  return Math.ceil(value / step) * step;
};

const smooth = (points: [number, number][]) =>
  points
    .map(([x, y], i) => {
      if (i === 0) return `M${x},${y}`;
      const [px, py] = points[i - 1];
      const mid = (px + x) / 2;
      return `C${mid},${py} ${mid},${y} ${x},${y}`;
    })
    .join(' ');

export function TrendChart({ issued, redeemed, title }: { issued: number[]; redeemed: number[]; title: string }) {
  const { tr, num } = useLab();
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(MIN_HEIGHT);
  const [active, setActive] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      setWidth(Math.round(el.clientWidth));
      setHeight(Math.max(MIN_HEIGHT, Math.round(el.clientHeight)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const count = issued.length;
  const geometry = useMemo(() => {
    const innerW = Math.max(0, width - PAD.left - PAD.right);
    const innerH = height - PAD.top - PAD.bottom;
    const max = niceMax(Math.max(...issued, ...redeemed));
    const x = (i: number) => PAD.left + (innerW * i) / (count - 1);
    const y = (v: number) => PAD.top + innerH * (1 - v / max);
    const issuedPts = issued.map((v, i) => [x(i), y(v)] as [number, number]);
    const redeemedPts = redeemed.map((v, i) => [x(i), y(v)] as [number, number]);
    const issuedLine = smooth(issuedPts);
    const base = PAD.top + innerH;
    const issuedArea = `${issuedLine} L${x(count - 1)},${base} L${x(0)},${base} Z`;
    const ticks = [0, 1, 2, 3].map((i) => (max / 3) * i);
    return { innerW, innerH, x, y, issuedPts, redeemedPts, issuedLine, redeemedLine: smooth(redeemedPts), issuedArea, ticks, base };
  }, [width, height, issued, redeemed, count]);

  const pickIndex = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left - PAD.left) / Math.max(1, geometry.innerW);
    setActive(Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1)))));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    setActive((current) => Math.max(0, Math.min(count - 1, (current ?? (delta > 0 ? -1 : count)) + delta)));
  };

  const sparse = geometry.innerW / count < 30;
  const tipLeft = active !== null && geometry.x(active) > width * 0.6;

  return (
    <div
      ref={wrap}
      className="ph-chart"
      role="group"
      aria-label={title}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={() => setActive((current) => current ?? count - 1)}
      onBlur={() => setActive(null)}
    >
      {width > 0 && (
        <svg width={width} height={height} onPointerMove={pickIndex} onPointerLeave={() => setActive(null)} aria-hidden="true">
          <defs>
            <linearGradient id="ph-chart-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--ph-primary-graphic)" stopOpacity="0.28" />
              <stop offset="1" stopColor="var(--ph-primary-graphic)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {geometry.ticks.map((tick) => (
            <g key={tick}>
              <line className="ph-chart-grid" x1={PAD.left} x2={width - PAD.right} y1={geometry.y(tick)} y2={geometry.y(tick)} />
              <text className="ph-chart-tick" x={PAD.left - 10} y={geometry.y(tick)} textAnchor="end" dominantBaseline="middle">
                {num(tick)}
              </text>
            </g>
          ))}
          {issued.map((_, i) =>
            sparse && i % 2 === 1 ? null : (
              <text key={i} className="ph-chart-tick" x={geometry.x(i)} y={height - 8} textAnchor="middle">
                {i + 1}
              </text>
            ),
          )}

          <motion.path
            d={geometry.issuedArea}
            fill="url(#ph-chart-area)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.55, ease: 'easeOut' }}
          />
          <motion.path
            d={geometry.redeemedLine}
            className="ph-chart-line ph-chart-line-accent"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ pathLength: { duration: 1.2, delay: 0.35, ease: EASE }, opacity: { duration: 0.2, delay: 0.35 } }}
          />
          <motion.path
            d={geometry.issuedLine}
            className="ph-chart-line ph-chart-line-primary"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ pathLength: { duration: 1.2, delay: 0.2, ease: EASE }, opacity: { duration: 0.2, delay: 0.2 } }}
          />
          {geometry.redeemedPts.map(([cx, cy], i) => (
            <motion.circle
              key={i}
              className="ph-chart-dot ph-chart-dot-accent"
              cx={cx}
              cy={cy}
              r={2.5}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.05 }}
            />
          ))}
          {geometry.issuedPts.map(([cx, cy], i) => (
            <motion.circle
              key={i}
              className="ph-chart-dot ph-chart-dot-primary"
              cx={cx}
              cy={cy}
              r={i === count - 1 ? 4 : 2.5}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.35 + i * 0.05 }}
            />
          ))}

          {active !== null && (
            <g>
              <line className="ph-chart-cursor" x1={geometry.x(active)} x2={geometry.x(active)} y1={PAD.top} y2={geometry.base} />
              <circle className="ph-chart-focus ph-chart-dot-accent" cx={geometry.x(active)} cy={geometry.y(redeemed[active])} r={5} />
              <circle className="ph-chart-focus ph-chart-dot-primary" cx={geometry.x(active)} cy={geometry.y(issued[active])} r={5} />
            </g>
          )}
        </svg>
      )}

      {active !== null && width > 0 && (
        <motion.div
          className="ph-chart-tip"
          initial={{ opacity: 0, x: geometry.x(active) }}
          animate={{ opacity: 1, x: geometry.x(active) }}
          transition={{ x: SPRING, opacity: { duration: 0.15 } }}
          aria-hidden="true"
        >
          <div className={'ph-chart-tip-body' + (tipLeft ? ' is-left' : '')}>
            <div className="ph-chart-tip-head">{tr('capacity', { count: active + 1, max: count })}</div>
            <div className="ph-chart-tip-row">
              <i className="ph-dot ph-dot-primary" />
              <span>{tr('issued')}</span>
              <b>{num(issued[active])}</b>
            </div>
            <div className="ph-chart-tip-row">
              <i className="ph-dot ph-dot-accent" />
              <span>{tr('redeemedSeries')}</span>
              <b>{num(redeemed[active])}</b>
            </div>
          </div>
        </motion.div>
      )}

      <table className="ph-sr">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">{tr('issued')}</th>
            <th scope="col">{tr('redeemedSeries')}</th>
          </tr>
        </thead>
        <tbody>
          {issued.map((value, i) => (
            <tr key={i}>
              <th scope="row">{i + 1}</th>
              <td>{num(value)}</td>
              <td>{num(redeemed[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Sparkline({ data, tone }: { data: number[]; tone: 'primary' | 'accent' }) {
  const W = 76;
  const H = 26;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map(
    (v, i) => [2 + ((W - 4) * i) / (data.length - 1), 3 + (H - 6) * (1 - (v - min) / (max - min || 1))] as [number, number],
  );
  const [lastX, lastY] = points[points.length - 1];
  return (
    <svg className="ph-spark" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <motion.path
        d={smooth(points)}
        className={'ph-chart-line ph-chart-line-' + tone}
        style={{ strokeWidth: 1.75 }}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ pathLength: { duration: 1, delay: 0.4, ease: EASE }, opacity: { duration: 0.2, delay: 0.4 } }}
      />
      <motion.circle
        cx={lastX}
        cy={lastY}
        r={2.5}
        className={'ph-chart-dot ph-chart-dot-' + tone}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.3 }}
      />
    </svg>
  );
}
