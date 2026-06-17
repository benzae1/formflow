import { db } from "./db";
import { ApiError } from "./errors";

export async function requirePendingApprovalTask(input: {
  submissionId: string;
  taskId: string;
  actorId: string;
}) {
  const task = await db.approvalTask.findFirst({
    where: {
      id: input.taskId,
      submissionId: input.submissionId,
      status: "pending",
    },
  });

  if (!task) {
    throw new ApiError(
      "APPROVAL_TASK_NOT_FOUND",
      "The approval task no longer exists or is no longer pending.",
      404,
    );
  }

  if (task.assignedToId !== input.actorId) {
    throw new ApiError(
      "FORBIDDEN",
      "You can only act on approval tasks assigned to you.",
      403,
    );
  }

  return task;
}
