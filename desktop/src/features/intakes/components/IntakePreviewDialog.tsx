import { useMemo } from 'react'

import {
  groupIntakeFieldsBySection,
  IntakeNoticeCard,
  IntakePasswordCard,
  IntakeSectionCards
} from '@/shared/components/IntakeFormFields'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import type { IntakeConfig } from '@/shared/types/intakes'

interface Props {
  open: boolean
  onClose: () => void
  organizationName?: string | null
  name: string
  description?: string
  config: IntakeConfig
}

export function IntakePreviewDialog({
  open,
  onClose,
  organizationName,
  name,
  description,
  config
}: Props) {
  const title = config.form.title.trim() || name.trim() || 'Collecte sans titre'
  const intro = config.form.description?.trim() || description?.trim() || ''
  const notice = config.form.notice?.trim() || ''
  const hasPassword = config.access.passwords.some((password) => password.trim().length > 0)
  const sections = useMemo(
    () => groupIntakeFieldsBySection(config.form.fields),
    [config.form.fields]
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent viewport="form" className="overflow-y-auto sm:max-w-xl" showCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Aperçu</Badge>
            {organizationName ? (
              <span className="text-muted-foreground text-xs">{organizationName}</span>
            ) : null}
          </div>
          <DialogTitle>{title}</DialogTitle>
          {intro ? <DialogDescription>{intro}</DialogDescription> : null}
        </DialogHeader>

        <Card>
          <CardContent>
            <div className="flex flex-col gap-4">
              {hasPassword ? <IntakePasswordCard layout="stacked" disabled /> : null}

              {sections.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Aucun champ configuré pour le moment.
                </p>
              ) : (
                <IntakeSectionCards sections={sections} layout="stacked" disabled />
              )}

              {notice ? <IntakeNoticeCard notice={notice} /> : null}
            </div>
          </CardContent>
        </Card>

        <DialogFooter className="flex-col items-stretch sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            Aperçu uniquement — le bouton d’envoi est actif après publication.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button type="button" disabled>
              Envoyer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
