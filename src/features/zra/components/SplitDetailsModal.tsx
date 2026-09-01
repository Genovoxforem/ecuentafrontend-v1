import { useState } from 'react'
import { X } from 'lucide-react'
import { useZraUpdateImport, type AsycudaImportRow } from '../asycudaImport.queries'
import { parseRowFields } from '../asycudaRowParser'
import { useProductSearch } from '../../products/products.queries'
import { isBackendUnavailable } from '../../../shared/components/BackendUnavailable'

// Real field values, parsed from the same <br>-joined HTML the main list
// row now renders natively — see asycudaRowParser.ts's own comment for
// where that shape comes from (zra-import_ajax.php's $data[] build).
function parseSplitDetails(row: AsycudaImportRow) {
  const f = parseRowFields(row)
  return {
    declRef: f.declRef,
    declNo: f.declNo,
    taskCode: f.taskCode,
    declDate: f.declDate,
    agent: f.agentName,
    invoiceTotal: f.price,
    country: f.currency,
    convRate: f.convRate,
    itemName: f.itemName,
    hsn: f.hsn,
    origin: f.origin,
    totalWeight: f.totalWeight,
    netWeight: f.netWeight,
    qtyUnit: f.qtyUnit,
    pkgUnit: f.pkgUnit,
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 py-1 text-sm">
      <span className="font-semibold text-text!">{label} :</span>
      <span className="text-text-muted">{value}</span>
    </div>
  )
}

function InfoCard({ title, right, children }: { title: string; right?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface-alt">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="font-semibold text-text!">{title}</span>
        {right && <span className="text-sm text-text-muted">{right}</span>}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

interface SplitLine {
  id: number
  seq: number
  query: string
  productId: string | null
  hsnCode: string
}

function ProductSearchCell({ line, onChange }: { line: SplitLine; onChange: (patch: Partial<SplitLine>) => void }) {
  const [open, setOpen] = useState(false)
  const { data: results } = useProductSearch(line.query)

  return (
    <div className="relative">
      <input
        type="text"
        value={line.query}
        onChange={(e) => {
          onChange({ query: e.target.value, productId: null })
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search"
        className="w-full h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
      />
      {open && results && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-64 max-h-48 overflow-y-auto rounded-md border border-border bg-surface shadow-lg soft-scrollbar">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange({ query: p.label, productId: p.id })
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-text hover:bg-surface-alt"
              >
                {p.label} <span className="text-text-faint">({p.ref})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

let nextSplitLineId = 1

export function SplitDetailsModal({ row, onClose, onApproved }: { row: AsycudaImportRow; onClose: () => void; onApproved: () => void }) {
  const details = parseSplitDetails(row)
  const [lines, setLines] = useState<SplitLine[]>([{ id: nextSplitLineId++, seq: 1, query: '', productId: null, hsnCode: '' }])
  const updateImport = useZraUpdateImport()

  function updateLine(id: number, patch: Partial<SplitLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }
  function addLine() {
    setLines((prev) => [...prev, { id: nextSplitLineId++, seq: prev.length + 1, query: '', productId: null, hsnCode: '' }])
  }
  function removeLine(id: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)))
  }

  function handleApproveSplit() {
    if (updateImport.isPending) return
    updateImport.mutate(
      {
        action: 'split-approve',
        item: {
          itemNm: details.itemName,
          itemSeq: String(row.itemSeq),
          hsCd: details.hsn,
          taskCd: details.taskCode,
          // The real dclDe submitted to ZRA is the raw YYYYMMDD value (see
          // Approve's data-dclde), not the "Y-m-d"-formatted display string
          // shown in this panel's header — that raw value doesn't survive
          // the row HTML's stripped Split offcanvas, so it's reconstructed
          // from the formatted one rather than sent wrong.
          dclDe: details.declDate.replace(/\D/g, ''),
          dclRefNum: details.declRef,
        },
        splitRows: lines.map((l) => ({ proid: l.productId ?? '', seqno: String(l.seq), tabsearch: l.query, hsncode: l.hsnCode })),
      },
      {
        onSuccess: (res) => {
          window.alert(res.status)
          onApproved()
        },
        // POST /api/zra/asycuda-imports/update/ 404s on this backend (see
        // BackendUnavailable.tsx) — same honest message as the Approve/Cancel actions in
        // AsycudaImportList.tsx instead of a raw "Request failed with status code 404".
        onError: (err) =>
          window.alert(
            isBackendUnavailable(err) ? "Updating ASYCUDA imports isn't available on this backend yet." : err instanceof Error ? err.message : 'Split approve failed — please try again.',
          ),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-4xl my-8 bg-surface border border-border rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-lg font-semibold text-text!">Split Details</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-muted hover:bg-surface-alt">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard title={`Task Code [ ${details.taskCode} ]`} right={`Decl Date : ${details.declDate}`}>
              <InfoRow label="Decl No" value={details.declNo} />
              <InfoRow label="Decl Ref" value={details.declRef} />
              <InfoRow label="Agent" value={details.agent} />
              <InfoRow label="Invoice Total" value={details.invoiceTotal} />
              <InfoRow label="Country" value={details.country} />
              <InfoRow label="Conv Rate" value={details.convRate} />
            </InfoCard>
            <InfoCard title="Item Details">
              <InfoRow label="Item Name" value={details.itemName} />
              <InfoRow label="HSN" value={details.hsn} />
              <InfoRow label="Origin" value={details.origin} />
              <InfoRow label="Total Weight" value={details.totalWeight} />
              <InfoRow label="Net Weight" value={details.netWeight} />
              <InfoRow label="Qty Unit" value={details.qtyUnit} />
              <InfoRow label="Pkg Unit" value={details.pkgUnit} />
              <InfoRow label="Rate" value={details.convRate} />
              <InfoRow label="Total Rate" value={details.invoiceTotal} />
            </InfoCard>
          </div>

          <div className="rounded-lg border border-border">
            <div className="px-4 py-2.5 border-b border-border bg-surface-alt font-semibold text-text! rounded-t-lg">Split Products</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface-alt">
                  <th className="font-medium px-3 py-2 w-16">Seq</th>
                  <th className="font-medium px-3 py-2">Search Product</th>
                  <th className="font-medium px-3 py-2">HSN Code</th>
                  <th className="font-medium px-3 py-2 w-40">Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={line.seq}
                        onChange={(e) => updateLine(line.id, { seq: Number(e.target.value) })}
                        className="w-14 h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <ProductSearchCell line={line} onChange={(patch) => updateLine(line.id, patch)} />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={line.hsnCode}
                        onChange={(e) => updateLine(line.id, { hsnCode: e.target.value })}
                        className="w-full h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button type="button" onClick={addLine} className="px-3 py-1.5 rounded-md text-xs font-medium bg-success text-white hover:opacity-90 mr-1">
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length <= 1}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-danger text-white hover:opacity-90 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleApproveSplit}
              disabled={updateImport.isPending}
              className="px-5 py-2 rounded-md text-sm font-medium bg-success text-white hover:opacity-90 disabled:opacity-60"
            >
              {updateImport.isPending ? 'Submitting…' : 'Approve Split Products'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
