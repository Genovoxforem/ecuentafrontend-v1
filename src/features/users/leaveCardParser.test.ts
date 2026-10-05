import { describe, expect, it } from 'vitest'
import { parseLeaveCard } from './leaveCardParser'

// Trimmed from a live holiday/card.php?id=165 response.
const HTML = `<div class="subTitle"><span class="badge badge-status6 badge-status" title="Approved">Approved</span></div>
<div class="fichecenter"><div class="fichehalfleft"><div class="row form-tab my-4"><div class="col-md-10"><div class="row align-items-center ">
<div class="col-md-3">User</div><div class="col-md-3"><a><span class="usertext">Lady gaga</span></a></div>
<div class="col-md-3">Type</div><div class="col-md-3">Paid vacation</div>
<div class="col-md-3">Start date</div><div class="col-md-3">08/21/2026 &nbsp; &nbsp; <span class="opacitymedium">Morning</span></div>
<div class="col-md-3">Description</div><div class="col-md-3"></div>
</div></div></div></div></div>`

describe('parseLeaveCard', () => {
  it('reads status and label/value pairs', () => {
    const card = parseLeaveCard(new DOMParser().parseFromString(HTML, 'text/html'))
    expect(card?.status).toBe('Approved')
    expect(card?.fields).toEqual([
      { label: 'User', value: 'Lady gaga' },
      { label: 'Type', value: 'Paid vacation' },
      { label: 'Start date', value: '08/21/2026 Morning' },
      { label: 'Description', value: '' },
    ])
  })
  it('returns null without a card', () => {
    expect(parseLeaveCard(new DOMParser().parseFromString('<p>x</p>', 'text/html'))).toBeNull()
  })
})
