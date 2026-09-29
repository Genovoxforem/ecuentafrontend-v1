import { describe, expect, it } from 'vitest'
import { readLegacyForm } from './legacyForm'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Trimmed from the real accountancy/admin/export.php and closure.php responses.
const EXPORT =
  '<form action="/accountancy/admin/export.php" method="post"><input type="hidden" name="token" value="tokX"><input type="hidden" name="action" value="update">' +
  '<div class="row"><div class="col-12"><div class="form-separator"><hr><span class="form-separator__label">Options</span></div></div>' +
  '<div class="col-md-6 col-xl-4"><label class="form-label ">Specify the prefix for the file name</label><input type="text" name="ACCOUNTING_EXPORT_PREFIX_SPEC" value=""></div>' +
  '<div class="col-12"><div class="form-separator"><hr><span class="form-separator__label">Model of export</span></div></div>' +
  '<div class="col-md-6 col-xl-4"><label class="form-label">Select a model of export</label><select name="ACCOUNTING_EXPORT_MODELCSV"><option value="1" selected="">Export CSV Configurable</option><option value="10">Export for Agiris</option></select></div>' +
  '<div class="col-md-6 col-xl-4"><label class="form-label fieldrequired">Column separator for export file</label><input type="text" name="ACCOUNTING_EXPORT_SEPARATORCSV" value=","></div>' +
  '<div><input type="submit" class="button" value="Modify" name="button"></div></div></form>'

const CLOSURE =
  '<div class="alert alert-info mt-3">This page can be used to set parameters used for accounting closures.</div>' +
  '<form action="/accountancy/admin/closure.php" method="post"><input type="hidden" name="token" value="tokC"><input type="hidden" name="action" value="update">' +
  '<div class="col-md-6"><label class="form-label"><span>Result accounting account (Profit)</span><span class="classfortooltip" title="help"></span></label><select name="ACCOUNTING_RESULT_PROFIT"><option value="&nbsp;">&nbsp;</option><option value="1">1 - ASSETS</option></select></div>' +
  '<input type="submit" class="button" value="Modify" name="button"></form>'

describe('readLegacyForm layout', () => {
  it('reads the sections, the label the page prints for each field, and the submit name', () => {
    const data = readLegacyForm(parse(EXPORT), 'ACCOUNTING_EXPORT_MODELCSV')
    expect(data.layout).toEqual([
      { kind: 'separator', label: 'Options' },
      { kind: 'field', name: 'ACCOUNTING_EXPORT_PREFIX_SPEC', label: 'Specify the prefix for the file name', required: false },
      { kind: 'separator', label: 'Model of export' },
      { kind: 'field', name: 'ACCOUNTING_EXPORT_MODELCSV', label: 'Select a model of export', required: false },
      { kind: 'field', name: 'ACCOUNTING_EXPORT_SEPARATORCSV', label: 'Column separator for export file', required: true },
    ])
    expect(data.submitLabel).toBe('Modify')
    expect(data.intro).toBe('')
    expect(data.hidden).toMatchObject({ token: 'tokX', action: 'update' })
    expect(data.fields.ACCOUNTING_EXPORT_MODELCSV.value).toBe('1')
  })

  it('reads the intro note and a label that carries a tooltip', () => {
    const data = readLegacyForm(parse(CLOSURE), 'ACCOUNTING_RESULT_PROFIT')
    expect(data.intro).toBe('This page can be used to set parameters used for accounting closures.')
    expect(data.layout).toEqual([{ kind: 'field', name: 'ACCOUNTING_RESULT_PROFIT', label: 'Result accounting account (Profit)', required: false }])
  })
})
