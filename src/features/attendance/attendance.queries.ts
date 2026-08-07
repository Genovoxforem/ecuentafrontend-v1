import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'

export interface AttendanceStatus {
  isClockedIn: boolean
  clockInTime: string | null
  workingHours: number
}

interface AttendanceResponse {
  success: boolean
  data: {
    is_clocked_in: boolean
    clock_in_time: string | null
    clock_out_time: string | null
    working_hours: number
    date: string
  }
}

const STATUS_KEY = ['attendance', 'status']

// GET /api/attendance/ — confirmed live on this app's backend.
export function useAttendanceStatus() {
  return useQuery({
    queryKey: STATUS_KEY,
    queryFn: async (): Promise<AttendanceStatus> => {
      const { data } = await api.get<AttendanceResponse>('/attendance/')
      return {
        isClockedIn: data.data.is_clocked_in,
        clockInTime: data.data.clock_in_time,
        workingHours: data.data.working_hours,
      }
    },
    staleTime: 1000 * 30,
  })
}

// POST /api/attendance/?action=clock_in|clock_out — contract confirmed by
// reading api/attendance/index.php directly: clock_in takes an optional
// { clock_in_note, shift_id } JSON body, clock_out takes { clock_out_note,
// clock_in_id }. No special permission check on this path (that only
// applies to the separate, unused attendance/clock_in.php file), so any
// authenticated user can call it.
export function useClockIn() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (note?: string) => {
      await api.post('/attendance/?action=clock_in', { clock_in_note: note ?? '' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
  })
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending }
}

export function useClockOut() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (note?: string) => {
      await api.post('/attendance/?action=clock_out', { clock_out_note: note ?? '' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
  })
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending }
}
