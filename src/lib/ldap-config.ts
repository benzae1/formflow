export function splitLdapUrlList(value?: string) {
  return splitCommaSeparatedEnvList(value);
}

export function splitCommaSeparatedEnvList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseLdapBaseDns(value?: string) {
  return (value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getLdapUrlsFromEnv() {
  return splitLdapUrlList(process.env.LDAP_URLS ?? process.env.LDAP_URL);
}

export function getLdapBaseDnsFromEnv() {
  return parseLdapBaseDns(process.env.LDAP_BASE_DNS ?? process.env.LDAP_BASE_DN);
}
