import { Client, EqualityFilter, InvalidCredentialsError } from "ldapts";

type LdapProfile = {
  uid: string;
  dn: string;
  email: string;
  name: string | null;
  roles: string[];
};

type LdapEntryValue = Buffer | Buffer[] | string[] | string | undefined;

const USER_ATTRIBUTES = [
  "uid",
  "mail",
  "displayName",
  "cn",
  "givenName",
  "sn",
  "gecos",
  "idmEduLibraryCodeNumber",
];

export function isLdapConfigured() {
  return getLdapUrls().length > 0 && getBaseDns().length > 0;
}

export async function authenticateLdapUser(uid: string, password: string) {
  const normalizedUid = uid.trim().toLowerCase();

  if (!isLdapConfigured() || !normalizedUid || !password) {
    return null;
  }

  for (const url of getLdapUrls()) {
    const client = createClient(url);

    try {
      await bindForSearch(client);
      const entry = await findUserEntry(client, normalizedUid);

      if (!entry) {
        continue;
      }

      await client.bind(entry.dn, password);
      return entryToProfile(entry, normalizedUid);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        return null;
      }

      continue;
    } finally {
      await safeUnbind(client);
    }
  }

  return null;
}

function createClient(url: string) {
  const timeout = Number(process.env.LDAP_TIMEOUT_MS ?? "5000");

  return new Client({
    url,
    timeout,
    connectTimeout: timeout,
    strictDN: false,
  });
}

async function bindForSearch(client: Client) {
  const bindDn = process.env.LDAP_BIND_DN?.trim();
  const bindPassword = process.env.LDAP_BIND_PASSWORD ?? "";

  if (bindDn) {
    await client.bind(bindDn, bindPassword);
  }
}

async function findUserEntry(client: Client, uid: string) {
  for (const baseDn of getBaseDns()) {
    const { searchEntries } = await client.search(baseDn, {
      scope: "sub",
      filter: new EqualityFilter({ attribute: "uid", value: uid }),
      attributes: getSearchAttributes(),
      sizeLimit: 2,
      timeLimit: 5,
    });

    if (searchEntries.length === 1) {
      return searchEntries[0];
    }
  }

  return null;
}

function entryToProfile(
  entry: { dn: string; [index: string]: LdapEntryValue },
  fallbackUid: string,
): LdapProfile {
  const uid = getFirst(getAttribute(entry, "uid")) ?? fallbackUid;
  const email = getFirst(getAttribute(entry, "mail")) ?? `${uid}@${getFallbackEmailDomain()}`;
  const name = getDisplayName(entry);

  return {
    uid,
    dn: entry.dn,
    email: email.toLowerCase(),
    name,
    roles: getRolesForEntry(entry, uid),
  };
}

function getDisplayName(entry: { [index: string]: LdapEntryValue }) {
  const displayName = getFirst(getAttribute(entry, "displayName")) ?? getFirst(getAttribute(entry, "cn"));

  if (displayName) {
    return displayName;
  }

  const givenName = getFirst(getAttribute(entry, "givenName"));
  const surname = getFirst(getAttribute(entry, "sn"));

  return [givenName, surname].filter(Boolean).join(" ") || getFirst(getAttribute(entry, "gecos")) || null;
}

function getRolesForEntry(entry: { [index: string]: LdapEntryValue }, uid: string) {
  const roles = new Set<string>(["submitter"]);

  for (const role of ["admin", "approver", "compliance"] as const) {
    if (getUidAllowlist(role).has(uid.toLowerCase())) {
      roles.add(role);
    }
  }

  const attribute = process.env.LDAP_ROLE_ATTRIBUTE?.trim();
  if (attribute) {
    const values = getValues(getAttribute(entry, attribute));
    const roleMap = getRoleAttributeMap();

    for (const value of values) {
      roles.add(roleMap.get(value.toLowerCase()) ?? value);
    }
  }

  return Array.from(roles);
}

function getUidAllowlist(role: "admin" | "approver" | "compliance") {
  return new Set(
    splitEnvList(process.env[`LDAP_${role.toUpperCase()}_UIDS`]).map((uid) =>
      uid.toLowerCase(),
    ),
  );
}

function getRoleAttributeMap() {
  const roleMap = new Map<string, string>();

  for (const pair of splitEnvList(process.env.LDAP_ROLE_ATTRIBUTE_MAP)) {
    const [rawValue, rawRole] = pair.split("=");
    const value = rawValue?.trim();
    const role = rawRole?.trim();

    if (value && role) {
      roleMap.set(value.toLowerCase(), role);
    }
  }

  return roleMap;
}

function getSearchAttributes() {
  const roleAttribute = process.env.LDAP_ROLE_ATTRIBUTE?.trim();
  return roleAttribute ? Array.from(new Set([...USER_ATTRIBUTES, roleAttribute])) : USER_ATTRIBUTES;
}

function getLdapUrls() {
  return splitEnvList(process.env.LDAP_URLS ?? process.env.LDAP_URL);
}

function getBaseDns() {
  const raw = process.env.LDAP_BASE_DNS ?? process.env.LDAP_BASE_DN ?? "";
  // DNs contain commas as part of their syntax; use | to separate multiple base DNs
  return raw
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFallbackEmailDomain() {
  return process.env.LDAP_FALLBACK_EMAIL_DOMAIN?.trim() || "ldap.local";
}

function getFirst(value: LdapEntryValue) {
  return getValues(value)[0];
}

function getAttribute(entry: { [index: string]: LdapEntryValue }, attribute: string) {
  const direct = entry[attribute];
  if (direct) {
    return direct;
  }

  const matchingKey = Object.keys(entry).find(
    (key) => key.toLowerCase() === attribute.toLowerCase(),
  );

  return matchingKey ? entry[matchingKey] : undefined;
}

function getValues(value: LdapEntryValue) {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => (Buffer.isBuffer(item) ? item.toString("utf8") : item)).filter(Boolean);
}

function splitEnvList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function safeUnbind(client: Client) {
  try {
    await client.unbind();
  } catch {
    // The connection may already be closed after a failed bind.
  }
}
