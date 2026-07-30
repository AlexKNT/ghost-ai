"use client"

import {
  PanelLeftOpen,
  PanelLeftClose,
  Share2,
  MessageSquare,
  Save,
  LayoutTemplate,
} from "lucide-react"
import { UserButton } from "@clerk/nextjs"

import { cn } from "@/lib/utils"
import type { SaveStatus } from "@/hooks/useCanvasAutosave"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface WorkspaceNavbarProps {
  projectName: string
  sidebarOpen: boolean
  aiPanelOpen: boolean
  saveStatus: SaveStatus
  onToggleSidebar: () => void
  onToggleAiPanel: () => void
  onOpenShare: () => void
  onOpenTemplates: () => void
  onSave: () => void
}

/* -------------------------------------------------------------------------- */
/*  Save button label                                                         */
/* -------------------------------------------------------------------------- */

const saveLabel: Record<SaveStatus, string> = {
  idle: "Save",
  saving: "Saving...",
  saved: "Saved",
  error: "Error",
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function WorkspaceNavbar({
  projectName,
  sidebarOpen,
  aiPanelOpen,
  saveStatus,
  onToggleSidebar,
  onToggleAiPanel,
  onOpenShare,
  onOpenTemplates,
  onSave,
}: WorkspaceNavbarProps) {
  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-40 flex h-14 shrink-0 items-center",
        "bg-base border-b border-border",
      )}
    >
      {/* Left section — sidebar toggle */}
      <div className="flex items-center px-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-xl",
            "text-copy-secondary transition-colors",
            "hover:bg-subtle hover:text-copy-primary",
          )}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="size-5" />
          ) : (
            <PanelLeftOpen className="size-5" />
          )}
        </button>
      </div>

      {/* Center — project name */}
      <div className="flex flex-1 items-center justify-center">
        <h1 className="truncate text-sm font-medium text-copy-primary">
          {projectName}
        </h1>
      </div>

      {/* Right section — actions + user */}
      <div className="flex items-center gap-1 px-3">
        {/* Save button */}
        <button
          type="button"
          onClick={onSave}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
            saveStatus === "error"
              ? "bg-error/10 text-error"
              : saveStatus === "saved"
                ? "bg-success/10 text-success"
                : "text-copy-muted hover:bg-subtle hover:text-copy-primary",
          )}
          aria-label="Save canvas"
        >
          <Save className="size-3.5" />
          {saveLabel[saveStatus]}
        </button>

        {/* Templates button */}
        <button
          type="button"
          onClick={onOpenTemplates}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-xl",
            "text-copy-muted transition-colors",
            "hover:bg-subtle hover:text-copy-primary",
          )}
          aria-label="Starter templates"
        >
          <LayoutTemplate className="size-4" />
        </button>

        {/* Share button */}
        <button
          type="button"
          onClick={onOpenShare}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-xl",
            "text-copy-muted transition-colors",
            "hover:bg-subtle hover:text-copy-primary",
          )}
          aria-label="Share project"
        >
          <Share2 className="size-4" />
        </button>

        {/* AI sidebar toggle */}
        <button
          type="button"
          onClick={onToggleAiPanel}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-xl",
            "transition-colors",
            aiPanelOpen
              ? "bg-subtle text-copy-primary"
              : "text-copy-muted hover:bg-subtle hover:text-copy-primary",
          )}
          aria-label={aiPanelOpen ? "Close AI panel" : "Open AI panel"}
        >
          <MessageSquare className="size-4" />
        </button>

        <div className="ml-1">
          <UserButton />
        </div>
      </div>
    </nav>
  )
}
