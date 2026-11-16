// Types of the defaultAccounts page. The HTML parser that used to sit next to them was removed on 12 Nov 2026: the page reads its JSON endpoint now.

// Parses accountancy/admin/defaultaccounts.php (General Ledger > Setup > Default accounts),
// per the page's own PHP:
//   - one <form> with hidden `token` and `action=update`, holding a table of section rows
//     (`ThirdParties | Users`, `Product`, `Service`, `Others`, `Loan Management`: two cells, no
//     select) and field rows (label cell + a select named after the accounting constant);
//   - the first three fields' label cell has class `fieldrequired`;
//   - every select lists the whole chart of accounts (value = account number, text
//     "1087 - Accounts receivable") and has the stored account selected;
//   - which fields exist depends on the enabled modules, so the list comes from the page;
//   - saving sets EVERY listed constant from the POST, blank when missing, so a save must post
//     all fields with their current values.

export interface DefaultAccountOption {
  value: string
  label: string
}
export interface DefaultAccountField {
  name: string
  label: string
  required: boolean
  value: string
  // Only set when this field's list differs from the shared one.
  options?: DefaultAccountOption[]
}
export interface DefaultAccountSection {
  title: string
  fields: DefaultAccountField[]
}
export interface DefaultAccountsPage {
  token: string
  intro: string
  sections: DefaultAccountSection[]
  options: DefaultAccountOption[]
}
