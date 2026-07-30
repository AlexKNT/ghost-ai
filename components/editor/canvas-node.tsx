"use client"

import { memo, useState, useRef, useEffect, useCallback } from "react"
import { Handle, Position, NodeResizer, useReactFlow, type NodeProps } from "@xyflow/react"

import { cn } from "@/lib/utils"
import type { CanvasNodeData } from "@/types/canvas"

/* -------------------------------------------------------------------------- */
/*  Shape Renderers                                                           */
/* -------------------------------------------------------------------------- */

function RectangleShape({
  width,
  height,
  color,
  selected,
}: {
  width: number
  height: number
  color: string
  selected: boolean
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-lg border transition-colors",
        selected ? "border-white/40" : "border-white/10",
      )}
      style={{ backgroundColor: color }}
    />
  )
}

function PillShape({
  width,
  height,
  color,
  selected,
}: {
  width: number
  height: number
  color: string
  selected: boolean
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full border transition-colors",
        selected ? "border-white/40" : "border-white/10",
      )}
      style={{ backgroundColor: color }}
    />
  )
}

function CircleShape({
  width,
  height,
  color,
  selected,
}: {
  width: number
  height: number
  color: string
  selected: boolean
}) {
  const size = Math.min(width, height)
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div
        className={cn(
          "rounded-full border transition-colors",
          selected ? "border-white/40" : "border-white/10",
        )}
        style={{
          width: size,
          height: size,
          backgroundColor: color,
        }}
      />
    </div>
  )
}

function DiamondShape({
  width,
  height,
  color,
  selected,
}: {
  width: number
  height: number
  color: string
  selected: boolean
}) {
  const hw = width / 2
  const hh = height / 2
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
    >
      <polygon
        points={`${hw},0 ${width},${hh} ${hw},${height} 0,${hh}`}
        fill={color}
        stroke={selected ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}
        strokeWidth={1.5}
      />
    </svg>
  )
}

function HexagonShape({
  width,
  height,
  color,
  selected,
}: {
  width: number
  height: number
  color: string
  selected: boolean
}) {
  const hw = width / 2
  const hh = height / 2
  const qx = width * 0.2
  const qy = height * 0.2
  const points = [
    `${qx},0`,
    `${width - qx},0`,
    `${width},${qy}`,
    `${width},${height - qy}`,
    `${width - qx},${height}`,
    `${qx},${height}`,
    `0,${height - qy}`,
    `0,${qy}`,
  ].join(" ")
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
    >
      <polygon
        points={points}
        fill={color}
        stroke={selected ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}
        strokeWidth={1.5}
      />
    </svg>
  )
}

function CylinderShape({
  width,
  height,
  color,
  selected,
}: {
  width: number
  height: number
  color: string
  selected: boolean
}) {
  const hw = width / 2
  const ellipH = height * 0.2
  const bodyH = height - ellipH * 2
  const strokeColor = selected
    ? "rgba(255,255,255,0.4)"
    : "rgba(255,255,255,0.1)"
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
    >
      {/* Body */}
      <rect
        x={0}
        y={ellipH}
        width={width}
        height={bodyH}
        fill={color}
        stroke="none"
      />
      {/* Bottom ellipse */}
      <ellipse
        cx={hw}
        cy={height - ellipH}
        rx={hw}
        ry={ellipH}
        fill={color}
        stroke={strokeColor}
        strokeWidth={1.5}
      />
      {/* Top ellipse */}
      <ellipse
        cx={hw}
        cy={ellipH}
        rx={hw}
        ry={ellipH}
        fill={color}
        stroke={strokeColor}
        strokeWidth={1.5}
      />
      {/* Body side lines */}
      <line
        x1={0}
        y1={ellipH}
        x2={0}
        y2={height - ellipH}
        stroke={strokeColor}
        strokeWidth={1.5}
      />
      <line
        x1={width}
        y1={ellipH}
        x2={width}
        y2={height - ellipH}
        stroke={strokeColor}
        strokeWidth={1.5}
      />
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/*  Handle wrapper                                                            */
/* -------------------------------------------------------------------------- */

const handleStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  background: "#fff",
  border: "2px solid #1a1a2e",
  opacity: 0,
  transition: "opacity 0.15s",
}

const MIN_WIDTH = 80
const MIN_HEIGHT = 60

/* -------------------------------------------------------------------------- */
/*  Node Component                                                            */
/* -------------------------------------------------------------------------- */

function CanvasNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as CanvasNodeData
  const { label, color, textColor, shape, width, height } = nodeData

  const { updateNodeData } = useReactFlow()

  /* ---- inline label editing ---------------------------------------------- */

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(label)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Sync edit value when label changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(label)
    }
  }, [label, isEditing])

  // Auto-focus and select-all when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsEditing(true)
    setEditValue(label)
  }, [label])

  const commitEdit = useCallback(() => {
    setIsEditing(false)
    const trimmed = editValue.trim()
    if (trimmed !== label) {
      updateNodeData(id, { label: trimmed } as Partial<CanvasNodeData>)
    }
  }, [id, editValue, label, updateNodeData])

  const cancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditValue(label)
  }, [label])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault()
        cancelEdit()
      }
      // Shift+Enter to commit, plain Enter for newline (textarea default)
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault()
        commitEdit()
      }
    },
    [cancelEdit, commitEdit],
  )

  /* ---- shape renderer ---------------------------------------------------- */

  const shapeEl = (() => {
    switch (shape) {
      case "rectangle":
        return (
          <RectangleShape
            width={width}
            height={height}
            color={color}
            selected={!!selected}
          />
        )
      case "pill":
        return (
          <PillShape
            width={width}
            height={height}
            color={color}
            selected={!!selected}
          />
        )
      case "circle":
        return (
          <CircleShape
            width={width}
            height={height}
            color={color}
            selected={!!selected}
          />
        )
      case "diamond":
        return (
          <DiamondShape
            width={width}
            height={height}
            color={color}
            selected={!!selected}
          />
        )
      case "hexagon":
        return (
          <HexagonShape
            width={width}
            height={height}
            color={color}
            selected={!!selected}
          />
        )
      case "cylinder":
        return (
          <CylinderShape
            width={width}
            height={height}
            color={color}
            selected={!!selected}
          />
        )
      default:
        return (
          <RectangleShape
            width={width}
            height={height}
            color={color}
            selected={!!selected}
          />
        )
    }
  })()

  /* ---- render ------------------------------------------------------------ */

  return (
    <div
      className="group relative"
      style={{ width, height }}
    >
      {/* Resize handles — visible when selected */}
      {selected && (
        <NodeResizer
          minWidth={MIN_WIDTH}
          minHeight={MIN_HEIGHT}
          handleStyle={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#fff",
            border: "2px solid #1a1a2e",
          }}
          lineStyle={{ borderColor: "rgba(255,255,255,0.2)" }}
        />
      )}

      {/* Connection handles — all four sides */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!opacity-0 group-hover:!opacity-100"
        style={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!opacity-0 group-hover:!opacity-100"
        style={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!opacity-0 group-hover:!opacity-100"
        style={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!opacity-0 group-hover:!opacity-100"
        style={handleStyle}
      />

      {/* Target handles (same positions, for incoming connections) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="!opacity-0 group-hover:!opacity-100"
        style={handleStyle}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className="!opacity-0 group-hover:!opacity-100"
        style={handleStyle}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="!opacity-0 group-hover:!opacity-100"
        style={handleStyle}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="!opacity-0 group-hover:!opacity-100"
        style={handleStyle}
      />

      {/* Shape body */}
      {shapeEl}

      {/* Label / inline editor */}
      {isEditing ? (
        <textarea
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "absolute inset-0 resize-none bg-transparent text-center",
            "text-xs font-medium outline-none",
            "flex items-center justify-center",
            "placeholder:text-white/25",
          )}
          style={{
            color: textColor,
            padding: "8px 12px",
            lineHeight: 1.4,
          }}
          placeholder="Label"
          rows={1}
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center px-2",
            "cursor-text select-none",
          )}
          style={{ color: textColor }}
          onDoubleClick={startEditing}
        >
          <span className="truncate text-xs font-medium">
            {label || (
              <span className="text-white/25">Label</span>
            )}
          </span>
        </div>
      )}
    </div>
  )
}

export const CanvasNode = memo(CanvasNodeComponent)
