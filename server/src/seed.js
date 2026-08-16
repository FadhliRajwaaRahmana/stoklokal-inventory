// seed.js — data demo: jalankan `node src/seed.js` [async — Turso]
// Multi-user: admin@demo.app mendapat katalog utama, user2@demo.app mendapat katalog kecil
// (membuktikan isolasi per user + landing page yang mengakumulasi semua user).
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { db, initDb } from './db.js';

// Kategori & produk admin (katalog utama)
const ADMIN_CATEGORIES = [
  ['Elektronik', 'Perangkat elektronik & aksesoris'],
  ['Perlengkapan Kantor', 'ATK dan kebutuhan kantor'],
  ['Fashion', 'Pakaian dan aksesoris gaya'],
  ['Makanan & Minuman', 'Produk konsumsi harian'],
  ['Skincare & Kecantikan', 'Produk perawatan diri'],
];

const PRODUCTS = [
  ['Headphone Bluetooth Pro', 'ELEK-001', 'Elektronik', 599000, 420000, 42, 8],
  ['Wireless Mouse Ergo', 'ELEK-002', 'Elektronik', 159000, 95000, 120, 15],
  ['Keyboard Mechanical RGB', 'ELEK-003', 'Elektronik', 489000, 320000, 27, 10],
  ['Powerbank 20000mAh', 'ELEK-004', 'Elektronik', 249000, 165000, 4, 10],
  ['Kabel USB-C Fast Charging', 'ELEK-005', 'Elektronik', 49000, 28000, 0, 20],
  ['Kertas A4 80gsm (1 rim)', 'ATK-001', 'Perlengkapan Kantor', 55000, 40000, 200, 25],
  ['Pulpen Gel Hitam (box)', 'ATK-002', 'Perlengkapan Kantor', 75000, 52000, 85, 12],
  ['Sticky Notes Warna (pack)', 'ATK-003', 'Perlengkapan Kantor', 18000, 11000, 6, 15],
  ['Tas Ransel Urban', 'FASH-001', 'Fashion', 349000, 240000, 18, 6],
  ['Kaos Polos Premium', 'FASH-002', 'Fashion', 99000, 62000, 7, 10],
  ['Sneakers White Court', 'FASH-003', 'Fashion', 799000, 540000, 12, 5],
  ['Kopi Arabica 250g', 'FNB-001', 'Makanan & Minuman', 85000, 58000, 3, 10],
  ['Granola Bar (box 12)', 'FNB-002', 'Makanan & Minuman', 96000, 67000, 64, 15],
  ['Teh Melati Premium 30s', 'FNB-003', 'Makanan & Minuman', 42000, 28000, 150, 20],
  ['Sunscreen SPF 50+', 'BEAUTY-001', 'Skincare & Kecantikan', 129000, 84000, 9, 8],
  ['Serum Vitamin C', 'BEAUTY-002', 'Skincare & Kecantikan', 189000, 125000, 35, 8],
  ['Face Mist Hydrating', 'BEAUTY-003', 'Skincare & Kecantikan', 89000, 56000, 2, 8],
];

const TRANSACTIONS = [
  ['ELEK-001', 'in', 20, 'Restock supplier utama', 6],
  ['ELEK-001', 'out', 12, 'Penjualan online', 4],
  ['ELEK-002', 'in', 50, 'PO #INV-2041', 5],
  ['ELEK-003', 'out', 8, 'Penjualan toko', 3],
  ['ELEK-004', 'out', 5, 'Penjualan online', 2],
  ['ATK-001', 'in', 100, 'Restock bulanan', 6],
  ['ATK-001', 'out', 60, 'Penjualan grosir', 1],
  ['ATK-002', 'out', 30, 'Penjualan toko', 2],
  ['FASH-001', 'in', 10, 'Restock koleksi baru', 4],
  ['FASH-002', 'out', 4, 'Penjualan online', 1],
  ['FNB-001', 'in', 25, 'Restock kafe', 3],
  ['FNB-001', 'out', 10, 'Penjualan toko', 0],
  ['FNB-002', 'out', 18, 'Penjualan online', 2],
  ['BEAUTY-001', 'in', 15, 'Restock rutin', 5],
  ['BEAUTY-001', 'out', 6, 'Penjualan toko', 1],
  ['BEAUTY-003', 'out', 3, 'Penjualan online', 0],
];

// Katalog user2 (toko kedua) — SKU berbeda agar unik per user
const USER2_CATEGORIES = [
  ['Buku & Alat Tulis', 'Buku, notebook dan alat tulis'],
  ['Peralatan Dapur', 'Perlengkapan masak dan dapur'],
];

const USER2_PRODUCTS = [
  ['Notebook A5 Dot Grid', 'BUKU-001', 'Buku & Alat Tulis', 35000, 21000, 60, 10],
  ['Pensil Mekanik 0.5', 'BUKU-002', 'Buku & Alat Tulis', 15000, 8000, 0, 15],
  ['Stabilo Highlighter (pack)', 'BUKU-003', 'Buku & Alat Tulis', 45000, 28000, 25, 8],
  ['Wajan Anti Lengket 24cm', 'DAPUR-001', 'Peralatan Dapur', 189000, 125000, 14, 5],
  ['Gelas Kaca Set (6pcs)', 'DAPUR-002', 'Peralatan Dapur', 99000, 62000, 5, 8],
];

export async function seed() {
  await initDb();
  const demoPass = process.env.SEED_PASSWORD || crypto.randomBytes(9).toString('base64url');

  // ---------- User admin ----------
  const adminHash = bcrypt.hashSync(demoPass, 10);
  await db
    .prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET password = excluded.password')
    .run('Admin Demo', 'admin@demo.app', adminHash);
  const admin = await db.prepare('SELECT id FROM users WHERE email = ?').get('admin@demo.app');

  // ---------- User kedua (toko kecil) ----------
  const user2Hash = bcrypt.hashSync(demoPass, 10);
  await db
    .prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET password = excluded.password')
    .run('Toko Kenangan', 'user2@demo.app', user2Hash);
  const user2 = await db.prepare('SELECT id FROM users WHERE email = ?').get('user2@demo.app');

  // ---------- Seed data ADMIN (idempotent, prefix seed:) ----------
  // Kategori admin — upsert per user (UNIQUE(name, user_id))
  const insertCatAdmin = db.prepare(
    `INSERT INTO categories (user_id, name, description) VALUES (?, ?, ?)
     ON CONFLICT(name, user_id) DO UPDATE SET description = excluded.description`
  );
  for (const [name, desc] of ADMIN_CATEGORIES) {
    await insertCatAdmin.run(admin.id, name, desc);
  }
  await db.prepare(`DELETE FROM products WHERE user_id = ? AND sku LIKE 'seed:%'`).run(admin.id);
  const insertProduct = db.prepare(
    `INSERT INTO products (user_id, name, sku, category_id, price, cost, stock, min_stock)
     VALUES (?, ?, ?, (SELECT id FROM categories WHERE name = ? AND user_id = ?), ?, ?, ?, ?)
     ON CONFLICT(sku, user_id) DO UPDATE SET price = excluded.price, cost = excluded.cost,
       stock = excluded.stock, min_stock = excluded.min_stock`
  );
  for (const [name, sku, cat, price, cost, stock, min] of PRODUCTS) {
    await insertProduct.run(admin.id, name, `seed:${sku}`, cat, admin.id, price, cost, stock, min);
  }

  await db.prepare(`DELETE FROM transactions WHERE user_id = ? AND note LIKE 'seed:%'`).run(admin.id);
  const insertTx = db.prepare(
    `INSERT INTO transactions (user_id, product_id, type, qty, note, created_at)
     VALUES (?, (SELECT id FROM products WHERE sku = ? AND user_id = ?), ?, ?, ?, datetime('now', '+7 hours', ?))`
  );
  for (const [sku, type, qty, note, daysAgo] of TRANSACTIONS) {
    await insertTx.run(admin.id, `seed:${sku}`, admin.id, type, qty, `seed:${note}`, `-${daysAgo} days`);
  }

  // Sinkronkan stok admin dengan riwayat
  await db.exec(`
    UPDATE products SET stock = stock - COALESCE((
      SELECT SUM(qty) FROM transactions t
      WHERE t.product_id = products.id AND t.type = 'out'
    ), 0);
  `);

  // ---------- Seed data USER2 (idempotent, prefix seed:) ----------
  await db.prepare(`DELETE FROM categories WHERE user_id = ? AND name LIKE 'seed:%'`).run(user2.id);
  const insertCat2 = db.prepare(
    `INSERT INTO categories (user_id, name, description) VALUES (?, ?, ?)
     ON CONFLICT(name, user_id) DO UPDATE SET description = excluded.description`
  );
  for (const [name, desc] of USER2_CATEGORIES) {
    await insertCat2.run(user2.id, `seed:${name}`, desc);
  }
  await db.prepare(`DELETE FROM products WHERE user_id = ? AND sku LIKE 'seed:%'`).run(user2.id);
  const insertProduct2 = db.prepare(
    `INSERT INTO products (user_id, name, sku, category_id, price, cost, stock, min_stock)
     VALUES (?, ?, ?, (SELECT id FROM categories WHERE name = ? AND user_id = ?), ?, ?, ?, ?)
     ON CONFLICT(sku, user_id) DO UPDATE SET price = excluded.price, cost = excluded.cost,
       stock = excluded.stock, min_stock = excluded.min_stock`
  );
  for (const [name, sku, cat, price, cost, stock, min] of USER2_PRODUCTS) {
    await insertProduct2.run(user2.id, name, `seed:${sku}`, `seed:${cat}`, user2.id, price, cost, stock, min);
  }

  // Hapus seed kategori/transaksi lama yang mungkin tersisa, hapus catatan audit seed
  await db.prepare(`DELETE FROM categories WHERE user_id = ? AND name LIKE 'seed:%'`).run(admin.id);

  console.log('[seed] Data demo berhasil dimuat');
  console.log(`[seed] Login 1 — admin@demo.app / ${process.env.SEED_PASSWORD ? 'SEED_PASSWORD (dari env)' : demoPass}`);
  console.log(`[seed] Login 2 — user2@demo.app / ${process.env.SEED_PASSWORD ? 'SEED_PASSWORD (dari env)' : demoPass}`);
}

// Jalankan langsung saat `node src/seed.js`
// Bandingkan path ABSOLUT (pathToFileURL) — argv[1] bisa relatif di Windows
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  seed().catch((e) => {
    console.error('[seed] Gagal:', e.message);
    process.exit(1);
  });
}
