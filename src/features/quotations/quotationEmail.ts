export interface QuotationEmailOption {
  value: string
  label: string
}

export interface QuotationEmailDefaults {
  senderOptions: QuotationEmailOption[]
  defaultFromType: string
  recipients: QuotationEmailOption[]
  defaultSubject: string
  defaultMessage: string
  attachedFile: { name: string; size: number } | null
}

export function emailAddress(option: QuotationEmailOption | undefined): string {
  if (!option) return ''
  return option.label.match(/<([^>]+)>/)?.[1]?.trim() ?? (option.value.includes('@') ? option.value : '')
}
