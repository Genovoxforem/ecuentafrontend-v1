import { useState } from 'react'
import { FileMinus, Scale, ShoppingCart, Truck, Undo2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { monthEnd, monthStart, today, usDate } from '../reportFormat'
import { choices } from '../receivablesClassic.data'
import { usePayablesList, usePurchaseOrderList, useVendorBalance, useVendorBalanceOptions, useVendorReport, type PayablesListKind } from '../payablesClassic.data'
import { RangeBar, ReportError, ReportLoading, SelectField } from './ReportWidgets'
import { Status, TableWithTotals, Title } from './ReceivablesReportViews'

// The Payables reports of the Reports Center, laid out as the classic pages are (period, filters, heading, table) and filled from the classic page
// (payablesClassic.data.ts). Nothing here is computed: the rows, the totals and the status words are the classic page's.

// ---- Purchase Order List (fourn/commande/listreport.php) ----------------------------------------------------------------------------------------------

export function PurchaseOrderListView() {
  const [range, setRange] = useState({ start: today(), end: today() })
  const [salesRep, setSalesRep] = useState('')
  const [user, setUser] = useState('')
  const [productCategory, setProductCategory] = useState('')
  const q = usePurchaseOrderList({ ...range, salesRep, user, productCategory })
  const o = q.data?.options
  return (
    <div className="space-y-4">
      <Title icon={ShoppingCart}>Purchase Order List</Title>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} label="Report period" buttonLabel="View Report" onApply={(start, end) => setRange({ start, end })}>
        <SelectField label="Sales representative" value={salesRep} onChange={setSalesRep} options={choices(o?.salesReps, ['', '0'])} blank="" />
        <SelectField label="User" value={user} onChange={setUser} options={choices(o?.users, ['', '-1'])} blank="Select a users" />
        <SelectField label="Product category" value={productCategory} onChange={setProductCategory} options={choices(o?.productCategories, ['', '-1', '0'])} blank="" />
      </RangeBar>
      <div className="text-center">
        <p className="text-base font-bold uppercase text-text!">Purchase Order List</p>
        <p className="text-sm text-text-muted">
          For the period of {range.start} To {range.end}
        </p>
      </div>
      <Status q={q} label="Loading the purchase orders…" />
      {q.data && <TableWithTotals title="Purchase Order List" table={q.data.table} />}
    </div>
  )
}

// ---- Vendor Report (compta/resultat/vendor_report.php?type=f) -----------------------------------------------------------------------------------------

// The classic page opens on the current month.
export function VendorReportClassicView() {
  const [range, setRange] = useState({ start: monthStart(), end: monthEnd() })
  const [tag, setTag] = useState('')
  const [salesRep, setSalesRep] = useState('')
  const q = useVendorReport(range.start, range.end, tag, salesRep)
  return (
    <div className="space-y-4">
      <Title icon={Truck}>Vendor Report</Title>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} label="Report period" buttonLabel="View Report" onApply={(start, end) => setRange({ start, end })}>
        <SelectField label="Vendors tags/categories" value={tag} onChange={setTag} options={choices(q.data?.options.tags, ['', '0'])} blank="Select Tag/Category" />
        <SelectField label="Sales representatives" value={salesRep} onChange={setSalesRep} options={choices(q.data?.options.salesReps, ['', '0'])} blank="" />
      </RangeBar>
      <div className="text-center">
        <p className="text-base font-bold uppercase text-text!">Vendors Report</p>
        <p className="text-sm text-text-muted">
          For the period of {range.start} To {range.end}
        </p>
      </div>
      <Status q={q} label="Loading the vendors…" />
      {q.data && <TableWithTotals title="Vendors Report" table={q.data.table} hiddenColumns={['']} />}
    </div>
  )
}

// ---- Vendor Balance (compta/resultat/vendor_balance.php) ----------------------------------------------------------------------------------------------

// The classic page shows the form only and prints the report after "View Report" (a third party, or All, must be chosen).
export function VendorBalanceView() {
  const options = useVendorBalanceOptions()
  const [range, setRange] = useState({ start: today(), end: today() })
  const [vendor, setVendor] = useState('')
  const [asked, setAsked] = useState<{ start: string; end: string; vendor: string } | null>(null)
  const [needVendor, setNeedVendor] = useState(false)
  const q = useVendorBalance(asked?.start ?? '', asked?.end ?? '', asked?.vendor ?? '')
  const vendors = choices(options.data?.vendors, [''])
  const shown = asked ? vendors.find((v) => v.value === asked.vendor)?.label : undefined
  return (
    <div className="space-y-4">
      <Title icon={Scale}>Vendor Balances</Title>
      <RangeBar
        key={`${range.start}|${range.end}`}
        start={range.start}
        end={range.end}
        label="Report Period"
        buttonLabel="View Report"
        onApply={(start, end) => {
          setRange({ start, end })
          if (!vendor) {
            setNeedVendor(true)
            return
          }
          setNeedVendor(false)
          setAsked({ start, end, vendor })
        }}
      >
        <SelectField label="Vendor Name" value={vendor} onChange={(v) => { setVendor(v); setNeedVendor(false) }} options={vendors} blank="Select a Third Party" />
      </RangeBar>
      {options.isError && <ReportError error={options.error} onRetry={() => void options.refetch()} />}
      {needVendor && <p className="text-sm text-danger-fg">Select a third party, or All, to view the balance.</p>}
      {asked && (
        <>
          <div className="text-center">
            <p className="text-base font-bold uppercase text-text!">Vendor Balance</p>
            {shown && vendor !== 'all' && <p className="text-sm font-semibold text-text">{shown}</p>}
            <p className="text-sm text-text-muted">
              For the period of {usDate(asked.start)}-{usDate(asked.end)}
            </p>
          </div>
          {q.isLoading && <ReportLoading label="Loading the vendor balance…" />}
          {q.isError && <ReportError error={q.error} onRetry={() => void q.refetch()} />}
          {q.data?.table && <TableWithTotals title="Vendor Balance" table={q.data.table} />}
          {q.data && !q.data.table && (
            <Card className="!h-auto">
              <p className="text-sm italic text-text-faint">No Data Available In Table</p>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// ---- Vendor Credit Note Details, Credit Note Aging Report, Refund History ----------------------------------------------------------------------------

const LISTS: Record<PayablesListKind, { icon: LucideIcon; heading: string; loading: string; dates: 'for' | 'arrow' }> = {
  creditNotes: { icon: FileMinus, heading: 'Vendor Credit Note Detail', loading: 'Loading the vendor credit notes…', dates: 'for' },
  creditNoteAging: { icon: FileMinus, heading: 'Vendor Credit Note Aging', loading: 'Loading the vendor credit note aging…', dates: 'arrow' },
  refundHistory: { icon: Undo2, heading: 'Vendor Refund History', loading: 'Loading the vendor refunds…', dates: 'for' },
}

// The classic page has no period box (it always prints today); it does honour `newdatepicker`, so the period can be chosen here.
export function PayablesListView({ kind, title }: { kind: PayablesListKind; title: string }) {
  const [range, setRange] = useState({ start: today(), end: today() })
  const q = usePayablesList(kind, range.start, range.end)
  const l = LISTS[kind]
  return (
    <div className="space-y-4">
      <Title icon={l.icon}>{title}</Title>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} label="Report period" buttonLabel="View Report" onApply={(start, end) => setRange({ start, end })} />
      <div className="text-center">
        <p className="text-base font-bold uppercase text-text!">{l.heading}</p>
        <p className="text-sm text-text-muted">{l.dates === 'for' ? `For the period of ${range.start} To ${range.end}` : `${range.start} → ${range.end}`}</p>
      </div>
      <Status q={q} label={l.loading} />
      {q.data && <TableWithTotals title={l.heading} table={q.data.table} />}
    </div>
  )
}
