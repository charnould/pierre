import PizZip from 'pizzip'

const build_time = JSON.stringify(new Date().toISOString())

// Write new version to disk
await Bun.write('./assets/core/bridge/version', build_time)

// Build Chrome extension
await Bun.build({
  entrypoints: ['./bridge/source/App.tsx'],
  outdir: 'bridge/chrome',
  target: 'browser',
  minify: true,
  define: { VERSION: build_time }
})

//
// Zip Chrome extension + save it to disk
//
const zip = new PizZip()

const icons = zip.folder('icons')

const icon128 = await Bun.file('bridge/chrome/icons/icon128.png').arrayBuffer()
const icon48 = await Bun.file('bridge/chrome/icons/icon48.png').arrayBuffer()
const icon32 = await Bun.file('bridge/chrome/icons/icon32.png').arrayBuffer()
const icon16 = await Bun.file('bridge/chrome/icons/icon16.png').arrayBuffer()
icons.file('icon128.png', icon128, { binary: true })
icons.file('icon48.png', icon48, { binary: true })
icons.file('icon32.png', icon32, { binary: true })
icons.file('icon16.png', icon16, { binary: true })

const background = await Bun.file('bridge/chrome/background.js').text()
const manifest = await Bun.file('bridge/chrome/manifest.json').text()
const app = await Bun.file('bridge/chrome/App.js').text()
zip.file('background.js', background)
zip.file('manifest.json', manifest)
zip.file('App.js', app)

const data = await zip.generate({ type: 'blob' }).bytes()
Bun.write('assets/core/bridge/chrome.zip', data)

console.log('✅ Bridge build!')

export {}
