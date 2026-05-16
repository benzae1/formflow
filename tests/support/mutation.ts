import { buildMutationHeaders, CSRF_COOKIE } from "../../src/lib/csrf";

const TEST_CSRF_TOKEN = "test-csrf-token";

export function createMutationRequestHeaders(
  init: Record<string, string> = {},
) {
  return {
    origin: "http://localhost",
    referer: "http://localhost/test",
    cookie: `${CSRF_COOKIE}=${TEST_CSRF_TOKEN}`,
    ...buildMutationHeaders(TEST_CSRF_TOKEN),
    ...init,
  };
}
