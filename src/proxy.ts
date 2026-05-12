import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { defaultLocale, isLocale } from "@/lib/i18n/config";

const PUBLIC_FILE = /\.(.*)$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/__nextjs") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const maybeLocale = pathname.split("/")[1];
  if (maybeLocale && isLocale(maybeLocale)) {
    return NextResponse.next();
  }

  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(nextUrl);
}

export const config = {
  matcher: "/:path*",
};
