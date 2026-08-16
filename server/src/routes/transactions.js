// routes/transactions.js — stok masuk/keluar dengan validasi, riwayat + pagination
import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

// Parse angka query aman — NaN/Infinity/negatif → fallback default
function safeInt(v, fallback, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}

router.get('/', (req, res) => {
  const q = req.query || {};
  const where = [];
  const params = {};
  if (q.type === 'in' || q.type === 'out') {
    where.push('t.type = @type');
    params.type = q.type;
  }
  const pid = Number(q.product_id);
  if (Number.isInteger(pid) && pid > 0) {
    where.push('t.product_id = @product_id');
    params.product_id = pid;
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const count = db.prepare(`SELECT COUNT(*) AS n FROM transactions t${whereSql}`).get(params).n;

  // Pagination divalidasi aman: NaN/Infinity/negatif → fallback
  const limit = safeInt(q.limit, 50, 1, 200);
  const offset = safeInt(q.offset, 0, 0, 1_000_000);

  const rows = db
    .prepare(`
      SELECT t.id, t.product_id, t.type, t.qty, t.note, t.created_at,
             p.name AS product_name, p.sku AS product_sku
      FROM transactions t
      JOIN products p ON p.id = t.product_id
      ${whereSql}
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT @limit OFFSET @offset
    `)
    .all({ ...params, limit, offset });

  res.json({ rows, total: count });
});

// Stok masuk / keluar (keluar divalidasi tidak boleh minus)
router.post('/', (req, res) => {
  const b = req.body || {};
  const productId = Number(b.product_id);
  const qty = Number(b.qty);
  const type = b.type === 'in' ? 'in' : b.type === 'out' ? 'out' : null;
  if (b.note !== undefined && b.note !== null && typeof b.note !== 'string') {
    return res.status(400).json({ message: 'Catatan harus bertipe teks' });
  }
  const note = typeof b.note === 'string' ? b.note.trim() : '';

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ message: 'Produk wajib valid' });
  }
  if (!Number.isInteger(qty) || qty <= 0 || qty > 1000000) {
    return res.status(400).json({ message: 'Jumlah harus bilangan bulat positif (maks 1.000.000)' });
  }
  if (!type) return res.status(400).json({ message: 'Tipe transaksi harus in atau out' });
  if (note.length > 255) return res.status(400).json({ message: 'Catatan terlalu panjang' });

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ message: 'Produk tidak ditemukan' });

  if (type === 'out' && product.stock < qty) {
    return res.status(409).json({ message: `Stok tidak cukup (tersisa ${product.stock})` });
  }

  let insertedId = null;
  // node:sqlite tidak punya db.transaction() — pakai BEGIN/COMMIT/ROLLBACK manual
  db.exec('BEGIN');
  try {
    const info = db.prepare('INSERT INTO transactions (product_id, type, qty, note) VALUES (?, ?, ?, ?)').run(
      productId,
      type,
      qty,
      note
    );
    insertedId = info.lastInsertRowid;
    const delta = type === 'in' ? qty : -qty;
    db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(delta, productId);
    db.exec('COMMIT');
  } catch (txErr) {
    db.exec('ROLLBACK');
    throw txErr;
  }

  const updated = db.prepare(`${SELECT} WHERE p.id = ?`).get(productId);
  res.status(201).json({ transaction: { id: insertedId, product_id: productId, type, qty, note }, product: updated });
});

const SELECT = `
  SELECT p.id, p.name, p.sku, p.category_id, p.price, p.cost, p.stock, p.min_stock, p.image, p.created_at,
         c.name AS category_name
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

export default router;
