import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { defaultLocale, isLocale } from "@/lib/i18n/config";

const PUBLIC_FILE = /\.(.*)$/;
function getContentSecurityPolicy(pathname: string) {
  // @formio/js renders the builder UI via Function()-compiled templates, which needs unsafe-eval.
  // The builder is reached through client-side navigation, so the CSP of the originating admin
  // page governs eval — scope unsafe-eval to the whole (authenticated, role-gated) admin area
  // rather than just the builder route. Public/submission routes stay locked down.
  const needsEval =
    process.env.NODE_ENV === "development" || /\/admin(?:\/|$)/.test(pathname);
  // The builder loads the ACE code editor (used by JSON/custom-code panels) from
  // cdn.form.io, which then fetches its mode/worker files at runtime. Allow that
  // origin for the same authenticated admin/dev scope as unsafe-eval; public and
  // submission routes stay locked to 'self'.
  const aceCdn = "https://cdn.form.io";
  const scriptSrc = needsEval
    ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${aceCdn}`
    : "script-src 'self' 'unsafe-inline'";
  const connectSrc = needsEval ? `connect-src 'self' ${aceCdn}` : "connect-src 'self'";
  // ACE spawns its syntax-check worker from a blob: URL. worker-src falls back to
  // script-src (which forbids blob:), so set it explicitly for the admin/dev scope.
  const workerSrc = needsEval ? "worker-src 'self' blob:" : "worker-src 'self'";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    connectSrc,
    scriptSrc,
    workerSrc,
    "style-src 'self' 'unsafe-inline'",
  ].join("; ");
}

function withSecurityHeaders(response: NextResponse, pathname: string) {
  response.headers.set("Content-Security-Policy", getContentSecurityPolicy(pathname));
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return response;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const maybeLocale = pathname.split("/")[1];
  const locale = maybeLocale && isLocale(maybeLocale) ? maybeLocale : defaultLocale;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-formflow-locale", locale);

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/__nextjs") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return withSecurityHeaders(
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      }),
      pathname,
    );
  }

  if (maybeLocale && isLocale(maybeLocale)) {
    return withSecurityHeaders(
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      }),
      pathname,
    );
  }

  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return withSecurityHeaders(NextResponse.redirect(nextUrl), pathname);
}

export const config = {
  matcher: "/:path*",
};
