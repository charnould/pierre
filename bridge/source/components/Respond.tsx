import { Dropzone, DropzoneHandle } from './FileUpload'
import { Navigation } from './navigation'
import { useRef, useState } from 'react'

export function Respond(props: { settings: any; setSettings: any; view: any; setView: any }) {
  const dropzoneRef = useRef<DropzoneHandle>(null)
  const [loading, setLoading] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  return (
    <>
      <Navigation {...props} />

      <form className="container">
        <p className="view__title">Répondre</p>
        <p className="view__description">
          Génère la réponse la plus appropriée possible au message, en tenant compte du contexte et
          des pièces jointes.
        </p>

        <textarea
          rows={5}
          autoFocus
          id="pierre-bridge-context"
          className="view__textarea"
          placeholder="Éléments de contexte (optionnels)"
        ></textarea>

        <Dropzone ref={dropzoneRef} />

        <button
          type="button"
          className="view__button"
          onClick={async (e) => {
            e.preventDefault()
            try {
              setLoading(true)
              setCompleted(false)
              const start = performance.now()
              const interval = setInterval(() => {
                const elapsed = (performance.now() - start) / 1000
                setSeconds(elapsed)
              }, 100)

              const data = new FormData()
              const source = document.getElementById(props.settings.source) as HTMLTextAreaElement
              data.append('source', source.value)

              const host = document.querySelector('pierre-extension')
              if (host && host.shadowRoot) {
                const context = host.shadowRoot.getElementById(
                  'pierre-bridge-context'
                ) as HTMLTextAreaElement
                data.append('context', context.value)
              }

              const files = dropzoneRef.current?.getFiles()
              if (files && files.length > 0) {
                files.forEach((file: string | Blob) => {
                  data.append('files', file)
                })
              }

              const res = await fetch(props.settings.apiUrl, { method: 'POST', body: data })
              const answer = await res.text()

              clearInterval(interval)
              setLoading(false)
              setCompleted(true)
              setHasGenerated(true)

              const target = document.getElementById(props.settings.target) as HTMLTextAreaElement
              if (target) target.value = answer

              // After 2 seconds, revert button to initial state
              setTimeout(() => setCompleted(false), 1000)
            } catch (err) {
              console.error('Error injecting response:', err)
              setLoading(false)
            }
          }}
        >
          {loading
            ? `Génération en cours (${seconds.toFixed(1).replace('.', ',')}s)`
            : completed
              ? 'Réponse générée ;-)'
              : hasGenerated
                ? 'Regénérer une réponse'
                : 'Générer une réponse'}
        </button>
      </form>
    </>
  )
}
