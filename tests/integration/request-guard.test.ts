import { beforeEach, describe, expect, test } from "vitest";
import { POST as createFormRoute } from "../../src/app/api/forms/route";
import { resetDatabase, seedBaseUsers, uniqueSlug } from "../support/fixtures";
import { createMutationRequestHeaders } from "../support/mutation";
import { parseJson } from "../support/response";
import { setMockSession } from "../support/vitest.setup";

const validSchema = {
  display: "form",
  components: [
    {
      type: "textfield",
      key: "requestTitle",
      label: "Request title",
      input: true,
    },
    {
      type: "button",
      action: "submit",
      label: "Submit",
      theme: "primary",
    },
  ],
};

async function sendCreateFormRequest(headers: Record<string, string>) {
  return createFormRoute(
    new Request("http://localhost/api/forms", {
      method: "POST",
      headers,
      body: JSON.stringify({
        slug: uniqueSlug("guarded"),
        title: "Guarded form",
        sensitivity: "standard",
        schema: validSchema,
      }),
    }),
  );
}

describe("mutation request guard", () => {
  beforeEach(async () => {
    await resetDatabase();
    const { admin } = await seedBaseUsers();
    setMockSession(admin);
  });

  test("rejects requests with a missing CSRF token", async () => {
    const headers: Record<string, string> = {
      ...createMutationRequestHeaders({
        "Content-Type": "application/json",
      }),
    };
    delete headers["x-formflow-csrf"];

    const response = await sendCreateFormRequest(headers);
    const payload = await parseJson<{ error: { code: string } }>(response);

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("INVALID_CSRF_TOKEN");
  });

  test("rejects requests with a bad CSRF token", async () => {
    const response = await sendCreateFormRequest(
      createMutationRequestHeaders({
        "Content-Type": "application/json",
        "x-formflow-csrf": "mismatch",
      }),
    );
    const payload = await parseJson<{ error: { code: string } }>(response);

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("INVALID_CSRF_TOKEN");
  });

  test("rejects requests with a missing Origin header", async () => {
    const headers: Record<string, string> = {
      ...createMutationRequestHeaders({
        "Content-Type": "application/json",
      }),
    };
    delete headers.origin;

    const response = await sendCreateFormRequest(headers);
    const payload = await parseJson<{ error: { code: string } }>(response);

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("MISSING_ORIGIN");
  });

  test("rejects requests with an untrusted Referer", async () => {
    const response = await sendCreateFormRequest(
      createMutationRequestHeaders({
        "Content-Type": "application/json",
        referer: "https://evil.example.test/form",
      }),
    );
    const payload = await parseJson<{ error: { code: string } }>(response);

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("UNTRUSTED_REFERER");
  });
});
