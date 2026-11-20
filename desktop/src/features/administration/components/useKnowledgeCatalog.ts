import { useCallback, useEffect, useRef, useState } from 'react'

import { toast } from '@/shared/components/ui/toast'
import { warnRenderer } from '@/shared/lib/renderer-log'
import type { KnowledgeData, KnowledgeSource } from '@/shared/types/knowledge'

import type { PendingWorkbookSheetImport } from './KnowledgeWorkbookImportDialog'

const isWorkbookFilename = (name: string): boolean => {
  const lower = name.toLowerCase()
  return ['.xlsx', '.xls', '.xlsm', '.xlsb'].some((ext) => lower.endsWith(ext))
}

const STRUCTURE_ERROR_CODES = new Set([
  'spreadsheet_structure_changed',
  'missing_configured_sheet',
  'missing_spreadsheet_header',
  'invalid_spreadsheet_header',
  'duplicate_spreadsheet_header'
])

export type UploadOutcome = {
  immediateChangedSource: KnowledgeSource | null
  pendingSheets: PendingWorkbookSheetImport[]
}

export function useKnowledgeCatalog(url: string) {
  const [data, setData] = useState<KnowledgeData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [buildStatus, setBuildStatus] = useState<string | null>(null)
  const seenBuild = useRef<{ id?: string; status?: string }>({})
  const pollInFlight = useRef(false)

  const applyResponse = (
    response: Awaited<ReturnType<NonNullable<typeof window.api>['getAdminKnowledge']>>
  ) => {
    if (!response) {
      setLoadError('Impossible de joindre le serveur.')
      return
    }
    if ('error' in response) {
      setLoadError(response.error.message)
      return
    }
    setData(response.data)
    setLoadError('')
    const status = response.data.lastBuild?.status ?? null
    setBuildStatus(status)
    seenBuild.current = { id: response.data.lastBuild?.id, status: status ?? undefined }
  }

  const load = useCallback(async () => {
    applyResponse(await window.api?.getAdminKnowledge({ url }))
  }, [url])

  useEffect(() => {
    let cancelled = false
    void (window.api?.getAdminKnowledge({ url }) ?? Promise.resolve(null)).then((response) => {
      if (cancelled) return
      // Remote catalog snapshot — this effect is the sync boundary.
      // oxlint-disable-next-line react/set-state-in-effect
      applyResponse(response)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  useEffect(() => {
    let cancelled = false
    const delay = buildStatus === 'queued' || buildStatus === 'running' ? 1_500 : 30_000
    const timer = window.setInterval(() => {
      if (pollInFlight.current) return
      pollInFlight.current = true
      void (async () => {
        try {
          const response = await window.api?.getKnowledgeBuilds({ url })
          if (cancelled || !response || 'error' in response) return
          const lastBuild = response.data.builds[0] ?? null
          if (
            lastBuild?.id === seenBuild.current.id &&
            lastBuild?.status === seenBuild.current.status
          ) {
            return
          }
          await load()
        } catch (error) {
          warnRenderer('useKnowledgeCatalog.poll', error)
        } finally {
          pollInFlight.current = false
        }
      })()
    }, delay)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [buildStatus, load, url])

  const replaceSource = (source: KnowledgeSource) => {
    setData((current) =>
      current
        ? {
            ...current,
            sources: current.sources.map((item) => (item.id === source.id ? source : item))
          }
        : current
    )
    void load()
  }

  const inspectForQueue = async (
    filePath: string,
    existingSources: KnowledgeSource[],
    reason?: string
  ): Promise<PendingWorkbookSheetImport[]> => {
    const inspected = await window.api?.inspectKnowledgeWorkbook({ url, filePath })
    if (!inspected) {
      toast.add({ title: 'Impossible de joindre le serveur.', type: 'error' })
      return []
    }
    if ('error' in inspected) {
      toast.add({ title: inspected.error.message, type: 'error' })
      return []
    }
    const existingBySheet = new Map(
      existingSources
        .filter((source) => source.sheetName !== null)
        .map((source) => [source.sheetName!.toLocaleLowerCase('fr'), source])
    )
    const items: PendingWorkbookSheetImport[] = inspected.data.sheets.map((sheet) => ({
      filePath,
      originalName: inspected.data.originalName,
      sheet,
      existingSource: existingBySheet.get(sheet.name.toLocaleLowerCase('fr')) ?? null,
      reason
    }))
    if (existingBySheet.size === 0) return items
    return [
      ...items.filter((item) => item.existingSource !== null),
      ...items.filter((item) => item.existingSource === null)
    ]
  }

  const upload = async (): Promise<UploadOutcome | null> => {
    const picked = await window.api?.pickKnowledgeFiles()
    if (!picked || picked.length === 0) return null

    setUploading(true)
    try {
      const existingByFilename = new Map<string, KnowledgeSource[]>()
      for (const source of data?.sources ?? []) {
        const key = source.originalName.toLocaleLowerCase('fr')
        const list = existingByFilename.get(key)
        if (list) list.push(source)
        else existingByFilename.set(key, [source])
      }

      const regularPaths: string[] = []
      const knownWorkbooks: Array<{ path: string; existing: KnowledgeSource[] }> = []
      const newWorkbookPaths: string[] = []

      for (const file of picked) {
        if (!isWorkbookFilename(file.name)) {
          regularPaths.push(file.path)
          continue
        }
        const key = file.name.normalize('NFC').toLocaleLowerCase('fr')
        const existing = existingByFilename.get(key) ?? []
        if (existing.length > 0) knownWorkbooks.push({ path: file.path, existing })
        else newWorkbookPaths.push(file.path)
      }

      let immediateChangedSource: KnowledgeSource | null = null
      let anyImmediateUploaded = false
      let anyImmediateChanged = false
      const pendingSheets: PendingWorkbookSheetImport[] = []

      if (regularPaths.length > 0) {
        const response = await window.api?.uploadKnowledgeFiles({ url, filePaths: regularPaths })
        if (!response) {
          toast.add({ title: 'Impossible de joindre le serveur.', type: 'error' })
        } else if ('error' in response) {
          toast.add({ title: response.error.message, type: 'error' })
        } else {
          anyImmediateUploaded = true
          const changed = response.data.sources.find((result) => result.changed)
          if (changed) {
            anyImmediateChanged = true
            immediateChangedSource = changed.source
          }
        }
      }

      for (const workbook of knownWorkbooks) {
        const response = await window.api?.uploadKnowledgeFiles({
          url,
          filePaths: [workbook.path]
        })
        if (!response) {
          toast.add({ title: 'Impossible de joindre le serveur.', type: 'error' })
          continue
        }
        if ('error' in response) {
          if (STRUCTURE_ERROR_CODES.has(response.error.code)) {
            pendingSheets.push(
              ...(await inspectForQueue(workbook.path, workbook.existing, response.error.message))
            )
          } else {
            toast.add({ title: response.error.message, type: 'error' })
          }
          continue
        }
        anyImmediateUploaded = true
        if (response.data.sources.some((result) => result.changed)) anyImmediateChanged = true
      }

      for (const filePath of newWorkbookPaths) {
        pendingSheets.push(...(await inspectForQueue(filePath, [])))
      }

      if (anyImmediateUploaded) {
        await load()
        toast.add({
          title: anyImmediateChanged ? 'Sources mises à jour' : 'Fichiers inchangés',
          type: 'success'
        })
      }

      return { immediateChangedSource, pendingSheets }
    } finally {
      setUploading(false)
    }
  }

  const rebuild = async () => {
    const response = await window.api?.rebuildKnowledge({ url })
    if (!response) return
    if ('error' in response) {
      toast.add({ title: response.error.message, type: 'error' })
      return
    }
    await load()
  }

  const unassign = async (source: KnowledgeSource) => {
    const response = await window.api?.patchKnowledgeSource({
      url,
      id: source.id,
      title: source.title,
      profileIds: [],
      moduleIds: [],
      updatedAt: source.updatedAt
    })
    if (!response || 'error' in response) {
      toast.add({
        title:
          response && 'error' in response
            ? response.error.message
            : 'Impossible de désaffecter cette entrée.',
        type: 'error'
      })
      return
    }
    replaceSource(response.data.source)
  }

  const removeSource = async (source: KnowledgeSource): Promise<boolean> => {
    const deleted = await window.api?.deleteKnowledgeSource({ url, id: source.id })
    if (!deleted) {
      toast.add({ title: 'Impossible de supprimer la source.', type: 'error' })
      return false
    }
    await load()
    toast.add({
      title: source.fileType === 'xlsx' ? 'Onglet retiré' : 'Fichier supprimé',
      type: 'success'
    })
    return true
  }

  return {
    data,
    loadError,
    uploading,
    load,
    replaceSource,
    upload,
    rebuild,
    unassign,
    removeSource
  }
}
