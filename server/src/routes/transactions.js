// routes/transactions.js — stok masuk/keluar dengan validasi, riwayat + pagination
// Multi-user: semua query di-scope user_id, mutasi dicatat ke audit_logs.
import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { logAudit, auditContext, toSnapshot } from '../audit.js';

const router = Router();
router.use(authRequired);

// Parse angka query aman — NaN/Infinity/negatif → fallback default
function safeInt(v, fallback, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}

router.get('/', async (req, res) => {
  const q = req.query || {};
  const where = ['t.user_id = ?'];
  const args = [req.user.id];
  if (q.type === 'in' || q.type === 'out') {
    where.push('t.type = ?');
    args.push(q.type);
  }
  const pid = Number(q.product_id);
  if (Number.isInteger(pid) && pid > 0) {
    where.push('t.product_id = ?');
    args.push(pid);
  }
  const whereSql = ` WHERE ${where.join(' AND ')}`;
  const count = (await db
    .prepare(`SELECT COUNT(*) AS n FROM transactions t${whereSql}`)
    .get(...args)).n;

  // Pagination divalidasi aman: NaN/Infinity/negatif → fallback
  const limit = safeInt(q.limit, 50, 1, 200);
  const offset = safeInt(q.offset, 0, 0, 1_000_000);

  const rows = await db
    .prepare(`
      SELECT t.id, t.product_id, t.type, t.qty, t.note, t.created_at,
             p.name AS product_name, p.sku AS product_sku
      FROM transactions t
      JOIN products p ON p.id = t.product_id
      ${whereSql}
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ? OFFSET ?
    `)
    .all(...args, limit, offset);

  res.json({ rows, total: count });
});

// Stok masuk / keluar (keluar divalidasi tidak boleh minus)
router.post('/', async (req, res) => {
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

  // Produk harus milik user ini (lintas-user → 404)
  const product = await db
    .prepare('SELECT * FROM products WHERE id = ? AND user_id = ?')
    .get(productId, req.user.id);
  if (!product) return res.status(404).json({ message: 'Produk tidak ditemukan' });

  if (type === 'out' && product.stock < qty) {
    return res.status(409).json({ message: `Stok tidak cukup (tersisa ${product.stock})` });
  }

  let insertedId = null;
  let after = null;
  // Transaksi atomik — pakai db.transaction() (Turso resmi, query memakai tx)
  await db.transaction(async (tx) => {
    const txPrepare = (sql) => ({
      async run(...args) {
        const res = await tx.execute({ sql, args: args.length === 1 && Array.isArray(args[0]) ? args[0] : args });
        return { changes: res.rowsAffected, lastInsertRowid: res.lastInsertRowid };
      },
    });
    const info = await txPrepare('INSERT INTO transactions (user_id, product_id, type, qty, note) VALUES (?, ?, ?, ?, ?)').run(
      [req.user.id, productId, type, qty, note]
    );
    insertedId = Number(info.lastInsertRowid);
    const delta = type === 'in' ? qty : -qty;
    await txPrepare('UPDATE products SET stock = stock + ? WHERE id = ? AND user_id = ?').run([delta, productId, req.user.id]);
  });

  after = await db
    .prepare('SELECT id, name, sku, category_id, price, cost, stock, min_stock, image, created_at FROM products WHERE id = ?')
    .get(productId);

  await logAudit({
    userId: req.user.id,
    actor: req.user.name,
    action: type === 'in' ? 'stock_in' : 'stock_out',
    entity: 'transaction',
    entityId: insertedId,
    details: {
      product: { id: product.id, name: product.name, sku: product.sku },
      qty,
      stock_before: product.stock,
      stock_after: after.stock,
      note,
    },
    ip: auditContext(req).ip,
    ua: auditContext(req).ua,
  });

  res.status(201).json({
    transaction: { id: insertedId, product_id: productId, type, qty, note },
    product: after,
  });
});

export default router;
