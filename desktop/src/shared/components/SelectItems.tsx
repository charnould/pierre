import type { ReactNode } from 'react'

import { SelectGroup, SelectItem } from '@/shared/components/ui/select'

/**
 * Base UI résout le libellé de `SelectValue` depuis la prop `items` de la racine `Select`.
 * Le contenu du menu en est la transcription exacte : rendre les deux à la main les laisse diverger.
 * Une entrée `value: null` n'appartient à `items` que si la sélectionner efface réellement la
 * valeur — un placeholder non sélectionnable passe par `<SelectValue placeholder=… />`.
 */
export interface SelectOption<T extends string | null = string | null> {
  label: ReactNode
  value: T
  disabled?: boolean
}

export function SelectItems<T extends string | null>({ items }: { items: SelectOption<T>[] }) {
  return (
    <SelectGroup>
      {items.map((item) => (
        <SelectItem key={item.value ?? 'none'} value={item.value} disabled={item.disabled}>
          {item.label}
        </SelectItem>
      ))}
    </SelectGroup>
  )
}
