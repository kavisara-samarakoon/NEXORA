import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Use the installed compiler so these checks also run on the project's Node 20 baseline.
async function moduleUrl(path, replacements = {}) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(from, to);
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}

const { productReturnTo, authFieldError } = await import(await moduleUrl("../src/lib/auth-form.ts"));
const { wishlistCardIdentity } = await import(
  await moduleUrl("../src/lib/wishlist-card-identity.ts")
);
const { createSentinelRequestGuard } = await import(
  await moduleUrl("../src/lib/sentinel-request-guard.ts")
);

test("auth return navigation accepts only known product routes", () => {
  for (const route of ["/", "/deals", "/giveaways", "/wishlist", "/sentinel", "/security", "/settings"]) {
    assert.equal(productReturnTo(route), route);
  }
  for (const value of [undefined, ["/deals"], "https://example.com", "//example.com", "/\\example.com", "javascript:alert(1)", "/login", "/api/auth/logout", "/%2fexample.com", "/deals?next=https://example.com"]) {
    assert.equal(productReturnTo(value), "/wishlist");
  }
});

test("registration validates the trimmed username and blank fields without trimming passwords", () => {
  assert.match(authFieldError("username", "  ab  ", "register"), /3 characters/);
  assert.equal(authFieldError("username", "  player  ", "register"), "");
  assert.match(authFieldError("displayName", "   ", "register"), /display name/);
  assert.match(authFieldError("emailOrUsername", "  ", "login"), /email or username/);
  assert.match(authFieldError("password", "        ", "register"), /spaces alone/);
  assert.match(authFieldError("password", "short", "register"), /8 characters/);
  assert.equal(authFieldError("password", "short", "login"), "");
  assert.equal(authFieldError("password", " pass123", "register"), "");
  assert.equal(authFieldError("password", "é".repeat(36), "register"), "");
  assert.match(authFieldError("password", "é".repeat(37), "register"), /too long/);
  assert.equal(authFieldError("password", "🎮".repeat(18), "login"), "");
  assert.match(authFieldError("password", "🎮".repeat(19), "login"), /too long/);
});

test("wishlist card identity separates preview drafts from personal account items", () => {
  const item = { id: 1, store: "Steam", title: "Example Game" };
  const previewIdentity = wishlistCardIdentity(
    { accountRevision: 0, source: "api", view: "public" },
    item,
  );
  const personalIdentity = wishlistCardIdentity(
    { accountRevision: 1, source: "api", view: "personal" },
    item,
  );
  const nextAccountIdentity = wishlistCardIdentity(
    { accountRevision: 2, source: "api", view: "personal" },
    item,
  );

  assert.notEqual(previewIdentity, personalIdentity);
  assert.notEqual(personalIdentity, nextAccountIdentity);
  assert.notEqual(
    previewIdentity,
    wishlistCardIdentity(
      { accountRevision: 0, source: "fallback", view: "public" },
      item,
    ),
  );
  assert.notEqual(
    personalIdentity,
    wishlistCardIdentity(
      { accountRevision: 1, source: "api", view: "personal" },
      { ...item, title: "Another Game" },
    ),
  );
  assert.equal(
    personalIdentity,
    wishlistCardIdentity(
      { accountRevision: 1, source: "api", view: "personal" },
      item,
    ),
  );
});

test("Sentinel rejects responses from requests invalidated by an auth change", () => {
  const guard = createSentinelRequestGuard();
  const signedInRequest = guard.begin();

  assert.equal(guard.isCurrent(signedInRequest), true);
  guard.invalidate();
  assert.equal(guard.isCurrent(signedInRequest), false);

  const nextSessionRequest = guard.begin();
  assert.equal(guard.isCurrent(signedInRequest), false);
  assert.equal(guard.isCurrent(nextSessionRequest), true);
});

test("anonymous bootstrap is coalesced, real auth failures remain visible, and refresh can still recover sessions", async () => {
  const apiUrl = `data:text/javascript,${encodeURIComponent('export const buildApiUrl = path => "http://localhost:8080" + path; export const readResponseRequestId = response => response.headers.get("X-NEXORA-Request-ID");')}`;
  const authUrl = await moduleUrl("../src/lib/auth.ts", { "@/lib/api-client": apiUrl });
  const clientUrl = await moduleUrl("../src/lib/auth-client.ts", { "@/lib/auth": authUrl });
  const auth = await import(authUrl);
  const client = await import(clientUrl);
  const originalFetch = globalThis.fetch;
  const calls = [];
  let refreshStatus = 401;
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    calls.push(path);
    if (path.endsWith("/csrf")) return Response.json({ csrfToken: "a".repeat(43) });
    if (path.endsWith("/login")) return Response.json({ error: "invalid_credentials" }, { status: 401 });
    if (refreshStatus !== 200) return Response.json({ error: refreshStatus === 401 ? "authentication_required" : "service_unavailable" }, { status: refreshStatus, headers: { "X-NEXORA-Request-ID": "test-request-123" } });
    return Response.json({ token: "test-memory-token", tokenType: "Bearer", user: { id: 1, username: "test", displayName: "Test", email: "test@example.test" } });
  };
  try {
    const tokens = await Promise.all(Array.from({ length: 20 }, () => client.ensureAuthToken()));
    assert.ok(tokens.every(token => token === null));
    assert.equal(calls.filter(path => path.endsWith("/refresh")).length, 1);
    await client.readCurrentUser();
    await client.ensureAuthToken();
    assert.equal(calls.filter(path => path.endsWith("/refresh")).length, 1, "route remounts do not repeat anonymous refresh");
    await assert.rejects(auth.login({ emailOrUsername: "test", password: "invalid" }), error => auth.normalizeAuthError(error).status === 401);

    refreshStatus = 503;
    await assert.rejects(client.ensureAuthToken({ forceRefresh: true }), error => auth.normalizeAuthError(error).status === 503 && error.requestId === "test-request-123");
    refreshStatus = 200;
    assert.equal(await client.ensureAuthToken({ forceRefresh: true }), "test-memory-token");
    assert.equal((await client.readCurrentUser()).username, "test");
    client.clearAuthToken();
    assert.equal(client.readAuthToken(), null);
    assert.equal(await client.ensureAuthToken(), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
