# Dev-only tests

Optional regression tests for the app's core domain logic. They are **not part of
the build**: nothing under `app/`, `components/`, `lib/`, or `src/` imports them,
so they never reach a production bundle.

## Running

```bash
npm test          # one-shot
npm run test:watch  # watch mode
```

## What is covered

| File                        | Focus                                                                 |
| --------------------------- | --------------------------------------------------------------------- |
| `canvas-domain.test.ts`     | Canvas palette and shape catalog, plus their lookup fallbacks         |
| `canvas-flow.test.ts`       | Grid snapping, size clamping, canvas snapshot reading, canvas writes   |
| `design-plan.test.ts`       | AI design plan normalization (the validation gate before any mutation) |
| `design-run.test.ts`        | Terminal run detection and the outcome copy published to the room      |
| `spec-generation.test.ts`   | Spec prompt building, palette/edge resolution, Markdown normalization  |
| `starter-templates.test.ts` | Template snapshots satisfy the same schema as user-created content     |
| `task-schemas.test.ts`      | Zod schemas for the status feed and structured model output            |
| `ai-status.test.ts`         | Latest-message selection from the `ai-status-feed` payloads            |
| `ai-chat.test.ts`           | Chat message validation and ordering for the `ai-chat` feed            |
| `project-access.test.ts`    | Ownership and collaborator access checks with Clerk/Prisma doubles     |
| `liveblocks-color.test.ts`  | Deterministic collaborator colors                                     |

## Conventions

- Node environment only — no browser, network, database, or credentials required.
- External boundaries (Clerk, Prisma, the Liveblocks node client) are replaced
  with mocks; Liveblocks storage writes use real `LiveObject`/`LiveMap` values so
  the mutation logic itself stays under test.
- Import `describe`/`it`/`expect` from `vitest` explicitly (no globals).
