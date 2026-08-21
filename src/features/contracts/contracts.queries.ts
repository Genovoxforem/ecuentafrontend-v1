import { useLocalCollection, nextLocalRef, todayIso } from '../../shared/localCollection'
import { useLogActivity } from '../agenda/agenda.queries'

export interface ContractRow {
  ref: string
  refCustomer: string
  refVendor: string
  thirdParty: string
  salesRep: string
  contractDate: string
  endDateOfServices: string
  notRunning: number
  inProgress: number
  expired: number
  closed: number
}

export interface ContractsSummary {
  totalContracts: number
  createdThisMonth: number
  runningTotal: number
  startedThisMonth: number
  expiredCount: number
  expiredThisMonth: number
  closedCount: number
  followupsThisMonth: number
  contracts: ContractRow[]
}

const SEED: ContractsSummary = {
  totalContracts: 0,
  createdThisMonth: 0,
  runningTotal: 0,
  startedThisMonth: 0,
  expiredCount: 0,
  expiredThisMonth: 0,
  closedCount: 0,
  followupsThisMonth: 0,
  contracts: [],
}

const KEY = ['local', 'contracts'] as const

// No backend endpoint exists for contracts on this app's server (confirmed:
// contrat/list has no equivalent route). Held in react-query's cache only —
// see shared/localCollection.ts — so creating one here feels real in the
// browser but never persists anywhere.
export function useContractsSummary() {
  const [data] = useLocalCollection(KEY, SEED)
  return { data, isError: false, isLoading: false }
}

export interface NewContractInput {
  thirdParty: string
  refCustomer?: string
  refVendor?: string
  contractDate: string
  author: string
}

export function useCreateContract() {
  const [, update] = useLocalCollection(KEY, SEED)
  const logActivity = useLogActivity()
  return (input: NewContractInput) => {
    const row: ContractRow = {
      ref: nextLocalRef('(PROV-CT)'),
      refCustomer: input.refCustomer ?? '',
      refVendor: input.refVendor ?? '',
      thirdParty: input.thirdParty,
      salesRep: input.author,
      contractDate: input.contractDate || todayIso(),
      endDateOfServices: '',
      // New contracts start with no active service lines yet — "not
      // running" until services are added, mirroring the reference app.
      notRunning: 1,
      inProgress: 0,
      expired: 0,
      closed: 0,
    }
    update((current) => ({
      ...current,
      totalContracts: current.totalContracts + 1,
      createdThisMonth: current.createdThisMonth + 1,
      contracts: [row, ...current.contracts],
    }))
    logActivity({ label: `New contract ${row.ref} with ${row.thirdParty}`, category: 'contracts', authorName: input.author })
  }
}

// Individual service lines within a contract — same local-only convention
// as contracts themselves (no backend endpoint), kept as a separate
// collection since ContractRow has no line-item concept of its own.
export interface ContractServiceRow {
  ref: string
  contractRef: string
  service: string
  thirdParty: string
  plannedStart: string
  realStart: string
  plannedEnd: string
  realEnd: string
  status: 'Planned' | 'Running' | 'Closed'
}

const SERVICES_KEY = ['local', 'contractServices'] as const

export function useContractServices() {
  const [services] = useLocalCollection<ContractServiceRow[]>(SERVICES_KEY, [])
  return services
}

export interface NewContractServiceInput {
  contractRef: string
  service: string
  thirdParty: string
  plannedStart: string
  realStart: string
  plannedEnd: string
  realEnd: string
  status: ContractServiceRow['status']
}

export function useCreateContractService() {
  const [, update] = useLocalCollection<ContractServiceRow[]>(SERVICES_KEY, [])
  return (input: NewContractServiceInput) => {
    const row: ContractServiceRow = { ref: nextLocalRef('(SVC)'), ...input }
    update((cur) => [row, ...cur])
    return row
  }
}
