export interface Settings {
  url?: string
  email?: string
  password?: string
  loggedOut?: boolean
}

declare global {
  interface Window {
    api: {
      getSettings: () => Promise<Settings>
      saveSettings: (data: Settings) => Promise<boolean>
      onClipboardUpdate: (cb: (text: string) => void) => void
      readClipboard: () => Promise<string>
      writeClipboard: (text: string) => Promise<boolean>
      resizeTo: (dims: { width: number; height: number }) => Promise<void>
      startStream: (params: {
        url: string
        config: string
        message: string
        conv_id: string
      }) => Promise<boolean>
      logout: () => Promise<boolean>
      cancelStream: () => Promise<void>
      onAiChunk: (cb: (chunk: string) => void) => void
    }
  }
}

// Electron's <webview> custom element for JSX
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.HTMLAttributes<HTMLElement> & {
        src?: string
        partition?: string
      }
    }
  }
}
