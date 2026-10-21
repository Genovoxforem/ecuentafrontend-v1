// Shapes of the contacts tab and the shipment stock table that sales orders, purchase orders, invoices and proposals
// render. They are filled from each module's fapi (commande/fapi, fourn/commande/fapi, compta/facture/fapi,
// expedition/fapi); nothing here parses HTML any more.

export interface ContactRow {
  nature: string
  thirdParty: string
  contact: string
  contactType: string
  status: string
  // The element_contact row, for the endpoints that can delete or swap a link (invoices).
  rowid?: number
}

export interface ContactOption {
  value: string
  label: string
}

export interface ContactFormOptions {
  issuerCompanyName: string
  internalUserOptions: ContactOption[]
  internalTypeOptions: ContactOption[]
  companyOptions: ContactOption[]
  selectedCompanyId: string
  externalContactOptions: ContactOption[]
  hasRealExternalContact: boolean
  externalTypeOptions: ContactOption[]
}

export interface ShipmentStockRow {
  description: string
  qtyOrdered: number
  qtyShipped: number
  remainToShip: number
  realStock: number
}
