// accountancy/admin/subaccount.php — the real, read-only union of customer/
// supplier/employee subsidiary-ledger accounts. Confirmed live against
// 172.16.5.10: each row is genuinely actionable (Reconcilable is a real
// already-tokened GET toggle link, same enable/disable convention as
// dolibarrDictParser.ts's dictionary pages; Action is a real edit-pencil
// link out to the underlying third-party's own card.php#edit — creation/
// editing of the account itself happens there, never on this page, per its
// own on-page warning banner). No JSON API.

export interface SubaccountRow {
  accountNumber: string
  label: string
  type: string
  // Real third-party/user id parsed out of the row's own edit link
  // (societe/card.php?...&socid=N) — lets the Action column route to this
  // app's own native, editable third-party page (CustomerDetail.tsx, real
  // JSON API at societe/api/societe.php?id=N, works for any third party
  // regardless of customer/supplier/employee flag) instead of linking out
  // to the legacy page.
  socid: string | null
  reconcilable: boolean
  toggleUrl: string | null
}

function text(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function parseSubaccounts(doc: Document): SubaccountRow[] {
  const rows = Array.from(doc.querySelectorAll('tr.oddeven'))
  return rows
    .map((tr) => {
      const tds = tr.querySelectorAll('td')
      if (tds.length < 5) return null
      const typeLink = tds[2].querySelector('a')
      const toggleLink = tds[3].querySelector('a')
      const toggleSpan = tds[3].querySelector('span')
      const editLink = tds[4].querySelector('a')
      const editHref = editLink?.getAttribute('href') ?? ''
      // Confirmed live this drifted between fetches on the same backend —
      // one sample used data-geo="Enabled"/"Disabled" on this span, a later
      // one used title="Enabled"/"Disabled" instead (same span, no other
      // change). Checking both keeps this correct either way instead of
      // silently reading every row as disabled when the backend happens to
      // render the title-attribute variant.
      const toggleState = toggleSpan?.getAttribute('data-geo') ?? toggleSpan?.getAttribute('title') ?? ''
      return {
        accountNumber: text(tds[0]),
        label: text(tds[1]),
        type: text(typeLink),
        socid: editHref.match(/[?&]socid=(\d+)/)?.[1] ?? null,
        reconcilable: toggleState === 'Enabled',
        toggleUrl: toggleLink?.getAttribute('href') ?? null,
      }
    })
    .filter((r): r is SubaccountRow => r !== null && Boolean(r.accountNumber))
}
