import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { RepaymentMissingTableEmpty } from './RepaymentMissingTableEmpty'

describe('RepaymentMissingTableEmpty', () => {
  test('propose de créer un plan', () => {
    const html = renderToStaticMarkup(<RepaymentMissingTableEmpty onCreateCaseFile={() => {}} />)
    expect(html).toContain('Créer un dossier')
    expect(html).toContain('core.comptes_locataires.csv')
  })
})
