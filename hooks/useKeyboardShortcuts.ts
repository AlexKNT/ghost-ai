"use client"

import { useEffect } from "react"
import type { ReactFlowInstance } from "@xyflow/react"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface UseKeyboardShortcutsOptions {
  /** React Flow instance for zoom controls. */
  rfInstance: ReactFlowInstance | null
  /** Undo handler from Liveblocks. */
  onUndo: (() => void) | null
  /** Redo handler from Liveblocks. */
  onRedo: (() => void) | null
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Returns true if the active element is an editable text field. */
function isEditingText(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  if (tag === "input" || tag === "textarea" || tag === "select") return true
  if ((el as HTMLElement).isContentEditable) return true
  return false
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

export function useKeyboardShortcuts({
  rfInstance,
  onUndo,
  onRedo,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip shortcuts while user is typing in an editable field
      if (isEditingText()) return

      const isMod = e.metaKey || e.ctrlKey

      // Zoom in: + or =
      if ((e.key === "+" || e.key === "=") && !isMod) {
        e.preventDefault()
        rfInstance?.zoomIn({ duration: 200 })
        return
      }

      // Zoom out: -
      if (e.key === "-" && !isMod) {
        e.preventDefault()
        rfInstance?.zoomOut({ duration: 200 })
        return
      }

      // Undo: Cmd/Ctrl + Z
      if (isMod && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        onUndo?.()
        return
      }

      // Redo: Cmd/Ctrl + Shift + Z  or  Cmd/Ctrl + Y
      if (
        (isMod && e.key === "z" && e.shiftKey) ||
        (isMod && e.key === "y")
      ) {
        e.preventDefault()
        onRedo?.()
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [rfInstance, onUndo, onRedo])
}
