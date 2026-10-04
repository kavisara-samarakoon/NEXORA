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

test("page-local deal alerts and giveaway reminders disclose their preview-only behavior", async () => {
  const [dealsSource, giveawaysSource] = await Promise.all([
    readFile(new URL("../src/components/DealsExplorer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/GiveawaysExplorer.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(dealsSource, /no alert is saved and no notification will be sent/);
  assert.doesNotMatch(dealsSource, /\{alertIsSet \? "Alert Set" : "Set Alert"\}/);
  assert.match(giveawaysSource, /no reminder is saved and no notification will be sent/);
  assert.doesNotMatch(giveawaysSource, /\{reminderIsSet \? "Reminder set" : "Add reminder"\}/);
  assert.match(giveawaysSource, /No verified claim destination/);
});

test("wishlist View Deal routes encoded titles through the existing external search without changing alert previews", async () => {
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
  const names = ["loadExternalDeals", "searchExternalTitle", "selectMode", "submitExternalSearch", "clearExternalSearch", "toggleAlert"];
  const program = [declaration("DealSearchQuery", dealsAst.statements), ...names.map(name => declaration(name))].join("\n");
  const { outputText } = ts.transpileModule(program, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  const state = { alerts: new Set(), mode: "curated", externalTitle: "", externalStatus: "idle" };
  const setters = Object.fromEntries(["mode", "externalTitle", "externalStatus", "activeExternalTitle", "activeFilter", "searchQuery", "externalDeals", "alerts"].map(key => [
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

  handlers.toggleAlert(7);
  assert.deepEqual([...state.alerts], ["curated:7"]);
  handlers.toggleAlert(7);
  assert.equal(state.alerts.size, 0);
  assert.equal(requests.length, 6, "page-only alert toggles make no provider request");
  assert.match(dealsSource, /no alert is saved and no notification will be sent/);
  assert.match(dealsSource, /\{alertIsSet \? "Marked on page" : "Preview alert"\}/);
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
