// routes/categories.js — CRUD kategori (validasi lengkap, error handling tepat)
import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT c.*, COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `)
    .all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (typeof b.name !== 'string') return res.status(400).json({ message: 'Nama kategori wajib bertipe teks' });
  const name = b.name.trim();
  const description = typeof b.description === 'string' ? b.description.trim() : '';
  if (!name) return res.status(400).json({ message: 'Nama kategori wajib diisi' });
  if (name.length > 60) return res.status(400).json({ message: 'Nama kategori maksimal 60 karakter' });
  if (description.length > 255) return res.status(400).json({ message: 'Deskripsi terlalu panjang' });

  try {
    const info = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description);
    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    if (String(err?.message).includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Nama kategori sudah ada' });
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'ID tidak valid' });
  const b = req.body || {};
  if (typeof b.name !== 'string') return res.status(400).json({ message: 'Nama kategori wajib bertipe teks' });
  const name = b.name.trim();
  const description = typeof b.description === 'string' ? b.description.trim() : '';
  if (!name) return res.status(400).json({ message: 'Nama kategori wajib diisi' });
  if (name.length > 60) return res.status(400).json({ message: 'Nama kategori maksimal 60 karakter' });

  try {
    const info = db
      .prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?')
      .run(name, description ?? '', id);
    if (!info.changes) return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(id));
  } catch (err) {
    if (String(err?.message).includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Nama kategori sudah ada' });
    }
    throw err;
  }
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'ID tidak valid' });
  const used = db.prepare('SELECT COUNT(*) AS n FROM products WHERE category_id = ?').get(id).n;
  if (used > 0) {
    return res.status(409).json({ message: `Kategori masih dipakai ${used} produk` });
  }
  const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (!info.changes) return res.status(404).json({ message: 'Kategori tidak ditemukan' });
  res.json({ ok: true });
});

export default router;
