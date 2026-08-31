export type WorkflowOutputDockProps = {
  onSlotChange: (el: HTMLDivElement | null) => void
}

export function WorkflowOutputDock({ onSlotChange }: WorkflowOutputDockProps) {
  return (
    <div
      ref={onSlotChange}
      className="flex h-full w-full min-w-0 items-center"
      data-editor-slot="reponse"
    />
  )
}
