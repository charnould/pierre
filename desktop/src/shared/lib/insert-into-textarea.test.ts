import { describe, expect, test } from 'bun:test'

import { insertIntoTextarea } from './insert-into-textarea'

function field(value: string, start: number, end = start) {
  const element = document.createElement('textarea')
  element.value = value
  document.body.append(element)
  element.setSelectionRange(start, end)
  return element
}

describe('insertIntoTextarea', () => {
  test('replaces the selection and separates words', () => {
    const element = field('bonjour monde', 7, 13)
    let seen = ''
    element.addEventListener('input', () => {
      seen = element.value
    })
    insertIntoTextarea(element, ' Pierre ')
    expect(element.value).toBe('bonjour Pierre')
    expect(element.selectionStart).toBe(element.value.length)
    expect(seen).toBe('bonjour Pierre')
    element.remove()
  })

  test('does not add a space before punctuation', () => {
    const element = field('bonjour', 7)
    insertIntoTextarea(element, '.')
    expect(element.value).toBe('bonjour.')
    element.remove()
  })
})
