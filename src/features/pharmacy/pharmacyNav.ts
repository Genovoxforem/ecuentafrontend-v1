import { Activity, Boxes, ClipboardPlus, Cog, FileBarChart, Layers, MapPin, Package, Pill, ScanBarcode, ShieldCheck, ShoppingCart, Undo2, Users, type LucideIcon } from 'lucide-react'
import { ROUTES } from '../../routes'

export interface PharmacyNavItem {
  label: string
  path: string
  icon: LucideIcon
  // Per-page subtitle shown under the title, as on the classic Pharmacy app (app.php's page list).
  subtitle: string
  // Classic permission pair [module, action] from GET api.php?m=me -> rights[module] includes action.
  right: [string, string]
}
export interface PharmacyNavGroup {
  label: string
  items: PharmacyNavItem[]
}

export const PHARMACY_NAV: PharmacyNavGroup[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', path: ROUTES.pharmacyDashboard, icon: Activity, subtitle: 'Chainama Pharmacy · Lusaka', right: ['dashboard', 'read'] },
      { label: 'POS / Dispense', path: ROUTES.pharmacyDispense, icon: ScanBarcode, subtitle: 'Keyboard-first billing counter · FEFO · ZRA', right: ['sale', 'read'] },
      { label: 'Prescriptions', path: ROUTES.pharmacyPrescriptions, icon: ClipboardPlus, subtitle: 'Capture · verify · partial dispense', right: ['prescription', 'read'] },
      { label: 'Patients', path: ROUTES.pharmacyPatients, icon: Users, subtitle: 'Patient master · allergies · loyalty', right: ['patient', 'read'] },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Medicines', path: ROUTES.pharmacyMedicines, icon: Pill, subtitle: 'Medicine master · salt · schedule · substitutes', right: ['medicine', 'read'] },
      { label: 'Batches & Expiry', path: ROUTES.pharmacyBatches, icon: Layers, subtitle: 'Lot stock · MRP · expiry · FEFO', right: ['batch', 'read'] },
      { label: 'Purchases / GRN', path: ROUTES.pharmacyPurchases, icon: ShoppingCart, subtitle: 'Goods receipt · batch/expiry capture', right: ['purchase', 'read'] },
      { label: 'Stock', path: ROUTES.pharmacyStock, icon: Package, subtitle: 'Valuation · reorder worklist', right: ['stock', 'read'] },
      { label: 'Rack / Shelf', path: ROUTES.pharmacyLocations, icon: MapPin, subtitle: 'Where a product is placed · search · scan', right: ['stock', 'read'] },
      { label: 'Returns & Recall', path: ROUTES.pharmacyReturns, icon: Undo2, subtitle: 'Credit notes · batch recall · quarantine', right: ['sale', 'refund'] },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { label: 'Schedule Register', path: ROUTES.pharmacyRegister, icon: ShieldCheck, subtitle: 'Controlled-drug log · inspection export', right: ['controlled', 'read'] },
      { label: 'Clinical / DUR', path: ROUTES.pharmacyDur, icon: Boxes, subtitle: 'Allergy · duplicate · interaction screening', right: ['controlled', 'read'] },
      { label: 'Reports', path: ROUTES.pharmacyReports, icon: FileBarChart, subtitle: 'Sales · expiry · VAT/ZRA · valuation', right: ['report', 'read'] },
      { label: 'Settings', path: ROUTES.pharmacySettings, icon: Cog, subtitle: 'Tax · schedules · devices · printing', right: ['settings', 'read'] },
    ],
  },
]

// The classic app's "Staff view" picker: each view lists the pages it keeps in the menu (app.php's page-id lists).
export const PHARMACY_VIEWS: { key: string; label: string; paths: string[] | 'all' }[] = [
  { key: 'all', label: 'All areas', paths: 'all' },
  { key: 'counter', label: 'Counter', paths: [ROUTES.pharmacyDashboard, ROUTES.pharmacyDispense, ROUTES.pharmacyPrescriptions, ROUTES.pharmacyPatients] },
  { key: 'dispensary', label: 'Dispensary', paths: [ROUTES.pharmacyDashboard, ROUTES.pharmacyPrescriptions, ROUTES.pharmacyPatients, ROUTES.pharmacyRegister, ROUTES.pharmacyDur, ROUTES.pharmacyReturns] },
  { key: 'stock', label: 'Stock & recalls', paths: [ROUTES.pharmacyDashboard, ROUTES.pharmacyMedicines, ROUTES.pharmacyBatches, ROUTES.pharmacyPurchases, ROUTES.pharmacyStock, ROUTES.pharmacyLocations, ROUTES.pharmacyReturns] },
  { key: 'inspection', label: 'Inspection & safety', paths: [ROUTES.pharmacyDashboard, ROUTES.pharmacyRegister, ROUTES.pharmacyDur, ROUTES.pharmacyReports, ROUTES.pharmacyMedicines, ROUTES.pharmacyReturns] },
]

export const PHARMACY_PAGE_BY_PATH: Record<string, PharmacyNavItem> = Object.fromEntries(PHARMACY_NAV.flatMap((g) => g.items).map((i) => [i.path, i]))