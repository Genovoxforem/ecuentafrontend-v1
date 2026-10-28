import { useState } from 'react'
import { BookOpen, Pencil, CheckCircle2, Trash2, Truck } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useSalesInvoiceLedgerEntries, useDeleteSalesLedgerEntries, useSalesInvoiceShipment, useSaveSalesInvoiceShipment, type SalesShipmentDetails } from '../../salesInvoiceTabs.queries'
import { ActionButton, EmptyState, TabTitle } from './InvoiceDetailShared'

// Real compta/sales/api/ledgerentry.php-backed tab (sales_ledgerentry.js).
const SHIPMENT_FIELDS: SalesShipmentDetails = {
  gdn_no: '',
  grn_no: '',
  month_year: '',
  shipping_via: '',
  shipping_date: '',
  tracking_id: '',
  transporter: '',
  truck_details: '',
  shipping_address: '',
}

// Real compta/sales/api/shipment.php-backed tab (sales_shipment.js). The
// real page's own "Shipment / GRN Details" card is edit-toggled by an
// "+ Add"/pencil button, not always shown editable — matched here. The
// shipping-charges sub-feature (add_charge/get_totals) is real but
// unreachable in the live UI per confirmed research, so left out to match
// current real behavior rather than building a feature the real page
// itself doesn't expose yet.
export function ShipmentGrnTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useSalesInvoiceShipment(id)
  const save = useSaveSalesInvoiceShipment(id)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<SalesShipmentDetails>(SHIPMENT_FIELDS)

  if (isLoading) return <LegacyLoadingCard label="Loading shipment/GRN details…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load shipment/GRN details" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const s = data.shipment
  const hasAnyValue = Object.values(s).some((v) => v)
  const startEdit = () => {
    setForm(s)
    setEditing(true)
  }

  const fieldRows: [keyof SalesShipmentDetails, string, string][] = [
    ['gdn_no', 'GDN No.', 'GDN Number'],
    ['grn_no', 'GRN No.', 'GRN Number'],
    ['month_year', 'Month', 'e.g. January 2025'],
    ['shipping_via', 'Shipping Via', 'Via'],
    ['shipping_date', 'Shipping Date', 'Date'],
    ['tracking_id', 'Tracking ID', 'Tracking ID'],
    ['transporter', 'Transporter', 'Transporter name'],
    ['truck_details', 'Truck Details', 'Truck/Vehicle details'],
  ]

  return (
    <div className="space-y-3">
      <TabTitle>Shipment / GRN Details</TabTitle>
      <Card className="!h-auto">
        <div className="flex items-center justify-between mb-3">
          <span />
          {!editing && (
            <ActionButton tone="outline" icon={Pencil} onClick={startEdit}>
              {hasAnyValue ? 'Edit' : 'Add'}
            </ActionButton>
          )}
        </div>
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {fieldRows.map(([key, label, placeholder]) => (
                <label key={key} className="block text-sm">
                  <span className="mb-1 block text-xs font-medium text-brand">{label}</span>
                  <input
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </label>
              ))}
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-brand">Shipping Address</span>
              <textarea
                value={form.shipping_address}
                onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                placeholder="Address"
                rows={2}
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </label>
            {save.isError && <p className="text-xs text-danger">{save.error instanceof Error ? save.error.message : 'Could not save shipment/GRN details.'}</p>}
            <div className="flex gap-2">
              <ActionButton tone="success" icon={CheckCircle2} pending={save.isPending} onClick={() => save.mutate(form, { onSuccess: () => setEditing(false) })}>
                Save
              </ActionButton>
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-input-border text-text">
                Cancel
              </button>
            </div>
          </div>
        ) : hasAnyValue ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {fieldRows
              .filter(([key]) => s[key])
              .map(([key, label]) => (
                <div key={key} className="flex justify-between gap-3">
                  <span className="text-text-muted">{label}</span>
                  <span className="font-medium text-text! text-right">{s[key]}</span>
                </div>
              ))}
            {s.shipping_address && (
              <div className="sm:col-span-2">
                <p className="text-text-muted">Shipping Address</p>
                <p className="font-medium text-text! whitespace-pre-line">{s.shipping_address}</p>
              </div>
            )}
          </div>
        ) : (
          <EmptyState icon={Truck} message="No shipment/GRN details recorded for this invoice." />
        )}
      </Card>
    </div>
  )
}

export function LedgerEntryTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useSalesInvoiceLedgerEntries(id)
  const deleteEntries = useDeleteSalesLedgerEntries(id)
  const [confirming, setConfirming] = useState(false)

  if (isLoading) return <LegacyLoadingCard label="Loading ledger entries…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load ledger entries" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TabTitle count={data.count}>Ledger Entries</TabTitle>
        {/* Real page gates this on CAN_EDIT only (always shown for an
            editor), not on whether there are any entries yet — confirmed
            live, sales_ledgerentry.js render(). */}
        <ActionButton tone="danger" icon={Trash2} onClick={() => setConfirming(true)}>
          Delete Ledger Entries
        </ActionButton>
      </div>
      <Card className="!h-auto !p-0 overflow-hidden">
        {data.entries.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-10 text-center">
            <BookOpen size={28} className="text-text-faint" />
            <p className="text-sm text-text-faint">No ledger entries found.</p>
            <p className="text-xs text-text-faint">Entries are created when the invoice is transferred to accounting.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium px-4 py-2.5">Date</th>
                  <th className="font-medium px-4 py-2.5">Accounting Doc.</th>
                  <th className="font-medium px-4 py-2.5">Ref.</th>
                  <th className="font-medium px-4 py-2.5">Journal</th>
                  <th className="font-medium px-4 py-2.5">Account</th>
                  <th className="font-medium px-4 py-2.5">Label</th>
                  <th className="font-medium px-4 py-2.5 text-right">Debit</th>
                  <th className="font-medium px-4 py-2.5 text-right">Credit</th>
                  <th className="font-medium px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-text-muted">{e.date}</td>
                    <td className="px-4 py-2.5 text-text-muted">{e.piece}</td>
                    <td className="px-4 py-2.5 text-text-muted">{e.ref}</td>
                    <td className="px-4 py-2.5 text-text-muted">{e.journal}</td>
                    <td className="px-4 py-2.5 text-text-muted">{e.account}</td>
                    <td className="px-4 py-2.5 text-text!">{e.label}</td>
                    <td className="px-4 py-2.5 text-right text-text-muted">{e.debit}</td>
                    <td className="px-4 py-2.5 text-right text-text-muted">{e.credit}</td>
                    <td className="px-4 py-2.5 text-right text-text!">{e.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-end gap-6 px-4 py-3 border-t border-border text-sm">
              <span className="text-text-muted">
                Debit <span className="font-semibold text-text!">{data.total_debit}</span>
              </span>
              <span className="text-text-muted">
                Credit <span className="font-semibold text-text!">{data.total_credit}</span>
              </span>
              <span className="text-text-muted">
                Balance <span className="font-bold text-brand">{data.balance}</span>
              </span>
            </div>
          </>
        )}
      </Card>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirming(false)}>
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-text!">Delete all ledger entries?</h3>
            <p className="text-sm text-text-muted">This removes every ledger entry for this invoice. This cannot be undone.</p>
            {deleteEntries.isError && <p className="text-xs text-danger">{deleteEntries.error instanceof Error ? deleteEntries.error.message : 'Could not delete these entries.'}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-input-border text-text">
                Cancel
              </button>
              <ActionButton tone="danger" icon={Trash2} onClick={() => deleteEntries.mutate(undefined, { onSuccess: () => setConfirming(false) })} pending={deleteEntries.isPending}>
                Delete
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
