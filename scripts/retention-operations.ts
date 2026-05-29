import { db } from "../src/lib/db";

type RetentionMode = "report" | "purge";

function getMode(): RetentionMode {
  return process.argv.includes("--purge") ? "purge" : "report";
}

async function buildReport(now: Date) {
  const [
    submissionsEligible,
    tasksEligible,
    notificationsEligible,
    auditLogsDueForReview,
  ] = await Promise.all([
    db.submission.count({
      where: {
        OR: [
          { purgeAt: { lte: now } },
          { deletedAt: { not: null } },
        ],
      },
    }),
    db.approvalTask.count({
      where: {
        purgeAt: { lte: now },
      },
    }),
    db.notification.count({
      where: {
        purgeAt: { lte: now },
      },
    }),
    db.auditLog.count({
      where: {
        retainUntil: { lte: now },
      },
    }),
  ]);

  return {
    checkedAt: now.toISOString(),
    eligible: {
      submissions: submissionsEligible,
      approvalTasks: tasksEligible,
      notifications: notificationsEligible,
      auditLogsDueForReview,
    },
  };
}

async function purgeEligibleRecords(now: Date) {
  const deletedNotifications = await db.notification.deleteMany({
    where: {
      purgeAt: { lte: now },
    },
  });

  const deletedApprovalTasks = await db.approvalTask.deleteMany({
    where: {
      purgeAt: { lte: now },
    },
  });

  const deletedSubmissions = await db.submission.deleteMany({
    where: {
      OR: [
        { purgeAt: { lte: now } },
        { deletedAt: { not: null } },
      ],
    },
  });

  return {
    purgedAt: now.toISOString(),
    deleted: {
      notifications: deletedNotifications.count,
      approvalTasks: deletedApprovalTasks.count,
      submissions: deletedSubmissions.count,
    },
    notes: [
      "AuditLog rows are reported but never auto-purged by this script.",
      "Review retainUntil and exportedForDsarAt in AuditLog separately before deletion.",
    ],
  };
}

async function main() {
  const now = new Date();
  const mode = getMode();
  const report = await buildReport(now);

  if (mode === "report") {
    console.log(JSON.stringify({ mode, ...report }, null, 2));
    return;
  }

  const purged = await purgeEligibleRecords(now);
  console.log(JSON.stringify({ mode, ...report, ...purged }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
