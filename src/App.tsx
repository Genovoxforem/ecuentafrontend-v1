import { lazy, Suspense } from 'react'
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './api/queryClient'
import { ThemeProvider } from './context/ThemeContext'
import { SidebarStyleProvider } from './context/SidebarStyleContext'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { ErrorBoundary } from './shared/components/ErrorBoundary'
import { PageNotAvailable } from './shared/components/PageNotAvailable'
import { RouteFallback } from './shared/components/RouteFallback'
import { ConfirmDialogProvider } from './shared/components/ConfirmDialog'
import { LoginModule } from './modules/auth/LoginModule'
import { ROUTES } from './routes'
import { RouteBoundary } from './app/RouteBoundary'
import { bankingRoutes } from './app/routes/bankingRoutes'
import { contractsRoutes } from './app/routes/contractsRoutes'
import { customersRoutes } from './app/routes/customersRoutes'
import { expensesRoutes } from './app/routes/expensesRoutes'
import { fixedAssetRoutes } from './app/routes/fixedAssetRoutes'
import { hotelRoutes } from './app/routes/hotelRoutes'
import { invoicesRoutes } from './app/routes/invoicesRoutes'
import { ledgerRoutes } from './app/routes/ledgerRoutes'
import { loansRoutes } from './app/routes/loansRoutes'
import { miscRoutes } from './app/routes/miscRoutes'
import { payrollRoutes } from './app/routes/payrollRoutes'
import { payrollV2Routes } from './app/routes/payrollV2Routes'
import { productsRoutes } from './app/routes/productsRoutes'
import { projectsRoutes } from './app/routes/projectsRoutes'
import { purchasesRoutes } from './app/routes/purchasesRoutes'
import { quotationsRoutes } from './app/routes/quotationsRoutes'
import { salesOrdersRoutes } from './app/routes/salesOrdersRoutes'
import { settingsRoutes } from './app/routes/settingsRoutes'
import { ticketsRoutes } from './app/routes/ticketsRoutes'
import { usersDashboardRoutes } from './app/routes/usersDashboardRoutes'
import { warehousesRoutes } from './app/routes/warehousesRoutes'
import { zraRoutes } from './app/routes/zraRoutes'

// Route-level code-splitting: lazy() gives each route its own chunk, fetched
// only when that route is visited, so /login does not ship the whole app.
// LoginModule stays eager so the sign-in form can paint immediately; the
// dashboard is split so anonymous visits do not download dashboard charts and UI.
//
// Named exports need the `.then(m => ({ default: m.X }))` wrapper because
// lazy() requires a default export from the dynamic import promise; POS's
// components already have default exports, so they don't.
const HotelModule = lazy(() => import('./modules/hotel/HotelModule').then((m) => ({ default: m.HotelModule })))
const HotelRoomsModule = lazy(() => import('./modules/hotel/HotelRoomsModule').then((m) => ({ default: m.HotelRoomsModule })))
const HotelFrontDeskModule = lazy(() => import('./modules/hotel/HotelFrontDeskModule').then((m) => ({ default: m.HotelFrontDeskModule })))
const HotelGuestsModule = lazy(() => import('./modules/hotel/HotelGuestsModule').then((m) => ({ default: m.HotelGuestsModule })))
const HotelHousekeepingModule = lazy(() => import('./modules/hotel/HotelHousekeepingModule').then((m) => ({ default: m.HotelHousekeepingModule })))
const HotelMaintenanceModule = lazy(() => import('./modules/hotel/HotelMaintenanceModule').then((m) => ({ default: m.HotelMaintenanceModule })))
const HotelWaitlistModule = lazy(() => import('./modules/hotel/HotelWaitlistModule').then((m) => ({ default: m.HotelWaitlistModule })))
const HotelRoomServiceModule = lazy(() => import('./modules/hotel/HotelRoomServiceModule').then((m) => ({ default: m.HotelRoomServiceModule })))
const HotelInventoryModule = lazy(() => import('./modules/hotel/HotelInventoryModule').then((m) => ({ default: m.HotelInventoryModule })))
const HotelCalendarModule = lazy(() => import('./modules/hotel/HotelCalendarModule').then((m) => ({ default: m.HotelCalendarModule })))
const HotelSuiteReservationsModule = lazy(() => import('./modules/hotel/HotelSuiteReservationsModule').then((m) => ({ default: m.HotelSuiteReservationsModule })))
const HotelSuiteNewBookingModule = lazy(() => import('./modules/hotel/HotelSuiteNewBookingModule').then((m) => ({ default: m.HotelSuiteNewBookingModule })))
const HotelSuiteConciergeModule = lazy(() => import('./modules/hotel/HotelSuiteConciergeModule').then((m) => ({ default: m.HotelSuiteConciergeModule })))
const HotelRoomQRModule = lazy(() => import('./modules/hotel/HotelRoomQRModule').then((m) => ({ default: m.HotelRoomQRModule })))
const HotelKitchenScreenModule = lazy(() => import('./modules/hotel/HotelKitchenScreenModule').then((m) => ({ default: m.HotelKitchenScreenModule })))
const HotelReportsModule = lazy(() => import('./modules/hotel/HotelReportsModule').then((m) => ({ default: m.HotelReportsModule })))
const HotelQuotesModule = lazy(() => import('./modules/hotel/HotelQuotesModule').then((m) => ({ default: m.HotelQuotesModule })))
const HotelInvoicesModule = lazy(() => import('./modules/hotel/HotelInvoicesModule').then((m) => ({ default: m.HotelInvoicesModule })))
const HotelRatesChannelsModule = lazy(() => import('./modules/hotel/HotelRatesChannelsModule').then((m) => ({ default: m.HotelRatesChannelsModule })))
const HotelSettingsModule = lazy(() => import('./modules/hotel/HotelSettingsModule').then((m) => ({ default: m.HotelSettingsModule })))

// The signed-in chrome (sidebar, navbar, menu, banners) and the Hotel Suite frame are not part of the sign-in screen: kept out of the entry
// chunk, they are downloaded after sign-in (LoginModule starts fetching them while the form is idle).
const AppShell = lazy(() => import('./app/AppShell').then((m) => ({ default: m.AppShell })))
const HotelSuiteLayout = lazy(() => import('./shared/components/layout/HotelSuiteLayout').then((m) => ({ default: m.HotelSuiteLayout })))

const PosV2Page = lazy(() => import('./pos2/PosV2'))
const PosPublicMenuPage = lazy(() => import('./pos2/PublicMenuV2'))
const PosWaiterPage = lazy(() => import('./pos2/WaiterOrderV2'))
const PosCustomerDisplayPage = lazy(() => import('./pos2/CustomerDisplayV2'))
const PosLayout = lazy(() => import('./pos/layouts/DashboardLayout'))
const PosHome = lazy(() => import('./pos/features/pos/Components/PosHome'))
const PosProductsPage = lazy(() => import('./pos/features/products/Components/ProductsPage'))

function AppLayout() {
  // A plain Suspense (no ErrorBoundary): a failure of the shell itself still reaches the full-page error below.
  return (
    <Suspense fallback={<RouteFallback />}>
      <AppShell>
        <Outlet />
      </AppShell>
    </Suspense>
  )
}


function App() {
  return (
    <ErrorBoundary fallback={<FullPageError />}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SidebarStyleProvider>
            <ConfirmDialogProvider>
              <AuthProvider>
                <BrowserRouter>
                  <Routes>
                    <Route
                      path="/login"
                      element={
                        <RouteBoundary>
                          <LoginModule />
                        </RouteBoundary>
                      }
                    />
                    <Route element={<ProtectedRoute />}>
                      {/* Full-bleed, own chrome (PosNavbar/PosSidebar) — not wrapped in
                    AppLayout's admin Navbar/Sidebar, same as pos_standalone was
                    full-screen on its own. See src/pos/layouts/DashboardLayout.jsx. */}
                      <Route
                        path={ROUTES.posPublicMenu}
                        element={
                          <RouteBoundary>
                            <PosPublicMenuPage />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path={ROUTES.posWaiter}
                        element={
                          <RouteBoundary>
                            <PosWaiterPage />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path={ROUTES.posCustomerDisplay}
                        element={
                          <RouteBoundary>
                            <PosCustomerDisplayPage />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path={ROUTES.posV2}
                        element={
                          <RouteBoundary>
                            <PosV2Page />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/pos"
                        element={
                          <RouteBoundary>
                            <PosLayout />
                          </RouteBoundary>
                        }
                      >
                        <Route
                          index
                          element={
                            <RouteBoundary>
                              <PosHome />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path="products"
                          element={
                            <RouteBoundary>
                              <PosProductsPage />
                            </RouteBoundary>
                          }
                        />
                      </Route>
                      {/* Standalone, own chrome — no navbar/sidebar, same pattern as
                    /pos above (kept full-bleed since it's meant to run on its
                    own kitchen-side screen/tab), but styled with this app's
                    own Card/design tokens to match the rest of the Suite
                    rather than the real page's dark kiosk palette. */}
                      <Route
                        path={ROUTES.hotelKitchenScreen}
                        element={
                          <RouteBoundary>
                            <HotelKitchenScreenModule />
                          </RouteBoundary>
                        }
                      />
                      {/* Standalone, own chrome — no main app Navbar/Sidebar, same
                    pattern as /pos: the real Hotel Suite (custom/hotel/app.php)
                    is its own genuinely separate SPA-within-the-app (see
                    HotelSuiteLayout's own top comment), so it gets the same
                    "own screen" treatment POS gets rather than sitting nested
                    inside the main app chrome. Every entry point into it
                    (Room Status, Booking Management's own header, Home's
                    "Hotel Dashboard" link, the Suite's own Dashboard tab)
                    lands here directly. */}
                      <Route
                        element={
                          <Suspense fallback={<RouteFallback />}>
                            <HotelSuiteLayout />
                          </Suspense>
                        }
                      >
                        <Route
                          path={ROUTES.bookingDashboard}
                          element={
                            <RouteBoundary>
                              <HotelModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelRooms}
                          element={
                            <RouteBoundary>
                              <HotelRoomsModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelFrontDesk}
                          element={
                            <RouteBoundary>
                              <HotelFrontDeskModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelSuiteNewBooking}
                          element={
                            <RouteBoundary>
                              <HotelSuiteNewBookingModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelGuests}
                          element={
                            <RouteBoundary>
                              <HotelGuestsModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelHousekeeping}
                          element={
                            <RouteBoundary>
                              <HotelHousekeepingModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelMaintenance}
                          element={
                            <RouteBoundary>
                              <HotelMaintenanceModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelWaitlist}
                          element={
                            <RouteBoundary>
                              <HotelWaitlistModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelRoomService}
                          element={
                            <RouteBoundary>
                              <HotelRoomServiceModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelInventory}
                          element={
                            <RouteBoundary>
                              <HotelInventoryModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelCalendar}
                          element={
                            <RouteBoundary>
                              <HotelCalendarModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelRoomQr}
                          element={
                            <RouteBoundary>
                              <HotelRoomQRModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelReports}
                          element={
                            <RouteBoundary>
                              <HotelReportsModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelSuiteConcierge}
                          element={
                            <RouteBoundary>
                              <HotelSuiteConciergeModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelSuiteReservations}
                          element={
                            <RouteBoundary>
                              <HotelSuiteReservationsModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelQuotes}
                          element={
                            <RouteBoundary>
                              <HotelQuotesModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelInvoices}
                          element={
                            <RouteBoundary>
                              <HotelInvoicesModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelRatesChannels}
                          element={
                            <RouteBoundary>
                              <HotelRatesChannelsModule />
                            </RouteBoundary>
                          }
                        />
                        <Route
                          path={ROUTES.hotelSettings}
                          element={
                            <RouteBoundary>
                              <HotelSettingsModule />
                            </RouteBoundary>
                          }
                        />
                      </Route>
                      <Route element={<AppLayout />}>
                        {bankingRoutes()}
                        {contractsRoutes()}
                        {customersRoutes()}
                        {expensesRoutes()}
                        {fixedAssetRoutes()}
                        {hotelRoutes()}
                        {invoicesRoutes()}
                        {ledgerRoutes()}
                        {loansRoutes()}
                        {miscRoutes()}
                        {payrollRoutes()}
                        {payrollV2Routes()}
                        {productsRoutes()}
                        {projectsRoutes()}
                        {purchasesRoutes()}
                        {quotationsRoutes()}
                        {salesOrdersRoutes()}
                        {settingsRoutes()}
                        {ticketsRoutes()}
                        {usersDashboardRoutes()}
                        {warehousesRoutes()}
                        {zraRoutes()}
                        <Route path="*" element={<PageNotAvailable />} />
                      </Route>
                    </Route>
                  </Routes>
                </BrowserRouter>
              </AuthProvider>
            </ConfirmDialogProvider>
          </SidebarStyleProvider>
        </ThemeProvider>
        {/* Opt-in (VITE_QUERY_DEVTOOLS=true in .env.local): its floating button sits at the bottom-right
            of every page and covered the footer's primary button and the list pagination. */}
        {import.meta.env.VITE_QUERY_DEVTOOLS === 'true' && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

// Root fallback — only reached if something above every route boundary
// throws (a provider, AppShell/sidebar itself, or a bug in RouteBoundary),
// since any single route's own error is already caught closer to its source.
function FullPageError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface p-6 text-center">
      <p className="text-lg font-semibold text-text">Something went wrong.</p>
      <p className="text-sm text-text-muted">Please reload the page. If this keeps happening, contact support.</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
        Reload page
      </button>
    </div>
  )
}

export default App
