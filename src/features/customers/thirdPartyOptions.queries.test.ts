import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchSocieteFormContext } from './thirdPartyOptions.queries'

describe('fetchSocieteFormContext', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('extracts a token from a hidden input even when it contains uppercase characters', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<input type="hidden" name="token" value="ABCD1234EFGH5678">',
      }),
    )

    await expect(fetchSocieteFormContext()).resolves.toEqual({ token: 'ABCD1234EFGH5678' })
  })

  it('falls back to the societeToken global when the token input is not present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<script>var societeToken = "AbCd1234";</script>',
      }),
    )

    await expect(fetchSocieteFormContext()).resolves.toEqual({ token: 'AbCd1234' })
  })
})
