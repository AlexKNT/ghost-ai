import { LiveMap, LiveObject } from "@liveblocks/client"
import { describe, expect, it, vi } from "vitest"

import type { FlowEdge, FlowNode, Storage } from "@/liveblocks.config"

/**
 * The canvas mutation helpers talk to Liveblocks through `getLiveblocks()`, so
 * the client is replaced with an in-memory double. The storage document below
 * is the real one `useLiveblocksFlow` owns, built from real `LiveObject` /
 * `LiveMap` instances, which keeps the mutation logic itself under test instead
 * of a hand-rolled fake.
 */
const clientMock = vi.hoisted(() => ({
  mutateStorage: vi.fn(),
  getStorageDocument: vi.fn(),
}))

vi.mock("@/lib/liveblocks", () => ({
  getLiveblocks: () => clientMock,
}))

import {
  CANVAS_GRID,
  applyCanvasChanges,
  clampNodeSize,
  readCanvasSnapshot,
  snapToGrid,
} from "@/lib/liveblocks-flow"

/* -------------------------------------------------------------------------- */
/*  Fixtures                                                                  */
/* -------------------------------------------------------------------------- */

function createRoot(): LiveObject<Storage> {
  return new LiveObject<Storage>({
    flow: new LiveObject({
      nodes: new LiveMap<string, LiveObject<FlowNode>>(),
      edges: new LiveMap<string, LiveObject<FlowEdge>>(),
    }),
  })
}

function createEmptyRoot(): LiveObject<Storage> {
  return new LiveObject<Storage>({} as Storage)
}

function mockMutation(root: LiveObject<Storage>) {
  clientMock.mutateStorage.mockImplementation(
    async (
      _roomId: string,
      callback: (context: { root: LiveObject<Storage> }) => void,
    ) => {
      callback({ root })
    },
  )
}

function readNodes(root: LiveObject<Storage>) {
  return root.get("flow").get("nodes")
}

function readEdges(root: LiveObject<Storage>) {
  return root.get("flow").get("edges")
}

/* -------------------------------------------------------------------------- */
/*  Grid + size clamping                                                      */
/* -------------------------------------------------------------------------- */

describe("snapToGrid", () => {
  it("uses a 20px grid", () => {
    expect(CANVAS_GRID).toBe(20)
  })

  it("rounds values to the nearest grid cell", () => {
    expect(snapToGrid(0)).toBe(0)
    expect(snapToGrid(9)).toBeCloseTo(0)
    expect(snapToGrid(10)).toBe(20)
    expect(snapToGrid(31)).toBe(40)
    expect(snapToGrid(239)).toBe(240)
    expect(snapToGrid(999.9)).toBe(1000)
  })

  it("keeps negative coordinates on the grid", () => {
    expect(snapToGrid(-40)).toBe(-40)
    expect(snapToGrid(-25)).toBe(-20)
    expect(snapToGrid(-31)).toBe(-40)
  })

  it("clamps runaway coordinates to +/-5000", () => {
    expect(snapToGrid(999_999)).toBe(5000)
    expect(snapToGrid(-999_999)).toBe(-5000)
  })

  it("always returns a grid multiple", () => {
    for (const value of [-777, -3, 0, 17, 813, 4001]) {
      expect(Math.abs(snapToGrid(value) % CANVAS_GRID)).toBe(0)
    }
  })
})

describe("clampNodeSize", () => {
  it("keeps sizes inside the 80-400 bound", () => {
    expect(clampNodeSize(79.4)).toBe(80)
    expect(clampNodeSize(-50)).toBe(80)
    expect(clampNodeSize(160)).toBe(160)
    expect(clampNodeSize(401)).toBe(400)
    expect(clampNodeSize(5000)).toBe(400)
  })

  it("rounds fractional sizes", () => {
    expect(clampNodeSize(160.6)).toBe(161)
    expect(clampNodeSize(159.2)).toBe(159)
  })
})

/* -------------------------------------------------------------------------- */
/*  Reading the canvas                                                        */
/* -------------------------------------------------------------------------- */

describe("readCanvasSnapshot", () => {
  it("returns an empty canvas when the room has no storage document", async () => {
    clientMock.getStorageDocument.mockRejectedValue(new Error("room not found"))

    await expect(readCanvasSnapshot("room-1")).resolves.toEqual({
      nodes: [],
      edges: [],
    })
  })

  it("returns an empty canvas when the document has no flow key", async () => {
    clientMock.getStorageDocument.mockResolvedValue({ other: true })

    await expect(readCanvasSnapshot("room-1")).resolves.toEqual({
      nodes: [],
      edges: [],
    })
  })

  it("flattens stored nodes and edges into a serializable snapshot", async () => {
    clientMock.getStorageDocument.mockResolvedValue({
      flow: {
        nodes: {
          "node-api": {
            id: "node-api",
            type: "canvasNode",
            position: { x: 40, y: 60 },
            data: {
              label: "API Gateway",
              color: "#2E1938",
              textColor: "#BF7AF0",
              shape: "hexagon",
              width: 150,
              height: 130,
            },
          },
        },
        edges: {
          "edge-1": {
            id: "edge-1",
            source: "node-api",
            target: "node-api",
            data: { label: "loops" },
          },
        },
      },
    })

    const snapshot = await readCanvasSnapshot("room-1")

    expect(snapshot.nodes).toEqual([
      {
        id: "node-api",
        label: "API Gateway",
        shape: "hexagon",
        color: "#2E1938",
        textColor: "#BF7AF0",
        x: 40,
        y: 60,
        width: 150,
        height: 130,
      },
    ])
    expect(snapshot.edges).toEqual([
      { id: "edge-1", source: "node-api", target: "node-api", label: "loops" },
    ])
  })

  it("applies safe fallbacks for incomplete stored values", async () => {
    clientMock.getStorageDocument.mockResolvedValue({
      flow: {
        nodes: {
          partial: { id: "partial", data: {} },
        },
        edges: {},
      },
    })

    const [node] = (await readCanvasSnapshot("room-1")).nodes

    expect(node).toMatchObject({
      id: "partial",
      label: "Untitled",
      shape: "rectangle",
      color: "#1F1F1F",
      textColor: "#EDEDED",
      x: 0,
      y: 0,
      width: 160,
      height: 80,
    })
  })

  it("drops entries that are not usable as nodes or edges", async () => {
    clientMock.getStorageDocument.mockResolvedValue({
      flow: {
        nodes: {
          "no-id": { id: "", data: {} },
          "not-an-object": "nope",
          good: { id: "good", position: { x: 20, y: 20 }, data: {} },
        },
        edges: {
          "no-target": { id: "e1", source: "a" },
          ok: { id: "e2", source: "good", target: "good" },
        },
      },
    })

    const snapshot = await readCanvasSnapshot("room-1")

    expect(snapshot.nodes.map((node) => node.id)).toEqual(["good"])
    expect(snapshot.edges.map((edge) => edge.id)).toEqual(["e2"])
  })
})

/* -------------------------------------------------------------------------- */
/*  Applying changes                                                          */
/* -------------------------------------------------------------------------- */

describe("applyCanvasChanges", () => {
  it("does not touch storage when there is nothing to change", async () => {
    const result = await applyCanvasChanges("room-1", {})

    expect(clientMock.mutateStorage).not.toHaveBeenCalled()
    expect(result).toEqual({
      addedNodeIds: [],
      updatedNodeIds: [],
      removedNodeIds: [],
      addedEdgeIds: [],
      removedEdgeIds: [],
    })
  })

  it("creates the flow diagram when the room document is empty", async () => {
    const root = createEmptyRoot()
    mockMutation(root)

    await applyCanvasChanges("room-1", {
      addNodes: [
        {
          id: "node-a",
          label: "A",
          shape: "rectangle",
          color: { fill: "#0F2E18", text: "#62C073" },
          x: 17,
          y: 23,
          width: 1000,
          height: 10,
        },
      ],
    })

    expect(root.get("flow")).toBeDefined()

    const node = readNodes(root).get("node-a")
    expect(node?.get("id")).toBe("node-a")
    expect(node?.get("type")).toBe("canvasNode")
    // Positions are snapped and sizes clamped on the way in.
    expect(node?.get("position")).toEqual({ x: 20, y: 20 })
    expect(node?.get("data").get("width")).toBe(400)
    expect(node?.get("data").get("height")).toBe(80)
    expect(node?.get("data").get("color")).toBe("#0F2E18")
    expect(node?.get("data").get("textColor")).toBe("#62C073")
  })

  it("patches existing nodes and reports only the ids it found", async () => {
    const root = createRoot()
    readNodes(root).set(
      "node-a",
      new LiveObject<FlowNode>({
        id: "node-a",
        type: "canvasNode",
        position: { x: 0, y: 0 },
        data: new LiveObject({
          label: "Old",
          color: "#1F1F1F",
          textColor: "#EDEDED",
          shape: "rectangle",
          width: 160,
          height: 80,
        }),
      }),
    )
    mockMutation(root)

    const result = await applyCanvasChanges("room-1", {
      updateNodes: [
        {
          id: "node-a",
          label: "New",
          shape: "pill",
          x: 55,
          y: 99,
          color: { fill: "#10233D", text: "#52A8FF" },
        },
        { id: "node-missing", label: "Ghost" },
      ],
    })

    const node = readNodes(root).get("node-a")
    expect(node?.get("data").get("label")).toBe("New")
    expect(node?.get("data").get("shape")).toBe("pill")
    expect(node?.get("data").get("color")).toBe("#10233D")
    expect(node?.get("position")).toEqual({ x: 60, y: 100 })
    expect(result.updatedNodeIds).toEqual(["node-a"])
  })

  it("removes nodes and edges, reporting only what actually existed", async () => {
    const root = createRoot()
    readNodes(root).set(
      "node-a",
      new LiveObject<FlowNode>({
        id: "node-a",
        type: "canvasNode",
        position: { x: 0, y: 0 },
        data: new LiveObject({
          label: "A",
          color: "#1F1F1F",
          textColor: "#EDEDED",
          shape: "rectangle",
          width: 160,
          height: 80,
        }),
      }),
    )
    readEdges(root).set(
      "edge-1",
      new LiveObject<FlowEdge>({
        id: "edge-1",
        source: "node-a",
        target: "node-a",
        type: "canvasEdge",
        data: new LiveObject({ label: "" }),
      }),
    )
    mockMutation(root)

    const result = await applyCanvasChanges("room-1", {
      removeNodeIds: ["node-a", "node-missing"],
      removeEdgeIds: ["edge-1"],
    })

    expect(readNodes(root).has("node-a")).toBe(false)
    expect(readEdges(root).has("edge-1")).toBe(false)
    expect(result.removedNodeIds).toEqual(["node-a"])
    expect(result.removedEdgeIds).toEqual(["edge-1"])
  })

  it("adds edges between the nodes it just created", async () => {
    const root = createRoot()
    mockMutation(root)

    const result = await applyCanvasChanges("room-1", {
      addNodes: [
        {
          id: "node-a",
          label: "A",
          shape: "rectangle",
          color: { fill: "#1F1F1F", text: "#EDEDED" },
          x: 0,
          y: 0,
          width: 160,
          height: 80,
        },
        {
          id: "node-b",
          label: "B",
          shape: "cylinder",
          color: { fill: "#062822", text: "#0AC7B4" },
          x: 240,
          y: 0,
          width: 140,
          height: 100,
        },
      ],
      addEdges: [
        { id: "edge-a-b", source: "node-a", target: "node-b", label: "reads" },
      ],
    })

    const edge = readEdges(root).get("edge-a-b")
    expect(edge?.get("source")).toBe("node-a")
    expect(edge?.get("target")).toBe("node-b")
    expect(edge?.get("type")).toBe("canvasEdge")
    expect(edge?.get("data").get("label")).toBe("reads")
    expect(result.addedNodeIds).toEqual(["node-a", "node-b"])
    expect(result.addedEdgeIds).toEqual(["edge-a-b"])
  })
})
