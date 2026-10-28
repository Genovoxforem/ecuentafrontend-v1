import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const ProjectCreateModule = lazy(() => import('../../modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectCreateModule })))
const ProjectEditModule = lazy(() => import('../../modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectEditModule })))
const ProjectListModule = lazy(() => import('../../modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectListModule })))
const ProjectDetailModule = lazy(() => import('../../modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectDetailModule })))
const ProjectOpenLeadsListModule = lazy(() => import('../../modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectOpenLeadsListModule })))
const ProjectOpenProjectsListModule = lazy(() => import('../../modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectOpenProjectsListModule })))
const ProjectStatsModule = lazy(() => import('../../modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectStatsModule })))
const ProjectTaskCreateModule = lazy(() => import('../../modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectTaskCreateModule })))
const ProjectTaskListModule = lazy(() => import('../../modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectTaskListModule })))
const ProjectTaskStatsModule = lazy(() => import('../../modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectTaskStatsModule })))
const ProjectTimeSpentModule = lazy(() => import('../../modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectTimeSpentModule })))
const ProjectCategoryListModule = lazy(() => import('../../modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectCategoryListModule })))
const ProjectCategoryCreateModule = lazy(() => import('../../modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectCategoryCreateModule })))
const SupplierProposalStatsModule = lazy(() => import('../../modules/projects/ProjectsModules').then((m) => ({ default: m.SupplierProposalStatsModule })))

// Routes of the projects area, rendered inside the app layout (see src/App.tsx).
export function projectsRoutes() {
  return (
    <>
      <Route
        path={ROUTES.projectCreate}
        element={
          <RouteBoundary>
            <ProjectCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.projectEdit}
        element={
          <RouteBoundary>
            <ProjectEditModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.projectList}
        element={
          <RouteBoundary>
            <ProjectListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.projectDetail}
        element={
          <RouteBoundary>
            <ProjectDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.projectOpenLeadsList}
        element={
          <RouteBoundary>
            <ProjectOpenLeadsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.projectOpenProjectsList}
        element={
          <RouteBoundary>
            <ProjectOpenProjectsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.projectStats}
        element={
          <RouteBoundary>
            <ProjectStatsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.projectTaskCreate}
        element={
          <RouteBoundary>
            <ProjectTaskCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.projectTaskList}
        element={
          <RouteBoundary>
            <ProjectTaskListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.projectTaskStats}
        element={
          <RouteBoundary>
            <ProjectTaskStatsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.projectTimeSpent}
        element={
          <RouteBoundary>
            <ProjectTimeSpentModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.projectCategoryList}
        element={
          <RouteBoundary>
            <ProjectCategoryListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.projectCategoryCreate}
        element={
          <RouteBoundary>
            <ProjectCategoryCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.supplierProposalStats}
        element={
          <RouteBoundary>
            <SupplierProposalStatsModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
