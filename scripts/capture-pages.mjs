#!/usr/bin/env node
// Usage: node scripts/capture-pages.mjs <label> <all|name[,name...]> [--list]
// Captures pages at 390px and 1440px, English and Arabic, to the scratchpad
// captures folder (never the repo). Fixtures go to the LOCAL database only.
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
import { mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.CAPTURE_BASE_URL ?? "http://localhost:3002";
const OUT_ROOT =
  "/private/tmp/claude-501/-Users-ahmet-Documents-Alpaylabs-QuranCircle/cf0bf668-be03-4827-b509-8d4799830d12/scratchpad/captures";
const PASSWORD = "Design-Audit-2026!x";
const ORG = "dsg-organizer@design.local";
const READER = "dsg-reader@design.local";
const EMPTY_USER = "dsg-empty@design.local";

try {
  process.loadEnvFile(".env.development.local");
} catch {
  /* env may already be set */
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env (.env.development.local).");
// Same rule as tests/support/supabase-test-target.ts: local hosts only, no override.
const host = new URL(url).hostname.toLowerCase().replace(/\.+$/, "");
if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(host)) {
  throw new Error(`Refusing to write fixtures to non-local Supabase host ${host}.`);
}
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const LATIN = ["Yusuf Al-Rahman", "Maryam Siddiqui", "Omar Haddad", "Aisha Khan", "Ibrahim Okafor", "Zainab Malik"];
const ARABIC = ["يوسف الرحمن", "مريم الصديقي", "عمر حداد", "عائشة خان", "إبراهيم الأنصاري", "زينب المالكي"];
const LONG = "Muhammad Abdulrahman Ibn Abdullah Al-Hashimi Al-Qurashi Al-Madani Bin Sulaiman";
const LONG_EVENT =
  "Khatm for our beloved grandfather Hajji Muhammad Abdulrahman Ibn Abdullah Al-Hashimi Al-Qurashi Al-Madani, may Allah have mercy on him and grant him Jannah";
const DUA = "May Allah forgive him, have mercy on him, and make his grave a garden from the gardens of Paradise.";

let FILLER; // stand-in auth user: the juz state check requires a user id on every claim
const daysAgo = (d) => new Date(Date.now() - d * 864e5).toISOString();

async function ensureUser(email, username) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = data?.users?.find((u) => u.email === email);
  if (found) {
    await admin.auth.admin.updateUserById(found.id, { password: PASSWORD, email_confirm: true });
    return found.id;
  }
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true, user_metadata: { username },
  });
  if (error) throw error;
  return created.user.id;
}

// khatm spec: { n, claims: [{ name, status?, user?: id }] (index = juz-1 order), completed? , deleted? }
async function makeCircle({ code, name, description, creator, isPublic = true, archived = false, khatms }) {
  await admin.from("events").delete().eq("short_code", code); // cascades; idempotent
  const { data: ev, error } = await admin.from("events").insert({
    name, description, short_code: code, is_public: isPublic, created_by: creator,
    is_archived: archived, archived_at: archived ? daysAgo(3) : null, created_at: daysAgo(12),
  }).select("id").single();
  if (error) throw new Error(`event ${code}: ${error.message}`);
  await admin.from("event_members").insert({ event_id: ev.id, user_id: creator, role: "creator" });
  for (const k of khatms) {
    const { data: kh, error: ke } = await admin.from("khatms")
      .insert({ event_id: ev.id, khatm_number: k.n, created_at: daysAgo(12 - k.n) }).select("id").single();
    if (ke) throw new Error(`khatm ${code}: ${ke.message}`);
    const rows = Array.from({ length: 30 }, (_, i) => {
      const c = k.claims?.[i];
      return {
        khatm_id: kh.id, juz_number: i + 1,
        status: c ? (c.status ?? "claimed") : "unclaimed",
        claimed_by_name: c?.name ?? null, claimed_by_user_id: c ? (c.user ?? FILLER) : null,
        claimed_at: c ? daysAgo(5) : null, read_at: c?.status === "read" ? daysAgo(2) : null,
      };
    });
    const { error: je } = await admin.from("juzs").insert(rows);
    if (je) throw new Error(`juzs ${code}: ${je.message}`);
    if (k.completed) {
      let { error: ce } = await admin.from("khatms")
        .update({ completed_at: daysAgo(1), completion_source: "all_done" }).eq("id", kh.id);
      // #78 adds completion_source; tolerate its absence.
      if (ce && /completion_source/.test(ce.message)) {
        ({ error: ce } = await admin.from("khatms").update({ completed_at: daysAgo(1) }).eq("id", kh.id));
      }
      if (ce) throw new Error(`complete ${code}: ${ce.message}`);
    }
  }
}

const names = (pool, n, from = 0) => Array.from({ length: n }, (_, i) => ({ name: pool[(i + from) % pool.length] }));
const full = (pool, status) => Array.from({ length: 30 }, (_, i) => ({ name: pool[i % pool.length], status }));

async function createFixtures() {
  const org = await ensureUser(ORG, "Design Organizer");
  const reader = await ensureUser(READER, "Design Reader");
  FILLER = await ensureUser("dsg-filler@design.local", "Design Filler");
  await ensureUser(EMPTY_USER, "Design Empty");
  const E = "In memory of Hajji Yusuf Al-Rahman";
  await makeCircle({ code: "DSGEMPTY", name: "Khatm for Maryam Siddiqui", description: DUA, creator: org, khatms: [{ n: 1 }] });
  await makeCircle({
    code: "DSGPART", name: E, description: DUA, creator: org,
    khatms: [{ n: 1, claims: [
      ...names(LATIN, 8).map((c, i) => ({ ...c, status: i < 3 ? "read" : "claimed" })),
      ...names(ARABIC, 6, 1).map((c) => ({ ...c, status: "claimed" })),
      { name: LONG }, { name: LONG, status: "read" },
    ] }],
  });
  await makeCircle({
    code: "DSGREADER", name: "Shifa khatm for Omar Haddad", description: DUA, creator: org,
    khatms: [{ n: 1, claims: [
      { name: "Design Reader", user: reader }, { name: ARABIC[0], status: "read" },
      ...names(LATIN, 5, 2), ...names(ARABIC, 4, 2),
    ] }],
  });
  await makeCircle({
    code: "DSGFULL", name: "Ramadan khatm", description: null, creator: org,
    khatms: [{ n: 1, claims: full([...LATIN, ...ARABIC]) }, { n: 2 }],
  });
  await makeCircle({
    code: "DSGDONE", name: "Khatm for Aisha Khan", description: DUA, creator: org,
    khatms: [{ n: 1, claims: full(LATIN, "read"), completed: true }],
  });
  await makeCircle({
    code: "DSGARCH", name: "Khatm for Ibrahim Okafor", description: DUA, creator: org, archived: true,
    khatms: [{ n: 1, claims: names(LATIN, 12) }],
  });
  await makeCircle({
    code: "DSGMULTI", name: "Khatm for Zainab Malik", description: DUA, creator: org,
    khatms: [
      { n: 1, claims: full(LATIN, "read"), completed: true },
      { n: 2, claims: full(ARABIC, "read"), completed: true },
      { n: 3, claims: full([...LATIN, ...ARABIC], "claimed") },
      { n: 4, claims: names(LATIN, 4) },
    ],
  });
  await makeCircle({
    code: "DSGLONG", name: LONG_EVENT, description: `${DUA} ${DUA} ${DUA}`, creator: org,
    khatms: [{ n: 1, claims: [{ name: LONG }, { name: LONG, status: "read" }, ...names(LATIN, 6)] }],
  });
  await makeCircle({
    code: "DSGARABIC", name: "ختمة عن روح المرحوم يوسف عبد الرحمن الهاشمي",
    description: "اللهم اغفر له وارحمه وعافه واعف عنه وأكرم نزله ووسّع مدخله.", creator: org,
    khatms: [{ n: 1, claims: names(ARABIC, 10).map((c, i) => ({ ...c, status: i < 4 ? "read" : "claimed" })) }],
  });
  return { org, reader };
}

const SIGNED_OUT = "out", ORGANIZER = "org", READER_V = "reader";
const circle = (code, views = [SIGNED_OUT, ORGANIZER]) =>
  views.map((v) => ({ name: `circle-${code.slice(3).toLowerCase()}-${v}`, path: `/s/${code}`, auth: v, full: true }));

const PAGES = [
  { name: "home", path: "/", full: true },
  { name: "home-signed-in", path: "/", auth: ORGANIZER, full: true },
  { name: "browse", path: "/browse", full: true },
  { name: "my-circles-signed-out", path: "/my-circles", full: true },
  { name: "my-circles-empty", path: "/my-circles", auth: "empty", full: true },
  { name: "my-circles-filled", path: "/my-circles", auth: ORGANIZER, full: true },
  { name: "account", path: "/account", auth: ORGANIZER, full: true },
  { name: "about", path: "/about", full: true },
  { name: "contact", path: "/contact", full: true },
  { name: "terms", path: "/terms", full: true },
  { name: "privacy", path: "/privacy", full: true },
  { name: "guide-whatsapp", path: "/group-khatm-whatsapp", full: true },
  { name: "guide-coordination", path: "/khatm-coordination", full: true },
  { name: "guide-ramadan", path: "/ramadan-group-khatm", full: true },
  { name: "reset-password", path: "/reset-password", full: true },
  { name: "not-found", path: "/this-page-does-not-exist", full: true },
  { name: "not-found-circle", path: "/s/DSGMISSING", full: true },
  { name: "dialog-auth", path: "/", dialog: "auth" },
  { name: "dialog-create", path: "/", dialog: "create", auth: ORGANIZER },
  { name: "dialog-claim", path: "/s/DSGPART", dialog: "claim" },
  ...circle("DSGEMPTY"),
  ...circle("DSGPART", [SIGNED_OUT, ORGANIZER, READER_V]),
  ...circle("DSGREADER", [SIGNED_OUT, ORGANIZER, READER_V]),
  ...circle("DSGFULL"),
  ...circle("DSGDONE"),
  ...circle("DSGARCH"),
  ...circle("DSGMULTI"),
  ...circle("DSGLONG", [SIGNED_OUT, ORGANIZER]),
  ...circle("DSGARABIC", [SIGNED_OUT, ORGANIZER]),
];

const EMAIL = { [ORGANIZER]: ORG, [READER_V]: READER, empty: EMPTY_USER };

async function signIn(browser, email) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Sign In" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByLabel("Password").fill(PASSWORD);
  await dialog.getByRole("button", { name: /^Login$/ }).click();
  await page.getByRole("button", { name: /Salam,/ }).waitFor({ timeout: 15000 });
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

async function openDialog(page, kind, locale) {
  const ar = locale === "ar";
  if (kind === "claim") {
    await page.getByRole("button", { name: "17", exact: true }).click({ timeout: 5000 });
    await page.getByRole("button", { name: ar ? "حجز" : "Claim", exact: true }).last().click({ timeout: 5000 });
  } else {
    const name = kind === "auth" ? (ar ? "تسجيل الدخول" : "Sign In") : ar ? "ابدأ حلقة ختم" : "Start A Khatm Circle";
    await page.getByRole("button", { name }).first().click({ timeout: 5000 });
  }
  await page.waitForTimeout(700);
}

async function main() {
  const [label, which = "all"] = process.argv.slice(2);
  if (!label || label.startsWith("--")) throw new Error("Usage: capture-pages.mjs <label> <all|name,name>");
  const wanted = which === "all" ? PAGES : which.split(",").map((n) => {
    const hit = PAGES.filter((p) => p.name === n || p.name.startsWith(`${n}-`));
    if (!hit.length) throw new Error(`Unknown page ${n}. Known: ${PAGES.map((p) => p.name).join(", ")}`);
    return hit;
  }).flat();
  await createFixtures();
  const outDir = join(OUT_ROOT, label);
  if (existsSync(outDir) && which === "all") rmSync(outDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const states = {};
  for (const [k, email] of Object.entries(EMAIL)) {
    if (wanted.some((p) => p.auth === k)) states[k] = await signIn(browser, email);
  }
  let count = 0;
  const failures = [];
  for (const p of wanted) {
    for (const locale of ["en", "ar"]) {
      for (const [vw, vh, tag] of [[390, 844, "390"], [1440, 900, "1440"]]) {
        const ctx = await browser.newContext({
          viewport: { width: vw, height: vh }, deviceScaleFactor: 1, locale: locale === "ar" ? "ar" : "en-US",
          storageState: p.auth ? states[p.auth] : undefined,
        });
        await ctx.addCookies([{ name: "NEXT_LOCALE", value: locale, url: BASE }]);
        const page = await ctx.newPage();
        const file = join(outDir, `${p.name}.${locale}.${tag}.png`);
        try {
          await page.goto(`${BASE}${locale === "ar" ? "/ar" : ""}${p.path === "/" ? "" : p.path}`, { waitUntil: "networkidle", timeout: 45000 });
          await page.waitForTimeout(400);
          if (p.dialog) await openDialog(page, p.dialog, locale);
          await page.screenshot({ path: file, fullPage: Boolean(p.full) });
          count += 1;
        } catch (e) {
          failures.push(`${p.name}.${locale}.${tag}: ${e.message.split("\n")[0]}`);
        }
        await ctx.close();
      }
    }
  }
  await browser.close();
  console.log(`captured ${count} files in ${outDir}`);
  if (failures.length) console.log(`failures (${failures.length}):\n${failures.join("\n")}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
