import { describe, expect, test } from 'bun:test'

import { createStreamingWordsPlugin } from '@/shared/lib/rehype-streaming-words'

type TestNode = {
  type: string
  value?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: TestNode[]
  position?: { start: { offset: number } }
}

function transform(text: string, previousLength = 0): TestNode {
  const tree: TestNode = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'p',
        children: [{ type: 'text', value: text, position: { start: { offset: 0 } } }]
      }
    ]
  }
  createStreamingWordsPlugin(previousLength)()(tree)
  return tree
}

function spans(tree: TestNode): TestNode[] {
  return tree.children?.[0]?.children ?? []
}

describe('createStreamingWordsPlugin', () => {
  test('wraps new words with staggered blur animation metadata', () => {
    const result = spans(transform('Bonjour tout le monde'))
    const animated = result.filter((node) => node.properties?.['data-pierre-stream-animate'])

    expect(animated).toHaveLength(4)
    expect(animated.map((node) => node.properties?.style)).toEqual([
      '--pierre-stream-delay:0ms',
      '--pierre-stream-delay:40ms',
      '--pierre-stream-delay:80ms',
      '--pierre-stream-delay:120ms'
    ])
  })

  test('keeps words before the committed source frontier settled', () => {
    const result = spans(transform('Bonjour monde', 'Bonjour '.length))
    const words = result.filter((node) => node.children?.[0]?.value?.trim())

    expect(words[0]?.properties?.['data-pierre-stream-shown']).toBe(true)
    expect(words[1]?.properties?.['data-pierre-stream-animate']).toBe(true)
  })

  test('animates only the newest 24 words in a large batch', () => {
    const result = spans(transform(Array.from({ length: 30 }, (_, index) => `w${index}`).join(' ')))
    const animated = result.filter((node) => node.properties?.['data-pierre-stream-animate'])
    const shown = result.filter(
      (node) => node.children?.[0]?.value?.trim() && node.properties?.['data-pierre-stream-shown']
    )

    expect(animated).toHaveLength(24)
    expect(shown).toHaveLength(6)
  })

  test('does not split code content into animation spans', () => {
    const tree: TestNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          children: [
            {
              type: 'element',
              tagName: 'code',
              children: [{ type: 'text', value: 'const answer = 42' }]
            }
          ]
        }
      ]
    }

    createStreamingWordsPlugin(0)()(tree)

    expect(tree.children?.[0]?.children?.[0]?.children?.[0]).toEqual({
      type: 'text',
      value: 'const answer = 42'
    })
  })

  test('does not insert spans directly inside structural markdown elements', () => {
    const whitespace = { type: 'text', value: '\n' }
    const tree: TestNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'table',
          children: [
            whitespace,
            {
              type: 'element',
              tagName: 'tbody',
              children: [
                {
                  type: 'element',
                  tagName: 'tr',
                  children: [
                    {
                      type: 'element',
                      tagName: 'td',
                      children: [{ type: 'text', value: 'Cell' }]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }

    createStreamingWordsPlugin(0)()(tree)

    expect(tree.children?.[0]?.children?.[0]).toBe(whitespace)
    expect(
      tree.children?.[0]?.children?.[1]?.children?.[0]?.children?.[0]?.children?.[0]?.tagName
    ).toBe('span')
  })

  test('derives stable keys from source offsets', () => {
    const first = spans(transform('Bonjour monde')).map(
      (node) => node.properties?.['data-pierre-stream-key']
    )
    const second = spans(transform('Bonjour monde encore')).map(
      (node) => node.properties?.['data-pierre-stream-key']
    )

    expect(second.slice(0, first.length)).toEqual(first)
  })
})
