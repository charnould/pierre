import { readdir } from 'node:fs/promises'
import { $ } from 'bun'
import toc from 'markdown-toc'

// A timestamp used in filename to avoid caching issue (CSS + JS)
const timestamp = Date.now()

// Remove old files
await $`rm -rf assets/pierre-ia.org/dist/css`
await $`rm -rf assets/pierre-ia.org/dist/js`
await $`rm -f docs/assets/widget.js`
await $`find . -name ".DS_Store" -type f -delete`

// Upgrade Bun and dependencies
await $`clear`
await $`bun upgrade --stable && bun update && bun install`

// Generate README table of contents
// TODO: Some links still do not work
const content = await Bun.file('README.md').text()
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
await Bun.write('README.md', updated_content)

// Compile production CSS file
await $`bunx @tailwindcss/cli@next -i assets/pierre-ia.org/tailwind/style.css -o assets/pierre-ia.org/dist/css/style.${timestamp}.css --minify`

// Transpile and minify .ts scripts into .js to work in browser.
// Rename one of these files (ai.js) to include a hash/timestamp (to avoid caching issue).
await $`bun build --entrypoints assets/pierre-ia.org/scripts/*.ts --outdir assets/pierre-ia.org/dist/js --minify --target browser`
await $`mv ./assets/pierre-ia.org/dist/js/ai.js ./assets/pierre-ia.org/dist/js/ai.${timestamp}.js`

// Update "timestamped filepath" in all Views
const views = await readdir('views')

for (const view of views) {
  const content = await Bun.file(`./views/${view}`).text()

  await Bun.write(
    `./views/${view}`,
    content
      .replace(
        /..\/assets\/pierre-ia\.org\/dist\/js\/ai\.\d+\.js/,
        `../assets/pierre-ia.org/dist/js/ai.${timestamp}.js`
      )
      .replace(
        /..\/assets\/pierre-ia\.org\/dist\/css\/style\.\d+\.css/,
        `../assets/pierre-ia.org/dist/css/style.${timestamp}.css`
      )
  )
}

// Copy transpiled/minified widget.js in `docs` folder, aka PIERRE website
await $`cp assets/pierre-ia.org/dist/js/widget.js docs/assets`

// Lint, format, test code
await $`bun lint`
await $`bun format`
await $`bun test:unit`
await $`bun test access-protected-context.test --timeout 60000`
await $`bun test connect-and-browse-admin.test --timeout 60000`
await $`bun test file-upload.test --timeout 60000`
await $`bun test redirect-wrong-url.test --timeout 60000`

await $`clear`

// Output something when done
console.log('\n')
console.log(`${Bun.color('green', 'ansi')}BUILD DONE!`)
console.log('\n')
