# Ghost AI

Real time collaborative system design workspace. A user describes a system in plain English, an AI agent maps it onto a shared canvas, collaborators refine it, and the graph becomes a Markdown specification.

## Stack

- **Language / Runtime**: TypeScript (strict), Node 20
- **Framework**: Next.js 16 App Router, React 19
- **Key dependencies**: Clerk for auth, Liveblocks and React Flow for the canvas, Prisma 7 over Postgres, Trigger.dev for durable AI runs, Vercel Blob for artifacts, AI SDK v7 with Gemini
- **Package manager**: npm
- Source of truth for this stack: `context/architecture-context.md`

## Build approach

<TBD, set by /scope>

## Commands

```bash
npm run dev           # dev server
npm run build         # production build
npm run lint          # eslint, expected to stay clean
npm test              # vitest, one shot
npm run trigger:dev   # local Trigger.dev worker
```

## Specs

Feature specs live in `context/feature-specs/NN-title.md`. `context/progress-tracker.md` holds the current state.

## Rules

- Read the `context/` files listed under Application Building Context below before implementing anything.
- Access is resolved from the room. `roomId` is the project id, and a client supplied `projectId` is never trusted.
- Project metadata lives in Postgres through Prisma (one model file per model under `prisma/models/`, client generated into `app/generated/prisma`). Generated artifacts (canvas snapshots, specs) live in Vercel Blob, with only the URL stored in the database.
- Handlers stay thin: validate, check access, trigger a task. Durable AI work runs in `src/trigger/`.
- Source style: no semicolons in `src/`, `lib/`, `types/`, `hooks/`, and `tests/`. Semicolons in `app/api/`.
- Style UI with the tokens in `app/globals.css` through their Tailwind names. No raw palette classes and no hex values.

## Context files

- [app/api/AGENTS.md](app/api/AGENTS.md): route handler conventions and the AI run endpoints
- [src/trigger/AGENTS.md](src/trigger/AGENTS.md): durable Trigger.dev tasks
- [lib/AGENTS.md](lib/AGENTS.md): shared server modules, Liveblocks and Prisma access, run tokens
- [components/editor/AGENTS.md](components/editor/AGENTS.md): the collaborative canvas and editor UI

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Application Building Context

Read the following files in order before implementing or making any architectural decision:

1. `context/project-overview.md` — product definition, goals, features, and scope
2. `context/architecture-context.md` — system structure, boundaries, storage model, and invariants
3. `context/ui-context.md` — theme, colors, typography, canvas design, and component conventions
4. `context/code-standards.md` — implementation rules and conventions
5. `context/ai-workflow-rules.md` — development workflow, scoping rules, and delivery approach
6. `context/progress-tracker.md` — current phase, completed work, open questions, and next steps

Update `context/progress-tracker.md` after each meaningful implementation change.

If implementation changes the architecture, scope, or standards documented in the context files, update the relevant file before continuing.