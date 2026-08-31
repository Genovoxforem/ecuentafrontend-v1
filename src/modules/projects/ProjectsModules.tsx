import { useParams } from 'react-router-dom'
import { ProjectCreateForm } from '../../features/projects/components/ProjectCreateForm'
import { ProjectDetail } from '../../features/projects/components/ProjectDetail'
import { ProjectsListPage } from '../../features/projects/components/ProjectsListPage'
import { ProjectStatisticsPage } from '../../features/projects/components/ProjectStatisticsPage'
import { TaskCreateForm } from '../../features/projects/components/TaskCreateForm'
import { TasksListPage } from '../../features/projects/components/TasksListPage'
import { TimeSpentPage } from '../../features/projects/components/TimeSpentPage'
import { ProjectCategoryCreateForm } from '../../features/projects/components/ProjectCategoryCreateForm'
import { VendorProposalStatisticsPage } from '../../features/projects/components/VendorProposalStatisticsPage'

export function ProjectCreateModule() {
  return <ProjectCreateForm />
}
export function ProjectEditModule() {
  const { id } = useParams()
  return <ProjectCreateForm projectId={id ? Number(id) : undefined} />
}
export function ProjectListModule() {
  return <ProjectsListPage filter="all" title="Projects" />
}
export function ProjectDetailModule() {
  return <ProjectDetail />
}
export function ProjectOpenLeadsListModule() {
  return <ProjectsListPage filter="openLeads" title="Open Leads" />
}
export function ProjectOpenProjectsListModule() {
  return <ProjectsListPage filter="openProjects" title="Open Projects" />
}
export function ProjectStatsModule() {
  return <ProjectStatisticsPage />
}
export function ProjectTaskCreateModule() {
  return <TaskCreateForm />
}
export function ProjectTaskListModule() {
  return <TasksListPage />
}
export function ProjectTimeSpentModule() {
  return <TimeSpentPage />
}
export function ProjectCategoryCreateModule() {
  return <ProjectCategoryCreateForm />
}
export function SupplierProposalStatsModule() {
  return <VendorProposalStatisticsPage />
}
