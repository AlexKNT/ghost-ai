# Memory — Workspace Implementation (Liveblocks Canvas Foundation)

Last updated: 2026-07-25

## What was built

**Dependencies installed:** `@liveblocks/client`, `@liveblocks/react`, `@liveblocks/node`, `@xyflow/react`, `@vercel/blob`

**New files created:**

- `liveblocks.config.ts` — Liveblocks Presence (cursor, isThinking), UserMeta (id, name, avatar, color), Storage (nodes/edges as LiveLists)
- `types/canvas.ts` — NODE_COLORS (8 color pairs), NODE_SHAPES (6 shapes with defaults), drag payload types
- `lib/liveblocks.ts` — Lazy cached Liveblocks server client via `getLiveblocks()`, getUserColor() deterministic color mapping
- `app/api/liveblocks-auth/route.ts` — POST endpoint: Clerk auth → project access check → Liveblocks session token
- `app/api/projects/[projectId]/canvas/route.ts` — PUT (Vercel Blob put with `access: "private"`), GET (fetch from stored blob URL)
- `hooks/useCanvasAutosave.ts` — Debounced autosave with status machine: idle → saving → saved/error → idle (2.5s display)
- `hooks/useShapeDrop.ts` — Drag payload builder with offset tracking, drop-to-node creation using screenToFlowPosition
- `components/editor/canvas-wrapper.tsx` — ReactFlowProvider → CanvasInner with ReactFlow, background dots, minimap, custom delete key handler, drag-drop
- `components/editor/canvas-node.tsx` — 6 shape renderers (rectangle/pill/circle CSS; diamond/hexagon/cylinder SVG), 8 handles (4 source + 4 target, all hidden→hover)
- `components/editor/shape-panel.tsx` — Fixed bottom-center floating pill toolbar, 6 draggable shape buttons

**Modified files:**

- `workspace-shell.tsx` — CanvasWrapper replaces placeholder, saveStatus state + saveTriggerRef wired to navbar, overflow-hidden on container
- `workspace-navbar.tsx` — Added Save button (Save/Saving.../Saved/Error states), conditional to workspace context only
- `project-sidebar.tsx` — Fixed `-translate-x-full` → `-translate-x-[calc(100%+2px)]` to prevent 1px border peeking when closed
- `context/progress-tracker.md` — Updated completed list through specs 10-13, 16, 21

## Decisions made

- **React Flow uses local state (useNodesState/useEdgesState), not Liveblocks sync yet.** The current-issues described fixes within an existing Liveblocks integration, but Liveblocks sync wasn't built yet. The canvas wrapper is structured for Liveblocks — it uses ReactFlowProvider and can accept Liveblocks-synced state when ready.
- **Liveblocks server client is lazy-initialized** via `getLiveblocks()` to avoid build-time crash when LIVEBLOCKS_SECRET_KEY is missing.
- **Delete/Backspace handled via global keydown listener** on window, not React Flow's built-in deleteKeyCode (set to `null`). Filters out input/textarea/contenteditable targets.
- **Sidebar visibility**: Uses CSS transform (`-translate-x-[calc(100%+2px)]`) rather than conditional rendering, preserving slide animation. Extra 2px accounts for the right border.
- **No Liveblocks sync in this session** — the foundation is solid but the RoomProvider/LiveblocksProvider wrappers and useLiveblocksFlow hook need to be added in the next session to make collaboration real.

## Problems solved

- **Build error: `Liveblocks` not exported from `@liveblocks/client`** — The server-side client is in `@liveblocks/node`, not `@liveblocks/client`. Installed `@liveblocks/node` and updated import.
- **Build error: Liveblocks client instantiated at module level without API key** — Made client lazy via `getLiveblocks()` function, only created when the auth route actually runs.
- **Sidebar border peeking when closed** — `-translate-x-full` leaves the 1px `border-r` visible at x=0. Fixed with `-translate-x-[calc(100%+2px)]`.

## Current state

- **Works:** Editor home page (`/editor`), workspace shell (`/editor/[roomId]`), canvas with React Flow, dotted background, minimap, shape panel drag-drop, node creation, edge connections (all 4 handles), Delete/Backspace node removal, Save button UI with state transitions, sidebar floating and fully hiding
- **Partial:** Liveblocks real-time sync not wired — nodes/edges are local React Flow state only. Autosave attempts to hit Vercel Blob API but 500s without proper BLOB_READ_WRITE_TOKEN.
- **Known broken:** Canvas API routes 500 because Vercel Blob credentials not configured. Shape drag-drop works but nodes may appear at slightly wrong position (screenToFlowPosition offset needs testing).

## Next session starts with

Wire Liveblocks collaboration: wrap CanvasWrapper in `LiveblocksProvider` + `RoomProvider` (using `/api/liveblocks-auth`), add `ClientSideSuspense` fallback, then replace `useNodesState`/`useEdgesState` with Liveblocks-synced storage via `useLiveblocksFlow` or manual LiveList sync. This unlocks real multi-user presence and collaborative editing.

## Open questions

- Does the Vercel Blob token (`BLOB_READ_WRITE_TOKEN`) need to be added to `.env.local`?
- Is the Liveblocks secret key (`LIVEBLOCKS_SECRET_KEY`) configured?
- Should nodes created via drag-drop be placed via center or top-left? (currently centers at drop point)
