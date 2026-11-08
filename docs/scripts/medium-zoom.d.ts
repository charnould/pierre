declare module 'medium-zoom' {
  interface Zoom {
    on(event: 'open' | 'closed', callback: () => void): void
  }

  export default function mediumZoom(
    selector: string,
    options?: { background?: string; margin?: number }
  ): Zoom
}
