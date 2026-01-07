import { Dropzone, DropzoneHandle } from './FileUpload'
import { Navigation } from './navigation'
import { useRef, useState } from 'react'

export function Respond(props: {
  settings: any
  setSettings: any
  view: any
  setView: any
  skills: any
}) {
  const dropzoneRef = useRef<DropzoneHandle>(null)
  const [loading, setLoading] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  return (
    <>
      <Navigation {...props} />

      <form
        className="container"
        onSubmit={async (e) => {
          e.preventDefault()
          if (loading) return

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

              const usecase = host.shadowRoot.getElementById(
                'pierre-bridge-usecase'
              ) as HTMLSelectElement
              data.append('usecase', usecase.value)
            }

            const files = dropzoneRef.current?.getFiles()
            if (files && files.length > 0) {
              files.forEach((file: string | Blob) => {
                data.append('files', file)
              })
            }

            const res = await fetch(props.settings.apiUrl + '/answer', {
              method: 'POST',
              body: data
            })
            const answer = await res.text()

            clearInterval(interval)
            setCompleted(true)
            setHasGenerated(true)

            const target = document.getElementById(props.settings.target) as HTMLTextAreaElement
            if (target) target.value = answer

            setTimeout(() => setCompleted(false), 1000)
          } catch (err) {
            console.error('Error injecting response:', err)
          } finally {
            setLoading(false)
          }
        }}
      >
        <p className="view__title">Répondre</p>
        <p className="view__description">
          Génère une réponse au message, en tenant compte du cas d'usage, du contexte et des pièces
          jointes.
        </p>

        <select id="pierre-bridge-usecase" className="view__select" required defaultValue="">
          <option value="" disabled>
            Sélectionner le cas d'usage
          </option>
          {props.skills.map((skill: any) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>

        <textarea
          rows={5}
          autoFocus
          id="pierre-bridge-context"
          className="view__textarea"
          placeholder="Ajouter des éléments de contexte (optionnels)"
        ></textarea>

        <Dropzone ref={dropzoneRef} />

        <button
          type="submit"
          disabled={loading}
          className="view__button"
          style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading
            ? `Injection en cours (${seconds.toFixed(1).replace('.', ',')}s)`
            : completed
              ? 'Réponse injectée ;-)'
              : hasGenerated
                ? "Réinjecter dans l'applicatif"
                : "Injecter dans l'applicatif"}
        </button>

        <button type="submit" disabled className="view__button">
          Générer un Word (.docx)
        </button>
      </form>
    </>
  )
}
