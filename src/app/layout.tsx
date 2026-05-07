import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FormFlow",
  description:
    "Internal workflow platform for secure forms, approvals, compliance review, and operational oversight.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[var(--canvas)] text-[var(--ink)] antialiased">
        {children}
      </body>
    </html>
  );
}
