import { expect, test } from "@playwright/test";

const smokeShortCode = process.env.E2E_SMOKE_SHORT_CODE ?? "E2ESMOKE1";

test("event API validates khatmLimit query param", async ({ request }) => {
  const invalidString = await request.get(
    `/api/event?shortCode=${smokeShortCode}&khatmLimit=abc`
  );
  expect(invalidString.status()).toBe(400);
  await expect(invalidString.json()).resolves.toEqual({
    error: {
      code: "invalid_khatm_limit",
      message: "Invalid khatmLimit",
    },
  });

  const invalidLowValue = await request.get(
    `/api/event?shortCode=${smokeShortCode}&khatmLimit=0`
  );
  expect(invalidLowValue.status()).toBe(400);
  await expect(invalidLowValue.json()).resolves.toEqual({
    error: {
      code: "invalid_khatm_limit",
      message: "Invalid khatmLimit",
    },
  });
});

test("event API validates beforeKhatmNumber query param", async ({ request }) => {
  const invalidString = await request.get(
    `/api/event?shortCode=${smokeShortCode}&beforeKhatmNumber=abc`
  );
  expect(invalidString.status()).toBe(400);
  await expect(invalidString.json()).resolves.toEqual({
    error: {
      code: "invalid_before_khatm_number",
      message: "Invalid beforeKhatmNumber",
    },
  });

  const invalidLowValue = await request.get(
    `/api/event?shortCode=${smokeShortCode}&beforeKhatmNumber=0`
  );
  expect(invalidLowValue.status()).toBe(400);
  await expect(invalidLowValue.json()).resolves.toEqual({
    error: {
      code: "invalid_before_khatm_number",
      message: "Invalid beforeKhatmNumber",
    },
  });
});

test("event API supports snapshot pagination query args", async ({ request }) => {
  const response = await request.get(
    `/api/event?shortCode=${smokeShortCode}&khatmLimit=3&beforeKhatmNumber=2`
  );
  expect(response.status()).toBe(200);

  const payload = (await response.json()) as {
    short_code: string;
    khatms: unknown[];
    loaded_khatms: number;
  };
  expect(payload.short_code).toBe(smokeShortCode);
  expect(Array.isArray(payload.khatms)).toBe(true);
  expect(payload.khatms.length).toBeLessThanOrEqual(3);
  expect(payload.loaded_khatms).toBeGreaterThan(0);
});

test("event API returns structured errors for missing and unknown short code", async ({
  request,
}) => {
  const missingShortCode = await request.get("/api/event");
  expect(missingShortCode.status()).toBe(400);
  await expect(missingShortCode.json()).resolves.toEqual({
    error: { code: "missing_short_code", message: "Missing shortCode" },
  });

  const notFound = await request.get("/api/event?shortCode=NOPE0001");
  expect(notFound.status()).toBe(404);
  await expect(notFound.json()).resolves.toEqual({
    error: { code: "not_found", message: "Event not found" },
  });
});
