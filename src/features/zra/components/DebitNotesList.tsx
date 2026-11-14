import { useState } from 'react'
import { FileMinus, Loader2, UploadCloud } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { LegacyListPage } from '../../generalLedger/components/LegacyListPage'
import { DEBIT_NOTES_PATH, useSyncDebitNotes, type DebitNoteSyncResult } from '../debitNotes.data'

const queryParam = (href: string | null, name: string) => new URLSearchParams((href ?? '').split('?')[1] ?? '').get(name) ?? ''

// "Debit Notes" (custom/zra/debitnote_list.php): one row per debit note with its own ZRA status and
// message. Tick debit notes and press "Upload selected to ZRA": that sends the ticked ids to the live
// ZRA gateway and answers per debit note (shown below and, after the refresh, in each row's ZRA
// Status / ZRA Message), exactly like the backend page. Debit notes the gateway already accepted come
// back without a checkbox and cannot be ticked.
export function DebitNotesList() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [outcome, setOutcome] = useState<DebitNoteSyncResult | null>(null)
  const sync = useSyncDebitNotes()
  const confirm = useConfirm()

  const send = async () => {
    if (selected.size === 0) return
    const ok = await confirm({
      title: 'Upload debit notes to ZRA?',
      message: `Send ${selected.size} debit note${selected.size === 1 ? '' : 's'} to the ZRA gateway now?`,
      warningTitle: 'This submits to the live ZRA gateway.',
      warningMessage: 'The gateway records what it accepts; it cannot be undone from here.',
      variant: 'default',
      confirmLabel: 'Upload to ZRA',
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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {outcome && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${outcome.synced === outcome.total ? 'border-success/40 bg-success-bg/50 text-success-fg' : 'border-warning/40 bg-warning-bg/50 text-text'}`}>
          <p className="font-medium">
            Uploaded {outcome.synced} of {outcome.total} debit note(s)
          </p>
          {outcome.results
            .filter((r) => !r.ok)
            .map((r) => (
              <p key={r.id} className="mt-1">
                Debit note #{r.id}: {r.code ? `${r.code} — ` : ''}
                {r.message || 'Failed'}
              </p>
            ))}
        </div>
      )}
      {sync.isError && (
        <div className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
          {sync.error instanceof Error ? sync.error.message : 'The upload request failed.'}
        </div>
      )}
      <LegacyListPage
        icon={FileMinus}
        title="Debit Notes"
        path={DEBIT_NOTES_PATH}
        firstHeader={/^$/}
        hasHeader={/^Ref$/}
        emptyText="No debit notes found"
        noFilters
        rowSelect={{ selected, onChange: setSelected }}
        toolbar={
          <button
            type="button"
            onClick={send}
            disabled={sync.isPending || selected.size === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60"
          >
            {sync.isPending ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            {sync.isPending ? 'Uploading…' : `Upload selected to ZRA${selected.size ? ` (${selected.size})` : ''}`}
          </button>
        }
        linkFor={(header, cell) => {
          // The Ref cell opens the debit note's own invoice page (compta/sales/card.php?facid=N).
          if (/^Ref/i.test(header) && cell.href?.includes('/compta/sales/card.php')) {
            const id = queryParam(cell.href, 'facid') || queryParam(cell.href, 'id')
            return id ? ROUTES.invoiceDetail.replace(':id', id) : null
          }
          return null
        }}
      />
    </div>
  )
}
