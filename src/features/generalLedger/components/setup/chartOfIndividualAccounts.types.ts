// Chart of individual accounts (classic accountancy/admin/subaccount.php): the customer, supplier and employee
// subsidiary-ledger accounts. Filled from accountancy/fapi/subaccounts.php (subaccountsFapi.ts). The account itself
// is edited on the third party's own page, not here.

export interface SubaccountRow {
  accountNumber: string
  label: string
  type: string
  // The third party's id (the row's socid) — lets the Action column route to this app's own third-party page
  // (CustomerDetail.tsx, any customer/supplier/employee) instead of linking out to the legacy page.
  socid: string | null
  reconcilable: boolean
  toggleUrl: string | null
}
