import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { localizePath } from "@/lib/i18n/routing";

export type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

export type NavGroup = {
  group: string;
  items: NavItem[];
};

export function getWorkspaceNavigation(
  roles: readonly string[],
  locale: Locale,
  dictionary: Dictionary,
): NavGroup[] {
  const isAdmin = roles.includes("admin");
  const isCompliance = roles.includes("compliance");
  const isApprover = roles.includes("approver");

  const workItems: NavItem[] = [
    { href: localizePath(locale, "/submissions"), label: dictionary.nav.myWork },
  ];

  if (isApprover || isAdmin) {
    workItems.push({ href: localizePath(locale, "/inbox"), label: dictionary.nav.inbox });
  }

  const adminItems: NavItem[] = [];

  if (isAdmin || isCompliance) {
    adminItems.push({
      href: localizePath(locale, "/admin"),
      label: isCompliance && !isAdmin ? dictionary.nav.oversight : dictionary.nav.overview,
      exact: true,
    });
  }

  if (isAdmin) {
    adminItems.push(
      { href: localizePath(locale, "/admin/forms"), label: dictionary.nav.forms },
      { href: localizePath(locale, "/admin/workflows"), label: dictionary.nav.workflows },
      { href: localizePath(locale, "/admin/submissions"), label: dictionary.nav.globalQueue },
      { href: localizePath(locale, "/admin/users"), label: dictionary.nav.users },
      { href: localizePath(locale, "/admin/org"), label: dictionary.nav.orgSync },
    );
  }

  if (isAdmin || isCompliance) {
    adminItems.push({ href: localizePath(locale, "/admin/audit-log"), label: dictionary.nav.auditLog });
  }

  const groups: NavGroup[] = [
    { group: dictionary.nav.work, items: workItems },
  ];

  if (adminItems.length > 0) {
    groups.push({ group: dictionary.nav.administration, items: adminItems });
  }

  return groups;
}
