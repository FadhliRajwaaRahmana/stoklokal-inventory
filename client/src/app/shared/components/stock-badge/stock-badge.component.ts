// shared/components/stock-badge/stock-badge.component.ts — badge status stok (ok/low/out)
import { Component, Input } from '@angular/core';
import { StockStatus } from '../../../core/models';

@Component({
  selector: 'app-stock-badge',
  standalone: true,
  template: `
    <span class="badge" [class]="'badge--' + status">
      <span class="dot"></span>{{ label }}
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px;
      border-radius: 9999px; font-size: .75rem; font-weight: 800; border: 2px solid #0a0a0a;
    }
    .dot { width: 7px; height: 7px; border-radius: 9999px; background: currentColor; }
    .badge--ok { background: #bcffbe; }
    .badge--low { background: #ffd670; }
    .badge--out { background: #ff7096; color: #fff; }
  `],
})
export class StockBadgeComponent {
  @Input() status: StockStatus = 'ok';
  @Input() stock = 0;
  @Input() minStock = 5;

  get label(): string {
    if (this.status === 'out') return 'Habis';
    if (this.status === 'low') return `Menipis (${this.stock})`;
    return 'Aman';
  }
}
