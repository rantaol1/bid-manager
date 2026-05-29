'use client'

import { format } from 'date-fns'
import { Download } from 'lucide-react'
import type { DeliverableVersionDTO } from '@/hooks/use-deliverables'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function VersionHistory({ versions }: { versions: DeliverableVersionDTO[] }) {
  return (
    <ul className="space-y-2">
      {versions.map((v) => (
        <li key={v.id} className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-medium">
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">v{v.version}</span>
              <span className="truncate">{v.fileName}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(v.createdAt), 'd MMM yyyy, HH:mm')} · {formatSize(v.fileSize)}
              {v.changeSummary ? ` · ${v.changeSummary}` : ''}
            </p>
          </div>
          <a
            href={v.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1 text-magenta hover:underline"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
        </li>
      ))}
    </ul>
  )
}
