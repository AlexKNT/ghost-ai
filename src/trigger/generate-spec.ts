import { AbortTaskRunError, logger, metadata, schemaTask } from "@trigger.dev/sdk"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"

import {
  SPEC_AGENT_SYSTEM_PROMPT,
  buildSpecGenerationPrompt,
  normalizeSpecMarkdown,
} from "@/lib/spec-generation"
import { reportAiStatus, toErrorMessage } from "@/src/trigger/ai-status"
import { specGenerationPayloadSchema } from "@/types/tasks"

/* -------------------------------------------------------------------------- */
/*  Spec generation task                                                      */
/*                                                                            */
/*  Turns the collaborative canvas and the room conversation into a Markdown  */
/*  technical specification. Unlike the design agent, this task writes        */
/*  nothing back to the room: it reads the validated payload, asks Gemini     */
/*  for prose, and returns the document as its output.                        */
/* -------------------------------------------------------------------------- */

const MODEL_ID = "gemini-2.5-flash"
const MAX_OUTPUT_TOKENS = 8192

export const generateSpecTask = schemaTask({
  id: "generate-spec",
  schema: specGenerationPayloadSchema,
  run: async (payload, { ctx }) => {
    const { projectId, roomId, nodes, edges, chatHistory } = payload
    const runId = ctx.run.id

    logger.log("Spec generation started", {
      runId,
      projectId,
      roomId,
      nodes: nodes.length,
      edges: edges.length,
      messages: chatHistory.length,
    })

    metadata.set("status", "thinking")
    await reportAiStatus(
      roomId,
      runId,
      "Reading the canvas and the conversation…",
      "thinking",
    )

    try {
      const result = await generateText({
        model: getModel(),
        system: SPEC_AGENT_SYSTEM_PROMPT,
        prompt: buildSpecGenerationPrompt({ nodes, edges, chatHistory }),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.3,
      })

      const spec = normalizeSpecMarkdown(result.text)
      if (!spec) {
        throw new Error("The model returned an empty specification")
      }

      const summary = `Specification drafted (${spec.length.toLocaleString("en-US")} characters)`

      metadata.set("status", "complete")
      metadata.set("message", summary)
      await reportAiStatus(roomId, runId, `${summary}.`, "complete")

      logger.log("Spec generation finished", { runId, characters: spec.length })

      return { ok: true, runId, spec, characters: spec.length }
    } catch (error) {
      const message = toErrorMessage(error)

      logger.error("Spec generation failed", { runId, error: message })
      metadata.set("status", "error")
      metadata.set("message", message)
      await reportAiStatus(
        roomId,
        runId,
        `Spec generation failed: ${message}`,
        "error",
      )

      // Abort instead of retrying: the failure is already published to the room
      // once, and running the model again would only cost another attempt for a
      // document the user can simply ask for again.
      throw new AbortTaskRunError(message)
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
