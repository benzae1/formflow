import { Prisma } from "@prisma/client";
import { AppRole } from "@/domain/roles";

export function submissionVisibilityWhere(user: {
  id: string;
  roles: AppRole[];
  teamScope?: boolean;
  orgUnitIds?: string[];
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
    const ownAndAssigned: Prisma.SubmissionWhereInput[] = [
      { submittedById: user.id },
      {
        approvalTasks: {
          some: {
            assignedToId: user.id,
          },
        },
      },
    ];

    if (user.teamScope && user.orgUnitIds && user.orgUnitIds.length > 0) {
      ownAndAssigned.push({
        submittedBy: {
          memberships: {
            some: {
              orgUnitId: { in: user.orgUnitIds },
            },
          },
        },
      });
    }

    return { OR: ownAndAssigned };
  }

  return {
    submittedById: user.id,
  };
}
