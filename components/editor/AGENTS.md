# Editor and canvas

## Overview

The collaborative workspace UI: the canvas itself with its nodes, edges, controls, and toolbars, plus the sidebars, dialogs, and spec surfaces around it. All of it is client code driven by Liveblocks presence and storage.

## Key files

| File | Owns |
| --- | --- |
| `components/editor/workspace-shell.tsx` | `LiveblocksProvider` and `RoomProvider`, plus panel state |
| `components/editor/canvas-wrapper.tsx` | `ReactFlowProvider`, the error boundary, and autosave wiring |
| `components/editor/canvas-node.tsx` | The six node shapes and their handles |
| `components/editor/canvas-edge.tsx` | Edges and their labels |
| `components/editor/shape-panel.tsx` | The draggable shape palette |
| `components/editor/ai-sidebar.tsx` | Chat with the agent, reading the chat and status feeds |
| `components/editor/specs-tab.tsx` | Listing, previewing, and downloading a project's specs |
| `components/editor/dialog-pattern.tsx` | The shared menu and dialog surface pattern |
| `components/editor/starter-templates.ts` | The static template snapshots |

## Conventions

- `"use client"` is required here. Pages fetch, the shell owns providers, and leaf components stay presentational.
- There is one Liveblocks client per room. Providers live in `workspace-shell.tsx`; a second provider anywhere duplicates presence for every collaborator.
- Style with the tokens from `app/globals.css` through their Tailwind names. No raw palette classes and no hex values.
- Canvas content is the Liveblocks storage document owned by `useLiveblocksFlow`. React Flow renders it; it never becomes a parallel local state.
- Node and edge data come from `types/canvas.ts`, and templates use that same schema.

## Gotchas

- Base UI `Tabs.Panel` unmounts an inactive panel. Any tab that owns a subscription needs `keepMounted`, or live updates stop while it is hidden.
- Read Liveblocks user meta with a cast. The base type exposes `info` as `unknown`, so narrow it as `UserMeta | undefined`.
- A custom cursor receives only `{ userId, connectionId }`. The library owns position and transform, so a custom cursor draws the arrow and the name badge only. Keep the `components` object identity stable with a module level constant.
- A dialog that holds a long document needs a definite height, for example `h-[80vh]`. The Base UI scroll viewport is `height: 100%`, and a percentage does not resolve against a flex derived height, so `max-h` leaves the content unscrollable.
- `react-markdown` passes a `node` prop to every custom component. Spreading it onto a DOM element renders `node="[object Object]"` and lets its `className` overwrite yours, so route components through one helper that drops `node` and merges `className`. Tables need `remark-gfm`.
- `useRealtimeRun` throws during render when no access token is reachable. Pass `enabled: false` until the token exists, and pass the run id as `id` so cached state does not leak between runs.
- A modal that should not keep stale content is keyed by its record id and unmounted on close.
- Do not write a synchronous `setState` in an effect body. The React Compiler lint rule flags it, including through a called function.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
