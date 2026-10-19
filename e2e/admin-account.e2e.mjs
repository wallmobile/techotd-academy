// Staff self-service password change (Phase 10.11) in real Chrome.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack } from "./stack.mjs";
import { Session, VIEWPORTS, openDb, bodyText } from "./helpers.mjs";

let stack;
before(async () => {
  stack = await startStack({ port: 3295 });
});
after(async () => {
  await stack?.stop();
});

const path = (s) => new URL(s.page.url()).pathname;
const NEW = "Brand-New-Staff-Pass-7";

async function fillPasswords(s, { current, next, confirm }) {
  await s.page.locator("#currentPassword").fill(current);
  await s.page.locator("#password").fill(next);
  await s.page.locator("#confirmPassword").fill(confirm ?? next);
}

test("PW1 every staff role finds My Account in its navigation; students, trainers and anonymous visitors cannot open it", async () => {
  for (const role of ["superadmin", "admin", "counsellor", "accountant", "placement", "contentmgr"]) {
    const s = await new Session(stack, role).open();
    try {
      await s.login(role);
      await s.goto(role === "superadmin" ? "/super-admin" : "/admin");
      await s.page.locator('aside nav a[href="/admin/account"]').click();
      await s.page.waitForURL("**/admin/account");
      // wait for the streamed page, not the loading skeleton
      await s.page.getByRole("heading", { name: "Change password" }).waitFor({ timeout: 10000 });
      const text = await bodyText(s.page);
      assert.ok(text.includes(stack.data.users[role].email), `${role} sees their own email`);
      assert.match(text, /Change password/);
      assert.deepEqual((await s.page.locator('aside nav a[aria-current="page"]').allInnerTexts()).map((t) => t.trim()), ["My Account"]);
      s.assertClean(`${role} account page`);
    } finally {
      await s.close();
    }
  }
  for (const role of ["student", "trainer"]) {
    const s = await new Session(stack, role).open();
    try {
      await s.login(role);
      await s.goto("/admin/account");
      await s.page.waitForURL((u) => u.pathname !== "/admin/account", { timeout: 5000 }).catch(() => {});
      assert.notEqual(path(s), "/admin/account", `${role} refused`);
    } finally {
      await s.close();
    }
  }
  const anon = await new Session(stack, "anon").open();
  try {
    await anon.goto("/admin/account");
    assert.equal(path(anon), "/login");
  } finally {
    await anon.close();
  }
});

test("PW2 validation and wrong-password feedback; passwords are masked, never echoed back, and nothing changes", async () => {
  const s = await new Session(stack, "counsellor").open();
  try {
    await s.login("counsellor");
    await s.goto("/admin/account");
    for (const id of ["#currentPassword", "#password", "#confirmPassword"]) assert.equal(await s.page.locator(id).getAttribute("type"), "password");

    await s.page.getByRole("button", { name: "Change password" }).click();
    await s.page.getByText("Please enter your current password.").waitFor();

    await fillPasswords(s, { current: "wrong-current-pass", next: NEW });
    await s.page.getByRole("button", { name: "Change password" }).click();
    await s.page.getByText("That current password is incorrect.").waitFor();
    for (const id of ["#currentPassword", "#password", "#confirmPassword"]) assert.equal(await s.page.locator(id).inputValue(), "", "no password is echoed back");

    await fillPasswords(s, { current: stack.data.password, next: NEW, confirm: "Something-Else-1" });
    await s.page.getByRole("button", { name: "Change password" }).click();
    await s.page.getByText("Passwords do not match.").waitFor();
    await fillPasswords(s, { current: stack.data.password, next: "short", confirm: "short" });
    await s.page.getByRole("button", { name: "Change password" }).click();
    await s.page.getByText(/at least 8 characters/).first().waitFor();
    await fillPasswords(s, { current: stack.data.password, next: stack.data.password });
    await s.page.getByRole("button", { name: "Change password" }).click();
    await s.page.getByText(/must be different/).waitFor();

    // the show/hide toggle only affects display
    await s.page.locator("#password").fill("visible-check-1");
    await s.page.getByRole("button", { name: /show password/i }).nth(1).click();
    assert.equal(await s.page.locator("#password").getAttribute("type"), "text");

    const d = openDb(stack);
    assert.equal(d.prepare("SELECT COUNT(*) c FROM audit_log WHERE action = 'account.password_changed'").get().c, 0, "nothing changed");
    d.close();
    s.assertClean("password validation");
  } finally {
    await s.close();
  }
});

test("PW3 successful change: still signed in here, signed out everywhere else, old password dead, new one works, audited", async () => {
  const here = await new Session(stack, "accountant-here").open();
  const elsewhere = await new Session(stack, "accountant-elsewhere").open();
  try {
    await here.login("accountant");
    await elsewhere.login("accountant");
    await elsewhere.goto("/admin");
    assert.equal(path(elsewhere), "/admin");

    await here.goto("/admin/account");
    await fillPasswords(here, { current: stack.data.password, next: NEW });
    await here.page.getByRole("button", { name: "Change password" }).click();
    await here.page.getByText(/Your password has been changed/).waitFor();
    assert.ok(!(await bodyText(here.page)).includes(NEW), "the password is not shown back");

    await here.goto("/admin");
    assert.equal(path(here), "/admin", "this browser stays signed in");
    await elsewhere.goto("/admin");
    assert.equal(path(elsewhere), "/login", "the other device is signed out");

    const fresh = await new Session(stack, "accountant-fresh").open();
    try {
      await fresh.loginRaw(stack.data.users.accountant.email, stack.data.password);
      await fresh.page.getByText(/Invalid email or password/).waitFor();
      await fresh.loginRaw(stack.data.users.accountant.email, NEW);
      await fresh.page.waitForURL((u) => u.pathname === "/admin");
    } finally {
      await fresh.close();
    }
    const d = openDb(stack);
    const rows = d.prepare("SELECT detail FROM audit_log WHERE action = 'account.password_changed' AND entity_id = ?").all(stack.data.users.accountant.id);
    d.close();
    assert.equal(rows.length, 1);
    assert.ok(!rows[0].detail.includes(NEW));
  } finally {
    await here.close();
    await elsewhere.close();
  }
});

test("PW4 guessing the current password is throttled in the UI", async () => {
  const s = await new Session(stack, "placement").open();
  try {
    await s.login("placement");
    await s.goto("/admin/account");
    for (let i = 0; i < 8; i += 1) {
      await fillPasswords(s, { current: `wrong-guess-${i}`, next: NEW });
      await s.page.getByRole("button", { name: "Change password" }).click();
      // the form resets itself once the server has answered: wait for that, not for stale text
      await s.page.waitForFunction(() => document.querySelector("#currentPassword")?.value === "");
      await s.page.getByText("That current password is incorrect.").waitFor();
    }
    await fillPasswords(s, { current: stack.data.password, next: NEW });
    await s.page.getByRole("button", { name: "Change password" }).click();
    await s.page.getByText(/Too many attempts/).waitFor();
    const d = openDb(stack);
    assert.equal(d.prepare("SELECT COUNT(*) c FROM audit_log WHERE action = 'account.password_changed' AND entity_id = ?").get(stack.data.users.placement.id).c, 0);
    d.close();
  } finally {
    await s.close();
  }
});

test("PW5 mobile: the account page fits a phone and the change works from the drawer", async () => {
  const m = await new Session(stack, "admin-m", { viewport: VIEWPORTS.mobile }).open();
  try {
    await m.login("admin");
    await m.goto("/admin");
    await m.page.getByRole("button", { name: /open navigation/i }).click();
    await m.page.getByRole("dialog").locator('nav a[href="/admin/account"]').click();
    await m.page.waitForURL("**/admin/account");
    assert.equal(await m.hasHorizontalOverflow(), false);
    await fillPasswords(m, { current: stack.data.password, next: NEW });
    await m.page.getByRole("button", { name: "Change password" }).click();
    await m.page.getByText(/Your password has been changed/).waitFor();
    await m.shot?.("mobile-account");
    m.assertClean("mobile account");
  } finally {
    await m.close();
  }
});
