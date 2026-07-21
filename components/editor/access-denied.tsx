"use client"

import { Lock } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

export function AccessDenied() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-base">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-subtle">
          <Lock className="size-8 text-copy-faint" />
        </div>
        <h1 className="text-xl font-semibold text-copy-primary">
          Access Denied
        </h1>
        <p className="text-sm text-copy-muted">
          You don&apos;t have access to this project. It may not exist or you
          may not be a collaborator.
        </p>
        <Link
          href="/editor"
          className={cn(
            "mt-2 inline-flex items-center gap-2 rounded-xl px-5 py-2.5",
            "bg-brand text-base font-medium text-white",
            "transition-all hover:brightness-110 active:scale-[0.98]",
          )}
        >
          Back to Editor
        </Link>
      </div>
    </div>
  )
}
