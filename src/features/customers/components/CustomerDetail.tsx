import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, X, Info, MapPin, Landmark, Receipt, FileText, StickyNote, Users2, CalendarClock, ShoppingCart, FileStack, Briefcase, Ticket, Wallet, Bell, Paperclip, Tags, BookOpen, BadgeDollarSign, Building2, Pencil, BadgeCheck, TriangleAlert, Mail, Phone, Truck, LoaderCircle, ChevronDown, Trash2, Globe } from 'lucide-react'
import { Card, DetailMetricRow, DetailMetricTile, InfoChip, StatusPill } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { deleteThirdParty } from '../../../api/customers'
import { ROUTES } from '../../../routes'
import { useTheme } from '../../../context/ThemeContext'
import { formatMoney } from '../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useCustomerDetail, useQuickUpdateCustomer, useThirdPartyExtra, type CustomerProfile, type CustomerEditableFields, type QuickEditSelects } from '../customerDetail.queries'
import { type QuickSelectValues, natureBadgeLabel } from './customerDetail/CustomerDetailShared'
import { AccountsPayableTab, AccountsReceivableTab, GeneralLedgerTab, PaymentModesTab } from './customerDetail/accountingTabs'
import { ActivitiesTab, AgendaTab } from './customerDetail/activitiesAgendaTabs'
import { ConsumptionTab } from './customerDetail/consumptionTab'
import { ContractsTab } from './customerDetail/contractsTab'
import { CustomerTab, VendorTab } from './customerDetail/customerVendorTabs'
import { ContactsTab, DocumentsTab, NotesTab, NotificationsTab, PricingGroupsTab } from './customerDetail/recordTabs'
import { ExpensesTab, ProjectsTab, TicketsTab } from './customerDetail/supportTabs'
import { ThirdPartyTab } from './customerDetail/thirdPartyTab'
import { TransactionsTab } from './customerDetail/transactionsTab'
export { TransactionsTab } from './customerDetail/transactionsTab'

// Native rebuild of the legacy Third-Party detail page
// (societe/card.php?socid=X) — the page a real "New Third Party" creation
// lands on, matching this app's standing rule: build the same scenario
// natively with real data instead of routing back to the legacy page. Data
// source: societe/api/societe.php?id=X (see customerDetail.queries.ts's own
// header comment for how that endpoint was found and verified).
//
// The legacy page exposes 20 distinct tabs (deduped from its own `tabs`
// array — a few, like "note"/"notes" and "document"/"documents", are just
// aliases of each other). Third-party, Notes, Transactions, Activities,
// Contacts/Addresses, Contract-Follow, Customer, and Events/Agenda all have
// real backing data (see customerDetailTabs.queries.ts for how the six
// non-profile tabs' own societe/api/{transactions,activities,contacts,
// contracts,customer,agenda}.php endpoints were found — by watching this
// exact page's own network traffic while switching tabs, not guessed). The
// remaining tabs render an honest "not built yet" card rather than
// fabricated content, same convention as the Dictionary Setup page.

// The first seven tabs as pills and the rest under "More… (n)", like the legacy tab bar. The menu button lights up
// (and names the tab) when one of its tabs is open.
const PRIMARY_TABS = 7

function TabBar({ tabs, active, onSelect }: { tabs: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; badge: number }[]; active: TabKey; onSelect: (k: TabKey) => void }) {
  const primary = tabs.slice(0, PRIMARY_TABS)
  const more = tabs.slice(PRIMARY_TABS)
  const activeMore = more.find((t) => t.key === active)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const pill = (on: boolean) => `flex items-center gap-1.5 shrink-0 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${on ? 'bg-brand text-white shadow-sm shadow-brand/25' : 'text-text-muted hover:text-text hover:bg-surface-hover'}`
  return (
    <div className="border-t border-border px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-1 bg-surface rounded-2xl p-0.5">
        {primary.map(({ key, label, icon: Icon, badge }) => (
          <button key={key} type="button" onClick={() => onSelect(key)} className={pill(active === key)}>
            <Icon size={12} className="shrink-0" /> {label}
            {badge > 0 && <span className="flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-danger text-white text-[10px] font-semibold">{badge}</span>}
          </button>
        ))}
        {more.length > 0 && (
          <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} className={pill(!!activeMore)}>
              {activeMore ? activeMore.label : 'More…'} <span className="opacity-70">({more.length})</span> <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div role="menu" className="absolute left-0 top-full z-30 mt-1 max-h-80 w-60 overflow-auto rounded-lg border border-border bg-surface p-1 shadow-lg">
                {more.map(({ key, label, icon: Icon, badge }) => (
                  <button
                    key={key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelect(key)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs ${active === key ? 'bg-brand/10 font-semibold text-brand' : 'text-text-muted hover:bg-surface-hover hover:text-text'}`}
                  >
                    <Icon size={12} className="shrink-0" /> {label}
                    {badge > 0 && <span className="ml-auto rounded-full bg-danger px-1.5 text-[10px] font-semibold text-white">{badge}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const EMPTY_SELECTS: QuickSelectValues = { prospectCustomer: 'customer', vendor: 'no', forme: '', effectif: '', country: '', custcats: [], suppcats: [] }

// One-click contact actions in the card header, like a CRM record: call, email, website. Shown only for what exists.
function QuickContactLinks({ data }: { data: CustomerProfile }) {
  const chip = 'inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-text-muted transition-colors hover:border-brand/50 hover:bg-brand/5 hover:text-brand'
  const web = data.web ? (/^https?:\/\//i.test(data.web) ? data.web : `https://${data.web}`) : ''
  if (!data.phone && !data.email && !web) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {data.phone && (
        <a href={`tel:${data.phone.replace(/\s+/g, '')}`} className={chip} title={`Call ${data.phone}`}>
          <Phone size={11} /> {data.phone}
        </a>
      )}
      {data.email && (
        <a href={`mailto:${data.email}`} className={chip} title={`Email ${data.email}`}>
          <Mail size={11} /> {data.email}
        </a>
      )}
      {web && (
        <a href={web} target="_blank" rel="noreferrer" className={chip} title={web}>
          <Globe size={11} /> {data.web}
        </a>
      )}
    </div>
  )
}

function NotBuiltCard({ label }: { label: string }) {
  return (
    <Card className="!h-auto">
      <p className="text-sm text-text-faint italic py-8 text-center">{label} — not built yet. No real data source exists on this backend for this tab.</p>
    </Card>
  )
}

// Labels below are read straight from the real backend's own tab-bar
// template (societe/templates/layout.php's $navItems array — the
// authoritative source for what this exact page renders, not a guess from
// a screenshot): each is either $langs->trans('<TransKey>') resolved
// against the real English strings, or (for the four SPA-only additions
// with no translation key) the literal hardcoded label in that same file.
// Two real, load-bearing findings that weren't obvious from the UI alone:
//   - 'rib' and 'paymentmodes' are NOT two different tabs — same file,
//     same array entry (route 'paymentmodes', internal type 'rib', one
//     label "Payment Information") — confirmed by the explicit `rib:
//     'paymentmodes'` alias map in societe/assets/js/app.js. The previous
//     version of this list had them as two separate tabs by mistake.
//   - 'customer' has no static label at all in that file — its real label
//     is computed per-record ("Prospect" / "Customer" / "Prospect |
//     Customer", or hidden entirely when neither) — see CUSTOMER_TAB_LABEL
//     below, driven by the same real client_label the backend already
//     computes (CustomerProfile.clientLabel).
const TABS = [
  { key: 'societe', label: 'Third-party', icon: Info },
  { key: 'transactions', label: 'Transactions', icon: ShoppingCart },
  { key: 'activities', label: 'Activities', icon: CalendarClock },
  { key: 'contacts', label: 'Contacts/Addresses', icon: Users2 },
  { key: 'contracts', label: 'Contract-Follow', icon: FileStack },
  { key: 'customer', label: '', icon: BadgeDollarSign },
  { key: 'vendor', label: 'Vendor', icon: Truck },
  { key: 'agenda', label: 'Events/Agenda', icon: CalendarClock },
  { key: 'projects', label: 'Projects', icon: Briefcase },
  { key: 'tickets', label: 'Tickets', icon: Ticket },
  { key: 'expenses', label: 'Expenses', icon: Wallet },
  { key: 'consumption', label: 'Related Items', icon: BadgeDollarSign },
  { key: 'paymentmodes', label: 'Payment Information', icon: Landmark },
  { key: 'notify', label: 'Notifications', icon: Bell },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'documents', label: 'Linked Files', icon: Paperclip },
  { key: 'pricing_groups', label: 'Pricing Groups', icon: Tags },
  { key: 'accounting_ar', label: 'Accounts Receivable', icon: BookOpen },
  { key: 'accounting_ap', label: 'Accounts Payable', icon: BookOpen },
  { key: 'general_ledger', label: 'General Ledger', icon: BookOpen },
] as const

type TabKey = (typeof TABS)[number]['key']

function customerTabLabel(data: CustomerProfile): string {
  return data.clientLabel
}

// Valid TABS keys, for sanitizing an externally-supplied ?tab= query param
// (e.g. the Vendor List's "Nature Of Third Party" column linking straight
// to the Vendor tab) — an unknown/stale value silently falls back to the
// default 'societe' tab rather than rendering a broken NotBuiltCard.
const TAB_KEYS = new Set(TABS.map((t) => t.key))

export function CustomerDetail() {
  const { theme } = useTheme()
  const isBlueMetal = theme === 'blue-metal'
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data, isLoading, isError, error, refetch } = useCustomerDetail(id)
  const requestedTab = searchParams.get('tab')
  const [tab, setTab] = useState<TabKey>(requestedTab && TAB_KEYS.has(requestedTab as TabKey) ? (requestedTab as TabKey) : 'societe')
  const [isEditing, setIsEditing] = useState(false)
  const [formValues, setFormValues] = useState<CustomerEditableFields>({})
  const updateCustomer = useQuickUpdateCustomer(Number(id))
  const { data: extra } = useThirdPartyExtra(id)
  const [selectValues, setSelectValues] = useState<QuickSelectValues>(EMPTY_SELECTS)
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  // societe/fapi/delete.php refuses a third party that still has documents, and says so.
  const removeCustomer = useMutation({
    mutationFn: () => deleteThirdParty(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      navigate(ROUTES.customerList)
    },
  })

  if (isLoading) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyLoadingCard label="Loading third party…" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyErrorCard title="Couldn't load third party" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      </div>
    )
  }

  const natureBadge = natureBadgeLabel(data)
  const displayName = [data.nameTitle, data.name, data.lastname].filter(Boolean).join(' ').trim() || data.name

  function startEditing() {
    updateCustomer.reset()
    setFormValues({
      name: data!.name,
      lastname: data!.lastname,
      phone: data!.phone,
      email: data!.email,
      fax: data!.fax,
      web: data!.web,
      address: data!.address,
      zip: data!.zip,
      town: data!.town,
      tpin: data!.tpin,
      trackingId: data!.trackingId,
      vatId: data!.vatId,
      employerName: data!.employerName,
      employeeNum: data!.employeeNum,
      supervisorDetails: data!.supervisorDetails,
      branchCode: data!.branchCode,
      nrcNum: data!.nrcNum,
      capital: data!.capital,
      barcode: data!.barcode,
    })
    setSelectValues({
      prospectCustomer: data!.client === 2 ? 'prospect' : data!.isCustomer ? 'customer' : 'none',
      vendor: data!.isVendor ? 'yes' : 'no',
      forme: String(data!.formeJuridiqueCode || ''),
      effectif: String(data!.effectifId || ''),
      country: String(data!.countryId || ''),
      custcats: extra?.extended.custcats ?? [],
      suppcats: extra?.extended.suppcats ?? [],
    })
    setIsEditing(true)
  }
  // Only what differs from the saved record is sent: the changed text fields and the changed dropdowns / tags.
  function saveQuickEdit() {
    const record = data as unknown as Record<string, string>
    const text = Object.fromEntries(Object.entries(formValues).filter(([k, v]) => (v ?? '') !== (record[k] ?? ''))) as CustomerEditableFields
    const was = extra?.extended
    const selects: QuickEditSelects = {}
    const initialType = data!.client === 2 ? 'prospect' : data!.isCustomer ? 'customer' : 'none'
    if (selectValues.prospectCustomer !== initialType || selectValues.vendor !== (data!.isVendor ? 'yes' : 'no')) {
      selects.type = selectValues.vendor === 'yes' ? 'vendor' : selectValues.prospectCustomer === 'prospect' ? 'prospect' : selectValues.prospectCustomer === 'customer' ? 'customer' : 'all'
      if (selects.type === 'vendor' && !data!.codeFournisseur) selects.supplierCode = 'auto'
    }
    if (selectValues.forme && selectValues.forme !== String(data!.formeJuridiqueCode || '')) selects.formeJuridiqueCode = Number(selectValues.forme)
    if (selectValues.effectif && selectValues.effectif !== String(data!.effectifId || '')) selects.effectifId = Number(selectValues.effectif)
    if (selectValues.country && selectValues.country !== String(data!.countryId || '')) selects.countryId = Number(selectValues.country)
    const sameIds = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x))
    if (was && !sameIds(selectValues.custcats, was.custcats)) selects.custcats = selectValues.custcats
    if (was && !sameIds(selectValues.suppcats, was.suppcats)) selects.suppcats = selectValues.suppcats
    updateCustomer.mutate({ text, selects }, { onSuccess: () => setIsEditing(false) })
  }
  async function handleDelete() {
    removeCustomer.reset()
    const ok = await confirm({
      title: 'Delete third party?',
      message: `Delete "${displayName}" (#${data!.id})?`,
      warningTitle: 'This cannot be undone.',
      warningMessage: 'A third party that still has invoices, orders or other documents cannot be deleted.',
    })
    if (ok) removeCustomer.mutate()
  }
  function cancelEditing() {
    setIsEditing(false)
    updateCustomer.reset()
  }
  function setField(key: keyof CustomerEditableFields) {
    return (value: string) => setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 flex items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <Link to={ROUTES.customerList} className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text" title="Back to list">
          <ChevronLeft size={18} /> Customers
        </Link>
        <Link to={ROUTES.customerList} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text" title="Close">
          <X size={18} />
        </Link>
      </div>

      <div className={`sticky top-0 z-10 -mx-6 overflow-hidden ${isBlueMetal ? 'rounded-xl border border-[#2879ad]' : 'bg-white dark:bg-gray-950'}`}>
        <div className="relative z-10">
          {/* One card for hero + metrics + tabs, like the product detail header: no separate page title row
              (the banner already names the page) and no outer padding. */}
          <Card className="!h-auto !p-0 overflow-hidden !border-0 !rounded-none">
            <div className={`flex flex-wrap items-start justify-between gap-4 p-3 border-b ${isBlueMetal ? 'border-white/20' : 'border-border'}`}>
              <div className="flex items-start gap-4 min-w-[240px] flex-1">
                {/* logoUrl is a generic placeholder company icon on this
                    backend (not a real uploaded photo), so always fall back
                    to the initials badge rather than pass it through. */}
                <Avatar name={data.name} size={52} rounded={isBlueMetal ? 'full' : 'lg'} color={isBlueMetal ? 'bg-teal-600' : 'bg-brand'} />
                <div className={isBlueMetal ? 'flex flex-wrap items-center gap-x-4 gap-y-1' : 'space-y-1 pt-0.5'}>
                  <div className="flex flex-wrap items-center gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={formValues.name ?? ''}
                          onChange={(e) => setField('name')(e.target.value)}
                          placeholder="First name"
                          className="text-lg font-bold text-text! bg-brand/5 border border-brand/40 rounded-md px-2 py-0.5 w-44 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                        <input
                          type="text"
                          value={formValues.lastname ?? ''}
                          onChange={(e) => setField('lastname')(e.target.value)}
                          placeholder="Last name"
                          className="text-lg font-bold text-text! bg-brand/5 border border-brand/40 rounded-md px-2 py-0.5 w-44 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                      </div>
                    ) : (
                      <h2 className="text-base font-bold text-text!">{displayName}</h2>
                    )}
                    {isBlueMetal ? (
                      <>
                        <StatusPill tone="brand">{natureBadge}</StatusPill>
                        <StatusPill tone={data.status === 1 ? 'success' : 'neutral'}>{data.status === 1 ? 'Active' : 'Closed'}</StatusPill>
                        {data.zraStatus && (
                          <StatusPill tone="success" icon={BadgeCheck}>
                            {data.zraStatus}
                          </StatusPill>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-medium">{natureBadge}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${data.status === 1 ? 'bg-success-bg text-success-fg' : 'bg-surface-hover text-text-muted'}`}>
                          {data.status === 1 ? 'Active' : 'Closed'}
                        </span>
                        {data.zraStatus && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-bg text-success-fg text-xs font-medium">
                            <BadgeCheck size={12} /> {data.zraStatus}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <QuickContactLinks data={data} />
                  {isBlueMetal ? (
                    <>
                      <p className="text-xs text-text-faint shrink-0">
                        #{data.id} {data.codeCompta && `· ${data.codeCompta}`}
                      </p>
                      {data.codeClient && <InfoChip icon={FileText} label="Customer code" value={data.codeClient} color="blue" />}
                      {data.codeFournisseur && <InfoChip icon={Landmark} label="Supplier code" value={data.codeFournisseur} color="violet" />}
                      {data.countryLabel && <InfoChip icon={MapPin} value={data.countryLabel} color="amber" />}
                    </>
                  ) : (
                    <>
                    <p className="text-xs text-text-faint">
                      #{data.id} {data.codeCompta && `· ${data.codeCompta}`}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-faint">
                      {data.codeClient && (
                        <span className="flex items-center gap-1">
                          <Building2 size={12} /> Customer code <span className="font-medium text-text!">{data.codeClient}</span>
                        </span>
                      )}
                      {data.codeFournisseur && (
                        <span className="flex items-center gap-1">
                          <Building2 size={12} /> Supplier code <span className="font-medium text-text!">{data.codeFournisseur}</span>
                        </span>
                      )}
                      {data.countryLabel && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {data.countryLabel}
                        </span>
                      )}
                    </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Same three actions as the legacy card's top-right: delete, the full edit form (create.php?edit=1) and close. */}
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={removeCustomer.isPending}
                  title="Delete this third party"
                  aria-label="Delete third party"
                  className="rounded-md border border-danger/50 p-1.5 text-danger transition-colors hover:bg-danger-bg disabled:opacity-60"
                >
                  {removeCustomer.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.customerEdit.replace(':id', String(data.id)))}
                  title="Edit in the full form"
                  aria-label="Edit in the full form"
                  className="rounded-md border border-border p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.customerList)}
                  className={`rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                    isBlueMetal ? 'border border-white/50 bg-slate-950/70 text-white hover:border-cyan-200 hover:bg-blue-800/90' : 'border border-border text-text-faint hover:bg-surface-hover hover:text-text'
                  }`}
                  title="Close"
                  aria-label="Close customer details"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* societe/api/societes.php?action=update is confirmed working
                live (2026-09-11 re-test, customer id 1990: {"ok":true,
                "message":"Third party updated",...}) — an earlier audit had
                found every verb rejected and this banner used to assert that
                as a blanket "editing isn't supported" claim, which would now
                be actively wrong. Kept surfacing the real backend error
                message on failure (same "attempt the real action, surface
                the real error" pattern as Duplicate elsewhere in this app)
                without that blanket claim, since a future failure here is
                more likely a specific field rejection than the action itself
                being unsupported. */}
            {removeCustomer.isError && (
              <div className="flex items-start gap-2 px-4 py-2.5 border-b border-border bg-danger-bg text-danger-fg text-xs">
                <TriangleAlert size={14} className="shrink-0 mt-0.5" />
                <span>Couldn't delete: {removeCustomer.error instanceof Error ? removeCustomer.error.message : 'Unknown error.'}</span>
              </div>
            )}
            {updateCustomer.isError && (
              <div className="flex items-start gap-2 px-4 py-2.5 border-b border-border bg-danger-bg text-danger-fg text-xs">
                <TriangleAlert size={14} className="shrink-0 mt-0.5" />
                <span>Couldn't save: {updateCustomer.error instanceof Error ? updateCustomer.error.message : 'Unknown error.'}</span>
              </div>
            )}

            <DetailMetricRow className="px-2 py-2 border-b border-border">
              <DetailMetricTile label="Quotations" value={<>{formatMoney(data.kpiQuotation)} <span className="text-xs font-normal text-text-faint ml-1.5">{data.kpiQuotationCount}</span></>} icon={FileText} color="violet" />
              <DetailMetricTile label="Orders" value={<>{formatMoney(data.kpiOrder)} <span className="text-xs font-normal text-text-faint ml-1.5">{data.kpiOrderCount}</span></>} icon={ShoppingCart} color="green" />
              <DetailMetricTile label="Invoices" value={<>{formatMoney(data.kpiInvoice)} <span className="text-xs font-normal text-text-faint ml-1.5">{data.kpiInvoiceCount}</span></>} icon={Receipt} color="blue" />
              <DetailMetricTile label="Outstanding" value={<>{formatMoney(data.kpiOutstanding)} <span className="text-xs font-normal text-text-faint ml-1.5">{data.kpiOutstandingCount}</span></>} icon={BadgeDollarSign} color="amber" />
              <DetailMetricTile label="Advance" value={<>{formatMoney(data.advance)} <span className="text-xs font-normal text-text-faint ml-1.5">{data.kpiAdvanceCount}</span></>} icon={Wallet} color="rose" />
            </DetailMetricRow>

            <TabBar
              active={tab}
              onSelect={setTab}
              tabs={TABS.filter((t) => (t.key !== 'customer' || customerTabLabel(data)) && (t.key !== 'vendor' || data.isVendor)).map(({ key, label, icon }) => ({
                key,
                icon,
                label: key === 'customer' ? customerTabLabel(data) : label,
                // Real count from the same profile fetch (task_count + call_count + meeting_count).
                badge: key === 'agenda' ? data.taskCount + data.callCount + data.meetingCount : 0,
              }))}
            />
          </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 p-0 space-y-1 no-scrollbar">
        {tab === 'societe' && <ThirdPartyTab data={data} extra={extra} selectValues={selectValues} setSelectValues={setSelectValues} isEditing={isEditing} formValues={formValues} setField={setField} onEdit={startEditing} onSave={saveQuickEdit} onCancel={cancelEditing} saving={updateCustomer.isPending} />}
        {tab === 'notes' && <NotesTab data={data} socid={id} />}
        {tab === 'transactions' && <TransactionsTab socid={id} />}
        {tab === 'activities' && <ActivitiesTab socid={id} />}
        {tab === 'contacts' && <ContactsTab socid={id} />}
        {tab === 'contracts' && <ContractsTab socid={id} />}
        {tab === 'customer' && <CustomerTab socid={id} profile={data} />}
        {tab === 'vendor' && <VendorTab socid={id} />}
        {tab === 'agenda' && <AgendaTab socid={id} name={displayName} />}
        {tab === 'pricing_groups' && <PricingGroupsTab socid={id} />}
        {tab === 'documents' && <DocumentsTab socid={id} />}
        {tab === 'notify' && <NotificationsTab socid={id} />}
        {tab === 'consumption' && <ConsumptionTab socid={id} />}
        {tab === 'tickets' && <TicketsTab socid={id} />}
        {tab === 'projects' && <ProjectsTab socid={id} />}
        {tab === 'expenses' && <ExpensesTab socid={id} />}
        {tab === 'paymentmodes' && <PaymentModesTab socid={id} />}
        {tab === 'accounting_ar' && <AccountsReceivableTab socid={id} />}
        {tab === 'accounting_ap' && <AccountsPayableTab socid={id} />}
        {tab === 'general_ledger' && <GeneralLedgerTab socid={id} />}
        {![
          'societe',
          'notes',
          'transactions',
          'activities',
          'contacts',
          'contracts',
          'customer',
          'vendor',
          'agenda',
          'pricing_groups',
          'documents',
          'notify',
          'consumption',
          'tickets',
          'projects',
          'expenses',
          'paymentmodes',
          'accounting_ar',
          'accounting_ap',
          'general_ledger',
        ].includes(tab) && <NotBuiltCard label={TABS.find((t) => t.key === tab)!.label} />}
      </div>
    </div>
  )
}
