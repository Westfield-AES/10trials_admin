import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { isCancelledError } = require("@tanstack/react-query");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function deferred() {
  let resolve;
  const promise = new Promise((complete) => { resolve = complete; });
  return { promise, resolve };
}

function environment(fetch = () => { throw new Error("Unexpected request"); }, overrides = {}) {
  const storage = new Map();
  const window = Object.assign(new EventTarget(), {
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  });
  const modules = new Map();
  function load(file) {
    if (modules.has(file)) return modules.get(file).exports;
    const source = fs.readFileSync(path.join(root, file), "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });
    const loaded = { exports: {} };
    modules.set(file, loaded);
    vm.runInNewContext(outputText, {
      module: loaded,
      exports: loaded.exports,
      require: (name) => {
        if (name in overrides) return overrides[name];
        if (name.startsWith("@/")) {
          const relative = "src/" + name.slice(2);
          return load(relative + (fs.existsSync(path.join(root, relative + ".ts")) ? ".ts" : ".tsx"));
        }
        return require(name);
      },
      window, Event, AbortController, Response, fetch, console,
      process: { env: {} },
    }, { filename: file });
    return loaded.exports;
  }
  return { load, session: load("src/lib/admin-session.ts") };
}

test("logout removes protected records and cancels late query results", async () => {
  const env = environment();
  env.session.setAdminSessionToken("owner-token");
  const { createAdminQueryClient, bindAdminQuerySession } = env.load("src/lib/admin-query-session.ts");
  const owner = createAdminQueryClient();
  const dispose = bindAdminQuerySession(owner);
  owner.setQueryData(["admin-users"], { users: [{ email: "owner-only@example.test" }] });
  const pending = deferred();
  let signal;
  const result = owner.fetchQuery({
    queryKey: ["admin-members"],
    queryFn: (context) => { signal = context.signal; return pending.promise; },
  }).catch((error) => error);

  env.session.setAdminSessionToken(null);
  assert.equal(owner.getQueryCache().getAll().length, 0);
  assert.equal(signal.aborted, true);
  assert.ok(isCancelledError(await result));
  pending.resolve({ admins: [{ email: "late-owner@example.test" }] });
  await Promise.resolve();
  assert.equal(owner.getQueryCache().getAll().length, 0);

  env.session.setAdminSessionToken("viewer-token");
  const viewer = createAdminQueryClient();
  assert.equal(viewer.getQueryData(["admin-users"]), undefined);
  assert.equal(viewer.getQueryData(["admin-members"]), undefined);
  dispose();
  viewer.clear();
});

test("direct token replacement also clears the previous session's cache", () => {
  const env = environment();
  env.session.setAdminSessionToken("owner-token");
  const { createAdminQueryClient, bindAdminQuerySession } = env.load("src/lib/admin-query-session.ts");
  const client = createAdminQueryClient();
  const dispose = bindAdminQuerySession(client);
  client.setQueryData(["admin-user", "learner-1"], { email: "private@example.test" });
  env.session.setAdminSessionToken("viewer-token");
  assert.equal(client.getQueryCache().getAll().length, 0);
  dispose();
});

test("a current-session 401 expires authentication and clears all protected data", async () => {
  const env = environment(async () => Response.json({ error: { code: "ADMIN_SESSION_INVALID" } }, { status: 401 }));
  env.session.setAdminSessionToken("expired-token");
  const { createAdminQueryClient, bindAdminQuerySession } = env.load("src/lib/admin-query-session.ts");
  const client = createAdminQueryClient();
  const dispose = bindAdminQuerySession(client);
  client.setQueryData(["admin-users"], { users: ["private"] });
  const { apiRequest } = env.load("src/lib/api.ts");
  await assert.rejects(apiRequest("/api/v1/admin/me"), { code: "ADMIN_SESSION_INVALID" });
  assert.equal(env.session.getAdminSessionToken(), null);
  assert.equal(client.getQueryCache().getAll().length, 0);
  dispose();
});

for (const status of [200, 401]) {
  test(`a late ${status} response cannot cross sessions or log out the new administrator`, async () => {
    const pending = deferred();
    let signal;
    const env = environment((_url, init) => { signal = init.signal; return pending.promise; });
    env.session.setAdminSessionToken("owner-token");
    const { apiRequest } = env.load("src/lib/api.ts");
    const result = apiRequest("/api/v1/admin/users");
    const rejection = assert.rejects(result, { code: "ADMIN_SESSION_CHANGED" });
    env.session.setAdminSessionToken("viewer-token");
    assert.equal(signal.aborted, true);
    // Simulate a transport that delivers a response despite cancellation.
    pending.resolve(Response.json({ users: ["owner-only"], error: { code: "ADMIN_SESSION_INVALID" } }, { status }));
    await rejection;
    assert.equal(env.session.getAdminSessionToken(), "viewer-token");
  });
}

test("session changes during response-body parsing cannot publish the old data", async () => {
  const body = deferred();
  const started = deferred();
  const env = environment(async () => ({
    ok: true, status: 200,
    json: () => { started.resolve(); return body.promise; },
  }));
  env.session.setAdminSessionToken("owner-token");
  const { apiRequest } = env.load("src/lib/api.ts");
  const result = apiRequest("/api/v1/admin/users");
  const rejection = assert.rejects(result, { code: "ADMIN_SESSION_CHANGED" });
  await started.promise;
  env.session.setAdminSessionToken(null);
  body.resolve({ users: ["owner-only"] });
  await rejection;
});

for (const [pathname, permission, allowed] of [
  ["/users", "learning.read", false],
  ["/users/learner-1", "learning.read", false],
  ["/admins", "learning.read", false],
  ["/operations", "users.read", false],
  ["/question-reports/42", "learning.read", false],
  ["/learning", "learning.read", true],
  ["/users/learner-1", "users.read", true],
]) {
  test(`the page boundary ${allowed ? "allows" : "blocks"} ${pathname} with ${permission}`, () => {
    const env = environment(undefined, {
      "@/components/providers": {
        useAdminAuth: () => ({
          user: { id: "admin" },
          admin: { email: "admin@example.test", role: "viewer", permissions: [permission] },
          loading: false, error: null, logout: async () => {},
        }),
      },
      "next/navigation": { usePathname: () => pathname, useRouter: () => ({ replace() {} }) },
      "next/link": { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) },
      "@/components/admin-install-prompt": { AdminInstallPrompt: () => null },
      "@/components/ui": { Logo: () => null, Spinner: () => null },
    });
    const { AdminShell } = env.load("src/components/admin-shell.tsx");
    const html = renderToStaticMarkup(React.createElement(AdminShell, null, "protected-record"));
    assert.equal(html.includes("protected-record"), allowed);
    assert.equal(html.includes("Access restricted"), !allowed);
  });
}
