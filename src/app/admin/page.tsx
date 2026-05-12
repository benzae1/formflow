import Link from "next/link";
import { getTemporalClient } from "@/lib/temporal";
import { requirePageRole } from "@/lib/page-auth";
import { db } from "@/lib/db";

async function getFailedTemporalWorkflowCount() {
  try {
    const temporal = await getTemporalClient();
    const result = await temporal.workflow.count('ExecutionStatus = "Failed"');
    return result.count;
  } catch {
    return null;
  }
}

function formatSyncTime(value: Date | null) {
  if (!value) return "No sync recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

/* ── Bauhaus primitive shapes ── */
function Primitive({
  shape,
  color,
  size = 36,
}: {
  shape: "circle" | "square" | "triangle";
  color: string;
  size?: number;
}) {
  if (shape === "circle")
    return (
      <div
        style={{
          width: size,
          height: size,
          background: color,
          borderRadius: "50%",
          flexShrink: 0,
        }}
      />
    );
  if (shape === "square")
    return (
      <div
        style={{ width: size, height: size, background: color, flexShrink: 0 }}
      />
    );
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <polygon points="20,2 38,36 2,36" fill={color} />
    </svg>
  );
}

type TileStat = { l: string; v: string | number; accent?: boolean };
type Tile = {
  id: string;
  href: string;
  title: string;
  sub: string;
  mark: { shape: "circle" | "square" | "triangle"; color: string };
  stats: TileStat[];
};

function TileCard({ tile }: { tile: Tile }) {
  return (
    <Link
      href={tile.href}
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line-strong)",
        padding: "28px 28px 24px",
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        position: "relative",
      }}
      className="group"
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <Primitive shape={tile.mark.shape} color={tile.mark.color} size={28} />
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-.01em",
              lineHeight: 1,
            }}
          >
            {tile.title}
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "var(--muted)",
              lineHeight: 1.4,
              marginTop: 8,
              maxWidth: "44ch",
            }}
          >
            {tile.sub}
          </p>
        </div>
      </div>

      <span
        style={{
          position: "absolute",
          top: 26,
          right: 28,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          opacity: 0,
          transition: "opacity 150ms",
        }}
        className="group-hover:opacity-100"
      >
        Open →
      </span>

      <div
        style={{
          display: "flex",
          borderTop: "1px solid var(--line)",
          paddingTop: 18,
          marginTop: "auto",
        }}
      >
        {tile.stats.map((stat, i) => (
          <div
            key={stat.l}
            style={{
              flex: 1,
              paddingRight: i < tile.stats.length - 1 ? 16 : 0,
              paddingLeft: i > 0 ? 16 : 0,
              borderLeft: i > 0 ? "1px solid var(--line)" : "none",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--muted)",
                marginBottom: 4,
              }}
            >
              {stat.l}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-.02em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                color: stat.accent ? "var(--accent)" : "var(--ink)",
              }}
            >
              {stat.v}
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const user = await requirePageRole(["admin", "compliance"]);
  const now = new Date();

  const [
    formsDraft,
    formsPublished,
    formsArchived,
    submissionsSubmitted,
    submissionsInReview,
    submissionsNeedsRevision,
    submissionsApproved,
    submissionsRejected,
    submissionsClosed,
    overdueTasks,
    activeWorkflows,
    totalUsers,
    deactivatedUsers,
    latestSyncedUser,
    failedTemporalWorkflows,
  ] = await Promise.all([
    db.form.count({ where: { status: "draft" } }),
    db.form.count({ where: { status: "published" } }),
    db.form.count({ where: { status: "archived" } }),
    db.submission.count({ where: { status: "submitted" } }),
    db.submission.count({ where: { status: "in_review" } }),
    db.submission.count({ where: { status: "needs_revision" } }),
    db.submission.count({ where: { status: "approved" } }),
    db.submission.count({ where: { status: "rejected" } }),
    db.submission.count({ where: { status: "closed" } }),
    db.approvalTask.count({ where: { status: "pending", dueAt: { lt: now } } }),
    db.submission.count({
      where: {
        workflowRunId: { not: null },
        status: { in: ["submitted", "in_review", "needs_revision"] },
      },
    }),
    db.user.count(),
    db.user.count({ where: { deactivatedAt: { not: null } } }),
    db.user.findFirst({
      where: { externalId: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    getFailedTemporalWorkflowCount(),
  ]);

  const isComplianceOnly =
    user.roles.includes("compliance") && !user.roles.includes("admin");

  const pipelineStages = [
    {
      id: "submitted",
      label: "Submitted",
      num: submissionsSubmitted,
      delta: null,
      attn: false,
      hex: "#FFD100",
    },
    {
      id: "in_review",
      label: "In Review",
      num: submissionsInReview,
      delta: overdueTasks > 0 ? `${overdueTasks} overdue` : null,
      attn: overdueTasks > 0 && submissionsInReview > 0,
      hex: "#ED8B00",
    },
    {
      id: "revision",
      label: "Needs Revision",
      num: submissionsNeedsRevision,
      delta: null,
      attn: false,
      hex: "#A50050",
    },
    {
      id: "approved",
      label: "Approved",
      num: submissionsApproved,
      delta: null,
      attn: false,
      hex: "#84BD00",
    },
    {
      id: "rejected",
      label: "Rejected",
      num: submissionsRejected,
      delta: null,
      attn: false,
      hex: "#D22630",
    },
    {
      id: "closed",
      label: "Closed",
      num: submissionsClosed,
      delta: "Archive",
      attn: false,
      hex: "#00677F",
    },
  ];

  const tiles: Tile[] = isComplianceOnly
    ? [
        {
          id: "submissions",
          href: "/admin/submissions",
          title: "Submissions",
          sub: "Pipeline from newly submitted work through final outcomes.",
          mark: { shape: "square", color: "#FFD100" },
          stats: [
            { l: "In Review", v: submissionsInReview },
            { l: "Needs Revision", v: submissionsNeedsRevision, accent: submissionsNeedsRevision > 0 },
            { l: "Approved", v: submissionsApproved },
          ],
        },
        {
          id: "audit",
          href: "/admin/audit-log",
          title: "Audit Log",
          sub: "Sensitive access trails and compliance-significant events.",
          mark: { shape: "square", color: "#A50050" },
          stats: [
            {
              l: "Sensitive",
              v:
                submissionsInReview +
                submissionsApproved +
                submissionsRejected +
                submissionsClosed,
            },
            { l: "Overdue alerts", v: overdueTasks, accent: overdueTasks > 0 },
            {
              l: "Failed workflows",
              v: failedTemporalWorkflows ?? "—",
            },
          ],
        },
      ]
    : [
        {
          id: "forms",
          href: "/admin/forms",
          title: "Forms",
          sub: "Publication status and builder access.",
          mark: { shape: "square", color: "#D22630" },
          stats: [
            { l: "Drafts", v: formsDraft },
            { l: "Published", v: formsPublished },
            { l: "Archived", v: formsArchived },
          ],
        },
        {
          id: "wf",
          href: "/admin/workflows",
          title: "Workflow Health",
          sub: "Execution pressure, SLA risk, and Temporal failures.",
          mark: { shape: "triangle", color: "#FFD100" },
          stats: [
            { l: "Active", v: activeWorkflows },
            { l: "Overdue", v: overdueTasks, accent: overdueTasks > 0 },
            { l: "Errors", v: failedTemporalWorkflows ?? "—" },
          ],
        },
        {
          id: "users",
          href: "/admin/users",
          title: "Users",
          sub: "Directory and lifecycle events.",
          mark: { shape: "circle", color: "#00677F" },
          stats: [
            { l: "Total", v: totalUsers },
            { l: "Active", v: totalUsers - deactivatedUsers },
            { l: "Deactivated", v: deactivatedUsers },
          ],
        },
        {
          id: "audit",
          href: "/admin/audit-log",
          title: "Audit Log",
          sub: "Sensitive access trails and compliance-significant events.",
          mark: { shape: "square", color: "#A50050" },
          stats: [
            {
              l: "Sensitive",
              v:
                submissionsInReview +
                submissionsApproved +
                submissionsRejected +
                submissionsClosed,
            },
            { l: "Overdue alerts", v: overdueTasks, accent: overdueTasks > 0 },
            { l: "Failed workflows", v: failedTemporalWorkflows ?? "—" },
          ],
        },
      ];

  const syncTime = formatSyncTime(latestSyncedUser?.updatedAt ?? null);
  const syncOk = !!latestSyncedUser;

  return (
    <div>
      {/* ── Hero ── */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 40,
          alignItems: "end",
          marginBottom: 56,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: "var(--ink)",
            }}
          >
            {isComplianceOnly ? "Compliance" : "Admin"} · Operations
          </div>
          <div
            style={{
              height: 2,
              background: "var(--ink)",
              margin: "12px 0 20px",
              width: 64,
            }}
          />
          <div
            style={{
              fontSize: "clamp(64px, 8vw, 112px)",
              fontWeight: 800,
              lineHeight: 0.85,
              letterSpacing: "-.035em",
              color: "var(--ink)",
            }}
          >
            {isComplianceOnly ? (
              <>
                Oversight<span style={{ color: "var(--accent)" }}>.</span>
              </>
            ) : (
              <>
                Operations<span style={{ color: "var(--accent)" }}>.</span>
              </>
            )}
          </div>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.4,
              maxWidth: "38ch",
              marginTop: 22,
              color: "var(--ink)",
            }}
          >
            Bauhaus Forms — submission pipeline, workflows, and directory at a
            glance.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 28,
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "flex-end" }} aria-hidden="true">
            <Primitive shape="circle" color="#00677F" size={36} />
            <Primitive shape="square" color="#D22630" size={36} />
            <Primitive shape="triangle" color="#FFD100" size={36} />
          </div>
          {user.roles.includes("admin") && (
            <div style={{ display: "flex" }}>
              <Link
                href="/admin/forms"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "14px 22px",
                  background: "#000",
                  color: "#fff",
                  border: "1px solid #000",
                  textDecoration: "none",
                  transition: "background 150ms",
                }}
              >
                Manage forms
              </Link>
              <Link
                href="/admin/workflows"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "14px 22px",
                  background: "var(--panel)",
                  color: "var(--ink)",
                  border: "1px solid var(--line-strong)",
                  borderLeft: "none",
                  textDecoration: "none",
                  transition: "background 150ms",
                }}
              >
                Review workflows
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Org-sync strip ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto auto auto",
          alignItems: "center",
          gap: 24,
          background: "var(--panel)",
          border: "1px solid var(--line)",
          padding: "16px 24px",
          marginBottom: 24,
          fontSize: 13,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            padding: "4px 10px",
            background: "var(--ink)",
            color: "var(--panel)",
          }}
        >
          Org Sync
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "var(--muted)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              background: syncOk ? "#84BD00" : "var(--muted)",
              display: "inline-block",
            }}
          />
          {syncOk
            ? "Directory current — no inactive identities detected"
            : "No sync recorded"}
        </span>
        <span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginRight: 8,
            }}
          >
            Last sync
          </span>
          <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {syncTime}
          </span>
        </span>
        <span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginRight: 8,
            }}
          >
            Users
          </span>
          <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {totalUsers}
          </span>
        </span>
        <Link
          href="/admin/org"
          style={{
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            padding: "6px 12px",
            border: "1px solid var(--line-strong)",
          }}
        >
          Open →
        </Link>
      </div>

      {/* ── Submissions pipeline ── */}
      <section
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line-strong)",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "28px 32px 20px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: "-.01em",
                lineHeight: 1,
              }}
            >
              Submissions
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: "50ch", lineHeight: 1.4 }}>
              Pipeline from newly submitted work through final outcomes.
            </p>
          </div>
          <Link
            href="/admin/submissions"
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              textDecoration: "none",
              padding: "8px 14px",
              border: "1px solid var(--line-strong)",
              whiteSpace: "nowrap",
            }}
          >
            Open pipeline →
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
          }}
        >
          {pipelineStages.map((stage, i) => (
            <div
              key={stage.id}
              style={{
                padding: "28px 24px",
                borderRight:
                  i < pipelineStages.length - 1
                    ? "1px solid var(--line)"
                    : "none",
                position: "relative",
                background: stage.attn ? "var(--canvas)" : "transparent",
              }}
            >
              {/* color swatch */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 24,
                  height: 4,
                  background: stage.hex,
                }}
              />
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginBottom: 10,
                }}
              >
                {stage.label}
              </div>
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 800,
                  letterSpacing: "-.03em",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  color: stage.attn ? "var(--accent)" : "var(--ink)",
                }}
              >
                {stage.num}
              </div>
              {stage.delta && (
                <div
                  style={{
                    fontSize: 11,
                    color: stage.attn ? "var(--accent)" : "var(--muted)",
                    fontWeight: stage.attn ? 700 : 400,
                    marginTop: 8,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {stage.delta}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Tile grid ── */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        {tiles.map((tile) => (
          <TileCard key={tile.id} tile={tile} />
        ))}
      </section>
    </div>
  );
}
