import { describe, expect, it } from "vitest"

import {
  SPEC_AGENT_SYSTEM_PROMPT,
  buildSpecGenerationPrompt,
  normalizeSpecMarkdown,
} from "@/lib/spec-generation"
import { NODE_COLOR_NAMES, NODE_SHAPE_TYPES } from "@/types/canvas"
import { AI_ASSISTANT_NAME } from "@/types/tasks"
import type {
  AiChatMessage,
  SpecCanvasEdge,
  SpecCanvasNode,
} from "@/types/tasks"

/* -------------------------------------------------------------------------- */
/*  Fixtures                                                                  */
/* -------------------------------------------------------------------------- */

function node(
  overrides: Partial<SpecCanvasNode> & { id: string },
): SpecCanvasNode {
  return { label: overrides.id, ...overrides }
}

function edge(source: string, target: string, label?: string): SpecCanvasEdge {
  return { source, target, label }
}

function message(overrides: Partial<AiChatMessage>): AiChatMessage {
  return {
    sender: "Ada",
    role: "user",
    content: "Add an API gateway",
    timestamp: 1_760_000_000_000,
    ...overrides,
  }
}

/** The prompt carries a single JSON document after its header line. */
function readContext(prompt: string): {
  canvas: {
    nodes: { label: string; shape: string; color: string }[]
    edges: { from: string; to: string; label: string }[]
  }
  conversation: { from: string; message: string }[]
} {
  return JSON.parse(prompt.split("Canvas and conversation:\n")[1])
}

/* -------------------------------------------------------------------------- */
/*  Prompt                                                                    */
/* -------------------------------------------------------------------------- */

describe("buildSpecGenerationPrompt", () => {
  it("describes nodes with their shape and palette name", () => {
    const prompt = buildSpecGenerationPrompt({
      nodes: [
        // The client may send either form; both resolve to the palette name.
        node({ id: "n1", label: "Orders DB", shape: "cylinder", color: "#062822" }),
        node({ id: "n2", label: "Gateway", shape: "diamond", color: "purple" }),
      ],
      edges: [edge("n2", "n1", "routes")],
      chatHistory: [],
    })

    const context = readContext(prompt)

    expect(context.canvas.nodes).toEqual([
      { label: "Orders DB", shape: "cylinder", color: "teal" },
      { label: "Gateway", shape: "diamond", color: "purple" },
    ])
    expect(context.canvas.edges).toEqual([
      { from: "Gateway", to: "Orders DB", label: "routes" },
    ])
  })

  it("falls back to unknown endpoints, blank labels and the default shape", () => {
    const prompt = buildSpecGenerationPrompt({
      nodes: [node({ id: "n1", label: "   " })],
      edges: [edge("n1", "ghost-node")],
      chatHistory: [],
    })

    const context = readContext(prompt)

    expect(context.canvas.nodes).toEqual([
      { label: "Untitled", shape: "rectangle", color: "neutral" },
    ])
    expect(context.canvas.edges).toEqual([
      { from: "Untitled", to: "ghost-node", label: "" },
    ])
  })

  it("attributes the conversation to its authors, AI replies included", () => {
    const prompt = buildSpecGenerationPrompt({
      nodes: [],
      edges: [],
      chatHistory: [
        message({ sender: "Ada", role: "user", content: "  Design a queue  " }),
        message({
          sender: AI_ASSISTANT_NAME,
          role: "assistant",
          content: "Added a queue",
        }),
      ],
    })

    expect(readContext(prompt).conversation).toEqual([
      { from: "Ada", message: "Design a queue" },
      { from: AI_ASSISTANT_NAME, message: "Added a queue" },
    ])
  })

  it("still produces a context for an empty canvas", () => {
    const context = readContext(
      buildSpecGenerationPrompt({ nodes: [], edges: [], chatHistory: [] }),
    )

    expect(context.canvas).toEqual({ nodes: [], edges: [] })
    expect(context.conversation).toEqual([])
  })
})

/* -------------------------------------------------------------------------- */
/*  System prompt                                                             */
/* -------------------------------------------------------------------------- */

describe("spec agent system prompt", () => {
  it("documents every allowed shape and palette name", () => {
    for (const shape of NODE_SHAPE_TYPES) {
      expect(SPEC_AGENT_SYSTEM_PROMPT).toContain(shape)
    }
    for (const color of NODE_COLOR_NAMES) {
      expect(SPEC_AGENT_SYSTEM_PROMPT).toContain(color)
    }
  })

  it("asks for Markdown only and forbids inventing components", () => {
    expect(SPEC_AGENT_SYSTEM_PROMPT).toContain("Markdown only")
    expect(SPEC_AGENT_SYSTEM_PROMPT).toContain("Never invent")
  })
})

/* -------------------------------------------------------------------------- */
/*  Normalization                                                             */
/* -------------------------------------------------------------------------- */

describe("normalizeSpecMarkdown", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeSpecMarkdown("\n\n# Spec\n\nBody\n\n")).toBe("# Spec\n\nBody")
  })

  it("unwraps a fence that encloses the whole document", () => {
    const fenced = "```markdown\n# Spec\n\nBody\n```"

    expect(normalizeSpecMarkdown(fenced)).toBe("# Spec\n\nBody")
  })

  it("keeps fences that are part of the document", () => {
    const document = [
      "# Spec",
      "",
      "Request payload:",
      "",
      "```json",
      '{ "id": 1 }',
      "```",
    ].join("\n")

    expect(normalizeSpecMarkdown(`\n${document}\n`)).toBe(document)
  })

  it("returns an empty string when the model produced nothing", () => {
    expect(normalizeSpecMarkdown("   \n  ")).toBe("")
    expect(normalizeSpecMarkdown("```\n```")).toBe("")
  })
})
