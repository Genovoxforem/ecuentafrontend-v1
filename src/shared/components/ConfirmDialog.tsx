import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Trash2, X, type LucideIcon } from 'lucide-react'

export interface ConfirmOptions {
  title: string
  // The main question line, e.g. "Are you sure you want to delete Payroll_0006476?" —
  // pass a string or JSX (e.g. to bold the subject's name).
  message: ReactNode
  // The red/warning callout box under the message. Defaults match the
  // standard "this is destructive" copy; pass warningTitle="" to omit the
  // box entirely for a non-destructive confirm.
  warningTitle?: string
  warningMessage?: string
  confirmLabel?: string
  cancelLabel?: string
  // 'danger' (default): red trash icon/button, for deletes. 'default':
  // brand-colored warning icon/button, for non-destructive confirmations
  // (enable/disable, submit, etc.).
  variant?: 'danger' | 'default'
  icon?: LucideIcon
}

type PendingConfirm = ConfirmOptions & { resolve: (ok: boolean) => void }

// A bare string is shorthand for the common one-liner case: the wording
// decides the styling — delete/remove/reject/"cannot be undone" get the red
// destructive dialog, anything else the neutral brand one.
export type ConfirmInput = string | ConfirmOptions

function normalize(input: ConfirmInput): ConfirmOptions {
  if (typeof input !== 'string') return input
  const destructive = /\b(delete|remove|reject|discard)\b|cannot be undone|can't be undone/i.test(input)
  return destructive
    ? { title: 'Are you sure?', message: input, variant: 'danger' }
    : { title: 'Please confirm', message: input, variant: 'default' }
}

const ConfirmContext = createContext<((options: ConfirmInput) => Promise<boolean>) | null>(null)

// App-wide replacement for window.confirm()'s blocking, unstyled browser
// dialog — one modal instance mounted at the app root (see App.tsx),
// imperatively triggered via useConfirm(). Every call site that used to do
// `if (!window.confirm(msg)) return` becomes `if (!(await confirm({...))))
// return` — same control flow, real UI instead of the browser's own popup.
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback((input: ConfirmInput) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setPending({ ...normalize(input), resolve })
    })
  }, [])

  const settle = (ok: boolean) => {
    resolverRef.current?.(ok)
    resolverRef.current = null
    setPending(null)
  }

  const isDanger = (pending?.variant ?? 'danger') === 'danger'
  const Icon = pending?.icon ?? (isDanger ? Trash2 : AlertTriangle)
  const warningTitle = pending?.warningTitle ?? (isDanger ? 'This action cannot be undone.' : undefined)
  const warningMessage = pending?.warningMessage ?? (isDanger ? 'All associated data will be permanently removed from the system.' : undefined)

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4" onClick={() => settle(false)}>
          <div className="relative bg-surface-alt rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => settle(false)} className="absolute top-4 right-4 text-text-faint hover:text-text">
              <X size={18} />
            </button>

            <div className={`mx-auto w-14 h-14 rounded-full grid place-items-center mb-4 ${isDanger ? 'bg-danger-bg text-danger' : 'bg-brand/10 text-brand'}`}>
              <Icon size={26} />
            </div>

            <h3 className="text-lg font-bold text-text!">{pending.title}</h3>
            <p className="text-sm text-text-muted mt-1.5 whitespace-pre-line">{pending.message}</p>

            {warningTitle && (
              <div className="flex items-start gap-2.5 text-left rounded-lg bg-danger-bg border border-danger/30 px-3.5 py-3 mt-4">
                <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-danger">{warningTitle}</p>
                  {warningMessage && <p className="text-xs text-danger/80 mt-0.5">{warningMessage}</p>}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => settle(false)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text hover:bg-surface-hover"
              >
                {pending.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => settle(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
                  isDanger ? 'bg-danger hover:bg-danger/90' : 'bg-brand hover:bg-brand-hover'
                }`}
              >
                <Icon size={15} /> {pending.confirmLabel ?? (isDanger ? 'Delete' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

// Returns an imperative confirm(options) => Promise<boolean> — await it in
// place of window.confirm(). Must be called under ConfirmDialogProvider
// (mounted once at the app root).
export function useConfirm(): (options: ConfirmInput) => Promise<boolean> {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm() must be used within ConfirmDialogProvider')
  return ctx
}
