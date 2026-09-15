"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Download, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DialogPatternBody,
  DialogPatternDescription,
  DialogPatternFooter,
  DialogPatternHeader,
  DialogPatternTitle,
} from "@/components/editor/dialog-pattern"
import { SpecMarkdown } from "@/components/editor/spec-markdown"
import {
  formatSpecDate,
  specFileUrl,
  type ProjectSpecSummary,
} from "@/hooks/useProjectSpecs"

/* -------------------------------------------------------------------------- */
/*  Spec Preview Dialog                                                       */
/* -------------------------------------------------------------------------- */

interface SpecPreviewDialogProps {
  spec: ProjectSpecSummary
  projectId: string
  /** Reads the Markdown through the authenticated route. */
  loadContent: (specId: string) => Promise<string>
  onClose: () => void
}

/**
 * Shows one generated spec as rendered Markdown.
 *
 * The caller mounts this per spec (keyed by id) and unmounts it on close, so the
 * document exists in memory only while the dialog is open. Escape and the close
 * button are handled by the dialog primitive, which also traps focus.
 */
export function SpecPreviewDialog({
  spec,
  projectId,
  loadContent,
  onClose,
}: SpecPreviewDialogProps) {
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    // Every state update happens after an await, never synchronously while the
    // effect body runs.
    const load = async () => {
      try {
        const text = await loadContent(spec.id)
        if (cancelled) return

        setContent(text)
        setError(null)
      } catch (cause) {
        if (cancelled) return

        setError(cause instanceof Error ? cause.message : null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [spec.id, loadContent])

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {/* A definite height, not a max height: the scroll area's viewport is
          `height: 100%`, which only resolves against a definite parent, so a
          capped-but-auto dialog would let a long spec overflow instead of
          scrolling inside it. */}
      <DialogContent
        className="flex h-[80vh] flex-col gap-0 border-border bg-elevated p-0 sm:max-w-2xl !rounded-3xl"
        showCloseButton={false}
      >
        <DialogPatternHeader className="shrink-0 border-b border-surface-border">
          <DialogPatternTitle className="truncate font-mono text-sm">
            {spec.filename}
          </DialogPatternTitle>
          <DialogPatternDescription className="text-xs">
            Generated <time dateTime={spec.createdAt}>{formatSpecDate(spec.createdAt)}</time>
          </DialogPatternDescription>
        </DialogPatternHeader>

        <ScrollArea className="min-h-0 flex-1">
          <DialogPatternBody className="flex h-full flex-col px-6 py-4">
            {isLoading ? (
              <div
                role="status"
                aria-busy="true"
                className="flex flex-1 items-center justify-center gap-2 text-xs text-copy-muted"
              >
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Loading spec…
              </div>
            ) : error ? (
              <div
                role="alert"
                className="flex items-start gap-2 self-start rounded-xl border border-error/40 bg-error/10 px-3 py-2 text-xs text-error"
              >
                <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 break-words">{error}</span>
              </div>
            ) : (
              <SpecMarkdown content={content} />
            )}
          </DialogPatternBody>
        </ScrollArea>

        <DialogPatternFooter className="shrink-0 border-surface-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            className="bg-ai text-copy-primary hover:bg-ai/90"
            render={<a href={specFileUrl(projectId, spec.id)} download />}
          >
            <Download className="size-4" />
            Download
          </Button>
        </DialogPatternFooter>
      </DialogContent>
    </Dialog>
  )
}
