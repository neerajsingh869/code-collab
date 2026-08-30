import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { Liveblocks } from "@liveblocks/node";

// The public key this replaced shipped in the client bundle, so anyone who
// opened devtools could point their own app at the project and spend its quota.
// The secret stays on the server and sessions are minted here instead.
const SECRET_KEY = process.env.LIVEBLOCKS_SECRET_KEY;

// Anonymous but stable, so the same person reconnecting is the same session
// rather than a new one each time. httpOnly because nothing on the page needs
// to read it.
const USER_COOKIE = "codecollab_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  if (!SECRET_KEY) {
    return Response.json(
      { error: "LIVEBLOCKS_SECRET_KEY is not set on the server" },
      { status: 500 },
    );
  }

  let room: unknown;
  try {
    ({ room } = await request.json());
  } catch {
    return Response.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  if (typeof room !== "string" || room.length === 0) {
    return Response.json({ error: "Missing room" }, { status: 400 });
  }

  const jar = await cookies();
  let userId = jar.get(USER_COOKIE)?.value;
  if (!userId) {
    userId = `anon_${randomUUID()}`;
    jar.set(USER_COOKIE, userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  }

  const liveblocks = new Liveblocks({ secret: SECRET_KEY });
  const session = liveblocks.prepareSession(userId);

  // Scoped to the one room being asked for. Granting "*" would hand every
  // session a key to every room in the project, which is what the public key
  // was already doing.
  session.allow(room, session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return new Response(body, {
    status,
    headers: { "content-type": "application/json" },
  });
}
