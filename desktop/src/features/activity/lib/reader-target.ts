export type ReaderTarget =
  | { kind: 'update'; slug: string; title: string; date: string }
  | {
      kind: 'automation'
      activityId: number | string
      automationId: string
      title?: string
      content?: string
      date?: string
    }
