import { AppRole } from "@/domain/roles";

export type NavItem = {
  href: string;
  label: string;
  description: string;
};

export function getWorkspaceNavigation(roles: AppRole[]) {
  const isAdmin = roles.includes("admin");
  const isCompliance = roles.includes("compliance");
  const isApprover = roles.includes("approver");

  const items: NavItem[] = [];

  items.push({
    href: "/submissions",
    label: "My work",
    description: "Forms and submissions",
  });

  if (isApprover || isAdmin) {
    items.push({
      href: "/inbox",
      label: "Inbox",
      description: "Approval decisions",
    });
  }

  if (isAdmin || isCompliance) {
    items.push({
      href: "/admin",
      label: isCompliance && !isAdmin ? "Oversight" : "Admin",
      description: "Operations dashboard",
    });
  }

  if (isAdmin) {
    items.push(
      {
        href: "/admin/forms",
        label: "Forms",
        description: "Create and publish",
      },
      {
        href: "/admin/workflows",
        label: "Workflows",
        description: "Routing and stages",
      },
      {
        href: "/admin/submissions",
        label: "Global queue",
        description: "All submissions",
      },
      {
        href: "/admin/users",
        label: "Users",
        description: "Directory and roles",
      },
      {
        href: "/admin/org",
        label: "Org sync",
        description: "Structure and cache",
      },
    );
  }

  if (isAdmin || isCompliance) {
    items.push({
      href: "/admin/audit-log",
      label: "Audit log",
      description: "Sensitive access trail",
    });
  }

  return items;
}
