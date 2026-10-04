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

test("wishlist View Deal routes encoded titles through the existing external search", async () => {
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
  const names = ["loadExternalDeals", "searchExternalTitle", "selectMode", "submitExternalSearch", "clearExternalSearch"];
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
  const mocks = {
    ...setters, requestVersion, mounted,
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
