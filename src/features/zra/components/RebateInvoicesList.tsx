import { useState } from 'react'
import { Loader2, ReceiptText, UploadCloud } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { LegacyListPage } from '../../generalLedger/components/LegacyListPage'
import { useSyncRebates, type RebateSyncResult } from '../rebate.queries'

const queryParam = (href: string | null, name: string) => new URLSearchParams((href ?? '').split('?')[1] ?? '').get(name) ?? ''

// custom/zra/rebate_list.php — "Rebate Invoices (Value Credit Notes)": the
// real list, one row per rebate with its own ZRA status and message.
//
// Tick rebates and press "Sync selected to ZRA": that posts the ticked ids to
// custom/zra/rebate_ajax.php, which sends them to the live ZRA gateway and
// answers per rebate (shown below and, after the refresh, in each row's
// ZRA Status / ZRA Message), exactly like the backend page. Rebates the
// gateway already accepted come back with a disabled box and cannot be ticked.
export function RebateInvoicesList() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [outcome, setOutcome] = useState<RebateSyncResult | null>(null)
  const sync = useSyncRebates()
  const confirm = useConfirm()

  const send = async () => {
    if (selected.size === 0) return
    const ok = await confirm({
      title: 'Sync rebates to ZRA?',
      message: `Send ${selected.size} rebate invoice${selected.size === 1 ? '' : 's'} to the ZRA gateway now?`,
      warningTitle: 'This submits to the live ZRA gateway.',
      warningMessage: 'The gateway records what it accepts; it cannot be undone from here.',
      variant: 'default',
      confirmLabel: 'Sync to ZRA',
    })
    if (!ok) return
    setOutcome(null)
    sync.mutate([...selected], {
      onSuccess: (result) => {
        setOutcome(result)
        setSelected(new Set())
      },
    })
  }

  return (
    <div className="space-y-4">
      {outcome && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${outcome.synced === outcome.total ? 'border-success/40 bg-success-bg/50 text-success-fg' : 'border-warning/40 bg-warning-bg/50 text-text'}`}>
          <p className="font-medium">
            Synced {outcome.synced} of {outcome.total} rebate(s)
          </p>
          {outcome.results
            .filter((r) => !r.ok)
            .map((r) => (
              <p key={r.id} className="mt-1">
                Rebate #{r.id}: {r.code ? `${r.code} — ` : ''}
                {r.message || 'Failed'}
              </p>
            ))}
        </div>
      )}
      {sync.isError && (
        <div className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
          {sync.error instanceof Error ? sync.error.message : 'Sync request failed'}
        </div>
      )}
      <LegacyListPage
        icon={ReceiptText}
        title="Rebate Invoices (Value Credit Notes)"
        path="/custom/zra/rebate_list.php"
        firstHeader={/^$/}
        hasHeader={/^Ref$/}
        emptyText="No rebate invoices found"
        noFilters
        addTo={{ label: 'New Rebate', to: ROUTES.rebateInvoiceCreate }}
        rowSelect={{ selected, onChange: setSelected }}
        toolbar={
          <button
            type="button"
            onClick={send}
            disabled={sync.isPending || selected.size === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60"
          >
            {sync.isPending ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            {sync.isPending ? 'Syncing…' : `Sync selected to ZRA${selected.size ? ` (${selected.size})` : ''}`}
          </button>
        }
        linkFor={(header, cell) => {
          if (/^(Ref|Against Invoice)/i.test(header) && cell.href?.includes('/compta/sales/card.php')) {
            const id = queryParam(cell.href, 'id')
            return id ? ROUTES.invoiceDetail.replace(':id', id) : null
          }
          if (/^Customer/i.test(header) && cell.href?.includes('/societe/card.php')) {
            const socid = queryParam(cell.href, 'socid')
            return socid ? ROUTES.customerDetail.replace(':id', socid) : null
          }
          return null
        }}
      />
    </div>
  )
}
