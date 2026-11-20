import { toast } from '@/shared/components/ui/toast'
import type { DownloadIntakeFilePayload, ExportIntakeZipPayload } from '@/shared/types/intakes'
import type { BinaryDownloadResult } from '@/shared/types/ipc'

async function runIntakeDownload(
  invoke: () => Promise<BinaryDownloadResult | null> | undefined,
  fallbackError: string,
  successMessage: string
): Promise<void> {
  const result = await invoke()
  if (!result || 'error' in result) {
    toast.add({
      title: (result && 'error' in result ? result.error.message : '') || fallbackError,
      type: 'error'
    })
    return
  }
  if ('saved' in result) {
    toast.add({ title: successMessage, type: 'success' })
  }
}

export function exportIntakeZipWithToast(params: ExportIntakeZipPayload): Promise<void> {
  return runIntakeDownload(
    () => window.api?.exportIntakeZip(params),
    'Impossible d’exporter l’archive ZIP.',
    'Archive ZIP enregistrée'
  )
}

export function downloadIntakeFileWithToast(params: DownloadIntakeFilePayload): Promise<void> {
  return runIntakeDownload(
    () => window.api?.downloadIntakeFile(params),
    'Impossible de télécharger le fichier.',
    'Fichier enregistré'
  )
}
