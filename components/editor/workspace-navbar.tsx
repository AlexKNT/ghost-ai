"use client"

import {
  PanelLeftOpen,
  PanelLeftClose,
  Share2,
  MessageSquare,
} from "lucide-react"
import { UserButton } from "@clerk/nextjs"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface WorkspaceNavbarProps {
  projectName: string
  sidebarOpen: boolean
  aiPanelOpen: boolean
  onToggleSidebar: () => void
  onToggleAiPanel: () => void
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function WorkspaceNavbar({
  projectName,
  sidebarOpen,
  aiPanelOpen,
  onToggleSidebar,
  onToggleAiPanel,
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
        {/* Share button — placeholder */}
        <button
          type="button"
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
