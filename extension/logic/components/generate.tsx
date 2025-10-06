import { TurkDropzone } from './dropzone'
import { Navigation } from './navigation'

type View = 'menu' | 'generateAV' | 'courrier' | 'chatbot'
/* ---- Sub-components ---- */

export function MenuView({ onNavigate }: { onNavigate: (v: View) => void }) {
  return (
    <>
      <Navigation />

      <div className="p-3 pt-2">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            onNavigate('generateAV')
          }}
          className="mb-[2px] flex flex-row items-center justify-between rounded-sm bg-white/5 p-2 px-4"
        >
          <span className="block">Générer une réponse (Aravis)</span>
          <span className="inline-block h-[8px] w-[8px] rounded-full bg-green-400">&nbsp;</span>
        </a>

        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            onNavigate('courrier')
          }}
          className="mb-[2px] flex flex-row items-center justify-between rounded-sm bg-white/5 p-2 px-4"
        >
          <span className="block">Générer un courrier postal</span>
          <span className="inline-block h-[8px] w-[8px] rounded-full bg-red-400">&nbsp;</span>
        </a>

        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            onNavigate('chatbot')
          }}
          className="mb-[2px] flex flex-row items-center justify-between rounded-sm bg-white/5 p-2 px-4"
        >
          <span className="block">Ouvrir le chatbot</span>
          <span className="inline-block h-[8px] w-[8px] rounded-full bg-green-400">&nbsp;</span>
        </a>
      </div>
    </>
  )
}

export function GenerateAVView({ onBack }: { onBack: () => void }) {
  return (
    <>
      <Navigation showBack={true} onBack={onBack} />

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

        <TurkDropzone />
        <button className="mb-3 block w-full rounded bg-white p-2 text-lg font-bold text-zinc-950">
          Générer
        </button>
      </div>
    </>
  )
}

export function CourrierView({ onBack }: { onBack: () => void }) {
  return (
    <>
      <Navigation showBack={true} onBack={onBack} />

      <div className="p-9 pt-2">
        <p className="mb-3 text-xl font-medium">Générer un courrier postal</p>
        <p className="mb-3 text-sm text-white/70">Ici, on peut mettre un formulaire spécifique…</p>
      </div>
    </>
  )
}

export function ChatbotView({ onBack }: { onBack: () => void }) {
  return (
    <>
      <Navigation showBack={true} onBack={onBack} />

      <div className="p-9 pt-2">
        <p className="mb-3 text-xl font-medium">Chatbot</p>
        <div className="mb-3 h-32 overflow-y-auto rounded border border-white/20 p-4 text-sm">
          Zone de chat (messages, etc.)
        </div>
      </div>
    </>
  )
}
