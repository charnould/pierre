export function Update({ isUpdateNeeded }: { isUpdateNeeded?: boolean | undefined }) {
  if (isUpdateNeeded === undefined) {
    return (
      <p className="block w-full rounded-t-none rounded-b-lg border-2 border-black bg-yellow-300 py-0.5 text-center text-[10px] text-neutral-900">
        Impossible de vérifier les mises à jour.
      </p>
    )
  }

  if (!isUpdateNeeded) return null

  return (
    <a
      href="http://charnould.github.io/pierre/bridge.html"
      className="block w-full rounded-t-none rounded-b-lg border-2 border-black bg-green-300 py-0.5 text-center text-[10px] text-neutral-900"
    >
      Une nouvelle version est disponible.
    </a>
  )
}
