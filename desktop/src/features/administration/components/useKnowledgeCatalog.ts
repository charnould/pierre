import { useCallback, useEffect, useRef, useState } from 'react'

import { toast } from '@/shared/components/ui/toast'
import type { KnowledgeData, KnowledgeSource } from '@/shared/types/knowledge'

import type { KnowledgeItem } from './knowledge-model'
import { replaceKnowledgeEntry } from './KnowledgeSourceDialog'

export function useKnowledgeCatalog(url: string) {
  const [data, setData] = useState<KnowledgeData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const seenBuild = useRef<{ id?: string; status?: string }>({})

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
    seenBuild.current = { id: response.data.lastBuild?.id, status: response.data.lastBuild?.status }
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
    const timer = window.setInterval(() => {
      void window.api?.getKnowledgeBuilds({ url }).then((response) => {
        if (!response || 'error' in response) return
        const lastBuild = response.data.builds[0] ?? null
        if (
          lastBuild?.id === seenBuild.current.id &&
          lastBuild?.status === seenBuild.current.status
        ) {
          return
        }
        void load()
      })
    }, 1500)
    return () => window.clearInterval(timer)
  }, [load, url])

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

  const upload = async (): Promise<KnowledgeSource | null> => {
    setUploading(true)
    try {
      const response = await window.api?.uploadKnowledgeSources({ url })
      if (!response) return null
      if ('error' in response) {
        toast.add({ title: response.error.message, type: 'error' })
        return null
      }
      await load()
      const changed = response.data.sources.find((result) => result.changed)
      toast.add({
        title: changed ? 'Sources mises à jour' : 'Fichiers inchangés',
        type: 'success'
      })
      return changed?.source ?? null
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

  const unassign = async (item: KnowledgeItem) => {
    const response = await window.api?.patchKnowledgeSource({
      url,
      id: item.source.id,
      entries: replaceKnowledgeEntry(item.source.entries, item.entryIndex, {
        ...item.entry,
        profileIds: [],
        moduleIds: []
      }),
      updatedAt: item.source.updatedAt
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

  const removeSheet = async (item: KnowledgeItem): Promise<boolean> => {
    const response = await window.api?.patchKnowledgeSource({
      url,
      id: item.source.id,
      entries: item.source.entries.filter((_, index) => index !== item.entryIndex),
      updatedAt: item.source.updatedAt
    })
    if (!response || 'error' in response) {
      toast.add({
        title:
          response && 'error' in response
            ? response.error.message
            : 'Impossible de retirer cet onglet.',
        type: 'error'
      })
      return false
    }
    replaceSource(response.data.source)
    toast.add({ title: 'Onglet retiré', type: 'success' })
    return true
  }

  const removeFile = async (source: KnowledgeSource): Promise<boolean> => {
    const deleted = await window.api?.deleteKnowledgeSource({ url, id: source.id })
    if (!deleted) {
      toast.add({ title: 'Impossible de supprimer la source.', type: 'error' })
      return false
    }
    await load()
    toast.add({ title: 'Fichier supprimé', type: 'success' })
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
    removeSheet,
    removeFile
  }
}
