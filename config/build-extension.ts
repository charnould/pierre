import AdmZip from 'adm-zip'

const background = await Bun.build({
  entrypoints: ['./extension/chrome/background.ts'],
  target: 'browser',
  minify: true
})

const logic = await Bun.build({
  entrypoints: ['./extension/logic/index.tsx'],
  target: 'browser',
  minify: true
})

const zip = new AdmZip()

zip.addFile('background.js', Buffer.from(await background.outputs[0].arrayBuffer()))
zip.addFile('logic.js', Buffer.from(await logic.outputs[0].arrayBuffer()))
zip.addLocalFile('extension/chrome/manifest.json', '', 'manifest.json')
zip.addLocalFolder('./extension/chrome/icons/', './icons')
zip.writeZip('./assets/default/files/extension.zip')

// Unzip and overwrite
const unzip = new AdmZip('./assets/default/files/extension.zip')
unzip.extractAllTo('./assets/default/files/extension', true)

console.log(`✅ Extension web construite!`)
