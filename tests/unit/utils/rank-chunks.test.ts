import { expect, test } from 'bun:test'
import { flatten_vector_searches, pick_relevant_chunks } from '../../../utils/rank-chunks'

// prettier-ignore
// biome-ignore format: readability
const input_1 = [
    {
      community: [
        { rowid: 110, distance: 110.1, chunk: "community_110" },
        { rowid: 120, distance: 120.2, chunk: "community_120" },
        { rowid: 130, distance: 130.3, chunk: "community_130" },
      ],
      private: [
        { rowid: 210, distance: 210.1, chunk: "collaborators_210" },
        { rowid: 220, distance: 220.2, chunk: "collaborators_220" },
        { rowid: 230, distance: 230.3, chunk: "collaborators_230" },
      ],
      public: [
        { rowid: 310, distance: 310.1, chunk: "public_310" },
        { rowid: 320, distance: 320.2, chunk: "public_320" },
        { rowid: 330, distance: 330.3, chunk: "public_330" },
      ],
    },
    {
      community: [
        { rowid: 150, distance: 150.2, chunk: "community_150" },
        { rowid: 120, distance: 120.1, chunk: "community_120" },
        { rowid: 140, distance: 140.1, chunk: "community_140" },
      ],
      private: [
        { rowid: 220, distance: 220.7, chunk: "collaborators_220" },
        { rowid: 230, distance: 230.8, chunk: "collaborators_230" },
        { rowid: 240, distance: 240.1, chunk: "collaborators_240" },
      ],
      public: [
        { rowid: 330, distance: 330.7, chunk: "public_330" },
        { rowid: 340, distance: 340.5, chunk: "public_340" },
        { rowid: 350, distance: 350.8, chunk: "public_350" },
      ],
    },
    {
      community: [
        { rowid: 110, distance: 110.3, chunk: "community_110" },
        { rowid: 140, distance: 140.2, chunk: "community_140" },
        { rowid: 160, distance: 160.3, chunk: "community_160" },
      ],
      private: [
        { rowid: 240, distance: 240.1, chunk: "collaborators_240" },
        { rowid: 250, distance: 250.7, chunk: "collaborators_250" },
        { rowid: 260, distance: 260.9, chunk: "collaborators_260" },
      ],
      public: [
        { rowid: 350, distance: 350.1, chunk: "public_350" },
        { rowid: 360, distance: 360.7, chunk: "public_360" },
        { rowid: 370, distance: 370.9, chunk: "public_370" },
      ],
    },
  ]

//
//
//
//
//
//
//
// prettier-ignore
// biome-ignore format: readability
const input_2 = [
  {
    community : [
      { rowid: 364, distance: 0.9573508501052856,chunk: 'chunk_364' },
      { rowid: 191, distance: 0.9929383993148804, chunk: 'chunk_191' },
      { rowid: 163, distance: 0.9970697164535522, chunk: 'chunk_163' }
    ],
    private: [],  
    public: [] 
  },
  {
    community : [ 
      { rowid: 364, distance: 0.9809738993644714, chunk: 'chunk_364' },
      { rowid: 45, distance: 0.9918640851974487, chunk: 'chunk_45' },
      { rowid: 136, distance: 0.9931496977806091, chunk: 'chunk_136' }
    ],
    private: [],  
    public: [] 
  },
  {
    community : [ 
      { rowid: 364, distance: 0.9570896625518799, chunk: 'chunk_364' },
      { rowid: 45, distance: 0.9799457788467407, chunk: 'chunk_45' },
      { rowid: 46, distance: 0.9854297041893005, chunk: 'chunk_46' }
    ],
    private: [],  
    public: [] 
  },
  {
    community : [ 
      { rowid: 364, distance: 0.9625654816627502, chunk: 'chunk_364' },
      { rowid: 191, distance: 0.9885484576225281, chunk: 'chunk_191' },
      { rowid: 45, distance: 0.9943646192550659, chunk: 'chunk_45' }
    ],
    private: [],  
    public: [] 
  },
  {
    community : [ 
      { rowid: 163, distance: 0.9566802382469177, chunk: 'chunk_163' },
      { rowid: 156, distance: 1.005388617515564, chunk: 'chunk_156' },
      { rowid: 158, distance: 1.0095767974853516, chunk: 'chunk_158' }
    ],
    private: [],  
    public: [] 
  },
  {
    community : [ 
      { rowid: 191, distance: 0.9503848552703857, chunk: 'chunk_191' },
      { rowid: 364, distance: 0.9872623682022095, chunk: 'chunk_364' },
      { rowid: 148, distance: 1.019416093826294, chunk: 'chunk_148' }
    ],
    private: [],  
    public: [] 
  },
  {
    community : [ 
      { rowid: 166, distance: 1.010939598083496, chunk: 'chunk_166' },
      { rowid: 154, distance: 1.0257253646850586, chunk: 'chunk_154'  },
      { rowid: 165,  distance: 1.0343191623687744, chunk: 'chunk_165' }
    ],
    private: [],  
    public: [] 
  },
  {
    community : [
      { rowid: 198, distance: 1.0500069856643677, chunk: 'chunk_198\n\n' },
      { rowid: 191, distance: 1.0595762729644775, chunk: 'chunk_191\n' },
      { rowid: 626, distance: 1.0614837408065796, chunk: 'chunk_626\n\n\n' }
    ],
    private: [],  
    public: [] 
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
  { rowid: 75, distance: 0.1, chunk: 'chunk_75', source: 'public' },
  { rowid: 76, distance: 0.2, chunk: 'chunk_76', source: 'public' },
  { rowid: 78, distance: 0.3, chunk: 'chunk_78', source: 'public' },
  { rowid: 77, distance: 0.4, chunk: 'chunk_77', source: 'private' },
  { rowid: 1100, distance: 0.5, chunk: 'chunk_1100', source: 'private' },
  { rowid: 1200, distance: 0.6, chunk: 'chunk_1200', source: 'private' },
  { rowid: 1200, distance: 0.7, chunk: 'chunk_1200', source: 'public' },
  { rowid: 1300, distance: 0.8, chunk: 'chunk_1300', source: 'community' }
]

const chunk_scores = [
  { rowid: 75, source: 'public', score: 65 },
  { rowid: 76, source: 'public', score: 95 },
  { rowid: 78, source: 'public', score: 85 },
  { rowid: 1200, source: 'public', score: 88 },
  { rowid: 77, source: 'private', score: 5 },
  { rowid: 1100, source: 'private', score: 150 },
  { rowid: 1200, source: 'private', score: 140 },
  { rowid: 1300, source: 'community', score: 60 }
]

//
//
//
//
//
//
//

test('should flatten chunks 1', () => expect(flatten_vector_searches(input_1)).toMatchSnapshot())

test('should flatten chunks 2', () => expect(flatten_vector_searches(input_2)).toMatchSnapshot())

test('should keep only relevant', () =>
  expect(pick_relevant_chunks(chunks, chunk_scores)).toStrictEqual({
    private: ['chunk_1100', 'chunk_1200'],
    public: ['chunk_76', 'chunk_1200', 'chunk_78'],
    community: []
  }))
