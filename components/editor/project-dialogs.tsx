"use client"

import { useEffect, useRef, type KeyboardEvent } from "react"
import { Plus, Trash2 } from "lucide-react"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  DialogPatternHeader,
  DialogPatternTitle,
  DialogPatternDescription,
  DialogPatternBody,
  DialogPatternFooter,
} from "@/components/editor/dialog-pattern"

import type { ProjectSummary } from "@/hooks/useProjectActions"

/* -------------------------------------------------------------------------- */
/*  Create Project Dialog                                                     */
/* -------------------------------------------------------------------------- */

interface CreateProjectDialogProps {
  open: boolean
  name: string
  slug: string
  loading: boolean
  onNameChange: (name: string) => void
  onSubmit: () => void
  onClose: () => void
}

function CreateProjectDialog({
  open,
  name,
  slug,
  loading,
  onNameChange,
  onSubmit,
  onClose,
}: CreateProjectDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      // Small delay so the dialog mounts before focusing
      const id = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(id)
    }
  }, [open])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && name.trim().length > 0 && !loading) {
      e.preventDefault()
      onSubmit()
    }
  }

  const canSubmit = name.trim().length > 0 && !loading

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="sm:max-w-md !rounded-3xl border-border bg-elevated p-0 gap-0"
        showCloseButton={false}
      >
        <DialogPatternHeader>
          <DialogPatternTitle>Create Project</DialogPatternTitle>
          <DialogPatternDescription>
            Give your new architecture workspace a name.
          </DialogPatternDescription>
        </DialogPatternHeader>

        <DialogPatternBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="create-project-name" className="text-xs font-medium text-copy-muted">
              Project name
            </label>
            <Input
              ref={inputRef}
              id="create-project-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="My Architecture"
              disabled={loading}
              className="h-9 rounded-xl"
            />
          </div>

          {/* Live slug preview */}
          <div className="flex items-center gap-2 rounded-xl bg-subtle px-3 py-2">
            <span className="shrink-0 text-xs text-copy-faint">Slug</span>
            <span className="text-sm text-copy-muted truncate">
              {slug || "—"}
            </span>
          </div>
        </DialogPatternBody>

        <DialogPatternFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            <Plus className="size-4" />
            Create
          </Button>
        </DialogPatternFooter>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*  Rename Project Dialog                                                     */
/* -------------------------------------------------------------------------- */

interface RenameProjectDialogProps {
  open: boolean
  project: ProjectSummary | null
  name: string
  slug: string
  loading: boolean
  onNameChange: (name: string) => void
  onSubmit: () => void
  onClose: () => void
}

function RenameProjectDialog({
  open,
  project,
  name,
  slug,
  loading,
  onNameChange,
  onSubmit,
  onClose,
}: RenameProjectDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
      return () => clearTimeout(id)
    }
  }, [open])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && name.trim().length > 0 && !loading) {
      e.preventDefault()
      onSubmit()
    }
  }

  const canSubmit = name.trim().length > 0 && !loading

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="sm:max-w-md !rounded-3xl border-border bg-elevated p-0 gap-0"
        showCloseButton={false}
      >
        <DialogPatternHeader>
          <DialogPatternTitle>Rename Project</DialogPatternTitle>
          <DialogPatternDescription>
            Current name: <span className="text-copy-secondary font-medium">{project?.name}</span>
          </DialogPatternDescription>
        </DialogPatternHeader>

        <DialogPatternBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rename-project-name" className="text-xs font-medium text-copy-muted">
              Project name
            </label>
            <Input
              ref={inputRef}
              id="rename-project-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Project name"
              disabled={loading}
              className="h-9 rounded-xl"
            />
          </div>

          {/* Live slug preview */}
          <div className="flex items-center gap-2 rounded-xl bg-subtle px-3 py-2">
            <span className="shrink-0 text-xs text-copy-faint">Slug</span>
            <span className="text-sm text-copy-muted truncate">
              {slug || "—"}
            </span>
          </div>
        </DialogPatternBody>

        <DialogPatternFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            Save
          </Button>
        </DialogPatternFooter>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*  Delete Project Dialog                                                     */
/* -------------------------------------------------------------------------- */

interface DeleteProjectDialogProps {
  open: boolean
  project: ProjectSummary | null
  loading: boolean
  onSubmit: () => void
  onClose: () => void
}

function DeleteProjectDialog({
  open,
  project,
  loading,
  onSubmit,
  onClose,
}: DeleteProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="sm:max-w-md !rounded-3xl border-border bg-elevated p-0 gap-0"
        showCloseButton={false}
      >
        <DialogPatternHeader>
          <DialogPatternTitle>Delete Project</DialogPatternTitle>
          <DialogPatternDescription>
            Are you sure you want to delete{" "}
            <span className="text-copy-secondary font-medium">{project?.name}</span>? This action
            cannot be undone.
          </DialogPatternDescription>
        </DialogPatternHeader>

        <DialogPatternFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onSubmit}
            disabled={loading}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </DialogPatternFooter>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*  Exports                                                                   */
/* -------------------------------------------------------------------------- */

export { CreateProjectDialog, RenameProjectDialog, DeleteProjectDialog }
