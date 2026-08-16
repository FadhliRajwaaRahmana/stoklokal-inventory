// core/services/data.service.ts — akses data API terpusat (products, categories, transactions, dashboard, audit)
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import {
  AuditListResponse,
  Category,
  DashboardData,
  Product,
  ProductListResponse,
  Transaction,
  TransactionListResponse,
} from '../models';

export interface ProductQuery {
  search?: string;
  category_id?: number | string;
  status?: string;
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionQuery {
  type?: string;
  product_id?: number;
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  constructor(private api: ApiService) {}

  // ---------- Categories ----------
  getCategories(): Observable<Category[]> {
    return this.api.get<Category[]>('/api/categories');
  }

  createCategory(body: Partial<Category>): Observable<Category> {
    return this.api.post<Category>('/api/categories', body);
  }

  updateCategory(id: number, body: Partial<Category>): Observable<Category> {
    return this.api.put<Category>(`/api/categories/${id}`, body);
  }

  deleteCategory(id: number): Observable<unknown> {
    return this.api.delete(`/api/categories/${id}`);
  }

  // ---------- Products ----------
  getProducts(q: ProductQuery = {}): Observable<ProductListResponse> {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });
    const qs = params.toString();
    return this.api.get<ProductListResponse>(`/api/products${qs ? `?${qs}` : ''}`);
  }

  createProduct(body: Partial<Product>): Observable<Product> {
    return this.api.post<Product>('/api/products', body);
  }

  updateProduct(id: number, body: Partial<Product>): Observable<Product> {
    return this.api.put<Product>(`/api/products/${id}`, body);
  }

  deleteProduct(id: number): Observable<unknown> {
    return this.api.delete(`/api/products/${id}`);
  }

  // ---------- Transactions ----------
  getTransactions(q: TransactionQuery = {}): Observable<TransactionListResponse> {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });
    const qs = params.toString();
    return this.api.get<TransactionListResponse>(`/api/transactions${qs ? `?${qs}` : ''}`);
  }

  createTransaction(body: { product_id: number; type: 'in' | 'out'; qty: number; note?: string }): Observable<{
    transaction: Transaction;
    product: Product;
  }> {
    return this.api.post('/api/transactions', body);
  }

  // ---------- Dashboard ----------
  getDashboard(): Observable<DashboardData> {
    return this.api.get<DashboardData>('/api/dashboard');
  }

  // ---------- Audit Log ----------
  getAuditLogs(q: {
    action?: string;
    entity?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Observable<AuditListResponse> {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });
    const qs = params.toString();
    return this.api.get<AuditListResponse>(`/api/audit${qs ? `?${qs}` : ''}`);
  }
}
