import { expect, test } from "@playwright/test";
import { db } from "../../src/lib/db";
import {
  createFormFixture,
  createWorkflowFixture,
  resetDatabase,
  seedBaseUsers,
} from "../support/fixtures";
import { signInAs } from "../support/playwright";

test.describe("Form builder", () => {
  test.afterAll(async () => {
    await db.$disconnect();
  });

  for (const locale of ["en", "de"] as const) {
    test(`renders the Form.io builder controls on /${locale}`, async ({ page }) => {
      await resetDatabase();
      const users = await seedBaseUsers();
      const workflow = await createWorkflowFixture({
        createdById: users.admin.id,
        approverId: users.approver.id,
        name: "Builder visibility workflow",
      });
      const form = await createFormFixture({
        createdById: users.admin.id,
        workflowId: workflow.id,
        status: "draft",
        title: "Builder visibility form",
      });

      // Capture CSP / eval violations. Form.io renders the builder UI via Function()-compiled
      // templates, so a missing 'unsafe-eval' surfaces here rather than as a missing DOM node.
      const evalErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error" && /unsafe-eval|EvalError|Content Security Policy/i.test(message.text())) {
          evalErrors.push(message.text());
        }
      });
      page.on("pageerror", (error) => {
        if (/unsafe-eval|EvalError|Content Security Policy/i.test(error.message)) {
          evalErrors.push(error.message);
        }
      });

      await signInAs(page, "admin@example.com");
      // Reach the builder via client-side navigation (as a user does), not a hard load. CSP is
      // bound to the originating document, so a hard load would mask the inherited-CSP regression.
      await page.goto(`/${locale}/admin/forms`);
      await page.locator(`a[href$="/admin/forms/${form.id}/builder"]`).click();
      await page.waitForURL(`**/admin/forms/${form.id}/builder`);

      const builderFrame = page.locator(".form-builder-frame");
      const builder = builderFrame.locator(".formbuilder");
      await expect(builderFrame).toBeVisible();
      await expect(builder).toBeVisible();
      await expect
        .poll(async () => {
          const box = await builderFrame.boundingBox();
          return box?.height ?? 0;
        })
        .toBeGreaterThan(500);
      await expect(builder.locator(".builder-sidebar")).toBeVisible();
      await expect(builder.locator(".formcomponent").first()).toBeVisible();
      await expect(builder.locator(".drag-container.formio-builder-form")).toBeVisible();
      expect(evalErrors, evalErrors.join("\n")).toEqual([]);
    });
  }
});
