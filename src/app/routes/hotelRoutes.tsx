import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const HotelReservationsModule = lazy(() => import('../../modules/hotel/HotelReservationsModule').then((m) => ({ default: m.HotelReservationsModule })))
const HotelNewBookingModule = lazy(() => import('../../modules/hotel/HotelNewBookingModule').then((m) => ({ default: m.HotelNewBookingModule })))
const HotelEnquiryModule = lazy(() => import('../../modules/hotel/HotelEnquiryModule').then((m) => ({ default: m.HotelEnquiryModule })))
const HotelBookingReportModule = lazy(() => import('../../modules/hotel/HotelBookingReportModule').then((m) => ({ default: m.HotelBookingReportModule })))
const HotelWakeUpCallsModule = lazy(() => import('../../modules/hotel/HotelWakeUpCallsModule').then((m) => ({ default: m.HotelWakeUpCallsModule })))
const HotelRoomTypesModule = lazy(() => import('../../modules/hotel/HotelRoomTypesModule').then((m) => ({ default: m.HotelRoomTypesModule })))
const HotelFloorTypesModule = lazy(() => import('../../modules/hotel/HotelFloorTypesModule').then((m) => ({ default: m.HotelFloorTypesModule })))
const HotelBookingTypesModule = lazy(() => import('../../modules/hotel/HotelBookingTypesModule').then((m) => ({ default: m.HotelBookingTypesModule })))
const HotelBedTypesModule = lazy(() => import('../../modules/hotel/HotelBedTypesModule').then((m) => ({ default: m.HotelBedTypesModule })))
const HotelRoomFeaturesModule = lazy(() => import('../../modules/hotel/HotelRoomFeaturesModule').then((m) => ({ default: m.HotelRoomFeaturesModule })))
const HotelAddRoomModule = lazy(() => import('../../modules/hotel/HotelAddRoomModule').then((m) => ({ default: m.HotelAddRoomModule })))
const HotelRoomListModule = lazy(() => import('../../modules/hotel/HotelRoomListModule').then((m) => ({ default: m.HotelRoomListModule })))
const HotelCheckOutListModule = lazy(() => import('../../modules/hotel/HotelCheckOutListModule').then((m) => ({ default: m.HotelCheckOutListModule })))
const HotelAssignRoomCleaningModule = lazy(() => import('../../modules/hotel/HotelAssignRoomCleaningModule').then((m) => ({ default: m.HotelAssignRoomCleaningModule })))
const HotelRoomCleaningStatusModule = lazy(() => import('../../modules/hotel/HotelRoomCleaningStatusModule').then((m) => ({ default: m.HotelRoomCleaningStatusModule })))
const HotelRoomCleaningReportModule = lazy(() => import('../../modules/hotel/HotelRoomCleaningReportModule').then((m) => ({ default: m.HotelRoomCleaningReportModule })))
const HotelRoomHistoryReportModule = lazy(() => import('../../modules/hotel/HotelRoomHistoryReportModule').then((m) => ({ default: m.HotelRoomHistoryReportModule })))

// Routes of the hotel area, rendered inside the app layout (see src/App.tsx).
export function hotelRoutes() {
  return (
    <>
      <Route
        path={ROUTES.hotelReservations}
        element={
          <RouteBoundary>
            <HotelReservationsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hotelNewBooking}
        element={
          <RouteBoundary>
            <HotelNewBookingModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hotelEnquiry}
        element={
          <RouteBoundary>
            <HotelEnquiryModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hotelBookingReport}
        element={
          <RouteBoundary>
            <HotelBookingReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hotelWakeUpCalls}
        element={
          <RouteBoundary>
            <HotelWakeUpCallsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hotelRoomTypes}
        element={
          <RouteBoundary>
            <HotelRoomTypesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hotelFloorTypes}
        element={
          <RouteBoundary>
            <HotelFloorTypesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hotelBookingTypes}
        element={
          <RouteBoundary>
            <HotelBookingTypesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hotelBedTypes}
        element={
          <RouteBoundary>
            <HotelBedTypesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hotelRoomFeatures}
        element={
          <RouteBoundary>
            <HotelRoomFeaturesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hotelAddRoom}
        element={
          <RouteBoundary>
            <HotelAddRoomModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hotelRoomList}
        element={
          <RouteBoundary>
            <HotelRoomListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hotelCheckoutList}
        element={
          <RouteBoundary>
            <HotelCheckOutListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hotelAssignRoomCleaning}
        element={
          <RouteBoundary>
            <HotelAssignRoomCleaningModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hotelRoomCleaningStatus}
        element={
          <RouteBoundary>
            <HotelRoomCleaningStatusModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hotelRoomCleaningReport}
        element={
          <RouteBoundary>
            <HotelRoomCleaningReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hotelRoomHistoryReport}
        element={
          <RouteBoundary>
            <HotelRoomHistoryReportModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
