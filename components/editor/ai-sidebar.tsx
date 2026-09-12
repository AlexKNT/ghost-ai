"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { useSelf } from "@liveblocks/react"
import {
  AlertCircle,
  Bot,
  Download,
  FileText,
  Loader2,
  Send,
  Sparkles,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAiChatFeed } from "@/hooks/useAiChatFeed"
import { useAiStatusFeed } from "@/hooks/useAiStatusFeed"
import type { ChatMessage, DesignRunStatus } from "@/types/tasks"
import type { UserMeta } from "@/liveblocks.config"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface AISidebarProps {
  isOpen: boolean
  onClose: () => void
}

/** Shown in place of the display name on the reader's own messages. */
const SELF_LABEL = "You"

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
] as const

const TEXTAREA_MIN_HEIGHT = 72
const TEXTAREA_MAX_HEIGHT = 160

/** Fallback label when a status message carries no text of its own. */
const STATUS_LABELS: Record<DesignRunStatus, string> = {
  queued: "Queued…",
  thinking: "Thinking…",
  applying: "Applying changes…",
  complete: "Generation complete",
  error: "Generation failed",
}

const DEMO_SPEC = {
  title: "System Architecture Spec",
  filename: "system-architecture.md",
  snippet:
    "Overview of services, data flow, storage, and deployment topology generated from the current canvas.",
} as const

// Active/inactive accent treatment shared by both tab triggers.
const TAB_TRIGGER_CLASS =
  "text-copy-muted data-active:bg-accent data-active:text-ai-text"

/* -------------------------------------------------------------------------- */
/*  Chat                                                                      */
/* -------------------------------------------------------------------------- */

function ChatBubble({
  message,
  isOwn,
}: {
  message: ChatMessage
  isOwn: boolean
}) {
  const isAssistant = message.role === "assistant"
  const sentAt = new Date(message.timestamp)

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isOwn ? "items-end" : "items-start",
      )}
    >
      <div className="flex items-center gap-2 px-1 text-[11px] text-copy-faint">
        <span className="max-w-40 truncate font-medium text-copy-muted">
          {isOwn ? SELF_LABEL : message.sender}
        </span>
        <time dateTime={sentAt.toISOString()}>
          {sentAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap",
          isAssistant
            ? "border border-ai/40 bg-ai/10 text-ai-text"
            : isOwn
              ? "border-2 border-brand/50 bg-accent-dim text-copy-primary"
              : "border border-surface-border bg-elevated text-copy-primary",
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

function AiEmptyState({
  onSelectPrompt,
}: {
  onSelectPrompt: (prompt: string) => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-ai/15">
        <Bot className="size-6 text-ai-text" />
      </div>
      <p className="max-w-60 text-sm text-copy-muted">
        Describe the system you want to design and Ghost AI will draft the
        architecture on your canvas.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelectPrompt(prompt)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              "bg-subtle text-ai-text hover:bg-elevated",
            )}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

function AiArchitectTab() {
  const [input, setInput] = useState("")

  // Shared AI activity, published to every participant through the status feed.
  const { message, isGenerating } = useAiStatusFeed()

  // Collaborative chat, published to every participant through the chat feed.
  const { messages, sendMessage, isSending, error } = useAiChatFeed()

  // Presence-backed identity, so every message carries a readable sender.
  // `info` is untyped on the base user meta, so it is narrowed here the same
  // way the presence avatars and cursors do it.
  const self = useSelf()
  const selfInfo = self?.info as UserMeta | undefined
  const selfName = selfInfo?.name ?? SELF_LABEL

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-resize the composer between the min and max heights.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const next = Math.min(
      Math.max(el.scrollHeight, TEXTAREA_MIN_HEIGHT),
      TEXTAREA_MAX_HEIGHT,
    )
    el.style.height = `${next}px`
  }, [input])

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  const handleSubmit = async (value: string) => {
    // Generation is shared state — everyone in the room is paused while it runs.
    if (isGenerating) return

    const content = value.trim()
    if (!content) return

    const sent = await sendMessage({
      sender: selfName,
      role: "user",
      content,
      timestamp: Date.now(),
    })

    // Keep the draft on failure so the user can retry without retyping.
    if (sent) setInput("")
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSubmit(input)
    }
  }

  const isBusy = isGenerating || isSending

  // Only the most recent status message is shown, and only if it says something.
  const statusText =
    message?.text?.trim() ||
    (message?.status ? STATUS_LABELS[message.status] : null)

  return (
    <>
      {/* Scrollable chat area */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <AiEmptyState onSelectPrompt={handleSubmit} />
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((chatMessage) => (
              <ChatBubble
                key={chatMessage.id}
                message={chatMessage}
                isOwn={chatMessage.sender === selfName}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-surface-border p-3">
        {statusText && (
          <div
            role="status"
            aria-live="polite"
            aria-busy={isGenerating}
            className={cn(
              "mb-2 flex items-start gap-2 rounded-xl border px-2.5 py-2 text-xs",
              isGenerating
                ? "border-ai/40 bg-ai/10 text-ai-text"
                : "border-surface-border bg-elevated text-copy-muted",
            )}
          >
            {isGenerating ? (
              <Loader2
                className="mt-px size-3.5 shrink-0 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Sparkles
                className="mt-px size-3.5 shrink-0"
                aria-hidden="true"
              />
            )}
            <span className="min-w-0 flex-1 break-words">{statusText}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className={cn(
              "mb-2 flex items-start gap-2 rounded-xl border px-2.5 py-2 text-xs",
              "border-error/40 bg-error/10 text-error",
            )}
          >
            <AlertCircle
              className="mt-px size-3.5 shrink-0"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 break-words">{error}</span>
          </div>
        )}

        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder="Describe your system design..."
            aria-label="Message Ghost AI"
            className={cn(
              "field-sizing-fixed max-h-[160px] min-h-[72px] flex-1 resize-none",
              "overflow-y-auto bg-surface text-sm text-copy-primary",
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void handleSubmit(input)}
            disabled={isBusy || !input.trim()}
            aria-label="Send message"
            className="shrink-0 bg-ai text-copy-primary hover:bg-ai/90"
          >
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-copy-faint">
          {isGenerating
            ? "Ghost AI is working — the composer is paused for everyone in this room."
            : "Press Enter to send, Shift + Enter for a new line."}
        </p>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Specs                                                                     */
/* -------------------------------------------------------------------------- */

function SpecsTab() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      <Button
        type="button"
        variant="ghost"
        className="w-full bg-ai text-copy-primary hover:bg-ai/90"
      >
        <Sparkles className="size-4" />
        Generate Spec
      </Button>

      {/* Demo spec card */}
      <div className="rounded-2xl border border-surface-border bg-elevated p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
            <FileText className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-copy-primary">
              {DEMO_SPEC.title}
            </h3>
            <p className="mt-1 text-xs text-copy-muted">
              {DEMO_SPEC.snippet}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-surface-border pt-3">
          <span className="truncate font-mono text-[11px] text-copy-faint">
            {DEMO_SPEC.filename}
          </span>
          <button
            type="button"
            disabled
            aria-label="Download spec"
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-1 text-xs transition-colors",
              "text-copy-faint disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            <Download className="size-3.5" />
            Download
          </button>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sidebar                                                                   */
/* -------------------------------------------------------------------------- */

export function AISidebar({ isOpen, onClose }: AISidebarProps) {
  return (
    <aside
      aria-label="AI workspace"
      inert={!isOpen}
      className={cn(
        "fixed top-14 right-0 bottom-0 z-30 flex w-80 flex-col",
        "border-l border-surface-border bg-base/95 backdrop-blur-md shadow-2xl",
        "transition-transform duration-300 ease-out",
        isOpen ? "translate-x-0" : "translate-x-[calc(100%+2px)]",
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-surface-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
            <Bot className="size-5" />
          </div>
          <div className="flex min-w-0 flex-col">
            <h2 className="truncate text-sm font-medium text-copy-primary">
              AI Workspace
            </h2>
            <p className="truncate text-xs text-copy-muted">
              Collaborate with Ghost AI
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI panel"
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-xl",
            "text-copy-muted transition-colors",
            "hover:bg-subtle hover:text-copy-primary",
          )}
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="architect"
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="shrink-0 px-4 pt-3">
          <TabsList className="w-full bg-surface">
            <TabsTrigger value="architect" className={TAB_TRIGGER_CLASS}>
              AI Architect
            </TabsTrigger>
            <TabsTrigger value="specs" className={TAB_TRIGGER_CLASS}>
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="architect"
          className="flex min-h-0 flex-1 flex-col"
        >
          <AiArchitectTab />
        </TabsContent>

        <TabsContent value="specs" className="flex min-h-0 flex-1 flex-col">
          <SpecsTab />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
