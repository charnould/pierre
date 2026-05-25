import { updateAssetUrl } from './updates-urls'

/** Rewrites relative `./image.png` markdown image paths to absolute GitHub raw URLs. */
export function resolveMarkdownImages(markdown: string, slug: string): string {
  return markdown.replace(/!\[([^\]]*)\]\(\.\/([^)]+)\)/g, (_match, alt: string, path: string) => {
    return `![${alt}](${updateAssetUrl(slug, path)})`
  })
}
