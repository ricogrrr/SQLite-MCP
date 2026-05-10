# SQLite MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to interact with SQLite databases.

## Features

- **🔌 Open Database**: Connect to any SQLite database file
- **📋 List Tables**: View all tables in the database
- **🔍 Run Queries**: Execute safe SELECT queries (read-only)
- **⚡ TypeScript**: Built with TypeScript and modern MCP SDK

## Installation

```bash
npm install
```

## Usage

### Option 1: Connect to Windsurf/Cascade

Add to your MCP config (`~/.codeium/windsurf/mcp_config.json`):

```json
{
  "mcpServers": {
    "sqlite": {
      "command": "node",
      "args": ["/path/to/sqlite-mcp/dist/server.js"],
      "cwd": "/path/to/sqlite-mcp"
    }
  }
}
```

Then ask your AI assistant:
> "Open the sample database and show me all employees in Engineering"

### Option 2: Run Standalone

First build the project:
```bash
npm run build
```

Then start the server:
```bash
npm start
```

The server communicates via stdio using the MCP protocol.

### Option 3: Test with Sample Database

```bash
# Create sample database (if needed)
node create-sample-db.js

# Or use the included sample.db
npx ts-node --esm src/server.ts
```

## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `open_database` | Open a SQLite database file | `path: string` |
| `list_tables` | List all tables in the database | none |
| `run_query` | Run SELECT queries | `sql: string` |

## Sample Database

The included `sample.db` contains two tables:

### employees
- `id`, `name`, `department`, `salary`, `hire_date`
- 5 sample employees across Engineering, Sales, and Marketing

### products
- `id`, `name`, `category`, `price`, `stock`
- 5 sample products in Electronics and Furniture categories

## Example Queries

Once connected, you can ask:
- "List all tables"
- "Show me all employees in the Engineering department"
- "What's the average salary by department?"
- "Which products have less than 20 in stock?"

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npx ts-node --esm src/server.ts
```

## Requirements

- Node.js 18+
- TypeScript
- better-sqlite3

## License

MIT
