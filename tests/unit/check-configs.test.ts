import { expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { Config } from '../../utils/_schema'

test('check if configs parse successfully', async () => {
  const directories = (await readdir('assets')).filter((name) => name !== 'core')

  // Check official `config.ts` for each organization
  for await (const directory of directories) {
    const config = (await import(`../../assets/${directory}/config`)).default
    const check = Config.safeParse(config)

    if (check.error) {
      console.log(config)
      console.log(check.error)
      console.log(`❌ config.ts contient une ou des erreurs.`)
      console.log(`❌ Lire le message d'erreur ci-dessus.`)
    }

    expect(check.success).toBe(true)

    const answer = await Bun.file(`./assets/${directory}/prompts/answer.md`).text()
    const answer_has_community_materials = answer.includes('{{{community_materials}}}')
    const answer_has_internal_materials = answer.includes('{{{internal_materials}}}')
    const answer_has_user_query = answer.includes('{{{user_query}}}')
    const answer_has_today = answer.includes('{{{today}}}')
    const answer_has_lang = answer.includes('{{{lang}}}')

    if (!answer_has_community_materials)
      console.log(
        `❌ ${directory}/prompts/answer.md ne contient pas la variable {{{community_materials}}}.`
      )
    if (!answer_has_internal_materials)
      console.log(
        `❌ ${directory}/prompts/answer.md ne contient pas la variable {{{internal_materials}}}.`
      )
    if (!answer_has_user_query)
      console.log(`❌ ${directory}/prompts/answer.md ne contient pas la variable {{{user_query}}}.`)
    if (!answer_has_today)
      console.log(`❌ ${directory}/prompts/answer.md ne contient pas la variable {{{today}}}.`)
    if (!answer_has_lang)
      console.log(`❌ ${directory}/prompts/answer.md ne contient pas la variable {{{lang}}}.`)

    expect(answer_has_community_materials).toBe(true)
    expect(answer_has_internal_materials).toBe(true)
    expect(answer_has_user_query).toBe(true)
    expect(answer_has_today).toBe(true)
    expect(answer_has_lang).toBe(true)

    const deadlock = await Bun.file(`./assets/${directory}/prompts/deadlock.md`).text()
    const deadlock_has_today = deadlock.includes('{{{today}}}')
    const deadlock_has_lang = deadlock.includes('{{{lang}}}')

    if (!deadlock_has_today)
      console.log(`❌ ${directory}/prompts/deadlock.md ne contient pas la variable {{{today}}}.`)
    if (!deadlock_has_lang)
      console.log(`❌ ${directory}/prompts/deadlock.md ne contient pas la variable {{{lang}}}.`)

    expect(deadlock_has_today).toBe(true)
    expect(deadlock_has_lang).toBe(true)

    const profanity = await Bun.file(`./assets/${directory}/prompts/profanity.md`).text()
    const profanity_has_lang = profanity.includes('{{{lang}}}')

    if (!profanity_has_lang)
      console.log(`❌ ${directory}/prompts/profanity.md ne contient pas la variable {{{lang}}}.`)

    expect(profanity_has_lang).toBe(true)
  }
  console.log(`✅ config.ts est OK!`)
})
