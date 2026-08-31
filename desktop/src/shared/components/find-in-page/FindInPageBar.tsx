import { ChevronDown, ChevronUp, X } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { ButtonGroup } from '@/shared/components/ui/button-group'
import { InputGroup, InputGroupInput } from '@/shared/components/ui/input-group'

import { useFindInPage } from './use-find-in-page'

export function FindInPageBar() {
  const { open, query, setQuery, match, inputRef, close, findNext } = useFindInPage()

  if (!open) return null

  const matchLabel =
    !query || !match ? '' : match.total === 0 ? '0/0' : `${match.active}/${match.total}`

  return (
    <div
      data-find-in-page
      className="bg-popover text-popover-foreground border-border fixed top-3 right-3 z-50 flex h-7 items-center gap-1 rounded-md border px-1 shadow-md"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          close()
          return
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          findNext(!e.shiftKey)
        }
      }}
    >
      <InputGroup className="h-7 w-48 border-0 bg-transparent shadow-none">
        <InputGroupInput
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher"
          aria-label="Rechercher dans la page"
          className="h-7"
        />
      </InputGroup>
      <span className="pierre-meta min-w-10 px-1 text-center tabular-nums">{matchLabel}</span>
      <ButtonGroup>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          aria-label="Occurrence précédente"
          onClick={() => findNext(false)}
        >
          <ChevronUp />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          aria-label="Occurrence suivante"
          onClick={() => findNext(true)}
        >
          <ChevronDown />
        </Button>
      </ButtonGroup>
      <Button type="button" variant="ghost" size="icon-xs" aria-label="Fermer" onClick={close}>
        <X />
      </Button>
    </div>
  )
}
