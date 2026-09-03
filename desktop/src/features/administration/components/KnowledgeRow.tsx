import { Download, FileText, Pencil, Table2, Trash2, Unlink } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'

import { DirectoryRow } from '@/shared/components/DirectoryList'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import type { KnowledgeBuild, KnowledgeProfile } from '@/shared/types/knowledge'

import {
  isKnowledgeEntryAssigned,
  knowledgeAssignmentSummary,
  knowledgeDeleteKind,
  knowledgeFileKind,
  knowledgeItemState,
  knowledgeRowDescription,
  knowledgeRowTitle,
  type KnowledgeItem,
  type KnowledgeItemState
} from './knowledge-model'

const stateLabel: Record<KnowledgeItemState, string> = {
  absent: 'Absent',
  unassigned: 'Non affecté',
  pending: 'À construire',
  running: 'En cours',
  succeeded: 'OK',
  failed: 'KO'
}

const stateTooltip: Record<KnowledgeItemState, string> = {
  absent: 'Aucune source ne fournit cette table.',
  unassigned: 'Cette entrée n’est affectée à aucun profil.',
  pending: 'Cette entrée n’a pas encore été construite.',
  running: 'Reconstruction en cours.',
  succeeded: 'Dernière reconstruction réussie.',
  failed: 'Dernière tentative échouée — version précédente conservée.'
}

const stateBadgeVariant: Record<
  KnowledgeItemState,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  absent: 'outline',
  unassigned: 'outline',
  pending: 'secondary',
  running: 'secondary',
  succeeded: 'default',
  failed: 'destructive'
}

const assignmentCountText = (profiles: number, modules: number): string | null => {
  const parts: string[] = []
  if (profiles > 0) parts.push(`${profiles} ${profiles === 1 ? 'profil' : 'profils'}`)
  if (modules > 0) parts.push(`${modules} ${modules === 1 ? 'module' : 'modules'}`)
  return parts.length > 0 ? parts.join(' · ') : null
}

function KnowledgeAssignmentMeta({ profiles, modules }: { profiles: string[]; modules: string[] }) {
  const label = assignmentCountText(profiles.length, modules.length)
  if (!label) return null
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        render={
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground m-0 inline h-auto border-0 bg-transparent p-0 text-xs font-normal"
          />
        }
        onClick={(event) => event.stopPropagation()}
      >
        {label}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-72">
        {profiles.length > 0 ? (
          <div>
            <div className="text-sm font-medium">Profils</div>
            <ul className="mt-0.5 flex flex-col text-xs">
              {profiles.map((name, index) => (
                <li key={`profile:${index}`}>{name}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {modules.length > 0 ? (
          <div>
            <div className="text-sm font-medium">Modules</div>
            <ul className="mt-0.5 flex flex-col text-xs">
              {modules.map((name, index) => (
                <li key={`module:${index}`}>{name}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function IconAction({
  label,
  'aria-label': ariaLabel,
  onClick,
  children
}: {
  label: string
  'aria-label': string
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={ariaLabel}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}

function KindIcon({ kind, state }: { kind: 'table' | 'document'; state: KnowledgeItemState }) {
  const Icon = kind === 'table' ? Table2 : FileText
  const color =
    state === 'failed'
      ? 'text-destructive'
      : state === 'succeeded'
        ? 'text-primary'
        : 'text-muted-foreground'
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            aria-label={stateTooltip[state]}
            className={`flex h-5 w-4 shrink-0 items-center justify-center ${color} [&_svg]:size-4`}
          />
        }
      >
        <Icon />
      </TooltipTrigger>
      <TooltipContent side="top">{stateTooltip[state]}</TooltipContent>
    </Tooltip>
  )
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))

export function KnowledgeRow({
  item,
  coreData,
  lastBuild,
  needsRebuild,
  profiles,
  url,
  onOpen,
  onUnassign,
  onDelete
}: {
  item: KnowledgeItem | null
  coreData?: { table: string; filename: string; label: string }
  lastBuild: KnowledgeBuild | null
  needsRebuild: boolean
  profiles: KnowledgeProfile[]
  url: string
  onOpen: (item: KnowledgeItem) => void
  onUnassign: (item: KnowledgeItem) => void
  onDelete: (item: KnowledgeItem) => void
}) {
  const state = knowledgeItemState(item, lastBuild, needsRebuild)
  const title = knowledgeRowTitle(item, coreData)
  const description = knowledgeRowDescription(item, coreData)
  const assignment = item
    ? knowledgeAssignmentSummary(item.entry, profiles)
    : { profiles: [], modules: [] }

  return (
    <DirectoryRow onSelect={item ? () => onOpen(item) : undefined}>
      <div className="flex min-w-0 items-start gap-2 overflow-hidden">
        <KindIcon kind={knowledgeFileKind(item?.source.fileType)} state={state} />
        <div className="flex min-w-0 flex-1 flex-col items-start overflow-hidden">
          <div className="block w-full min-w-0 truncate text-sm leading-5 font-medium">{title}</div>
          <div className="text-muted-foreground w-full min-w-0 truncate text-xs">{description}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-start">
        <Badge variant={stateBadgeVariant[state]}>{stateLabel[state]}</Badge>
        <KnowledgeAssignmentMeta profiles={assignment.profiles} modules={assignment.modules} />
      </div>
      <div className="text-muted-foreground pierre-type-data text-start tabular-nums">
        {item ? formatDate(item.source.updatedAt) : '—'}
      </div>
      <div className="flex items-center gap-1 text-start">
        {item ? (
          <>
            <IconAction
              label="Télécharger"
              aria-label={`Télécharger ${item.source.originalName}`}
              onClick={(event) => {
                event.stopPropagation()
                void window.api?.downloadKnowledgeSource({
                  url,
                  id: item.source.id,
                  originalName: item.source.originalName
                })
              }}
            >
              <Download />
            </IconAction>
            <IconAction
              label="Modifier"
              aria-label={`Modifier ${title}`}
              onClick={(event) => {
                event.stopPropagation()
                onOpen(item)
              }}
            >
              <Pencil />
            </IconAction>
            {isKnowledgeEntryAssigned(item.entry) ? (
              <IconAction
                label="Désaffecter"
                aria-label={`Désaffecter ${title}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onUnassign(item)
                }}
              >
                <Unlink />
              </IconAction>
            ) : null}
            <IconAction
              label={knowledgeDeleteKind(item) === 'sheet' ? 'Retirer' : 'Supprimer'}
              aria-label={
                knowledgeDeleteKind(item) === 'sheet'
                  ? `Retirer ${item.entry.sheetName ?? title}`
                  : `Supprimer ${item.source.originalName}`
              }
              onClick={(event) => {
                event.stopPropagation()
                onDelete(item)
              }}
            >
              <Trash2 />
            </IconAction>
          </>
        ) : null}
      </div>
    </DirectoryRow>
  )
}
