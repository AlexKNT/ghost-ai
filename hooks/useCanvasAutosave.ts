"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type SaveStatus = "idle" | "saving" | "saved" | "error"

interface UseCanvasAutosaveOptions {
  projectId: string
  /** Get the current canvas state as a JSON string */
  getCanvasJson: () => string | null
  /** Debounce interval in ms (default 2000) */
  debounceMs?: number
  /** Whether autosave is enabled (default true) */
  enabled?: boolean
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

export function useCanvasAutosave({
  projectId,
  getCanvasJson,
  debounceMs = 2000,
  enabled = true,
}: UseCanvasAutosaveOptions) {
  const [status, setStatus] = useState<SaveStatus>("idle")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep the latest getter available without invalidating the debounce timer.
  const getCanvasJsonRef = useRef(getCanvasJson)
  useEffect(() => {
    getCanvasJsonRef.current = getCanvasJson
  }, [getCanvasJson])

  /* ---- perform save ------------------------------------------------------ */

  const save = useCallback(async () => {
    if (!enabled) return

    const json = getCanvasJsonRef.current()
    if (!json) return

    setStatus("saving")
    try {
      const res = await fetch(`/api/projects/${projectId}/canvas`, {
        method: "PUT",
        body: json,
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) throw new Error("Save failed")
      setStatus("saved")
    } catch {
      setStatus("error")
    }

    // Clear previous status timeout
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    // Revert to idle after a brief display
    statusTimerRef.current = setTimeout(() => {
      setStatus("idle")
    }, 2500)
  }, [projectId, enabled])

  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  }, [save])

  /* ---- debounced autosave ------------------------------------------------ */

  const scheduleSave = useCallback(() => {
    if (!enabled) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveRef.current()
    }, debounceMs)
  }, [debounceMs, enabled])

  /* ---- cleanup ----------------------------------------------------------- */

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    }
  }, [])

  return { status, save, scheduleSave }
}
