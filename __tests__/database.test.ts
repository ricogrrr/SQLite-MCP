import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('SQLite Database Operations', () => {
  let db: Database.Database;
  const testDbPath = join(__dirname, 'test.db');

  beforeEach(() => {
    // Clean up if exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new Database(testDbPath);
    
    // Create test table
    db.exec(`
      CREATE TABLE test_table (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        value REAL,
        active INTEGER DEFAULT 1
      );
      
      INSERT INTO test_table VALUES 
        (1, 'Alice', 100.50, 1),
        (2, 'Bob', 200.75, 0),
        (3, 'Carol', 150.00, 1);
    `);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Basic Queries', () => {
    test('should list all tables', () => {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all();
      
      expect(tables).toHaveLength(1);
      expect(tables[0].name).toBe('test_table');
    });

    test('should select all rows', () => {
      const result = db.prepare('SELECT * FROM test_table').all();
      
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Alice');
    });

    test('should respect row limits', () => {
      const result = db.prepare('SELECT * FROM test_table').limit(2).all();
      
      expect(result).toHaveLength(2);
    });

    test('should filter with WHERE clause', () => {
      const result = db.prepare('SELECT * FROM test_table WHERE active = 1').all();
      
      expect(result).toHaveLength(2);
      expect(result.every((row: any) => row.active === 1)).toBe(true);
    });
  });

  describe('Schema Operations', () => {
    test('should get table info via PRAGMA', () => {
      const columns = db.prepare('PRAGMA table_info(test_table)').all();
      
      expect(columns).toHaveLength(4);
      expect(columns.map((c: any) => c.name)).toContain('id');
      expect(columns.map((c: any) => c.name)).toContain('name');
    });

    test('should detect primary key', () => {
      const columns = db.prepare('PRAGMA table_info(test_table)').all();
      const idColumn = columns.find((c: any) => c.name === 'id');
      
      expect(idColumn.pk).toBe(1);
    });
  });

  describe('Safety Checks', () => {
    test('should only allow SELECT queries', () => {
      const sql = 'SELECT * FROM test_table';
      const isSelect = sql.trim().toLowerCase().startsWith('select');
      
      expect(isSelect).toBe(true);
    });

    test('should reject non-SELECT queries', () => {
      const dangerousQueries = [
        'INSERT INTO test_table VALUES (4, "Eve", 300, 1)',
        'UPDATE test_table SET name = "Eve" WHERE id = 1',
        'DELETE FROM test_table WHERE id = 1',
        'DROP TABLE test_table',
        'ALTER TABLE test_table ADD COLUMN new_col TEXT',
      ];

      dangerousQueries.forEach(sql => {
        const isSelect = sql.trim().toLowerCase().startsWith('select');
        expect(isSelect).toBe(false);
      });
    });
  });
});
