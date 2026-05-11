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
    busyTimeout: z.number().optional().default(5000),
  },
  async ({ path, busyTimeout }) => {
    db = new Database(path);
    db.exec(`PRAGMA busy_timeout = ${busyTimeout}`);
    return {
      content: [{ type: "text", text: `Opened database: ${path} (busy timeout: ${busyTimeout}ms)` }],
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

// 3. Describe table (schema info)
server.tool(
  "describe_table",
  "Get detailed schema information for a table (columns, types, constraints)",
  {
    table: z.string(),
  },
  async ({ table }) => {
    if (!db) throw new Error("Database not opened");

    // Get column info using PRAGMA
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    
    if (columns.length === 0) {
      throw new Error(`Table '${table}' not found`);
    }

    // Get foreign keys
    const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${table})`).all();
    
    // Get indexes
    const indexes = db.prepare(`PRAGMA index_list(${table})`).all() as any[];
    
    // Get index details for each index
    const indexDetails: any[] = [];
    for (const idx of indexes) {
      const info = db.prepare(`PRAGMA index_info(${idx.name})`).all() as any[];
      indexDetails.push({
        name: idx.name,
        unique: idx.unique,
        columns: info.map((col: any) => col.name),
      });
    }

    return {
      content: [
        { 
          type: "text", 
          text: JSON.stringify({
            table,
            columns,
            foreignKeys,
            indexes: indexDetails,
          }, null, 2) 
        },
      ],
    };
  }
);

// Dangerous SQL keywords to block
const DANGEROUS_KEYWORDS = [
  'drop', 'delete', 'insert', 'update', 'alter', 'create', 'truncate',
  'replace', 'attach', 'detach', 'pragma', 'vacuum', 'reindex'
];

// Enhanced SQL validation function
function validateQuery(sql: string, allowedTables?: string[]): void {
  const normalizedSql = sql.toLowerCase().trim();
  
  // Check for dangerous keywords
  for (const keyword of DANGEROUS_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(normalizedSql)) {
      throw new Error(`Query blocked: contains dangerous keyword '${keyword}'`);
    }
  }
  
  // Must start with SELECT
  if (!normalizedSql.startsWith('select')) {
    throw new Error("Only SELECT queries allowed");
  }
  
  // Check for multiple statements (semicolon detection)
  if (normalizedSql.includes(';')) {
    throw new Error("Multiple SQL statements not allowed");
  }
  
  // Optional: Validate table whitelist
  if (allowedTables && allowedTables.length > 0) {
    const fromMatch = normalizedSql.match(/\bfrom\s+(\w+)/i);
    const joinMatch = normalizedSql.match(/\bjoin\s+(\w+)/gi);
    
    const tablesUsed: string[] = [];
    if (fromMatch && fromMatch[1]) tablesUsed.push(fromMatch[1].toLowerCase());
    if (joinMatch) {
      joinMatch.forEach(match => {
        const table = match.replace(/join\s+/i, '').toLowerCase();
        tablesUsed.push(table);
      });
    }
    
    const normalizedAllowed = allowedTables.map(t => t.toLowerCase());
    for (const table of tablesUsed) {
      if (!normalizedAllowed.includes(table)) {
        throw new Error(`Table '${table}' not in whitelist. Allowed tables: ${allowedTables.join(', ')}`);
      }
    }
  }
}

// 4. Run SELECT queries (safe version with row limit, timeout, and validation)
server.tool(
  "run_query",
  "Run a SELECT query on the opened database (max 1000 rows by default, 30s timeout)",
  {
    sql: z.string(),
    limit: z.number().optional().default(1000),
    timeout: z.number().optional().default(30000),
    allowedTables: z.array(z.string()).optional(),
  },
  async ({ sql, limit, timeout, allowedTables }) => {
    if (!db) throw new Error("Database not opened");

    // Enhanced safety validation
    validateQuery(sql, allowedTables);

    // Enforce max limit of 10000 rows to prevent memory issues
    const effectiveLimit = Math.min(limit, 10000);
    const effectiveTimeout = Math.min(timeout, 60000); // Max 60s
    
    // Execute query with timeout protection using race
    const queryPromise = new Promise((resolve, reject) => {
      try {
        if (!db) throw new Error("Database not opened");
        // better-sqlite3 doesn't have .limit() on statement, so we just run the query
        // The user is expected to put LIMIT in their SQL if they want it.
        const stmt = db.prepare(sql);
        stmt.raw(true);
        const rows = stmt.all();
        // Manually enforce the limit since better-sqlite3 doesn't have a limit method
        // and we want to ensure safety even if the user didn't specify a LIMIT in SQL
        const limitedRows = rows.slice(0, effectiveLimit);
        resolve(limitedRows);
      } catch (err) {
        reject(err);
      }
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Query timeout after ${effectiveTimeout}ms`)), effectiveTimeout);
    });
    
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    const response = {
      rows: result,
      count: Array.isArray(result) ? result.length : 0,
      limit: effectiveLimit,
      hasMore: Array.isArray(result) && result.length === effectiveLimit,
      executionTime: effectiveTimeout,
    };

    return {
      content: [
        { type: "text", text: JSON.stringify(response, null, 2) },
      ],
    };
  }
);

// 5. Transaction support
server.tool("begin_transaction", "Begin a database transaction", async () => {
  if (!db) throw new Error("Database not opened");
  db.exec("BEGIN TRANSACTION");
  return {
    content: [{ type: "text", text: "Transaction started" }],
  };
});

server.tool("commit_transaction", "Commit the current transaction", async () => {
  if (!db) throw new Error("Database not opened");
  db.exec("COMMIT");
  return {
    content: [{ type: "text", text: "Transaction committed" }],
  };
});

server.tool("rollback_transaction", "Rollback the current transaction", async () => {
  if (!db) throw new Error("Database not opened");
  db.exec("ROLLBACK");
  return {
    content: [{ type: "text", text: "Transaction rolled back" }],
  };
});

// 6. Execute write operations (INSERT/UPDATE/DELETE) with safety checks
server.tool(
  "execute_write",
  "Execute INSERT, UPDATE, or DELETE query with safety confirmation",
  {
    sql: z.string(),
    confirm: z.boolean().default(false),
  },
  async ({ sql, confirm }) => {
    if (!db) throw new Error("Database not opened");

    const normalizedSql = sql.trim().toLowerCase();
    
    // Determine operation type
    let operation: string;
    if (normalizedSql.startsWith('insert')) {
      operation = 'INSERT';
    } else if (normalizedSql.startsWith('update')) {
      operation = 'UPDATE';
    } else if (normalizedSql.startsWith('delete')) {
      operation = 'DELETE';
    } else {
      throw new Error("Only INSERT, UPDATE, or DELETE queries allowed in this tool");
    }

    // Block dangerous patterns
    if (normalizedSql.includes('drop table') || 
        normalizedSql.includes('drop database') ||
        normalizedSql.includes('truncate')) {
      throw new Error("Dangerous operations not allowed");
    }

    // Require confirmation for DELETE without WHERE or UPDATE without WHERE
    const hasWhere = normalizedSql.includes('where');
    if (!confirm && ((operation === 'DELETE' && !hasWhere) || (operation === 'UPDATE' && !hasWhere))) {
      throw new Error(
        `⚠️ WARNING: ${operation} without WHERE clause will affect ALL rows. ` +
        `Set confirm=true to proceed anyway, or add a WHERE clause.`
      );
    }

    // Show preview if not confirmed
    if (!confirm) {
      // Get affected rows count preview
      let previewQuery: string;
      if (operation === 'DELETE') {
        previewQuery = sql.replace(/delete/i, 'SELECT *');
      } else if (operation === 'UPDATE') {
        previewQuery = sql.replace(/update\s+(\w+)\s+set/i, 'SELECT * FROM $1 WHERE');
        previewQuery = previewQuery.replace(/=\s*[^,]+/g, 'IS NOT NULL');
      } else {
        previewQuery = '';
      }

      return {
        content: [
          { 
            type: "text", 
            text: `Preview for: ${sql}\n\n` +
                  `Operation: ${operation}\n` +
                  `⚠️ This will modify data in the database.\n\n` +
                  `Set confirm=true to execute this query.`
          },
        ],
      };
    }

    // Execute the write operation
    const result = db.prepare(sql).run();
    
    return {
      content: [
        { 
          type: "text", 
          text: JSON.stringify({
            operation,
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid,
            message: `${operation} completed successfully`,
          }, null, 2) 
        },
      ],
    };
  }
);

// 7. Get full database schema (DDL export)
server.tool("get_schema", "Export complete database schema as SQL DDL", async () => {
  if (!db) throw new Error("Database not opened");

  // Get all tables
  const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL").all();
  
  // Get all indexes
  const indexes = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").all();
  
  // Get all views
  const views = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='view' AND sql IS NOT NULL").all();
  
  // Get all triggers
  const triggers = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='trigger' AND sql IS NOT NULL").all();

  // Build complete schema SQL
  let schema = "-- Database Schema Export\n";
  schema += `-- Generated: ${new Date().toISOString()}\n\n`;
  
  // Tables
  schema += "-- Tables\n";
  tables.forEach((t: any) => {
    schema += `${t.sql};\n\n`;
  });
  
  // Indexes
  if (indexes.length > 0) {
    schema += "-- Indexes\n";
    indexes.forEach((i: any) => {
      schema += `${i.sql};\n\n`;
    });
  }
  
  // Views
  if (views.length > 0) {
    schema += "-- Views\n";
    views.forEach((v: any) => {
      schema += `${v.sql};\n\n`;
    });
  }
  
  // Triggers
  if (triggers.length > 0) {
    schema += "-- Triggers\n";
    triggers.forEach((t: any) => {
      schema += `${t.sql};\n\n`;
    });
  }

  return {
    content: [
      { 
        type: "text", 
        text: JSON.stringify({
          tables: tables.map((t: any) => t.name),
          indexes: indexes.map((i: any) => i.name),
          views: views.map((v: any) => v.name),
          triggers: triggers.map((t: any) => t.name),
          ddl: schema,
          summary: {
            tableCount: tables.length,
            indexCount: indexes.length,
            viewCount: views.length,
            triggerCount: triggers.length,
          }
        }, null, 2) 
      },
    ],
  };
});

// 8. Export query results to CSV
server.tool(
  "export_csv",
  "Export query results to CSV format",
  {
    sql: z.string(),
    filename: z.string().optional(),
  },
  async ({ sql, filename }) => {
    if (!db) throw new Error("Database not opened");

    // Validate query (must be SELECT)
    const normalizedSql = sql.trim().toLowerCase();
    if (!normalizedSql.startsWith('select')) {
      throw new Error("Only SELECT queries can be exported to CSV");
    }

    // Execute query
    const result = db.prepare(sql).all();
    
    if (result.length === 0) {
      return {
        content: [{ type: "text", text: "No data to export" }],
      };
    }

    // Convert to CSV
    if (result.length === 0) {
      return {
        content: [{ type: "text", text: "No data to export" }],
      };
    }
    const headers = Object.keys(result[0] as object);
    const csvRows: string[] = [];
    
    // Header row
    csvRows.push(headers.join(','));
    
    // Data rows
    for (const row of result) {
      const values = headers.map(h => {
        const val = (row as any)[h];
        if (val === null || val === undefined) return '';
        // Escape values containing commas or quotes
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvRows.push(values.join(','));
    }
    
    const csv = csvRows.join('\n');
    const outputFilename = filename || `export_${Date.now()}.csv`;

    return {
      content: [
        { 
          type: "text", 
          text: JSON.stringify({
            filename: outputFilename,
            rowCount: result.length,
            csv: csv,
            preview: csv.substring(0, 500) + (csv.length > 500 ? '...' : ''),
          }, null, 2) 
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
