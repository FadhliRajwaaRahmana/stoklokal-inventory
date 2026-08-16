// routes/dashboard.js — statistik dashboard (aggregat SQL, scope per user) [async — Turso]
import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

// Semua statistik dihitung HANYA untuk data milik user ini (isolasi per user)
router.get('/', async (req, res) => {
  const uid = req.user.id;
  const products = (await db.prepare('SELECT COUNT(*) AS n FROM products WHERE user_id = ?').get(uid)).n;
  const categories = (await db.prepare('SELECT COUNT(*) AS n FROM categories WHERE user_id = ?').get(uid)).n;
  const totalStock = (await db.prepare('SELECT COALESCE(SUM(stock), 0) AS n FROM products WHERE user_id = ?').get(uid)).n;
  const inventoryValue = (await db.prepare('SELECT COALESCE(SUM(stock * cost), 0) AS n FROM products WHERE user_id = ?').get(uid)).n;
  const lowStock = (await db.prepare('SELECT COUNT(*) AS n FROM products WHERE user_id = ? AND stock <= min_stock').get(uid)).n;
  const outOfStock = (await db.prepare('SELECT COUNT(*) AS n FROM products WHERE user_id = ? AND stock <= 0').get(uid)).n;

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const movements = await db
    .prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'in' THEN qty END), 0) AS stock_in,
        COALESCE(SUM(CASE WHEN type = 'out' THEN qty END), 0) AS stock_out
      FROM transactions
      WHERE user_id = ?
    `)
    .get(uid);
  const monthIn = await db
    .prepare(`SELECT COALESCE(SUM(qty), 0) AS n FROM transactions WHERE user_id = ? AND type = 'in' AND created_at >= ?`)
    .get(uid, monthStart);
  const monthOut = await db
    .prepare(`SELECT COALESCE(SUM(qty), 0) AS n FROM transactions WHERE user_id = ? AND type = 'out' AND created_at >= ?`)
    .get(uid, monthStart);

  const daily = await db
    .prepare(`
      SELECT date(created_at) AS day,
             COALESCE(SUM(CASE WHEN type = 'in' THEN qty END), 0) AS in_qty,
             COALESCE(SUM(CASE WHEN type = 'out' THEN qty END), 0) AS out_qty
      FROM transactions
      WHERE user_id = ? AND created_at >= date('now', '-6 days')
      GROUP BY date(created_at)
      ORDER BY day ASC
    `)
    .all(uid);

  const lowStockItems = await db
    .prepare(`
      SELECT p.id, p.name, p.sku, p.stock, p.min_stock, c.name AS category_name
      FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.user_id = ? AND p.stock <= p.min_stock
      ORDER BY p.stock ASC LIMIT 8
    `)
    .all(uid);

  const recent = await db
    .prepare(`
      SELECT t.id, t.type, t.qty, t.note, t.created_at, p.name AS product_name, p.sku AS product_sku
      FROM transactions t JOIN products p ON p.id = t.product_id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC, t.id DESC LIMIT 8
    `)
    .all(uid);

  res.json({
    cards: {
      products,
      categories,
      totalStock,
      inventoryValue,
      lowStock,
      outOfStock,
      stockIn: movements.stock_in,
      stockOut: movements.stock_out,
      monthIn: monthIn.n,
      monthOut: monthOut.n,
    },
    daily,
    lowStockItems,
    recent,
  });
});

export default router;
