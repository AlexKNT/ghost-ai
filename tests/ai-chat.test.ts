import { describe, expect, it } from "vitest"

import {
  AI_CHAT_FEED_ID,
  AI_STATUS_FEED_ID,
  aiChatMessageSchema,
  selectChatMessages,
} from "@/types/tasks"

/* -------------------------------------------------------------------------- */
/*  Chat feed isolation                                                       */
/* -------------------------------------------------------------------------- */

describe("ai-chat feed", () => {
  it("stays separate from the AI status feed", () => {
    expect(AI_CHAT_FEED_ID).toBe("ai-chat")
    expect(AI_CHAT_FEED_ID).not.toBe(AI_STATUS_FEED_ID)
  })
})

/* -------------------------------------------------------------------------- */
/*  Chat message validation                                                   */
/* -------------------------------------------------------------------------- */

describe("aiChatMessageSchema", () => {
  it("accepts a complete user message", () => {
    const message = {
      sender: "Ada Lovelace",
      role: "user",
      content: "Add a queue between the API and the worker.",
      timestamp: 1_760_000_000_000,
    }

    expect(aiChatMessageSchema.parse(message)).toEqual(message)
  })

  it("rejects messages missing a sender, content, or timestamp", () => {
    const valid = {
      sender: "Ada",
      role: "user",
      content: "Hello",
      timestamp: 1,
    }

    expect(aiChatMessageSchema.safeParse({ ...valid, sender: "" }).success).toBe(
      false,
    )
    expect(
      aiChatMessageSchema.safeParse({ ...valid, content: "" }).success,
    ).toBe(false)
    expect(
      aiChatMessageSchema.safeParse({ ...valid, timestamp: undefined }).success,
    ).toBe(false)
    expect(
      aiChatMessageSchema.safeParse({ ...valid, sender: undefined }).success,
    ).toBe(false)
  })

  it("rejects unknown roles and malformed fields", () => {
    expect(
      aiChatMessageSchema.safeParse({
        sender: "Ada",
        role: "robot",
        content: "Hello",
        timestamp: 1,
      }).success,
    ).toBe(false)

    expect(
      aiChatMessageSchema.safeParse({
        sender: "Ada",
        role: "user",
        content: 42,
        timestamp: 1,
      }).success,
    ).toBe(false)
  })
})

/* -------------------------------------------------------------------------- */
/*  Chat message selection                                                    */
/* -------------------------------------------------------------------------- */

describe("selectChatMessages", () => {
  it("returns an empty list when the feed is empty", () => {
    expect(selectChatMessages([])).toEqual([])
  })

  it("drops entries that fail validation instead of rendering them", () => {
    const valid = {
      sender: "Ada",
      role: "user" as const,
      content: "Valid",
      timestamp: 2,
    }

    const result = selectChatMessages([
      { id: "bad-role", data: { ...valid, role: "robot" }, createdAt: 1 },
      { id: "not-an-object", data: "nope", createdAt: 1 },
      { id: "no-content", data: { ...valid, content: "" }, createdAt: 1 },
      { id: "good", data: valid, createdAt: 3 },
    ])

    expect(result).toEqual([{ id: "good", ...valid }])
  })

  it("orders messages oldest first regardless of feed order", () => {
    const first = {
      sender: "Ada",
      role: "user" as const,
      content: "First",
      timestamp: 1_000,
    }
    const second = {
      sender: "Grace",
      role: "user" as const,
      content: "Second",
      timestamp: 2_000,
    }
    const third = {
      sender: "Ada",
      role: "assistant" as const,
      content: "Third",
      timestamp: 3_000,
    }

    expect(
      selectChatMessages([
        { id: "c", data: third, createdAt: 3 },
        { id: "a", data: first, createdAt: 1 },
        { id: "b", data: second, createdAt: 2 },
      ]).map((message) => message.id),
    ).toEqual(["a", "b", "c"])
  })

  it("keeps every valid message, unlike the status feed's latest-only view", () => {
    const messages = ["One", "Two", "Three"].map((content, index) => ({
      id: `m${index}`,
      data: {
        sender: "Ada",
        role: "user" as const,
        content,
        timestamp: index,
      },
      createdAt: index,
    }))

    expect(selectChatMessages(messages)).toHaveLength(3)
  })
})
