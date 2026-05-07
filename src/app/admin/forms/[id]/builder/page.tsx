import BuilderClient from "./BuilderClient";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);

  const { id } = await params;

  const form = await db.form.findUnique({
    where: { id },
  });

  if (!form) {
    return <div>Form not found.</div>;
  }

  return <BuilderClient form={form} />;
}
