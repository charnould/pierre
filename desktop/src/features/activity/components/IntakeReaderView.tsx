import { Download, FileArchive, Paperclip } from 'lucide-react'
import { useState } from 'react'

import type { ReaderTarget } from '@/features/activity/lib/reader-target'
import {
  downloadIntakeFileWithToast,
  exportIntakeZipWithToast
} from '@/features/intakes/lib/intake-downloads'
import { formatActivityValue } from '@/shared/components/timeline/timeline-bodies'
import { Button } from '@/shared/components/ui/button'
import { Spinner } from '@/shared/components/ui/spinner'
import { formatAttachmentBytes } from '@/shared/lib/attachment-files'

type IntakeReaderTarget = Extract<ReaderTarget, { kind: 'intake' }>

function formatIntakeDate(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(parsed)
}

export function IntakeExportZipButton({ intakeId, url }: { intakeId: string; url: string }) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportIntakeZipWithToast({ url, id: intakeId })
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={exporting}
      onClick={() => void handleExport()}
    >
      {exporting ? <Spinner /> : <FileArchive data-icon="inline-start" />}
      Exporter en ZIP
    </Button>
  )
}

export function IntakeReaderBody({ target, url }: { target: IntakeReaderTarget; url?: string }) {
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null)
  const { content, intakeId } = target
  const values = Object.entries(content.values ?? {})
  const files = content.files ?? []

  const handleDownloadFile = async (filename: string) => {
    if (!url || !content.submissionId) return
    setDownloadingKey(filename)
    try {
      await downloadIntakeFileWithToast({
        url,
        id: intakeId,
        submissionId: content.submissionId,
        filename
      })
    } finally {
      setDownloadingKey(null)
    }
  }

  return (
    <>
      <p className="text-muted-foreground text-xs tabular-nums">{formatIntakeDate(target.date)}</p>
      {content.note ? <p className="text-sm leading-relaxed">{content.note}</p> : null}
      {values.length > 0 ? (
        <dl className="grid grid-cols-1 gap-3 border-t pt-4">
          {values.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
              <dd className="text-sm break-words whitespace-pre-wrap">
                {formatActivityValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {files.length > 0 && content.submissionId && url ? (
        <div className="flex flex-col gap-2 border-t pt-4">
          <p className="text-muted-foreground text-xs font-medium">Pièces jointes</p>
          <div className="flex flex-wrap gap-2">
            {files.map((file) => {
              const busy = downloadingKey === file.filename
              return (
                <Button
                  key={`${file.field}:${file.filename}`}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void handleDownloadFile(file.filename)}
                >
                  {busy ? <Spinner /> : <Paperclip data-icon="inline-start" aria-hidden />}
                  <span>{file.filename}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    ({formatAttachmentBytes(file.sizeBytes)})
                  </span>
                  <Download data-icon="inline-end" aria-hidden />
                </Button>
              )
            })}
          </div>
        </div>
      ) : null}
    </>
  )
}
