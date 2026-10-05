import { useState } from 'react'
import { Pencil, Loader2, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useDevices, useSaveDevice, useUpdateDevice, type DeviceRow } from '../payrollAdminTabs.queries'

const emptyForm = { serialNo: '', ipAddress: '', portNumber: '', connectionStatus: 'A', brand: '' }

// The real page's own live device polling (pull attendance, live users
// list, ADMS time sync — see save_ajax.php's own ZKTeco/Hikvision branches)
// is a separate, much larger hardware-integration scope this doesn't cover
// — this is the plain Add/Edit device CRUD only, which is everything the
// list itself needs.
export function DeviceSettingTab() {
  const { data, isLoading, isError, error, refetch } = useDevices()
  const saveDevice = useSaveDevice()
  const updateDevice = useUpdateDevice()

  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  const pending = saveDevice.isPending || updateDevice.isPending

  function handleClear() {
    setForm(emptyForm)
    setEditingId(null)
    setFormError('')
  }

  function startEdit(row: DeviceRow) {
    setEditingId(row.id)
    setForm({ serialNo: row.serialNo, ipAddress: row.ipAddress, portNumber: row.portNumber, connectionStatus: row.connectionStatus || 'A', brand: row.brand })
    setFormError('')
  }

  function handleSubmit() {
    setFormError('')
    if (!form.serialNo.trim()) return setFormError('Device Serial No is required.')
    if (!form.ipAddress.trim()) return setFormError('IP Address is required.')
    if (!form.portNumber.trim()) return setFormError('Port Number is required.')
    if (!form.brand.trim()) return setFormError('Device Brand is required.')
    if (editingId) {
      updateDevice.mutate({ id: editingId, ...form }, { onSuccess: handleClear, onError: (e) => setFormError(e instanceof Error ? e.message : 'Could not update the device.') })
    } else {
      saveDevice.mutate(form, { onSuccess: handleClear, onError: (e) => setFormError(e instanceof Error ? e.message : 'Could not save the device.') })
    }
  }

  return (
    <div className="space-y-4">
      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          The real page's live device polling (pull attendance, users list, time sync) isn't wired here — just the device list itself (Add / Edit).
        </p>
      </Card>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Device S.No" required>
            <input value={form.serialNo} onChange={(e) => setForm((f) => ({ ...f, serialNo: e.target.value }))} className={inputClasses} />
          </Field>
          <Field label="IP Address" required>
            <input value={form.ipAddress} onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))} className={inputClasses} />
          </Field>
          <Field label="Port Number" required>
            <input value={form.portNumber} onChange={(e) => setForm((f) => ({ ...f, portNumber: e.target.value }))} className={inputClasses} />
          </Field>
          <Field label="Connection Status">
            <select value={form.connectionStatus} onChange={(e) => setForm((f) => ({ ...f, connectionStatus: e.target.value }))} className={inputClasses}>
              <option value="A">Active</option>
              <option value="D">De-Active</option>
            </select>
          </Field>
          <Field label="Device Brand" required>
            <input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Enter Brand (Device Name)" className={inputClasses} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            {editingId ? 'Update' : 'Save'}
          </button>
          <button type="button" onClick={handleClear} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-surface-hover">
            Clear
          </button>
        </div>
        {formError && <p className="text-sm text-danger mt-2">{formError}</p>}
      </Card>

      {isLoading ? (
        <LegacyLoadingCard label="Loading devices…" />
      ) : isError ? (
        <LegacyErrorCard title="Couldn't load devices" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      ) : (
        <Card className="!h-auto !p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5">Device Id</th>
                <th className="font-medium px-4 py-2.5">Device Serial No</th>
                <th className="font-medium px-4 py-2.5">IP Address</th>
                <th className="font-medium px-4 py-2.5">Port Number</th>
                <th className="font-medium px-4 py-2.5">Connection Status</th>
                <th className="font-medium px-4 py-2.5">Brand</th>
                <th className="font-medium px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-text-faint text-sm">
                    No devices yet.
                  </td>
                </tr>
              ) : (
                (data ?? []).map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-text!">{row.id}</td>
                    <td className="px-4 py-3 text-text-muted">{row.serialNo}</td>
                    <td className="px-4 py-3 text-text-muted">{row.ipAddress}</td>
                    <td className="px-4 py-3 text-text-muted">{row.portNumber}</td>
                    <td className="px-4 py-3 text-text-muted">{row.connectionStatus === 'A' ? 'Active' : 'De-Active'}</td>
                    <td className="px-4 py-3 text-text-muted">{row.brand}</td>
                    <td className="px-4 py-3">
                      <button type="button" title="Edit Device" onClick={() => startEdit(row)} className="text-text-faint hover:text-brand">
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
