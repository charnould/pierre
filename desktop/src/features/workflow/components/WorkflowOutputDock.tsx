export type WorkflowOutputDockProps = {
  onSlotChange: (el: HTMLDivElement | null) => void
}

export function WorkflowOutputDock({ onSlotChange }: WorkflowOutputDockProps) {
  return (
    <div
      ref={onSlotChange}
      className="desk-output-dock-slot flex w-full min-w-0 items-center"
      data-editor-slot="reponse"
    />
  )
}
