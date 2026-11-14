// The screens of the Reports Center entries that have no API yet, laid out as the classic pages print them (read from each classic page on
// newecuenta on 10 Nov 2026: the filters it offers and the columns of its table). The data is connected later; until then the screen opens with
// its filters and an empty table. Select options are not listed: the classic pages fill them from the database (they come with the API).

export type ScreenFilterKind = 'range' | 'year' | 'select' | 'text'

export interface ScreenFilter {
  label: string
  kind: ScreenFilterKind
  placeholder?: string
}

export interface ReportScreen {
  filters: ScreenFilter[]
  columns: string[]
  button?: string
}

const range: ScreenFilter = { label: 'Report period', kind: 'range' }
const sel = (label: string, placeholder = 'All'): ScreenFilter => ({ label, kind: 'select', placeholder })
const txt = (label: string): ScreenFilter => ({ label, kind: 'text' })
const party = ['Company', 'Zip Code', 'City', 'Country', 'Amount (excl. tax)', 'Amount (inc. tax)', 'Percentage', 'Other statistics']

export const REPORT_SCREENS: Record<string, ReportScreen> = {
  'list-of-expense-reports': { filters: [], columns: [] },
  'unpaid-customer-list': { filters: [], columns: [] },
  'credit-note-aging-report': { filters: [range], columns: ['Ref.', 'Receipt No', 'Invoice date', 'Age (Days)', 'Third-party', 'Payment Type', 'Payment Terms', 'Amount (inc. tax)', 'Author', 'Currency', 'Status'] },
  'proposal-list': { filters: [range, sel('Sales representative'), sel('User'), sel('Product category'), sel('Customer category')], columns: ['Ref.', 'Third-party', 'Date', 'End date', 'Amount (inc. tax)', 'Author', 'Sales representatives of third party', 'Environment', 'Status'] },
  'combine-commission-report': { filters: [range], columns: ['Entity', 'Sales Amount', 'Expense Amount', 'Profit Amount'] },
  'combine-commission-detailed-report': { filters: [range, sel('Entity'), sel('Payment type')], columns: [] },
  'due-customers': { filters: [range, sel('Third party'), sel('Third-party type'), sel('Customer tags'), sel('User'), sel('Status')], button: 'Refresh', columns: ['Invoice Date', 'Customer Name', 'Number Of Invoices', 'Invoice Amount', 'Balance Due', 'YTD Sales'] },
  'sales-payment': { filters: [sel('Month'), sel('Year')], button: 'Create', columns: [] },
  'profit-per-product': { filters: [sel('Select product')], button: 'View Details', columns: ['Product Name'] },
  'best-selling-products': { filters: [range], columns: ['Product Name', 'Product Id', 'No of Invoice', 'Sold', 'View'] },
  'products-services-by-popularity': { filters: [sel('Mode')], button: 'Refresh', columns: ['Ref.', 'Type', 'Label', 'Qty'] },
  'service-list': { filters: [sel('Category')], columns: ['Ref.', 'Label', 'Barcode', 'Duration', 'Selling price', 'Environment'] },
  'profit-per-service': { filters: [sel('Select service')], button: 'View Details', columns: ['Service Name'] },
  'best-selling-services': { filters: [], columns: ['Service Name', 'Service Id', 'Service Amount', 'No of Invoice', 'Sold', 'Total Sold Price', 'View'] },
  'credit-note-list': { filters: [], columns: ['No', 'Ref', 'Customer', 'Credit Note', 'Invoice Date', 'Credit Note Date', 'Total Amount', 'Refund Amount', 'Balance Amount'] },
  'received-refund-history': { filters: [], columns: ['No', 'Invoice', 'Transaction', 'Customer Name', 'Mode', 'Date', 'Amount', 'Status'] },
  'expenses-by-category': { filters: [range, sel('Select category')], button: 'View Details', columns: ['Category Name'] },
  'expenses-by-employee': { filters: [range, sel('Select category')], button: 'View Details', columns: ['No', 'Ref', 'Date', 'Category', 'Employee', 'Total', 'Approving User'] },
  'invoiced-by-third-parties': { filters: [], columns: party },
  'invoiced-by-internal-user': { filters: [range, sel('Currency')], button: 'View details', columns: ['User', 'Amount (excl. tax)', 'Invoice Count', 'Amount (inc. tax)', 'Conversion Amount', 'Percentage', 'Other statistics'] },
  'by-product-and-service': { filters: [], columns: ['Product', 'Quantity', 'Percentage', 'Amount (excl. tax)', 'Amount (inc. tax)', 'Percentage'] },
  'turnover-invoiced-by-sale-tax-rate': { filters: [], columns: ['Product or Service', 'Country', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Total (excl. tax)'] },
  'purchase-turnover-invoiced': { filters: [], columns: ['Month', 'Amount (Excl. Tax)', 'Amount (Inc. Tax)', 'Delta'] },
  'purchase-turnover-by-vendor': { filters: [], columns: party },
  'profit-and-loss': { filters: [range, { label: 'Financial Year', kind: 'year' }], button: 'View Report', columns: ['Code', 'Particulars', 'Amount', 'Net Amount'] },
  'cash-flow-statement': { filters: [range], columns: [] },
  'horizontal-balance-sheet': { filters: [{ label: 'Financial Year', kind: 'year' }], button: 'View', columns: [] },
  'vertical-balance-sheet': { filters: [{ label: 'Financial Year', kind: 'year' }], button: 'View', columns: [] },
  'trial-balance': { filters: [range, sel('Preset'), txt('Search')], columns: ['Account Code', 'Particulars', 'Opening Balance', 'Period Movement', 'Closing Balance'] },
  'income-statement': { filters: [range], columns: [] },
  'trading-account': { filters: [range], columns: [] },
  'income-expenditure-statement': { filters: [range], columns: ['Code', 'Income', 'Amount', 'Net Amount'] },
  'recurring-invoice-details': { filters: [txt('Ref.'), txt('Third-party'), txt('Amount (excl. tax)'), txt('Amount (inc. tax)'), sel('Recurring'), txt('Frequency')], button: 'Search', columns: ['Ref.', 'Third-party', 'Amount (excl. tax)', 'VAT', 'Amount (inc. tax)', 'Recurring', 'Frequency', 'Number of generation done', 'Date latest gen.', 'Date next gen.', 'Status', 'Events'] },
  'stock-movement': { filters: [range], button: 'Refresh', columns: ['Ref.', 'Date', 'Product ref.', 'Product label', 'Lot/Serial', 'Warehouse', 'Inv./Mov. code', 'Label of movement', 'Type of movement', 'Origin', 'Qty', 'Environment'] },
  'warehouse-summary': { filters: [range, sel('Warehouse category')], columns: ['Ref.', 'Short name location', 'Value for sell'] },
  'stock-at-date': { filters: [range, sel('Product'), sel('Warehouse')], button: 'Refresh', columns: ['Product ref.', 'Label', 'Stocks at date', 'Input stock value', 'Value for sell', 'Current stock'] },
  'stocks-by-lot-serial': { filters: [sel('Product'), sel('Warehouse'), txt('Batch'), txt('Sell by from'), txt('Sell by to'), txt('Eat by from'), txt('Eat by to')], columns: ['Product Name', 'Warehouse', 'Number of units', 'Weighted average price', 'Input stock value', 'Selling Unit Price', 'Value for sell'] },
  'non-movement-stock': { filters: [range, sel('Type')], button: 'Refresh', columns: ['Ref.', 'Type', 'Label', 'Qty'] },
  'terminal-wise-stock': { filters: [range, sel('Warehouses'), sel('Terminals'), sel('Product scope')], button: 'Apply', columns: ['Product', 'Warehouse', 'Terminal', 'Opening Stock', 'Stock In', 'Stock Out', 'POS Sales', 'Closing / Balance'] },
  'direct-debit-order-report': { filters: [], columns: ['Withdrawals Receipts', 'Date', 'Amount', 'Status'] },
  'tax-accounts': { filters: [], columns: ['Country', 'Code', 'Rate', 'Include tax 2', 'Rate 2', 'Include tax 3', 'Rate 3', 'NPR', 'Sale account. code', 'Purchase account. code', 'Note'] },
}
