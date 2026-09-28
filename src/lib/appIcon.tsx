// the app icon (a tilted sticky note with a "?") as JSX for next/og: iOS home screen and the PWA manifest share it
/* eslint-disable shadcn/no-raw-colors -- rendered to a PNG by next/og, where theme CSS variables do not exist */
export function AppIcon({ size, pad = 0 }: { size: number; pad?: number }) {
  const inner = Math.round(size * (1 - pad) * 0.8);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0c0b14" }}>
      <svg width={inner} height={inner} viewBox="0 0 64 64">
        <g transform="rotate(-7 32 32)">
          <rect x="9" y="9" width="46" height="46" rx="4" fill="#ffd84d" />
          <path d="M9 47h46v4a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4z" fill="#e6bf3a" />
          <path d="M25 25.5c0-4.4 3.3-7.5 7.5-7.5s7.3 2.8 7.3 6.6c0 5.7-7.3 6.4-7.3 11.4" fill="none" stroke="#2b2100" strokeWidth="5" strokeLinecap="round" />
          <circle cx="32.5" cy="44" r="3.2" fill="#2b2100" />
        </g>
      </svg>
    </div>
  );
}
