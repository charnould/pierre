const SIZE = 1200
const campaignsUrl = new URL('../campaigns/', import.meta.url)
const campaignsDirectory = Bun.fileURLToPath(campaignsUrl)
const requested = Bun.argv.slice(2)

const sources = Array.from(
  new Bun.Glob('*/poster.html').scanSync({ cwd: campaignsDirectory, onlyFiles: true })
)
  .filter((source) => requested.length === 0 || requested.includes(source.split('/')[0] ?? ''))
  .sort()

if (sources.length === 0) {
  throw new Error(
    requested.length === 0 ? 'Aucune campagne.' : `Aucune affiche pour : ${requested.join(', ')}`
  )
}

const view = new Bun.WebView({
  backend: { type: 'chrome', url: false },
  dataStore: 'ephemeral',
  width: SIZE,
  height: SIZE
})

try {
  await view.navigate('about:blank')
  await view.cdp('Emulation.setDeviceMetricsOverride', {
    width: SIZE,
    height: SIZE,
    deviceScaleFactor: 1,
    mobile: false
  })

  for (const source of sources) {
    const sourceUrl = new URL(source, campaignsUrl)
    const outputUrl = new URL('poster.png', sourceUrl)

    await view.navigate(sourceUrl.href)

    const dimensions = (await view.evaluate(`
      (async () => {
        await document.fonts.ready
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        )
        return {
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight
        }
      })()
    `)) as { width: number; height: number }

    if (dimensions.width !== SIZE || dimensions.height !== SIZE) {
      throw new Error(
        `${source} : attendu ${SIZE} × ${SIZE}, reçu ${dimensions.width} × ${dimensions.height}`
      )
    }

    const capture = await view.screenshot({ format: 'png' })
    const metadata = await new Bun.Image(capture).metadata()

    if (metadata.format !== 'png' || metadata.width !== SIZE || metadata.height !== SIZE) {
      throw new Error(
        `${source} : export ${metadata.width} × ${metadata.height} au format ${metadata.format}`
      )
    }

    await Bun.write(outputUrl, capture)
    console.log(`campaigns/${source.replace('poster.html', 'poster.png')}`)
  }
} finally {
  view.close()
}
