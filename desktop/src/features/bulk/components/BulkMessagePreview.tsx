import type { PreviewMessageResult } from '@/shared/types/bulk-operations'

export function BulkMessagePreview({ preview }: { preview: PreviewMessageResult }) {
  if (preview.kind === 'pdf') {
    return (
      <object
        aria-label={preview.filename}
        className="h-[60vh] w-full rounded-md border"
        data={`data:${preview.mimeType};base64,${preview.pdfBase64}`}
        type={preview.mimeType}
      />
    )
  }
  if (preview.kind === 'rich_rcs') {
    return (
      <div className="space-y-4">
        <p className="whitespace-pre-wrap">{preview.body}</p>
        <pre className="overflow-x-auto font-mono text-xs whitespace-pre-wrap">
          {JSON.stringify(preview.richContent, null, 2)}
        </pre>
      </div>
    )
  }
  return (
    <pre className="overflow-x-auto font-mono text-xs whitespace-pre-wrap">{preview.rendered}</pre>
  )
}
