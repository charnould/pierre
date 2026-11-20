import {
  BookOpen,
  ClipboardPen,
  Copy,
  Eraser,
  Eye,
  FileArchive,
  Globe,
  Link2Off,
  Lock,
  LockOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2
} from 'lucide-react'

import type { IntakeMenuAction } from '@/features/intakes/IntakesView'
import {
  formatIntakeTimestamp,
  INTAKE_SORT_OPTIONS,
  type IntakeSortKey,
  intakeStatusLabel,
  intakeStatusVariant
} from '@/features/intakes/lib/intake-ui'
import { CollaboratorAccessAvatars } from '@/shared/components/CollaboratorAccessAvatars'
import { DirectoryList, DirectoryRow } from '@/shared/components/DirectoryList'
import { DirectoryListChrome } from '@/shared/components/DirectoryListChrome'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { useOrgUsers } from '@/shared/hooks/useOrgUsers'
import { canManageCollaboratorResource } from '@/shared/lib/collaborator-access'
import { requestSetup } from '@/shared/lib/open-setup'
import type { IntakeRecord } from '@/shared/types/intakes'

interface Props {
  intakes: IntakeRecord[]
  url: string | undefined
  userLogin: string
  isAdministrator: boolean
  query: string
  normalizedQuery: string
  onQueryChange: (query: string) => void
  sortKey: IntakeSortKey
  onSortKeyChange: (key: IntakeSortKey) => void
  selectedIntakeId: string | null
  onSelectIntake: (intake: IntakeRecord) => void
  onNewIntake: () => void
  onPreview: (intake: IntakeRecord) => void
  onCopyLink: (intake: IntakeRecord) => void
  onExportZip: (intake: IntakeRecord) => void
  onAction: (action: IntakeMenuAction, intake: IntakeRecord) => void
}

export function IntakesList({
  intakes,
  url,
  userLogin,
  isAdministrator,
  query,
  normalizedQuery,
  onQueryChange,
  sortKey,
  onSortKeyChange,
  selectedIntakeId,
  onSelectIntake,
  onNewIntake,
  onPreview,
  onCopyLink,
  onExportZip,
  onAction
}: Props) {
  useOrgUsers(url)
  const countLabel = `${intakes.length} collecte${intakes.length === 1 ? '' : 's'}`

  return (
    <section className="bg-background flex w-full min-w-0 flex-col [&:first-child>header]:border-t-0">
      <DirectoryListChrome
        title="Collectes"
        countLabel={countLabel}
        searchLabel="Rechercher une collecte"
        query={query}
        onQueryChange={onQueryChange}
        sortKey={sortKey}
        sortOptions={INTAKE_SORT_OPTIONS}
        onSortKeyChange={onSortKeyChange}
        onNew={onNewIntake}
      />

      <div className="bg-background w-full min-w-0">
        {intakes.length === 0 && normalizedQuery ? (
          <Empty className="min-h-60">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search />
              </EmptyMedia>
              <EmptyTitle>Aucun résultat</EmptyTitle>
              <EmptyDescription>
                Aucune collecte ne correspond à « {query.trim()} ».
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : intakes.length === 0 ? (
          <Empty className="min-h-60">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardPen />
              </EmptyMedia>
              <EmptyTitle>Créez votre première collecte</EmptyTitle>
              <EmptyDescription>
                Concevez un formulaire public pour recueillir des réponses, des pièces jointes et
                les exploiter dans l’encyclopédie ou en archive ZIP.
              </EmptyDescription>
            </EmptyHeader>
            <Button type="button" variant="outline" onClick={onNewIntake}>
              <Plus data-icon="inline-start" />
              Créer une collecte
            </Button>
          </Empty>
        ) : (
          <DirectoryList>
            {intakes.map((intake) => {
              const manageable = canManageCollaboratorResource(
                intake.owner,
                userLogin,
                isAdministrator
              )
              const responsesLabel = `${intake.submissionCount} réponse${intake.submissionCount === 1 ? '' : 's'}`

              return (
                <DirectoryRow
                  key={intake.id}
                  selected={intake.id === selectedIntakeId}
                  onSelect={() => onSelectIntake(intake)}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{intake.name}</p>
                      {intake.publishToKnowledge ? (
                        <Badge variant="outline">Encyclopédie</Badge>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground max-h-[2lh] overflow-hidden text-xs text-balance">
                      {intake.description || '—'}
                    </p>
                  </div>

                  <CollaboratorAccessAvatars owner={intake.owner} mentions={intake.mentions} />

                  <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                    <Badge variant={intakeStatusVariant(intake.status)}>
                      {intakeStatusLabel(intake.status)}
                    </Badge>
                    <span className="tabular-nums">{responsesLabel}</span>
                    {intake.lastSubmissionAt ? (
                      <>
                        <span className="text-muted-foreground" aria-hidden>
                          ·
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {formatIntakeTimestamp(intake.lastSubmissionAt)}
                        </span>
                      </>
                    ) : null}
                  </div>

                  <div
                    className="flex items-center gap-1"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {intake.status === 'published' && intake.token ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label="Copier le lien public"
                              onClick={() => onCopyLink(intake)}
                            />
                          }
                        >
                          <Copy />
                        </TooltipTrigger>
                        <TooltipContent>Copier le lien public</TooltipContent>
                      </Tooltip>
                    ) : null}

                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Prévisualiser"
                            onClick={() => onPreview(intake)}
                          />
                        }
                      >
                        <Eye />
                      </TooltipTrigger>
                      <TooltipContent>Prévisualiser</TooltipContent>
                    </Tooltip>

                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Actions de la collecte"
                          />
                        }
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {manageable ? (
                          <DropdownMenuItem onClick={() => onSelectIntake(intake)}>
                            <Pencil />
                            Modifier
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onClick={() => onPreview(intake)}>
                          <Eye />
                          Prévisualiser
                        </DropdownMenuItem>
                        {intake.status === 'published' && intake.token ? (
                          <DropdownMenuItem onClick={() => onCopyLink(intake)}>
                            <Copy />
                            Copier le lien public
                          </DropdownMenuItem>
                        ) : null}
                        {intake.publishedAt ? (
                          <DropdownMenuItem onClick={() => onExportZip(intake)}>
                            <FileArchive />
                            Exporter en ZIP
                          </DropdownMenuItem>
                        ) : null}
                        {intake.publishToKnowledge && isAdministrator ? (
                          <DropdownMenuItem onClick={() => requestSetup('knowledge')}>
                            <BookOpen />
                            Ouvrir l’Encyclopédie
                          </DropdownMenuItem>
                        ) : null}

                        {manageable ? (
                          <>
                            <DropdownMenuSeparator />
                            {intake.status === 'draft' ? (
                              <DropdownMenuItem onClick={() => onAction('publish', intake)}>
                                <Globe />
                                Publier
                              </DropdownMenuItem>
                            ) : null}
                            {intake.status === 'published' ? (
                              <>
                                <DropdownMenuItem onClick={() => onAction('revoke', intake)}>
                                  <Link2Off />
                                  Révoquer et régénérer le lien
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAction('close', intake)}>
                                  <Lock />
                                  Clôturer
                                </DropdownMenuItem>
                              </>
                            ) : null}
                            {intake.status === 'closed' ? (
                              <DropdownMenuItem onClick={() => onAction('reopen', intake)}>
                                <LockOpen />
                                Rouvrir
                              </DropdownMenuItem>
                            ) : null}
                            {intake.publishedAt ? (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => onAction('purge', intake)}
                              >
                                <Eraser />
                                Purger les réponses
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => onAction('delete', intake)}
                            >
                              <Trash2 />
                              Supprimer
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </DirectoryRow>
              )
            })}
          </DirectoryList>
        )}
      </div>
    </section>
  )
}
