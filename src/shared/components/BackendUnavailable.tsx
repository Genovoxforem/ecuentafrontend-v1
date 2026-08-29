import axios from 'axios'
import { CloudOff } from 'lucide-react'
import { Card } from './dashboard/DashboardKit'

// The frontend was built and tested all session against one backend
// (ecnta10). The team switched to a different, currently-active backend
// (ecuenta9) that's missing several whole api/ directories this app calls —
// confirmed via a full directory diff between the two installs, cross-
// referenced against what's actually called from src/ (see the migration
// plan). Those endpoints 404 (plain Apache 404 HTML, not a JSON error) since
// the PHP file/route simply doesn't exist there. Per a strict standing rule,
// no backend PHP may be edited to restore them — the honest frontend
// response is a clear "not available on this backend yet" state instead of
// a raw request-failed error or (worse) silently showing nothing.
export function isBackendUnavailable(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404
}

// A different, sneakier failure mode than a clean 404: some endpoints that
// DO still exist on ecuenta9 (e.g. api/products/index.php) don't route
// every `action` they used to — an unrecognized action silently falls
// through to that file's default handler and returns 200 success with the
// WRONG response shape (e.g. a product list) instead of erroring. A query
// that naively defaults a missing expected key to `[]` would make "this
// backend doesn't support this action" look identical to "this record
// genuinely has none" — so callers that hit this pattern throw an Error
// whose message starts with this marker instead, and check it with
// isBackendActionUnavailable() rather than silently swallowing it.
export const BACKEND_ACTION_UNAVAILABLE_PREFIX = 'BACKEND_ACTION_UNAVAILABLE:'
export function isBackendActionUnavailable(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith(BACKEND_ACTION_UNAVAILABLE_PREFIX)
}

// A third failure mode, specific to endpoints authenticated via the
// separate Dolibarr session cookie legacySession.ts establishes at login
// (societe/api/list.php, the Ledger/Warehouse/Menu HTML scrapes, etc.):
// that cookie is only ever (re)established at the moment of an actual
// login submit, using the password typed into the form — never persisted,
// so a resumed session (page reload, a tab left open) that never went
// through a fresh login has no way to redo it. The endpoint doesn't error
// when that cookie is stale or missing; it silently 200s with Dolibarr's
// own login page HTML instead of JSON (confirmed live by calling
// societe/api/list.php with no session cookie), which looks nothing like a
// clean 404 or a thrown network error. Callers that scrape/parse a legacy
// response should check for this (e.g. the raw body starting with '<'
// instead of parsing as JSON) and throw an Error whose message starts with
// this marker so isLegacySessionExpired() can catch it and point the user
// at the one real fix: sign out and back in.
export const LEGACY_SESSION_EXPIRED_PREFIX = 'LEGACY_SESSION_EXPIRED:'
export function isLegacySessionExpired(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith(LEGACY_SESSION_EXPIRED_PREFIX)
}

// Card-shaped empty state for a whole page/section whose data source is
// gone on this backend — same visual language as LegacyErrorCard
// (features/products/components/LegacyReportStates.tsx) but deliberately
// distinct from a transient error: this isn't something a Retry button can
// fix, so there isn't one.
export function BackendUnavailableCard({ feature }: { feature: string }) {
  return (
    <Card className="!bg-neutral-bg border-border items-center text-center gap-2 py-10">
      <CloudOff size={22} className="text-text-faint" />
      <p className="text-sm font-semibold text-text!">{feature} isn't available on this backend yet</p>
      <p className="text-xs text-text-faint max-w-sm">The API this depends on isn't present on the current server. This isn't a bug in the page — the data simply has nowhere to load from right now.</p>
    </Card>
  )
}

// Inline (non-Card) variant for smaller spots — a table tab, a dropdown, a
// dashboard tile — where a full bordered empty-state card would be too
// heavy for the space available.
export function BackendUnavailableInline({ feature }: { feature: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-6 text-center">
      <CloudOff size={16} className="text-text-faint" />
      <p className="text-xs text-text-faint">{feature} isn't available on this backend yet.</p>
    </div>
  )
}

// Shown for isLegacySessionExpired() failures — unlike BackendUnavailableCard,
// there IS something the user can do: `onLogout` should be AuthContext's
// `logout()`, which drops them back to the login screen. Signing back in
// re-runs establishLegacySession() with the password they type there,
// which is the only place that cookie can be (re)created.
export function LegacySessionExpiredCard({ feature, onLogout }: { feature: string; onLogout: () => void }) {
  return (
    <Card className="!bg-neutral-bg border-border items-center text-center gap-2 py-10">
      <CloudOff size={22} className="text-text-faint" />
      <p className="text-sm font-semibold text-text!">{feature} needs a fresh sign-in</p>
      <p className="text-xs text-text-faint max-w-sm">
        This data loads through a separate session that's only created when you sign in, and yours has expired or was never established. Sign out and back in to fix it.
      </p>
      <button
        type="button"
        onClick={onLogout}
        className="mt-1 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover"
      >
        Log out &amp; sign in again
      </button>
    </Card>
  )
}
