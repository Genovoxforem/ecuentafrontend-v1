import { EmailsSetup } from '../../features/settings/components/EmailsSetup'

export function EmailsSetupModule() {
  return <EmailsSetup />
}

export function EmailTemplatesModule() {
  return <EmailsSetup defaultTab="Email templates" />
}
