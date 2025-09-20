import { expect, it } from 'bun:test'
import { flatten_vector_searches, pick_relevant_chunks } from '../../../utils/rank-chunks'

const input = [
  {
    community: [
      {
        chunk_hash: 'hash_a',
        entity_hash: 'none',
        distance: 0.01,
        chunk_text: 'text_a'
      },
      {
        chunk_hash: 'hash_b',
        entity_hash: 'none',
        distance: 0.02,
        chunk_text: 'text_b'
      },
      {
        chunk_hash: 'hash_c',
        entity_hash: 'none',
        distance: 0.03,
        chunk_text: 'text_c'
      }
    ],
    private: [
      {
        chunk_hash: 'hash_1',
        entity_hash: 'entity_1',
        distance: 0.01,
        chunk_text: 'text_1'
      },
      {
        chunk_hash: 'hash_2',
        entity_hash: 'entity_1',
        distance: 0.02,
        chunk_text: 'text_2'
      },
      {
        chunk_hash: 'hash_3',
        entity_hash: 'entity_2',
        distance: 0.03,
        chunk_text: 'text_3'
      }
    ],
    public: [
      {
        chunk_hash: 'hash_4',
        entity_hash: 'entity_3',
        distance: 0.02,
        chunk_text: 'text_4'
      },
      {
        chunk_hash: 'hash_5',
        entity_hash: 'entity_4',
        distance: 0.03,
        chunk_text: 'text_5'
      },
      {
        chunk_hash: 'hash_6',
        entity_hash: 'entity_5',
        distance: 0.04,
        chunk_text: 'text_6'
      }
    ]
  },
  {
    community: [
      {
        chunk_hash: 'hash_d',
        entity_hash: 'none',
        distance: 0.03,
        chunk_text: 'text_d'
      },
      {
        chunk_hash: 'hash_e',
        entity_hash: 'none',
        distance: 0.02,
        chunk_text: 'text_e'
      },
      {
        chunk_hash: 'hash_f',
        entity_hash: 'none',
        distance: 0.01,
        chunk_text: 'text_f'
      }
    ],
    private: [
      {
        chunk_hash: 'hash_7',
        entity_hash: 'entity_6',
        distance: 0.01,
        chunk_text: 'text_7'
      },
      {
        chunk_hash: 'hash_8',
        entity_hash: 'entity_6',
        distance: 0.02,
        chunk_text: 'text_8'
      },
      {
        chunk_hash: 'hash_9',
        entity_hash: 'entity_6',
        distance: 0.03,
        chunk_text: 'text_9'
      }
    ],
    public: [
      {
        chunk_hash: 'hash_4',
        entity_hash: 'entity_1',
        distance: 0.001,
        chunk_text: 'text_1'
      },
      {
        chunk_hash: 'hash_5',
        entity_hash: 'entity_1',
        distance: 0.2,
        chunk_text: 'text_2'
      },
      {
        chunk_hash: 'hash_6',
        entity_hash: 'entity_2',
        distance: 0.003,
        chunk_text: 'text_3'
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
    chunk_text: 'chunk_75',
    source: 'public'
  },
  {
    score: 1000,
    chunk_text: 'chunk_76',
    source: 'public'
  },
  {
    score: 0,
    chunk_text: 'chunk_78',
    source: 'public'
  },
  {
    score: 630,
    chunk_text: 'chunk_77',
    source: 'private'
  },
  {
    score: 0,
    chunk_text: 'chunk_1100',
    source: 'private'
  },
  {
    score: 600,
    chunk_text: 'chunk_1200',
    source: 'private'
  },
  {
    score: 0,
    chunk_text: 'chunk_1200',
    source: 'public'
  },
  {
    score: 800,
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

it('should flatten chunks 1', () => expect(flatten_vector_searches(input)).toMatchSnapshot())

it('should keep only relevant', () =>
  expect(pick_relevant_chunks(chunks)).toStrictEqual({
    private: ['chunk_77', 'chunk_1200'],
    public: ['chunk_76'],
    community: ['chunk_1300']
  }))
