// routes/products.js — CRUD produk + search/filter/sort + status stok
import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

const SELECT = `
  SELECT p.id, p.name, p.sku, p.category_id, p.price, p.cost, p.stock, p.min_stock, p.image, p.created_at,
         c.name AS category_name
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

function buildWhere(q) {
  const clauses = [];
  const params = {};
  if (q.search) {
    // Escape % dan _ dengan backslash + ESCAPE clause — wildcard user tidak match semua
    const escaped = String(q.search).replace(/[\\%_]/g, (m) => '\\' + m);
    clauses.push("(p.name LIKE @search ESCAPE '\\' OR p.sku LIKE @search ESCAPE '\\')");
    params.search = `%${escaped}%`;
  }
  if (q.category_id) {
    clauses.push('p.category_id = @category_id');
    params.category_id = Number(q.category_id);
  }
  if (q.status === 'low') clauses.push('p.stock <= p.min_stock');
  if (q.status === 'out') clauses.push('p.stock <= 0');
  if (q.status === 'ok') clauses.push('p.stock > p.min_stock');
  return clauses.length ? { sql: ` WHERE ${clauses.join(' AND ')}`, params } : { sql: '', params };
}

// ---------- Validasi helper ----------
function isValidPositiveNumber(v) {
  return v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0;
}

// Parse angka query aman — NaN/Infinity/negatif → fallback default
function safeInt(v, fallback, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}

router.get('/', (req, res) => {
  const q = req.query || {};
  const { sql, params } = buildWhere(q);

  // Sort aman — hanya terima whitelist kolom
  const sortMap = { name: 'p.name', price: 'p.price', stock: 'p.stock', created: 'p.created_at' };
  const sortCol = sortMap[q.sort] || 'p.created_at';
  const dir = q.order === 'asc' ? 'ASC' : 'DESC';

  // Pagination divalidasi aman: NaN/Infinity/negatif → fallback
  const limit = safeInt(q.limit, 50, 1, 200);
  const offset = safeInt(q.offset, 0, 0, 1_000_000);

  const count = db.prepare(`SELECT COUNT(*) AS n FROM products p ${sql}`).get(params).n;
  const rows = db
    .prepare(`${SELECT}${sql} ORDER BY ${sortCol} ${dir} LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset });

  const summary = {
    total: db.prepare('SELECT COUNT(*) AS n FROM products').get().n,
    totalStock: db.prepare('SELECT COALESCE(SUM(stock), 0) AS n FROM products').get().n,
    totalValue: db.prepare('SELECT COALESCE(SUM(stock * cost), 0) AS n FROM products').get().n,
    lowStock: db.prepare('SELECT COUNT(*) AS n FROM products WHERE stock <= min_stock').get().n,
  };
  res.json({ rows, total: count, summary });
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'ID tidak valid' });
  const row = db.prepare(`${SELECT} WHERE p.id = ?`).get(id);
  if (!row) return res.status(404).json({ message: 'Produk tidak ditemukan' });
  res.json(row);
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (typeof b.name !== 'string' || typeof b.sku !== 'string') return res.status(400).json({ message: 'Nama dan SKU wajib bertipe teks' });
  const name = b.name.trim();
  const sku = b.sku.trim();
  if (!name || !sku) return res.status(400).json({ message: 'Nama dan SKU wajib diisi' });
  if (name.length > 120 || sku.length > 50) return res.status(400).json({ message: 'Nama/SKU terlalu panjang' });
  if (!b.category_id) return res.status(400).json({ message: 'Kategori wajib dipilih' });

  const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(Number(b.category_id));
  if (!cat) return res.status(400).json({ message: 'Kategori tidak valid' });

  if (!isValidPositiveNumber(b.price) || !isValidPositiveNumber(b.cost) || !isValidPositiveNumber(b.stock) || !isValidPositiveNumber(b.min_stock)) {
    return res.status(400).json({ message: 'Harga/stok harus angka non-negatif' });
  }
  const price = Number(b.price);
  const cost = Number(b.cost);
  const stock = Math.floor(Number(b.stock));
  const min_stock = Math.floor(Number(b.min_stock) || 5);
  if (!Number.isFinite(price) || !Number.isFinite(cost) || price > 1e12 || cost > 1e12) {
    return res.status(400).json({ message: 'Nilai harga tidak valid' });
  }

  try {
    const info = db
      .prepare(
        `INSERT INTO products (name, sku, category_id, price, cost, stock, min_stock, image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(name, sku, Number(b.category_id), price, cost, stock, min_stock, typeof b.image === 'string' ? b.image.trim() : '');
    res.status(201).json(db.prepare(`${SELECT} WHERE p.id = ?`).get(info.lastInsertRowid));
  } catch (err) {
    // Hanya mapping UNIQUE constraint ke 409; error lain → 500 (biar tidak masking bug)
    if (String(err?.message).includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'SKU sudah digunakan produk lain' });
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'ID tidak valid' });
  const b = req.body || {};
  if (typeof b.name !== 'string' || typeof b.sku !== 'string') return res.status(400).json({ message: 'Nama dan SKU wajib bertipe teks' });
  const name = b.name.trim();
  const sku = b.sku.trim();
  if (!name || !sku) return res.status(400).json({ message: 'Nama dan SKU wajib diisi' });
  if (name.length > 120 || sku.length > 50) return res.status(400).json({ message: 'Nama/SKU terlalu panjang' });

  const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(Number(b.category_id));
  if (!cat) return res.status(400).json({ message: 'Kategori tidak valid' });

  if (!isValidPositiveNumber(b.price) || !isValidPositiveNumber(b.cost) || !isValidPositiveNumber(b.min_stock)) {
    return res.status(400).json({ message: 'Harga/stok harus angka non-negatif' });
  }
  const price = Number(b.price);
  const cost = Number(b.cost);
  const min_stock = Math.floor(Number(b.min_stock) || 5);
  if (!Number.isFinite(price) || !Number.isFinite(cost) || price > 1e12 || cost > 1e12) {
    return res.status(400).json({ message: 'Nilai harga tidak valid' });
  }

  try {
    const info = db
      .prepare(
        `UPDATE products SET name = ?, sku = ?, category_id = ?, price = ?, cost = ?,
                min_stock = ?, image = ? WHERE id = ?`
      )
      .run(
        name,
        sku,
        Number(b.category_id),
        price,
        cost,
        min_stock,
        typeof b.image === 'string' ? b.image.trim() : '',
        id
      );
    if (!info.changes) return res.status(404).json({ message: 'Produk tidak ditemukan' });
    res.json(db.prepare(`${SELECT} WHERE p.id = ?`).get(id));
  } catch (err) {
    if (String(err?.message).includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'SKU sudah digunakan produk lain' });
    }
    throw err;
  }
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'ID tidak valid' });
  db.prepare('DELETE FROM transactions WHERE product_id = ?').run(id); // hapus riwayat terkait
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  if (!info.changes) return res.status(404).json({ message: 'Produk tidak ditemukan' });
  res.json({ ok: true });
});

export default router;
