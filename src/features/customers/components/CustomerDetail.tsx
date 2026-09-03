import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AddContactModal } from './AddContactModal'
import { ActivityFormModal } from './ActivityFormModal'
import { ActivityDetailModal } from './ActivityDetailModal'
import { ScheduleActivityModal } from './ScheduleActivityModal'
import {
  ChevronLeft,
  X,
  Info,
  MapPin,
  Landmark,
  Receipt,
  FileText,
  StickyNote,
  Users2,
  CalendarClock,
  ShoppingCart,
  FileStack,
  Briefcase,
  Ticket,
  Wallet,
  Bell,
  Paperclip,
  Tags,
  BookOpen,
  BadgeDollarSign,
  Building2,
  Pencil,
  Check,
  BadgeCheck,
  TriangleAlert,
  Plus,
  Bot,
  Mail,
  Phone,
  ExternalLink,
  Truck,
  Search,
  Upload,
  Eye,
  ListChecks,
  History,
  LoaderCircle,
} from 'lucide-react'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useCustomerDetail,
  useUpdateCustomer,
  useSaveCustomerNotes,
  useUploadCustomerDocument,
  useAddCustomerNotification,
  useCreatePaymentMode,
  type CustomerProfile,
  type CustomerEditableFields,
} from '../customerDetail.queries'
import {
  useCustomerLedger,
  useCustomerActivities,
  useActivityDetail,
  useCustomerContacts,
  useCustomerContracts,
  useCustomerTab,
  useVendorTab,
  useCustomerAgenda,
  useCustomerPricingGroups,
  useCustomerDocuments,
  useCustomerNotifications,
  useCustomerConsumption,
  useCustomerTickets,
  useCustomerProjects,
  useCustomerExpenses,
  useCustomerPaymentModes,
  useCustomerAccountsReceivable,
  useCustomerAccountsPayable,
  useCustomerGeneralLedger,
  stripBackendPrefix,
  type ActivityType,
  type ActivityItem,
  type AgendaDay,
  type ContractSummaryCard,
  type CustomerTabDocRow,
  type AccountingResponse,
  type TicketsFilters,
} from '../customerDetailTabs.queries'

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

function SectionIcon({ icon: Icon, color }: { icon: React.ComponentType<{ size?: number; className?: string }>; color: IconColor }) {
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${ICON_STYLES[color]}`}>
      <Icon size={14} />
    </span>
  )
}

function SectionHeader({ icon, color, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; color: IconColor; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <SectionIcon icon={icon} color={color} />
      <h3 className="font-semibold text-text!">{children}</h3>
    </div>
  )
}

// Matches the real legacy page's own titre convention (a thin blue accent
// bar to the left of a bold, brand-colored heading) — used for each tab's
// own top-level title (Transactions, Contacts, Contracts, Agenda), as
// distinct from SectionHeader's icon-badge style used inside the
// Third-Party tab's field cards.
function TabTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`flex items-center gap-2 font-semibold text-brand ${className}`}>
      <span className="w-1 h-4 rounded-full bg-brand shrink-0" />
      {children}
    </h3>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-faint shrink-0">{label}</span>
      <span className="text-sm text-text! text-right">{value || <span className="text-text-faint">—</span>}</span>
    </div>
  )
}

// Same row, but becomes a real text input while the page is in edit mode —
// used only for the plain-string fields CustomerEditableFields covers.
// Falls back to the read-only InfoRow display outside edit mode so callers
// don't need two separate components per field.
function EditableRow({ label, value, editing, onChange }: { label: string; value: string; editing: boolean; onChange: (v: string) => void }) {
  if (!editing) return <InfoRow label={label} value={value} />
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-text-faint shrink-0">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm text-text! text-right bg-input-bg border border-input-border rounded-md px-2 py-1 w-full max-w-[220px] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
      />
    </div>
  )
}

function StatTile({ label, value, count }: { label: string; value: string; count?: number }) {
  return (
    <div className="flex-1 min-w-[120px]">
      <p className="text-xs text-text-faint uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-text! mt-0.5">
        {value}
        {count !== undefined && <span className="text-xs font-normal text-text-faint ml-1.5">{count}</span>}
      </p>
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

// client===1 -> "Customer", client===2 -> "Prospect", client===3 -> both,
// client===0 -> tab hidden entirely — matches societe/templates/layout.php's
// own $customerNavLabel logic exactly (CustomerProfile.clientLabel is the
// same value the real backend already computes with this rule).
function natureBadgeLabel(data: CustomerProfile): string {
  return data.isCustomer && data.client === 2 ? 'Prospect' : data.isCustomer ? 'Customer' : data.isVendor ? 'Vendor' : 'Third-party'
}

function customerTabLabel(data: CustomerProfile): string {
  return data.clientLabel
}

// Valid TABS keys, for sanitizing an externally-supplied ?tab= query param
// (e.g. the Vendor List's "Nature Of Third Party" column linking straight
// to the Vendor tab) — an unknown/stale value silently falls back to the
// default 'societe' tab rather than rendering a broken NotBuiltCard.
const TAB_KEYS = new Set(TABS.map((t) => t.key))

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data, isLoading, isError, error, refetch } = useCustomerDetail(id)
  const requestedTab = searchParams.get('tab')
  const [tab, setTab] = useState<TabKey>(requestedTab && TAB_KEYS.has(requestedTab as TabKey) ? (requestedTab as TabKey) : 'societe')
  const [isEditing, setIsEditing] = useState(false)
  const [formValues, setFormValues] = useState<CustomerEditableFields>({})
  const updateCustomer = useUpdateCustomer(Number(id))

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
    setIsEditing(true)
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

      <div className="sticky top-0 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
          <Card className="!h-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 border-b border-border">
              <div className="flex items-start gap-4 min-w-[240px] flex-1">
                {/* logoUrl is a generic placeholder company icon on this
                    backend (not a real uploaded photo), so always fall back
                    to the initials badge rather than pass it through. */}
                <Avatar name={data.name} size={64} rounded="lg" color="bg-brand" />
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={formValues.name ?? ''}
                          onChange={(e) => setField('name')(e.target.value)}
                          placeholder="First name"
                          className="text-lg font-bold text-text! bg-input-bg border border-input-border rounded-md px-2 py-0.5 w-32 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                        <input
                          type="text"
                          value={formValues.lastname ?? ''}
                          onChange={(e) => setField('lastname')(e.target.value)}
                          placeholder="Last name"
                          className="text-lg font-bold text-text! bg-input-bg border border-input-border rounded-md px-2 py-0.5 w-32 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                      </div>
                    ) : (
                      <h2 className="text-lg font-bold text-text!">{displayName}</h2>
                    )}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-medium">{natureBadge}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${data.status === 1 ? 'bg-success-bg text-success-fg' : 'bg-surface-hover text-text-muted'}`}>
                      {data.status === 1 ? 'Active' : 'Closed'}
                    </span>
                    {data.zraStatus && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-bg text-success-fg text-xs font-medium">
                        <BadgeCheck size={12} /> {data.zraStatus}
                      </span>
                    )}
                  </div>
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
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      disabled={updateCustomer.isPending}
                      onClick={() => updateCustomer.mutate(formValues, { onSuccess: () => setIsEditing(false) })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-60"
                    >
                      <Check size={14} /> {updateCustomer.isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-text-muted text-sm font-medium hover:bg-surface-hover hover:text-text"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={startEditing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-text-muted text-sm font-medium hover:bg-surface-hover hover:text-text"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(ROUTES.customerList)}
                      className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text"
                      title="Close"
                    >
                      <X size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* societe/api/societes.php has a working create action but no
                real update action (confirmed live: action="update" — and
                every other verb tried, edit/save/modify/patch/set/
                update_extra — returns {"ok":false,"error":"Unknown action
                or method"}; the legacy card.php?action=edit page doesn't
                expose the third party's own fields as an editable form
                either). Save still attempts the real call rather than being
                disabled outright — same "attempt the real action, surface
                the real error" pattern as Duplicate elsewhere in this app —
                so this starts working with no frontend change the moment
                the backend adds the action, and until then shows the actual
                rejection instead of a fake success. */}
            {updateCustomer.isError && (
              <div className="flex items-start gap-2 px-4 py-2.5 border-b border-border bg-danger-bg text-danger-fg text-xs">
                <TriangleAlert size={14} className="shrink-0 mt-0.5" />
                <span>
                  Couldn't save: {updateCustomer.error instanceof Error ? updateCustomer.error.message : 'Unknown error.'}. This backend doesn't support editing third parties yet — the create
                  action works, but no update action exists.
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-6 px-4 py-3 border-b border-border">
              <StatTile label="Quotations" value={formatMoney(data.kpiQuotation)} count={data.kpiQuotationCount} />
              <StatTile label="Orders" value={formatMoney(data.kpiOrder)} count={data.kpiOrderCount} />
              <StatTile label="Invoices" value={formatMoney(data.kpiInvoice)} count={data.kpiInvoiceCount} />
              <StatTile label="Outstanding" value={formatMoney(data.kpiOutstanding)} count={data.kpiOutstandingCount} />
              <StatTile label="Advance" value={formatMoney(data.advance)} count={data.kpiAdvanceCount} />
            </div>

            <div className="border-t border-border">
              <div className="flex items-center gap-0 overflow-x-auto overflow-y-hidden -mx-6 px-6" style={{ scrollBehavior: 'smooth' }}>
                {TABS.filter((t) => (t.key !== 'customer' || customerTabLabel(data)) && (t.key !== 'vendor' || data.isVendor)).map(({ key, label, icon: Icon }) => {
                  const displayLabel = key === 'customer' ? customerTabLabel(data) : label
                  // Real count from the same profile fetch (task_count +
                  // call_count + meeting_count) — confirmed live against the
                  // reference page's own "2" badge on this exact tab.
                  const badgeCount = key === 'agenda' ? data.taskCount + data.callCount + data.meetingCount : 0
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`flex items-center gap-1.5 shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                        tab === key ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text hover:border-border'
                      }`}
                    >
                      <Icon size={14} className="shrink-0" /> {displayLabel}
                      {badgeCount > 0 && <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-semibold">{badgeCount}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
        {tab === 'societe' && <ThirdPartyTab data={data} isEditing={isEditing} formValues={formValues} setField={setField} onEdit={startEditing} />}
        {tab === 'notes' && <NotesTab data={data} socid={id} />}
        {tab === 'transactions' && <TransactionsTab socid={id} />}
        {tab === 'activities' && <ActivitiesTab socid={id} />}
        {tab === 'contacts' && <ContactsTab socid={id} />}
        {tab === 'contracts' && <ContractsTab socid={id} />}
        {tab === 'customer' && <CustomerTab socid={id} profile={data} />}
        {tab === 'vendor' && <VendorTab socid={id} />}
        {tab === 'agenda' && <AgendaTab socid={id} />}
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

function ThirdPartyTab({
  data,
  isEditing,
  formValues,
  setField,
  onEdit,
}: {
  data: CustomerProfile
  isEditing: boolean
  formValues: CustomerEditableFields
  setField: (key: keyof CustomerEditableFields) => (value: string) => void
  onEdit: () => void
}) {
  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 p-4">
          <div className="flex items-start gap-3">
            <SectionIcon icon={Info} color="blue" />
            <div>
              <h3 className="font-semibold text-text!">Third party</h3>
              <p className="text-xs text-text-faint mt-0.5">Identification, contact, accounting and status details for this third party.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-medium">{natureBadgeLabel(data)}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${data.status === 1 ? 'bg-success-bg text-success-fg' : 'bg-surface-hover text-text-muted'}`}>
              {data.status === 1 ? 'Active' : 'Closed'}
            </span>
            {!isEditing && (
              <button
                type="button"
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-text-muted text-sm font-medium hover:bg-surface-hover hover:text-text"
              >
                <Pencil size={14} /> Edit
              </button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="!h-auto">
        <SectionHeader icon={Info} color="blue">
          Identification
        </SectionHeader>
        <InfoRow label="Prospect / Customer" value={data.clientLabel || (data.client === 2 ? 'Prospect' : data.client === 1 ? 'Customer' : 'Neither')} />
        <InfoRow label="Vendor" value={data.isVendor ? 'Yes' : 'No'} />
        <InfoRow label="Customer Code" value={data.codeClient} />
        <InfoRow label="Supplier Code" value={data.codeFournisseur} />
        <EditableRow label="Barcode" value={formValues.barcode ?? data.barcode} editing={isEditing} onChange={setField('barcode')} />
        <InfoRow label="Business Entity Type" value={data.formeJuridique} />
        <EditableRow label="Capital" value={formValues.capital ?? data.capital} editing={isEditing} onChange={setField('capital')} />
        <InfoRow label="Workforce" value={data.effectif} />
        <InfoRow label="Default Language" value={data.defaultLang} />
      </Card>

      <Card className="!h-auto">
        <SectionHeader icon={MapPin} color="green">
          Contact & Address
        </SectionHeader>
        <EditableRow label="Phone" value={formValues.phone ?? data.phone} editing={isEditing} onChange={setField('phone')} />
        <EditableRow label="Email" value={formValues.email ?? data.email} editing={isEditing} onChange={setField('email')} />
        <EditableRow label="Fax" value={formValues.fax ?? data.fax} editing={isEditing} onChange={setField('fax')} />
        <EditableRow label="Website" value={formValues.web ?? data.web} editing={isEditing} onChange={setField('web')} />
        <EditableRow label="Address" value={formValues.address ?? data.address} editing={isEditing} onChange={setField('address')} />
        <EditableRow label="Zip" value={formValues.zip ?? data.zip} editing={isEditing} onChange={setField('zip')} />
        <EditableRow label="Town" value={formValues.town ?? data.town} editing={isEditing} onChange={setField('town')} />
        <InfoRow label="Country" value={data.countryLabel} />
      </Card>

      <Card className="!h-auto">
        <SectionHeader icon={FileText} color="violet">
          IDs & Professional
        </SectionHeader>
        <EditableRow label="TPIN" value={formValues.tpin ?? data.tpin} editing={isEditing} onChange={setField('tpin')} />
        <EditableRow label="Tracking Id" value={formValues.trackingId ?? data.trackingId} editing={isEditing} onChange={setField('trackingId')} />
        <EditableRow label="VAT ID" value={formValues.vatId ?? data.vatId} editing={isEditing} onChange={setField('vatId')} />
        <EditableRow label="Employer Name" value={formValues.employerName ?? data.employerName} editing={isEditing} onChange={setField('employerName')} />
        <EditableRow label="Employee Number" value={formValues.employeeNum ?? data.employeeNum} editing={isEditing} onChange={setField('employeeNum')} />
        <EditableRow label="Supervisor Details" value={formValues.supervisorDetails ?? data.supervisorDetails} editing={isEditing} onChange={setField('supervisorDetails')} />
        <EditableRow label="Branch Code" value={formValues.branchCode ?? data.branchCode} editing={isEditing} onChange={setField('branchCode')} />
        <EditableRow label="NRC Number" value={formValues.nrcNum ?? data.nrcNum} editing={isEditing} onChange={setField('nrcNum')} />
      </Card>

      <Card className="!h-auto">
        <SectionHeader icon={Receipt} color="amber">
          Accounting & Payment
        </SectionHeader>
        <InfoRow label="Customer Accounting Code" value={data.codeCompta} />
        <InfoRow label="Supplier Accounting Code" value={data.codeComptaFournisseur} />
        <InfoRow label="Payment Term" value={data.paymentTermLabel} />
        <InfoRow label="Payment Type" value={data.paymentTypeLabel} />
        <InfoRow label="Payment Bank Account" value={data.bankAccountLabel} />
        <InfoRow label="Relative Discount %" value={data.relativeDiscountPercent ? `${data.relativeDiscountPercent}%` : ''} />
        <InfoRow label="Global Discount" value={data.globalDiscount ? formatMoney(data.globalDiscount) : ''} />
        <InfoRow label="Max Outstanding" value={data.maxOutstanding ? formatMoney(data.maxOutstanding) : ''} />
        <InfoRow label="Currency" value={data.currencyCode} />
        <InfoRow label="Incoterms" value={data.incotermsLabel} />
      </Card>

      <Card className="!h-auto">
        <SectionHeader icon={ShoppingCart} color="indigo">
          Commercial
        </SectionHeader>
        <InfoRow label="Shipping Method" value={data.shippingMethodLabel} />
        <InfoRow label="Prospect Status" value={data.stcommLabel} />
        <InfoRow label="Prospect Potential" value={data.prospectLevelLabel} />
        <InfoRow label="Sales Representatives" value={data.salesReps.join(', ')} />
      </Card>

      <Card className="!h-auto">
        <SectionHeader icon={CalendarClock} color="green">
          Status
        </SectionHeader>
        <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border">
          <span className="text-xs text-text-faint shrink-0">Status</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${data.status === 1 ? 'bg-success-bg text-success-fg' : 'bg-surface-hover text-text-muted'}`}>
            {data.status === 1 ? 'Active' : 'Closed'}
          </span>
        </div>
        <InfoRow label="Creation Date" value={data.dateCreation} />
        <InfoRow label="Created By" value={data.createdBy} />
      </Card>
      </div>
    </div>
  )
}

// societe/api/notes.php — real, editable Public/Private notes (confirmed by
// reading that file directly: Societe::update_note() under the hood, real
// Dolibarr CSRF token required). Replaces the earlier read-only version,
// which only displayed CustomerProfile.notePublic/notePrivate.
function NotesTab({ data, socid }: { data: CustomerProfile; socid: string | undefined }) {
  const [notePublic, setNotePublic] = useState(data.notePublic ?? '')
  const [notePrivate, setNotePrivate] = useState(data.notePrivate ?? '')
  const [saved, setSaved] = useState(false)
  const saveNotes = useSaveCustomerNotes(socid)

  return (
    <div className="space-y-3">
      <TabTitle>Notes</TabTitle>
      <Card className="!h-auto">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text! mb-1.5">Public note</label>
            <textarea
              value={notePublic}
              onChange={(e) => setNotePublic(e.target.value)}
              rows={3}
              className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text! mb-1.5">Private note</label>
            <textarea
              value={notePrivate}
              onChange={(e) => setNotePrivate(e.target.value)}
              rows={3}
              className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 resize-y"
            />
          </div>
          {saveNotes.isError && <p className="text-sm text-danger">{saveNotes.error instanceof Error ? saveNotes.error.message : 'Failed to save notes.'}</p>}
          <div className="flex items-center justify-end gap-2">
            {saved && <span className="text-xs text-success-fg">Saved.</span>}
            <button
              type="button"
              disabled={saveNotes.isPending}
              onClick={() =>
                saveNotes.mutate(
                  { note_public: notePublic, note_private: notePrivate },
                  {
                    onSuccess: () => {
                      setSaved(true)
                      setTimeout(() => setSaved(false), 2500)
                    },
                  },
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-60"
            >
              <Check size={14} /> {saveNotes.isPending ? 'Saving…' : 'Save notes'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// The six tab components below all use the same real
// societe/api/{transactions,activities,contacts,contracts,customer,
// agenda}.php namespace — see customerDetailTabs.queries.ts's header
// comment for how it was found (watching societe/card.php?socid=X's own
// network traffic while switching tabs). This superseded an earlier version
// of this file that showed a session-local activity log here instead,
// mistakenly assumed to be the only real option before this real,
// per-third-party backend was found.

function TransactionsTab({ socid }: { socid: string | undefined }) {
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const toInputDate = (d: Date) => d.toISOString().slice(0, 10)
  const toUsDate = (iso: string) => {
    const [y, m, d] = iso.split('-')
    return `${m}/${d}/${y}`
  }

  const [fromDate, setFromDate] = useState(toInputDate(monthStart))
  const [toDate, setToDate] = useState(toInputDate(monthEnd))
  const { data, isLoading, isError, error, refetch } = useCustomerLedger(socid, toUsDate(fromDate), toUsDate(toDate))

  if (isLoading) return <LegacyLoadingCard label="Loading transactions…" />
  if (isError || !data) {
    return <LegacyErrorCard title="Couldn't load transactions" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }

  const middleRows = data.rows.filter((r) => r.type === 'row')

  function getExportData() {
    const rows = data!.rows.map((r) => [
      r.date,
      r.entry_type,
      r.reference,
      r.contra,
      r.description,
      r.debit ? formatMoney(r.debit) : '',
      r.credit ? formatMoney(r.credit) : '',
      formatMoney(r.cumulative),
    ])
    return { headers: ['Date', 'Entry Type', 'Reference', 'Contra Acc.', 'Description', 'Debit', 'Credit', 'Cumulative'], rows }
  }

  return (
    <div className="space-y-3">
      <TabTitle>Transactions</TabTitle>
      <Card className="!h-auto !p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-faint">Date Range:</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5" />
          <span className="text-text-faint text-sm">–</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5" />
        </div>
        <TableExportButtons title={data.account_title} getExportData={getExportData} />
      </div>
      <div className="p-4 overflow-x-auto">
        <h3 className="font-semibold text-text! mb-3">{data.account_title}</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 pr-3">Date</th>
              <th className="font-medium py-2 pr-3">Entry Type</th>
              <th className="font-medium py-2 pr-3">Reference</th>
              <th className="font-medium py-2 pr-3">Contra Acc.</th>
              <th className="font-medium py-2 pr-3">Description</th>
              <th className="font-medium py-2 pr-3 text-right">Debit</th>
              <th className="font-medium py-2 pr-3 text-right">Credit</th>
              <th className="font-medium py-2 text-right">Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={i} className={`border-b border-border last:border-0 ${r.type !== 'row' ? 'font-semibold' : ''}`}>
                <td className="py-2 pr-3 text-text-muted">{r.date}</td>
                <td className="py-2 pr-3 text-text-muted">{r.entry_type}</td>
                <td className="py-2 pr-3 text-text-muted">{r.reference}</td>
                <td className="py-2 pr-3 text-text-muted">{r.contra}</td>
                <td className="py-2 pr-3 text-text!">{r.description}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{r.debit ? formatMoney(r.debit) : ''}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{r.credit ? formatMoney(r.credit) : ''}</td>
                <td className="py-2 text-right tabular-nums text-text!">{formatMoney(r.cumulative)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {middleRows.length === 0 && <p className="text-center text-text-faint text-sm py-6">No Transactions Found For This Period</p>}
      </div>
      </Card>
    </div>
  )
}

const ACTIVITY_STATUS_BADGE: Record<string, string> = {
  done: 'bg-success-bg text-success-fg',
  open: 'bg-warning-bg text-warning-fg',
  todo: 'bg-warning-bg text-warning-fg',
  inprogress: 'bg-info-bg text-info-fg',
  closed: 'bg-neutral-bg text-neutral-fg',
}

function StatusBadge({ status }: { status: string }) {
  if (!status) return <span className="text-text-faint">—</span>
  const cls = ACTIVITY_STATUS_BADGE[status.toLowerCase()] ?? 'bg-neutral-bg text-neutral-fg'
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
}

type ActivityPanel = 'view' | 'edit' | 'schedule'

// Loads the full ActivityDetail record on demand (the list rows are a
// leaner subset — see ActivityItem vs ActivityDetail in
// customerDetailTabs.queries.ts) and hands it to the right modal for
// whichever Actions-column icon was clicked. Matches the real page's own
// activities.php?action=detail round-trip on every icon click (see
// activities.js's openActivity), rather than assuming the list row already
// has enough data.
function ActivityActionModal({ socid, activityId, panel, onClose }: { socid: string; activityId: number; panel: ActivityPanel; onClose: () => void }) {
  const { data, isLoading, isError, error, refetch } = useActivityDetail(socid, activityId)
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="rounded-lg bg-surface border border-border p-6 shadow-xl flex items-center gap-2 text-sm text-text-muted" onClick={(e) => e.stopPropagation()}>
          <LoaderCircle size={16} className="animate-spin" /> Loading…
        </div>
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
          <LegacyErrorCard title="Couldn't load activity" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
        </div>
      </div>
    )
  }
  if (panel === 'schedule') return <ScheduleActivityModal socid={socid} item={data} onClose={onClose} />
  if (panel === 'edit') {
    const type: ActivityType = data.processtype === 'meeting' ? 'meetings' : data.processtype === 'calls' ? 'calls' : 'tasks'
    return <ActivityFormModal socid={socid} type={type} mode="edit" initial={data} onClose={onClose} />
  }
  return <ActivityDetailModal socid={socid} item={data} onClose={onClose} />
}

// Actions column matches the real page's own 3 icons exactly (View always;
// Edit/Schedule only on open items — see
// activities.js's actionButtons()/isOpen check).
function ActivityTable({ items, emptyLabel, onAction }: { items: ActivityItem[]; emptyLabel: string; onAction: (id: number, panel: ActivityPanel) => void }) {
  if (items.length === 0) return <p className="text-sm text-text-faint italic py-4 text-center">{emptyLabel}</p>
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
          <th className="font-medium py-2 pr-3">Subject</th>
          <th className="font-medium py-2 pr-3">Date</th>
          <th className="font-medium py-2 pr-3">Priority</th>
          <th className="font-medium py-2 pr-3">Accounting Needs</th>
          <th className="font-medium py-2 pr-3">Status</th>
          <th className="font-medium py-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const isOpen = item.status === 'open'
          return (
            <tr key={item.id} className="border-b border-border last:border-0">
              <td className="py-2 pr-3">
                <p className="font-medium text-text!">{item.subject}</p>
                {item.description && <p className="text-xs text-text-faint">{item.description}</p>}
              </td>
              <td className="py-2 pr-3 text-text-muted whitespace-nowrap">{item.duedate || item.createddate}</td>
              <td className="py-2 pr-3 text-text-muted capitalize">{item.priority}</td>
              <td className="py-2 pr-3 text-text-muted capitalize">{item.relatedto}</td>
              <td className="py-2 pr-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="py-2 text-right">
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onAction(item.id, 'view')}
                    title="View"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-text-faint hover:bg-surface-hover hover:text-brand"
                  >
                    <Eye size={14} />
                  </button>
                  {isOpen && (
                    <>
                      <button
                        type="button"
                        onClick={() => onAction(item.id, 'edit')}
                        title="Edit"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-text-faint hover:bg-surface-hover hover:text-brand"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction(item.id, 'schedule')}
                        title="Schedule"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-info hover:bg-info-bg"
                      >
                        <CalendarClock size={14} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = { tasks: 'Task', meetings: 'Meeting', calls: 'Call' }

function ActivitySubtab({ socid, type }: { socid: string | undefined; type: ActivityType }) {
  const { data, isLoading, isError, error, refetch } = useCustomerActivities(socid, type)
  const [action, setAction] = useState<{ id: number; panel: ActivityPanel } | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  if (isLoading) return <LegacyLoadingCard label={`Loading ${type}…`} />
  if (isError || !data) {
    return <LegacyErrorCard title={`Couldn't load ${type}`} message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Plus size={14} /> Add
        </button>
      </div>
      {showAdd && socid && <ActivityFormModal socid={socid} type={type} mode="create" onClose={() => setShowAdd(false)} />}
      {action && socid && <ActivityActionModal socid={socid} activityId={action.id} panel={action.panel} onClose={() => setAction(null)} />}
      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Open Activity</h3>
          <span className="text-xs text-text-faint">{data.open.length}</span>
        </div>
        <div className="px-4 py-2 overflow-x-auto">
          <ActivityTable items={data.open} emptyLabel={`No open ${ACTIVITY_TYPE_LABEL[type].toLowerCase()}s.`} onAction={(id, panel) => setAction({ id, panel })} />
        </div>
      </Card>
      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Close Activity</h3>
          <span className="text-xs text-text-faint">{data.closed.length}</span>
        </div>
        <div className="px-4 py-2 overflow-x-auto">
          <ActivityTable items={data.closed} emptyLabel={`No closed ${ACTIVITY_TYPE_LABEL[type].toLowerCase()}s.`} onAction={(id, panel) => setAction({ id, panel })} />
        </div>
      </Card>
    </div>
  )
}

const ACTIVITY_SUBTABS: Array<{ key: ActivityType | 'timeline'; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { key: 'tasks', label: 'Tasks', icon: ListChecks },
  { key: 'meetings', label: 'Meetings', icon: Users2 },
  { key: 'calls', label: 'Calls', icon: Phone },
  { key: 'timeline', label: 'Timeline', icon: History },
]

function ActivitiesTab({ socid }: { socid: string | undefined }) {
  const [subtab, setSubtab] = useState<ActivityType | 'timeline'>('tasks')
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        {ACTIVITY_SUBTABS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSubtab(s.key)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              subtab === s.key ? 'bg-brand text-white shadow-sm shadow-brand/25' : 'text-text-muted hover:bg-surface-hover'
            }`}
          >
            <s.icon size={14} /> {s.label}
          </button>
        ))}
      </div>
      {subtab === 'timeline' ? <AgendaTab socid={socid} /> : <ActivitySubtab socid={socid} type={subtab} />}
    </div>
  )
}

function ContactsTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerContacts(socid)
  const [showAddContact, setShowAddContact] = useState(false)
  if (isLoading) return <LegacyLoadingCard label="Loading contacts…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load contacts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <TabTitle>Contacts</TabTitle>
        <button
          type="button"
          onClick={() => setShowAddContact(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Plus size={14} /> Add contact
        </button>
      </div>
      {showAddContact && socid && <AddContactModal socid={socid} onClose={() => setShowAddContact(false)} />}
      <div className="p-4">
        {data.rows.length === 0 ? (
          <p className="text-sm text-text-faint italic py-6 text-center">No contacts yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium py-2 pr-3">Name</th>
                <th className="font-medium py-2 pr-3">Position</th>
                <th className="font-medium py-2 pr-3">Email</th>
                <th className="font-medium py-2">Phone</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 font-medium text-text!">{[c.firstname, c.lastname].filter(Boolean).join(' ')}</td>
                  <td className="py-2 pr-3 text-text-muted">{c.poste}</td>
                  <td className="py-2 pr-3 text-text-muted">
                    {c.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {c.email}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-text-muted">
                    {c.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {c.phone}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  )
}

const CONTRACT_CARD_COLORS: IconColor[] = ['blue', 'green', 'amber', 'violet']

function ContractSummaryCardView({ card, color }: { card: ContractSummaryCard; color: IconColor }) {
  return (
    <Card className="!h-auto">
      <div className="flex items-center gap-2 mb-2">
        <SectionIcon icon={FileStack} color={color} />
        <h4 className="text-xs font-semibold text-text-faint uppercase tracking-wide">{card.title}</h4>
      </div>
      <div className="flex items-baseline gap-4">
        {card.items.map((it) => (
          <div key={it.label}>
            <p className="text-lg font-bold text-text!">{it.value}</p>
            <p className="text-xs text-text-faint">{it.label}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ContractsTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerContracts(socid)
  const [refFilter, setRefFilter] = useState('')
  const [refCustomerFilter, setRefCustomerFilter] = useState('')
  const [refSupplierFilter, setRefSupplierFilter] = useState('')
  const [searchAll, setSearchAll] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({ ref: '', refCustomer: '', refSupplier: '', searchAll: '' })

  if (isLoading) return <LegacyLoadingCard label="Loading contracts…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load contracts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  function resetFilters() {
    setRefFilter('')
    setRefCustomerFilter('')
    setRefSupplierFilter('')
    setSearchAll('')
    setAppliedFilters({ ref: '', refCustomer: '', refSupplier: '', searchAll: '' })
  }

  const filteredRows = data.rows.filter((r) => {
    const f = appliedFilters
    if (f.ref && !r.ref.toLowerCase().includes(f.ref.toLowerCase())) return false
    if (f.refCustomer && !r.ref_customer.toLowerCase().includes(f.refCustomer.toLowerCase())) return false
    if (f.refSupplier && !r.ref_supplier.toLowerCase().includes(f.refSupplier.toLowerCase())) return false
    if (f.searchAll) {
      const haystack = [r.ref, r.ref_customer, r.ref_supplier, r.sales_representatives, r.service_status].join(' ').toLowerCase()
      if (!haystack.includes(f.searchAll.toLowerCase())) return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.summary.cards.map((card, i) => (
          <ContractSummaryCardView key={card.title} card={card} color={CONTRACT_CARD_COLORS[i % CONTRACT_CARD_COLORS.length]} />
        ))}
      </div>
      <Card className="!h-auto">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-faint">Ref</label>
            <input
              type="text"
              value={refFilter}
              onChange={(e) => setRefFilter(e.target.value)}
              placeholder="Contract ref"
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5 w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-faint">Ref customer</label>
            <input
              type="text"
              value={refCustomerFilter}
              onChange={(e) => setRefCustomerFilter(e.target.value)}
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5 w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-faint">Ref supplier</label>
            <input
              type="text"
              value={refSupplierFilter}
              onChange={(e) => setRefSupplierFilter(e.target.value)}
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5 w-40"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-xs text-text-faint">Search all</label>
            <input
              type="text"
              value={searchAll}
              onChange={(e) => setSearchAll(e.target.value)}
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5 w-full"
            />
          </div>
          <button
            type="button"
            onClick={() => setAppliedFilters({ ref: refFilter, refCustomer: refCustomerFilter, refSupplier: refSupplierFilter, searchAll })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover"
          >
            <Search size={14} /> Apply
          </button>
          <button type="button" onClick={resetFilters} className="px-3 py-1.5 rounded-md border border-border text-text-muted text-sm font-medium hover:bg-surface-hover hover:text-text">
            Reset
          </button>
        </div>
      </Card>
      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <TabTitle>Contracts</TabTitle>
          <a
            href={stripBackendPrefix(data.urls.create)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <Plus size={14} /> New contract
          </a>
        </div>
        <div className="p-4 overflow-x-auto">
          {data.rows.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">No contracts linked to this third party.</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">No contracts match this filter.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">Ref</th>
                  <th className="font-medium py-2 pr-3">Date</th>
                  <th className="font-medium py-2 pr-3">Sales reps</th>
                  <th className="font-medium py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.ref} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3 font-medium text-text!">{r.ref}</td>
                    <td className="py-2 pr-3 text-text-muted">{r.date_contract}</td>
                    <td className="py-2 pr-3 text-text-muted">{r.sales_representatives}</td>
                    <td className="py-2 text-text-muted">{r.service_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}

function CustomerTab({ socid, profile }: { socid: string | undefined; profile: CustomerProfile }) {
  const { data, isLoading, isError, error, refetch } = useCustomerTab(socid)
  if (isLoading) return <LegacyLoadingCard label="Loading customer info…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load customer info" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const prospectLevelLabel = data.prospect_levels.find((p) => p.code === data.prospectlevel)?.label
  const stcommLabel = data.stcomms.find((s) => s.id === data.stcomm_id)?.label

  return (
    <div className="space-y-4">
      <TabTitle>Customer</TabTitle>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!h-auto">
          <p className="text-xs text-text-faint uppercase tracking-wide">Proposals</p>
          <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.proposals_kpi.total_ht)}</p>
          <p className="text-xs text-text-faint">Outstanding: {formatMoney(data.proposals_kpi.opened)}</p>
          <a href={stripBackendPrefix(data.urls.proposals_list)} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand hover:underline">
            View all
          </a>
        </Card>
        <Card className="!h-auto">
          <p className="text-xs text-text-faint uppercase tracking-wide">Orders</p>
          <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.orders_kpi.total_ht)}</p>
          <p className="text-xs text-text-faint">Outstanding: {formatMoney(data.orders_kpi.opened)}</p>
          <a href={stripBackendPrefix(data.urls.orders_list)} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand hover:underline">
            View all
          </a>
        </Card>
        <Card className="!h-auto">
          <p className="text-xs text-text-faint uppercase tracking-wide">Invoices</p>
          <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(profile.kpiInvoice)}</p>
          <p className="text-xs text-text-faint">Outstanding: {formatMoney(data.outstanding.total_ht)}</p>
          <a href={stripBackendPrefix(data.urls.invoices_list)} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand hover:underline">
            View all
          </a>
        </Card>
        <Card className="!h-auto">
          <p className="text-xs text-text-faint uppercase tracking-wide">Customer Credit / Advance</p>
          <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.advance)}</p>
          <p className="text-xs text-text-faint">Discount: {data.remise_percent}%</p>
          <a href={stripBackendPrefix(data.urls.discount)} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand hover:underline">
            Manage discounts
          </a>
        </Card>
      </div>

      <Card className="!h-auto">
        <InfoRow label="Prospect / Customer" value={data.client_label} />
        <InfoRow label="Customer Code" value={data.code_client} />
        <InfoRow label="Accounting Code" value={data.code_compta} />
        <InfoRow label="Discount %" value={data.remise_percent ? `${data.remise_percent}%` : ''} />
        <InfoRow label="Payment Terms" value={data.cond_reglement_label} />
        <InfoRow label="Payment Mode" value={data.mode_reglement_label} />
        <InfoRow label="Prospect Level" value={prospectLevelLabel} />
        <InfoRow label="Prospect Status" value={stcommLabel} />
        <InfoRow label="Sales Reps" value={data.sales_reps.join(', ')} />
        <InfoRow label="Categories" value={data.categories.join(', ')} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RecentDocsCard title="Recent proposals" doc={data.proposals} viewAllUrl={data.urls.proposals_list} createUrl={data.urls.proposals_create} />
        <RecentDocsCard title="Recent orders" doc={data.orders} viewAllUrl={data.urls.orders_list} createUrl={data.urls.orders_create} />
        <RecentDocsCard title="Recent invoices" doc={data.invoices} viewAllUrl={data.urls.invoices_list} createUrl={data.urls.invoices_create} />
      </div>

      <div className="flex flex-wrap gap-2">
        {data.buttons
          .filter((b) => b.visible)
          .map((b) =>
            b.refused ? (
              <span
                key={b.key}
                title={b.title}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-faint opacity-60 cursor-not-allowed"
              >
                {b.label}
              </span>
            ) : (
              <a
                key={b.key}
                href={stripBackendPrefix(b.url)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover"
              >
                {b.label} <ExternalLink size={12} />
              </a>
            ),
          )}
      </div>
    </div>
  )
}

function RecentDocsCard({ title, doc, viewAllUrl, createUrl }: { title: string; doc: { count: number; rows: CustomerTabDocRow[] }; viewAllUrl: string; createUrl: string }) {
  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-text!">{title}</h3>
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-surface-hover text-text-muted text-[10px] font-semibold">{doc.count}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a href={stripBackendPrefix(viewAllUrl)} target="_blank" rel="noreferrer" className="text-xs font-medium text-text-muted hover:text-text">
            View all
          </a>
          <a
            href={stripBackendPrefix(createUrl)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-hover"
          >
            <Plus size={12} /> New
          </a>
        </div>
      </div>
      <div className="p-4">
        {doc.rows.length === 0 ? (
          <p className="text-sm text-text-faint italic py-4 text-center">No records yet.</p>
        ) : (
          <ul className="space-y-2">
            {doc.rows.map((r, i) => (
              <li key={r.ref ?? i} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-text! truncate">{r.ref}</span>
                <span className="text-text-muted shrink-0">{r.total_ht !== undefined ? formatMoney(r.total_ht) : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

// Native rebuild of fourn/card.php's own "VENDOR" tab, backed by the real
// societe/api/supplier.php endpoint (see customerDetailTabs.queries.ts's
// VendorTabResponse comment for exactly which fields were confirmed live
// and which real-page sub-lines this endpoint doesn't expose).
function VendorTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useVendorTab(socid)
  if (isLoading) return <LegacyLoadingCard label="Loading vendor info…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load vendor info" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!h-auto">
          <p className="text-xs text-text-faint uppercase tracking-wide">Price Requests</p>
          <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.proposals_kpi.total_ht)}</p>
          <p className="text-xs text-text-faint">Outstanding: {formatMoney(data.proposals_kpi.opened)}</p>
        </Card>
        <Card className="!h-auto">
          <p className="text-xs text-text-faint uppercase tracking-wide">Orders</p>
          <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.orders_kpi.total_ht)}</p>
          <p className="text-xs text-text-faint">Outstanding: {formatMoney(data.orders_kpi.opened)}</p>
        </Card>
        <Card className="!h-auto">
          <p className="text-xs text-text-faint uppercase tracking-wide">Invoices</p>
          <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.supplier_outstanding.total_ht)}</p>
          <p className="text-xs text-text-faint">Current Outstanding Bill: {formatMoney(data.supplier_outstanding.opened)}</p>
        </Card>
        <Card className="!h-auto">
          <p className="text-xs text-text-faint uppercase tracking-wide">Capital / Advance</p>
          <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(Number(data.fields.capital) || 0)}</p>
          <p className="text-xs text-text-faint">Advance: {formatMoney(data.fields.advance)}</p>
        </Card>
      </div>

      <Card className="!h-auto">
        <InfoRow label="Vendor Code" value={data.code_fournisseur} />
        <InfoRow label="Vendor Accounting Code" value={data.code_compta_fournisseur} />
        <InfoRow label="VAT ID" value={data.fields.tva_intra} />
        <InfoRow label="Payment Terms" value={data.cond_reglement_label} />
        <InfoRow label="Payment Type" value={data.mode_reglement_label} />
        <InfoRow label="Relative Discount" value={data.fields.remise_percent ? `${data.fields.remise_percent}%` : ''} />
        <InfoRow label="Absolute Discount" value={data.fields.remise_absolue ? formatMoney(data.fields.remise_absolue) : ''} />
        <InfoRow label="Vendors Tags/Categories" value={data.fields.categories.join(', ')} />
      </Card>

      <div className="flex flex-wrap gap-2">
        <a
          href={stripBackendPrefix(data.buttons.create_proposal)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover"
        >
          Create A Price Request <ExternalLink size={12} />
        </a>
        <a
          href={stripBackendPrefix(data.buttons.create_order)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover"
        >
          Create Order <ExternalLink size={12} />
        </a>
        <a
          href={stripBackendPrefix(data.buttons.create_invoice)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover"
        >
          Create Invoice Or Credit Note <ExternalLink size={12} />
        </a>
      </div>
    </div>
  )
}

const AGENDA_STATUS_BADGE: Record<string, string> = {
  done: 'bg-success-bg text-success-fg',
  todo: 'bg-warning-bg text-warning-fg',
  inprogress: 'bg-info-bg text-info-fg',
}

function AgendaTimelineList({ days }: { days: AgendaDay[] }) {
  if (days.length === 0) return <p className="text-sm text-text-faint italic py-8 text-center">No events found.</p>
  return (
    <div className="space-y-6">
      {days.map((day) => (
        <div key={day.date}>
          <div className="inline-block px-2.5 py-1 rounded-md bg-brand/10 text-brand text-xs font-semibold mb-3">{day.date_label}</div>
          <div className="space-y-3">
            {day.events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-hover text-text-muted shrink-0 mt-0.5">
                  {ev.type.includes('AUTO') ? <Bot size={14} /> : <CalendarClock size={14} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-faint mb-0.5">{ev.time}</p>
                  {ev.url ? (
                    <a href={stripBackendPrefix(ev.url)} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                      {ev.label}
                    </a>
                  ) : (
                    <p className="font-medium text-text!">{ev.label}</p>
                  )}
                  <p className="text-xs text-text-faint mt-0.5 italic">
                    {ev.type_label} · {ev.user}
                  </p>
                  {ev.note && <p className="text-sm text-text-muted mt-1">{ev.note}</p>}
                </div>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium shrink-0 ${AGENDA_STATUS_BADGE[ev.status] ?? 'bg-neutral-bg text-neutral-fg'}`}
                >
                  {ev.status_label}
                  {ev.late ? ' · Late' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function AgendaTab({ socid }: { socid: string | undefined }) {
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [user, setUser] = useState('')
  const [search, setSearch] = useState('')
  const { data, isLoading, isError, error, refetch } = useCustomerAgenda(socid, { type, status, user, search })

  if (isLoading) return <LegacyLoadingCard label="Loading agenda…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load agenda" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle>Agenda</TabTitle>
      <Card className="!h-auto">
        <div className="flex flex-wrap items-center gap-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
            {data.filters.types.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
            {data.filters.statuses.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={user} onChange={(e) => setUser(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
            {data.filters.users.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search label"
            className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5 flex-1 min-w-[160px]"
          />
        </div>
      </Card>
      <Card className="!h-auto">
        <AgendaTimelineList days={data.timeline} />
      </Card>
    </div>
  )
}

// societe/api/pricing_groups.php — real, global custom_group table (not
// scoped to one third party). Read-only: the real page itself is a plain
// table with no inline create/edit UI, confirmed against the real
// screenshot.
function PricingGroupsTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerPricingGroups(socid)
  if (isLoading) return <LegacyLoadingCard label="Loading pricing groups…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load pricing groups" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle>Pricing groups</TabTitle>
      <Card className="!h-auto !p-0 overflow-hidden">
        {data.groups.length === 0 ? (
          <p className="text-sm text-text-faint italic py-6 text-center">No pricing groups found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2.5 px-4">Label</th>
                  <th className="font-medium py-2.5 px-4">Discount</th>
                  <th className="font-medium py-2.5 px-4">Discount Type</th>
                  <th className="font-medium py-2.5 px-4">Customer Method</th>
                  <th className="font-medium py-2.5 px-4">Description</th>
                  <th className="font-medium py-2.5 px-4">Tms</th>
                </tr>
              </thead>
              <tbody>
                {data.groups.map((g) => (
                  <tr key={g.id} className={`border-b border-border last:border-0 ${g.id === data.group_id ? 'bg-brand/5' : ''}`}>
                    <td className="py-2.5 px-4 font-medium text-text!">{g.label}</td>
                    <td className="py-2.5 px-4 text-text-muted">{g.discount}</td>
                    <td className="py-2.5 px-4 text-text-muted">{g.discount_type}</td>
                    <td className="py-2.5 px-4 text-text-muted">{g.customer_method}</td>
                    <td className="py-2.5 px-4 text-text-muted">{g.description}</td>
                    <td className="py-2.5 px-4 text-text-muted whitespace-nowrap">{g.tms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// societe/api/documents.php — real files under documents/societe/<id>/,
// confirmed by reading that file directly (dol_dir_list against the real
// upload_dir, real multipart upload via dol_move_uploaded_file).
function DocumentsTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerDocuments(socid)
  const uploadDocument = useUploadCustomerDocument(socid)
  const [file, setFile] = useState<File | null>(null)

  if (isLoading) return <LegacyLoadingCard label="Loading documents…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load documents" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle>Documents</TabTitle>
      <Card className="!h-auto">
        {data.documents.length === 0 ? (
          <p className="text-sm text-text-faint italic mb-4">No documents yet.</p>
        ) : (
          <ul className="divide-y divide-border mb-4">
            {data.documents.map((doc) => (
              <li key={doc.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                <a href={stripBackendPrefix(doc.download_url)} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline truncate">
                  {doc.name}
                </a>
                <span className="text-text-faint shrink-0 flex items-center gap-3">
                  <span>{doc.size}</span>
                  <span>{doc.date}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {data.can_edit && (
          <div>
            <label className="block text-sm font-semibold text-text! mb-1.5">Upload file</label>
            {uploadDocument.isError && <p className="text-sm text-danger mb-2">{uploadDocument.error instanceof Error ? uploadDocument.error.message : 'Failed to upload file.'}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm text-text file:mr-3 file:rounded-md file:border file:border-input-border file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text"
              />
              <button
                type="button"
                disabled={!file || uploadDocument.isPending}
                onClick={() =>
                  file &&
                  uploadDocument.mutate(file, {
                    onSuccess: () => setFile(null),
                  })
                }
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
              >
                <Upload size={14} /> {uploadDocument.isPending ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

// societe/api/notify.php — real notify_def rows, confirmed by reading that
// file directly (real INNER JOIN against c_action_trigger/socpeople; POST
// action=add performs a real INSERT).
function NotificationsTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerNotifications(socid)
  const addNotification = useAddCustomerNotification(socid)
  const [actionId, setActionId] = useState('')
  const [contactId, setContactId] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading notifications…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load notifications" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle>Notifications</TabTitle>
      <Card className="!h-auto">
        {data.assigned.length === 0 ? (
          <p className="text-sm text-text-faint italic mb-4">No notifications assigned.</p>
        ) : (
          <ul className="divide-y divide-border mb-4">
            {data.assigned.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-medium text-text!">{n.label}</span>
                <span className="text-text-muted">{n.contact_name}</span>
              </li>
            ))}
          </ul>
        )}
        {data.can_edit && (
          <div>
            <h4 className="font-semibold text-text! mb-2">Add notification</h4>
            {addNotification.isError && <p className="text-sm text-danger mb-2">{addNotification.error instanceof Error ? addNotification.error.message : 'Failed to add notification.'}</p>}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label className="text-xs text-text-faint">Event</label>
                <select value={actionId} onChange={(e) => setActionId(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5">
                  <option value="">—</option>
                  {data.available.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label className="text-xs text-text-faint">Contact</label>
                <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5">
                  <option value="">—</option>
                  {data.contacts.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name ?? o.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={!actionId || !contactId || addNotification.isPending}
                onClick={() =>
                  addNotification.mutate(
                    { action_id: Number(actionId), contact_id: Number(contactId) },
                    {
                      onSuccess: () => {
                        setActionId('')
                        setContactId('')
                      },
                    },
                  )
                }
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {addNotification.isPending ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

const CONSUMPTION_SECTIONS = ['propals', 'orders', 'invoices', 'interventions', 'supplier_orders', 'supplier_invoices'] as const

// societe/api/consumption.php — real per-table counts/rows (propal/
// commande/facture/fichinter, or the supplier-side tables for a vendor),
// confirmed by reading that file directly. Read-only, matching the real
// page's own "Open list"/"All" links out rather than any inline action.
function ConsumptionTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerConsumption(socid)
  if (isLoading) return <LegacyLoadingCard label="Loading consumption…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load consumption" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  // section_labels always lists all 6 possible sections (a static map on the
  // backend); only the ones relevant to this record's client/supplier type
  // are actually populated in summary/sections — filter on that instead, or
  // every customer record would also show empty Supplier orders/Supplier
  // invoices cards the real page never displays for them.
  const sectionKeys = CONSUMPTION_SECTIONS.filter((k) => k in data.summary)

  return (
    <div className="space-y-3">
      <TabTitle>Consumption</TabTitle>
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${sectionKeys.length > 4 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
        {sectionKeys.map((key) => (
          <Card key={key} className="!h-auto">
            <p className="text-xs text-text-faint uppercase tracking-wide">{data.section_labels[key]}</p>
            <p className="text-lg font-bold text-text! mt-0.5">{data.summary[key] ?? 0}</p>
            <a href={stripBackendPrefix(data.urls.lists[key] ?? '')} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand hover:underline">
              Open list
            </a>
          </Card>
        ))}
      </div>
      {sectionKeys.map((key) => (
        <Card key={key} className="!h-auto !p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-text!">{data.section_labels[key]}</h3>
            <a
              href={stripBackendPrefix(data.urls.lists[key] ?? '')}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-md border border-border text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text"
            >
              All
            </a>
          </div>
          <div className="p-4">
            {(data.sections[key] ?? []).length === 0 ? (
              <p className="text-sm text-text-faint italic text-center py-2">No recent rows.</p>
            ) : (
              <ul className="space-y-2">
                {data.sections[key].map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                    <a href={stripBackendPrefix(row.url)} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline truncate">
                      {row.ref}
                    </a>
                    <span className="text-text-muted shrink-0 flex items-center gap-3">
                      <span>{row.date}</span>
                      {row.total > 0 && <span>{formatMoney(row.total)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

// societe/api/tickets.php — real llx_ticket rows scoped to this third
// party, confirmed by reading that file directly (real filters/status
// options straight off c_ticket_type/c_ticket_severity).
function TicketsTab({ socid }: { socid: string | undefined }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('openall')
  const [type, setType] = useState('')
  const [severity, setSeverity] = useState('')
  const [filters, setFilters] = useState<TicketsFilters>({ status: 'openall' })

  const { data, isLoading, isError, error, refetch } = useCustomerTickets(socid, filters)
  if (isLoading) return <LegacyLoadingCard label="Loading tickets…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load tickets" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  function applyFilters() {
    setFilters({ search, status, type, severity })
  }
  function resetFilters() {
    setSearch('')
    setStatus('openall')
    setType('')
    setSeverity('')
    setFilters({ status: 'openall' })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TabTitle>Tickets</TabTitle>
        {data.can_create && (
          <a
            href={stripBackendPrefix(data.urls.create)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <Plus size={14} /> New ticket
          </a>
        )}
      </div>
      <Card className="!h-auto">
        <p className="text-sm font-medium text-text! mb-3">{data.count} ticket(s)</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-xs text-text-faint">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ref, subject, track ID"
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-faint">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5">
              {data.filter_options.status.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-faint">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5">
              <option value="">All</option>
              {data.filter_options.types.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-faint">Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5">
              <option value="">All</option>
              {data.filter_options.severities.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={applyFilters} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover">
            <Search size={14} /> Apply
          </button>
          <button type="button" onClick={resetFilters} className="px-3 py-1.5 rounded-md border border-border text-text-muted text-sm font-medium hover:bg-surface-hover hover:text-text">
            Reset
          </button>
        </div>
        {data.rows.length === 0 ? (
          <p className="text-sm text-text-faint italic text-center py-6">No tickets for this third party.</p>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">Ref</th>
                  <th className="font-medium py-2 pr-3">Subject</th>
                  <th className="font-medium py-2 pr-3">Type</th>
                  <th className="font-medium py-2 pr-3">Severity</th>
                  <th className="font-medium py-2 pr-3">Status</th>
                  <th className="font-medium py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">
                      <a href={stripBackendPrefix(t.url)} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                        {t.ref}
                      </a>
                    </td>
                    <td className="py-2 pr-3 text-text!">{t.subject}</td>
                    <td className="py-2 pr-3 text-text-muted">{t.type_label}</td>
                    <td className="py-2 pr-3 text-text-muted">{t.severity_label}</td>
                    <td className="py-2 pr-3 text-text-muted">{t.status_label}</td>
                    <td className="py-2 text-text-muted">{t.date_created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// societe/api/projects.php — real llx_projet rows scoped to fk_soc,
// confirmed by reading that file directly.
function ProjectsTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerProjects(socid)
  if (isLoading) return <LegacyLoadingCard label="Loading projects…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load projects" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TabTitle>Projects</TabTitle>
        <a
          href={stripBackendPrefix(data.urls.create)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Plus size={14} /> New project
        </a>
      </div>
      <Card className="!h-auto">
        {data.projects.length === 0 ? (
          <p className="text-sm text-text-faint italic text-center py-6">No projects linked to this third party.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">Ref</th>
                  <th className="font-medium py-2 pr-3">Title</th>
                  <th className="font-medium py-2 pr-3">Start</th>
                  <th className="font-medium py-2 pr-3">End</th>
                  <th className="font-medium py-2 pr-3">Tasks</th>
                  <th className="font-medium py-2">Budget</th>
                </tr>
              </thead>
              <tbody>
                {data.projects.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">
                      <a href={stripBackendPrefix(p.url)} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                        {p.ref}
                      </a>
                    </td>
                    <td className="py-2 pr-3 text-text!">{p.title}</td>
                    <td className="py-2 pr-3 text-text-muted">{p.date_start}</td>
                    <td className="py-2 pr-3 text-text-muted">{p.date_end}</td>
                    <td className="py-2 pr-3 text-text-muted">{p.task_count}</td>
                    <td className="py-2 text-text-muted">{p.budget > 0 ? formatMoney(p.budget) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// societe/api/expenses.php — real llx_expensereport rows when a fk_soc link
// exists; on this deployment it always reports a real, honest `message`
// instead ("No third-party link on expense reports"), confirmed by
// reading that file directly.
function ExpensesTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerExpenses(socid)
  if (isLoading) return <LegacyLoadingCard label="Loading expenses…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load expenses" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle>Expenses</TabTitle>
      <Card className="!h-auto">
        {data.expenses.length === 0 ? (
          <p className="text-sm text-text-faint italic text-center py-6">{data.message || 'No expense reports linked to this third party.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">Ref</th>
                  <th className="font-medium py-2 pr-3">Start</th>
                  <th className="font-medium py-2 pr-3">End</th>
                  <th className="font-medium py-2 pr-3">Total (Excl.)</th>
                  <th className="font-medium py-2">Total (Incl.)</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">
                      <a href={stripBackendPrefix(e.url)} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                        {e.ref}
                      </a>
                    </td>
                    <td className="py-2 pr-3 text-text-muted">{e.date_start}</td>
                    <td className="py-2 pr-3 text-text-muted">{e.date_end}</td>
                    <td className="py-2 pr-3 text-text-muted">{formatMoney(e.total_ht)}</td>
                    <td className="py-2 text-text!">{formatMoney(e.total_ttc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// societe/api/paymentmodes.php — real llx_societe_rib rows (or
// CompanyBankAccount when present), confirmed by reading that file
// directly. Real create action wired via useCreatePaymentMode.
function PaymentModesTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerPaymentModes(socid)
  const createMode = useCreatePaymentMode(socid)
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [bank, setBank] = useState('')
  const [iban, setIban] = useState('')
  const [bic, setBic] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading payment modes…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load payment modes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  function resetForm() {
    setLabel('')
    setBank('')
    setIban('')
    setBic('')
    setShowForm(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TabTitle>Payment modes</TabTitle>
        {data.can_edit && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <Plus size={14} /> Add account
          </button>
        )}
      </div>
      {showForm && (
        <Card className="!h-auto">
          {createMode.isError && <p className="text-sm text-danger mb-2">{createMode.error instanceof Error ? createMode.error.message : 'Failed to add payment mode.'}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-faint">Label*</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-faint">Bank*</label>
              <input value={bank} onChange={(e) => setBank(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-faint">IBAN</label>
              <input value={iban} onChange={(e) => setIban(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-faint">BIC</label>
              <input value={bic} onChange={(e) => setBic(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button type="button" onClick={resetForm} className="px-3 py-1.5 rounded-md border border-border text-text-muted text-sm font-medium hover:bg-surface-hover hover:text-text">
              Cancel
            </button>
            <button
              type="button"
              disabled={!label || !bank || createMode.isPending}
              onClick={() => createMode.mutate({ label, bank, iban, bic }, { onSuccess: resetForm })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-60"
            >
              <Check size={14} /> {createMode.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Card>
      )}
      <Card className="!h-auto">
        {data.paymentmodes.length === 0 ? (
          <p className="text-sm text-text-faint italic text-center py-6">No bank accounts yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.paymentmodes.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-medium text-text!">
                  {m.label} {m.default_rib === 1 && <span className="ml-1 text-xs text-brand">(default)</span>}
                </span>
                <span className="text-text-muted">
                  {m.bank} {m.iban && `· ${m.iban}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

// societe/api/accounting_ar.php / accounting_ap.php — real open-invoice
// summaries, confirmed by reading both files directly. Shared component
// since both return the identical AccountingResponse shape.
function AccountingSummaryTab({
  title,
  useHook,
}: {
  title: string
  useHook: (socid: string | undefined) => { data?: AccountingResponse; isLoading: boolean; isError: boolean; error: unknown; refetch: () => void }
}) {
  return function Inner({ socid }: { socid: string | undefined }) {
    const { data, isLoading, isError, error, refetch } = useHook(socid)
    if (isLoading) return <LegacyLoadingCard label={`Loading ${title.toLowerCase()}…`} />
    if (isError || !data) return <LegacyErrorCard title={`Couldn't load ${title.toLowerCase()}`} message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

    return (
      <div className="space-y-3">
        <TabTitle>{title}</TabTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="!h-auto">
            <p className="text-xs text-text-faint uppercase tracking-wide">Total invoiced</p>
            <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.summary.total_invoiced)}</p>
          </Card>
          <Card className="!h-auto">
            <p className="text-xs text-text-faint uppercase tracking-wide">Total paid</p>
            <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.summary.total_paid)}</p>
          </Card>
          <Card className="!h-auto">
            <p className="text-xs text-text-faint uppercase tracking-wide">Outstanding</p>
            <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.summary.total_open)}</p>
          </Card>
          <Card className="!h-auto">
            <p className="text-xs text-text-faint uppercase tracking-wide">Open invoices</p>
            <p className="text-lg font-bold text-text! mt-0.5">
              {data.summary.open_count} / {data.summary.invoice_count}
            </p>
          </Card>
        </div>
        <Card className="!h-auto">
          {data.invoices.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <BookOpen size={28} className="text-text-faint" />
              <p className="text-sm font-medium text-text-faint">{title}</p>
              <p className="text-sm text-text-faint">No records yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium py-2 pr-3">Ref</th>
                    <th className="font-medium py-2 pr-3">Date</th>
                    <th className="font-medium py-2 pr-3">Due</th>
                    <th className="font-medium py-2 pr-3">Total</th>
                    <th className="font-medium py-2 pr-3">Paid</th>
                    <th className="font-medium py-2">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 font-medium text-text!">{inv.ref}</td>
                      <td className="py-2 pr-3 text-text-muted">{inv.date}</td>
                      <td className="py-2 pr-3 text-text-muted">{inv.due_date}</td>
                      <td className="py-2 pr-3 text-text-muted">{formatMoney(inv.total_ttc)}</td>
                      <td className="py-2 pr-3 text-text-muted">{formatMoney(inv.paid)}</td>
                      <td className="py-2 text-text!">{formatMoney(inv.open)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    )
  }
}

const AccountsReceivableTab = AccountingSummaryTab({ title: 'Accounts receivable', useHook: useCustomerAccountsReceivable })
const AccountsPayableTab = AccountingSummaryTab({ title: 'Accounts payable', useHook: useCustomerAccountsPayable })

// societe/api/general_ledger.php — real bank movements (via bank_url) plus
// real bookkeeping lines matched on this record's own accounting code,
// confirmed by reading that file directly.
function GeneralLedgerTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerGeneralLedger(socid)
  if (isLoading) return <LegacyLoadingCard label="Loading general ledger…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load general ledger" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle>General ledger</TabTitle>
      <Card className="!h-auto">
        {data.movements.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <BookOpen size={28} className="text-text-faint" />
            <p className="text-sm font-medium text-text-faint">General ledger</p>
            <p className="text-sm text-text-faint">No records yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">Date</th>
                  <th className="font-medium py-2 pr-3">Label</th>
                  <th className="font-medium py-2 pr-3">Account</th>
                  <th className="font-medium py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.movements.map((m) => (
                  <tr key={`${m.source}-${m.id}`} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3 text-text-muted">{m.date}</td>
                    <td className="py-2 pr-3 text-text!">{m.label}</td>
                    <td className="py-2 pr-3 text-text-muted">{m.account}</td>
                    <td className={`py-2 ${m.amount < 0 ? 'text-danger' : 'text-text!'}`}>{formatMoney(m.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
