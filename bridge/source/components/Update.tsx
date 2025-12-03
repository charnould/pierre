export function Update({ needUpdate }: { needUpdate?: boolean }) {
  if (!needUpdate) return null

  return (
    <a href="http://charnould.github.io/pierre/bridge.html" className="update">
      Une nouvelle version est disponible →
    </a>
  )
}
