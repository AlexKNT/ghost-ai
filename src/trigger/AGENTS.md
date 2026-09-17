# Background tasks

## Overview

Durable Trigger.dev tasks. All AI work runs here and never inside a route handler. `design-agent` writes nodes and edges into the room through the Liveblocks node client, and `generate-spec` turns the room's graph into a Markdown spec and persists it before reporting success.

## Key files

| File | Owns |
| --- | --- |
| `src/trigger/design-agent.ts` | The design task that mutates the room's canvas |
| `src/trigger/generate-spec.ts` | The task that builds, saves, and returns a spec |
| `src/trigger/ai-status.ts` | `reportAiStatus` and `toErrorMessage`, shared by both tasks |

## Commands

```bash
# Local task worker. Loads .env and .env.local on its own.
npm run trigger:dev
```

## Conventions

- The task directory is set in `trigger.config.ts` as `dirs: ["./src/trigger"]`. A new task belongs in this folder to be deployed.
- Use `schemaTask` with a Zod payload schema when the task takes input, so Trigger.dev parses the payload. Use plain `task` when it takes none.
- Keep prompt builders and normalizers in `lib/` as pure functions and import them here, so they stay testable without a worker.
- Report every stage with `reportAiStatus`. Reporting is informational: the helper logs and swallows a feed failure so it can never take down the run it describes.
- Files here use no semicolons, matching `lib/`, `types/`, and `hooks/`.
- The `@/` alias resolves inside tasks because the build reads the tsconfig paths.
- The AI SDK is v7: call `generateText({ output: Output.object({ schema }) })` and read `result.output`. `generateObject` is deprecated.
- Validate the model's output before mutating anything, and constrain it to the canvas palette, the shape catalog, and the grid.

## Gotchas

- `trigger.config.ts` marks `@prisma/client` external through `prismaExtension({ mode: "modern" })`. Without it esbuild inlines around 11 MB of Prisma runtime into the bundle. Run `npx prisma generate` before deploying.
- Deployed runs read environment variables from the Trigger.dev dashboard, not from the local env files. A task that needs `DATABASE_URL` or `BLOB_READ_WRITE_TOKEN` fails in production if it was only set locally.
- The client subscribes to a run with a run scoped token. That token is only issued when a matching `TaskRun` row exists for the requesting user, so a task that is not recorded on trigger becomes unreadable.
- Two things publish to the room: presence through `setPresence` with a short time to live, and progress through the `ai-status-feed`. Presence expires on its own, so it is refreshed on each update.
- Never add a second feed or a second presence id. The room has one `ai-status-feed` and one `ai-chat` feed, read back with `selectLatestAiStatus` and `selectChatMessages`.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
