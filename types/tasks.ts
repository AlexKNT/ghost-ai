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
