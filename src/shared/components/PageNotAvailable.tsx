import { Home, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../routes'

function Illustration() {
  return (
    <svg viewBox="0 0 320 210" className="w-full max-w-sm" role="img" aria-label="Page under construction">
      <defs>
        <pattern id="pna-stripes" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="16" height="16" fill="#fbbf24" />
          <rect width="8" height="16" fill="#1f2937" />
        </pattern>
        <linearGradient id="pna-window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4f7de0" />
          <stop offset="1" stopColor="#2b4fae" />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="190" rx="120" ry="12" fill="#2563eb" opacity="0.15" />
      <circle cx="262" cy="52" r="3" fill="#60a5fa" opacity="0.7" />
      <circle cx="52" cy="120" r="3" fill="#60a5fa" opacity="0.7" />
      <g>
        <rect x="80" y="28" width="150" height="120" rx="12" fill="url(#pna-window)" />
        <circle cx="96" cy="43" r="4" fill="#ef4444" />
        <circle cx="109" cy="43" r="4" fill="#fbbf24" />
        <circle cx="122" cy="43" r="4" fill="#22c55e" />
        <rect x="92" y="58" width="126" height="78" rx="8" fill="#1e3a8a" opacity="0.75" />
        <g transform="translate(155 92)">
          <circle r="25" fill="none" stroke="#3b82f6" strokeWidth="9" strokeDasharray="9.8 9.8" />
          <circle r="21" fill="#3b82f6" />
          <circle r="8" fill="#1e3a8a" />
        </g>
      </g>
      <path d="M186 40a38 30 0 0 1 76 0z" fill="#fbbf24" transform="translate(-6 -6) rotate(10 224 40)" />
      <rect x="172" y="30" width="88" height="8" rx="4" fill="#f59e0b" transform="translate(-6 -6) rotate(10 224 40)" />
      <g transform="translate(250 78)">
        <path d="M0 -26 26 20H-26z" fill="#fbbf24" stroke="#fbbf24" strokeWidth="6" strokeLinejoin="round" />
        <rect x="-3" y="-10" width="6" height="18" rx="3" fill="#1f2937" />
        <circle cy="14" r="3.4" fill="#1f2937" />
      </g>
      <g>
        <rect x="108" y="128" width="116" height="30" rx="4" fill="url(#pna-stripes)" />
        <rect x="108" y="128" width="116" height="30" rx="4" fill="none" stroke="#1f2937" strokeWidth="2" />
        <path d="M124 158l-8 28M208 158l8 28" stroke="#f59e0b" strokeWidth="7" strokeLinecap="round" />
      </g>
      <g>
        <path d="M74 188 94 124h12l20 64z" fill="#f97316" />
        <path d="M86 150h20M82 165h28" stroke="#fff" strokeWidth="5" />
        <rect x="64" y="186" width="72" height="8" rx="3" fill="#ea580c" />
      </g>
      <g>
        <path d="M24 188c-2-26 8-44 22-52-2 18 2 32 12 44-10 4-22 8-34 8z" fill="#15803d" />
        <path d="M44 188c6-22 18-36 30-40-2 16-6 30-16 42z" fill="#22c55e" />
      </g>
    </svg>
  )
}

// What a page shows when it cannot be shown: a backend menu item with no React
// page yet, an address that matches no route, or a page that failed to load.
// `onRetry` adds a "Try again" button (for a failed load); `detail` is the small
// technical reason under the message.
export function PageNotAvailable({ onRetry, detail }: { onRetry?: () => void; detail?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-surface-alt px-6 py-10 text-center">
      <Illustration />
      <h2 className="mt-2 text-3xl font-extrabold text-text!">
        Page <span className="text-brand">Not Available</span>
      </h2>
      <p className="mt-3 max-w-lg text-sm text-text-muted">
        This page is under construction or has not been implemented yet.
        <br />
        We are working on it to bring you a complete and powerful experience soon.
      </p>
      {detail && <p className="mt-2 max-w-lg text-xs text-text-faint break-words">{detail}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover"
          >
            <RotateCcw size={15} /> Try again
          </button>
        )}
        <Link to={ROUTES.home} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Home size={15} /> Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
