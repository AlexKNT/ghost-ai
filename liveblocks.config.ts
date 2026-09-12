import type { LiveMap, LiveObject } from "@liveblocks/client"

import type { CanvasEdgeData, CanvasNodeData } from "@/types/canvas"

/* -------------------------------------------------------------------------- */
/*  Presence                                                                  */
/* -------------------------------------------------------------------------- */

export type Presence = {
  cursor: { x: number; y: number } | null
  thinking: boolean
}

/* -------------------------------------------------------------------------- */
/*  UserMeta                                                                  */
/* -------------------------------------------------------------------------- */

export type UserMeta = {
  id: string
  name: string
  avatar: string
  color: string
}

/* -------------------------------------------------------------------------- */
/*  Storage (collaborative canvas state)                                      */
/* -------------------------------------------------------------------------- */

/**
 * The canvas is stored under the `flow` key by `useLiveblocksFlow` from
 * `@liveblocks/react-flow`: a LiveMap of nodes and a LiveMap of edges keyed by
 * id. `position` and other React Flow geometry are stored as plain values,
 * while `data` is a nested LiveObject.
 *
 * This is deliberately not declared on the global `Liveblocks` interface:
 * doing so would make `initialStorage` a required prop of `RoomProvider`, while
 * the flow hook already initializes the document on connect.
 */
export type FlowNode = {
  id: string
  type: string
  position: { x: number; y: number }
  data: LiveObject<CanvasNodeData>
}

export type FlowEdge = {
  id: string
  source: string
  target: string
  type: string
  data: LiveObject<CanvasEdgeData>
}

export type FlowDiagram = LiveObject<{
  nodes: LiveMap<string, LiveObject<FlowNode>>
  edges: LiveMap<string, LiveObject<FlowEdge>>
}>

export type Storage = {
  flow: FlowDiagram
}

/* -------------------------------------------------------------------------- */
/*  Global type augmentation (for hook inference)                             */
/* -------------------------------------------------------------------------- */

declare global {
  interface Liveblocks {
    Presence: Presence
    UserMeta: UserMeta
  }
}
