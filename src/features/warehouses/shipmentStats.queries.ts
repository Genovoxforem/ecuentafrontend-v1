import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'

export interface ShipmentStats {
  year: number
  byMonth: number[]
  byYear: { year: string; count: number }[]
}

interface WebEnvelope<T> {
  success: boolean
  data: T
}

// GET /api/shipments/stats/ (api/shipments/stats/index.php) — real, mirrors
// expedition/stats/index.php's own ExpeditionStats::getNbByMonth() query:
// validated shipments only (fk_statut > 0), grouped by date_valid.
export function useShipmentStats(year: number, socid?: string, userid?: string) {
  return useQuery({
    queryKey: ['shipments', 'stats', year, socid, userid],
    queryFn: async (): Promise<ShipmentStats> => {
      const { data } = await api.get<WebEnvelope<ShipmentStats>>('/shipments/stats/', { params: { year, socid: socid || undefined, userid: userid || undefined } })
      return data.data
    },
    placeholderData: (prev) => prev,
  })
}
