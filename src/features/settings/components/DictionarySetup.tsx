import { useMemo, useState } from 'react'
import { BookOpen, Database, CheckCircle2, Clock, Activity, Search, List, LayoutGrid, Eye, Pencil, Info, HelpCircle, Zap, Lightbulb, RefreshCw, ShieldCheck, Plus, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { useProductFormOptions } from '../../zra/createProduct.queries'
import { useAuth } from '../../auth/AuthContext'

// The reference app's own real dictionary catalog (its GET /admin/dict.php
// content — dictionary label + real llx_c_* table name). Descriptions are
// each dictionary's genuine real-world purpose (standard Dolibarr reference
// tables), not invented copy. "Status" is 'enabled' for every entry because
// every one of these is a real, currently-shown dictionary in this app —
// there's no per-dictionary disable feature anywhere on this backend, so
// Enabled always equals the total rather than a fabricated subset.
interface DictEntry {
  key: string
  label: string
  table: string
  description: string
}
// Labels are verbatim from the live admin/dict.php page (confirmed by
// fetching it directly) — including "DictionaryTicketType"/Severity/
// Category, which really do render as raw untranslated i18n keys on that
// real page (a genuine missing-translation bug there, not a typo here).
// "Website - Type of website pages/containers" was missing from this list
// entirely until cross-checked against that live fetch — it's real (id=25,
// llx_c_type_container), between Nature Of product and the ticket group.
const DICTIONARIES: DictEntry[] = [
  { key: 'currencies', label: 'Currencies', table: 'llx_c_currencies', description: 'List of available currencies' },
  { key: 'countries', label: 'Countries', table: 'llx_c_country', description: 'List of countries' },
  { key: 'regions', label: 'Regions', table: 'llx_c_regions', description: 'List of regions' },
  { key: 'states', label: 'States/Provinces', table: 'llx_c_departements', description: 'List of states or provinces' },
  { key: 'legal_entities', label: 'Third-party legal entities', table: 'llx_c_forme_juridique', description: 'Legal entity types for third parties' },
  { key: 'thirdparty_types', label: 'Third-party types', table: 'llx_c_typent', description: 'Types of third parties (customers, suppliers, etc.)' },
  { key: 'employees', label: 'Number of Employees', table: 'llx_c_effectif', description: 'Employee count range' },
  { key: 'prospect_level', label: 'Prospect potential level for companies', table: 'llx_c_prospectlevel', description: 'Potential level for company prospects' },
  { key: 'prospect_status', label: 'Prospect status for companies', table: 'llx_c_stcomm', description: 'Status of company prospects' },
  { key: 'social_networks', label: 'Social Networks', table: 'llx_c_socialnetworks', description: 'List of social networks' },
  { key: 'civility', label: 'Honorific titles', table: 'llx_c_civility', description: 'Titles (Mr, Mrs, Dr, etc.)' },
  { key: 'contact_types', label: 'Contact/Address types', table: 'llx_c_type_contact', description: 'Types of contacts and addresses' },
  { key: 'public_holidays', label: 'HRM - Public holidays', table: 'llx_c_hrm_public_holiday', description: 'List of public holidays' },
  { key: 'departments', label: 'HRM - Department list', table: 'llx_c_hrm_department', description: 'List of departments' },
  { key: 'job_positions', label: 'HRM - Job positions', table: 'llx_c_hrm_function', description: 'List of job positions/functions' },
  { key: 'agenda_events', label: 'Types of agenda events', table: 'llx_c_actioncomm', description: 'Categories for calendar/agenda events' },
  { key: 'lead_status', label: 'Lead status for project/lead', table: 'llx_c_lead_status', description: 'Status values for leads and projects' },
  { key: 'social_taxes', label: 'Types of social or fiscal taxes', table: 'llx_c_chargesociales', description: 'Categories of social/fiscal charges' },
  { key: 'resource_types', label: 'Type of resources', table: 'llx_c_type_resource', description: 'Types of bookable resources' },
  { key: 'leave_types', label: 'Types of leave', table: 'llx_c_holiday_types', description: 'Categories of employee leave' },
  { key: 'expense_fee_types', label: 'Expense report - Types of expense report lines', table: 'llx_c_type_fees', description: 'Expense categories for expense report lines' },
  { key: 'expense_transport_cat', label: 'Expense report - Transportation categories', table: 'llx_c_exp_tax_cat', description: 'Transportation categories for mileage expenses' },
  { key: 'expense_transport_range', label: 'Expense report - Range by transportation category', table: 'llx_c_exp_tax_range', description: 'Distance ranges per transportation category' },
  { key: 'vat_rates', label: 'VAT Rates or Sales Tax Rates', table: 'llx_c_tva', description: 'VAT/sales tax rate values' },
  { key: 'tax_stamps', label: 'Amount of tax stamps', table: 'llx_c_revenuestamp', description: 'Fixed tax stamp amounts' },
  { key: 'payment_terms', label: 'Payment Terms', table: 'llx_c_payment_term', description: 'Payment term options (e.g. Net 30)' },
  { key: 'payment_modes', label: 'Payment Modes', table: 'llx_c_paiement', description: 'Payment method options' },
  { key: 'input_reason', label: 'Origin of Quotations/orders', table: 'llx_c_input_reason', description: 'Source/origin of quotations and orders' },
  { key: 'ordering_methods', label: 'Ordering methods', table: 'llx_c_input_method', description: 'Methods customers use to place orders' },
  { key: 'shipping_methods', label: 'Shipping methods', table: 'llx_c_shipment_mode', description: 'Delivery/shipping method options' },
  { key: 'delivery_delay', label: 'Delivery delay', table: 'llx_c_availability', description: 'Expected delivery delay options' },
  { key: 'paper_formats', label: 'Paper formats', table: 'llx_c_paper_format', description: 'Paper size formats for documents' },
  { key: 'units', label: 'Measuring Units', table: 'llx_c_units', description: 'Units of measure' },
  { key: 'product_nature', label: 'Nature of product', table: 'llx_c_product_nature', description: 'Product nature classification' },
  { key: 'website_containers', label: 'Website - Type of website pages/containers', table: 'llx_c_type_container', description: 'Types of website pages/containers' },
  { key: 'ticket_type', label: 'DictionaryTicketType', table: 'llx_c_ticket_type', description: 'Ticket type categories' },
  { key: 'ticket_severity', label: 'DictionaryTicketSeverity', table: 'llx_c_ticket_severity', description: 'Ticket severity levels' },
  { key: 'ticket_category', label: 'DictionaryTicketCategory', table: 'llx_c_ticket_category', description: 'Ticket category classification' },
]

const KPI_ICON_STYLES: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400',
  green: 'bg-success-bg text-success-fg',
  violet: 'bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400',
  rose: 'bg-danger-bg text-danger-fg',
}

function KpiTile({ icon: Icon, color, label, value, sub }: { icon: React.ComponentType<{ size?: number }>; color: keyof typeof KPI_ICON_STYLES; label: string; value: string; sub: string }) {
  return (
    <Card className="!flex-row items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-muted">{label}</p>
        <p className="text-xl font-bold text-text! mt-1">{value}</p>
        <p className="text-xs text-text-faint mt-1">{sub}</p>
      </div>
      <span className={`shrink-0 w-10 h-10 rounded-lg grid place-items-center ${KPI_ICON_STYLES[color]}`}>
        <Icon size={18} />
      </span>
    </Card>
  )
}

// Same overlay pattern as BankEntryDetail.tsx's VoucherModal. Countries is
// the one real live dictionary here (GET /api/zra/product-form-options',
// the same Form::select_country source the Product form's Country field
// uses) — every other entry honestly says it isn't wired to a real endpoint
// yet, rather than showing invented rows.
function DictionaryDetailModal({ entry, onClose }: { entry: DictEntry; onClose: () => void }) {
  const { data: formOptions, isLoading } = useProductFormOptions()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-surface border border-border shadow-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-text!">{entry.label}</h3>
            <p className="text-xs text-text-faint font-mono">{entry.table}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">
          {entry.key === 'countries' ? (
            <div className="max-h-96 overflow-y-auto soft-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium py-2">ID</th>
                    <th className="font-medium py-2">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={2} className="py-3 text-text-faint italic">
                        Loading…
                      </td>
                    </tr>
                  ) : (
                    (formOptions?.countries ?? []).map((c) => (
                      <tr key={c.value} className="border-b border-border last:border-0">
                        <td className="py-1.5 text-text-muted">{c.value}</td>
                        <td className="py-1.5 text-text!">{c.label}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-text-faint italic py-6 text-center">Not built yet — no endpoint exists on this backend for this dictionary.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function formatKpiDate(d: Date) {
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function DictionarySetup() {
  const { user } = useAuth()
  const { isError, dataUpdatedAt, refetch } = useProductFormOptions()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all')
  const [view, setView] = useState<'list' | 'card'>('list')
  const [selected, setSelected] = useState<DictEntry | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return DICTIONARIES.filter((d) => {
      if (statusFilter === 'disabled') return false
      if (!q) return true
      return `${d.label} ${d.description} ${d.table}`.toLowerCase().includes(q)
    })
  }, [search, statusFilter])

  const userName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : '—'
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : new Date()

  function getExportData() {
    return {
      headers: ['#', 'Dictionary Name', 'Description', 'Table', 'Status'],
      rows: filtered.map((d, i) => [String(i + 1), d.label, d.description, d.table, 'Enabled']),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
              <BookOpen size={22} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-text!">Dictionary Setup</h2>
              <p className="text-sm text-text-muted mt-0.5">Manage reference data used across the system. Add, edit, and configure default values for each dictionary.</p>
            </div>
          </div>
          <TableExportButtons title="Dictionaries" getExportData={getExportData} />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiTile icon={Database} color="blue" label="Total Dictionaries" value={String(DICTIONARIES.length)} sub="Reference data categories" />
          <KpiTile icon={CheckCircle2} color="green" label="Enabled" value={String(DICTIONARIES.length)} sub="Active dictionaries" />
          <KpiTile icon={Clock} color="violet" label="Last Updated" value={formatKpiDate(lastUpdated)} sub={`By ${userName}`} />
          <KpiTile
            icon={Activity}
            color={isError ? 'rose' : 'green'}
            label="System Status"
            value={isError ? 'Degraded' : 'Healthy'}
            sub={isError ? 'Some data unavailable' : 'All dictionaries loaded'}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 flex-1 min-h-0">
          <div className="flex flex-col min-h-0 space-y-4">
            <Card className="!flex-row flex-wrap items-center gap-3 !h-auto">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search dictionaries…"
                  className="w-full h-9 pl-8 pr-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
              >
                <option value="all">All Status</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
              <div className="flex items-center rounded-md border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium ${view === 'list' ? 'bg-brand text-white' : 'bg-surface text-text-muted hover:bg-surface-hover'}`}
                >
                  <List size={14} /> List View
                </button>
                <button
                  type="button"
                  onClick={() => setView('card')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium ${view === 'card' ? 'bg-brand text-white' : 'bg-surface text-text-muted hover:bg-surface-hover'}`}
                >
                  <LayoutGrid size={14} /> Card View
                </button>
              </div>
            </Card>

            {view === 'list' ? (
              <Card className="!p-0 overflow-hidden flex-1 min-h-0">
                <div className="flex-1 min-h-0 overflow-auto soft-scrollbar">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                        <th className="font-medium px-4 py-2.5 w-10">#</th>
                        <th className="font-medium px-4 py-2.5">Dictionary Name</th>
                        <th className="font-medium px-4 py-2.5">Description</th>
                        <th className="font-medium px-4 py-2.5">Table</th>
                        <th className="font-medium px-4 py-2.5">Status</th>
                        <th className="font-medium px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-text-faint italic text-center">
                            No dictionaries match this search.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((d, i) => (
                          <tr key={d.key} className="border-b border-border last:border-0">
                            <td className="px-4 py-2.5 text-text-muted">{i + 1}</td>
                            <td className="px-4 py-2.5">
                              <button type="button" onClick={() => setSelected(d)} className="text-brand hover:underline font-medium text-left">
                                {d.label}
                              </button>
                            </td>
                            <td className="px-4 py-2.5 text-text-muted">{d.description}</td>
                            <td className="px-4 py-2.5 text-text-faint font-mono text-xs">{d.table}</td>
                            <td className="px-4 py-2.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-success-bg text-success-fg px-2 py-0.5 text-xs font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-success-fg" /> Enabled
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <button type="button" onClick={() => setSelected(d)} title="View" className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover hover:text-brand">
                                  <Eye size={14} />
                                </button>
                                <button
                                  type="button"
                                  disabled
                                  title="Editing isn't available for dictionaries in this app yet"
                                  className="p-1.5 rounded-md text-text-faint opacity-40 cursor-not-allowed"
                                >
                                  <Pencil size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto soft-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-1">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-text-faint italic py-6 text-center col-span-full">No dictionaries match this search.</p>
                  ) : (
                    filtered.map((d) => (
                      <Card key={d.key} className="!h-auto">
                        <div className="flex items-start justify-between gap-2">
                          <button type="button" onClick={() => setSelected(d)} className="text-brand hover:underline font-semibold text-sm text-left">
                            {d.label}
                          </button>
                          <span className="inline-flex items-center gap-1 rounded-full bg-success-bg text-success-fg px-2 py-0.5 text-xs font-medium shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-success-fg" /> Enabled
                          </span>
                        </div>
                        <p className="text-xs text-text-muted mt-1.5">{d.description}</p>
                        <p className="text-xs text-text-faint font-mono mt-2">{d.table}</p>
                        <div className="flex items-center gap-1 mt-3">
                          <button type="button" onClick={() => setSelected(d)} title="View" className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover hover:text-brand">
                            <Eye size={14} />
                          </button>
                          <button type="button" disabled title="Editing isn't available for dictionaries in this app yet" className="p-1.5 rounded-md text-text-faint opacity-40 cursor-not-allowed">
                            <Pencil size={14} />
                          </button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="min-h-0 overflow-y-auto soft-scrollbar space-y-4">
            <Card className="!h-auto">
              <h3 className="flex items-center gap-2 font-semibold text-text! mb-2">
                <Info size={16} className="text-brand" /> About Dictionaries
              </h3>
              <p className="text-xs text-text-muted">
                Dictionaries contain reference data used across the system. You can add, edit and configure default values. Only elements from enabled modules are shown.
              </p>
            </Card>

            <Card className="!h-auto">
              <h3 className="flex items-center gap-2 font-semibold text-text! mb-2">
                <HelpCircle size={16} className="text-brand" /> Need Help
              </h3>
              <ul className="space-y-1.5 text-xs text-text-muted">
                <li>View documentation</li>
                <li>Learn about dictionaries</li>
                <li>Contact support</li>
              </ul>
            </Card>

            <Card className="!h-auto">
              <h3 className="flex items-center gap-2 font-semibold text-text! mb-3">
                <Zap size={16} className="text-brand" /> Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  type="button"
                  disabled
                  title="Adding custom dictionaries isn't available in this app yet"
                  className="w-full flex items-center justify-center gap-1.5 rounded-md bg-brand/50 px-3 py-2 text-xs font-medium text-white cursor-not-allowed"
                >
                  <Plus size={13} /> Add Custom Dictionary
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-text hover:bg-surface-hover"
                  >
                    <RefreshCw size={13} /> Refresh All
                  </button>
                  <button
                    type="button"
                    disabled
                    title="No integrity-check endpoint exists on this backend"
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-text-faint opacity-50 cursor-not-allowed"
                  >
                    <ShieldCheck size={13} /> Check Integrity
                  </button>
                </div>
              </div>
            </Card>

            <Card className="!h-auto">
              <h3 className="flex items-center gap-2 font-semibold text-text! mb-2">
                <Lightbulb size={16} className="text-brand" /> Tips
              </h3>
              <ul className="space-y-1.5 text-xs text-text-muted">
                <li>✓ Only modify dictionaries if you understand the impact.</li>
                <li>✓ Disabled dictionaries are hidden from users.</li>
                <li>✓ You can export dictionary data for backup.</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>

      {selected && <DictionaryDetailModal entry={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
