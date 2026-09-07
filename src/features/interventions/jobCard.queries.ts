import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'

// fichinter/create.php — Dolibarr's core "Interventions" module (fichinter),
// custom-branded "Job Card" in this skin, read directly. Its own header
// comment calls it "Single Page Intervention Creation with API and
// localStorage" — a custom rewrite of the classic card.php create flow.
// Confirmed by reading it directly: action=create_intervention is a genuine
// JSON write (wrapped in $db->begin()/commit(), calls $object->create($user)
// + $object->addline() per Item Table row, responds
// header('Content-Type: application/json'); echo json_encode(['success',
// 'id','ref']) on both success and error paths) — not a classic
// full-page-reload form. This is a DIFFERENT, more capable real endpoint
// than fichinter/card.php?action=create (the one QuotationConvertReplica's
// "intervention" mode already correctly found to be classic/no-JSON — left
// untouched, that's a different conversion flow).
const CREATE_URL = '/fichinter/create.php'

interface CreateJobCardResponse {
  success: boolean
  id?: number
  ref?: string
  error?: string
}

export interface JobCardLineInput {
  description: string
  // Decomposed from a single "Start Date & Time" input — matches the real
  // handler's own date_day/month/year/hour/min POST fields exactly.
  day: number
  month: number
  year: number
  hour: number
  min: number
  // Real handler's fallback path (no end date supplied) reads only
  // line.duration as decimal HOURS (`duration = line['duration'] * 3600`) —
  // no separate minutes field in that fallback, so Duration(Hours)+Min from
  // the UI are combined into one decimal value here to match it exactly.
  durationHours: number
}

export interface CreateJobCardInput {
  socid: number
  projectId?: number
  refInput?: string
  vehicleInput?: string
  modelInput?: string
  chassisInput?: string
  engineInput?: string
  odometerInput?: string
  userInput?: number
  description?: string
  gadgetIds: number[]
  validateAfterCreate: boolean
  lines: JobCardLineInput[]
}

export function useCreateJobCard() {
  return useMutation({
    mutationFn: async (input: CreateJobCardInput) => {
      const params = new URLSearchParams({ action: 'create_intervention' })
      params.set('socid', String(input.socid))
      if (input.projectId) params.set('projectid', String(input.projectId))
      if (input.refInput) params.set('ref_input', input.refInput)
      if (input.vehicleInput) params.set('vehicle_input', input.vehicleInput)
      if (input.modelInput) params.set('model_input', input.modelInput)
      if (input.chassisInput) params.set('chassis_input', input.chassisInput)
      if (input.engineInput) params.set('engine_input', input.engineInput)
      if (input.odometerInput) params.set('odometer_input', input.odometerInput)
      if (input.userInput) params.set('user_input', String(input.userInput))
      if (input.description) params.set('description', input.description)
      if (input.gadgetIds.length) params.set('gadgetid', input.gadgetIds.join(','))
      params.set('validate_after_create', input.validateAfterCreate ? '1' : '0')
      params.set(
        'lines',
        JSON.stringify(
          input.lines.map((l) => ({
            description: l.description,
            date_day: l.day,
            date_month: l.month,
            date_year: l.year,
            date_hour: l.hour,
            date_min: l.min,
            duration: l.durationHours,
          })),
        ),
      )
      const res = await fetch(CREATE_URL, { method: 'POST', credentials: 'same-origin', body: params })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: CreateJobCardResponse = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Failed to create job card.')
      return { id: data.id as number, ref: data.ref as string }
    },
  })
}

// fichinter/add_gadget.php — real JSON write confirmed by reading it
// directly (INSERT INTO llx_jobcardaccessories, responds
// json_encode(['success','id','label'])). There is no matching JSON *read*
// endpoint for the existing accessories list though — create.php's own page
// queries `llx_jobcardaccessories` with plain inline SQL, not an API — so
// the picker below starts empty and only grows with accessories created for
// real in this session (see JobCardCreateForm.tsx), rather than scraping
// create.php's HTML to pre-populate it.
interface AddGadgetResponse {
  success: boolean
  id?: number
  label?: string
  error?: string
}

export function useCreateAccessory() {
  return useMutation({
    mutationFn: async (label: string) => {
      const params = new URLSearchParams({ action: 'add_gadget', label })
      const res = await fetch('/fichinter/add_gadget.php', { method: 'POST', credentials: 'same-origin', body: params })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: AddGadgetResponse = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Failed to add accessory.')
      return { id: data.id as number, label: data.label as string }
    },
  })
}

interface ProjectOption {
  id: string
  ref: string
  title: string
}

// GET /api/projects.php — same real, already-working endpoint (queries
// llx_projet WHERE fk_statut = 1) used by every other Create form in this
// app for its Project field (Quotations/Sales+Purchase Orders/Contracts).
// Reused as-is rather than the real page's own Project dropdown, which
// instead calls Dolibarr's core REST API (/api/index.php/projects) under a
// per-user DOLAPIKEY header — a different auth scheme this app has no
// existing infrastructure for. Real data either way; this is just the
// simpler already-proven path to it. Same reasoning is why "Ticket" isn't
// reproduced at all below (its real dropdown needs that same DOLAPIKEY
// endpoint, and it's an optional field on the real form).
export function useJobCardProjectOptions() {
  return useQuery({
    queryKey: ['projects', 'open'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; results: ProjectOption[] }>('/projects.php')
      return data.results ?? []
    },
    staleTime: 1000 * 60,
  })
}
