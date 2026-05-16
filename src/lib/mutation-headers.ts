import {
  buildMutationHeaders,
  CSRF_COOKIE,
  createCsrfToken,
} from "./csrf";

let csrfRequest: Promise<string> | null = null;

export async function getMutationHeaders() {
  const token = await getOrCreateCsrfToken();
  return buildMutationHeaders(token);
}

function readCsrfTokenFromDocument() {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CSRF_COOKIE}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(CSRF_COOKIE.length + 1));
}

async function getOrCreateCsrfToken() {
  const existing = readCsrfTokenFromDocument();
  if (existing) {
    return existing;
  }

  csrfRequest ??= fetch("/api/csrf", {
    credentials: "same-origin",
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Could not initialize CSRF protection.");
      }

      const payload = (await response.json()) as { csrfToken?: string };
      if (payload.csrfToken) {
        return payload.csrfToken;
      }

      const fallback = createCsrfToken();
      document.cookie = `${CSRF_COOKIE}=${encodeURIComponent(fallback)}; Path=/; SameSite=Strict`;
      return fallback;
    })
    .finally(() => {
      csrfRequest = null;
    });

  return csrfRequest;
}
