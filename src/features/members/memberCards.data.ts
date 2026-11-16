import { useMutation, useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument, legacyRefusalMessages, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'

// adherents/cartes/carte.php — "Generate visit cards" (classic page, no JSON API). Seen on newecuenta on 6 Nov 2026: three forms that post to the
// same address with action=builddoc and a token:
//   mode=card       foruserid=all        model=<format>        business cards for all members
//   mode=cardlogin  foruserlogin=<login> model=<format>        business cards for one member
//   mode=label                           modellabel=<format>   address sheets
// The format selects list the label sheets the backend knows (a blank first option; address sheets preselect Avery-L7163). The backend answers with
// the PDF; when it refuses (no member, no format) it answers the page with the reason. The Build Doc button was not pressed on newecuenta.

export interface CardFormat {
  value: string
  label: string
}

export interface CardFormOptions {
  cardFormats: CardFormat[]
  labelFormats: CardFormat[]
  labelDefault: string
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()
const optionsOf = (sel: HTMLSelectElement | null | undefined): CardFormat[] => Array.from(sel?.options ?? []).map((o) => ({ value: o.value.trim(), label: clean(o.textContent) }))

const PATH = '/adherents/cartes/carte.php'

let token = ''

export function useCardFormOptions() {
  return useQuery({
    queryKey: ['members', 'cardFormOptions'],
    queryFn: async (): Promise<CardFormOptions> => {
      const doc = await fetchLegacyDocument(PATH, new URLSearchParams({ leftmenu: 'export' }))
      token = doc.querySelector<HTMLInputElement>('input[name="mode"][value="card"]')?.form?.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? ''
      const labelSel = doc.querySelector<HTMLSelectElement>('select[name="modellabel"]')
      return {
        cardFormats: optionsOf(doc.querySelector<HTMLSelectElement>('select[name="model"]')),
        labelFormats: optionsOf(labelSel),
        labelDefault: labelSel?.selectedOptions[0]?.value.trim() ?? '',
      }
    },
    staleTime: 0,
  })
}

export interface BuildCardsInput {
  mode: 'card' | 'cardlogin' | 'label'
  format: string
  login?: string
}

// Builds the document and hands the PDF to the browser as a download.
export function useBuildCards() {
  return useMutation({
    mutationFn: async (i: BuildCardsInput): Promise<void> => {
      if (!i.format) throw new Error('Select the format of the cards page first.')
      if (i.mode === 'cardlogin' && !i.login?.trim()) throw new Error('Enter the login of the member.')
      if (!token) throw new Error('The backend page did not give a form token.')
      const body = new URLSearchParams({ token, mode: i.mode, action: 'builddoc' })
      if (i.mode === 'card') body.set('foruserid', 'all')
      if (i.mode === 'cardlogin') body.set('foruserlogin', i.login!.trim())
      body.set(i.mode === 'label' ? 'modellabel' : 'model', i.format)
      const res = await fetch(PATH, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      if (/pdf/i.test(res.headers.get('content-type') ?? '')) {
        const url = URL.createObjectURL(await res.blob())
        const a = document.createElement('a')
        a.href = url
        a.download = i.mode === 'label' ? 'address-sheets.pdf' : 'business-cards.pdf'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
        return
      }
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const refusal = legacyRefusalMessages(html)
      throw new Error(refusal.length > 0 ? refusal.join('\n') : 'The backend did not return a document.')
    },
  })
}
