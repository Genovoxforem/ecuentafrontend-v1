// The shipping-charge VAT choices of the Commercial Invoice wizard (select shippingtva_tx on compta/facture/card-wizard.php, newecuenta, read 11 Nov 2026).
export interface CodeOption { value: string; label: string }

export const SHIPPING_TAX_CATEGORIES: CodeOption[] = [{ value: "16 (A)", label: "A-16%" },
  { value: "16 (B)", label: "B-16%" },
  { value: "0 (C3)", label: "C3-0%" },
  { value: "0 (D)", label: "D-0%" },
  { value: "16 (RVAT)", label: "RVAT-16%" },
  { value: "0 (E)", label: "E-0%" }]
