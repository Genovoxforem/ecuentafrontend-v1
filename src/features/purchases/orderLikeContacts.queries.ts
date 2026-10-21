/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import type { ContactRow, ContactFormOptions } from '../salesOrders/orderExtraTabTypes'

export interface OrderLikeContactsData {
  rows: ContactRow[]
  formOptions: ContactFormOptions
}

// The contacts tab of a module that follows the order contract (fourn/commande/fapi, supplier_proposal/fapi):
// GET contacts.php answers rows.internal / rows.external and the option lists the add form needs, POST
// ?action=add takes {id, source, fk_user | fk_socpeople, type_contact}.
export function useOrderLikeContacts(base: string, id: string | undefined, newcompany?: string) {
  return useQuery<OrderLikeContactsData>({
    queryKey: ['orderLike', base, 'detail', id, 'contacts', newcompany ?? ''],
    queryFn: async () => {
      const d = await fapiGet<any>(`${base}/contacts.php`, { id, newcompany })
      const opts = d.options ?? {}
      const mapRows = (list: any[]): ContactRow[] =>
        list.map((c) => ({
          nature: c.nature_label ?? (c.nature === 'internal' ? 'User' : 'Third-Party Contact'),
          thirdParty: c.thirdparty ?? '',
          contact: c.name ?? '',
          contactType: c.type_label ?? '',
          status: c.status_label ?? '',
        }))
      const toOpts = (list: any[], placeholder?: string) => {
        const out = (list ?? []).map((o: any) => ({ value: String(o.value ?? o.id), label: o.label ?? o.name ?? '' }))
        return placeholder ? [{ value: '-1', label: placeholder }, ...out] : out
      }
      return {
        rows: [...mapRows(d.rows?.internal ?? []), ...mapRows(d.rows?.external ?? [])],
        formOptions: {
          issuerCompanyName: opts.issuer_company ?? '',
          internalUserOptions: toOpts(opts.users),
          internalTypeOptions: toOpts(opts.internal_types),
          companyOptions: toOpts(opts.companies),
          selectedCompanyId: String(opts.selected_company ?? ''),
          externalContactOptions: toOpts(opts.company_contacts, 'Select contact'),
          hasRealExternalContact: (opts.company_contacts ?? []).length > 0,
          externalTypeOptions: toOpts(opts.external_types),
        },
      }
    },
    enabled: !!id,
  })
}

export function useAddOrderLikeContact(base: string, id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { source: 'internal' | 'external'; userid?: string; type?: string; contactid?: string; typecontact?: string }) => {
      const internal = input.source === 'internal'
      await fapiPost(
        `${base}/contacts.php`,
        {
          id: Number(id),
          source: input.source,
          ...(internal ? { fk_user: Number(input.userid) } : { fk_socpeople: Number(input.contactid) }),
          type_contact: Number((internal ? input.type : input.typecontact) || 0),
        },
        { action: 'add' },
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orderLike', base, 'detail', id, 'contacts'] }),
  })
}
