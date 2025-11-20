import { Dropzone } from './FileUpload'
import { Navigation } from './navigation'

export function Respond(props) {
  return (
    <>
      {/* <Navigation {...props} /> */}

      <div className="p-9 pt-2">
        <p className="text-3xl font-medium">Générer une réponse</p>
        <p className="mb-4 text-xs/snug text-pretty text-gray-400">
          Cette action génère une réponse et la complète directement dans le champ dédié Aravis.
        </p>

        <p className="mb-4 text-base/snug font-extralight text-pretty">
          Contexte + PDF (optionnel)
        </p>

        <textarea
          id="textarea"
          className="mb-1 h-32 w-full resize-none rounded border border-solid border-white/40 p-4 text-sm caret-pink-500 outline-none"
        ></textarea>

        <Dropzone />
        <button className="mb-3 block w-full rounded bg-white p-2 text-lg font-bold text-zinc-950">
          Générer
        </button>
      </div>
    </>
  )
}
