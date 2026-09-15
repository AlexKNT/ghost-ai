import { auth as triggerAuth } from "@trigger.dev/sdk"

import { prisma } from "@/lib/prisma"

/* -------------------------------------------------------------------------- */
/*  Run-scoped access tokens                                                  */
/* -------------------------------------------------------------------------- */

/**
 * How long a run-scoped token stays valid. Long enough to follow a generation
 * run to its end, short enough that a leaked token is soon worthless.
 */
const RUN_TOKEN_EXPIRATION = "1h"

/**
 * Issues a Trigger.dev public token that can read exactly one run, but only
 * when that run belongs to the requesting user.
 *
 * Ownership comes from the `TaskRun` record written when the run was triggered,
 * which is the only place the app records who started it. A run id belonging to
 * somebody else therefore yields `null` and never a token, so realtime run data
 * can not be read across users.
 *
 * @returns the token, or `null` when the run does not exist or is not theirs.
 */
export async function issueRunTokenForOwner(
  userId: string,
  runId: string,
): Promise<string | null> {
  const taskRun = await prisma.taskRun.findUnique({ where: { runId } })
  if (!taskRun || taskRun.userId !== userId) return null

  return triggerAuth.createPublicToken({
    scopes: {
      read: {
        runs: [runId],
      },
    },
    expirationTime: RUN_TOKEN_EXPIRATION,
  })
}
