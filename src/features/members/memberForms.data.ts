import { loadMemberFormOptions } from './membersApi.data'
import { loadTagRows } from '../customers/tagTree.data'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { fetchLegacyDocument, legacyRefusalMessages, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { readMemberTables } from './membersClassic.data'

// New member type (adherents/type.php?action=create) and New member (adherents/card.php?action=create): both are classic forms with a CSRF
// token, no JSON API. Run on newecuenta on 6 Nov 2026 with the user's approval (one throwaway type and one throwaway member named
// "ZZ-TEST-DELETE-ME", both deleted again, 0 left):
//   - type add: POST type.php {token, action: add, label, status 0|1, morphy ''|phy|mor, subscription 1|0, vote 1|0, duration_value,
//     duration_unit s|i|h|d|w|m|y, comment, mail_valid} answers 302 to type.php and the row is listed as
//     "1 | ZZ-TEST-DELETE-ME type | Moral and Physical | Yes | No | Open" (Ref. is the row id);
//   - member add: POST card.php {token, action: add, socid: 0, typeid, morphy, societe, civility_id, lastname, firstname, gender,
//     member_email, address, zipcode, town, country_id, state_id, phone, phone_perso, phone_mobile, birth (+ birthday/birthmonth/birthyear),
//     public, memcats[], member_facebook/skype/twitter/linkedin/instagram/snapchat/googleplus/youtube/whatsapp, button} answers 200;
//     an empty form answers the toast "Field 'Nature of member' is required / Field 'Last name' is required / Field 'First name' is required /
//     Field 'Type' is required"; the member then appears on adherents/fapi/list.php as a Draft (status -1);
//   - the date of birth was not sent in the test, so its text format (mm/dd/yyyy, as the other classic date fields) is not verified.
// Deleting is done on the classic card (card.php?rowid=N&action=confirm_delete&confirm=yes&token=); the app has no delete button for them
// because the classic Members pages have no list with one.

const clean = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

export interface Option {
  value: string
  label: string
}

const optionsOf = (sel: Element | null | undefined): Option[] =>
  Array.from((sel as HTMLSelectElement | null)?.options ?? []).map((o) => ({ value: o.value.trim(), label: clean(o.textContent) }))

const selectedValue = (sel: Element | null | undefined): string => {
  const s = sel as HTMLSelectElement | null
  return (s?.selectedOptions[0] ?? s?.options[0])?.value.trim() ?? ''
}

// The form the page posts: the one that carries action=add (the app shell has hidden forms that reuse field names).
function addForm(doc: Document): ParentNode {
  return doc.querySelector('input[name="action"][value="add"]')?.closest('form') ?? doc
}

function tokenOf(doc: Document): string {
  const t = addForm(doc).querySelector<HTMLInputElement>('input[name="token"]')?.value
  if (!t) throw new Error('The backend page did not give a form token.')
  return t
}

// The Members forms refuse with showToast("Field \'Last name\' is required<br>\nField ...", "error") (seen on newecuenta 6 Nov 2026); other classic
// pages use toastr.error("..."), which legacyRefusalMessages reads.
const SHOW_TOAST_ERROR = /showToast\("((?:[^"\\]|\\.)*)",\s*"error"\)/g

export function memberRefusals(html: string): string[] {
  const shown = Array.from(html.matchAll(SHOW_TOAST_ERROR), (m) =>
    m[1]
      .replace(/<br\s*\/?>/gi, '')
      .replace(/\\n/g, '\n')
      .replace(/\\(["'\\/])/g, '$1')
      .trim(),
  )
  return [...shown, ...legacyRefusalMessages(html)].filter(Boolean)
}

async function postForm(path: string, body: URLSearchParams): Promise<string> {
  const res = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  const refusal = memberRefusals(html)
  if (refusal.length > 0) throw new Error(refusal.join('\n'))
  return html
}

// ---- New member type -----------------------------------------------------------------------------------------------------------

export const MEMBER_TYPE_UNITS: Option[] = [
  { value: 's', label: 'Second' },
  { value: 'i', label: 'Minute' },
  { value: 'h', label: 'Hour' },
  { value: 'd', label: 'Day' },
  { value: 'w', label: 'Week' },
  { value: 'm', label: 'Month' },
  { value: 'y', label: 'Year' },
]
export const MEMBER_TYPE_NATURES: Option[] = [
  { value: '', label: 'Moral and Physical' },
  { value: 'phy', label: 'Physical' },
  { value: 'mor', label: 'Moral' },
]

export interface MemberTypeInput {
  label: string
  status: '0' | '1'
  morphy: '' | 'phy' | 'mor'
  subscription: '0' | '1'
  vote: '0' | '1'
  durationValue: string
  durationUnit: string
  comment: string
  mailValid: string
}

export const EMPTY_MEMBER_TYPE: MemberTypeInput = { label: '', status: '1', morphy: '', subscription: '1', vote: '1', durationValue: '', durationUnit: 'y', comment: '', mailValid: '' }

const TYPE_PATH = '/adherents/type.php'

export function useCreateMemberType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (i: MemberTypeInput): Promise<void> => {
      if (!i.label.trim()) throw new Error("Field 'Label' is required")
      const doc = await fetchLegacyDocument(TYPE_PATH, new URLSearchParams({ action: 'create' }))
      const body = new URLSearchParams({
        token: tokenOf(doc),
        action: 'add',
        label: i.label.trim(),
        status: i.status,
        morphy: i.morphy,
        subscription: i.subscription,
        vote: i.vote,
        duration_value: i.durationValue,
        duration_unit: i.durationUnit,
        comment: i.comment,
        mail_valid: i.mailValid,
        button: 'Add',
      })
      // The page answers 302 to its own list and fetch follows it, so the answer IS the list: it is read to be sure the type is recorded
      // (a separate read of the list, as this did before, cost a further 0.9 s on newecuenta: the save took 6.2 s, three page loads of 500 KB).
      const html = await postForm(TYPE_PATH, body)
      const after = readMemberTables(new DOMParser().parseFromString(html, 'text/html'))[0]
      if (!after?.rows.some((r) => r[1] === i.label.trim())) throw new Error('The backend did not record this member type.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  })
}

// ---- New member ----------------------------------------------------------------------------------------------------------------

const CARD_PATH = '/adherents/card.php'

export interface NewMemberOptions {
  // adherents/card.php prints "No member types defined" and leaves out the Member type select until a type exists.
  noTypes: boolean
  types: Option[]
  natures: Option[]
  civilities: Option[]
  genders: Option[]
  countries: Option[]
  defaultCountry: string
  // The states of the country the page preselects (Zambia on newecuenta).
  defaultStates: Option[]
  tags: Option[]
  isPublic: Option[]
  isPublicDefault: string
}

export function readNewMemberOptions(doc: Document): NewMemberOptions {
  const form = addForm(doc)
  const sel = (name: string) => form.querySelector(`select[name="${name}"]`)
  const typeSel = sel('typeid')
  return {
    noTypes: !typeSel,
    types: optionsOf(typeSel).filter((o) => o.value),
    natures: optionsOf(sel('morphy')),
    civilities: optionsOf(sel('civility_id')),
    genders: optionsOf(sel('gender')),
    countries: optionsOf(sel('country_id')),
    defaultCountry: selectedValue(sel('country_id')),
    defaultStates: optionsOf(sel('state_id')),
    tags: optionsOf(sel('memcats[]')).filter((o) => o.value),
    isPublic: optionsOf(sel('public')),
    isPublicDefault: selectedValue(sel('public')),
  }
}

export function useNewMemberOptions() {
  return useQuery({
    queryKey: ['members', 'newMemberOptions'],
    // member types, natures, civilities and countries: adherents/fapi/form_options.php; the tags: categories/fapi/list.php?type=member (since 11 Nov 2026);
    // genders, states and the public flag are not in an answer and still come from the classic form (when the classic session is there)
    queryFn: async (): Promise<NewMemberOptions> => {
      const api = await loadMemberFormOptions()
      const classic = await fetchLegacyDocument(CARD_PATH, new URLSearchParams({ leftmenu: 'members', action: 'create' }))
        .then(readNewMemberOptions)
        .catch(() => null)
      // an unanswered tag feed leaves the classic form's own list (when that was read)
      const tags = await loadTagRows('member').then((rows) => rows.map((t) => ({ value: String(t.id), label: t.fullLabel }))).catch(() => classic?.tags ?? [])
      return {
        noTypes: api.types.length === 0,
        types: api.types,
        natures: api.natures,
        civilities: api.civilities,
        genders: classic?.genders ?? [],
        countries: api.countries,
        defaultCountry: classic?.defaultCountry ?? '',
        defaultStates: classic?.defaultStates ?? [],
        tags,
        isPublic: classic?.isPublic ?? [],
        isPublicDefault: classic?.isPublicDefault ?? '',
      }
    },
    staleTime: 0,
  })
}

export interface NewMemberInput {
  typeid: string
  morphy: string
  societe: string
  civility_id: string
  lastname: string
  firstname: string
  gender: string
  member_email: string
  address: string
  zipcode: string
  town: string
  country_id: string
  state_id: string
  phone: string
  phone_perso: string
  phone_mobile: string
  // yyyy-mm-dd from the date input, '' when empty
  birth: string
  public: string
  memcats: string[]
  member_facebook: string
  member_skype: string
  member_twitter: string
  member_linkedin: string
  member_instagram: string
  member_snapchat: string
  member_googleplus: string
  member_youtube: string
  member_whatsapp: string
}

export const EMPTY_NEW_MEMBER: NewMemberInput = {
  typeid: '',
  morphy: '',
  societe: '',
  civility_id: '',
  lastname: '',
  firstname: '',
  gender: '',
  member_email: '',
  address: '',
  zipcode: '',
  town: '',
  country_id: '',
  state_id: '0',
  phone: '',
  phone_perso: '',
  phone_mobile: '',
  birth: '',
  public: '1',
  memcats: [],
  member_facebook: '',
  member_skype: '',
  member_twitter: '',
  member_linkedin: '',
  member_instagram: '',
  member_snapchat: '',
  member_googleplus: '',
  member_youtube: '',
  member_whatsapp: '',
}

async function memberTotal(): Promise<number | null> {
  try {
    const d = await fapiGet<{ pagination?: { total?: number } }>('/adherents/fapi/list.php', { limit: 1 })
    return typeof d.pagination?.total === 'number' ? d.pagination.total : null
  } catch {
    return null
  }
}

export function useCreateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (i: NewMemberInput): Promise<void> => {
      const doc = await fetchLegacyDocument(CARD_PATH, new URLSearchParams({ leftmenu: 'members', action: 'create' }))
      const before = await memberTotal()
      const birthParts = i.birth.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      const [bm, bd, by] = birthParts ? [birthParts[2], birthParts[3], birthParts[1]] : ['', '', '']
      const { memcats, birth: _birth, ...fields } = i
      void _birth
      const body = new URLSearchParams({
        token: tokenOf(doc),
        action: 'add',
        socid: '0',
        ...fields,
        birth: bm ? `${bm}/${bd}/${by}` : '',
        birthday: bd,
        birthmonth: bm,
        birthyear: by,
        button: 'Create member',
      })
      for (const c of memcats) body.append('memcats[]', c)
      await postForm(CARD_PATH, body)
      const after = await memberTotal()
      if (before !== null && after !== null && after <= before) throw new Error('The backend did not record this member.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  })
}
