import { LiveMap, LiveObject } from "@liveblocks/client"

import type { FlowDiagram, FlowEdge, FlowNode, Storage } from "@/liveblocks.config"
import { getLiveblocks } from "@/lib/liveblocks"
import {
  DEFAULT_NODE_COLOR,
  NODE_SHAPE_TYPES,
  getNodeShape,
  type CanvasEdgeData,
  type CanvasNodeData,
  type CanvasSnapshot,
  type CanvasSnapshotEdge,
  type CanvasSnapshotNode,
  type NodeShape,
} from "@/types/canvas"

/* -------------------------------------------------------------------------- */
/*  Layout rules                                                              */
/* -------------------------------------------------------------------------- */

/** Every generated node position is aligned to this grid. */
export const CANVAS_GRID = 20

/** Hard bounds so a bad model response can never push nodes into deep space. */
const MIN_COORDINATE = -5000
const MAX_COORDINATE = 5000
const MIN_NODE_SIZE = 80
const MAX_NODE_SIZE = 400

/* -------------------------------------------------------------------------- */
/*  Change model                                                              */
/* -------------------------------------------------------------------------- */

export interface NodeColorPair {
  fill: string
  text: string
}

export interface CanvasNodeChanges {
  id: string
  label: string
  shape: NodeShape
  color: NodeColorPair
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasNodeUpdates {
  id: string
  label?: string
  shape?: NodeShape
  color?: NodeColorPair
  x?: number
  y?: number
  width?: number
  height?: number
}

export interface CanvasEdgeChanges {
  id: string
  source: string
  target: string
  label: string
}

export interface CanvasChanges {
  addNodes?: CanvasNodeChanges[]
  updateNodes?: CanvasNodeUpdates[]
  removeNodeIds?: string[]
  addEdges?: CanvasEdgeChanges[]
  removeEdgeIds?: string[]
}

export interface CanvasChangeResult {
  addedNodeIds: string[]
  updatedNodeIds: string[]
  removedNodeIds: string[]
  addedEdgeIds: string[]
  removedEdgeIds: string[]
}

/* -------------------------------------------------------------------------- */
/*  Snapshot                                                                  */
/* -------------------------------------------------------------------------- */

export function snapToGrid(value: number): number {
  const clamped = Math.min(Math.max(value, MIN_COORDINATE), MAX_COORDINATE)
  return Math.round(clamped / CANVAS_GRID) * CANVAS_GRID
}

export function clampNodeSize(value: number): number {
  return Math.min(Math.max(Math.round(value), MIN_NODE_SIZE), MAX_NODE_SIZE)
}

export async function readCanvasSnapshot(roomId: string): Promise<CanvasSnapshot> {
  const liveblocks = getLiveblocks()

  let document: unknown
  try {
    document = await liveblocks.getStorageDocument(roomId, "json")
  } catch {
    // A room without a storage document yet is simply an empty canvas.
    return { nodes: [], edges: [] }
  }

  const flow = isRecord(document) ? document.flow : undefined
  if (!isRecord(flow)) return { nodes: [], edges: [] }

  const nodes = Object.values(isRecord(flow.nodes) ? flow.nodes : {})
    .map(toSnapshotNode)
    .filter((node): node is CanvasSnapshotNode => node !== null)

  const edges = Object.values(isRecord(flow.edges) ? flow.edges : {})
    .map(toSnapshotEdge)
    .filter((edge): edge is CanvasSnapshotEdge => edge !== null)

  return { nodes, edges }
}

/* -------------------------------------------------------------------------- */
/*  Mutation                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Applies a batch of canvas changes to the room's collaborative flow storage.
 *
 * The document is the same one `useLiveblocksFlow` reads: a `flow` LiveObject
 * holding a LiveMap of nodes and a LiveMap of edges keyed by id. Every change
 * therefore lands in the shared room and is picked up by connected clients
 * without any extra plumbing.
 */
export async function applyCanvasChanges(
  roomId: string,
  changes: CanvasChanges,
): Promise<CanvasChangeResult> {
  const addNodes = changes.addNodes ?? []
  const updateNodes = changes.updateNodes ?? []
  const removeNodeIds = changes.removeNodeIds ?? []
  const addEdges = changes.addEdges ?? []
  const removeEdgeIds = changes.removeEdgeIds ?? []

  const result: CanvasChangeResult = {
    addedNodeIds: addNodes.map((node) => node.id),
    updatedNodeIds: [],
    removedNodeIds: [],
    addedEdgeIds: addEdges.map((edge) => edge.id),
    removedEdgeIds: [],
  }

  const changeCount =
    addNodes.length +
    updateNodes.length +
    removeNodeIds.length +
    addEdges.length +
    removeEdgeIds.length

  if (changeCount === 0) return result

  const liveblocks = getLiveblocks()

  await liveblocks.mutateStorage(roomId, ({ root }) => {
    // The room document is the `useLiveblocksFlow` diagram, which is not
    // declared on the global Liveblocks Storage type (see liveblocks.config.ts).
    const diagram = ensureFlowDiagram(root as unknown as LiveObject<Storage>)
    const nodes = diagram.get("nodes")
    const edges = diagram.get("edges")

    // Liveblocks may re-run this callback when it retries against newer
    // storage, so the applied lists are rebuilt rather than appended to.
    const appliedRemovedNodeIds: string[] = []
    const appliedRemovedEdgeIds: string[] = []
    const appliedUpdatedNodeIds: string[] = []

    // 1. Removals first, so nothing is ever left dangling.
    for (const edgeId of removeEdgeIds) {
      if (edges.delete(edgeId)) appliedRemovedEdgeIds.push(edgeId)
    }
    for (const nodeId of removeNodeIds) {
      if (nodes.delete(nodeId)) appliedRemovedNodeIds.push(nodeId)
    }

    // 2. Patch existing nodes: move, resize, relabel, recolor.
    for (const update of updateNodes) {
      const node = nodes.get(update.id)
      if (!node) continue

      const data = node.get("data")

      if (update.label !== undefined) data.set("label", update.label)
      if (update.shape !== undefined) data.set("shape", update.shape)
      if (update.color !== undefined) {
        data.set("color", update.color.fill)
        data.set("textColor", update.color.text)
      }
      if (update.width !== undefined) data.set("width", clampNodeSize(update.width))
      if (update.height !== undefined) data.set("height", clampNodeSize(update.height))

      if (update.x !== undefined || update.y !== undefined) {
        const position = node.get("position")
        node.set("position", {
          x: snapToGrid(update.x ?? position.x),
          y: snapToGrid(update.y ?? position.y),
        })
      }

      appliedUpdatedNodeIds.push(update.id)
    }

    // 3. New nodes.
    for (const node of addNodes) {
      nodes.set(node.id, createNode(node))
    }

    // 4. New edges.
    for (const edge of addEdges) {
      edges.set(edge.id, createEdge(edge))
    }

    result.updatedNodeIds = appliedUpdatedNodeIds
    result.removedNodeIds = appliedRemovedNodeIds
    result.removedEdgeIds = appliedRemovedEdgeIds
  })

  return result
}

/* -------------------------------------------------------------------------- */
/*  Storage helpers                                                           */
/* -------------------------------------------------------------------------- */

function ensureFlowDiagram(root: LiveObject<Storage>): FlowDiagram {
  const existing: FlowDiagram | undefined = root.get("flow")
  if (existing) return existing

  const diagram: FlowDiagram = new LiveObject({
    nodes: new LiveMap<string, LiveObject<FlowNode>>(),
    edges: new LiveMap<string, LiveObject<FlowEdge>>(),
  })

  root.set("flow", diagram)
  return diagram
}

function createNode(node: CanvasNodeChanges): LiveObject<FlowNode> {
  return new LiveObject<FlowNode>({
    id: node.id,
    type: "canvasNode",
    position: { x: snapToGrid(node.x), y: snapToGrid(node.y) },
    data: new LiveObject<CanvasNodeData>({
      label: node.label,
      color: node.color.fill,
      textColor: node.color.text,
      shape: node.shape,
      width: clampNodeSize(node.width),
      height: clampNodeSize(node.height),
    }),
  })
}

function createEdge(edge: CanvasEdgeChanges): LiveObject<FlowEdge> {
  return new LiveObject<FlowEdge>({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "canvasEdge",
    data: new LiveObject<CanvasEdgeData>({ label: edge.label }),
  })
}

/* -------------------------------------------------------------------------- */
/*  Snapshot parsing                                                          */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function readShape(value: unknown): NodeShape {
  return NODE_SHAPE_TYPES.includes(value as NodeShape)
    ? (value as NodeShape)
    : "rectangle"
}

function toSnapshotNode(value: unknown): CanvasSnapshotNode | null {
  if (!isRecord(value)) return null

  const id = readString(value.id)
  if (!id) return null

  const data = isRecord(value.data) ? value.data : {}
  const position = isRecord(value.position) ? value.position : {}
  const shape = readShape(data.shape)
  const defaultSize = getNodeShape(shape)

  return {
    id,
    label: readString(data.label, "Untitled"),
    shape,
    color: readString(data.color, DEFAULT_NODE_COLOR.fill),
    textColor: readString(data.textColor, DEFAULT_NODE_COLOR.text),
    x: readNumber(position.x, 0),
    y: readNumber(position.y, 0),
    width: readNumber(data.width, defaultSize.width),
    height: readNumber(data.height, defaultSize.height),
  }
}

function toSnapshotEdge(value: unknown): CanvasSnapshotEdge | null {
  if (!isRecord(value)) return null

  const id = readString(value.id)
  const source = readString(value.source)
  const target = readString(value.target)
  if (!id || !source || !target) return null

  const data = isRecord(value.data) ? value.data : {}

  return { id, source, target, label: readString(data.label) }
}
