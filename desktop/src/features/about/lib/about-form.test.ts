import { describe, expect, test } from 'bun:test'

import { buildSynthesePayload } from '@/features/workflow/lib/workflow-payload'

import {
  ABOUT_SUBJECT_ENTITY,
  ABOUT_YEAR_END,
  ABOUT_YEAR_START,
  ABOUT_YEARS,
  aboutIdSkill,
  aboutOutputHeaderMeta,
  aboutOutputHeaderTitle,
  aboutPrimaryActionLabel,
  aboutYearRangeFromSliderValues,
  aboutYearRangeToSliderValues,
  buildAboutNavigationState,
  canSubmitAboutForm,
  defaultAboutFormFields,
  isValidAboutSubject,
  isValidAboutYear,
  isValidAboutYearRange,
  parseAboutYear,
  shouldAutoOpenAboutOutputStep,
  shouldClearAboutOutputOnSubjectChange
} from './about-form'

describe('ABOUT_YEARS', () => {
  test('covers 2000 through 2029', () => {
    expect(ABOUT_YEARS).toHaveLength(30)
    expect(ABOUT_YEARS[0]).toBe('2000')
    expect(ABOUT_YEARS.at(-1)).toBe('2029')
    expect(ABOUT_YEAR_END).toBe(2029)
    expect(ABOUT_YEAR_START).toBe(2000)
  })
})

describe('aboutYearRangeToSliderValues', () => {
  test('maps valid years to slider tuple', () => {
    expect(aboutYearRangeToSliderValues('2015', '2020')).toEqual([2015, 2020])
  })

  test('sorts inverted bounds and clamps invalid input', () => {
    expect(aboutYearRangeToSliderValues('2020', '2015')).toEqual([2015, 2020])
    expect(aboutYearRangeToSliderValues('1999', '2030')).toEqual([2000, 2029])
    expect(aboutYearRangeToSliderValues('', 'abc')).toEqual([2000, 2029])
  })
})

describe('aboutYearRangeFromSliderValues', () => {
  test('serializes slider tuple to year strings', () => {
    expect(aboutYearRangeFromSliderValues([2015, 2020])).toEqual({
      yearFrom: '2015',
      yearTo: '2020'
    })
  })
})

describe('ABOUT_SUBJECT_ENTITY', () => {
  test('defines labels and placeholders for every subject', () => {
    expect(ABOUT_SUBJECT_ENTITY.locataire.label).toContain('locataire')
    expect(ABOUT_SUBJECT_ENTITY.lot.placeholder).toContain('LOT')
    expect(ABOUT_SUBJECT_ENTITY.programme.label).toContain('programme')
  })
})

describe('parseAboutYear', () => {
  test('parses valid year strings', () => {
    expect(parseAboutYear('2000')).toBe(2000)
    expect(parseAboutYear('2029')).toBe(2029)
  })

  test('returns null for invalid input', () => {
    expect(parseAboutYear('')).toBe(null)
    expect(parseAboutYear('abc')).toBe(null)
  })
})

describe('isValidAboutYear', () => {
  test('accepts years in the supported range', () => {
    expect(isValidAboutYear('2000')).toBe(true)
    expect(isValidAboutYear('2029')).toBe(true)
  })

  test('rejects out-of-range or invalid years', () => {
    expect(isValidAboutYear('1999')).toBe(false)
    expect(isValidAboutYear('2030')).toBe(false)
    expect(isValidAboutYear('')).toBe(false)
  })
})

describe('isValidAboutYearRange', () => {
  test('accepts ordered inclusive ranges', () => {
    expect(isValidAboutYearRange('2015', '2020')).toBe(true)
    expect(isValidAboutYearRange('2020', '2020')).toBe(true)
  })

  test('rejects inverted or invalid ranges', () => {
    expect(isValidAboutYearRange('2020', '2015')).toBe(false)
    expect(isValidAboutYearRange('abc', '2020')).toBe(false)
  })
})

describe('canSubmitAboutForm', () => {
  test('requires trimmed entity id and valid year range', () => {
    expect(canSubmitAboutForm('LOC-1', '2000', '2029')).toBe(true)
    expect(canSubmitAboutForm('  LOC-1  ', '2015', '2020')).toBe(true)
  })

  test('rejects empty entity id', () => {
    expect(canSubmitAboutForm('', '2000', '2029')).toBe(false)
    expect(canSubmitAboutForm('   ', '2000', '2029')).toBe(false)
  })

  test('rejects invalid year range', () => {
    expect(canSubmitAboutForm('LOC-1', '2020', '2015')).toBe(false)
    expect(canSubmitAboutForm('LOC-1', '', '2029')).toBe(false)
  })
})

describe('isValidAboutSubject', () => {
  test('accepts known subjects', () => {
    expect(isValidAboutSubject('locataire')).toBe(true)
    expect(isValidAboutSubject('lot')).toBe(true)
    expect(isValidAboutSubject('programme')).toBe(true)
  })

  test('rejects unknown values', () => {
    expect(isValidAboutSubject('immeuble')).toBe(false)
    expect(isValidAboutSubject('')).toBe(false)
  })
})

describe('aboutIdSkill', () => {
  test('maps all subjects to about.summary', () => {
    expect(aboutIdSkill('locataire')).toBe('about.summary')
    expect(aboutIdSkill('lot')).toBe('about.summary')
    expect(aboutIdSkill('programme')).toBe('about.summary')
  })
})

describe('defaultAboutFormFields', () => {
  test('returns locataire with empty id and full default range', () => {
    expect(defaultAboutFormFields()).toEqual({
      aboutSubject: 'locataire',
      entityId: '',
      yearFrom: '2000',
      yearTo: '2029',
      context: ''
    })
  })
})

describe('buildAboutNavigationState', () => {
  test('merges step with form fields', () => {
    expect(
      buildAboutNavigationState('output', {
        aboutSubject: 'lot',
        entityId: 'LOT-1',
        yearFrom: '2010',
        yearTo: '2020',
        context: 'Notes'
      })
    ).toEqual({
      step: 'output',
      aboutSubject: 'lot',
      entityId: 'LOT-1',
      yearFrom: '2010',
      yearTo: '2020',
      context: 'Notes'
    })
  })
})

describe('shouldClearAboutOutputOnSubjectChange', () => {
  test('clears when subject changes in output while idle', () => {
    expect(shouldClearAboutOutputOnSubjectChange('locataire', 'lot', true, false)).toBe(true)
  })

  test('does not clear on first render', () => {
    expect(shouldClearAboutOutputOnSubjectChange(null, 'locataire', true, false)).toBe(false)
  })

  test('does not clear when subject unchanged', () => {
    expect(shouldClearAboutOutputOnSubjectChange('lot', 'lot', true, false)).toBe(false)
  })

  test('does not clear while streaming', () => {
    expect(shouldClearAboutOutputOnSubjectChange('locataire', 'lot', true, true)).toBe(false)
  })

  test('does not clear outside output step', () => {
    expect(shouldClearAboutOutputOnSubjectChange('locataire', 'lot', false, false)).toBe(false)
  })
})

describe('aboutPrimaryActionLabel', () => {
  test('switches between generate and regenerate labels', () => {
    expect(aboutPrimaryActionLabel(false)).toBe('Générer la synthèse')
    expect(aboutPrimaryActionLabel(true)).toBe('Regénérer la synthèse')
  })
})

describe('shouldAutoOpenAboutOutputStep', () => {
  test('opens output when no snapshot was applied and step is form', () => {
    expect(shouldAutoOpenAboutOutputStep('form', false)).toBe(true)
  })

  test('skips when snapshot already applied', () => {
    expect(shouldAutoOpenAboutOutputStep('form', true)).toBe(false)
  })

  test('skips when already on output', () => {
    expect(shouldAutoOpenAboutOutputStep('output', false)).toBe(false)
  })
})

describe('aboutOutputHeaderTitle', () => {
  test('includes subject and trimmed identifiant', () => {
    expect(aboutOutputHeaderTitle('locataire', '  LOC-1  ')).toBe('Synthèse locataire · LOC-1')
    expect(aboutOutputHeaderTitle('lot', '')).toBe('Synthèse lot')
  })
})

describe('aboutOutputHeaderMeta', () => {
  test('returns period label for valid range', () => {
    expect(aboutOutputHeaderMeta('2015', '2020')).toBe('2015 – 2020')
    expect(aboutOutputHeaderMeta('2015', '2015')).toBe('2015')
    expect(aboutOutputHeaderMeta('abc', '2020')).toBe(null)
  })
})

describe('about synthese wire payload', () => {
  test('navigation form fields serialize to synthese payload', () => {
    const state = buildAboutNavigationState('output', {
      aboutSubject: 'programme',
      entityId: ' PRG-001 ',
      yearFrom: '2018',
      yearTo: '2020',
      context: 'Contexte test'
    })

    expect(canSubmitAboutForm(state.entityId, state.yearFrom, state.yearTo)).toBe(true)

    const payload = buildSynthesePayload({
      about_subject: state.aboutSubject,
      identifiant: state.entityId.trim(),
      year_from: parseAboutYear(state.yearFrom)!,
      year_to: parseAboutYear(state.yearTo)!,
      context: state.context
    })

    expect(payload).toEqual({
      version: 1,
      workflow: 'synthese',
      about_subject: 'programme',
      identifiant: 'PRG-001',
      year_from: 2018,
      year_to: 2020,
      context: 'Contexte test'
    })
  })
})
