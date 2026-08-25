import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Warehouse, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { useCustomerLookups } from '../../customers/thirdPartyOptions.queries'
import { useCreateWarehouseReal, useWarehouses } from '../warehouseExtras.queries'

const inputCls = 'w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={`block text-sm mb-1 ${required ? 'text-danger' : 'text-text-muted'}`}>
        {label}
        {required && '*'}
      </label>
      {children}
    </div>
  )
}

// Submits to the real quicklinks_ajax.php?type=savewarehouse handler (a
// genuine INSERT INTO llx_entrepot — see warehouseExtras.queries.ts) instead
// of the session-only local stub this used to be. "Add in" (fk_parent) and
// Country now use real data sources: the real warehouse list itself, and
// the real numeric llx_c_country ids from societe/api/meta.php's
// wizard_options (the same source the Third Party create wizard uses) —
// quicklinks_ajax.php's own country_id column needs that numeric id, not an
// ISO code.
export function WarehouseCreateForm() {
  const navigate = useNavigate()
  const createWarehouse = useCreateWarehouseReal()
  const { data: lookups } = useCustomerLookups()
  const existingWarehouses = useWarehouses()

  const [ref, setRef] = useState('')
  const [shortName, setShortName] = useState('')
  const [fkParent, setFkParent] = useState('')
  const [zip, setZip] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [countryId, setCountryId] = useState('')
  const [phone, setPhone] = useState('')
  const [fax, setFax] = useState('')
  const [status, setStatus] = useState<'Open' | 'Closed'>('Open')
  const [error, setError] = useState('')

  function handleCreate() {
    if (!ref.trim()) return setError('Ref. is required!')
    setError('')
    createWarehouse.mutate(
      { ref: ref.trim(), shortName, fkParent, description, address, zip, city, countryId, phone, fax, status },
      {
        onSuccess: () => navigate(ROUTES.warehouseList),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create warehouse.'),
      },
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Warehouse size={20} className="text-brand" /> New warehouse / Stock Location
      </h2>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-3">
        <Field label="Ref." required>
          <input value={ref} onChange={(e) => setRef(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Short name location">
          <input value={shortName} onChange={(e) => setShortName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Add in">
          <select value={fkParent} onChange={(e) => setFkParent(e.target.value)} className={selectCls}>
            <option value="">None</option>
            {existingWarehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.ref}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Zip Code">
          <input value={zip} onChange={(e) => setZip(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Description">
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Address">
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
        </Field>
        <Field label="City">
          <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Country">
          <select value={countryId} onChange={(e) => setCountryId(e.target.value)} className={selectCls}>
            <option value="">Select…</option>
            {(lookups?.countries ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Fax">
          <input value={fax} onChange={(e) => setFax(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as 'Open' | 'Closed')} className={selectCls}>
            <option>Open</option>
            <option>Closed</option>
          </select>
        </Field>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => navigate(ROUTES.warehouseList)}
          className="flex items-center gap-1.5 rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={createWarehouse.isPending}
          onClick={handleCreate}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {createWarehouse.isPending && <LoaderCircle size={14} className="animate-spin" />} Create
        </button>
      </div>
    </div>
  )
}
