import { $ } from 'bun'

// Remove old files
await $`rm -rf assets/pierre-ia.org/dist/css`
await $`rm -rf assets/pierre-ia.org/dist/js`
await $`rm -f docs/assets/widget.js`

// Upgrade Bun and dependencies
await $`bun upgrade --stable && bun update && bun install`

// Generate README table of contents
await $`bunx markdown-toc --maxdepth 3 -i README.md`

// Transpile and minify .ts scripts into .js to work in browser
await $`bun build --entrypoints assets/pierre-ia.org/scripts/*.ts --outdir assets/pierre-ia.org/dist/js --minify --target browser`

// Compile production CSS files
await $`bunx @tailwindcss/cli@next -i assets/pierre-ia.org/tailwind/chat.css -o assets/pierre-ia.org/dist/css/chat.css --minify`
await $`bunx @tailwindcss/cli@next -i assets/pierre-ia.org/tailwind/admin.css -o assets/pierre-ia.org/dist/css/admin.css --minify`

// Copy transpile/minify widget.js in `docs` folder, aka PIERRE website
await $`cp assets/pierre-ia.org/dist/js/widget.js docs/assets`

// Lint, format, test code
await $`bun lint`
await $`bun format`
await $`bun test`

// Output something when finished
await $`echo ""`
await $`echo "---------------------"`
await $`echo "| Build successful! |"`
await $`echo "---------------------"`
await $`echo ""`
