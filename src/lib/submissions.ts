import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { filterSubmissionDataForUser } from "@/lib/field-access";
import { submissionVisibilityWhere } from "@/lib/submission-visibility";
import { AppRole } from "@/domain/roles";

export type VisibleSubmissionUser = {
  id: string;
  roles: AppRole[];
};

export async function auditSubmissionAccess(input: {
  actorId: string;
  submissionId: string;
  sensitivity: "standard" | "pii" | "sensitive";
  reason: string;
}) {
  await writeAuditLog({
    actorId: input.actorId,
    action: "submission.viewed",
    resourceType: "submission",
    resourceId: input.submissionId,
    metadata: {
      reason: input.reason,
    },
  });

  if (input.sensitivity === "sensitive") {
    await writeAuditLog({
      actorId: input.actorId,
      action: "sensitive.accessed",
      resourceType: "submission",
      resourceId: input.submissionId,
      metadata: {
        reason: input.reason,
      },
    });
  }
}

export function presentSubmissionForUser<
  T extends {
    form: { schema: Record<string, unknown> };
    submittedById: string;
    data: Record<string, unknown>;
  },
>(submission: T, user: VisibleSubmissionUser) {
  return {
    ...submission,
    data: filterSubmissionDataForUser({
      schema: submission.form.schema,
      data: submission.data,
      userRoles: user.roles,
      isOwner: submission.submittedById === user.id,
    }),
  };
}

export async function getVisibleSubmissionById(input: {
  submissionId: string;
  user: VisibleSubmissionUser;
}) {
  const submission = await db.submission.findFirst({
    where: {
      id: input.submissionId,
      ...submissionVisibilityWhere(input.user),
    },
    include: {
      form: {
        include: {
          workflow: true,
        },
      },
      submittedBy: true,
      approvalTasks: {
        include: {
          assignedTo: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      childSubmissions: {
        include: {
          form: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      parentSubmission: {
        include: {
          form: true,
        },
      },
    },
  });

  return submission;
}
