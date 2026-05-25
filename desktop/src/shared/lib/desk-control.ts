import { cva, type VariantProps } from 'class-variance-authority'

/** Champs formulaire desk — ref. Automations (detail pane). */
export const deskControlVariants = cva('', {
  variants: {
    variant: {
      default: '',
      desk: 'border-input/80 bg-surface-inset shadow-xs'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
})

export type DeskControlVariant = VariantProps<typeof deskControlVariants>['variant']
