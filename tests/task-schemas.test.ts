import { describe, expect, it } from "vitest"

import {
  AI_CHAT_FEED_ID,
  AI_STATUS_FEED_ID,
  DESIGN_RUN_STATUS_VALUES,
  aiStatusMessageSchema,
  designPlanSchema,
  designRunStatusSchema,
} from "@/types/tasks"

/* -------------------------------------------------------------------------- */
/*  Feeds and run status                                                      */
/* -------------------------------------------------------------------------- */

describe("design run lifecycle", () => {
  it("uses stable, distinct feed ids", () => {
    expect(AI_STATUS_FEED_ID).toBe("ai-status-feed")
    expect(AI_CHAT_FEED_ID).toBe("ai-chat")
    expect(AI_STATUS_FEED_ID).not.toBe(AI_CHAT_FEED_ID)
  })

  it("accepts every declared status and rejects anything else", () => {
    for (const status of DESIGN_RUN_STATUS_VALUES) {
      expect(designRunStatusSchema.safeParse(status).success).toBe(true)
    }

    expect(designRunStatusSchema.safeParse("done").success).toBe(false)
    expect(designRunStatusSchema.safeParse(undefined).success).toBe(false)
  })
})

/* -------------------------------------------------------------------------- */
/*  Status feed messages                                                      */
/* -------------------------------------------------------------------------- */

describe("aiStatusMessageSchema", () => {
  it("accepts an empty message so partial progress never breaks the feed", () => {
    const result = aiStatusMessageSchema.safeParse({})

    expect(result.success).toBe(true)
    expect(result.data).toEqual({})
  })

  it("accepts a fully populated progress message", () => {
    const message = {
      text: "Drafting 6 nodes",
      status: "thinking",
      runId: "run_123",
      updatedAt: 1_760_000_000_000,
    }

    expect(aiStatusMessageSchema.parse(message)).toEqual(message)
  })

  it("rejects unknown statuses and malformed fields", () => {
    expect(aiStatusMessageSchema.safeParse({ status: "nope" }).success).toBe(false)
    expect(aiStatusMessageSchema.safeParse({ updatedAt: "now" }).success).toBe(false)
    expect(aiStatusMessageSchema.safeParse({ text: 42 }).success).toBe(false)
  })
})

/* -------------------------------------------------------------------------- */
/*  Design plan                                                               */
/* -------------------------------------------------------------------------- */

describe("designPlanSchema", () => {
  it("accepts a plan that only changes nothing", () => {
    expect(designPlanSchema.safeParse({ summary: "No changes" }).success).toBe(
      true,
    )
  })

  it("round-trips a complete plan", () => {
    const plan = {
      summary: "Add an API gateway",
      nodes: [
        {
          key: "gateway",
          label: "API Gateway",
          shape: "hexagon",
          color: "purple",
          x: 0,
          y: 240,
          width: 150,
          height: 130,
        },
      ],
      updates: [{ id: "node-db", label: "Orders DB", x: 240 }],
      removedNodeIds: ["node-legacy"],
      edges: [{ from: "gateway", to: "node-db", label: "routes" }],
      removedEdgeIds: ["edge-old"],
    }

    expect(designPlanSchema.parse(plan)).toEqual(plan)
  })

  it("rejects shapes and colors outside the canvas palette", () => {
    const base = {
      key: "a",
      label: "A",
      x: 0,
      y: 0,
    }

    expect(
      designPlanSchema.safeParse({
        summary: "Bad shape",
        nodes: [{ ...base, shape: "triangle", color: "blue" }],
      }).success,
    ).toBe(false)

    expect(
      designPlanSchema.safeParse({
        summary: "Bad color",
        nodes: [{ ...base, shape: "rectangle", color: "chartreuse" }],
      }).success,
    ).toBe(false)
  })

  it("rejects plans with non-numeric geometry", () => {
    expect(
      designPlanSchema.safeParse({
        summary: "Bad geometry",
        nodes: [
          { key: "a", label: "A", shape: "rectangle", color: "blue", x: "0", y: 0 },
        ],
      }).success,
    ).toBe(false)
  })

  it("requires a summary", () => {
    expect(designPlanSchema.safeParse({ nodes: [] }).success).toBe(false)
  })
})
