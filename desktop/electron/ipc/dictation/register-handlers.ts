import { ipcMain, session, shell, systemPreferences } from 'electron'

import { netFetch } from '../../lib/net-fetch'
import { IpcChannel } from '../channels'

type TranscribeParams = { url: string; pcm: Uint8Array }

const PRIVACY = {
  darwin: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
  win32: 'ms-settings:privacy-microphone'
} as const

function endpoint(url: string): string {
  return `${url.replace(/\/$/, '')}/speech/transcribe`
}

export function registerDictationHandlers(partition: string): void {
  ipcMain.handle(IpcChannel.dictation.transcribe, async (_, params: TranscribeParams) => {
    const response = await netFetch(endpoint(params.url), {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: Buffer.from(params.pcm),
      session: session.fromPartition(partition)
    })
    const body = (await response.json().catch(() => null)) as {
      data?: { text?: unknown }
      error?: { message?: unknown }
    } | null
    if (!response.ok) {
      const message = body?.error?.message
      throw new Error(typeof message === 'string' ? message : 'La transcription a échoué.')
    }
    return { text: typeof body?.data?.text === 'string' ? body.data.text : '' }
  })

  ipcMain.handle(IpcChannel.dictation.microphoneStatus, () => {
    if (process.platform !== 'darwin') return 'unknown'
    return systemPreferences.getMediaAccessStatus('microphone')
  })

  ipcMain.handle(IpcChannel.dictation.requestMicrophone, async () => {
    if (process.platform !== 'darwin') return true
    return systemPreferences.askForMediaAccess('microphone')
  })

  ipcMain.handle(IpcChannel.dictation.openMicrophoneSettings, async () => {
    const url =
      process.platform === 'darwin'
        ? PRIVACY.darwin
        : process.platform === 'win32'
          ? PRIVACY.win32
          : ''
    if (!url) return false
    await shell.openExternal(url)
    return true
  })
}
