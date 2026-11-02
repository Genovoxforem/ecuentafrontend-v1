// The classic app's bottom-corner toast ("Prescription verified", "Save failed", ...). PharmacyLayout renders the host.
export const PHARMACY_TOAST_EVENT = 'pharmacy-toast'
export interface PharmacyToastDetail {
  message: string
  error: boolean
}
export function pharmacyToast(message: string, error = false) {
  window.dispatchEvent(new CustomEvent<PharmacyToastDetail>(PHARMACY_TOAST_EVENT, { detail: { message, error } }))
}
