import { describe, expect, it } from "vitest"

import {
  DESIGN_AGENT_SYSTEM_PROMPT,
  buildDesignAgentPrompt,
  normalizeDesignPlan,
} from "@/lib/design-plan"
import {
  NODE_COLOR_NAMES,
  NODE_SHAPE_TYPES,
  getNodeShape,
  type CanvasSnapshot,
  type CanvasSnapshotEdge,
  type CanvasSnapshotNode,
  type NodeColorName,
} from "@/types/canvas"
import type { DesignPlan } from "@/types/tasks"

/* -------------------------------------------------------------------------- */
/*  Fixtures                                                                  */
/* -------------------------------------------------------------------------- */

function snapshotNode(
  overrides: Partial<CanvasSnapshotNode> & { id: string },
): CanvasSnapshotNode {
  return {
    label: overrides.id,
    shape: "rectangle",
    color: "#1F1F1F",
    textColor: "#EDEDED",
    x: 0,
    y: 0,
    width: 160,
    height: 80,
    ...overrides,
  }
}

function snapshotEdge(
  id: string,
  source: string,
  target: string,
  label = "",
): CanvasSnapshotEdge {
  return { id, source, target, label }
}

function snapshot(partial: Partial<CanvasSnapshot> = {}): CanvasSnapshot {
  return { nodes: [], edges: [], ...partial }
}

/* -------------------------------------------------------------------------- */
/*  Empty plans                                                               */
/* -------------------------------------------------------------------------- */

describe("normalizeDesignPlan — empty plan", () => {
  it("reports no changes without inventing any", () => {
    const result = normalizeDesignPlan(
      { summary: "  Nothing to do.  " },
      snapshot(),
    )

    expect(result.summary).toBe("Nothing to do.")
    expect(result.isEmpty).toBe(true)
    expect(result.focus).toBeNull()
    expect(result.counts).toEqual({
      nodesAdded: 0,
      nodesUpdated: 0,
      nodesRemoved: 0,
      edgesAdded: 0,
      edgesRemoved: 0,
    })
    expect(result.changes).toEqual({
      addNodes: [],
      updateNodes: [],
      removeNodeIds: [],
      addEdges: [],
      removeEdgeIds: [],
    })
  })
})

/* -------------------------------------------------------------------------- */
/*  New nodes                                                                 */
/* -------------------------------------------------------------------------- */

describe("normalizeDesignPlan — new nodes", () => {
  it("derives ids from keys and normalizes label, color, geometry and size", () => {
    const result = normalizeDesignPlan(
      {
        summary: "Add a gateway",
        nodes: [
          {
            key: "API Gateway",
            label: "  API   Gateway  ",
            shape: "hexagon",
            color: "purple",
            x: 407,
            y: 13,
          },
          {
            key: "db",
            label: "   ",
            shape: "cylinder",
            color: "not-a-color" as NodeColorName,
            x: -13,
            y: 240,
            width: 5000,
            height: 10,
          },
        ],
      } satisfies DesignPlan,
      snapshot(),
    )

    const [gateway, db] = result.changes.addNodes ?? []

    expect(gateway).toMatchObject({
      id: "node-api-gateway",
      label: "API Gateway",
      shape: "hexagon",
      color: { fill: "#2E1938", text: "#BF7AF0" },
      x: 400,
      y: 20,
      width: getNodeShape("hexagon").width,
      height: getNodeShape("hexagon").height,
    })

    expect(db).toMatchObject({
      id: "node-db",
      label: "Untitled",
      shape: "cylinder",
      // Unknown palette names fall back to the neutral default.
      color: { fill: "#1F1F1F", text: "#EDEDED" },
      x: -20,
      y: 240,
      width: 400,
      height: 80,
    })

    expect(result.counts.nodesAdded).toBe(2)
    expect(result.isEmpty).toBe(false)
  })

  it("drops duplicate and blank keys", () => {
    const result = normalizeDesignPlan(
      {
        summary: "Duplicates",
        nodes: [
          { key: "api", label: "A", shape: "rectangle", color: "blue", x: 0, y: 0 },
          { key: "API", label: "B", shape: "rectangle", color: "blue", x: 240, y: 0 },
          { key: "   ", label: "C", shape: "rectangle", color: "blue", x: 480, y: 0 },
        ],
      } satisfies DesignPlan,
      snapshot(),
    )

    expect(result.changes.addNodes).toHaveLength(1)
    expect(result.changes.addNodes?.[0].label).toBe("A")
  })

  it("keeps generated ids unique against the existing canvas and each other", () => {
    const canvas = snapshot({
      nodes: [snapshotNode({ id: "node-api" }), snapshotNode({ id: "node-api-2" })],
    })

    const result = normalizeDesignPlan(
      {
        summary: "Collisions",
        nodes: [
          { key: "api", label: "A", shape: "rectangle", color: "blue", x: 0, y: 0 },
          { key: "api", label: "B", shape: "rectangle", color: "blue", x: 240, y: 0 },
          { key: "!!!", label: "C", shape: "rectangle", color: "blue", x: 480, y: 0 },
        ],
      } satisfies DesignPlan,
      canvas,
    )

    expect(result.changes.addNodes?.map((node) => node.id)).toEqual([
      "node-api-3",
      "node-item",
    ])
  })

  it("truncates labels to a readable length", () => {
    const result = normalizeDesignPlan(
      {
        summary: "Long label",
        nodes: [
          {
            key: "long",
            label: "x".repeat(120),
            shape: "rectangle",
            color: "blue",
            x: 0,
            y: 0,
          },
        ],
      } satisfies DesignPlan,
      snapshot(),
    )

    expect(result.changes.addNodes?.[0].label).toHaveLength(60)
  })
})

/* -------------------------------------------------------------------------- */
/*  Updates                                                                   */
/* -------------------------------------------------------------------------- */

describe("normalizeDesignPlan — node updates", () => {
  const canvas = snapshot({ nodes: [snapshotNode({ id: "node-a", label: "Old" })] })

  it("patches known nodes and normalizes every patchable field", () => {
    const result = normalizeDesignPlan(
      {
        summary: "Reshape",
        updates: [
          {
            id: "node-a",
            label: "  New   Label ",
            shape: "pill",
            color: "teal",
            x: 55,
            y: 99,
            width: 1000,
            height: 5,
          },
        ],
      } satisfies DesignPlan,
      canvas,
    )

    expect(result.changes.updateNodes).toEqual([
      {
        id: "node-a",
        label: "New Label",
        shape: "pill",
        color: { name: "teal", fill: "#062822", text: "#0AC7B4" },
        x: 60,
        y: 100,
        width: 400,
        height: 80,
      },
    ])
    expect(result.counts.nodesUpdated).toBe(1)
    expect(result.changes.addNodes).toEqual([])
  })

  it("drops updates for unknown ids and updates with nothing to change", () => {
    const result = normalizeDesignPlan(
      {
        summary: "No-op",
        updates: [{ id: "node-missing", label: "Ghost" }, { id: "node-a" }],
      } satisfies DesignPlan,
      canvas,
    )

    expect(result.changes.updateNodes).toEqual([])
    expect(result.isEmpty).toBe(true)
  })

  it("focuses a moved node when the plan adds nothing", () => {
    const result = normalizeDesignPlan(
      {
        summary: "Move",
        updates: [{ id: "node-a", x: 55, y: 99 }],
      } satisfies DesignPlan,
      canvas,
    )

    expect(result.focus).toEqual({ x: 60, y: 100 })
  })
})

/* -------------------------------------------------------------------------- */
/*  Removals                                                                  */
/* -------------------------------------------------------------------------- */

describe("normalizeDesignPlan — removals", () => {
  const canvas = snapshot({
    nodes: [
      snapshotNode({ id: "node-a" }),
      snapshotNode({ id: "node-b" }),
      snapshotNode({ id: "node-c" }),
    ],
    edges: [
      snapshotEdge("edge-a-b", "node-a", "node-b"),
      snapshotEdge("edge-b-c", "node-b", "node-c"),
    ],
  })

  it("keeps only existing nodes, de-duplicating the request", () => {
    const result = normalizeDesignPlan(
      {
        summary: "Delete",
        removedNodeIds: ["node-a", "node-a", "node-missing"],
      } satisfies DesignPlan,
      canvas,
    )

    expect(result.changes.removeNodeIds).toEqual(["node-a"])
    expect(result.changes.removeEdgeIds).toEqual(["edge-a-b"])
    expect(result.counts).toMatchObject({ nodesRemoved: 1, edgesRemoved: 1 })
  })

  it("never leaves an edge dangling behind a deleted node", () => {
    const result = normalizeDesignPlan(
      {
        summary: "Delete everything",
        removedNodeIds: ["node-a", "node-b", "node-c"],
      } satisfies DesignPlan,
      canvas,
    )

    expect(result.changes.removeEdgeIds).toEqual(["edge-a-b", "edge-b-c"])
    expect(result.counts.nodesRemoved).toBe(3)
    expect(result.counts.edgesRemoved).toBe(2)
  })

  it("filters unknown edge removals and merges them with incident edges", () => {
    const result = normalizeDesignPlan(
      {
        summary: "Delete edge",
        removedEdgeIds: ["edge-b-c", "edge-missing"],
        removedNodeIds: ["node-a"],
      } satisfies DesignPlan,
      canvas,
    )

    expect(result.changes.removeEdgeIds).toEqual(["edge-b-c", "edge-a-b"])
  })
})

/* -------------------------------------------------------------------------- */
/*  Edges                                                                     */
/* -------------------------------------------------------------------------- */

describe("normalizeDesignPlan — edges", () => {
  const canvas = snapshot({
    nodes: [snapshotNode({ id: "node-existing" })],
    edges: [snapshotEdge("edge-old", "node-existing", "node-existing")],
  })

  const plan = {
    summary: "Wire it up",
    nodes: [
      { key: "client", label: "Client", shape: "rectangle", color: "blue", x: 0, y: 0 },
      { key: "api", label: "API", shape: "rectangle", color: "purple", x: 0, y: 240 },
    ],
    edges: [
      { from: "client", to: "api", label: "  https  " },
      // Keys resolve case-insensitively, exactly like `nodes` above.
      { from: "API", to: "client" },
      // Duplicate pair and self-loop are discarded.
      { from: "client", to: "api" },
      { from: "client", to: "client" },
      // Dangling endpoints are discarded.
      { from: "client", to: "nope" },
      // Existing canvas ids are valid endpoints too.
      { from: "node-existing", to: "client" },
    ],
  } satisfies DesignPlan

  it("resolves keys and existing ids while dropping invalid connections", () => {
    const result = normalizeDesignPlan(plan, canvas)

    expect(result.changes.addEdges).toEqual([
      {
        id: "edge-node-client-node-api",
        source: "node-client",
        target: "node-api",
        label: "https",
      },
      {
        id: "edge-node-api-node-client",
        source: "node-api",
        target: "node-client",
        label: "",
      },
      {
        id: "edge-node-existing-node-client",
        source: "node-existing",
        target: "node-client",
        label: "",
      },
    ])
    expect(result.counts.edgesAdded).toBe(3)
  })

  it("skips connections whose existing endpoint is being deleted", () => {
    const result = normalizeDesignPlan(
      {
        summary: "Replace a node",
        updates: [],
        nodes: [
          { key: "api", label: "API", shape: "rectangle", color: "blue", x: 0, y: 0 },
        ],
        removedNodeIds: ["node-existing"],
        edges: [{ from: "api", to: "node-existing" }],
      } satisfies DesignPlan,
      canvas,
    )

    expect(result.changes.addEdges).toEqual([])
    expect(result.changes.removeNodeIds).toEqual(["node-existing"])
    expect(result.changes.removeEdgeIds).toEqual(["edge-old"])
  })
})

/* -------------------------------------------------------------------------- */
/*  Focus                                                                     */
/* -------------------------------------------------------------------------- */

describe("normalizeDesignPlan — focus", () => {
  it("focuses the first added node", () => {
    const result = normalizeDesignPlan(
      {
        summary: "Add",
        nodes: [
          { key: "a", label: "A", shape: "rectangle", color: "blue", x: 40, y: 600 },
        ],
        updates: [{ id: "node-old", x: 999 }],
      } satisfies DesignPlan,
      snapshot({ nodes: [snapshotNode({ id: "node-old" })] }),
    )

    expect(result.focus).toEqual({ x: 40, y: 600 })
  })
})

/* -------------------------------------------------------------------------- */
/*  Prompt                                                                    */
/* -------------------------------------------------------------------------- */

describe("buildDesignAgentPrompt", () => {
  const canvas = snapshot({
    nodes: [
      snapshotNode({
        id: "node-db",
        label: "Orders DB",
        shape: "cylinder",
        color: "#062822",
        textColor: "#0AC7B4",
        x: 240,
        y: 480,
        width: 140,
        height: 100,
      }),
    ],
    edges: [snapshotEdge("edge-1", "node-db", "node-db", "reads")],
  })

  it("includes the user request and a machine-readable canvas context", () => {
    const prompt = buildDesignAgentPrompt({
      request: "Design a payments system",
      canvas,
    })

    expect(prompt).toContain("Design a payments system")

    const context = JSON.parse(prompt.split("Current canvas:\n")[1])

    expect(context.palette.blue).toBe("#10233D")
    expect(context.canvas.nodes).toEqual([
      {
        id: "node-db",
        label: "Orders DB",
        shape: "cylinder",
        // The model sees palette names, never raw hex values.
        color: "teal",
        x: 240,
        y: 480,
        width: 140,
        height: 100,
      },
    ])
    expect(context.canvas.edges).toEqual([
      { id: "edge-1", from: "node-db", to: "node-db", label: "reads" },
    ])
  })

  it("falls back to neutral for an unrecognized stored fill", () => {
    const prompt = buildDesignAgentPrompt({
      request: "Extend it",
      canvas: snapshot({ nodes: [snapshotNode({ id: "n", color: "#123456" })] }),
    })

    const context = JSON.parse(prompt.split("Current canvas:\n")[1])
    expect(context.canvas.nodes[0].color).toBe("neutral")
  })
})

describe("design agent system prompt", () => {
  it("documents every allowed shape and palette name", () => {
    for (const shape of NODE_SHAPE_TYPES) {
      expect(DESIGN_AGENT_SYSTEM_PROMPT).toContain(shape)
    }
    for (const color of NODE_COLOR_NAMES) {
      expect(DESIGN_AGENT_SYSTEM_PROMPT).toContain(color)
    }
  })

  it("states the 20px grid layout contract", () => {
    expect(DESIGN_AGENT_SYSTEM_PROMPT).toMatch(/multiple of 20/i)
  })
})
