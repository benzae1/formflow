import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/page-auth";
import InboxClient from "./InboxClient";

type SearchParams = Promise<{
  view?: string;
}>;

export default async function InboxPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requirePageRole(["admin", "approver"]);
  const filters = await searchParams;
  const view = filters.view ?? "pending";
  const now = new Date();

  const tasks = await db.approvalTask.findMany({
    where: {
      assignedToId: user.id,
      ...(view === "overdue"
        ? {
            status: "pending",
            dueAt: { lt: now },
          }
        : view === "completed"
          ? {
              status: {
                in: ["approved", "rejected", "revision_requested"],
              },
            }
          : {
              status: "pending",
            }),
    },
    include: {
      submission: {
        include: {
          form: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return <InboxClient tasks={tasks} view={view} />;
}
