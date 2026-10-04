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
const { hasAvailableDealRating, isValidDealRatingPayload } = await import(
  await moduleUrl("../src/lib/deal-rating.ts")
);
const { giveaways: giveawaySamples } = await import(
  await moduleUrl("../src/data/giveaways.ts")
);
const { notificationPreferences } = await import(
  await moduleUrl("../src/data/settings.ts")
);
const homeFeedApiClientUrl = `data:text/javascript,${encodeURIComponent('export const buildApiUrl = path => "http://localhost:8080" + path;')}`;
const {
  HOME_FEED_REQUEST_TIMEOUT_MS,
  getHomeSummaryAvailability,
  mapDeal,
  mapGiveaway,
  mapSummary,
} = await import(
  await moduleUrl("../src/lib/homeFeed.ts", { "@/lib/api-client": homeFeedApiClientUrl })
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
  const newerRequest = guard.begin();
  assert.equal(guard.isCurrent(nextSessionRequest), false, "a superseded request cannot overwrite its successor");
  assert.equal(guard.isCurrent(newerRequest), true);
});

test("deal ratings distinguish unavailable data from real ratings", () => {
  assert.equal(hasAvailableDealRating(0, ""), false);
  assert.equal(isValidDealRatingPayload(0, ""), true);
  assert.equal(isValidDealRatingPayload(0, "★★☆☆☆"), false);
  assert.equal(hasAvailableDealRating(4.6, "★★★★★"), true);
  assert.equal(isValidDealRatingPayload(4.6, "★★★★★"), true);
});

test("giveaway seed data and settings identify unverified sample capabilities", () => {
  assert.ok(giveawaySamples.every((item) =>
    item.status === "sample" &&
    item.tag === "sample" &&
    item.timer === "End date unverified" &&
    item.daysRemaining === 0 &&
    item.claimed === 0
  ));

  const giveawayPreference = notificationPreferences.find(
    (item) => item.id === "giveaway-reminders",
  );
  assert.equal(giveawayPreference?.enabled, false);
  assert.equal(giveawayPreference?.statusLabel, "Planned");
  assert.match(giveawayPreference?.description ?? "", /No persisted giveaway-reminder/);
});

// Execute production Deals handlers and the HTTP/retry client with controlled
// hooks and responses, without adding a browser or test-renderer dependency.
async function dealsWishlistHarness(initialItems = []) {
  const source = await readFile(new URL("../src/components/DealsExplorer.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("deals.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const explorer = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "DealsExplorer");
  const declaration = (name, statements) => {
    const node = statements.find(statement =>
      (ts.isFunctionDeclaration(statement) && statement.name?.text === name) ||
      (ts.isVariableStatement(statement) && statement.declarationList.declarations.some(item => item.name.getText(ast) === name)));
    assert.ok(node, `missing production declaration ${name}`);
    return node.getText(ast);
  };
  const authUrl = `data:text/javascript,${encodeURIComponent(`
    export const controls = { token: "initial", refreshedToken: "rotated", refreshCalls: 0, clearCalls: 0, error: null, pending: null };
    export const readAuthToken = () => controls.token;
    export const clearAuthToken = () => { controls.clearCalls++; controls.token = null; };
    export const ensureAuthToken = async (options = {}) => {
      if (controls.pending) await controls.pending;
      if (controls.error) throw controls.error;
      if (options.forceRefresh) { controls.refreshCalls++; controls.token = controls.refreshedToken; }
      return controls.token;
    };
  `)}`;
  const auth = await import(authUrl);
  Object.assign(auth.controls, { token: "initial", refreshedToken: "rotated", refreshCalls: 0, clearCalls: 0, error: null, pending: null });
  const apiUrl = `data:text/javascript,${encodeURIComponent('export const buildApiUrl = path => "http://localhost:8080" + path; export const readResponseRequestId = response => response.headers.get("X-NEXORA-Request-ID");')}`;
  const wishlist = await import(await moduleUrl("../src/lib/user-wishlist.ts", {
    "@/lib/auth-client": authUrl,
    "@/lib/api-client": apiUrl,
    "@/data/wishlist": await moduleUrl("../src/data/wishlist.ts"),
  }));
  const state = {
    authToken: "initial", authChecked: true, savingDeals: new Set(),
    savedWishlistItems: initialItems, saveMessages: {}, wishlistSyncRevision: 0,
    wishlistSyncWarning: null,
  };
  const setters = Object.fromEntries(Object.keys(state).map(key => [
    `set${key[0].toUpperCase()}${key.slice(1)}`,
    value => { state[key] = typeof value === "function" ? value(state[key]) : value; },
  ]));
  const refs = {
    savingDealKeys: { current: new Set() }, savedWishlistItemsRef: { current: initialItems },
    wishlistVersion: { current: 0 }, mounted: { current: true },
  };
  const mocks = {
    ...setters, ...refs, ...auth, ...wishlist, displayedDealScope: "curated",
    useCallback: callback => callback,
    normalizeAuthError: error => error.authDetails ?? { code: "unknown_error" },
  };
  const names = ["storeWishlistItems", "toggleDealAlert", "saveDeal"];
  const program = [
    ...["protectedWishlistError", "normalizedWishlistValue", "findMatchingWishlistItem", "dealStateKey", "wishlistOperationKey", "wishlistPayloadFor"].map(name => declaration(name, ast.statements)),
    ...names.map(name => declaration(name, explorer.body.statements)),
  ].join("\n");
  const output = ts.transpileModule(program, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const handlers = new Function(...Object.keys(mocks), `${output}\nreturn { ${names.join(", ")}, findMatchingWishlistItem, wishlistPayloadFor };`)(...Object.values(mocks));
  const syncEffect = explorer.body.statements.find(statement => ts.isExpressionStatement(statement) &&
    ts.isCallExpression(statement.expression) && statement.expression.expression.getText(ast) === "useEffect" &&
    statement.getText(ast).includes("async function syncSavedWishlist"));
  assert.ok(syncEffect);
  const syncOutput = ts.transpileModule(syncEffect.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const runSync = () => {
    let cleanup;
    const syncMocks = {
      ...mocks, ...state, ...handlers, externalDeals: [], externalStatus: "idle", mode: "curated",
      useEffect: callback => { cleanup = callback(); },
    };
    new Function(...Object.keys(syncMocks), syncOutput)(...Object.values(syncMocks));
    return cleanup;
  };
  const calls = [];
  const responses = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ path: new URL(url).pathname, method: init.method, token: init.headers.Authorization, body: init.body ? JSON.parse(init.body) : undefined });
    assert.ok(responses.length, "unexpected wishlist HTTP request");
    return await responses.shift()();
  };
  return {
    source, state, refs, handlers, auth: auth.controls, calls, runSync,
    respond: (item, status = 200, requestId = null) => responses.push(() => Response.json(item, {
      status, headers: requestId ? { "X-NEXORA-Request-ID": requestId } : {},
    })),
    defer: () => {
      let resolve;
      const promise = new Promise(done => { resolve = done; });
      responses.push(() => promise);
      return item => resolve(Response.json(item));
    },
    restore: () => { globalThis.fetch = originalFetch; },
  };
}

const alertDeal = { id: 7, title: "Example Game", store: "Steam", priceNew: "$9.99", priceValue: 9.99, discount: "-75%", discountValue: 75 };
const alertItem = { ...alertDeal, id: 42, currentPrice: "$10.99", targetPrice: "$5.00", lowestEver: "$8.00", status: "tracking", priority: "high", alertActive: false };
const alertMessage = harness => harness.state.saveMessages["curated:7:Example Game"];
const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

let sentinelHarnessId = 0;
const sentinelSession = (id = 1, token = "initial") => ({
  token, tokenType: "Bearer",
  user: { id, username: `player${id}`, displayName: `Player ${id}`, email: `player${id}@example.test` },
});
const sentinelAnswer = (answer = "Current answer", overrides = {}) => ({
  mode: "local-foundation", provider: "local", context: "general",
  title: "Insight", answer, recommendations: [], safetyNotes: ["Bounded context"],
  nextActions: [], fallbackReason: null, createdAt: "2026-10-04T00:00:00Z", ...overrides,
});

// Run the production component (including its JSX and auth-event effect) with
// stable hook cells, real auth/HTTP/retry modules, and controlled network replies.
async function sentinelChatHarness() {
  const apiUrl = `data:text/javascript,${encodeURIComponent(`
    export const harnessId = ${++sentinelHarnessId};
    export const buildApiUrl = path => "http://localhost:8080" + path;
    export const readResponseRequestId = response => response.headers.get("X-NEXORA-Request-ID");
  `)}`;
  const authUrl = await moduleUrl("../src/lib/auth.ts", { "@/lib/api-client": apiUrl });
  const clientUrl = await moduleUrl("../src/lib/auth-client.ts", { "@/lib/auth": authUrl });
  const auth = await import(clientUrl);
  const sentinel = await import(await moduleUrl("../src/lib/user-sentinel.ts", {
    "@/lib/auth-client": clientUrl, "@/lib/api-client": apiUrl,
  }));
  const source = await readFile(new URL("../src/components/SentinelChat.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("sentinel.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const program = ast.statements.filter(node => !ts.isImportDeclaration(node))
    .map(node => node.getText(ast)).join("\n").replace("export default function SentinelChat", "function SentinelChat");
  const output = ts.transpileModule(program, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const eventTarget = new EventTarget();
  const storageCalls = [];
  eventTarget.localStorage = {
    removeItem: key => storageCalls.push(["remove", key]),
    setItem: (...args) => { storageCalls.push(["set", ...args]); },
  };
  eventTarget.requestAnimationFrame = callback => { callback(); return 1; };
  globalThis.window = eventTarget;
  const calls = [];
  const responses = [];
  globalThis.fetch = async (url, init) => {
    const path = new URL(url).pathname;
    calls.push({ path, token: init.headers?.Authorization, body: init.body ? JSON.parse(init.body) : undefined });
    if (path.endsWith("/csrf")) return Response.json({ csrfToken: "a".repeat(43) });
    assert.ok(responses.length, `unexpected Sentinel/auth request ${path}`);
    const next = responses.shift();
    assert.equal(path, next.path);
    return next.reply();
  };
  auth.startAuthSession(sentinelSession());
  let cursor = 0;
  const cells = [];
  let effects = [];
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      cells[index] ??= { value: typeof initial === "function" ? initial() : initial };
      return [cells[index].value, value => {
        cells[index].value = typeof value === "function" ? value(cells[index].value) : value;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      cells[index] ??= { current: initial };
      return cells[index];
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!sameDeps(cells[index]?.deps, deps)) cells[index] = { value: callback, deps };
      return cells[index].value;
    },
    useEffect(callback, deps) {
      const index = cursor++;
      if (sameDeps(cells[index]?.deps, deps)) return;
      effects.push(() => {
        cells[index]?.cleanup?.();
        cells[index] = { deps, cleanup: callback() };
      });
    },
  };
  const mocks = {
    ...hooks, ...auth, ...sentinel, createSentinelRequestGuard,
    Link: "Link", RequestIdSupportText: "RequestIdSupportText",
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), Fragment: "Fragment" },
  };
  const Component = new Function(...Object.keys(mocks), `${output}\nreturn SentinelChat;`)(...Object.values(mocks));
  let tree;
  const render = () => {
    cursor = 0;
    tree = Component({ messages: [], suggestions: [] });
    const pending = effects;
    effects = [];
    pending.forEach(effect => effect());
    return tree;
  };
  const nodes = (node = tree) => {
    if (Array.isArray(node)) return node.flatMap(item => nodes(item));
    if (!node || typeof node !== "object") return [];
    return [node, ...nodes(node.props.children)];
  };
  const find = predicate => nodes().find(predicate);
  render();
  await settle();
  render();
  return {
    auth, calls, storageCalls, render,
    answer: () => { render(); return find(node => node.type.name === "GatewayResponseCard")?.props.response; },
    input: () => { render(); return find(node => node.props.id === "sentinel-message").props; },
    signIn: () => { render(); return find(node => node.props.href === "/login?returnTo=%2Fsentinel"); },
    errorId: () => { render(); return find(node => node.type === "RequestIdSupportText")?.props.requestId; },
    text: () => { render(); return JSON.stringify(tree); },
    submit(message) {
      render();
      const input = find(node => node.props.id === "sentinel-message").props;
      if (!input.disabled) input.onChange({ target: { value: message } });
      render();
      return find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
    },
    respond(path, value, status = 200, requestId = null) {
      responses.push({ path, reply: () => Response.json(value, { status, headers: requestId ? { "X-NEXORA-Request-ID": requestId } : {} }) });
    },
    defer(path) {
      let resolve;
      const promise = new Promise(done => { resolve = done; });
      responses.push({ path, reply: () => promise });
      return (value, status = 200) => resolve(Response.json(value, { status }));
    },
    restore() {
      cells.forEach(cell => cell.cleanup?.());
      globalThis.fetch = originalFetch;
      if (originalWindow === undefined) delete globalThis.window;
      else globalThis.window = originalWindow;
    },
  };
}

const insightPath = "/api/me/sentinel/insight";
const refreshPath = "/api/auth/refresh";

test("Sentinel renders normal success and a real 401 / same-user refresh / retry success", async () => {
  for (const refresh of [false, true]) {
    const h = await sentinelChatHarness();
    try {
      const revision = h.auth.readAuthSessionRevision();
      let events = 0;
      window.addEventListener(h.auth.AUTH_STATE_EVENT, () => { events++; });
      if (refresh) {
        h.respond(insightPath, {}, 401);
        h.respond(refreshPath, sentinelSession(1, "rotated"));
      }
      h.respond(insightPath, sentinelAnswer());
      await h.submit("Find wishlist deals");
      assert.deepEqual(h.answer(), sentinelAnswer());
      assert.match(h.text(), /Find wishlist deals/);
      assert.equal(h.input().value, "");
      assert.equal(h.input().disabled, false);
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      assert.equal(events, refresh ? 1 : 0, "rotation still broadcasts the auth event");
      assert.deepEqual(h.calls.filter(call => call.path === insightPath).map(call => call.token),
        refresh ? ["Bearer initial", "Bearer rotated"] : ["Bearer initial"]);
      assert.equal(h.auth.readAuthToken(), refresh ? "rotated" : "initial");
      assert.ok(h.storageCalls.every(([operation]) => operation === "remove"), "tokens are never persisted");
    } finally { h.restore(); }
  }
});

test("Sentinel preserves an in-flight request and completed conversation during same-user rotation", async () => {
  const h = await sentinelChatHarness();
  try {
    const reply = h.defer(insightPath);
    const pending = h.submit("Retain my prompt");
    await h.submit("Duplicate submission");
    assert.equal(h.calls.filter(call => call.path === insightPath).length, 1, "pending request blocks concurrent submission");
    const revision = h.auth.readAuthSessionRevision();
    h.respond(refreshPath, sentinelSession(1, "rotated"));
    await h.auth.ensureAuthToken({ forceRefresh: true });
    assert.equal(h.auth.readAuthSessionRevision(), revision);
    assert.equal(h.input().disabled, true);
    assert.equal(h.input().value, "Retain my prompt");
    reply(sentinelAnswer());
    await pending;
    assert.deepEqual(h.answer(), sentinelAnswer());
    h.respond(refreshPath, sentinelSession(1, "rotated-again"));
    await h.auth.ensureAuthToken({ forceRefresh: true });
    assert.deepEqual(h.answer(), sentinelAnswer(), "completed private conversation survives rotation too");
  } finally { h.restore(); }
});

test("Sentinel rejects an old response immediately on logout, even while server logout is pending", async () => {
  const h = await sentinelChatHarness();
  try {
    const reply = h.defer(insightPath);
    const pending = h.submit("Private old request");
    const completeLogout = h.defer("/api/auth/logout");
    const loggingOut = h.auth.logout();
    await settle();
    assert.equal(h.auth.readAuthToken(), null);
    assert.ok(h.signIn());
    reply(sentinelAnswer("Old private answer"));
    await pending;
    assert.equal(h.answer(), undefined);
    assert.doesNotMatch(h.text(), /Private old request|Old private answer/);
    assert.equal(h.input().disabled, false);
    completeLogout({});
    await loggingOut;
  } finally { h.restore(); }
});

test("Sentinel rejects old account/session responses and keeps a newer request authoritative", async () => {
  for (const transition of ["different-account", "same-account-new-session", "refresh-to-different-account"]) {
    const h = await sentinelChatHarness();
    try {
      const oldReply = h.defer(insightPath);
      const oldRequest = h.submit("Old private prompt");
      const revision = h.auth.readAuthSessionRevision();
      if (transition === "refresh-to-different-account") {
        h.respond(refreshPath, sentinelSession(2, "new-account"));
        await h.auth.ensureAuthToken({ forceRefresh: true });
      } else {
        h.auth.startAuthSession(sentinelSession(transition === "different-account" ? 2 : 1, "new-session"));
      }
      assert.notEqual(h.auth.readAuthSessionRevision(), revision);
      assert.doesNotMatch(h.text(), /Old private prompt/);
      const newReply = h.defer(insightPath);
      const newRequest = h.submit("New prompt");
      newReply(sentinelAnswer("New answer"));
      await newRequest;
      oldReply(sentinelAnswer("Old private answer"));
      await oldRequest;
      assert.equal(h.answer().answer, "New answer");
      assert.doesNotMatch(h.text(), /Old private answer|Old private prompt/);
    } finally { h.restore(); }
  }
});

test("Sentinel terminal refresh or retry authentication failure clears private state and supports signing in again", async () => {
  for (const retryFails of [false, true]) {
    const h = await sentinelChatHarness();
    try {
      h.respond(insightPath, {}, 401, "expired-request-id");
      h.respond(refreshPath, retryFails ? sentinelSession(1, "rotated") : {}, retryFails ? 200 : 401);
      if (retryFails) h.respond(insightPath, {}, 401, "retry-request-id");
      await h.submit("Expired private prompt");
      await settle();
      assert.equal(h.auth.readAuthToken(), null);
      assert.equal(h.answer(), undefined);
      assert.ok(h.signIn());
      assert.doesNotMatch(h.text(), /Expired private prompt/);
      assert.equal(h.input().disabled, false);
      h.auth.startAuthSession(sentinelSession(1, "signed-in-again"));
      h.respond(insightPath, sentinelAnswer("Recovered answer"));
      await h.submit("Try again after sign in");
      assert.equal(h.answer().answer, "Recovered answer");
    } finally { h.restore(); }
  }
});

test("Sentinel does not retry an old prompt or restore stale auth after a transition during refresh", async () => {
  for (const transition of ["logout", "account-switch"]) {
    const h = await sentinelChatHarness();
    try {
      h.respond(insightPath, {}, 401);
      const finishRefresh = h.defer(refreshPath);
      const pending = h.submit("Old private prompt awaiting refresh");
      await settle();
      assert.equal(h.calls.filter(call => call.path === refreshPath).length, 1);
      let loggingOut;
      if (transition === "logout") {
        h.respond("/api/auth/logout", {});
        loggingOut = h.auth.logout();
      } else {
        h.auth.startAuthSession(sentinelSession(2, "new-account"));
      }
      finishRefresh(sentinelSession(1, "stale-rotated"));
      await pending;
      if (loggingOut) await loggingOut;
      assert.equal(h.calls.filter(call => call.path === insightPath).length, 1, "no retry under a changed session");
      assert.equal(h.auth.readAuthToken(), transition === "logout" ? null : "new-account");
      assert.equal(h.answer(), undefined);
      assert.doesNotMatch(h.text(), /Old private prompt awaiting refresh/);
      assert.equal(h.input().disabled, false);
      if (transition === "logout") assert.ok(h.signIn());
    } finally { h.restore(); }
  }
});

test("Sentinel retains provider/fallback responses and request-ID service error recovery", async () => {
  const h = await sentinelChatHarness();
  try {
    for (const overrides of [
      { mode: "local-fallback", fallbackReason: "gemini_timeout_or_network" },
      { mode: "gemini-provider-foundation", provider: "gemini" },
    ]) {
      const response = sentinelAnswer("Provider answer", overrides);
      h.respond(insightPath, response);
      await h.submit("Provider question");
      assert.deepEqual(h.answer(), response);
    }
    h.respond(insightPath, {}, 503, "service-request-id");
    await h.submit("Retryable question");
    assert.equal(h.answer(), undefined);
    assert.equal(h.errorId(), "service-request-id");
    assert.match(h.text(), /Return message to composer/);
    assert.equal(h.input().disabled, false);
    h.respond(insightPath, {}, 401);
    h.respond(refreshPath, {}, 503, "refresh-unavailable");
    await h.submit("Refresh service unavailable");
    assert.equal(h.answer(), undefined);
    assert.equal(h.auth.readAuthToken(), "initial", "service failure does not imply logout");
    assert.match(h.text(), /Return message to composer/);
    h.respond(insightPath, sentinelAnswer("Service recovered"));
    await h.submit("Manual retry");
    assert.equal(h.answer().answer, "Service recovered");
  } finally { h.restore(); }
});

test("Deals removes local previews and renders persisted wishlist alert state", async () => {
  const h = await dealsWishlistHarness();
  try {
    assert.doesNotMatch(h.source, /Preview alert|Marked on page|page-only|setAlerts|\[alerts,|function toggleAlert\(/i);
    assert.match(h.source, /alertIsSet=\{findMatchingWishlistItem\(deal, savedWishlistItems\)\?\.alertActive \?\? false\}/);
    assert.match(h.source, /onToggleAlert=\{toggleDealAlert\}/);
    assert.match(h.source, /disabled=\{isSaving\}\s+aria-busy=\{isSaving\}\s+aria-pressed=\{alertIsSet\}/);
    assert.match(h.source, /href="\/login\?returnTo=%2Fdeals"/);
    assert.match(h.source, /<RequestIdSupportText requestId=\{saveMessage.requestId\}/);
    assert.equal((h.source.match(/addMyWishlistItem\(/g) ?? []).length, 1, "Save and Alert share one creation path");
  } finally { h.restore(); }
});

test("Deals enables and pauses existing wishlist alerts using server items and auth retry", async () => {
  const otherItem = { ...alertItem, id: 99, title: "Another Game" };
  const h = await dealsWishlistHarness([alertItem, otherItem]);
  try {
    const enabled = { ...alertItem, alertActive: true, alertEvaluation: { state: "watching", targetReached: false, message: "Watching" } };
    h.respond({}, 401);
    h.respond(enabled);
    await h.handlers.toggleDealAlert(alertDeal);
    assert.deepEqual(h.calls.map(call => [call.method, call.path, call.token, call.body]), [
      ["PATCH", "/api/me/wishlist/42/alert", "Bearer initial", { alertActive: true }],
      ["PATCH", "/api/me/wishlist/42/alert", "Bearer rotated", { alertActive: true }],
    ]);
    assert.equal(h.auth.refreshCalls, 1);
    assert.equal(h.state.authToken, "rotated");
    assert.deepEqual(h.state.savedWishlistItems, [enabled, otherItem]);
    assert.match(alertMessage(h).text, /wishlist alert is enabled/);
    const paused = { ...enabled, alertActive: false, priority: "medium" };
    h.respond(paused);
    await h.handlers.toggleDealAlert(alertDeal);
    assert.deepEqual(h.calls.at(-1).body, { alertActive: false });
    assert.deepEqual(h.state.savedWishlistItems, [paused, otherItem], "replace the complete returned item");
    assert.match(alertMessage(h).text, /wishlist alert is paused/);
    assert.equal(paused.targetPrice, "$5.00", "PATCH does not invent a new target");
    h.respond(paused); // The server remains authoritative even when its setting differs.
    await h.handlers.toggleDealAlert(alertDeal);
    assert.equal(h.state.savedWishlistItems[0].alertActive, false);
    assert.match(alertMessage(h).text, /paused/);
    await h.handlers.saveDeal(alertDeal);
    assert.equal(h.calls.length, 4, "saving an existing item creates no duplicate");
  } finally { h.restore(); }
});

test("unsaved Deals alerts share wishlist creation with Save and block concurrent operations before auth", async () => {
  for (const firstAction of ["saveDeal", "toggleDealAlert"]) {
    const h = await dealsWishlistHarness();
    try {
      let releaseAuth;
      h.auth.pending = new Promise(resolve => { releaseAuth = resolve; });
      const first = h.handlers[firstAction](alertDeal);
      await h.handlers.saveDeal({ ...alertDeal, id: 101, title: " EXAMPLE GAME ", store: " steam " });
      await h.handlers.toggleDealAlert(alertDeal);
      assert.equal(h.calls.length, 0, "lock acquired before auth resolves");
      assert.equal(h.state.savingDeals.size, 1);
      const created = { ...alertItem, alertActive: true, targetPrice: alertDeal.priceNew };
      h.respond(created);
      releaseAuth();
      await first;
      assert.equal(h.calls.length, 1);
      assert.equal(h.calls[0].method, "POST");
      assert.equal(h.calls[0].path, "/api/me/wishlist");
      assert.equal(h.calls[0].body.alertActive, true);
      assert.equal(h.calls[0].body.targetPrice, alertDeal.priceNew);
      assert.deepEqual(h.state.savedWishlistItems, [created]);
      assert.match(alertMessage(h).text, /was saved to your personal wishlist.*alert is enabled/);
      assert.equal(h.refs.savingDealKeys.current.size, 0);
      assert.equal(h.state.savingDeals.size, 0);
    } finally { h.restore(); }
  }
});

test("Deals alert conflict recovery loads the real item and enables a paused alert", async () => {
  for (const active of [false, true]) {
    const h = await dealsWishlistHarness();
    try {
      h.respond({}, 409);
      h.respond([{ ...alertItem, alertActive: active }]);
      const enabled = { ...alertItem, alertActive: true };
      if (!active) h.respond(enabled);
      await h.handlers.toggleDealAlert(alertDeal);
      assert.deepEqual(h.calls.map(call => call.method), active ? ["POST", "GET"] : ["POST", "GET", "PATCH"]);
      if (!active) assert.deepEqual(h.calls.at(-1).body, { alertActive: true });
      assert.deepEqual(h.state.savedWishlistItems, [enabled]);
      assert.match(alertMessage(h).text, /wishlist alert is enabled/);
    } finally { h.restore(); }
  }
});

test("Deals anonymous and failed alert actions never invent local success and retain request IDs", async () => {
  const h = await dealsWishlistHarness();
  try {
    h.auth.token = null;
    await h.handlers.toggleDealAlert(alertDeal);
    assert.equal(h.calls.length, 0);
    assert.deepEqual(h.state.savedWishlistItems, []);
    assert.equal(alertMessage(h).tone, "auth");
    assert.equal(h.state.authChecked, true);

    h.auth.token = "initial";
    h.auth.error = { authDetails: { code: "service_unavailable", status: 503, message: "Auth service unavailable.", requestId: "auth-service-id" } };
    await h.handlers.toggleDealAlert(alertDeal);
    assert.equal(h.calls.length, 0);
    assert.equal(alertMessage(h).tone, "error");
    assert.equal(alertMessage(h).requestId, "auth-service-id");
    assert.match(alertMessage(h).text, /retry from this card/);

    h.auth.error = null;
    h.handlers.storeWishlistItems([alertItem]);
    h.respond({}, 503, "wishlist-service-id");
    await h.handlers.toggleDealAlert(alertDeal);
    assert.deepEqual(h.state.savedWishlistItems, [alertItem]);
    assert.equal(alertMessage(h).tone, "error");
    assert.equal(alertMessage(h).requestId, "wishlist-service-id");
    assert.match(alertMessage(h).text, /retry from this card/);

    h.respond({}, 401);
    h.respond({}, 401, "expired-session-id");
    await h.handlers.toggleDealAlert(alertDeal);
    assert.equal(h.auth.refreshCalls, 1);
    assert.equal(h.auth.clearCalls, 1);
    assert.equal(h.state.authToken, null);
    assert.deepEqual(h.state.savedWishlistItems, []);
    assert.equal(alertMessage(h).tone, "auth");
    assert.equal(alertMessage(h).requestId, "expired-session-id");
    assert.match(alertMessage(h).text, /Sign in again/);
    assert.equal(h.state.savingDeals.size, 0);
  } finally { h.restore(); }
});

test("Deals ignores stale sync and unmounted or signed-out mutation responses", async () => {
  const h = await dealsWishlistHarness([alertItem]);
  try {
    const finishSync = h.defer();
    const cleanup = h.runSync();
    const enabled = { ...alertItem, alertActive: true };
    h.respond(enabled);
    await h.handlers.toggleDealAlert(alertDeal);
    finishSync([alertItem]);
    await settle();
    assert.deepEqual(h.state.savedWishlistItems, [enabled], "old GET cannot replace the PATCH result");
    cleanup();
    h.respond([enabled]);
    const stopSync = h.runSync();
    await settle();
    assert.deepEqual(h.state.savedWishlistItems, [enabled], "later sync still reconciles normally");
    stopSync();

    const finishPatch = h.defer();
    const pending = h.handlers.toggleDealAlert(alertDeal);
    await settle();
    await h.handlers.toggleDealAlert(alertDeal);
    assert.equal(h.calls.length, 4, "concurrent PATCH is suppressed");
    h.auth.token = null;
    h.handlers.storeWishlistItems([]);
    finishPatch(alertItem);
    await pending;
    assert.deepEqual(h.state.savedWishlistItems, [], "sign-out rejects the old session result");

    h.auth.token = "initial";
    const finishPost = h.defer();
    const saving = h.handlers.saveDeal(alertDeal);
    await settle();
    h.refs.mounted.current = false;
    finishPost(enabled);
    await saving;
    assert.deepEqual(h.state.savedWishlistItems, [], "unmount rejects the mutation result");
    assert.equal(h.refs.savingDealKeys.current.size, 0);
  } finally { h.restore(); }
});

test("giveaway reminders retain their preview-only behavior", async () => {
  const giveawaysSource = await readFile(new URL("../src/components/GiveawaysExplorer.tsx", import.meta.url), "utf8");
  assert.match(giveawaysSource, /no reminder is saved and no notification will be sent/);
  assert.doesNotMatch(giveawaysSource, /\{reminderIsSet \? "Reminder set" : "Add reminder"\}/);
  assert.match(giveawaysSource, /No verified claim destination/);
});

async function dealCardControls() {
  const source = await readFile(new URL("../src/components/DealsExplorer.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("deals.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ["safeCheapSharkDealUrl", "statusClass", "dealStateKey", "STATUS_TONE_CLASS", "SAVE_TONE_CLASS", "DealCard"];
  const program = names.map(name => {
    const node = ast.statements.find(statement =>
      (ts.isFunctionDeclaration(statement) && statement.name?.text === name) ||
      (ts.isVariableStatement(statement) && statement.declarationList.declarations.some(item => item.name.getText(ast) === name)));
    assert.ok(node, `missing production declaration ${name}`);
    return node.getText(ast);
  }).join("\n");
  const output = ts.transpileModule(program, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const mocks = {
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
    styles: new Proxy({}, { get: (_, key) => key }), hasAvailableDealRating,
    Link: "Link", RequestIdSupportText: "RequestIdSupportText",
  };
  const { DealCard, safeCheapSharkDealUrl } = new Function(...Object.keys(mocks), `${output}\nreturn { DealCard, safeCheapSharkDealUrl };`)(...Object.values(mocks));
  const viewControl = (deal, onFindOffers = () => {}) => {
    const tree = DealCard({ deal, onFindOffers, alertIsSet: false, isSaved: false, isSaving: false });
    const find = node => {
      if (!node || typeof node !== "object") return;
      if (["a", "button"].includes(node.type) && node.props.children.includes("View Deal")) return node;
      for (const child of node.props?.children ?? []) {
        const result = find(child);
        if (result) return result;
      }
    };
    const control = find(tree);
    assert.ok(control, "card renders View Deal");
    return control;
  };
  return { source, safeCheapSharkDealUrl, viewControl };
}

test("Deals provider URL validation continues to reject unsafe or unverified destinations", async () => {
  const { safeCheapSharkDealUrl } = await dealCardControls();
  const verified = "https://www.cheapshark.com/redirect?dealID=verified%2Fid";
  assert.equal(safeCheapSharkDealUrl(`  ${verified}  `), verified);
  for (const value of [
    undefined, null, "", "  ", {}, "not a URL", "javascript:alert(1)",
    "http://www.cheapshark.com/redirect?dealID=1",
    "https://cheapshark.com/redirect?dealID=1",
    "https://www.cheapshark.com.evil.example/redirect?dealID=1",
    "https://www.cheapshark.com@evil.example/redirect?dealID=1",
    "https://user:password@www.cheapshark.com/redirect?dealID=1",
    "https://www.cheapshark.com:8443/redirect?dealID=1",
    "https://www.cheapshark.com/redirect/other?dealID=1",
    "https://www.cheapshark.com/redirect", "https://www.cheapshark.com/redirect?dealID=",
    "https://www.cheapshark.com/redirect?dealID=%20",
    "https://store.steampowered.com/app/123", "https://store.epicgames.com/p/example",
    "https://www.gog.com/game/example",
  ]) assert.equal(safeCheapSharkDealUrl(value), null, `reject ${String(value)}`);
});

test("Deals View Deal preserves verified anchors and makes missing or unsafe URLs actionable searches", async () => {
  const { viewControl, source } = await dealCardControls();
  const verified = "https://www.cheapshark.com/redirect?dealID=verified-id";
  const anchor = viewControl({ ...alertDeal, dealUrl: verified });
  assert.equal(anchor.type, "a");
  assert.equal(anchor.props.href, verified);
  assert.equal(anchor.props.target, "_blank");
  assert.equal(anchor.props.rel, "noopener noreferrer sponsored");
  assert.match(anchor.props["aria-label"], /in a new tab/);
  assert.equal(anchor.props.onClick, undefined, "verified links retain native navigation");

  for (const dealUrl of [undefined, null, "", "https://store.steampowered.com/app/123", "javascript:alert(1)"]) {
    const selectedTitles = [];
    const button = viewControl({ ...alertDeal, dealUrl }, title => selectedTitles.push(title));
    assert.equal(button.type, "button");
    assert.equal(button.props.type, "button");
    assert.ok(!button.props.disabled, "fallback View Deal is actionable");
    assert.equal(button.props["aria-label"], `Find current offers for ${alertDeal.title}`);
    assert.match(button.props.title, /Search External Offers/);
    assert.equal(button.props.href, undefined, "no guessed store URL");
    button.props.onClick();
    assert.deepEqual(selectedTitles, [alertDeal.title]);
  }
  assert.doesNotMatch(source, /Store redirects are planned|unavailable for this curated preview/);
  assert.match(source, /onFindOffers=\{findCurrentOffers\}/);
  assert.match(source, /ref=\{sourcePanelRef\}\s+tabIndex=\{-1\}/);
});

test("wishlist and curated View Deal share the existing external title search", async () => {
  const [wishlistSource, dealsSource] = await Promise.all([
    readFile(new URL("../src/components/WishlistExplorer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/DealsExplorer.tsx", import.meta.url), "utf8"),
  ]);
  const parse = source => ts.createSourceFile("component.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const wishlistAst = parse(wishlistSource);
  const dealsAst = parse(dealsSource);
  const find = (node, predicate) => {
    if (predicate(node)) return node;
    return ts.forEachChild(node, child => find(child, predicate));
  };
  const viewControl = find(wishlistAst, node => ts.isJsxElement(node) &&
    node.children.some(child => ts.isJsxText(child) && child.text.trim() === "View Deal"));
  assert.ok(viewControl, "wishlist must expose a View Deal control");
  assert.equal(viewControl.openingElement.tagName.getText(wishlistAst), "Link");
  const attributes = viewControl.openingElement.attributes.properties;
  assert.ok(!attributes.some(attribute => attribute.name?.getText(wishlistAst) === "disabled"));
  const href = attributes.find(attribute => attribute.name?.getText(wishlistAst) === "href");
  const makeHref = new Function("item", `return ${href.initializer.expression.getText(wishlistAst)};`);
  for (const title of ["Elden Ring", "A & B + C/#?=100%", "遊戲 🎮", " title "]) {
    const url = new URL(makeHref({ title }), "https://nexora.example");
    assert.equal(url.pathname, "/deals");
    assert.equal(url.searchParams.get("title"), title);
    assert.equal(url.hash, "#deal-search");
    assert.deepEqual([...url.searchParams.keys()], ["title"]);
  }

  const explorer = dealsAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "DealsExplorer");
  const declaration = (name, statements = explorer.body.statements) => {
    const node = statements.find(statement =>
      (ts.isFunctionDeclaration(statement) && statement.name?.text === name) ||
      (ts.isVariableStatement(statement) && statement.declarationList.declarations.some(item => item.name.getText(dealsAst) === name)));
    assert.ok(node, `missing ${name}`);
    return node.getText(dealsAst);
  };
  // Execute the production query effect and request handlers with controlled
  // hooks and promises, without introducing a browser/test-renderer dependency.
  const names = ["loadExternalDeals", "searchExternalTitle", "findCurrentOffers", "selectMode", "submitExternalSearch", "clearExternalSearch"];
  const program = [declaration("DealSearchQuery", dealsAst.statements), ...names.map(name => declaration(name))].join("\n");
  const { outputText } = ts.transpileModule(program, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  const state = { mode: "curated", externalTitle: "", externalStatus: "idle" };
  const setters = Object.fromEntries(["mode", "externalTitle", "externalStatus", "activeExternalTitle", "activeFilter", "searchQuery", "externalDeals"].map(key => [
    `set${key[0].toUpperCase()}${key.slice(1)}`,
    value => { state[key] = typeof value === "function" ? value(state[key]) : value; },
  ]));
  const requests = [];
  const requestVersion = { current: 0 };
  const mounted = { current: true };
  let params = new URLSearchParams();
  let effect;
  let dependencies;
  const offerFocusCalls = [];
  const sourcePanelRef = { current: {
    scrollIntoView: options => offerFocusCalls.push(["scroll", options]),
    focus: options => offerFocusCalls.push(["focus", options]),
  } };
  const mocks = {
    ...setters, requestVersion, mounted, sourcePanelRef,
    useCallback: callback => callback,
    useSearchParams: () => params,
    useEffect: (callback, deps) => { effect = callback; dependencies = deps; },
    getExternalDeals: options => new Promise(resolve => requests.push({ options, resolve })),
    // These represent the values read by the existing manual handlers.
    externalTitle: " Manual Title ", mode: "curated", externalStatus: "idle",
  };
  const handlers = new Function(...Object.keys(mocks), `${outputText}\nreturn { DealSearchQuery, ${names.join(", ")} };`)(...Object.values(mocks));
  assert.match(dealsSource, /<Suspense fallback=\{null\}>\s*<DealSearchQuery onSearch=\{searchExternalTitle\}/);
  assert.equal((dealsSource.match(/\bgetExternalDeals\(\{/g) ?? []).length, 1, "query and manual searches share one provider path");
  const setup = search => {
    params = new URLSearchParams(search);
    handlers.DealSearchQuery({ onSearch: handlers.searchExternalTitle });
    return effect();
  };
  for (const search of ["", "title=", "title=+%20+"]) {
    setup(search);
    await Promise.resolve();
    assert.equal(requests.length, 0, "absent or blank titles preserve curated browsing");
    assert.equal(state.mode, "curated");
  }
  const title = "A & B + C/#?=100% 🎮";
  const search = `title=${encodeURIComponent(`  ${title}  `)}&title=ignored`;
  const cleanup = setup(search);
  cleanup(); // Strict Mode replays effect setup after cleanup.
  setup(search);
  await Promise.resolve();
  assert.equal(requests.length, 1, "Strict Mode replay must start only one provider request");
  assert.deepEqual(requests[0].options, { pageSize: 12, title });
  assert.equal(state.mode, "external");
  assert.equal(state.externalTitle, title);
  assert.equal(state.externalStatus, "loading");
  assert.deepEqual(dependencies, [handlers.searchExternalTitle, title]);
  requests[0].resolve({ source: "external-api", deals: [{ id: 1 }] });
  await Promise.resolve();
  assert.equal(state.externalStatus, "ready");
  assert.deepEqual(state.externalDeals, [{ id: 1 }]);

  setup(`title=${"x".repeat(100)}`); // A later query navigation is consumed too.
  await Promise.resolve();
  assert.equal(state.externalTitle.length, 80);
  assert.equal(requests[1].options.title.length, 80);
  const manual = handlers.loadExternalDeals(" New title ");
  requests[1].resolve({ source: "external-api", deals: [{ id: 2 }] });
  await Promise.resolve();
  assert.equal(state.externalStatus, "loading", "older query response must not replace a manual request");
  requests[2].resolve({ source: "fallback", deals: [{ id: 3 }] });
  await manual;
  assert.equal(state.externalStatus, "fallback");
  assert.deepEqual(state.externalDeals, []);

  handlers.selectMode("external");
  assert.deepEqual(requests[3].options, { pageSize: 12, title: "Manual Title" });
  handlers.selectMode("curated");
  requests[3].resolve({ source: "external-api", deals: [{ id: 4 }] });
  await Promise.resolve();
  assert.equal(state.mode, "curated");
  assert.deepEqual(state.externalDeals, [], "curated selection invalidates the pending response");
  let prevented = false;
  handlers.submitExternalSearch({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(requests[4].options.title, "Manual Title");
  handlers.clearExternalSearch();
  assert.equal(state.externalTitle, "");
  assert.deepEqual(requests[5].options, { pageSize: 12, title: undefined });
  mounted.current = false;
  requests[4].resolve({ source: "external-api", deals: [{ id: 5 }] });
  requests[5].resolve({ source: "external-api", deals: [{ id: 6 }] });
  await Promise.resolve();
  assert.deepEqual(state.externalDeals, [], "unmounted requests cannot update the feed");
  const cancelled = setup("title=cancelled");
  cancelled();
  await Promise.resolve();
  assert.equal(requests.length, 6, "cleanup cancels a queued query request");

  const focusEffect = explorer.body.statements.find(statement =>
    ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression) &&
    statement.expression.expression.getText(dealsAst) === "useEffect" &&
    statement.expression.arguments[0].getText(dealsAst).includes("scrollIntoView"));
  assert.ok(focusEffect, "the deals hash shortcut retains its focus effect");
  const focusProgram = ts.transpileModule(focusEffect.getText(dealsAst), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const focusCalls = [];
  class Input {
    scrollIntoView(options) { focusCalls.push(["scroll", options]); }
    focus(options) { focusCalls.push(["focus", options]); }
  }
  const frames = new Map();
  let frameId = 0;
  const windowMock = {
    location: { hash: "#deal-search" },
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
  };
  const runFocusEffect = new Function("useEffect", "mounted", "window", "document", "HTMLInputElement", focusProgram);
  const focusSetup = () => {
    let cleanup;
    runFocusEffect(callback => { cleanup = callback(); }, mounted, windowMock, {
      getElementById: id => { assert.equal(id, "deal-search"); return new Input(); },
    }, Input);
    return cleanup;
  };
  focusSetup()();
  const stopFocus = focusSetup();
  assert.equal(frames.size, 1, "Strict Mode cancels the first focus frame");
  [...frames.values()][0]();
  assert.deepEqual(focusCalls, [
    ["scroll", { behavior: "smooth", block: "center" }],
    ["focus", { preventScroll: true }],
  ]);
  stopFocus();
  windowMock.location.hash = "";
  focusSetup()();
  assert.equal(frames.size, 0, "ordinary /deals navigation does not force focus");

  mounted.current = true;
  const { viewControl: renderViewControl } = await dealCardControls();
  const selectedTitle = "A & B + C/#?=100% 🎮";
  const fallbackButton = renderViewControl({ ...alertDeal, title: selectedTitle }, handlers.findCurrentOffers);
  fallbackButton.props.onClick();
  assert.equal(requests.length, 7, "card click starts one request through the shared search path");
  assert.deepEqual(requests[6].options, { pageSize: 12, title: selectedTitle });
  assert.equal(state.mode, "external");
  assert.equal(state.externalTitle, selectedTitle);
  assert.equal(state.activeExternalTitle, selectedTitle);
  assert.equal(state.externalStatus, "loading");
  assert.equal(state.activeFilter, "All Stores");
  assert.equal(state.searchQuery, "");
  assert.deepEqual(offerFocusCalls, [["scroll", { block: "center" }], ["focus", { preventScroll: true }]]);

  // A later manual search supersedes the card request through the same guard.
  handlers.submitExternalSearch({ preventDefault() {} });
  assert.equal(requests[7].options.title, "Manual Title");
  requests[6].resolve({ source: "external-api", deals: [{ id: 7 }] });
  await Promise.resolve();
  assert.equal(state.externalStatus, "loading");
  assert.deepEqual(state.externalDeals, [], "stale card search cannot replace a newer manual search");
  requests[7].resolve({ source: "external-api", deals: [{ id: 8 }] });
  await Promise.resolve();
  assert.equal(state.externalStatus, "ready");
  assert.deepEqual(state.externalDeals, [{ id: 8 }]);

  sourcePanelRef.current = null; // Search still works if the panel has unmounted.
  handlers.findCurrentOffers("Provider unavailable");
  assert.deepEqual(requests[8].options, { pageSize: 12, title: "Provider unavailable" });
  requests[8].resolve({ source: "fallback", deals: [{ id: 9 }] });
  await Promise.resolve();
  assert.equal(state.externalStatus, "fallback");
  assert.deepEqual(state.externalDeals, [], "unavailable provider retains curated fallback behavior");
});

test("homepage feed maps the current backend deal, giveaway, and dashboard DTO fields", () => {
  const deal = mapDeal({
    id: 17,
    store: "Steam",
    discount: "-75%",
    discountValue: 75,
    title: "Example Deal",
    priceOld: "$39.99",
    priceNew: "$9.99",
    priceValue: 9.99,
    dealUrl: "https://store.example/deal",
  });
  assert.deepEqual(deal, {
    id: "17",
    title: "Example Deal",
    store: "Steam",
    salePrice: "$9.99",
    normalPrice: "$39.99",
    discountPercent: 75,
    href: "https://store.example/deal",
  });

  const giveaway = mapGiveaway({
    id: 4,
    platform: "steam",
    platformLabel: "Steam",
    title: "Example Giveaway",
    originalPrice: "$24.99",
  });
  assert.equal(giveaway?.platform, "Steam");
  assert.equal(giveaway?.worth, "$24.99");

  const summary = mapSummary({
    activeDealsCount: 28,
    activeGiveawaysCount: 6,
    wishlistItemsCount: 3,
    activePriceAlertsCount: 2,
    bestDiscountValue: 75,
    bestDiscountTitle: "Example Deal",
    databaseStatus: "online",
    sentinelStatus: "available",
  });
  assert.deepEqual(summary, {
    deals: 28,
    giveaways: 6,
    stores: null,
    wishlistItems: 3,
    activePriceAlerts: 2,
    bestDiscountPercent: 75,
    bestDiscountTitle: "Example Deal",
    databaseStatus: "online",
    sentinelStatus: "available",
  });
  assert.equal(getHomeSummaryAvailability("ready", false, summary), "available");
  assert.equal(HOME_FEED_REQUEST_TIMEOUT_MS, 5_000);
});

test("homepage summary distinguishes incomplete and unavailable responses", () => {
  const incomplete = mapSummary({ activeDealsCount: 4 });
  assert.equal(incomplete.deals, 4);
  assert.equal(incomplete.giveaways, null);
  assert.equal(getHomeSummaryAvailability("ready", false, incomplete), "incomplete");
  assert.equal(getHomeSummaryAvailability("ready", true, incomplete), "unavailable");
});

test("settings uses the persisted notification preference workflow shared with wishlist", async () => {
  const [settingsSource, wishlistSource, panelSource] = await Promise.all([
    readFile(new URL("../src/components/SettingsCenter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/WishlistExplorer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/NotificationPreferencesPanel.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(settingsSource, /import NotificationPreferencesPanel/);
  assert.match(settingsSource, /<NotificationPreferencesPanel/);
  assert.doesNotMatch(settingsSource, /Open wishlist preferences/);
  assert.doesNotMatch(settingsSource, /managed from Wishlist/);

  assert.match(wishlistSource, /import NotificationPreferencesPanel/);
  assert.match(wishlistSource, /<NotificationPreferencesPanel/);

  assert.match(panelSource, /getMyNotificationPreferences/);
  assert.match(panelSource, /updateMyNotificationPreferences/);
  assert.match(panelSource, /Preferences saved to your account/);
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
