import { useState } from 'react'
import { Users, ChevronDown, LoaderCircle } from 'lucide-react'
import { useZraCustomerLookup, type ZraCustomerRecord } from '../zra.queries'
import { isBackendUnavailable, BackendUnavailableInline } from '../../../shared/components/BackendUnavailable'

const dash = (v: string) => (v && v !== 'null' ? v : '-')

const FIELD_LABELS: [keyof ZraCustomerRecord, string][] = [
  ['tpin', 'Taxpayer TPIN'],
  ['branchId', 'Branch ID'],
  ['customerNo', 'Customer NO'],
  ['taxpayerName', 'Taxpayer Name'],
  ['customerTpin', 'Customer TPIN'],
  ['phone', 'Telephone Number'],
  ['email', 'Email'],
  ['address', 'Address'],
]

function CustomerAccordionItem({ customer }: { customer: ZraCustomerRecord }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-border first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-text! hover:bg-surface-hover"
      >
        {customer.taxpayerName}
        <ChevronDown size={14} className={`shrink-0 text-text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-1.5">
          {FIELD_LABELS.map(([key, label]) => (
            <div key={key} className="flex items-center gap-4 text-sm">
              <span className="w-40 shrink-0 text-text-muted">{label} :</span>
              <span className="text-text!">{dash(customer[key])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Real "ZRA Customer" page (custom/zra/customer.php) is a live, read-only
// lookup against the ZRA gateway's /customers/selectCustomer endpoint by
// TPIN — returns every real customer record ZRA has for that TPIN, shown
// here as an accordion matching the real page's own layout.
export function ZraCustomerLookup() {
  const [tpin, setTpin] = useState('')
  const lookup = useZraCustomerLookup()

  function handleSearch() {
    if (!tpin.trim()) return
    lookup.mutate(tpin.trim())
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-text!">
        <Users size={20} className="text-brand" />
        ZRA Customer
      </h2>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text-muted">Search By Customer Tpin</span>
          <input
            type="text"
            value={tpin}
            onChange={(e) => setTpin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-10 w-72 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <button
          type="button"
          onClick={handleSearch}
          disabled={lookup.isPending || !tpin.trim()}
          className="flex items-center gap-1.5 h-10 px-4 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60"
        >
          {lookup.isPending ? <LoaderCircle size={14} className="animate-spin" /> : null}
          Fetch Details
        </button>
      </div>

      {lookup.isError && (
        isBackendUnavailable(lookup.error) ? (
          <BackendUnavailableInline feature="ZRA Customer lookup" />
        ) : (
          <p className="text-sm text-danger">
            {lookup.error instanceof Error ? lookup.error.message : 'Could not reach the ZRA gateway — please try again.'}
          </p>
        )
      )}

      {lookup.data && lookup.data.length === 0 && <p className="text-sm text-text-faint">No matching customer found for that TPIN.</p>}

      {lookup.data && lookup.data.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-alt overflow-hidden max-w-2xl">
          {lookup.data.map((customer, i) => (
            <CustomerAccordionItem key={`${customer.customerNo}-${i}`} customer={customer} />
          ))}
        </div>
      )}
    </div>
  )
}
