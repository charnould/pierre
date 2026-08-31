export type TenantRepaymentRow = {
  id_locataire: string
  id_client: string
  solde_locataire: number
  ratio_dette_loyer?: number | null
} & Record<string, unknown>
