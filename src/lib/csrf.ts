import { randomUUID } from "node:crypto";

export const MUTATION_HEADER = "x-formflow-intent";
export const MUTATION_HEADER_VALUE = "mutation";
export const CSRF_HEADER = "x-formflow-csrf";
export const CSRF_COOKIE = "formflow-csrf";

export function createCsrfToken() {
  return randomUUID();
}

export function parseCookieHeader(cookieHeader: string | null) {
  return Object.fromEntries(
    (cookieHeader ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf("=");
        if (separatorIndex === -1) {
          return [part, ""];
        }

        return [
          part.slice(0, separatorIndex),
          decodeURIComponent(part.slice(separatorIndex + 1)),
        ];
      }),
  );
}

export function getCsrfCookieValue(request: Request) {
  return parseCookieHeader(request.headers.get("cookie"))[CSRF_COOKIE] ?? null;
}

export function buildCsrfCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${CSRF_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Strict${secure}`;
}

export function buildMutationHeaders(token: string) {
  return {
    [MUTATION_HEADER]: MUTATION_HEADER_VALUE,
    [CSRF_HEADER]: token,
  } as const;
}
