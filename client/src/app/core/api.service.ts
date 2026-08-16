// core/api.service.ts — wrapper API dengan HttpClient (zoneless-aware) & error handling
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base: string;
  private readonly token$ = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {
    this.base = this.detectBase();
  }

  // Di dev → proxy angular (/api), di prod → baca dari api-config.js (di-generate saat build)
  private detectBase(): string {
    const saved = (window as any).__API_BASE__ as string | undefined;
    return saved ?? '';
  }

  setToken(token: string | null): void {
    this.token$.next(token);
  }

  getToken(): string | null {
    return this.token$.value;
  }

  private headers(isJson = true): Record<string, string> {
    const h: Record<string, string> = {};
    if (isJson) h['Content-Type'] = 'application/json';
    const t = this.token$.value;
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  }

  // Pemetaan error terpusat: ambil message dari body, sertakan status
  private mapError(e: HttpErrorResponse): never {
    const msg = e?.error?.message || e?.message || 'Terjadi kesalahan';
    throw Object.assign(new Error(msg), { status: e?.status });
  }

  get<T>(path: string): Observable<T> {
    return this.http
      .get<T>(`${this.base}${path}`, { headers: this.headers(false) })
      .pipe(catchError((e) => throwError(() => this.mapError(e))));
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http
      .post<T>(`${this.base}${path}`, body ?? null, { headers: this.headers() })
      .pipe(catchError((e) => throwError(() => this.mapError(e))));
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.http
      .put<T>(`${this.base}${path}`, body ?? null, { headers: this.headers() })
      .pipe(catchError((e) => throwError(() => this.mapError(e))));
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<T>(`${this.base}${path}`, { headers: this.headers(false) })
      .pipe(catchError((e) => throwError(() => this.mapError(e))));
  }
}
