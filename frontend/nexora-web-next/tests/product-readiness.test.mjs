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
  const sharedNames = ["AuthSessionInvalidatedError", "isAuthSessionInvalidatedError", "assertAuthSessionRevision", "withAuthSessionRetry"];
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
    auth, authApi: await import(authUrl), wishlist, preferences, calls, storageCalls, storageValues, render,
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
    updatingIds: new Set(), deletingIds: new Set(),
    draftPreferences: persistedPreferences, hasChanges: true, isSaving: false,
    onAdded: item => state.added.push(item),
    onTokenChanged: token => state.changedTokens.push(token),
    onAuthenticationRequired: () => { state.authRequired++; h.auth.clearAuthToken(); },
    handleAuthenticationRequired: () => { state.authRequired++; h.auth.clearAuthToken(); },
    refreshAlertEvents: () => {},
    active: true, item: alertItem, priceHistoryState: "idle", PRICE_HISTORY_REQUEST_LIMIT: 12,
    alertEventsRequestVersion: { current: 0 },
    preferenceDataGeneration: { current: 0 },
    preferenceMutationListeners: new Set(),
    pendingPreferenceSaves: new Set(),
    preferenceSaveListeners: new Set(),
    useCallback: callback => callback, displayedDealScope: "curated",
    savingDealKeys: { current: new Set() }, savedWishlistItemsRef: { current: [] },
    wishlistVersion: { current: 0 }, mounted: { current: true },
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
    ...await extract("NotificationPreferencesPanel.tsx", "NotificationPreferencesPanel", ["savePreferences", "loadPreferences"]),
    ...await extract("WishlistExplorer.tsx", "WishlistExplorer", ["handleAlertUpdate", "handleDelete", "refreshAlertEvents"]),
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
        assert.match(await status.view(), completion === "success" ? /auth-status--anonymous/ : /auth-status--unavailable/);
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
    await settle();
    assert.deepEqual(credentialEvents(h.events).map(({ phase, path }) => [phase, path]), [
      ["dispatch", credentialPath("login")], ["settle", credentialPath("login")],
      ["dispatch", credentialPath("login")],
    ]);
    retryReply(sentinelSession(2, "obsolete-retry"), 200, null, oldCredentialCookie);
    await h.oldSubmit;
    await settle();
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
    await settle();
    const secondCleanup = h.defer(logoutPath);
    firstCleanup({}, 403);
    await settle();
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

test("B-08 failed HTTP/network logout releases both credential barriers and retains caller errors", async () => {
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
        assert.equal(h.auth.readAuthToken(), "replacement");
        assert.equal((await h.auth.readCurrentUser()).id, 2);
        assert.equal(form.error(), null);
        assert.deepEqual(events.filter(event => [logoutPath, `/api/auth/${mode}`].includes(event.path))
          .map(({ phase, path }) => [phase, path]), [
          ["dispatch", logoutPath], ["settle", logoutPath],
          ["dispatch", `/api/auth/${mode}`], ["settle", `/api/auth/${mode}`],
        ]);
        // A subsequent logout is a new usable operation, not a rejected barrier.
        h.respond(logoutPath, {});
        await h.auth.logout();
        assert.equal(h.auth.readAuthToken(), null);
        assert.equal(h.calls.filter(call => call.path === logoutPath).length, 2);
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
      assert.match(await status.view(), /auth-status--anonymous/);
      assert.equal(h.auth.readAuthToken(), null);
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
    await settle();
    const firstLogoutReply = h.defer(logoutPath);
    const loggingOut = h.auth.logout();
    h.respond("/api/auth/login", sentinelSession(2, "replacement"));
    const submitting = form.submit();
    await settle();
    assert.equal(h.calls.filter(call => [logoutPath, "/api/auth/login"].includes(call.path)).length, 0);
    refreshReply(sentinelSession(1, "late-rotation"));
    assert.equal(await refreshing, null, "logout invalidates the old refresh token write");
    await settle();
    assert.equal(h.calls.filter(call => call.path === logoutPath).length, 1);
    const retryLogoutReply = h.defer(logoutPath);
    firstLogoutReply({}, 403);
    await settle();
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
async function wishlistExplorerHarness(initialItems = [alertItem], { anonymous = false, loadStatus = 200 } = {}) {
  const h = await sentinelChatHarness();
  const source = await readFile(new URL("../src/components/WishlistExplorer.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("wishlist.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = ast.statements.find(node => node.name?.text === "WishlistExplorer");
  const end = component.body.statements.findIndex(node => ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(item => item.name.getText(ast) === "priceDropCount"));
  assert.ok(end > 0);
  const program = [
    ...ast.statements.filter(node => ["alertsFor", "protectedWishlistError"].includes(node.name?.text)),
    ...component.body.statements.slice(0, end),
  ].map(node => node.getText(ast)).join("\n");
  const output = ts.transpileModule(program, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
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
  const mocks = {
    ...hooks, ...h.auth, ...h.wishlist, normalizeAuthError: h.authApi.normalizeAuthError,
    wishlistItems: [], source: "api",
  };
  const renderState = new Function(...Object.keys(mocks), `${output}\nreturn {
    handleAlertUpdate, handleDelete, handleItemAdded,
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
  const formSource = await readFile(new URL("../src/components/AddWishlistItemForm.tsx", import.meta.url), "utf8");
  const formAst = ts.createSourceFile("add.tsx", formSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const form = formAst.statements.find(node => node.name?.text === "AddWishlistItemForm");
  const declarations = [
    formAst.statements.find(node => node.name?.text === "readRequiredText"),
    form.body.statements.find(node => node.name?.text === "handleSubmit"),
  ].map(node => node.getText(formAst)).join("\n");
  const compiled = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const addFormState = { message: null, isSubmitting: false, resets: 0, addedCalls: 0 };
  return {
    ...h, render, addFormState,
    state: () => render().state,
    update: (item, payload) => render().handleAlertUpdate(item, payload, "Persisted wishlist settings updated."),
    remove: item => render().handleDelete(item),
    added: item => render().handleItemAdded(item),
    retry: () => { render().retry(); render(); },
    add(item) {
      const callbacks = {
        ...h.auth, ...h.wishlist, token: h.auth.readAuthToken(),
        normalizeTargetPriceInput: value => value,
        setIsSubmitting: value => { addFormState.isSubmitting = value; },
        setMessage: value => { addFormState.message = value; }, onTokenChanged() {},
        onAdded: saved => { addFormState.addedCalls++; render().handleItemAdded(saved); },
        onAuthenticationRequired: () => h.auth.clearAuthToken(),
        FormData: class { get(name) { return name === "alertActive" ? (item.alertActive ? "on" : null) : item[name]; } },
      };
      const submit = new Function(...Object.keys(callbacks), `${compiled}\nreturn handleSubmit;`)(...Object.values(callbacks));
      return submit({ preventDefault() {}, currentTarget: { reset() { addFormState.resets++; } } });
    },
    restore() { cells.forEach(cell => cell.cleanup?.()); h.restore(); },
  };
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
  const mocks = {
    React, isExternalHref,
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
async function notificationPreferencesHarness(consumer = "SettingsCenter") {
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
        .replace("void loadPreferences();", "pendingLoads.push(loadPreferences());")}
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
  let effects = [];
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      cells[index] ??= { value: typeof initial === "function" ? initial() : initial };
      const cell = cells[index];
      return [cell.value, value => {
        cell.value = typeof value === "function" ? value(cell.value) : value;
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
  const mocks = {
    ...hooks, ...h.auth, ...h.preferences, React: react, pendingLoads,
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
    ...h, render, changedTokens,
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
      h.auth.startAuthSession(sentinelSession(2, "initial"));
      await settle();
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
