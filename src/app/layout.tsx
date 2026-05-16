import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bauhaus Forms",
  description: "Workflow platform for secure forms, approvals, and compliance review.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
        {children}
      </body>
    </html>
  );
}
