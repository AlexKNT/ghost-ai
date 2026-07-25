"use client"

import { memo } from "react"
import {
  Square,
  Diamond,
  Circle,
  Pilcrow,
  Database,
  Hexagon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { NODE_SHAPES } from "@/types/canvas"
import type { NodeShape } from "@/types/canvas"

/* -------------------------------------------------------------------------- */
/*  Shape icon map                                                            */
/* -------------------------------------------------------------------------- */

const shapeIcons: Record<NodeShape, React.ComponentType<{ className?: string }>> = {
  rectangle: Square,
  diamond: Diamond,
  circle: Circle,
  pill: Pilcrow,
  cylinder: Database,
  hexagon: Hexagon,
}

const shapeLabels: Record<NodeShape, string> = {
  rectangle: "Rectangle",
  diamond: "Diamond",
  circle: "Circle",
  pill: "Pill",
  cylinder: "Cylinder",
  hexagon: "Hexagon",
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

interface ShapePanelProps {
  onDragStart: (event: React.DragEvent<HTMLButtonElement>, shape: NodeShape) => void
}

function ShapePanelComponent({ onDragStart }: ShapePanelProps) {
  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-30 -translate-x-1/2",
        "flex items-center gap-1 rounded-2xl px-3 py-2",
        "bg-[#18181c]/90 backdrop-blur-sm border border-white/10 shadow-lg",
      )}
    >
      {NODE_SHAPES.map((s) => {
        const Icon = shapeIcons[s.type]
        return (
          <button
            key={s.type}
            type="button"
            draggable
            onDragStart={(e) => onDragStart(e, s.type)}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-xl",
              "text-white/50 transition-colors",
              "hover:bg-white/10 hover:text-white/80",
            )}
            aria-label={`Drag ${shapeLabels[s.type]} shape`}
            title={shapeLabels[s.type]}
          >
            <Icon className="size-4" />
          </button>
        )
      })}
    </div>
  )
}

export const ShapePanel = memo(ShapePanelComponent)
