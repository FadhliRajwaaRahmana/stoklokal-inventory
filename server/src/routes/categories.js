// routes/categories.js — CRUD kategori (isolasi per user, audit trail, async — Turso)
import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { logAudit, auditContext, toSnapshot } from '../audit.js';

const router = Router();
router.use(authRequired);

const SCOPE = 'user_id = ?'; // scope isolasi: semua query kategori dibatasi user

router.get('/', async (req, res) => {
  const rows = await db
    .prepare(`
      SELECT c.*, COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.user_id = c.user_id
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.name ASC
    `)
    .all(req.user.id);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  if (typeof b.name !== 'string') return res.status(400).json({ message: 'Nama kategori wajib bertipe teks' });
  const name = b.name.trim();
  const description = typeof b.description === 'string' ? b.description.trim() : '';
  if (!name) return res.status(400).json({ message: 'Nama kategori wajib diisi' });
  if (name.length > 60) return res.status(400).json({ message: 'Nama kategori maksimal 60 karakter' });
  if (description.length > 255) return res.status(400).json({ message: 'Deskripsi terlalu panjang' });

  try {
    const info = await db
      .prepare('INSERT INTO categories (user_id, name, description, created_at) VALUES (?, ?, ?, datetime(\'now\', \'+7 hours\'))')
      .run(req.user.id, name, description);
    const row = await db
      .prepare('SELECT * FROM categories WHERE id = ? AND ' + SCOPE)
      .get(Number(info.lastInsertRowid), req.user.id);
    await logAudit({
      userId: req.user.id,
      actor: req.user.name,
      action: 'create',
      entity: 'category',
      entityId: Number(info.lastInsertRowid),
      details: toSnapshot(row),
      ip: auditContext(req).ip,
      ua: auditContext(req).ua,
    });
    res.status(201).json(row);
  } catch (err) {
    if (String(err?.message).includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Nama kategori sudah ada' });
    }
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'ID tidak valid' });
  const b = req.body || {};
  if (typeof b.name !== 'string') return res.status(400).json({ message: 'Nama kategori wajib bertipe teks' });
  const name = b.name.trim();
  const description = typeof b.description === 'string' ? b.description.trim() : '';
  if (!name) return res.status(400).json({ message: 'Nama kategori wajib diisi' });
  if (name.length > 60) return res.status(400).json({ message: 'Nama kategori maksimal 60 karakter' });

  const before = await db
    .prepare('SELECT * FROM categories WHERE id = ? AND ' + SCOPE)
    .get(id, req.user.id);
  if (!before) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

  try {
    const info = await db
      .prepare('UPDATE categories SET name = ?, description = ? WHERE id = ? AND ' + SCOPE)
      .run(name, description ?? '', id, req.user.id);
    if (!info.changes) return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    const after = await db
      .prepare('SELECT * FROM categories WHERE id = ? AND ' + SCOPE)
      .get(id, req.user.id);
    await logAudit({
      userId: req.user.id,
      actor: req.user.name,
      action: 'update',
      entity: 'category',
      entityId: id,
      details: { before: toSnapshot(before), after: toSnapshot(after) },
      ip: auditContext(req).ip,
      ua: auditContext(req).ua,
    });
    res.json(after);
  } catch (err) {
    if (String(err?.message).includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Nama kategori sudah ada' });
    }
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'ID tidak valid' });
  const used = await db
    .prepare('SELECT COUNT(*) AS n FROM products WHERE category_id = ? AND ' + SCOPE)
    .get(id, req.user.id);
  if (used.n > 0) {
    return res.status(409).json({ message: `Kategori masih dipakai ${used.n} produk` });
  }
  const before = await db
    .prepare('SELECT * FROM categories WHERE id = ? AND ' + SCOPE)
    .get(id, req.user.id);
  if (!before) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

  const info = await db
    .prepare('DELETE FROM categories WHERE id = ? AND ' + SCOPE)
    .run(id, req.user.id);
  if (!info.changes) return res.status(404).json({ message: 'Kategori tidak ditemukan' });
  await logAudit({
    userId: req.user.id,
    actor: req.user.name,
    action: 'delete',
    entity: 'category',
    entityId: id,
    details: { before: toSnapshot(before) },
    ip: auditContext(req).ip,
    ua: auditContext(req).ua,
  });
  res.json({ ok: true });
});

export default router;
