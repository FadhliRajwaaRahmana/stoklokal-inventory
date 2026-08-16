// models.ts — tipe data API
export interface User {
  id: number;
  name: string;
  email: string;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  created_at?: string;
  product_count?: number;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category_id: number;
  category_name?: string;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  image: string;
  created_at?: string;
}

export type StockStatus = 'ok' | 'low' | 'out';

export function stockStatus(p: Product): StockStatus {
  if (p.stock <= 0) return 'out';
  if (p.stock <= p.min_stock) return 'low';
  return 'ok';
}

export interface Transaction {
  id: number;
  product_id: number;
  type: 'in' | 'out';
  qty: number;
  note: string;
  created_at: string;
  product_name?: string;
  product_sku?: string;
}

export interface ProductListResponse {
  rows: Product[];
  total: number;
  summary: {
    total: number;
    totalStock: number;
    totalValue: number;
    lowStock: number;
  };
}

export interface TransactionListResponse {
  rows: Transaction[];
  total: number;
}

export interface DashboardData {
  cards: {
    products: number;
    categories: number;
    totalStock: number;
    inventoryValue: number;
    lowStock: number;
    outOfStock: number;
    stockIn: number;
    stockOut: number;
    monthIn: number;
    monthOut: number;
  };
  daily: { day: string; in_qty: number; out_qty: number }[];
  lowStockItems: Product[];
  recent: Transaction[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ---------- Audit log ----------
export interface AuditLog {
  id: number;
  user_id: number;
  actor: string;
  action: string; // create | update | delete | login | login_failed | register | logout | stock_in | stock_out
  entity: string; // product | category | transaction | user
  entity_id: number | null;
  details: string; // JSON snapshot (before/after)
  ip: string;
  user_agent: string;
  created_at: string;
}

export interface AuditListResponse {
  rows: AuditLog[];
  total: number;
}

// Label user-facing + warna badge per aksi
export const ACTION_META: Record<string, { label: string; cls: string }> = {
  create: { label: 'Buat', cls: 'action-create' },
  update: { label: 'Ubah', cls: 'action-update' },
  delete: { label: 'Hapus', cls: 'action-delete' },
  login: { label: 'Login', cls: 'action-login' },
  login_failed: { label: 'Login Gagal', cls: 'action-login-failed' },
  register: { label: 'Daftar', cls: 'action-register' },
  logout: { label: 'Logout', cls: 'action-logout' },
  stock_in: { label: 'Stok Masuk', cls: 'action-stock-in' },
  stock_out: { label: 'Stok Keluar', cls: 'action-stock-out' },
};

export const ENTITY_META: Record<string, string> = {
  product: 'Produk',
  category: 'Kategori',
  transaction: 'Transaksi',
  user: 'User',
};

export function actionMeta(action: string): { label: string; cls: string } {
  return ACTION_META[action] ?? { label: action, cls: 'action-other' };
}

export function entityLabel(entity: string): string {
  return ENTITY_META[entity] ?? entity;
}
