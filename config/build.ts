import { readdir } from 'node:fs/promises'
import { $ } from 'bun'
import toc from 'markdown-toc'

// A timestamp used in filename to avoid caching issue (CSS + JS)
const timestamp = Date.now()

// Remove old files
await $`rm -rf assets/default/dist/css`
await $`rm -rf assets/default/dist/js`
await $`rm -f docs/assets/widget.js`
await $`find . -name ".DS_Store" -type f -delete`

// Upgrade Bun and dependencies
await $`clear`
await $`bun upgrade --stable && bun update && bun install`

// Read all the files in the current directory recursively and for .md files,
// generate a table of contents if <!-- toc --> tag is available
const files = await readdir('./', { recursive: true })
for (const file of files) {
  if (!file.startsWith('node_modules') && file.endsWith('.md')) {
    const content = await Bun.file(file).text()
    const updated_content = toc.insert(content, {
      maxdepth: 3,
      // makes titles with accents work
      slugify: function slugify(value: string) {
        return value
          .toLowerCase()
          .trim()
          .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
          .replace(/\s/g, '-')
          .replace(/-$/, '') // fixes titles ending with '?'
      }
    })
    await Bun.write(file, updated_content)
  }
}

// Compile production CSS file
await $`bunx @tailwindcss/cli@latest -i assets/default/tailwind/style.css -o assets/default/dist/css/style.${timestamp}.css --minify`

// Transpile and minify .ts scripts into .js to work in browser.
// Rename one of these files (ai.js) to include a hash/timestamp (to avoid caching issue).
await $`bun build --entrypoints assets/default/scripts/*.ts --outdir assets/default/dist/js --minify --target browser`
await $`mv ./assets/default/dist/js/ai.js ./assets/default/dist/js/ai.${timestamp}.js`

// Update "timestamped filepath" in all Views
const views = await readdir('views')

for (const view of views) {
  const content = await Bun.file(`./views/${view}`).text()

  await Bun.write(
    `./views/${view}`,
    content
      .replace(
        /..\/assets\/default\/dist\/js\/ai\.\d+\.js/,
        `../assets/default/dist/js/ai.${timestamp}.js`
      )
      .replace(
        /..\/assets\/default\/dist\/css\/style\.\d+\.css/,
        `../assets/default/dist/css/style.${timestamp}.css`
      )
  )
}

// Copy transpiled/minified widget.js in `docs` folder, aka PIERRE website
await $`cp assets/default/dist/js/widget.js docs/assets`

// Lint, format, test code
await $`bun lint`
await $`bun format`
await $`bun test:unit`
await $`bun test:e2e`
await $`clear`

// Output something when done
console.log('\n')
console.log(`${Bun.color('green', 'ansi')}BUILD DONE!`)
console.log('\n')
