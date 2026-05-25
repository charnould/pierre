export type UpdateAudience = 'dev' | 'product'

export interface UpdateEntry {
  slug: string
  title: string
  date: string
  audience: UpdateAudience
}
