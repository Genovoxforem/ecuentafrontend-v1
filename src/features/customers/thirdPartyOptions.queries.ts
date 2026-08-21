import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { useProductFormOptions } from '../zra/createProduct.queries'
import { useLanguageOptions } from '../users/users.queries'
import { useCustomerGroupsSummary } from './customerGroups.queries'
import { isBackendUnavailable } from '../../shared/components/BackendUnavailable'
import {
  DICTIONARY_IDS,
  parseCurrenciesDocument,
  parseThirdPartyTypesDocument,
  parseWorkforceDocument,
  looksLikeLegacyLoginPage,
  type DictionaryOption,
} from './legacyDictionaryParser'

// Fallback country list when /zra/product-form-options/ API is unavailable
const FALLBACK_COUNTRIES = [
  { value: 'ZM', label: 'Zambia' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'BW', label: 'Botswana' },
  { value: 'KE', label: 'Kenya' },
  { value: 'TZ', label: 'Tanzania' },
  { value: 'MZ', label: 'Mozambique' },
  { value: 'MW', label: 'Malawi' },
  { value: 'UG', label: 'Uganda' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'CN', label: 'China' },
  { value: 'IN', label: 'India' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'JP', label: 'Japan' },
  { value: 'AU', label: 'Australia' },
  { value: 'CA', label: 'Canada' },
  { value: 'BR', label: 'Brazil' },
]

// The legacy create form (societe/card.php) hardcodes this exact 3-option
// list inline (<select name="nrc_id">NRC/Passport/Driving license</select>)
// rather than reading it from a database dictionary — confirmed by reading
// that file directly. So this is real parity with the live system, not a
// placeholder: there is no NRC table to fetch from on either app.
const NRC_OPTIONS = [
  { value: 'NRC', label: 'NRC' },
  { value: 'Passport', label: 'Passport' },
  { value: 'Driving license', label: 'Driving license' },
]

interface WebEnvelope<T> {
  success: boolean
  data: T
}

// GET /api/customers/lookups/ (api/customers/lookups/index.php) — real,
// direct SQL against the same dictionary tables societe/card.php's own
// select_* helpers use (llx_c_typent, llx_c_forme_juridique, llx_c_effectif,
// llx_c_incoterms, llx_multicurrency, llx_entity, llx_user, llx_categorie).
// This single endpoint already existed and was fully unused before this —
// see thirdPartyFormOptions below, which now sources 6 previously-hardcoded
// dropdowns from it instead of inline JS constants.
export interface CustomerLookups {
  defaultCountryId: number | null
  currencies: Array<{ code: string; name: string }>
  legalForms: Array<{ id: number; label: string }>
  typent: Array<{ id: number; code: string; label: string }>
  effectifs: Array<{ id: number; label: string }>
  incoterms: Array<{ id: number; code: string }>
  entities: Array<{ id: number; label: string }>
  salesReps: Array<{ id: number; name: string }>
  custCategories: Array<{ id: number; label: string }>
  vendorCategories: Array<{ id: number; label: string }>
  nextCustomerCode: string
  nextVendorCode: string
}

export function useCustomerLookups() {
  return useQuery({
    queryKey: ['customers', 'lookups'],
    queryFn: async (): Promise<CustomerLookups> => {
      const { data } = await api.get<WebEnvelope<CustomerLookups>>('/customers/lookups/')
      return data.data
    },
    staleTime: 1000 * 60 * 10,
    // /customers/lookups/ doesn't exist on the currently-active backend (see
    // BackendUnavailable.tsx) — a permanent 404, so retrying is pointless.
    retry: false,
  })
}

// Currency/Third-party type/Workforce dictionaries — /customers/lookups/
// (used above) is a confirmed 404, but the real Dolibarr admin dictionary
// pages themselves (admin/dict.php?id=9|8|19) are live on this backend and
// session-cookie authenticated, same as every other legacy-scrape source in
// this app (see legacyDictionaryParser.ts for how the id-to-dictionary
// mapping and row structure were verified). Business entity type
// (id=1/llx_c_forme_juridique) was checked too but has zero rows for
// Zambia, so it's deliberately left out here — still sourced from the dead
// lookups endpoint below, same "not available" state as before.
async function fetchLegacyDictionary(id: number): Promise<Document> {
  const res = await fetch(`/admin/dict.php?id=${id}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy dictionary backend returned ${res.status}.`)
  const html = await res.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (looksLikeLegacyLoginPage(doc)) throw new Error('Not signed into the legacy backend.')
  return doc
}

export function useLegacyDictionary(kind: keyof typeof DICTIONARY_IDS, parse: (doc: Document) => DictionaryOption[]) {
  return useQuery({
    queryKey: ['customers', 'legacyDictionary', kind],
    queryFn: async () => parse(await fetchLegacyDictionary(DICTIONARY_IDS[kind])),
    staleTime: 1000 * 60 * 30,
    // Unlike /customers/lookups/ above (retry: false because that's a
    // confirmed permanent 404), this endpoint is real and working — a
    // failure here is more likely a transient race against
    // establishLegacySession() still finishing (this form can be the
    // first legacy-scrape page visited right after login), so default
    // retry behavior applies instead of giving up after one attempt.
  })
}

// GET /api/users/states/?countryId= (api/users/states/index.php) — real,
// llx_c_departements joined to llx_c_regions for the given country. Legacy's
// own State/Province field (select_state($country_code), societe/card.php)
// is exactly this reactive-to-country behavior — a flat, country-independent
// state list (what this app previously reused the Country list as a
// placeholder for) can't represent that, so this is a separate hook the
// create form calls whenever its selected country changes.
export interface StateOption {
  value: string
  label: string
}
export function useStatesByCountry(countryId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'states', countryId],
    queryFn: async (): Promise<StateOption[]> => {
      const { data } = await api.get<WebEnvelope<Array<{ id: number; label: string }>>>('/users/states/', { params: { countryId } })
      return data.data.map((s) => ({ value: String(s.id), label: s.label }))
    },
    enabled: !!countryId,
    staleTime: 1000 * 60 * 10,
    // api/users/ (and therefore /users/states/) doesn't exist at all on the
    // currently-active backend — a permanent 404. Deliberately not surfaced
    // as a form-level error: callers just get an empty state list back (see
    // stateOptions below), same "graceful, non-blocking" treatment as any
    // other optional dropdown source failing.
    retry: false,
  })
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
  const { data: productOptions, isLoading: productsLoading } = useProductFormOptions()
  const { data: languageOptions, isLoading: languagesLoading } = useLanguageOptions()
  const { data: groupsSummary, isError: groupsIsError, error: groupsError } = useCustomerGroupsSummary()
  const { data: lookups, isLoading: lookupsLoading, isError: lookupsIsError, error: lookupsError } = useCustomerLookups()
  const { data: currencyDict, isLoading: currencyLoading } = useLegacyDictionary('currencies', parseCurrenciesDocument)
  const { data: thirdPartyTypeDict, isLoading: thirdPartyTypeLoading } = useLegacyDictionary('thirdPartyTypes', parseThirdPartyTypesDocument)
  const { data: workforceDict, isLoading: workforceLoading } = useLegacyDictionary('workforce', parseWorkforceDocument)

  // /customers/lookups/ and /customers/groups/ both don't exist on the
  // currently-active backend — when either is down, several of the
  // dropdowns built below (Business entity type, Incoterms, Environment,
  // Sales rep, Categories, Customer Group, next Customer/Vendor code) come
  // back as empty rather than the real dictionary data. Currency,
  // Third-party type, and Workforce are sourced from the real legacy
  // dict.php pages instead (see useLegacyDictionary above), so they're
  // excluded from this flag — it only needs to explain the gaps that are
  // still genuinely unfilled.
  const optionsUnavailable = (lookupsIsError && isBackendUnavailable(lookupsError)) || (groupsIsError && isBackendUnavailable(groupsError))

  // Use fallback countries if API doesn't return any (e.g., /zra/product-form-options/ unavailable)
  const countries = (productOptions?.countries && productOptions.countries.length > 0) ? productOptions.countries : FALLBACK_COUNTRIES

  const languages = languageOptions?.map((lang) => ({ value: lang.code, label: lang.label })) ?? []

  const customerGroups = groupsSummary?.groups?.map((group) => ({ value: String(group.id), label: group.label })) ?? []

  const currencies = currencyDict ?? []
  const businessEntityTypes = lookups?.legalForms?.map((f) => ({ value: String(f.id), label: f.label })) ?? []
  const thirdPartyTypes = thirdPartyTypeDict ?? []
  const workforce = workforceDict ?? []
  const incoterms = lookups?.incoterms?.map((i) => ({ value: String(i.id), label: i.code })) ?? []
  const environment = lookups?.entities?.map((e) => ({ value: String(e.id), label: e.label })) ?? []
  const salesReps = lookups?.salesReps?.map((r) => ({ value: String(r.id), label: r.name })) ?? []
  const custCategories = lookups?.custCategories?.map((c) => ({ value: String(c.id), label: c.label })) ?? []
  const vendorCategories = lookups?.vendorCategories?.map((c) => ({ value: String(c.id), label: c.label })) ?? []

  const options: ThirdPartyFormOptions = {
    countries,
    defaultCountryId: lookups?.defaultCountryId ?? null,
    currencies,
    businessEntityTypes,
    thirdPartyTypes,
    nrcTypes: NRC_OPTIONS,
    workforce,
    languages,
    incoterms,
    environment,
    customerGroups,
    salesReps,
    custCategories,
    vendorCategories,
    nextCustomerCode: lookups?.nextCustomerCode ?? '',
    nextVendorCode: lookups?.nextVendorCode ?? '',
  }

  return {
    data: options,
    isLoading: productsLoading || languagesLoading || lookupsLoading || currencyLoading || thirdPartyTypeLoading || workforceLoading,
    isError: false,
    optionsUnavailable,
  }
}
