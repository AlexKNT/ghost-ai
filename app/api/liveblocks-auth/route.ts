import { auth, currentUser } from "@clerk/nextjs/server"
import { getLiveblocks } from "@/lib/liveblocks"
import { getUserColor } from "@/lib/liveblocks"
import { checkProjectAccess, getClerkIdentity } from "@/lib/project-access"
import { NextResponse } from "next/server"

/* -------------------------------------------------------------------------- */
/*  POST /api/liveblocks-auth                                                 */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  // 1. Require Clerk authentication
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Parse room ID from request body
  const body = await request.json().catch(() => ({}))
  const roomId = body.room as string | undefined
  if (!roomId) {
    return NextResponse.json({ error: "Missing room ID" }, { status: 400 })
  }

  // 3. Verify project access
  const identity = await getClerkIdentity()
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { allowed } = await checkProjectAccess(roomId, identity)
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // 4. Get user info for session metadata
  const user = await currentUser()
  const name = user?.fullName ?? user?.username ?? "Unknown"
  const avatar = user?.imageUrl ?? ""

  // 5. Start Liveblocks session
  const liveblocks = getLiveblocks()
  const session = liveblocks.prepareSession(userId, {
    userInfo: {
      id: userId,
      name,
      avatar,
      color: getUserColor(userId),
    },
  })

  // Ensure the room exists (create only if needed)
  session.allow(roomId, session.FULL_ACCESS)

  const { status, body: responseBody } = await session.authorize()

  return new NextResponse(responseBody, { status })
}
