import { fapiGet } from '../../api/fapiEnvelope'
import { fmt } from '../reports/reportFormat'
import type { MemberTable } from './membersClassic.data'

// adherents/fapi (13 Nov 2026, #402-405, key-authenticated, read-only) replaces the scrape of the classic Members pages:
//   types.php          -> {items, count}                        = adherents/type.php
//   subscriptions.php  -> {items, totals {count, amount}, pagination {page, limit, total, pages}} = adherents/subscription/list.php
//   stats.php          -> {year, by_status, by_type, new_by_year, new_by_month [{month, label, count}], subscription_amount_by_year, totals} = stats/index.php
//   form_options.php   -> {member_types, natures [{value,label}], civilities [{code,label}], countries [{id,code,label}], statuses}
// newecuenta has no member type, subscription or member, so every list answered empty on 13 Nov 2026 (read live): the row fields below are not
// seen. They are read under the names of the classic columns' own data (id, label, morphy, subscription, vote, status ...) and left blank when a
// field is absent; the geography / nature statistics pages stay on the classic pages (stats.php has no such breakdown).

type Row = Record<string, unknown>
const pick = (r: Row, ...keys: string[]) => {
  for (const k of keys) {
    const v = r[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return ''
}
const text = (r: Row, ...keys: string[]) => String(pick(r, ...keys))
const yesNo = (v: unknown) => (v === 1 || v === '1' || v === true || v === 'yes' ? 'Yes' : v === '' ? '' : 'No')
const money = (v: unknown) => (v === '' ? '' : fmt(v as number))
const day = (v: unknown) => {
  const s = String(v ?? '')
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return `${s.slice(5, 7)}/${s.slice(8, 10)}/${s.slice(0, 4)}`
  return /^\d{9,10}$/.test(s) ? new Date(Number(s) * 1000).toISOString().slice(0, 10).replace(/(\d+)-(\d+)-(\d+)/, '$2/$3/$1') : s
}
const nature = (v: unknown) => (v === 'phy' ? 'Physical' : v === 'mor' ? 'Moral' : v === '' || v === 'moral_physical' ? 'Moral and Physical' : String(v))

const table = (title: string, headers: string[], rows: string[][], emptyNote = 'None'): MemberTable => ({ title, headers, rows, emptyNote: rows.length ? '' : emptyNote, message: '' })

export async function loadTypesTable(): Promise<MemberTable[]> {
  const d = await fapiGet<{ items: Row[] }>('/adherents/fapi/types.php')
  return [
    table(
      '',
      ['Ref.', 'Label', 'Nature of members', 'Subscription required', 'Vote allowed', 'Status'],
      d.items.map((r) => [text(r, 'id', 'rowid', 'ref'), text(r, 'label'), nature(pick(r, 'morphy', 'nature')), yesNo(pick(r, 'subscription', 'subscription_required')), yesNo(pick(r, 'vote', 'vote_allowed')), pick(r, 'status', 'statut') === 1 || pick(r, 'status', 'statut') === '1' ? 'Open' : pick(r, 'status_label') ? text(r, 'status_label') : 'Closed']),
      'No data available in table',
    ),
  ]
}

export async function loadSubscriptionsTable(): Promise<MemberTable[]> {
  const items: Row[] = []
  for (let page = 1; page <= 50; page++) {
    const d = await fapiGet<{ items: Row[]; pagination?: { pages?: number } }>('/adherents/fapi/subscriptions.php', { page, limit: 200 })
    items.push(...d.items)
    if (page >= (d.pagination?.pages ?? 1)) break
  }
  return [
    table(
      '',
      ['Ref.', 'Type', 'Last name', 'First name', 'Login', 'Label', 'Bank account', 'Subscription date', 'End subscription', 'Amount'],
      items.map((r) => [text(r, 'id', 'rowid', 'ref'), text(r, 'type_label', 'type'), text(r, 'lastname'), text(r, 'firstname'), text(r, 'login'), text(r, 'label', 'note'), text(r, 'bank_account', 'bank'), day(pick(r, 'date_subscription', 'datec', 'dateh', 'date')), day(pick(r, 'date_end', 'datef', 'end_date')), money(pick(r, 'amount'))]),
      'No data available in table',
    ),
  ]
}

// "Statistics on subscriptions" (classic stats/index.php): Year | Number of subscriptions | Total amount | Average amount
export async function loadSubscriptionStats(): Promise<MemberTable[]> {
  const d = await fapiGet<{ subscription_amount_by_year: Row[] }>('/adherents/fapi/stats.php')
  return [
    table(
      '',
      ['Year', 'Number of subscriptions', 'Total amount', 'Average amount'],
      d.subscription_amount_by_year.map((r) => [text(r, 'year'), text(r, 'count', 'subscriptions', 'nb'), money(pick(r, 'amount', 'total', 'total_amount')), money(pick(r, 'average', 'avg', 'average_amount'))]),
    ),
  ]
}

export interface ApiOption {
  value: string
  label: string
}

export interface MemberFormOptions {
  types: ApiOption[]
  natures: ApiOption[]
  civilities: ApiOption[]
  countries: ApiOption[]
}

// form_options.php: member types, natures, civilities and countries of the new-member form (countries by id, as the form posts them).
export async function loadMemberFormOptions(): Promise<MemberFormOptions> {
  const d = await fapiGet<{ member_types: Row[]; natures: Array<{ value: string; label: string }>; civilities: Array<{ code: string; label: string }>; countries: Array<{ id: number; label: string }> }>('/adherents/fapi/form_options.php')
  return {
    types: d.member_types.map((t) => ({ value: text(t, 'id', 'value', 'rowid'), label: text(t, 'label') })),
    natures: d.natures,
    civilities: d.civilities.map((c) => ({ value: c.code, label: c.label })),
    countries: d.countries.map((c) => ({ value: String(c.id), label: c.label })),
  }
}
