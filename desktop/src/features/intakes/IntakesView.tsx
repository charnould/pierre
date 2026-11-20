import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  IntakeCollaboratorDialog,
  IntakeFormDialog,
  type SaveIntakePayload
} from '@/features/intakes/components/IntakeFormDialog'
import { IntakePreviewDialog } from '@/features/intakes/components/IntakePreviewDialog'
import { IntakesList } from '@/features/intakes/components/IntakesList'
import { exportIntakeZipWithToast } from '@/features/intakes/lib/intake-downloads'
import {
  filterAndSortIntakes,
  intakePublicUrl,
  type IntakeSortKey
} from '@/features/intakes/lib/intake-ui'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { toast } from '@/shared/components/ui/toast'
import { canManageCollaboratorResource } from '@/shared/lib/collaborator-access'
import { ipcErrorMessage } from '@/shared/lib/ipc-error'
import { cn } from '@/shared/lib/utils'
import type { IntakeConfig, IntakeLifecycleAction, IntakeRecord } from '@/shared/types/intakes'
import type { IpcDataResult } from '@/shared/types/ipc'
import type { Settings } from '@/shared/types/settings'

export type IntakeMenuAction = IntakeLifecycleAction | 'delete'

interface Props {
  hidden: boolean
  agentName: string
  userLogin: string
  isAdministrator?: boolean
  settings: Settings
}

type IntakeDialogState = { mode: 'create' } | { mode: 'edit'; intakeId: string } | null
type ConfirmAction = { kind: IntakeMenuAction; intake: IntakeRecord }

type PreviewState = {
  name: string
  description: string
  config: IntakeConfig
}

type IntakeActionSpec = {
  fallbackError: string
  successMessage: string
  invoke: (url: string, id: string) => Promise<IpcDataResult<unknown>> | undefined
  confirm?: {
    title: string
    describe: (name: string) => string
    confirmLabel: string
    confirmVariant: 'default' | 'destructive'
  }
}

const lifecycleInvoke = (action: IntakeLifecycleAction) => (url: string, id: string) =>
  window.api?.runIntakeAction({ url, id, action })

const INTAKE_ACTIONS: Record<IntakeMenuAction, IntakeActionSpec> = {
  publish: {
    fallbackError: 'Publication impossible',
    successMessage: 'Collecte publiée',
    invoke: lifecycleInvoke('publish')
  },
  reopen: {
    fallbackError: 'Réouverture impossible',
    successMessage: 'Collecte rouverte',
    invoke: lifecycleInvoke('reopen')
  },
  revoke: {
    fallbackError: 'Révocation impossible',
    successMessage: 'Nouveau lien généré, l’ancien lien est révoqué',
    invoke: lifecycleInvoke('revoke'),
    confirm: {
      title: 'Révoquer le lien actuel ?',
      describe: (name) =>
        `L’ancien lien de « ${name} » ne fonctionnera plus et un nouveau lien sera généré immédiatement.`,
      confirmLabel: 'Révoquer le lien',
      confirmVariant: 'default'
    }
  },
  close: {
    fallbackError: 'Clôture impossible',
    successMessage: 'Collecte clôturée',
    invoke: lifecycleInvoke('close'),
    confirm: {
      title: 'Clôturer la collecte ?',
      describe: (name) =>
        `Le lien public de « ${name} » sera désactivé. Les réponses déjà enregistrées restent consultables et exportables.`,
      confirmLabel: 'Clôturer',
      confirmVariant: 'default'
    }
  },
  purge: {
    fallbackError: 'Purge impossible',
    successMessage: 'Réponses purgées',
    invoke: lifecycleInvoke('purge'),
    confirm: {
      title: 'Purger toutes les réponses ?',
      describe: (name) =>
        `Toutes les réponses et pièces jointes enregistrées dans « ${name} » seront définitivement supprimées. La collecte reste active.`,
      confirmLabel: 'Purger',
      confirmVariant: 'destructive'
    }
  },
  delete: {
    fallbackError: 'Suppression impossible',
    successMessage: 'Collecte supprimée',
    invoke: (url, id) => window.api?.deleteIntake({ url, id }),
    confirm: {
      title: 'Supprimer la collecte ?',
      describe: (name) =>
        `La collecte « ${name} », sa table de réponses et toutes ses pièces jointes seront supprimées définitivement.`,
      confirmLabel: 'Supprimer',
      confirmVariant: 'destructive'
    }
  }
}

async function fetchIntakes(url: string): Promise<IntakeRecord[] | null> {
  return (await window.api?.getIntakes({ url }))?.data ?? null
}

export function IntakesView({
  hidden,
  agentName,
  userLogin,
  isAdministrator = false,
  settings
}: Props) {
  const [intakes, setIntakes] = useState<IntakeRecord[]>([])
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<IntakeSortKey>('recent')
  const [dialog, setDialog] = useState<IntakeDialogState>(null)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const selectedIntake =
    dialog?.mode === 'edit' ? (intakes.find((item) => item.id === dialog.intakeId) ?? null) : null
  const dialogOpen = dialog !== null && (dialog.mode === 'create' || selectedIntake !== null)
  const canEditSelected =
    dialog?.mode === 'create' ||
    (selectedIntake
      ? canManageCollaboratorResource(selectedIntake.owner, userLogin, isAdministrator)
      : false)

  const dialogOpenRef = useRef(dialogOpen)
  useEffect(() => {
    dialogOpenRef.current = dialogOpen
  }, [dialogOpen])

  const normalizedQuery = query.trim()
  const sortedIntakes = useMemo(
    () => filterAndSortIntakes(intakes, query, sortKey),
    [intakes, query, sortKey]
  )

  const refresh = useCallback(async () => {
    if (!settings.url || !userLogin) return
    const data = await fetchIntakes(settings.url)
    if (data) setIntakes(data)
  }, [settings.url, userLogin])

  useEffect(() => {
    if (hidden || !settings.url || !window.api?.getIntakes || !userLogin) return
    let cancelled = false
    const url = settings.url
    const poll = () => {
      void fetchIntakes(url).then((data) => {
        if (!cancelled && data) setIntakes(data)
      })
    }
    if (!dialogOpenRef.current) poll()
    const id = window.setInterval(() => {
      if (!dialogOpenRef.current) poll()
    }, 15_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [hidden, settings.url, userLogin])

  const closeDialog = () => setDialog(null)

  async function runIntakeMutation(
    invoke: () => Promise<IpcDataResult<unknown>> | undefined,
    fallbackError: string,
    successMessage: string,
    afterSuccess?: () => void
  ): Promise<boolean> {
    const res = await invoke()
    const refused = ipcErrorMessage(res, fallbackError)
    if (refused) {
      toast.add({ title: refused, type: 'error' })
      return false
    }
    await refresh()
    afterSuccess?.()
    toast.add({ title: successMessage, type: 'success' })
    return true
  }

  async function handleSave(payload: SaveIntakePayload) {
    if (!settings.url || !window.api) return
    const url = settings.url
    setSaving(true)
    try {
      if (payload.mode === 'patch' && selectedIntake) {
        const intakeId = selectedIntake.id
        await runIntakeMutation(
          () => window.api?.patchIntake({ url, id: intakeId, patch: payload.body }),
          'Enregistrement impossible',
          'Collecte mise à jour',
          closeDialog
        )
        return
      }

      if (payload.mode === 'create') {
        await runIntakeMutation(
          () => window.api?.createIntake({ url, ...payload.body }),
          'Création impossible',
          'Collecte créée',
          closeDialog
        )
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleCopyLink(intake: IntakeRecord) {
    const link = intakePublicUrl(settings.url, intake.token)
    if (!link) return
    try {
      if (window.api?.writeClipboard) {
        const copied = await window.api.writeClipboard(link)
        if (!copied) throw new Error('clipboard_write_failed')
      } else {
        await navigator.clipboard.writeText(link)
      }
      toast.add({ title: 'Lien public copié dans le presse-papiers', type: 'success' })
    } catch {
      toast.add({ title: 'Impossible de copier le lien', type: 'error' })
    }
  }

  async function handleExportZip(intake: IntakeRecord) {
    if (!settings.url) return
    await exportIntakeZipWithToast({
      url: settings.url,
      id: intake.id,
      suggestedFilename: `${intake.tableName}.zip`
    })
  }

  async function executeAction(kind: IntakeMenuAction, intake: IntakeRecord) {
    if (!settings.url) return
    const url = settings.url
    const spec = INTAKE_ACTIONS[kind]
    await runIntakeMutation(
      () => spec.invoke(url, intake.id),
      spec.fallbackError,
      spec.successMessage,
      kind === 'delete' && dialog?.mode === 'edit' && dialog.intakeId === intake.id
        ? closeDialog
        : undefined
    )
  }

  function handleAction(kind: IntakeMenuAction, intake: IntakeRecord) {
    if (INTAKE_ACTIONS[kind].confirm) {
      setConfirmAction({ kind, intake })
      return
    }
    void executeAction(kind, intake)
  }

  async function handleConfirmedAction() {
    if (!confirmAction) return
    const { kind, intake } = confirmAction
    setConfirmAction(null)
    await executeAction(kind, intake)
  }

  const confirmSpec = confirmAction ? INTAKE_ACTIONS[confirmAction.kind].confirm : null

  return (
    <div
      data-tab-panel
      className={cn(
        'bg-background relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
        hidden ? 'hidden' : 'flex'
      )}
    >
      {!hidden ? (
        <div className="flex min-h-0 w-full min-w-0 flex-1 scroll-pb-4 flex-col overflow-x-hidden overflow-y-auto overscroll-contain pb-6">
          <IntakesList
            intakes={sortedIntakes}
            url={settings.url}
            userLogin={userLogin}
            isAdministrator={isAdministrator}
            query={query}
            normalizedQuery={normalizedQuery}
            onQueryChange={setQuery}
            sortKey={sortKey}
            onSortKeyChange={setSortKey}
            selectedIntakeId={selectedIntake?.id ?? null}
            onSelectIntake={(intake) => setDialog({ mode: 'edit', intakeId: intake.id })}
            onNewIntake={() => setDialog({ mode: 'create' })}
            onPreview={(intake) =>
              setPreview({
                name: intake.name,
                description: intake.description,
                config: intake.config
              })
            }
            onCopyLink={(intake) => void handleCopyLink(intake)}
            onExportZip={(intake) => void handleExportZip(intake)}
            onAction={handleAction}
          />
        </div>
      ) : null}

      {dialogOpen && canEditSelected ? (
        <IntakeFormDialog
          key={selectedIntake?.id ?? 'new'}
          open
          intake={dialog?.mode === 'create' ? null : selectedIntake}
          url={settings.url}
          userLogin={userLogin}
          isAdministrator={isAdministrator}
          saving={saving}
          onClose={closeDialog}
          onSave={handleSave}
          onPreview={setPreview}
        />
      ) : null}

      {dialogOpen && !canEditSelected && selectedIntake ? (
        <IntakeCollaboratorDialog
          open
          intake={selectedIntake}
          onClose={closeDialog}
          onPreview={setPreview}
          onCopyLink={(intake) => void handleCopyLink(intake)}
          onExportZip={(intake) => void handleExportZip(intake)}
        />
      ) : null}

      {preview ? (
        <IntakePreviewDialog
          open
          onClose={() => setPreview(null)}
          organizationName={agentName}
          name={preview.name}
          description={preview.description}
          config={preview.config}
        />
      ) : null}

      {confirmAction && confirmSpec ? (
        <ConfirmDialog
          open
          title={confirmSpec.title}
          description={confirmSpec.describe(confirmAction.intake.name)}
          confirmLabel={confirmSpec.confirmLabel}
          confirmVariant={confirmSpec.confirmVariant}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => void handleConfirmedAction()}
        />
      ) : null}
    </div>
  )
}
