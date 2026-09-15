import { AbortTaskRunError, logger, metadata, schemaTask } from "@trigger.dev/sdk"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"

import {
  SPEC_AGENT_SYSTEM_PROMPT,
  buildSpecGenerationPrompt,
  normalizeSpecMarkdown,
} from "@/lib/spec-generation"
import { saveProjectSpec, type StoredSpec } from "@/lib/spec-storage"
import { reportAiStatus, toErrorMessage } from "@/src/trigger/ai-status"
import { specGenerationPayloadSchema } from "@/types/tasks"

/* -------------------------------------------------------------------------- */
/*  Spec generation task                                                      */
/*                                                                            */
/*  Turns the collaborative canvas and the room conversation into a Markdown  */
/*  technical specification, then stores it: content in Vercel Blob and       */
/*  metadata in Postgres. Unlike the design agent, nothing it writes lands    */
/*  on the canvas.                                                            */
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

      await reportAiStatus(roomId, runId, "Saving the specification…", "applying")

      // The document only counts as generated once it can be downloaded again,
      // so a storage failure fails the run instead of reporting a false success.
      let stored: StoredSpec
      try {
        stored = await saveProjectSpec({ projectId, content: spec })
      } catch (error) {
        throw new Error(
          `The specification could not be saved: ${toErrorMessage(error)}`,
        )
      }

      const summary = `Specification drafted (${spec.length.toLocaleString("en-US")} characters)`

      metadata.set("status", "complete")
      metadata.set("message", summary)
      metadata.set("specId", stored.id)
      await reportAiStatus(roomId, runId, `${summary}.`, "complete")

      logger.log("Spec generation finished", {
        runId,
        specId: stored.id,
        characters: spec.length,
      })

      return {
        ok: true,
        runId,
        specId: stored.id,
        spec,
        characters: spec.length,
      }
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
