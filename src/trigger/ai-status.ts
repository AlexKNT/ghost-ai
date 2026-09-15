import { logger } from "@trigger.dev/sdk"

import { publishAiStatus } from "@/lib/liveblocks-agent"
import type { DesignRunStatus } from "@/types/tasks"

/* -------------------------------------------------------------------------- */
/*  Progress reporting shared by the AI tasks                                 */
/* -------------------------------------------------------------------------- */

/**
 * Publishes one progress line to the room's `ai-status-feed`, which is the
 * single source of truth for "the AI is working" in a room.
 *
 * Reporting is informational: a failure to publish is logged and swallowed so
 * a feed problem can never take down the generation it was describing.
 */
export async function reportAiStatus(
  roomId: string,
  runId: string,
  text: string,
  status: DesignRunStatus,
): Promise<void> {
  try {
    await publishAiStatus(roomId, {
      text,
      status,
      runId,
      updatedAt: Date.now(),
    })
  } catch (error) {
    logger.warn("Failed to publish AI status", { error: toErrorMessage(error) })
  }
}

/** Normalizes anything thrown into a message safe to log or publish. */
export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
