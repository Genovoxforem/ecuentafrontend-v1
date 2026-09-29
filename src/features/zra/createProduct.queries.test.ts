import { describe, expect, it } from 'vitest'
import { parseProductForm, pickUnitByCode } from './createProduct.queries'

const opt = (value: string, label: string, selected = false) => `<option value="${value}"${selected ? ' selected' : ''}>${label}</option>`

const FORM = `<form id="productsForm">
<input type="hidden" name="asycuda_type" value="0"><input type="hidden" name="prod_type" value="0">
<select name="statut">${opt('1', 'OnSell', true)}${opt('0', 'NotOnSell')}</select>
<select name="finished">${opt('2', 'Finished Product', true)}${opt('1', 'Raw Material')}${opt('3', 'Service')}</select>
<select name="country_id">${opt('0', 'Select Country')}${opt('28', 'Australia (AU)')}${opt('239', 'Zambia (ZM)', true)}</select>
<select name="fk_default_warehouse">${opt('-1', 'Select a warehouse', true)}${opt('1', 'MAIN_BRANCH')}</select>
<select name="units">${opt('0', 'Unit of Quantity', true)}${opt('1 (4B)', 'Pair (4B)')}${opt('42 (U)', 'Pieces/item [Number] (U)')}</select>
<select name="packing">${opt('0', 'Packaging Unit', true)}${opt('164 (PACK)', 'PACK (PACK)')}</select>
<select name="price_base_type">${opt('HT', 'Excl. tax')}${opt('TTC', 'Inc. tax', true)}</select>
<select name="tva_tx">${opt('0', 'Select Tax Category')}${opt('16 (A)', 'A-16%', true)}${opt('16 (B)', 'B-16%')}</select>
<select name="iplCatCd">${opt('0', 'Select Tax Category', true)}${opt('5 (IPL1)', 'IPL1-5%')}</select>
<select name="fk_barcode_type">${opt('0', 'Select a barcode type')}${opt('6', 'Code 128', true)}</select>
<select name="weight_units">${opt('3', 'ton')}${opt('0', 'kg', true)}</select>
<select name="accountancy_code_sell">${opt(' ', ' ')}${opt('5017', '5017 - Sales', true)}</select>
<select name="categories[]" multiple>${opt('19', 'Beverages')}${opt('32', 'Beverages &gt;&gt; b1')}</select>
</form>`

describe('parseProductForm', () => {
  const o = parseProductForm(new DOMParser().parseFromString(FORM, 'text/html'))

  it('drops the "nothing chosen" options but keeps real ones', () => {
    expect(o.countries.map((c) => c.value)).toEqual(['28', '239'])
    expect(o.units.map((c) => c.value)).toEqual(['1 (4B)', '42 (U)'])
    expect(o.vatCategories.map((c) => c.value)).toEqual(['16 (A)', '16 (B)'])
    expect(o.warehouses.map((c) => c.value)).toEqual(['1'])
    expect(o.barcodeTypes.map((c) => c.value)).toEqual(['6'])
  })

  it('keeps zero-valued unit scales and drops the blank account option', () => {
    expect(o.weightUnits.map((c) => c.value)).toEqual(['3', '0'])
    expect(o.accountingAccounts.map((c) => c.value)).toEqual(['5017'])
    expect(o.natures.map((c) => c.value)).toEqual(['2', '1', '3'])
    expect(o.categories.map((c) => c.label)).toEqual(['Beverages', 'Beverages >> b1'])
  })

  it('reads what the form has pre-selected', () => {
    expect(o.defaults).toMatchObject({ statut: '1', country_id: '239', fk_default_warehouse: '-1', price_base_type: 'TTC', tva_tx: '16 (A)', fk_barcode_type: '6', weight_units: '0', accountancy_code_sell: '5017', asycuda_type: '0', prod_type: '0' })
  })
})

describe('pickUnitByCode', () => {
  const units = [
    { value: '1 (4B)', label: 'Pair (4B)' },
    { value: '42 (U)', label: 'Pieces/item [Number] (U)' },
  ]
  it('matches the code in brackets, ignoring case', () => {
    expect(pickUnitByCode(units, 'u', '')).toBe('42 (U)')
  })
  it('falls back to the backend value only when it is a real option', () => {
    expect(pickUnitByCode(units, 'XX', '1 (4B)')).toBe('1 (4B)')
    expect(pickUnitByCode(units, 'XX', ' ()')).toBe('')
  })
})
