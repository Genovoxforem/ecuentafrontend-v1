import { useQuery } from '@tanstack/react-query'
import { useLanguageOptions } from '../users/users.queries'
import { useCustomerGroupsSummary } from './customerGroups.queries'
import { isBackendUnavailable } from '../../shared/components/BackendUnavailable'

// societe/card.php?type=c|f|p hardcodes this exact 3-option list inline
// (<select name="nrc_id">NRC/Passport/Driving license</select>) rather than
// reading it from a database dictionary — confirmed by reading that file
// directly, and confirmed again live in societe/api/meta.php?action=
// wizard_options's own `nrc_types` field, which returns these same 3 values.
const NRC_OPTIONS = [
  { value: 'NRC', label: 'NRC' },
  { value: 'Passport', label: 'Passport' },
  { value: 'Driving license', label: 'Driving license' },
]

// GET societe/api/meta.php?action=wizard_options — the real endpoint behind
// the legacy "New Third Party" wizard's own dropdowns (found by watching the
// wizard's own network traffic: clicking "+New Customer" on
// societe/list.php?type=c fires this exact request, not /api/customers/
// lookups/ or any admin/dict.php page). One call replaces what used to be
// five separate sources (a dead /customers/lookups/ endpoint plus three
// admin/dict.php scrapes plus /zra/product-form-options/'s country list) —
// and several of those old sources were flat wrong: e.g. `currencies` here
// is llx_multicurrency's 3 actually-configured currencies (INR/USD/ZMW),
// not the 100+ entry ISO reference list admin/dict.php?id=9 returns, most of
// which this deployment can't actually post a customer against.
// Auth is the same session-cookie convention as every other societe/api/*
// endpoint (sc_meta_field_options() only requires $user->hasRight('societe',
// 'lire') — confirmed by reading the file directly), and this is a plain GET
// read with no CSRF token requirement (unlike societes.php's mutations).
interface WizardOptionsResponse {
  ok: boolean
  countries: Array<{ id: number; code: string; label: string }>
  currencies: Array<{ id: string; code: string; label: string }>
  typent: Array<{ id: number; label: string }>
  effectif: Array<{ id: number; label: string }>
  juridical: Array<{ id: number; code: string; label: string }>
  incoterms: Array<{ id: number; label: string }>
  users: Array<{ id: number; name: string; login: string }>
  categories_customer: Array<{ id: number; label: string }>
  categories_supplier: Array<{ id: number; label: string }>
  nrc_types: Array<{ id: string; label: string }>
  default_country_id: number | null
}

async function fetchWizardOptions(): Promise<WizardOptionsResponse> {
  const res = await fetch('/societe/api/meta.php?action=wizard_options', { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const data: WizardOptionsResponse = await res.json()
  if (!data.ok) throw new Error('Legacy backend rejected the wizard_options request.')
  return data
}

// Same shape this app's other consumer (OrderCreateForm.tsx's Currency
// dropdown) already reads via useCustomerLookups().currencies — kept as-is
// so that call site didn't need to change when this stopped being a dead
// endpoint and started returning the real llx_multicurrency rows instead.
export interface CustomerLookups {
  defaultCountryId: number | null
  countries: Array<{ id: number; label: string }>
  currencies: Array<{ code: string; name: string }>
  legalForms: Array<{ id: number; label: string }>
  typent: Array<{ id: number; label: string }>
  effectifs: Array<{ id: number; label: string }>
  incoterms: Array<{ id: number; code: string }>
  salesReps: Array<{ id: number; name: string }>
  custCategories: Array<{ id: number; label: string }>
  vendorCategories: Array<{ id: number; label: string }>
}

function dedupeByLabel<T extends { label: string }>(rows: T[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []
  for (const row of rows) {
    if (seen.has(row.label)) continue
    seen.add(row.label)
    result.push(row)
  }
  return result
}

export function useCustomerLookups() {
  return useQuery({
    queryKey: ['customers', 'wizardOptions'],
    queryFn: async (): Promise<CustomerLookups> => {
      const data = await fetchWizardOptions()
      return {
        defaultCountryId: data.default_country_id,
        countries: data.countries.map((c) => ({ id: c.id, label: c.label })),
        currencies: data.currencies.map((c) => ({ code: c.code, name: c.label })),
        // This global (unfiltered-by-country) legal-forms list genuinely has
        // duplicate labels across different countries' forms sharing a name
        // (e.g. "Sociedad Anónima" appears under at least 3 different ids —
        // confirmed live) — the <select>s this feeds key/look up by label
        // text (see ThirdPartyCreateForm.tsx's selectedBusinessEntityId),
        // same constraint every other dropdown in this app already has, so
        // duplicates are collapsed to their first occurrence rather than
        // producing duplicate React keys.
        legalForms: dedupeByLabel(data.juridical),
        typent: data.typent.filter((t) => t.label).map((t) => ({ id: t.id, label: t.label })),
        effectifs: data.effectif.filter((e) => e.label).map((e) => ({ id: e.id, label: e.label })),
        incoterms: data.incoterms.filter((i) => i.id > 0).map((i) => ({ id: i.id, code: i.label })),
        salesReps: data.users.map((u) => ({ id: u.id, name: u.name })),
        custCategories: data.categories_customer.map((c) => ({ id: c.id, label: c.label })),
        vendorCategories: data.categories_supplier.map((c) => ({ id: c.id, label: c.label })),
      }
    },
    staleTime: 1000 * 60 * 10,
    // Real, working endpoint (confirmed live) — unlike the old /customers/
    // lookups/ this replaced, a failure here is more likely transient (e.g.
    // a race against establishLegacySession() still finishing) than a
    // permanent 404, so default retry behavior applies.
  })
}

// GET societe/api/meta.php?action=states&country_id=X — the real endpoint
// behind the wizard's own reactive State/Province field (select_state(),
// societe/card.php), found the same way as wizard_options above. Replaces
// the old /api/users/states/ call, which was a permanent 404 on this
// backend (api/users/ doesn't exist at all) and always left this field
// empty.
export interface StateOption {
  value: string
  label: string
}
export function useStatesByCountry(countryId: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'wizardStates', countryId],
    queryFn: async (): Promise<StateOption[]> => {
      const res = await fetch(`/societe/api/meta.php?action=states&country_id=${countryId}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: { ok: boolean; states: Array<{ id: number; label: string }> } = await res.json()
      if (!data.ok) return []
      return data.states.map((s) => ({ value: String(s.id), label: s.label }))
    },
    enabled: !!countryId,
    staleTime: 1000 * 60 * 10,
  })
}

// societe/api/societes.php (the real endpoint the legacy "New Third Party"
// wizard itself posts to — see ThirdPartyCreateForm.tsx's create mutation)
// enforces Dolibarr's own CSRF token check on mutations, unlike the
// read-only societe/api/* GETs this app already uses elsewhere. Confirmed
// live: the token is both a `societeToken` JS global AND a hidden
// `<input name="token">` on any authenticated societe/list.php page, tied to
// the PHP session rather than that specific page.
export interface SocieteFormContext {
  token: string
}
export async function fetchSocieteFormContext(): Promise<SocieteFormContext> {
  const res = await fetch('/societe/list.php?type=c', { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status} fetching form context.`)
  const html = await res.text()
  const tokenMatch = html.match(/name=["']token["']\s+value=["']([a-f0-9]+)["']/) ?? html.match(/societeToken\s*=\s*['"]([a-f0-9]+)['"]/)
  if (!tokenMatch) throw new Error('Could not find a CSRF token on the legacy page.')
  return { token: tokenMatch[1] }
}

export interface ThirdPartyFormOptions {
  countries: Array<{ value: string; label: string }>
  defaultCountryId: number | null
  currencies: Array<{ value: string; label: string }>
  businessEntityTypes: Array<{ value: string; label: string }>
  thirdPartyTypes: Array<{ value: string; label: string }>
  nrcTypes: Array<{ value: string; label: string }>
  workforce: Array<{ value: string; label: string }>
  languages: Array<{ value: string; label: string }>
  incoterms: Array<{ value: string; label: string }>
  environment: Array<{ value: string; label: string }>
  customerGroups: Array<{ value: string; label: string }>
  salesReps: Array<{ value: string; label: string }>
  custCategories: Array<{ value: string; label: string }>
  vendorCategories: Array<{ value: string; label: string }>
  nextCustomerCode: string
  nextVendorCode: string
}

// Combined hook that fetches all form options needed for the Third Party creation form
export function useThirdPartyFormOptions() {
  const { data: languageOptions, isLoading: languagesLoading } = useLanguageOptions()
  const { data: groupsSummary, isError: groupsIsError, error: groupsError } = useCustomerGroupsSummary()
  const { data: lookups, isLoading: lookupsLoading, isError: lookupsIsError, error: lookupsError } = useCustomerLookups()

  const optionsUnavailable = (lookupsIsError && isBackendUnavailable(lookupsError)) || (groupsIsError && isBackendUnavailable(groupsError))

  const languages = languageOptions?.map((lang) => ({ value: lang.code, label: lang.label })) ?? []
  const customerGroups = groupsSummary?.groups?.map((group) => ({ value: String(group.id), label: group.label })) ?? []

  const options: ThirdPartyFormOptions = {
    countries: lookups?.countries?.map((c) => ({ value: String(c.id), label: c.label })) ?? [],
    defaultCountryId: lookups?.defaultCountryId ?? null,
    currencies: lookups?.currencies?.map((c) => ({ value: c.code, label: c.name })) ?? [],
    businessEntityTypes: lookups?.legalForms?.map((f) => ({ value: String(f.id), label: f.label })) ?? [],
    thirdPartyTypes: lookups?.typent?.map((t) => ({ value: String(t.id), label: t.label })) ?? [],
    nrcTypes: NRC_OPTIONS,
    workforce: lookups?.effectifs?.map((e) => ({ value: String(e.id), label: e.label })) ?? [],
    languages,
    incoterms: lookups?.incoterms?.map((i) => ({ value: String(i.id), label: i.code })) ?? [],
    // No Dolibarr dictionary or wizard_options field backs this on this
    // install (confirmed: no `entities`/multi-company data anywhere in
    // wizard_options's response, and no matching <select> on the real
    // wizard page either) — left empty rather than faked.
    environment: [],
    customerGroups,
    salesReps: lookups?.salesReps?.map((r) => ({ value: String(r.id), label: r.name })) ?? [],
    custCategories: lookups?.custCategories?.map((c) => ({ value: String(c.id), label: c.label })) ?? [],
    vendorCategories: lookups?.vendorCategories?.map((c) => ({ value: String(c.id), label: c.label })) ?? [],
    // The real wizard's own Customer/Vendor code fields render blank too
    // (confirmed live) — Dolibarr generates these server-side on submit
    // ("auto"), there's no next-code preview to show.
    nextCustomerCode: '',
    nextVendorCode: '',
  }

  return {
    data: options,
    isLoading: languagesLoading || lookupsLoading,
    isError: false,
    optionsUnavailable,
  }
}
