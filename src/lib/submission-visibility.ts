import { AppRole } from "@/domain/roles";

export function submissionVisibilityWhere(user: {
  id: string;
  roles: AppRole[];
}) {
  if (user.roles.includes("admin") || user.roles.includes("compliance")) {
    return {};
  }

  if (user.roles.includes("approver")) {
    return {
      OR: [
        { submittedById: user.id },
        {
          approvalTasks: {
            some: {
              assignedToId: user.id,
            },
          },
        },
      ],
    };
  }

  return {
    submittedById: user.id,
  };
}
