import { readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'

type AssetMetric = {
  file: string
  rawBytes: number
  gzipBytes: number
}

export type BundleMetrics = {
  main: AssetMetric
  preload: AssetMetric
  rendererEntry: AssetMetric
  rendererColdStart: {
    rawBytes: number
    gzipBytes: number
    assets: AssetMetric[]
  }
  rendererTotalJs: {
    rawBytes: number
    gzipBytes: number
    assetCount: number
  }
}

const metricForFile = async (root: string, relativePath: string): Promise<AssetMetric> => {
  const bytes = new Uint8Array(await Bun.file(join(root, relativePath)).arrayBuffer())
  return {
    file: relativePath,
    rawBytes: bytes.byteLength,
    gzipBytes: Bun.gzipSync(bytes).byteLength
  }
}

const rendererScriptPaths = (html: string): string[] => {
  const paths = new Set<string>()
  for (const match of html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)="([^"]+\.js)"/g)) {
    const path = match[1]
    if (path) paths.add(path.replace(/^\.\//, ''))
  }
  return [...paths].sort()
}

const sum = (metrics: AssetMetric[], key: 'rawBytes' | 'gzipBytes'): number =>
  metrics.reduce((total, metric) => total + metric[key], 0)

export async function measureBundles(desktopRoot: string): Promise<BundleMetrics> {
  const distRoot = join(desktopRoot, 'dist')
  const rendererRoot = join(distRoot, 'renderer')
  const assetsRoot = join(rendererRoot, 'assets')
  const indexHtml = await Bun.file(join(rendererRoot, 'index.html')).text()
  const coldStartPaths = rendererScriptPaths(indexHtml)
  const coldStartAssets = await Promise.all(
    coldStartPaths.map((path) => metricForFile(rendererRoot, path))
  )
  const entryPath = coldStartPaths.find((path) => basename(path).startsWith('index-'))
  if (!entryPath) throw new Error('Renderer entry script not found in dist/renderer/index.html')

  const rendererJsFiles = (await readdir(assetsRoot)).filter((file) => file.endsWith('.js')).sort()
  const rendererAssets = await Promise.all(
    rendererJsFiles.map((file) => metricForFile(rendererRoot, `assets/${file}`))
  )

  return {
    main: await metricForFile(distRoot, 'main/main.js'),
    preload: await metricForFile(distRoot, 'preload/index.js'),
    rendererEntry: await metricForFile(rendererRoot, entryPath),
    rendererColdStart: {
      rawBytes: sum(coldStartAssets, 'rawBytes'),
      gzipBytes: sum(coldStartAssets, 'gzipBytes'),
      assets: coldStartAssets
    },
    rendererTotalJs: {
      rawBytes: sum(rendererAssets, 'rawBytes'),
      gzipBytes: sum(rendererAssets, 'gzipBytes'),
      assetCount: rendererAssets.length
    }
  }
}
