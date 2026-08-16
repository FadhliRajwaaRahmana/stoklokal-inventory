// routes/audit.js — riwayat audit (jejak semua aktivitas), hanya data milik user ini
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

// Aksi yang tercatat (label user-facing disusun di client)
router.get('/', async (req, res) => {
  const q = req.query || {};
  const where = ['a.user_id = ?'];
  const args = [req.user.id];

  const action = typeof q.action === 'string' && q.action ? q.action : '';
  const entity = typeof q.entity === 'string' && q.entity ? q.entity : '';
  const search = typeof q.search === 'string' ? q.search.trim() : '';

  if (action) {
    where.push('a.action = ?');
    args.push(action);
  }
  if (entity) {
    where.push('a.entity = ?');
    args.push(entity);
  }
  if (search) {
    // Escape % dan _ — wildcard user tidak match semua
    const escaped = search.replace(/[\\%_]/g, (m) => '\\' + m);
    where.push(`(a.actor LIKE ? ESCAPE '\\' OR a.details LIKE ? ESCAPE '\\' OR a.entity LIKE ? ESCAPE '\\')`);
    args.push(`%${escaped}%`, `%${escaped}%`, `%${escaped}%`);
  }

  const whereSql = ` WHERE ${where.join(' AND ')}`;
  const limit = safeInt(q.limit, 50, 1, 200);
  const offset = safeInt(q.offset, 0, 0, 1_000_000);

  const total = (await db.prepare(`SELECT COUNT(*) AS n FROM audit_logs a${whereSql}`).get(...args)).n;
  const rows = await db
    .prepare(`
      SELECT a.id, a.user_id, a.actor, a.action, a.entity, a.entity_id, a.details, a.ip, a.user_agent, a.created_at
      FROM audit_logs a
      ${whereSql}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT ? OFFSET ?
    `)
    .all(...args, limit, offset);

  res.json({ rows, total });
});

export default router;
