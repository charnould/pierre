import { JSX } from 'react/jsx-runtime'
import { useState } from 'react'
import { Navigation } from './navigation'
const chrome: any = (window as any).chrome

export function Settings(
  props: JSX.IntrinsicAttributes & {
    settings: any
    setSettings: any
    view: any
    setView: any
  }
) {
  const { settings, setSettings, setView } = props

  // Temporary state for input fields
  const [draftApiUrl, setDraftApiUrl] = useState(settings.apiUrl ?? '')
  const [draftApiToken, setDraftApiToken] = useState(settings.apiToken ?? '')

  // Handle submit
  const handleSubmit = async () => {
    // Manipulate or validate inputs
    const manipulatedUrl = draftApiUrl.trim()
    const manipulatedToken = draftApiToken.trim()

    const isValid = manipulatedUrl && manipulatedToken // replace with real validation

    if (isValid) {
      await chrome.storage.local.set({
        apiUrl: manipulatedUrl,
        apiToken: manipulatedToken,
        isSet: true
      })

      // Update parent state
      setSettings({
        apiUrl: manipulatedUrl,
        apiToken: manipulatedToken,
        isSet: true
      })
      setView('task')
    }
  }

  return (
    <>
      <Navigation {...props} />

      <div className="container">
        <p className="view__title">Paramétres</p>

        <p className="view__description">
          Si vous ne savez pas quoi renseigner, rapprochez-vous de votre manager.
        </p>

        <p className="view__description">Ce n'est à faire qu'une seule fois !</p>

        <input
          className="view__input"
          type="url"
          id="apiUrl"
          placeholder="URL : https://assistant.pierre-ia.org/api"
          value={draftApiUrl}
          onChange={(e) => setDraftApiUrl(e.target.value)}
          required
        />

        <input
          className="view__input"
          type="password"
          id="apiToken"
          placeholder="PASSWORD : f390kSKZO0Zd35dkz"
          value={draftApiToken}
          onChange={(e) => setDraftApiToken(e.target.value)}
          required
        />

        <button className="view__button" id="saveButton" onClick={handleSubmit}>
          Enregistrer
        </button>
      </div>
    </>
  )
}
