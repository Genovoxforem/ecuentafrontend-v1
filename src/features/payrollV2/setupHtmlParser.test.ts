import { describe, expect, it } from 'vitest'
import { parseCountries, parseDevices, parseLeaveTypes, parseSetupFields, parseTaxBands, parseTaxYears } from './setupHtmlParser'

const doc = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Markup copied from custom/payroll_v2/admin/setup.php on 172.16.5.10 (2026-10-07).
describe('setup.php parsers', () => {
  it('reads the constant controls of a settings tab', () => {
    const page = doc(`<form method="POST"><input type="hidden" name="action" value="update">
      <select name="payroll_v2_calc_from" class="form-select"><option value="basic">Basic Salary</option><option value="gross" selected>Gross Salary</option></select>
      <input type="text" name="payroll_v2_fiscal_year_start" value="1" class="form-control">
      <div class="checkbox"><label><input type="checkbox" name="payroll_v2_sod_enabled" value="1" checked></label></div>
      <div class="checkbox"><label><input type="checkbox" name="payroll_v2_2fa_required" value="1"></label></div>
      <input type="password" name="payroll_v2_twilio_token" value="secret" class="form-control"></form>`)
    const fields = parseSetupFields(page, [
      { key: 'PAYROLL_V2_CALC_FROM', label: 'Deduction basis' },
      { key: 'PAYROLL_V2_FISCAL_YEAR_START', label: 'Fiscal year start' },
      { key: 'PAYROLL_V2_SOD_ENABLED', label: 'SoD' },
      { key: 'PAYROLL_V2_2FA_REQUIRED', label: 'OTP' },
      { key: 'PAYROLL_V2_TWILIO_TOKEN', label: 'Token' },
    ])
    expect(fields.map((f) => [f.type, f.value])).toEqual([
      ['select', 'gross'],
      ['text', '1'],
      ['checkbox', '1'],
      ['checkbox', '0'],
      ['password', 'secret'],
    ])
    expect(fields[0].options).toEqual([
      { value: 'basic', label: 'Basic Salary' },
      { value: 'gross', label: 'Gross Salary' },
    ])
  })

  it('reads leave types and the country list', () => {
    const page = doc(`<select name="country_id"><option value="">-- Select Country --</option><option value="117">India</option></select>
      <table class="table table-bordered"><tr class="liste_titre"><th>ID</th><th>Code</th><th>Label</th><th>Affected By</th><th>Delay (Days)</th><th>New Per Month</th><th>Country</th><th>Active</th><th>Actions</th></tr>
      <tr class="oddeven"><td>4</td><td>LEAVE_RTT_FR</td><td>RTT</td><td>12</td><td>1</td><td>0.83000</td><td>India</td><td>Yes</td><td><a href="?tab=leave_types&action=delete_leave_type&id=4" class="button">Delete</a></td></tr>
      <tr class="oddeven"><td>9</td><td>LEAVE_X</td><td>Old</td><td></td><td>0</td><td>0.00000</td><td></td><td>No</td><td></td></tr></table>`)
    expect(parseLeaveTypes(page)).toEqual([
      { id: '4', code: 'LEAVE_RTT_FR', label: 'RTT', affect: '12', delay: '1', newByMonth: '0.83000', country: 'India', active: true },
      { id: '9', code: 'LEAVE_X', label: 'Old', affect: '', delay: '0', newByMonth: '0.00000', country: '', active: false },
    ])
    expect(parseCountries(page)).toEqual([{ id: '117', label: 'India' }])
  })

  it('reads tax bands, ignoring the "none configured" row', () => {
    const empty = doc(`<table class="table table-bordered"><tr class="liste_titre"><th>ID</th><th>Tax Year</th></tr><tr class="oddeven"><td colspan="7" class="center">No tax bands configured for 2026.</td></tr></table>`)
    expect(parseTaxBands(empty)).toEqual([])
    const page = doc(`<select name="filter_year"><option value="2025">2025</option><option value="2026" selected>2026</option></select>
      <table class="table table-bordered"><tr class="liste_titre"><th>ID</th><th>Tax Year</th></tr><tr class="oddeven"><td>3</td><td>2026</td><td>5,100.00</td><td>Unlimited</td><td>37.00%</td><td>Active</td><td></td></tr></table>`)
    expect(parseTaxBands(page)).toEqual([{ id: '3', taxYear: '2026', from: '5,100.00', to: 'Unlimited', rate: '37.00', active: true }])
    expect(parseTaxYears(page)).toEqual(['2025', '2026'])
  })

  it('reads devices', () => {
    const page = doc(`<table class="table table-bordered"><thead><tr class="liste_titre"><th>Device ID</th><th>Device Serial No</th></tr></thead><tbody>
      <tr class="oddeven"><td>1</td><td>OIN7010056122101930</td><td>192.168.1.245</td><td>80</td><td>Active</td><td>ioioi</td><td>Master entity</td><td><span style="color:#ef4444;">&#128308; Offline</span></td><td><strong>42 days ago</strong><br><small style="color:#666;">2026-08-25 15:12:09</small></td><td></td></tr>
      <tr class="oddeven"><td>2</td><td>TESTSN</td><td>::1</td><td>80</td><td>Active</td><td>ZKteco</td><td>0</td><td><span style="color:#999;">&#9940; Never</span></td><td>-</td><td></td></tr></tbody></table>`)
    expect(parseDevices(page)).toEqual([
      { id: '1', serial: 'OIN7010056122101930', ip: '192.168.1.245', port: '80', connection: 'Active', brand: 'ioioi', entity: 'Master entity', liveStatus: 'Offline', lastSeen: '42 days ago · 2026-08-25 15:12:09' },
      { id: '2', serial: 'TESTSN', ip: '::1', port: '80', connection: 'Active', brand: 'ZKteco', entity: '0', liveStatus: 'Never', lastSeen: '-' },
    ])
  })
})
