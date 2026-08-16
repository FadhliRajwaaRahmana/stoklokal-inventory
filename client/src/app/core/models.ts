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
