import { ApiError } from "./errors";

const MUTATION_HEADER = "x-formflow-intent";
const MUTATION_HEADER_VALUE = "mutation";

export function assertMutationRequest(request: Request) {
  if (request.headers.get(MUTATION_HEADER) !== MUTATION_HEADER_VALUE) {
    throw new ApiError(
      "INVALID_MUTATION_REQUEST",
      "Mutating requests must come from the FormFlow application shell.",
      403,
    );
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const requestUrl = new URL(request.url);
  const allowedOrigins = getAllowedOrigins(requestUrl);

  if (origin && !allowedOrigins.has(origin)) {
    throw new ApiError(
      "UNTRUSTED_ORIGIN",
      "This request origin is not allowed.",
      403,
    );
  }

  if (referer) {
    const refererOrigin = new URL(referer).origin;
    if (!allowedOrigins.has(refererOrigin)) {
      throw new ApiError(
        "UNTRUSTED_REFERER",
        "This request referer is not allowed.",
        403,
      );
    }
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
