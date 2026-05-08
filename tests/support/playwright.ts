import type { Page } from "@playwright/test";
import {
  createFormFixture,
  createSensitiveFormFixture,
  createWorkflowFixture,
  resetDatabase,
  seedBaseUsers,
  uniqueSlug,
} from "./fixtures";

export async function signInAs(
  page: Page,
  email: "admin@example.com" | "approver@example.com" | "submitter@example.com",
) {
  const destinations: Record<typeof email, string> = {
    "admin@example.com": "/admin",
    "approver@example.com": "/inbox",
    "submitter@example.com": "/submissions",
  };

  await page.goto("/signin");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await page.waitForURL(`**${destinations[email]}`);
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/");
}

export async function seedPublishedWorkflowForm() {
  await resetDatabase();
  const { admin, approver, submitter, compliance } = await seedBaseUsers();
  const workflow = await createWorkflowFixture({
    createdById: admin.id,
    approverId: approver.id,
    name: "Basic approval",
  });
  const form = await createFormFixture({
    createdById: admin.id,
    workflowId: workflow.id,
    status: "published",
    slug: uniqueSlug("e2e-request"),
    title: "E2E Request Form",
  });

  return { admin, approver, submitter, compliance, workflow, form };
}

export async function seedPublishedSensitiveForm() {
  await resetDatabase();
  const { admin, approver, submitter, compliance } = await seedBaseUsers();
  const workflow = await createWorkflowFixture({
    createdById: admin.id,
    approverId: approver.id,
    name: "Sensitive approval",
  });
  const form = await createSensitiveFormFixture({
    createdById: admin.id,
    workflowId: workflow.id,
    status: "published",
    slug: uniqueSlug("e2e-sensitive"),
    title: "Sensitive Request Form",
  });

  return { admin, approver, submitter, compliance, workflow, form };
}
