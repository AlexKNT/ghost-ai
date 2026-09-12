import { describe, expect, it } from "vitest"

import { isDesignRunActive, selectLatestAiStatus } from "@/types/tasks"

/* -------------------------------------------------------------------------- */
/*  Status selection                                                          */
/* -------------------------------------------------------------------------- */

describe("selectLatestAiStatus", () => {
  it("returns null when the feed is empty", () => {
    expect(selectLatestAiStatus([])).toBeNull()
  })

  it("drops messages that fail validation", () => {
    const result = selectLatestAiStatus([
      { data: { status: "nope" }, createdAt: 1 },
      { data: "not an object", createdAt: 2 },
      { data: null, createdAt: 3 },
      { data: { text: 42 }, createdAt: 4 },
    ])

    expect(result).toBeNull()
  })

  it("picks the newest message by updatedAt regardless of feed order", () => {
    const older = { text: "Thinking…", status: "thinking", updatedAt: 1_000 }
    const newer = { text: "Applying…", status: "applying", updatedAt: 2_000 }

    expect(
      selectLatestAiStatus([
        { data: newer, createdAt: 2_000 },
        { data: older, createdAt: 1_000 },
      ]),
    ).toEqual(newer)
  })

  it("falls back to createdAt when a message has no updatedAt", () => {
    const recent = { text: "Thinking…", status: "thinking" }
    const stale = { text: "Queued…", status: "queued" }

    expect(
      selectLatestAiStatus([
        { data: recent, createdAt: 5_000 },
        { data: stale, createdAt: 1_000 },
      ]),
    ).toEqual(recent)
  })

  it("ignores invalid messages and still returns the newest valid one", () => {
    const valid = { text: "Done", status: "complete", updatedAt: 900 }

    expect(
      selectLatestAiStatus([
        { data: { status: "nope" }, createdAt: 9_999 },
        { data: valid, createdAt: 900 },
      ]),
    ).toEqual(valid)
  })

  it("accepts a message that only carries text", () => {
    expect(
      selectLatestAiStatus([
        { data: { text: "Reading the current canvas…" }, createdAt: 10 },
      ]),
    ).toEqual({ text: "Reading the current canvas…" })
  })

  it("accepts an empty message so partial progress never breaks the feed", () => {
    expect(selectLatestAiStatus([{ data: {}, createdAt: 10 }])).toEqual({})
  })
})

/* -------------------------------------------------------------------------- */
/*  Active run detection                                                      */
/* -------------------------------------------------------------------------- */

describe("isDesignRunActive", () => {
  it("is true while the run is queued, thinking, or applying", () => {
    expect(isDesignRunActive("queued")).toBe(true)
    expect(isDesignRunActive("thinking")).toBe(true)
    expect(isDesignRunActive("applying")).toBe(true)
  })

  it("is false once the run completes, fails, or has no status", () => {
    expect(isDesignRunActive("complete")).toBe(false)
    expect(isDesignRunActive("error")).toBe(false)
    expect(isDesignRunActive(undefined)).toBe(false)
  })
})
