import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  construct: vi.fn(),
  prepareSession: vi.fn(),
  allow: vi.fn(),
  authorize: vi.fn(),
  jar: { get: vi.fn(), set: vi.fn() },
}));

vi.mock("@liveblocks/node", () => ({
  Liveblocks: class {
    prepareSession = mocks.prepareSession;
    constructor(options: { secret: string }) {
      mocks.construct(options);
    }
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => mocks.jar,
}));

// The secret is read when the module loads, so each case imports it fresh
const loadRoute = async (secret: string | null) => {
  vi.resetModules();
  if (secret === null) delete process.env.LIVEBLOCKS_SECRET_KEY;
  else process.env.LIVEBLOCKS_SECRET_KEY = secret;
  return import("./route");
};

const post = (body: unknown) =>
  new Request("http://localhost/api/liveblocks-auth", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const originalSecret = process.env.LIVEBLOCKS_SECRET_KEY;

beforeEach(() => {
  mocks.prepareSession.mockReturnValue({
    allow: mocks.allow,
    authorize: mocks.authorize,
    FULL_ACCESS: ["room:write"],
  });
  mocks.authorize.mockResolvedValue({ status: 200, body: '{"token":"jwt"}' });
  mocks.jar.get.mockReturnValue({ value: "anon_existing" });
});

afterEach(() => {
  vi.clearAllMocks();
  if (originalSecret === undefined) delete process.env.LIVEBLOCKS_SECRET_KEY;
  else process.env.LIVEBLOCKS_SECRET_KEY = originalSecret;
});

describe("POST /api/liveblocks-auth", () => {
  it("authorizes a session for the requested room", async () => {
    const { POST } = await loadRoute("sk_test");

    const response = await POST(post({ room: "abc123" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ token: "jwt" });
    expect(mocks.construct).toHaveBeenCalledWith({ secret: "sk_test" });
  });

  it("grants access to that room only, never the whole project", async () => {
    const { POST } = await loadRoute("sk_test");

    await POST(post({ room: "abc123" }));

    expect(mocks.allow).toHaveBeenCalledExactlyOnceWith("abc123", ["room:write"]);
  });

  it("reuses the caller's existing anonymous id", async () => {
    const { POST } = await loadRoute("sk_test");

    await POST(post({ room: "abc123" }));

    expect(mocks.prepareSession).toHaveBeenCalledWith("anon_existing");
    expect(mocks.jar.set).not.toHaveBeenCalled();
  });

  it("mints a stable id, http-only, for a first-time caller", async () => {
    mocks.jar.get.mockReturnValue(undefined);
    const { POST } = await loadRoute("sk_test");

    await POST(post({ room: "abc123" }));

    const [name, value, options] = mocks.jar.set.mock.calls[0];
    expect(name).toBe("codecollab_uid");
    expect(value).toMatch(/^anon_/);
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax" });
    expect(mocks.prepareSession).toHaveBeenCalledWith(value);
  });

  it("rejects a request with no room", async () => {
    const { POST } = await loadRoute("sk_test");

    const response = await POST(post({}));

    expect(response.status).toBe(400);
    expect(mocks.authorize).not.toHaveBeenCalled();
  });

  it("rejects a body that isn't JSON", async () => {
    const { POST } = await loadRoute("sk_test");

    const response = await POST(post("not json"));

    expect(response.status).toBe(400);
    expect(mocks.authorize).not.toHaveBeenCalled();
  });

  it("fails loudly rather than silently when the secret is missing", async () => {
    const { POST } = await loadRoute(null);

    const response = await POST(post({ room: "abc123" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("LIVEBLOCKS_SECRET_KEY"),
    });
  });
});
