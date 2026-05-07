import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import InboxClient from "./InboxClient";

export default async function InboxPage() {
  const session = await getSession();

  if (!session?.user) {
    return <div>Please sign in.</div>;
  }

  const userId = (session.user as { id: string }).id;

  const tasks = await db.approvalTask.findMany({
    where: {
      assignedToId: userId,
      status: "pending",
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

  return <InboxClient tasks={tasks} />;
}
