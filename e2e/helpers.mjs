import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import Database from "better-sqlite3";

export const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
};

// Messages the app is allowed to log in the browser console. Anything else
// (hydration errors, CSP violations, failed scripts, uncaught exceptions)
// fails the test that triggered it.
const ALLOWED_CONSOLE = [/status of 40[134] \(/i]; // expected 401/403/404 resource responses

// Streaming pages first flush a loading skeleton (role=status, aria-busy=true, from
// loading.jsx) and replace it with the real content. A "load" event can fire while
// the skeleton is still showing, so every read waits for the skeleton to go away.
export async function settled(page, timeout = 15000) {
  await page.waitForFunction(() => !document.querySelector('[role="status"][aria-busy="true"]'), undefined, { timeout });
}

export class Session {
  constructor(stack, label, { viewport = VIEWPORTS.desktop } = {}) {
    this.stack = stack;
    this.label = label;
    this.viewport = viewport;
    this.problems = [];
  }

  async open() {
    this.context = await this.stack.browser.newContext({ viewport: this.viewport, acceptDownloads: true });
    this.page = await this.context.newPage();
    this.page.on("console", (m) => {
      if (!["error", "warning"].includes(m.type())) return;
      const text = m.text();
      if (ALLOWED_CONSOLE.some((re) => re.test(text))) return;
      this.problems.push(`console.${m.type()}: ${text.slice(0, 200)}`);
    });
    this.page.on("pageerror", (e) => this.problems.push(`pageerror: ${String(e.message).slice(0, 200)}`));
    return this;
  }

  async close() {
    await this.context?.close();
  }

  url(p) {
    return this.stack.base + p;
  }

  async goto(p, opts) {
    const response = await this.page.goto(this.url(p), { waitUntil: "load", ...opts });
    await settled(this.page);
    return response;
  }

  async login(userKey, password = this.stack.data.password) {
    const user = this.stack.data.users[userKey];
    await this.goto("/login");
    await this.page.fill("#email", user.email);
    await this.page.fill("#password", password);
    await Promise.all([this.page.waitForURL((u) => !u.pathname.startsWith("/login")), this.page.click("button[type=submit]")]);
    return this;
  }

  async loginRaw(email, password) {
    await this.goto("/login");
    await this.page.fill("#email", email);
    await this.page.fill("#password", password);
    await this.page.click("button[type=submit]");
  }

  async logout() {
    // Both the desktop header and the mobile drawer render a "Log out" form.
    const btn = this.page.getByRole("button", { name: /log out/i }).first();
    await Promise.all([this.page.waitForURL((u) => !u.pathname.startsWith("/admin") && !u.pathname.startsWith("/student") && !u.pathname.startsWith("/trainer")), btn.click()]);
  }

  assertClean(what = "") {
    const p = this.problems.splice(0);
    assert.deepEqual(p, [], `${this.label} ${what}: browser reported problems`);
  }

  async shot(name) {
    const dir = process.env.E2E_ARTIFACTS;
    if (!dir) return;
    fs.mkdirSync(dir, { recursive: true });
    await this.page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
  }

  // True when the page has horizontal scroll (a layout bug on narrow screens).
  async hasHorizontalOverflow() {
    return this.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth > 1);
  }
}

// Direct read/write access to the e2e database, for ARRANGING state that has
// no UI (e.g. expiring a session) and for asserting what was persisted.
export function openDb(stack, { readonly = true } = {}) {
  return new Database(stack.dbFile, { readonly, fileMustExist: true });
}

export async function bodyText(page) {
  await settled(page);
  return (await page.locator("body").innerText()).replace(/\s+/g, " ");
}
