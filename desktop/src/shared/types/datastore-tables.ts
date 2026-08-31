export type DatastoreTableStatus = {
  name: string
  exists: boolean
}

export type DatastoreTablesResponse = {
  tables: DatastoreTableStatus[]
}
