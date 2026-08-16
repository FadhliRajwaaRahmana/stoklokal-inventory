// app.ts — root component: render outlet + toast global + redirect cerdas (landing/dashboard)
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  template: `
    <router-outlet />
    <app-toast />
  `,
})
export class App implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    // Pengguna yang sudah login tidak perlu melihat landing — arahkan ke dashboard
    if (this.auth.isLoggedIn && this.router.url === '/') {
      this.router.navigate(['/dashboard']);
    }
  }
}
