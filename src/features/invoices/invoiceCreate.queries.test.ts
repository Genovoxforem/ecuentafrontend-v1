import { describe, expect, it } from 'vitest'
import { classicFormRefusals } from './invoiceCreate.queries'

// Taken from a real POST compta/facture/card.php (action=add, type=6, no LPO No):
// the page re-renders its create form, whose own scripts hold many unrelated
// showToast() calls, and ends with the one message the backend raised.
const OWN_SCRIPT_TOASTS = `<script>
  if (!warehouse) { showToast("Warehouse is required", "error"); }
  if (!label) { showToast("Product label Is Required !", "error"); }
  showToast("Product created and selected! You can now add it to the invoice.", "success");
</script>`

const EVENT_MESSAGE = `<script>
\t\t\t\t\t$(document).ready(function() {
\t\t\t\t\t\tvar block = false
\t\t\t\t\t\tif (block) {
\t\t\t\t\t\t\t$.dolEventValid("","Field \\'LPO No\\' is required");
\t\t\t\t\t\t} else {
\t\t\t\t\t\t\t/* jnotify(message, preset of message type, keepmessage) */
\t\t\t\t\t\t\tshowToast("Field \\'LPO No\\' is required", "error");
\t\t\t\t\t\t}
\t\t\t\t\t});
\t\t\t\t</script>`

describe('classicFormRefusals', () => {
  it('returns only the message the backend raised, not the page scripts’ own toasts', () => {
    expect(classicFormRefusals(`${OWN_SCRIPT_TOASTS}<form></form>${EVENT_MESSAGE}`)).toEqual(["Field 'LPO No' is required"])
  })

  it('returns nothing when the backend raised no error', () => {
    expect(classicFormRefusals(OWN_SCRIPT_TOASTS)).toEqual([])
  })
})
