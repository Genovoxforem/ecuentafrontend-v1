import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const TicketsListModule = lazy(() => import('../../modules/tickets/TicketsListModule').then((m) => ({ default: m.TicketsListModule })))
const MyAssignedTicketsModule = lazy(() => import('../../modules/tickets/MyAssignedTicketsModule').then((m) => ({ default: m.MyAssignedTicketsModule })))
const TicketDeskModule = lazy(() => import('../../modules/tickets/TicketDeskModule').then((m) => ({ default: m.TicketDeskModule })))
const TicketStatisticsModule = lazy(() => import('../../modules/tickets/TicketStatisticsModule').then((m) => ({ default: m.TicketStatisticsModule })))
const TicketCreateModule = lazy(() => import('../../modules/tickets/TicketCreateModule').then((m) => ({ default: m.TicketCreateModule })))
const TicketDetailModule = lazy(() => import('../../modules/tickets/TicketDetailModule').then((m) => ({ default: m.TicketDetailModule })))

// Routes of the tickets area, rendered inside the app layout (see src/App.tsx).
export function ticketsRoutes() {
  return (
    <>
      <Route
        path={ROUTES.ticketList}
        element={
          <RouteBoundary>
            <TicketsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ticketMyAssigned}
        element={
          <RouteBoundary>
            <MyAssignedTicketsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ticketDesk}
        element={
          <RouteBoundary>
            <TicketDeskModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ticketStatistics}
        element={
          <RouteBoundary>
            <TicketStatisticsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ticketNew}
        element={
          <RouteBoundary>
            <TicketCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ticketDetail}
        element={
          <RouteBoundary>
            <TicketDetailModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
