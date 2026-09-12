import {
  NODE_COLORS,
  getNodeColor,
  getNodeShape,
  type CanvasSnapshot,
} from "@/types/canvas"
import type { DesignPlan } from "@/types/tasks"
import {
  clampNodeSize,
  snapToGrid,
  type CanvasChanges,
  type CanvasEdgeChanges,
  type CanvasNodeChanges,
  type CanvasNodeUpdates,
} from "@/lib/liveblocks-flow"

/* -------------------------------------------------------------------------- */
/*  Result                                                                    */
/* -------------------------------------------------------------------------- */

export interface NormalizedDesignPlan {
  summary: string
  changes: CanvasChanges
  isEmpty: boolean
  focus: { x: number; y: number } | null
  counts: {
    nodesAdded: number
    nodesUpdated: number
    nodesRemoved: number
    edgesAdded: number
    edgesRemoved: number
  }
}

/* -------------------------------------------------------------------------- */
/*  Prompt                                                                    */
/* -------------------------------------------------------------------------- */

export const DESIGN_AGENT_SYSTEM_PROMPT = `You are Ghost AI, a system architect that designs software systems directly on a shared collaborative canvas.

You receive a user request and the current canvas as JSON. You reply with a structured plan of canvas changes.

## What you can change

- "nodes": create new nodes. "key" is a short unique reference (e.g. "api-gateway") that edges use to point at this node.
- "updates": move, resize, relabel or recolor nodes that already exist. "id" MUST be an id from the current canvas.
- "removedNodeIds": delete existing nodes. Only delete when the user asks for it.
- "edges": connect nodes. "from"/"to" accept either a "key" from "nodes" or an id from the current canvas.
- "removedEdgeIds": delete existing edges. Only when the user asks for it.

## Allowed shapes

- rectangle — generic service, component or module
- pill — service or long-running process
- circle — event, endpoint or small unit
- diamond — decision, gateway or router
- cylinder — database, cache or storage
- hexagon — external system or trust boundary

Never use any other shape.

## Allowed colors

Use exactly these color names: neutral, blue, purple, orange, red, pink, green, teal.

Suggest a consistent convention, for example: blue for clients, purple for gateways, green for services, orange for queues, cylinder + pink for databases, teal for caches, red for failure paths, neutral for anything that does not fit.

## Layout and spacing rules

- Work on a 20px grid: every x/y must be a multiple of 20.
- Lay systems out in horizontal layers, top to bottom, 240px apart: clients at y=0, edge/gateway at y=240, services at y=480, data stores at y=720, optional infrastructure at y=960.
- Space siblings inside a layer 240px apart horizontally, starting at x=0.
- Never overlap nodes: keep at least one grid cell (100px) of clearance on every side, including against nodes already on the canvas.
- When extending an existing canvas, place new nodes below or to the right of everything that is already there instead of on top of it.
- Keep labels short (1-4 words). Prefer the default node size for the shape unless a wider label needs a wider node.

## Output rules

- Always include every top-level key — "nodes", "updates", "removedNodeIds", "edges" and "removedEdgeIds" — using empty arrays when there is nothing to change.
- Produce 4-12 nodes for a brand new design. When extending an existing canvas, only add what is needed.
- Reuse existing node ids in "updates" instead of recreating a node.
- Do not create edges to nodes you are deleting in the same plan.
- Do not create duplicate edges, self loops, or edges between the same pair in the same direction.
- "summary" is one short sentence describing what you changed.
- Return an empty plan (empty arrays) if the request needs no canvas changes.`

export function buildDesignAgentPrompt({
  request,
  canvas,
}: {
  request: string
  canvas: CanvasSnapshot
}): string {
  const context = {
    palette: Object.fromEntries(
      NODE_COLORS.map((color) => [color.name, color.fill]),
    ),
    canvas: {
      nodes: canvas.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        shape: node.shape,
        color: colorNameFor(node.color),
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      })),
      edges: canvas.edges.map((edge) => ({
        id: edge.id,
        from: edge.source,
        to: edge.target,
        label: edge.label,
      })),
    },
  }

  return [
    "User request:",
    request,
    "",
    "Current canvas:",
    JSON.stringify(context),
  ].join("\n")
}

/* -------------------------------------------------------------------------- */
/*  Normalization                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Turns the model's plan into a validated change set.
 *
 * Everything that reaches the canvas is filtered here: unknown ids are
 * dropped, palette names resolve to real colors, geometry snaps to the grid,
 * sizes are clamped, and edges that point at nothing are discarded.
 */
export function normalizeDesignPlan(
  plan: DesignPlan,
  canvas: CanvasSnapshot,
): NormalizedDesignPlan {
  const existingNodeIds = new Set(canvas.nodes.map((node) => node.id))
  const existingEdgeIds = new Set(canvas.edges.map((edge) => edge.id))
  const existingEdgePairs = new Set(
    canvas.edges.map((edge) => `${edge.source}->${edge.target}`),
  )
  const usedIds = new Set<string>([...existingNodeIds, ...existingEdgeIds])

  /* ---- new nodes --------------------------------------------------------- */

  const keyToId = new Map<string, string>()
  const addNodes: CanvasNodeChanges[] = []

  for (const node of plan.nodes ?? []) {
    const key = node.key.trim()
    if (!key || keyToId.has(key.toLowerCase())) continue

    const id = uniqueId(`node-${slug(key)}`, usedIds)
    keyToId.set(key.toLowerCase(), id)

    const defaultSize = getNodeShape(node.shape)
    addNodes.push({
      id,
      label: cleanLabel(node.label),
      shape: node.shape,
      color: getNodeColor(node.color),
      // Snapped here so the normalized change set is already grid-aligned and
      // the agent cursor we publish points exactly at the stored node.
      x: snapToGrid(node.x),
      y: snapToGrid(node.y),
      width: node.width !== undefined ? clampNodeSize(node.width) : defaultSize.width,
      height:
        node.height !== undefined ? clampNodeSize(node.height) : defaultSize.height,
    })
  }

  /* ---- node updates ----------------------------------------------------- */

  const updateNodes: CanvasNodeUpdates[] = []

  for (const update of plan.updates ?? []) {
    const id = update.id.trim()
    if (!existingNodeIds.has(id)) continue

    const patch: CanvasNodeUpdates = { id }
    if (update.label !== undefined) patch.label = cleanLabel(update.label)
    if (update.shape !== undefined) patch.shape = update.shape
    if (update.color !== undefined) patch.color = getNodeColor(update.color)
    if (update.x !== undefined) patch.x = snapToGrid(update.x)
    if (update.y !== undefined) patch.y = snapToGrid(update.y)
    if (update.width !== undefined) patch.width = clampNodeSize(update.width)
    if (update.height !== undefined) patch.height = clampNodeSize(update.height)

    if (Object.keys(patch).length > 1) updateNodes.push(patch)
  }

  /* ---- removals --------------------------------------------------------- */

  const removedNodeIds = unique(plan.removedNodeIds ?? []).filter((id) =>
    existingNodeIds.has(id),
  )

  const removedEdgeIds = new Set(
    unique(plan.removedEdgeIds ?? []).filter((id) => existingEdgeIds.has(id)),
  )

  const removedNodeIdSet = new Set(removedNodeIds)

  // Deleting a node must never leave edges floating around.
  for (const edge of canvas.edges) {
    if (removedNodeIdSet.has(edge.source) || removedNodeIdSet.has(edge.target)) {
      removedEdgeIds.add(edge.id)
    }
  }

  /* ---- edges ------------------------------------------------------------ */

  const addEdges: CanvasEdgeChanges[] = []
  const seenPairs = new Set(existingEdgePairs)

  for (const edge of plan.edges ?? []) {
    const source = resolveEndpoint(edge.from, keyToId, existingNodeIds)
    const target = resolveEndpoint(edge.to, keyToId, existingNodeIds)
    if (!source || !target || source === target) continue
    // Deletions win: never connect to a node this same plan removes.
    if (removedNodeIdSet.has(source) || removedNodeIdSet.has(target)) continue

    const pair = `${source}->${target}`
    if (seenPairs.has(pair)) continue
    seenPairs.add(pair)

    addEdges.push({
      id: uniqueId(`edge-${slug(source)}-${slug(target)}`, usedIds),
      source,
      target,
      label: (edge.label ?? "").trim(),
    })
  }

  /* ---- result ----------------------------------------------------------- */

  const changes: CanvasChanges = {
    addNodes,
    updateNodes,
    removeNodeIds: removedNodeIds,
    addEdges,
    removeEdgeIds: [...removedEdgeIds],
  }

  const counts = {
    nodesAdded: addNodes.length,
    nodesUpdated: updateNodes.length,
    nodesRemoved: removedNodeIds.length,
    edgesAdded: addEdges.length,
    edgesRemoved: removedEdgeIds.size,
  }

  const isEmpty =
    counts.nodesAdded +
      counts.nodesUpdated +
      counts.nodesRemoved +
      counts.edgesAdded +
      counts.edgesRemoved ===
    0

  const focusNode = addNodes[0]
  const focusUpdate = updateNodes.find(
    (update) => update.x !== undefined || update.y !== undefined,
  )

  let focus: { x: number; y: number } | null = null
  if (focusNode) {
    focus = { x: focusNode.x, y: focusNode.y }
  } else if (focusUpdate) {
    focus = { x: focusUpdate.x ?? 0, y: focusUpdate.y ?? 0 }
  }

  return {
    summary: plan.summary.trim(),
    changes,
    isEmpty,
    focus,
    counts,
  }
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const ID_SLUG_MAX_LENGTH = 40

function slug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ID_SLUG_MAX_LENGTH)
  return cleaned || "item"
}

function uniqueId(base: string, used: Set<string>): string {
  let candidate = base
  let counter = 2

  while (used.has(candidate)) {
    candidate = `${base}-${counter}`
    counter += 1
  }

  used.add(candidate)
  return candidate
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function cleanLabel(value: string): string {
  const label = value.trim().replace(/\s+/g, " ")
  return label.slice(0, 60) || "Untitled"
}

function resolveEndpoint(
  reference: string,
  keyToId: Map<string, string>,
  existingNodeIds: Set<string>,
): string | null {
  const ref = reference.trim()
  if (!ref) return null
  if (existingNodeIds.has(ref)) return ref
  return keyToId.get(ref.toLowerCase()) ?? null
}

function colorNameFor(fill: string): string {
  const match = NODE_COLORS.find(
    (color) => color.fill.toLowerCase() === fill.toLowerCase(),
  )
  return match?.name ?? "neutral"
}
