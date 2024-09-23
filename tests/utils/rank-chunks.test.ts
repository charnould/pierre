import { expect, test } from 'bun:test'
import { rank_chunks } from '../../utils/rank-chunks'

const input = [
  [
    {
      rowid: 364,
      distance: 0.9573508501052856,
      chunk: 'chunk_364'
    },
    {
      rowid: 191,
      distance: 0.9929383993148804,
      chunk: 'chunk_191'
    },
    {
      rowid: 163,
      distance: 0.9970697164535522,
      chunk: 'chunk_163'
    }
  ],
  [
    {
      rowid: 364,
      distance: 0.9809738993644714,
      chunk: 'chunk_364'
    },
    {
      rowid: 45,
      distance: 0.9918640851974487,
      chunk: 'chunk_45'
    },
    {
      rowid: 136,
      distance: 0.9931496977806091,
      chunk: 'chunk_136'
    }
  ],
  [
    {
      rowid: 364,
      distance: 0.9570896625518799,
      chunk: 'chunk_364'
    },
    {
      rowid: 45,
      distance: 0.9799457788467407,
      chunk: 'chunk_45'
    },
    {
      rowid: 46,
      distance: 0.9854297041893005,
      chunk: 'chunk_46'
    }
  ],
  [
    {
      rowid: 364,
      distance: 0.9625654816627502,
      chunk: 'chunk_364'
    },
    {
      rowid: 191,
      distance: 0.9885484576225281,
      chunk: 'chunk_191'
    },
    {
      rowid: 45,
      distance: 0.9943646192550659,
      chunk: 'chunk_45'
    }
  ],
  [
    {
      rowid: 163,
      distance: 0.9566802382469177,
      chunk: 'chunk_163'
    },
    {
      rowid: 156,
      distance: 1.005388617515564,
      chunk: 'chunk_156'
    },
    {
      rowid: 158,
      distance: 1.0095767974853516,
      chunk: 'chunk_158'
    }
  ],
  [
    {
      rowid: 191,
      distance: 0.9503848552703857,
      chunk: 'chunk_191'
    },
    {
      rowid: 364,
      distance: 0.9872623682022095,
      chunk: 'chunk_364'
    },
    {
      rowid: 148,
      distance: 1.019416093826294,
      chunk: 'chunk_148'
    }
  ],
  [
    {
      rowid: 166,
      distance: 1.010939598083496,
      chunk: 'chunk_166'
    },
    {
      rowid: 154,
      distance: 1.0257253646850586,
      chunk: 'chunk_154'
    },
    {
      rowid: 165,
      distance: 1.0343191623687744,
      chunk: 'chunk_165'
    }
  ],
  [
    {
      rowid: 198,
      distance: 1.0500069856643677,
      chunk: 'chunk_198\n\n'
    },
    {
      rowid: 191,
      distance: 1.0595762729644775,
      chunk: 'chunk_191\n'
    },
    {
      rowid: 626,
      distance: 1.0614837408065796,
      chunk: 'chunk_626\n\n\n'
    }
  ]
]

const output: string[] = [
  'chunk_191',
  'chunk_163',
  'chunk_364',
  'chunk_45',
  'chunk_46',
  'chunk_136'
]

test('Rerank', () => expect(rank_chunks(input)).toEqual(output))
