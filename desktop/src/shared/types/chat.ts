export type ReasoningDisplay = 'off' | 'partial' | 'full'

export type SkillSummary = {
  id: string
  display: string
  reasoning_display: ReasoningDisplay
}

export type ChatBootData = {
  convId: string
  configId: string
  dataParam: string
  disclaimer: string | null
  greeting: string[]
  examples: string[]
  displayableConfigs: { id: string; display: string; is_active: boolean }[]
  assetId: string
  reasoningDisplay: ReasoningDisplay
  layout: 'default' | 'compact'
}
