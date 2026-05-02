import Database from "better-sqlite3";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

let db: Database.Database | null = null;

const server = new McpServer({
  name: "sqlite-mcp",
  version: "1.0.0",
});

// 1. Open database
server.tool(
  "open_database",
  "Open a SQLite database file",
  {
    path: z.string(),
  },
  async ({ path }) => {
    db = new Database(path);
    return {
      content: [{ type: "text", text: `Opened database: ${path}` }],
    };
  }
);

// 2. List tables
server.tool("list_tables", "List all tables in the opened database", async () => {
  if (!db) throw new Error("Database not opened");

  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    )
    .all();

  return {
    content: [
      { type: "text", text: JSON.stringify(tables, null, 2) },
    ],
  };
});

// 3. Run SELECT queries (safe version)
server.tool(
  "run_query",
  "Run a SELECT query on the opened database",
  {
    sql: z.string(),
  },
  async ({ sql }) => {
    if (!db) throw new Error("Database not opened");

    // VERY basic safety check
    if (!sql.trim().toLowerCase().startsWith("select")) {
      throw new Error("Only SELECT queries allowed in this tool");
    }

    const result = db.prepare(sql).all();

    return {
      content: [
        { type: "text", text: JSON.stringify(result, null, 2) },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
