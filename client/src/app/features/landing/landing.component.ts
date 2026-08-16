// features/landing/landing.component.ts — Landing page: banyak section, GSAP + Lenis + Motion, infinite animations
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AuthService } from '../../core/services/auth.service';
import { LenisService } from '../../core/services/lenis.service';
import { ApiService } from '../../core/api.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <!-- ================= NAVBAR ================= -->
    <header class="nav" [class.nav--scrolled]="scrolled">
      <div class="nav-inner">
        <a class="nav-logo" routerLink="/">
          <span class="logo-box"><app-icon name="package" [size]="22" /></span>
          <span class="logo-text">Stok<span class="logo-accent">Lokal</span></span>
        </a>
        <nav class="nav-links hidden-mobile">
          <a href="#fitur">Fitur</a>
          <a href="#cara-kerja">Cara Kerja</a>
          <a href="#statistik">Statistik</a>
          <a href="#testimoni">Testimoni</a>
        </nav>
        <div class="nav-cta hidden-mobile">
          <a class="btn btn-ghost btn-sm" routerLink="/login" *ngIf="!isLoggedIn">Masuk</a>
          <a class="btn btn-primary btn-sm" [routerLink]="isLoggedIn ? '/dashboard' : '/register'">
            {{ isLoggedIn ? 'Dashboard' : 'Daftar' }}
          </a>
        </div>
        <button class="nav-burger hidden-desktop" (click)="toggleMenu()" [attr.aria-label]="mobileMenuOpen ? 'Tutup menu' : 'Buka menu'">
          <app-icon [name]="mobileMenuOpen ? 'close' : 'menu'" [size]="22" />
        </button>
      </div>

      <!-- Drawer mobile -->
      <div class="nav-drawer" [class.nav-drawer--open]="mobileMenuOpen">
        <a href="#fitur" (click)="closeMenu()">Fitur</a>
        <a href="#cara-kerja" (click)="closeMenu()">Cara Kerja</a>
        <a href="#statistik" (click)="closeMenu()">Statistik</a>
        <a href="#testimoni" (click)="closeMenu()">Testimoni</a>
        <div class="nav-drawer-cta">
          <a class="btn btn-ghost btn-block" routerLink="/login" *ngIf="!isLoggedIn" (click)="closeMenu()">Masuk</a>
          <a class="btn btn-primary btn-block" [routerLink]="isLoggedIn ? '/dashboard' : '/register'" (click)="closeMenu()">
            {{ isLoggedIn ? 'Dashboard' : 'Daftar Gratis' }}
          </a>
        </div>
      </div>
    </header>

    <!-- ================= HERO ================= -->
    <section class="hero">
      <div class="hero-bg"></div>

      <div class="hero-grid">
        <div class="hero-copy" data-reveal>
          <span class="hero-badge">Inventory Management</span>
          <h1 class="hero-title">
            Kelola stok <em class="hl">tanpa ribet</em>,<br />pantau semua <em class="blue hl">real-time</em>!
          </h1>
          <p class="hero-desc">
            StokLokal membantu Anda melacak produk, memantau stok menipis, dan mencatat setiap
            transaksi masuk-keluar — dalam satu dashboard yang cepat, cantik, dan penuh semangat.
          </p>
          <div class="hero-actions">
            <a class="btn btn-primary btn-lg" routerLink="/register">
              Mulai Sekarang <app-icon name="chevron-right" [size]="20" />
            </a>
            <a class="btn btn-ghost btn-lg" href="#fitur">Lihat Fitur</a>
          </div>
          <div class="hero-points">
            <span class="hp"><app-icon name="check" [size]="14" /> Gratis selamanya</span>
            <span class="hp"><app-icon name="check" [size]="14" /> Tanpa kartu kredit</span>
            <span class="hp"><app-icon name="check" [size]="14" /> Responsive semua layar</span>
          </div>
        </div>

        <!-- Mockup dashboard -->
        <div class="hero-mock" data-reveal data-reveal-delay="0.15">
          <div class="mock-card" data-tilt>
            <div class="mock-head">
              <span class="mock-dot r"></span><span class="mock-dot y"></span><span class="mock-dot g"></span>
              <span class="mock-url">stoklokal.app/dashboard</span>
            </div>
            <div class="mock-body">
              <div class="mock-stats">
                <div class="mock-stat" data-float-slow>
                  <span class="ms-emoji"><app-icon name="box" [size]="16" /></span>
                  <div><strong>17</strong><small>Produk</small></div>
                </div>
                <div class="mock-stat" data-float-slow data-float-delay="0.6">
                  <span class="ms-emoji"><app-icon name="trending-up" [size]="16" /></span>
                  <div><strong>628</strong><small>Unit Stok</small></div>
                </div>
                <div class="mock-stat" data-float-slow data-float-delay="1.2">
                  <span class="ms-emoji"><app-icon name="alert" [size]="16" /></span>
                  <div><strong>7</strong><small>Menipis</small></div>
                </div>
              </div>
              <div class="mock-chart">
                <div class="mc-bar" style="height:35%"></div>
                <div class="mc-bar" style="height:55%"></div>
                <div class="mc-bar" style="height:40%"></div>
                <div class="mc-bar" style="height:70%"></div>
                <div class="mc-bar" style="height:50%"></div>
                <div class="mc-bar" style="height:85%"></div>
                <div class="mc-bar" style="height:62%"></div>
              </div>
              <div class="mock-row">
                <span class="mr-emoji"><app-icon name="headphones" [size]="18" /></span>
                <div class="mr-info"><strong>Headphone Bluetooth Pro</strong><small>ELEK-001 · stok 42</small></div>
                <span class="badge badge-ok">Aman</span>
              </div>
              <div class="mock-row">
                <span class="mr-emoji"><app-icon name="battery" [size]="18" /></span>
                <div class="mr-info"><strong>Powerbank 20000mAh</strong><small>ELEK-004 · stok 4</small></div>
                <span class="badge badge-warn">Menipis</span>
              </div>
            </div>
          </div>
          <div class="mock-float-chip hidden-mobile" data-float-slow>Transaksi tercatat!</div>
        </div>
      </div>

      <div class="hero-scroll hidden-mobile" aria-hidden="true">
        <span class="scroll-text">Scroll</span>
        <span class="scroll-line"></span>
      </div>
    </section>

    <!-- ================= MARQUEE ================= -->
    <section class="marquee" aria-hidden="true">
      <div class="marquee-track" data-marquee>
        <div class="marquee-group">
          <span>Produk</span><span class="sep">✦</span>
          <span>Dashboard</span><span class="sep">✦</span>
          <span>Kategori</span><span class="sep">✦</span>
          <span>Transaksi</span><span class="sep">✦</span>
          <span>Alert Stok</span><span class="sep">✦</span>
          <span>Real-time</span><span class="sep">✦</span>
          <span>Responsive</span><span class="sep">✦</span>
          <span>Aman</span><span class="sep">✦</span>
        </div>
        <div class="marquee-group">
          <span>Produk</span><span class="sep">✦</span>
          <span>Dashboard</span><span class="sep">✦</span>
          <span>Kategori</span><span class="sep">✦</span>
          <span>Transaksi</span><span class="sep">✦</span>
          <span>Alert Stok</span><span class="sep">✦</span>
          <span>Real-time</span><span class="sep">✦</span>
          <span>Responsive</span><span class="sep">✦</span>
          <span>Aman</span><span class="sep">✦</span>
        </div>
      </div>
    </section>

    <!-- ================= FITUR ================= -->
    <section class="section" id="fitur">
      <div class="container">
        <div class="section-head" data-reveal>
          <span class="section-kicker">Fitur Unggulan</span>
          <h2 class="section-title">Semua yang Anda butuhkan untuk<br />mengelola inventori</h2>
          <p class="section-sub">Dirancang khusus agar pengelolaan stok jadi mudah, cepat, dan menyenangkan.</p>
        </div>

        <div class="features-grid" data-stagger>
          <div class="feature-card reveal-item">
            <span class="fc-emoji" data-float-slow><app-icon name="chart-column" [size]="26" /></span>
            <h3>Dashboard Real-time</h3>
            <p>Statistik produk, total stok, nilai inventori, dan pergerakan 7 hari terakhir dalam satu pandangan.</p>
            <span class="fc-tag">+8 kartu statistik</span>
          </div>
          <div class="feature-card reveal-item">
            <span class="fc-emoji" data-float-slow data-float-delay="0.4"><app-icon name="box" [size]="26" /></span>
            <h3>Manajemen Produk</h3>
            <p>Tambah, edit, cari, filter, dan urutkan produk dengan cepat. Lengkap dengan SKU, harga, dan stok minimum.</p>
            <span class="fc-tag">Search + filter + sort</span>
          </div>
          <div class="feature-card reveal-item">
            <span class="fc-emoji" data-float-slow data-float-delay="0.8"><app-icon name="tag" [size]="26" /></span>
            <h3>Kategori Fleksibel</h3>
            <p>Kelompokkan produk ke dalam kategori agar katalog tetap rapi dan mudah ditemukan.</p>
            <span class="fc-tag">Hitung produk otomatis</span>
          </div>
          <div class="feature-card reveal-item">
            <span class="fc-emoji" data-float-slow data-float-delay="1.2"><app-icon name="repeat" [size]="26" /></span>
            <h3>Transaksi Masuk & Keluar</h3>
            <p>Catat stok masuk dan keluar dengan validasi otomatis — stok tidak akan pernah minus.</p>
            <span class="fc-tag">Riwayat lengkap</span>
          </div>
          <div class="feature-card reveal-item">
            <span class="fc-emoji" data-float-slow data-float-delay="1.6"><app-icon name="bell" [size]="26" /></span>
            <h3>Alert Stok Menipis</h3>
            <p>Peringatan dini saat stok mendekati batas minimum atau habis, supaya Anda bisa restock tepat waktu.</p>
            <span class="fc-tag">Otomatis & jelas</span>
          </div>
          <div class="feature-card reveal-item">
            <span class="fc-emoji" data-float-slow data-float-delay="2"><app-icon name="shield" [size]="26" /></span>
            <h3>Aman & Pribadi</h3>
            <p>Login dengan JWT dan password terenkripsi. Data Anda hanya milik Anda, tersimpan aman.</p>
            <span class="fc-tag">JWT + bcrypt</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= CARA KERJA ================= -->
    <section class="section section-alt" id="cara-kerja">
      <div class="container">
        <div class="section-head" data-reveal>
          <span class="section-kicker">Cara Kerja</span>
          <h2 class="section-title">Mulai dalam 3 langkah mudah</h2>
          <p class="section-sub">Tidak perlu instalasi rumit. Cukup daftar, isi produk, dan kelola stok Anda.</p>
        </div>

        <div class="steps">
          <div class="step" data-reveal>
            <span class="step-num" data-float-slow>1</span>
            <span class="step-emoji"><app-icon name="user-plus" [size]="32" /></span>
            <h3>Daftar Akun</h3>
            <p>Buat akun gratis dalam hitungan detik — hanya butuh nama, email, dan password.</p>
          </div>
          <div class="step-arrow" data-reveal data-reveal-delay="0.1" aria-hidden="true">➜</div>
          <div class="step" data-reveal data-reveal-delay="0.15">
            <span class="step-num" data-float-slow data-float-delay="0.7">2</span>
            <span class="step-emoji"><app-icon name="box" [size]="32" /></span>
            <h3>Tambah Produk</h3>
            <p>Masukkan produk beserta SKU, harga modal, harga jual, dan batas stok minimum.</p>
          </div>
          <div class="step-arrow" data-reveal data-reveal-delay="0.25" aria-hidden="true">➜</div>
          <div class="step" data-reveal data-reveal-delay="0.3">
            <span class="step-num" data-float-slow data-float-delay="1.4">3</span>
            <span class="step-emoji"><app-icon name="repeat" [size]="32" /></span>
            <h3>Catat Transaksi</h3>
            <p>Catat stok masuk atau keluar, pantau dashboard, dan tidur nyenyak tanpa khawatir.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= STATISTIK ================= -->
    <section class="section section-stats" id="statistik">
      <div class="container">
        <div class="stats-row">
          <div class="big-stat" data-reveal>
            <strong class="bs-num" data-count-key="data-count-products">0</strong><span class="bs-label">Produk siap kelola</span>
          </div>
          <div class="big-stat" data-reveal data-reveal-delay="0.1">
            <strong class="bs-num" data-count-key="data-count-stock">0</strong><span class="bs-label">Unit stok tersimpan</span>
          </div>
          <div class="big-stat" data-reveal data-reveal-delay="0.2">
            <strong class="bs-num" data-count-key="data-count-categories">0</strong><span class="bs-label">Kategori produk</span>
          </div>
          <div class="big-stat" data-reveal data-reveal-delay="0.3">
            <strong class="bs-num" data-count-key="data-count-transactions">0</strong><span class="bs-label">Transaksi tercatat</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= TESTIMONI ================= -->
    <section class="section" id="testimoni">
      <div class="container">
        <div class="section-head" data-reveal>
          <span class="section-kicker">Testimoni</span>
          <h2 class="section-title">Kata mereka yang sudah<br />pakai StokLokal</h2>
        </div>
        <div class="testi-track-wrap" data-reveal>
          <div class="testi-track" data-marquee-slow>
            <div class="testi-group">
              <div class="testi-card">
                <div class="testi-stars"><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /></div>
                <p>"Dulu stok toko saya sering kacau. Sekarang semua terpantau rapi, alert stok menipisnya sangat membantu!"</p>
                <div class="testi-user"><span class="tu-avatar"><app-icon name="user" [size]="16" /></span><div><strong>Rina S.</strong><small>Pemilik Toko Kecil</small></div></div>
              </div>
              <div class="testi-card">
                <div class="testi-stars"><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /></div>
                <p>"Dashboard-nya cantik dan responsif di HP. Catat transaksi di mana saja jadi semudah ini."</p>
                <div class="testi-user"><span class="tu-avatar"><app-icon name="user" [size]="16" /></span><div><strong>Dian P.</strong><small>Admin Gudang</small></div></div>
              </div>
              <div class="testi-card">
                <div class="testi-stars"><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /></div>
                <p>"Fitur validasi stok minus itu penyelamat! Tidak ada lagi transaksi keluar melebihi stok yang ada."</p>
                <div class="testi-user"><span class="tu-avatar"><app-icon name="user" [size]="16" /></span><div><strong>Andi W.</strong><small>Founder UMKM</small></div></div>
              </div>
              <div class="testi-card">
                <div class="testi-stars"><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /></div>
                <p>"Paling suka desainnya yang playful tapi tetap profesional. Anak tim juga betah pakainya."</p>
                <div class="testi-user"><span class="tu-avatar"><app-icon name="user" [size]="16" /></span><div><strong>Maya L.</strong><small>Ops Manager</small></div></div>
              </div>
            </div>
            <div class="testi-group">
              <div class="testi-card">
                <div class="testi-stars"><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /></div>
                <p>"Dulu stok toko saya sering kacau. Sekarang semua terpantau rapi, alert stok menipisnya sangat membantu!"</p>
                <div class="testi-user"><span class="tu-avatar"><app-icon name="user" [size]="16" /></span><div><strong>Rina S.</strong><small>Pemilik Toko Kecil</small></div></div>
              </div>
              <div class="testi-card">
                <div class="testi-stars"><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /></div>
                <p>"Dashboard-nya cantik dan responsif di HP. Catat transaksi di mana saja jadi semudah ini."</p>
                <div class="testi-user"><span class="tu-avatar"><app-icon name="user" [size]="16" /></span><div><strong>Dian P.</strong><small>Admin Gudang</small></div></div>
              </div>
              <div class="testi-card">
                <div class="testi-stars"><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /></div>
                <p>"Fitur validasi stok minus itu penyelamat! Tidak ada lagi transaksi keluar melebihi stok yang ada."</p>
                <div class="testi-user"><span class="tu-avatar"><app-icon name="user" [size]="16" /></span><div><strong>Andi W.</strong><small>Founder UMKM</small></div></div>
              </div>
              <div class="testi-card">
                <div class="testi-stars"><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /><app-icon name="star" [size]="13" /></div>
                <p>"Paling suka desainnya yang playful tapi tetap profesional. Anak tim juga betah pakainya."</p>
                <div class="testi-user"><span class="tu-avatar"><app-icon name="user" [size]="16" /></span><div><strong>Maya L.</strong><small>Ops Manager</small></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= CTA AKHIR ================= -->
    <section class="section cta-section">
      <div class="container">
        <div class="cta-card" data-reveal>
          <div class="cta-emoji c1" data-float-slow><app-icon name="rocket" [size]="32" /></div>
          <div class="cta-emoji c2" data-float-slow data-float-delay="0.8"><app-icon name="zap" [size]="28" /></div>
          <div class="cta-emoji c3" data-float-slow data-float-delay="1.6"><app-icon name="target" [size]="28" /></div>
          <h2 class="cta-title">Siap bikin inventori<br />Anda <em>terkendali</em>?</h2>
          <p class="cta-sub">Gabung sekarang — gratis, cepat, dan tanpa ribet.</p>
          <div class="cta-actions">
            <a class="btn btn-accent btn-lg" routerLink="/register">Daftar Gratis Sekarang</a>
            <a class="btn btn-ghost btn-lg" routerLink="/login">Saya sudah punya akun</a>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= FOOTER ================= -->
    <footer class="footer">
      <div class="container footer-inner">
        <div class="footer-brand">
          <span class="logo-box"><app-icon name="package" [size]="20" /></span>
          <span class="logo-text">Stok<span class="logo-accent">Lokal</span></span>
          <p class="footer-desc">Aplikasi manajemen inventory modern — kelola produk, stok, dan transaksi dengan mudah.</p>
        </div>
        <div class="footer-links">
          <strong>Navigasi</strong>
          <a href="#fitur">Fitur</a>
          <a href="#cara-kerja">Cara Kerja</a>
          <a href="#statistik">Statistik</a>
          <a href="#testimoni">Testimoni</a>
        </div>
        <div class="footer-links">
          <strong>Akses</strong>
          <a routerLink="/login">Masuk</a>
          <a routerLink="/register">Daftar</a>
          <a routerLink="/dashboard">Dashboard</a>
        </div>
        <div class="footer-links">
          <strong>Dibuat dengan</strong>
          <span>Angular + GSAP</span>
          <span>Lenis + Motion</span>
          <span>Express + SQLite</span>
        </div>
      </div>
      <div class="footer-bottom">© 2026 StokLokal · Semua hak dilindungi</div>
    </footer>
  `,
  styles: [`
    :host { display: block; }
    .container { width: 100%; max-width: 1180px; margin-inline: auto; padding-inline: 20px; }
    @media (max-width: 480px) { .container { padding-inline: 14px; } }
    .hidden-mobile { @media (max-width: 768px) { display: none !important; } }
    .hidden-desktop { @media (min-width: 769px) { display: none !important; } }

    /* ===== NAVBAR ===== */
    .nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 90;
      transition: background .3s, box-shadow .3s, backdrop-filter .3s;
    }
    .nav--scrolled {
      background: rgba(255,255,255,.88); backdrop-filter: blur(12px);
      box-shadow: 0 4px 24px rgba(0,0,0,.06);
    }
    .nav-inner {
      max-width: 1180px; margin-inline: auto; padding: 12px 20px;
      display: flex; align-items: center; gap: 12px;
    }
    @media (max-width: 480px) { .nav-inner { padding: 10px 14px; } }
    .nav-logo { display: flex; align-items: center; gap: 10px; cursor: pointer; min-width: 0; }
    .logo-box {
      width: 40px; height: 40px; border-radius: 13px; background: #f8be9e;
      border: 3px solid #0a0a0a; box-shadow: 3px 3px 0 #0a0a0a;
      display: grid; place-items: center; flex-shrink: 0;
      transition: transform .25s cubic-bezier(.34,1.56,.64,1);
    }
    .nav-logo:hover .logo-box { transform: rotate(-8deg) scale(1.08); }
    .logo-text { font-family: 'Nunito', sans-serif; font-weight: 900; font-size: 1.2rem; white-space: nowrap; }
    .logo-accent { color: #e07a5f; }
    .nav-links { display: flex; gap: 22px; margin-inline: auto; }
    .nav-links a { font-weight: 700; font-size: .9rem; color: #444; transition: color .15s; }
    .nav-links a:hover { color: #e07a5f; }
    .nav-cta { display: flex; gap: 10px; margin-left: auto; }
    .nav-burger {
      display: none; margin-left: auto; width: 42px; height: 42px; border-radius: 12px;
      border: 2px solid #0a0a0a; background: #fff; box-shadow: 2px 2px 0 #0a0a0a;
      place-items: center; cursor: pointer; flex-shrink: 0;
      transition: transform .15s, background .15s;
    }
    .nav-burger:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 #0a0a0a; }
    /* Drawer mobile */
    .nav-drawer {
      display: none; flex-direction: column; gap: 4px;
      background: #fff; border-top: 3px solid #0a0a0a;
      padding: 10px 16px 18px; box-shadow: 0 14px 30px rgba(0,0,0,.12);
    }
    .nav-drawer a {
      padding: 13px 14px; border-radius: 12px; font-weight: 800; font-size: .95rem;
      color: #333; transition: background .15s;
    }
    .nav-drawer a:hover { background: #fff1e6; }
    .nav-drawer-cta { display: flex; flex-direction: column; gap: 10px; padding: 10px 14px 0; }
    @media (max-width: 768px) {
      .nav-links, .nav-cta { display: none; }
      .nav-burger { display: grid; }
      .nav-drawer.nav-drawer--open { display: flex; }
    }

    /* ===== HERO ===== */
    .hero {
      position: relative; overflow: hidden; padding: 140px 0 80px;
      background: linear-gradient(165deg, #f8be9e 0%, #ffd8c2 40%, #eaf7ff 75%, #ffffff 100%);
      border-bottom: 3px solid #0a0a0a;
    }
    @media (max-width: 768px) { .hero { padding: 108px 0 56px; } }
    .hero-bg {
      position: absolute; inset: 0; opacity: .16; pointer-events: none;
      background-image: radial-gradient(#0a0a0a 1.4px, transparent 1.4px);
      background-size: 24px 24px;
    }
    .hero-emoji { position: absolute; font-size: 2.4rem; filter: drop-shadow(3px 3px 0 rgba(0,0,0,.15)); will-change: transform; }
    .e1 { top: 18%; left: 5%; } .e2 { top: 12%; right: 8%; }
    .e3 { bottom: 18%; left: 9%; } .e4 { top: 40%; right: 4%; }
    .e5 { bottom: 12%; right: 16%; } .e6 { top: 30%; left: 12%; }
    .hero-grid {
      position: relative; z-index: 2;
      display: grid; grid-template-columns: 1.05fr 1fr; gap: 48px; align-items: center;
      max-width: 1180px; margin-inline: auto; padding-inline: 24px;
    }
    @media (max-width: 960px) { .hero-grid { grid-template-columns: 1fr; gap: 48px; } .hero-emoji { display: none; } }
    @media (max-width: 768px) { .hero-grid { gap: 40px; padding-inline: 18px; } }
    @media (max-width: 480px) { .hero-grid { padding-inline: 14px; } }
    .hero-badge {
      display: inline-block; padding: 8px 16px; border-radius: 9999px; background: #fff;
      border: 3px solid #0a0a0a; box-shadow: 3px 3px 0 #0a0a0a;
      font-family: 'Nunito', sans-serif; font-weight: 800; font-size: .82rem; margin-bottom: 22px;
    }
    .hero-title {
      font-size: clamp(2rem, 4.4vw, 3.2rem); font-weight: 900; line-height: 1.25; margin-bottom: 20px;
      text-wrap: balance; /* baris seimbang, tanpa orphan */
    }
    .hero-title em { font-style: normal; background: #ffd670; padding: 0 10px; border-radius: 12px; box-shadow: 3px 3px 0 #0a0a0a; }
    .hero-title em.blue { background: #70d6ff; }
    /* Frasa highlight selalu utuh — tidak pernah terpecah antar baris */
    .hero-title em.hl { white-space: nowrap; display: inline-block; }
    .hero-desc { font-size: 1.05rem; color: rgba(10,10,10,.72); max-width: 480px; margin-bottom: 28px; font-weight: 500; }
    .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 26px; }
    .hero-actions .btn { flex: 1 1 auto; }
    @media (max-width: 480px) {
      .hero-actions .btn { width: 100%; flex-basis: 100%; }
      /* Font H1 lebih kecil di mobile agar frasa highlight muat utuh tanpa pecah */
      .hero-title { font-size: clamp(1.45rem, 6.5vw, 1.9rem); line-height: 1.3; }
      .hero-title em { padding: 0 6px; }
      .hero-desc { font-size: .95rem; line-height: 1.6; }
      .hero-points { gap: 10px 16px; }
    }
    @media (max-width: 360px) {
      .hero-title { font-size: 1.35rem; }
    }
    .hero-points { display: flex; gap: 18px; flex-wrap: wrap; }
    .hp { display: inline-flex; align-items: center; gap: 6px; font-size: .82rem; font-weight: 700; color: #333; }

    /* Mockup */
    .hero-mock { position: relative; }
    .mock-card {
      background: #fff; border: 3px solid #0a0a0a; border-radius: 24px;
      box-shadow: 8px 8px 0 #0a0a0a; overflow: hidden; transform-origin: center;
    }
    .mock-head {
      display: flex; align-items: center; gap: 6px; padding: 12px 16px;
      border-bottom: 3px solid #0a0a0a; background: #fffdf9;
    }
    .mock-dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid #0a0a0a; }
    .mock-dot.r { background: #ff7096; } .mock-dot.y { background: #ffd670; } .mock-dot.g { background: #bcffbe; }
    .mock-url {
      margin-left: 8px; font-size: .68rem; font-weight: 700; color: #777;
      background: #f0ece7; padding: 3px 12px; border-radius: 9999px; border: 2px solid #0a0a0a;
    }
    .mock-body { padding: 18px; }
    .mock-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
    @media (max-width: 420px) { .mock-stats { gap: 6px; } .mock-stat { padding: 8px 6px; gap: 5px; } .mock-stat strong { font-size: .9rem; } }
    .mock-stat {
      display: flex; align-items: center; gap: 8px; padding: 10px;
      border: 2px solid #0a0a0a; border-radius: 14px; background: #fff7ef;
    }
    .ms-emoji { display: inline-flex; align-items: center; justify-content: center; color: #0a0a0a; }
    .mock-stat strong { font-family: 'Nunito', sans-serif; font-weight: 900; font-size: 1.05rem; display: block; line-height: 1; }
    .mock-stat small { font-size: .62rem; font-weight: 700; color: #777; }
    .mock-chart {
      display: flex; align-items: flex-end; gap: 8px; height: 110px;
      padding: 14px; border: 2px solid #0a0a0a; border-radius: 14px; margin-bottom: 14px;
      background: repeating-linear-gradient(to top, #f0ece7 0 2px, transparent 2px 22px);
    }
    .mc-bar { flex: 1; background: #f8be9e; border: 2px solid #0a0a0a; border-radius: 6px 6px 0 0; }
    .mc-bar:nth-child(even) { background: #70d6ff; }
    .mock-row {
      display: flex; align-items: center; gap: 10px; padding: 10px 12px;
      border: 2px solid #0a0a0a; border-radius: 14px; margin-bottom: 8px; background: #fff;
    }
    .mock-row:last-child { margin-bottom: 0; }
    .mr-emoji { display: inline-flex; align-items: center; justify-content: center; color: #0a0a0a; }
    .mr-info { flex: 1; min-width: 0; }
    .mr-info strong { display: block; font-size: .8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mr-info small { color: #888; font-size: .66rem; }
    .badge { padding: 3px 10px; border-radius: 9999px; font-size: .64rem; font-weight: 800; border: 2px solid #0a0a0a; }
    .badge-ok { background: #bcffbe; } .badge-warn { background: #ffd670; }
    .mock-float-chip {
      position: absolute; top: -16px; right: -12px; z-index: 3;
      background: #bcffbe; border: 3px solid #0a0a0a; border-radius: 9999px;
      padding: 8px 16px; font-weight: 800; font-size: .8rem;
      box-shadow: 4px 4px 0 #0a0a0a; will-change: transform;
    }

    /* Scroll indicator */
    .hero-scroll {
      position: absolute; bottom: 22px; left: 50%; transform: translateX(-50%);
      display: flex; flex-direction: column; align-items: center; gap: 6px;
    }
    .scroll-text { font-size: .64rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #888; }
    .scroll-line {
      width: 2px; height: 34px; background: #0a0a0a; border-radius: 2px; overflow: hidden;
      position: relative;
    }
    .scroll-line::after {
      content: ''; position: absolute; top: -50%; left: 0; right: 0; height: 50%;
      background: #e07a5f; animation: scrollDrop 1.6s ease-in-out infinite;
    }
    @keyframes scrollDrop { 0% { top: -50%; } 100% { top: 110%; } }

    /* ===== MARQUEE ===== */
    .marquee {
      overflow: hidden; background: #ffd670; border-bottom: 3px solid #0a0a0a; padding: 14px 0;
    }
    .marquee-track { display: flex; width: max-content; will-change: transform; }
    .marquee-group { display: flex; align-items: center; gap: 34px; padding-right: 34px; }
    .marquee-group span { font-family: 'Nunito', sans-serif; font-weight: 900; font-size: 1.05rem; white-space: nowrap; }
    .sep { color: #e07a5f; }

    /* ===== SECTION UMUM ===== */
    .section { padding: 88px 0; position: relative; }
    @media (max-width: 768px) { .section { padding: 60px 0; } }
    .section-alt { background: #fff7ef; border-block: 3px solid #0a0a0a; }
    /* Statistik: tema putih konsisten (bukan hitam) — angka pakai warna brand */
    .section-stats {
      background: linear-gradient(180deg, #fff7ef 0%, #ffffff 100%);
      border-block: 3px solid #0a0a0a;
    }
    .section-head { text-align: center; margin-bottom: 48px; }
    @media (max-width: 768px) { .section-head { margin-bottom: 36px; padding-inline: 4px; } }
    .section-kicker {
      display: inline-block; padding: 6px 16px; border-radius: 9999px; background: #fff;
      border: 2px solid #0a0a0a; box-shadow: 2px 2px 0 #0a0a0a;
      font-size: .78rem; font-weight: 800; margin-bottom: 18px;
    }
    .section-title { font-size: clamp(1.7rem, 3.4vw, 2.4rem); font-weight: 900; }
    @media (max-width: 480px) { .section-title { font-size: 1.55rem; } }
    .section-sub { color: #666; max-width: 520px; margin: 10px auto 0; }

    /* ===== FEATURES ===== */
    .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    @media (max-width: 960px) { .features-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .features-grid { grid-template-columns: 1fr; gap: 16px; } }
    .feature-card {
      background: #fff; border: 3px solid #0a0a0a; border-radius: 22px;
      box-shadow: 5px 5px 0 #0a0a0a; padding: 26px;
      transition: transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s;
    }
    .feature-card:hover { transform: translateY(-6px) rotate(-.6deg); box-shadow: 9px 9px 0 #0a0a0a; }
    .fc-emoji {
      display: inline-grid; place-items: center; width: 56px; height: 56px; font-size: 1.6rem;
      border: 3px solid #0a0a0a; border-radius: 18px; background: #fff1e6; margin-bottom: 16px;
      box-shadow: 3px 3px 0 #0a0a0a; will-change: transform;
    }
    .feature-card:nth-child(2) .fc-emoji { background: #eaf6ff; }
    .feature-card:nth-child(3) .fc-emoji { background: #fff8e1; }
    .feature-card:nth-child(4) .fc-emoji { background: #efffee; }
    .feature-card:nth-child(5) .fc-emoji { background: #ffeef4; }
    .feature-card:nth-child(6) .fc-emoji { background: #f0eaff; }
    .feature-card h3 { font-size: 1.15rem; font-weight: 900; margin-bottom: 8px; }
    .feature-card p { color: #555; font-size: .9rem; margin-bottom: 14px; }
    .fc-tag {
      display: inline-block; font-size: .7rem; font-weight: 800; color: #e07a5f;
      background: #fff7ef; border: 2px solid #0a0a0a; border-radius: 9999px; padding: 4px 12px;
    }

    /* ===== STEPS ===== */
    .steps { display: flex; align-items: stretch; justify-content: center; gap: 18px; flex-wrap: wrap; }
    .step {
      flex: 1; min-width: 220px; max-width: 320px; text-align: center;
      background: #fff; border: 3px solid #0a0a0a; border-radius: 24px;
      box-shadow: 6px 6px 0 #0a0a0a; padding: 32px 22px; position: relative;
      transition: transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s;
    }
    @media (max-width: 900px) {
      .steps { flex-direction: column; align-items: center; }
      .step { max-width: 360px; width: 100%; }
      .step-arrow { transform: rotate(90deg); padding: 4px 0; }
    }
    .step:hover { transform: translateY(-6px); box-shadow: 10px 10px 0 #0a0a0a; }
    .step-num {
      position: absolute; top: -18px; left: 50%; transform: translateX(-50%);
      width: 38px; height: 38px; border-radius: 50%; background: #f8be9e;
      border: 3px solid #0a0a0a; box-shadow: 2px 2px 0 #0a0a0a;
      display: grid; place-items: center; font-family: 'Nunito', sans-serif; font-weight: 900; font-size: 1.1rem;
    }
    .step:nth-child(1) .step-num { background: #f8be9e; }
    .step:nth-child(3) .step-num { background: #70d6ff; }
    .step:nth-child(5) .step-num { background: #ffd670; }
    .step-emoji { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; margin-bottom: 14px; border: 3px solid #0a0a0a; border-radius: 20px; background: #fff; box-shadow: 3px 3px 0 #0a0a0a; color: #e07a5f; }
    .step h3 { font-size: 1.15rem; font-weight: 900; margin-bottom: 8px; }
    .step p { color: #555; font-size: .88rem; }
    .step-arrow { align-self: center; font-size: 1.8rem; color: #e07a5f; font-weight: 900; }

    /* ===== STATS ===== */
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    @media (max-width: 900px) { .stats-row { grid-template-columns: repeat(2, 1fr); gap: 12px; } }
    @media (max-width: 420px) { .stats-row { grid-template-columns: repeat(2, 1fr); gap: 6px; } }
    .big-stat { text-align: center; padding: 26px 12px; }
    @media (max-width: 480px) { .big-stat { padding: 20px 6px; } }
    .bs-num {
      display: block; font-family: 'Nunito', sans-serif; font-weight: 900; font-size: clamp(2.4rem, 5vw, 3.4rem);
      color: #e07a5f; line-height: 1; margin-bottom: 8px;
    }
    .bs-label { color: #555; font-weight: 600; font-size: .85rem; }

    /* ===== TESTIMONI ===== */
    .testi-track-wrap { overflow: hidden; padding: 8px 0; }
    .testi-track { display: flex; width: max-content; will-change: transform; }
    .testi-group { display: flex; gap: 20px; padding-right: 20px; }
    .testi-card {
      width: min(300px, 78vw); flex-shrink: 0; background: #fff; border: 3px solid #0a0a0a;
      border-radius: 20px; box-shadow: 4px 4px 0 #0a0a0a; padding: 22px;
    }
    .testi-stars { display: flex; gap: 2px; color: #ffd670; margin-bottom: 10px; }
    .testi-card p { font-size: .88rem; color: #444; margin-bottom: 16px; }
    .testi-user { display: flex; align-items: center; gap: 10px; }
    .tu-avatar {
      width: 38px; height: 38px; border-radius: 50%; border: 2px solid #0a0a0a;
      display: grid; place-items: center; color: #0a0a0a;
      background: #f8be9e; flex-shrink: 0;
    }
    .testi-card:nth-child(2) .tu-avatar { background: #70d6ff; }
    .testi-card:nth-child(3) .tu-avatar { background: #ffd670; }
    .testi-card:nth-child(4) .tu-avatar { background: #bcffbe; }
    .testi-user strong { display: block; font-size: .84rem; }
    .testi-user small { color: #888; font-size: .7rem; }

    /* ===== CTA ===== */
    .cta-section { padding-top: 40px; }
    .cta-card {
      position: relative; overflow: hidden; text-align: center;
      background: linear-gradient(150deg, #f8be9e, #ffd8c2 50%, #70d6ff);
      border: 3px solid #0a0a0a; border-radius: 32px;
      box-shadow: 8px 8px 0 #0a0a0a; padding: 64px 24px;
    }
    @media (max-width: 768px) { .cta-card { border-radius: 24px; box-shadow: 5px 5px 0 #0a0a0a; padding: 48px 18px; } }
    @media (max-width: 480px) { .cta-card { padding: 44px 14px; } .cta-actions .btn { width: 100%; } }
    .cta-emoji { position: absolute; display: grid; place-items: center; width: 56px; height: 56px; border: 3px solid #0a0a0a; border-radius: 18px; background: #fff; box-shadow: 3px 3px 0 #0a0a0a; color: #e07a5f; will-change: transform; }
    @media (max-width: 768px) { .cta-emoji { display: none; } } /* dekorasi floating tidak menghalangi di mobile */
    .c1 { top: 18px; left: 8%; } .c2 { top: 24px; right: 10%; } .c3 { bottom: 20px; left: 16%; }
    .cta-title { font-size: clamp(1.8rem, 3.6vw, 2.6rem); font-weight: 900; margin-bottom: 14px; }
    @media (max-width: 480px) { .cta-title { font-size: 1.65rem; } }
    .cta-title em { font-style: normal; background: #fff; padding: 0 10px; border-radius: 12px; box-shadow: 3px 3px 0 #0a0a0a; }
    .cta-sub { font-weight: 600; color: rgba(10,10,10,.7); margin-bottom: 28px; }
    .cta-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }

    /* ===== FOOTER (tema putih konsisten) ===== */
    .footer { background: #fff7ef; color: #444; padding-top: 56px; border-top: 3px solid #0a0a0a; }
    .footer-inner {
      display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 34px;
      padding-bottom: 44px;
    }
    @media (max-width: 900px) { .footer-inner { grid-template-columns: 1fr 1fr; gap: 26px; } }
    @media (max-width: 480px) {
      .footer-inner { grid-template-columns: 1fr; gap: 22px; padding-bottom: 32px; }
      .footer-brand { order: 1; }
    }
    .footer .logo-text { color: #0a0a0a; }
    .footer .logo-box { background: #f8be9e; }
    .footer-desc { color: #666; font-size: .85rem; margin-top: 12px; max-width: 280px; }
    .footer-links { display: flex; flex-direction: column; gap: 10px; }
    .footer-links strong { font-family: 'Nunito', sans-serif; color: #e07a5f; margin-bottom: 6px; }
    .footer-links a, .footer-links span { color: #555; font-size: .86rem; cursor: pointer; transition: color .15s; }
    .footer-links a:hover { color: #e07a5f; }
    .footer-bottom {
      border-top: 2px solid #e8e0d6; text-align: center; padding: 18px;
      font-size: .78rem; color: #888;
    }
  `],
})
export class LandingComponent implements OnInit, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private router = inject(Router);
  private auth = inject(AuthService);
  private lenis = inject(LenisService);
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  scrolled = false;
  mobileMenuOpen = false;
  // Statistik real dari API (bukan angka hardcoded)
  stats = { products: 0, categories: 0, totalStock: 0, transactions: 0, lowStock: 0 };
  private scrollCbs: (() => void)[] = [];
  private rafs: number[] = [];
  private gsapTweens: gsap.core.Tween[] = [];

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn;
  }

  toggleMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMenu(): void {
    this.mobileMenuOpen = false;
  }

  ngOnInit(): void {
    this.lenis.init();
    this.initVisibilityPause();
  }

  // Fetch statistik real dari API — dipanggil di ngAfterViewInit (injection context aman)
  private loadStats(): void {
    this.api.get<{ products: number; categories: number; totalStock: number; transactions: number; lowStock: number }>('/api/stats')
      .subscribe({
        next: (s) => {
          this.stats = s;
          this.cdr.markForCheck();
          // Update angka count-up setelah data real tiba
          this.updateCountUps();
        },
        error: () => {
          // Fallback: tetap tampilkan struktur, angka 0 (tidak gimmick)
          this.cdr.markForCheck();
        },
      });
  }

  // Update angka [data-count] di template dengan nilai real dari API
  private updateCountUps(): void {
    const host = this.el.nativeElement;
    const map: Record<string, number> = {
      'data-count-products': this.stats.products,
      'data-count-stock': this.stats.totalStock,
      'data-count-categories': this.stats.categories,
      'data-count-transactions': this.stats.transactions,
    };
    requestAnimationFrame(() => {
      const host2: HTMLElement = this.el.nativeElement;
      host2.querySelectorAll<HTMLElement>('[data-count-key]').forEach((node: HTMLElement) => {
        const key = node.dataset['countKey'];
        const target = key ? map[key] ?? 0 : 0;
        const obj = { n: 0 };
        gsap.to(obj, {
          n: target,
          duration: 1.6,
          ease: 'power2.out',
          onUpdate: () => {
            node.textContent = Math.round(obj.n).toString();
          },
        });
      });
    });
  }

  ngAfterViewInit(): void {
    const host: HTMLElement = this.el.nativeElement;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    // Fetch statistik real (DOM sudah siap untuk count-up)
    this.loadStats();

    // ============================================================
    // HERO: ENTRANCE ANIMATION saat halaman load (bukan scrub)
    // Karena hero ada di posisi teratas, scrub sudah selesai sebelum
    // terlihat → hero tampak statis. Ganti dengan timeline entrance:
    // badge → judul → deskripsi → tombol → mockup (stagger naik).
    // ============================================================
    const heroCopy = host.querySelector<HTMLElement>('.hero-copy');
    if (heroCopy) {
      const children = Array.from(heroCopy.children) as HTMLElement[];
      gsap.set(children, { autoAlpha: 0, y: 36 });
      gsap
        .timeline({ delay: 0.15 })
        .to(children, {
          autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out',
          stagger: 0.12,
        });
    }
    const heroMock = host.querySelector<HTMLElement>('.hero-mock');
    if (heroMock) {
      gsap.fromTo(
        heroMock,
        { autoAlpha: 0, y: 56, scale: 0.94 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 1, ease: 'power3.out', delay: 0.55 }
      );
    }
    const heroBadge = host.querySelector<HTMLElement>('.hero-badge');
    if (heroBadge) {
      gsap.fromTo(heroBadge, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(2)', delay: 0.1 });
    }

    // ----- Scroll halus ke anchor — pakai Lenis (bukan window.scrollTo) -----
    // window.scrollTo({smooth}) + Lenis = konflik 2 sistem scroll → glitch.
    // Lenis.scrollTo → satu sistem scroll, offset -72 untuk kompensasi navbar.
    host.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
      const onClick = (e: Event) => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#') return;
        const target = host.querySelector<HTMLElement>(href);
        if (!target) return;
        e.preventDefault();
        this.lenis.scrollTo(target, -72);
        this.closeMenu();
      };
      anchor.addEventListener('click', onClick);
      this.scrollCbs.push(() => anchor.removeEventListener('click', onClick));
    });

    // ----- Navbar scrolled state -----
    const onScroll = () => {
      this.scrolled = window.scrollY > 30;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.scrollCbs.push(() => window.removeEventListener('scroll', onScroll));

    // ----- Reveal on scroll (SCRUB: animasi terikat progress scroll, TANPA glitch) -----
    // scrub:true → opacity & y elemen mengikuti posisi scroll secara kontinu.
    // Scroll down → elemen muncul mulus; scroll up → kembali mulus.
    // TIDAK ada reset/blink (tidak restart), TIDAK ada konflik dua sistem.
    host.querySelectorAll<HTMLElement>('[data-reveal]').forEach((node: HTMLElement) => {
      const delay = parseFloat(node.dataset['revealDelay'] || '0');
      gsap.fromTo(
        node,
        { autoAlpha: 0, y: 44 },
        {
          autoAlpha: 1, y: 0, duration: 1, delay,
          ease: 'none',
          scrollTrigger: {
            trigger: node,
            start: 'top 92%',
            end: 'top 55%',
            scrub: true,
          },
        }
      );
    });

    // ----- Feature cards: stagger reveal dengan scrub (per kartu) -----
    const featureCards = Array.from(host.querySelectorAll<HTMLElement>('.features-grid .reveal-item'));
    featureCards.forEach((card, i) => {
      gsap.fromTo(
        card,
        { autoAlpha: 0, y: 40 },
        {
          autoAlpha: 1, y: 0, duration: 1, ease: 'none',
          scrollTrigger: {
            trigger: card,
            start: 'top 90%',
            end: 'top 55%',
            scrub: true,
          },
        }
      );
    });

    // ----- INFINITE: float emoji hero (nonaktif di mobile) -----
    if (!isMobile) {
      host.querySelectorAll<HTMLElement>('[data-float]').forEach((node: HTMLElement, i: number) => {
        const t = gsap.to(node, {
          y: `-=${12 + (i % 3) * 5}`,
          x: `+=${(i % 2 ? 1 : -1) * 8}`,
          rotation: i % 2 ? 5 : -5,
          duration: 2.4 + (i % 4) * 0.5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          transformOrigin: 'center center',
        });
        this.gsapTweens.push(t);
      });

      // ----- INFINITE: float lambat (badge, chips, icon fitur, mock) -----
      host.querySelectorAll<HTMLElement>('[data-float-slow]').forEach((node: HTMLElement) => {
        const delay = parseFloat(node.dataset['floatDelay'] || '0');
        const t = gsap.to(node, {
          y: '-=9',
          rotation: 2.5,
          duration: 2.8,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay,
          transformOrigin: 'center center',
        });
        this.gsapTweens.push(t);
      });
    }

    // ----- INFINITE: marquee fitur (horizontal) -----
    const marquee = host.querySelector<HTMLElement>('[data-marquee]');
    if (marquee) {
      const t = gsap.to(marquee, {
        xPercent: -50,
        duration: 22,
        ease: 'none',
        repeat: -1,
      });
      this.gsapTweens.push(t);
    }

    // ----- INFINITE: marquee testimoni (lebih lambat, berlawanan arah?) -----
    const testiTrack = host.querySelector<HTMLElement>('[data-marquee-slow]');
    if (testiTrack) {
      const t = gsap.to(testiTrack, {
        xPercent: -50,
        duration: 38,
        ease: 'none',
        repeat: -1,
      });
      this.gsapTweens.push(t);
    }

    // ----- Tilt mockup card (desktop only) -----
    const mockCard = host.querySelector<HTMLElement>('[data-tilt]');
    if (mockCard && !isMobile) {
      const move = (e: MouseEvent) => {
        const rect = mockCard.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(mockCard, { rotationY: px * 10, rotationX: -py * 10, duration: 0.5, ease: 'power2.out' });
      };
      const leave = () => gsap.to(mockCard, { rotationY: 0, rotationX: 0, duration: 0.8, ease: 'elastic.out(1,0.5)' });
      mockCard.addEventListener('mousemove', move);
      mockCard.addEventListener('mouseleave', leave);
      this.scrollCbs.push(() => {
        mockCard.removeEventListener('mousemove', move);
        mockCard.removeEventListener('mouseleave', leave);
      });
    }

    // ============================================================
    // HERO PARALLAX saat scroll — konten & mockup bergerak beda arah
    // (terasa hidup saat scroll, bukan statis)
    // ============================================================
    if (!isMobile) {
      const heroSection = host.querySelector<HTMLElement>('.hero');
      const heroCopy2 = host.querySelector<HTMLElement>('.hero-copy');
      const heroMock2 = host.querySelector<HTMLElement>('.hero-mock');
      if (heroSection) {
        if (heroCopy2) {
          gsap.to(heroCopy2, {
            yPercent: 18, ease: 'none',
            scrollTrigger: { trigger: heroSection, start: 'top top', end: 'bottom top', scrub: 0.6 },
          });
        }
        if (heroMock2) {
          gsap.to(heroMock2, {
            yPercent: -12, ease: 'none',
            scrollTrigger: { trigger: heroSection, start: 'top top', end: 'bottom top', scrub: 0.6 },
          });
        }
        // Background pelan (kesan kedalaman)
        const bg = host.querySelector<HTMLElement>('.hero-bg');
        if (bg) {
          gsap.to(bg, {
            yPercent: 25, ease: 'none',
            scrollTrigger: { trigger: heroSection, start: 'top top', end: 'bottom top', scrub: 0.6 },
          });
        }
      }
    }

    // ----- Parallax lembut hero emoji saat scroll (desktop only) -----
    if (isMobile) return;
    host.querySelectorAll<HTMLElement>('.hero-emoji').forEach((node: HTMLElement) => {
      gsap.to(node, {
        yPercent: 60,
        ease: 'none',
        scrollTrigger: { trigger: host.querySelector('.hero')!, start: 'top top', end: 'bottom top', scrub: 0.6 },
      });
    });
  }

  ngOnDestroy(): void {
    this.scrollCbs.forEach((cb) => cb());
    this.rafs.forEach((r) => cancelAnimationFrame(r));
    this.gsapTweens.forEach((t) => t.kill());
    ScrollTrigger.getAll().forEach((st) => st.kill());
    // Hentikan observer visibility
    this.visibilityCb?.();
  }

  // ----- Pause semua tween saat tab tidak terlihat (hemat CPU/baterai) -----
  private visibilityCb: (() => void) | null = null;

  private initVisibilityPause(): void {
    const onVis = () => {
      if (document.hidden) {
        this.gsapTweens.forEach((t) => t.pause());
      } else {
        this.gsapTweens.forEach((t) => t.resume());
      }
    };
    document.addEventListener('visibilitychange', onVis);
    this.visibilityCb = () => document.removeEventListener('visibilitychange', onVis);
  }
}
