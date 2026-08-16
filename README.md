# 📦 StokLokal — Inventory Management System

> Kelola stok, produk, dan transaksi dengan mudah — cepat, cantik, dan real-time.

**StokLokal** adalah aplikasi **manajemen inventori** modern berbasis web yang dibuat untuk membantu pemilik usaha kecil, admin gudang, dan tim operasional dalam mengelola persediaan barang secara efisien. Aplikasi ini menggabungkan **frontend yang indah dan interaktif** (Angular + animasi premium) dengan **backend yang aman** (Express + JWT) — dalam satu codebase yang mudah di-deploy.

---

## 🧠 Apa & Mengapa Project Ini Dibuat?

| Pertanyaan | Jawaban |
|---|---|
| **Untuk siapa?** | Pemilik toko/UMKM, admin gudang, tim operasional yang butuh pantauan stok |
| **Masalah apa yang diselesaikan?** | Stok sering tidak terpantau → kehabisan barang mendadak / overstock. Data transaksi berantakan, tidak ada satu dashboard terpusat |
| **Solusi?** | Satu aplikasi untuk: kelola produk, kategori, transaksi masuk-keluar, alert stok menipis, statistik real-time |
| **Kenapa istimewa?** | Desain **Kawaii Pop** (neo-brutalism pastel) yang playful tapi profesional + animasi GSAP/Lenis/Motion yang mulus + data **real-time** (auto-refresh 30 detik) |

---

## ✨ Fitur Utama

| Fitur | Detail |
|---|---|
| 🔐 **Autentikasi** | Register, login, logout dengan **JWT** + password terenkripsi (bcrypt), rate-limiting anti brute-force, token revocation (logout → token mati) |
| 📊 **Dashboard** | Statistik real-time (total produk, stok, nilai inventori, stok menipis), grafik pergerakan 7 hari, alert stok menipis, transaksi terbaru, auto-refresh 30 detik |
| 📦 **Manajemen Produk** | CRUD lengkap: search (debounce), filter kategori & status, sort, pagination, quick stock in/out |
| 🏷️ **Kategori** | CRUD + hitung produk per kategori, proteksi hapus saat masih dipakai |
| 🔄 **Transaksi** | Stok masuk/keluar dengan **validasi stok tidak pernah minus**, riwayat lengkap + filter tipe |
| 🎨 **UI/UX Premium** | Desain **Kawaii Pop** (border hitam tebal, shadow chunky, rounded besar, pastel), animasi GSAP ScrollTrigger + Lenis smooth scroll + Motion, dropdown custom **searchable** dengan debounce |
| 📱 **Responsive** | Mobile-first — sidebar jadi drawer, tabel scroll horizontal, semua halaman rapi di HP |
| 🔒 **Security** | JWT secret random, CORS whitelist, helmet headers, validasi input lengkap, SQL injection-safe (prepared statements), rate limit |

---

## 🛠️ Tech Stack

### Frontend (`client/`)
| Teknologi | Fungsi |
|---|---|
| **Angular 22** | Framework (standalone, zoneless, lazy-loaded routes) |
| **GSAP + ScrollTrigger** | Animasi scroll reveal, parallax, count-up |
| **Lenis** | Smooth scroll premium |
| **Motion** (framer-motion) | Animasi UI modern |
| **Chart.js** | Grafik pergerakan stok |
| **SCSS** | Design system Kawaii Pop |

### Backend (`server/`)
| Teknologi | Fungsi |
|---|---|
| **Node.js + Express 5** | REST API |
| **Turso (libSQL)** | Database SQLite cloud — **permanen** & persisten di serverless (local file SQLite di dev) |
| **JWT (jsonwebtoken)** | Autentikasi + token revocation |
| **bcryptjs** | Hash password |
| **helmet + cors** | Keamanan headers & CORS whitelist |

---

## 📁 Struktur Project

```
inventory-management/
├── api/                    # Vercel Function (serverless entry)
│   └── index.js
├── client/                 # Frontend Angular 22
│   ├── src/app/
│   │   ├── core/           # models, api service, auth/data/toast service, guard, utils
│   │   ├── shared/         # icon, kawaii-select, modal, toast, badge, stat-card, skeleton
│   │   ├── features/       # landing, auth (login/register), layout, dashboard,
│   │   │                   # products, categories, transactions
│   ├── public/             # favicon, api-config.js
│   ├── scripts/            # inject-api-base.js (build)
│   ├── vercel.json
│   └── netlify.toml
├── server/                 # Backend Express
│   └── src/
│       ├── index.js        # entry (support serverless)
│       ├── app.js          # express app factory
│       ├── db.js           # Turso/libSQL client (cloud) + file SQLite (dev)
│       ├── seed.js         # data demo
│       ├── middleware/auth.js
│       └── routes/         # auth, products, categories, transactions, dashboard, stats
├── test-api.sh             # 47 API test (semua endpoint & method)
├── vercel.json             # deploy config monorepo
└── package.json            # scripts (dev, build, build:prod)
```

---

## 🚀 Menjalankan Lokal

**Prasyarat:** Node.js ≥ 22 (untuk Vercel gunakan Node 24.x — lihat `engines` di package.json)

```bash
# 1. Install dependencies
npm install
npm --prefix server install
npm --prefix client install

# 2. Seed data demo (sekali)
cd server && SEED_PASSWORD=admin123 node src/seed.js && cd ..

# 3. Jalankan frontend + backend
npm run dev
```

- **Frontend:** http://localhost:4200
- **Backend:** http://localhost:5000
- **Akun demo:** `admin@demo.app` / `admin123`

> Jika `SEED_PASSWORD` tidak di-set, password demo digenerate acak (ditampilkan di console).

---

## 🔌 API Endpoints

Semua endpoint (kecuali `login/register/health/stats`) butuh header `Authorization: Bearer <token>`.

| Method | Path | Deskripsi |
|---|---|---|
| POST | `/api/auth/register` | Daftar akun |
| POST | `/api/auth/login` | Login → token + user |
| GET | `/api/auth/me` | Profil user |
| POST | `/api/auth/logout` | Logout (revoke token) |
| GET | `/api/dashboard` | Statistik + grafik + alert + riwayat |
| GET | `/api/stats` | Statistik publik (landing page) |
| GET/POST | `/api/products` | List (search/filter/sort/page) / buat |
| GET/PUT/DELETE | `/api/products/:id` | Detail / ubah / hapus |
| GET/POST | `/api/categories` | List / buat |
| PUT/DELETE | `/api/categories/:id` | Ubah / hapus |
| GET/POST | `/api/transactions` | Riwayat / catat in-out |
| GET | `/api/health` | Health check |

---

## 🧪 Testing

```bash
# Jalankan 47 test otomatis (butuh backend di :5000)
bash test-api.sh
```

Cakupan test: semua method (GET/POST/PUT/DELETE), validasi (email, angka, panjang, tipe), security (rate limit, CORS, token revocation, SQL injection), edge case (NaN/Infinity, wildcard search).

---

## ☁️ Deploy ke Vercel

Project sudah dikonfigurasi untuk **monorepo Vercel** (frontend + backend satu deploy):

1. Push ke GitHub
2. Vercel → **Import Repository**
3. Root: `/`, Build: `npm run build:prod` (otomatis dari `vercel.json`), Output: `client/dist/client/browser`
4. Set environment variables:
   - `TURSO_DATABASE_URL` — URL database Turso (contoh: `libsql://<db>.turso.io`) — **WAJIB**
   - `TURSO_AUTH_TOKEN` — token auth Turso — **WAJIB**
   - `JWT_SECRET` — string acak panjang (WAJIB)
   - `SEED_PASSWORD` — password demo
   - `CORS_ORIGINS` — origin frontend (opsional)
5. Deploy 🎉

> ✅ **Data PERMANEN:** Database memakai **Turso** (SQLite cloud). Data tetap tersimpan meski serverless cold start. Buat database gratis di [Turso](https://turso.tech) (`turso db create <nama>` → `turso db tokens create <nama>`), lalu isi `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`. Tanpa env tersebut (dev lokal), otomatis fallback ke file SQLite lokal `server/data/inventory.db`.

---

## 🎨 Design System

**Kawaii Pop** — perpaduan neo-brutalism + estetika kawaii Jepang:

- 🎨 **Palet:** peachy coral `#f8be9e`, sky blue `#70d6ff`, golden yellow `#ffd670`, strawberry pink `#ff7096`, mint `#bcffbe`
- ⚫ **Border hitam tebal** (2–3px) — efek sticker khas
- 🟣 **Rounded besar** (16–32px) + shadow chunky offset
- 🔤 **Font:** Nunito (heading 800/900) + Inter (body)
- ✨ **Animasi:** scroll reveal, parallax, count-up, dropdown pop, infinite float, smooth scroll

---

## 🔒 Security Features

| Fitur | Implementasi |
|---|---|
| Password | bcrypt (cost 10), min 6–72 char |
| JWT | Secret random 48-byte (persist file / env), expiry 7 hari |
| Token revocation | Blacklist di DB — token logout langsung mati |
| Rate limiting | 10 gagal / 15 menit / IP (hanya percobaan gagal) |
| CORS | Whitelist origin (bukan `*`), origin tak dikenal → 403 |
| Headers | helmet (X-Frame-Options, nosniff, dll) |
| SQL Injection | Prepared statements + LIKE escape (`%`/`_`) |
| Input validation | Tipe, panjang, angka, NaN/Infinity → aman |
| Body limit | 100kb (anti payload raksasa) |

---

## 📜 Lisensi

Proyek ini dibuat untuk keperluan pembelajaran & pengembangan. Silakan digunakan dan dimodifikasi sesuai kebutuhan.
