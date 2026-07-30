"use client"

import { useCallback } from "react"
import type { Node } from "@xyflow/react"

import {
  NODE_SHAPES,
  DEFAULT_NODE_COLOR,
  SHAPE_DRAG_DATA_FORMAT,
} from "@/types/canvas"
import type { NodeShape, ShapeDragPayload } from "@/types/canvas"

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

let nodeCounter = 0

function generateNodeId(shape: string): string {
  nodeCounter += 1
  return `${shape}-${Date.now()}-${nodeCounter}`
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

export function useShapeDrop() {
  /* ---- build drag payload ------------------------------------------------ */

  const onDragStart = useCallback(
    (event: React.DragEvent<HTMLButtonElement>, shape: NodeShape) => {
      const def = NODE_SHAPES.find((s) => s.type === shape) ?? NODE_SHAPES[0]

      // Measure where within the element the user grabbed
      const rect = event.currentTarget.getBoundingClientRect()
      const offsetX = event.clientX - rect.left
      const offsetY = event.clientY - rect.top

      const payload: ShapeDragPayload = {
        shape,
        width: def.width,
        height: def.height,
        offsetX,
        offsetY,
      }

      event.dataTransfer.setData(
        SHAPE_DRAG_DATA_FORMAT,
        JSON.stringify(payload),
      )
      event.dataTransfer.effectAllowed = "move"
    },
    [],
  )

  /* ---- create node on drop ----------------------------------------------- */

  const createNodeFromDrop = useCallback(
    (
      event: React.DragEvent,
      screenToFlowPosition: (coords: { x: number; y: number }) => {
        x: number
        y: number
      },
    ): Node | null => {
      const raw = event.dataTransfer.getData(SHAPE_DRAG_DATA_FORMAT)
      if (!raw) return null

      const payload: ShapeDragPayload = JSON.parse(raw)

      // Convert screen position to flow coordinates accounting for drag offset
      const flowPos = screenToFlowPosition({
        x: event.clientX - payload.offsetX,
        y: event.clientY - payload.offsetY,
      })

      // Center the node at the drop point
      const position = {
        x: flowPos.x - payload.width / 2,
        y: flowPos.y - payload.height / 2,
      }

      return {
        id: generateNodeId(payload.shape),
        type: "canvasNode",
        position,
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR.fill,
          textColor: DEFAULT_NODE_COLOR.text,
          shape: payload.shape,
          width: payload.width,
          height: payload.height,
        },
      }
    },
    [],
  )

  return { onDragStart, createNodeFromDrop }
}
