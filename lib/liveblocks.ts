import { Liveblocks } from "@liveblocks/node"

/* -------------------------------------------------------------------------- */
/*  Cached Liveblocks Client (lazy initialization)                            */
/* -------------------------------------------------------------------------- */

const globalForLiveblocks = globalThis as unknown as {
  liveblocks: Liveblocks | undefined
}

function createLiveblocksClient(): Liveblocks {
  return new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  })
}

export function getLiveblocks(): Liveblocks {
  if (!globalForLiveblocks.liveblocks) {
    globalForLiveblocks.liveblocks = createLiveblocksClient()
  }
  return globalForLiveblocks.liveblocks
}

/* -------------------------------------------------------------------------- */
/*  Color Mapping                                                             */
/* -------------------------------------------------------------------------- */

const CURSOR_COLORS = [
  "#00c8d4",
  "#6457f9",
  "#ff6166",
  "#ff990a",
  "#52a8ff",
  "#62c073",
  "#bf7af0",
  "#f75f8f",
]

export function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
}
