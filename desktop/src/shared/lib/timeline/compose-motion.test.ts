import { describe, expect, test } from 'bun:test'

import { composePresenceProps } from './compose-motion'

describe('composePresenceProps', () => {
  test('keeps a vertical travel when motion is allowed', () => {
    expect(composePresenceProps(false).initial).toEqual({ opacity: 0, y: 8 })
    expect(composePresenceProps(false, true).initial).toEqual({ opacity: 0, y: 10 })
  })

  test('keeps an opacity fade when motion is reduced', () => {
    expect(composePresenceProps(true)).toEqual({
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] } },
      exit: { opacity: 0, transition: { duration: 0.1, ease: [0.23, 1, 0.32, 1] } }
    })
  })
})
