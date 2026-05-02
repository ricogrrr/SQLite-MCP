import Database from "better-sqlite3";

const db = new Database("sample.db");

db.exec(`
  CREATE TABLE employees (
    id INTEGER PRIMARY KEY,
    name TEXT,
    department TEXT,
    salary INTEGER,
    hire_date TEXT
  );
  
  INSERT INTO employees VALUES 
    (1, 'Alice Johnson', 'Engineering', 95000, '2022-03-15'),
    (2, 'Bob Smith', 'Sales', 75000, '2021-07-22'),
    (3, 'Carol Williams', 'Engineering', 110000, '2020-01-10'),
    (4, 'David Brown', 'Marketing', 68000, '2023-09-05'),
    (5, 'Eve Davis', 'Sales', 82000, '2022-11-30');
  
  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT,
    category TEXT,
    price REAL,
    stock INTEGER
  );
  
  INSERT INTO products VALUES 
    (1, 'Laptop Pro', 'Electronics', 1299.99, 45),
    (2, 'Wireless Mouse', 'Electronics', 29.99, 200),
    (3, 'Desk Chair', 'Furniture', 349.99, 12),
    (4, 'USB-C Hub', 'Electronics', 59.99, 85),
    (5, 'Standing Desk', 'Furniture', 599.99, 8);
`);

db.close();
console.log("✅ sample.db created with employees and products tables!");
