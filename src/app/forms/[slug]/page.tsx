import { db } from "@/lib/db";
import SubmitFormClient from "./SubmitFormClient";

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const form = await db.form.findUnique({
    where: { slug },
  });

  if (!form || form.status !== "published") {
    return <div>Form not available.</div>;
  }

  return <SubmitFormClient form={form} />;
}
