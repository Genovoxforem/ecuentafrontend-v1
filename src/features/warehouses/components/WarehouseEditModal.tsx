import { useEffect, useState } from 'react'
import { Warehouse, X, LoaderCircle, Check } from 'lucide-react'
import { useWarehouseEditForm, useUpdateWarehouse } from '../warehouseExtras.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

// Native replacement for linking out to product/stock/card.php?action=edit
// — see warehouseHtmlParser.ts's parseWarehouseEditFormDocument() comment
// for the real field names this POSTs (Dolibarr's own action=update
// handler), read directly from that page's source, not guessed.
export function WarehouseEditModal({ id, warehouseRef, onClose }: { id: string; warehouseRef: string; onClose: () => void }) {
  const { data, isLoading, isError, error, refetch } = useWarehouseEditForm(id)
  const updateWarehouse = useUpdateWarehouse(id)

  const [ref, setRef] = useState('')
  const [shortNameLocation, setShortNameLocation] = useState('')
  const [parentWarehouseId, setParentWarehouseId] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [city, setCity] = useState('')
  const [countryId, setCountryId] = useState('')
  const [phone, setPhone] = useState('')
  const [fax, setFax] = useState('')
  const [status, setStatus] = useState('1')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!data) return
    setRef(data.ref)
    setShortNameLocation(data.shortNameLocation)
    setParentWarehouseId(data.parentWarehouseId)
    setDescription(data.description)
    setAddress(data.address)
    setZipCode(data.zipCode)
    setCity(data.city)
    setCountryId(data.countryId)
    setPhone(data.phone)
    setFax(data.fax)
    setStatus(data.status)
  }, [data])

  function handleSubmit() {
    setFormError('')
    if (!ref.trim()) {
      setFormError('Ref. is required.')
      return
    }
    if (!data) return
    updateWarehouse.mutate({
      token: data.token,
      ref,
      shortNameLocation,
      parentWarehouseId,
      description,
      address,
      zipCode,
      city,
      countryId,
      phone,
      fax,
      status,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-surface border border-border p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <Warehouse size={16} className="text-brand" /> Edit warehouse — {warehouseRef}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <LegacyLoadingCard label="Loading warehouse form…" />
        ) : isError || !data ? (
          <LegacyErrorCard title="Couldn't load the edit form" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
        ) : updateWarehouse.isSuccess ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-success-bg text-success-fg">
              <Check size={20} />
            </span>
            <p className="text-sm font-medium text-text!">Warehouse updated.</p>
            <button type="button" onClick={onClose} className="mt-2 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover">
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Ref.*</span>
                <input value={ref} onChange={(e) => setRef(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Short name location</span>
                <input value={shortNameLocation} onChange={(e) => setShortNameLocation(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Add in</span>
                <select value={parentWarehouseId} onChange={(e) => setParentWarehouseId(e.target.value)} className={inputCls}>
                  {data.parentWarehouseOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Description</span>
                <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Address</span>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Zip Code</span>
                <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">City</span>
                <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Country</span>
                <select value={countryId} onChange={(e) => setCountryId(e.target.value)} className={inputCls}>
                  {data.countryOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Phone</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Fax</span>
                <input value={fax} onChange={(e) => setFax(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                  <option value="1">Open</option>
                  <option value="0">Closed</option>
                </select>
              </label>
            </div>

            {(formError || updateWarehouse.isError) && (
              <p className="text-xs text-danger">
                {formError || (updateWarehouse.error instanceof Error ? updateWarehouse.error.message : 'Could not save changes.')}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-sm font-medium border border-border text-text-muted hover:bg-surface-hover">
                Cancel
              </button>
              <button
                type="button"
                disabled={updateWarehouse.isPending}
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {updateWarehouse.isPending && <LoaderCircle size={13} className="animate-spin" />} Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
