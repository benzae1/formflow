#!/usr/bin/env python3
"""
LDAP org-structure explorer for uni-weimar.
Mirrors the two-step bind used in api_ldap.php:
  1. Anonymous search to discover the user's full DN
  2. Bind with that DN + password

Two servers, two different base DNs:
  141.54.170.18  ->  o=uni-we   (hierarchical)
  141.54.29.3    ->  o=uni      (flat)

Usage:
    pip install ldap3
    python scripts/ldap_explore.py --user sowa2176 --password "..."
"""

import argparse
import sys
from collections import Counter
from ldap3 import Server, Connection, ALL, SUBTREE, BASE, LEVEL, ALL_ATTRIBUTES
from ldap3.core.exceptions import LDAPException

SERVERS = [
    {"url": "ldap://141.54.170.18:389", "base": "o=uni-we", "label": "141.54.170.18 (hierarchical)"},
    {"url": "ldap://141.54.29.3:389",   "base": "o=uni",    "label": "141.54.29.3 (flat)"},
]

ROLE_ATTRS = [
    "objectClass", "ou", "cn", "uid", "mail", "displayName", "title",
    "description", "eduPersonAffiliation", "eduPersonPrimaryAffiliation",
    "eduPersonScopedAffiliation", "memberOf", "groupMembership",
    "uniqueMember", "member", "roleOccupant",
]


def make_conn(url: str, bind_dn: str | None = None, bind_pw: str | None = None, timeout: int = 8) -> Connection:
    server = Server(url, get_info=ALL, connect_timeout=timeout)
    conn = Connection(
        server,
        user=bind_dn,
        password=bind_pw,
        auto_bind=True,
        raise_exceptions=True,
        receive_timeout=timeout,
    )
    conn.server.dit_lock  # touch to prevent referral chasing issues
    return conn


def discover_dn(url: str, base: str, uid: str, timeout: int = 8) -> str | None:
    """Anonymous search to find the full DN for a uid."""
    try:
        conn = make_conn(url, timeout=timeout)
        conn.search(
            search_base=base,
            search_filter=f"(uid={uid})",
            search_scope=SUBTREE,
            attributes=["dn"],
            size_limit=2,
            time_limit=timeout,
        )
        if conn.entries:
            return conn.entries[0].entry_dn
    except LDAPException:
        pass
    return None


def authenticated_conn(url: str, base: str, uid: str, password: str, timeout: int = 8) -> Connection | None:
    """Two-step: discover DN anonymously, then bind with credentials."""
    dn = discover_dn(url, base, uid, timeout)
    if dn is None:
        print(f"  [could not find DN for uid={uid} on {url}]")
        return None
    print(f"  Found DN: {dn}")
    try:
        return make_conn(url, bind_dn=dn, bind_pw=password, timeout=timeout)
    except LDAPException as e:
        print(f"  [bind failed: {e}]")
        return None


# ---------------------------------------------------------------------------
# Tree walk
# ---------------------------------------------------------------------------

def tree_walk(conn: Connection, base: str, depth: int = 0, max_depth: int = 5) -> None:
    if depth > max_depth:
        return
    indent = "  " * depth
    try:
        conn.search(
            search_base=base,
            search_filter="(objectClass=*)",
            search_scope=LEVEL,
            attributes=ROLE_ATTRS,
            size_limit=500,
            time_limit=10,
        )
    except LDAPException as e:
        print(f"{indent}[error: {e}]")
        return

    for entry in conn.entries:
        ocs = [str(o) for o in entry.objectClass] if entry.objectClass else []
        label = _label(entry, ocs)
        print(f"{indent}{label}  ({', '.join(ocs)})")

        for attr in ["eduPersonAffiliation", "eduPersonPrimaryAffiliation",
                     "memberOf", "uniqueMember", "member", "title", "description"]:
            val = getattr(entry, attr, None)
            if val and str(val) not in ("-", "[]", ""):
                items = str(val).strip("[]").split(",")
                preview = ", ".join(i.strip() for i in items[:5])
                if len(items) > 5:
                    preview += f" … (+{len(items)-5} more)"
                print(f"{indent}  .{attr}: {preview}")

        is_container = any(c in ocs for c in [
            "organizationalUnit", "organization", "groupOfNames",
            "groupOfUniqueNames", "posixGroup", "domain",
        ])
        if is_container:
            tree_walk(conn, entry.entry_dn, depth + 1, max_depth)


def _label(entry, ocs: list[str]) -> str:
    for attr in ("ou", "cn", "uid", "displayName"):
        val = getattr(entry, attr, None)
        if val and str(val) not in ("-", "[]", ""):
            return f"[{attr}={str(val)}]"
    return f"[{entry.entry_dn}]"


# ---------------------------------------------------------------------------
# Summaries
# ---------------------------------------------------------------------------

def summarise_roles(conn: Connection, base: str) -> None:
    print("\n--- Role / Group entries ---\n")
    filt = "(|(objectClass=groupOfNames)(objectClass=groupOfUniqueNames)(objectClass=posixGroup)(objectClass=organizationalRole))"
    try:
        conn.search(base, filt, SUBTREE,
                    attributes=["cn", "description", "uniqueMember", "member", "objectClass"],
                    size_limit=1000, time_limit=15)
    except LDAPException as e:
        print(f"  [error: {e}]")
        return
    if not conn.entries:
        print("  (none found)")
        return
    for entry in conn.entries:
        ocs = [str(o) for o in entry.objectClass] if entry.objectClass else []
        name = str(entry.cn) if entry.cn else entry.entry_dn
        desc = str(entry.description) if entry.description else ""
        m = entry.uniqueMember if entry.uniqueMember else entry.member
        count = len(m) if m else 0
        print(f"  {name}  ({', '.join(ocs)})")
        if desc:
            print(f"    desc: {desc}")
        if count:
            print(f"    members: {count}")


def summarise_affiliations(conn: Connection, base: str) -> None:
    print("\n--- eduPersonAffiliation distribution ---\n")
    try:
        conn.search(base, "(eduPersonAffiliation=*)", SUBTREE,
                    attributes=["eduPersonAffiliation"],
                    size_limit=5000, time_limit=15)
    except LDAPException as e:
        print(f"  [error: {e}]")
        return
    counts: Counter = Counter()
    for entry in conn.entries:
        for v in entry.eduPersonAffiliation:
            counts[str(v)] += 1
    if not counts:
        print("  (none found)")
        return
    for aff, n in counts.most_common():
        print(f"  {aff:40s} {n}")


def dump_own_entry(conn: Connection, base: str, uid: str) -> None:
    print(f"\n--- Attributes for uid={uid} ---\n")
    try:
        conn.search(base, f"(uid={uid})", SUBTREE,
                    attributes=["*", "+"], size_limit=2, time_limit=10)
    except LDAPException as e:
        print(f"  [error: {e}]")
        return
    if not conn.entries:
        print("  (not found)")
        return
    entry = conn.entries[0]
    for attr in sorted(entry.entry_attributes):
        print(f"  {attr}: {entry[attr]}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--user", default="sowa2176")
    parser.add_argument("--password", default=None)
    parser.add_argument("--max-depth", type=int, default=4)
    parser.add_argument("--no-tree", action="store_true")
    parser.add_argument("--timeout", type=int, default=8)
    args = parser.parse_args()

    for srv in SERVERS:
        print(f"\n{'='*60}")
        print(f"Server: {srv['label']}")
        print(f"Base:   {srv['base']}")
        print(f"{'='*60}\n")

        if args.password:
            print(f"Authenticating as uid={args.user} ...")
            conn = authenticated_conn(srv["url"], srv["base"], args.user, args.password, args.timeout)
        else:
            print("Anonymous bind ...")
            try:
                conn = make_conn(srv["url"], timeout=args.timeout)
            except LDAPException as e:
                print(f"  [failed: {e}]")
                conn = None

        if conn is None:
            print("  Skipping this server.\n")
            continue

        dump_own_entry(conn, srv["base"], args.user)

        if not args.no_tree:
            print(f"\n--- Directory tree (max depth {args.max_depth}) ---\n")
            tree_walk(conn, srv["base"], max_depth=args.max_depth)

        summarise_roles(conn, srv["base"])
        summarise_affiliations(conn, srv["base"])
        conn.unbind()


if __name__ == "__main__":
    main()
