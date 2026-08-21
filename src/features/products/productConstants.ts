import type { FormOption } from '../zra/createProduct.queries'

// Dolibarr's "Nature of product" (llx_product.finished column) — 1=Raw
// Material, 2=Finished Product, 3=Service. Confirmed against live DB
// (`SELECT finished, COUNT(*) FROM llx_product GROUP BY finished`) to be
// the complete set of distinct values actually in use, so this hardcoded
// list isn't missing any real option. Shared between ProductServiceCreateForm
// (the create wizard) and ProductFilterModal (the All Products list filter).
export const NATURE_OPTIONS: FormOption[] = [
  { value: '2', label: 'Finished Product' },
  { value: '1', label: 'Raw Material' },
  { value: '3', label: 'Service' },
]

// Dimension unit choices — the exact scale-code options Dolibarr's own
// weight_units/size_units/surface_units/volume_units selects offer on the
// legacy Add Products form (pulled straight from that page's rendered
// <option value=…> list, not guessed): 0 = base metric unit, negative =
// smaller metric prefix (kg→g is -3, m→cm is -2, …), 98/99 (and a few
// extras for volume) = imperial. Shared between ProductServiceCreateForm
// (the create wizard's own unit pickers) and ProductDetail (the Overview
// section's read-only weight/dimensions display, both keyed the same way).
export const WEIGHT_UNITS: FormOption[] = [
  { value: '3', label: 'ton' },
  { value: '0', label: 'kg' },
  { value: '-3', label: 'g' },
  { value: '-6', label: 'mg' },
  { value: '98', label: 'ounce' },
  { value: '99', label: 'pound' },
]
export const SIZE_UNITS: FormOption[] = [
  { value: '0', label: 'm' },
  { value: '-1', label: 'dm' },
  { value: '-2', label: 'cm' },
  { value: '-3', label: 'mm' },
  { value: '98', label: 'foot' },
  { value: '99', label: 'inch' },
]
export const SURFACE_UNITS: FormOption[] = [
  { value: '0', label: 'm²' },
  { value: '-2', label: 'dm²' },
  { value: '-4', label: 'cm²' },
  { value: '-6', label: 'mm²' },
  { value: '98', label: 'ft²' },
  { value: '99', label: 'in²' },
]
export const VOLUME_UNITS: FormOption[] = [
  { value: '0', label: 'm³' },
  { value: '-3', label: 'dm³ (L)' },
  { value: '-6', label: 'cm³ (ml)' },
  { value: '-9', label: 'mm³ (µl)' },
  { value: '88', label: 'ft³' },
  { value: '89', label: 'in³' },
  { value: '97', label: 'ounce' },
  { value: '98', label: 'litre' },
  { value: '99', label: 'gallon' },
]
