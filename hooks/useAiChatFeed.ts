"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  useCreateFeed,
  useCreateFeedMessage,
  useFeedMessages,
} from "@liveblocks/react"

import {
  AI_CHAT_FEED_ID,
  aiChatMessageSchema,
  selectChatMessages,
  type AiChatMessage,
  type ChatMessage,
} from "@/types/tasks"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface AiChatFeed {
  /** Validated chat messages, oldest first. */
  messages: ChatMessage[]
  /** Publishes a message to the shared feed. Resolves false when it fails. */
  sendMessage: (message: AiChatMessage) => Promise<boolean>
  /** True while a message is being published. */
  isSending: boolean
  /** Message to surface when sending fails, or null when all is well. */
  error: string | null
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

/** Human readable, non-technical copy — the sidebar renders it verbatim. */
const SEND_ERROR_MESSAGE =
  "Message couldn't be sent. Check your connection and try again."

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Subscribes to the room-scoped `ai-chat` Liveblocks feed and exposes validated
 * chat messages plus a sender.
 *
 * The feed is the single source of truth for the room's chat history, so every
 * participant sees the same conversation through Liveblocks. It is intentionally
 * separate from `ai-status-feed`, which carries AI progress instead.
 */
export function useAiChatFeed(): AiChatFeed {
  const { messages } = useFeedMessages(AI_CHAT_FEED_ID)
  const createFeedMessage = useCreateFeedMessage()

  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Make sure the feed exists so sent messages always have a home.
  // Rejects when the feed already exists, which is expected and harmless.
  const createFeed = useCreateFeed()
  const ensuredRef = useRef(false)
  useEffect(() => {
    if (ensuredRef.current) return
    ensuredRef.current = true
    createFeed(AI_CHAT_FEED_ID).catch(() => {})
  }, [createFeed])

  const chatMessages = useMemo(
    () => selectChatMessages(messages ?? []),
    [messages],
  )

  const sendMessage = useCallback(
    async (message: AiChatMessage): Promise<boolean> => {
      // Validate before publishing: `data` crosses into the shared feed, which
      // other participants then trust.
      const parsed = aiChatMessageSchema.safeParse(message)
      if (!parsed.success) {
        setError(SEND_ERROR_MESSAGE)
        return false
      }

      setIsSending(true)
      setError(null)

      try {
        await createFeedMessage(AI_CHAT_FEED_ID, parsed.data)
        return true
      } catch {
        setError(SEND_ERROR_MESSAGE)
        return false
      } finally {
        setIsSending(false)
      }
    },
    [createFeedMessage],
  )

  return { messages: chatMessages, sendMessage, isSending, error }
}
