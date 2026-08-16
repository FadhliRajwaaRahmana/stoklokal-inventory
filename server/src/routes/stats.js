// routes/stats.js — statistik publik untuk landing page (tanpa auth)
// Menampilkan data real dari database: total produk, total stok, kategori, transaksi
import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const products = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
  const categories = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  const totalStock = db.prepare('SELECT COALESCE(SUM(stock), 0) AS n FROM products').get().n;
  const transactions = db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n;
  const lowStock = db.prepare('SELECT COUNT(*) AS n FROM products WHERE stock <= min_stock').get().n;

  res.json({ products, categories, totalStock, transactions, lowStock });
});

export default router;
