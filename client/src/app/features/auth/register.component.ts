// features/auth/register.component.ts — halaman register
import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { animate } from 'motion';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { GsapFloatDirective } from '../../shared/directives/gsap-float.directive';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IconComponent, GsapFloatDirective],
  template: `
    <div class="auth-page">
      <!-- Tombol kembali ke beranda (desktop & mobile) -->
      <a class="back-home" routerLink="/">
        <app-icon name="chevron-right" [size]="18" class="back-chevron" />
        <span>Kembali ke Beranda</span>
      </a>

      <!-- Panel kiri: brand + dekorasi -->
      <div class="auth-brand">
        <div class="brand-bg"></div>
        <div class="brand-emoji float-1" gsapFloat [gsapFloatDistance]="12" [gsapFloatDuration]="3"><app-icon name="user-plus" [size]="38" /></div>
        <div class="brand-emoji float-2" gsapFloat [gsapFloatDistance]="16" [gsapFloatDuration]="4" [gsapFloatRotate]="6"><app-icon name="rocket" [size]="38" /></div>
        <div class="brand-emoji float-3" gsapFloat [gsapFloatDistance]="10" [gsapFloatDuration]="3.2" [gsapFloatRotate]="-4"><app-icon name="award" [size]="38" /></div>
        <div class="brand-content">
          <span class="brand-badge">Mulai Gratis</span>
          <h1 class="brand-title">Siap-siap<br />jadi <em>raja</em> stok!</h1>
          <p class="brand-desc">
            Buat akun dalam hitungan detik dan langsung kelola inventori Anda —
            tanpa ribet, tanpa bingung.
          </p>
          <div class="brand-stats">
            <div class="brand-stat">
              <strong>5+</strong><small>Kategori</small>
            </div>
            <div class="brand-stat">
              <strong>∞</strong><small>Produk</small>
            </div>
            <div class="brand-stat">
              <strong>24/7</strong><small>Akses</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel kanan: form -->
      <div class="auth-form-panel">
        <div class="auth-card">
          <div class="auth-logo">
            <app-icon name="sparkle" [size]="30" />
          </div>
          <h2 class="auth-title">Buat akun baru</h2>
          <p class="auth-sub">Gratis selamanya, tanpa kartu kredit</p>

          <form (ngSubmit)="onSubmit()" class="auth-form">
            <div class="field">
              <label class="field-label" for="name"><app-icon name="user" [size]="15" /> Nama</label>
              <input
                class="input"
                id="name"
                type="text"
                name="name"
                placeholder="Nama lengkap"
                [(ngModel)]="name"
                required
                autocomplete="name"
              />
            </div>

            <div class="field">
              <label class="field-label" for="email"><app-icon name="mail" [size]="15" /> Email</label>
              <input
                class="input"
                id="email"
                type="email"
                name="email"
                placeholder="nama@email.com"
                [(ngModel)]="email"
                required
                autocomplete="email"
              />
            </div>

            <div class="field">
              <label class="field-label" for="password"><app-icon name="lock" [size]="15" /> Password</label>
              <div class="password-wrap">
                <input
                  class="input"
                  id="password"
                  [type]="showPassword ? 'text' : 'password'"
                  name="password"
                  placeholder="Minimal 6 karakter"
                  [(ngModel)]="password"
                  required
                  minlength="6"
                  autocomplete="new-password"
                />
                <button type="button" class="password-toggle" (click)="showPassword = !showPassword" aria-label="Tampilkan password">
                  <app-icon [name]="showPassword ? 'eye-off' : 'eye'" [size]="18" />
                </button>
              </div>
            </div>

            <button class="btn btn-primary btn-lg btn-block" type="submit" [disabled]="loading">
              <span *ngIf="!loading">Daftar Sekarang</span>
              <span *ngIf="loading" class="spinner"></span>
            </button>
          </form>

          <p class="auth-switch">
            Sudah punya akun?
            <a routerLink="/login" class="auth-link">Masuk di sini</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; }
    .auth-page { display: grid; grid-template-columns: 1fr 1fr; min-height: 100dvh; }

    /* ----- Panel brand ----- */
    .auth-brand {
      position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;
      padding: 48px; background: linear-gradient(200deg, #70d6ff 0%, #b7e8ff 50%, #f8be9e 100%);
      border-right: 3px solid #0a0a0a;
    }
    .brand-bg {
      position: absolute; inset: 0; opacity: .14; pointer-events: none;
      background-image: radial-gradient(#0a0a0a 1.5px, transparent 1.5px);
      background-size: 22px 22px;
    }
    .brand-emoji { position: absolute; display: grid; place-items: center; width: 60px; height: 60px; color: #0a0a0a; background: rgba(255,255,255,.9); border: 3px solid #0a0a0a; border-radius: 20px; box-shadow: 4px 4px 0 rgba(0,0,0,.2); }
    .float-1 { top: 10%; left: 14%; }
    .float-2 { top: 15%; right: 12%; }
    .float-3 { bottom: 14%; left: 20%; }
    .brand-content { position: relative; z-index: 1; max-width: 460px; }
    .brand-badge {
      display: inline-block; padding: 8px 18px; border-radius: 9999px; background: #fff;
      border: 3px solid #0a0a0a; font-family: 'Nunito', sans-serif; font-weight: 800; font-size: .85rem;
      box-shadow: 3px 3px 0 #0a0a0a; margin-bottom: 22px;
    }
    .brand-title { font-size: clamp(2rem, 4.2vw, 3rem); font-weight: 900; line-height: 1.12; margin-bottom: 18px; }
    .brand-title em { font-style: normal; background: #f8be9e; padding: 0 10px; border-radius: 12px; box-shadow: 3px 3px 0 #0a0a0a; }
    .brand-desc { font-size: 1rem; color: rgba(10,10,10,.75); font-weight: 500; margin-bottom: 30px; }
    .brand-stats { display: flex; gap: 14px; }
    .brand-stat {
      flex: 1; text-align: center; background: rgba(255,255,255,.85); border: 3px solid #0a0a0a;
      border-radius: 18px; padding: 14px 10px; box-shadow: 3px 3px 0 #0a0a0a; backdrop-filter: blur(2px);
    }
    .brand-stat strong { font-family: 'Nunito', sans-serif; font-weight: 900; font-size: 1.4rem; display: block; }
    .brand-stat small { color: #555; font-weight: 600; font-size: .72rem; }

    /* ----- Panel form ----- */
    .auth-form-panel {
      display: flex; align-items: center; justify-content: center; padding: 32px 24px;
      background: #fff; position: relative;
    }
    .auth-card { width: 100%; max-width: 400px; }
    .auth-logo {
      width: 62px; height: 62px; border-radius: 20px; background: #ffd670;
      border: 3px solid #0a0a0a; box-shadow: 4px 4px 0 #0a0a0a;
      display: grid; place-items: center; margin-bottom: 22px;
    }
    .auth-title { font-size: 1.65rem; font-weight: 900; margin-bottom: 6px; }
    .auth-sub { color: #555; margin-bottom: 26px; }
    .password-wrap { position: relative; }
    .password-wrap .input { padding-right: 48px; }
    .password-toggle {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center;
      transition: background .15s;
    }
    .password-toggle:hover { background: #fff7ef; }
    .spinner {
      width: 20px; height: 20px; border: 3px solid rgba(10,10,10,.25); border-top-color: #0a0a0a;
      border-radius: 50%; animation: spin .7s linear infinite; display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .auth-switch { text-align: center; margin-top: 20px; color: #555; font-size: .92rem; }
    .auth-link { font-weight: 800; color: #0a0a0a; text-decoration: underline; text-underline-offset: 3px; }

    /* ----- Tombol kembali ke beranda ----- */
    .back-home {
      position: fixed; top: 18px; left: 18px; z-index: 50;
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 18px 10px 14px; border-radius: 9999px;
      background: #fff; border: 3px solid #0a0a0a; box-shadow: 3px 3px 0 #0a0a0a;
      font-family: 'Nunito', sans-serif; font-weight: 800; font-size: .85rem; color: #0a0a0a;
      transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s, background .2s;
    }
    .back-home:hover { transform: translateY(-2px); box-shadow: 5px 5px 0 #0a0a0a; background: #fff7ef; }
    .back-home:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 #0a0a0a; }
    .back-chevron { transform: rotate(180deg); }
    @media (max-width: 900px) {
      .back-home {
        top: 14px; left: 14px; padding: 8px 14px 8px 10px; font-size: .78rem;
        background: rgba(255,255,255,.92); backdrop-filter: blur(6px);
      }
    }

    /* ----- Responsive ----- */
    @media (max-width: 900px) {
      .auth-page { grid-template-columns: 1fr; }
      .auth-brand { display: none; }
      .auth-form-panel { min-height: 100dvh; }
      /* Floating decorative icons tidak boleh menghalangi di mobile */
      .brand-emoji { display: none !important; }
      .back-home { z-index: 60; }
    }
  `],
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private el = inject(ElementRef<HTMLElement>);

  name = '';
  email = '';
  password = '';
  showPassword = false;
  loading = false;

  ngAfterViewInit(): void {
    const host = this.el?.nativeElement as HTMLElement | undefined;
    const card = host?.querySelector('.auth-card');
    const brand = host?.querySelector('.auth-brand');
    if (card) {
      animate(card as HTMLElement, { opacity: [0, 1], y: [30, 0] }, { duration: 0.7, easing: [0.22, 1, 0.36, 1] } as any);
    }
    if (brand) {
      animate(brand as HTMLElement, { opacity: [0, 1], x: [-30, 0] }, { duration: 0.8, easing: [0.22, 1, 0.36, 1] } as any);
    }
  }

  onSubmit(): void {
    if (this.loading) return;
    if (!this.name.trim() || !this.email.trim() || !this.password) {
      this.toast.error('Semua kolom wajib diisi');
      return;
    }
    if (this.password.length < 6) {
      this.toast.error('Password minimal 6 karakter');
      return;
    }
    this.loading = true;
    this.auth.register(this.name.trim(), this.email.trim(), this.password).subscribe({
      next: () => {
        this.toast.success(`Akun berhasil dibuat! Selamat datang, ${this.name.trim()}`);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err.message || 'Gagal mendaftar');
      },
    });
  }
}
