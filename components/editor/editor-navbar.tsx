"use client"

import { PanelLeftOpen, PanelLeftClose } from "lucide-react"

import { cn } from "@/lib/utils"

interface EditorNavbarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function EditorNavbar({ sidebarOpen, onToggleSidebar }: EditorNavbarProps) {
  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-40 flex h-14 shrink-0 items-center",
        "bg-base border-b border-border"
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
            "hover:bg-subtle hover:text-copy-primary"
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

      {/* Center section — reserved for future breadcrumbs / project title */}
      <div className="flex flex-1 items-center justify-center" />

      {/* Right section — reserved for future actions */}
      <div className="flex items-center px-3" />
    </nav>
  )
}
