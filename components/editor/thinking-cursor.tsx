"use client"

import { shallow, useOther } from "@liveblocks/react"
import { Loader2 } from "lucide-react"
import type { CursorsCursorProps } from "@liveblocks/react-flow"

import { cn } from "@/lib/utils"
import type { UserMeta } from "@/liveblocks.config"

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

/** Used when a participant's user info carries no colour. */
const FALLBACK_COLOR = "#00c8d4"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface CursorAppearance {
  name: string
  color: string
  thinking: boolean
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The cursor drawn for every other participant by `<Cursors />`.
 *
 * `<Cursors />` owns the pointer tracking and the outer positioning element, so
 * this component only draws the pointer and its name badge. While a
 * participant's presence reports `thinking: true` — which is how the AI agent
 * and any future agent surface their work — a small spinner is added to the
 * badge.
 */
export function ThinkingCursor({ connectionId }: CursorsCursorProps) {
  const appearance = useOther(
    connectionId,
    (other): CursorAppearance => {
      const info = other.info as UserMeta | undefined
      return {
        name: info?.name ?? "Collaborator",
        color: info?.color ?? FALLBACK_COLOR,
        thinking: other.presence.thinking === true,
      }
    },
    shallow,
  )

  if (!appearance) return null

  const { name, color, thinking } = appearance

  return (
    <div className="pointer-events-none relative select-none">
      {/* Pointer */}
      <svg
        width="22"
        height="26"
        viewBox="0 0 24 28"
        fill="none"
        aria-hidden="true"
        className="drop-shadow-sm"
      >
        <path
          d="M5.5 2.2v21.4l5.3-5.3 3.4 7.9 3.6-1.6-3.4-7.8 7.6-.2z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* Name badge */}
      <div
        className={cn(
          "absolute top-5 left-3.5 flex max-w-40 items-center gap-1.5",
          "rounded-full px-2 py-0.5 text-[11px] leading-4 font-medium text-white",
          "shadow-md ring-1 ring-black/20",
        )}
        style={{ backgroundColor: color }}
      >
        {thinking && (
          <Loader2
            className="size-3 shrink-0 animate-spin"
            aria-hidden="true"
          />
        )}
        <span className="truncate">{name}</span>
      </div>
    </div>
  )
}
