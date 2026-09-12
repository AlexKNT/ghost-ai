/* -------------------------------------------------------------------------- */
/*  Node Color Palette                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Semantic palette names. These are the only colors a node may use and the
 * names the AI design agent is allowed to choose from.
 */
export const NODE_COLOR_NAMES = [
  "neutral",
  "blue",
  "purple",
  "orange",
  "red",
  "pink",
  "green",
  "teal",
] as const

export type NodeColorName = (typeof NODE_COLOR_NAMES)[number]

export interface NodeColor {
  name: NodeColorName
  fill: string
  text: string
}

export const NODE_COLORS: ReadonlyArray<NodeColor> = [
  { name: "neutral", fill: "#1F1F1F", text: "#EDEDED" }, // Neutral dark (default)
  { name: "blue", fill: "#10233D", text: "#52A8FF" }, // Blue
  { name: "purple", fill: "#2E1938", text: "#BF7AF0" }, // Purple
  { name: "orange", fill: "#331B00", text: "#FF990A" }, // Orange
  { name: "red", fill: "#3C1618", text: "#FF6166" }, // Red
  { name: "pink", fill: "#3A1726", text: "#F75F8F" }, // Pink
  { name: "green", fill: "#0F2E18", text: "#62C073" }, // Green
  { name: "teal", fill: "#062822", text: "#0AC7B4" }, // Teal
]

export const DEFAULT_NODE_COLOR = NODE_COLORS[0]

/** Resolve a palette name to its fill/text pair, falling back to the default. */
export function getNodeColor(name: string | undefined): NodeColor {
  return NODE_COLORS.find((color) => color.name === name) ?? DEFAULT_NODE_COLOR
}

/* -------------------------------------------------------------------------- */
/*  Node Shapes                                                               */
/* -------------------------------------------------------------------------- */

/** The only shapes a canvas node may use. */
export const NODE_SHAPE_TYPES = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
] as const

export type NodeShape = (typeof NODE_SHAPE_TYPES)[number]

export interface NodeShapeDefinition {
  type: NodeShape
  label: string
  width: number
  height: number
}

export const NODE_SHAPES: ReadonlyArray<NodeShapeDefinition> = [
  { type: "rectangle", label: "Rectangle", width: 160, height: 80 },
  { type: "diamond", label: "Diamond", width: 160, height: 120 },
  { type: "circle", label: "Circle", width: 120, height: 120 },
  { type: "pill", label: "Pill", width: 160, height: 80 },
  { type: "cylinder", label: "Cylinder", width: 140, height: 100 },
  { type: "hexagon", label: "Hexagon", width: 150, height: 130 },
]

/** Default size for a shape, falling back to the rectangle. */
export function getNodeShape(type: NodeShape | undefined): NodeShapeDefinition {
  return NODE_SHAPES.find((shape) => shape.type === type) ?? NODE_SHAPES[0]
}

/* -------------------------------------------------------------------------- */
/*  Canvas Node & Edge Types                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Node payload stored on the canvas.
 *
 * Declared as a type alias rather than an interface: Liveblocks storage values
 * must satisfy its `LsonObject` index signature, which interfaces do not
 * provide.
 */
export type CanvasNodeData = {
  label: string
  color: string
  textColor: string
  shape: NodeShape
  width: number
  height: number
}

export type CanvasEdgeData = {
  label: string
}

/* -------------------------------------------------------------------------- */
/*  Canvas Snapshot                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Flattened, serializable view of the collaborative canvas. Used by the AI
 * design agent to read the current graph and describe it to the model.
 */
export interface CanvasSnapshotNode {
  id: string
  label: string
  shape: NodeShape
  color: string
  textColor: string
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasSnapshotEdge {
  id: string
  source: string
  target: string
  label: string
}

export interface CanvasSnapshot {
  nodes: CanvasSnapshotNode[]
  edges: CanvasSnapshotEdge[]
}

/* -------------------------------------------------------------------------- */
/*  Shape Panel Drag Payload                                                  */
/* -------------------------------------------------------------------------- */

export const SHAPE_DRAG_DATA_FORMAT = "application/ghost-shape"

export interface ShapeDragPayload {
  shape: NodeShape
  width: number
  height: number
}
