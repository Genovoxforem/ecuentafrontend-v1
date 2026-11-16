import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

// core/fapi/constants.php?names=A,B,C (key-authenticated JSON, 5 Nov 2026, admin only): the stored value of each named setting constant,
// {values: {NAME: value | null}, redacted: [...secret names, their value is not sent], missing: [...never set], entity}. It replaces the
// "no read endpoint" gap of core/ajax/constantonoff.php (which only writes): a Setup switch now starts where the database has it.
// Checked on newecuenta against the switches of the classic admin/ihm.php, pdf.php and security_other.php pages: all ten match.
// A switch is on when its constant holds anything but '' or '0' (a never-set constant is off).
interface ConstantsAnswer {
  values: Record<string, string | null>
  redacted?: string[]
  missing?: string[]
  entity?: number
}

export const constantIsOn = (value: string | null | undefined): boolean => value != null && value !== '' && value !== '0'

// `assumed` lists the switches of one screen with the position the screen used to assume. While the answer loads `ready` is false;
// if the endpoint cannot answer (an older backend, a user who is not an admin) `on()` falls back to that assumed position.
// `valueNames` are constants whose stored text the screen shows as it is (a field, not a switch).
export function useSettingConstants(assumed: Record<string, boolean>, valueNames: string[] = []) {
  const names = [...Object.keys(assumed), ...valueNames]
  const query = useQuery({
    queryKey: ['settings', 'constants', ...names],
    queryFn: async () => (await fapiGet<ConstantsAnswer>('/core/fapi/constants.php', { names: names.join(',') })).values,
    staleTime: 1000 * 30,
    retry: false,
  })
  return {
    ready: !query.isLoading,
    fromServer: query.isSuccess,
    // The stored text of a constant, or null when it is not set / could not be read.
    value: (name: string): string | null => (query.data && name in query.data ? (query.data[name] ?? null) : null),
    on: (name: string): boolean => (query.data && name in query.data ? constantIsOn(query.data[name]) : (assumed[name] ?? false)),
  }
}
