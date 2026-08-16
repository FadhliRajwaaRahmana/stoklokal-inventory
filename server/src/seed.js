// seed.js — data demo: jalankan `node src/seed.js`
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db } from './db.js';

const SEED = `
  INSERT INTO categories (name, description) VALUES
    ('Elektronik', 'Perangkat elektronik & aksesoris'),
    ('Perlengkapan Kantor', 'ATK dan kebutuhan kantor'),
    ('Fashion', 'Pakaian dan aksesoris gaya'),
    ('Makanan & Minuman', 'Produk konsumsi harian'),
    ('Skincare & Kecantikan', 'Produk perawatan diri')
  ON CONFLICT(name) DO NOTHING;
`;

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
  // [sku, type, qty, note, daysAgo]
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

function seed() {
  // Password demo: env SEED_PASSWORD atau acak (jangan hardcode lemah di produksi)
  const demoPass = process.env.SEED_PASSWORD || crypto.randomBytes(9).toString('base64url');
  const hash = bcrypt.hashSync(demoPass, 10);
  db.exec(SEED);
  db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING')
    .run('Admin Demo', 'admin@demo.app', hash);

  const insertProduct = db.prepare(
    `INSERT OR IGNORE INTO products (name, sku, category_id, price, cost, stock, min_stock)
     VALUES (?, ?, (SELECT id FROM categories WHERE name = ?), ?, ?, ?, ?)`
  );
  PRODUCTS.forEach(([name, sku, cat, price, cost, stock, min]) => {
    insertProduct.run(name, sku, cat, price, cost, stock, min);
  });

  // Idempotent: hapus transaksi seed lama (ditandai note khusus) sebelum insert ulang
  db.prepare(`DELETE FROM transactions WHERE note LIKE 'seed:%'`).run();
  const insertTx = db.prepare(
    `INSERT INTO transactions (product_id, type, qty, note, created_at)
     VALUES ((SELECT id FROM products WHERE sku = ?), ?, ?, ?, datetime('now', ?))`
  );
  TRANSACTIONS.forEach(([sku, type, qty, note, daysAgo]) => {
    insertTx.run(sku, type, qty, `seed:${note}`, `-${daysAgo} days`);
  });

  // Sinkronkan stok dengan riwayat (agar stok awal konsisten dengan transaksi)
  db.exec(`
    UPDATE products SET stock = stock - COALESCE((
      SELECT SUM(qty) FROM transactions t
      WHERE t.product_id = products.id AND t.type = 'out'
    ), 0);
  `);

  console.log('[seed] Data demo berhasil dimuat');
  console.log(`[seed] Login demo: admin@demo.app / ${process.env.SEED_PASSWORD ? 'SEED_PASSWORD (dari env)' : demoPass}`);
  console.log('[seed] PENTING: di produksi set SEED_PASSWORD env sebelum seed.');
}

seed();
