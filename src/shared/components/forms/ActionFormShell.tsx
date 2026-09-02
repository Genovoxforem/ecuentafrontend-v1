import type { ComponentType, ReactNode } from 'react'
import { Check, Info, LoaderCircle } from 'lucide-react'
import { Card } from '../dashboard/DashboardKit'

// Shared chrome for the Payroll "Add X" forms that DO have a real write
// endpoint (payroll/ajax.php — see payrollActions.queries.ts) but no read
// API to list what's already been saved. Each page supplies its own field
// grid as children; this handles the header, the real-endpoint banner, the
// success/error state, and the honest "no list" note underneath.
export function ActionFormShell({
  icon: Icon,
  title,
  sourcePath,
  children,
  onSubmit,
  isPending,
  isSuccess,
  successMessage,
  errorMessage,
  onAddAnother,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  sourcePath: string
  children: ReactNode
  onSubmit: () => void
  isPending: boolean
  isSuccess: boolean
  successMessage: string
  errorMessage: string
  onAddAnother: () => void
}) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Icon size={20} className="text-brand" /> {title}
      </h2>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">{sourcePath}</code>. This form posts directly to that page's own real write endpoint (
          <code className="font-mono">payroll/ajax.php</code>) — the record is genuinely saved. There's no matching JSON read endpoint though, so the list
          below can't be shown here; view it on the classic page to confirm.
        </p>
      </Card>

      {isSuccess ? (
        <Card className="!h-auto flex flex-col items-center gap-2 py-8 text-center">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-success-bg text-success-fg">
            <Check size={20} />
          </span>
          <p className="text-sm font-medium text-text!">{successMessage}</p>
          <button type="button" onClick={onAddAnother} className="mt-2 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover">
            Add another
          </button>
        </Card>
      ) : (
        <Card className="!h-auto space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
          {errorMessage && <p className="text-xs text-danger">{errorMessage}</p>}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={isPending}
              onClick={onSubmit}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {isPending && <LoaderCircle size={13} className="animate-spin" />} Save
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
