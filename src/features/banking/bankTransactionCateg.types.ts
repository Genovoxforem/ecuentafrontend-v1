// Bank *transaction* tags (llx_bank_categ, classic compta/bank/categ.php), distinct from the account-level
// Categories page (BankAccountCategoriesList.tsx). Read and written through compta/bank/fapi/categories.php
// (bankingFapi.ts).
export interface BankTransactionCategoryRow {
  id: number
  label: string
}

export interface BankTransactionCategoryList {
  token: string
  rows: BankTransactionCategoryRow[]
}
