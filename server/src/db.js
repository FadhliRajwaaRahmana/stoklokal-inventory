// db.js — Database layer: Turso (libSQL cloud) di produksi, file SQLite lokal di dev.
// API meniru better-sqlite3 (prepare().get/all/run) tapi ASYNC — semua route pakai await.
// Turso = SQLite cloud → data PERMANEN di Vercel serverless.
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IS_LAMBDA = !!(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY || process.env.VERCEL);

// Mode:
// 1. TURSO_DATABASE_URL + TURSO_AUTH_TOKEN → cloud Turso (produksi Vercel)
// 2. file: local.db → file SQLite lokal (dev, data persist di disk)
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

const localPath = path.join(__dirname, '..', 'data', 'inventory.db');
if (!IS_LAMBDA && !TURSO_URL) fs.mkdirSync(path.dirname(localPath), { recursive: true });

const client = TURSO_URL
  ? createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
  : createClient({ url: `file:${localPath}` });

// ---------- Adapter: prepare().get/all/run → async ----------
// Menerima spread args: .run(a, b, c) atau .run([a,b,c]) atau .get({named: params})
function normalizeArgs(args) {
  if (!args.length) return [];
  if (args.length === 1) {
    const a = args[0];
    if (Array.isArray(a)) return a;
    if (a && typeof a === 'object' && !(a instanceof Date)) return a; // named params object
    return [a];
  }
  return args;
}

function prepare(sql) {
  return {
    async get(...args) {
      const res = await client.execute({ sql, args: normalizeArgs(args) });
      return res.rows[0] ?? undefined;
    },
    async all(...args) {
      const res = await client.execute({ sql, args: normalizeArgs(args) });
      return res.rows;
    },
    async run(...args) {
      const res = await client.execute({ sql, args: normalizeArgs(args) });
      return { changes: res.rowsAffected, lastInsertRowid: Number(res.lastInsertRowid ?? 0) };
    },
  };
}

// Eksekusi multi-statement (schema init)
async function exec(sql) {
  await client.executeMultiple(sql);
}

// Transaksi: gunakan client.transaction() resmi Turso (atomik, auto rollback)
// fn menerima `tx` (transaction handle) — semua query di dalam transaksi memakai tx.
async function transaction(fn) {
  const tx = await client.transaction();
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

export const db = {
  prepare,
  exec,
  transaction,
  client, // akses langsung jika perlu
};

// ---------- Schema init (async) ----------
export async function initDb() {
  await exec(`
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

    CREATE TABLE IF NOT EXISTS token_blacklist (
      jti TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  `);
}
