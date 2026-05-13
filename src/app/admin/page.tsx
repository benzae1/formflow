import Link from "next/link";
import { db } from "@/lib/db";
import { localizePath } from "@/lib/i18n/routing";
import { getLocaleContextOrDefault } from "@/lib/i18n/server";
import { requirePageRole } from "@/lib/page-auth";
import { getTemporalClient } from "@/lib/temporal";

async function getFailedTemporalWorkflowCount() {
  try {
    const temporal = await getTemporalClient();
    const result = await temporal.workflow.count('ExecutionStatus = "Failed"');
    return result.count;
  } catch {
    return null;
  }
}

function formatSyncTime(value: Date | null, locale: "de" | "en") {
  if (!value) return locale === "de" ? "Keine Synchronisation erfasst" : "No sync recorded";

  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function Primitive({
  shape,
  color,
  size = 36,
}: {
  shape: "circle" | "square" | "triangle";
  color: string;
  size?: number;
}) {
  if (shape === "circle") {
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
  }

  if (shape === "square") {
    return <div style={{ width: size, height: size, background: color, flexShrink: 0 }} />;
  }

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

function TileCard({ tile, openLabel }: { tile: Tile; openLabel: string }) {
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
        {openLabel}
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

export default async function AdminDashboardPage({
  params,
}: {
  params?: Promise<{ lang?: string }>;
}) {
  const { locale } = await getLocaleContextOrDefault(params ? (await params).lang : undefined);
  const user = await requirePageRole(["admin", "compliance"], locale);
  const now = new Date();
  const copy =
    locale === "de"
      ? {
          submitted: "Eingereicht",
          inReview: "In Prüfung",
          overdue: "überfällig",
          needsRevision: "Revision nötig",
          approved: "Freigegeben",
          rejected: "Abgelehnt",
          closed: "Geschlossen",
          archive: "Archiv",
          submissions: "Einreichungen",
          submissionsSub: "Pipeline von neu eingereichter Arbeit bis zum endgültigen Ergebnis.",
          auditLog: "Audit-Log",
          auditSub: "Spuren sensibler Zugriffe und Compliance-relevanter Ereignisse.",
          sensitive: "Sensibel",
          overdueAlerts: "Überfällige Hinweise",
          failedWorkflows: "Fehlgeschlagene Workflows",
          forms: "Formulare",
          formsSub: "Veröffentlichungsstatus und Builder-Zugang.",
          drafts: "Entwürfe",
          published: "Veröffentlicht",
          archived: "Archiviert",
          workflowHealth: "Workflow-Status",
          workflowHealthSub: "Ausführungsdruck, SLA-Risiko und Temporal-Fehler.",
          active: "Aktiv",
          errors: "Fehler",
          users: "Benutzer",
          usersSub: "Verzeichnis- und Lebenszyklusereignisse.",
          total: "Gesamt",
          deactivated: "Deaktiviert",
          adminOps: "Administration · Betrieb",
          complianceOps: "Compliance · Betrieb",
          oversight: "Aufsicht",
          operations: "Betrieb",
          heroDescription: "Bauhaus Forms - Einreichungspipeline, Workflows und Verzeichnis auf einen Blick.",
          manageForms: "Formulare verwalten",
          reviewWorkflows: "Workflows prüfen",
          orgSync: "Organisationsabgleich",
          orgCurrent: "Verzeichnis aktuell - keine inaktiven Identitäten erkannt",
          lastSync: "Letzte Synchronisation",
          open: "Öffnen ->",
          openPipeline: "Pipeline öffnen ->",
          usersCount: "Benutzer",
        }
      : {
          submitted: "Submitted",
          inReview: "In Review",
          overdue: "overdue",
          needsRevision: "Needs Revision",
          approved: "Approved",
          rejected: "Rejected",
          closed: "Closed",
          archive: "Archive",
          submissions: "Submissions",
          submissionsSub: "Pipeline from newly submitted work through final outcomes.",
          auditLog: "Audit Log",
          auditSub: "Sensitive access trails and compliance-significant events.",
          sensitive: "Sensitive",
          overdueAlerts: "Overdue alerts",
          failedWorkflows: "Failed workflows",
          forms: "Forms",
          formsSub: "Publication status and builder access.",
          drafts: "Drafts",
          published: "Published",
          archived: "Archived",
          workflowHealth: "Workflow Health",
          workflowHealthSub: "Execution pressure, SLA risk, and Temporal failures.",
          active: "Active",
          errors: "Errors",
          users: "Users",
          usersSub: "Directory and lifecycle events.",
          total: "Total",
          deactivated: "Deactivated",
          adminOps: "Admin · Operations",
          complianceOps: "Compliance · Operations",
          oversight: "Oversight",
          operations: "Operations",
          heroDescription: "Bauhaus Forms - submission pipeline, workflows, and directory at a glance.",
          manageForms: "Manage forms",
          reviewWorkflows: "Review workflows",
          orgSync: "Org Sync",
          orgCurrent: "Directory current - no inactive identities detected",
          lastSync: "Last sync",
          open: "Open ->",
          openPipeline: "Open pipeline ->",
          usersCount: "Users",
        };

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

  const isComplianceOnly = user.roles.includes("compliance") && !user.roles.includes("admin");
  const pipelineStages = [
    {
      id: "submitted",
      label: copy.submitted,
      num: submissionsSubmitted,
      delta: null,
      attn: false,
      hex: "#FFD100",
    },
    {
      id: "in_review",
      label: copy.inReview,
      num: submissionsInReview,
      delta: overdueTasks > 0 ? `${overdueTasks} ${copy.overdue}` : null,
      attn: overdueTasks > 0 && submissionsInReview > 0,
      hex: "#ED8B00",
    },
    {
      id: "revision",
      label: copy.needsRevision,
      num: submissionsNeedsRevision,
      delta: null,
      attn: false,
      hex: "#A50050",
    },
    {
      id: "approved",
      label: copy.approved,
      num: submissionsApproved,
      delta: null,
      attn: false,
      hex: "#84BD00",
    },
    {
      id: "rejected",
      label: copy.rejected,
      num: submissionsRejected,
      delta: null,
      attn: false,
      hex: "#D22630",
    },
    {
      id: "closed",
      label: copy.closed,
      num: submissionsClosed,
      delta: copy.archive,
      attn: false,
      hex: "#00677F",
    },
  ];

  const tiles: Tile[] = isComplianceOnly
    ? [
        {
          id: "submissions",
          href: localizePath(locale, "/admin/submissions"),
          title: copy.submissions,
          sub: copy.submissionsSub,
          mark: { shape: "square", color: "#FFD100" },
          stats: [
            { l: copy.inReview, v: submissionsInReview },
            { l: copy.needsRevision, v: submissionsNeedsRevision, accent: submissionsNeedsRevision > 0 },
            { l: copy.approved, v: submissionsApproved },
          ],
        },
        {
          id: "audit",
          href: localizePath(locale, "/admin/audit-log"),
          title: copy.auditLog,
          sub: copy.auditSub,
          mark: { shape: "square", color: "#A50050" },
          stats: [
            {
              l: copy.sensitive,
              v: submissionsInReview + submissionsApproved + submissionsRejected + submissionsClosed,
            },
            { l: copy.overdueAlerts, v: overdueTasks, accent: overdueTasks > 0 },
            { l: copy.failedWorkflows, v: failedTemporalWorkflows ?? "-" },
          ],
        },
      ]
    : [
        {
          id: "forms",
          href: localizePath(locale, "/admin/forms"),
          title: copy.forms,
          sub: copy.formsSub,
          mark: { shape: "square", color: "#D22630" },
          stats: [
            { l: copy.drafts, v: formsDraft },
            { l: copy.published, v: formsPublished },
            { l: copy.archived, v: formsArchived },
          ],
        },
        {
          id: "wf",
          href: localizePath(locale, "/admin/workflows"),
          title: copy.workflowHealth,
          sub: copy.workflowHealthSub,
          mark: { shape: "triangle", color: "#FFD100" },
          stats: [
            { l: copy.active, v: activeWorkflows },
            { l: locale === "de" ? "Überfällig" : "Overdue", v: overdueTasks, accent: overdueTasks > 0 },
            { l: copy.errors, v: failedTemporalWorkflows ?? "-" },
          ],
        },
        {
          id: "users",
          href: localizePath(locale, "/admin/users"),
          title: copy.users,
          sub: copy.usersSub,
          mark: { shape: "circle", color: "#00677F" },
          stats: [
            { l: copy.total, v: totalUsers },
            { l: copy.active, v: totalUsers - deactivatedUsers },
            { l: copy.deactivated, v: deactivatedUsers },
          ],
        },
        {
          id: "audit",
          href: localizePath(locale, "/admin/audit-log"),
          title: copy.auditLog,
          sub: copy.auditSub,
          mark: { shape: "square", color: "#A50050" },
          stats: [
            {
              l: copy.sensitive,
              v: submissionsInReview + submissionsApproved + submissionsRejected + submissionsClosed,
            },
            { l: copy.overdueAlerts, v: overdueTasks, accent: overdueTasks > 0 },
            { l: copy.failedWorkflows, v: failedTemporalWorkflows ?? "-" },
          ],
        },
      ];

  const syncTime = formatSyncTime(latestSyncedUser?.updatedAt ?? null, locale);
  const syncOk = !!latestSyncedUser;

  return (
    <div>
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
            {isComplianceOnly ? copy.complianceOps : copy.adminOps}
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
                {copy.oversight}
                <span style={{ color: "var(--accent)" }}>.</span>
              </>
            ) : (
              <>
                {copy.operations}
                <span style={{ color: "var(--accent)" }}>.</span>
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
            {copy.heroDescription}
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
                href={localizePath(locale, "/admin/forms")}
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
                {copy.manageForms}
              </Link>
              <Link
                href={localizePath(locale, "/admin/workflows")}
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
                {copy.reviewWorkflows}
              </Link>
            </div>
          )}
        </div>
      </section>

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
          {copy.orgSync}
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
          {syncOk ? copy.orgCurrent : formatSyncTime(null, locale)}
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
            {copy.lastSync}
          </span>
          <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{syncTime}</span>
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
            {copy.usersCount}
          </span>
          <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{totalUsers}</span>
        </span>
        <Link
          href={localizePath(locale, "/admin/org")}
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
          {copy.open}
        </Link>
      </div>

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
              {copy.submissions}
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: "50ch", lineHeight: 1.4 }}>
              {copy.submissionsSub}
            </p>
          </div>
          <Link
            href={localizePath(locale, "/admin/submissions")}
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
            {copy.openPipeline}
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
                borderRight: i < pipelineStages.length - 1 ? "1px solid var(--line)" : "none",
                position: "relative",
                background: stage.attn ? "var(--canvas)" : "transparent",
              }}
            >
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
              {stage.delta ? (
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
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        {tiles.map((tile) => (
          <TileCard key={tile.id} tile={tile} openLabel={copy.open} />
        ))}
      </section>
    </div>
  );
}
