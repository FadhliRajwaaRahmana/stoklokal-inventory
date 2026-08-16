// routes/dashboard.js — statistik dashboard (aggregat SQL) [async — Turso]
import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', async (_req, res) => {
  const products = (await db.prepare('SELECT COUNT(*) AS n FROM products').get()).n;
  const categories = (await db.prepare('SELECT COUNT(*) AS n FROM categories').get()).n;
  const totalStock = (await db.prepare('SELECT COALESCE(SUM(stock), 0) AS n FROM products').get()).n;
  const inventoryValue = (await db.prepare('SELECT COALESCE(SUM(stock * cost), 0) AS n FROM products').get()).n;
  const lowStock = (await db.prepare('SELECT COUNT(*) AS n FROM products WHERE stock <= min_stock').get()).n;
  const outOfStock = (await db.prepare('SELECT COUNT(*) AS n FROM products WHERE stock <= 0').get()).n;

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const movements = await db
    .prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'in' THEN qty END), 0) AS stock_in,
        COALESCE(SUM(CASE WHEN type = 'out' THEN qty END), 0) AS stock_out
      FROM transactions
    `)
    .get();
  const monthIn = await db
    .prepare(`SELECT COALESCE(SUM(qty), 0) AS n FROM transactions WHERE type = 'in' AND created_at >= ?`)
    .get(monthStart);
  const monthOut = await db
    .prepare(`SELECT COALESCE(SUM(qty), 0) AS n FROM transactions WHERE type = 'out' AND created_at >= ?`)
    .get(monthStart);

  const daily = await db
    .prepare(`
      SELECT date(created_at) AS day,
             COALESCE(SUM(CASE WHEN type = 'in' THEN qty END), 0) AS in_qty,
             COALESCE(SUM(CASE WHEN type = 'out' THEN qty END), 0) AS out_qty
      FROM transactions
      WHERE created_at >= date('now', '-6 days')
      GROUP BY date(created_at)
      ORDER BY day ASC
    `)
    .all();

  const lowStockItems = await db
    .prepare(`
      SELECT p.id, p.name, p.sku, p.stock, p.min_stock, c.name AS category_name
      FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.stock <= p.min_stock
      ORDER BY p.stock ASC LIMIT 8
    `)
    .all();

  const recent = await db
    .prepare(`
      SELECT t.id, t.type, t.qty, t.note, t.created_at, p.name AS product_name, p.sku AS product_sku
      FROM transactions t JOIN products p ON p.id = t.product_id
      ORDER BY t.created_at DESC, t.id DESC LIMIT 8
    `)
    .all();

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
