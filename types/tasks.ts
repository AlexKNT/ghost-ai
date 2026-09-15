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
/*  AI collaborator identity                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Display name shared by the AI agent's presence and the messages it authors,
 * so the collaborator badge and the conversation show the same author.
 */
export const AI_ASSISTANT_NAME = "Ghost AI"

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
/*  Design run tracking (client side)                                         */
/*                                                                           */
/*  A submitted prompt starts a Trigger.dev run. The client tracks it through */
/*  `useRealtimeRun`, so the rules for "is it still running" and "what does   */
/*  the room get told when it ends" live here as pure functions.             */
/* -------------------------------------------------------------------------- */

/**
 * Trigger.dev run statuses a run can never leave. Mirrors the `RunStatus` enum
 * the realtime subscription reports; anything else means the agent is busy.
 */
export const TERMINAL_DESIGN_RUN_STATUSES = [
  "COMPLETED",
  "CANCELED",
  "FAILED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "EXPIRED",
  "TIMED_OUT",
] as const

/** True once a run has stopped for good, successfully or not. */
export function isTerminalDesignRunStatus(status: string): boolean {
  return (TERMINAL_DESIGN_RUN_STATUSES as readonly string[]).includes(status)
}

/** The design task's return value, as far as the client trusts it. */
export const designRunOutputSchema = z.object({
  summary: z.string().optional(),
})

/** What the sidebar says in the conversation once a run stops being active. */
export interface DesignRunOutcome {
  kind: "complete" | "error"
  message: string
}

/** Copy used when the run itself gives nothing better to show. */
const COMPLETE_MESSAGE = "Design applied to the canvas."
const CANCELED_MESSAGE = "Design generation was canceled."
const FAILED_MESSAGE = "Design generation failed."
const START_FAILED_MESSAGE = "The design run couldn't be started."

const DEFAULT_ERROR_MESSAGE = "The design run stopped before it could finish."

/** The pieces of a finished run the client needs to explain the outcome. */
export interface DesignRunOutcomeInput {
  status: string
  /** Raw task output — untrusted, validated before it is read. */
  output?: unknown
  /** Error message the run reported, if any. */
  errorMessage?: string | null
}

/**
 * Turns a finished run into the single message the sidebar publishes to the
 * room, so collaborators read the outcome instead of a status code. The summary
 * comes from the task's own output whenever it is usable.
 */
export function describeDesignRunOutcome({
  status,
  output,
  errorMessage,
}: DesignRunOutcomeInput): DesignRunOutcome {
  if (status === "COMPLETED") {
    const parsed = designRunOutputSchema.safeParse(output)
    const summary = parsed.success ? parsed.data.summary?.trim() : undefined

    return { kind: "complete", message: summary || COMPLETE_MESSAGE }
  }

  if (status === "CANCELED") {
    return { kind: "error", message: CANCELED_MESSAGE }
  }

  const detail = errorMessage?.trim()
  if (!detail) return { kind: "error", message: DEFAULT_ERROR_MESSAGE }

  return {
    kind: "error",
    message: detail.startsWith(FAILED_MESSAGE)
      ? detail
      : `${FAILED_MESSAGE} ${detail}`,
  }
}

/**
 * Outcome for a run that never reached the queue (auth, network or server
 * failure), so a failed submit reads like every other run failure.
 */
export function describeDesignRunStartFailure(
  detail?: string | null,
): DesignRunOutcome {
  const trimmed = detail?.trim()

  return {
    kind: "error",
    message: trimmed
      ? `${START_FAILED_MESSAGE} ${trimmed}`
      : START_FAILED_MESSAGE,
  }
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

/* -------------------------------------------------------------------------- */
/*  Spec generation                                                           */
/* -------------------------------------------------------------------------- */

/** Upper bounds so a spec request can never carry an unbounded payload. */
const MAX_SPEC_NODES = 200
const MAX_SPEC_EDGES = 400
const MAX_SPEC_HISTORY = 100
const MAX_SPEC_TEXT_LENGTH = 200

/**
 * A canvas node as it enters a spec payload.
 *
 * Only identity, label, shape and color mean anything in a written spec, so
 * geometry is not carried: the spec task never reads positions and never writes
 * back to the canvas.
 */
export const specCanvasNodeSchema = z.object({
  id: z.string().min(1).max(MAX_SPEC_TEXT_LENGTH),
  label: z.string().max(MAX_SPEC_TEXT_LENGTH).optional(),
  shape: z.enum(NODE_SHAPE_TYPES).optional(),
  /** Palette name or the stored fill value — both resolve to a palette name. */
  color: z.string().max(64).optional(),
})

export type SpecCanvasNode = z.infer<typeof specCanvasNodeSchema>

/** A directed dependency between two nodes, referenced by node id. */
export const specCanvasEdgeSchema = z.object({
  source: z.string().min(1).max(MAX_SPEC_TEXT_LENGTH),
  target: z.string().min(1).max(MAX_SPEC_TEXT_LENGTH),
  label: z.string().max(MAX_SPEC_TEXT_LENGTH).optional(),
})

export type SpecCanvasEdge = z.infer<typeof specCanvasEdgeSchema>

/**
 * Body accepted by `POST /api/ai/spec`.
 *
 * Only the room: the canvas and the conversation are read from that room on the
 * server, so a spec always describes what is actually on the canvas and a
 * client can never choose what gets summarized.
 */
export const specGenerationRequestSchema = z.object({
  roomId: z.string().min(1),
})

export type SpecGenerationRequest = z.infer<
  typeof specGenerationRequestSchema
>

/**
 * Payload of the `generate-spec` task: what the server read from the room, plus
 * the project it resolved from that same room. The task trusts this because the
 * request handler is the only producer.
 */
export const specGenerationPayloadSchema = z.object({
  projectId: z.string().min(1),
  roomId: z.string().min(1),
  nodes: z.array(specCanvasNodeSchema).max(MAX_SPEC_NODES).default([]),
  edges: z.array(specCanvasEdgeSchema).max(MAX_SPEC_EDGES).default([]),
  chatHistory: z.array(aiChatMessageSchema).max(MAX_SPEC_HISTORY).default([]),
})

export type SpecGenerationPayload = z.infer<
  typeof specGenerationPayloadSchema
>
