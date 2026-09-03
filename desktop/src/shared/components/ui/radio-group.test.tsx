import { expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { RadioGroup, RadioGroupItem } from './radio-group'

test('keeps a visible keyboard focus ring inside option labels', () => {
  const markup = renderToStaticMarkup(
    <RadioGroup defaultValue="one">
      <RadioGroupItem value="one" aria-label="Option one" />
    </RadioGroup>
  )

  expect(markup).toContain('focus-visible:ring-3')
  expect(markup).not.toContain('group-has-[:focus-visible]/field-label:ring-0')
})
