import { describe, expect, it } from "vitest"

import { getUserColor } from "@/lib/liveblocks"

/**
 * Collaborator cursor/avatar colors are derived from the user id, so the same
 * user must always get the same color while different users spread across the
 * available palette.
 */
describe("getUserColor", () => {
  it("is stable for the same user id", () => {
    expect(getUserColor("user_2abc")).toBe(getUserColor("user_2abc"))
  })

  it("always returns a hex color", () => {
    for (const id of ["user_1", "user_2", "abc", "", "🦹 agent"]) {
      expect(getUserColor(id)).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it("spreads a set of users across more than one color", () => {
    const users = Array.from({ length: 25 }, (_, index) => `user_${index}`)
    const colors = new Set(users.map(getUserColor))

    expect(colors.size).toBeGreaterThan(1)
    // The palette is finite, so every color must come from a small fixed set.
    expect(colors.size).toBeLessThanOrEqual(8)
  })
})
