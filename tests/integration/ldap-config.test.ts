import { describe, expect, test } from "vitest";
import { parseLdapBaseDns } from "../../src/lib/ldap-config";

describe("LDAP config helpers", () => {
  test("parses multiple base DNs with pipe separators", () => {
    expect(parseLdapBaseDns("ou=people,dc=example,dc=org|ou=staff,dc=example,dc=org")).toEqual([
      "ou=people,dc=example,dc=org",
      "ou=staff,dc=example,dc=org",
    ]);
  });

  test("ignores empty base DN entries", () => {
    expect(parseLdapBaseDns("ou=people,dc=example,dc=org|| ")).toEqual([
      "ou=people,dc=example,dc=org",
    ]);
  });
});
