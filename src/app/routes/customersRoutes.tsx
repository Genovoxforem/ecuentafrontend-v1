import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const CustomersListModule = lazy(() => import('../../modules/customers/CustomersListModule').then((m) => ({ default: m.CustomersListModule })))
const CustomerCreateModule = lazy(() => import('../../modules/customers/CustomerCreateModule').then((m) => ({ default: m.CustomerCreateModule })))
const CustomerEditModule = lazy(() => import('../../modules/customers/CustomerEditModule').then((m) => ({ default: m.CustomerEditModule })))
const CustomerDetailModule = lazy(() => import('../../modules/customers/CustomerDetailModule').then((m) => ({ default: m.CustomerDetailModule })))
const AdvanceListModule = lazy(() => import('../../modules/customers/AdvanceListModule').then((m) => ({ default: m.AdvanceListModule })))
const ProspectsListModule = lazy(() => import('../../modules/customers/ProspectsListModule').then((m) => ({ default: m.ProspectsListModule })))
const ProspectCreateModule = lazy(() => import('../../modules/customers/ProspectCreateModule').then((m) => ({ default: m.ProspectCreateModule })))
const CustomerGroupListModule = lazy(() => import('../../modules/customers/CustomerGroupListModule').then((m) => ({ default: m.CustomerGroupListModule })))
const CustomerGroupCreateModule = lazy(() => import('../../modules/customers/CustomerGroupCreateModule').then((m) => ({ default: m.CustomerGroupCreateModule })))
const ContactCreateModule = lazy(() => import('../../modules/customers/ContactCreateModule').then((m) => ({ default: m.ContactCreateModule })))
const ContactListModule = lazy(() => import('../../modules/customers/ContactListModule').then((m) => ({ default: m.ContactListModule })))
const ContactDetailModule = lazy(() => import('../../modules/customers/ContactDetailModule').then((m) => ({ default: m.ContactDetailModule })))
const CustomerTagsModule = lazy(() => import('../../modules/customers/CustomerTagsModule').then((m) => ({ default: m.CustomerTagsModule })))
const ContactTagsModule = lazy(() => import('../../modules/customers/ContactTagsModule').then((m) => ({ default: m.ContactTagsModule })))
const ImportCustomersModule = lazy(() => import('../../modules/customers/ImportCustomersModule').then((m) => ({ default: m.ImportCustomersModule })))

// Routes of the customers area, rendered inside the app layout (see src/App.tsx).
export function customersRoutes() {
  return (
    <>
      <Route
        path={ROUTES.customerList}
        element={
          <RouteBoundary>
            <CustomersListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.customersCreate}
        element={
          <RouteBoundary>
            <CustomerCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.customerEdit}
        element={
          <RouteBoundary>
            <CustomerEditModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.customerDetail}
        element={
          <RouteBoundary>
            <CustomerDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.customerAdvanceList}
        element={
          <RouteBoundary>
            <AdvanceListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.prospectList}
        element={
          <RouteBoundary>
            <ProspectsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.prospectsCreate}
        element={
          <RouteBoundary>
            <ProspectCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.customerGroupList}
        element={
          <RouteBoundary>
            <CustomerGroupListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.customerGroupCreate}
        element={
          <RouteBoundary>
            <CustomerGroupCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.customerGroupEdit}
        element={
          <RouteBoundary>
            <CustomerGroupCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.contactCreate}
        element={
          <RouteBoundary>
            <ContactCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.contactList}
        element={
          <RouteBoundary>
            <ContactListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.contactDetail}
        element={
          <RouteBoundary>
            <ContactDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.customerTags}
        element={
          <RouteBoundary>
            <CustomerTagsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.contactTags}
        element={
          <RouteBoundary>
            <ContactTagsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.importCustomers}
        element={
          <RouteBoundary>
            <ImportCustomersModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
