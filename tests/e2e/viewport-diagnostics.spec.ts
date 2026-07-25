import { devices, expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const iPhone13 = devices["iPhone 13"];

test.use({
  userAgent: iPhone13.userAgent,
  viewport: iPhone13.viewport,
  deviceScaleFactor: iPhone13.deviceScaleFactor,
  isMobile: iPhone13.isMobile,
  hasTouch: iPhone13.hasTouch,
});

test.describe("viewport diagnostics", () => {
  test("does not load without the explicit query parameter", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("viewport-diagnostics")).toHaveCount(0);
  });

  test("captures and exports a privacy-safe mobile viewport trace", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto("/?viewportDebug=1");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("viewport-diagnostics-toggle").click();
    await expect(page.getByTestId("viewport-diagnostics-heights")).toContainText(
      String(iPhone13.viewport.height)
    );

    await page.setViewportSize({ width: 390, height: 560 });
    await expect(page.getByTestId("viewport-diagnostics-heights")).toContainText(
      "560"
    );

    await page.evaluate(() => {
      const dialog = document.createElement("div");
      const input = document.createElement("input");
      dialog.setAttribute("role", "dialog");
      input.id = "claimerName";
      dialog.appendChild(input);
      document.body.appendChild(dialog);
      input.focus();
      input.blur();
      dialog.remove();
    });
    await page.waitForTimeout(1_100);

    await page.getByTestId("viewport-diagnostics-mark").click();
    await page.evaluate(() => {
      window.history.replaceState(
        {},
        "",
        "/s/SensitiveShortCode?viewportDebug=1"
      );
    });

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("viewport-diagnostics-download").click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).not.toBeNull();

    const log = JSON.parse(await readFile(path!, "utf8")) as {
      schemaVersion: number;
      route: string;
      entryCount: number;
      entries: Array<{
        event: string;
        snapshot: {
          document: { scrollHeight: number };
          mobileNavigation: { position: string } | null;
          visualViewport: { height: number | null };
        };
      }>;
    };

    expect(log.schemaVersion).toBe(1);
    expect(log.route).toBe("/s/:shortCode");
    expect(JSON.stringify(log)).not.toContain("SensitiveShortCode");
    expect(log.entryCount).toBeGreaterThan(1);
    expect(log.entries.some((entry) => entry.event === "manual.issue-visible")).toBe(
      true
    );
    expect(log.entries.some((entry) => entry.event.includes("focusin"))).toBe(true);
    expect(log.entries.some((entry) => entry.event.includes("focusout+1000ms"))).toBe(
      true
    );
    expect(log.entries.at(-1)?.snapshot.document.scrollHeight).toBeGreaterThan(0);
    expect(log.entries.at(-1)?.snapshot.visualViewport.height).toBe(560);
    expect(log.entries.at(-1)?.snapshot.mobileNavigation?.position).toBe("fixed");
    expect(
      consoleErrors.filter((message) => message.includes("hydrated"))
    ).toEqual([]);
  });
});
