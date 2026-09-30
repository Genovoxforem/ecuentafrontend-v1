import { PieChart } from 'lucide-react'
import { GroupsReportPage } from './GroupsReportPage'

// compta/resultat/result.php — the real "By personalized groups" report: the
// account groups defined on the backend, month by month. With no group defined
// there, the backend prints only the header row.
export function PersonalizedGroupsReportPage() {
  return <GroupsReportPage icon={PieChart} title="By Personalized Groups" path="/compta/resultat/result.php" firstHeader={/^Personalized groups/} emptyText="No personalized account group is defined on the backend." />
}
