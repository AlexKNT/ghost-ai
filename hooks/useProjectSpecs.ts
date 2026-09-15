"use client"

import { useCallback, useEffect, useState } from "react"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** One generated spec as the Specs tab needs it: metadata only, no content. */
export interface ProjectSpecSummary {
  id: string
  /** Download name, derived by the API so every surface agrees on it. */
  filename: string
  /** ISO timestamp, straight from the API. */
  createdAt: string
}

export interface ProjectSpecsResult {
  specs: ProjectSpecSummary[]
  isLoading: boolean
  error: string | null
  /** Re-reads the list, e.g. after switching back to the Specs tab. */
  refresh: () => void
  /**
   * Reads one spec's Markdown. The content lives only as long as the caller
   * keeps it — nothing here caches a document.
   */
  loadContent: (specId: string) => Promise<string>
}

/* -------------------------------------------------------------------------- */
/*  API                                                                       */
/* -------------------------------------------------------------------------- */

/** Where a project's spec metadata lives. */
export function specListUrl(projectId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/specs`
}

/**
 * Where one spec's Markdown lives.
 *
 * Content is read through the download route because that is the endpoint that
 * authorizes the caller and reads the private blob server-side — the client
 * never sees a blob URL. `fetch` ignores the route's
 * `Content-Disposition: attachment` header, and the same URL is what the
 * download action points the browser at.
 */
export function specFileUrl(projectId: string, specId: string): string {
  return `${specListUrl(projectId)}/${encodeURIComponent(specId)}/download`
}

/**
 * Validates the list payload before anything renders: only entries carrying the
 * three fields the list needs survive, so a partial response degrades to fewer
 * rows instead of a broken one.
 */
export function parseSpecList(payload: unknown): ProjectSpecSummary[] {
  if (!Array.isArray(payload)) return []

  return payload.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return []

    const { id, filename, createdAt } = entry as Record<string, unknown>
    if (
      typeof id !== "string" ||
      typeof filename !== "string" ||
      typeof createdAt !== "string"
    ) {
      return []
    }

    return [{ id, filename, createdAt }]
  })
}

/** Readable local timestamp, falling back to the raw value if it is unusable. */
export function formatSpecDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
}

const LOAD_ERROR = "Could not load specs."
const CONTENT_ERROR = "Could not load this spec."
const UNREACHABLE_ERROR = "The server could not be reached."

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Loads a project's generated specs and reads their content on demand.
 *
 * The list is fetched once per mount, and the Specs tab mounts when it is
 * opened, so switching back to the tab picks up specs generated in the
 * meantime without polling or shared state. No spec content is held here: the
 * preview asks for a document when it opens and drops it when it closes.
 */
export function useProjectSpecs(projectId: string): ProjectSpecsResult {
  const [specs, setSpecs] = useState<ProjectSpecSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refresh = useCallback(() => {
    setIsLoading(true)
    setError(null)
    setReloadToken((token) => token + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    // Every state update happens after an await, never synchronously while the
    // effect body runs.
    const load = async () => {
      try {
        const response = await fetch(specListUrl(projectId), {
          cache: "no-store",
        })
        if (!response.ok) throw new Error(LOAD_ERROR)

        const next = parseSpecList(await response.json())
        if (cancelled) return

        setSpecs(next)
        setError(null)
      } catch {
        if (cancelled) return

        setSpecs([])
        setError(LOAD_ERROR)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [projectId, reloadToken])

  const loadContent = useCallback(
    async (specId: string) => {
      let response: Response
      try {
        response = await fetch(specFileUrl(projectId, specId), {
          cache: "no-store",
        })
      } catch {
        throw new Error(UNREACHABLE_ERROR)
      }

      if (!response.ok) throw new Error(CONTENT_ERROR)

      return response.text()
    },
    [projectId],
  )

  return { specs, isLoading, error, refresh, loadContent }
}
