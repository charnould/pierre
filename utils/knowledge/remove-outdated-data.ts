import { $ } from 'bun'
import type { Knowledge } from './_run'

export const remove_outdated_data = async (knowledge: Knowledge) => {
  try {
    await $`rm -rf ./datastores/__temp__`

    if (knowledge.community === true) {
      await $`rm -rf ./knowledge/wikipedia`
      await $`rm -rf ./knowledge/community.sqlite`
    }

    if (knowledge.proprietary === true) {
      await $`rm -rf ./datastores/__temp__`
      await $`rm -rf ./datastores/proprietary.public.sqlite`
      await $`rm -rf ./datastores/proprietary.private.sqlite`
    }

    console.log('✅ Cleaning done')
    return
  } catch (e) {
    console.log('🆘 Cleaning error')
    console.log(e)
  }
}
