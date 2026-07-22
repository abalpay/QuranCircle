import { expect, test } from "@playwright/test";

test("optimizes the bundled Quran icon", async ({ request }) => {
  const response = await request.get(
    "/_next/image?url=%2Fquran-icon.png&w=48&q=75"
  );

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/png");

  const body = await response.body();
  expect(body.length).toBeGreaterThan(0);
  expect(body.subarray(0, 8)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  );
});
