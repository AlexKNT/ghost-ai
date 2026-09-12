import { z } from "zod"

import { NODE_COLOR_NAMES, NODE_SHAPE_TYPES } from "@/types/canvas"

/* -------------------------------------------------------------------------- */
/*  Liveblocks feeds                                                          */
/* -------------------------------------------------------------------------- */

/** Room-scoped feed carrying AI progress + status messages. */
export const AI_STATUS_FEED_ID = "ai-status-feed"

/** Room-scoped feed carrying sidebar chat messages. */
export const AI_CHAT_FEED_ID = "ai-chat"

/* -------------------------------------------------------------------------- */
/*  Design run lifecycle                                                      */
/* -------------------------------------------------------------------------- */

export const DESIGN_RUN_STATUS_VALUES = [
  "queued",
  "thinking",
  "applying",
  "complete",
  "error",
] as const

export const designRunStatusSchema = z.enum(DESIGN_RUN_STATUS_VALUES)

export type DesignRunStatus = z.infer<typeof designRunStatusSchema>

/* -------------------------------------------------------------------------- */
/*  AI status feed message                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Payload published to the `ai-status-feed` feed.
 *
 * Every field is optional so the same feed can carry design and spec
 * generation progress, and so unknown/partial messages never fail validation.
 */
export const aiStatusMessageSchema = z.object({
  /** Human readable progress line, e.g. "Drafting 6 nodes". */
  text: z.string().optional(),
  status: designRunStatusSchema.optional(),
  runId: z.string().optional(),
  /** Milliseconds since epoch, set by the producer. */
  updatedAt: z.number().optional(),
})

export type AiStatusMessage = z.infer<typeof aiStatusMessageSchema>

/* -------------------------------------------------------------------------- */
/*  AI status feed readers                                                    */
/* -------------------------------------------------------------------------- */

/** Statuses that mean the agent is still working on the room. */
const ACTIVE_DESIGN_RUN_STATUSES: readonly DesignRunStatus[] = [
  "queued",
  "thinking",
  "applying",
]

/** True while a run is queued, thinking, or applying changes. */
export function isDesignRunActive(
  status: DesignRunStatus | undefined,
): boolean {
  return status !== undefined && ACTIVE_DESIGN_RUN_STATUSES.includes(status)
}

/**
 * The minimum shape of a raw feed message needed to read its payload.
 * `data` is untrusted — Liveblocks stores whatever the producer published.
 */
export interface FeedEntry {
  data: unknown
  /** Feed message creation time, in milliseconds since epoch. */
  createdAt: number
}

/** A feed entry that also carries the id Liveblocks assigned to it. */
export interface IdentifiedFeedEntry extends FeedEntry {
  id: string
}

/**
 * Picks the most recent valid `ai-status-feed` message, or `null` when the feed
 * is empty or every message failed validation.
 *
 * Messages are ranked by the producer-set `updatedAt`, falling back to the
 * Liveblocks `createdAt`, so the newest message wins regardless of the order
 * the feed returns them in. Invalid payloads are dropped rather than displayed.
 */
export function selectLatestAiStatus(
  messages: readonly FeedEntry[],
): AiStatusMessage | null {
  let latest: AiStatusMessage | null = null
  let latestRank = Number.NEGATIVE_INFINITY

  for (const message of messages) {
    const parsed = aiStatusMessageSchema.safeParse(message.data)
    if (!parsed.success) continue

    const rank = parsed.data.updatedAt ?? message.createdAt
    if (latest === null || rank >= latestRank) {
      latest = parsed.data
      latestRank = rank
    }
  }

  return latest
}

/* -------------------------------------------------------------------------- */
/*  AI chat feed message                                                      */
/* -------------------------------------------------------------------------- */

/** Who authored a chat message. Reserved for future AI replies. */
export const CHAT_ROLE_VALUES = ["user", "assistant"] as const

export const chatRoleSchema = z.enum(CHAT_ROLE_VALUES)

export type ChatRole = z.infer<typeof chatRoleSchema>

/**
 * Payload published to the room-scoped `ai-chat` feed.
 *
 * Chat is deliberately separate from `ai-status-feed`: status messages are
 * machine progress reports where only the newest one matters, while chat
 * messages are conversation that must all be kept and rendered in order.
 */
export const aiChatMessageSchema = z.object({
  /** Display name of the participant that sent the message. */
  sender: z.string().min(1),
  role: chatRoleSchema,
  content: z.string().min(1),
  /** Milliseconds since epoch, set by the producer. */
  timestamp: z.number(),
})

export type AiChatMessage = z.infer<typeof aiChatMessageSchema>

/** A validated chat message plus the id Liveblocks assigned to it. */
export interface ChatMessage extends AiChatMessage {
  id: string
}

/* -------------------------------------------------------------------------- */
/*  AI chat feed reader                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Validates every raw `ai-chat` feed entry and returns the messages that pass,
 * oldest first.
 *
 * Invalid payloads are dropped rather than rendered. Ordering uses the
 * producer-set `timestamp` (with the Liveblocks `createdAt` as a tiebreaker) so
 * every participant renders the same conversation order.
 */
export function selectChatMessages(
  entries: readonly IdentifiedFeedEntry[],
): ChatMessage[] {
  const ranked: { message: ChatMessage; receivedAt: number }[] = []

  for (const entry of entries) {
    const parsed = aiChatMessageSchema.safeParse(entry.data)
    if (!parsed.success) continue

    ranked.push({
      message: { id: entry.id, ...parsed.data },
      receivedAt: entry.createdAt,
    })
  }

  ranked.sort(
    (a, b) =>
      a.message.timestamp - b.message.timestamp ||
      a.receivedAt - b.receivedAt,
  )

  return ranked.map(({ message }) => message)
}

/* -------------------------------------------------------------------------- */
/*  Design plan (structured output of the design agent)                       */
/* -------------------------------------------------------------------------- */

/** A node the agent wants to create. `key` is a local ref used by edges. */
export const designPlanNodeSchema = z.object({
  key: z
    .string()
    .describe("Short unique reference for this node, referenced by edges"),
  label: z.string().describe("Node title, 1-4 words"),
  shape: z.enum(NODE_SHAPE_TYPES),
  color: z.enum(NODE_COLOR_NAMES),
  x: z.number().describe("Horizontal position in canvas coordinates"),
  y: z.number().describe("Vertical position in canvas coordinates"),
  width: z.number().optional(),
  height: z.number().optional(),
})

export type DesignPlanNode = z.infer<typeof designPlanNodeSchema>

/** An existing node the agent wants to move, resize or relabel. */
export const designPlanNodeUpdateSchema = z.object({
  id: z.string().describe("Id of an existing node from the canvas context"),
  label: z.string().optional(),
  shape: z.enum(NODE_SHAPE_TYPES).optional(),
  color: z.enum(NODE_COLOR_NAMES).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
})

export type DesignPlanNodeUpdate = z.infer<typeof designPlanNodeUpdateSchema>

/**
 * A connection to create. `from`/`to` accept either a `key` from `nodes` or
 * the id of a node already on the canvas.
 */
export const designPlanEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
})

export type DesignPlanEdge = z.infer<typeof designPlanEdgeSchema>

export const designPlanSchema = z.object({
  summary: z.string().describe("One sentence describing the generated design"),
  nodes: z.array(designPlanNodeSchema).optional(),
  updates: z.array(designPlanNodeUpdateSchema).optional(),
  removedNodeIds: z
    .array(z.string())
    .optional()
    .describe("Ids of existing nodes to delete"),
  edges: z.array(designPlanEdgeSchema).optional(),
  removedEdgeIds: z
    .array(z.string())
    .optional()
    .describe("Ids of existing edges to delete"),
})

export type DesignPlan = z.infer<typeof designPlanSchema>
