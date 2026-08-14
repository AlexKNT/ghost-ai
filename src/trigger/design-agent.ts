import { logger, task } from "@trigger.dev/sdk";

/* -------------------------------------------------------------------------- */
/*  Design agent task                                                         */
/*                                                                           */
/*  Backend wiring only. AI logic arrives in a later feature.                 */
/* -------------------------------------------------------------------------- */

export interface DesignAgentPayload {
  prompt: string;
  roomId: string;
}

export const designAgentTask = task({
  id: "design-agent",
  run: async (payload: DesignAgentPayload) => {
    logger.log("Design agent task triggered", {
      prompt: payload.prompt,
      roomId: payload.roomId,
    });

    // No AI logic yet — echo the input so the run is verifiable end to end.
    return {
      echoed: true,
      prompt: payload.prompt,
      roomId: payload.roomId,
    };
  },
});
