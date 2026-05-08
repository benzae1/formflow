<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Graphify

If `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` exist, read them before answering codebase questions or planning changes.

Prefer the graph as a repo map:
- use `GRAPH_REPORT.md` for high-level architecture and hotspots
- use `graph.json` for relationships and connectivity

If the graph appears stale after significant code changes, run the `graphify` skill with `--update`.

## General Rules

For each meaningful change you make, create a git commit for it. If you make multiple changes, then create multiple git commits, rather than having one large on. Do not credit yourself in the git commits.

Only run tests after large changes have been made to make sure nothing broke, for smaller changes, running tests is unecessary.