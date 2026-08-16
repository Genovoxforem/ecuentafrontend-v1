import { useQuery } from '@tanstack/react-query'
import { useProductFormOptions } from '../zra/createProduct.queries'
import { useLanguageOptions } from '../users/users.queries'
import { useCustomerGroupsSummary } from './customerGroups.queries'

// Static currency list — no currency-dictionary endpoint exists on this backend
const BASE_CURRENCIES = [
  { value: 'ZMW', label: 'Zambian Kwacha (ZMW)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'INR', label: 'Indian Rupee (INR)' },
]

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

// Static business entity types — common legal structures
const BUSINESS_ENTITY_TYPES = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'limited_company', label: 'Limited Company' },
  { value: 'public_limited_company', label: 'Public Limited Company' },
  { value: 'ngo_non_profit', label: 'NGO / Non-Profit' },
  { value: 'government', label: 'Government' },
]

// Static workforce/employee count options
const WORKFORCE_OPTIONS = [
  { value: '0', label: '0 employees' },
  { value: '1', label: '1-5 employees' },
  { value: '2', label: '6-10 employees' },
  { value: '3', label: '11-50 employees' },
  { value: '4', label: '51-100 employees' },
  { value: '5', label: '101-500 employees' },
  { value: '6', label: '500+ employees' },
]

// Static incoterms options
const INCOTERMS_OPTIONS = [
  { value: 'EXW', label: 'EXW - Ex Works' },
  { value: 'FCA', label: 'FCA - Free Carrier' },
  { value: 'FAS', label: 'FAS - Free Alongside Ship' },
  { value: 'FOB', label: 'FOB - Free on Board' },
  { value: 'CFR', label: 'CFR - Cost and Freight' },
  { value: 'CIF', label: 'CIF - Cost, Insurance and Freight' },
  { value: 'CPT', label: 'CPT - Carriage Paid To' },
  { value: 'CIP', label: 'CIP - Carriage and Insurance Paid' },
  { value: 'DAF', label: 'DAF - Delivered at Frontier' },
  { value: 'DES', label: 'DES - Delivered Ex Ship' },
  { value: 'DEQ', label: 'DEQ - Delivered Ex Quay' },
  { value: 'DDU', label: 'DDU - Delivered Duty Unpaid' },
  { value: 'DDP', label: 'DDP - Delivered Duty Paid' },
]

// Static NRC type options (National Registration Certificate types)
const NRC_OPTIONS = [
  { value: 'zambian', label: 'Zambian NRC' },
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'company_registration', label: 'Company Registration' },
  { value: 'tax_clearance', label: 'Tax Clearance' },
  { value: 'other', label: 'Other' },
]

// Static prospect types
const THIRD_PARTY_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'company', label: 'Company' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'agent', label: 'Agent' },
  { value: 'other', label: 'Other' },
]

export interface ThirdPartyFormOptions {
  countries: Array<{ value: string; label: string }>
  states: Array<{ value: string; label: string }>
  currencies: Array<{ value: string; label: string }>
  businessEntityTypes: Array<{ value: string; label: string }>
  thirdPartyTypes: Array<{ value: string; label: string }>
  nrcTypes: Array<{ value: string; label: string }>
  workforce: Array<{ value: string; label: string }>
  languages: Array<{ value: string; label: string }>
  incoterms: Array<{ value: string; label: string }>
  customerGroups: Array<{ value: string; label: string }>
}

// Combined hook that fetches all form options needed for the Third Party creation form
export function useThirdPartyFormOptions() {
  const { data: productOptions, isLoading: productsLoading } = useProductFormOptions()
  const { data: languageOptions, isLoading: languagesLoading } = useLanguageOptions()
  const { data: groupsSummary } = useCustomerGroupsSummary()

  // Transform product form options to the format we need
  // Use fallback countries if API doesn't return any (e.g., /zra/product-form-options/ unavailable)
  const countries = (productOptions?.countries && productOptions.countries.length > 0) 
    ? productOptions.countries 
    : FALLBACK_COUNTRIES
  
  // Convert language options to the right format
  const languages = languageOptions?.map((lang) => ({
    value: lang.code,
    label: lang.label,
  })) ?? []

  // Convert customer groups to select options with safe chaining
  const customerGroups = groupsSummary?.groups?.map((group) => ({
    value: group.id,
    label: group.label,
  })) ?? []

  const options: ThirdPartyFormOptions = {
    countries,
    states: productOptions?.countries ?? [], // Using countries as a placeholder for states
    currencies: BASE_CURRENCIES,
    businessEntityTypes: BUSINESS_ENTITY_TYPES,
    thirdPartyTypes: THIRD_PARTY_TYPES,
    nrcTypes: NRC_OPTIONS,
    workforce: WORKFORCE_OPTIONS,
    languages,
    incoterms: INCOTERMS_OPTIONS,
    customerGroups,
  }

  return {
    data: options,
    isLoading: productsLoading || languagesLoading,
    isError: false,
  }
}
