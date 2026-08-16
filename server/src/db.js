// db.js — SQLite init menggunakan node:sqlite (built-in Node 22+, tanpa native compile)
// Lebih aman untuk Vercel serverless daripada better-sqlite3 (native module).
// Di serverless → in-memory (tidak persisten antar cold start — sesuai pilihan user).
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IS_LAMBDA = !!(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY || process.env.VERCEL);

// Di serverless tidak bisa pakai file — fallback ke in-memory
const DB_PATH = IS_LAMBDA ? ':memory:' : path.join(__dirname, '..', 'data', 'inventory.db');
if (!IS_LAMBDA) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    price REAL NOT NULL DEFAULT 0,
    cost REAL NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 5,
    image TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    type TEXT NOT NULL CHECK (type IN ('in', 'out')),
    qty INTEGER NOT NULL,
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Token revocation (logout): JWT di-blacklist sampai expiry
  CREATE TABLE IF NOT EXISTS token_blacklist (
    jti TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL
  );
`);

// Index untuk query dashboard & riwayat
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
`);
