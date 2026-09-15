import { getNodeColorName } from "@/types/canvas"
import {
  AI_ASSISTANT_NAME,
  type AiChatMessage,
  type SpecCanvasEdge,
  type SpecCanvasNode,
} from "@/types/tasks"

/* -------------------------------------------------------------------------- */
/*  Prompt                                                                    */
/* -------------------------------------------------------------------------- */

export const SPEC_AGENT_SYSTEM_PROMPT = `You are Ghost AI, a software architect that turns a system design canvas into a technical specification.

You receive the canvas as JSON — its nodes, the connections between them, and the conversation that produced it — and you reply with one Markdown document.

## Reading the canvas

- A node is a component of the system; its label is the component's name. Use that exact name everywhere.
- Shape carries meaning: rectangle = service or component, pill = long-running process, circle = endpoint or event, diamond = gateway, router or decision, cylinder = datastore, cache or storage, hexagon = external system or trust boundary.
- Color carries meaning: blue = client, purple = edge or gateway, green = service, orange = queue or asynchronous work, pink = datastore, teal = cache, red = failure path, neutral = anything else.
- An edge is a directed dependency: "from" calls, sends to, or reads from "to". Its label describes the interaction, and an unlabeled edge means a plain dependency.
- The conversation holds the requirements, decisions and constraints; the canvas holds the resulting design. Where they disagree, the canvas wins.

## Output rules

- Reply with Markdown only. No preamble, no explanation of your process, and no code fence wrapped around the whole document.
- Start with a single H1 title: "# <System name> — Technical Specification".
- Then use H2 sections in this order, skipping only the ones the canvas and conversation give you nothing for: Overview, Goals and Non-Goals, Architecture, Components, Data Flow, Data Storage, Interfaces, Non-Functional Requirements, Open Questions.
- Describe the system the canvas actually shows. Never invent components, connections or technologies that are not on the canvas or in the conversation.
- Use tables for the component list and for interfaces, and fenced code blocks with a language for request or payload examples.
- If the canvas has no nodes, say the design has not been started yet and keep the document short.
- Keep it factual and concise: 600 to 1200 words.
- Reserve Open Questions for decisions the canvas and the conversation genuinely leave unresolved.`

/* -------------------------------------------------------------------------- */
/*  Prompt building                                                           */
/* -------------------------------------------------------------------------- */

/** The three sources a spec is written from. */
export interface SpecGenerationContext {
  nodes: readonly SpecCanvasNode[]
  edges: readonly SpecCanvasEdge[]
  chatHistory: readonly AiChatMessage[]
}

/**
 * Builds the model prompt from the canvas and the room conversation.
 *
 * Edges are flattened from node ids to node labels so the model reads
 * "API Gateway → Orders DB" instead of two opaque ids, and colors are reduced
 * to their palette name — the vocabulary the system prompt documents.
 */
export function buildSpecGenerationPrompt({
  nodes,
  edges,
  chatHistory,
}: SpecGenerationContext): string {
  const labels = new Map(nodes.map((node) => [node.id, nodeLabel(node)]))

  const context = {
    canvas: {
      nodes: nodes.map((node) => ({
        label: nodeLabel(node),
        shape: node.shape ?? "rectangle",
        color: getNodeColorName(node.color),
      })),
      edges: edges.map((edge) => ({
        from: labels.get(edge.source) ?? edge.source,
        to: labels.get(edge.target) ?? edge.target,
        label: edge.label?.trim() ?? "",
      })),
    },
    conversation: chatHistory.map((message) => ({
      from: message.role === "assistant" ? AI_ASSISTANT_NAME : message.sender,
      message: message.content.trim(),
    })),
  }

  return ["Canvas and conversation:", JSON.stringify(context, null, 2)].join(
    "\n",
  )
}

function nodeLabel(node: SpecCanvasNode): string {
  return node.label?.trim() || "Untitled"
}

/* -------------------------------------------------------------------------- */
/*  Normalization                                                             */
/* -------------------------------------------------------------------------- */

/** A fenced block that encloses the entire document. */
const WRAPPING_CODE_FENCE = /^```[a-zA-Z-]*[ \t]*\r?\n([\s\S]*?)\r?\n?```$/

/**
 * Cleans the model's Markdown before it leaves the task.
 *
 * Trimming is obvious; the fence handling is not. Models routinely wrap a whole
 * Markdown document in a ```markdown block, which would render as one long code
 * block instead of a spec, so a fence that encloses everything is unwrapped
 * while fences inside the document (payload examples) are left alone.
 *
 * Returns an empty string when the model produced nothing, which the caller
 * treats as a failure rather than saving an empty spec.
 */
export function normalizeSpecMarkdown(text: string): string {
  const trimmed = text.trim()
  const wrapped = WRAPPING_CODE_FENCE.exec(trimmed)

  return (wrapped ? wrapped[1] : trimmed).trim()
}
