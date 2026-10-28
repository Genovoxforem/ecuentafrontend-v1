import { useState } from 'react'
import { X, LoaderCircle, CloudOff } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fapiPost } from '../../../api/fapiEnvelope'
import { Field, inputCls } from '../../products/components/ProductServiceCreateForm'
import { useThirdPartyFormOptions } from '../../customers/thirdPartyOptions.queries'

const TPIN_PATTERN = /^\d{10}$/
const selectCls = inputCls + ' appearance-none'

// Compact single-page modal matching the reference layout's own "Create New Customer"
// slide-in. Customer Code isn't an input here — the backend always auto-generates
// code_client itself, same as the reference modal's own read-only display.
//
// Gender, Alias name, Customer Group, Sales tax used, VAT ID, Currency, Fax, and Sales
// representative are deliberately NOT fields here: the active backend's
// api/customer/index.php handleCreateCustomer() has no GETPOST() call for any of them,
// so the POST would succeed with no error while quietly discarding whatever the user
// typed. Rather than keep inputs that imply data is being saved when it isn't, they're
// left out until the backend supports them (no backend edits from this repo).
export function QuickCustomerCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (customer: { id: string; name: string }) => void }) {
  const queryClient = useQueryClient()
  const { data: options, isLoading: optionsLoading, optionsUnavailable } = useThirdPartyFormOptions()

  const [name, setName] = useState('')
  const [tpin, setTpin] = useState('')
  const [address, setAddress] = useState('')
  const [zip, setZip] = useState('')
  const [town, setTown] = useState('')
  const [countryId, setCountryId] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: async () => {
      return fapiPost<{ id: number; name: string }>('/societe/fapi/create.php', {
        name: name.trim(),
        type: 'customer',
        tpin: tpin.trim(),
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        town: town || undefined,
        zip: zip || undefined,
        country_id: countryId ? Number(countryId) : undefined,
      })
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      onCreated({ id: String(created.id), name: created.name })
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : 'Failed to create customer'),
  })

  function handleSubmit() {
    setError('')
    if (!name.trim()) {
      setError('Customer name is required.')
      return
    }
    if (!TPIN_PATTERN.test(tpin.trim())) {
      setError('Tpin must be exactly 10 digits.')
      return
    }
    createMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-surface border border-border p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text!">Create New Customer</h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Customer Name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Tpin" required hint="10 digits">
            <input value={tpin} onChange={(e) => setTpin(e.target.value)} maxLength={10} className={inputCls} />
          </Field>
          {/* Read-only — same as the reference modal's own display. Dolibarr assigns
              code_client server-side during create() (see handleCreateCustomer()), so this
              is a live preview of what it'll be, not an editable input. /customers/lookups/
              (the source of nextCustomerCode) doesn't exist on the currently-active backend,
              so once loading settles this honestly reads "Not available" instead of staying
              on a blank/loading-looking value forever. */}
          <Field label="Customer Code">
            <input
              value={optionsLoading ? 'Loading…' : options?.nextCustomerCode || (optionsUnavailable ? 'Not available' : '')}
              readOnly
              className={inputCls + ' cursor-not-allowed bg-surface text-text-muted'}
            />
          </Field>

          <Field label="Address">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Zip Code">
            <input value={zip} onChange={(e) => setZip(e.target.value)} className={inputCls} />
          </Field>
          <Field label="City">
            <input value={town} onChange={(e) => setTown(e.target.value)} className={inputCls} />
          </Field>

          <Field label="Country">
            <select value={countryId} onChange={(e) => setCountryId(e.target.value)} className={selectCls}>
              <option value="">Zambia (ZM) — default</option>
              {options?.countries.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
        </div>

        {/* /customers/lookups/ doesn't exist on the currently-active backend — the only
            field here it feeds is the Customer Code preview above (handled inline). This
            note explains that gap once rather than leaving the field looking broken with
            no context. */}
        {optionsUnavailable && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-text-faint">
            <CloudOff size={13} className="shrink-0" /> The auto-generated customer code isn't available on this backend yet — it'll still be assigned when you submit.
          </p>
        )}

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            disabled={createMutation.isPending}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {createMutation.isPending && <LoaderCircle size={14} className="animate-spin" />}
            Create Customer
          </button>
        </div>
      </div>
    </div>
  )
}
