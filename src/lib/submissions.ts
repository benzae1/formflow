import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { filterSubmissionDataForUser } from "@/lib/formio-data";
import { submissionVisibilityWhere } from "@/lib/submission-visibility";

export type VisibleSubmissionUser = {
  id: string;
  roles: string[];
};

export type VisibleSubmissionRecord = Prisma.SubmissionGetPayload<{
  include: {
    form: {
      include: {
        workflow: true;
      };
    };
    submittedBy: true;
    approvalTasks: {
      include: {
        assignedTo: true;
      };
    };
    childSubmissions: {
      include: {
        form: true;
      };
    };
    parentSubmission: {
      include: {
        form: true;
      };
    };
  };
}>;

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

export async function auditSubmissionListAccess(input: {
  actorId: string;
  scope: string;
  filters?: Record<string, string | undefined>;
  reason?: string;
  resultCount: number;
  source: "api" | "page";
}) {
  await writeAuditLog({
    actorId: input.actorId,
    action: input.reason ? "sensitive.list_accessed" : "submission_list.viewed",
    resourceType: "submission_list",
    resourceId: input.scope,
    metadata: {
      filters: input.filters,
      reason: input.reason,
      resultCount: input.resultCount,
      source: input.source,
    },
  });
}

export function presentSubmissionForUser<
  T extends {
    form: { schema: Record<string, unknown> };
    submittedById: string;
    data: Record<string, unknown>;
    formSchemaSnapshot?: unknown;
  },
>(submission: T, user: VisibleSubmissionUser) {
  const schema = getSubmissionSchema(submission);

  return {
    ...submission,
    data: filterSubmissionDataForUser({
      schema,
      data: submission.data,
      userRoles: user.roles,
      isOwner: submission.submittedById === user.id,
    }),
  };
}

export function getSubmissionSchema<
  T extends {
    form: { schema: Record<string, unknown> };
    formSchemaSnapshot?: unknown;
  },
>(submission: T) {
  if (
    submission.formSchemaSnapshot &&
    typeof submission.formSchemaSnapshot === "object" &&
    !Array.isArray(submission.formSchemaSnapshot)
  ) {
    return submission.formSchemaSnapshot as Record<string, unknown>;
  }

  return submission.form.schema;
}

export async function getVisibleSubmissionById(input: {
  submissionId: string;
  user: VisibleSubmissionUser;
}): Promise<VisibleSubmissionRecord | null> {
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
