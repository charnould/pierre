import { expect, it } from 'bun:test'
import { flatten_searches, pick_relevant_chunks } from '../../../utils/rank-chunks'

const input = [
  {
    community: [
      {
        chunk_hash: 'hash_a',
        entity_hash: 'none',
        distance: 0.01,
        chunk_text: 'text_a',
        chunk_file: 'file_a'
      },
      {
        chunk_hash: 'hash_b',
        entity_hash: 'none',
        distance: 0.02,
        chunk_text: 'text_b',
        chunk_file: 'file_b'
      },
      {
        chunk_hash: 'hash_c',
        entity_hash: 'none',
        distance: 0.03,
        chunk_text: 'text_c',
        chunk_file: 'file_c'
      }
    ],
    proprietary: [
      {
        chunk_hash: 'hash_1',
        entity_hash: 'entity_1',
        distance: 0.01,
        chunk_text: 'text_1',
        chunk_file: 'file_1'
      },
      {
        chunk_hash: 'hash_2',
        entity_hash: 'entity_1',
        distance: 0.02,
        chunk_text: 'text_2',
        chunk_file: 'file_2'
      },
      {
        chunk_hash: 'hash_3',
        entity_hash: 'entity_2',
        distance: 0.03,
        chunk_text: 'text_3',
        chunk_file: 'file_3'
      }
    ]
  },
  {
    community: [
      {
        chunk_hash: 'hash_d',
        entity_hash: 'none',
        distance: 0.03,
        chunk_text: 'text_d',
        chunk_file: 'file_d'
      },
      {
        chunk_hash: 'hash_e',
        entity_hash: 'none',
        distance: 0.02,
        chunk_text: 'text_e',
        chunk_file: 'file_e'
      },
      {
        chunk_hash: 'hash_f',
        entity_hash: 'none',
        distance: 0.01,
        chunk_text: 'text_f',
        chunk_file: 'file_f'
      }
    ],
    proprietary: [
      {
        chunk_hash: 'hash_7',
        entity_hash: 'entity_6',
        distance: 0.01,
        chunk_text: 'text_7',
        chunk_file: 'file_7'
      },
      {
        chunk_hash: 'hash_8',
        entity_hash: 'entity_6',
        distance: 0.02,
        chunk_text: 'text_8',
        chunk_file: 'file_8'
      },
      {
        chunk_hash: 'hash_9',
        entity_hash: 'entity_6',
        distance: 0.03,
        chunk_text: 'text_9',
        chunk_file: 'file_9'
      }
    ]
  }
]

//
//
//
//
//
//
//
const chunks = [
  {
    score: 100,
    chunk_file: 'file_75',

    chunk_text: 'chunk_75',
    source: 'proprietary'
  },
  {
    score: 1000,
    chunk_file: 'file_76',
    chunk_text: 'chunk_76',
    source: 'proprietary'
  },
  {
    score: 0,
    chunk_file: 'file_78',
    chunk_text: 'chunk_78',
    source: 'proprietary'
  },
  {
    score: 630,
    chunk_file: 'file_77',
    chunk_text: 'chunk_77',
    source: 'proprietary'
  },
  {
    score: 0,
    chunk_file: 'file_1100',
    chunk_text: 'chunk_1100',
    source: 'proprietary'
  },
  {
    score: 600,
    chunk_file: 'file_1200',
    chunk_text: 'chunk_1200',
    source: 'proprietary'
  },
  {
    score: 0,
    chunk_text: 'chunk_1200',
    chunk_file: 'file_1200',
    source: 'proprietary'
  },
  {
    score: 800,
    chunk_file: 'file_1300',
    chunk_text: 'chunk_1300',
    source: 'community'
  }
]

//
//
//
//
//
//
//

it('should flatten chunks 1', () => expect(flatten_searches(input)).toMatchSnapshot())

it('should keep only relevant chunks', () =>
  expect(pick_relevant_chunks(chunks)).toStrictEqual({
    proprietary: [
      {
        chunk_file: 'file_76',
        chunk_text: 'chunk_76'
      },
      {
        chunk_file: 'file_77',
        chunk_text: 'chunk_77'
      },
      {
        chunk_file: 'file_1200',
        chunk_text: 'chunk_1200'
      }
    ],
    community: [
      {
        chunk_file: 'file_1300',
        chunk_text: 'chunk_1300'
      }
    ]
  }))
