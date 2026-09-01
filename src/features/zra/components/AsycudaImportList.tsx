import { useState } from 'react'
import { FileInput, RefreshCw, Info, ChevronDown, PackagePlus, SplitSquareHorizontal, CircleCheck, XCircle, Search as SearchIcon } from 'lucide-react'
import { useAsycudaImportList, useAsycudaImportCount, useZraUpdateImport, type AsycudaImportRow, type AsycudaUpdateItem } from '../asycudaImport.queries'
import { parseRowFields, parseActionsState } from '../asycudaRowParser'
import { CreateProductModal } from './CreateProductModal'
import { SplitDetailsModal } from './SplitDetailsModal'
import { CancelReasonModal } from './CancelReasonModal'
import { SuggestionsModal } from './SuggestionsModal'
import { ListPagination, PER_PAGE, SearchBox } from './ZraListChrome'
import { isLegacySessionExpired } from '../../../shared/components/BackendUnavailable'

// The approve/cancel/split-approve mutations below all submit to the LIVE
// ZRA gateway through custom/zra/zraupdateimport.php — a real, working
// endpoint on this backend (see asycudaImport.queries.ts). The one
// realistic failure mode for a same-origin, legacy-session-cookie-
// authenticated endpoint like this is a stale/missing session (see
// isLegacySessionExpired) — centralized here so all call sites give the
// same honest message instead of a raw error.
function describeUpdateError(err: unknown): string {
  if (isLegacySessionExpired(err)) return 'Your session has expired — log out and back in, then try again.'
  return err instanceof Error ? err.message : 'Update failed — please try again.'
}

const NOTES = [
  'Create Supplier by Selecting Imported Country (expect ZAMBIA) To Make Purchase as ASYCUDA Import',
  'Create Product by the Same Name of Imported Item Name In the ASYCUDA Import List',
  'Click Approve Button To Import Product To Zra Smart Invoice',
  'Once Succeeded You Get An Alert',
  'Create Purchase Invoice For the Approved Item To Update The Stock In Smart Invoice and in ECUENTA',
]

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

const btnCls = {
  primary: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-info text-white hover:opacity-90 disabled:opacity-60',
  warning: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-warning text-white hover:opacity-90 disabled:opacity-60',
  success: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-success text-white hover:opacity-90 disabled:opacity-60',
  danger: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-danger text-white hover:opacity-90 disabled:opacity-60',
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-text-faint">{children}</span>
}

// One row's Ref/Decl, Supplier/Agent, Item, Invoice, Quantity cells,
// rendered from the same real fields the old dangerouslySetInnerHTML cells
// carried — see asycudaRowParser.ts for where each value comes from.
function RowCells({ row }: { row: AsycudaImportRow }) {
  const f = parseRowFields(row)
  return (
    <>
      <td className="px-3 py-3 whitespace-nowrap text-sm">
        <p className="text-text!">
          Decl Ref: <span className="font-semibold">{f.declRef}</span>
        </p>
        <p>
          <Muted>Decl No:</Muted> {f.declNo}
        </p>
        <p>Task Code: {f.taskCode}</p>
        <p>
          <Muted>Decl Date:</Muted> {f.declDate}
        </p>
      </td>
      <td className="px-3 py-3 max-w-[220px] text-sm">
        <p className="text-text! font-medium truncate" title={f.supplierName}>
          {f.supplierName}
        </p>
        <p className="truncate" title={f.agentName}>
          <Muted>Agent:</Muted> {f.agentName}
        </p>
      </td>
      <td className="px-3 py-3 text-sm text-text!">{row.itemSeq}</td>
      <td className="px-3 py-3 max-w-[240px] text-sm">
        <p className="text-text! font-medium truncate" title={f.itemName}>
          {f.itemName}
        </p>
        <p className="text-xs truncate">
          <Muted>HSN:</Muted> {f.hsn} <Muted>| Origin:</Muted> {f.origin}
        </p>
        <p className="text-xs truncate">
          <Muted>Total Weight:</Muted> {f.totalWeight} <Muted>| Net Weight:</Muted> {f.netWeight}
        </p>
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-sm">
        <p>
          <Muted>Price:</Muted> <span className="text-text! font-semibold">{f.price}</span>
        </p>
        <p className="text-xs">
          <Muted>Country:</Muted> {f.currency} <Muted>| Conv Rate:</Muted> {f.convRate}
        </p>
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-sm">
        <p className="text-text!">{f.qtyOverPkg}</p>
        <p className="text-xs">
          <Muted>Qty Unit:</Muted> {f.qtyUnit} <Muted>| Pkg Unit:</Muted> {f.pkgUnit}
        </p>
      </td>
    </>
  )
}

export function AsycudaImportList() {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(PER_PAGE)
  const [declRefInput, setDeclRefInput] = useState('')
  const [declRefFilter, setDeclRefFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [createProductTaskCode, setCreateProductTaskCode] = useState<string | null>(null)
  const [splitRow, setSplitRow] = useState<AsycudaImportRow | null>(null)
  const [cancelItem, setCancelItem] = useState<AsycudaUpdateItem | null>(null)
  const [suggestionsRow, setSuggestionsRow] = useState<AsycudaImportRow | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)

  const { data, isLoading, isError, error, refetch } = useAsycudaImportList({ page, perPage, declRefNum: declRefFilter, search })
  const { data: totalCount } = useAsycudaImportCount(declRefFilter)
  const updateImport = useZraUpdateImport()

  const rows = data?.items ?? []
  const total = data?.total ?? 0

  function handleApprove(item: AsycudaUpdateItem) {
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

      <div className="rounded-lg border border-border bg-surface-alt text-sm text-text-muted">
        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          className="w-full flex items-center gap-1.5 px-3 py-2 font-medium text-text!"
        >
          <Info size={14} className="text-brand shrink-0" />
          <span>Note</span>
          {!notesOpen && <span className="text-text-faint font-normal truncate">— {NOTES[0]}</span>}
          <ChevronDown size={14} className={`ml-auto shrink-0 text-text-faint transition-transform ${notesOpen ? 'rotate-180' : ''}`} />
        </button>
        {notesOpen && (
          <ul className="space-y-1 list-disc list-inside px-3 pb-2.5 -mt-0.5">
            {NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-text-muted whitespace-nowrap">
          <select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value))
              setPage(1)
            }}
            className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          entries per page
        </label>

        <span className="hidden sm:block w-px h-6 bg-border mx-1" />

        <label className="text-xs font-medium text-text-muted whitespace-nowrap">Declaration reference number</label>
        <input
          type="text"
          value={declRefInput}
          onChange={(e) => setDeclRefInput(e.target.value)}
          className="h-9 w-48 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
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

        <div className="flex-1 min-w-[220px] sm:max-w-80 sm:ml-auto">
          <SearchBox
            value={searchInput}
            onChange={setSearchInput}
            onSubmit={() => {
              setPage(1)
              setSearch(searchInput.trim())
            }}
            placeholder="Search supplier, agent, product, HS code…"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-alt overflow-auto max-h-[65vh] soft-scrollbar">
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
                  {isLegacySessionExpired(error) ? (
                    <p className="px-3 py-8 text-center text-danger">Your session has expired — log out and back in, then retry.</p>
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
            {rows.map((row, i) => {
              const actions = parseActionsState(row.actionsHtml)
              return (
                <tr key={`${row.id}-${i}`} className="border-t border-border align-top hover:bg-surface-hover text-text-muted">
                  <td className="px-3 py-3 text-sm">{row.seqNo}</td>
                  <RowCells row={row} />
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {actions.kind === 'exact-match' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-warning-bg text-warning-fg whitespace-nowrap">
                          Product Already Exists
                        </span>
                      )}
                      {actions.kind === 'similar-matches' && (
                        <button type="button" onClick={() => setSuggestionsRow(row)} className={btnCls.primary}>
                          <SearchIcon size={12} /> View Suggestions
                        </button>
                      )}
                      {actions.kind === 'needs-create' && (
                        <button
                          type="button"
                          onClick={() => setCreateProductTaskCode(parseRowFields(row).taskCode)}
                          className={btnCls.primary}
                        >
                          <PackagePlus size={12} /> Create product
                        </button>
                      )}
                      {actions.kind !== 'exact-match' && (
                        <button type="button" onClick={() => setSplitRow(row)} className={btnCls.warning}>
                          <SplitSquareHorizontal size={12} /> Split
                        </button>
                      )}
                      {actions.kind !== 'similar-matches' && (
                        <button type="button" onClick={() => handleApprove(actions.updateItem)} disabled={updateImport.isPending} className={btnCls.success}>
                          <CircleCheck size={12} /> Approve
                        </button>
                      )}
                      <button type="button" onClick={() => setCancelItem(actions.updateItem)} className={btnCls.danger}>
                        <XCircle size={12} /> Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
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

      {suggestionsRow &&
        (() => {
          const actions = parseActionsState(suggestionsRow.actionsHtml)
          return actions.kind === 'similar-matches' ? (
            <SuggestionsModal
              itemName={parseRowFields(suggestionsRow).itemName}
              products={actions.similarProducts}
              baseItem={actions.updateItem}
              onClose={() => setSuggestionsRow(null)}
              onApproved={() => {
                setSuggestionsRow(null)
                refetch()
              }}
            />
          ) : null
        })()}

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
