import { JSX } from 'react/jsx-runtime'
import { useState } from 'react'
import { Navigation } from './navigation'
const chrome: any = (window as any).chrome

export function Settings(
  props: JSX.IntrinsicAttributes & {
    settings: any
    setSettings: any
    detectedView: any
    setDetectedView: any
  }
) {
  const { settings, setSettings, detectedView, setDetectedView } = props

  // Temporary state for input fields
  const [draftApiUrl, setDraftApiUrl] = useState(settings.apiUrl ?? '')
  const [draftApiToken, setDraftApiToken] = useState(settings.apiToken ?? '')

  // Handle submit
  const handleSubmit = async () => {
    // Manipulate or validate inputs
    const manipulatedUrl = draftApiUrl.trim().toUpperCase()
    const manipulatedToken = draftApiToken.trim().toUpperCase()

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
      setDetectedView('task')
    }
  }

  return (
    <>
      <Navigation {...props} />

      <div className="mx-6 pb-6">
        <p className="text-3xl/tight font-semibold">Paramètres</p>
        <p className="mb-4 text-2xl/tight font-medium">
          Paramétrons l'extension. C'est à faire une seule fois.
        </p>

        <input
          autoFocus
          className="mt-2 block w-full rounded border border-gray-500 p-3 text-base font-medium text-white caret-blue-600 placeholder:text-gray-400 focus:outline-none"
          type="text"
          id="apiUrl"
          placeholder="https://gdh.pierre-ia.org/api"
          value={draftApiUrl}
          onChange={(e) => setDraftApiUrl(e.target.value)}
        />

        <input
          className="mt-2 block w-full rounded border border-gray-500 p-3 text-base font-medium text-white caret-blue-600 placeholder:text-gray-400 focus:outline-none"
          type="text"
          id="apiToken"
          placeholder="f390kSKZO0Z?d35dkz"
          value={draftApiToken}
          onChange={(e) => setDraftApiToken(e.target.value)}
        />

        <button
          className="pointer-cursor mt-2 mb-4 block w-full rounded bg-neutral-50 p-3 text-center text-lg font-bold text-neutral-900"
          id="saveButton"
          onClick={handleSubmit}
        >
          Paramétrer l'extension
        </button>
      </div>
    </>
  )
}
