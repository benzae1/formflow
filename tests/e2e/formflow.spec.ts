import { expect, test } from "@playwright/test";
import { db } from "../../src/lib/db";
import {
  createFormFixture,
  createWorkflowFixture,
  resetDatabase,
  seedBaseUsers,
  waitForApprovalTask,
  waitForSubmissionStatus,
} from "../support/fixtures";
import { signInAs, signOut } from "../support/playwright";

test.describe("FormFlow end-to-end", () => {
  test.afterAll(async () => {
    await db.$disconnect();
  });

  test("@smoke admin can publish a form, a submitter can submit it, and an approver can approve it", async ({
    page,
  }) => {
    await seedFreshWorkflow();
    const title = "Smoke workflow form";

    await signInAs(page, "admin@example.com");
    await page.goto("/en/admin/forms");

    await page.getByRole("button", { name: "Create form" }).click();
    await page.getByPlaceholder("Form title").fill(title);
    await page
      .locator(".fixed.inset-0 select")
      .nth(1)
      .selectOption({ label: "Basic approval" });
    await page.getByRole("button", { name: "Create and open builder" }).click();

    await expect(page).toHaveURL(/\/admin\/forms\/.+\/builder/);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Form published.")).toBeVisible();

    await signOut(page);
    await signInAs(page, "submitter@example.com");
    await page.goto("/en/submissions");
    await page.getByRole("link", { name: title }).click();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page).toHaveURL(/\/submissions\/.+/);

    const submissionId = extractSubmissionId(page.url());

    await signOut(page);
    await signInAs(page, "approver@example.com");
    await page.goto("/en/inbox");
    await page.getByRole("link", { name: "Open submission" }).first().click();
    await page.getByRole("button", { name: "Approve" }).click();
    await page.getByRole("button", { name: "Confirm decision" }).click();
    await expect(page).toHaveURL(/\/inbox/);

    await waitForSubmissionStatus(submissionId, "closed");
    const task = await db.approvalTask.findFirst({
      where: {
        submissionId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    expect(task?.status).toBe("approved");

    await signOut(page);
    await signInAs(page, "submitter@example.com");
    await page.goto(`/en/submissions/${submissionId}`);
    await expect(page.getByText("No further action is required from this screen right now.")).toBeVisible();
  });

  test("revision requests return the case to the submitter and allow resubmission", async ({
    page,
  }) => {
    const { title } = await seedPublishedFormScenario("Revision loop");

    await signInAs(page, "submitter@example.com");
    await page.goto("/en/submissions");
    await page.getByRole("link", { name: title }).click();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page).toHaveURL(/\/submissions\/.+/);
    const submissionId = extractSubmissionId(page.url());

    await signOut(page);
    await signInAs(page, "approver@example.com");
    await page.goto("/en/inbox");
    await page.getByRole("link", { name: "Open submission" }).first().click();
    await page.getByRole("button", { name: "Request revision" }).click();
    await page.getByPlaceholder("Add context for the audit trail or the submitter.").fill(
      "Please add a little more detail.",
    );
    await page.getByRole("button", { name: "Confirm decision" }).click();

    await waitForSubmissionStatus(submissionId, "needs_revision");

    await signOut(page);
    await signInAs(page, "submitter@example.com");
    await page.goto(`/en/submissions/${submissionId}`);
    await expect(page.getByText("Please add a little more detail.")).toBeVisible();
    await page.getByRole("link", { name: "Edit and resubmit" }).click();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page).toHaveURL(new RegExp(`/submissions/${submissionId}$`));

    const replacementTask = await waitForApprovalTask(submissionId);
    expect(replacementTask?.status).toBe("pending");

    await signOut(page);
    await signInAs(page, "approver@example.com");
    await page.goto(`/en/submissions/${submissionId}`);
    await page.getByRole("button", { name: "Approve" }).click();
    await page.getByRole("button", { name: "Confirm decision" }).click();
    await waitForSubmissionStatus(submissionId, "closed");
  });

  test("submitters cannot access admin screens and approvers can reject submissions", async ({
    page,
  }) => {
    const { title } = await seedPublishedFormScenario("Reject path");

    await signInAs(page, "submitter@example.com");
    await page.goto("/en/admin/forms");
    await expect(page).toHaveURL(/\/submissions$/);

    await page.goto("/en/submissions");
    await page.getByRole("link", { name: title }).click();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page).toHaveURL(/\/submissions\/.+/);
    const submissionId = extractSubmissionId(page.url());

    await signOut(page);
    await signInAs(page, "approver@example.com");
    await page.goto(`/en/submissions/${submissionId}`);
    await page.getByRole("button", { name: "Reject" }).click();
    await page.getByPlaceholder("Add context for the audit trail or the submitter.").fill(
      "Rejected in browser test.",
    );
    await page.getByRole("button", { name: "Confirm decision" }).click();

    await waitForSubmissionStatus(submissionId, "closed");
    const task = await db.approvalTask.findFirst({
      where: {
        submissionId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    expect(task?.status).toBe("rejected");
  });
});

function extractSubmissionId(url: string) {
  const match = new URL(url).pathname.match(/\/submissions\/([^/]+)/);

  if (!match) {
    throw new Error(`Expected a submission URL, received ${url}`);
  }

  return match[1];
}

async function seedFreshWorkflow() {
  await resetDatabase();
  const users = await seedBaseUsers();
  await createWorkflowFixture({
    createdById: users.admin.id,
    approverId: users.approver.id,
    name: "Basic approval",
  });

  return users;
}

async function seedPublishedFormScenario(prefix: string) {
  const users = await seedFreshWorkflow();
  const form = await createFormFixture({
    createdById: users.admin.id,
    workflowId: (
      await db.workflow.findFirstOrThrow({
        where: { name: "Basic approval" },
      })
    ).id,
    status: "published",
    title: `${prefix} ${Date.now()}`,
  });

  return {
    users,
    title: form.title,
    slug: form.slug,
  };
}
