import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase env for creator queue E2E tests.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type CreatorFixture = {
  eventId: string;
  shortCode: string;
  creatorEmail: string;
  creatorPassword: string;
  creatorUserId: string;
  participantUserId: string;
};

let fixture: CreatorFixture;

async function createUser(
  email: string,
  password: string,
  username: string
) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message ?? "unknown"}`);
  }
  return data.user;
}

async function createCreatorFixture(): Promise<CreatorFixture> {
  const runToken = randomUUID().replace(/-/g, "").slice(0, 10);
  const creatorEmail = `creator-${runToken}@e2e.local`;
  const participantEmail = `participant-${runToken}@e2e.local`;
  const creatorPassword = `Creator-${runToken}!A`;
  const participantPassword = `Participant-${runToken}!A`;

  const creator = await createUser(creatorEmail, creatorPassword, "Creator Owner");
  const participant = await createUser(
    participantEmail,
    participantPassword,
    "Queue Participant"
  );

  const eventId = randomUUID();
  const khatmId = randomUUID();
  const now = new Date().toISOString();
  const shortCode = `E2ECQ${runToken.toUpperCase()}`;

  const { error: eventError } = await admin.from("events").insert({
    id: eventId,
    name: "E2E Creator Queue Circle",
    description: "Fixture for creator queue UX coverage.",
    is_public: true,
    created_by: creator.id,
    short_code: shortCode,
    is_archived: false,
    archived_at: null,
  });
  if (eventError) {
    throw new Error(`Failed to seed event: ${eventError.message}`);
  }

  const { error: membershipError } = await admin.from("event_members").insert([
    { event_id: eventId, user_id: creator.id, role: "creator" },
    { event_id: eventId, user_id: participant.id, role: "participant" },
  ]);
  if (membershipError) {
    throw new Error(`Failed to seed event members: ${membershipError.message}`);
  }

  const { error: khatmError } = await admin.from("khatms").insert({
    id: khatmId,
    event_id: eventId,
    khatm_number: 1,
  });
  if (khatmError) {
    throw new Error(`Failed to seed khatm: ${khatmError.message}`);
  }

  const juzRows = Array.from({ length: 30 }, (_, index) => {
    const juzNumber = index + 1;
    if (juzNumber === 1) {
      return {
        id: randomUUID(),
        khatm_id: khatmId,
        juz_number: juzNumber,
        status: "claimed",
        claimed_by_name: "Amina",
        claimed_by_user_id: participant.id,
        claimed_at: now,
        read_at: null,
      };
    }
    if (juzNumber === 2) {
      return {
        id: randomUUID(),
        khatm_id: khatmId,
        juz_number: juzNumber,
        status: "claimed",
        claimed_by_name: "Creator Owner",
        claimed_by_user_id: creator.id,
        claimed_at: now,
        read_at: null,
      };
    }
    if (juzNumber === 3) {
      return {
        id: randomUUID(),
        khatm_id: khatmId,
        juz_number: juzNumber,
        status: "read",
        claimed_by_name: "Creator Owner",
        claimed_by_user_id: creator.id,
        claimed_at: now,
        read_at: now,
      };
    }
    return {
      id: randomUUID(),
      khatm_id: khatmId,
      juz_number: juzNumber,
      status: "unclaimed",
      claimed_by_name: null,
      claimed_by_user_id: null,
      claimed_at: null,
      read_at: null,
    };
  });

  const { error: juzError } = await admin.from("juzs").insert(juzRows);
  if (juzError) {
    throw new Error(`Failed to seed juzs: ${juzError.message}`);
  }

  return {
    eventId,
    shortCode,
    creatorEmail,
    creatorPassword,
    creatorUserId: creator.id,
    participantUserId: participant.id,
  };
}

async function signInAsCreator(
  page: Page,
  creatorEmail: string,
  creatorPassword: string
) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign In" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email").fill(creatorEmail);
  await dialog.getByLabel("Password").fill(creatorPassword);
  await dialog.getByRole("button", { name: /^Login$/ }).click();
  await expect(page.getByRole("button", { name: /Salam,/ })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  fixture = await createCreatorFixture();
});

test.afterAll(async () => {
  if (!fixture) return;
  await admin.from("events").delete().eq("id", fixture.eventId);
  await admin.auth.admin.deleteUser(fixture.creatorUserId);
  await admin.auth.admin.deleteUser(fixture.participantUserId);
});

test("creator sees queue sub-tabs and filters with URL sync", async ({ page }) => {
  await signInAsCreator(page, fixture.creatorEmail, fixture.creatorPassword);

  await page.goto(`/s/${fixture.shortCode}?filter=mine`);
  await expect(
    page.getByRole("tab", { name: /My Juz \(\d+\)/ })
  ).toHaveAttribute("data-state", "active");

  const creatorQueueTab = page.getByRole("tab", {
    name: /^Creator Queue \(\d+\)$/,
  });
  await expect(creatorQueueTab).toBeVisible();
  await expect(page.getByRole("tab", { name: /^My Juz$/ })).toHaveAttribute(
    "data-state",
    "active"
  );
  await expect
    .poll(() => new URL(page.url()).searchParams.get("mineView"))
    .toBeNull();

  await creatorQueueTab.click();
  await expect(
    page.getByRole("heading", { name: "Creator Queue", exact: true })
  ).toBeVisible();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("mineView"))
    .toBe("creator");

  await page.getByLabel("Search creator queue rows").fill("Amina");
  await expect(page.getByText("by Amina")).toBeVisible();
  await expect(page.getByText("by Creator Owner")).toHaveCount(0);

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("by Creator Owner").first()).toBeVisible();

  await page.getByRole("button", { name: "Mark Read" }).first().click();
  await expect(page.getByRole("button", { name: "Undo" }).first()).toBeVisible();

  await page.getByRole("tab", { name: /All \(\d+\)/ }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("mineView"))
    .toBeNull();
});

test("creator mine view follows URL during browser back and forward", async ({
  page,
}) => {
  await signInAsCreator(page, fixture.creatorEmail, fixture.creatorPassword);

  await page.goto(`/s/${fixture.shortCode}?filter=mine`);
  await expect(page.getByRole("tab", { name: /^My Juz$/ })).toHaveAttribute(
    "data-state",
    "active"
  );

  await page.goto(`/s/${fixture.shortCode}?filter=mine&mineView=creator`);
  await expect(
    page.getByRole("tab", { name: /^Creator Queue \(\d+\)$/ })
  ).toHaveAttribute("data-state", "active");

  await page.goBack();
  await expect(page.getByRole("tab", { name: /^My Juz$/ })).toHaveAttribute(
    "data-state",
    "active"
  );

  await page.goForward();
  await expect(
    page.getByRole("tab", { name: /^Creator Queue \(\d+\)$/ })
  ).toHaveAttribute("data-state", "active");
});
