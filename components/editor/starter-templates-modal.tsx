"use client"

import { useCallback, useRef, useEffect } from "react"
import { LayoutTemplate, Import } from "lucide-react"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import {
  DialogPatternHeader,
  DialogPatternTitle,
  DialogPatternDescription,
  DialogPatternBody,
} from "@/components/editor/dialog-pattern"

import { CANVAS_TEMPLATES, type CanvasTemplate } from "@/components/editor/starter-templates"
import type { CanvasNodeData } from "@/types/canvas"

/* -------------------------------------------------------------------------- */
/*  Preview constants                                                         */
/* -------------------------------------------------------------------------- */

const PREVIEW_WIDTH = 280
const PREVIEW_HEIGHT = 160
const PREVIEW_PADDING = 12
const NODE_RADIUS = 4

/* -------------------------------------------------------------------------- */
/*  Diagram preview — lightweight canvas drawing, no React Flow               */
/* -------------------------------------------------------------------------- */

interface DiagramPreviewProps {
  template: CanvasTemplate
}

function DiagramPreview({ template }: DiagramPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = PREVIEW_WIDTH * dpr
    canvas.height = PREVIEW_HEIGHT * dpr

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.scale(dpr, dpr)

    // Clear
    ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT)

    // Calculate bounds from node positions
    const nodes = template.nodes
    if (nodes.length === 0) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of nodes) {
      const x = n.position.x
      const y = n.position.y
      const d = n.data as unknown as CanvasNodeData
      const w = d.width
      const h = d.height
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x + w > maxX) maxX = x + w
      if (y + h > maxY) maxY = y + h
    }

    const graphW = maxX - minX || 1
    const graphH = maxY - minY || 1
    const drawW = PREVIEW_WIDTH - PREVIEW_PADDING * 2
    const drawH = PREVIEW_HEIGHT - PREVIEW_PADDING * 2

    const scale = Math.min(drawW / graphW, drawH / graphH)
    const offsetX = PREVIEW_PADDING + (drawW - graphW * scale) / 2
    const offsetY = PREVIEW_PADDING + (drawH - graphH * scale) / 2

    const tx = (x: number) => (x - minX) * scale + offsetX
    const ty = (y: number) => (y - minY) * scale + offsetY
    const ts = (s: number) => s * scale

    // Build a map of node centers for edge drawing
    const centers = new Map<string, { cx: number; cy: number }>()
    for (const n of nodes) {
      const d = n.data as unknown as CanvasNodeData
      centers.set(n.id, {
        cx: tx(n.position.x + d.width / 2),
        cy: ty(n.position.y + d.height / 2),
      })
    }

    // Draw edges
    ctx.strokeStyle = "rgba(240, 240, 244, 0.25)"
    ctx.lineWidth = 1
    for (const e of template.edges) {
      const src = centers.get(e.source)
      const tgt = centers.get(e.target)
      if (!src || !tgt) continue
      ctx.beginPath()
      ctx.moveTo(src.cx, src.cy)
      ctx.lineTo(tgt.cx, tgt.cy)
      ctx.stroke()
    }

    // Draw nodes
    for (const n of nodes) {
      const d = n.data as unknown as CanvasNodeData
      const nx = tx(n.position.x)
      const ny = ty(n.position.y)
      const nw = ts(d.width)
      const nh = ts(d.height)
      const r = NODE_RADIUS * scale

      ctx.fillStyle = d.color

      switch (d.shape) {
        case "rectangle":
          ctx.beginPath()
          ctx.roundRect(nx, ny, nw, nh, r)
          ctx.fill()
          break
        case "pill":
          ctx.beginPath()
          ctx.roundRect(nx, ny, nw, nh, Math.min(nw, nh) / 2)
          ctx.fill()
          break
        case "circle": {
          const s = Math.min(nw, nh)
          ctx.beginPath()
          ctx.arc(nx + nw / 2, ny + nh / 2, s / 2, 0, Math.PI * 2)
          ctx.fill()
          break
        }
        case "diamond": {
          const hw = nw / 2
          const hh = nh / 2
          ctx.beginPath()
          ctx.moveTo(nx + hw, ny)
          ctx.lineTo(nx + nw, ny + hh)
          ctx.lineTo(nx + hw, ny + nh)
          ctx.lineTo(nx, ny + hh)
          ctx.closePath()
          ctx.fill()
          break
        }
        case "hexagon": {
          const qx = nw * 0.2
          const qy = nh * 0.2
          ctx.beginPath()
          ctx.moveTo(nx + qx, ny)
          ctx.lineTo(nx + nw - qx, ny)
          ctx.lineTo(nx + nw, ny + qy)
          ctx.lineTo(nx + nw, ny + nh - qy)
          ctx.lineTo(nx + nw - qx, ny + nh)
          ctx.lineTo(nx + qx, ny + nh)
          ctx.lineTo(nx, ny + nh - qy)
          ctx.lineTo(nx, ny + qy)
          ctx.closePath()
          ctx.fill()
          break
        }
        case "cylinder": {
          const hw = nw / 2
          const eh = nh * 0.2
          // Body
          ctx.beginPath()
          ctx.rect(nx, ny + eh, nw, nh - eh * 2)
          ctx.fill()
          // Bottom ellipse
          ctx.beginPath()
          ctx.ellipse(nx + hw, ny + nh - eh, hw, eh, 0, 0, Math.PI * 2)
          ctx.fill()
          // Top ellipse
          ctx.beginPath()
          ctx.ellipse(nx + hw, ny + eh, hw, eh, 0, 0, Math.PI * 2)
          ctx.fill()
          break
        }
      }
    }
  }, [template])

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg bg-[#080809]"
      style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*  Template card                                                             */
/* -------------------------------------------------------------------------- */

interface TemplateCardProps {
  template: CanvasTemplate
  onImport: (template: CanvasTemplate) => void
}

function TemplateCard({ template, onImport }: TemplateCardProps) {
  const handleImport = useCallback(() => {
    onImport(template)
  }, [onImport, template])

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl",
        "bg-surface border border-border",
        "transition-colors hover:border-copy-faint",
      )}
    >
      {/* Preview */}
      <div className="flex items-center justify-center bg-[#080809] p-3">
        <DiagramPreview template={template} />
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 p-4 pt-3">
        <h3 className="text-sm font-medium text-copy-primary">
          {template.name}
        </h3>
        <p className="text-xs leading-relaxed text-copy-muted line-clamp-2">
          {template.description}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-1 w-full"
          onClick={handleImport}
        >
          <Import className="size-3.5" />
          Import
        </Button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Modal                                                                     */
/* -------------------------------------------------------------------------- */

interface StarterTemplatesModalProps {
  open: boolean
  onClose: () => void
  onImport: (template: CanvasTemplate) => void
}

export function StarterTemplatesModal({
  open,
  onClose,
  onImport,
}: StarterTemplatesModalProps) {
  const handleImport = useCallback(
    (template: CanvasTemplate) => {
      onImport(template)
    },
    [onImport],
  )

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="sm:max-w-2xl p-0 gap-0"
        showCloseButton
      >
        <DialogPatternHeader>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-xl",
                "bg-accent-dim text-brand",
              )}
            >
              <LayoutTemplate className="size-4" />
            </div>
            <DialogPatternTitle>Starter Templates</DialogPatternTitle>
          </div>
          <DialogPatternDescription>
            Import a prebuilt architecture diagram to jump-start your design.
            This will replace the current canvas.
          </DialogPatternDescription>
        </DialogPatternHeader>

        <DialogPatternBody className="max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CANVAS_TEMPLATES.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                onImport={handleImport}
              />
            ))}
          </div>
        </DialogPatternBody>
      </DialogContent>
    </Dialog>
  )
}
