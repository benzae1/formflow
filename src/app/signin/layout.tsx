import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bauhaus Forms · Sign in",
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
