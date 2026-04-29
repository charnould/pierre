import { useRef, useEffect, useState } from 'react'

interface Props {
  hidden: boolean
  isLoggedIn: boolean
  url?: string
}

export function DiscuterPanel({ hidden, isLoggedIn, url }: Props) {
  const webviewRef = useRef<HTMLElement>(null)
  const [showPlaceholder, setShowPlaceholder] = useState(true)

  useEffect(() => {
    if (hidden || !isLoggedIn || !url) {
      if (!hidden) setShowPlaceholder(true)
      return
    }
    const wv = webviewRef.current
    if (!wv) return
    const target = `${url}/c?compact`
    if (wv.getAttribute('src') !== target) wv.setAttribute('src', target)
    setShowPlaceholder(false)
  }, [hidden, isLoggedIn, url])

  return (
    <div className={`tab-panel relative flex-1 overflow-hidden ${hidden ? 'hidden' : 'flex'}`}>
      {/* @ts-expect-error — Electron webview is not a standard HTML element */}
      <webview
        ref={webviewRef}
        partition="persist:pierre"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%'
        }}
      />
      {showPlaceholder && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-white p-8"
          style={{ zIndex: 10 }}
        >
          <p className="mb-2 text-2xl">💬</p>
          <p className="font-['Inter'] text-[13px] font-semibold text-gray-800">Chatbot</p>
          <p className="mt-1 text-[12px] text-gray-400">
            Configurez et connectez-vous pour accéder au chatbot.
          </p>
        </div>
      )}
    </div>
  )
}
