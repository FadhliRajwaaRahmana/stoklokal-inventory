// shared/components/stat-card/stat-card.component.ts — kartu statistik dashboard dengan animasi hitung
// FIX zoneless: rAF manual tidak trigger change detection → angka tetap 0.
// Solusi: markForCheck() di setiap frame agar displayValue ter-render.
import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="stat-card" [class.stat-card--clickable]="clickable" (click)="onClick()">
      <div class="stat-icon" [class]="'stat-icon--' + tone">
        <app-icon [name]="icon" [size]="22" />
      </div>
      <div class="stat-body">
        <span class="stat-label">{{ label }}</span>
        <span class="stat-value">{{ displayValue }}</span>
        <span *ngIf="sub" class="stat-sub">{{ sub }}</span>
      </div>
      <span *ngIf="clickable" class="stat-arrow"><app-icon name="chevron-right" [size]="18" /></span>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .stat-card {
      display: flex; align-items: center; gap: 16px;
      background: #fff; border: 3px solid #0a0a0a; border-radius: 24px;
      padding: 20px; box-shadow: 4px 4px 0 #0a0a0a;
      transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
    }
    .stat-card--clickable { cursor: pointer; }
    .stat-card--clickable:hover { transform: translate(-2px,-2px); box-shadow: 7px 7px 0 #0a0a0a; }
    .stat-icon {
      width: 52px; height: 52px; border-radius: 18px; border: 3px solid #0a0a0a;
      display: grid; place-items: center; flex-shrink: 0; background: #f8be9e;
    }
    .stat-icon--blue { background: #70d6ff; }
    .stat-icon--yellow { background: #ffd670; }
    .stat-icon--green { background: #bcffbe; }
    .stat-icon--pink { background: #ff7096; color: #fff; }
    .stat-icon--purple { background: #d8b4fe; }
    .stat-body { display: flex; flex-direction: column; min-width: 0; }
    .stat-label { font-size: .8rem; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: .04em; }
    .stat-value { font-family: 'Nunito', sans-serif; font-weight: 900; font-size: 1.55rem; line-height: 1.15; }
    .stat-sub { font-size: .72rem; color: #888; font-weight: 600; }
    .stat-arrow { margin-left: auto; color: #0a0a0a; }
  `],
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value: number | string = 0;
  @Input() prefix = '';
  @Input() suffix = '';
  @Input() sub = '';
  @Input() icon = 'box';
  @Input() tone: 'peach' | 'blue' | 'yellow' | 'green' | 'pink' | 'purple' = 'peach';
  @Input() animate = true;
  @Input() clickable = false;
  @Output() cardClick = new EventEmitter<void>();

  displayValue: string = '0';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(): void {
    const numeric = Number(this.value);
    if (this.animate && !isNaN(numeric) && this.value !== '') {
      // Animasikan angka dari 0 ke target dengan markForCheck tiap frame (zoneless-safe)
      const from = { n: 0 };
      const start = performance.now();
      const dur = 1100;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        from.n = numeric * eased;
        this.displayValue = this.prefix + Math.round(from.n).toLocaleString('id-ID') + this.suffix;
        this.cdr.markForCheck(); // ← KUNCI: paksa render di zoneless
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          this.displayValue = this.prefix + numeric.toLocaleString('id-ID') + this.suffix;
          this.cdr.markForCheck();
        }
      };
      requestAnimationFrame(step);
    } else {
      this.displayValue = this.prefix + String(this.value) + this.suffix;
      this.cdr.markForCheck();
    }
  }

  onClick(): void {
    if (this.clickable) this.cardClick.emit();
  }
}
