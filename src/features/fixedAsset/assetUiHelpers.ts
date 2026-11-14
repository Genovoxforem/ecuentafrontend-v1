import { useCallback, useEffect, useRef, useState } from 'react'
import { ROUTES } from '../../routes'
import { AssetApiError, errorText } from './assetService'
import { cleanNumber } from './assetModels'

// Plain (non-component) helpers of the Fixed Asset pages: button and table cell classes, hooks, the form value rules, and the address of the
// asset card and of a ledger piece. They live apart from AssetUi.tsx so that file only exports components (React Fast Refresh).

export const assetViewPath = (id: number | string) => ROUTES.fixedAssetDetail.replace(':id', String(id))
export const ledgerPiecePath = (piece: number | string) => ROUTES.ledgerPieceDetail.replace(':pieceNum', String(piece))

export const PRIMARY_BTN = 'inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60'
export const GHOST_BTN = 'inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50'
export const DANGER_BTN = 'inline-flex items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
export const DANGER_GHOST_BTN = 'inline-flex items-center gap-1.5 rounded-lg border border-danger/40 px-3 py-1.5 text-sm font-medium text-danger-fg hover:bg-danger-bg disabled:cursor-not-allowed disabled:opacity-50'

// A value that follows `value` after it has stopped changing for `ms` (the search boxes read the server, so they wait for the typing to pause).
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export const TH = 'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-faint'
export const THR = `${TH} text-right`
// `capitalize` because the classic theme capitalises the words of every table cell ("PW Motor Vehicles", "In Service", "5 Yrs · 10% Residual").
export const TD = 'px-4 py-2.5 align-top text-text capitalize'
export const TDR = `${TD} text-right tabular-nums`

// ---- notices (the classic page's toast) -------------------------------------------------------------------------------
export interface Notice {
  text: string
  tone: 'ok' | 'bad'
}

export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])
  const show = useCallback((text: string, tone: Notice['tone'] = 'ok') => {
    if (timer.current) clearTimeout(timer.current)
    setNotice({ text, tone })
    timer.current = setTimeout(() => setNotice(null), tone === 'bad' ? 9000 : 6000)
  }, [])
  return { notice, show, clear: useCallback(() => setNotice(null), []) }
}

// A refused request as one line: its message plus the first field errors the backend listed.
export function failureText(e: unknown, fallback: string): string {
  if (e instanceof AssetApiError) {
    const extra = Object.values(e.errors).map(errorText).filter(Boolean).slice(0, 3)
    return extra.length ? `${e.message} — ${extra.join(' ')}` : e.message
  }
  return e instanceof Error ? e.message : fallback
}

// ---- field-driven form --------------------------------------------------------------------------------------------------
export type FieldType = 'text' | 'num' | 'date' | 'select' | 'textarea' | 'account' | 'readonly' | 'email' | 'month'
export type FormValues = Record<string, string>

export interface FieldSpec {
  key: string
  label: string
  type?: FieldType
  required?: boolean
  options?: Array<{ id: string | number; label: string }>
  // select: the text of the empty choice; no blank choice when left out
  blank?: string
  placeholder?: string
  hint?: string
  full?: boolean
  disabled?: boolean
  max?: number
  show?: (values: FormValues) => boolean
}
export interface SectionSpec {
  section: string
}
export type FormItem = FieldSpec | SectionSpec

export const isSection = (i: FormItem): i is SectionSpec => 'section' in i

// The values a form submits: only the fields that are shown, trimmed (a number as plain number text); a readonly field is never sent.
export function visibleValues(items: FormItem[], values: FormValues): FormValues {
  const out: FormValues = {}
  for (const i of items) {
    if (isSection(i) || i.type === 'readonly') continue
    if (i.show && !i.show(values)) continue
    const v = (values[i.key] ?? '').trim()
    out[i.key] = i.type === 'num' ? cleanNumber(v) : v
  }
  return out
}

