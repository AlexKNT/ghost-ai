"use client"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Dialog Pattern — reusable layout primitives styled with project tokens    */
/* -------------------------------------------------------------------------- */

/**
 * Dialog header with title and optional description.
 * Uses project tokens: text-copy-primary for title, text-copy-muted for description.
 */
function DialogPatternHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-pattern-header"
      className={cn("flex flex-col gap-1.5 px-6 pt-6", className)}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Dialog title — primary heading for the dialog.
 */
function DialogPatternTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="dialog-pattern-title"
      className={cn(
        "font-heading text-base leading-none font-medium text-copy-primary",
        className
      )}
      {...props}
    />
  )
}

/**
 * Dialog description — supporting text below the title.
 */
function DialogPatternDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-pattern-description"
      className={cn("text-sm text-copy-muted", className)}
      {...props}
    />
  )
}

/**
 * Dialog body — main content area between header and footer.
 */
function DialogPatternBody({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-pattern-body"
      className={cn("px-6 py-4 text-sm text-copy-secondary", className)}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Dialog footer — action bar at the bottom of the dialog.
 * Renders a separator line above the action buttons.
 */
function DialogPatternFooter({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-pattern-footer"
      className={cn(
        "flex items-center justify-end gap-2 border-t border-border px-6 py-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export {
  DialogPatternHeader,
  DialogPatternTitle,
  DialogPatternDescription,
  DialogPatternBody,
  DialogPatternFooter,
}
