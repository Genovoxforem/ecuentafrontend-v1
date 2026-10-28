import { Link } from 'react-router-dom'
import { X, Info, MapPin, Receipt, FileText, CalendarClock, ShoppingCart, Pencil, Check, Lock } from 'lucide-react'
import { Card, type IconColor } from '../../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../../routes'
import { formatDateTime, formatMoney } from '../../../../utils/format'
import type { CustomerProfile, CustomerEditableFields } from '../../customerDetail.queries'
import { useThirdPartyFormOptions } from '../../thirdPartyOptions.queries'
import { InfoRow, type QuickSelectValues, SectionIcon, natureBadgeLabel } from './CustomerDetailShared'

export function SectionHeader({ icon, color, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; color: IconColor; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <SectionIcon icon={icon} color={color} />
      <h3 className="font-semibold text-text!">{children}</h3>
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
    <div className="-mx-2 flex items-center justify-between gap-4 rounded-md border-b border-border bg-brand/5 px-2 py-1 last:border-0">
      <span className="flex items-center gap-1 text-xs font-medium text-brand shrink-0">
        <Pencil size={10} className="shrink-0" />
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="text-sm text-text! text-right bg-input-bg border border-brand/40 rounded-md px-2 py-1 w-full max-w-[220px] shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
      />
    </div>
  )
}

// A dropdown row that is highlighted like EditableRow while quick-editing.
function EditableSelectRow({ label, value, options, onChange, placeholder = '—' }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="-mx-2 flex items-center justify-between gap-4 rounded-md border-b border-border bg-brand/5 px-2 py-1 last:border-0">
      <span className="flex items-center gap-1 text-xs font-medium text-brand shrink-0">
        <Pencil size={10} className="shrink-0" />
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="text-sm text-text! bg-input-bg border border-brand/40 rounded-md px-2 py-1 w-full max-w-[220px] shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// Tags as removable chips plus a picker for the next one (a record can carry several).
function TagPickerRow({ label, options, selected, onChange }: { label: string; options: { value: string; label: string }[]; selected: number[]; onChange: (ids: number[]) => void }) {
  const left = options.filter((o) => !selected.includes(Number(o.value)))
  return (
    <div className="-mx-2 flex items-start justify-between gap-4 rounded-md border-b border-border bg-brand/5 px-2 py-1.5 last:border-0">
      <span className="flex items-center gap-1 pt-1 text-xs font-medium text-brand shrink-0">
        <Pencil size={10} className="shrink-0" />
        {label}
      </span>
      <div className="flex max-w-[260px] flex-1 flex-wrap items-center justify-end gap-1">
        {selected.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
            {options.find((o) => Number(o.value) === id)?.label ?? `#${id}`}
            <button type="button" onClick={() => onChange(selected.filter((x) => x !== id))} aria-label="Remove tag" className="hover:text-danger">
              <X size={11} />
            </button>
          </span>
        ))}
        <select
          value=""
          onChange={(e) => e.target.value && onChange([...selected, Number(e.target.value)])}
          aria-label={`Add ${label}`}
          className="rounded-md border border-brand/40 bg-input-bg px-1.5 py-0.5 text-xs text-text"
        >
          <option value="">{left.length === 0 ? '—' : 'Add…'}</option>
          {left.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

// The dropdown rows of the Identification card while quick-editing. A component of its own so the option lists are only
// fetched when editing starts.
function QuickSelectRows({ data, selectValues, setSelectValues }: { data: CustomerProfile; selectValues: QuickSelectValues; setSelectValues: (v: QuickSelectValues) => void }) {
  const { data: options } = useThirdPartyFormOptions()
  const set = (patch: Partial<QuickSelectValues>) => setSelectValues({ ...selectValues, ...patch })
  return (
    <>
      <EditableSelectRow
        label="Prospect / Customer"
        value={selectValues.prospectCustomer}
        onChange={(v) => set({ prospectCustomer: v as QuickSelectValues['prospectCustomer'] })}
        placeholder="Neither"
        options={[
          { value: 'customer', label: 'Customer' },
          { value: 'prospect', label: 'Prospect' },
          { value: 'none', label: 'Not prospect, Not customer' },
        ]}
      />
      <EditableSelectRow
        label="Vendor"
        value={selectValues.vendor}
        onChange={(v) => set({ vendor: v as QuickSelectValues['vendor'] })}
        options={[
          { value: 'no', label: 'No' },
          { value: 'yes', label: 'Yes' },
        ]}
      />
      <InfoRow label="Customer Code" locked value={data.codeClient} />
      <InfoRow label="Supplier Code" locked value={data.codeFournisseur} />
      <EditableSelectRow label="Business Entity Type" value={selectValues.forme} onChange={(v) => set({ forme: v })} options={options?.businessEntityTypes ?? []} />
      <EditableSelectRow label="Workforce" value={selectValues.effectif} onChange={(v) => set({ effectif: v })} options={options?.workforce ?? []} />
      <EditableSelectRow label="Country" value={selectValues.country} onChange={(v) => set({ country: v })} options={options?.countries ?? []} />
      <TagPickerRow label="Cust./Prosp. Tags" options={options?.custCategories ?? []} selected={selectValues.custcats} onChange={(ids) => set({ custcats: ids })} />
      <TagPickerRow label="Supplier Tags" options={options?.vendorCategories ?? []} selected={selectValues.suppcats} onChange={(ids) => set({ suppcats: ids })} />
    </>
  )
}

export function ThirdPartyTab({
  data,
  extra,
  selectValues,
  setSelectValues,
  isEditing,
  formValues,
  setField,
  onEdit,
  onSave,
  onCancel,
  saving,
}: {
  data: CustomerProfile
  extra: { categories: { id: number; label: string; type: number }[] } | undefined
  selectValues: QuickSelectValues
  setSelectValues: (v: QuickSelectValues) => void
  isEditing: boolean
  formValues: CustomerEditableFields
  setField: (key: keyof CustomerEditableFields) => (value: string) => void
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <div className="flex flex-wrap items-center justify-between gap-2.5 py-2 px-4">
          <div className="flex items-center gap-2.5">
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
            {!isEditing ? (
              <button
                type="button"
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-text-muted text-sm font-medium hover:bg-surface-hover hover:text-text"
              >
                <Pencil size={14} /> Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={onSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-60"
                >
                  <Check size={14} /> {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-text-muted text-sm font-medium hover:bg-surface-hover hover:text-text"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </Card>

      {isEditing && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <Pencil size={12} className="text-brand" /> Quick edit — change the <strong className="text-brand">highlighted</strong> fields and press Save. Fields marked <Lock size={10} className="inline" /> are in the full edit form.
          </span>
          <Link to={ROUTES.customerEdit.replace(':id', String(data.id))} className="font-medium text-brand hover:underline">
            Open the full edit form
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <Card className="!h-auto">
        <SectionHeader icon={Info} color="blue">
          Identification
        </SectionHeader>
        {isEditing ? (
          <QuickSelectRows data={data} selectValues={selectValues} setSelectValues={setSelectValues} />
        ) : (
          <>
            <InfoRow label="Prospect / Customer" value={data.clientLabel || (data.client === 2 ? 'Prospect' : data.client === 1 ? 'Customer' : 'Neither')} />
            <InfoRow label="Vendor" value={data.isVendor ? 'Yes' : 'No'} />
            <InfoRow label="Customer Code" value={data.codeClient} />
            <InfoRow label="Supplier Code" value={data.codeFournisseur} />
          </>
        )}
        <EditableRow label="Barcode" value={formValues.barcode ?? data.barcode} editing={isEditing} onChange={setField('barcode')} />
        {!isEditing && (
          <>
            <InfoRow label="Business Entity Type" value={data.formeJuridique} />
            <InfoRow label="Cust./Prosp. Tags/Categories" value={(extra?.categories ?? []).filter((c) => c.type === 2).map((c) => c.label).join(', ')} />
            <InfoRow label="Supplier Tags/Categories" value={(extra?.categories ?? []).filter((c) => c.type === 1).map((c) => c.label).join(', ')} />
          </>
        )}
        <EditableRow label="Capital" value={formValues.capital ?? data.capital} editing={isEditing} onChange={setField('capital')} />
        {!isEditing && (
          <div className="flex justify-end pb-1">
            <Link to={ROUTES.ledgerCreate} className="text-xs font-medium text-brand hover:underline" title="Open the new accounting transaction form">
              Capital payment
            </Link>
          </div>
        )}
        {!isEditing && <InfoRow label="Workforce" value={data.effectif} />}
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
        {!isEditing && <InfoRow label="Country" value={data.countryLabel} />}
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
        <InfoRow label="Currency" locked={isEditing} value={data.currencyCode} />
        <InfoRow label="Incoterms" locked={isEditing} value={data.incotermsLabel} />
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
        <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-border">
          <span className="text-xs text-text-faint shrink-0">Status</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${data.status === 1 ? 'bg-success-bg text-success-fg' : 'bg-surface-hover text-text-muted'}`}>
            {data.status === 1 ? 'Active' : 'Closed'}
          </span>
        </div>
        <InfoRow label="Creation Date" value={formatDateTime(data.dateCreation)} />
        <InfoRow label="Created By" value={data.createdBy} />
      </Card>
      </div>
    </div>
  )
}
