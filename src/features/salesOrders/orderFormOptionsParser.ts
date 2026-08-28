// The New Sales Order form's Availability Delay / Shipping Method / Payment
// Terms dropdowns used to call /api/availability_delays.php,
// /api/shipping_methods.php, and /api/payment_terms.php — all three are a
// genuine 404 on this backend (checked live), which silently left those
// three <select>s permanently empty. There's no REST route for them, but
// the real values (llx_c_availability/llx_c_shipment_mode/llx_c_payment_term)
// are rendered as plain <select> options on the real legacy order-create
// page, commande/salesorder/index_v2.php — read directly from its fetched
// HTML below rather than guessed, same "dead REST route, real legacy page"
// pattern as this session's Warehouses/Inventory/Customers/Orders-list
// fixes. Selector/name attrs verified against that page's real markup:
//   availability_id     -> <select id="availability_id" name="availability_id">
//   shipping_method_id  -> <select id="selectshipping_method_id" name="shipping_method_id">
//   cond_reglement_id   -> <select id="cond_reglement_id" name="cond_reglement_id">
// The placeholder "Select a …" option is always value="0" or value="-1" on
// this page, filtered out below the same way a native <option value="">
// placeholder would be.

export interface OrderDictOption {
  id: string
  text: string
}

export interface OrderDictionaries {
  availabilityDelays: OrderDictOption[]
  shippingMethods: OrderDictOption[]
  paymentTerms: OrderDictOption[]
}

export function looksLikeLegacyLoginPage(doc: Document): boolean {
  return !doc.querySelector('select[name="cond_reglement_id"]') && !!doc.querySelector('input[name="password"]')
}

function parseSelectOptions(doc: Document, selector: string): OrderDictOption[] {
  const select = doc.querySelector(selector)
  if (!select) return []
  return Array.from(select.querySelectorAll('option'))
    .map((o) => ({ id: o.getAttribute('value') ?? '', text: (o.textContent ?? '').trim() }))
    .filter((o) => o.id && o.id !== '0' && o.id !== '-1')
}

export function parseOrderDictionaries(doc: Document): OrderDictionaries {
  return {
    availabilityDelays: parseSelectOptions(doc, 'select[name="availability_id"]'),
    shippingMethods: parseSelectOptions(doc, 'select[name="shipping_method_id"]'),
    paymentTerms: parseSelectOptions(doc, 'select[name="cond_reglement_id"]'),
  }
}
