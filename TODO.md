# SQLite MCP Server - TODO

## 🔧 New Tools

- [x] **describe_table** — Show column names, types, constraints
- [ ] **execute_write** — Safe INSERT/UPDATE/DELETE with confirmation
- [ ] **get_schema** — Full DDL export of the database
- [ ] **export_csv** — Query results → CSV file

## 🛡️ Safety & UX

- [x] **Query timeout** — Kill long-running queries
- [x] **Row limit** — Cap run_query results (e.g., 1000 rows max)
- [ ] **Transaction support** — Begin/commit/rollback for write operations
- [ ] **Better validation** — Whitelist tables, block dangerous keywords

## ⚡ Power Features

- [ ] **Connection pooling** — Handle multiple databases simultaneously
- [ ] **Query history** — Cache recent results for faster follow-ups
- [ ] **Auto-complete** — Table/column name suggestions for clients

## 🧪 Dev/Deploy

- [x] **Tests** — Jest tests for each tool
- [ ] **Docker** — One-liner container deployment
- [ ] **GitHub Actions** — Auto-publish to npm
- [ ] **CLI mode** — Direct command-line usage without MCP

## 🎯 Priority Order (Top to Bottom)

1. [x] describe_table — Essential for any real work
2. [x] Row limits — Prevent accidental SELECT * on massive tables
3. [x] Tests — Catch MCP protocol changes early
4. [x] Query timeout — Kill long-running queries
5. [ ] Transaction support — Begin/commit/rollback for write operations
6. [ ] Better validation — Whitelist tables, block dangerous keywords
7. [ ] execute_write — Safe INSERT/UPDATE/DELETE with confirmation
8. [ ] get_schema — Full DDL export of the database
9. [ ] export_csv — Query results → CSV file
10. [ ] Connection pooling — Handle multiple databases simultaneously
11. [ ] Query history — Cache recent results for faster follow-ups
12. [ ] Auto-complete — Table/column name suggestions for clients
13. [ ] Docker — One-liner container deployment
14. [ ] GitHub Actions — Auto-publish to npm
15. [ ] CLI mode — Direct command-line usage without MCP
