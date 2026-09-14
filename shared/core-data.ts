export const CORE_DATA_CONTRACT = [
  {
    table: 'lots_locatifs',
    filename: 'core.lots_locatifs.csv',
    label: 'Patrimoine locatif et occupation courante'
  },
  {
    table: 'reclamations',
    filename: 'core.reclamations.csv',
    label: 'Réclamations, demandes et relation client'
  },
  {
    table: 'comptes_locataires',
    filename: 'core.comptes_locataires.csv',
    label: 'Écritures comptables des locataires'
  },
  {
    table: 'travaux',
    filename: 'core.travaux.csv',
    label: 'Bons de travaux et interventions'
  },
  {
    table: 'candidats',
    filename: 'core.candidats.csv',
    label: 'Candidats à l’attribution'
  }
] as const

export type DatastoreTable = (typeof CORE_DATA_CONTRACT)[number]['table']
export type CoreDataContract = (typeof CORE_DATA_CONTRACT)[number]

export const DATASTORE_TABLES = CORE_DATA_CONTRACT.map(({ table }) => table) as DatastoreTable[]

export const coreDataContractForFilename = (filename: string): CoreDataContract | null =>
  CORE_DATA_CONTRACT.find((contract) => contract.filename === filename) ?? null

export const resemblesCoreDataFilename = (filename: string): boolean =>
  filename.toLocaleLowerCase('en').startsWith('core.')
