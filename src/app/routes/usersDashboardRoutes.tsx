import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const GroupEditModule = lazy(() => import('../../modules/usersDashboard/GroupEditModule').then((m) => ({ default: m.GroupEditModule })))
const UsersDashboardModule = lazy(() => import('../../modules/usersDashboard/UsersDashboardModule').then((m) => ({ default: m.UsersDashboardModule })))
const UserCreateModule = lazy(() => import('../../modules/usersDashboard/UserCreateModule').then((m) => ({ default: m.UserCreateModule })))
const UserDetailModule = lazy(() => import('../../modules/usersDashboard/UserDetailModule').then((m) => ({ default: m.UserDetailModule })))
const GroupsListModule = lazy(() => import('../../modules/usersDashboard/GroupsListModule').then((m) => ({ default: m.GroupsListModule })))
const GroupCreateModule = lazy(() => import('../../modules/usersDashboard/GroupCreateModule').then((m) => ({ default: m.GroupCreateModule })))
const TagsListModule = lazy(() => import('../../modules/usersDashboard/TagsListModule').then((m) => ({ default: m.TagsListModule })))
const HrmAreaModule = lazy(() => import('../../modules/usersDashboard/HrmAreaModule').then((m) => ({ default: m.HrmAreaModule })))
const LeaveListModule = lazy(() => import('../../modules/usersDashboard/LeaveListModule').then((m) => ({ default: m.LeaveListModule })))
const LeaveRequestModule = lazy(() => import('../../modules/usersDashboard/LeaveRequestModule').then((m) => ({ default: m.LeaveRequestModule })))
const LeaveDetailModule = lazy(() => import('../../modules/usersDashboard/LeaveRequestModule').then((m) => ({ default: m.LeaveDetailModule })))
const TimeSpentModule = lazy(() => import('../../modules/usersDashboard/TimeSpentModule').then((m) => ({ default: m.TimeSpentModule })))
const MonthlyStatementModule = lazy(() => import('../../modules/usersDashboard/MonthlyStatementModule').then((m) => ({ default: m.MonthlyStatementModule })))
const ActivitiesDetailModule = lazy(() => import('../../modules/usersDashboard/ActivitiesDetailModule').then((m) => ({ default: m.ActivitiesDetailModule })))
const LinkedFilesAreaModule = lazy(() => import('../../modules/usersDashboard/LinkedFilesAreaModule').then((m) => ({ default: m.LinkedFilesAreaModule })))
const LinkedFilesManualTreeModule = lazy(() => import('../../modules/usersDashboard/LinkedFilesAreaModule').then((m) => ({ default: m.LinkedFilesManualTreeModule })))
const LinkedFilesAutomaticTreeModule = lazy(() => import('../../modules/usersDashboard/LinkedFilesAreaModule').then((m) => ({ default: m.LinkedFilesAutomaticTreeModule })))

// Routes of the usersDashboard area, rendered inside the app layout (see src/App.tsx).
export function usersDashboardRoutes() {
  return (
    <>
      <Route
        path={ROUTES.userGroupEdit}
        element={
          <RouteBoundary>
            <GroupEditModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.usersDashboard}
        element={
          <RouteBoundary>
            <UsersDashboardModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.userCreate}
        element={
          <RouteBoundary>
            <UserCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.userDetail}
        element={
          <RouteBoundary>
            <UserDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.userGroupList}
        element={
          <RouteBoundary>
            <GroupsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.userGroupCreate}
        element={
          <RouteBoundary>
            <GroupCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.userTags}
        element={
          <RouteBoundary>
            <TagsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hrmArea}
        element={
          <RouteBoundary>
            <HrmAreaModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.leaveList}
        element={
          <RouteBoundary>
            <LeaveListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.leaveRequest}
        element={
          <RouteBoundary>
            <LeaveRequestModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.leaveDetail}
        element={
          <RouteBoundary>
            <LeaveDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.timeSpent}
        element={
          <RouteBoundary>
            <TimeSpentModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.hrmMonthlyStatement}
        element={
          <RouteBoundary>
            <MonthlyStatementModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.activitiesDetail}
        element={
          <RouteBoundary>
            <ActivitiesDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.userDocuments}
        element={
          <RouteBoundary>
            <LinkedFilesAreaModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.userDocumentsManual}
        element={
          <RouteBoundary>
            <LinkedFilesManualTreeModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.userDocumentsAutomatic}
        element={
          <RouteBoundary>
            <LinkedFilesAutomaticTreeModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
