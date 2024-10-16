import { $ } from 'bun'
import toc from 'markdown-toc'

// Remove old files
await $`rm -rf assets/pierre-ia.org/dist/fonts`
await $`rm -rf assets/pierre-ia.org/dist/css`
await $`rm -rf assets/pierre-ia.org/dist/js`
await $`rm -f docs/assets/widget.js`
await $`find . -name ".DS_Store" -type f -delete` // Delete all .DS_Store

// Upgrade Bun and dependencies
await $`bun upgrade --stable && bun update && bun install`

// gem "kamal", ">= 2.2.2"

// Generate README table of contents
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

// Transpile and minify .ts scripts into .js to work in browser
await $`bun build --entrypoints assets/pierre-ia.org/scripts/*.ts --outdir assets/pierre-ia.org/dist/js --minify --target browser`

// Compile production CSS file
await $`bunx @tailwindcss/cli@next -i assets/pierre-ia.org/tailwind/style.css -o assets/pierre-ia.org/dist/css/style.css --minify`

// Copy fonts in production `dist` folder
await $`cp -r assets/pierre-ia.org/fonts assets/pierre-ia.org/dist/fonts`

// Copy transpile/minify widget.js in `docs` folder, aka PIERRE website
await $`cp assets/pierre-ia.org/dist/js/widget.js docs/assets`

// Lint, format, test code
await $`bun lint`
await $`bun format`
await $`bun test`
await $`clear`

// Output something when done
// Ascii generator: https://www.asciiart.eu/text-to-ascii-art (ANSI Shadow)
console.log(`


██████╗ ██╗   ██╗██╗██╗     ██████╗   
██╔══██╗██║   ██║██║██║     ██╔══██╗  
██████╔╝██║   ██║██║██║     ██║  ██║  
██╔══██╗██║   ██║██║██║     ██║  ██║  
██████╔╝╚██████╔╝██║███████╗██████╔╝  
╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝   
                                      
██████╗  ██████╗ ███╗   ██╗███████╗██╗
██╔══██╗██╔═══██╗████╗  ██║██╔════╝██║
██║  ██║██║   ██║██╔██╗ ██║█████╗  ██║
██║  ██║██║   ██║██║╚██╗██║██╔══╝  ╚═╝
██████╔╝╚██████╔╝██║ ╚████║███████╗██╗
╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝

    You can safely close your shell.


`)
