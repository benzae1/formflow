import { ApiError } from "./errors";
import {
  CSRF_HEADER,
  MUTATION_HEADER,
  MUTATION_HEADER_VALUE,
  getCsrfCookieValue,
} from "./csrf";

export function assertMutationRequest(request: Request) {
  if (request.headers.get(MUTATION_HEADER) !== MUTATION_HEADER_VALUE) {
    throw new ApiError(
      "INVALID_MUTATION_REQUEST",
      "Mutating requests must come from the FormFlow application shell.",
      403,
    );
  }

  const csrfHeader = request.headers.get(CSRF_HEADER);
  const csrfCookie = getCsrfCookieValue(request);

  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    throw new ApiError(
      "INVALID_CSRF_TOKEN",
      "Mutating requests must include a valid CSRF token.",
      403,
    );
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const requestUrl = new URL(request.url);
  const allowedOrigins = getAllowedOrigins(requestUrl);

  if (!origin) {
    throw new ApiError(
      "MISSING_ORIGIN",
      "This request is missing an Origin header.",
      403,
    );
  }

  if (!allowedOrigins.has(origin)) {
    throw new ApiError(
      "UNTRUSTED_ORIGIN",
      "This request origin is not allowed.",
      403,
    );
  }

  if (!referer) {
    throw new ApiError(
      "MISSING_REFERER",
      "This request is missing a Referer header.",
      403,
    );
  }

  const refererOrigin = new URL(referer).origin;
  if (!allowedOrigins.has(refererOrigin)) {
    throw new ApiError(
      "UNTRUSTED_REFERER",
      "This request referer is not allowed.",
      403,
    );
  }
}

function getAllowedOrigins(requestUrl: URL) {
  const origins = new Set<string>([requestUrl.origin]);
  const appUrl = process.env.NEXTAUTH_URL?.trim() || process.env.APP_URL?.trim();

  if (appUrl) {
    origins.add(new URL(appUrl).origin);
  }

  return origins;
}
