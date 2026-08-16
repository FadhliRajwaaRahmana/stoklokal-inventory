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

// ---------- Utility migrasi ----------
// Cek apakah kolom sudah ada (PRAGMA table_info tidak menerima parameter terikat)
async function columnExists(table, column) {
  try {
    const res = await client.execute(`PRAGMA table_info(${table})`);
    return res.rows.some((r) => r && r.name === column);
  } catch {
    return false;
  }
}

// Rebuild tabel untuk mengganti constraint UNIQUE global → UNIQUE per user.
// Dijalankan dalam transaksi — gagal di tengah = rollback penuh (aman).
// `indexes`: daftar SQL yang dijalankan SETELAH commit (index hilang saat DROP TABLE).
async function rebuildTable({ table, createSql, copySql, indexes }) {
  const tx = await client.transaction();
  try {
    await tx.execute(`ALTER TABLE ${table} RENAME TO ${table}_old`);
    await tx.execute(createSql);
    await tx.execute(copySql);
    await tx.execute(`DROP TABLE ${table}_old`);
    await tx.execute(`ALTER TABLE ${table}_new RENAME TO ${table}`);
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
  if (indexes) {
    for (const sql of indexes) await client.execute(sql);
  }
}

// ---------- Schema init (async) ----------
// Multi-user: setiap data punya user_id (isolasi per user).
// UNIQUE name/sku sekarang PER USER (bukan global) — dua user boleh punya SKU yang sama.
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
      user_id INTEGER REFERENCES users(id),
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(name, user_id)
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      name TEXT NOT NULL,
      sku TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      price REAL NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 5,
      image TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(sku, user_id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
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

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      actor TEXT DEFAULT '',
      action TEXT NOT NULL,
      entity TEXT NOT NULL DEFAULT '',
      entity_id INTEGER,
      details TEXT NOT NULL DEFAULT '{}',
      ip TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);

  // ---------- Migrasi idempotent untuk DB lama (sebelum multi-user) ----------
  // categories & products perlu REBUILD (ganti UNIQUE global → UNIQUE per user);
  // transactions cukup ADD COLUMN (tidak punya constraint UNIQUE).
  if (!(await columnExists('categories', 'user_id'))) {
    await rebuildTable({
      table: 'categories',
      createSql: `CREATE TABLE categories_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(name, user_id)
      )`,
      copySql: `INSERT INTO categories_new (id, user_id, name, description, created_at)
                SELECT id, NULL, name, description, created_at FROM categories`,
    });
  }

  if (!(await columnExists('products', 'user_id'))) {
    await rebuildTable({
      table: 'products',
      createSql: `CREATE TABLE products_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        name TEXT NOT NULL,
        sku TEXT NOT NULL,
        category_id INTEGER REFERENCES categories(id),
        price REAL NOT NULL DEFAULT 0,
        cost REAL NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER NOT NULL DEFAULT 5,
        image TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(sku, user_id)
      )`,
      copySql: `INSERT INTO products_new (id, user_id, name, sku, category_id, price, cost, stock, min_stock, image, created_at)
                SELECT id, NULL, name, sku, category_id, price, cost, stock, min_stock, image, created_at FROM products`,
      indexes: ['CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)'],
    });
  }

  if (!(await columnExists('transactions', 'user_id'))) {
    await exec(`ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES users(id)`);
  }

  // Pastikan index ada (setelah rebuild products, index lama ikut ter-drop)
  await exec(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`);
  await exec(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)`);
  await exec(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)`);
}
