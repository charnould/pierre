import { Plus, RefreshCw, Search } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/shared/components/ui/input-group'
import { Spinner } from '@/shared/components/ui/spinner'
import type { KnowledgeBuild } from '@/shared/types/knowledge'

const buildLabel: Record<KnowledgeBuild['status'], string> = {
  queued: 'En attente',
  running: 'En cours',
  succeeded: 'Réussie',
  failed: 'Échouée'
}

export function KnowledgeToolbar({
  query,
  lastBuild,
  needsRebuild,
  buildActive,
  uploading,
  onQueryChange,
  onRebuild,
  onUpload
}: {
  query: string
  lastBuild: KnowledgeBuild | null
  needsRebuild: boolean
  buildActive: boolean
  uploading: boolean
  onQueryChange: (query: string) => void
  onRebuild: () => void
  onUpload: () => void
}) {
  return (
    <header className="border-border bg-background flex shrink-0 items-center gap-2 border-b px-4 py-2">
      <InputGroup className="w-56">
        <InputGroupInput
          value={query}
          placeholder="Rechercher"
          aria-label="Rechercher une source"
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>
      <div className="text-muted-foreground min-w-0 flex-1 text-xs">
        {needsRebuild && !buildActive
          ? 'Catalogue modifié — reconstruire pour publier.'
          : lastBuild
            ? `Dernière reconstruction : ${buildLabel[lastBuild.status]}`
            : null}
      </div>
      <Button type="button" variant="outline" size="sm" disabled={buildActive} onClick={onRebuild}>
        <RefreshCw data-icon="inline-start" />
        Reconstruire
      </Button>
      <Button type="button" size="sm" disabled={uploading} onClick={onUpload}>
        {uploading ? <Spinner /> : <Plus data-icon="inline-start" />}
        Ajouter des fichiers
      </Button>
    </header>
  )
}
