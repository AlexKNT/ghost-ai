"use client"

import { useMemo, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { UserButton } from "@clerk/nextjs"
import { useOthers } from "@liveblocks/react/suspense"

import { cn } from "@/lib/utils"
import type { UserMeta } from "@/liveblocks.config"

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const MAX_VISIBLE_AVATARS = 5

/* -------------------------------------------------------------------------- */
/*  Avatar sub-component                                                      */
/* -------------------------------------------------------------------------- */

function CollaboratorAvatar({
  name,
  src,
  index,
}: {
  name: string
  src?: string
  index: number
}) {
  const initials = useMemo(() => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((part) => part[0] ?? "")
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }, [name])

  const [imgFailed, setImgFailed] = useState(false)

  return (
    <div
      className={cn(
        "relative flex size-7 shrink-0 items-center justify-center rounded-full",
        "text-[10px] font-medium text-copy-primary",
        "ring-2 ring-base",
      )}
      style={{
        zIndex: MAX_VISIBLE_AVATARS - index,
        marginLeft: index > 0 ? "-8px" : undefined,
      }}
      title={name}
    >
      {src && !imgFailed ? (
        // Clerk already serves avatars from its own image CDN, and this slot is
        // 28px, so routing them through the Next image optimizer would only add
        // a proxy hop. The initials fallback below covers load failures.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="size-full rounded-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-subtle">
          {initials}
        </span>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Overflow chip                                                             */
/* -------------------------------------------------------------------------- */

function OverflowChip({ count }: { count: number }) {
  return (
    <div
      className={cn(
        "relative flex size-7 shrink-0 items-center justify-center rounded-full",
        "text-[10px] font-medium text-copy-muted",
        "bg-subtle ring-2 ring-base",
      )}
      style={{ marginLeft: "-8px" }}
    >
      +{count}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

export function PresenceAvatars() {
  const { user } = useUser()
  const others = useOthers()

  // Filter out the current user and deduplicate by user ID
  const collaborators = useMemo(() => {
    const seen = new Set<string>()
    return others.filter((other) => {
      const info = other.info as UserMeta | undefined
      if (!info?.id) return false
      if (info.id === user?.id) return false
      if (seen.has(info.id)) return false
      seen.add(info.id)
      return true
    })
  }, [others, user?.id])

  const visibleCollaborators = collaborators.slice(0, MAX_VISIBLE_AVATARS)
  const overflowCount = collaborators.length - MAX_VISIBLE_AVATARS

  return (
    <div
      className={cn(
        "absolute top-3 right-3 z-20 flex items-center gap-2",
        "rounded-2xl bg-elevated/90 px-2 py-1.5",
        "shadow-lg backdrop-blur-sm",
      )}
    >
      {/* Collaborator avatars */}
      {visibleCollaborators.map((other, i) => {
        const info = other.info as UserMeta | undefined
        return (
          <CollaboratorAvatar
            key={other.connectionId}
            name={info?.name ?? "?"}
            src={info?.avatar ?? undefined}
            index={i}
          />
        )
      })}

      {/* Overflow chip */}
      {overflowCount > 0 && <OverflowChip count={overflowCount} />}

      {/* Divider — only when collaborators exist */}
      {collaborators.length > 0 && (
        <div className="mx-1 h-5 w-px bg-border" />
      )}

      {/* Current user */}
      <div className="flex size-7 shrink-0 items-center justify-center">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "size-7",
            },
          }}
        />
      </div>
    </div>
  )
}