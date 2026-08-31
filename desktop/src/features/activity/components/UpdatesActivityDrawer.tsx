import { X } from 'lucide-react'

import { useUpdateArticle } from '@/features/activity/hooks/useUpdateArticle'
import { UpdateArticleBody } from '@/features/updates/components/UpdateArticleBody'
import { UpdatesEntryMeta } from '@/features/updates/components/UpdatesEntryMeta'
import { Button } from '@/shared/components/ui/button'
import { DrawerTitle } from '@/shared/components/ui/drawer'
import { Spinner } from '@/shared/components/ui/spinner'

interface Props {
  slug: string
  title: string
  date: string
  onClose: () => void
}

/**
 * Corps du nested drawer changelog — le parent (ActivityPanel) fournit déjà
 * le Drawer / DrawerContent (même pattern que tickets / repayment).
 */
export function UpdatesActivityDrawer({ slug, title, date, onClose }: Props) {
  const { markdown, loading, error } = useUpdateArticle(slug)

  return (
    <>
      <DrawerTitle className="sr-only">{title}</DrawerTitle>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-border shrink-0 border-b px-4 pt-3 pb-4">
          <div className="flex items-center justify-between gap-2">
            <UpdatesEntryMeta date={date} />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="-me-1.5"
              aria-label="Close"
              onClick={onClose}
            >
              <X />
            </Button>
          </div>
          <h1 className="pierre-display m-0 mt-3 text-balance">{title}</h1>
        </header>

        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 px-4 py-4 text-sm">
            <Spinner className="size-4" />
            Chargement…
          </div>
        ) : error ? (
          <p className="text-destructive px-4 py-4 text-sm">{error}</p>
        ) : markdown ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <UpdateArticleBody markdown={markdown} />
          </div>
        ) : null}
      </div>
    </>
  )
}
