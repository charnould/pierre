import _ from 'lodash'

export const rank_chunks = (arr) =>
  _.chain(arr)
    .flattenDeep()
    .groupBy('rowid')
    .map((group) => _.minBy(group, 'distance'))
    .sortBy('distance')
    .take(6)
    .map((r) => r.chunk.replace(/\n/g, ' ').trim())
    .value()
