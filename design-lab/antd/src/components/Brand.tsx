import { useLab } from '../lab';

export function Brand() {
  const { tr } = useLab();
  return (
    <div className="ph-brand">
      <svg className="ph-brand-mark" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
        <defs>
          <linearGradient id="ph-brand-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--ph-hero-1)" />
            <stop offset="1" stopColor="var(--ph-hero-2)" />
          </linearGradient>
        </defs>
        <rect width="28" height="28" rx="8" fill="url(#ph-brand-g)" />
        <circle cx="14" cy="14" r="6.2" fill="none" stroke="#fff" strokeWidth="2.2" />
        <circle cx="14" cy="14" r="2.1" fill="#fff" />
        <path d="M14 3.6v3.2M14 21.2v3.2" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
      </svg>
      <span className="ph-brand-name">{tr('appName')}</span>
    </div>
  );
}
