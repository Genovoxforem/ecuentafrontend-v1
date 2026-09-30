import { describe, expect, it } from 'vitest'
import { parseExpenseCard } from './expenseCardParser'

// The backend prints PHP warnings inside the Linked To card (`$advanceEmpId` is used before it is set).
const WARNING = `<br />\n<font size='1'><table class='xdebug-error xe-warning' dir='ltr' border='1' cellspacing='0' cellpadding='1'>\n<tr><th align='left' bgcolor='#f57900' colspan="5"><span>( ! )</span> Warning: Undefined variable $advanceEmpId in expense\\card.php on line <i>688</i></th></tr>\n<tr><td>1</td></tr></table></font>`

const AVATAR = (name: string, initials: string) =>
  `<img src="/viewimage.php?modulepart=userphoto&file=${name}.jpg" alt="${initials}" style="width:46px;height:46px;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="expense-avatar-initials" style="display:none;">${initials}</div>`

const LINE = (id: number, extra = '') =>
  `<tr class="expense-line-row" data-line-id="${id}"><td class="cell-type"><div class="cell-type-label" style="font-size:.85rem;font-weight:500;">Wilfred</div><div class="cell-type-subtitle" style="font-size:.73rem;color:#6c757d;">09/22/2026 &bull; VAT 16.000% &bull; Bank Charges</div></td><td class="cell-product">-</td><td class="cell-project proj-label">—</td><td class="cell-description"><span>Taxi to site</span></td><td class="cell-unit text-end">21.55172414</td><td class="cell-qty text-center">1</td><td class="cell-total text-end fw-semibold">25.00</td><td class="cell-receipt text-center align-middle">${extra || '<span class="text-muted">—</span>'}</td></tr>`

const page = (opts: { status?: string; buttons?: string; linked?: string; timeline?: string; validator?: string; approved?: string; notes?: string; paid?: boolean; lines?: string }) => `
<div class="ecnta-new-product-info"><div class="ecnta-new-product-info-content"><div id="tab-content-area"></div>
<div class="d-flex flex-wrap align-items-start justify-content-between mb-2 gap-2 px-1"><div>
  <div class="d-flex align-items-center gap-2 flex-wrap mb-1"><span class="fw-bold fs-6"><i class="fas fa-wallet me-1 text-primary"></i>ER-0005</span><span class="badge bg-info text-dark">${opts.status ?? 'Draft'}</span></div>
  <div class="text-muted" style="font-size:.8rem;">Voxforem Admin &bull; 09/22/2026 – 09/22/2026 &bull; <span class="text-info"><i class="fas fa-user me-1"></i>Geno browin</span></div></div>
  <div class="d-flex gap-3 small align-items-center"><span class="text-muted">HT: <strong>21.55</strong></span> <span class="text-muted">VAT: <strong>3.45</strong></span> <span style="color:#397db9;font-weight:700;">TTC: 25.00</span></div></div>
<div class="row g-3"><div class="col-lg-8">
  <div class="ec-card mb-3"><div class="ec-card-header"><h6>Expense Details</h6></div><div class="card-body p-0"><table class="table ec-line-table mb-0"><tbody>${opts.lines ?? LINE(5)}</tbody></table>
    <table><tr><td>Subtotal:</td><td id="detail-total-ht">21.55</td></tr><tr><td>Tax (VAT):</td><td id="detail-total-vat">3.45</td></tr><tr><td>Total:</td><td id="detail-total-ttc">25.00</td></tr></table></div></div>
  <div class="tabsAction">${opts.buttons ?? ''}</div>
  <div class="card"><div class="card-header"><h6 class="card-title mb-0">Activity</h6></div><div class="card-body">${opts.timeline ?? ''}</div></div>
</div><div class="col-lg-4">
  <div class="card mb-3"><div class="card-header"><h6 class="card-title mb-0">Created By</h6></div><div class="ec-sidebar-section"><div class="d-flex align-items-center gap-3">${AVATAR('fin512', 'VA')}<div><div style="font-weight:600;font-size:.88rem;">Voxforem Admin</div><div style="font-size:.76rem;color:#6c757d;">ID #1</div></div></div></div></div>
  <div class="ec-card mb-3"><div class="ec-card-header"><h6>Linked To</h6></div>${opts.linked ?? ''}${WARNING}</div>
  <div class="card mb-3"><div class="card-header"><h6 class="card-title mb-0">Period</h6></div><div class="ec-sidebar-section"><div class="row g-2"><div class="col-6"><div class="ec-info-label">Start</div><div class="ec-info-value">09/22/2026</div></div><div class="col-6"><div class="ec-info-label">End</div><div class="ec-info-value">09/22/2026</div></div></div></div></div>
  ${opts.validator ?? ''}
  <div class="ec-card mb-3"><div class="ec-card-header"><h6>Approved By</h6></div><div class="ec-sidebar-section">${opts.approved ?? '<div style="font-size:.82rem;color:#6c757d;"><i class="fas fa-clock me-1"></i>Not approved</div>'}</div></div>
  <div class="card mb-3"><div class="card-header"><h6 class="card-title mb-0">Payment Summary</h6></div><div class="ec-sidebar-section">
    <div class="d-flex justify-content-between mb-2"><span class="ec-info-label">Status</span><span class="badge bg-info">${opts.status ?? 'Draft'}</span></div>
    <div class="d-flex justify-content-between mb-2"><span class="ec-info-label">Payment</span><span class="badge bg-warning text-dark">${opts.paid ? 'Paid' : 'Unpaid'}</span></div>
    <div class="d-flex justify-content-between mb-1"><span class="ec-info-label">Amount HT</span><span class="ec-info-value">21.55</span></div>
    <div class="d-flex justify-content-between mb-1"><span class="ec-info-label">VAT</span><span class="ec-info-value">3.45</span></div>
    <div class="d-flex justify-content-between pt-2 border-top"><span style="font-weight:700;">Total TTC</span><span style="font-weight:700;">25.00</span></div></div></div>
  ${opts.notes ?? ''}
</div></div></div></div>
<select name="clone_fk_user_author"><option value="-1">Select a users</option><option value="4">Bar worker (Lusaka)</option><option value="1" selected>Voxforem Admin (All entities)</option></select>
<table><tr><td id="netPayableCell">1,234.50</td></tr></table>`

const CUSTOMER = `<div class="ec-sidebar-section"><div class="ec-info-label mb-1">Customer</div><div style="font-weight:600;font-size:.86rem;">Wilfred</div><div style="font-size:.76rem;color:#6c757d;">Copperbelt</div><div style="font-size:.76rem;color:#6c757d;"><i class="fas fa-envelope me-1"></i>wilfred@abc.com</div></div>`
const EMPLOYEE = `<div class="ec-sidebar-section"><div class="ec-info-label mb-1">Employee</div><div class="d-flex align-items-center gap-3">${AVATAR('geno', 'GB')}<div><div style="font-weight:600;font-size:.88rem;">Geno browin</div><div style="font-size:.76rem;color:#6c757d;">ID #16</div></div></div><div class="mt-2" style="font-size:.76rem;color:#6c757d;"><i class="fas fa-envelope me-1"></i>genobrowin@gmail.com</div></div>`

const btn = (icon: string, label: string, extra = '') => `<a class="butAction" href="#" ${extra}><i class="fas ${icon} me-1"></i>${label}</a>`
const confirm = (icon: string, label: string, action: string) => btn(icon, label, `data-bs-toggle="modal" data-bs-target="#ecConfirmModal" data-action="${action}"`)

const EVENT = (label: string, date: string, user: string, color: string, last: boolean) =>
  `<div class="d-flex gap-3 ${last ? '' : 'mb-3'}"><div class="d-flex flex-column align-items-center" style="min-width:18px;"><div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;margin-top:.25rem;"></div></div><div class="flex-grow-1"><div style="font-size:.85rem;font-weight:600;">${label}</div><div style="font-size:.76rem;color:#6c757d;">${date}</div><div style="font-size:.76rem;color:#397db9;">by ${user}</div></div></div>`

describe('parseExpenseCard', () => {
  it('reads the banner, lines and totals, ignoring the PHP warning printed inside the Linked To card', () => {
    const c = parseExpenseCard(page({ linked: CUSTOMER }))
    expect(c).not.toBeNull()
    expect(c).toMatchObject({
      ref: 'ER-0005',
      status: 'Draft',
      author: 'Voxforem Admin',
      period: '09/22/2026 – 09/22/2026',
      totals: { ht: '21.55', vat: '3.45', ttc: '25.00' },
      subtotal: '21.55',
      tax: '3.45',
      total: '25.00',
    })
    expect(c?.linked).toEqual([{ kind: 'employee', name: 'Geno browin' }])
    expect(c?.lines).toEqual([
      {
        id: '5',
        label: 'Wilfred',
        subtitle: '09/22/2026 • VAT 16.000% • Bank Charges',
        product: '-',
        project: '—',
        description: 'Taxi to site',
        unit: '21.55172414',
        qty: '1',
        total: '25.00',
        receipt: null,
      },
    ])
    expect(c?.linkedTo).toEqual([{ label: 'Customer', name: 'Wilfred', photo: '', details: ['Copperbelt', 'wilfred@abc.com'] }])
  })

  it('reads a receipt link as a preview and a download address', () => {
    const receipt = `<a href="javascript:void(0)" onclick="previewReceiptUrl('/document.php?modulepart=expensereport&file=ER-5%2Fbill.pdf&attachment=0', 'bill.pdf', '/document.php?modulepart=expensereport&file=ER-5%2Fbill.pdf&attachment=1')" title="bill.pdf"><i class="fas fa-paperclip"></i></a>`
    const c = parseExpenseCard(page({ lines: LINE(5, receipt) }))
    expect(c?.lines[0].receipt).toEqual({
      name: 'bill.pdf',
      previewUrl: '/document.php?modulepart=expensereport&file=ER-5%2Fbill.pdf&attachment=0',
      downloadUrl: '/document.php?modulepart=expensereport&file=ER-5%2Fbill.pdf&attachment=1',
    })
  })

  it('lists the actions the button bar offers, in its order', () => {
    const buttons = [
      btn('fa-envelope', 'Send Email'),
      btn('fa-print', 'Print'),
      btn('fa-pen', 'Modify'),
      confirm('fa-rotate-left', 'Back to Draft', 'confirm_setdraft'),
      confirm('fa-check', 'Approve', 'confirm_approve'),
      confirm('fa-times', 'Deny', 'confirm_refuse'),
      confirm('fa-ban', 'Cancel', 'confirm_cancel'),
      btn('fa-money-bill', 'Record Payment', 'data-bs-toggle="modal" data-bs-target="#ecPaymentModal"'),
      confirm('fa-money-bill', 'Mark Paid', 'confirm_set_paid'),
      btn('fa-clone', 'Clone', 'data-bs-toggle="modal" data-bs-target="#ecCloneModal"'),
      `<a class="butActionDelete" href="#" data-action="confirm_delete"><i class="fas fa-trash me-1"></i>Delete</a>`,
    ].join('')
    expect(parseExpenseCard(page({ buttons }))?.actions).toEqual(['sendEmail', 'print', 'modify', 'setDraft', 'approve', 'deny', 'cancel', 'recordPayment', 'markPaid', 'clone', 'delete'])
    expect(parseExpenseCard(page({ buttons: btn('fa-print', 'Print') + confirm('fa-paper-plane', 'Validate &amp; Submit', 'confirm_validate') }))?.actions).toEqual(['print', 'validate'])
  })

  it('reads the activity timeline, the people cards and the payment numbers', () => {
    const timeline = EVENT('Expense created', '09/01/2026 10:11 AM', 'Voxforem Admin', '#f04438', false) + EVENT('Approved', '09/02/2026 09:00 AM', 'Geno browin', '#12b76a', true)
    const validator = `<div class="card mb-3"><div class="card-header"><h6 class="card-title mb-0">Validator</h6></div><div class="ec-sidebar-section"><div class="d-flex">${AVATAR('fin512', 'VA')}<div><div style="font-weight:600;font-size:.85rem;">Voxforem Admin</div><div style="font-size:.74rem;color:#6c757d;">vox_admin</div></div></div></div></div>`
    const approved = `<div class="d-flex">${AVATAR('geno', 'GB')}<div><div style="font-weight:600;font-size:.85rem;">Geno browin</div><div style="font-size:.74rem;color:#6c757d;">09/02/2026 09:00 AM</div></div></div>`
    const notes = `<div class="card mb-3"><div class="card-header"><h6 class="card-title mb-0">Notes</h6></div><div class="ec-sidebar-section"><div class="ec-info-label mb-1">Public Note</div><div style="font-size:.82rem;">Paid on site</div></div></div>`
    const c = parseExpenseCard(page({ status: 'Approved', linked: EMPLOYEE, timeline, validator, approved, notes, paid: true }))
    expect(c?.timeline).toEqual([
      { label: 'Expense created', date: '09/01/2026 10:11 AM', user: 'Voxforem Admin', color: '#f04438' },
      { label: 'Approved', date: '09/02/2026 09:00 AM', user: 'Geno browin', color: '#12b76a' },
    ])
    expect(c?.createdBy).toEqual({ name: 'Voxforem Admin', sub: 'ID #1', photo: '/viewimage.php?modulepart=userphoto&file=fin512.jpg' })
    expect(c?.linkedTo[0]).toMatchObject({ label: 'Employee', name: 'Geno browin', details: ['ID #16', 'genobrowin@gmail.com'] })
    expect(c?.dates).toEqual([
      { label: 'Start', value: '09/22/2026' },
      { label: 'End', value: '09/22/2026' },
    ])
    expect(c?.validator).toMatchObject({ name: 'Voxforem Admin', sub: 'vox_admin' })
    expect(c?.approvedBy).toMatchObject({ name: 'Geno browin', sub: '09/02/2026 09:00 AM' })
    expect(c?.payment).toEqual({ status: 'Approved', paid: 'Paid', ht: '21.55', vat: '3.45', ttc: '25.00' })
    expect(c?.notes).toEqual([{ label: 'Public Note', value: 'Paid on site' }])
    expect(c?.netPayable).toBe('1,234.50')
    expect(c?.cloneUsers.find((u) => u.selected)?.value).toBe('1')
  })

  it('has no approver and no validator on a draft', () => {
    const c = parseExpenseCard(page({}))
    expect(c?.approvedBy).toBeNull()
    expect(c?.validator).toBeNull()
    expect(c?.notes).toEqual([])
  })

  it('returns null for the backend\'s own "not found" alert', () => {
    expect(parseExpenseCard('<div class="alert alert-danger">Expense not found</div>')).toBeNull()
  })
})
