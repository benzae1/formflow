import BuilderClient from "./BuilderClient";
import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/page-auth";
import type { FormBuilderSchema } from "@/components/form-builder/FormBuilder";

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageRole(["admin"]);

  const { id } = await params;

  const form = await db.form.findUnique({
    where: { id },
    include: {
      workflow: true,
    },
  });

  const workflows = await db.workflow.findMany({
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!form) {
    return <div>Form not found.</div>;
  }

  return (
    <BuilderClient
      form={{
        ...form,
        schema: (form.schema ?? { components: [] }) as FormBuilderSchema,
      }}
      workflows={workflows}
    />
  );
}
