"use client"

import { memo, useCallback } from "react"
import { useReactFlow } from "@xyflow/react"
import { useUndo, useRedo, useCanUndo, useCanRedo } from "@liveblocks/react"
import { ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

function CanvasControlsComponent() {
  const rfInstance = useReactFlow()

  /* ---- Liveblocks undo / redo -------------------------------------------- */

  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  /* ---- keyboard shortcuts ------------------------------------------------- */

  useKeyboardShortcuts({
    rfInstance: rfInstance ?? null,
    onUndo: undo,
    onRedo: redo,
  })

  /* ---- zoom handlers ----------------------------------------------------- */

  const zoomIn = useCallback(() => {
    rfInstance?.zoomIn({ duration: 200 })
  }, [rfInstance])

  const zoomOut = useCallback(() => {
    rfInstance?.zoomOut({ duration: 200 })
  }, [rfInstance])

  const fitView = useCallback(() => {
    rfInstance?.fitView({ duration: 300, padding: 0.2 })
  }, [rfInstance])

  /* ---- render ------------------------------------------------------------ */

  return (
    <div
      className={cn(
        "fixed bottom-6 left-6 z-30",
        "flex items-center gap-0.5 rounded-2xl px-2 py-1.5",
        "bg-elevated/90 backdrop-blur-sm border border-white/10 shadow-lg",
      )}
    >
      {/* Zoom group */}
      <button
        type="button"
        onClick={zoomOut}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-xl",
          "text-white/50 transition-colors",
          "hover:bg-white/10 hover:text-white/80",
        )}
        aria-label="Zoom out"
        title="Zoom out (−)"
      >
        <ZoomOut className="size-4" />
      </button>

      <button
        type="button"
        onClick={fitView}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-xl",
          "text-white/50 transition-colors",
          "hover:bg-white/10 hover:text-white/80",
        )}
        aria-label="Fit view"
        title="Fit view"
      >
        <Maximize2 className="size-4" />
      </button>

      <button
        type="button"
        onClick={zoomIn}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-xl",
          "text-white/50 transition-colors",
          "hover:bg-white/10 hover:text-white/80",
        )}
        aria-label="Zoom in"
        title="Zoom in (+)"
      >
        <ZoomIn className="size-4" />
      </button>

      {/* Divider */}
      <div className="mx-1 h-5 w-px bg-white/10" />

      {/* History group */}
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-xl",
          "transition-colors",
          canUndo
            ? "text-white/50 hover:bg-white/10 hover:text-white/80"
            : "text-white/20 cursor-not-allowed",
        )}
        aria-label="Undo"
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="size-4" />
      </button>

      <button
        type="button"
        onClick={redo}
        disabled={!canRedo}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-xl",
          "transition-colors",
          canRedo
            ? "text-white/50 hover:bg-white/10 hover:text-white/80"
            : "text-white/20 cursor-not-allowed",
        )}
        aria-label="Redo"
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 className="size-4" />
      </button>

      {/* Divider */}
      <div className="mx-1 h-5 w-px bg-white/10" />

      {/* Delete */}
      <button
        type="button"
        onClick={() => {
          if (!rfInstance) return
          const selectedNodes = rfInstance.getNodes().filter((n) => n.selected)
          const selectedEdges = rfInstance.getEdges().filter((e) => e.selected)
          if (selectedNodes.length > 0 || selectedEdges.length > 0) {
            rfInstance.deleteElements({ nodes: selectedNodes, edges: selectedEdges })
          }
        }}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-xl",
          "text-white/50 transition-colors",
          "hover:bg-red-500/20 hover:text-red-400",
        )}
        aria-label="Delete selected"
        title="Delete selected (Del or Backspace)"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

export const CanvasControls = memo(CanvasControlsComponent)
