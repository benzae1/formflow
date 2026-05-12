import { AppRole } from "@/domain/roles";

export type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

export type NavGroup = {
  group: string;
  items: NavItem[];
};

export function getWorkspaceNavigation(roles: AppRole[]): NavGroup[] {
  const isAdmin = roles.includes("admin");
  const isCompliance = roles.includes("compliance");
  const isApprover = roles.includes("approver");

  const workItems: NavItem[] = [
    { href: "/submissions", label: "My work" },
  ];

  if (isApprover || isAdmin) {
    workItems.push({ href: "/inbox", label: "Inbox" });
  }

  const adminItems: NavItem[] = [];

  if (isAdmin || isCompliance) {
    adminItems.push({
      href: "/admin",
      label: isCompliance && !isAdmin ? "Oversight" : "Overview",
      exact: true,
    });
  }

  if (isAdmin) {
    adminItems.push(
      { href: "/admin/forms", label: "Forms" },
      { href: "/admin/workflows", label: "Workflows" },
      { href: "/admin/submissions", label: "Global queue" },
      { href: "/admin/users", label: "Users" },
      { href: "/admin/org", label: "Org sync" },
    );
  }

  if (isAdmin || isCompliance) {
    adminItems.push({ href: "/admin/audit-log", label: "Audit log" });
  }

  const groups: NavGroup[] = [
    { group: "Work", items: workItems },
  ];

  if (adminItems.length > 0) {
    groups.push({ group: "Administration", items: adminItems });
  }

  return groups;
}
