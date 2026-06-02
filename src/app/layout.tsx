import type { Metadata } from "next";
import { headers } from "next/headers";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import { defaultLocale, isLocale } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "Bauhaus Forms",
  description: "Workflow platform for secure forms, approvals, and compliance review.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const localeHeader = (await headers()).get("x-formflow-locale");
  const locale = localeHeader && isLocale(localeHeader) ? localeHeader : defaultLocale;

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
        {children}
      </body>
    </html>
  );
}
