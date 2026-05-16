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
  const accounts: Record<
    typeof email,
    { callbackUrl: string; uid: string; password: string }
  > = {
    "admin@example.com": { callbackUrl: "/admin", uid: "admin", password: "admin" },
    "approver@example.com": { callbackUrl: "/inbox", uid: "approver", password: "approver" },
    "submitter@example.com": {
      callbackUrl: "/submissions",
      uid: "submitter",
      password: "submitter",
    },
  };
  const account = accounts[email];

  const csrfResponse = await page.context().request.get("/api/auth/csrf");
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const signInResponse = await page.context().request.post(
    "/api/auth/callback/credentials?json=true",
    {
      form: {
        csrfToken,
        uid: account.uid,
        email,
        password: account.password,
        callbackUrl: account.callbackUrl,
        json: "true",
      },
    },
  );

  if (!signInResponse.ok()) {
    throw new Error(`Sign-in failed for ${email} with status ${signInResponse.status()}.`);
  }

  await page.goto(account.callbackUrl);
  await page.waitForURL(`**${account.callbackUrl}`);
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
