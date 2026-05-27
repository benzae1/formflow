import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/page-auth";
import DelegationManager from "@/components/users/DelegationManager";
import InboxClient from "./InboxClient";
import { getLocaleContextOrDefault } from "@/lib/i18n/server";

type SearchParams = Promise<{
  view?: string;
}>;

export default async function InboxPage({
  searchParams,
  params,
}: {
  searchParams: SearchParams;
  params?: Promise<{ lang?: string }>;
}) {
  const { locale, dictionary } = await getLocaleContextOrDefault(params ? (await params).lang : undefined);
  const user = await requirePageRole(["admin", "approver"], locale);
  const filters = await searchParams;
  const view = filters.view ?? "pending";
  const now = new Date();

  const [tasks, delegations, delegateUsers] = await Promise.all([
    db.approvalTask.findMany({
      where: {
        assignedToId: user.id,
        ...(view === "overdue"
          ? {
              status: "pending",
              dueAt: { lt: now },
            }
          : view === "completed"
            ? {
                status: {
                  in: ["approved", "rejected", "revision_requested"],
                },
              }
            : {
                status: "pending",
              }),
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
    }),
    db.delegation.findMany({
      where: {
        approverId: user.id,
      },
      include: {
        delegate: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        startsAt: "desc",
      },
    }),
    db.user.findMany({
      where: {
        deactivatedAt: null,
        OR: [
          { roles: { some: { name: "approver" } } },
          { roles: { some: { name: "admin" } } },
        ],
        NOT: { id: user.id },
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <DelegationManager
        approverId={user.id}
        delegations={delegations.map((delegation) => ({
          id: delegation.id,
          approverId: delegation.approverId,
          delegateId: delegation.delegateId,
          delegateName: delegation.delegate.name ?? delegation.delegate.email,
          startsAt: delegation.startsAt.toISOString(),
          endsAt: delegation.endsAt.toISOString(),
        }))}
        delegates={delegateUsers.map((delegate) => ({
          id: delegate.id,
          name: delegate.name ?? delegate.email,
          email: delegate.email,
        }))}
        canManage
        locale={locale}
        copy={dictionary.delegations}
        title={dictionary.inbox.coverageTitle}
        description={dictionary.inbox.coverageDescription}
      />
      <InboxClient locale={locale} dictionary={dictionary} tasks={tasks} view={view} />
    </div>
  );
}
