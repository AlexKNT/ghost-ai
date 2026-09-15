"use client"

import { useState } from "react"
import { AlertCircle, Download, FileText, Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SpecPreviewDialog } from "@/components/editor/spec-preview-dialog"
import {
  formatSpecDate,
  specFileUrl,
  useProjectSpecs,
  type ProjectSpecSummary,
} from "@/hooks/useProjectSpecs"

/* -------------------------------------------------------------------------- */
/*  Specs tab                                                                 */
/* -------------------------------------------------------------------------- */

/** Download control shared by the list rows and the preview dialog. */
function SpecDownloadAction({
  projectId,
  spec,
  className,
}: {
  projectId: string
  spec: ProjectSpecSummary
  className?: string
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Download ${spec.filename}`}
      title="Download spec"
      className={className}
      render={<a href={specFileUrl(projectId, spec.id)} download />}
    >
      <Download className="size-3.5" />
    </Button>
  )
}

function SpecListItem({
  spec,
  projectId,
  onOpen,
}: {
  spec: ProjectSpecSummary
  projectId: string
  onOpen: (spec: ProjectSpecSummary) => void
}) {
  return (
    <li className="flex items-center gap-2 rounded-2xl border border-surface-border bg-elevated p-3 transition-colors hover:border-subtle-border">
      <button
        type="button"
        onClick={() => onOpen(spec)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
          <FileText className="size-4" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-copy-primary">
            {spec.filename}
          </span>
          <time
            dateTime={spec.createdAt}
            className="truncate text-xs text-copy-muted"
          >
            {formatSpecDate(spec.createdAt)}
          </time>
        </span>
      </button>

      <SpecDownloadAction projectId={projectId} spec={spec} className="shrink-0" />
    </li>
  )
}

/**
 * Specs generated for the project, newest first.
 *
 * The list is fetched when the tab opens, so returning to it after generating a
 * spec shows the new document. Selecting a row opens the preview, which reads
 * the Markdown on demand and holds it only while it is open.
 */
export function SpecsTab({ projectId }: { projectId: string }) {
  const { specs, isLoading, error, loadContent } = useProjectSpecs(projectId)
  const [selected, setSelected] = useState<ProjectSpecSummary | null>(null)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4">
      <Button
        type="button"
        variant="ghost"
        className="w-full shrink-0 bg-ai text-copy-primary hover:bg-ai/90"
      >
        <Sparkles className="size-4" />
        Generate Spec
      </Button>

      {isLoading ? (
        <div
          role="status"
          aria-busy="true"
          className="flex items-center gap-2 px-1 text-xs text-copy-muted"
        >
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Loading specs…
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-error/40 bg-error/10 px-3 py-2 text-xs text-error"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 break-words">{error}</span>
        </div>
      ) : specs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-ai/15">
            <FileText className="size-6 text-ai-text" aria-hidden="true" />
          </div>
          <p className="max-w-56 text-sm text-copy-muted">
            No specs yet. Generated specifications for this project will appear
            here.
          </p>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <ul className="flex flex-col gap-2 pr-1">
            {specs.map((spec) => (
              <SpecListItem
                key={spec.id}
                spec={spec}
                projectId={projectId}
                onOpen={setSelected}
              />
            ))}
          </ul>
        </ScrollArea>
      )}

      {/* Keyed by spec so switching documents never shows the previous one. */}
      {selected && (
        <SpecPreviewDialog
          key={selected.id}
          spec={selected}
          projectId={projectId}
          loadContent={loadContent}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
