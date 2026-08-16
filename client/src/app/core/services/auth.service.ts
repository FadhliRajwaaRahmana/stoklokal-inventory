// core/services/auth.service.ts — sesi pengguna, token localStorage, guard support
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiService } from '../api.service';
import { AuthResponse, User } from '../models';

const TOKEN_KEY = 'inventory_token';
const USER_KEY = 'inventory_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly user$ = new BehaviorSubject<User | null>(null);

  constructor(
    private api: ApiService,
    private router: Router
  ) {
    this.restore();
  }

  private restore(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      this.api.setToken(token);
      try {
        this.user$.next(JSON.parse(localStorage.getItem(USER_KEY) || 'null'));
      } catch {
        this.user$.next(null);
      }
    }
  }

  get user(): User | null {
    return this.user$.value;
  }

  get userChanges(): Observable<User | null> {
    return this.user$.asObservable();
  }

  get isLoggedIn(): boolean {
    return !!this.user$.value && !!this.api.getToken();
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/api/auth/login', { email, password }).pipe(
      tap((res) => this.persist(res))
    );
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/api/auth/register', { name, email, password }).pipe(
      tap((res) => this.persist(res))
    );
  }

  private persist(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.api.setToken(res.token);
    this.user$.next(res.user);
  }

  logout(): void {
    // best-effort panggil server, tetap logout lokal walau gagal
    this.api.post('/api/auth/logout').subscribe({ error: () => undefined });
    this.clear();
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.api.setToken(null);
    this.user$.next(null);
  }
}
