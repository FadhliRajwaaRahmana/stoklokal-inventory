// features/layout/app-layout.component.ts — shell aplikasi: sidebar (desktop) + drawer (mobile) + topbar
import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { animate } from 'motion';
import { AuthService } from '../../core/services/auth.service';
import { LenisService } from '../../core/services/lenis.service';
import { initials } from '../../core/utils';
import { IconComponent } from '../../shared/components/icon/icon.component';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <div class="shell" [class.shell--mobile-open]="mobileOpen">
      <!-- Sidebar desktop -->
      <aside class="sidebar" [class.sidebar--mobile]="mobileOpen">
        <div class="sidebar-head">
          <div class="logo-box" routerLink="/dashboard">
            <app-icon name="package" [size]="24" />
          </div>
          <span class="logo-text" routerLink="/dashboard">Stok<span class="logo-accent">Lokal</span></span>
          <button class="sidebar-close hidden-desktop" (click)="mobileOpen = false" aria-label="Tutup menu">
            <app-icon name="close" [size]="18" />
          </button>
        </div>

        <nav class="sidebar-nav">
          <span class="nav-caption">Menu</span>
          <a
            *ngFor="let item of navItems"
            class="nav-item"
            [class.nav-item--active]="isActive(item)"
            [routerLink]="item.route"
            (click)="mobileOpen = false"
          >
            <span class="nav-icon"><app-icon [name]="item.icon" [size]="19" /></span>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        </nav>

        <div class="sidebar-foot">
          <div class="user-chip">
            <span class="user-avatar">{{ userInitials }}</span>
            <div class="user-meta">
              <strong class="user-name">{{ userName }}</strong>
              <small class="user-email">{{ userEmail }}</small>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm btn-block" (click)="logout()">
            <app-icon name="logout" [size]="16" /> Keluar
          </button>
        </div>
      </aside>

      <!-- Backdrop mobile -->
      <div class="mobile-backdrop" (click)="mobileOpen = false"></div>

      <!-- Konten utama -->
      <div class="main">
        <header class="topbar">
          <button class="topbar-burger hidden-desktop" (click)="mobileOpen = true" aria-label="Buka menu">
            <app-icon name="menu" [size]="22" />
          </button>
          <div class="topbar-title">{{ pageTitle }}</div>
          <div class="topbar-right">
            <span class="topbar-date hidden-mobile">{{ todayLabel }}</span>
            <button class="btn btn-ghost btn-sm hidden-mobile" (click)="logout()">
              <app-icon name="logout" [size]="15" /> Keluar
            </button>
            <span class="avatar-mini hidden-desktop">{{ userInitials }}</span>
          </div>
        </header>

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .shell { display: flex; min-height: 100dvh; background: #fff; }

    /* ----- Sidebar ----- */
    .sidebar {
      width: 264px; flex-shrink: 0; border-right: 3px solid #0a0a0a;
      background: #fffdf9; display: flex; flex-direction: column;
      position: sticky; top: 0; height: 100dvh; z-index: 40;
    }
    .sidebar-head {
      display: flex; align-items: center; gap: 12px; padding: 22px 20px 18px;
      border-bottom: 3px solid #0a0a0a;
    }
    .logo-box {
      width: 44px; height: 44px; border-radius: 14px; background: #f8be9e;
      border: 3px solid #0a0a0a; box-shadow: 3px 3px 0 #0a0a0a;
      display: grid; place-items: center; cursor: pointer;
      transition: transform .2s cubic-bezier(.34,1.56,.64,1);
    }
    .logo-box:hover { transform: rotate(-8deg) scale(1.05); }
    .logo-text { font-family: 'Nunito', sans-serif; font-weight: 900; font-size: 1.3rem; cursor: pointer; }
    .logo-accent { color: #e07a5f; }
    .sidebar-close { margin-left: auto; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; }

    .sidebar-nav { flex: 1; padding: 18px 14px; overflow-y: auto; }
    .nav-caption { font-size: .7rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #999; padding: 0 12px 10px; }
    .nav-item {
      display: flex; align-items: center; gap: 12px; padding: 12px 14px;
      border-radius: 16px; margin-bottom: 6px; font-weight: 700; font-size: .92rem;
      color: #333; border: 2px solid transparent;
      transition: background .15s, transform .15s, border-color .15s;
      cursor: pointer;
    }
    .nav-item:hover { background: #fff1e6; transform: translateX(3px); }
    .nav-item--active {
      background: #f8be9e; border-color: #0a0a0a; color: #0a0a0a;
      box-shadow: 3px 3px 0 #0a0a0a; font-weight: 800;
    }
    .nav-icon { display: grid; place-items: center; }

    .sidebar-foot { padding: 16px 14px; border-top: 3px solid #0a0a0a; display: flex; flex-direction: column; gap: 12px; }
    .user-chip { display: flex; align-items: center; gap: 12px; }
    .user-avatar {
      width: 42px; height: 42px; border-radius: 50%; background: #70d6ff; border: 3px solid #0a0a0a;
      display: grid; place-items: center; font-family: 'Nunito', sans-serif; font-weight: 900; font-size: .95rem;
      box-shadow: 2px 2px 0 #0a0a0a; flex-shrink: 0;
    }
    .user-meta { min-width: 0; }
    .user-name { display: block; font-size: .88rem; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-email { display: block; color: #888; font-size: .72rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ----- Main ----- */
    .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .topbar {
      display: flex; align-items: center; gap: 14px; padding: 14px 26px;
      border-bottom: 3px solid #0a0a0a; background: #fff; position: sticky; top: 0; z-index: 30;
    }
    .topbar-burger { width: 40px; height: 40px; border-radius: 12px; border: 2px solid #0a0a0a; display: grid; place-items: center; background: #fff; }
    .topbar-title { font-family: 'Nunito', sans-serif; font-weight: 900; font-size: 1.05rem; }
    .topbar-right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
    .topbar-date { color: #888; font-size: .8rem; font-weight: 600; }
    .avatar-mini {
      width: 38px; height: 38px; border-radius: 50%; background: #70d6ff; border: 2px solid #0a0a0a;
      display: grid; place-items: center; font-family: 'Nunito', sans-serif; font-weight: 900; font-size: .8rem;
    }

    .content { padding: 26px; flex: 1; max-width: 1200px; width: 100%; margin-inline: auto; }

    /* ----- Mobile ----- */
    .mobile-backdrop {
      display: none; position: fixed; inset: 0; background: rgba(10,10,10,.45);
      backdrop-filter: blur(3px); z-index: 35; opacity: 0;
    }
    @media (max-width: 768px) {
      .sidebar {
        position: fixed; left: 0; top: 0; bottom: 0; transform: translateX(-105%);
        transition: transform .32s cubic-bezier(.22,1,.36,1); box-shadow: 0 20px 50px rgba(0,0,0,.2);
      }
      .shell--mobile-open .sidebar { transform: translateX(0); }
      .shell--mobile-open .mobile-backdrop { display: block; }
      .content { padding: 20px 16px; }
      .topbar { padding: 12px 16px; }
    }
  `],
})
export class AppLayoutComponent implements OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private lenis = inject(LenisService);
  private el = inject(ElementRef<HTMLElement>);
  private sub = new Subscription();

  mobileOpen = false;

  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Produk', route: '/products', icon: 'box' },
    { label: 'Kategori', route: '/categories', icon: 'tag' },
    { label: 'Transaksi', route: '/transactions', icon: 'repeat' },
  ];

  pageTitle = 'Dashboard';

  constructor() {
    this.sub.add(
      this.router.events.subscribe((e) => {
        if (e instanceof NavigationEnd) {
          const item = this.navItems.find((n) => this.routeMatches(n, e.url));
          this.pageTitle = item?.label ?? 'Dashboard';
          this.mobileOpen = false;
          this.leninScrollToTop();
        }
      })
    );
    this.leninInit();
  }

  private leninInit(): void {
    this.lenis.init();
  }

  private leninScrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  get userInitials(): string {
    return initials(this.auth.user?.name);
  }

  get userName(): string {
    return this.auth.user?.name ?? 'Pengguna';
  }

  get userEmail(): string {
    return this.auth.user?.email ?? '';
  }

  get todayLabel(): string {
    return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  isActive(item: NavItem): boolean {
    const url = this.router.url.split('?')[0];
    return this.routeMatches(item, url);
  }

  private routeMatches(item: NavItem, url: string): boolean {
    if (item.exact) return url === item.route;
    return url.startsWith(item.route);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
