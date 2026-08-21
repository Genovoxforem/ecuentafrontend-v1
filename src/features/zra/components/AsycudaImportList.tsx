import { useEffect, useState } from 'react'
import { FileInput, RefreshCw, Info } from 'lucide-react'
import { useAsycudaImportList, useAsycudaImportCount, useZraUpdateImport, type AsycudaImportRow, type AsycudaUpdateItem } from '../asycudaImport.queries'
import { CreateProductModal } from './CreateProductModal'
import { SplitDetailsModal } from './SplitDetailsModal'
import { CancelReasonModal } from './CancelReasonModal'
import { ListPagination, PER_PAGE } from './ZraListChrome'
import { isBackendUnavailable, BackendUnavailableInline } from '../../../shared/components/BackendUnavailable'

// The approve/cancel/split-approve mutations below all submit to the LIVE ZRA
// gateway through api/zra/asycuda-imports/update/, which is one of the
// api/zra/* routes missing entirely on this backend (see
// BackendUnavailable.tsx) — every one of those actions now 404s. Centralized
// here so the three call sites below (approve/cancel/split) all give the
// same honest message instead of a raw "Request failed with status code 404".
function describeUpdateError(err: unknown): string {
  if (isBackendUnavailable(err)) return "Updating ASYCUDA imports isn't available on this backend yet."
  return err instanceof Error ? err.message : 'Update failed — please try again.'
}

const NOTES = [
  'Create Supplier by Selecting Imported Country (expect ZAMBIA) To Make Purchase as ASYCUDA Import',
  'Create Product by the Same Name of Imported Item Name In the ASYCUDA Import List',
  'Click Approve Button To Import Product To Zra Smart Invoice',
  'Once Succeeded You Get An Alert',
  'Create Purchase Invoice For the Approved Item To Update The Stock In Smart Invoice and in ECUENTA',
]

// The row HTML below (declHtml/supplierHtml/itemHtml/invoiceHtml/
// quantityHtml/actionsHtml) is rendered verbatim from the real backend's
// /api/zra/asycuda-imports/ endpoint, which itself proxies the legacy
// ecuenta9 install's custom/zra/zra-import_ajax.php (see that file's
// $approveOnclick/$createProductOnclick/$splitOnclick/$cancelOnclick). Those
// buttons' onclick attributes call global window.fn* functions with the
// exact same {proid,itemNm,itemSeq,hsCd,taskCd,dclDe,dclRefNum} shape the
// legacy jQuery used — this bridges them into this app's own React state and
// the real /zra/asycuda-imports/update/ endpoint instead of duplicating the
// legacy jQuery. The per-row Suggestions modal markup is stripped server-side
// (legacy_strip_overlays, to keep payload size sane at ~2800 rows), so "View
// Suggestions" renders but has no panel to open.
declare global {
  interface Window {
    fnapproveasycuda?: (item: AsycudaUpdateItem) => void
    fnacancelasy?: (item: AsycudaUpdateItem) => void
    fnapprovesplitasycuda?: (item: unknown) => void
    fnaddnewproducts?: (taskCodeAndSeq: string) => void
  }
}

export function AsycudaImportList() {
  const [page, setPage] = useState(1)
  const [declRefInput, setDeclRefInput] = useState('')
  const [declRefFilter, setDeclRefFilter] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [createProductTaskCode, setCreateProductTaskCode] = useState<string | null>(null)
  const [splitRow, setSplitRow] = useState<AsycudaImportRow | null>(null)
  const [cancelItem, setCancelItem] = useState<AsycudaUpdateItem | null>(null)

  const { data, isLoading, isError, error, refetch } = useAsycudaImportList({ page, perPage: PER_PAGE, declRefNum: declRefFilter })
  const { data: totalCount } = useAsycudaImportCount(declRefFilter)
  const updateImport = useZraUpdateImport()

  const rows = data?.items ?? []
  const total = data?.total ?? 0

  // The real "Split" button uses Bootstrap's data-bs-toggle="offcanvas"
  // attribute-triggering (no JS function call to bridge, unlike
  // Approve/Cancel/Create product), and its own target panel is one of the
  // per-row elements stripped server-side — so it's intercepted here via
  // delegated click on the table instead, using data-row-idx on each <tr> to
  // find which row's data to hand to SplitDetailsModal.
  function handleTableClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    // "Create product" also carries data-bs-toggle="offcanvas" (targeting a
    // different panel, #offcanvasstockRight) — must check data-bs-target
    // specifically, not just presence of the toggle attribute, or clicking
    // "Create product" would incorrectly also open Split Details on top of it.
    const trigger = target.closest('[data-bs-toggle="offcanvas"]') as HTMLElement | null
    if (!trigger || !trigger.dataset.bsTarget?.startsWith('#splitorderDetails')) return
    const tr = target.closest('tr[data-row-idx]') as HTMLElement | null
    const idx = tr ? Number(tr.dataset.rowIdx) : NaN
    if (!Number.isNaN(idx) && rows[idx]) setSplitRow(rows[idx])
  }

  useEffect(() => {
    window.fnapproveasycuda = (item) => {
      if (updateImport.isPending) return
      updateImport.mutate(
        { action: 'approve', item },
        {
          onSuccess: (res) => {
            window.alert(res.status)
            refetch()
          },
          onError: (err) => window.alert(describeUpdateError(err)),
        },
      )
    }
    window.fnacancelasy = (item) => setCancelItem(item)
    // Only relevant inside SplitDetailsModal's own "Approve Split Products"
    // button, which calls the mutation directly rather than through this
    // bridge — kept defined in case anything else references it.
    window.fnapprovesplitasycuda = () => {}
    window.fnaddnewproducts = (taskCodeAndSeq: string) => {
      const taskCode = taskCodeAndSeq.split('_')[0]
      setCreateProductTaskCode(taskCode)
    }
    return () => {
      delete window.fnapproveasycuda
      delete window.fnacancelasy
      delete window.fnapprovesplitasycuda
      delete window.fnaddnewproducts
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateImport.isPending])

  // "Sync Imports" only pulls new rows in from the ZRA gateway — additive,
  // non-destructive — unlike Approve/Cancel/Split it's safe to leave wired.
  async function handleSync() {
    setSyncing(true)
    try {
      await refetch()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text!">
          <FileInput size={20} className="text-brand" />
          ZRA ASYCUDA Import Items
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-alt text-text-muted">{totalCount ?? '…'}</span>
        </h2>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          Sync Imports
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Declaration reference number</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={declRefInput}
              onChange={(e) => setDeclRefInput(e.target.value)}
              className="flex-1 h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button
              type="button"
              onClick={() => {
                setPage(1)
                setDeclRefFilter(declRefInput.trim())
              }}
              className="px-3 h-9 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90"
            >
              Filter
            </button>
            {declRefFilter && (
              <button
                type="button"
                onClick={() => {
                  setDeclRefInput('')
                  setDeclRefFilter('')
                  setPage(1)
                }}
                className="px-3 h-9 rounded-md text-sm font-medium bg-surface-alt text-text-muted hover:bg-surface-hover"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-alt px-4 py-3 text-sm text-text-muted">
          <p className="flex items-center gap-1.5 font-medium text-text! mb-1.5">
            <Info size={14} className="text-brand" /> Note
          </p>
          <ul className="space-y-1 list-disc list-inside">
            {NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="legacy-html rounded-xl border border-border bg-surface-alt overflow-auto max-h-[65vh] soft-scrollbar" onClick={handleTableClick}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface-alt">
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-3 py-3">#</th>
              <th className="font-medium px-3 py-3">Ref No &amp; Decl No</th>
              <th className="font-medium px-3 py-3">Supplier &amp; Agent</th>
              <th className="font-medium px-3 py-3">Seq</th>
              <th className="font-medium px-3 py-3">Item Details</th>
              <th className="font-medium px-3 py-3">Invoice Details</th>
              <th className="font-medium px-3 py-3">Quantity Details</th>
              <th className="font-medium px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-text-faint">
                  Loading…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={8} className="p-0">
                  {isBackendUnavailable(error) ? (
                    <BackendUnavailableInline feature="ZRA ASYCUDA Import Items" />
                  ) : (
                    <p className="px-3 py-8 text-center text-danger">Could not load ASYCUDA import items.</p>
                  )}
                </td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-text-faint">
                  No import items found. Click Sync Imports to fetch from ZRA.
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={`${row.id}-${i}`} data-row-idx={i} className="border-t border-border align-top hover:bg-surface-hover text-text-muted">
                <td className="px-3 py-3">{row.seqNo}</td>
                <td className="px-3 py-3 whitespace-nowrap" dangerouslySetInnerHTML={{ __html: row.declHtml }} />
                <td className="px-3 py-3 max-w-[220px]" dangerouslySetInnerHTML={{ __html: row.supplierHtml }} />
                <td className="px-3 py-3 text-text!">{row.itemSeq}</td>
                <td className="px-3 py-3 max-w-[240px]" dangerouslySetInnerHTML={{ __html: row.itemHtml }} />
                <td className="px-3 py-3 whitespace-nowrap" dangerouslySetInnerHTML={{ __html: row.invoiceHtml }} />
                <td className="px-3 py-3 whitespace-nowrap" dangerouslySetInnerHTML={{ __html: row.quantityHtml }} />
                <td className="px-3 py-3" dangerouslySetInnerHTML={{ __html: row.actionsHtml }} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} perPage={PER_PAGE} total={total} onPageChange={setPage} />

      {createProductTaskCode && (
        <CreateProductModal
          taskCode={createProductTaskCode}
          onClose={() => setCreateProductTaskCode(null)}
          onCreated={() => {
            setCreateProductTaskCode(null)
            refetch()
          }}
        />
      )}

      {splitRow && (
        <SplitDetailsModal
          row={splitRow}
          onClose={() => setSplitRow(null)}
          onApproved={() => {
            setSplitRow(null)
            refetch()
          }}
        />
      )}

      {cancelItem && (
        <CancelReasonModal
          itemName={cancelItem.itemNm}
          isSubmitting={updateImport.isPending}
          onClose={() => setCancelItem(null)}
          onConfirm={(reason) => {
            updateImport.mutate(
              { action: 'cancel', item: cancelItem, reason },
              {
                onSuccess: (res) => {
                  window.alert(res.status)
                  setCancelItem(null)
                  refetch()
                },
                onError: (err) => window.alert(describeUpdateError(err)),
              },
            )
          }}
        />
      )}

      {updateImport.isPending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="px-5 py-3 rounded-lg bg-surface border border-border shadow-xl text-sm font-medium text-text!">
            Wait till updating to ZRA server…
          </div>
        </div>
      )}
    </div>
  )
}
