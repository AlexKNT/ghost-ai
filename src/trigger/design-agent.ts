import { AbortTaskRunError, logger, metadata, task } from "@trigger.dev/sdk"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText, Output } from "ai"

import {
  DESIGN_AGENT_SYSTEM_PROMPT,
  buildDesignAgentPrompt,
  normalizeDesignPlan,
  type NormalizedDesignPlan,
} from "@/lib/design-plan"
import {
  clearAgentPresence,
  setAgentPresence,
  type AgentPresence,
} from "@/lib/liveblocks-agent"
import { applyCanvasChanges, readCanvasSnapshot } from "@/lib/liveblocks-flow"
import { reportAiStatus, toErrorMessage } from "@/src/trigger/ai-status"
import { designPlanSchema } from "@/types/tasks"

/* -------------------------------------------------------------------------- */
/*  Design agent task                                                         */
/*                                                                           */
/*  Turns a natural language prompt into real-time updates on the shared      */
/*  collaborative canvas: Gemini produces a structured plan, the plan is      */
/*  validated, and the result is written into the room's Liveblocks storage.  */
/* -------------------------------------------------------------------------- */

export interface DesignAgentPayload {
  prompt: string
  roomId: string
}

const MODEL_ID = "gemini-2.5-flash"
const MAX_OUTPUT_TOKENS = 8192

export const designAgentTask = task({
  id: "design-agent",
  run: async (payload: DesignAgentPayload, { ctx }) => {
    const { prompt, roomId } = payload
    const runId = ctx.run.id

    logger.log("Design agent started", { runId, roomId, prompt })

    await reportAiStatus(roomId, runId, "Reading the current canvas…", "thinking")
    await reportPresence(roomId, { cursor: null, thinking: true })

    try {
      // 1. Read the shared canvas so the model extends it instead of guessing.
      const canvas = await readCanvasSnapshot(roomId)

      // 2. Ask Gemini for a structured design plan.
      const result = await generateText({
        model: getModel(),
        output: Output.object({
          schema: designPlanSchema,
          name: "design_plan",
          description:
            "Canvas changes that fulfil the user's system design request.",
        }),
        system: DESIGN_AGENT_SYSTEM_PROMPT,
        prompt: buildDesignAgentPrompt({ request: prompt, canvas }),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.4,
      })

      // 3. Validate and clamp everything before it can reach the canvas.
      const plan = normalizeDesignPlan(result.output, canvas)

      if (plan.isEmpty) {
        const message = plan.summary || "No canvas changes were needed."
        await reportAiStatus(roomId, runId, message, "complete")
        metadata.set("status", "complete")

        logger.log("Design agent finished without changes", { runId })
        return { ok: true, runId, summary: message, counts: plan.counts }
      }

      // 4. Publish progress and move the AI cursor to where it will work.
      await reportAiStatus(roomId, runId, describeChanges(plan), "applying")
      await reportPresence(roomId, { cursor: plan.focus, thinking: true })

      // 5. Write the change set into the shared room in a single mutation.
      const applied = await applyCanvasChanges(roomId, plan.changes)

      const summary = plan.summary || "Design applied to the canvas"
      await reportAiStatus(
        roomId,
        runId,
        `${summary} (${describeChanges(plan)})`,
        "complete",
      )
      metadata.set("status", "complete")

      logger.log("Design agent finished", { runId, applied })

      return { ok: true, runId, summary, counts: plan.counts, applied }
    } catch (error) {
      const message = toErrorMessage(error)

      logger.error("Design agent failed", { runId, error: message })
      metadata.set("status", "error")
      await reportAiStatus(
        roomId,
        runId,
        `Design generation failed: ${message}`,
        "error",
      )

      // Abort instead of retrying so a failed plan can never be applied twice.
      throw new AbortTaskRunError(message)
    } finally {
      await clearPresenceQuietly(roomId)
    }
  },
})

/* -------------------------------------------------------------------------- */
/*  Model                                                                     */
/* -------------------------------------------------------------------------- */

function getModel() {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not set")
  }

  const provider = createGoogleGenerativeAI({ apiKey })
  return provider(MODEL_ID)
}

/* -------------------------------------------------------------------------- */
/*  Reporting                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Presence is informational, exactly like the status feed. A failure to report
 * must never take down the generation itself, so it is logged and swallowed.
 */
async function reportPresence(
  roomId: string,
  presence: AgentPresence,
): Promise<void> {
  try {
    await setAgentPresence(roomId, presence)
  } catch (error) {
    logger.warn("Failed to update AI presence", { error: toErrorMessage(error) })
  }
}

async function clearPresenceQuietly(roomId: string): Promise<void> {
  try {
    await clearAgentPresence(roomId)
  } catch (error) {
    logger.warn("Failed to clear AI presence", { error: toErrorMessage(error) })
  }
}

function describeChanges(plan: NormalizedDesignPlan): string {
  const { counts } = plan
  const parts: string[] = []

  if (counts.nodesAdded > 0) parts.push(`added ${plural(counts.nodesAdded, "node")}`)
  if (counts.nodesUpdated > 0)
    parts.push(`updated ${plural(counts.nodesUpdated, "node")}`)
  if (counts.edgesAdded > 0) parts.push(`added ${plural(counts.edgesAdded, "edge")}`)
  if (counts.nodesRemoved > 0)
    parts.push(`removed ${plural(counts.nodesRemoved, "node")}`)
  if (counts.edgesRemoved > 0)
    parts.push(`removed ${plural(counts.edgesRemoved, "edge")}`)

  return parts.join(", ")
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}
