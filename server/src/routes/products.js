// routes/products.js — CRUD produk + search/filter/sort + status stok
// Multi-user: semua query di-scope user_id (isolasi per user), mutasi dicatat ke audit_logs.
import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { logAudit, auditContext, toSnapshot } from '../audit.js';

const router = Router();
router.use(authRequired);

const SELECT = `
  SELECT p.id, p.name, p.sku, p.category_id, p.price, p.cost, p.stock, p.min_stock, p.image, p.created_at,
         c.name AS category_name
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

// Helper: verifikasi produk milik user (lintas-user → 404, bukan 403, agar tidak bocorkan keberadaan)
async function ownedProduct(id, userId) {
  return db.prepare(`${SELECT} WHERE p.id = ? AND p.user_id = ?`).get(id, userId);
}

function buildWhere(q) {
  const clauses = [];
  const args = [];
  if (q.search) {
    // Escape % dan _ dengan backslash + ESCAPE clause — wildcard user tidak match semua
    const escaped = String(q.search).replace(/[\\%_]/g, (m) => '\\' + m);
    clauses.push("(p.name LIKE ? ESCAPE '\\' OR p.sku LIKE ? ESCAPE '\\')");
    args.push(`%${escaped}%`, `%${escaped}%`);
  }
  if (q.category_id) {
    clauses.push('p.category_id = ?');
    args.push(Number(q.category_id));
  }
  if (q.status === 'low') clauses.push('p.stock <= p.min_stock');
  if (q.status === 'out') clauses.push('p.stock <= 0');
  if (q.status === 'ok') clauses.push('p.stock > p.min_stock');
  return clauses.length ? { sql: ` WHERE ${clauses.join(' AND ')}`, args } : { sql: '', args: [] };
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

router.get('/', async (req, res) => {
  const q = req.query || {};
  const { sql, args } = buildWhere(q);
  const scopeSql = ` WHERE p.user_id = ?${sql ? ` AND ${sql.slice(7)}` : ''}`;
  const scopeArgs = [req.user.id, ...args];

  // Sort aman — hanya terima whitelist kolom
  const sortMap = { name: 'p.name', price: 'p.price', stock: 'p.stock', created: 'p.created_at' };
  const sortCol = sortMap[q.sort] || 'p.created_at';
  const dir = q.order === 'asc' ? 'ASC' : 'DESC';

  // Pagination divalidasi aman: NaN/Infinity/negatif → fallback
  const limit = safeInt(q.limit, 50, 1, 200);
  const offset = safeInt(q.offset, 0, 0, 1_000_000);

  const count = (await db
    .prepare(`SELECT COUNT(*) AS n FROM products p ${scopeSql}`)
    .get(...scopeArgs)).n;
  const rows = await db
    .prepare(`${SELECT}${scopeSql} ORDER BY ${sortCol} ${dir} LIMIT ? OFFSET ?`)
    .all(...scopeArgs, limit, offset);

  const summary = {
    total: (await db.prepare('SELECT COUNT(*) AS n FROM products WHERE user_id = ?').get(req.user.id)).n,
    totalStock: (await db.prepare('SELECT COALESCE(SUM(stock), 0) AS n FROM products WHERE user_id = ?').get(req.user.id)).n,
    totalValue: (await db.prepare('SELECT COALESCE(SUM(stock * cost), 0) AS n FROM products WHERE user_id = ?').get(req.user.id)).n,
    lowStock: (await db.prepare('SELECT COUNT(*) AS n FROM products WHERE user_id = ? AND stock <= min_stock').get(req.user.id)).n,
  };
  res.json({ rows, total: count, summary });
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'ID tidak valid' });
  const row = await ownedProduct(id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Produk tidak ditemukan' });
  res.json(row);
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  if (typeof b.name !== 'string' || typeof b.sku !== 'string') return res.status(400).json({ message: 'Nama dan SKU wajib bertipe teks' });
  const name = b.name.trim();
  const sku = b.sku.trim();
  if (!name || !sku) return res.status(400).json({ message: 'Nama dan SKU wajib diisi' });
  if (name.length > 120 || sku.length > 50) return res.status(400).json({ message: 'Nama/SKU terlalu panjang' });
  if (!b.category_id) return res.status(400).json({ message: 'Kategori wajib dipilih' });

  const cat = await db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(Number(b.category_id), req.user.id);
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
    const info = await db
      .prepare(
        `INSERT INTO products (user_id, name, sku, category_id, price, cost, stock, min_stock, image, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))`
      )
      .run(
        req.user.id,
        name,
        sku,
        Number(b.category_id),
        price,
        cost,
        stock,
        min_stock,
        typeof b.image === 'string' ? b.image.trim() : ''
      );
    const row = await ownedProduct(Number(info.lastInsertRowid), req.user.id);
    await logAudit({
      userId: req.user.id,
      actor: req.user.name,
      action: 'create',
      entity: 'product',
      entityId: Number(info.lastInsertRowid),
      details: toSnapshot(row),
      ip: auditContext(req).ip,
      ua: auditContext(req).ua,
    });
    res.status(201).json(row);
  } catch (err) {
    // Hanya mapping UNIQUE constraint ke 409; error lain → 500 (biar tidak masking bug)
    if (String(err?.message).includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'SKU sudah digunakan produk lain' });
    }
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'ID tidak valid' });
  const b = req.body || {};
  if (typeof b.name !== 'string' || typeof b.sku !== 'string') return res.status(400).json({ message: 'Nama dan SKU wajib bertipe teks' });
  const name = b.name.trim();
  const sku = b.sku.trim();
  if (!name || !sku) return res.status(400).json({ message: 'Nama dan SKU wajib diisi' });
  if (name.length > 120 || sku.length > 50) return res.status(400).json({ message: 'Nama/SKU terlalu panjang' });

  const before = await ownedProduct(id, req.user.id);
  if (!before) return res.status(404).json({ message: 'Produk tidak ditemukan' });

  const cat = await db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(Number(b.category_id), req.user.id);
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
    const info = await db
      .prepare(
        `UPDATE products SET name = ?, sku = ?, category_id = ?, price = ?, cost = ?,
                min_stock = ?, image = ? WHERE id = ? AND user_id = ?`
      )
      .run(
        name,
        sku,
        Number(b.category_id),
        price,
        cost,
        min_stock,
        typeof b.image === 'string' ? b.image.trim() : '',
        id,
        req.user.id
      );
    if (!info.changes) return res.status(404).json({ message: 'Produk tidak ditemukan' });
    const after = await ownedProduct(id, req.user.id);
    await logAudit({
      userId: req.user.id,
      actor: req.user.name,
      action: 'update',
      entity: 'product',
      entityId: id,
      details: { before: toSnapshot(before), after: toSnapshot(after) },
      ip: auditContext(req).ip,
      ua: auditContext(req).ua,
    });
    res.json(after);
  } catch (err) {
    if (String(err?.message).includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'SKU sudah digunakan produk lain' });
    }
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'ID tidak valid' });
  const before = await ownedProduct(id, req.user.id);
  if (!before) return res.status(404).json({ message: 'Produk tidak ditemukan' });

  // Hapus riwayat transaksi user ini untuk produk ini
  await db.prepare('DELETE FROM transactions WHERE product_id = ? AND user_id = ?').run(id, req.user.id);
  const info = await db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').run(id, req.user.id);
  if (!info.changes) return res.status(404).json({ message: 'Produk tidak ditemukan' });
  await logAudit({
    userId: req.user.id,
    actor: req.user.name,
    action: 'delete',
    entity: 'product',
    entityId: id,
    details: { before: toSnapshot(before) },
    ip: auditContext(req).ip,
    ua: auditContext(req).ua,
  });
  res.json({ ok: true });
});

export default router;
