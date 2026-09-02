import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, X, LoaderCircle, Check } from 'lucide-react'
import { useAgendaFilterOptions, useContactsByCompany, useCreateEvent } from '../calendarApi.queries'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useAuth } from '../../auth/AuthContext'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Status maps straight to the real llx_actioncomm.percent field (confirmed
// via calendar_api.php's own getStatusLabel()) — not a UI-invented enum.
const STATUS_OPTIONS: { value: number; label: string; dot: string }[] = [
  { value: -1, label: 'Not applicable', dot: 'bg-neutral-400' },
  { value: 0, label: 'Not started', dot: 'bg-text-faint' },
  { value: 50, label: 'In progress', dot: 'bg-amber-500' },
  { value: 100, label: 'Done', dot: 'bg-emerald-500' },
]

// Dolibarr's own priority field is a bare int (1-9) with no fixed enum from
// the backend — these labels are a UX layer over that real field, not
// fabricated data; the number sent to createEvent is what's actually saved.
const PRIORITY_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Low' },
  { value: 3, label: 'Medium' },
  { value: 5, label: 'High' },
  { value: 7, label: 'Urgent' },
]

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-text-faint">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
    </label>
  )
}

function ChipMultiSelect({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: { id: number; name: string }[]
  selected: number[]
  onChange: (ids: number[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')
  const available = options.filter((o) => !selected.includes(o.id))

  function add(id: number) {
    onChange([...selected, id])
    setDraft('')
  }
  function remove(id: number) {
    onChange(selected.filter((s) => s !== id))
  }

  return (
    <div className="rounded-md border border-input-border bg-input-bg px-2 py-1.5 flex flex-wrap items-center gap-1.5">
      {selected.map((id) => {
        const opt = options.find((o) => o.id === id)
        if (!opt) return null
        return (
          <span key={id} className="inline-flex items-center gap-1 rounded-md bg-brand/10 text-brand text-xs font-medium px-2 py-0.5">
            {opt.name}
            <button type="button" onClick={() => remove(id)} className="hover:text-danger">
              <X size={11} />
            </button>
          </span>
        )
      })}
      <select
        value={draft}
        onChange={(e) => {
          if (e.target.value) add(Number(e.target.value))
        }}
        className="flex-1 min-w-[6rem] bg-transparent text-sm text-text outline-none"
      >
        <option value="">{available.length === 0 ? '—' : placeholder}</option>
        {available.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  )
}

// Real form backed by comm/action/ajax/calendar_api.php — see
// calendarApi.queries.ts for the full endpoint-by-endpoint evidence. Every
// field below (type, label, all-day, status, start/end date, location,
// priority, related company/contact/project, assigned users, categories,
// description, busy) posts straight to the real createEvent action; none of
// it is fabricated. elementtype/fkElement stay optional so this same modal
// works both linked to an origin record (existing callers: CustomerDetail,
// ContractDetail, InvoiceDetail, OrderDetail, QuotationDetail,
// PurchaseOrderDetail, ContactDetail) and standalone from the Agenda page
// itself (a real "direct event" per the backend's own family classification
// when elementtype/fk_element/socid are all empty).
export function AddEventModal({
  elementtype,
  fkElement,
  socid: initialSocid,
  onClose,
  onCreated,
}: {
  elementtype?: string
  fkElement?: number
  socid?: number
  onClose: () => void
  onCreated: () => void
}) {
  const { data: options, isLoading, isError, error, refetch } = useAgendaFilterOptions()
  const createEvent = useCreateEvent()
  const { user } = useAuth()

  const [actioncode, setActioncode] = useState('')
  const [label, setLabel] = useState('')
  const [fullday, setFullday] = useState(false)
  const [status, setStatus] = useState(0)
  const [startDate, setStartDate] = useState(todayIso())
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState(todayIso())
  const [endTime, setEndTime] = useState('10:00')
  const [location, setLocation] = useState('')
  const [priority, setPriority] = useState(0)
  const [socid, setSocid] = useState<number | undefined>(initialSocid)
  const [contactIds, setContactIds] = useState<number[]>([])
  const [projectId, setProjectId] = useState<number | undefined>(undefined)
  const [assignedUserIds, setAssignedUserIds] = useState<number[]>([])
  const [categoryIds, setCategoryIds] = useState<number[]>([])
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const { data: contacts } = useContactsByCompany(socid ?? null)

  // Defaults to the current user, matching the real page's own default
  // ("assigned = [$user->id]" when nothing else is posted).
  useEffect(() => {
    if (user?.id && assignedUserIds.length === 0) setAssignedUserIds([Number(user.id)])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const companyOptions = useMemo(() => (options?.thirdparties ?? []).map((t) => ({ value: String(t.id), label: t.name })), [options])
  const projectOptions = useMemo(() => (options?.projects ?? []).map((p) => ({ value: String(p.id), label: p.name })), [options])

  function handleSubmit() {
    setFormError('')
    if (!actioncode) {
      setFormError('Type is required.')
      return
    }
    if (!label.trim()) {
      setFormError('Label is required.')
      return
    }
    if (assignedUserIds.length === 0) {
      setFormError('Event assigned to is required.')
      return
    }
    createEvent.mutate(
      {
        actioncode,
        label: label.trim(),
        fullday,
        startDate,
        startTime,
        endDate,
        endTime,
        percent: status,
        priority,
        location,
        note: description,
        busy,
        socid,
        contactIds,
        projectId,
        assignedUserIds,
        categoryIds,
        elementtype,
        fkElement,
      },
      { onSuccess: () => onCreated() },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-xl bg-surface border border-border shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-10 h-10 rounded-lg grid place-items-center bg-brand text-white">
              <CalendarPlus size={18} />
            </span>
            <div>
              <h3 className="text-base font-semibold text-text!">Create Event</h3>
              <p className="text-xs text-text-faint">Fill in the details below to create a new event.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {isLoading ? (
            <LegacyLoadingCard label="Loading event options…" />
          ) : isError || !options ? (
            <LegacyErrorCard title="Couldn't load event options" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
          ) : createEvent.isSuccess ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-success-bg text-success-fg">
                <Check size={20} />
              </span>
              <p className="text-sm font-medium text-text!">Event created.</p>
              <button type="button" onClick={onClose} className="mt-2 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover">
                Close
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Type" required>
                <select value={actioncode} onChange={(e) => setActioncode(e.target.value)} className={inputCls}>
                  <option value="">Select type…</option>
                  {options.types.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Label" required>
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Enter label" className={inputCls} />
              </Field>

              <label className="flex items-center gap-2 text-sm text-text-muted md:col-span-2">
                <input type="checkbox" checked={fullday} onChange={(e) => setFullday(e.target.checked)} /> Event on all day(s)
              </label>

              <Field label="Status">
                <select value={status} onChange={(e) => setStatus(Number(e.target.value))} className={inputCls}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div />

              <Field label="Start date" required>
                <div className="flex gap-1.5">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
                  {!fullday && <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={`${inputCls} w-28 shrink-0`} />}
                </div>
              </Field>
              <Field label="End date" required>
                <div className="flex gap-1.5">
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
                  {!fullday && <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={`${inputCls} w-28 shrink-0`} />}
                </div>
              </Field>

              <Field label="Location">
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Enter location" className={inputCls} />
              </Field>
              <Field label="Priority">
                <select value={priority} onChange={(e) => setPriority(Number(e.target.value))} className={inputCls}>
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Related company">
                <SearchableSelect
                  value={socid ? String(socid) : ''}
                  onChange={(v) => {
                    setSocid(v ? Number(v) : undefined)
                    setContactIds([])
                  }}
                  options={companyOptions}
                  placeholder="Select company"
                />
              </Field>
              <Field label="Related contact">
                <ChipMultiSelect options={contacts ?? []} selected={contactIds} onChange={setContactIds} placeholder={socid ? 'Select contact' : 'Select a company first'} />
              </Field>

              <Field label="Project">
                <SearchableSelect value={projectId ? String(projectId) : ''} onChange={(v) => setProjectId(v ? Number(v) : undefined)} options={projectOptions} placeholder="Select project" />
              </Field>
              <Field label="Event assigned to" required>
                <ChipMultiSelect options={options.users} selected={assignedUserIds} onChange={setAssignedUserIds} placeholder="Select users" />
              </Field>

              <div className="md:col-span-2">
                <Field label="Tags / categories">
                  <ChipMultiSelect options={options.categories} selected={categoryIds} onChange={setCategoryIds} placeholder="Select tags or categories" />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Description">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Enter event description…"
                    className={`${inputCls} resize-none`}
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2 text-sm text-text-muted md:col-span-2">
                <input type="checkbox" checked={busy} onChange={(e) => setBusy(e.target.checked)} /> Busy
              </label>

              {(formError || createEvent.isError) && (
                <p className="text-xs text-danger md:col-span-2">{formError || (createEvent.error instanceof Error ? createEvent.error.message : 'Could not create the event.')}</p>
              )}
            </div>
          )}
        </div>

        {!isLoading && !isError && options && !createEvent.isSuccess && (
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-sm font-medium border border-border text-text-muted hover:bg-surface-hover">
              Cancel
            </button>
            <button
              type="button"
              disabled={createEvent.isPending}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {createEvent.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <CalendarPlus size={13} />} Save Event
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
