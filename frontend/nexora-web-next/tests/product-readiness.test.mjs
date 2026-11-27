import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

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
  isExternalHref,
  loadHomeFeed,
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
  const clientSource = await readFile(new URL("../src/lib/auth-client.ts", import.meta.url), "utf8");
  const clientAst = ts.createSourceFile("auth-client.ts", clientSource, ts.ScriptTarget.Latest, true);
  const sharedNames = ["AuthSessionInvalidatedError", "isAuthSessionInvalidatedError", "assertAuthSessionRevision", "assertAuthOperation", "withAuthSessionRetry"];
  const sharedSource = clientAst.statements.filter(node => sharedNames.includes(node.name?.text))
    .map(node => node.getText(clientAst)).join("\n");
  const sharedRuntime = ts.transpileModule(sharedSource, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const authUrl = `data:text/javascript,${encodeURIComponent(`
    export const controls = { revision: 0, token: "initial", refreshedToken: "rotated", refreshCalls: 0, clearCalls: 0, error: null, pending: null };
    ${sharedRuntime}
    export const readAuthSessionRevision = () => controls.revision;
    export const readAuthToken = () => controls.token;
    export const clearAuthToken = () => { controls.clearCalls++; controls.token = null; controls.revision++; };
    export const ensureAuthToken = async (options = {}) => {
      if (controls.pending) await controls.pending;
      if (controls.error) throw controls.error;
      if (options.forceRefresh) { controls.refreshCalls++; controls.token = controls.refreshedToken; }
      return controls.token;
    };
  `)}`;
  const auth = await import(authUrl);
  Object.assign(auth.controls, { revision: 0, token: "initial", refreshedToken: "rotated", refreshCalls: 0, clearCalls: 0, error: null, pending: null });
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
    wishlistDataGeneration: { current: 0 }, setView() {},
  };
  const mocks = {
    ...setters, ...refs, ...auth, ...wishlist, displayedDealScope: "curated",
    wishlistLifetime: { current: {} }, renderSessionRevision: auth.readAuthSessionRevision(),
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
  const wishlist = await import(await moduleUrl("../src/lib/user-wishlist.ts", {
    "@/lib/auth-client": clientUrl, "@/lib/api-client": apiUrl,
    "@/data/wishlist": await moduleUrl("../src/data/wishlist.ts"),
  }));
  const preferences = await import(await moduleUrl("../src/lib/user-notification-preferences.ts", {
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
  const storageValues = new Map();
  eventTarget.localStorage = {
    getItem: key => storageValues.get(key) ?? null,
    removeItem: key => { storageCalls.push(["remove", key]); storageValues.delete(key); },
    setItem: (key, value) => { storageCalls.push(["set", key, value]); storageValues.set(key, value); },
  };
  eventTarget.requestAnimationFrame = callback => { callback(); return 1; };
  globalThis.window = eventTarget;
  const calls = [];
  const responses = [];
  globalThis.fetch = async (url, init) => {
    const path = new URL(url).pathname;
    calls.push({ path, method: init.method, token: init.headers?.Authorization, body: init.body ? JSON.parse(init.body) : undefined });
    if (path.endsWith("/csrf")) return Response.json({ csrfToken: "a".repeat(43) });
    const index = responses.findIndex(next => next.path === path);
    assert.ok(index >= 0, `unexpected protected/auth request ${path}`);
    const [next] = responses.splice(index, 1);
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
    auth, authApi: await import(authUrl), sentinel, wishlist, preferences, calls, storageCalls, storageValues, render,
    answer: () => { render(); return find(node => node.type.name === "GatewayResponseCard")?.props.response; },
    input: () => { render(); return find(node => node.props.id === "sentinel-message").props; },
    signIn: () => { render(); return find(node => node.props.href === "/login?returnTo=%2Fsentinel"); },
    errorId: () => { render(); return find(node => node.type === "RequestIdSupportText")?.props.requestId; },
    text: () => { render(); return JSON.stringify(tree); },
    prepareSubmit(message) {
      render();
      const input = find(node => node.props.id === "sentinel-message").props;
      if (!input.disabled) input.onChange({ target: { value: message } });
      render();
      const submit = find(node => node.type === "form").props.onSubmit;
      return () => submit({ preventDefault() {} });
    },
    submit(message) { return this.prepareSubmit(message)(); },
    dispose() { cells.forEach(cell => cell.cleanup?.()); },
    respond(path, value, status = 200, requestId = null, refreshCookie = null) {
      const headers = requestId ? { "X-NEXORA-Request-ID": requestId } : {};
      if (refreshCookie) headers["Set-Cookie"] = refreshCookie;
      responses.push({ path, reply: () => status === 204 ? new Response(null, { status, headers }) : Response.json(value, { status, headers }) });
    },
    respondUsing: (path, reply) => responses.push({ path, reply }),
    defer(path) {
      let resolve;
      let reject;
      const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
      responses.push({ path, reply: () => promise });
      const reply = (value, status = 200, requestId = null, refreshCookie = null) => {
        const headers = requestId ? { "X-NEXORA-Request-ID": requestId } : {};
        if (refreshCookie) headers["Set-Cookie"] = refreshCookie;
        resolve(status === 204 ? new Response(null, { status, headers }) : Response.json(value, { status, headers }));
      };
      reply.reject = error => reject(error);
      return reply;
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

const preferencePath = "/api/me/notification-preferences";
const wishlistPath = "/api/me/wishlist";
const persistedPreferences = {
  emailEnabled: false, inAppEnabled: true, targetReachedEnabled: true,
  priceDropEnabled: true, freeGameEnabled: false,
};

// Extract actual component handlers, retaining their success/error callbacks.
async function accountOperationHandlers(h) {
  const state = {
    added: [], authRequired: 0, changedTokens: [], resets: 0,
    message: null, isSubmitting: false, isSaving: false,
    savedPreferences: { ...persistedPreferences, emailEnabled: true },
    draftPreferences: { ...persistedPreferences, emailEnabled: true },
    preferenceSessionRevision: h.auth.readAuthSessionRevision(),
    personalItems: [{ ...alertItem, title: "Account B item" }],
    alerts: { [alertItem.id]: false }, itemMessages: {}, operationMessage: null,
    updatingIds: new Set(), deletingIds: new Set(),
    priceHistory: [], priceHistoryState: "idle", loadState: "idle",
    alertEvents: [], alertEventsLoading: false, alertEventsMessage: null,
    savedWishlistItems: [], saveMessages: {}, savingDeals: new Set(),
    authChecked: true, authToken: "initial", wishlistSyncRevision: 0,
  };
  const setters = Object.fromEntries(Object.keys(state).map(key => [
    `set${key[0].toUpperCase()}${key.slice(1)}`,
    value => { state[key] = typeof value === "function" ? value(state[key]) : value; },
  ]));
  const mocks = {
    ...h.auth, ...h.wishlist, ...h.preferences, ...setters,
    token: "initial", authToken: "initial", view: "personal",
    lifetime: { current: { active: true, generation: 0 } }, pendingSubmission: { current: false },
    renderSessionRevision: h.auth.readAuthSessionRevision(),
    historyOwner: { current: { active: true, item: alertItem, sessionRevision: h.auth.readAuthSessionRevision() } },
    historyRequestVersion: { current: 0 },
    updatingIds: new Set(), deletingIds: new Set(),
    draftPreferences: persistedPreferences, hasChanges: true, isSaving: false,
    preferenceSessionRevision: state.preferenceSessionRevision,
    onAdded: item => state.added.push(item),
    onTokenChanged: token => state.changedTokens.push(token),
    onAuthenticationRequired: () => { state.authRequired++; h.auth.clearAuthToken(); },
    handleAuthenticationRequired: () => { state.authRequired++; h.auth.clearAuthToken(); },
    refreshAlertEvents: () => {},
    active: true, requestVersion: 0, item: alertItem, priceHistoryState: "idle", PRICE_HISTORY_REQUEST_LIMIT: 12,
    alertEventsRequestVersion: { current: 0 },
    wishlistGridRef: { current: null }, pendingDeleteFocus: { current: null },
    wishlistDataGeneration: { current: 0 }, mutationOwners: { current: new Map() },
    consumerLifetime: { active: true }, consumerSessionRevision: h.auth.readAuthSessionRevision(),
    readAuthSessionRevision: h.auth.readAuthSessionRevision,
    preferenceDataGeneration: { current: 0 },
    preferenceMutationListeners: new Set(),
    pendingPreferenceSaves: new Set(),
    preferenceSaveListeners: new Set(),
    useCallback: callback => callback, displayedDealScope: "curated",
    savingDealKeys: { current: new Set() }, savedWishlistItemsRef: { current: [] },
    wishlistVersion: { current: 0 }, mounted: { current: true }, wishlistLifetime: { current: {} },
    normalizeAuthError: h.authApi.normalizeAuthError,
    protectedWishlistError: h.wishlist.normalizeUserWishlistError,
    normalizeTargetPriceInput: value => value,
    FormData: class {
      get(name) { return { title: "Account A private title", currentPrice: "$10.00", targetPrice: "$5.00", store: "Steam", priority: "high", status: "tracking", alertActive: "on" }[name]; }
    },
  };
  async function extract(file, componentName, names, topLevelNames = []) {
    const source = await readFile(new URL(`../src/components/${file}`, import.meta.url), "utf8");
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const component = ast.statements.find(node => node.name?.text === componentName);
    const declarations = [];
    function collect(node) {
      if ((ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) ||
        (ts.isVariableStatement(node) && node.declarationList.declarations.some(item => names.includes(item.name.getText(ast))))) declarations.push(node);
      else ts.forEachChild(node, collect);
    }
    collect(component);
    const program = [
      ...ast.statements.filter(node => topLevelNames.includes(node.name?.text)),
      ...declarations,
    ].map(node => node.getText(ast)).join("\n");
    const output = ts.transpileModule(program, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    return new Function(...Object.keys(mocks), `${output}\nreturn { ${names.join(", ")} };`)(...Object.values(mocks));
  }
  return {
    state,
    ...await extract("AddWishlistItemForm.tsx", "AddWishlistItemForm", ["handleSubmit"], ["readRequiredText"]),
    ...await extract("NotificationPreferencesPanel.tsx", "NotificationPreferencesPanel", ["authSessionRevision", "savePreferences", "loadPreferences"]),
    ...await extract("WishlistExplorer.tsx", "WishlistExplorer", ["handleAlertUpdate", "handleDelete", "refreshAlertEvents"], ["requestCurrentWishlistSnapshot"]),
    ...await extract("WishlistExplorer.tsx", "WishlistCard", ["loadPriceHistory"]),
    ...await extract("DealsExplorer.tsx", "DealsExplorer", ["saveDeal", "storeWishlistItems"],
      ["protectedWishlistError", "normalizedWishlistValue", "findMatchingWishlistItem", "dealStateKey", "wishlistOperationKey", "wishlistPayloadFor"]),
    event: { preventDefault() {}, currentTarget: { reset: () => { state.resets++; } } },
  };
}

test("wishlist and preference helpers reject late success/401/failure across logout, account switch and explicit same-user login", async () => {
  for (const domain of ["wishlist", "preferences"]) {
    for (const transition of ["logout", "other-account", "new-same-account-session"]) {
      for (const status of [200, 401, 503]) {
        const h = await sentinelChatHarness();
        try {
          const path = domain === "wishlist" ? wishlistPath : preferencePath;
          const reply = h.defer(path);
          const operation = domain === "wishlist"
            ? h.wishlist.withWishlistAuthRetry("initial", token => h.wishlist.addMyWishlistItem(token, { title: "A private title", store: "Steam", currentPrice: "$10.00", targetPrice: "$5.00" }))
            : h.preferences.withNotificationPreferenceAuthRetry("initial", token => h.preferences.updateMyNotificationPreferences(token, persistedPreferences));
          // Attach rejection handling before ending the originating session.
          const rejected = assert.rejects(operation, error => h.auth.isAuthSessionInvalidatedError(error));
          if (transition === "logout") {
            h.respond("/api/auth/logout", {});
            await h.auth.logout();
          } else {
            h.auth.startAuthSession(sentinelSession(transition === "other-account" ? 2 : 1, "replacement"));
          }
          const revision = h.auth.readAuthSessionRevision();
          reply(domain === "wishlist" ? alertItem : persistedPreferences, status);
          await rejected;
          assert.deepEqual(h.calls.filter(call => call.path === path).map(call => call.token), ["Bearer initial"]);
          assert.equal(h.auth.readAuthToken(), transition === "logout" ? null : "replacement");
          assert.equal(h.auth.readAuthSessionRevision(), revision, "stale failure must not end replacement session");
          assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
        } finally { h.restore(); }
      }
    }
  }
});

test("production add, preference save, wishlist PATCH and delete handlers discard old-account completions without callbacks or success feedback", async () => {
  for (const action of ["add", "preferences", "update", "delete"]) {
    for (const status of [200, 401, 503]) {
      const h = await sentinelChatHarness();
      try {
        const handlers = await accountOperationHandlers(h);
        const path = action === "preferences" ? preferencePath : action === "update"
          ? `${wishlistPath}/${alertItem.id}/alert` : action === "delete" ? `${wishlistPath}/${alertItem.id}` : wishlistPath;
        const reply = h.defer(path);
        const operation = action === "add" ? handlers.handleSubmit(handlers.event)
          : action === "preferences" ? handlers.savePreferences(handlers.event)
          : action === "update" ? handlers.handleAlertUpdate(alertItem, { alertActive: true }, "Alert enabled")
          : handlers.handleDelete(alertItem);
        h.auth.clearAuthToken();
        h.auth.startAuthSession(sentinelSession(2, "account-b"));
        const revision = h.auth.readAuthSessionRevision();
        const before = structuredClone(handlers.state);
        reply(action === "preferences" ? persistedPreferences : { ...alertItem, alertActive: true }, status);
        await operation;
        const state = handlers.state;
        assert.deepEqual(state.personalItems, before.personalItems);
        assert.deepEqual(state.alerts, before.alerts);
        assert.deepEqual(state.savedPreferences, before.savedPreferences);
        assert.deepEqual(state.draftPreferences, before.draftPreferences);
        assert.deepEqual(state.added, []);
        assert.deepEqual(state.changedTokens, []);
        assert.equal(state.authRequired, 0);
        assert.equal(state.resets, 0);
        assert.equal(state.message, null);
        assert.equal(state.operationMessage, null);
        assert.deepEqual(state.itemMessages, {});
        assert.equal(h.auth.readAuthToken(), "account-b");
        assert.equal(h.auth.readAuthSessionRevision(), revision);
        assert.equal(h.calls.filter(call => call.path === path).length, 1);
      } finally { h.restore(); }
    }
  }
});

test("wishlist and preference retries share a coalesced same-user refresh and preserve the session revision", async () => {
  const h = await sentinelChatHarness();
  try {
    const revision = h.auth.readAuthSessionRevision();
    const wishlistReply = h.defer(wishlistPath);
    const preferenceReply = h.defer(preferencePath);
    const a = h.wishlist.withWishlistAuthRetry("initial", token => h.wishlist.addMyWishlistItem(token, { title: "Title", store: "Steam", currentPrice: "$10", targetPrice: "$5" }));
    const b = h.preferences.withNotificationPreferenceAuthRetry("initial", token => h.preferences.updateMyNotificationPreferences(token, persistedPreferences));
    const refreshReply = h.defer(refreshPath);
    wishlistReply({}, 401);
    preferenceReply({}, 401);
    await settle();
    assert.equal(h.calls.filter(call => call.path === refreshPath).length, 1);
    h.respond(wishlistPath, alertItem);
    h.respond(preferencePath, persistedPreferences);
    refreshReply(sentinelSession(1, "rotated"));
    const results = await Promise.all([a, b]);
    assert.deepEqual(results.map(result => result.token), ["rotated", "rotated"]);
    assert.deepEqual(results.map(result => result.sessionRevision), [revision, revision]);
    assert.deepEqual(results.map(result => result.value), [alertItem, persistedPreferences]);
    assert.equal(h.auth.readAuthSessionRevision(), revision);
    assert.deepEqual(h.calls.filter(call => [wishlistPath, preferencePath].includes(call.path)).map(call => call.token),
      ["Bearer initial", "Bearer initial", "Bearer rotated", "Bearer rotated"]);
  } finally { h.restore(); }
});

test("protected read handlers discard late account-A history/events/preferences without touching B state or auth", async () => {
  for (const action of ["history", "events", "preferences"]) {
    for (const status of [200, 401]) {
      const h = await sentinelChatHarness();
      try {
        const handlers = await accountOperationHandlers(h);
        const path = action === "preferences" ? preferencePath : action === "history"
          ? `${wishlistPath}/${alertItem.id}/price-history` : `${wishlistPath}/alert-events`;
        const reply = h.defer(path);
        const operation = action === "preferences" ? handlers.loadPreferences()
          : action === "history" ? handlers.loadPriceHistory() : handlers.refreshAlertEvents("initial");
        h.auth.startAuthSession(sentinelSession(2, "account-b"));
        const before = structuredClone(handlers.state);
        reply(action === "preferences" ? persistedPreferences : [], status);
        await operation;
        assert.deepEqual(handlers.state.savedPreferences, before.savedPreferences);
        assert.deepEqual(handlers.state.draftPreferences, before.draftPreferences);
        assert.deepEqual(handlers.state.priceHistory, before.priceHistory);
        assert.deepEqual(handlers.state.alertEvents, before.alertEvents);
        assert.equal(handlers.state.authRequired, 0);
        assert.deepEqual(handlers.state.changedTokens, []);
        assert.equal(handlers.state.message, null);
        assert.equal(h.auth.readAuthToken(), "account-b");
        assert.equal(h.calls.filter(call => call.path === path).length, 1);
      } finally { h.restore(); }
    }
  }
});

test("consumer continuation guards reject a boundary after helper completion, including an ordinary late 401", async () => {
  for (const domain of ["wishlist", "preferences"]) {
    for (const status of [200, 401]) {
      const h = await sentinelChatHarness();
      try {
        const client = domain === "wishlist" ? h.wishlist : h.preferences;
        const name = domain === "wishlist" ? "withWishlistAuthRetry" : "withNotificationPreferenceAuthRetry";
        // Resolve/reject the real helper, then change session before the handler resumes.
        h[domain] = { ...client, [name]: async (...args) => {
          try { return await client[name](...args); }
          finally { h.auth.startAuthSession(sentinelSession(2, "account-b")); }
        } };
        const handlers = await accountOperationHandlers(h);
        const path = domain === "wishlist" ? wishlistPath : preferencePath;
        h.respond(path, domain === "wishlist" ? alertItem : persistedPreferences, status);
        if (status === 401) {
          h.respond(refreshPath, sentinelSession(1, "rotated"));
          h.respond(path, {}, 401);
        }
        await (domain === "wishlist" ? handlers.handleSubmit(handlers.event) : handlers.savePreferences(handlers.event));
        assert.deepEqual(handlers.state.added, []);
        assert.deepEqual(handlers.state.changedTokens, []);
        assert.equal(handlers.state.message, null);
        assert.equal(handlers.state.authRequired, 0);
        assert.equal(h.auth.readAuthToken(), "account-b");
      } finally { h.restore(); }
    }
  }
});

test("production add and preference save handlers accept same-user rotation and preserve persisted success callbacks", async () => {
  for (const domain of ["wishlist", "preferences"]) {
    const h = await sentinelChatHarness();
    try {
      const handlers = await accountOperationHandlers(h);
      const path = domain === "wishlist" ? wishlistPath : preferencePath;
      const reply = h.defer(path);
      const operation = domain === "wishlist" ? handlers.handleSubmit(handlers.event) : handlers.savePreferences(handlers.event);
      const revision = h.auth.readAuthSessionRevision();
      h.respond(refreshPath, sentinelSession(1, "rotated"));
      await h.auth.ensureAuthToken({ forceRefresh: true });
      h.respond(path, domain === "wishlist" ? alertItem : persistedPreferences);
      reply({}, 401);
      await operation;
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      assert.deepEqual(handlers.state.changedTokens, ["rotated"]);
      assert.equal(handlers.state.authRequired, 0);
      assert.equal(handlers.state.message[domain === "wishlist" ? "tone" : "kind"], "success");
      if (domain === "wishlist") assert.deepEqual(handlers.state.added, [alertItem]);
      else assert.deepEqual(handlers.state.savedPreferences, persistedPreferences);
      assert.equal(h.calls.filter(call => call.path === refreshPath).length, 1, "already rotated token needs no second refresh");
    } finally { h.restore(); }
  }
});

test("boundary during refresh rejects replacement credentials, and boundary during retry rejects success and 401", async () => {
  for (const domain of ["wishlist", "preferences"]) {
    for (const phase of ["refresh", "retry-success", "retry-401"]) {
      const h = await sentinelChatHarness();
      try {
        const path = domain === "wishlist" ? wishlistPath : preferencePath;
        h.respond(path, {}, 401);
        const refreshReply = h.defer(refreshPath);
        const operation = domain === "wishlist"
          ? h.wishlist.withWishlistAuthRetry("initial", h.wishlist.getMyWishlist)
          : h.preferences.withNotificationPreferenceAuthRetry("initial", h.preferences.getMyNotificationPreferences);
        const rejected = assert.rejects(operation, error => h.auth.isAuthSessionInvalidatedError(error));
        await settle();
        let retryReply;
        if (phase !== "refresh") {
          retryReply = h.defer(path);
          refreshReply(sentinelSession(1, "rotated"));
          await settle();
        }
        h.auth.startAuthSession(sentinelSession(2, "account-b"));
        const revision = h.auth.readAuthSessionRevision();
        if (phase === "refresh") refreshReply(sentinelSession(1, "late-rotation"));
        else retryReply(domain === "wishlist" ? [alertItem] : persistedPreferences, phase === "retry-401" ? 401 : 200);
        await rejected;
        assert.equal(h.auth.readAuthToken(), "account-b");
        assert.equal(h.auth.readAuthSessionRevision(), revision);
        assert.ok(h.calls.filter(call => call.path === path).every(call => call.token !== "Bearer account-b"));
        assert.equal(h.calls.filter(call => call.path === path).length, phase === "refresh" ? 1 : 2);
      } finally { h.restore(); }
    }
  }
});

test("current-session service errors retain request IDs and terminal refresh failure never retries mutations", async () => {
  for (const domain of ["wishlist", "preferences"]) {
    for (const terminal of [false, true]) {
      const h = await sentinelChatHarness();
      try {
        const path = domain === "wishlist" ? wishlistPath : preferencePath;
        h.respond(path, {}, terminal ? 401 : 503, "b04-request-id");
        if (terminal) h.respond(refreshPath, {}, 401);
        const operation = domain === "wishlist"
          ? h.wishlist.withWishlistAuthRetry("initial", h.wishlist.getMyWishlist)
          : h.preferences.withNotificationPreferenceAuthRetry("initial", h.preferences.getMyNotificationPreferences);
        await assert.rejects(operation, error => terminal
          ? h.auth.isAuthSessionInvalidatedError(error)
          : (error.requestId === "b04-request-id" && error.details.status === 503));
        assert.equal(h.auth.readAuthToken(), terminal ? null : "initial");
        assert.equal(h.calls.filter(call => call.path === path).length, 1);
      } finally { h.restore(); }
    }
  }
});

test("Deals session boundary blocks delayed POST retry, follow-up alert PATCH and stale success feedback", async () => {
  for (const status of [200, 401, 409, 503]) {
    const h = await sentinelChatHarness();
    try {
      const handlers = await accountOperationHandlers(h);
      const reply = h.defer(wishlistPath);
      const operation = handlers.saveDeal(alertDeal, true);
      await settle();
      h.auth.startAuthSession(sentinelSession(2, "account-b"));
      const before = structuredClone(handlers.state);
      reply(alertItem, status);
      await operation;
      assert.deepEqual(handlers.state.savedWishlistItems, before.savedWishlistItems);
      assert.deepEqual(handlers.state.saveMessages, before.saveMessages);
      assert.equal(h.auth.readAuthToken(), "account-b");
      assert.deepEqual(h.calls.filter(call => call.path.startsWith(wishlistPath)).map(call => call.method), ["POST"]);
    } finally { h.restore(); }
  }
});

test("production login/register handlers establish a new session and logout invalidates it", async () => {
  for (const mode of ["login", "register"]) {
    const h = await sentinelChatHarness();
    try {
      const componentName = mode === "login" ? "LoginForm" : "RegisterForm";
      const source = await readFile(new URL(`../src/components/${componentName}.tsx`, import.meta.url), "utf8");
      const ast = ts.createSourceFile("auth-form.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const component = ast.statements.find(node => node.name?.text === componentName);
      const handler = component.body.statements.find(node => node.name?.text === "handleSubmit");
      const output = ts.transpileModule(handler.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
      const routes = [];
      let reset = false;
      const mocks = {
        ...h.auth, ...h.authApi, authFieldError, isSubmitting: false,
        setIsSubmitting() {}, setErrorDetails() {}, returnTo: productReturnTo("/wishlist"),
        router: { replace: value => routes.push(value) },
        FormData: class { get(name) { return name === "password" ? "pass1234" : " player "; } },
      };
      const submit = new Function(...Object.keys(mocks), `${output}\nreturn handleSubmit;`)(...Object.values(mocks));
      const revision = h.auth.readAuthSessionRevision();
      h.respond(`/api/auth/${mode}`, sentinelSession(2, "new-session"));
      await submit({ preventDefault() {}, currentTarget: {
        querySelectorAll: () => [], reportValidity: () => true, reset: () => { reset = true; },
      } });
      assert.equal(h.auth.readAuthToken(), "new-session");
      assert.ok(h.auth.readAuthSessionRevision() > revision);
      assert.deepEqual(routes, ["/wishlist"]);
      assert.equal(reset, true);
      h.respond("/api/auth/logout", {});
      await h.auth.logout();
      assert.equal(h.auth.readAuthToken(), null);
      assert.ok(h.auth.readAuthSessionRevision() > revision + 1);
    } finally { h.restore(); }
  }
});

const logoutPath = "/api/auth/logout";

// Run complete production auth components, including their hooks and JSX.
async function authComponentHarness(h, name, returnTo = "/wishlist") {
  const source = await readFile(new URL(`../src/components/${name}.tsx`, import.meta.url), "utf8");
  const ast = ts.createSourceFile("auth-component.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const program = ast.statements.filter(node => !ts.isImportDeclaration(node))
    .map(node => node.getText(ast)).join("\n").replace(`export default function ${name}`, `function ${name}`);
  const output = ts.transpileModule(program, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  let cursor = 0;
  const cells = [];
  let effects = [];
  const changes = [];
  const routes = [];
  let resets = 0;
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      cells[index] ??= { value: typeof initial === "function" ? initial() : initial };
      return [cells[index].value, value => {
        cells[index].value = typeof value === "function" ? value(cells[index].value) : value;
        changes.push({ index, value: cells[index].value });
      }];
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
    ...hooks, ...h.auth, ...h.authApi, authFieldError,
    useRouter: () => ({ replace: value => routes.push(value) }),
    styles: { form: "form" }, Link: "Link", AuthPasswordField: "AuthPasswordField",
    RequestIdSupportText: "RequestIdSupportText",
    FormData: class { constructor(form) { this.values = form.values; } get(name) { return this.values[name]; } },
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
  };
  const Component = new Function(...Object.keys(mocks), `${output}\nreturn ${name};`)(...Object.values(mocks));
  let tree;
  const render = () => {
    cursor = 0;
    tree = Component({ returnTo: productReturnTo(returnTo) });
    const pending = effects;
    effects = [];
    pending.forEach(effect => effect());
    return tree;
  };
  const nodes = node => {
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (!node || typeof node !== "object") return [];
    return [node, ...nodes(node.props?.children)];
  };
  const find = predicate => nodes(render()).find(predicate);
  render();
  await settle();
  render();
  return {
    render, changes, routes, resets: () => resets,
    state: () => { render(); return cells[0].value; },
    error: () => { render(); return cells[1].value; },
    async view() { render(); await settle(); return JSON.stringify(render()); },
    signOut() {
      const button = find(node => node.props.className === "auth-status__logout");
      assert.ok(button && !button.props.disabled, "production Sign out is available");
      button.props.onClick();
    },
    submit(overrides = {}) {
      const values = {
        emailOrUsername: " player2 ", email: " player2@example.test ",
        username: " player2 ", displayName: " Player 2 ", password: " pass1234 ", ...overrides,
      };
      const validation = new Map();
      const inputs = Object.entries(values).map(([name, value]) => ({
        name, value, setCustomValidity: message => validation.set(name, message),
      }));
      return find(node => node.type === "form").props.onSubmit({
        preventDefault() {}, currentTarget: {
          values, querySelectorAll: () => inputs,
          reportValidity: () => [...validation.values()].every(message => !message),
          reset: () => { resets++; },
        },
      });
    },
    dispose() { cells.forEach(cell => cell.cleanup?.()); },
  };
}

function observeAuthNetwork(browser = null) {
  const fetch = globalThis.fetch;
  const events = [];
  globalThis.fetch = async (url, init) => {
    const path = new URL(url).pathname;
    events.push({ phase: "dispatch", path, credentials: init.credentials });
    try {
      const response = await fetch(url, init);
      const cookie = response.headers.get("Set-Cookie");
      // Model browser cookie receipt before exposing the response to auth.ts.
      if (browser && cookie) browser.refreshCookie = cookie.includes("Max-Age=0") ? null : cookie;
      events.push({ phase: "settle", path, status: response.status });
      return response;
    } catch (error) {
      events.push({ phase: "settle", path, failed: true });
      throw error;
    }
  };
  return events;
}

async function waitForAuthDispatch(events, path, count = 1) {
  // Dispatch determines completion; the deadline only bounds a missing event.
  const deadline = performance.now() + 1000;
  while (events.filter(event => event.phase === "dispatch" && event.path === path).length < count) {
    assert.ok(performance.now() < deadline, `Timed out waiting for ${path} dispatch ${count}`);
    // Response body parsing and CSRF bootstrap need not finish in a fixed number of microtasks.
    await new Promise(resolve => setImmediate(resolve));
  }
}

const credentialPath = mode => `/api/auth/${mode}`;
const credentialFormName = mode => mode === "login" ? "LoginForm" : "RegisterForm";
const credentialModes = ["login", "register"];
const oldCredentialCookie = "nexora_refresh_token=old; HttpOnly; Path=/api/auth";
const newCredentialCookie = "nexora_refresh_token=new; HttpOnly; Path=/api/auth";
const expiredCredentialCookie = "nexora_refresh_token=; Max-Age=0; HttpOnly; Path=/api/auth";
const credentialEvents = events => events.filter(event => credentialModes.some(mode => event.path === credentialPath(mode)));

function assertCredentialSerialization(events) {
  let pending = 0;
  for (const event of credentialEvents(events)) {
    pending += event.phase === "dispatch" ? 1 : -1;
    assert.ok(pending >= 0 && pending <= 1, "at most one credential HTTP request may be in flight");
    if (event.phase === "dispatch") assert.equal(event.credentials, "include");
  }
  assert.equal(pending, 0);
}

async function credentialOverlapHarness(oldMode, newMode, { autoCleanup = true } = {}) {
  const h = await sentinelChatHarness();
  h.auth.clearAuthToken();
  const status = await authComponentHarness(h, "AuthStatus");
  const oldForm = await authComponentHarness(h, credentialFormName(oldMode));
  const browser = { refreshCookie: null };
  const events = observeAuthNetwork(browser);
  const revision = h.auth.readAuthSessionRevision();
  const authEvents = [];
  const onAuthChange = () => authEvents.push(h.auth.readAuthSessionRevision());
  window.addEventListener(h.auth.AUTH_STATE_EVENT, onAuthChange);
  const oldReply = h.defer(credentialPath(oldMode));
  const oldSubmit = oldForm.submit();
  await settle();
  assert.deepEqual(credentialEvents(events).map(({ phase, path }) => [phase, path]), [["dispatch", credentialPath(oldMode)]]);
  oldForm.dispose(); // Navigation unmounts the production form instance.
  const newForm = await authComponentHarness(h, credentialFormName(newMode));
  const newReply = h.defer(credentialPath(newMode));
  const newSubmit = newForm.submit();
  await settle();
  assert.equal(credentialEvents(events).filter(event => event.phase === "dispatch").length, 1);
  assert.equal(newForm.state(), true);
  assert.equal(h.auth.readAuthToken(), null);
  if (autoCleanup) h.respond(logoutPath, null, 204, null, expiredCredentialCookie);
  return {
    ...h, status, oldForm, newForm, browser, events, revision, authEvents,
    oldReply, newReply, oldSubmit, newSubmit,
    async assertOldIgnored() {
      await oldSubmit;
      await settle();
      assert.equal(oldForm.resets(), 0);
      assert.deepEqual(oldForm.routes, []);
      assert.equal(oldForm.error(), null);
      assert.equal(newForm.error(), null);
      assert.equal(h.auth.readAuthToken(), null);
      assert.equal(await h.auth.readCurrentUser(), null);
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      assert.deepEqual(authEvents, []);
      assert.match(await status.view(), /auth-status--anonymous/);
      assert.equal(credentialEvents(events).filter(event => event.phase === "dispatch").length, 2);
    },
    async assertNewOwnsSession(token, cleanup = true) {
      await newSubmit;
      assert.equal(h.auth.readAuthToken(), token);
      assert.deepEqual(await h.auth.readCurrentUser(), sentinelSession(3).user);
      assert.equal(h.auth.readAuthSessionRevision(), revision + 1);
      assert.deepEqual(authEvents, [revision + 1]);
      assert.match(await status.view(), /auth-status--authenticated/);
      assert.equal(status.state().user.id, 3);
      assert.deepEqual(oldForm.routes, []);
      assert.equal(oldForm.resets(), 0);
      assert.deepEqual(newForm.routes, ["/wishlist"]);
      assert.equal(newForm.resets(), 1);
      assert.equal(newForm.error(), null);
      assert.equal(newForm.state(), false);
      assert.equal(browser.refreshCookie, newCredentialCookie);
      assert.deepEqual(credentialEvents(events).map(({ phase, path }) => [phase, path]), [
        ["dispatch", credentialPath(oldMode)], ["settle", credentialPath(oldMode)],
        ["dispatch", credentialPath(newMode)], ["settle", credentialPath(newMode)],
      ]);
      assert.deepEqual(events.filter(event => [logoutPath, credentialPath(oldMode), credentialPath(newMode)].includes(event.path))
        .map(({ phase, path }) => [phase, path]), [
        ["dispatch", credentialPath(oldMode)], ["settle", credentialPath(oldMode)],
        ...(cleanup ? [["dispatch", logoutPath], ["settle", logoutPath]] : []),
        ["dispatch", credentialPath(newMode)], ["settle", credentialPath(newMode)],
      ]);
      assertCredentialSerialization(events);
    },
    restore() {
      window.removeEventListener(h.auth.AUTH_STATE_EVENT, onAuthChange);
      oldForm.dispose(); newForm.dispose(); status.dispose(); h.restore();
    },
  };
}

for (const [oldMode, newMode] of [["login", "register"], ["register", "login"], ["login", "login"], ["register", "register"]]) {
  for (const identicalTokens of [false, true]) {
    test(`B-10 ${oldMode} -> ${newMode} navigation/remount serializes cookies and ignores obsolete success${identicalTokens ? " with identical tokens" : ""}`, async () => {
      const h = await credentialOverlapHarness(oldMode, newMode);
      try {
        const oldToken = identicalTokens ? "identical-token" : "old-token";
        const newToken = identicalTokens ? "identical-token" : "new-token";
        h.oldReply(sentinelSession(2, oldToken), oldMode === "register" ? 201 : 200, null, oldCredentialCookie);
        await h.assertOldIgnored();
        assert.equal(h.browser.refreshCookie, null);
        h.newReply(sentinelSession(3, newToken), newMode === "register" ? 201 : 200, null, newCredentialCookie);
        await h.assertNewOwnsSession(newToken);
      } finally { h.restore(); }
    });
  }
}

for (const [oldMode, newMode] of [["login", "register"], ["register", "login"]]) {
  for (const failure of [400, 401, 409, 503, "network"]) {
    test(`B-10 obsolete ${oldMode} ${failure} releases ${newMode} without old UI/auth side effects`, async () => {
      const h = await credentialOverlapHarness(oldMode, newMode);
      try {
        if (failure === "network") h.oldReply.reject(new TypeError("Failed to fetch"));
        else h.oldReply({}, failure, "b10-old-request");
        await h.assertOldIgnored();
        assert.equal(h.browser.refreshCookie, null);
        h.newReply(sentinelSession(3, "new-token"), 200, null, newCredentialCookie);
        await h.assertNewOwnsSession("new-token", failure === "network");
      } finally { h.restore(); }
    });
  }

  for (const failure of [401, 409, 503, "network"]) {
    test(`B-10 newer ${newMode} ${failure} stays truthful, cannot revive old ${oldMode}, and permits retry`, async () => {
      const h = await credentialOverlapHarness(oldMode, newMode);
      try {
        h.oldReply(sentinelSession(2, "old-token"), 200, null, oldCredentialCookie);
        await h.assertOldIgnored();
        if (failure === "network") h.newReply.reject(new TypeError("Failed to fetch"));
        else h.newReply({}, failure, "b10-new-request");
        await h.newSubmit;
        assert.equal(h.auth.readAuthToken(), null);
        if (failure === "network") h.respond(logoutPath, null, 204, null, expiredCredentialCookie);
        assert.equal(await h.auth.readCurrentUser(), null);
        assert.equal(h.auth.readAuthSessionRevision(), h.revision);
        assert.deepEqual(h.authEvents, []);
        assert.match(await h.status.view(), /auth-status--anonymous/);
        assert.equal(h.oldForm.error(), null);
        assert.equal(h.newForm.error().requestId, failure === "network" ? null : "b10-new-request");
        assert.match(await h.newForm.view(), failure === "network" ? /Cannot reach the NEXORA authentication service/ : /b10-new-request/);
        assert.equal(h.newForm.state(), false);
        assert.equal(h.newForm.resets(), 0);
        assert.deepEqual(h.newForm.routes, []);
        assert.equal(h.browser.refreshCookie, null, "cleanup must expire the obsolete cookie before newer credentials can fail");
        const retryReply = h.defer(credentialPath(newMode));
        const retry = h.newForm.submit();
        await settle();
        assert.equal(credentialEvents(h.events).filter(event => event.phase === "dispatch").length, 3);
        retryReply(sentinelSession(3, "retry-token"), 200, null, newCredentialCookie);
        await retry;
        assert.equal(h.auth.readAuthToken(), "retry-token");
        assert.equal((await h.auth.readCurrentUser()).id, 3);
        assert.equal(h.auth.readAuthSessionRevision(), h.revision + 1);
        assert.deepEqual(h.newForm.routes, ["/wishlist"]);
        assert.equal(h.newForm.resets(), 1);
        assert.equal(h.newForm.error(), null);
        assert.equal(h.browser.refreshCookie, newCredentialCookie);
        assertCredentialSerialization(h.events);
      } finally { h.restore(); }
    });
  }
}

for (const mode of credentialModes) {
  test(`B-10 normal ${mode} has no queue delay and preserves production payload, reset and returnTo`, async () => {
    const h = await sentinelChatHarness();
    h.auth.clearAuthToken();
    const form = await authComponentHarness(h, credentialFormName(mode), "/settings");
    try {
      await h.authApi.getCsrfToken();
      const reply = h.defer(credentialPath(mode));
      const revision = h.auth.readAuthSessionRevision();
      const submission = form.submit();
      // Only the pre-existing await of the cached CSRF token precedes dispatch.
      await Promise.resolve();
      const requests = h.calls.filter(call => call.path === credentialPath(mode));
      assert.equal(requests.length, 1);
      assert.equal(requests[0].body.password, " pass1234 ");
      assert.equal(requests[0].body[mode === "login" ? "emailOrUsername" : "username"], "player2");
      if (mode === "register") {
        assert.equal(requests[0].body.email, "player2@example.test");
        assert.equal(requests[0].body.displayName, "Player 2");
      }
      assert.equal(h.calls.filter(call => [logoutPath, refreshPath].includes(call.path)).length, 0);
      reply(sentinelSession(2, "normal-token"));
      await submission;
      assert.equal(h.auth.readAuthSessionRevision(), revision + 1);
      assert.deepEqual(form.routes, ["/settings"]);
      assert.equal(form.resets(), 1);
      assert.equal(form.error(), null);
    } finally { form.dispose(); h.restore(); }
  });

  test(`B-10 explicit replacement session with an identical token invalidates pending ${mode}`, async () => {
    const h = await sentinelChatHarness();
    h.auth.clearAuthToken();
    const status = await authComponentHarness(h, "AuthStatus");
    const form = await authComponentHarness(h, credentialFormName(mode));
    try {
      const reply = h.defer(credentialPath(mode));
      const submission = form.submit();
      await settle();
      h.auth.startAuthSession(sentinelSession(3, "identical-token"));
      const revision = h.auth.readAuthSessionRevision();
      assert.match(await status.view(), /auth-status--authenticated/);
      h.respond(logoutPath, null, 204, null, expiredCredentialCookie);
      reply(sentinelSession(2, "identical-token"));
      await submission;
      assert.equal(h.auth.readAuthToken(), "identical-token");
      assert.deepEqual(await h.auth.readCurrentUser(), sentinelSession(3).user);
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      assert.equal(status.state().user.id, 3);
      assert.deepEqual(form.routes, []);
      assert.equal(form.resets(), 0);
      assert.equal(form.error(), null);
    } finally { form.dispose(); status.dispose(); h.restore(); }
  });
}

test("B-10 logout plus two queued logical attempts dispatches only the newest credentials after logout cleanup", async () => {
  const h = await sentinelChatHarness();
  const status = await authComponentHarness(h, "AuthStatus");
  const loginForm = await authComponentHarness(h, "LoginForm");
  const registerForm = await authComponentHarness(h, "RegisterForm");
  try {
    const browser = { refreshCookie: null };
    const events = observeAuthNetwork(browser);
    const logoutReply = h.defer(logoutPath);
    status.signOut();
    const loggingOut = h.auth.logout();
    await settle();
    const first = loginForm.submit();
    const registerReply = h.defer(credentialPath("register"));
    const second = registerForm.submit();
    await settle();
    assert.equal(credentialEvents(events).length, 0);
    assert.equal(h.auth.readAuthToken(), null);
    logoutReply(null, 204, null, expiredCredentialCookie);
    await loggingOut;
    await first;
    await settle();
    assert.deepEqual(loginForm.routes, []);
    assert.equal(loginForm.resets(), 0);
    assert.equal(loginForm.error(), null);
    assert.deepEqual(credentialEvents(events).map(({ phase, path }) => [phase, path]), [["dispatch", credentialPath("register")]]);
    const revision = h.auth.readAuthSessionRevision();
    registerReply(sentinelSession(3, "registered"), 201, null, newCredentialCookie);
    await second;
    assert.equal(h.auth.readAuthToken(), "registered");
    assert.equal((await h.auth.readCurrentUser()).id, 3);
    assert.equal(h.auth.readAuthSessionRevision(), revision + 1);
    assert.equal(status.state().user.id, 3);
    assert.deepEqual(registerForm.routes, ["/wishlist"]);
    assert.equal(registerForm.resets(), 1);
    assert.equal(browser.refreshCookie, newCredentialCookie);
    assert.deepEqual(events.filter(event => [logoutPath, ...credentialModes.map(credentialPath)].includes(event.path))
      .map(({ phase, path }) => [phase, path]), [
      ["dispatch", logoutPath], ["settle", logoutPath],
      ["dispatch", credentialPath("register")], ["settle", credentialPath("register")],
    ]);
    assertCredentialSerialization(events);
  } finally { loginForm.dispose(); registerForm.dispose(); status.dispose(); h.restore(); }
});

test("B-10 in-flight login, pending logout and newer registration share one ordered cookie queue", async () => {
  const h = await sentinelChatHarness();
  h.auth.clearAuthToken();
  const status = await authComponentHarness(h, "AuthStatus");
  const loginForm = await authComponentHarness(h, "LoginForm");
  const registerForm = await authComponentHarness(h, "RegisterForm");
  try {
    const browser = { refreshCookie: null };
    const events = observeAuthNetwork(browser);
    const loginReply = h.defer(credentialPath("login"));
    const first = loginForm.submit();
    await settle();
    const logoutReply = h.defer(logoutPath);
    const loggingOut = h.auth.logout();
    const registerReply = h.defer(credentialPath("register"));
    const second = registerForm.submit();
    await settle();
    assert.equal(h.calls.filter(call => call.path === logoutPath).length, 0);
    assert.equal(h.calls.filter(call => call.path === credentialPath("register")).length, 0);
    loginReply(sentinelSession(2, "obsolete"), 200, null, oldCredentialCookie);
    await first;
    await settle();
    assert.equal(h.auth.readAuthToken(), null);
    assert.equal(loginForm.resets(), 0);
    assert.deepEqual(loginForm.routes, []);
    assert.equal(browser.refreshCookie, oldCredentialCookie);
    assert.equal(h.calls.filter(call => call.path === logoutPath).length, 1);
    assert.equal(h.calls.filter(call => call.path === credentialPath("register")).length, 0);
    logoutReply(null, 204, null, expiredCredentialCookie);
    await loggingOut;
    await settle();
    assert.equal(browser.refreshCookie, null);
    assert.equal(h.auth.readAuthToken(), null);
    assert.equal(h.calls.filter(call => call.path === credentialPath("register")).length, 1);
    registerReply(sentinelSession(3, "newest"), 201, null, newCredentialCookie);
    await second;
    assert.equal(h.auth.readAuthToken(), "newest");
    assert.equal((await h.auth.readCurrentUser()).id, 3);
    assert.equal(status.state().user.id, 3);
    assert.deepEqual(registerForm.routes, ["/wishlist"]);
    assert.equal(registerForm.resets(), 1);
    assert.equal(browser.refreshCookie, newCredentialCookie);
    assert.deepEqual(events.filter(event => [logoutPath, ...credentialModes.map(credentialPath)].includes(event.path))
      .map(({ phase, path }) => [phase, path]), [
      ["dispatch", credentialPath("login")], ["settle", credentialPath("login")],
      ["dispatch", logoutPath], ["settle", logoutPath],
      ["dispatch", credentialPath("register")], ["settle", credentialPath("register")],
    ]);
    assertCredentialSerialization(events);
  } finally { loginForm.dispose(); registerForm.dispose(); status.dispose(); h.restore(); }
});

for (const mode of credentialModes) {
  for (const completion of ["success", "http", "network"]) {
    test(`B-10 pending ${mode} -> logout ${completion} invalidates immediately and expires cookies after credentials when possible`, async () => {
      const h = await sentinelChatHarness();
      h.auth.clearAuthToken();
      const status = await authComponentHarness(h, "AuthStatus");
      const form = await authComponentHarness(h, credentialFormName(mode));
      try {
        const browser = { refreshCookie: null };
        const events = observeAuthNetwork(browser);
        const credentialReply = h.defer(credentialPath(mode));
        const submission = form.submit();
        await settle();
        const logoutReply = h.defer(logoutPath);
        const revision = h.auth.readAuthSessionRevision();
        const loggingOut = h.auth.logout();
        const completed = completion === "success" ? loggingOut : assert.rejects(loggingOut);
        assert.equal(h.auth.readAuthToken(), null);
        assert.equal(h.auth.readAuthSessionRevision(), revision + 1);
        assert.equal(await h.auth.readCurrentUser(), null);
        await settle();
        assert.equal(h.calls.filter(call => call.path === logoutPath).length, 0);
        assert.match(await status.view(), /auth-status--anonymous/);
        credentialReply(sentinelSession(2, "obsolete"), 200, null, oldCredentialCookie);
        await submission;
        await settle();
        assert.equal(h.auth.readAuthToken(), null);
        assert.equal(h.auth.readAuthSessionRevision(), revision + 1);
        assert.equal(form.resets(), 0);
        assert.deepEqual(form.routes, []);
        assert.equal(form.error(), null);
        assert.equal(browser.refreshCookie, oldCredentialCookie);
        assert.equal(h.calls.filter(call => call.path === logoutPath).length, 1);
        if (completion === "network") logoutReply.reject(new TypeError("Failed to fetch"));
        else logoutReply(completion === "success" ? null : {}, completion === "success" ? 204 : 503,
          null, completion === "success" ? expiredCredentialCookie : null);
        await completed;
        assert.equal(browser.refreshCookie, completion === "success" ? null : oldCredentialCookie);
        assert.equal(h.auth.readAuthToken(), null);
        assert.equal(h.auth.readAuthSessionRevision(), revision + 2);
        // The API caller receives the failure; auth-event reads do not retry expiry.
        assert.match(await status.view(), /auth-status--anonymous/);
        assert.deepEqual(events.filter(event => [logoutPath, credentialPath(mode)].includes(event.path))
          .slice(0, 4).map(({ phase, path }) => [phase, path]), [
          ["dispatch", credentialPath(mode)], ["settle", credentialPath(mode)],
          ["dispatch", logoutPath], ["settle", logoutPath],
        ]);
        // Success and failure both release the queue for a fresh credential request.
        if (completion !== "success") h.respond(logoutPath, null, 204, null, expiredCredentialCookie);
        const retryReply = h.defer(credentialPath(mode));
        const retry = form.submit();
        await settle();
        assert.equal(browser.refreshCookie, null, "failed expiry must be retried successfully before credentials dispatch");
        retryReply(sentinelSession(3, "after-logout"), 200, null, newCredentialCookie);
        await retry;
        assert.equal(h.auth.readAuthToken(), "after-logout");
        assert.equal((await h.auth.readCurrentUser()).id, 3);
        assert.equal(form.resets(), 1);
        assert.deepEqual(form.routes, ["/wishlist"]);
        assert.equal(browser.refreshCookie, newCredentialCookie);
        assertCredentialSerialization(events);
      } finally { form.dispose(); status.dispose(); h.restore(); }
    });
  }
}

test("B-10 credential CSRF retry stays inside the shared barrier until its final response settles", async () => {
  const h = await credentialOverlapHarness("login", "register");
  try {
    const retryReply = h.defer(credentialPath("login"));
    h.oldReply({}, 403);
    await waitForAuthDispatch(h.events, credentialPath("login"), 2);
    assert.deepEqual(credentialEvents(h.events).map(({ phase, path }) => [phase, path]), [
      ["dispatch", credentialPath("login")], ["settle", credentialPath("login")],
      ["dispatch", credentialPath("login")],
    ]);
    retryReply(sentinelSession(2, "obsolete-retry"), 200, null, oldCredentialCookie);
    await h.oldSubmit;
    await waitForAuthDispatch(h.events, credentialPath("register"));
    assert.equal(h.auth.readAuthToken(), null);
    assert.equal(h.oldForm.resets(), 0);
    assert.deepEqual(h.oldForm.routes, []);
    assert.equal(credentialEvents(h.events).filter(event => event.path === credentialPath("register")).length, 1);
    h.newReply(sentinelSession(3, "current"), 201, null, newCredentialCookie);
    await h.newSubmit;
    assert.equal((await h.auth.readCurrentUser()).id, 3);
    assert.deepEqual(h.newForm.routes, ["/wishlist"]);
    assertCredentialSerialization(h.events);
  } finally { h.restore(); }
});

test("B-10 synchronous acquisition, authoritative commit and synchronous failure cannot bypass or poison the queue", async () => {
  const h = await sentinelChatHarness();
  try {
    let called = false;
    const first = h.auth.withAuthCredentialTransition(() => { called = true; return Promise.resolve(sentinelSession(2, "first")); }, result => h.auth.commitAuthCredentialTransition(result));
    assert.equal(called, true, "an idle coordinator invokes work synchronously");
    const result = await first;
    assert.equal(h.auth.readAuthToken(), "first");
    let resolve;
    const second = h.auth.withAuthCredentialTransition(() => new Promise(done => { resolve = done; }), current => h.auth.commitAuthCredentialTransition(current));
    assert.throws(() => h.auth.assertAuthCredentialTransition(result), error => h.auth.isAuthSessionInvalidatedError(error));
    resolve(sentinelSession(3, "second"));
    await second;
    assert.equal(h.auth.readAuthToken(), "second");
    await assert.rejects(h.auth.withAuthCredentialTransition(() => { throw new Error("Synchronous request failure"); }, () => {}), /Synchronous request failure/);
    h.respond(logoutPath, null, 204, null, expiredCredentialCookie);
    const recovered = await h.auth.withAuthCredentialTransition(() => Promise.resolve(sentinelSession(4, "recovered")), current => h.auth.commitAuthCredentialTransition(current));
    assert.equal(recovered.value.token, "recovered");
    assert.equal(h.auth.readAuthToken(), "recovered");
  } finally { h.restore(); }
});

let credentialBootstrapId = 0;
async function freshCredentialModules() {
  const apiUrl = `data:text/javascript,${encodeURIComponent(`
    export const bootstrapId = ${++credentialBootstrapId};
    export const buildApiUrl = path => "http://localhost:8080" + path;
    export const readResponseRequestId = response => response.headers.get("X-NEXORA-Request-ID");
  `)}`;
  const authUrl = await moduleUrl("../src/lib/auth.ts", { "@/lib/api-client": apiUrl });
  return {
    client: await import(await moduleUrl("../src/lib/auth-client.ts", { "@/lib/auth": authUrl })),
    authApi: await import(authUrl),
  };
}

async function freshCredentialClient() { return (await freshCredentialModules()).client; }

async function freshCredentialBootstrap(h, { cleanup = true } = {}) {
  const client = await freshCredentialClient();
  if (cleanup && h.storageValues.has(client.AUTH_REFRESH_COOKIE_QUARANTINE_KEY)) {
    h.respond(logoutPath, null, 204, null, expiredCredentialCookie);
  }
  // A fresh runtime has no session state or cleanup latch. The server response
  // depends on the browser's cookie, not an unconditional mocked 401.
  h.respondUsing(refreshPath, () => h.browser.refreshCookie === oldCredentialCookie
    ? Response.json(sentinelSession(2, "obsolete-cookie-bootstrap"))
    : Response.json({ error: "authentication_required" }, { status: 401 }));
  const token = await client.ensureAuthToken();
  return { client, token };
}

const cookieTransitionEvents = events => events.filter(event => [logoutPath, ...credentialModes.map(credentialPath)].includes(event.path));

test("B-10 cold AuthStatus bootstrap stays anonymous while credential cookies are unaccepted", async () => {
  const h = await sentinelChatHarness();
  const client = await freshCredentialClient();
  let status;
  try {
    const reply = h.defer(credentialPath("login"));
    const submission = client.withAuthCredentialTransition(() => h.authApi.login({ emailOrUsername: "player3", password: "pass1234" }), result => {
      client.commitAuthCredentialTransition(result);
    });
    await settle();
    status = await authComponentHarness({ ...h, auth: client }, "AuthStatus");
    assert.match(await status.view(), /auth-status--anonymous/);
    assert.equal(await client.ensureAuthToken(), null);
    await assert.rejects(client.ensureAuthToken({ forceRefresh: true }), error => client.isAuthSessionInvalidatedError(error));
    assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
    reply(sentinelSession(3, "authoritative"));
    await submission;
    assert.equal(client.readAuthToken(), "authoritative");
    assert.match(await status.view(), /auth-status--authenticated/);
    assert.equal(status.state().user.id, 3);
  } finally { status?.dispose(); h.restore(); }
});

for (const [oldMode, newMode, failure] of [
  ["login", "register", 409], ["register", "login", 401], ["register", "login", 503],
  ["login", "register", "network"], ["register", "login", "network"],
]) {
  test(`B-10 obsolete ${oldMode} cookie is expired before ${newMode} ${failure} and cannot revive on fresh bootstrap`, async () => {
    const h = await credentialOverlapHarness(oldMode, newMode, { autoCleanup: false });
    try {
      const cleanupReply = h.defer(logoutPath);
      h.oldReply(sentinelSession(2, "obsolete"), 200, null, oldCredentialCookie);
      await settle();
      assert.equal(h.browser.refreshCookie, oldCredentialCookie);
      assert.equal(credentialEvents(h.events).filter(event => event.phase === "dispatch").length, 1);
      assert.deepEqual(cookieTransitionEvents(h.events).map(({ phase, path }) => [phase, path]), [
        ["dispatch", credentialPath(oldMode)], ["settle", credentialPath(oldMode)], ["dispatch", logoutPath],
      ]);
      await assert.rejects(h.auth.ensureAuthToken({ forceRefresh: true }), error => h.auth.isAuthSessionInvalidatedError(error));
      assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
      cleanupReply(null, 204, null, expiredCredentialCookie);
      await h.assertOldIgnored();
      assert.equal(h.browser.refreshCookie, null);
      if (failure === "network") h.newReply.reject(new TypeError("Failed to fetch"));
      else h.newReply({}, failure, "b10-new-credential-request");
      await h.newSubmit;
      assert.equal(h.auth.readAuthToken(), null);
      if (failure === "network") h.respond(logoutPath, null, 204, null, expiredCredentialCookie);
      assert.equal(await h.auth.readCurrentUser(), null);
      assert.equal(h.auth.readAuthSessionRevision(), h.revision);
      assert.equal(h.oldForm.resets(), 0);
      assert.deepEqual(h.oldForm.routes, []);
      assert.equal(h.newForm.resets(), 0);
      assert.deepEqual(h.newForm.routes, []);
      assert.equal(h.newForm.error().requestId, failure === "network" ? null : "b10-new-credential-request");
      assert.match(await h.newForm.view(), failure === "network" ? /Cannot reach/ : /b10-new-credential-request/);
      assert.equal(h.browser.refreshCookie, null);
      assert.deepEqual(cookieTransitionEvents(h.events).map(({ phase, path }) => [phase, path]), [
        ["dispatch", credentialPath(oldMode)], ["settle", credentialPath(oldMode)],
        ["dispatch", logoutPath], ["settle", logoutPath],
        ["dispatch", credentialPath(newMode)], ["settle", credentialPath(newMode)],
        ...(failure === "network" ? [["dispatch", logoutPath], ["settle", logoutPath]] : []),
      ]);
      const fresh = await freshCredentialBootstrap(h);
      assert.equal(fresh.token, null);
      assert.equal(await fresh.client.readCurrentUser(), null);
      assert.equal(h.browser.refreshCookie, null);
      assertCredentialSerialization(h.events);
    } finally { h.restore(); }
  });
}

for (const [oldMode, newMode] of [["login", "register"], ["register", "login"]]) {
  for (const failure of ["http", "network"]) {
    test(`B-10 ${oldMode} stale-cookie cleanup ${failure} fails ${newMode} closed, preserves request ID and permits explicit recovery`, async () => {
      const h = await credentialOverlapHarness(oldMode, newMode, { autoCleanup: false });
      try {
        const cleanupReply = h.defer(logoutPath);
        h.oldReply(sentinelSession(2, "obsolete"), 200, null, oldCredentialCookie);
        await settle();
        if (failure === "network") cleanupReply.reject(new TypeError("Cleanup network unavailable"));
        else cleanupReply({}, 503, "b10-cleanup-request");
        await Promise.all([h.oldSubmit, h.newSubmit]);
        assert.equal(h.auth.readAuthToken(), null);
        assert.equal(h.auth.readAuthSessionRevision(), h.revision);
        assert.deepEqual(h.authEvents, []);
        assert.equal(h.oldForm.error(), null);
        assert.equal(h.oldForm.resets(), 0);
        assert.deepEqual(h.oldForm.routes, []);
        assert.equal(h.newForm.state(), false);
        assert.equal(h.newForm.resets(), 0);
        assert.deepEqual(h.newForm.routes, []);
        assert.equal(h.newForm.error().requestId, failure === "http" ? "b10-cleanup-request" : null);
        assert.match(await h.newForm.view(), /previous sign-in could not be safely cleared/);
        assert.equal(h.browser.refreshCookie, oldCredentialCookie, "expiry could not be confirmed");
        assert.equal(h.calls.filter(call => call.path === credentialPath(newMode)).length, 0);
        if (failure === "network") h.respondUsing(logoutPath, () => { throw new TypeError("Cleanup retry unavailable"); });
        else h.respond(logoutPath, {}, 503, "b10-cleanup-request");
        await assert.rejects(h.auth.ensureAuthToken({ forceRefresh: true }), error => {
          const details = h.authApi.normalizeAuthError(error);
          return details.requestId === (failure === "http" ? "b10-cleanup-request" : null)
            && details.status === (failure === "http" ? 503 : null);
        });
        assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
        // No automatic retry hid the cleanup failure. A new user submission may
        // retry expiry, and may dispatch credentials only after confirmed success.
        const recoveryReply = h.defer(logoutPath);
        const recovery = h.newForm.submit();
        await settle();
        assert.equal(h.calls.filter(call => call.path === logoutPath).length, 3);
        assert.equal(h.calls.filter(call => call.path === credentialPath(newMode)).length, 0);
        recoveryReply(null, 204, null, expiredCredentialCookie);
        await settle();
        assert.equal(h.browser.refreshCookie, null);
        assert.equal(h.calls.filter(call => call.path === credentialPath(newMode)).length, 1);
        h.newReply(sentinelSession(3, "recovered"), 200, null, newCredentialCookie);
        await recovery;
        assert.equal(h.auth.readAuthToken(), "recovered");
        assert.deepEqual(await h.auth.readCurrentUser(), sentinelSession(3).user);
        assert.equal(h.newForm.error(), null);
        assert.deepEqual(h.newForm.routes, ["/wishlist"]);
        assert.equal(h.newForm.resets(), 1);
        assert.equal(h.browser.refreshCookie, newCredentialCookie);
        assertCredentialSerialization(h.events);
      } finally { h.restore(); }
    });
  }
}

test("B-10 stale-cookie cleanup CSRF retry retains the slot until expiry before newer credentials dispatch", async () => {
  const h = await credentialOverlapHarness("login", "register", { autoCleanup: false });
  try {
    const firstCleanup = h.defer(logoutPath);
    h.oldReply(sentinelSession(2, "obsolete"), 200, null, oldCredentialCookie);
    await waitForAuthDispatch(h.events, logoutPath);
    const secondCleanup = h.defer(logoutPath);
    firstCleanup({}, 403);
    await waitForAuthDispatch(h.events, logoutPath, 2);
    assert.equal(h.calls.filter(call => call.path === logoutPath).length, 2);
    assert.equal(h.calls.filter(call => call.path === credentialPath("register")).length, 0);
    assert.equal(h.browser.refreshCookie, oldCredentialCookie);
    secondCleanup(null, 204, null, expiredCredentialCookie);
    await h.assertOldIgnored();
    assert.equal(h.browser.refreshCookie, null);
    h.newReply({}, 409, "b10-after-csrf-request");
    await h.newSubmit;
    assert.equal(h.newForm.error().requestId, "b10-after-csrf-request");
    assert.equal(h.auth.readAuthToken(), null);
    assert.deepEqual(cookieTransitionEvents(h.events).map(({ phase, path }) => [phase, path]), [
      ["dispatch", credentialPath("login")], ["settle", credentialPath("login")],
      ["dispatch", logoutPath], ["settle", logoutPath],
      ["dispatch", logoutPath], ["settle", logoutPath],
      ["dispatch", credentialPath("register")], ["settle", credentialPath("register")],
    ]);
    assert.equal((await freshCredentialBootstrap(h)).token, null);
  } finally { h.restore(); }
});

test("B-10 an obsolete HTTP success with an invalid auth body still expires its possible credential cookie", async () => {
  const h = await credentialOverlapHarness("login", "register");
  try {
    h.oldReply({}, 200, null, oldCredentialCookie);
    await h.assertOldIgnored();
    assert.equal(h.browser.refreshCookie, null);
    h.newReply({}, 409, "b10-invalid-body-request");
    await h.newSubmit;
    assert.equal(h.newForm.error().requestId, "b10-invalid-body-request");
    assert.equal((await freshCredentialBootstrap(h)).token, null);
    assert.equal(h.calls.filter(call => call.path === logoutPath).length, 1);
  } finally { h.restore(); }
});

test("B-10 authoritative acceptance executes inside the cookie slot before reentrant credential work can start", async () => {
  const h = await sentinelChatHarness();
  h.auth.clearAuthToken();
  try {
    const events = observeAuthNetwork();
    h.respond(credentialPath("login"), sentinelSession(2, "accepted"));
    h.respond(credentialPath("register"), sentinelSession(3, "newer"));
    let second;
    let secondInvoked = false;
    const first = h.auth.withAuthCredentialTransition(() => h.authApi.login({ emailOrUsername: "player2", password: "pass1234" }), result => {
      h.auth.commitAuthCredentialTransition(result);
      second = h.auth.withAuthCredentialTransition(() => {
        secondInvoked = true;
        return h.authApi.register({ email: "player3@example.test", username: "player3", displayName: "Player 3", password: "pass1234" });
      }, current => h.auth.commitAuthCredentialTransition(current));
      assert.equal(secondInvoked, false, "the first slot still owns its synchronous commit");
      assert.equal(h.auth.readAuthToken(), "accepted");
    });
    await first;
    await second;
    assert.equal(h.auth.readAuthToken(), "newer");
    assert.equal((await h.auth.readCurrentUser()).id, 3);
    assert.equal(h.calls.filter(call => call.path === logoutPath).length, 0, "an accepted session is not an obsolete cookie");
    assertCredentialSerialization(events);
  } finally { h.restore(); }
});

test("B-10 failed stale-cookie cleanup must prevent obsolete reauthentication in a fresh runtime", async () => {
  const h = await credentialOverlapHarness("login", "register", { autoCleanup: false });
  try {
    const cleanupReply = h.defer(logoutPath);
    h.oldReply(sentinelSession(2, "obsolete"), 200, null, oldCredentialCookie);
    await settle();
    cleanupReply.reject(new TypeError("Expiry request did not reach the server"));
    await Promise.all([h.oldSubmit, h.newSubmit]);
    assert.equal(h.auth.readAuthToken(), null);
    assert.equal(h.calls.filter(call => call.path === credentialPath("register")).length, 0);
    assert.equal(h.storageValues.get(h.auth.AUTH_REFRESH_COOKIE_QUARANTINE_KEY), "1");
    h.respondUsing(logoutPath, () => { throw new TypeError("Expiry retry did not reach the server"); });
    await assert.rejects(h.auth.ensureAuthToken({ forceRefresh: true }));
    // A new runtime reads the persisted marker and expires the cookie instead
    // of using normal refresh, even though its memory-only latch starts empty.
    const fresh = await freshCredentialBootstrap(h);
    assert.equal(fresh.token, null, "a reload must not consume the obsolete credential cookie");
    assert.equal(await fresh.client.readCurrentUser(), null);
    assert.equal(h.browser.refreshCookie, null);
    assert.equal(h.storageValues.has(h.auth.AUTH_REFRESH_COOKIE_QUARANTINE_KEY), false);
    assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
  } finally { h.restore(); }
});

for (const [oldMode, newMode] of [["login", "register"], ["register", "login"]]) {
  for (const failure of ["http", "network"]) {
    test(`B-10 ${oldMode} quarantine survives repeated ${failure} cleanup failures and reloads until confirmed expiry`, async () => {
      const h = await credentialOverlapHarness(oldMode, newMode, { autoCleanup: false });
      const key = h.auth.AUTH_REFRESH_COOKIE_QUARANTINE_KEY;
      let status;
      let form;
      let runtimeAuthApi = h.authApi;
      try {
        assert.equal(h.storageValues.get(key), "1", "quarantine is durable before the credential response");
        const failCleanup = () => {
          if (failure === "http") h.respond(logoutPath, {}, 503, "b10-reload-cleanup");
          else h.respondUsing(logoutPath, () => { throw new TypeError("Expiry unavailable"); });
        };
        const assertCleanupError = error => {
          const details = runtimeAuthApi.normalizeAuthError(error);
          assert.equal(details.status, failure === "http" ? 503 : null);
          assert.equal(details.requestId, failure === "http" ? "b10-reload-cleanup" : null);
          assert.match(details.message, /previous sign-in could not be safely cleared/);
          return true;
        };
        failCleanup();
        h.oldReply(sentinelSession(2, "obsolete"), 200, null, oldCredentialCookie);
        await Promise.all([h.oldSubmit, h.newSubmit]);
        assert.equal(h.storageValues.get(key), "1");
        assert.equal(h.browser.refreshCookie, oldCredentialCookie);
        h.status.dispose();

        for (let reload = 0; reload < 2; reload++) {
          const { client, authApi } = await freshCredentialModules();
          runtimeAuthApi = authApi;
          const cleanupReply = h.defer(logoutPath);
          const before = h.calls.filter(call => call.path === logoutPath).length;
          // Concurrent bootstrap consumers must share the same cleanup slot.
          const boots = [client.ensureAuthToken(), client.ensureAuthToken({ forceRefresh: true }), client.readCurrentUser()];
          const rejected = boots.map(boot => assert.rejects(boot, assertCleanupError));
          await settle();
          assert.equal(h.calls.filter(call => call.path === logoutPath).length, before + 1);
          assert.equal(client.readAuthToken(), null);
          assert.equal(h.storageValues.get(key), "1");
          assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
          if (failure === "http") cleanupReply({}, 503, "b10-reload-cleanup");
          else cleanupReply.reject(new TypeError("Expiry unavailable after reload"));
          await Promise.all(rejected);
          assert.equal(h.browser.refreshCookie, oldCredentialCookie);
          assert.equal(h.storageValues.get(key), "1");
        }

        const { client, authApi } = await freshCredentialModules();
        runtimeAuthApi = authApi;
        failCleanup();
        status = await authComponentHarness({ ...h, auth: client, authApi }, "AuthStatus");
        assert.match(await status.view(), /auth-status--unavailable/);
        assert.doesNotMatch(await status.view(), /auth-status--authenticated/);
        form = await authComponentHarness({ ...h, auth: client, authApi }, credentialFormName(newMode));
        failCleanup();
        await form.submit();
        assert.equal(form.error().requestId, failure === "http" ? "b10-reload-cleanup" : null);
        assert.equal(form.resets(), 0);
        assert.deepEqual(form.routes, []);
        assert.equal(h.calls.filter(call => call.path === credentialPath(newMode)).length, 0);
        assert.equal(h.storageValues.get(key), "1");

        const expiryReply = h.defer(logoutPath);
        const boots = [client.ensureAuthToken(), client.readCurrentUser()];
        await settle();
        assert.equal(h.storageValues.get(key), "1", "a dispatched cleanup does not establish expiry");
        assert.equal(h.browser.refreshCookie, oldCredentialCookie);
        expiryReply(null, 204, null, expiredCredentialCookie);
        assert.deepEqual(await Promise.all(boots), [null, null]);
        assert.equal(h.browser.refreshCookie, null);
        assert.equal(h.storageValues.has(key), false);
        assert.equal(await client.ensureAuthToken(), null, "cleanup completes an anonymous bootstrap");
        assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);

        const submission = form.submit();
        await settle();
        h.newReply(sentinelSession(3, "confirmed-owner"), 200, null, newCredentialCookie);
        await submission;
        assert.equal(client.readAuthToken(), "confirmed-owner");
        assert.equal((await client.readCurrentUser()).id, 3);
        assert.equal(h.storageValues.has(key), false);
        assert.deepEqual(form.routes, ["/wishlist"]);
        assert.equal(form.resets(), 1);
        // Ordinary refresh and later reload are usable for the accepted account.
        h.respondUsing(refreshPath, () => {
          assert.equal(h.browser.refreshCookie, newCredentialCookie);
          return Response.json(sentinelSession(3, "confirmed-rotation"));
        });
        assert.equal(await client.ensureAuthToken({ forceRefresh: true }), "confirmed-rotation");
        const reloaded = await freshCredentialClient();
        h.respondUsing(refreshPath, () => {
          assert.equal(h.browser.refreshCookie, newCredentialCookie);
          return Response.json(sentinelSession(3, "confirmed-reload"));
        });
        assert.equal(await reloaded.ensureAuthToken(), "confirmed-reload");
        assert.equal((await reloaded.readCurrentUser()).id, 3);
        assert.ok(h.storageCalls.every(([operation, storedKey, value]) => operation === "remove"
          || storedKey === key && value === "1"), "only a non-sensitive marker is persisted");
        assertCredentialSerialization(h.events);
      } finally { form?.dispose(); status?.dispose(); h.restore(); }
    });
  }
}

for (const mode of credentialModes) {
  test(`B-10 ${mode} waits for an already dispatched refresh before accepting a replacement cookie`, async () => {
    const h = await sentinelChatHarness();
    const form = await authComponentHarness(h, credentialFormName(mode));
    try {
      const browser = { refreshCookie: oldCredentialCookie };
      const events = observeAuthNetwork(browser);
      const refreshReply = h.defer(refreshPath);
      const refreshing = h.auth.ensureAuthToken({ forceRefresh: true }).catch(error => error);
      await settle();
      const credentialReply = h.defer(credentialPath(mode));
      const submission = form.submit();
      await settle();
      const credentialsBeforeRefresh = h.calls.filter(call => call.path === credentialPath(mode)).length;
      assert.equal(h.storageValues.get(h.auth.AUTH_REFRESH_COOKIE_QUARANTINE_KEY), "1");
      refreshReply(sentinelSession(1, "old-rotation"), 200, null, oldCredentialCookie);
      await refreshing;
      await settle();
      credentialReply(sentinelSession(3, "replacement"), 200, null, newCredentialCookie);
      await submission;
      assert.equal(credentialsBeforeRefresh, 0, "the older refresh cookie must settle before credentials dispatch");
      assert.equal(h.auth.readAuthToken(), "replacement");
      assert.equal(browser.refreshCookie, newCredentialCookie);
      assert.equal(h.storageValues.has(h.auth.AUTH_REFRESH_COOKIE_QUARANTINE_KEY), false);
      assert.deepEqual(events.filter(event => [refreshPath, credentialPath(mode)].includes(event.path))
        .map(({ phase, path }) => [phase, path]), [
        ["dispatch", refreshPath], ["settle", refreshPath],
        ["dispatch", credentialPath(mode)], ["settle", credentialPath(mode)],
      ]);
    } finally { form.dispose(); h.restore(); }
  });
}

for (const fault of ["read", "write", "unverified-write"]) {
  test(`B-10 storage ${fault} failure blocks cookie use or credential dispatch with a truthful error`, async () => {
    const h = await sentinelChatHarness();
    const { client, authApi } = await freshCredentialModules();
    const storage = window.localStorage;
    try {
      const key = client.AUTH_REFRESH_COOKIE_QUARANTINE_KEY;
      const unavailable = () => { throw new DOMException("Storage blocked", "SecurityError"); };
      window.localStorage = {
        ...storage,
        ...(fault === "read" ? { getItem: unavailable }
          : { setItem: fault === "write" ? unavailable : () => {} }),
      };
      if (fault === "read") {
        h.storageValues.set(key, "1");
        await assert.rejects(client.ensureAuthToken(), error => authApi.normalizeAuthError(error).code === "storage_unavailable");
        await assert.rejects(client.readCurrentUser(), error => authApi.normalizeAuthError(error).code === "storage_unavailable");
        assert.equal(h.storageValues.get(key), "1");
      }
      let invoked = false;
      await assert.rejects(client.withAuthCredentialTransition(() => {
        invoked = true;
        return Promise.resolve(sentinelSession(2, "must-not-be-sent"));
      }, result => client.commitAuthCredentialTransition(result)), error => {
        const details = authApi.normalizeAuthError(error);
        return details.code === "storage_unavailable" && details.status === null && details.requestId === null;
      });
      assert.equal(invoked, false);
      assert.equal(client.readAuthToken(), null);
      assert.equal(h.calls.length, 0);
      // Once storage is available, confirmed expiry is still required for this runtime.
      window.localStorage = storage;
      h.respond(logoutPath, null, 204, null, expiredCredentialCookie);
      assert.equal(await client.ensureAuthToken(), null);
      assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
    } finally { window.localStorage = storage; h.restore(); }
  });
}

for (const fault of ["remove", "unverified-remove", "read-after-remove"]) {
  test(`B-10 storage ${fault} failure rolls back credential acceptance and retains quarantine across reload`, async () => {
    const h = await sentinelChatHarness();
    h.auth.clearAuthToken();
    const form = await authComponentHarness(h, "LoginForm");
    const storage = window.localStorage;
    const key = h.auth.AUTH_REFRESH_COOKIE_QUARANTINE_KEY;
    try {
      const browser = { refreshCookie: null };
      observeAuthNetwork(browser);
      let failRead = false;
      window.localStorage = {
        ...storage,
        getItem: storedKey => {
          if (storedKey === key && failRead) {
            failRead = false;
            throw new DOMException("Trust read blocked", "SecurityError");
          }
          return storage.getItem(storedKey);
        },
        removeItem: storedKey => {
          if (storedKey !== key) return storage.removeItem(storedKey);
          if (fault === "remove") throw new DOMException("Trust removal blocked", "SecurityError");
          if (fault === "unverified-remove") return;
          storage.removeItem(storedKey);
          failRead = true;
        },
      };
      h.respond(credentialPath("login"), sentinelSession(2, "unaccepted"), 200, null, oldCredentialCookie);
      await form.submit();
      assert.equal(h.auth.readAuthToken(), null);
      assert.equal(form.resets(), 0);
      assert.deepEqual(form.routes, []);
      assert.match(form.error().message, /browser storage/);
      assert.equal(form.error().requestId, null);
      assert.equal(browser.refreshCookie, oldCredentialCookie);
      window.localStorage = storage;
      assert.equal(h.storageValues.get(key), "1", "rollback must leave a durable marker even if removal preceded the failed read");
      const client = await freshCredentialClient();
      h.respond(logoutPath, null, 204, null, expiredCredentialCookie);
      assert.equal(await client.ensureAuthToken(), null);
      assert.equal(await client.readCurrentUser(), null);
      assert.equal(browser.refreshCookie, null);
      assert.equal(h.storageValues.has(key), false);
      assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
    } finally { window.localStorage = storage; form.dispose(); h.restore(); }
  });
}

for (const failure of ["http", "network", "authentication", "csrf"]) {
  test(`F2 ordinary ${failure} logout failure quarantines surviving cookies across reload and permits safe recovery`, async () => {
    const h = await sentinelChatHarness();
    const status = await authComponentHarness(h, "AuthStatus");
    const browser = { refreshCookie: oldCredentialCookie };
    const events = observeAuthNetwork(browser);
    let reply;
    let loggingOut;
    try {
      const key = h.auth.AUTH_REFRESH_COOKIE_QUARANTINE_KEY;
      const revision = h.auth.readAuthSessionRevision();
      reply = h.defer(logoutPath);
      if (failure === "csrf") h.respond(logoutPath, {}, 403, "f2-logout-request");
      status.signOut();
      loggingOut = h.auth.logout();
      const rejected = assert.rejects(loggingOut, error => {
        const details = h.authApi.normalizeAuthError(error);
        assert.equal(details.status, failure === "http" ? 503 : failure === "authentication" ? 401 : failure === "csrf" ? 403 : null);
        assert.equal(details.requestId, failure === "network" ? null : "f2-logout-request");
        return true;
      });
      assert.equal(h.auth.readAuthToken(), null);
      assert.ok(h.auth.readAuthSessionRevision() > revision);
      assert.equal(h.storageValues.get(key), "1", "logout intent must be durable before any response or auth-event bootstrap");
      if (failure === "network") reply.reject(new TypeError("Logout never reached cookie expiry"));
      else reply({}, failure === "http" ? 503 : failure === "authentication" ? 401 : 403, "f2-logout-request");
      await rejected;
      const view = await status.view();
      assert.match(view, /"role":"alert"/);
      assert.match(view, /Signed out locally/);
      assert.match(view, /Retry sign out/);
      if (failure !== "network") assert.match(view, /f2-logout-request/);
      assert.equal(browser.refreshCookie, oldCredentialCookie);
      assert.equal(h.storageValues.get(key), "1");
      assert.equal(h.calls.filter(call => call.path === logoutPath).length, failure === "csrf" ? 2 : 1, "failure feedback must not silently retry logout");
      status.dispose();

      // The cookie is still valid: a refresh would restore A if dispatched.
      h.respondUsing(refreshPath, () => browser.refreshCookie === oldCredentialCookie
        ? Response.json(sentinelSession(1, "must-not-revive-A"))
        : Response.json(sentinelSession(2, "B-rotated")));
      const { client, authApi } = await freshCredentialModules();
      const cleanupReply = h.defer(logoutPath);
      const boots = [client.ensureAuthToken(), client.ensureAuthToken({ forceRefresh: true }), client.readCurrentUser()];
      const rejectedBoots = boots.map(boot => assert.rejects(boot, error => authApi.normalizeAuthError(error).status === 503));
      await settle();
      assert.equal(client.readAuthToken(), null);
      assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
      assert.equal(h.calls.filter(call => call.path === logoutPath).length, (failure === "csrf" ? 2 : 1) + 1, "fresh consumers share one cleanup");
      cleanupReply({}, 503, "f2-reload-cleanup");
      await Promise.all(rejectedBoots);
      assert.equal(browser.refreshCookie, oldCredentialCookie);
      assert.equal(h.storageValues.get(key), "1");

      const recovered = await freshCredentialModules();
      h.respond(logoutPath, null, 204, null, expiredCredentialCookie);
      assert.equal(await recovered.client.ensureAuthToken(), null);
      assert.equal(await recovered.client.readCurrentUser(), null);
      assert.equal(browser.refreshCookie, null);
      assert.equal(h.storageValues.has(key), false);
      assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
      h.respond(credentialPath("login"), sentinelSession(2, "B-explicit"), 200, null, newCredentialCookie);
      const form = await authComponentHarness({ ...h, auth: recovered.client, authApi: recovered.authApi }, "LoginForm");
      try { await form.submit(); assert.equal(form.error(), null); } finally { form.dispose(); }
      assert.equal(recovered.client.readAuthToken(), "B-explicit");
      assert.equal((await recovered.client.readCurrentUser()).id, 2);
      assert.equal(await recovered.client.ensureAuthToken({ forceRefresh: true }), "B-rotated");
      const reloaded = await freshCredentialClient();
      h.respond(refreshPath, sentinelSession(2, "B-after-reload"));
      assert.equal(await reloaded.ensureAuthToken(), "B-after-reload");
      assert.equal((await reloaded.readCurrentUser()).id, 2);
      assertCredentialSerialization(events);
    } finally {
      reply?.({}, 503, "f2-logout-request");
      if (loggingOut) await loggingOut.catch(() => undefined);
      status.dispose(); h.restore();
    }
  });
}

test("F2 successful logout coalesces bootstrap and repeated clicks, clears quarantine only after expiry", async () => {
  const h = await sentinelChatHarness();
  const browser = { refreshCookie: oldCredentialCookie };
  const events = observeAuthNetwork(browser);
  let reply;
  let loggingOut;
  try {
    reply = h.defer(logoutPath);
    loggingOut = h.auth.logout();
    assert.equal(h.auth.logout(), loggingOut);
    const key = h.auth.AUTH_REFRESH_COOKIE_QUARANTINE_KEY;
    assert.equal(h.storageValues.get(key), "1");
    const boot = h.auth.readCurrentUser();
    await settle();
    assert.equal(h.calls.filter(call => call.path === logoutPath).length, 1);
    assert.equal(browser.refreshCookie, oldCredentialCookie);
    reply(null, 204, null, expiredCredentialCookie);
    await loggingOut;
    assert.equal(await boot, null);
    assert.equal(browser.refreshCookie, null);
    assert.equal(h.storageValues.has(key), false);
    assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
    const client = await freshCredentialClient();
    h.respondUsing(refreshPath, () => {
      assert.equal(browser.refreshCookie, null);
      return Response.json({}, { status: 401 });
    });
    assert.equal(await client.ensureAuthToken(), null);
    assert.equal(await client.readCurrentUser(), null);
    assert.equal(events.filter(event => event.phase === "dispatch" && event.path === logoutPath).length, 1);
  } finally { reply?.(null, 204); if (loggingOut) await loggingOut; h.restore(); }
});

test("F2 failed logout retry feedback remains actionable without automatic retries or a poisoned queue", async () => {
  const h = await sentinelChatHarness();
  const status = await authComponentHarness(h, "AuthStatus");
  try {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const reply = h.defer(logoutPath);
      status.signOut();
      const operation = h.auth.logout();
      const completion = attempt < 3 ? assert.rejects(operation) : operation;
      assert.equal(h.auth.readAuthToken(), null);
      assert.equal(h.storageValues.get(h.auth.AUTH_REFRESH_COOKIE_QUARANTINE_KEY), "1");
      await settle();
      assert.equal(h.calls.filter(call => call.path === logoutPath).length, attempt);
      reply(attempt < 3 ? {} : null, attempt < 3 ? 503 : 204, `retry-${attempt}`);
      await completion;
      const view = await status.view();
      if (attempt < 3) {
        assert.match(view, /"role":"alert"/);
        assert.match(view, /Retry sign out/);
        assert.match(view, new RegExp(`retry-${attempt}`));
      } else {
        assert.match(view, /auth-status--anonymous/);
        assert.doesNotMatch(view, /Signed out locally|Retry sign out/);
        assert.equal(h.storageValues.has(h.auth.AUTH_REFRESH_COOKIE_QUARANTINE_KEY), false);
      }
    }
    assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
  } finally { status.dispose(); h.restore(); }
});

for (const fault of ["read", "write", "unverified-write"]) {
  test(`F2 failed logout with storage ${fault} failure invalidates locally, reports storage failure and recovers safely`, async () => {
    const h = await sentinelChatHarness();
    const status = await authComponentHarness(h, "AuthStatus");
    const storage = window.localStorage;
    const key = h.auth.AUTH_REFRESH_COOKIE_QUARANTINE_KEY;
    try {
      const blocked = () => { throw new DOMException("Storage blocked", "SecurityError"); };
      window.localStorage = { ...storage, ...(fault === "read" ? { getItem: blocked }
        : { setItem: fault === "write" ? blocked : () => {} }) };
      h.respond(logoutPath, {}, 503);
      status.signOut();
      await assert.rejects(h.auth.logout(), error => h.authApi.normalizeAuthError(error).code === "storage_unavailable");
      assert.equal(h.auth.readAuthToken(), null);
      assert.match(await status.view(), /browser storage|Browser storage/);
      assert.match(await status.view(), /retry sign out before reloading/);
      if (fault === "read") {
        const fresh = await freshCredentialModules();
        await assert.rejects(fresh.client.ensureAuthToken(), error => fresh.authApi.normalizeAuthError(error).code === "storage_unavailable");
      }
      window.localStorage = storage;
      h.respond(logoutPath, null, 204, null, expiredCredentialCookie);
      assert.equal(await h.auth.ensureAuthToken(), null, "the memory quarantine requires expiry when storage becomes usable");
      assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
      assert.equal(h.storageValues.has(key), false);
    } finally { window.localStorage = storage; status.dispose(); h.restore(); }
  });
}

for (const fault of ["remove", "unverified-remove", "read-after-remove"]) {
  test(`F2 confirmed server logout with storage ${fault} failure retains quarantine and permits recovery after reload`, async () => {
    const h = await sentinelChatHarness();
    const storage = window.localStorage;
    const key = h.auth.AUTH_REFRESH_COOKIE_QUARANTINE_KEY;
    try {
      let failRead = false;
      window.localStorage = {
        ...storage,
        getItem: storedKey => {
          if (storedKey === key && failRead) { failRead = false; throw new DOMException("Read blocked", "SecurityError"); }
          return storage.getItem(storedKey);
        },
        removeItem: storedKey => {
          if (storedKey !== key) return storage.removeItem(storedKey);
          if (fault === "remove") throw new DOMException("Removal blocked", "SecurityError");
          if (fault === "unverified-remove") return;
          storage.removeItem(storedKey); failRead = true;
        },
      };
      h.respond(logoutPath, null, 204, null, expiredCredentialCookie);
      await assert.rejects(h.auth.logout(), error => h.authApi.normalizeAuthError(error).code === "storage_unavailable");
      assert.equal(h.auth.readAuthToken(), null);
      assert.equal(h.storageValues.get(key), "1");
      window.localStorage = storage;
      const client = await freshCredentialClient();
      h.respond(logoutPath, null, 204, null, expiredCredentialCookie);
      assert.equal(await client.ensureAuthToken(), null);
      assert.equal(await client.readCurrentUser(), null);
      assert.equal(h.storageValues.has(key), false);
      assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
    } finally { window.localStorage = storage; h.restore(); }
  });
}

for (const fault of ["write", "unverified-write"]) {
  test(`F2 storage ${fault} failure uses a verified non-sensitive cookie quarantine across reload and explicit sign-in`, async () => {
    const h = await sentinelChatHarness();
    const storage = window.localStorage;
    const originalDocument = globalThis.document;
    const cookieWrites = [];
    let cookie = "";
    globalThis.document = {
      get cookie() { return cookie; },
      set cookie(value) {
        cookieWrites.push(value);
        cookie = value.includes("Max-Age=0") ? "" : value.split(";")[0];
      },
    };
    try {
      const key = h.auth.AUTH_REFRESH_COOKIE_QUARANTINE_KEY;
      window.localStorage = { ...storage, setItem() {
        if (fault === "write") throw new DOMException("Storage full", "QuotaExceededError");
      } };
      h.respond(logoutPath, {}, 503);
      await assert.rejects(h.auth.logout(), error => h.authApi.normalizeAuthError(error).status === 503);
      assert.equal(h.auth.readAuthToken(), null);
      assert.equal(h.storageValues.has(key), false);
      assert.equal(cookie, `${key}=1`);
      const { client, authApi } = await freshCredentialModules();
      h.respond(logoutPath, {}, 503);
      await assert.rejects(client.ensureAuthToken(), error => authApi.normalizeAuthError(error).status === 503);
      assert.equal(client.readAuthToken(), null);
      assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
      h.respond(logoutPath, null, 204);
      assert.equal(await client.ensureAuthToken(), null);
      assert.equal(cookie, "", "only verified cleanup removes the fallback");

      h.respond(credentialPath("login"), sentinelSession(2, "B-after-storage-failure"));
      await client.withAuthCredentialTransition(() => h.authApi.login({ emailOrUsername: "player2", password: "pass1234" }), result => client.commitAuthCredentialTransition(result));
      assert.equal(client.readAuthToken(), "B-after-storage-failure");
      assert.equal((await client.readCurrentUser()).id, 2);
      assert.equal(cookie, "");
      const reloaded = await freshCredentialClient();
      h.respond(refreshPath, sentinelSession(2, "B-cookie-reload"));
      assert.equal(await reloaded.ensureAuthToken(), "B-cookie-reload");
      assert.ok(cookieWrites.every(value => value.startsWith(`${key}=`)
        && value.includes("Path=/; SameSite=Strict; Max-Age=")), "fallback contains only a scoped non-sensitive marker");
      assert.doesNotMatch(cookieWrites.join(" "), /B-after-storage-failure|pass1234/);
    } finally {
      window.localStorage = storage;
      if (originalDocument === undefined) delete globalThis.document;
      else globalThis.document = originalDocument;
      h.restore();
    }
  });
}

test("F2 failure to verify either durable quarantine reports storage failure and stays locally invalidated", async () => {
  const h = await sentinelChatHarness();
  const storage = window.localStorage;
  const originalDocument = globalThis.document;
  globalThis.document = { get cookie() { return ""; }, set cookie(_value) {} };
  try {
    window.localStorage = { ...storage, setItem() {} };
    h.respond(logoutPath, {}, 503);
    await assert.rejects(h.auth.logout(), error => h.authApi.normalizeAuthError(error).code === "storage_unavailable");
    assert.equal(h.auth.readAuthToken(), null);
    assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
    window.localStorage = storage;
    h.respond(logoutPath, null, 204);
    assert.equal(await h.auth.ensureAuthToken(), null);
  } finally {
    window.localStorage = storage;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    h.restore();
  }
});

test("F2 logout waits for a late refresh cookie, rejects its token write and quarantines it if server expiry fails", async () => {
  const h = await sentinelChatHarness();
  const browser = { refreshCookie: oldCredentialCookie };
  const events = observeAuthNetwork(browser);
  let refreshReply;
  let logoutReply;
  let refreshing;
  let loggingOut;
  try {
    refreshReply = h.defer(refreshPath);
    refreshing = h.auth.ensureAuthToken({ forceRefresh: true });
    await waitForAuthDispatch(events, refreshPath);
    logoutReply = h.defer(logoutPath);
    loggingOut = h.auth.logout();
    const rejected = assert.rejects(loggingOut);
    assert.equal(await h.auth.ensureAuthToken({ forceRefresh: true }), null);
    assert.equal(h.calls.filter(call => call.path === logoutPath).length, 0);
    refreshReply(sentinelSession(1, "late-A"), 200, null, oldCredentialCookie);
    assert.equal(await refreshing, null, "the late refresh settles before logout and cannot reauthenticate A");
    await waitForAuthDispatch(events, logoutPath);
    logoutReply({}, 503);
    await rejected;
    assert.equal(h.auth.readAuthToken(), null);
    assert.equal(h.storageValues.get(h.auth.AUTH_REFRESH_COOKIE_QUARANTINE_KEY), "1");
    const client = await freshCredentialClient();
    h.respond(logoutPath, null, 204, null, expiredCredentialCookie);
    assert.equal(await client.ensureAuthToken(), null);
    assert.equal(browser.refreshCookie, null);
    assert.equal(h.calls.filter(call => call.path === refreshPath).length, 1);
  } finally {
    refreshReply?.(sentinelSession()); logoutReply?.(null, 204);
    if (refreshing) await refreshing.catch(() => undefined);
    if (loggingOut) await loggingOut.catch(() => undefined);
    h.restore();
  }
});

test("B-08 production Sign out -> login/register waits for logout response before dispatching replacement credentials", async () => {
  for (const mode of ["login", "register"]) {
    const h = await sentinelChatHarness();
    const status = await authComponentHarness(h, "AuthStatus");
    const form = await authComponentHarness(h, mode === "login" ? "LoginForm" : "RegisterForm");
    try {
      const events = observeAuthNetwork();
      const logoutReply = h.defer(logoutPath);
      const revision = h.auth.readAuthSessionRevision();
      status.signOut();
      const loggingOut = h.auth.logout(); // Joins the production button's operation.
      assert.equal(h.auth.readAuthToken(), null);
      assert.ok(h.auth.readAuthSessionRevision() > revision);
      await settle();
      assert.equal(h.calls.filter(call => call.path === logoutPath).length, 1);
      assert.match(await status.view(), /auth-status--anonymous/);
      const credentialReply = h.defer(`/api/auth/${mode}`);
      const submitting = form.submit();
      await form.submit(); // Disabled/submitting guard must not duplicate credentials.
      await settle();
      assert.equal(form.state(), true);
      assert.equal(h.calls.filter(call => call.path === `/api/auth/${mode}`).length, 0);
      assert.equal(h.auth.readAuthToken(), null);
      logoutReply(null, 204);
      await loggingOut;
      await settle();
      assert.equal(h.calls.filter(call => call.path === `/api/auth/${mode}`).length, 1);
      credentialReply(sentinelSession(2, "replacement"), mode === "register" ? 201 : 200);
      await submitting;
      assert.equal(h.auth.readAuthToken(), "replacement");
      assert.deepEqual(await h.auth.readCurrentUser(), sentinelSession(2).user);
      assert.match(await status.view(), /auth-status--authenticated/);
      assert.equal(status.state().user.id, 2);
      assert.deepEqual(form.routes, ["/wishlist"]);
      assert.equal(form.resets(), 1);
      assert.equal(form.state(), false);
      const transitions = events.filter(event => [logoutPath, `/api/auth/${mode}`].includes(event.path));
      assert.deepEqual(transitions.map(({ phase, path }) => [phase, path]), [
        ["dispatch", logoutPath], ["settle", logoutPath],
        ["dispatch", `/api/auth/${mode}`], ["settle", `/api/auth/${mode}`],
      ]);
      assert.ok(transitions.filter(event => event.phase === "dispatch").every(event => event.credentials === "include"));
      assert.ok(h.storageCalls.every(([operation, key, value]) => operation === "remove"
        || key === h.auth.AUTH_REFRESH_COOKIE_QUARANTINE_KEY && value === "1"));
    } finally { form.dispose(); status.dispose(); h.restore(); }
  }
});

test("B-08 failed HTTP/network logout releases barriers but requires cookie cleanup before explicit credential recovery", async () => {
  for (const mode of ["login", "register"]) {
    for (const failure of ["http", "network"]) {
      const h = await sentinelChatHarness();
      const form = await authComponentHarness(h, mode === "login" ? "LoginForm" : "RegisterForm");
      try {
        const events = observeAuthNetwork();
        const logoutReply = h.defer(logoutPath);
        const loggingOut = h.auth.logout();
        const rejected = assert.rejects(loggingOut, error => {
          const details = h.authApi.normalizeAuthError(error);
          return failure === "http" ? details.status === 503 && details.requestId === "b08-logout-request"
            : details.code === "service_unavailable";
        });
        await settle();
        h.respond(`/api/auth/${mode}`, sentinelSession(2, "replacement"));
        const submitting = form.submit();
        await settle();
        assert.equal(h.calls.filter(call => call.path === `/api/auth/${mode}`).length, 0);
        if (failure === "http") logoutReply({}, 503, "b08-logout-request");
        else logoutReply.reject(new TypeError("Failed to fetch"));
        await rejected;
        await submitting;
        assert.equal(h.auth.readAuthToken(), null, "credentials queued behind a failed logout must not bypass quarantine");
        assert.ok(form.error(), "the queued attempt reports the cleanup failure");
        assert.equal(h.calls.filter(call => call.path === `/api/auth/${mode}`).length, 0);
        h.respond(logoutPath, null, 204, null, expiredCredentialCookie);
        await form.submit();
        assert.equal(h.auth.readAuthToken(), "replacement");
        assert.equal((await h.auth.readCurrentUser()).id, 2);
        assert.equal(form.error(), null);
        assert.deepEqual(events.filter(event => [logoutPath, `/api/auth/${mode}`].includes(event.path))
          .map(({ phase, path }) => [phase, path]), [
          ["dispatch", logoutPath], ["settle", logoutPath],
          ["dispatch", logoutPath], ["settle", logoutPath],
          ["dispatch", `/api/auth/${mode}`], ["settle", `/api/auth/${mode}`],
        ]);
        // A subsequent logout is a new usable operation, not a rejected barrier.
        h.respond(logoutPath, {});
        await h.auth.logout();
        assert.equal(h.auth.readAuthToken(), null);
        assert.equal(h.calls.filter(call => call.path === logoutPath).length, 3);
      } finally { form.dispose(); h.restore(); }
    }
  }
});

test("B-08 stale logout success/failure and AuthStatus completion preserve newer sessions even with identical token strings", async () => {
  for (const userId of [1, 2]) {
    for (const completion of ["success", "http", "network"]) {
      const h = await sentinelChatHarness();
      const status = await authComponentHarness(h, "AuthStatus");
      try {
        const events = [];
        const onAuthChange = () => events.push(h.auth.readAuthSessionRevision());
        window.addEventListener(h.auth.AUTH_STATE_EVENT, onAuthChange);
        const logoutReply = h.defer(logoutPath);
        status.signOut();
        const loggingOut = h.auth.logout();
        const completed = completion === "success" ? loggingOut : assert.rejects(loggingOut);
        await settle();
        assert.match(await status.view(), /auth-status--anonymous/);
        const replacement = sentinelSession(userId, "initial");
        h.auth.startAuthSession(replacement);
        await status.view();
        assert.equal(status.state().status, "authenticated");
        const revision = h.auth.readAuthSessionRevision();
        const eventCount = events.length;
        const changeCount = status.changes.length;
        if (completion === "network") logoutReply.reject(new TypeError("Failed to fetch"));
        else logoutReply(completion === "success" ? null : {}, completion === "success" ? 204 : 503);
        await completed;
        assert.match(await status.view(), /auth-status--authenticated/);
        assert.equal(h.auth.readAuthToken(), replacement.token);
        assert.deepEqual(await h.auth.readCurrentUser(), replacement.user);
        assert.equal(h.auth.readAuthSessionRevision(), revision);
        assert.equal(events.length, eventCount, "stale completion emits no destructive auth event");
        assert.equal(status.state().user.id, userId);
        assert.ok(status.changes.slice(changeCount).filter(change => change.index === 0)
          .every(change => change.value.status === "authenticated"));
        window.removeEventListener(h.auth.AUTH_STATE_EVENT, onAuthChange);
      } finally { status.dispose(); h.restore(); }
    }
  }
});

test("B-08 ordinary and failed production sign-out invalidate immediately and remain usable anonymous", async () => {
  for (const completion of ["success", "http", "network"]) {
    const h = await sentinelChatHarness();
    const status = await authComponentHarness(h, "AuthStatus");
    try {
      const reply = h.defer(logoutPath);
      const revision = h.auth.readAuthSessionRevision();
      status.signOut();
      const loggingOut = h.auth.logout();
      const completed = completion === "success" ? loggingOut : assert.rejects(loggingOut);
      assert.equal(h.auth.readAuthToken(), null);
      assert.ok(h.auth.readAuthSessionRevision() > revision);
      assert.equal(h.calls.filter(call => call.path === logoutPath).length, 0, "local invalidation precedes even HTTP dispatch");
      assert.equal(await h.auth.readCurrentUser(), null);
      assert.match(await status.view(), /auth-status--anonymous/);
      if (completion === "network") reply.reject(new TypeError("Failed to fetch"));
      else reply(completion === "success" ? null : {}, completion === "success" ? 204 : 503);
      await completed;
      assert.match(await status.view(), completion === "success" ? /auth-status--anonymous/ : /Signed out locally/);
      assert.equal(h.auth.readAuthToken(), null);
      if (completion !== "success") h.respond(logoutPath, null, 204, null, expiredCredentialCookie);
      assert.equal(await h.auth.readCurrentUser(), null);
      h.respond("/api/auth/login", sentinelSession(2, "recovered"));
      const form = await authComponentHarness(h, "LoginForm");
      try { await form.submit(); } finally { form.dispose(); }
      assert.equal(h.auth.readAuthToken(), "recovered");
      assert.match(await status.view(), /auth-status--authenticated/);
    } finally { status.dispose(); h.restore(); }
  }
});

test("B-08 multiple pending logout calls coalesce one request, barrier and cleanup", async () => {
  const h = await sentinelChatHarness();
  try {
    const reply = h.defer(logoutPath);
    const revision = h.auth.readAuthSessionRevision();
    const first = h.auth.logout();
    const invalidatedRevision = h.auth.readAuthSessionRevision();
    const second = h.auth.logout();
    assert.equal(first, second);
    assert.equal(invalidatedRevision, revision + 1);
    assert.equal(h.auth.readAuthSessionRevision(), invalidatedRevision);
    await settle();
    assert.equal(h.calls.filter(call => call.path === logoutPath).length, 1);
    reply(null, 204);
    await Promise.all([first, second]);
    assert.equal(h.auth.readAuthToken(), null);
    assert.equal(h.auth.readAuthSessionRevision(), invalidatedRevision + 1);
  } finally { h.restore(); }
});

test("B-08 normal credential forms retain validation, raw password, navigation and request-ID errors without logout or refresh requests", async () => {
  for (const mode of ["login", "register"]) {
    const h = await sentinelChatHarness();
    const form = await authComponentHarness(h, mode === "login" ? "LoginForm" : "RegisterForm", "https://example.com");
    try {
      await form.submit({ password: " " });
      if (mode === "register") await form.submit({ username: "ab" });
      assert.equal(h.calls.filter(call => call.path === `/api/auth/${mode}`).length, 0);
      assert.equal(form.state(), false);
      h.respond(`/api/auth/${mode}`, {}, mode === "login" ? 401 : 409, "b08-credential-request");
      await form.submit();
      assert.equal(form.error().requestId, "b08-credential-request");
      assert.deepEqual(form.routes, []);
      assert.equal(form.resets(), 0);
      h.respond(`/api/auth/${mode}`, sentinelSession(2, "replacement"));
      await form.submit();
      const calls = h.calls.filter(call => call.path === `/api/auth/${mode}`);
      assert.equal(calls.length, 2);
      assert.equal(calls[1].body.password, " pass1234 ");
      assert.equal(calls[1].body[mode === "login" ? "emailOrUsername" : "username"], "player2");
      assert.equal(h.calls.filter(call => [logoutPath, refreshPath].includes(call.path)).length, 0);
      assert.equal(h.auth.readAuthToken(), "replacement");
      assert.deepEqual(form.routes, ["/wishlist"]);
    } finally { form.dispose(); h.restore(); }
  }
});

test("B-08 credential barrier includes an in-flight refresh and every logout CSRF retry response", async () => {
  const h = await sentinelChatHarness();
  const form = await authComponentHarness(h, "LoginForm");
  try {
    const events = observeAuthNetwork();
    const refreshReply = h.defer(refreshPath);
    const refreshing = h.auth.ensureAuthToken({ forceRefresh: true });
    await waitForAuthDispatch(events, refreshPath);
    const firstLogoutReply = h.defer(logoutPath);
    const loggingOut = h.auth.logout();
    h.respond("/api/auth/login", sentinelSession(2, "replacement"));
    const submitting = form.submit();
    await settle();
    assert.equal(h.calls.filter(call => [logoutPath, "/api/auth/login"].includes(call.path)).length, 0);
    refreshReply(sentinelSession(1, "late-rotation"));
    assert.equal(await refreshing, null, "logout invalidates the old refresh token write");
    await waitForAuthDispatch(events, logoutPath);
    assert.equal(h.calls.filter(call => call.path === logoutPath).length, 1);
    const retryLogoutReply = h.defer(logoutPath);
    firstLogoutReply({}, 403);
    await waitForAuthDispatch(events, logoutPath, 2);
    assert.equal(h.calls.filter(call => call.path === logoutPath).length, 2);
    assert.equal(h.calls.filter(call => call.path === "/api/auth/login").length, 0);
    retryLogoutReply(null, 204);
    await loggingOut;
    await submitting;
    assert.equal(h.auth.readAuthToken(), "replacement");
    assert.deepEqual(events.filter(event => [refreshPath, logoutPath, "/api/auth/login"].includes(event.path))
      .map(({ phase, path }) => [phase, path]), [
      ["dispatch", refreshPath], ["settle", refreshPath],
      ["dispatch", logoutPath], ["settle", logoutPath],
      ["dispatch", logoutPath], ["settle", logoutPath],
      ["dispatch", "/api/auth/login"], ["settle", "/api/auth/login"],
    ]);
  } finally { form.dispose(); h.restore(); }
});

// Execute Wishlist's actual state declarations, refresh effect and mutation
// handlers with stable hook cells and the production auth/HTTP/retry clients.
async function wishlistExplorerHarness(initialItems = [alertItem], { anonymous = false, loadStatus = 200, beforeAuthRecoveryDecision } = {}) {
  const h = await sentinelChatHarness();
  const source = await readFile(new URL("../src/components/WishlistExplorer.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("wishlist.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = ast.statements.find(node => node.name?.text === "WishlistExplorer");
  const end = component.body.statements.findIndex(node => ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(item => item.name.getText(ast) === "priceDropCount"));
  assert.ok(end > 0);
  const program = [
    ...ast.statements.filter(node => ["alertsFor", "protectedWishlistError", "requestCurrentWishlistSnapshot"].includes(node.name?.text)),
    ...component.body.statements.slice(0, end),
  ].map(node => node.getText(ast)).join("\n").replaceAll("void refreshWishlist();", "pendingWishlistLoads.push(refreshWishlist());");
  const output = ts.transpileModule(program, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let cursor = 0;
  const cells = [];
  let effects = [];
  const changes = [];
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      cells[index] ??= { value: typeof initial === "function" ? initial() : initial };
      return [cells[index].value, value => {
        cells[index].value = typeof value === "function" ? value(cells[index].value) : value;
        changes.push(index);
      }];
    },
    useRef(initial) {
      const index = cursor++;
      cells[index] ??= { current: initial };
      return cells[index];
    },
    useCallback(callback) { cursor++; return callback; },
    useMemo(callback) { cursor++; return callback(); },
    useEffect(callback, deps) {
      const index = cursor++;
      if (sameDeps(cells[index]?.deps, deps)) return;
      effects.push(() => {
        cells[index]?.cleanup?.();
        cells[index] = { deps, cleanup: callback() };
      });
    },
  };
  const pendingWishlistLoads = [];
  const mocks = {
    ...hooks, ...h.auth, ...h.wishlist, normalizeAuthError: h.authApi.normalizeAuthError,
    wishlistItems: [], source: "api", pendingWishlistLoads,
    ...(beforeAuthRecoveryDecision ? {
      withAuthSessionRetry: (token, request, isAuthenticationError, operation) => h.auth.withAuthSessionRetry(token, request, error => {
        beforeAuthRecoveryDecision();
        return isAuthenticationError(error);
      }, operation),
    } : {}),
  };
  const renderState = new Function(...Object.keys(mocks), `${output}\nreturn {
    handleAlertUpdate, handleDelete, handleItemAdded, refreshAlertEvents, handleAuthenticationRequired,
    retry: () => setRefreshKey(current => current + 1),
    state: { personalItems, alerts, view, authToken, serviceMessage, operationMessage,
      itemMessages, alertEvents, alertEventsLoading, alertEventsMessage,
      generation: wishlistDataGeneration.current }
  };`);
  let handlers;
  const render = () => {
    cursor = 0;
    handlers = renderState(...Object.values(mocks));
    const pending = effects;
    effects = [];
    pending.forEach(effect => effect());
    return handlers;
  };
  if (anonymous) h.auth.clearAuthToken();
  else {
    h.respond(wishlistPath, initialItems, loadStatus);
    h.respond(`${wishlistPath}/alert-events`, []);
  }
  render();
  await settle();
  render();
  const addFormState = { message: null, isSubmitting: false, resets: 0, addedCalls: 0 };
  const forms = [];
  let addForm;
  async function createForm() {
    addForm = await wishlistConsumerHarness(h, "AddWishlistItemForm");
    forms.push(addForm);
  }
  await createForm();
  return {
    ...h, render, addFormState, changes,
    loaded: () => pendingWishlistLoads.at(-1),
    refreshEvents: token => render().refreshAlertEvents(token),
    authEvent: () => window.dispatchEvent(new Event(h.auth.AUTH_STATE_EVENT)),
    dispose: () => { forms.forEach(form => form.dispose()); cells.forEach(cell => cell.cleanup?.()); },
    remount() {
      cells.forEach(cell => cell.cleanup?.());
      cells.length = 0;
      effects = [];
      render();
    },
    state: () => render().state,
    update: (item, payload) => render().handleAlertUpdate(item, payload, "Persisted wishlist settings updated."),
    remove: item => render().handleDelete(item),
    added: item => render().handleItemAdded(item),
    retry: () => { render().retry(); render(); },
    async add(item) {
      const parent = render();
      if (!addForm) await createForm();
      const form = addForm;
      const handlers = form.render({
        token: h.auth.readAuthToken(),
        onAdded: saved => { addFormState.addedCalls++; parent.handleItemAdded(saved); },
        onAuthenticationRequired: parent.handleAuthenticationRequired,
      });
      await form.submit(item, handlers.handleSubmit);
      const state = form.render().state;
      addFormState.message = state.message;
      addFormState.isSubmitting = state.isSubmitting;
      addFormState.resets = form.callbacks.filter(([kind]) => kind === "reset").length;
    },
    restore() { forms.forEach(form => form.dispose()); cells.forEach(cell => cell.cleanup?.()); h.restore(); },
  };
}

const f3EventPath = `${wishlistPath}/alert-events`;
const f3Event = {
  id: 901, wishlistItemId: 42, itemTitle: "Current personal game", store: "Steam",
  currentPrice: "$10.00", targetPrice: "$2.00", evaluationState: "watching",
  targetReached: false, message: "Latest authorized alert history", createdAt: "2026-11-14T00:00:00Z",
};
const f3Refreshes = h => h.calls.filter(call => call.path === refreshPath);
function assertF3Preserved(h, before, revision) {
  assert.equal(f3Refreshes(h).length, 0, "obsolete work must not initiate authentication refresh");
  assert.equal(h.auth.readAuthToken(), "initial");
  assert.equal(h.auth.readAuthSessionRevision(), revision, "obsolete work must not invalidate the session");
  assert.deepEqual(h.state(), before, "latest personal items, alerts, messages and loading state must remain authoritative");
}

for (const target of ["wishlist", "alert-events"]) {
  for (const action of ["add", "edit", "delete"]) {
    for (const status of [200, 401, 500]) {
      test(`F3 obsolete ${target} ${status} after authorized ${action} cannot affect authentication or current state`, async () => {
        const h = await wishlistExplorerHarness();
        let oldReply, mutationReply, freshEventsReply, oldLoad, mutation;
        try {
          await h.loaded();
          const revision = h.auth.readAuthSessionRevision();
          const saved = { ...alertItem, id: action === "add" ? 99 : 42, title: "Latest personal game", alertActive: true };
          mutationReply = h.defer(action === "add" ? wishlistPath : action === "edit" ? `${wishlistPath}/42/alert` : `${wishlistPath}/42`);
          mutation = action === "add" ? h.add(saved) : action === "edit" ? h.update(alertItem, { alertActive: true }) : h.remove(alertItem);
          if (target === "wishlist") { oldReply = h.defer(wishlistPath); h.respond(f3EventPath, []); }
          else { h.respond(wishlistPath, [alertItem]); oldReply = h.defer(f3EventPath); }
          h.retry(); oldLoad = h.loaded(); await settle();
          if (action !== "delete") freshEventsReply = h.defer(f3EventPath);
          mutationReply(saved); await mutation;
          const before = structuredClone(h.state());
          assert.equal(before.generation, 1);
          assert.equal(before.view, "personal");
          assert.deepEqual(before.personalItems, action === "delete" ? [] : action === "add" ? [saved, alertItem] : [saved]);
          // An unnecessary refresh would expire the session, exposing the bug.
          h.respond(refreshPath, {}, 401);
          oldReply(status === 200 ? target === "wishlist" ? [alertItem] : [] : {}, status);
          await oldLoad; await settle();
          assertF3Preserved(h, before, revision);
          if (freshEventsReply) {
            freshEventsReply([f3Event]); await settle();
            assert.deepEqual(h.state().alertEvents, [f3Event]);
            assert.equal(h.state().alertEventsLoading, false);
          } else assert.equal(h.state().alertEventsLoading, false);
        } finally {
          mutationReply?.(alertItem); oldReply?.([]); freshEventsReply?.([]);
          if (mutation) await mutation;
          if (oldLoad) await oldLoad;
          await settle(); h.restore();
        }
      });
    }
  }

  for (const status of [200, 401, 500]) {
    test(`F3 competing ${target} ${status} cannot supersede a newer GET in the same effect`, async () => {
      const h = await wishlistExplorerHarness();
      let reply, oldLoad;
      try {
        await h.loaded();
        if (target === "wishlist") { reply = h.defer(wishlistPath); h.respond(f3EventPath, []); }
        else { h.respond(wishlistPath, [alertItem]); reply = h.defer(f3EventPath); }
        h.authEvent(); oldLoad = h.loaded(); await settle();
        const latest = { ...alertItem, title: "Newer GET authority", alertActive: true };
        h.respond(wishlistPath, [latest]); h.respond(f3EventPath, [f3Event]);
        h.authEvent(); await h.loaded();
        const before = structuredClone(h.state()), revision = h.auth.readAuthSessionRevision();
        assert.equal(before.generation, 0, "request ordering is independent of mutation generation");
        h.respond(refreshPath, {}, 401);
        reply(status === 200 ? target === "wishlist" ? [alertItem] : [] : {}, status);
        await oldLoad; await settle();
        assertF3Preserved(h, before, revision);
      } finally { reply?.([]); if (oldLoad) await oldLoad; await settle(); h.restore(); }
    });
  }

  for (const outcome of ["recovered", "unrecoverable"]) {
    test(`F3 current ${target} 401 keeps legitimate ${outcome} authentication behavior`, async () => {
      const h = await wishlistExplorerHarness();
      try {
        await h.loaded();
        const revision = h.auth.readAuthSessionRevision();
        h.respond(wishlistPath, target === "wishlist" ? {} : [alertItem], target === "wishlist" ? 401 : 200);
        h.respond(f3EventPath, target === "alert-events" ? {} : [], target === "alert-events" ? 401 : 200);
        const latest = { ...alertItem, title: "Recovered current request" };
        if (outcome === "recovered") {
          h.respond(refreshPath, sentinelSession(1, "rotated"));
          h.respond(wishlistPath, [latest]); h.respond(f3EventPath, [f3Event]);
        } else h.respond(refreshPath, {}, 401);
        h.retry(); await h.loaded(); await h.loaded(); await settle();
        assert.equal(f3Refreshes(h).length, 1, "a genuine current 401 may initiate one recovery");
        if (outcome === "recovered") {
          assert.equal(h.auth.readAuthSessionRevision(), revision);
          assert.equal(h.auth.readAuthToken(), "rotated");
          assert.equal(h.state().view, "personal");
          assert.deepEqual(h.state().personalItems, [latest]);
          assert.deepEqual(h.state().alertEvents, [f3Event]);
          assert.equal(h.state().authToken, "rotated");
        } else {
          assert.ok(h.auth.readAuthSessionRevision() > revision);
          assert.equal(h.auth.readAuthToken(), null);
          assert.equal(h.state().view, "public");
          assert.deepEqual(h.state().personalItems, []);
        }
      } finally { h.restore(); }
    });
  }

  for (const token of ["account-b", "initial"]) {
    test(`F3 obsolete ${target} 401 cannot affect a replacement account with token ${token}`, async () => {
      const h = await wishlistExplorerHarness();
      let reply, oldLoad;
      try {
        await h.loaded();
        if (target === "wishlist") { reply = h.defer(wishlistPath); h.respond(f3EventPath, []); }
        else { h.respond(wishlistPath, [alertItem]); reply = h.defer(f3EventPath); }
        h.authEvent(); oldLoad = h.loaded(); await settle();
        const replacement = { ...alertItem, title: "Account B authoritative item" };
        h.respond(wishlistPath, [replacement]); h.respond(f3EventPath, [f3Event]);
        h.auth.startAuthSession(sentinelSession(2, token)); await h.loaded();
        const before = structuredClone(h.state()), revision = h.auth.readAuthSessionRevision();
        reply({}, 401); await oldLoad;
        assert.deepEqual(h.state(), before);
        assert.equal(h.auth.readAuthSessionRevision(), revision);
        assert.equal(h.auth.readAuthToken(), token);
        assert.equal(f3Refreshes(h).length, 0);
      } finally { reply?.([]); if (oldLoad) await oldLoad; h.restore(); }
    });
  }

  test(`F3 disposed ${target} GET cannot trigger recovery after unmount`, async () => {
    const h = await wishlistExplorerHarness();
    let reply, load;
    try {
      await h.loaded();
      if (target === "wishlist") { reply = h.defer(wishlistPath); h.respond(f3EventPath, []); }
      else { h.respond(wishlistPath, [alertItem]); reply = h.defer(f3EventPath); }
      h.authEvent(); load = h.loaded(); await settle();
      const revision = h.auth.readAuthSessionRevision(), before = structuredClone(h.state());
      h.dispose(); h.respond(refreshPath, {}, 401);
      reply({}, 401); await load;
      assertF3Preserved(h, before, revision);
    } finally { reply?.([]); if (load) await load; h.restore(); }
  });

  test(`F3 ${target} becoming obsolete during legitimate auth recovery cannot dispatch its retry`, async () => {
    const h = await wishlistExplorerHarness();
    let patchReply, refreshReply, eventsReply, saving, oldLoad;
    try {
      await h.loaded();
      const revision = h.auth.readAuthSessionRevision();
      patchReply = h.defer(`${wishlistPath}/42/alert`);
      saving = h.update(alertItem, { alertActive: true });
      h.respond(wishlistPath, target === "wishlist" ? {} : [alertItem], target === "wishlist" ? 401 : 200);
      h.respond(f3EventPath, target === "alert-events" ? {} : [], target === "alert-events" ? 401 : 200);
      refreshReply = h.defer(refreshPath);
      h.retry(); oldLoad = h.loaded();
      const deadline = performance.now() + 1000;
      while (f3Refreshes(h).length === 0) {
        assert.ok(performance.now() < deadline, "the current 401 must start legitimate recovery");
        await new Promise(resolve => setImmediate(resolve));
      }
      eventsReply = h.defer(f3EventPath);
      const saved = { ...alertItem, alertActive: true, title: "Authorized mutation during refresh" };
      patchReply(saved); await saving;
      assert.equal(h.state().generation, 1);
      h.respond(wishlistPath, [saved]); h.respond(f3EventPath, [f3Event]);
      refreshReply(sentinelSession(1, "rotated"));
      await oldLoad; await h.loaded();
      const before = structuredClone(h.state());
      eventsReply({}, 401); await settle();
      assert.equal(f3Refreshes(h).length, 1, "the newly obsolete history load cannot start a second refresh");
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      assert.equal(h.auth.readAuthToken(), "rotated");
      assert.deepEqual(h.state(), before);
      assert.deepEqual(h.state().personalItems, [saved]);
      for (const path of [wishlistPath, f3EventPath]) {
        assert.equal(h.calls.filter(call => call.path === path && call.token === "Bearer rotated").length, 1, "only the current auth-event GET may use the rotated token");
      }
    } finally {
      patchReply?.(alertItem); refreshReply?.(sentinelSession(1, "rotated")); eventsReply?.([]);
      if (saving) await saving;
      if (oldLoad) await oldLoad;
      await settle(); h.restore();
    }
  });
}

test("F3 disposed independent alert-events request cannot refresh or change state", async () => {
  const h = await wishlistExplorerHarness();
  let reply, load;
  try {
    await h.loaded();
    reply = h.defer(f3EventPath); load = h.refreshEvents("initial");
    const before = structuredClone(h.state()), revision = h.auth.readAuthSessionRevision();
    h.dispose(); h.respond(refreshPath, {}, 401);
    reply({}, 401); await load;
    assertF3Preserved(h, before, revision);
  } finally { reply?.([]); if (load) await load; h.restore(); }
});

for (const status of [200, 401, 500]) {
  test(`F3 superseded independent alert-events ${status} preserves newer loading and history`, async () => {
    const h = await wishlistExplorerHarness();
    let oldReply, newReply, oldLoad, newLoad;
    try {
      await h.loaded();
      oldReply = h.defer(f3EventPath); oldLoad = h.refreshEvents("initial");
      newReply = h.defer(f3EventPath); newLoad = h.refreshEvents("initial");
      const before = structuredClone(h.state()), revision = h.auth.readAuthSessionRevision();
      assert.equal(before.alertEventsLoading, true);
      h.respond(refreshPath, {}, 401);
      oldReply(status === 200 ? [] : {}, status); await oldLoad;
      assertF3Preserved(h, before, revision);
      newReply([f3Event]); await newLoad;
      assert.deepEqual(h.state().alertEvents, [f3Event]);
      assert.equal(h.state().alertEventsLoading, false);
    } finally { oldReply?.([]); newReply?.([]); await Promise.all([oldLoad, newLoad]); h.restore(); }
  });

  test(`F3 delete retires an independent alert-events ${status} without a stale loading or auth completion`, async () => {
    const h = await wishlistExplorerHarness();
    let reply, load;
    try {
      await h.loaded();
      reply = h.defer(f3EventPath); load = h.refreshEvents("initial");
      h.respond(`${wishlistPath}/42`, null, 204); await h.remove(alertItem);
      const before = structuredClone(h.state()), revision = h.auth.readAuthSessionRevision();
      assert.equal(before.alertEventsLoading, false, "the authoritative deletion retires its obsolete history load");
      h.respond(refreshPath, {}, 401);
      reply(status === 200 ? [] : {}, status); await load;
      assertF3Preserved(h, before, revision);
    } finally { reply?.([]); if (load) await load; h.restore(); }
  });

  test(`F3 initial alert-events ${status} cannot erase a newer independent history response`, async () => {
    const h = await wishlistExplorerHarness();
    let reply, load;
    try {
      await h.loaded();
      h.respond(wishlistPath, [alertItem]); reply = h.defer(f3EventPath);
      h.authEvent(); load = h.loaded(); await settle();
      h.respond(f3EventPath, [f3Event]); await h.refreshEvents("initial");
      const revision = h.auth.readAuthSessionRevision();
      h.respond(refreshPath, {}, 401);
      reply(status === 200 ? [] : {}, status); await load; await settle();
      assert.equal(f3Refreshes(h).length, 0);
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      assert.equal(h.auth.readAuthToken(), "initial");
      assert.equal(h.state().view, "personal");
      assert.deepEqual(h.state().personalItems, [alertItem]);
      assert.deepEqual(h.state().alertEvents, [f3Event]);
      assert.equal(h.state().alertEventsMessage, null);
      assert.equal(h.state().alertEventsLoading, false);
    } finally { reply?.([]); if (load) await load; h.restore(); }
  });
}

test("Wishlist idempotent add replaces the complete returned item in place without increasing visible count", async () => {
  const before = { ...alertItem, id: 11, title: "Before" };
  const after = { ...alertItem, id: 77, title: "After" };
  const h = await wishlistExplorerHarness([before, { ...alertItem, staleLocalField: true }, after]);
  try {
    const returned = {
      id: 42, title: "Example Game canonical", store: "GOG", currentPrice: "$8.00",
      targetPrice: "$9.00", lowestEver: "$4.00", discount: "-80%",
      status: "price-drop", priority: "low", alertActive: true,
      alertEvaluation: { targetReached: true, state: "target-reached", message: "Returned server evaluation" },
    };
    for (let count = 1; count <= 3; count++) {
      h.respond(wishlistPath, returned, 201);
      h.respond(`${wishlistPath}/alert-events`, []);
      await h.add({ ...alertItem, title: "  EXAMPLE GAME  ", store: "  steam  " });
      const state = h.state();
      assert.deepEqual(state.personalItems, [before, returned, after]);
      assert.deepEqual(state.personalItems.map(item => item.id), [11, 42, 77]);
      assert.equal(state.personalItems.filter(item => item.id === 42).length, 1);
      assert.equal(state.personalItems.length, 3);
      assert.equal(state.alerts[42], true);
      assert.equal(state.generation, count, "one generation advance per authoritative callback");
      assert.equal(h.addFormState.addedCalls, count);
      assert.equal(h.addFormState.resets, count);
      assert.equal(h.addFormState.isSubmitting, false);
      assert.deepEqual(h.addFormState.message, {
        tone: "success", text: `${returned.title} is now stored in this account’s personal wishlist.`,
      });
      assert.doesNotMatch(h.addFormState.message.text, /newly|created/i);
    }
    assert.equal(h.calls.filter(call => call.path === wishlistPath && call.method === "POST").length, 3);
  } finally { h.restore(); }
});

test("Wishlist new add is prepended once, repeated returned IDs stay singular, and upsert collapses existing copies", async () => {
  const h = await wishlistExplorerHarness();
  try {
    const item = { ...alertItem, id: 99, title: "New personal game", alertActive: true };
    for (let count = 1; count <= 2; count++) {
      h.respond(wishlistPath, item, 201);
      h.respond(`${wishlistPath}/alert-events`, []);
      await h.add(item);
      assert.deepEqual(h.state().personalItems, [item, alertItem]);
      assert.equal(h.state().personalItems.length, 2);
      assert.equal(h.state().generation, count);
      assert.equal(h.state().alerts[99], true);
    }
  } finally { h.restore(); }
  const duplicated = await wishlistExplorerHarness([alertItem, { ...alertItem, targetPrice: "$1.00" }]);
  try {
    const returned = { ...alertItem, alertActive: true };
    duplicated.respond(wishlistPath, returned, 201);
    duplicated.respond(`${wishlistPath}/alert-events`, []);
    await duplicated.add(returned);
    assert.deepEqual(duplicated.state().personalItems, [returned]);
    assert.equal(duplicated.state().alerts[42], true);
  } finally { duplicated.restore(); }
});

test("Wishlist idempotent upsert keeps one item through alert, target-price, priority updates and delete", async () => {
  const h = await wishlistExplorerHarness();
  try {
    let current = { ...alertItem, alertActive: true };
    h.respond(wishlistPath, current, 201);
    h.respond(`${wishlistPath}/alert-events`, []);
    await h.add(current);
    const identity = item => wishlistCardIdentity({ accountRevision: 1, source: "api", view: "personal" }, item);
    const key = identity(current);
    for (const payload of [{ alertActive: false }, { targetPrice: "$2.00" }, { priority: "low" }]) {
      const returned = { ...current, ...payload };
      h.respond(`${wishlistPath}/42/alert`, returned);
      h.respond(`${wishlistPath}/alert-events`, []);
      await h.update(current, payload);
      current = returned;
      assert.deepEqual(h.state().personalItems, [current]);
      assert.equal(h.state().alerts[42], current.alertActive);
      assert.equal(identity(current), key);
    }
    h.respond(`${wishlistPath}/42`, {});
    await h.remove(current);
    assert.deepEqual(h.state().personalItems, []);
    assert.equal(h.state().alerts[42], undefined);
    assert.equal(h.state().generation, 5);
    assert.equal(h.state().operationMessage.kind, "success");
  } finally { h.restore(); }
});

test("Wishlist idempotent upsert invalidates an older pending GET without restoring duplicate or stale fields", async () => {
  const h = await wishlistExplorerHarness();
  try {
    const snapshotReply = h.defer(wishlistPath);
    h.respond(`${wishlistPath}/alert-events`, []);
    h.retry();
    await settle();
    const returned = { ...alertItem, targetPrice: "$2.00", priority: "low", alertActive: true };
    h.respond(wishlistPath, returned, 201);
    h.respond(`${wishlistPath}/alert-events`, []);
    await h.add(returned);
    assert.deepEqual(h.state().personalItems, [returned]);
    assert.equal(h.state().generation, 1);
    snapshotReply([alertItem]);
    await settle();
    assert.deepEqual(h.state().personalItems, [returned]);
    assert.equal(h.state().alerts[42], true);
    assert.equal(h.state().view, "personal");
    assert.equal(h.state().generation, 1);
  } finally { h.restore(); }
});

test("Wishlist old-session add never reaches the replacement account upsert callback", async () => {
  for (const status of [201, 401]) {
    const h = await wishlistExplorerHarness();
    try {
      const oldReply = h.defer(wishlistPath);
      const operation = h.add({ ...alertItem, alertActive: true });
      const replacement = { ...alertItem, title: "Account B item", targetPrice: "$3.00" };
      h.respond(wishlistPath, [replacement]);
      h.respond(`${wishlistPath}/alert-events`, []);
      h.auth.clearAuthToken();
      h.auth.startAuthSession(sentinelSession(2, "account-b"));
      await settle();
      oldReply({ ...alertItem, alertActive: true }, status);
      await operation;
      await settle();
      assert.deepEqual(h.state().personalItems, [replacement]);
      assert.equal(h.state().generation, 0);
      assert.equal(h.addFormState.addedCalls, 0);
      assert.equal(h.addFormState.resets, 0);
      assert.equal(h.addFormState.message, null);
      assert.equal(h.auth.readAuthToken(), "account-b");
      assert.deepEqual(h.calls.filter(call => call.path === wishlistPath && call.method === "POST").map(call => call.token), ["Bearer initial"]);
    } finally { h.restore(); }
  }
});

test("Wishlist auth-refresh GET cannot overwrite a newer successful alert, target-price or priority PATCH", async () => {
  for (const payload of [{ alertActive: true }, { targetPrice: "$3.00" }, { priority: "low" }]) {
    const h = await wishlistExplorerHarness();
    try {
      const revision = h.auth.readAuthSessionRevision();
      const patchPath = `${wishlistPath}/${alertItem.id}/alert`;
      h.respond(patchPath, {}, 401);
      const refreshReply = h.defer(refreshPath);
      const mutation = h.update(alertItem, payload);
      await settle();
      const snapshotReply = h.defer(wishlistPath);
      h.respond(`${wishlistPath}/alert-events`, []);
      const patchReply = h.defer(patchPath);
      refreshReply(sentinelSession(1, "rotated"));
      await settle();
      assert.equal(h.state().view, "checking");
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      const authoritative = { ...alertItem, ...payload, alertEvaluation: {
        targetReached: false, state: "watching", message: "Server evaluation after mutation",
      } };
      h.respond(`${wishlistPath}/alert-events`, []);
      patchReply(authoritative);
      await mutation;
      assert.deepEqual(h.state().personalItems, [authoritative]);
      assert.equal(h.state().view, "personal", "mutation remains visible while the stale GET is pending");
      const generation = h.state().generation;
      snapshotReply([alertItem]);
      await settle();
      assert.deepEqual(h.state().personalItems, [authoritative]);
      assert.equal(h.state().alerts[alertItem.id], authoritative.alertActive);
      assert.equal(h.state().generation, generation);
      assert.match(h.state().itemMessages[alertItem.id].text, /Persisted/);
      assert.equal(h.state().alertEventsLoading, false);
      assert.deepEqual(h.calls.filter(call => call.path === patchPath).map(call => call.token), ["Bearer initial", "Bearer rotated"]);

      // A post-mutation refresh is allowed to accept current server changes.
      const current = { ...authoritative, currentPrice: "$2.00" };
      h.respond(wishlistPath, [current]);
      h.respond(`${wishlistPath}/alert-events`, []);
      h.retry();
      await settle();
      assert.deepEqual(h.state().personalItems, [current]);
      assert.equal(h.state().view, "personal");
    } finally { h.restore(); }
  }
});

test("Wishlist pre-completion GET cannot reinsert a deleted item or remove a newly added item", async () => {
  for (const action of ["add", "delete"]) {
    const h = await wishlistExplorerHarness();
    try {
      const path = action === "add" ? wishlistPath : `${wishlistPath}/${alertItem.id}`;
      const mutationReply = h.defer(path);
      const addedItem = { ...alertItem, id: 99, title: "New personal game" };
      const mutation = action === "add" ? h.add(addedItem) : h.remove(alertItem);
      await settle();
      const snapshotReply = h.defer(wishlistPath);
      h.respond(`${wishlistPath}/alert-events`, []);
      h.retry();
      await settle();
      if (action === "add") h.respond(`${wishlistPath}/alert-events`, []);
      mutationReply(addedItem);
      await mutation;
      const expected = action === "add" ? [addedItem, alertItem] : [];
      assert.deepEqual(h.state().personalItems, expected);
      snapshotReply([alertItem]);
      await settle();
      assert.deepEqual(h.state().personalItems, expected);
      assert.equal(h.state().view, "personal");
      assert.equal(h.state().alertEventsLoading, false);
      assert.equal(h.state().generation, 1);
      assert.equal(h.state().alerts[alertItem.id], action === "delete" ? undefined : false);
    } finally { h.restore(); }
  }
});

test("Wishlist accepts fresh GETs, empty states and same-user auth-event refreshes without a mutation", async () => {
  const h = await wishlistExplorerHarness([]);
  try {
    assert.equal(h.state().view, "personal");
    assert.deepEqual(h.state().personalItems, []);
    const reply = h.defer(wishlistPath);
    h.respond(`${wishlistPath}/alert-events`, []);
    h.respond(refreshPath, sentinelSession(1, "rotated"));
    const revision = h.auth.readAuthSessionRevision();
    await h.auth.ensureAuthToken({ forceRefresh: true });
    await settle();
    assert.equal(h.state().view, "checking");
    assert.equal(h.auth.readAuthSessionRevision(), revision);
    reply([alertItem]);
    await settle();
    assert.deepEqual(h.state().personalItems, [alertItem]);
    assert.equal(h.state().authToken, "rotated");
    assert.equal(h.state().view, "personal");
    assert.equal(h.state().generation, 0);
  } finally { h.restore(); }
});

test("Wishlist failed mutations retain data, do not advance generation and allow pending GET reconciliation", async () => {
  for (const action of ["update", "delete", "add"]) {
    const h = await wishlistExplorerHarness();
    try {
      const path = action === "update" ? `${wishlistPath}/${alertItem.id}/alert`
        : action === "delete" ? `${wishlistPath}/${alertItem.id}` : wishlistPath;
      const failedReply = h.defer(path);
      const mutation = action === "update" ? h.update(alertItem, { alertActive: true })
        : action === "delete" ? h.remove(alertItem) : h.add({ ...alertItem, id: 99 });
      await settle();
      const snapshotReply = h.defer(wishlistPath);
      h.respond(`${wishlistPath}/alert-events`, []);
      h.retry();
      await settle();
      failedReply({}, 503);
      await mutation;
      assert.deepEqual(h.state().personalItems, [alertItem]);
      assert.equal(h.state().generation, 0);
      if (action === "update") assert.equal(h.state().itemMessages[alertItem.id].kind, "error");
      if (action === "delete") assert.equal(h.state().operationMessage.kind, "error");
      const reconciled = { ...alertItem, currentPrice: "$8.00" };
      snapshotReply([reconciled]);
      await settle();
      assert.deepEqual(h.state().personalItems, [reconciled]);
      assert.equal(h.state().view, "personal");
    } finally { h.restore(); }
  }
});

test("Wishlist ignores stale GET failures after mutation and still recovers from a fresh load failure", async () => {
  const h = await wishlistExplorerHarness([alertItem], { loadStatus: 503 });
  try {
    assert.equal(h.state().view, "offline");
    h.respond(wishlistPath, [alertItem]);
    h.respond(`${wishlistPath}/alert-events`, []);
    h.retry();
    await settle();
    assert.equal(h.state().view, "personal");
    const staleReply = h.defer(wishlistPath);
    h.respond(`${wishlistPath}/alert-events`, []);
    h.retry();
    await settle();
    h.respond(`${wishlistPath}/alert-events`, []);
    h.added({ ...alertItem, id: 99, title: "Added game" });
    staleReply({}, 503);
    await settle();
    assert.equal(h.state().personalItems.length, 2);
    assert.equal(h.state().view, "personal");
    assert.equal(h.state().serviceMessage, null);
  } finally { h.restore(); }
});

test("Wishlist refresh ordering and session boundaries reject old GETs while keeping the replacement account authoritative", async () => {
  for (const status of [200, 401]) {
    const h = await wishlistExplorerHarness();
    try {
      const oldReply = h.defer(wishlistPath);
      h.respond(`${wishlistPath}/alert-events`, []);
      h.retry();
      await settle();
      const replacement = { ...alertItem, id: 72, title: "Account B game" };
      h.respond(wishlistPath, [replacement]);
      h.respond(`${wishlistPath}/alert-events`, []);
      h.auth.startAuthSession(sentinelSession(2, "account-b"));
      await settle();
      assert.deepEqual(h.state().personalItems, [replacement]);
      oldReply([alertItem], status);
      await settle();
      assert.deepEqual(h.state().personalItems, [replacement]);
      assert.equal(h.auth.readAuthToken(), "account-b");
      assert.equal(h.calls.filter(call => call.path === wishlistPath && call.token === "Bearer account-b").length, 1);
    } finally { h.restore(); }
  }
  const ordered = await wishlistExplorerHarness();
  try {
    const olderReply = ordered.defer(wishlistPath);
    ordered.respond(`${wishlistPath}/alert-events`, []);
    ordered.retry();
    await settle();
    const current = { ...alertItem, currentPrice: "$7.00" };
    ordered.respond(wishlistPath, [current]);
    ordered.respond(`${wishlistPath}/alert-events`, []);
    ordered.retry();
    await settle();
    olderReply([alertItem]);
    await settle();
    assert.deepEqual(ordered.state().personalItems, [current]);
    assert.equal(ordered.state().generation, 0, "refresh ordering is independent of mutation generation");
  } finally { ordered.restore(); }
  const anonymous = await wishlistExplorerHarness([], { anonymous: true });
  try {
    assert.equal(anonymous.state().view, "public");
    assert.deepEqual(anonymous.state().personalItems, []);
    assert.equal(anonymous.calls.filter(call => call.path === wishlistPath).length, 0);
  } finally { anonymous.restore(); }
});

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

for (const logoutPhase of ["pending", "completed"]) {
  test(`FZ-01 production Sign out ${logoutPhase} rejects a late Sentinel 401 before refresh`, async () => {
    const h = await sentinelChatHarness();
    const status = await authComponentHarness(h, "AuthStatus");
    try {
      const browser = { refreshCookie: oldCredentialCookie };
      observeAuthNetwork(browser);
      const oldReply = h.defer(insightPath);
      const pending = h.submit("Account A private prompt before Sign out");
      const logoutReply = h.defer(logoutPath);
      status.signOut();
      const loggingOut = h.auth.logout();
      assert.equal(h.auth.readAuthToken(), null, "Sign out invalidates local auth immediately");
      await settle();
      assert.equal(await h.auth.readCurrentUser(), null);
      assert.equal(h.calls.filter(call => call.path === logoutPath).length, 1);
      assert.match(await status.view(), /auth-status--anonymous/);
      if (logoutPhase === "completed") {
        logoutReply(null, 204, null, expiredCredentialCookie);
        await loggingOut;
      }
      const revision = h.auth.readAuthSessionRevision();
      // If the old helper refreshes, model a still-present cookie while logout
      // is pending and an expired cookie after its successful response.
      h.respondUsing(refreshPath, () => browser.refreshCookie
        ? Response.json(sentinelSession(1, "obsolete-refresh"))
        : Response.json({ error: "authentication_required" }, { status: 401 }));
      oldReply({}, 401, "fz01-obsolete-insight");
      try {
        await pending;
        await settle();
        assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
        assert.equal(h.calls.filter(call => call.path === insightPath).length, 1);
        assert.equal(h.auth.readAuthToken(), null);
        assert.equal(await h.auth.readCurrentUser(), null);
        assert.match(await status.view(), /auth-status--anonymous/);
      } finally {
        if (logoutPhase === "pending") {
          logoutReply(null, 204, null, expiredCredentialCookie);
          await loggingOut;
        }
      }
      assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
      assert.equal(h.calls.filter(call => call.path === insightPath).length, 1);
      assert.equal(h.auth.readAuthToken(), null);
      assert.equal(await h.auth.readCurrentUser(), null);
      assert.equal(h.auth.readAuthSessionRevision(), revision + (logoutPhase === "pending" ? 1 : 0));
      assert.equal(browser.refreshCookie, null);
      assert.equal(h.answer(), undefined);
      assert.doesNotMatch(h.text(), /Account A private prompt|obsolete-refresh/);
      assert.ok(h.signIn());
      assert.match(await status.view(), /auth-status--anonymous/);
    } finally { status.dispose(); h.restore(); }
  });
}

for (const identicalToken of [false, true]) {
  test(`FZ-01 a production login replacement rejects old Sentinel 401${identicalToken ? " with an identical token" : ""}`, async () => {
    const h = await sentinelChatHarness();
    const status = await authComponentHarness(h, "AuthStatus");
    const form = await authComponentHarness(h, "LoginForm");
    try {
      const oldReply = h.defer(insightPath);
      const pending = h.submit("Account A obsolete prompt");
      const originalRevision = h.auth.readAuthSessionRevision();
      const replacement = sentinelSession(2, identicalToken ? "initial" : "account-b");
      h.respond(credentialPath("login"), replacement, 200, null, newCredentialCookie);
      await form.submit();
      const replacementRevision = h.auth.readAuthSessionRevision();
      assert.ok(replacementRevision > originalRevision);
      assert.equal(h.auth.readAuthToken(), replacement.token);
      assert.equal((await h.auth.readCurrentUser()).id, 2);
      assert.deepEqual(form.routes, ["/wishlist"]);
      // Make a forbidden refresh visibly alter B, rather than relying on an
      // unexpected-fetch mock failure to mask an attempted refresh.
      h.respond(refreshPath, sentinelSession(2, "unexpected-b-rotation"));
      oldReply({}, 401, "fz01-old-account-401");
      await pending;
      assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
      assert.equal(h.calls.filter(call => call.path === insightPath).length, 1);
      assert.equal(h.auth.readAuthToken(), replacement.token);
      assert.deepEqual(await h.auth.readCurrentUser(), replacement.user);
      assert.equal(h.auth.readAuthSessionRevision(), replacementRevision);
      assert.equal(h.answer(), undefined);
      assert.doesNotMatch(h.text(), /Account A obsolete prompt|fz01-old-account-401/);
      assert.match(await status.view(), /auth-status--authenticated/);
      assert.equal(status.state().user.id, 2);
    } finally { form.dispose(); status.dispose(); h.restore(); }
  });
}

for (const boundary of ["logout", "production login"]) {
  for (const completion of ["success", "401"]) {
    test(`FZ-01 production Sentinel retry helper rejects stale ${completion} across ${boundary}`, async () => {
      const h = await sentinelChatHarness();
      let form;
      let logoutReply;
      let loggingOut;
      try {
        const oldReply = h.defer(insightPath);
        const pending = h.sentinel.withSentinelAuthRetry("initial", token =>
          h.sentinel.requestSentinelInsight(token, { message: "Old account prompt" }));
        const settled = pending.then(value => ({ value }), error => ({ error }));
        if (boundary === "logout") {
          logoutReply = h.defer(logoutPath);
          loggingOut = h.auth.logout();
          await settle();
        } else {
          form = await authComponentHarness(h, "LoginForm");
          h.respond(credentialPath("login"), sentinelSession(2, "account-b"));
          await form.submit();
        }
        const revision = h.auth.readAuthSessionRevision();
        // Supply real HTTP responses if the old helper incorrectly refreshes
        // or replays the old prompt under a replacement session.
        h.respond(refreshPath, sentinelSession(1, "obsolete-refresh"));
        h.respond(insightPath, sentinelAnswer("Forbidden retry answer"));
        oldReply(completion === "success" ? sentinelAnswer("Obsolete answer") : {}, completion === "success" ? 200 : 401);
        const result = await settled;
        if (loggingOut) {
          logoutReply(null, 204, null, expiredCredentialCookie);
          await loggingOut;
        }
        assert.ok(h.auth.isAuthSessionInvalidatedError(result.error));
        assert.equal(result.value, undefined, "the helper cannot return obsolete success");
        assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
        assert.equal(h.calls.filter(call => call.path === insightPath).length, 1);
        assert.equal(h.auth.readAuthToken(), boundary === "logout" ? null : "account-b");
        assert.equal((await h.auth.readCurrentUser())?.id ?? null, boundary === "logout" ? null : 2);
        assert.equal(h.auth.readAuthSessionRevision(), revision + (boundary === "logout" ? 1 : 0));
      } finally { form?.dispose(); h.restore(); }
    });
  }
}

test("FZ-01 production Sentinel helper preserves its public shape after legitimate same-session refresh", async () => {
  const h = await sentinelChatHarness();
  try {
    const revision = h.auth.readAuthSessionRevision();
    const answer = sentinelAnswer("Legitimate refreshed answer");
    h.respond(insightPath, {}, 401);
    h.respond(refreshPath, sentinelSession(1, "rotated"));
    h.respond(insightPath, answer);
    const result = await h.sentinel.withSentinelAuthRetry("initial", token =>
      h.sentinel.requestSentinelInsight(token, { message: "Current session prompt" }));
    assert.deepEqual(result, { value: answer, token: "rotated" });
    assert.equal(h.auth.readAuthSessionRevision(), revision);
    assert.equal(h.calls.filter(call => call.path === refreshPath).length, 1);
    assert.deepEqual(h.calls.filter(call => call.path === insightPath).map(call => call.token),
      ["Bearer initial", "Bearer rotated"]);
  } finally { h.restore(); }
});

test("FZ-01 Sentinel reuses an already rotated token within the same session without another refresh", async () => {
  const h = await sentinelChatHarness();
  try {
    const revision = h.auth.readAuthSessionRevision();
    const oldReply = h.defer(insightPath);
    const pending = h.submit("Current session pending prompt");
    h.respond(refreshPath, sentinelSession(1, "already-rotated"));
    await h.auth.ensureAuthToken({ forceRefresh: true });
    assert.equal(h.auth.readAuthSessionRevision(), revision);
    const answer = sentinelAnswer("Already rotated token answer");
    h.respond(insightPath, answer);
    oldReply({}, 401);
    await pending;
    assert.deepEqual(h.answer(), answer);
    assert.equal(h.auth.readAuthToken(), "already-rotated");
    assert.equal(h.auth.readAuthSessionRevision(), revision);
    assert.equal(h.calls.filter(call => call.path === refreshPath).length, 1);
    assert.deepEqual(h.calls.filter(call => call.path === insightPath).map(call => call.token),
      ["Bearer initial", "Bearer already-rotated"]);
  } finally { h.restore(); }
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
      h.respond(created, 201);
      releaseAuth();
      await first;
      assert.equal(h.calls.length, 1);
      assert.equal(h.calls[0].method, "POST");
      assert.equal(h.calls[0].path, "/api/me/wishlist");
      assert.equal(h.calls[0].body.alertActive, true);
      assert.equal(h.calls[0].body.targetPrice, alertDeal.priceNew);
      assert.deepEqual(h.state.savedWishlistItems, [created]);
      assert.match(alertMessage(h).text, /is in your personal wishlist.*alert is enabled/);
      assert.equal(h.refs.savingDealKeys.current.size, 0);
      assert.equal(h.state.savingDeals.size, 0);
    } finally { h.restore(); }
  }
});

test("Deals enables a paused item returned by idempotent POST and holds the shared lock through PATCH", async () => {
  const otherItem = { ...alertItem, id: 99, title: "Another Game" };
  const h = await dealsWishlistHarness([otherItem]);
  try {
    h.respond(alertItem, 201);
    const finishPatch = h.defer();
    const pending = h.handlers.toggleDealAlert(alertDeal);
    await settle();
    assert.deepEqual(h.calls.map(call => [call.method, call.path]), [
      ["POST", "/api/me/wishlist"], ["PATCH", "/api/me/wishlist/42/alert"],
    ]);
    assert.deepEqual(h.calls[1].body, { alertActive: true });
    assert.deepEqual(h.state.savedWishlistItems, [otherItem], "no enabled state before PATCH succeeds");
    assert.equal(alertMessage(h), undefined, "no premature success feedback");
    assert.equal(h.state.savingDeals.size, 1);
    await h.handlers.saveDeal({ ...alertDeal, id: 101, title: " EXAMPLE GAME ", store: " steam " });
    await h.handlers.toggleDealAlert(alertDeal);
    assert.equal(h.calls.length, 2, "normalized title/store lock covers the follow-up PATCH");
    const enabled = {
      ...alertItem, alertActive: true, currentPrice: "$8.99",
      alertEvaluation: { state: "watching", targetReached: false, message: "Watching target" },
    };
    finishPatch(enabled);
    await pending;
    assert.deepEqual(h.state.savedWishlistItems, [otherItem, enabled]);
    assert.deepEqual(h.refs.savedWishlistItemsRef.current, [otherItem, enabled]);
    assert.equal(alertMessage(h).tone, "success");
    assert.equal(alertMessage(h).text, "Example Game is in your personal wishlist. Its wishlist alert is enabled.");
    assert.equal(h.state.savedWishlistItems[1].targetPrice, "$5.00");
    assert.equal(h.state.savedWishlistItems[1].priority, "high");
    assert.equal(h.refs.savingDealKeys.current.size, 0);
    assert.equal(h.state.savingDeals.size, 0);
  } finally { h.restore(); }
});

test("Deals idempotent POST does not PATCH an active alert or alter a save-only paused item", async () => {
  for (const [action, alertActive] of [["toggleDealAlert", true], ["saveDeal", false], ["saveDeal", true]]) {
    const h = await dealsWishlistHarness();
    try {
      const item = { ...alertItem, alertActive };
      h.respond(item, 201);
      await h.handlers[action](alertDeal);
      assert.deepEqual(h.calls.map(call => call.method), ["POST"]);
      assert.deepEqual(h.state.savedWishlistItems, [item], "preserve all returned fields, including target and priority");
      assert.equal(h.state.savedWishlistItems[0].alertActive, alertActive);
      assert.equal(h.calls[0].body.targetPrice, alertDeal.priceNew, "existing creation target semantics remain unchanged");
      assert.equal(alertMessage(h).tone, "success");
      assert.match(alertMessage(h).text, /is in your personal wishlist/);
      assert.match(alertMessage(h).text, alertActive ? /alert is enabled/ : /alert is paused/);
      assert.doesNotMatch(alertMessage(h).text, /newly|was saved|created/);
    } finally { h.restore(); }
  }
});

test("Deals reports follow-up PATCH failure truthfully with request ID and permits a safe retry", async () => {
  const h = await dealsWishlistHarness();
  try {
    h.respond(alertItem, 201);
    h.respond({}, 503, "enable-patch-request-id");
    await h.handlers.toggleDealAlert(alertDeal);
    assert.deepEqual(h.calls.map(call => call.method), ["POST", "PATCH"]);
    assert.deepEqual(h.state.savedWishlistItems, []);
    assert.equal(alertMessage(h).tone, "error");
    assert.equal(alertMessage(h).requestId, "enable-patch-request-id");
    assert.match(alertMessage(h).text, /retry from this card/);
    assert.doesNotMatch(alertMessage(h).text, /alert is enabled/);
    assert.equal(h.refs.savingDealKeys.current.size, 0);
    assert.equal(h.state.savingDeals.size, 0);
    assert.equal(h.state.wishlistSyncRevision, 1, "reconcile persisted state after a partial failure");
    const enabled = { ...alertItem, alertActive: true };
    h.respond(alertItem, 201); // Retry before sync: POST remains idempotent.
    h.respond(enabled);
    await h.handlers.toggleDealAlert(alertDeal);
    assert.deepEqual(h.calls.map(call => call.method), ["POST", "PATCH", "POST", "PATCH"]);
    assert.deepEqual(h.calls.at(-1).body, { alertActive: true });
    assert.deepEqual(h.state.savedWishlistItems, [enabled]);
    assert.equal(alertMessage(h).tone, "success");
    assert.match(alertMessage(h).text, /wishlist alert is enabled/);
  } finally { h.restore(); }
});

test("Deals retries auth for POST or follow-up PATCH without repeating a successful POST", async () => {
  for (const failurePhase of ["POST", "PATCH"]) {
    const h = await dealsWishlistHarness();
    try {
      if (failurePhase === "POST") h.respond({}, 401);
      h.respond(alertItem, 201);
      if (failurePhase === "PATCH") h.respond({}, 401);
      const enabled = { ...alertItem, alertActive: true };
      h.respond(enabled);
      await h.handlers.toggleDealAlert(alertDeal);
      assert.deepEqual(h.calls.map(call => [call.method, call.token]), failurePhase === "POST"
        ? [["POST", "Bearer initial"], ["POST", "Bearer rotated"], ["PATCH", "Bearer rotated"]]
        : [["POST", "Bearer initial"], ["PATCH", "Bearer initial"], ["PATCH", "Bearer rotated"]]);
      assert.ok(h.calls.filter(call => call.method === "PATCH").every(call =>
        call.path === "/api/me/wishlist/42/alert" && JSON.stringify(call.body) === '{"alertActive":true}'));
      assert.equal(h.auth.refreshCalls, 1);
      assert.equal(h.state.authToken, "rotated");
      assert.deepEqual(h.state.savedWishlistItems, [enabled]);
      assert.equal(alertMessage(h).tone, "success");
      assert.match(alertMessage(h).text, /wishlist alert is enabled/);
      assert.equal(h.refs.savingDealKeys.current.size, 0);
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
  assert.match(giveawaysSource, /Unverified sample catalog/);
  assert.match(giveawaysSource, /not verified\s+offers/);
  assert.match(giveawaysSource, /Sample list price/);
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
      if (["a", "button"].includes(node.type) && node.props.children.some(child => child === "View Deal" || child === "Find Current Offers")) return node;
      for (const child of node.props?.children ?? []) {
        const result = find(child);
        if (result) return result;
      }
    };
    const control = find(tree);
    assert.ok(control, "card renders an offer action");
    return control;
  };
  return { source, safeCheapSharkDealUrl, viewControl, renderCard: DealCard };
}

test("editorial Deals cards keep truthful media, rating, naming and account feedback", async () => {
  const { source, renderCard } = await dealCardControls();
  const nodes = tree => Array.isArray(tree)
    ? tree.flatMap(nodes)
    : tree && typeof tree === "object" ? [tree, ...nodes(tree.props?.children ?? [])] : [];
  const text = tree => Array.isArray(tree)
    ? tree.map(text).join("")
    : tree && typeof tree === "object" ? text(tree.props?.children ?? []) : typeof tree === "string" || typeof tree === "number" ? String(tree) : "";
  const deal = { ...alertDeal, title: "A very long 遊戲 title — complete edition", category: "External Deal", priceOld: "$39.99", rating: 0, stars: "", status: "Observed offer" };
  const saveCalls = [], alertCalls = [];
  const props = { deal, alertIsSet: false, isSaved: false, isSaving: false, onSave: value => saveCalls.push(value), onToggleAlert: value => alertCalls.push(value), onFindOffers: () => {} };
  const tree = renderCard(props), all = nodes(tree);
  const caption = all.filter(node => node.props.className === "artworkCaption");
  assert.equal(caption.length, 1);
  assert.equal(text(caption), "Artwork unavailable");
  assert.equal(all.find(node => node.props.className === "cardMediaArt").props["aria-hidden"], "true");
  assert.ok(!all.some(node => ["img", "Image", "picture", "video", "canvas"].includes(node.type)));
  assert.doesNotMatch(source, /next\/image|<img\b|<Image\b|coverUrl|artworkUrl/);
  const css = await readFile(new URL("../src/components/DealsProduct.module.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /url\s*\(/i, "neutral media loads no artwork assets");
  const title = all.find(node => node.type === "h2");
  assert.equal(text(title), deal.title);
  assert.equal(tree.props["aria-labelledby"], title.props.id);
  assert.equal(text(all.find(node => node.props.className === "category")), "External Deal");
  assert.equal(text(all.find(node => node.props.className === "rating")), "Rating unavailable");
  assert.equal(text(tree).match(/Rating unavailable/g).length, 1);
  assert.ok(!all.some(node => node.props.role === "img"), "no invented rating");
  assert.equal(text(all.find(node => node.type === "del")), deal.priceOld);
  assert.equal(text(all.find(node => node.type === "strong")), deal.priceNew);
  assert.ok(all.some(node => text(node) === deal.status));
  const buttons = all.filter(node => node.type === "button");
  for (const button of buttons) assert.ok(button.props["aria-label"].includes(text(button.props.children.filter(child => typeof child === "string"))), "accessible name includes visible action text");
  buttons[0].props.onClick(); buttons[1].props.onClick();
  assert.deepEqual(saveCalls, [deal]); assert.deepEqual(alertCalls, [deal]);
  for (const state of [{ isSaving: true }, { isSaved: true, alertIsSet: true }]) {
    const controls = nodes(renderCard({ ...props, ...state })).filter(node => node.type === "button");
    assert.equal(controls[0].props.disabled, true);
    assert.equal(controls[0].props["aria-busy"], Boolean(state.isSaving));
    assert.equal(controls[1].props.disabled, Boolean(state.isSaving));
    assert.equal(controls[1].props["aria-busy"], Boolean(state.isSaving));
    assert.equal(controls[1].props["aria-pressed"], Boolean(state.alertIsSet));
    for (const control of controls) assert.ok(control.props["aria-label"].includes(text(control.props.children.filter(child => typeof child === "string"))));
  }
  const rated = nodes(renderCard({ ...props, deal: { ...deal, rating: 4.6, stars: "★★★★★", priceNew: "FREE" } }));
  assert.equal(rated.find(node => node.props.role === "img").props["aria-label"], "4.6 out of 5 stars");
  assert.equal(text(rated.find(node => node.props.className === "priceFree")), "FREE");
  for (const tone of ["auth", "error", "success"]) {
    const feedback = nodes(renderCard({ ...props, saveMessage: { tone, text: "Server response retained", requestId: "safe-test-request" } }));
    const message = feedback.find(node => node.props.className?.startsWith("saveMessage "));
    assert.equal(message.props.role, tone === "error" ? "alert" : "status");
    assert.ok(text(message).includes("Server response retained"));
    if (tone === "auth") assert.deepEqual(feedback.filter(node => node.type === "Link").map(node => node.props.href), ["/login?returnTo=%2Fdeals", "/register?returnTo=%2Fdeals"]);
    if (tone !== "success") assert.equal(feedback.find(node => node.type === "RequestIdSupportText").props.requestId, "safe-test-request");
  }
});

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
  assert.ok(anchor.props.children.includes("View Deal"));
  assert.ok(anchor.props["aria-label"].includes("View Deal"));
  assert.match(anchor.props["aria-label"], /in a new tab/);
  assert.equal(anchor.props.onClick, undefined, "verified links retain native navigation");

  for (const dealUrl of [undefined, null, "", "https://store.steampowered.com/app/123", "javascript:alert(1)"]) {
    const selectedTitles = [];
    const button = viewControl({ ...alertDeal, dealUrl }, title => selectedTitles.push(title));
    assert.equal(button.type, "button");
    assert.equal(button.props.type, "button");
    assert.ok(!button.props.disabled, "fallback Find Current Offers is actionable");
    assert.ok(button.props.children.includes("Find Current Offers"));
    assert.equal(button.props["aria-label"], `Find Current Offers for ${alertDeal.title}`);
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
    status: "sample",
    tag: "sample",
  });
  assert.equal(giveaway?.platform, "Steam");
  assert.equal(giveaway?.worth, "$24.99");
  assert.equal(giveaway?.status, "sample");
  assert.equal(giveaway?.href, null, "no claim destination is invented");

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

async function discoveryWindowHarness(scene, initialTab = "giveaways") {
  const source = await readFile(new URL("../src/components/DiscoveryWindow.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("discovery.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const program = ast.statements.filter(node => !ts.isImportDeclaration(node))
    .map(node => node.getText(ast)).join("\n").replace("export default function DiscoveryWindow", "function DiscoveryWindow");
  const output = ts.transpileModule(program, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  let activeTab = initialTab;
  const tabRefs = { current: {} };
  const mocks = {
    React, isExternalHref,
    useRef: () => tabRefs,
    Link: ({ children, ...props }) => React.createElement("a", props, children),
    useState: () => [activeTab, value => { activeTab = typeof value === "function" ? value(activeTab) : value; }],
    useHomeScene: () => scene,
    styles: new Proxy({}, { get: (_target, key) => String(key) }),
  };
  const Component = new Function(...Object.keys(mocks), `${output}\nreturn DiscoveryWindow;`)(...Object.values(mocks));
  const nodes = node => {
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (!node || typeof node !== "object") return [];
    return [node, ...nodes(node.props.children)];
  };
  return {
    html: () => renderToStaticMarkup(Component()),
    find: predicate => nodes(Component()).find(predicate),
  };
}

const giveawayDiscoveryScene = giveaway => ({
  status: "ready", data: { deal: null, giveaway, summary: mapSummary({}) },
  errors: { deals: false, giveaways: false, summary: false }, reload() {},
});

test("homepage giveaway discovery renders sample disclosure and truthful internal navigation", async () => {
  const source = await readFile(new URL("../src/components/DiscoveryWindow.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Claim giveaway/);
  for (const url of [undefined, "https://unverified.example/claim"]) {
    const giveaway = mapGiveaway({ ...giveawaySamples[0], url });
    assert.equal(giveaway.status, "sample");
    const h = await discoveryWindowHarness(giveawayDiscoveryScene(giveaway));
    const html = h.html();
    assert.match(html, /<p class="stateText">Unverified sample\. No verified claim destination\.<\/p>/);
    assert.match(html, /Sample list price.*\$19\.99/);
    assert.match(html, /<a class="itemLink" href="\/giveaways">Explore giveaway samples/);
    assert.doesNotMatch(html, /Claim giveaway|https?:\/\/|target="_blank"/);
  }
  const unknown = mapGiveaway({ title: "Unknown provenance", originalPrice: "$9.99" });
  assert.equal(unknown.status, null, "missing status is not inferred to be sample or verified");
  const h = await discoveryWindowHarness(giveawayDiscoveryScene(unknown));
  assert.match(h.html(), /Unverified entry\. No verified claim destination\./);
  assert.match(h.html(), /href="\/giveaways">View giveaway details/);
});

test("homepage discovery preserves loading, errors, empty states, refresh, tabs, and deal links", async () => {
  let reloads = 0;
  const scene = giveawayDiscoveryScene(mapGiveaway(giveawaySamples[0]));
  scene.reload = () => { reloads++; scene.status = "loading"; };
  const h = await discoveryWindowHarness(scene);
  scene.status = "loading";
  assert.match(h.html(), /aria-busy="true"/);
  assert.match(h.html(), /class="skeleton"/);
  assert.doesNotMatch(h.html(), /Explore giveaway samples|Claim giveaway/);
  scene.status = "ready";
  scene.errors.giveaways = true;
  assert.match(h.html(), /Discovery on standby/);
  assert.doesNotMatch(h.html(), /Cyber Shadow/);
  h.find(node => node.type === "button" && node.props.className === "retry").props.onClick();
  assert.equal(reloads, 1);
  assert.match(h.html(), /aria-busy="true"/);
  scene.status = "error";
  assert.match(h.html(), /Refresh discovery/);
  scene.status = "ready";
  scene.errors.giveaways = false;
  scene.data.giveaway = null;
  assert.match(h.html(), /Between discoveries/);
  assert.match(h.html(), /href="\/giveaways">Explore giveaways/);
  scene.data.giveaway = mapGiveaway(giveawaySamples[0]);
  scene.data.deal = mapDeal({ title: "Homepage deal", store: "Steam", priceNew: "$9.99", dealUrl: "https://www.cheapshark.com/redirect?dealID=example" });
  h.find(node => node.props.id === "discovery-tab-deals").props.onClick();
  assert.match(h.html(), /Homepage deal/);
  assert.match(h.html(), /href="https:\/\/www\.cheapshark\.com\/redirect\?dealID=example" target="_blank" rel="noopener noreferrer">View deal/);
  let prevented = false;
  h.find(node => node.props.id === "discovery-tab-deals").props.onKeyDown({ key: "ArrowRight", preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.match(h.html(), /Explore giveaway samples/);
  assert.match(h.html(), /aria-labelledby="discovery-tab-giveaways"/);
});

test("homepage feed transport preserves giveaway provenance and independent source failures", async () => {
  const originalFetch = globalThis.fetch;
  let giveawaysFail = false;
  globalThis.fetch = async url => {
    const path = new URL(url).pathname;
    if (path === "/api/deals") return Response.json([{ title: "Retained deal", priceNew: "$4.99" }]);
    if (path === "/api/giveaways") return giveawaysFail ? Response.json({}, { status: 503 }) : Response.json(giveawaySamples);
    assert.equal(path, "/api/dashboard/summary");
    return Response.json({ activeDealsCount: 4, activeGiveawaysCount: 8 });
  };
  try {
    const ready = await loadHomeFeed();
    assert.equal(ready.data.giveaway.status, "sample");
    assert.equal(ready.data.giveaway.href, null);
    assert.deepEqual(ready.errors, { deals: false, giveaways: false, summary: false });
    giveawaysFail = true;
    const failed = await loadHomeFeed();
    assert.equal(failed.data.giveaway, null);
    assert.equal(failed.data.deal.title, "Retained deal");
    assert.equal(failed.data.summary.giveaways, 8, "summary counts retain the returned API value");
    assert.deepEqual(failed.errors, { deals: false, giveaways: true, summary: false });
  } finally { globalThis.fetch = originalFetch; }
});

test("homepage summary distinguishes incomplete and unavailable responses", () => {
  const incomplete = mapSummary({ activeDealsCount: 4 });
  assert.equal(incomplete.deals, 4);
  assert.equal(incomplete.giveaways, null);
  assert.equal(getHomeSummaryAvailability("ready", false, incomplete), "incomplete");
  assert.equal(getHomeSummaryAvailability("ready", true, incomplete), "unavailable");
});

// Run the panel's production hooks, load/save handlers and JSX with controlled
// network completions. Obtain its props and auth-required callback from each
// consumer's actual source rather than duplicating preference state logic.
async function notificationPreferencesHarness(consumer = "SettingsCenter", { beforeAuthRecoveryDecision } = {}) {
  const h = await sentinelChatHarness();
  const source = await readFile(new URL("../src/components/NotificationPreferencesPanel.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("preferences.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = ast.statements.find(node => node.name?.text === "NotificationPreferencesPanel");
  const renderReturn = component.body.statements.at(-1);
  assert.ok(ts.isReturnStatement(renderReturn));
  const program = [
    ...ast.statements.filter(node => ts.isVariableStatement(node) &&
      node.declarationList.declarations.some(item => ["notificationPreferenceFields", "preferenceDataGeneration",
        "preferenceMutationListeners", "pendingPreferenceSaves", "preferenceSaveListeners"].includes(item.name.getText(ast)))).map(node => node.getText(ast)),
    `function NotificationPreferencesPanel({ authToken, onAuthenticationRequired, onTokenChanged }) {
      ${component.body.statements.slice(0, -1).map(node => node.getText(ast)).join("\n")
        .replace("void loadPreferences();", "loadCallbacks.push(loadPreferences); pendingLoads.push(loadPreferences());")}
      return { savePreferences, retry: () => setRetryKey(current => current + 1),
        pendingRevisions: () => [...pendingPreferenceSaves],
        state: { savedPreferences, draftPreferences, loadState, message, isSaving,
          generation: preferenceDataGeneration.current,
          pending: pendingPreferenceSaves.has(readAuthSessionRevision()),
          pendingRevisions: [...pendingPreferenceSaves] }, tree: ${renderReturn.expression.getText(ast)} };
    }`,
  ].join("\n");
  const compile = code => ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  let cursor = 0;
  const cells = [];
  const stateWrites = [];
  let effects = [];
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      cells[index] ??= { value: typeof initial === "function" ? initial() : initial };
      const cell = cells[index];
      return [cell.value, value => {
        cell.value = typeof value === "function" ? value(cell.value) : value;
        stateWrites.push(index);
      }];
    },
    useRef(initial) {
      const index = cursor++;
      cells[index] ??= { current: initial };
      return cells[index];
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
  const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
  const pendingLoads = [];
  const loadCallbacks = [];
  const mocks = {
    ...hooks, ...h.auth, ...h.preferences, React: react, pendingLoads, loadCallbacks,
    ...(beforeAuthRecoveryDecision ? {
      withNotificationPreferenceAuthRetry: (token, request, operation) => h.auth.withAuthSessionRetry(
        token, request, error => {
          beforeAuthRecoveryDecision();
          return h.preferences.normalizeNotificationPreferenceError(error).status === 401;
        }, operation),
    } : {}),
    UxStatePanel: "UxStatePanel", UxSkeleton: "UxSkeleton", RequestIdSupportText: "RequestIdSupportText",
  };
  const Panel = new Function(...Object.keys(mocks), `${compile(program)}\nreturn NotificationPreferencesPanel;`)(...Object.values(mocks));
  const consumerSource = await readFile(new URL(`../src/components/${consumer}.tsx`, import.meta.url), "utf8");
  const consumerAst = ts.createSourceFile("consumer.tsx", consumerSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let panelJsx;
  const collect = node => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(consumerAst) === "NotificationPreferencesPanel") panelJsx = node;
    ts.forEachChild(node, collect);
  };
  collect(consumerAst);
  assert.ok(panelJsx, `${consumer} renders the shared panel`);
  const callbackName = consumer === "SettingsCenter" ? "handleNotificationAuthenticationRequired" : "handleAuthenticationRequired";
  const parent = consumerAst.statements.find(node => node.name?.text === consumer);
  const callbackDeclaration = parent.body.statements.find(node => ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(item => item.name.getText(consumerAst) === callbackName));
  let authToken = h.auth.readAuthToken();
  let authRequired = 0;
  const changedTokens = [];
  const setAuthToken = token => { authToken = token; changedTokens.push(token); };
  const callbackMocks = {
    clearAuthToken: () => { authRequired++; h.auth.clearAuthToken(); }, setAuthToken,
    useCallback: callback => callback, alertEventsRequestVersion: { current: 0 },
    consumerLifetime: { active: true }, consumerSessionRevision: h.auth.readAuthSessionRevision(),
    readAuthSessionRevision: h.auth.readAuthSessionRevision,
    wishlistItems: [], alertsFor: () => ({}),
    ...Object.fromEntries(["AuthState", "PersonalItems", "AlertEvents", "AlertEventsLoading",
      "AlertEventsMessage", "Alerts", "UpdatingIds", "ItemMessages", "ServiceMessage", "View"].map(name => [`set${name}`, () => {}])),
  };
  const onAuthenticationRequired = new Function(...Object.keys(callbackMocks),
    `${compile(callbackDeclaration.getText(consumerAst))}\nreturn ${callbackName};`)(...Object.values(callbackMocks));
  const propsFactory = new Function("React", "NotificationPreferencesPanel", "authToken", callbackName,
    "setAuthToken", "onAuthenticationRequired", "onTokenChanged",
    `${compile(`const panel = ${panelJsx.getText(consumerAst)};`)}\nreturn panel.props;`);
  let handlers;
  const render = () => {
    if (!authToken) return handlers;
    cursor = 0;
    const props = propsFactory(react, Panel, authToken, onAuthenticationRequired,
      setAuthToken, onAuthenticationRequired, setAuthToken);
    assert.equal(props.onTokenChanged, setAuthToken);
    assert.equal(props.onAuthenticationRequired, onAuthenticationRequired);
    handlers = Panel(props);
    const pending = effects;
    effects = [];
    pending.forEach(effect => effect());
    return handlers;
  };
  // Emulate the parent delivering its auth-event token update and rerender.
  const handleAuthChange = () => {
    authToken = h.auth.readAuthToken();
    if (authToken) render();
    else cells.forEach(cell => cell.cleanup?.());
  };
  window.addEventListener(h.auth.AUTH_STATE_EVENT, handleAuthChange);
  h.respond(preferencePath, persistedPreferences);
  render();
  await settle();
  render();
  const nodes = node => {
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (!node || typeof node !== "object") return [];
    return [node, ...nodes(node.props?.children)];
  };
  return {
    ...h, render, changedTokens, loadCallbacks, stateWrites,
    dispose() { window.removeEventListener(h.auth.AUTH_STATE_EVENT, handleAuthChange); cells.forEach(cell => cell.cleanup?.()); },
    // The committed render before effect-triggered state changes rerender it.
    lastRender: () => handlers,
    deliverAuthChange: handleAuthChange,
    state: () => render().state,
    loaded: () => pendingLoads.at(-1),
    authRequired: () => authRequired,
    pendingRevisions: () => handlers.pendingRevisions(),
    tree: () => render().tree,
    nodes: () => nodes(render().tree),
    // Hold parent auth-event delivery while a current effect finishes its retry.
    pauseAuthUpdates: () => window.removeEventListener(h.auth.AUTH_STATE_EVENT, handleAuthChange),
    toggleEmail(value) {
      const checkbox = nodes(render().tree).find(node => node.type === "input");
      assert.ok(checkbox && !checkbox.props.disabled);
      checkbox.props.onChange({ target: { checked: value } });
      render();
    },
    save: () => render().savePreferences({ preventDefault() {} }),
    retry: () => { render().retry(); render(); },
    remount() {
      cells.forEach(cell => cell.cleanup?.());
      cells.length = 0;
      effects = [];
      authToken = h.auth.readAuthToken();
      render();
    },
    restore() {
      window.removeEventListener(h.auth.AUTH_STATE_EVENT, handleAuthChange);
      cells.forEach(cell => cell.cleanup?.());
      h.restore();
    },
  };
}

const preferenceConsumers = ["SettingsCenter", "WishlistExplorer"];
const savedPreferenceMessage = { kind: "success", text: "Preferences saved to your account." };

const preferencePatches = h => h.calls.filter(call => call.path === preferencePath && call.method === "PATCH");
function assertPreferenceSaveBusy(h, expected) {
  assert.equal(h.state().isSaving, expected);
  assert.equal(h.state().pending, expected);
  const nodes = h.nodes();
  const form = nodes.find(node => node.type === "form");
  assert.equal(form.props["aria-busy"], expected);
  assert.ok(nodes.filter(node => node.type === "input").every(node => node.props.disabled === expected));
  const submit = nodes.find(node => node.type === "button" && node.props.type === "submit");
  if (expected) {
    assert.equal(submit.props.disabled, true);
    assert.match(JSON.stringify(h.tree()), /Saving preferences to your account/);
  }
}

for (const consumer of preferenceConsumers) {
  for (const replacementToken of ["account-b", "initial"]) {
    test(`F1 ${consumer} fresh transition callbacks cannot submit another account's draft (${replacementToken})`, async () => {
      const h = await notificationPreferencesHarness(consumer);
      let reply;
      try {
        await h.loaded();
        h.toggleEmail(true);
        const old = h.render();
        const oldCheckbox = h.nodes().find(node => node.type === "input");
        reply = h.defer(preferencePath);
        h.auth.startAuthSession(sentinelSession(2, replacementToken));
        const transition = h.lastRender();
        const loading = h.render();
        const callsBefore = h.calls.length;
        for (const callback of [old.savePreferences, transition.savePreferences, loading.savePreferences]) {
          await callback({ preventDefault() {} });
          assert.equal(preferencePatches(h).length, 0, "neither old nor fresh callbacks may transmit A's draft");
          assert.deepEqual(h.pendingRevisions(), [], "rejected callbacks must not take B's save lock");
        }
        assert.equal(h.calls.length, callsBefore, "no save, refresh or retry while B's data is unavailable");
        assert.doesNotMatch(JSON.stringify(transition.tree), /"type":"(?:form|input)"/, "the first B render must hide A's form before effects rerender");
        assert.match(JSON.stringify(transition.tree), /Loading notification preferences/);
        assert.equal(h.nodes().some(node => node.type === "form"), false);

        const accountB = { ...persistedPreferences, inAppEnabled: false, targetReachedEnabled: false, freeGameEnabled: true };
        reply(accountB);
        await h.loaded();
        assert.deepEqual(h.state().savedPreferences, accountB);
        assert.deepEqual(h.state().draftPreferences, accountB);
        const before = structuredClone(h.state());
        // Even after B loads, a fresh transition closure still owns A's data.
        await transition.savePreferences({ preventDefault() {} });
        oldCheckbox.props.onChange({ target: { checked: true } });
        assert.equal(preferencePatches(h).length, 0);
        assert.deepEqual(h.state(), before, "retained edits and submissions must leave B's data unchanged");

        h.toggleEmail(true);
        const savedB = { ...accountB, emailEnabled: true };
        h.respond(preferencePath, savedB);
        await h.save();
        assert.deepEqual(preferencePatches(h), [{ path: preferencePath, method: "PATCH", token: `Bearer ${replacementToken}`, body: savedB }]);
        assert.deepEqual(h.state().draftPreferences, savedB);
        assertPreferenceSaveBusy(h, false);
        assert.equal(h.authRequired(), 0);
      } finally { reply?.(persistedPreferences); h.restore(); }
    });

    test(`F1 ${consumer} hides A's form before the parent delivers B's token (${replacementToken})`, async () => {
      const h = await notificationPreferencesHarness(consumer);
      let reply;
      try {
        await h.loaded();
        h.toggleEmail(true);
        h.pauseAuthUpdates();
        reply = h.defer(preferencePath);
        const getsBefore = h.calls.filter(call => call.path === preferencePath).length;
        h.auth.startAuthSession(sentinelSession(2, replacementToken));
        const transition = h.render(); // New revision, potentially obsolete token prop.
        assert.doesNotMatch(JSON.stringify(transition.tree), /"type":"(?:form|input)"/);
        assert.match(JSON.stringify(transition.tree), /Loading notification preferences/);
        await transition.savePreferences({ preventDefault() {} });
        assert.equal(preferencePatches(h).length, 0);
        if (replacementToken !== "initial") {
          assert.equal(h.calls.filter(call => call.path === preferencePath).length, getsBefore, "never load B's revision with A's token prop");
        }
        h.deliverAuthChange();
        const latestGet = h.calls.filter(call => call.path === preferencePath && call.method === "GET").at(-1);
        assert.equal(latestGet.token, `Bearer ${replacementToken}`);
        const accountB = { ...persistedPreferences, priceDropEnabled: false, freeGameEnabled: true };
        reply(accountB);
        await h.loaded();
        assert.deepEqual(h.state().draftPreferences, accountB);
        assert.equal(h.nodes().filter(node => node.type === "input").length, 5);
      } finally { reply?.(persistedPreferences); h.restore(); }
    });

    for (const staleStatus of [200, 401, 503]) {
      test(`F1 ${consumer} late A GET ${staleStatus} cannot restore its data ownership (${replacementToken})`, async () => {
        const h = await notificationPreferencesHarness(consumer);
        let oldReply;
        let newReply;
        let oldLoad;
        try {
          await h.loaded();
          h.toggleEmail(true);
          oldReply = h.defer(preferencePath);
          h.retry();
          oldLoad = h.loaded();
          newReply = h.defer(preferencePath);
          h.auth.startAuthSession(sentinelSession(2, replacementToken));
          const accountB = { ...persistedPreferences, inAppEnabled: false, freeGameEnabled: true };
          newReply(accountB);
          await h.loaded();
          h.toggleEmail(true);
          const before = structuredClone(h.state());
          const callsBefore = h.calls.length;
          oldReply(persistedPreferences, staleStatus);
          await oldLoad;
          assert.deepEqual(h.state(), before, "late A completion must preserve B's saved preferences and unsaved draft");
          assert.equal(h.calls.length, callsBefore, "stale 401 must not refresh");
          assert.equal(h.authRequired(), 0);
          const savedB = { ...accountB, emailEnabled: true };
          h.respond(preferencePath, savedB);
          await h.save();
          assert.deepEqual(preferencePatches(h).map(call => [call.token, call.body]), [[`Bearer ${replacementToken}`, savedB]]);
          assert.deepEqual(h.state().savedPreferences, savedB);
        } finally {
          oldReply?.(persistedPreferences);
          newReply?.(persistedPreferences);
          if (oldLoad) await oldLoad;
          h.restore();
        }
      });
    }
  }

  for (const [boundary, replacement] of [
    ["other account", sentinelSession(2, "account-b")],
    ["other account with identical token", sentinelSession(2, "initial")],
    ["new login with identical token", sentinelSession(1, "initial")],
  ]) {
    test(`F1 ${consumer} rejects a retained submit after ${boundary} before locking or dispatch`, async () => {
      const h = await notificationPreferencesHarness(consumer);
      let reply;
      let staleOperation;
      try {
        await h.loaded();
        h.toggleEmail(true);
        const retainedSubmit = h.render().savePreferences;
        const originalRevision = h.auth.readAuthSessionRevision();
        const replacementPreferences = { ...persistedPreferences, inAppEnabled: false, freeGameEnabled: true };
        h.respond(preferencePath, replacementPreferences);
        h.auth.startAuthSession(replacement);
        await h.loaded();
        assert.notEqual(h.auth.readAuthSessionRevision(), originalRevision);
        assert.deepEqual(h.state().savedPreferences, replacementPreferences);
        assert.deepEqual(h.state().draftPreferences, replacementPreferences);
        const before = structuredClone(h.state());
        const callsBefore = h.calls.length;
        const callbacksBefore = [...h.changedTokens];
        reply = h.defer(preferencePath);
        staleOperation = retainedSubmit({ preventDefault() {} });
        assert.deepEqual(h.pendingRevisions(), [], "stale callback must not acquire the replacement session's lock");
        assert.equal(h.calls.length, callsBefore, "stale callback must issue no request, refresh or retry");
        await staleOperation;
        assert.deepEqual(h.state(), before, "replacement draft, saved state and messages must remain unchanged");
        assert.deepEqual(h.changedTokens, callbacksBefore);
        assert.equal(h.authRequired(), 0);
        assert.equal(h.auth.readAuthToken(), replacement.token);
        assert.equal(preferencePatches(h).length, 0, "the old draft must never be transmitted");
        assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);

        h.toggleEmail(true);
        const saved = { ...replacementPreferences, emailEnabled: true };
        const saving = h.save();
        assertPreferenceSaveBusy(h, true);
        assert.equal(preferencePatches(h).length, 1);
        assert.equal(preferencePatches(h)[0].token, `Bearer ${replacement.token}`);
        assert.deepEqual(preferencePatches(h)[0].body, saved, "only the replacement account's current draft is submitted");
        reply(saved);
        await saving;
        assert.deepEqual(h.state().savedPreferences, saved);
        assert.deepEqual(h.state().draftPreferences, saved);
        assert.deepEqual(h.state().message, savedPreferenceMessage);
        assertPreferenceSaveBusy(h, false);
      } finally {
        reply?.(persistedPreferences);
        if (staleOperation) await staleOperation;
        h.restore();
      }
    });
  }

  test(`F1 ${consumer} retains a same-session submit across same-user token rotation`, async () => {
    const h = await notificationPreferencesHarness(consumer);
    try {
      await h.loaded();
      h.toggleEmail(true);
      const retainedSubmit = h.render().savePreferences;
      const revision = h.auth.readAuthSessionRevision();
      h.respond(refreshPath, sentinelSession(1, "rotated"));
      h.respond(preferencePath, persistedPreferences);
      await h.auth.ensureAuthToken({ forceRefresh: true });
      await h.loaded();
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      const refreshesBefore = h.calls.filter(call => call.path === refreshPath).length;
      const saved = { ...persistedPreferences, emailEnabled: true };
      h.respond(preferencePath, {}, 401);
      h.respond(preferencePath, saved);
      await retainedSubmit({ preventDefault() {} });
      assert.deepEqual(preferencePatches(h).map(call => call.token), ["Bearer initial", "Bearer rotated"]);
      assert.ok(preferencePatches(h).every(call => JSON.stringify(call.body) === JSON.stringify(saved)));
      assert.equal(h.calls.filter(call => call.path === refreshPath).length, refreshesBefore);
      assert.deepEqual(h.state().savedPreferences, saved);
      assert.deepEqual(h.state().message, savedPreferenceMessage);
      assertPreferenceSaveBusy(h, false);
    } finally { h.restore(); }
  });
}

for (const consumer of preferenceConsumers) {
  test(`B-09 ${consumer} exact pending PATCH remount race suppresses overlap and releases after complete success`, async () => {
    const h = await notificationPreferencesHarness(consumer);
    try {
      assert.equal(h.state().savedPreferences.emailEnabled, false);
      h.toggleEmail(true);
      const patchReply = h.defer(preferencePath);
      const mutation = h.save();
      const revision = h.auth.readAuthSessionRevision();
      // PATCH A has persisted true; only its HTTP response remains pending.
      const authoritative = { ...persistedPreferences, emailEnabled: true, inAppEnabled: false, freeGameEnabled: true };
      h.respond(preferencePath, authoritative);
      h.remount();
      assert.equal(h.state().isSaving, true, "the replacement inherits pending state before GET settles");
      await h.loaded();
      assert.deepEqual(h.state().savedPreferences, authoritative);
      assertPreferenceSaveBusy(h, true);
      // Invoke the production change/submit handlers even though the UI is disabled.
      h.nodes().find(node => node.type === "input").props.onChange({ target: { checked: false } });
      const before = structuredClone(h.state());
      await h.save();
      assert.deepEqual(h.state(), before, "a suppressed save has no state or generation side effects");
      assert.notEqual(h.state().message?.kind, "success");
      assert.equal(preferencePatches(h).length, 1);
      assert.deepEqual(h.calls.filter(call => call.path === preferencePath).map(call => call.method), ["GET", "PATCH", "GET"]);
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      patchReply(authoritative);
      await mutation;
      assertPreferenceSaveBusy(h, false);
      assert.deepEqual(h.pendingRevisions(), []);
      assert.deepEqual(h.state().savedPreferences, authoritative);
      assert.deepEqual(h.state().draftPreferences, authoritative);
      assert.deepEqual(h.state().message, savedPreferenceMessage);
      assert.equal(h.state().generation, 1);
      // After release a new save may persist false normally.
      h.toggleEmail(false);
      const secondReply = h.defer(preferencePath);
      const secondSave = h.save();
      assert.equal(preferencePatches(h).length, 2);
      assertPreferenceSaveBusy(h, true);
      const latest = { ...authoritative, emailEnabled: false, targetReachedEnabled: false };
      secondReply(latest);
      await secondSave;
      assertPreferenceSaveBusy(h, false);
      assert.deepEqual(h.state().savedPreferences, latest);
      assert.deepEqual(h.state().draftPreferences, latest);
      assert.equal(h.state().generation, 2);
    } finally { h.restore(); }
  });

  test(`B-09 ${consumer} same-user token refresh and remount retain one pending PATCH`, async () => {
    const h = await notificationPreferencesHarness(consumer);
    try {
      h.toggleEmail(true);
      const patchReply = h.defer(preferencePath);
      const mutation = h.save();
      const revision = h.auth.readAuthSessionRevision();
      const authoritative = { ...persistedPreferences, emailEnabled: true };
      h.respond(refreshPath, sentinelSession(1, "rotated"));
      h.respond(preferencePath, authoritative);
      await h.auth.ensureAuthToken({ forceRefresh: true });
      await settle();
      h.respond(preferencePath, authoritative);
      h.remount();
      await h.loaded();
      assert.equal(h.auth.readAuthToken(), "rotated");
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      assertPreferenceSaveBusy(h, true);
      h.nodes().find(node => node.type === "input").props.onChange({ target: { checked: false } });
      await h.save();
      assert.equal(preferencePatches(h).length, 1);
      assert.equal(h.state().generation, 0);
      assert.notEqual(h.state().message?.kind, "success");
      h.respond(preferencePath, authoritative);
      patchReply(authoritative);
      await mutation;
      // The existing auth callback can start a fresh post-save GET on rerender.
      assert.equal(h.state().isSaving, false);
      await h.loaded();
      assert.deepEqual(h.pendingRevisions(), []);
      assert.deepEqual(h.state().savedPreferences, authoritative);
      assert.deepEqual(h.state().draftPreferences, authoritative);
      assert.equal(h.state().loadState, "ready");
      assert.notEqual(h.state().message?.kind, "error");
      assert.equal(h.state().generation, 1);
    } finally { h.restore(); }
  });

  for (const failure of ["HTTP 503", "network"]) {
    test(`B-09 ${consumer} ${failure} releases a remounted save, retains truthful error and permits retry`, async () => {
      const h = await notificationPreferencesHarness(consumer);
      try {
        h.toggleEmail(true);
        const patchReply = h.defer(preferencePath);
        const mutation = h.save();
        h.respond(preferencePath, persistedPreferences);
        h.remount();
        await h.loaded();
        assertPreferenceSaveBusy(h, true);
        await h.save();
        assert.equal(preferencePatches(h).length, 1);
        if (failure === "HTTP 503") patchReply({}, 503, "b09-save-request");
        else patchReply.reject(new TypeError("Network unavailable"));
        await mutation;
        assertPreferenceSaveBusy(h, false);
        assert.deepEqual(h.pendingRevisions(), []);
        assert.equal(h.state().generation, 0);
        assert.equal(h.state().message.kind, "error");
        assert.equal(h.state().message.requestId, failure === "HTTP 503" ? "b09-save-request" : null);
        assert.match(JSON.stringify(h.tree()), failure === "HTTP 503" ? /b09-save-request/ : /Cannot reach the notification preference service/);
        assert.deepEqual(h.state().savedPreferences, persistedPreferences);
        assert.deepEqual(h.state().draftPreferences, persistedPreferences);
        h.toggleEmail(true);
        const authoritative = { ...persistedPreferences, emailEnabled: true };
        h.respond(preferencePath, authoritative);
        await h.save();
        assertPreferenceSaveBusy(h, false);
        assert.equal(preferencePatches(h).length, 2);
        assert.equal(h.state().generation, 1);
        assert.deepEqual(h.state().savedPreferences, authoritative);
        assert.deepEqual(h.state().message, savedPreferenceMessage);
      } finally { h.restore(); }
    });
  }

  for (const terminalFailure of ["refresh 401", "retry 401"]) {
    test(`B-09 ${consumer} terminal ${terminalFailure} after remount releases the originating lock`, async () => {
      const h = await notificationPreferencesHarness(consumer);
      try {
        h.toggleEmail(true);
        const patchReply = h.defer(preferencePath);
        const mutation = h.save();
        h.respond(preferencePath, persistedPreferences);
        h.remount();
        await h.loaded();
        assertPreferenceSaveBusy(h, true);
        await h.save();
        assert.equal(preferencePatches(h).length, 1);
        const revision = h.auth.readAuthSessionRevision();
        h.pauseAuthUpdates();
        h.respond(refreshPath, terminalFailure === "refresh 401" ? {} : sentinelSession(1, "rotated"), terminalFailure === "refresh 401" ? 401 : 200);
        if (terminalFailure === "retry 401") h.respond(preferencePath, {}, 401, "b09-terminal-request");
        patchReply({}, 401);
        await mutation;
        assert.deepEqual(h.pendingRevisions(), []);
        assert.equal(h.auth.readAuthToken(), null);
        assert.ok(h.auth.readAuthSessionRevision() > revision);
        assert.equal(h.authRequired(), terminalFailure === "refresh 401" ? 0 : 1);
        assert.equal(h.state().generation, 0);
        assert.notEqual(h.state().message?.kind, "success");
        assert.equal(preferencePatches(h).length, terminalFailure === "refresh 401" ? 1 : 2);
        // Signing in again and mounting a new panel must allow a fresh save.
        h.auth.startAuthSession(sentinelSession(1, "signed-in-again"));
        h.respond(preferencePath, persistedPreferences);
        h.remount();
        await h.loaded();
        assertPreferenceSaveBusy(h, false);
        h.toggleEmail(true);
        h.respond(preferencePath, { ...persistedPreferences, emailEnabled: true });
        await h.save();
        assertPreferenceSaveBusy(h, false);
        assert.equal(h.state().generation, 1);
      } finally { h.restore(); }
    });
  }

  test(`B-09 ${consumer} a new auth revision resets pending UI even when the token string is unchanged`, async () => {
    const h = await notificationPreferencesHarness(consumer);
    h.toggleEmail(true);
    const oldReply = h.defer(preferencePath);
    const oldSave = h.save();
    try {
      const revisionA = h.auth.readAuthSessionRevision();
      const accountB = { ...persistedPreferences, freeGameEnabled: true };
      h.respond(preferencePath, accountB);
      h.auth.startAuthSession(sentinelSession(2, "initial"));
      await h.loaded();
      assert.notEqual(h.auth.readAuthSessionRevision(), revisionA);
      assert.equal(h.auth.readAuthToken(), "initial");
      assertPreferenceSaveBusy(h, false);
      h.toggleEmail(true);
      const authoritativeB = { ...accountB, emailEnabled: true };
      h.respond(preferencePath, authoritativeB);
      await h.save();
      assert.equal(preferencePatches(h).length, 2);
      assert.deepEqual(h.state().savedPreferences, authoritativeB);
      assert.deepEqual(h.state().message, savedPreferenceMessage);
      oldReply({ ...persistedPreferences, emailEnabled: true });
      await oldSave;
      assert.deepEqual(h.pendingRevisions(), []);
      assert.deepEqual(h.state().savedPreferences, authoritativeB);
      assertPreferenceSaveBusy(h, false);
    } finally {
      oldReply(persistedPreferences);
      await oldSave;
      h.restore();
    }
  });

  for (const oldCompletion of ["success", "HTTP 503", "401", "network"]) {
    test(`B-09 ${consumer} account replacement permits B save and rejects old A ${oldCompletion} without releasing B lock`, async () => {
      const h = await notificationPreferencesHarness(consumer);
      try {
        h.toggleEmail(true);
        const oldReply = h.defer(preferencePath);
        const oldSave = h.save();
        const revisionA = h.auth.readAuthSessionRevision();
        const accountB = { ...persistedPreferences, priceDropEnabled: false, freeGameEnabled: true };
        h.respond(preferencePath, accountB);
        h.auth.startAuthSession(sentinelSession(2, "account-b"));
        await settle();
        const revisionB = h.auth.readAuthSessionRevision();
        assert.notEqual(revisionB, revisionA);
        assertPreferenceSaveBusy(h, false);
        h.toggleEmail(true);
        const newReply = h.defer(preferencePath);
        const newSave = h.save();
        assertPreferenceSaveBusy(h, true);
        assert.equal(preferencePatches(h).length, 2, "different auth revisions may each have a pending save");
        assert.deepEqual(h.pendingRevisions(), [revisionA, revisionB]);
        const before = structuredClone(h.state());
        const callbacksBefore = [...h.changedTokens];
        if (oldCompletion === "network") oldReply.reject(new TypeError("Old account network failure"));
        else oldReply({ ...persistedPreferences, emailEnabled: true }, oldCompletion === "success" ? 200 : oldCompletion === "401" ? 401 : 503);
        await oldSave;
        assert.deepEqual(h.pendingRevisions(), [revisionB]);
        assertPreferenceSaveBusy(h, true);
        assert.deepEqual(h.state(), { ...before, pendingRevisions: [revisionB] });
        assert.deepEqual(h.changedTokens, callbacksBefore);
        assert.equal(h.authRequired(), 0);
        assert.equal(h.auth.readAuthToken(), "account-b");
        assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
        await h.save();
        assert.equal(preferencePatches(h).length, 2);
        const authoritativeB = { ...accountB, emailEnabled: true, inAppEnabled: false };
        newReply(authoritativeB);
        await newSave;
        assertPreferenceSaveBusy(h, false);
        assert.deepEqual(h.pendingRevisions(), []);
        assert.deepEqual(h.state().savedPreferences, authoritativeB);
        assert.deepEqual(h.state().draftPreferences, authoritativeB);
        assert.deepEqual(h.state().message, savedPreferenceMessage);
        assert.equal(h.state().generation, 1);
      } finally { h.restore(); }
    });
  }
}

test("B-09 synchronous shared acquisition suppresses a second invocation of a stale production handler", async () => {
  const h = await notificationPreferencesHarness();
  try {
    h.toggleEmail(true);
    const staleSave = h.render().savePreferences; // Both calls close over isSaving=false.
    const patchReply = h.defer(preferencePath);
    const mutation = staleSave({ preventDefault() {} });
    const before = structuredClone(h.state());
    await staleSave({ preventDefault() {} });
    assert.equal(preferencePatches(h).length, 1);
    assert.deepEqual(h.state(), before);
    assert.notEqual(h.state().message?.kind, "success");
    patchReply({ ...persistedPreferences, emailEnabled: true });
    await mutation;
    assertPreferenceSaveBusy(h, false);
    assert.equal(h.state().generation, 1);
  } finally { h.restore(); }
});

test("B-07 both consumers preserve the complete successful PATCH after the exact same-user auth-refresh GET race", async () => {
  for (const consumer of preferenceConsumers) {
    const h = await notificationPreferencesHarness(consumer);
    try {
      assert.deepEqual(h.state().savedPreferences, persistedPreferences);
      assert.deepEqual(h.state().draftPreferences, persistedPreferences);
      h.toggleEmail(true);
      const revision = h.auth.readAuthSessionRevision();
      h.respond(preferencePath, {}, 401);
      const refreshReply = h.defer(refreshPath);
      const mutation = h.save();
      await settle();
      const olderGetReply = h.defer(preferencePath);
      const patchReply = h.defer(preferencePath);
      refreshReply(sentinelSession(1, "rotated"));
      await settle();
      assert.equal(h.state().loadState, "loading");
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      assert.deepEqual(h.calls.filter(call => call.path === preferencePath).map(({ method, token }) => [method, token]),
        [["GET", "Bearer initial"], ["PATCH", "Bearer initial"], ["GET", "Bearer rotated"], ["PATCH", "Bearer rotated"]]);
      // Server changes to other fields must also replace the submitted draft.
      const authoritative = { ...persistedPreferences, emailEnabled: true, inAppEnabled: false, freeGameEnabled: true };
      patchReply(authoritative);
      await mutation;
      for (const beforeOrAfter of ["before", "after"]) {
        if (beforeOrAfter === "after") { olderGetReply(persistedPreferences); await settle(); }
        assert.deepEqual(h.state().savedPreferences, authoritative);
        assert.deepEqual(h.state().draftPreferences, authoritative);
        assert.deepEqual(h.state().message, savedPreferenceMessage);
        assert.equal(h.state().loadState, "ready");
        assert.equal(h.state().generation, 1);
        assert.match(JSON.stringify(h.tree()), /Preferences saved to your account/);
      }
      assert.equal(h.authRequired(), 0);
      assert.equal(h.auth.readAuthToken(), "rotated");
      assert.equal(h.calls.filter(call => call.path === refreshPath).length, 1);
      // A genuinely post-save GET may reconcile a different current snapshot.
      const current = { ...authoritative, priceDropEnabled: false };
      h.respond(preferencePath, current);
      h.retry();
      await settle();
      assert.deepEqual(h.state().savedPreferences, current);
      assert.deepEqual(h.state().draftPreferences, current);
      assert.equal(h.state().loadState, "ready");
      assert.equal(h.state().generation, 1);
    } finally { h.restore(); }
  }
});

test("B-07 a same-session replacement panel receives PATCH authority and discards its pre-save GET across remount", async () => {
  const h = await notificationPreferencesHarness("WishlistExplorer");
  try {
    h.toggleEmail(true);
    h.pauseAuthUpdates();
    h.respond(preferencePath, {}, 401);
    const refreshReply = h.defer(refreshPath);
    const mutation = h.save();
    await settle();
    const patchReply = h.defer(preferencePath);
    refreshReply(sentinelSession(1, "rotated"));
    await settle();
    const getReply = h.defer(preferencePath);
    h.remount(); // Wishlist's checking -> personal transition creates a new panel.
    assert.equal(h.state().loadState, "loading");
    assert.equal(h.state().savedPreferences, null);
    const authoritative = { ...persistedPreferences, emailEnabled: true, inAppEnabled: false };
    patchReply(authoritative);
    await mutation;
    assert.deepEqual(h.state().savedPreferences, authoritative);
    assert.deepEqual(h.state().draftPreferences, authoritative);
    assert.deepEqual(h.state().message, savedPreferenceMessage);
    assert.equal(h.state().loadState, "ready");
    getReply(persistedPreferences);
    await h.loaded();
    assert.deepEqual(h.state().savedPreferences, authoritative);
    assert.deepEqual(h.state().draftPreferences, authoritative);
    assert.deepEqual(h.state().message, savedPreferenceMessage);
    assert.equal(h.state().generation, 1);
    assert.equal(h.auth.readAuthToken(), "rotated");
  } finally { h.restore(); }
});

test("B-07 fresh preference GET and same-user auth refresh apply without a mutation", async () => {
  const h = await notificationPreferencesHarness();
  try {
    const current = { ...persistedPreferences, freeGameEnabled: true };
    const getReply = h.defer(preferencePath);
    const revision = h.auth.readAuthSessionRevision();
    h.respond(refreshPath, sentinelSession(1, "rotated"));
    await h.auth.ensureAuthToken({ forceRefresh: true });
    await settle();
    assert.equal(h.state().loadState, "loading");
    getReply(current);
    await settle();
    assert.deepEqual(h.state().savedPreferences, current);
    assert.deepEqual(h.state().draftPreferences, current);
    assert.equal(h.state().loadState, "ready");
    assert.equal(h.state().generation, 0);
    assert.equal(h.auth.readAuthSessionRevision(), revision);
  } finally { h.restore(); }
});

test("B-07 failed preference PATCH retains request ID, does not advance generation and permits pending GET reconciliation", async () => {
  const h = await notificationPreferencesHarness();
  try {
    h.toggleEmail(true);
    h.respond(preferencePath, {}, 503, "b07-save-request");
    const mutation = h.save();
    const getReply = h.defer(preferencePath);
    h.retry();
    await mutation;
    assert.equal(h.state().generation, 0);
    assert.equal(h.state().message.kind, "error");
    assert.equal(h.state().message.requestId, "b07-save-request");
    assert.deepEqual(h.state().savedPreferences, persistedPreferences);
    assert.equal(h.state().draftPreferences.emailEnabled, true);
    assert.equal(h.state().isSaving, false);
    const current = { ...persistedPreferences, freeGameEnabled: true };
    getReply(current);
    await settle();
    assert.deepEqual(h.state().savedPreferences, current);
    assert.deepEqual(h.state().draftPreferences, current);
    assert.equal(h.state().loadState, "ready");
    assert.equal(h.state().generation, 0);
    assert.notEqual(h.state().message?.kind, "success");
  } finally { h.restore(); }
});

test("B-07 superseded preference GET 503 and 401 cannot erase save success or clear authentication", async () => {
  for (const status of [503, 401]) {
    const h = await notificationPreferencesHarness();
    try {
      h.toggleEmail(true);
      const patchReply = h.defer(preferencePath);
      const mutation = h.save();
      const getReply = h.defer(preferencePath);
      h.retry();
      const authoritative = { ...persistedPreferences, emailEnabled: true };
      patchReply(authoritative);
      await mutation;
      const before = structuredClone(h.state());
      const revision = h.auth.readAuthSessionRevision();
      // Even a terminal refresh response must not be consumed by a stale 401.
      if (status === 401) h.respond(refreshPath, {}, 401);
      getReply({}, status);
      await settle();
      assert.deepEqual(h.state(), before);
      assert.deepEqual(h.state().message, savedPreferenceMessage);
      assert.equal(h.state().loadState, "ready");
      assert.equal(h.auth.readAuthToken(), "initial");
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      assert.equal(h.authRequired(), 0);
      assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
    } finally { h.restore(); }
  }
});

test("B-07 fresh preference GET failures preserve load error, request ID, recovery and current-session 401 behavior", async () => {
  for (const consumer of preferenceConsumers) {
    const h = await notificationPreferencesHarness(consumer);
    try {
      h.respond(preferencePath, {}, 503, "b07-load-request");
      h.retry();
      await settle();
      assert.equal(h.state().loadState, "error");
      assert.equal(h.state().message.kind, "error");
      assert.equal(h.state().message.requestId, "b07-load-request");
      assert.match(JSON.stringify(h.tree()), /Notification preferences unavailable/);
      assert.match(JSON.stringify(h.tree()), /b07-load-request/);
      h.respond(preferencePath, persistedPreferences);
      h.retry();
      await settle();
      assert.equal(h.state().loadState, "ready");
      assert.equal(h.state().message, null);
      h.pauseAuthUpdates();
      h.respond(preferencePath, {}, 401);
      h.respond(refreshPath, sentinelSession(1, "rotated"));
      h.respond(preferencePath, {}, 401);
      h.retry();
      await h.loaded();
      assert.equal(h.authRequired(), 1, "the live consumer clears auth on current-session retry 401");
      assert.equal(h.auth.readAuthToken(), null);
      assert.equal(h.state().generation, 0);
    } finally { h.restore(); }
  }
});

test("B-07 current preference PATCH 401 retry and terminal GET refresh failure retain B-04 auth behavior", async () => {
  for (const action of ["PATCH", "GET"]) {
    const h = await notificationPreferencesHarness();
    try {
      h.pauseAuthUpdates();
      if (action === "PATCH") h.toggleEmail(true);
      h.respond(preferencePath, {}, 401);
      h.respond(refreshPath, action === "PATCH" ? sentinelSession(1, "rotated") : {}, action === "PATCH" ? 200 : 401);
      if (action === "PATCH") h.respond(preferencePath, {}, 401);
      if (action === "PATCH") await h.save();
      else { h.retry(); await h.loaded(); }
      assert.equal(h.auth.readAuthToken(), null);
      assert.equal(h.authRequired(), action === "PATCH" ? 1 : 0);
      assert.equal(h.state().generation, 0);
      assert.notEqual(h.state().message?.kind, "success");
      // The GET count includes the initial successful load.
      assert.equal(h.calls.filter(call => call.path === preferencePath && call.method === action).length, 2);
    } finally { h.restore(); }
  }
});

test("B-07 both preference consumers reject Account-A GET/PATCH success and failures after Account B loads", async () => {
  for (const consumer of preferenceConsumers) {
    for (const action of ["GET", "PATCH"]) {
      for (const status of [200, 401, 503]) {
        const h = await notificationPreferencesHarness(consumer);
        try {
          const oldReply = h.defer(preferencePath);
          let mutation;
          if (action === "PATCH") { h.toggleEmail(true); mutation = h.save(); }
          else h.retry();
          const accountB = { ...persistedPreferences, priceDropEnabled: false, freeGameEnabled: true };
          h.respond(preferencePath, accountB);
          h.auth.startAuthSession(sentinelSession(2, "account-b"));
          await settle();
          const before = structuredClone(h.state());
          const callbacksBefore = [...h.changedTokens];
          const revision = h.auth.readAuthSessionRevision();
          oldReply({ ...persistedPreferences, emailEnabled: true }, status);
          if (mutation) await mutation;
          await settle();
          assert.deepEqual(h.state().savedPreferences, accountB);
          assert.deepEqual(h.state().draftPreferences, accountB);
          assert.deepEqual(h.state().message, before.message);
          assert.equal(h.state().loadState, "ready");
          assert.equal(h.state().generation, 0);
          assert.deepEqual(h.changedTokens, callbacksBefore);
          assert.equal(h.authRequired(), 0);
          assert.equal(h.auth.readAuthToken(), "account-b");
          assert.equal(h.auth.readAuthSessionRevision(), revision);
          assert.equal(h.calls.filter(call => call.path === refreshPath).length, 0);
        } finally { h.restore(); }
      }
    }
  }
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

for (const target of ["wishlist", "initial-events", "independent-events"]) {
  test(`F3-R01 authority changes at final authentication classification for ${target}`, async () => {
    let h, armed = false, decisions = 0;
    const saved = { ...alertItem, id: 99, title: "Authoritative write at recovery boundary", alertActive: true };
    h = await wishlistExplorerHarness(undefined, { beforeAuthRecoveryDecision() {
      if (!armed) return;
      armed = false;
      decisions++;
      h.respond(f3EventPath, [f3Event]);
      h.added(saved); // The production commit callback runs immediately before classification.
    } });
    try {
      await h.loaded();
      const revision = h.auth.readAuthSessionRevision();
      h.respond(refreshPath, {}, 401);
      let load;
      armed = true;
      if (target === "independent-events") {
        h.respond(f3EventPath, {}, 401);
        load = h.refreshEvents("initial");
      } else {
        h.respond(wishlistPath, target === "wishlist" ? {} : [alertItem], target === "wishlist" ? 401 : 200);
        h.respond(f3EventPath, target === "initial-events" ? {} : [], target === "initial-events" ? 401 : 200);
        h.authEvent(); load = h.loaded();
      }
      await load; await new Promise(resolve => setImmediate(resolve)); await settle();
      assert.equal(decisions, 1, "freshness must participate in the retry helper's final classification");
      assert.equal(f3Refreshes(h).length, 0);
      assert.equal(h.auth.readAuthToken(), "initial");
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      assert.equal(h.state().view, "personal");
      assert.deepEqual(h.state().personalItems, [saved, alertItem]);
      assert.deepEqual(h.state().alertEvents, [f3Event]);
    } finally { h.restore(); }
  });
}

for (const action of ["add", "edit", "delete"]) {
  for (const nextConsumer of ["unmounted", "same-session-remount", "replacement-account"]) {
    for (const completion of ["success", "service-failure"]) {
      test(`F3-R02 late ${action} ${completion} cannot affect ${nextConsumer}`, async () => {
        const h = await wishlistExplorerHarness();
        let reply, saving;
        try {
          await h.loaded();
          const path = action === "add" ? wishlistPath : action === "edit" ? `${wishlistPath}/42/alert` : `${wishlistPath}/42`;
          reply = h.defer(path);
          const saved = { ...alertItem, id: action === "add" ? 99 : 42, title: "Persisted after navigation", alertActive: true };
          saving = action === "add" ? h.add(saved) : action === "edit" ? h.update(alertItem, { alertActive: true }) : h.remove(alertItem);
          await settle();
          h.dispose();
          if (nextConsumer !== "unmounted") {
            h.respond(wishlistPath, [{ ...alertItem, title: "New consumer authority" }]);
            h.respond(f3EventPath, [f3Event]);
            if (nextConsumer === "replacement-account") h.auth.startAuthSession(sentinelSession(2, "account-b"));
            h.remount(); await h.loaded();
          }
          const before = structuredClone(h.state()), revision = h.auth.readAuthSessionRevision();
          const token = h.auth.readAuthToken(), callsBefore = h.calls.length, writesBefore = h.changes.length;
          h.respond(f3EventPath, {}, 401); h.respond(refreshPath, {}, 401);
          reply(completion === "success" ? saved : {}, completion === "success" ? 200 : 500);
          await saving; await new Promise(resolve => setImmediate(resolve)); await settle();
          assert.equal(h.calls.length, callsBefore, "a retired completion cannot create follow-up traffic");
          assert.equal(h.changes.length, writesBefore, "a retired completion cannot write consumer state");
          assert.equal(f3Refreshes(h).length, 0);
          assert.equal(h.auth.readAuthToken(), token);
          assert.equal(h.auth.readAuthSessionRevision(), revision);
          assert.deepEqual(h.state(), before);
        } finally { reply?.(alertItem); if (saving) await saving; await settle(); h.restore(); }
      });
    }
  }
}

// F3 targeted follow-up: preserve the auditor's schedules and assertions.


// Auditor-authored cases. Production source and the existing assertions remain unchanged.
for(const target of ['wishlist','initial-events','independent-events']) {
 test(`F3-R audit original defect ${target} stale 401 after committed mutation`, async()=>{
  const h=await wishlistExplorerHarness(); let held,saving,patch,load;
  try {
   await h.loaded(); const revision=h.auth.readAuthSessionRevision();
   if(target==='independent-events') {
    held=h.defer(f3EventPath); load=h.refreshEvents('initial');
    h.respond(`${wishlistPath}/42/alert`,{...alertItem,alertActive:true});
    h.respond(f3EventPath,[f3Event]); await h.update(alertItem,{alertActive:true});
   } else {
    patch=h.defer(`${wishlistPath}/42/alert`); saving=h.update(alertItem,{alertActive:true});
    if(target==='wishlist') {held=h.defer(wishlistPath);h.respond(f3EventPath,[]);}
    else {h.respond(wishlistPath,[alertItem]);held=h.defer(f3EventPath);}
    h.authEvent();load=h.loaded(); await settle();
    h.respond(f3EventPath,[f3Event]);patch({...alertItem,alertActive:true});await saving;await settle();
   }
   await new Promise(resolve=>setImmediate(resolve)); await settle();
   const before=structuredClone(h.state()); h.respond(refreshPath,{},401);held({},401);
   await load; await new Promise(resolve=>setImmediate(resolve));await settle();
   console.log('F3-R audit defect',JSON.stringify({target,before,after:h.state(),revisionBefore:revision,revisionAfter:h.auth.readAuthSessionRevision(),token:h.auth.readAuthToken(),refreshes:f3Refreshes(h).length,calls:h.calls}));
   assert.equal(f3Refreshes(h).length,0);assert.equal(h.auth.readAuthSessionRevision(),revision);assert.deepEqual(h.state(),before);
  } finally {patch?.(alertItem);held?.([]);if(saving)await saving;if(load)await load;await settle();h.restore();}
 });
}

for(const mutation of ['PATCH','POST']) {
 test(`F3-R audit unmount before successful ${mutation} must not start new history recovery`,async()=>{
  const h=await wishlistExplorerHarness();let reply,saving;
  try {
   await h.loaded();const revision=h.auth.readAuthSessionRevision();
   reply=h.defer(mutation==='PATCH'?`${wishlistPath}/42/alert`:wishlistPath);
   saving=mutation==='PATCH'?h.update(alertItem,{alertActive:true}):h.add({...alertItem,id:99,alertActive:true});
   await settle();h.dispose();
   h.respond(f3EventPath,{},401);h.respond(refreshPath,{},401);
   reply({...alertItem,id:mutation==='POST'?99:42,alertActive:true});await saving;
   await new Promise(resolve=>setImmediate(resolve));await settle();
   console.log('F3-R audit unmount',JSON.stringify({mutation,revisionBefore:revision,revisionAfter:h.auth.readAuthSessionRevision(),token:h.auth.readAuthToken(),refreshes:f3Refreshes(h).length,calls:h.calls}));
   assert.equal(f3Refreshes(h).length,0,'unmounted consumer must not start history auth recovery');
   assert.equal(h.auth.readAuthSessionRevision(),revision);assert.equal(h.auth.readAuthToken(),'initial');
  }finally{reply?.(alertItem);if(saving)await saving;await settle();h.restore();}
 });
}

for(const target of ['wishlist','initial-events','independent-events']) for(const gap of [0,4,5,6,10]) {
 test(`F3-R audit rejection propagation ${target} microtask gap ${gap}`,async()=>{
  const h=await wishlistExplorerHarness();let patch,held,history,saving,load;
  try {
   await h.loaded();const revision=h.auth.readAuthSessionRevision();
   patch=h.defer(`${wishlistPath}/42/alert`);saving=h.update(alertItem,{alertActive:true});
   if(target==='independent-events') {held=h.defer(f3EventPath);load=h.refreshEvents('initial');}
   else {
    if(target==='wishlist'){held=h.defer(wishlistPath);h.respond(f3EventPath,[]);}
    else {h.respond(wishlistPath,[alertItem]);held=h.defer(f3EventPath);}
    h.authEvent();load=h.loaded();
   }
   await settle(); history=h.defer(f3EventPath);h.respond(refreshPath,{},401);
   const fetchBeforeProbe=globalThis.fetch,recoveries=[];
   // Observe the first CSRF dispatch: it is synchronous with entering refreshSession,
   // before the later await that dispatches /refresh. No production instrumentation.
   globalThis.fetch=(url,init)=>{
    const path=new URL(url).pathname;
    if(path==='/api/auth/csrf'||path===refreshPath)recoveries.push({path,generation:h.state().generation});
    return fetchBeforeProbe(url,init);
   };
   patch({...alertItem,alertActive:true});
   for(let i=0;i<gap;i++)await Promise.resolve();
   held({},401);await saving;await load;await new Promise(resolve=>setImmediate(resolve));await settle();
   console.log('F3-R audit propagation',JSON.stringify({target,gap,recoveries,revisionBefore:revision,revisionAfter:h.auth.readAuthSessionRevision(),token:h.auth.readAuthToken(),state:h.state(),calls:h.calls}));
   assert.notEqual(recoveries[0]?.generation,1,'recovery must not begin for a now-obsolete snapshot');
   if(recoveries.length===0){assert.equal(h.auth.readAuthSessionRevision(),revision);assert.equal(h.auth.readAuthToken(),'initial');assert.equal(h.state().view,'personal');}
  }finally{patch?.(alertItem);held?.([]);history?.([]);if(saving)await saving;if(load)await load;await settle();h.restore();}
 });
}

for(const target of ['wishlist','initial-events','independent-events']) for(const gap of [8,9]) {
 test(`F3-R01 Node20 audit rejection propagation ${target} microtask gap ${gap}`,async()=>{
  const h=await wishlistExplorerHarness();let patch,held,history,saving,load;
  try {
   await h.loaded();const revision=h.auth.readAuthSessionRevision();
   patch=h.defer(`${wishlistPath}/42/alert`);saving=h.update(alertItem,{alertActive:true});
   if(target==='independent-events') {held=h.defer(f3EventPath);load=h.refreshEvents('initial');}
   else {
    if(target==='wishlist'){held=h.defer(wishlistPath);h.respond(f3EventPath,[]);}
    else {h.respond(wishlistPath,[alertItem]);held=h.defer(f3EventPath);}
    h.authEvent();load=h.loaded();
   }
   await settle(); history=h.defer(f3EventPath);h.respond(refreshPath,{},401);
   const fetchBeforeProbe=globalThis.fetch,recoveries=[];
   // Observe the first CSRF dispatch: it is synchronous with entering refreshSession,
   // before the later await that dispatches /refresh. No production instrumentation.
   globalThis.fetch=(url,init)=>{
    const path=new URL(url).pathname;
    if(path==='/api/auth/csrf'||path===refreshPath)recoveries.push({path,generation:h.state().generation});
    return fetchBeforeProbe(url,init);
   };
   patch({...alertItem,alertActive:true});
   for(let i=0;i<gap;i++)await Promise.resolve();
   held({},401);await saving;await load;await new Promise(resolve=>setImmediate(resolve));await settle();
   console.log('F3-R01 Node20 audit propagation',JSON.stringify({target,gap,recoveries,revisionBefore:revision,revisionAfter:h.auth.readAuthSessionRevision(),token:h.auth.readAuthToken(),state:h.state(),calls:h.calls}));
   assert.notEqual(recoveries[0]?.generation,1,'recovery must not begin for a now-obsolete snapshot');
   if(recoveries.length===0){assert.equal(h.auth.readAuthSessionRevision(),revision);assert.equal(h.auth.readAuthToken(),'initial');assert.equal(h.state().view,'personal');}
  }finally{patch?.(alertItem);held?.([]);history?.([]);if(saving)await saving;if(load)await load;await settle();h.restore();}
 });
}


// F3 lifecycle reconstruction: production handlers, auth clients and HTTP parsers;
// responses are released explicitly, never by elapsed-time scheduling.
for (const action of ["add", "update", "delete"]) {
  for (const transition of ["navigate-settings", "same-session-remount"]) {
    test(`F3-R03 reconstructed ${action} delayed 401 after ${transition}`, async () => {
      const h = await wishlistExplorerHarness();
      let reply, operation;
      try {
        await h.loaded();
        const path = action === "add" ? wishlistPath : action === "update" ? `${wishlistPath}/42/alert` : `${wishlistPath}/42`;
        reply = h.defer(path);
        const saved = { ...alertItem, id: action === "add" ? 99 : 42 };
        operation = action === "add" ? h.add(saved) : action === "update" ? h.update(alertItem, { alertActive: false }) : h.remove(alertItem);
        await settle();
        h.dispose();
        if (transition === "same-session-remount") {
          h.respond(wishlistPath, [alertItem]); h.respond(f3EventPath, []);
          h.remount(); await h.loaded();
        }
        const revision = h.auth.readAuthSessionRevision(), count = h.calls.length;
        h.respond(refreshPath, {}, 401);
        reply({}, 401); await operation; await settle();
        console.log("F3-R03 reconstructed", JSON.stringify({ action, transition,
          refreshes: f3Refreshes(h).length, revisionBefore: revision,
          revisionAfter: h.auth.readAuthSessionRevision(), token: h.auth.readAuthToken(),
          afterRetirement: h.calls.slice(count) }));
        assert.equal(f3Refreshes(h).length, 0, "retired mutation cannot initiate authentication refresh");
        assert.equal(h.auth.readAuthToken(), "initial");
        assert.equal((await h.auth.readCurrentUser()).id, 1);
        assert.equal(h.auth.readAuthSessionRevision(), revision);
        assert.equal(h.calls.length, count, "no mutation replay or history GET after retirement");
      } finally { reply?.({}, 401); if (operation) await operation; h.restore(); }
    });
  }
}

// Run complete hook/handler declarations so effect cleanup is production code.
async function wishlistConsumerHarness(h, name, initialProps = {}) {
  const source = await readFile(new URL(`../src/components/${name === "WishlistCard" ? "WishlistExplorer" : name}.tsx`, import.meta.url), "utf8");
  const ast = ts.createSourceFile("consumer.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = ast.statements.find(node => node.name?.text === name);
  const finalReturn = component.body.statements.at(-1);
  const returns = name === "WishlistCard"
    ? "return { loadPriceHistory, state: { priceHistory, priceHistoryState } };"
    : "return { handleSubmit, state: { message, isSubmitting } };";
  const code = component.getText(ast).replace(/^export default /, "").replace(finalReturn.getText(ast), returns);
  const helpers = ast.statements.filter(node => ts.isFunctionDeclaration(node) && !["WishlistExplorer", "WishlistCard", "AddWishlistItemForm"].includes(node.name?.text)).map(node => node.getText(ast)).join("\n");
  const output = ts.transpileModule(`${helpers}\n${code}`, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
  let cursor = 0, effects = [], props;
  const cells = [], writes = [], callbacks = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const hooks = {
    useState(initial) {
      const i = cursor++; cells[i] ??= { value: typeof initial === "function" ? initial() : initial };
      const cell = cells[i];
      return [cell.value, value => { cell.value = typeof value === "function" ? value(cell.value) : value; writes.push(i); }];
    },
    useRef(value) { const i = cursor++; cells[i] ??= { current: value }; return cells[i]; },
    useMemo(fn, deps) { const i = cursor++; if (!same(cells[i]?.deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (!same(cells[i]?.deps, deps)) effects.push(() => { cells[i]?.cleanup?.(); cells[i] = { deps, cleanup: fn() }; }); },
  };
  const mocks = { ...hooks, ...h.auth, ...h.wishlist, normalizeAuthError: h.authApi.normalizeAuthError,
    normalizeTargetPriceInput: value => value, PRICE_HISTORY_REQUEST_LIMIT: 15,
    FormData: class { constructor(form) { this.values = form.values; } get(key) { return this.values[key]; } },
  };
  const Component = new Function(...Object.keys(mocks), `${output}\nreturn ${name};`)(...Object.values(mocks));
  const render = (next = {}) => {
    props = { ...props, ...next }; cursor = 0;
    const result = Component(props); const pending = effects; effects = []; pending.forEach(fn => fn()); return result;
  };
  const defaults = {
    token: h.auth.readAuthToken(), authToken: h.auth.readAuthToken(), item: alertItem,
    onAdded: value => callbacks.push(["added", value]), onTokenChanged: value => callbacks.push(["token", value]),
    onAuthenticationRequired: () => { callbacks.push(["auth"]); h.auth.clearAuthToken(); },
  };
  render({ ...defaults, ...initialProps });
  return {
    render, writes, callbacks,
    dispose: () => cells.forEach(cell => cell.cleanup?.()),
    submit(item = alertItem, handler = render().handleSubmit) {
      return handler({ preventDefault() {}, currentTarget: { values: { ...item, alertActive: item.alertActive ? "on" : null }, reset() { callbacks.push(["reset"]); } } });
    },
    load: (handler = render().loadPriceHistory) => handler(),
  };
}

for (const name of ["AddWishlistItemForm", "WishlistCard"]) {
  for (const transition of ["retirement", "replacement-account", "same-token-new-session"]) {
    test(`F3-R03 retained ${name} callback rejects ${transition}`, async () => {
      const h = await sentinelChatHarness();
      const consumer = await wishlistConsumerHarness(h, name);
      try {
        const handler = name === "WishlistCard" ? consumer.render().loadPriceHistory : consumer.render().handleSubmit;
        if (transition === "retirement") consumer.dispose();
        else h.auth.startAuthSession(sentinelSession(2, transition === "same-token-new-session" ? "initial" : "account-b"));
        const before = h.calls.length, revision = h.auth.readAuthSessionRevision(), token = h.auth.readAuthToken();
        if (name === "WishlistCard") await consumer.load(handler); else await consumer.submit(alertItem, handler);
        assert.equal(h.calls.length, before, "a retained handler must not adopt current account credentials");
        assert.equal(h.auth.readAuthToken(), token);
        assert.equal(h.auth.readAuthSessionRevision(), revision);
        assert.deepEqual(consumer.callbacks, []);
      } finally { consumer.dispose(); h.restore(); }
    });
  }
  for (const status of [200, 401, 503]) {
    test(`F3-R03 ${name} delayed ${status} cannot apply after retirement`, async () => {
      const h = await sentinelChatHarness();
      const consumer = await wishlistConsumerHarness(h, name);
      let reply, pending;
      try {
        const path = name === "WishlistCard" ? `${wishlistPath}/42/price-history` : wishlistPath;
        reply = h.defer(path);
        pending = name === "WishlistCard" ? consumer.load() : consumer.submit();
        consumer.dispose(); const writes = consumer.writes.length, revision = h.auth.readAuthSessionRevision();
        h.respond(refreshPath, {}, 401);
        reply(name === "WishlistCard" ? [] : alertItem, status); await pending;
        assert.equal(f3Refreshes(h).length, 0);
        assert.equal(h.auth.readAuthToken(), "initial");
        assert.equal(h.auth.readAuthSessionRevision(), revision);
        assert.equal(consumer.writes.length, writes);
        assert.deepEqual(consumer.callbacks, []);
        assert.equal(h.calls.filter(c => c.path === path).length, 1);
      } finally { reply?.({}, 401); if (pending) await pending; consumer.dispose(); h.restore(); }
    });
  }
}

for (const supersession of ["item-replacement", "newer-request"]) {
  test(`F3-R03 price history ${supersession} retires stale 401 at recovery boundary`, async () => {
    const h = await sentinelChatHarness();
    const card = await wishlistConsumerHarness(h, "WishlistCard");
    try {
      const oldHandler = card.render().loadPriceHistory;
      const reply = h.defer(`${wishlistPath}/42/price-history`);
      const pending = card.load(oldHandler);
      if (supersession === "item-replacement") card.render({ item: { ...alertItem, title: "Replacement item" } });
      else {
        h.respond(`${wishlistPath}/42/price-history`, []);
        await card.load(oldHandler);
      }
      const state = structuredClone(card.render().state), revision = h.auth.readAuthSessionRevision();
      h.respond(refreshPath, {}, 401); reply({}, 401); await pending;
      assert.equal(f3Refreshes(h).length, 0);
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      assert.equal(h.auth.readAuthToken(), "initial");
      assert.deepEqual(card.render().state, state);
    } finally { card.dispose(); h.restore(); }
  });
}

test("F3-R03 final synchronous classification cannot recover a newly retired request", async () => {
  const h = await sentinelChatHarness();
  try {
    let current = true;
    const revision = h.auth.readAuthSessionRevision();
    h.respond(wishlistPath, {}, 401); h.respond(refreshPath, {}, 401);
    await assert.rejects(h.auth.withAuthSessionRetry("initial", h.wishlist.getMyWishlist,
      error => { current = false; return h.wishlist.normalizeUserWishlistError(error).status === 401; },
      { sessionRevision: revision, isCurrent: () => current }), h.auth.isAuthSessionInvalidatedError);
    assert.equal(f3Refreshes(h).length, 0);
    assert.equal(h.auth.readAuthSessionRevision(), revision);
    assert.equal((await h.auth.readCurrentUser()).id, 1);
  } finally { h.restore(); }
});

for (const outcome of ["rotation", "rejection", "transient", "replacement-account"]) {
  for (const participants of ["all-retired", "mixed", "unscoped"]) {
    test(`F3-R03 dispatched refresh ${outcome} with ${participants} participants`, async () => {
      const h = await sentinelChatHarness();
      try {
        const events = observeAuthNetwork();
        let current = true;
        const revision = h.auth.readAuthSessionRevision();
        const scope = { sessionRevision: revision, isCurrent: () => current };
        h.respond(wishlistPath, {}, 401);
        const reply = h.defer(refreshPath);
        const retired = h.wishlist.withWishlistAuthRetry("initial", h.wishlist.getMyWishlist, scope).catch(error => error);
        await waitForAuthDispatch(events, refreshPath);
        let survivor;
        if (participants !== "all-retired") {
          h.respond(wishlistPath, {}, 401);
          survivor = h.wishlist.withWishlistAuthRetry("initial", h.wishlist.getMyWishlist,
            participants === "unscoped" ? undefined : { sessionRevision: revision, isCurrent: () => true }).catch(error => error);
          await settle();
        }
        current = false;
        if (outcome === "replacement-account") h.auth.startAuthSession(sentinelSession(2, "account-b"));
        h.respond(wishlistPath, [alertItem]);
        if (outcome === "transient") reply({}, 503, "f3-transient");
        else if (outcome === "rejection") reply({}, 401);
        else reply(sentinelSession(1, "rotation"));
        const stale = await retired, active = survivor ? await survivor : null;
        assert.ok(h.auth.isAuthSessionInvalidatedError(stale), "retired participant never retries");
        assert.equal(f3Refreshes(h).length, 1, "recovery remains coalesced");
        const initialRequests = participants === "all-retired" ? 1 : 2;
        assert.equal(h.calls.filter(c => c.path === wishlistPath).length,
          initialRequests + (outcome === "rotation" && survivor ? 1 : 0));
        if (outcome === "rotation") {
          assert.equal(h.auth.readAuthToken(), "rotation", "reconcile successful server rotation even if every participant retired");
          assert.equal(h.auth.readAuthSessionRevision(), revision);
          assert.equal((await h.auth.readCurrentUser()).id, 1);
          if (survivor) assert.deepEqual(active.value, [alertItem]);
        } else if (outcome === "rejection") {
          assert.equal(h.auth.readAuthToken(), null, "definitively rejected credentials cannot survive consumer retirement");
          assert.equal(h.auth.readAuthSessionRevision(), revision + 1);
          if (survivor) assert.ok(h.auth.isAuthSessionInvalidatedError(active));
        } else if (outcome === "transient") {
          assert.equal(h.auth.readAuthToken(), "initial");
          assert.equal(h.auth.readAuthSessionRevision(), revision);
          if (survivor) assert.equal(h.authApi.normalizeAuthError(active).status, 503);
        } else {
          assert.equal(h.auth.readAuthToken(), "account-b");
          assert.equal(h.auth.readAuthSessionRevision(), revision + 1);
          assert.equal((await h.auth.readCurrentUser()).id, 2);
          if (survivor) assert.ok(h.auth.isAuthSessionInvalidatedError(active));
        }
      } finally { h.restore(); }
    });
  }
}

for (const name of ["AddWishlistItemForm", "WishlistCard"]) {
  for (const retire of [false, true]) {
    test(`F3-R03 ${name} ${retire ? "retired" : "mounted"} during successful refresh`, async () => {
      const h = await sentinelChatHarness();
      const consumer = await wishlistConsumerHarness(h, name);
      try {
        const events = observeAuthNetwork(), revision = h.auth.readAuthSessionRevision();
        const path = name === "WishlistCard" ? `${wishlistPath}/42/price-history` : wishlistPath;
        h.respond(path, {}, 401); const reply = h.defer(refreshPath);
        const pending = name === "WishlistCard" ? consumer.load() : consumer.submit();
        await waitForAuthDispatch(events, refreshPath);
        if (retire) consumer.dispose();
        const writes = consumer.writes.length;
        h.respond(path, name === "WishlistCard" ? [] : alertItem);
        reply(sentinelSession(1, "rotation")); await pending;
        assert.equal(f3Refreshes(h).length, 1);
        assert.equal(h.auth.readAuthToken(), "rotation");
        assert.equal(h.auth.readAuthSessionRevision(), revision);
        assert.equal(h.calls.filter(c => c.path === path).length, retire ? 1 : 2);
        if (retire) { assert.equal(consumer.writes.length, writes); assert.deepEqual(consumer.callbacks, []); }
        else assert.ok(consumer.callbacks.some(([type]) => type === "token"));
      } finally { consumer.dispose(); h.restore(); }
    });
  }
}

for (const action of ["update", "delete"]) {
  for (const transition of ["retirement", "replacement-account", "same-token-new-session"]) {
    test(`F3-R03 retained ${action} rejects ${transition} before dispatch`, async () => {
      const h = await wishlistExplorerHarness();
      try {
        await h.loaded();
        const parent = h.render();
        if (transition === "retirement") h.dispose();
        else {
          h.respond(wishlistPath, [alertItem]); h.respond(f3EventPath, []);
          h.auth.startAuthSession(sentinelSession(2, transition === "same-token-new-session" ? "initial" : "account-b"));
          await h.loaded();
        }
        const count = h.calls.length, revision = h.auth.readAuthSessionRevision(), token = h.auth.readAuthToken();
        await (action === "update" ? parent.handleAlertUpdate(alertItem, { alertActive: true }, "Saved") : parent.handleDelete(alertItem));
        assert.equal(h.calls.length, count);
        assert.equal(h.auth.readAuthToken(), token);
        assert.equal(h.auth.readAuthSessionRevision(), revision);
      } finally { h.restore(); }
    });
  }
  for (const retire of [false, true]) {
    for (const outcome of ["rotation", "rejection", "transient"]) {
      test(`F3-R03 ${action} ${retire ? "retired" : "mounted"} during dispatched ${outcome}`, async () => {
        const h = await wishlistExplorerHarness();
        try {
          await h.loaded();
          const events = observeAuthNetwork(), revision = h.auth.readAuthSessionRevision();
          const path = action === "update" ? `${wishlistPath}/42/alert` : `${wishlistPath}/42`;
          h.respond(path, {}, 401); const reply = h.defer(refreshPath);
          const pending = action === "update" ? h.update(alertItem, { alertActive: true }) : h.remove(alertItem);
          await waitForAuthDispatch(events, refreshPath);
          if (retire) h.dispose();
          const saved = { ...alertItem, alertActive: true };
          if (!retire) { h.respond(wishlistPath, [alertItem]); h.respond(f3EventPath, []); }
          h.respond(path, saved); h.respond(f3EventPath, []);
          const writes = h.changes.length;
          if (outcome === "rotation") reply(sentinelSession(1, "rotation"));
          else reply({}, outcome === "rejection" ? 401 : 503);
          await pending; await h.loaded(); await settle();
          assert.equal(f3Refreshes(h).length, 1);
          assert.equal(h.calls.filter(c => c.path === path).length, !retire && outcome === "rotation" ? 2 : 1);
          assert.equal(h.auth.readAuthToken(), outcome === "rotation" ? "rotation" : outcome === "rejection" ? null : "initial");
          assert.equal(h.auth.readAuthSessionRevision(), revision + (outcome === "rejection" ? 1 : 0));
          if (retire) assert.equal(h.changes.length, writes);
          else if (outcome === "rotation") {
            assert.deepEqual(h.state().personalItems, action === "delete" ? [] : [saved]);
            assert.equal(h.state().view, "personal");
          } else if (outcome === "transient") {
            const message = action === "update" ? h.state().itemMessages[42] : h.state().operationMessage;
            assert.equal(message.kind, "error");
          }
        } finally { h.restore(); }
      });
    }
  }
}

for (const name of ["AddWishlistItemForm", "WishlistCard"]) {
  test(`F3-R03 ${name} reuses same-session rotated token without a second refresh`, async () => {
    const h = await sentinelChatHarness();
    const consumer = await wishlistConsumerHarness(h, name);
    try {
      const path = name === "WishlistCard" ? `${wishlistPath}/42/price-history` : wishlistPath;
      const revision = h.auth.readAuthSessionRevision(), reply = h.defer(path);
      const pending = name === "WishlistCard" ? consumer.load() : consumer.submit();
      h.respond(refreshPath, sentinelSession(1, "rotation"));
      await h.auth.ensureAuthToken({ forceRefresh: true });
      h.respond(path, name === "WishlistCard" ? [] : alertItem);
      reply({}, 401); await pending;
      assert.equal(f3Refreshes(h).length, 1);
      assert.deepEqual(h.calls.filter(c => c.path === path).map(c => c.token), ["Bearer initial", "Bearer rotation"]);
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      assert.equal((await h.auth.readCurrentUser()).id, 1);
    } finally { consumer.dispose(); h.restore(); }
  });
  for (const status of [401, 503]) {
    test(`F3-R03 mounted ${name} preserves current recovery ${status} semantics`, async () => {
      const h = await sentinelChatHarness();
      const consumer = await wishlistConsumerHarness(h, name);
      try {
        const path = name === "WishlistCard" ? `${wishlistPath}/42/price-history` : wishlistPath;
        const revision = h.auth.readAuthSessionRevision();
        h.respond(path, {}, 401); h.respond(refreshPath, {}, status);
        await (name === "WishlistCard" ? consumer.load() : consumer.submit());
        assert.equal(f3Refreshes(h).length, 1);
        assert.equal(h.calls.filter(c => c.path === path).length, 1);
        assert.equal(h.auth.readAuthToken(), status === 401 ? null : "initial");
        assert.equal(h.auth.readAuthSessionRevision(), revision + (status === 401 ? 1 : 0));
        if (status === 503) assert.equal(consumer.render().state[name === "WishlistCard" ? "priceHistoryState" : "isSubmitting"], name === "WishlistCard" ? "unavailable" : false);
      } finally { consumer.dispose(); h.restore(); }
    });
  }
}

test("F3-R03 scoped operation is rejected before initial dispatch and recovery join", async () => {
  const h = await sentinelChatHarness();
  try {
    const scope = { sessionRevision: h.auth.readAuthSessionRevision(), isCurrent: () => false };
    await assert.rejects(h.wishlist.withWishlistAuthRetry("initial", h.wishlist.getMyWishlist, scope), h.auth.isAuthSessionInvalidatedError);
    await assert.rejects(h.auth.ensureAuthToken({ forceRefresh: true, operation: scope }), h.auth.isAuthSessionInvalidatedError);
    assert.deepEqual(h.calls, []);
    assert.equal((await h.auth.readCurrentUser()).id, 1);
  } finally { h.restore(); }
});


test("F3-R04 saved retired Wishlist preference load must not recover", async () => {
 const h = await notificationPreferencesHarness("WishlistExplorer");
 try {
  await h.loaded();
  const reply = h.defer(preferencePath);h.retry();const pending=h.loaded();
  h.dispose(); const revision=h.auth.readAuthSessionRevision();
  h.respond(refreshPath,{},401);reply({},401);await pending;
  console.log("PREFERENCE INVESTIGATION",JSON.stringify({refreshes:f3Refreshes(h).length,
    revisionBefore:revision,revisionAfter:h.auth.readAuthSessionRevision(),token:h.auth.readAuthToken(),calls:h.calls}));
  assert.equal(f3Refreshes(h).length,0,"retired preference load still triggers recovery: F3-R04 lifecycle correction");
 } finally {h.restore();}
});

for (const consumer of preferenceConsumers) {
  for (const completion of [200, 401, 503]) {
    for (const transition of ["unmount", "same-session-remount", "newer-effect"]) {
      test(`F3-R04 ${consumer} delayed ${completion} after ${transition} preserves current ownership`, async () => {
        const h = await notificationPreferencesHarness(consumer);
        let reply, pending;
        try {
          await h.loaded(); reply = h.defer(preferencePath); h.retry(); pending = h.loaded();
          if (transition === "unmount") h.dispose();
          else {
            h.respond(preferencePath, { ...persistedPreferences, freeGameEnabled: true });
            if (transition === "same-session-remount") h.remount(); else h.retry();
            await h.loaded();
          }
          const before = structuredClone(h.state()), revision = h.auth.readAuthSessionRevision(), writes = h.stateWrites.length;
          const count = h.calls.length;
          h.respond(refreshPath, {}, 401); reply(completion === 200 ? persistedPreferences : {}, completion); await pending;
          assert.equal(f3Refreshes(h).length, 0, "obsolete preference 401 cannot initiate recovery");
          assert.equal(h.calls.length, count, "no obsolete retry");
          assert.equal((await h.auth.readCurrentUser()).id, 1);
          assert.equal(h.auth.readAuthToken(), "initial");
          assert.equal(h.auth.readAuthSessionRevision(), revision);
          assert.equal(h.authRequired(), 0);
          assert.equal(h.stateWrites.length, writes, "obsolete completion cannot write loading/error/data state");
          assert.deepEqual(h.state(), before);
        } finally { reply?.(persistedPreferences); if (pending) await pending; h.restore(); }
      });
    }
  }
  for (const transition of ["retirement", "different-token", "identical-token-new-revision"]) {
    test(`F3-R04 retained ${consumer} load callback rejects ${transition} before dispatch`, async () => {
      const h = await notificationPreferencesHarness(consumer);
      try {
        const callback = h.loadCallbacks.at(-1);
        if (transition === "retirement") h.dispose();
        else {
          h.respond(preferencePath, { ...persistedPreferences, freeGameEnabled: true });
          h.auth.startAuthSession(sentinelSession(2, transition === "different-token" ? "account-b" : "initial"));
          await h.loaded();
        }
        const before = structuredClone(h.state()), count = h.calls.length, revision = h.auth.readAuthSessionRevision(), token = h.auth.readAuthToken();
        // A forbidden baseline dispatch still receives a valid HTTP response;
        // the regression fails on ownership assertions, not fixture exhaustion.
        h.respond(preferencePath, persistedPreferences);
        await callback();
        assert.equal(h.calls.length, count, "retained load must not adopt a replacement account");
        assert.equal(h.auth.readAuthSessionRevision(), revision);
        assert.equal(h.auth.readAuthToken(), token);
        assert.equal((await h.auth.readCurrentUser()).id, transition === "retirement" ? 1 : 2);
        assert.equal(h.authRequired(), 0);
        assert.deepEqual(h.state(), before);
      } finally { h.restore(); }
    });
  }
  test(`F3-R04 ${consumer} retirement at final authentication classification blocks recovery`, async () => {
    let h, armed = false, decisions = 0;
    h = await notificationPreferencesHarness(consumer, { beforeAuthRecoveryDecision() {
      if (!armed) return;
      armed = false; decisions++; h.dispose();
    } });
    try {
      const revision = h.auth.readAuthSessionRevision();
      h.respond(preferencePath, {}, 401); h.respond(refreshPath, {}, 401); armed = true;
      h.retry(); await h.loaded();
      assert.equal(decisions, 1);
      assert.equal(f3Refreshes(h).length, 0);
      assert.equal(h.auth.readAuthToken(), "initial");
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      assert.equal(h.authRequired(), 0);
    } finally { h.restore(); }
  });
  test(`F3-R04 ${consumer} successful save retires outstanding load before recovery`, async () => {
    const h = await notificationPreferencesHarness(consumer);
    let reply, pending;
    try {
      h.toggleEmail(true);
      reply = h.defer(preferencePath); h.retry(); pending = h.loaded();
      h.respond(preferencePath, { ...persistedPreferences, emailEnabled: true, freeGameEnabled: true });
      await h.save();
      const authoritative = structuredClone(h.state()), revision = h.auth.readAuthSessionRevision();
      h.respond(refreshPath, {}, 401); reply({}, 401); await pending;
      assert.equal(f3Refreshes(h).length, 0);
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      assert.equal(h.auth.readAuthToken(), "initial");
      assert.equal(h.authRequired(), 0);
      assert.deepEqual(h.state(), authoritative);
      assert.equal(h.state().message.kind, "success");
    } finally { reply?.(persistedPreferences); if (pending) await pending; h.restore(); }
  });
}

for (const outcome of ["rotation", "rejection", "transient", "replacement-account"]) {
  for (const participants of ["all-retired", "mixed-scoped", "unscoped-current"]) {
    test(`F3-R04 preference shared refresh ${outcome} with ${participants}`, async () => {
      const h = await sentinelChatHarness();
      try {
        const events = observeAuthNetwork(), revision = h.auth.readAuthSessionRevision();
        let current = true;
        h.respond(preferencePath, {}, 401); const reply = h.defer(refreshPath);
        const stale = h.preferences.withNotificationPreferenceAuthRetry("initial", h.preferences.getMyNotificationPreferences,
          { sessionRevision: revision, isCurrent: () => current }).catch(error => error);
        await waitForAuthDispatch(events, refreshPath);
        let survivor;
        if (participants !== "all-retired") {
          h.respond(preferencePath, {}, 401);
          survivor = h.preferences.withNotificationPreferenceAuthRetry("initial", h.preferences.getMyNotificationPreferences,
            participants === "unscoped-current" ? undefined : { sessionRevision: revision, isCurrent: () => true }).catch(error => error);
          await settle();
        }
        current = false;
        if (outcome === "replacement-account") h.auth.startAuthSession(sentinelSession(2, "account-b"));
        // Both possible baseline retries have real valid responses; failures must
        // come from security assertions, never an exhausted response fixture.
        h.respond(preferencePath, persistedPreferences); h.respond(preferencePath, persistedPreferences);
        reply(outcome === "rotation" || outcome === "replacement-account" ? sentinelSession(1, "rotation") : {},
          outcome === "rejection" ? 401 : outcome === "transient" ? 503 : 200);
        const retired = await stale, active = survivor ? await survivor : null;
        assert.ok(h.auth.isAuthSessionInvalidatedError(retired), "retired load cannot retry or surface a recovery completion");
        assert.equal(f3Refreshes(h).length, 1);
        assert.equal(h.calls.filter(c => c.path === preferencePath).length,
          (survivor ? 2 : 1) + (survivor && outcome === "rotation" ? 1 : 0));
        if (outcome === "rotation") {
          assert.equal(h.auth.readAuthToken(), "rotation");
          assert.equal(h.auth.readAuthSessionRevision(), revision);
          assert.equal((await h.auth.readCurrentUser()).id, 1);
          if (survivor) assert.deepEqual(active.value, persistedPreferences);
        } else if (outcome === "rejection") {
          assert.equal(h.auth.readAuthToken(), null);
          assert.equal(h.auth.readAuthSessionRevision(), revision + 1);
          if (survivor) assert.ok(h.auth.isAuthSessionInvalidatedError(active));
        } else if (outcome === "transient") {
          assert.equal(h.auth.readAuthToken(), "initial");
          assert.equal(h.auth.readAuthSessionRevision(), revision);
          assert.equal((await h.auth.readCurrentUser()).id, 1);
          if (survivor) assert.equal(h.authApi.normalizeAuthError(active).status, 503);
        } else {
          assert.equal(h.auth.readAuthToken(), "account-b");
          assert.equal(h.auth.readAuthSessionRevision(), revision + 1);
          assert.equal((await h.auth.readCurrentUser()).id, 2);
          if (survivor) assert.ok(h.auth.isAuthSessionInvalidatedError(active));
        }
      } finally { h.restore(); }
    });
  }
}

for (const consumer of preferenceConsumers) {
  for (const retire of [false, true]) {
    for (const outcome of ["rotation", "rejection", "transient"]) {
      test(`F3-R04 ${consumer} ${retire ? "retired" : "mounted"} during dispatched ${outcome}`, async () => {
        const h = await notificationPreferencesHarness(consumer);
        try {
          h.pauseAuthUpdates();
          const revision = h.auth.readAuthSessionRevision(), events = observeAuthNetwork();
          const count = h.calls.filter(c => c.path === preferencePath).length;
          h.respond(preferencePath, {}, 401); const reply = h.defer(refreshPath);
          h.retry(); const pending = h.loaded();
          await waitForAuthDispatch(events, refreshPath);
          if (retire) h.dispose();
          const before = structuredClone(h.state()), writes = h.stateWrites.length;
          const current = { ...persistedPreferences, freeGameEnabled: true };
          h.respond(preferencePath, current); h.respond(preferencePath, current);
          reply(outcome === "rotation" ? sentinelSession(1, "rotation") : {}, outcome === "rotation" ? 200 : outcome === "rejection" ? 401 : 503);
          await pending;
          assert.equal(f3Refreshes(h).length, 1);
          assert.equal(h.calls.filter(c => c.path === preferencePath).length - count, !retire && outcome === "rotation" ? 2 : 1);
          assert.equal(h.auth.readAuthToken(), outcome === "rotation" ? "rotation" : outcome === "rejection" ? null : "initial");
          assert.equal(h.auth.readAuthSessionRevision(), revision + (outcome === "rejection" ? 1 : 0));
          assert.equal(h.authRequired(), 0, "global terminal invalidation does not call a retired consumer callback");
          if (retire) {
            assert.equal(h.stateWrites.length, writes);
            assert.deepEqual(h.state(), before);
            assert.deepEqual(h.changedTokens, ["initial"]);
          } else if (outcome === "rotation") {
            assert.deepEqual(h.state().savedPreferences, current); await h.loaded();
            assert.deepEqual(h.state().draftPreferences, current);
            assert.equal(h.state().loadState, "ready");
          } else if (outcome === "transient") {
            assert.equal(h.state().loadState, "error");
            assert.equal(h.state().message.kind, "error");
          }
        } finally { h.restore(); }
      });
    }
  }
  test(`F3-R04 ${consumer} same-session rotation reuses current token without redundant recovery`, async () => {
    const h = await notificationPreferencesHarness(consumer);
    let reply, pending;
    try {
      h.pauseAuthUpdates(); const revision = h.auth.readAuthSessionRevision();
      reply = h.defer(preferencePath); h.retry(); pending = h.loaded();
      h.respond(refreshPath, sentinelSession(1, "rotation")); await h.auth.ensureAuthToken({ forceRefresh: true });
      h.respond(preferencePath, persistedPreferences); h.respond(preferencePath, persistedPreferences);
      reply({}, 401); await pending;
      assert.equal(f3Refreshes(h).length, 1);
      assert.deepEqual(h.calls.filter(c => c.path === preferencePath).map(c => c.token), ["Bearer initial", "Bearer initial", "Bearer rotation"]);
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      assert.equal((await h.auth.readCurrentUser()).id, 1);
      assert.deepEqual(h.state().savedPreferences, persistedPreferences); await h.loaded();
      assert.equal(h.authRequired(), 0);
    } finally { reply?.(persistedPreferences); if (pending) await pending; h.restore(); }
  });
  test(`F3-R04 ${consumer} current retry rejection still invokes authentication-required callback`, async () => {
    const h = await notificationPreferencesHarness(consumer);
    try {
      h.pauseAuthUpdates(); const revision = h.auth.readAuthSessionRevision();
      h.respond(preferencePath, {}, 401); h.respond(refreshPath, sentinelSession(1, "rotation")); h.respond(preferencePath, {}, 401);
      h.retry(); await h.loaded();
      assert.equal(f3Refreshes(h).length, 1);
      assert.equal(h.authRequired(), 1);
      assert.equal(h.auth.readAuthToken(), null);
      assert.equal(h.auth.readAuthSessionRevision(), revision + 1);
      assert.equal(h.calls.filter(c => c.path === preferencePath).length, 3);
    } finally { h.restore(); }
  });
  test(`F3-R04 ${consumer} same-effect newer request supersedes old rejection`, async () => {
    const h = await notificationPreferencesHarness(consumer);
    let reply, pending;
    try {
      const callback = h.loadCallbacks.at(-1);
      reply = h.defer(preferencePath); pending = callback();
      const current = { ...persistedPreferences, freeGameEnabled: true };
      h.respond(preferencePath, current); await callback();
      const before = structuredClone(h.state()), revision = h.auth.readAuthSessionRevision();
      h.respond(refreshPath, {}, 401); reply({}, 401); await pending;
      assert.equal(f3Refreshes(h).length, 0);
      assert.equal(h.auth.readAuthSessionRevision(), revision);
      assert.equal(h.auth.readAuthToken(), "initial");
      assert.deepEqual(h.state(), before);
      assert.equal(h.authRequired(), 0);
    } finally { reply?.(persistedPreferences); if (pending) await pending; h.restore(); }
  });
}

test("F3-R04 optional preference validity rejects before initial dispatch while unscoped calls remain supported", async () => {
  const h = await sentinelChatHarness();
  try {
    const revision = h.auth.readAuthSessionRevision();
    h.respond(preferencePath, persistedPreferences);
    await assert.rejects(h.preferences.withNotificationPreferenceAuthRetry("initial", h.preferences.getMyNotificationPreferences,
      { sessionRevision: revision, isCurrent: () => false }), h.auth.isAuthSessionInvalidatedError);
    assert.equal(h.calls.length, 0);
    const result = await h.preferences.withNotificationPreferenceAuthRetry("initial", h.preferences.getMyNotificationPreferences);
    assert.deepEqual(result.value, persistedPreferences);
    assert.equal(h.calls.length, 1);
    assert.equal(h.auth.readAuthSessionRevision(), revision);
  } finally { h.restore(); }
});

// Run the Deals component's production hooks, effects and handlers against the
// same real auth and HTTP modules used for the Sentinel lifecycle tests.
async function dealsLifecycleHarness(h) {
  const source = await readFile(new URL("../src/components/DealsExplorer.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("deals.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = ast.statements.find(node => node.name?.text === "DealsExplorer");
  const helpers = new Set(["protectedWishlistError", "normalizedWishlistValue", "findMatchingWishlistItem",
    "dealStateKey", "wishlistOperationKey", "wishlistPayloadFor"]);
  const program = [
    ...ast.statements.filter(node => helpers.has(node.name?.text)).map(node => node.getText(ast)),
    `function DealsExplorer({ deals }) {
      ${component.body.statements.slice(0, -1).map(node => node.getText(ast)).join("\n")
        .replace("void syncSavedWishlist();", "loads.push(syncSavedWishlist());")}
      return { saveDeal, toggleDealAlert, refresh: () => setWishlistSyncRevision(value => value + 1),
        state: { authToken, authChecked, savedWishlistItems, savingDeals, saveMessages, wishlistSyncWarning } };
    }`,
  ].join("\n");
  const compiled = ts.transpileModule(program, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let cursor = 0, effects = [], cells = [];
  const loads = [];
  const remember = (callback, deps, effect = false) => {
    const index = cursor++, existing = cells[index];
    if (existing?.deps.length === deps.length && deps.every((dep, i) => Object.is(dep, existing.deps[i]))) return existing.value;
    if (effect) effects.push(() => { existing?.cleanup?.(); cells[index] = { deps, cleanup: callback() }; });
    else cells[index] = { deps, value: callback() };
    return cells[index]?.value;
  };
  const mocks = {
    ...h.auth, ...h.wishlist, normalizeAuthError: h.authApi.normalizeAuthError, loads,
    window: Object.assign(window, { location: { hash: "" } }),
    useRef(value) { return cells[cursor++] ??= { current: value }; },
    useState(initial) {
      const cell = cells[cursor++] ??= { value: typeof initial === "function" ? initial() : initial };
      return [cell.value, value => { cell.value = typeof value === "function" ? value(cell.value) : value; }];
    },
    useEffect: (callback, deps) => remember(callback, deps, true),
    useCallback: (callback, deps) => remember(() => callback, deps),
    useMemo: remember,
  };
  const renderComponent = new Function(...Object.keys(mocks), `${compiled}\nreturn DealsExplorer;`)(...Object.values(mocks));
  const render = () => {
    cursor = 0;
    const result = renderComponent({ deals: [alertDeal] });
    const pending = effects;
    effects = [];
    pending.forEach(effect => effect());
    return result;
  };
  const dispose = () => { cells.forEach(cell => cell.cleanup?.()); cells = []; };
  return { render, dispose, loaded: () => loads.at(-1), mount() { render(); return render(); } };
}

test("F3-R05 retired Deals sync after navigation cannot refresh", async () => {
  const h = await sentinelChatHarness();
  const deals = await dealsLifecycleHarness(h);
  try {
    const reply = h.defer(wishlistPath);
    deals.mount();
    const pending = deals.loaded(), revision = h.auth.readAuthSessionRevision();
    assert.equal(h.calls.filter(c => c.path === wishlistPath).length, 1);
    deals.dispose();
    h.respond(refreshPath, {}, 401);
    reply({}, 401);
    await pending;
    assert.equal(f3Refreshes(h).length, 0);
    assert.equal(h.calls.filter(c => c.path === wishlistPath).length, 1);
    assert.equal(h.auth.readAuthSessionRevision(), revision);
    assert.equal((await h.auth.readCurrentUser()).id, 1);
  } finally { deals.dispose(); h.restore(); }
});

for (const action of ["save", "alert"]) {
  for (const schedule of ["retired-before-401", "retired-during-refresh", "current"]) {
    test(`F3-R05 Deals ${action} ${schedule} owns recovery and mutation replay`, async () => {
      const h = await sentinelChatHarness();
      const deals = await dealsLifecycleHarness(h);
      try {
        const events = observeAuthNetwork(), revision = h.auth.readAuthSessionRevision();
        h.respond(wishlistPath, action === "alert" ? [alertItem] : []);
        deals.mount(); await deals.loaded();
        const handles = deals.render(), path = action === "alert" ? `${wishlistPath}/42/alert` : wishlistPath;
        const reply = h.defer(path);
        const pending = action === "alert" ? handles.toggleDealAlert(alertDeal) : handles.saveDeal(alertDeal);
        await waitForAuthDispatch(events, path, action === "save" ? 2 : 1);
        const rotated = { ...alertItem, alertActive: true };
        const completeRefresh = h.defer(refreshPath);
        h.respond(path, rotated);
        if (schedule === "retired-before-401") {
          deals.dispose();
          completeRefresh(sentinelSession(1, "rotation"));
          reply({}, 401);
        } else {
          reply({}, 401);
          await waitForAuthDispatch(events, refreshPath);
          if (schedule === "retired-during-refresh") deals.dispose();
          completeRefresh(sentinelSession(1, "rotation"));
        }
        await pending;
        const mutations = h.calls.filter(c => c.path === path && c.method !== "GET");
        assert.deepEqual(mutations.map(c => c.token), schedule === "current"
          ? ["Bearer initial", "Bearer rotation"] : ["Bearer initial"]);
        assert.equal(f3Refreshes(h).length, schedule === "retired-before-401" ? 0 : 1);
        assert.equal(h.auth.readAuthSessionRevision(), revision);
        assert.equal((await h.auth.readCurrentUser()).id, 1);
        if (schedule === "current") {
          h.respond(wishlistPath, [rotated]);
          const { state } = deals.render(); await deals.loaded();
          assert.deepEqual(state.savedWishlistItems, [rotated]);
          assert.equal(Object.values(state.saveMessages)[0].tone, "success");
        }
      } finally { deals.dispose(); h.restore(); }
    });
  }
}

test("F3-R05 a retired compound alert operation cannot patch after its successful POST", async () => {
  const h = await sentinelChatHarness();
  const deals = await dealsLifecycleHarness(h);
  try {
    h.respond(wishlistPath, []); deals.mount(); await deals.loaded();
    const create = h.defer(wishlistPath);
    const pending = deals.render().toggleDealAlert(alertDeal);
    await settle();
    deals.dispose();
    h.respond(`${wishlistPath}/42/alert`, { ...alertItem, alertActive: true });
    create({ ...alertItem, alertActive: false }); await pending;
    assert.deepEqual(h.calls.map(c => c.method), ["GET", "POST"]);
    assert.equal(f3Refreshes(h).length, 0);
  } finally { deals.dispose(); h.restore(); }
});

for (const transition of ["superseded-effect", "same-session-remount", "replacement", "equal-token-replacement"]) {
  test(`F3-R05 Deals ${transition} preserves current account and wishlist state`, async () => {
    const h = await sentinelChatHarness();
    const deals = await dealsLifecycleHarness(h);
    try {
      const old = h.defer(wishlistPath);
      deals.mount();
      const pending = deals.loaded(), handles = deals.render(), revision = h.auth.readAuthSessionRevision();
      const replacement = transition.includes("replacement");
      const latest = { ...alertItem, title: "Current wishlist item" };
      h.respond(wishlistPath, [latest]);
      if (transition === "same-session-remount") { deals.dispose(); deals.mount(); }
      else if (replacement) {
        h.auth.startAuthSession(sentinelSession(2, transition === "replacement" ? "account-b" : "initial"));
        // Equal-token replacement may not trigger the starting implementation's GET.
        deals.render();
      } else { handles.refresh(); deals.render(); }
      const newer = deals.loaded();
      if (newer !== pending) await newer;
      h.respond(refreshPath, {}, 401);
      old({}, 401); await pending;
      h.respond(wishlistPath, alertItem);
      if (replacement || transition === "same-session-remount") await handles.saveDeal(alertDeal);
      assert.equal(f3Refreshes(h).length, 0);
      assert.equal(h.calls.filter(c => c.method === "POST").length, 0);
      assert.equal(h.auth.readAuthSessionRevision(), revision + Number(replacement));
      assert.equal((await h.auth.readCurrentUser()).id, replacement ? 2 : 1);
      assert.deepEqual(deals.render().state.savedWishlistItems, [latest]);
    } finally { deals.dispose(); h.restore(); }
  });
}

test("F3-R06 retired Sentinel 401 cannot start refresh", async () => {
  const h = await sentinelChatHarness();
  try {
    const reply = h.defer(insightPath), pending = h.submit("Retired fixture prompt");
    const revision = h.auth.readAuthSessionRevision();
    h.dispose(); h.respond(refreshPath, {}, 401);
    reply({}, 401); await pending;
    assert.equal(f3Refreshes(h).length, 0);
    assert.equal(h.calls.filter(c => c.path === insightPath).length, 1);
    assert.equal(h.auth.readAuthSessionRevision(), revision);
    assert.equal((await h.auth.readCurrentUser()).id, 1);
    assert.equal(h.answer(), undefined);
  } finally { h.restore(); }
});

test("F3-R06 superseded Sentinel 401 leaves the current answer and session intact", async () => {
  const h = await sentinelChatHarness();
  try {
    const submit = h.prepareSubmit("Fixture prompt");
    const reply = h.defer(insightPath), pending = submit();
    h.respond(insightPath, sentinelAnswer("Current answer")); await submit();
    const revision = h.auth.readAuthSessionRevision();
    h.respond(refreshPath, {}, 401); reply({}, 401); await pending;
    assert.equal(f3Refreshes(h).length, 0);
    assert.deepEqual(h.answer(), sentinelAnswer("Current answer"));
    assert.equal(h.auth.readAuthSessionRevision(), revision);
  } finally { h.restore(); }
});

for (const token of ["initial", "account-b"]) {
  test(`F3-R06 retained Sentinel prompt cannot adopt replacement session with token ${token}`, async () => {
    const h = await sentinelChatHarness();
    try {
      const old = h.prepareSubmit("Account A fixture prompt");
      h.auth.startAuthSession(sentinelSession(2, token));
      h.respond(insightPath, sentinelAnswer("Old prompt sent"));
      await old();
      assert.equal(h.calls.length, 0);
      assert.equal((await h.auth.readCurrentUser()).id, 2);
      assert.equal(h.answer(), undefined);
      assert.equal(h.input().value, "");
    } finally { h.restore(); }
  });
}

for (const status of [200, 401, 503]) {
  test(`F3-R06 retiring during dispatched refresh preserves shared HTTP ${status} outcome`, async () => {
    const h = await sentinelChatHarness();
    try {
      const events = observeAuthNetwork(), revision = h.auth.readAuthSessionRevision();
      h.respond(insightPath, {}, 401); const reply = h.defer(refreshPath);
      const pending = h.submit("Fixture prompt");
      await waitForAuthDispatch(events, refreshPath);
      h.dispose(); h.respond(insightPath, sentinelAnswer());
      reply(status === 200 ? sentinelSession(1, "rotation") : {}, status);
      await pending;
      assert.equal(f3Refreshes(h).length, 1);
      assert.equal(h.calls.filter(c => c.path === insightPath).length, 1);
      assert.equal(h.auth.readAuthSessionRevision(), revision + Number(status === 401));
      assert.equal(h.auth.readAuthToken(), status === 401 ? null : status === 200 ? "rotation" : "initial");
      assert.equal(h.answer(), undefined);
    } finally { h.restore(); }
  });
}

test("F3-R05/R06 retired Deals and current Sentinel can share one legitimate refresh", async () => {
  const h = await sentinelChatHarness();
  const deals = await dealsLifecycleHarness(h);
  try {
    const events = observeAuthNetwork(), revision = h.auth.readAuthSessionRevision();
    h.respond(wishlistPath, [], 401); const reply = h.defer(refreshPath);
    deals.mount(); const loading = deals.loaded();
    await waitForAuthDispatch(events, refreshPath);
    h.respond(insightPath, {}, 401);
    const pending = h.submit("Current fixture prompt");
    await settle(); deals.dispose();
    h.respond(wishlistPath, []);
    h.respond(insightPath, sentinelAnswer("Recovered answer"));
    reply(sentinelSession(1, "rotation"));
    await Promise.all([loading, pending]);
    assert.equal(f3Refreshes(h).length, 1);
    assert.equal(h.calls.filter(c => c.path === wishlistPath).length, 1);
    assert.deepEqual(h.calls.filter(c => c.path === insightPath).map(c => c.token), ["Bearer initial", "Bearer rotation"]);
    assert.equal(h.auth.readAuthSessionRevision(), revision);
    assert.equal((await h.auth.readCurrentUser()).id, 1);
    assert.deepEqual(h.answer(), sentinelAnswer("Recovered answer"));
  } finally { deals.dispose(); h.restore(); }
});

for (const key of ["ArrowRight", "ArrowLeft"]) {
  test(`F4-C01 Discovery ${key} moves focus with roving selection repeatedly`, async () => {
    const h = await discoveryWindowHarness(giveawayDiscoveryScene(null), "deals");
    let focused = "deals";
    for (const name of ["Deals", "Giveaways"]) {
      const tab = h.find(node => node.props?.role === "tab" && node.props.children === name);
      tab.props.ref?.({ focus() { focused = name.toLowerCase(); } });
    }
    for (let i = 0; i < 4; i++) {
      const selected = h.find(node => node.props?.role === "tab" && node.props["aria-selected"]);
      let prevented = false;
      selected.props.onKeyDown({ key, preventDefault() { prevented = true; } });
      const next = h.find(node => node.props?.role === "tab" && node.props["aria-selected"]);
      assert.equal(prevented, true);
      assert.equal(next.props.id, "discovery-tab-" + focused);
      assert.equal(next.props.tabIndex, 0);
      assert.equal(h.find(node => node.props?.role === "tab" && !node.props["aria-selected"]).props.tabIndex, -1);
    }
  });
}

test("F4-C01 Discovery mouse selection retains panel ownership", async () => {
  const h = await discoveryWindowHarness(giveawayDiscoveryScene(null), "deals");
  h.find(node => node.props?.role === "tab" && node.props.children === "Giveaways").props.onClick();
  assert.equal(h.find(node => node.props?.role === "tab" && node.props["aria-selected"]).props.id, "discovery-tab-giveaways");
  assert.match(h.html(), /aria-labelledby="discovery-tab-giveaways"/);
});

test("F4-C01 compact menu scopes Escape and preserves outside dismissal", async () => {
  const source = await readFile(new URL("../src/components/CinematicTopNav.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("nav.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = ast.statements.find(node => node.name?.text === "CinematicTopNav");
  const effect = component.body.statements.find(node => ts.isExpressionStatement(node) && node.getText(ast).includes('document.addEventListener("keydown"'));
  const output = ts.transpileModule(effect.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const listeners = new Map(), states = [];
  const link = {}, background = {}, toggle = { focus() { document.activeElement = toggle; } };
  const document = { activeElement: link, addEventListener: (type, handler) => listeners.set(type, handler), removeEventListener: type => listeners.delete(type) };
  let cleanup;
  const mocks = {
    useEffect: fn => { cleanup = fn(); }, menuOpen: true, document,
    setMenuOpen: value => states.push(value),
    menuToggleRef: { current: toggle }, menuPanelRef: { current: { contains: node => node === link } },
    navRef: { current: { contains: node => node === link || node === toggle } },
  };
  new Function(...Object.keys(mocks), output)(...Object.values(mocks));
  listeners.get("keydown")({ key: "Escape" });
  assert.deepEqual(states, [false]);
  assert.equal(document.activeElement, toggle);
  document.activeElement = background;
  listeners.get("keydown")({ key: "Escape" });
  assert.deepEqual(states, [false]);
  assert.equal(document.activeElement, background);
  listeners.get("pointerdown")({ target: background });
  assert.deepEqual(states, [false, false]);
  cleanup();
  assert.equal(listeners.size, 0);
});

test("F4-C02B invalid target price focuses its field only while the submit handler owns the session", async () => {
  const h = await sentinelChatHarness();
  const form = await wishlistConsumerHarness(h, "AddWishlistItemForm");
  let focusCount = 0;
  const event = {
    preventDefault() {},
    currentTarget: {
      values: { ...alertItem, targetPrice: "" },
      querySelector(selector) {
        assert.equal(selector, "#wl-add-target-price");
        return { focus() { focusCount++; } };
      },
    },
  };
  try {
    const submit = form.render().handleSubmit;
    await submit(event);
    assert.equal(focusCount, 1);
    assert.equal(form.render().state.message.invalidField, "targetPrice");
    h.auth.startAuthSession(sentinelSession(2, "replacement"));
    await submit(event);
    form.dispose();
    await submit(event);
    assert.equal(focusCount, 1);
    assert.equal(h.calls.length, 0);
  } finally { form.dispose(); h.restore(); }
});

test("F4-C02B Sentinel exposes named groups with their response text", async () => {
  const h = await sentinelChatHarness();
  try {
    h.respond(insightPath, sentinelAnswer("Fixture answer", { recommendations: ["Fixture pick"], nextActions: ["Fixture action"] }));
    await h.submit("Fixture prompt");
    const answer = h.answer();
    assert.deepEqual(answer.recommendations, ["Fixture pick"]);
    assert.deepEqual(answer.nextActions, ["Fixture action"]);
    const file = await readFile(new URL("../src/components/SentinelChat.tsx", import.meta.url), "utf8");
    assert.match(file, /role="group" aria-label="Top recommendations"/);
    assert.match(file, /role="group" aria-label="Suggested next actions"/);
  } finally { h.restore(); }
});

test("F6 frontend covers live deals, live giveaways, wishlist refresh, Sentinel fallback reasons, and functional settings", async () => {
  const dealsExplorer = await readFile(new URL("../src/components/DealsExplorer.tsx", import.meta.url), "utf8");
  const giveawaysExplorer = await readFile(new URL("../src/components/GiveawaysExplorer.tsx", import.meta.url), "utf8");
  const wishlistExplorer = await readFile(new URL("../src/components/WishlistExplorer.tsx", import.meta.url), "utf8");
  const userWishlist = await readFile(new URL("../src/lib/user-wishlist.ts", import.meta.url), "utf8");
  const userSentinel = await readFile(new URL("../src/lib/user-sentinel.ts", import.meta.url), "utf8");
  const settingsCenter = await readFile(new URL("../src/components/SettingsCenter.tsx", import.meta.url), "utf8");
  const devicePrefsSource = await readFile(new URL("../src/lib/device-preferences.ts", import.meta.url), "utf8");
  const authClient = await readFile(new URL("../src/lib/auth.ts", import.meta.url), "utf8");

  assert.match(dealsExplorer, /getLiveDeals/);
  assert.match(dealsExplorer, /DealDetailModal/);
  assert.match(dealsExplorer, /DealArtwork/);
  assert.match(dealsExplorer, /availableStores/);

  assert.match(giveawaysExplorer, /getLiveGiveaways/);
  assert.match(giveawaysExplorer, /GamerPower\.com/);
  assert.match(giveawaysExplorer, /Open Giveaway/);

  assert.match(userWishlist, /refreshMyWishlistPrices/);
  assert.match(userWishlist, /\/api\/me\/wishlist\/refresh/);
  assert.match(wishlistExplorer, /Check live prices/);
  assert.match(wishlistExplorer, /Check next batch/);
  assert.match(wishlistExplorer, /hasMixedCurrencies/);
  assert.match(wishlistExplorer, /Target configured/);
  assert.match(wishlistExplorer, /Not sent \(persisted alert event only\)/);

  assert.match(userSentinel, /gemini_auth_failed/);
  assert.match(userSentinel, /gemini_model_unavailable/);
  assert.match(userSentinel, /gemini_rate_limited/);

  assert.match(authClient, /PATCH/);
  assert.match(authClient, /updateDisplayName/);
  assert.match(devicePrefsSource, /nexora\.ui\.compact-mode/);
  assert.match(devicePrefsSource, /nexora\.ui\.glass-effects/);
  assert.match(settingsCenter, /device-preferences/);
  assert.match(settingsCenter, /Edit Display Name/);
  assert.doesNotMatch(settingsCenter, /demo build/);
});

test("R03: auth-client cache update and SettingsCenter handleDisplayNameSubmit enforce session revision, identity, and component ownership", async () => {
  const h = await sentinelChatHarness();
  try {
    const startUser = { id: 101, email: "a@example.com", username: "usera", displayName: "User A", createdAt: "2026-01-01T00:00:00Z" };
    h.auth.startAuthSession({ token: "tok-a", tokenType: "Bearer", expiresIn: 900, user: startUser });
    const startRev = h.auth.readAuthSessionRevision();

    // Stale revision or cross-account user ID must be rejected without mutating cache.
    assert.equal(h.auth.updateSignedInUserCache({ ...startUser, displayName: "Stale" }, startRev - 1), false);
    assert.equal(h.auth.updateSignedInUserCache({ ...startUser, id: 999, displayName: "Other Account" }, startRev), false);
    assert.equal((await h.auth.readCurrentUser())?.displayName, "User A");

    // Extract real handleDisplayNameSubmit from SettingsCenter.tsx
    const settingsSource = await readFile(new URL("../src/components/SettingsCenter.tsx", import.meta.url), "utf8");
    const ast = ts.createSourceFile("SettingsCenter.tsx", settingsSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const component = ast.statements.find((node) => node.name?.text === "SettingsCenter");
    let submitDecl;
    ts.forEachChild(component, function visit(node) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === "handleDisplayNameSubmit") submitDecl = node;
      else ts.forEachChild(node, visit);
    });
    assert.ok(submitDecl);
    const compiled = ts.transpileModule(submitDecl.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

    const createRunner = (sessionRev, deferredUpdate) => {
      const state = {
        authToken: "tok-a",
        signedInUser: startUser,
        displayNameDraft: "Updated A",
        displayNameSaving: false,
        editingDisplayName: true,
        profileMessage: null,
        authState: { status: "authenticated", user: startUser },
      };
      const lifetimeRef = { current: { active: true } };
      const opOwnerRef = { current: null };
      const mocks = {
        ...h.auth,
        normalizeAuthError: h.authApi.normalizeAuthError,
        consumerLifetimeRef: lifetimeRef,
        consumerSessionRevision: sessionRev,
        displayNameOpOwner: opOwnerRef,
        authToken: state.authToken,
        signedInUser: state.signedInUser,
        displayNameDraft: state.displayNameDraft,
        get displayNameSaving() { return state.displayNameSaving; },
        updateDisplayName: () => deferredUpdate.promise,
        setAuthToken: (v) => { state.authToken = v; },
        setAuthState: (v) => { state.authState = v; },
        setEditingDisplayName: (v) => { state.editingDisplayName = v; },
        setDisplayNameSaving: (v) => { state.displayNameSaving = v; },
        setProfileMessage: (v) => { state.profileMessage = v; },
      };
      const fn = new Function(...Object.keys(mocks), `${compiled}\nreturn { handleDisplayNameSubmit };`);
      const { handleDisplayNameSubmit } = fn(...Object.values(mocks));
      return { state, lifetimeRef, handleDisplayNameSubmit };
    };

    // Case 1: Logout / account switch during flight must NOT write old user's profile message or cache.
    const deferredSwitch = {};
    deferredSwitch.promise = new Promise((resolve) => { deferredSwitch.resolve = resolve; });
    const runner1 = createRunner(startRev, deferredSwitch);
    const pending1 = runner1.handleDisplayNameSubmit({ preventDefault() {} });
    h.auth.startAuthSession({ token: "tok-b", tokenType: "Bearer", expiresIn: 900, user: { ...startUser, id: 202, username: "userb", displayName: "User B" } });
    deferredSwitch.resolve({ ...startUser, displayName: "Late User A" });
    await pending1;
    assert.equal((await h.auth.readCurrentUser())?.id, 202);
    assert.equal((await h.auth.readCurrentUser())?.displayName, "User B");
    assert.equal(runner1.state.profileMessage, null);
    assert.equal(runner1.state.authState.user.id, 101);

    // Case 2: Unmount during flight blocks completion state updates.
    const revB = h.auth.readAuthSessionRevision();
    const deferredUnmount = {};
    deferredUnmount.promise = new Promise((resolve) => { deferredUnmount.resolve = resolve; });
    const runner2 = createRunner(revB, deferredUnmount);
    runner2.lifetimeRef.current.active = true;
    const pending2 = runner2.handleDisplayNameSubmit({ preventDefault() {} });
    runner2.lifetimeRef.current.active = false;
    deferredUnmount.resolve({ id: 202, email: "a@example.com", username: "userb", displayName: "After Unmount", createdAt: "2026-01-01T00:00:00Z" });
    await pending2;
    assert.equal(runner2.state.profileMessage, null);
  } finally {
    h.restore();
  }
});

test("R03: WishlistExplorer handleRefreshPrices guards against concurrent mutations, session changes, and supports cursor continuation", async () => {
  const h = await sentinelChatHarness();
  try {
    const startRev = h.auth.readAuthSessionRevision();
    const wishlistSource = await readFile(new URL("../src/components/WishlistExplorer.tsx", import.meta.url), "utf8");
    const ast = ts.createSourceFile("WishlistExplorer.tsx", wishlistSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const component = ast.statements.find((node) => node.name?.text === "WishlistExplorer");
    let refreshDecl;
    ts.forEachChild(component, function visit(node) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === "handleRefreshPrices") refreshDecl = node;
      else ts.forEachChild(node, visit);
    });
    assert.ok(refreshDecl);
    const compiled = ts.transpileModule(refreshDecl.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

    const runScenario = (nextRefreshImpl) => {
      const state = {
        authToken: "tok-1",
        view: "personal",
        isRefreshingPrices: false,
        refreshNextCursor: null,
        personalItems: [{ id: 1, title: "Initial" }],
        alerts: {},
        personalWishlistRevision: 0,
        alertEvents: [],
        alertEventsMessage: null,
        operationMessage: null,
      };
      const lifetimeRef = { current: { active: true } };
      const refreshOwnerRef = { current: null };
      const dataGenRef = { current: 0 };
      const alertVerRef = { current: 0 };
      const mocks = {
        ...h.auth,
        ...h.wishlist,
        consumerLifetimeRef: lifetimeRef,
        consumerSessionRevision: h.auth.readAuthSessionRevision(),
        refreshOwnerRef,
        wishlistDataGeneration: dataGenRef,
        alertEventsRequestVersion: alertVerRef,
        authToken: state.authToken,
        view: state.view,
        get isRefreshingPrices() { return state.isRefreshingPrices; },
        get refreshNextCursor() { return state.refreshNextCursor; },
        withWishlistAuthRetry: h.wishlist.withWishlistAuthRetry,
        refreshMyWishlistPrices: nextRefreshImpl,
        getMyWishlistAlertEvents: () => Promise.resolve([]),
        protectedWishlistError: h.wishlist.normalizeUserWishlistError,
        isAuthSessionInvalidatedError: h.auth.isAuthSessionInvalidatedError,
        alertsFor: (items) => Object.fromEntries(items.map((it) => [it.id, Boolean(it.alertActive)])),
        handleAuthenticationRequired: () => {},
        setIsRefreshingPrices: (v) => { state.isRefreshingPrices = v; },
        setOperationMessage: (v) => { state.operationMessage = v; },
        setAuthToken: (v) => { state.authToken = v; },
        setPersonalItems: (v) => { state.personalItems = v; },
        setAlerts: (v) => { state.alerts = v; },
        setPersonalWishlistRevision: (fn) => { state.personalWishlistRevision = fn(state.personalWishlistRevision); },
        setRefreshNextCursor: (v) => { state.refreshNextCursor = v; },
        setView: (v) => { state.view = v; },
        setAlertEvents: (v) => { state.alertEvents = v; },
        setAlertEventsMessage: (v) => { state.alertEventsMessage = v; },
      };
      const renderHandler = () => {
        const snapshot = {
          ...mocks,
          authToken: state.authToken,
          view: state.view,
          isRefreshingPrices: state.isRefreshingPrices,
          refreshNextCursor: state.refreshNextCursor,
        };
        return new Function(...Object.keys(snapshot), `${compiled}\nreturn { handleRefreshPrices };`)(...Object.values(snapshot)).handleRefreshPrices;
      };
      return { state, dataGenRef, lifetimeRef, handleRefreshPrices: (...args) => renderHandler()(...args) };
    };

    // Case 1: Concurrent delete bumps wishlistDataGeneration -> delayed refresh MUST NOT overwrite newer items.
    const deferredMutate = {};
    deferredMutate.promise = new Promise((resolve) => { deferredMutate.resolve = resolve; });
    const s1 = runScenario(() => deferredMutate.promise);
    const p1 = s1.handleRefreshPrices();
    s1.dataGenRef.current += 1;
    s1.state.personalItems = []; // e.g., user deleted item while refresh was in-flight
    deferredMutate.resolve({
      scannedItems: 1, matchedItems: 1, updatedItems: 1, observationsRecorded: 1,
      targetReachedEventsCreated: 0, unavailableItems: 0, hasMore: false, nextCursor: null,
      provider: "cheapshark", currency: "USD", refreshedAtUtc: "2026-11-26T00:00:00Z",
      items: [{ ...alertItem, id: 1, title: "Deleted Game Should Not Come Back" }],
    });
    await p1;
    assert.deepEqual(s1.state.personalItems, []);
    assert.equal(s1.state.operationMessage, null);

    // Case 2: Paginated continuation sets refreshNextCursor and passes cursor on second pass.
    const seenCursors = [];
    const s2 = runScenario((_tok, cursor) => {
      seenCursors.push(cursor ?? null);
      if (!cursor) {
        return Promise.resolve({
          scannedItems: 10, matchedItems: 10, updatedItems: 1, observationsRecorded: 1,
          targetReachedEventsCreated: 0, unavailableItems: 0, hasMore: true, nextCursor: 10,
          provider: "cheapshark", currency: "USD", refreshedAtUtc: "2026-11-26T00:00:00Z", items: [alertItem],
        });
      }
      return Promise.resolve({
        scannedItems: 1, matchedItems: 1, updatedItems: 1, observationsRecorded: 1,
        targetReachedEventsCreated: 0, unavailableItems: 0, hasMore: false, nextCursor: null,
        provider: "cheapshark", currency: "USD", refreshedAtUtc: "2026-11-26T00:00:00Z", items: [alertItem],
      });
    });
    await s2.handleRefreshPrices();
    assert.equal(s2.state.refreshNextCursor, 10);
    await s2.handleRefreshPrices();
    assert.equal(s2.state.refreshNextCursor, null);
    assert.deepEqual(seenCursors, [null, 10]);
    assert.equal(h.auth.readAuthSessionRevision(), startRev);
  } finally {
    h.restore();
  }
});

test("R04: device-preferences persists and restores attributes across reloads, preserves unset homepage defaults, and reports storage failure honestly", async () => {
  const origWindow = globalThis.window;
  const origDocument = globalThis.document;
  try {
    const store = new Map();
    const dataset = {};
    let throwOnWrite = false;
    const target = new EventTarget();
    target.localStorage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => {
        if (throwOnWrite) throw new Error("QuotaExceededError");
        store.set(key, value);
      },
      removeItem: (key) => store.delete(key),
    };
    globalThis.window = target;
    globalThis.document = { documentElement: { dataset } };

    const devicePrefsUrl = await moduleUrl("../src/lib/device-preferences.ts");
    const prefs = await import(devicePrefsUrl);
    prefs.resetDevicePreferencesCacheForTests();

    // Unset preferences must NOT alter documentElement.dataset (homepage defaults intact).
    prefs.applyDevicePreferenceAttributes(prefs.readStoredDevicePreferencesSnapshot());
    assert.equal(dataset.nxCompact, undefined);
    assert.equal(dataset.nxGlass, undefined);

    // Enable compact-mode and reduce glass-effects -> persisted in localStorage & dataset updated.
    const compactRes = prefs.setDevicePreferenceFlag("compact-mode", true);
    const glassRes = prefs.setDevicePreferenceFlag("glass-effects", false);
    assert.equal(compactRes.persisted, true);
    assert.equal(glassRes.persisted, true);
    assert.equal(dataset.nxCompact, "true");
    assert.equal(dataset.nxGlass, "reduced");

    // Simulate hard reload / navigation to another route: reset in-memory cache & delete dataset.
    delete dataset.nxCompact;
    delete dataset.nxGlass;
    prefs.resetDevicePreferencesCacheForTests();
    const restored = prefs.readStoredDevicePreferencesSnapshot();
    prefs.applyDevicePreferenceAttributes(restored);
    assert.equal(restored.compactMode, true);
    assert.equal(restored.glassEffects, false);
    assert.equal(dataset.nxCompact, "true");
    assert.equal(dataset.nxGlass, "reduced");

    // Revert to defaults removes attributes cleanly.
    prefs.setDevicePreferenceFlag("compact-mode", false);
    prefs.setDevicePreferenceFlag("glass-effects", true);
    assert.equal(dataset.nxCompact, undefined);
    assert.equal(dataset.nxGlass, undefined);

    // When localStorage fails on write, persisted=false is returned instead of claiming browser persistence.
    throwOnWrite = true;
    const failedWrite = prefs.setDevicePreferenceFlag("compact-mode", true);
    assert.equal(failedWrite.persisted, false);
    assert.equal(dataset.nxCompact, "true");
  } finally {
    globalThis.window = origWindow;
    globalThis.document = origDocument;
  }
});
