import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Loader2 } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { TableExportButtons } from '../../../../shared/components/TableExportButtons'
import { resolveLegacyRoute } from '../../../../shared/legacyRoute'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useVatByCustomer, type VatByCustomerFilters } from '../../vatByCustomer.queries'
import type { VatCustomerLink, VatCustomerSection } from '../../vatByCustomerParser'

const inputCls = 'h-9 rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const th = 'px-3 py-2.5 text-xs font-semibold text-text whitespace-nowrap'
const num = 'px-3 py-2 text-right tabular-nums whitespace-nowrap'

// "customer1" -> "CU", "Abinav Traders" -> "AT": the letters the backend puts in its avatar circle.
function initials(name: string): string {
  const words = name.trim().split(/\s+/)
  return (words.length > 1 ? words[0][0] + words[1][0] : name.trim().slice(0, 2)).toUpperCase()
}

// "dd-mm-yyyy" for the caption, from the ISO dates.
const dmy = (iso: string) => iso.split('-').reverse().join('-')

function RouteLink({ item, className = 'text-brand hover:underline' }: { item: VatCustomerLink; className?: string }) {
  const to = resolveLegacyRoute(item.href)
  return to ? (
    <Link to={to} className={className}>
      {item.text}
    </Link>
  ) : (
    <>{item.text}</>
  )
}

function Avatar({ name }: { name: string }) {
  return <span className="mr-1.5 inline-grid h-6 w-6 place-items-center rounded-full bg-brand align-middle text-[10px] font-bold text-white">{initials(name)}</span>
}

function SectionTable({ section, isVendors }: { section: VatCustomerSection; isVendors: boolean }) {
  const [refHead, dateHead, payHead, , descHead, amountHead, percentHead, netHead, taxHead] = section.headers
  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className={`${th} text-left`}>{refHead}</th>
              <th className={`${th} text-left`}>{dateHead}</th>
              <th className={`${th} text-left`}>{payHead}</th>
              <th className={`${th} text-right`}>{isVendors ? 'Vendor' : 'Rate'}</th>
              <th className={`${th} text-left`}>{descHead}</th>
              <th className={`${th} text-right`}>{amountHead}</th>
              <th className={`${th} text-right`}>{percentHead}</th>
              <th className={`${th} text-right`}>{netHead}</th>
              <th className={`${th} text-right`}>{taxHead}</th>
            </tr>
          </thead>
          <tbody>
            {section.groups.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center italic text-text-faint">
                  Nothing in this period.
                </td>
              </tr>
            )}
            {section.groups.map((g, gi) => (
              <GroupRows key={`${g.party.text}-${gi}`} group={g} isVendors={isVendors} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function GroupRows({ group, isVendors }: { group: VatCustomerSection['groups'][number]; isVendors: boolean }) {
  return (
    <>
      <tr className="border-b border-border bg-surface/60">
        <td colSpan={9} className="px-3 py-2.5 text-center text-sm text-text">
          Third-Party: <Avatar name={group.party.text} />
          <RouteLink item={group.party} className="font-medium text-brand hover:underline" />
          {group.note && <div className="text-xs text-text-faint">{group.note}</div>}
        </td>
      </tr>
      {group.lines.map((l, i) => (
        <tr key={`${l.ref.text}-${i}`} className="border-b border-border align-top">
          <td className="whitespace-nowrap px-3 py-2 text-text!">
            <RouteLink item={l.ref} />
          </td>
          <td className="whitespace-nowrap px-3 py-2 text-text-muted">{l.date}</td>
          <td className="whitespace-nowrap px-3 py-2 text-text-muted">{l.datePayment}</td>
          <td className="px-3 py-2 text-right tabular-nums text-text">{isVendors ? <RouteLink item={l.rateOrParty} /> : l.rateOrParty.text}</td>
          <td className="min-w-56 px-3 py-2 text-text">
            {l.productRef && (
              <span className="mr-1 text-xs text-text-faint">
                {resolveLegacyRoute(l.productHref) ? (
                  <Link to={resolveLegacyRoute(l.productHref) as string} className="hover:underline">
                    {l.productRef}
                  </Link>
                ) : (
                  l.productRef
                )}
              </span>
            )}
            {l.description && <span>- {l.description}</span>}
          </td>
          <td className={num}>{l.amount}</td>
          <td className={num}>{l.payment}</td>
          <td className={num}>{l.net}</td>
          <td className={num}>{l.tax}</td>
        </tr>
      ))}
      <tr className="border-b border-border bg-surface font-semibold text-text!">
        <td colSpan={7} className="px-3 py-2 text-right">
          Total:
        </td>
        <td className={num}>{group.totalNet}</td>
        <td className={num}>{group.totalTax}</td>
      </tr>
    </>
  )
}

// The backend's own "Report by customer - Sales tax" (compta/tva/clients.php): the invoices of the
// period grouped by third party, customers first and vendors after, and the VAT left to pay.
export function VatReportByCustomerPage() {
  const [applied, setApplied] = useState<VatByCustomerFilters>({ dateStart: '', dateEnd: '', min: '' })
  const [draft, setDraft] = useState<VatByCustomerFilters | null>(null)
  const { data, isLoading, isFetching, isError, error, refetch } = useVatByCustomer(applied)

  const form: VatByCustomerFilters = draft ?? { dateStart: data?.dateStart ?? '', dateEnd: data?.dateEnd ?? '', min: data?.min ?? '' }
  const patch = (p: Partial<VatByCustomerFilters>) => setDraft({ ...form, ...p })

  const exportData = () => ({
    headers: ['Section', 'Third-party', 'Invoice', 'Invoice date', 'Date of payment', 'Rate / vendor', 'Description', 'Amount (excl. tax)', 'Payment (%/invoice)', 'Net', 'Tax'],
    rows: (data?.sections ?? []).flatMap((s) =>
      s.groups.flatMap((g) => [
        ...g.lines.map((l) => [s.headers[0], g.party.text, l.ref.text, l.date, l.datePayment, l.rateOrParty.text, [l.productRef, l.description].filter(Boolean).join(' - '), l.amount, l.payment, l.net, l.tax]),
        [s.headers[0], g.party.text, 'Total:', '', '', '', '', '', '', g.totalNet, g.totalTax],
      ]),
    ),
  })

  return (
    // The title and filters stay at the top and the VAT to pay at the bottom; the invoices scroll.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <BarChart3 size={20} className="text-brand" /> Report By Customer - Sales Tax
          </h2>
          {data && <TableExportButtons title="Report by customer - Sales tax" getExportData={exportData} />}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setApplied(form)
            setDraft(null)
          }}
          className="grid grid-cols-1 gap-3 md:grid-cols-[auto_10rem_auto] md:items-end"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-text-faint">Report period</span>
            <div className="flex items-center gap-2">
              <input type="date" value={form.dateStart} onChange={(e) => patch({ dateStart: e.target.value })} className={inputCls} aria-label="Start date" />
              <span className="text-text-faint">-</span>
              <input type="date" value={form.dateEnd} onChange={(e) => patch({ dateEnd: e.target.value })} className={inputCls} aria-label="End date" />
            </div>
          </div>
          <label className="space-y-1">
            <span className="text-xs font-medium text-text-faint">Sales turnover minimum</span>
            <input value={form.min} onChange={(e) => patch({ min: e.target.value })} inputMode="decimal" className={`${inputCls} w-full`} />
          </label>
          <button type="submit" disabled={isFetching} className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
            {isFetching && <Loader2 size={14} className="animate-spin" />} View Report
          </button>
        </form>
      </div>

      <div className={`flex-1 min-h-0 overflow-auto space-y-4 px-6 py-4 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
        {isLoading && <LegacyLoadingCard label="Loading the sales tax report…" />}
        {isError && <LegacyErrorCard title="Couldn't load the sales tax report" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
        {data && (
          <>
            <p className="text-sm text-text-muted">
              For The Period of {dmy(data.dateStart)} To {dmy(data.dateEnd)}
            </p>
            {data.sections.map((s, i) => (
              <SectionTable key={s.headers[0] ?? i} section={s} isVendors={/vendor|supplier/i.test(s.headers[0] ?? '')} />
            ))}
          </>
        )}
      </div>

      {data && (
        <div className="flex items-center justify-between border-t border-border bg-surface px-6 py-3 text-sm font-semibold text-text!">
          <span>Total to pay</span>
          <span className="tabular-nums">{data.totalToPay}</span>
        </div>
      )}
    </div>
  )
}
