import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const SettingsModule = lazy(() => import('../../modules/settings/SettingsModule').then((m) => ({ default: m.SettingsModule })))
const SetupLandingModule = lazy(() => import('../../modules/settings/SetupLandingModule').then((m) => ({ default: m.SetupLandingModule })))
const CompanyOrganizationModule = lazy(() => import('../../modules/settings/CompanyOrganizationModule').then((m) => ({ default: m.CompanyOrganizationModule })))
const MenusSetupModule = lazy(() => import('../../modules/settings/MenusSetupModule').then((m) => ({ default: m.MenusSetupModule })))
const DisplaySetupModule = lazy(() => import('../../modules/settings/DisplaySetupModule').then((m) => ({ default: m.DisplaySetupModule })))
const TranslationSetupModule = lazy(() => import('../../modules/settings/TranslationSetupModule').then((m) => ({ default: m.TranslationSetupModule })))
const DefaultValuesSetupModule = lazy(() => import('../../modules/settings/DefaultValuesSetupModule').then((m) => ({ default: m.DefaultValuesSetupModule })))
const WidgetsSetupModule = lazy(() => import('../../modules/settings/WidgetsSetupModule').then((m) => ({ default: m.WidgetsSetupModule })))
const AlertsSetupModule = lazy(() => import('../../modules/settings/AlertsSetupModule').then((m) => ({ default: m.AlertsSetupModule })))
const SecuritySetupModule = lazy(() => import('../../modules/settings/SecuritySetupModule').then((m) => ({ default: m.SecuritySetupModule })))
const LimitsSetupModule = lazy(() => import('../../modules/settings/LimitsSetupModule').then((m) => ({ default: m.LimitsSetupModule })))
const PdfSetupModule = lazy(() => import('../../modules/settings/PdfSetupModule').then((m) => ({ default: m.PdfSetupModule })))
const EmailsSetupModule = lazy(() => import('../../modules/settings/EmailsSetupModule').then((m) => ({ default: m.EmailsSetupModule })))
const EmailTemplatesModule = lazy(() => import('../../modules/settings/EmailsSetupModule').then((m) => ({ default: m.EmailTemplatesModule })))
const SmsSetupModule = lazy(() => import('../../modules/settings/SmsSetupModule').then((m) => ({ default: m.SmsSetupModule })))
const DictionarySetupModule = lazy(() => import('../../modules/settings/DictionarySetupModule').then((m) => ({ default: m.DictionarySetupModule })))
const OtherSetupModule = lazy(() => import('../../modules/settings/OtherSetupModule').then((m) => ({ default: m.OtherSetupModule })))
const ExportAssistantModule = lazy(() => import('../../modules/settings/ExportAssistantModule').then((m) => ({ default: m.ExportAssistantModule })))
const ImportAssistantModule = lazy(() => import('../../modules/settings/ImportAssistantModule').then((m) => ({ default: m.ImportAssistantModule })))
const CashflowSettingsModule = lazy(() => import('../../modules/settings/CashflowSettingsModule').then((m) => ({ default: m.CashflowSettingsModule })))
const WhatsappSettingsModule = lazy(() => import('../../modules/settings/WhatsappSettingsModule').then((m) => ({ default: m.WhatsappSettingsModule })))

// Routes of the settings area, rendered inside the app layout (see src/App.tsx).
export function settingsRoutes() {
  return (
    <>
      <Route
        path="/settings"
        element={
          <RouteBoundary>
            <SettingsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.setupLanding}
        element={
          <RouteBoundary>
            <SetupLandingModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.companyOrganization}
        element={
          <RouteBoundary>
            <CompanyOrganizationModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.menusSetup}
        element={
          <RouteBoundary>
            <MenusSetupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.displaySetup}
        element={
          <RouteBoundary>
            <DisplaySetupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.translationSetup}
        element={
          <RouteBoundary>
            <TranslationSetupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.defaultValuesSetup}
        element={
          <RouteBoundary>
            <DefaultValuesSetupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.widgetsSetup}
        element={
          <RouteBoundary>
            <WidgetsSetupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.alertsSetup}
        element={
          <RouteBoundary>
            <AlertsSetupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.securitySetup}
        element={
          <RouteBoundary>
            <SecuritySetupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.limitsSetup}
        element={
          <RouteBoundary>
            <LimitsSetupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.pdfSetup}
        element={
          <RouteBoundary>
            <PdfSetupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.emailsSetup}
        element={
          <RouteBoundary>
            <EmailsSetupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.emailTemplates}
        element={
          <RouteBoundary>
            <EmailTemplatesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.smsSetup}
        element={
          <RouteBoundary>
            <SmsSetupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.dictionaries}
        element={
          <RouteBoundary>
            <DictionarySetupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.otherSetup}
        element={
          <RouteBoundary>
            <OtherSetupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.exportAssistant}
        element={
          <RouteBoundary>
            <ExportAssistantModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.importAssistant}
        element={
          <RouteBoundary>
            <ImportAssistantModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.cashflowSettings}
        element={
          <RouteBoundary>
            <CashflowSettingsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.whatsappSettings}
        element={
          <RouteBoundary>
            <WhatsappSettingsModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
