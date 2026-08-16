// routes/stats.js — statistik publik untuk landing page (tanpa auth)
import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const products = await db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
  const categories = await db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  const totalStock = await db.prepare('SELECT COALESCE(SUM(stock), 0) AS n FROM products').get().n;
  const transactions = await db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n;
  const lowStock = await db.prepare('SELECT COUNT(*) AS n FROM products WHERE stock <= min_stock').get().n;

  res.json({ products, categories, totalStock, transactions, lowStock });
});

export default router;
