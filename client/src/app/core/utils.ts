// core/utils.ts — helper format

// Paksa parse ke timezone Indonesia Barat (WIB, UTC+7) terlepas dari timezone browser.
// Server menyimpan datetime SQLite dalam UTC (datetime('now')) — selalu tampilkan WIB.
export const WIB_TZ = 'Asia/Jakarta';

// Server menulis "YYYY-MM-DD HH:MM:SS" dalam WIB (UTC+7) — lihat db.js
// (datetime('now', '+7 hours')). Normalisasi agar diparse sebagai WIB:
// 1) spasi → 'T' (format ISO valid lintas browser, termasuk Safari)
// 2) append offset '+07:00' — bukan 'Z' (UTC) — supaya tidak dobel-geser.
function parseDate(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const norm = iso.replace(' ', 'T');
  const d = new Date(norm.endsWith('Z') ? norm : norm.endsWith('+07:00') ? norm : norm + '+07:00');
  return isNaN(d.getTime()) ? null : d;
}

export function formatRupiah(n: number | undefined | null): string {
  const v = Number(n) || 0;
  return 'Rp ' + v.toLocaleString('id-ID');
}

export function formatDate(iso: string | undefined | null): string {
  const d = parseDate(iso);
  if (!d) return '-';
  return d.toLocaleDateString('id-ID', { timeZone: WIB_TZ, day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(iso: string | undefined | null, withSeconds = false): string {
  const d = parseDate(iso);
  if (!d) return '—';
  return d.toLocaleTimeString('id-ID', {
    timeZone: WIB_TZ,
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  });
}

export function formatDateTime(iso: string | undefined | null, withSeconds = false): string {
  const d = parseDate(iso);
  if (!d) return '-';
  return (
    d.toLocaleDateString('id-ID', { timeZone: WIB_TZ, day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' +
    formatTime(iso, withSeconds)
  );
}

// Waktu "sekarang" dalam WIB — untuk indicator real-time (dashboard, dll)
export function nowWIB(withSeconds = true): string {
  return new Date().toLocaleTimeString('id-ID', {
    timeZone: WIB_TZ,
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  });
}

// Waktu lengkap "sekarang" dalam TIMEZONE DEVICE (bukan paksa WIB) —
// untuk indikator "Terakhir update" yang mengikuti jam perangkat pengguna.
export function nowDeviceFull(): string {
  const d = new Date();
  const date = d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${date} · ${time}`;
}

// Format datetime dari DB (tersimpan WIB) ke tampilan TIMEZONE DEVICE
// (created_at WIB di DB → ditampilkan sesuai jam perangkat pengguna).
export function formatDateTimeDevice(iso: string | undefined | null, withSeconds = false): string {
  const d = parseDate(iso);
  if (!d) return '-';
  const date = d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  });
  return `${date} · ${time}`;
}

export function timeAgo(iso: string | undefined | null): string {
  const d = parseDate(iso);
  if (!d) return '-';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} hari lalu`;
  return formatDate(iso);
}

export function initials(name: string | undefined | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
