declare module '*.css' {
  const content: string
  export default content
}

declare module '*.webp' {
  const src: string
  export default src
}

declare module '*.md' {
  const content: string
  export default content
}

declare module '*.md?raw' {
  const content: string
  export default content
}

declare module '*.docx?url' {
  const src: string
  export default src
}

interface ImportMeta {
  glob: (
    pattern: string,
    options?: {
      query?: string
      import?: string
      eager?: boolean
    }
  ) => Record<string, unknown>
}
