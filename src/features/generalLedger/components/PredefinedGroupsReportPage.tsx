import { PieChart } from 'lucide-react'
import { GroupsReportPage } from './GroupsReportPage'

// compta/resultat/clientfourn.php — the real "Report In/Out, by predefined
// account groups" for the chosen date range.
export function PredefinedGroupsReportPage() {
  return <GroupsReportPage icon={PieChart} title="By Predefined Groups" path="/compta/resultat/clientfourn.php" firstHeader={/^Predefined groups/} emptyText="No record found." />
}
