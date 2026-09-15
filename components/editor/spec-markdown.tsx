"use client"

import Markdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Spec Markdown                                                             */
/*                                                                            */
/*  Renders a generated specification with the project's own tokens instead of */
/*  a typography plugin, so the document follows the same palette, radius      */
/*  scale, and type sizes as the rest of the workspace.                       */
/* -------------------------------------------------------------------------- */

/**
 * react-markdown hands every component the hast `node` next to the HTML props.
 * Only the HTML props may reach the DOM, and an incoming `className` (for
 * example `language-json` on a fenced block) has to survive next to the styling
 * below, so both are handled here once instead of per element.
 */
function elementProps<P extends { node?: unknown; className?: string }>(
  base: string,
  props: P,
): Omit<P, "node"> {
  const { node: _node, className, ...rest } = props
  void _node

  return { ...rest, className: cn(base, className) } as Omit<P, "node">
}

const HEADING_BASE = "text-copy-primary"

const COMPONENTS: Components = {
  h1: (props) => (
    <h1
      {...elementProps(`mt-1 mb-3 text-lg font-medium ${HEADING_BASE}`, props)}
    />
  ),
  h2: (props) => (
    <h2
      {...elementProps(
        `mt-5 mb-2 text-sm font-semibold ${HEADING_BASE}`,
        props,
      )}
    />
  ),
  h3: (props) => (
    <h3
      {...elementProps(`mt-4 mb-1.5 text-sm font-medium ${HEADING_BASE}`, props)}
    />
  ),
  h4: (props) => (
    <h4
      {...elementProps(`mt-3 mb-1.5 text-xs font-medium ${HEADING_BASE}`, props)}
    />
  ),
  p: (props) => (
    <p {...elementProps("mb-3 leading-relaxed last:mb-0", props)} />
  ),
  ul: (props) => (
    <ul {...elementProps("mb-3 list-disc space-y-1 pl-5", props)} />
  ),
  ol: (props) => (
    <ol {...elementProps("mb-3 list-decimal space-y-1 pl-5", props)} />
  ),
  li: (props) => <li {...elementProps("leading-relaxed", props)} />,
  // Links leave the workspace, so they open in a new tab.
  a: (props) => (
    <a
      {...elementProps(
        "text-brand underline underline-offset-3 hover:text-brand/80",
        props,
      )}
      target="_blank"
      rel="noreferrer"
    />
  ),
  blockquote: (props) => (
    <blockquote
      {...elementProps(
        "mb-3 border-l-2 border-surface-border pl-3 text-copy-muted",
        props,
      )}
    />
  ),
  hr: () => <hr className="my-4 border-surface-border" />,
  strong: (props) => (
    <strong {...elementProps("font-semibold text-copy-primary", props)} />
  ),
  // Inline code keeps its own surface; the same element inside a fenced block
  // inherits the block's styling instead.
  code: (props) => (
    <code
      {...elementProps(
        "rounded bg-subtle px-1 py-0.5 font-mono text-[0.8em] text-ai-text",
        props,
      )}
    />
  ),
  pre: (props) => (
    <pre
      {...elementProps(
        "mb-3 overflow-x-auto rounded-xl border border-surface-border bg-surface p-3 font-mono text-xs text-copy-secondary [&_code]:rounded-none [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit",
        props,
      )}
    />
  ),
  table: (props) => (
    <div className="mb-3 overflow-x-auto">
      <table
        {...elementProps("w-full border-collapse text-left text-xs", props)}
      />
    </div>
  ),
  th: (props) => (
    <th
      {...elementProps(
        "border border-surface-border bg-surface px-2 py-1.5 font-medium text-copy-primary",
        props,
      )}
    />
  ),
  td: (props) => (
    <td
      {...elementProps(
        "border border-surface-border px-2 py-1.5 align-top",
        props,
      )}
    />
  ),
}

export function SpecMarkdown({ content }: { content: string }) {
  return (
    <div className="text-sm text-copy-secondary">
      <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {content}
      </Markdown>
    </div>
  )
}
