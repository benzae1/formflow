import type { Metadata } from "next";
import { headers } from "next/headers";
import { Barlow_Semi_Condensed } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import { defaultLocale, isLocale } from "@/lib/i18n/config";

const barlow = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-barlow",
});

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
    <html lang={locale} className={barlow.variable}>
      <body className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
        {children}
      </body>
    </html>
  );
}
