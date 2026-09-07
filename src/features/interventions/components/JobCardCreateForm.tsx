import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Wrench, Check, X, Plus, Trash2, LoaderCircle, Info, CheckCircle2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { Avatar } from '../../../shared/components/Avatar'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useCustomerDetail } from '../../customers/customerDetail.queries'
import { useUsersSummary } from '../../users/users.queries'
import { useLocalCollection } from '../../../shared/localCollection'
import { useCreateJobCard, useCreateAccessory, useJobCardProjectOptions, type JobCardLineInput } from '../jobCard.queries'

interface DraftLine {
  key: number
  description: string
  startDateTime: string // datetime-local value
  durationHours: number
  durationMin: number
}

let lineKeySeq = 0
function newDraftLine(): DraftLine {
  return { key: lineKeySeq++, description: '', startDateTime: '', durationHours: 1, durationMin: 0 }
}

function decomposeDateTime(value: string): { day: number; month: number; year: number; hour: number; min: number } {
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = (datePart ?? '').split('-').map(Number)
  const [hour, min] = (timePart ?? '00:00').split(':').map(Number)
  return { day: day || 0, month: month || 0, year: year || 0, hour: hour || 0, min: min || 0 }
}

interface LocalAccessory {
  id: number
  label: string
}

// `fixedCustomerId` powers JobCardCreateFromCustomerForm.tsx (reached from a
// specific customer's own Customer tab, "Create Job Card" button).
export function JobCardCreateForm({ fixedCustomerId, backTo }: { fixedCustomerId?: string; backTo?: string } = {}) {
  const listLink = backTo ?? ROUTES.customerList
  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const { data: fixedCustomer } = useCustomerDetail(fixedCustomerId)
  const { data: projects } = useJobCardProjectOptions()
  const { data: usersSummary, isLoading: usersLoading } = useUsersSummary()
  const createJobCard = useCreateJobCard()
  const createAccessory = useCreateAccessory()
  const [accessories, updateAccessories] = useLocalCollection<LocalAccessory[]>(['interventions', 'sessionAccessories'], [])

  const [customerId, setCustomerId] = useState(fixedCustomerId ?? '')
  const [refInput, setRefInput] = useState('')
  const [projectId, setProjectId] = useState('')
  const [userInput, setUserInput] = useState('')
  const [description, setDescription] = useState('')
  const [vehicleInput, setVehicleInput] = useState('')
  const [modelInput, setModelInput] = useState('')
  const [chassisInput, setChassisInput] = useState('')
  const [engineInput, setEngineInput] = useState('')
  const [odometerInput, setOdometerInput] = useState('')
  const [selectedAccessoryIds, setSelectedAccessoryIds] = useState<number[]>([])
  const [newAccessoryLabel, setNewAccessoryLabel] = useState('')
  const [addingAccessory, setAddingAccessory] = useState(false)
  const [accessoryError, setAccessoryError] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([newDraftLine()])
  const [formError, setFormError] = useState('')
  const [created, setCreated] = useState<{ id: number; ref: string } | null>(null)

  const customerOptions = (customers ?? []).map((c) => ({ value: c.id, label: c.name }))
  const userOptions = (usersSummary?.users ?? []).filter((u) => u.status === 'Enabled').map((u) => ({ value: String(u.id), label: u.name || u.login }))

  function updateLine(key: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function toggleAccessory(id: number) {
    setSelectedAccessoryIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]))
  }

  function handleAddAccessory() {
    if (!newAccessoryLabel.trim()) return
    setAccessoryError('')
    createAccessory.mutate(newAccessoryLabel.trim(), {
      onSuccess: (accessory) => {
        updateAccessories((cur) => [...cur, accessory])
        setSelectedAccessoryIds((cur) => [...cur, accessory.id])
        setNewAccessoryLabel('')
        setAddingAccessory(false)
      },
      onError: (err) => setAccessoryError(err instanceof Error ? err.message : 'Failed to add accessory.'),
    })
  }

  function handleSubmit(validate: boolean) {
    setFormError('')
    if (!customerId) return setFormError('Third-party is required.')
    if (!userInput) return setFormError('Job Alloted To is required.')

    const jobLines: JobCardLineInput[] = lines
      .filter((l) => l.description.trim())
      .map((l) => ({ description: l.description, ...decomposeDateTime(l.startDateTime), durationHours: l.durationHours + l.durationMin / 60 }))

    createJobCard.mutate(
      {
        socid: Number(customerId),
        projectId: projectId ? Number(projectId) : undefined,
        refInput: refInput || undefined,
        vehicleInput,
        modelInput,
        chassisInput,
        engineInput,
        odometerInput,
        userInput: Number(userInput),
        description,
        gadgetIds: selectedAccessoryIds,
        validateAfterCreate: validate,
        lines: jobLines,
      },
      {
        onSuccess: (result) => setCreated(result),
        onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to create job card.'),
      },
    )
  }

  if (created) {
    return (
      <StickyFormShell
        header={
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Wrench size={20} className="text-brand" /> Create Job Card
          </h2>
        }
        footerLeft={
          <Link to={listLink} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            <X size={14} /> Back
          </Link>
        }
        footerRight={<span />}
      >
        <Card className="!h-auto items-center text-center justify-center gap-3 !py-12">
          <CheckCircle2 size={40} className="text-success" />
          <h3 className="text-lg font-semibold text-text!">Job Card {created.ref} created</h3>
        </Card>
      </StickyFormShell>
    )
  }

  return (
    <StickyFormShell
      scrollsInternally={false}
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Wrench size={20} className="text-brand" /> Create Job Card
        </h2>
      }
      footerLeft={
        <div className="flex items-center gap-4">
          <Link to={listLink} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            <X size={14} /> Cancel
          </Link>
          {formError && <p className="text-sm font-medium text-danger">{formError}</p>}
        </div>
      }
      footerRight={
        <>
          <button
            type="button"
            disabled={createJobCard.isPending}
            onClick={() => handleSubmit(false)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60"
          >
            Create as Draft
          </button>
          <button
            type="button"
            disabled={createJobCard.isPending}
            onClick={() => handleSubmit(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {createJobCard.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create as Validated
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 flex-1 shrink-0">
        <Card className="!h-auto shrink-0 space-y-4">
          <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
            <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
            <p className="text-xs text-info-fg">
              Backend page: <code className="font-mono">fichinter/create.php</code>. This form posts to that page's own real write (
              <code className="font-mono">action=create_intervention</code>) — the job card is genuinely saved. "Ticket" isn't reproduced here: its real
              dropdown needs Dolibarr's core REST API under a per-user API key, a different auth scheme this app has no existing wiring for.
            </p>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Third-party" required>
              {fixedCustomerId ? (
                <div className={`${inputClasses} flex items-center gap-2`}>
                  <Avatar name={fixedCustomer?.name ?? ''} size={20} color="bg-brand" />
                  {fixedCustomer ? (
                    <Link to={ROUTES.customerDetail.replace(':id', fixedCustomerId)} className="text-brand hover:underline">
                      {fixedCustomer.name}
                    </Link>
                  ) : (
                    <span className="text-text-faint">Loading…</span>
                  )}
                </div>
              ) : (
                <SearchableSelect value={customerId} onChange={setCustomerId} options={customerOptions} placeholder={customersLoading ? 'Loading…' : 'Select a third party'} />
              )}
            </Field>
            <Field label="Ref.">
              <input type="text" value={refInput} onChange={(e) => setRefInput(e.target.value)} placeholder="Draft" className={inputClasses} />
            </Field>
            <Field label="Project">
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClasses}>
                <option value="">Select a project</option>
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.ref} — {p.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Job Alloted To" required>
              <select value={userInput} onChange={(e) => setUserInput(e.target.value)} className={inputClasses}>
                <option value="">{usersLoading ? 'Loading…' : 'Select a user'}</option>
                {userOptions.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Machine Make/Vehicle No">
              <input type="text" value={vehicleInput} onChange={(e) => setVehicleInput(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Model No">
              <input type="text" value={modelInput} onChange={(e) => setModelInput(e.target.value)} className={inputClasses} />
            </Field>

            <Field label="Serial Number/Chassis No">
              <input type="text" value={chassisInput} onChange={(e) => setChassisInput(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Engine No">
              <input type="text" value={engineInput} onChange={(e) => setEngineInput(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Odometer Read">
              <input type="text" value={odometerInput} onChange={(e) => setOdometerInput(e.target.value)} className={inputClasses} />
            </Field>

            <div className="sm:col-span-3">
              <Field label="Description/Problems">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClasses} />
              </Field>
            </div>
          </div>

          <div>
            <span className="text-sm text-text">Accessories</span>
            {/* No real read API exists for the accessories already in
                llx_jobcardaccessories (create.php's own page queries that
                table with plain inline SQL, not an API) — starts empty, real
                additions via add_gadget.php grow it for this session. */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {accessories.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAccessory(a.id)}
                  className={`px-3 py-1.5 rounded-md text-sm border ${
                    selectedAccessoryIds.includes(a.id) ? 'border-brand text-brand bg-brand/5' : 'border-border text-text-muted hover:bg-surface-hover'
                  }`}
                >
                  {a.label}
                </button>
              ))}
              {addingAccessory ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    type="text"
                    value={newAccessoryLabel}
                    onChange={(e) => setNewAccessoryLabel(e.target.value)}
                    placeholder="Accessory name"
                    className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm w-40"
                  />
                  <button type="button" onClick={handleAddAccessory} disabled={createAccessory.isPending} className="p-1.5 rounded-md bg-success-bg text-success-fg hover:brightness-95">
                    {createAccessory.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />}
                  </button>
                  <button type="button" onClick={() => setAddingAccessory(false)} className="p-1.5 rounded-md bg-neutral-bg text-neutral-fg hover:brightness-95">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingAccessory(true)}
                  className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-surface-hover"
                >
                  <Plus size={13} /> Add
                </button>
              )}
            </div>
            {accessoryError && <p className="text-xs text-danger mt-1">{accessoryError}</p>}
          </div>
        </Card>

        <Card className="!h-auto shrink-0 !p-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-text!">Item Table</h3>
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, newDraftLine()])}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-hover"
            >
              <Plus size={13} /> Add line
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-4 py-2.5">Description</th>
                  <th className="font-medium px-4 py-2.5 w-52">Start Date &amp; Time</th>
                  <th className="font-medium px-4 py-2.5 w-28">Duration (Hours)</th>
                  <th className="font-medium px-4 py-2.5 w-24">Min</th>
                  <th className="w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.key} className="border-b border-border last:border-0 align-top">
                    <td className="px-4 py-2">
                      <input type="text" value={line.description} onChange={(e) => updateLine(line.key, { description: e.target.value })} className={inputClasses} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="datetime-local" value={line.startDateTime} onChange={(e) => updateLine(line.key, { startDateTime: e.target.value })} className={inputClasses} />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        value={line.durationHours}
                        onChange={(e) => updateLine(line.key, { durationHours: Number(e.target.value) })}
                        className={inputClasses}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={line.durationMin}
                        onChange={(e) => updateLine(line.key, { durationMin: Number(e.target.value) })}
                        className={inputClasses}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== line.key) : prev))}
                        className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-danger"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </StickyFormShell>
  )
}
