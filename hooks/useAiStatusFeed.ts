"use client"

import { useEffect, useMemo, useRef } from "react"
import { useCreateFeed, useFeedMessages } from "@liveblocks/react"

import {
  AI_STATUS_FEED_ID,
  isDesignRunActive,
  selectLatestAiStatus,
  type AiStatusMessage,
} from "@/types/tasks"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface AiStatusFeed {
  /** Most recent validated status message, or null before the first one. */
  message: AiStatusMessage | null
  /** True while the shared feed reports a run in progress. */
  isGenerating: boolean
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Subscribes to the room-scoped `ai-status-feed` Liveblocks feed and exposes
 * the latest validated status message.
 *
 * The feed is the single source of truth for "AI is working" state, so every
 * participant in the room sees the same message without any parallel realtime
 * state. Nothing is displayed until a message passes `aiStatusMessageSchema`.
 */
export function useAiStatusFeed(): AiStatusFeed {
  const { messages } = useFeedMessages(AI_STATUS_FEED_ID)

  // Make sure the feed exists so published status messages always have a home.
  // Rejects when the feed already exists, which is expected and harmless.
  const createFeed = useCreateFeed()
  const ensuredRef = useRef(false)
  useEffect(() => {
    if (ensuredRef.current) return
    ensuredRef.current = true
    createFeed(AI_STATUS_FEED_ID).catch(() => {})
  }, [createFeed])

  const message = useMemo(
    () => selectLatestAiStatus(messages ?? []),
    [messages],
  )

  return { message, isGenerating: isDesignRunActive(message?.status) }
}
