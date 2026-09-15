"use client"

import { memo, useCallback } from "react"

import { cn } from "@/lib/utils"
import { NODE_COLORS } from "@/types/canvas"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface NodeColorToolbarProps {
  nodeId: string
  currentColor: string
  onColorChange: (fill: string, text: string) => void
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

function NodeColorToolbarComponent({
  currentColor,
  onColorChange,
}: NodeColorToolbarProps) {
  const handleClick = useCallback(
    (fill: string, text: string) => (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      onColorChange(fill, text)
    },
    [onColorChange],
  )

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 z-10",
        "flex items-center gap-1 rounded-xl px-2 py-1.5",
        "bg-elevated/95 backdrop-blur-sm border border-white/10 shadow-lg",
      )}
      style={{ bottom: "calc(100% + 8px)" }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {NODE_COLORS.map(({ fill, text }) => {
        const isActive = fill === currentColor

        return (
          <button
            key={fill}
            type="button"
            onClick={handleClick(fill, text)}
            className={cn(
              "size-5 rounded-full border transition-all",
              "hover:scale-110 focus:outline-none",
            )}
            style={{
              backgroundColor: fill,
              borderColor: isActive
                ? text
                : "rgba(255,255,255,0.15)",
              borderWidth: isActive ? 2 : 1,
              boxShadow: isActive
                ? `0 0 6px 1px ${text}40`
                : undefined,
            }}
            aria-label={`Color ${fill}`}
            title={fill}
          />
        )
      })}
    </div>
  )
}

export const NodeColorToolbar = memo(NodeColorToolbarComponent)
