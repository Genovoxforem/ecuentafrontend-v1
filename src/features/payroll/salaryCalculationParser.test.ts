import { describe, expect, it } from 'vitest'
import { parseSalaryCalculation } from './salaryCalculationParser'

// Both fragments are real loadcalculation.php responses (whitespace trimmed).
const WITH_CONTRIBUTIONS =
  '<div class="panel panel-custom"><div class="panel-body h-100"><div class="row">' +
  '<div style="Color:green"> * Salary Allocation is Successful</div><script> $("#paybutton").show();</script>' +
  '<input type="hidden" id="ded_tax_count" value="2">' +
  '<div class="col-6 hideforPayetax">Napsa 1 % (employee)</div>' +
  '<input type="hidden" name="tax_prec[]" id="tax_prec1" value="1"><input type="hidden" name="tax_type[]" id="tax_type1" value="1"><input type="hidden" name="dedu_id[]" value="1">' +
  '<div class="col-6 text-end hideforPayetax"><input type="text" name="tax_ded[]" value="30.00" id="tax_ded1" readonly></div>' +
  '<div class="col-6 hideforPayetax">Nhima 5 % (employee)</div>' +
  '<input type="hidden" name="tax_prec[]" id="tax_prec2" value="5"><input type="hidden" name="tax_type[]" id="tax_type2" value="2"><input type="hidden" name="dedu_id[]" value="2">' +
  '<div class="col-6 text-end hideforPayetax"><input type="text" name="tax_ded[]" value="250.00" id="tax_ded2" readonly></div>' +
  '<div class="col-6">Total Contributions</div><div class="col-6 text-end"><input type="text" value="280.00" id="total_contri" readonly></div>' +
  '<div class="col-6 hideforPayetax">Paye Tax</div><div class="col-6 text-end hideforPayetax"><input type="text" value="0.00" name="paye_deduction" id="payetax" readonly></div>' +
  '<div class="col-6">Total Deductions</div><div class="col-6 text-end"><input type="text" name="sum_deduc" id="sum_deduc_amount" value="280.00" readonly></div>' +
  '<input type="hidden" name="sum_gross" id="sum_gross"><div class="col-6 text-end"><input type="text" value="4,720.00" name="sum_nett" id="sum_net" value="0" readonly></div>' +
  '</div></div></div>'

const UNBALANCED =
  '<div class="panel"><div class="row"><div style="Color:red"> * Adjust The Payment To Equilize Gross Pay, Pending Amount 1,000.00&nbsp;&nbsp;ZMW</div>' +
  '<script> $("#paybutton").hide();</script><input type="hidden" id="ded_tax_count" value="0">' +
  '<input type="text" value="0.00" id="total_contri" readonly><input type="text" value="0.00" name="paye_deduction" id="payetax" readonly>' +
  '<input type="text" name="sum_deduc" id="sum_deduc_amount" value="0.00" readonly><input type="hidden" name="sum_gross" id="sum_gross">' +
  '<input type="text" value="5,000.00" name="sum_nett" id="sum_net" value="0" readonly></div></div>'

describe('parseSalaryCalculation', () => {
  it('reads the backend contribution rows, totals and the fields Save must send', () => {
    const c = parseSalaryCalculation(WITH_CONTRIBUTIONS)
    expect(c.balanced).toBe(true)
    expect(c.message).toBe('Salary Allocation is Successful')
    expect(c.contributions).toEqual([
      { label: 'Napsa 1 % (employee)', amount: '30.00' },
      { label: 'Nhima 5 % (employee)', amount: '250.00' },
    ])
    expect(c).toMatchObject({ totalContributions: '280.00', payeTax: '0.00', totalDeductions: '280.00', netSalary: '4,720.00' })
    expect(c.saveFields).toEqual([
      ['tax_prec[]', '1'],
      ['tax_type[]', '1'],
      ['dedu_id[]', '1'],
      ['tax_ded[]', '30.00'],
      ['tax_prec[]', '5'],
      ['tax_type[]', '2'],
      ['dedu_id[]', '2'],
      ['tax_ded[]', '250.00'],
      ['paye_deduction', '0.00'],
      ['sum_deduc', '280.00'],
      ['sum_gross', ''],
      ['sum_nett', '4,720.00'],
    ])
  })

  it('reports an unbalanced allocation with the backend\'s own wording and no contributions', () => {
    const c = parseSalaryCalculation(UNBALANCED)
    expect(c.balanced).toBe(false)
    expect(c.message).toBe('Adjust The Payment To Equilize Gross Pay, Pending Amount 1,000.00 ZMW')
    expect(c.contributions).toEqual([])
    expect(c.netSalary).toBe('5,000.00')
  })

  it('refuses a response that is not the calculation panel', () => {
    expect(() => parseSalaryCalculation('<div>Access denied</div>')).toThrow(/not recognised/)
  })
})
