import type { ComponentType } from 'react'

// Payroll pages that have a legacy PHP page but no JSON API, shown as a placeholder.
export interface PayrollPlaceholder {
  path: string
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
}

export const PAYROLL_PLACEHOLDERS: PayrollPlaceholder[] = [
]
