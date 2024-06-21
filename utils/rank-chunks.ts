import { _ } from 'lodash'

export const rank_chunks = (arr) => {
  const flat = _.flattenDeep(arr)
  const grouped = _.groupBy(flat, 'id')

  const best = []
  for (const property in grouped) {
    const max = _.maxBy(grouped[property], 'score')
    best.push(max)
  }

  const rev = _.reverse(_.sortBy(best, ['score']))
  const final = []

  for (const r of rev) {
    // TODO: supprimer les "\n\t\t\t\t" ... ?
    final.push(r.chunk.replace(/\n/g, ' '))
  }

  return final
}
