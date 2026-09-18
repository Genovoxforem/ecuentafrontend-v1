// compta/bank/categ.php — manages llx_bank_categ (bank *transaction* tags,
// distinct from the account-level Categories page — see
// BankAccountCategoriesList.tsx). No JSON API (confirmed live), but a
// genuine classic form-POST list: an inline "Add" row, edit-in-place (a GET
// to ?categid=N&action=edit re-renders that one row as an editable input),
// and delete (a plain GET link). All three wired for real in
// banking.queries.ts — see useBankTransactionCategories/
// useAddBankTransactionCategory/useUpdateBankTransactionCategory/
// useDeleteBankTransactionCategory.
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export interface BankTransactionCategoryRow {
  id: number
  label: string
}

export interface BankTransactionCategoryList {
  token: string
  rows: BankTransactionCategoryRow[]
}

export function parseBankTransactionCategListPage(html: string): BankTransactionCategoryList {
  const formStart = html.indexOf('action="/compta/bank/categ.php"')
  const formEnd = html.indexOf('</form>', formStart)
  const form = formStart >= 0 ? html.slice(formStart, formEnd > -1 ? formEnd : undefined) : html

  const tokenMatch = form.match(/name="token"\s+value="([a-f0-9]+)"/)
  if (!tokenMatch) throw new Error('Could not find a CSRF token on the legacy page.')

  const rows: BankTransactionCategoryRow[] = []
  // Real row shape (confirmed live): <tr class="oddeven"><td>1</td><td>ii</td>
  // <td></td><td><a ...action=edit...></a><a ...action=delete...></a></td></tr>
  // — the id/ref cell doubles as the real categid, so it's read straight off
  // that cell rather than the edit/delete links (simpler, and works even if
  // a future row ever lacked those actions).
  const rowRe = /<tr class="oddeven"><td>(\d+)<\/td><td>([\s\S]*?)<\/td>/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(form))) {
    rows.push({ id: Number(m[1]), label: stripTags(m[2]) })
  }

  return { token: tokenMatch[1], rows }
}

// The single-row edit-mode fetch (?categid=N&action=edit) re-renders the
// whole list with just that row swapped for an editable input — this pulls
// only the fresh token out of it (parseBankTransactionCategListPage's own
// row regex doesn't match the edit row's different shape, which is fine
// since useUpdateBankTransactionCategory only needs the token here).
export function parseBankTransactionCategToken(html: string): string {
  const tokenMatch = html.match(/name="token"\s+value="([a-f0-9]+)"/)
  if (!tokenMatch) throw new Error('Could not find a CSRF token on the legacy page.')
  return tokenMatch[1]
}
