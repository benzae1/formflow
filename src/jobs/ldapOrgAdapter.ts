import { Client } from "ldapts";
import {
  ExternalMembership,
  ExternalOrgUnit,
  ExternalUser,
  OrgAdapter,
} from "@/domain/org";

type LdapEntryValue = Buffer | Buffer[] | string[] | string | undefined;
type LdapEntry = { dn: string; [index: string]: LdapEntryValue };

const USER_ATTRIBUTES = [
  "uid",
  "mail",
  "displayName",
  "cn",
  "givenName",
  "sn",
  "gecos",
  "ou",
  "manager",
];

export function createLdapOrgAdapter(): OrgAdapter {
  return {
    async fetchUsers() {
      const directory = await fetchDirectory();
      return directory.users;
    },
    async fetchOrgUnits() {
      const directory = await fetchDirectory();
      return directory.orgUnits;
    },
    async fetchMemberships() {
      const directory = await fetchDirectory();
      return directory.memberships;
    },
  };
}

async function fetchDirectory() {
  const urls = splitEnvList(process.env.LDAP_URLS ?? process.env.LDAP_URL);
  const baseDns = splitEnvList(process.env.LDAP_BASE_DNS ?? process.env.LDAP_BASE_DN);

  for (const url of urls) {
    const timeout = Number(process.env.LDAP_TIMEOUT_MS ?? "5000");
    const client = new Client({
      url,
      timeout,
      connectTimeout: timeout,
      strictDN: false,
    });

    try {
      await bindForSearch(client);
      const entries = await searchAllEntries(client, baseDns);
      return normalizeDirectory(entries);
    } finally {
      await safeUnbind(client);
    }
  }

  return {
    users: [] as ExternalUser[],
    orgUnits: [] as ExternalOrgUnit[],
    memberships: [] as ExternalMembership[],
  };
}

async function bindForSearch(client: Client) {
  const bindDn = process.env.LDAP_BIND_DN?.trim();
  const bindPassword = process.env.LDAP_BIND_PASSWORD ?? "";

  if (bindDn) {
    await client.bind(bindDn, bindPassword);
  }
}

async function searchAllEntries(client: Client, baseDns: string[]) {
  const filter = process.env.LDAP_SYNC_FILTER?.trim() || "(uid=*)";
  const entries: LdapEntry[] = [];

  for (const baseDn of baseDns) {
    const { searchEntries } = await client.search(baseDn, {
      scope: "sub",
      filter,
      attributes: USER_ATTRIBUTES,
      paged: true,
    });

    entries.push(...(searchEntries as LdapEntry[]));
  }

  return entries;
}

function normalizeDirectory(entries: LdapEntry[]) {
  const users: ExternalUser[] = [];
  const orgUnitsById = new Map<string, ExternalOrgUnit>();
  const memberships: ExternalMembership[] = [];
  const managersByDn = new Set(
    entries
      .map((entry) => getFirst(getAttribute(entry, "manager")))
      .filter((value): value is string => Boolean(value)),
  );

  for (const entry of entries) {
    const uid = getFirst(getAttribute(entry, "uid"));
    if (!uid) {
      continue;
    }

    const email =
      getFirst(getAttribute(entry, "mail")) ??
      `${uid}@${process.env.LDAP_FALLBACK_EMAIL_DOMAIN?.trim() || "ldap.local"}`;
    const orgUnitNames = getValues(getAttribute(entry, "ou"));
    const isManager = managersByDn.has(entry.dn);

    users.push({
      externalId: uid,
      email: email.toLowerCase(),
      name: getDisplayName(entry),
      active: true,
    });

    for (const orgUnitName of orgUnitNames) {
      const externalId = slugifyOrgUnit(orgUnitName);

      if (!orgUnitsById.has(externalId)) {
        orgUnitsById.set(externalId, {
          externalId,
          name: orgUnitName,
          type: "department",
        });
      }

      memberships.push({
        userExternalId: uid,
        orgUnitExternalId: externalId,
        roleInUnit: isManager ? "head" : "member",
        isManager,
      });
    }
  }

  return {
    users,
    orgUnits: Array.from(orgUnitsById.values()),
    memberships,
  };
}

function getDisplayName(entry: LdapEntry) {
  const displayName =
    getFirst(getAttribute(entry, "displayName")) ??
    getFirst(getAttribute(entry, "cn"));

  if (displayName) {
    return displayName;
  }

  const givenName = getFirst(getAttribute(entry, "givenName"));
  const surname = getFirst(getAttribute(entry, "sn"));

  return (
    [givenName, surname].filter(Boolean).join(" ") ||
    getFirst(getAttribute(entry, "gecos")) ||
    undefined
  );
}

function getAttribute(entry: LdapEntry, attribute: string) {
  const direct = entry[attribute];
  if (direct) {
    return direct;
  }

  const matchingKey = Object.keys(entry).find(
    (key) => key.toLowerCase() === attribute.toLowerCase(),
  );

  return matchingKey ? entry[matchingKey] : undefined;
}

function getFirst(value: LdapEntryValue) {
  return getValues(value)[0];
}

function getValues(value: LdapEntryValue) {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => (Buffer.isBuffer(item) ? item.toString("utf8") : item))
    .filter(Boolean);
}

function splitEnvList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugifyOrgUnit(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function safeUnbind(client: Client) {
  try {
    await client.unbind();
  } catch {
    // The connection may already be closed after a failed bind.
  }
}
