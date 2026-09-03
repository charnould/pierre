import { LoaderCircle } from 'lucide-react'
import { useSyncExternalStore, type ReactNode } from 'react'

import { BlockprintWormGear, CartoonErrorObject } from '@/shared/components/icons/koboyo-empty'
import { Button } from '@/shared/components/ui/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/components/ui/empty'
import {
  moduleReady,
  subscribeCustomization,
  useCustomizationStatus,
  type SetupEntry
} from '@/shared/lib/instance-customization'
import { requestSetup, useSetupAdministrator } from '@/shared/lib/open-setup'
import { cn } from '@/shared/lib/utils'

export function ModuleGate({
  entry,
  hidden = false,
  children
}: {
  entry: SetupEntry
  hidden?: boolean
  children: ReactNode
}) {
  const status = useCustomizationStatus()
  const administrator = useSetupAdministrator()
  const ready = useSyncExternalStore(subscribeCustomization, () => moduleReady(entry))
  if (status === 'ready' && ready) return children
  return (
    <div
      data-tab-panel
      className={cn(
        'relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background',
        hidden ? 'hidden' : 'flex'
      )}
    >
      {status === 'error' ? (
        <Empty className="min-h-40 flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CartoonErrorObject />
            </EmptyMedia>
            <EmptyTitle size="sm">Impossible de lire le paramétrage du serveur.</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : status !== 'ready' ? (
        <Empty className="min-h-40 flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LoaderCircle className="animate-spin" />
            </EmptyMedia>
            <EmptyTitle size="sm">Chargement du paramétrage…</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <Empty className="min-h-40 flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BlockprintWormGear />
            </EmptyMedia>
            <EmptyTitle size="sm">Module non paramétré</EmptyTitle>
          </EmptyHeader>
          {administrator ? (
            <Button type="button" variant="outline" onClick={() => requestSetup(entry)}>
              Paramétrer
            </Button>
          ) : null}
        </Empty>
      )}
    </div>
  )
}
