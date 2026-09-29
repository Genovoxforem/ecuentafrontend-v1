import { describe, expect, it } from 'vitest'
import { parseNotificationItems } from './notificationParser'

// The empty response is the real one from notification_ajax_modern.php. The
// populated one is built from the classes the legacy navbar script binds to
// (.listno, data-id, data-type, .unread, .notifi-action-btn) — the dev backends
// had no notifications to copy real item markup from.
const EMPTY =
  '<div class="notifi-empty"><i class="fa fa-bell-slash"></i><h4>No Notifications</h4><p>You\'re all caught up!</p></div><script>$(document).ready(function(){ $(".not_update").click(function(){}); });</script>'

const POPULATED =
  '<div class="listno unread" data-id="41" data-type="3"><a href="/commande/card.php?id=9"><span class="t">New order</span> <small>CO2609-0009</small></a>' +
  '<button class="notifi-action-btn mark">Mark</button><button class="notifi-action-btn close">x</button></div>' +
  '<div class="listno" data-id="42" data-type="1"><span>Task due today</span></div>'

describe('parseNotificationItems', () => {
  it('finds no items in the real empty response', () => {
    expect(parseNotificationItems(EMPTY)).toEqual([])
  })

  it('reads id, type, unread state, wording and link, leaving the action buttons out', () => {
    const [first, second] = parseNotificationItems(POPULATED)
    expect(first).toEqual({ id: '41', type: '3', unread: true, text: 'New order CO2609-0009', href: '/commande/card.php?id=9' })
    expect(second).toEqual({ id: '42', type: '1', unread: false, text: 'Task due today', href: null })
  })

  it('copes with an empty or missing response', () => {
    expect(parseNotificationItems('')).toEqual([])
  })
})
