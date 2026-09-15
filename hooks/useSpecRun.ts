"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRealtimeRun } from "@trigger.dev/react-hooks"

import { isTerminalDesignRunStatus } from "@/types/tasks"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface UseSpecRunOptions {
  /** Project whose spec is generated. The project id doubles as the room id. */
  projectId: string
  /**
   * Called once when the run stops, successfully or not. The document is
   * persisted before the task reports success, so the list has something new in
   * it by the time this fires.
   */
  onFinished: () => void
}

export interface StartSpecRunResult {
  ok: boolean
  /** Present when `ok` is false, ready to be shown to the user. */
  error?: string
}

export interface SpecRunHandle {
  /** True from submit until the run stops, so the button can show progress. */
  isActive: boolean
  /** Message to surface when starting or tracking the run failed. */
  error: string | null
  /** Starts a spec run for the room. */
  startRun: () => Promise<StartSpecRunResult>
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const SPEC_ENDPOINT = "/api/ai/spec"
const SPEC_TOKEN_ENDPOINT = "/api/ai/spec/token"

/** Key for the idle state, so each run gets its own realtime state. */
const REALTIME_IDLE_KEY = "spec-run-idle"

const UNREACHABLE_MESSAGE = "The server could not be reached."
const REJECTED_MESSAGE = "The request was rejected."
const MALFORMED_MESSAGE = "The server returned an unexpected response."
const LOST_CONNECTION_MESSAGE =
  "Lost the connection to the spec run. It may still finish — reopen this tab to check."

/* -------------------------------------------------------------------------- */
/*  API                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Starts the run and returns its id.
 *
 * Only the room is sent: the canvas and the conversation are read from that room
 * on the server, so the document always describes what the room holds.
 */
async function requestSpecRun(projectId: string): Promise<string> {
  const data = await postJson<{ runId?: unknown }>(SPEC_ENDPOINT, {
    roomId: projectId,
  })

  if (typeof data.runId !== "string" || data.runId.length === 0) {
    throw new Error(MALFORMED_MESSAGE)
  }

  return data.runId
}

/** Exchanges a run id for a token scoped to that single run. */
async function requestSpecRunToken(runId: string): Promise<string> {
  const data = await postJson<{ token?: unknown }>(SPEC_TOKEN_ENDPOINT, {
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
 * Generates a spec for the room and follows the background run from the browser.
 *
 * The run is started through the API and tracked with `useRealtimeRun` using the
 * run-scoped token the API issues. Nothing is read from the run's output: the
 * document is already stored and linked to the project, so the only thing worth
 * knowing is that the run stopped — which is when the list is refreshed.
 */
export function useSpecRun({
  projectId,
  onFinished,
}: UseSpecRunOptions): SpecRunHandle {
  const [runId, setRunId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  // Keep the latest callback without making it a dependency of the effect that
  // delivers the outcome.
  const onFinishedRef = useRef(onFinished)
  useEffect(() => {
    onFinishedRef.current = onFinished
  }, [onFinished])

  // Keying the subscription by run id means clearing `runId` also clears every
  // trace of the run that just finished.
  const { run, error: subscriptionError } = useRealtimeRun(
    runId ?? undefined,
    {
      accessToken: accessToken ?? undefined,
      enabled: runId !== null && accessToken !== null,
      id: runId ?? REALTIME_IDLE_KEY,
    },
  )

  /** Guarantees a finished run is only announced once, then unlocks the button. */
  const finishedRef = useRef(false)

  const release = useCallback(() => {
    setRunId(null)
    setAccessToken(null)
  }, [])

  useEffect(() => {
    if (!run || !isTerminalDesignRunStatus(run.status)) return
    if (finishedRef.current) return

    finishedRef.current = true
    onFinishedRef.current()
    release()
  }, [run, release])

  // A dropped subscription is read as a failure rather than stored as one, which
  // both reports it and unlocks the button instead of leaving it spinning.
  const error =
    startError ?? (subscriptionError ? LOST_CONNECTION_MESSAGE : null)
  const isActive = isStarting || (runId !== null && subscriptionError === null)

  const startRun = useCallback(async (): Promise<StartSpecRunResult> => {
    finishedRef.current = false
    setStartError(null)
    setIsStarting(true)

    try {
      const nextRunId = await requestSpecRun(projectId)
      const token = await requestSpecRunToken(nextRunId)

      // The token goes first: the subscription must never render enabled without
      // the credentials to authenticate it.
      setAccessToken(token)
      setRunId(nextRunId)

      return { ok: true }
    } catch (caught) {
      const message = toMessage(caught)
      setStartError(message)

      return { ok: false, error: message }
    } finally {
      setIsStarting(false)
    }
  }, [projectId])

  return { isActive, error, startRun }
}
