/* -------------------------------------------------------------------------- */
/*  Node Color Palette                                                        */
/* -------------------------------------------------------------------------- */

export const NODE_COLORS = [
  { fill: "#1F1F1F", text: "#EDEDED" }, // Neutral dark (default)
  { fill: "#10233D", text: "#52A8FF" }, // Blue
  { fill: "#2E1938", text: "#BF7AF0" }, // Purple
  { fill: "#331B00", text: "#FF990A" }, // Orange
  { fill: "#3C1618", text: "#FF6166" }, // Red
  { fill: "#3A1726", text: "#F75F8F" }, // Pink
  { fill: "#0F2E18", text: "#62C073" }, // Green
  { fill: "#062822", text: "#0AC7B4" }, // Teal
] as const

export const DEFAULT_NODE_COLOR = NODE_COLORS[0]

/* -------------------------------------------------------------------------- */
/*  Node Shapes                                                               */
/* -------------------------------------------------------------------------- */

export const NODE_SHAPES = [
  { type: "rectangle", label: "Rectangle", width: 160, height: 80 },
  { type: "diamond", label: "Diamond", width: 160, height: 120 },
  { type: "circle", label: "Circle", width: 120, height: 120 },
  { type: "pill", label: "Pill", width: 160, height: 80 },
  { type: "cylinder", label: "Cylinder", width: 140, height: 100 },
  { type: "hexagon", label: "Hexagon", width: 150, height: 130 },
] as const

export type NodeShape = (typeof NODE_SHAPES)[number]["type"]

/* -------------------------------------------------------------------------- */
/*  Canvas Node & Edge Types                                                  */
/* -------------------------------------------------------------------------- */

export interface CanvasNodeData {
  label: string
  color: string
  textColor: string
  shape: NodeShape
  width: number
  height: number
}

export interface CanvasEdgeData {
  label: string
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
