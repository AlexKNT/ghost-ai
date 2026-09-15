"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRealtimeRun } from "@trigger.dev/react-hooks"

import {
  describeDesignRunOutcome,
  isTerminalDesignRunStatus,
  type DesignRunOutcome,
} from "@/types/tasks"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface UseDesignRunOptions {
  /**
   * Project the prompt belongs to. The project id doubles as the Liveblocks
   * room id, and the API resolves access from the room, so a single value is
   * enough here.
   */
  projectId: string
  /** Called exactly once per run, with its terminal outcome. */
  onOutcome: (outcome: DesignRunOutcome) => void
}

export interface StartDesignRunResult {
  ok: boolean
  /** Present when `ok` is false, ready to be shown to the user. */
  error?: string
}

export interface DesignRunHandle {
  /** True from submit until the run stops, so the composer can be locked. */
  isActive: boolean
  /** Starts a run and subscribes to its realtime status. */
  startRun: (prompt: string) => Promise<StartDesignRunResult>
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const DESIGN_ENDPOINT = "/api/ai/design"
const DESIGN_TOKEN_ENDPOINT = "/api/ai/design/token"

/** Key for the idle state, so each run gets its own realtime state. */
const REALTIME_IDLE_KEY = "design-run-idle"

const UNREACHABLE_MESSAGE = "The server could not be reached."
const REJECTED_MESSAGE = "The request was rejected."
const MALFORMED_MESSAGE = "The server returned an unexpected response."
const LOST_CONNECTION_MESSAGE =
  "Lost the connection to the design run, so its progress can no longer be tracked."

/* -------------------------------------------------------------------------- */
/*  API                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Starts the run and returns its id. The prompt itself is already part of the
 * room's shared chat — the API only needs the text and the room it belongs to,
 * because the room id is what access is resolved from.
 */
async function requestDesignRun(
  prompt: string,
  projectId: string,
): Promise<string> {
  const data = await postJson<{ runId?: unknown }>(DESIGN_ENDPOINT, {
    prompt,
    roomId: projectId,
  })

  if (typeof data.runId !== "string" || data.runId.length === 0) {
    throw new Error(MALFORMED_MESSAGE)
  }

  return data.runId
}

/** Exchanges a run id for a token scoped to that single run. */
async function requestDesignRunToken(runId: string): Promise<string> {
  const data = await postJson<{ token?: unknown }>(DESIGN_TOKEN_ENDPOINT, {
    runId,
  })

  if (typeof data.token !== "string" || data.token.length === 0) {
    throw new Error(MALFORMED_MESSAGE)
  }

  return data.token
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  let response: Response

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(UNREACHABLE_MESSAGE)
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(readErrorMessage(payload) ?? REJECTED_MESSAGE)
  }

  if (typeof payload !== "object" || payload === null) {
    throw new Error(MALFORMED_MESSAGE)
  }

  return payload as T
}

/** Reads the `{ error }` shape every route in this app returns on failure. */
function readErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null

  const error = (payload as { error?: unknown }).error
  return typeof error === "string" && error.trim() ? error.trim() : null
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Submits a design prompt and follows the background run from the browser.
 *
 * The run is started through the API, then tracked with `useRealtimeRun` using
 * the run-scoped token the API issues. Nothing about the canvas is handled here:
 * the agent writes to the shared Liveblocks document, so nodes and edges appear
 * for every participant on their own.
 *
 * The outcome is delivered exactly once, after which the run is released so the
 * composer unlocks and the next prompt can be submitted.
 */
export function useDesignRun({
  projectId,
  onOutcome,
}: UseDesignRunOptions): DesignRunHandle {
  const [runId, setRunId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  // Keep the latest callback without making it a dependency of the effects
  // that deliver the outcome.
  const onOutcomeRef = useRef(onOutcome)
  useEffect(() => {
    onOutcomeRef.current = onOutcome
  }, [onOutcome])

  // Keying the subscription by run id means clearing `runId` also clears every
  // trace of the run that just finished.
  const { run, error } = useRealtimeRun(runId ?? undefined, {
    accessToken: accessToken ?? undefined,
    enabled: runId !== null && accessToken !== null,
    id: runId ?? REALTIME_IDLE_KEY,
  })

  // Guarantees a run is only ever reported once, whichever effect notices first.
  const deliveredRef = useRef(false)

  const deliver = useCallback((outcome: DesignRunOutcome) => {
    if (deliveredRef.current) return
    deliveredRef.current = true

    onOutcomeRef.current(outcome)

    setRunId(null)
    setAccessToken(null)
  }, [])

  const outcome = useMemo<DesignRunOutcome | null>(() => {
    if (!run || !isTerminalDesignRunStatus(run.status)) return null

    return describeDesignRunOutcome({
      status: run.status,
      output: run.output,
      errorMessage: run.error?.message,
    })
  }, [run])

  useEffect(() => {
    if (outcome) deliver(outcome)
  }, [outcome, deliver])

  // A dropped subscription would otherwise leave the composer locked forever.
  useEffect(() => {
    if (!error) return
    deliver({ kind: "error", message: LOST_CONNECTION_MESSAGE })
  }, [error, deliver])

  const startRun = useCallback(
    async (prompt: string): Promise<StartDesignRunResult> => {
      const trimmed = prompt.trim()
      if (!trimmed) return { ok: false, error: "A prompt is required." }

      deliveredRef.current = false
      setIsStarting(true)

      try {
        const nextRunId = await requestDesignRun(trimmed, projectId)
        const token = await requestDesignRunToken(nextRunId)

        // The token goes first: the subscription must never render enabled
        // without the credentials to authenticate it.
        setAccessToken(token)
        setRunId(nextRunId)

        return { ok: true }
      } catch (caught) {
        return { ok: false, error: toMessage(caught) }
      } finally {
        setIsStarting(false)
      }
    },
    [projectId],
  )

  return { isActive: isStarting || runId !== null, startRun }
}
