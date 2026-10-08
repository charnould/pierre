export type DatastoreTableStatus = {
  name: string
  exists: boolean
}

export type DatastoreTablesResponse = {
  data: {
    tables: DatastoreTableStatus[]
  }
}
