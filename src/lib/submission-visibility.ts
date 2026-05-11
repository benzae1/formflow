import { Prisma } from "@prisma/client";
import { AppRole } from "@/domain/roles";

export function submissionVisibilityWhere(user: {
  id: string;
  roles: AppRole[];
}, options?: {
  includeSensitive?: boolean;
}): Prisma.SubmissionWhereInput {
  const includeSensitive = options?.includeSensitive ?? false;

  if (user.roles.includes("admin") || user.roles.includes("compliance")) {
    if (includeSensitive) {
      return {};
    }

    return {
      form: {
        sensitivity: "standard",
      },
    };
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
