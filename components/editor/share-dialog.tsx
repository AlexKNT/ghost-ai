"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Link, Trash2, Check, Loader2, UserPlus } from "lucide-react"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import {
  DialogPatternHeader,
  DialogPatternTitle,
  DialogPatternDescription,
  DialogPatternBody,
  DialogPatternFooter,
} from "@/components/editor/dialog-pattern"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Collaborator {
  id: string
  email: string
  createdAt: string
  displayName: string
  avatarUrl: string | null
}

interface ShareDialogProps {
  open: boolean
  projectId: string
  isOwner: boolean
  onClose: () => void
}

/* -------------------------------------------------------------------------- */
/*  Avatar fallback                                                           */
/* -------------------------------------------------------------------------- */

function AvatarFallback({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || name[0]?.toUpperCase() || "?"

  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        "bg-subtle text-xs font-medium text-copy-muted",
      )}
    >
      {initials}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Collaborator row                                                          */
/* -------------------------------------------------------------------------- */

function CollaboratorRow({
  collaborator,
  isOwner,
  onRemove,
  removing,
}: {
  collaborator: Collaborator
  isOwner: boolean
  onRemove: (email: string) => void
  removing: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-subtle px-3 py-2.5">
      {/* Avatar */}
      {collaborator.avatarUrl ? (
        // Clerk-hosted avatars are already optimized at the CDN, so they stay a
        // plain img; the fallback below covers anyone without a picture.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={collaborator.avatarUrl}
          alt={collaborator.displayName}
          className="size-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <AvatarFallback name={collaborator.displayName} />
      )}

      {/* Name + email */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-copy-primary">
          {collaborator.displayName}
        </p>
        <p className="truncate text-xs text-copy-muted">{collaborator.email}</p>
      </div>

      {/* Remove button — owner only */}
      {isOwner && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(collaborator.email)}
          disabled={removing}
          className="shrink-0 text-copy-muted hover:text-state-error"
          aria-label={`Remove ${collaborator.displayName}`}
        >
          {removing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </Button>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Share Dialog                                                              */
/* -------------------------------------------------------------------------- */

export function ShareDialog({
  open,
  projectId,
  isOwner,
  onClose,
}: ShareDialogProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  /* Fetch collaborators when dialog opens */
  const fetchCollaborators = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`)
      if (!res.ok) throw new Error("Failed to load collaborators")
      const data = await res.json()
      setCollaborators(data.collaborators)
    } catch {
      setError("Could not load collaborators")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (!open) return

    // Reset the form, load the collaborator list, and focus the input after the
    // dialog mounts. Deferred to a timer callback so the effect body itself
    // never calls setState synchronously (react-hooks/set-state-in-effect).
    const id = setTimeout(() => {
      setEmail("")
      setError(null)
      void fetchCollaborators()
      inputRef.current?.focus()
    }, 100)

    return () => clearTimeout(id)
  }, [open, fetchCollaborators])

  /* Cleanup copy timeout */
  useEffect(() => {
    return () => clearTimeout(copyTimeoutRef.current)
  }, [])

  /* Invite */
  const handleInvite = async () => {
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes("@")) return

    setInviting(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to invite")
        return
      }

      setCollaborators((prev) => [...prev, data])
      setEmail("")
      inputRef.current?.focus()
    } catch {
      setError("Failed to invite collaborator")
    } finally {
      setInviting(false)
    }
  }

  /* Remove */
  const handleRemove = async (emailToRemove: string) => {
    setRemovingEmail(emailToRemove)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToRemove }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to remove")
        return
      }

      setCollaborators((prev) => prev.filter((c) => c.email !== emailToRemove))
    } catch {
      setError("Failed to remove collaborator")
    } finally {
      setRemovingEmail(null)
    }
  }

  /* Copy link */
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Could not copy link")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="sm:max-w-md !rounded-3xl border-border bg-elevated p-0 gap-0"
        showCloseButton={false}
      >
        <DialogPatternHeader>
          <DialogPatternTitle>Share Project</DialogPatternTitle>
          <DialogPatternDescription>
            {isOwner
              ? "Invite collaborators to this project by email."
              : "People with access to this project."}
          </DialogPatternDescription>
        </DialogPatternHeader>

        <DialogPatternBody className="flex flex-col gap-4">
          {/* Invite input — owner only */}
          {isOwner && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && email.trim() && !inviting) {
                      e.preventDefault()
                      handleInvite()
                    }
                  }}
                  placeholder="colleague@example.com"
                  disabled={inviting}
                  className="h-9 rounded-xl"
                />
              </div>
              <Button
                onClick={handleInvite}
                disabled={!email.trim() || !email.includes("@") || inviting}
                size="default"
                className="shrink-0"
              >
                {inviting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-4" />
                )}
                Invite
              </Button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="text-xs text-state-error">{error}</p>
          )}

          {/* Collaborator list */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-copy-muted uppercase tracking-wide">
              Collaborators
              {collaborators.length > 0 && (
                <span className="ml-1 text-copy-faint">
                  ({collaborators.length})
                </span>
              )}
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-5 animate-spin text-copy-muted" />
              </div>
            ) : collaborators.length === 0 ? (
              <p className="text-sm text-copy-faint py-2">
                No collaborators yet.
              </p>
            ) : (
              collaborators.map((c) => (
                <CollaboratorRow
                  key={c.id}
                  collaborator={c}
                  isOwner={isOwner}
                  onRemove={handleRemove}
                  removing={removingEmail === c.email}
                />
              ))
            )}
          </div>
        </DialogPatternBody>

        <DialogPatternFooter>
          <Button
            variant="outline"
            onClick={handleCopyLink}
            className="gap-1.5"
          >
            {copied ? (
              <>
                <Check className="size-4 text-state-success" />
                Copied!
              </>
            ) : (
              <>
                <Link className="size-4" />
                Copy link
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogPatternFooter>
      </DialogContent>
    </Dialog>
  )
}
