import { getLiveblocks } from "@/lib/liveblocks"
import {
  AI_ASSISTANT_NAME,
  AI_CHAT_FEED_ID,
  AI_STATUS_FEED_ID,
  aiStatusMessageSchema,
  selectChatMessages,
  type AiStatusMessage,
  type ChatMessage,
} from "@/types/tasks"

/* -------------------------------------------------------------------------- */
/*  AI collaborator identity                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Stable id for the AI agent. Liveblocks presence is keyed by user id, so a
 * constant id means collaborators always see a single "Ghost AI" participant
 * instead of a new one per run.
 */
export const AI_AGENT_ID = "ghost-ai-agent"
export const AI_AGENT_NAME = AI_ASSISTANT_NAME
export const AI_AGENT_COLOR = "#6457f9"

/** Presence expires on its own; each update refreshes the window. */
const PRESENCE_TTL_SECONDS = 120
/** Short TTL used when the agent leaves, so it disappears almost immediately. */
const CLEAR_PRESENCE_TTL_SECONDS = 2

const AGENT_USER_INFO = {
  id: AI_AGENT_ID,
  name: AI_AGENT_NAME,
  avatar: "",
  color: AI_AGENT_COLOR,
} as const

export interface AgentPresence {
  /** Flow coordinates (same space as node positions) or `null` when idle. */
  cursor: { x: number; y: number } | null
  thinking: boolean
}

/* -------------------------------------------------------------------------- */
/*  Presence                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Publishes the agent's ephemeral presence to the room. Presence flows to every
 * connected client through the normal Liveblocks presence channel, so existing
 * cursor and avatar components pick it up with no extra wiring.
 */
export async function setAgentPresence(
  roomId: string,
  presence: AgentPresence,
): Promise<void> {
  const liveblocks = getLiveblocks()

  await liveblocks.setPresence(roomId, {
    userId: AI_AGENT_ID,
    data: { cursor: presence.cursor, thinking: presence.thinking },
    userInfo: AGENT_USER_INFO,
    ttl: PRESENCE_TTL_SECONDS,
  })
}

/** Clears the agent presence once the run is finished. */
export async function clearAgentPresence(roomId: string): Promise<void> {
  const liveblocks = getLiveblocks()

  await liveblocks.setPresence(roomId, {
    userId: AI_AGENT_ID,
    data: { cursor: null, thinking: false },
    userInfo: AGENT_USER_INFO,
    ttl: CLEAR_PRESENCE_TTL_SECONDS,
  })
}

/* -------------------------------------------------------------------------- */
/*  Status feed                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Publishes one validated status message to the shared `ai-status-feed` feed so
 * every participant can follow along with the run.
 */
export async function publishAiStatus(
  roomId: string,
  message: AiStatusMessage,
): Promise<void> {
  const liveblocks = getLiveblocks()
  const payload = aiStatusMessageSchema.parse(message)

  await ensureStatusFeed(roomId)

  await liveblocks.createFeedMessage({
    roomId,
    feedId: AI_STATUS_FEED_ID,
    data: payload,
  })
}

/** Creates the feed if it does not exist yet. Safe to call repeatedly. */
async function ensureStatusFeed(roomId: string): Promise<void> {
  const liveblocks = getLiveblocks()

  try {
    const { data: feeds } = await liveblocks.getFeeds({ roomId })
    if (feeds.some((feed) => feed.feedId === AI_STATUS_FEED_ID)) return
  } catch {
    // The room may not have any feeds yet — fall through and create one.
  }

  try {
    await liveblocks.createFeed({ roomId, feedId: AI_STATUS_FEED_ID })
  } catch {
    // Already created, possibly by a concurrent run. Nothing to do.
  }
}

/* -------------------------------------------------------------------------- */
/*  Chat feed                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Reads the room's shared conversation, validated and oldest first.
 *
 * Server-side specs need the conversation that produced the design, and the
 * room already holds it, so it is read here rather than accepted from a client.
 * Every entry is validated by `selectChatMessages`, which drops anything that
 * does not match the chat contract.
 *
 * A room without a chat feed simply has no conversation yet, so both a missing
 * feed and a read failure return an empty history instead of failing the
 * caller.
 */
export async function readChatHistory(roomId: string): Promise<ChatMessage[]> {
  const liveblocks = getLiveblocks()

  try {
    const { data } = await liveblocks.getFeedMessages({
      roomId,
      feedId: AI_CHAT_FEED_ID,
    })

    return selectChatMessages(data ?? [])
  } catch {
    return []
  }
}
