import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
} from 'lucide-react'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useCustomerDetail, useUpdateCustomer, type CustomerProfile, type CustomerEditableFields } from '../customerDetail.queries'
import { useRecentActivity } from '../../agenda/agenda.queries'

// Native rebuild of the legacy Third-Party detail page
// (societe/card.php?socid=X) — the page a real "New Third Party" creation
// lands on, matching this app's standing rule: build the same scenario
// natively with real data instead of routing back to the legacy page. Data
// source: societe/api/societe.php?id=X (see customerDetail.queries.ts's own
// header comment for how that endpoint was found and verified).
//
// The legacy page exposes 20 distinct tabs (deduped from its own `tabs`
// array — a few, like "note"/"notes" and "document"/"documents", are just
// aliases of each other). Only Third-party, Notes, and Activities have a
// real backing data source on this backend (the full profile call for the
// first two, this app's existing local session-activity log — already the
// honest, established pattern elsewhere, e.g. ProductDetail's Activity
// Timeline — for the third). The rest render an honest "not built yet" card
// rather than fabricated content, same convention as the Dictionary Setup
// page.

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

const TABS = [
  { key: 'societe', label: 'Third-party', icon: Info },
  { key: 'transactions', label: 'Transactions', icon: ShoppingCart },
  { key: 'activities', label: 'Activities', icon: CalendarClock },
  { key: 'contacts', label: 'Contacts/Addresses', icon: Users2 },
  { key: 'contracts', label: 'Contract-Follow', icon: FileStack },
  { key: 'customer', label: 'Customer', icon: BadgeDollarSign },
  { key: 'projects', label: 'Projects', icon: Briefcase },
  { key: 'tickets', label: 'Tickets', icon: Ticket },
  { key: 'expenses', label: 'Expenses', icon: Wallet },
  { key: 'consumption', label: 'Consumption', icon: BadgeDollarSign },
  { key: 'paymentmodes', label: 'Payment Modes', icon: Wallet },
  { key: 'notify', label: 'Notify', icon: Bell },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'documents', label: 'Documents', icon: Paperclip },
  { key: 'agenda', label: 'Events/Agenda', icon: CalendarClock },
  { key: 'pricing_groups', label: 'Pricing Groups', icon: Tags },
  { key: 'accounting_ar', label: 'Accounting AR', icon: BookOpen },
  { key: 'accounting_ap', label: 'Accounting AP', icon: BookOpen },
  { key: 'general_ledger', label: 'General Ledger', icon: BookOpen },
  { key: 'rib', label: 'RIB', icon: Landmark },
] as const

type TabKey = (typeof TABS)[number]['key']

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useCustomerDetail(id)
  const [tab, setTab] = useState<TabKey>('societe')
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

  const natureBadge = data.isCustomer && data.client === 2 ? 'Prospect' : data.isCustomer ? 'Customer' : data.isVendor ? 'Vendor' : 'Third-party'
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
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`flex items-center gap-1.5 shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                      tab === key ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text hover:border-border'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" /> {label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
        {tab === 'societe' && <ThirdPartyTab data={data} isEditing={isEditing} formValues={formValues} setField={setField} />}
        {tab === 'notes' && <NotesTab data={data} />}
        {tab === 'activities' && <ActivitiesTab />}
        {tab !== 'societe' && tab !== 'notes' && tab !== 'activities' && <NotBuiltCard label={TABS.find((t) => t.key === tab)!.label} />}
      </div>
    </div>
  )
}

function ThirdPartyTab({
  data,
  isEditing,
  formValues,
  setField,
}: {
  data: CustomerProfile
  isEditing: boolean
  formValues: CustomerEditableFields
  setField: (key: keyof CustomerEditableFields) => (value: string) => void
}) {
  return (
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
  )
}

function NotesTab({ data }: { data: CustomerProfile }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="!h-auto">
        <SectionHeader icon={StickyNote} color="blue">
          Public Note
        </SectionHeader>
        <p className="text-sm text-text! whitespace-pre-wrap">{data.notePublic || <span className="text-text-faint italic">No public note.</span>}</p>
      </Card>
      <Card className="!h-auto">
        <SectionHeader icon={StickyNote} color="amber">
          Private Note
        </SectionHeader>
        <p className="text-sm text-text! whitespace-pre-wrap">{data.notePrivate || <span className="text-text-faint italic">No private note.</span>}</p>
      </Card>
    </div>
  )
}

// Same honest, session-local activity pattern already used elsewhere in
// this app (e.g. ProductDetail's Activity Timeline) — no real llx_actioncomm
// endpoint exists on this backend (see agenda.queries.ts's own header
// comment), so this shows what's actually happened this session rather than
// fabricating history. Not filtered to this specific third party since the
// underlying log has no per-record linkage — shows the general recent feed.
function ActivitiesTab() {
  const { data } = useRecentActivity({ category: 'thirdparty', limit: 20 })
  return (
    <Card className="!h-auto">
      <SectionHeader icon={CalendarClock} color="indigo">
        Recent Activity (this session)
      </SectionHeader>
      {data.length === 0 ? (
        <p className="text-sm text-text-faint italic py-6 text-center">No third-party activity logged yet this session.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((e, i) => (
            <li key={e.id} className={`flex items-start gap-3 py-2 ${i !== data.length - 1 ? 'border-b border-border' : ''}`}>
              <span className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
              <div>
                <p className="text-sm text-text!">{e.label}</p>
                <p className="text-xs text-text-faint">
                  {e.authorName} · {new Date(e.date).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
