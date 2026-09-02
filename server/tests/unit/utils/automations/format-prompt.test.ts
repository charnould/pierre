import { describe, expect, it, spyOn } from 'bun:test'

import * as oxfmt from 'oxfmt'

import { format_automation_prompt } from '../../../../utils/automations/format-prompt'

describe('format_automation_prompt', () => {
  it('returns empty without calling oxfmt for blank input', async () => {
    const format_spy = spyOn(oxfmt, 'format')
    try {
      expect(await format_automation_prompt('')).toBe('')
      expect(await format_automation_prompt('  \n\n  ')).toBe('')
      expect(format_spy).not.toHaveBeenCalled()
    } finally {
      format_spy.mockRestore()
    }
  })

  it('normalizes markdown via oxfmt', async () => {
    const messy = '-  item1\n-   item2\n\n**gras**  et   espaces'
    const formatted = await format_automation_prompt(messy)
    expect(formatted).toBe((await oxfmt.format('a.md', messy.trim())).code)
    expect(formatted).toContain('- item1')
    expect(formatted).toContain('- item2')
  })
})
