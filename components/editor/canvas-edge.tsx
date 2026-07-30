"use client"

import { memo, useState, useRef, useEffect, useCallback } from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  Position,
} from "@xyflow/react"

import { cn } from "@/lib/utils"
import type { CanvasEdgeData } from "@/types/canvas"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface CanvasEdgeProps {
  id: string
  source: string
  target: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
  selected?: boolean
  data?: CanvasEdgeData
  markerEnd?: string
  style?: React.CSSProperties
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

function CanvasEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
  markerEnd,
  style,
}: CanvasEdgeProps) {
  const { updateEdgeData } = useReactFlow()

  const label = data?.label ?? ""

  /* ---- path -------------------------------------------------------------- */

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  })

  /* ---- inline label editing ---------------------------------------------- */

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync edit value when label changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(label)
    }
  }, [label, isEditing])

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const startEditing = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      setIsEditing(true)
      setEditValue(label)
    },
    [label],
  )

  const commitEdit = useCallback(() => {
    setIsEditing(false)
    const trimmed = editValue.trim()
    if (trimmed !== label) {
      updateEdgeData(id, { label: trimmed } as Partial<CanvasEdgeData>)
    }
  }, [id, editValue, label, updateEdgeData])

  const cancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditValue(label)
  }, [label])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        commitEdit()
      }
      if (e.key === "Escape") {
        e.preventDefault()
        cancelEdit()
      }
    },
    [commitEdit, cancelEdit],
  )

  /* ---- styles ------------------------------------------------------------ */

  const isHoveredOrSelected = selected

  const edgeStrokeColor = isHoveredOrSelected
    ? "rgba(248,250,252,0.85)"
    : "rgba(248,250,252,0.35)"

  /* ---- render ------------------------------------------------------------ */

  return (
    <>
      {/* Invisible wide path for easier clicking */}
      <BaseEdge
        path={edgePath}
        style={{
          strokeWidth: 20,
          stroke: "transparent",
          fill: "none",
          cursor: "pointer",
        }}
      />

      {/* Visible edge */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: edgeStrokeColor,
          strokeWidth: 1.5,
          strokeLinecap: "round",
          transition: "stroke 0.15s",
        }}
      />

      {/* Label */}
      <EdgeLabelRenderer>
        <div
          className="absolute pointer-events-auto"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                "min-w-[60px] rounded-md border px-2 py-0.5",
                "bg-[#18181c] text-xs text-copy-primary outline-none",
                "border-white/20 focus:border-brand",
                "text-center",
              )}
              style={{ fontSize: 11 }}
              placeholder="Label"
            />
          ) : (
            <button
              type="button"
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight",
                "border transition-all select-none",
                "max-w-[120px] truncate",
                label
                  ? "bg-[#18181c] text-copy-secondary border-white/10 hover:border-white/25 hover:text-copy-primary"
                  : "bg-transparent text-white/20 border-transparent hover:border-white/10 hover:text-white/30",
              )}
              onDoubleClick={startEditing}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {label || "Edge label"}
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const CanvasEdge = memo(CanvasEdgeComponent)
