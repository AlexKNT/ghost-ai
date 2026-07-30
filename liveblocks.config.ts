import type { LiveList, LiveObject } from "@liveblocks/client"

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
/*  Global type augmentation (for hook inference)                             */
/* -------------------------------------------------------------------------- */

declare global {
  interface Liveblocks {
    Presence: Presence
    UserMeta: UserMeta
  }
}

/* -------------------------------------------------------------------------- */
/*  Storage (collaborative canvas state)                                      */
/* -------------------------------------------------------------------------- */

export type CanvasNodeData = {
  label: string
  color: string
  textColor: string
  shape: string
  width: number
  height: number
}

export type CanvasEdgeData = {
  label: string
}

export type Storage = {
  nodes: LiveList<LiveObject<CanvasNode>>
  edges: LiveList<LiveObject<CanvasEdge>>
}

/* These are the shape of objects inside the LiveLists */
export type CanvasNode = {
  id: string
  type: string
  position: { x: number; y: number }
  data: CanvasNodeData
}

export type CanvasEdge = {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  data: CanvasEdgeData
}
