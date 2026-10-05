import { describe, expect, it } from 'vitest'
import { parsePurchaseOrderCard } from './purchaseOrderCardParser'

// The header block of the real fourn/commande/card.php (tooltips shortened).
const header = (href: string) => `
<div class="arearef"><div class="refidno-sub"><h3 class="mb-0">PO2609-0001</h3><label class="form-label ">Ref. vendor</label> : <br>Third-party :
<a href="${href}" data-geo="tip" class="classforajaxtooltip refurl valignmiddle"><div class="avatar-circle" style="background-color: #28a745">WA</div>walkingvendor</a>
 ( <a href="/fourn/commande/list.php?socid=1">Other orders</a> )</div></div>
<span class="badge badge-status1 badge-status">Approved</span>`

describe('parsePurchaseOrderCard', () => {
  it('reads the vendor from the societe/card.php link of the current backend', () => {
    const card = parsePurchaseOrderCard(header('/societe/card.php?socid=1'), 1)
    expect(card.ref).toBe('PO2609-0001')
    expect(card.thirdPartyName).toBe('walkingvendor')
    expect(card.socid).toBe(1)
    expect(card.statusCode).toBe(2)
  })

  it('still reads the older fourn/card.php link', () => {
    const card = parsePurchaseOrderCard(header('/fourn/card.php?socid=4'), 1)
    expect(card.thirdPartyName).toBe('walkingvendor')
    expect(card.socid).toBe(4)
  })
})
