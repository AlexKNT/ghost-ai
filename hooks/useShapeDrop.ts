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
/*  Drag preview — draws shape on offscreen canvas for setDragImage           */
/* -------------------------------------------------------------------------- */

const PREVIEW_SCALE = 0.45

function createDragPreviewCanvas(
  shape: NodeShape,
  width: number,
  height: number,
): HTMLCanvasElement {
  const pw = Math.round(width * PREVIEW_SCALE)
  const ph = Math.round(height * PREVIEW_SCALE)
  const pad = 2

  const canvas = document.createElement("canvas")
  canvas.width = pw + pad * 2
  canvas.height = ph + pad * 2

  const ctx = canvas.getContext("2d")
  if (!ctx) return canvas

  const x = pad
  const y = pad
  const w = pw
  const h = ph

  ctx.fillStyle = DEFAULT_NODE_COLOR.fill
  ctx.strokeStyle = "rgba(255,255,255,0.45)"
  ctx.lineWidth = 1.5

  switch (shape) {
    /* ---- rectangle ------------------------------------------------------- */
    case "rectangle": {
      const r = Math.min(w, h) * 0.12
      roundRect(ctx, x, y, w, h, r)
      ctx.fill()
      ctx.stroke()
      break
    }

    /* ---- pill ------------------------------------------------------------ */
    case "pill": {
      const r = h / 2
      roundRect(ctx, x, y, w, h, r)
      ctx.fill()
      ctx.stroke()
      break
    }

    /* ---- circle ---------------------------------------------------------- */
    case "circle": {
      const size = Math.min(w, h)
      const cx = x + w / 2
      const cy = y + h / 2
      ctx.beginPath()
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      break
    }

    /* ---- diamond --------------------------------------------------------- */
    case "diamond": {
      const hw = w / 2
      const hh = h / 2
      ctx.beginPath()
      ctx.moveTo(x + hw, y)
      ctx.lineTo(x + w, y + hh)
      ctx.lineTo(x + hw, y + h)
      ctx.lineTo(x, y + hh)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      break
    }

    /* ---- hexagon --------------------------------------------------------- */
    case "hexagon": {
      const qx = w * 0.2
      const qy = h * 0.2
      ctx.beginPath()
      ctx.moveTo(x + qx, y)
      ctx.lineTo(x + w - qx, y)
      ctx.lineTo(x + w, y + qy)
      ctx.lineTo(x + w, y + h - qy)
      ctx.lineTo(x + w - qx, y + h)
      ctx.lineTo(x + qx, y + h)
      ctx.lineTo(x, y + h - qy)
      ctx.lineTo(x, y + qy)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      break
    }

    /* ---- cylinder -------------------------------------------------------- */
    case "cylinder": {
      const ellipH = h * 0.2
      const hw = w / 2
      // body
      ctx.fillRect(x, y + ellipH, w, h - ellipH * 2)
      // bottom ellipse outline (not filled over body)
      ctx.beginPath()
      ctx.ellipse(x + hw, y + h - ellipH, hw, ellipH, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      // top ellipse
      ctx.beginPath()
      ctx.ellipse(x + hw, y + ellipH, hw, ellipH, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      // body side lines
      ctx.beginPath()
      ctx.moveTo(x, y + ellipH)
      ctx.lineTo(x, y + h - ellipH)
      ctx.moveTo(x + w, y + ellipH)
      ctx.lineTo(x + w, y + h - ellipH)
      ctx.stroke()
      break
    }
  }

  return canvas
}

/** Draw a rounded rectangle path (no fill/stroke). */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

export function useShapeDrop() {
  /* ---- build drag payload ------------------------------------------------ */

  const onDragStart = useCallback(
    (event: React.DragEvent<HTMLButtonElement>, shape: NodeShape) => {
      const def = NODE_SHAPES.find((s) => s.type === shape) ?? NODE_SHAPES[0]

      // Build and attach drag payload
      const payload: ShapeDragPayload = {
        shape,
        width: def.width,
        height: def.height,
      }

      event.dataTransfer.setData(
        SHAPE_DRAG_DATA_FORMAT,
        JSON.stringify(payload),
      )
      event.dataTransfer.effectAllowed = "move"

      // Ghost preview — shape outline following the cursor
      const preview = createDragPreviewCanvas(shape, def.width, def.height)
      event.dataTransfer.setDragImage(
        preview,
        preview.width / 2,
        preview.height / 2,
      )
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

      // Convert screen position to flow coordinates.
      // The ghost preview is centered on the cursor via setDragImage,
      // so the drop point already represents the node center.
      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

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
