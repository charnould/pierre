import { describe, expect, it, spyOn } from 'bun:test'

import { format_automation_prompt } from '../../../../utils/automations/format-prompt'
import * as format_text from '../../../../utils/format-text'

describe('format_automation_prompt', () => {
  it('returns empty without formatting blank input', async () => {
    const format_spy = spyOn(format_text, 'formatText')
    try {
      expect(await format_automation_prompt('')).toBe('')
      expect(await format_automation_prompt('  \n\n  ')).toBe('')
      expect(format_spy).not.toHaveBeenCalled()
    } finally {
      format_spy.mockRestore()
    }
  })

  it('normalizes markdown', async () => {
    const messy = '-  item1\n-   item2\n\n**gras**  et   espaces'
    const formatted = await format_automation_prompt(messy)
    expect(formatted).toContain('- item1')
    expect(formatted).toContain('- item2')
    expect(formatted).toContain('**gras**')
  })
})
