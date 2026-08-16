// shared/components/kawaii-select/kawaii-select.component.ts — dropdown kustom kawaii: searchable, debounced, animated
// Fitur: ketik untuk cari (debounce), scroll internal mulus, pop animation, accessible
import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { IconComponent } from '../icon/icon.component';

export interface SelectOption<T = string | number> {
  value: T;
  label: string;
  icon?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-kawaii-select',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="ks" [class.ks--open]="open" [class.ks--error]="error">
      <!-- Trigger -->
      <button
        type="button"
        class="ks-trigger"
        [class.ks-trigger--placeholder]="!selectedLabel"
        (click)="toggle()"
        [attr.aria-haspopup]="'listbox'"
        [attr.aria-expanded]="open"
        [attr.aria-label]="ariaLabel || label"
      >
        <span class="ks-trigger-icon" *ngIf="selectedIcon">
          <app-icon [name]="selectedIcon" [size]="16" />
        </span>
        <span class="ks-trigger-label">
          {{ selectedLabel || placeholder || 'Pilih...' }}
        </span>
        <span class="ks-caret" [class.ks-caret--rotated]="open">
          <app-icon name="chevron-down" [size]="16" />
        </span>
      </button>

      <!-- Menu -->
      <div class="ks-menu" *ngIf="open" [class.ks-menu--up]="menuUp">
        <!-- Search input (ketik untuk cari) -->
        <div class="ks-search" *ngIf="searchable">
          <app-icon name="search" [size]="15" class="ks-search-icon" />
          <input
            class="ks-search-input"
            type="text"
            [placeholder]="searchPlaceholder || 'Ketik untuk mencari...'"
            [(ngModel)]="searchTerm"
            (ngModelChange)="onSearch($event)"
            (keydown)="onSearchKey($event)"
            autocomplete="off"
          />
        </div>

        <!-- data-lenis-prevent: Lenis tidak mengintercept scroll di sini (mencegah
             konflik scroll halaman vs scroll menu yang bikin dropdown close sendiri) -->
        <div class="ks-menu-inner" data-lenis-prevent>
          <button
            *ngFor="let opt of filteredOptions"
            type="button"
            class="ks-item"
            [class.ks-item--selected]="isSelected(opt)"
            [class.ks-item--disabled]="opt.disabled"
            (click)="select(opt)"
            role="option"
            [attr.aria-selected]="isSelected(opt)"
          >
            <span class="ks-item-icon" *ngIf="opt.icon">
              <app-icon [name]="opt.icon" [size]="16" />
            </span>
            <span class="ks-item-label">{{ opt.label }}</span>
            <span class="ks-item-check" *ngIf="isSelected(opt)">
              <app-icon name="check" [size]="14" />
            </span>
          </button>
          <div class="ks-empty" *ngIf="!filteredOptions.length">
            {{ searchTerm ? 'Tidak ditemukan untuk "' + searchTerm + '"' : 'Tidak ada pilihan' }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }
    .ks { position: relative; width: 100%; }

    /* ----- Trigger ----- */
    .ks-trigger {
      width: 100%; display: flex; align-items: center; gap: 10px;
      padding: 11px 14px; border: 3px solid #0a0a0a; border-radius: 16px;
      background: #fff; font-family: inherit; font-weight: 600; font-size: .92rem;
      color: #0a0a0a; text-align: left; cursor: pointer;
      box-shadow: 3px 3px 0 #0a0a0a;
      transition: transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s, background .18s;
      position: relative; z-index: 2;
    }
    .ks-trigger:hover { transform: translateY(-1px); box-shadow: 4px 4px 0 #0a0a0a; background: #fffdf9; }
    .ks-trigger:active { transform: translate(1px,1px); box-shadow: 1px 1px 0 #0a0a0a; }
    .ks-trigger--placeholder { color: #999; font-weight: 500; }
    .ks-trigger-icon { display: inline-flex; color: #e07a5f; flex-shrink: 0; }
    .ks-trigger-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ks-caret {
      display: inline-flex; color: #0a0a0a; flex-shrink: 0;
      transition: transform .25s cubic-bezier(.34,1.56,.64,1);
    }
    .ks-caret--rotated { transform: rotate(180deg); }
    .ks--open .ks-trigger { box-shadow: 5px 5px 0 #0a0a0a; transform: translateY(-1px); }
    .ks--error .ks-trigger { border-color: #ff7096; box-shadow: 3px 3px 0 #ff7096; }

    /* ----- Menu ----- */
    .ks-menu {
      position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 100;
      background: #fff; border: 3px solid #0a0a0a; border-radius: 16px;
      box-shadow: 6px 6px 0 #0a0a0a; overflow: hidden;
      animation: ksPop .22s cubic-bezier(.34,1.56,.64,1) both;
      transform-origin: top center;
    }
    .ks-menu--up { top: auto; bottom: calc(100% + 8px); transform-origin: bottom center; }
    @keyframes ksPop {
      from { opacity: 0; transform: translateY(-8px) scale(.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ----- Search ----- */
    .ks-search {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; border-bottom: 2px solid #f0ece7; position: relative;
    }
    .ks-search-icon { color: #999; flex-shrink: 0; }
    .ks-search-input {
      flex: 1; border: none; outline: none; background: transparent;
      font-family: inherit; font-size: .88rem; font-weight: 500; color: #0a0a0a;
      padding: 2px 0;
    }
    .ks-search-input::placeholder { color: #bbb; }

    /* ----- List (SCROLLABLE dengan benar) ----- */
    .ks-menu-inner {
      max-height: 230px; overflow-y: auto; overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch; padding: 6px;
    }
    .ks-menu-inner::-webkit-scrollbar { width: 8px; }
    .ks-menu-inner::-webkit-scrollbar-thumb { background: #e5d9cf; border-radius: 8px; }

    /* ----- Item ----- */
    .ks-item {
      width: 100%; display: flex; align-items: center; gap: 10px;
      padding: 11px 12px; border-radius: 12px; border: none; background: transparent;
      font-family: inherit; font-weight: 600; font-size: .9rem; color: #333;
      text-align: left; cursor: pointer;
      transition: background .15s, transform .15s, padding-left .15s;
    }
    .ks-item:hover { background: #fff1e6; padding-left: 16px; }
    .ks-item--selected {
      background: #f8be9e; color: #0a0a0a; font-weight: 800;
      box-shadow: inset 2px 2px 0 rgba(0,0,0,.08);
    }
    .ks-item--disabled { opacity: .45; cursor: not-allowed; }
    .ks-item-icon { display: inline-flex; color: #e07a5f; flex-shrink: 0; }
    .ks-item--selected .ks-item-icon { color: #0a0a0a; }
    .ks-item-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ks-item-check { display: inline-flex; color: #0a0a0a; flex-shrink: 0; }
    .ks-empty { padding: 16px; text-align: center; color: #999; font-size: .85rem; font-weight: 600; }

    /* ----- Responsive ----- */
    @media (max-width: 640px) {
      .ks-trigger { padding: 10px 12px; font-size: .88rem; }
      .ks-item { padding: 13px 10px; } /* touch-friendly */
      .ks-menu-inner { max-height: 200px; }
    }
  `],
})
export class KawaiiSelectComponent<T = string | number> implements OnDestroy {
  @Input() options: SelectOption<T>[] = [];
  @Input() value: T | null = null;
  @Input() placeholder = 'Pilih...';
  @Input() label = '';
  @Input() ariaLabel = '';
  @Input() error = false;
  @Input() menuUp = false;
  @Input() searchable = false; // aktifkan input pencarian
  @Input() searchPlaceholder = 'Ketik untuk mencari...';
  @Output() valueChange = new EventEmitter<T | null>();

  open = false;
  searchTerm = '';
  private searchSub = new Subject<string>();
  private searchSubs: Subscription[] = [];
  private activeIndex = -1; // navigasi keyboard

  constructor(
    private el: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef
  ) {
    // Debouncing pencarian: tunggu 250ms setelah berhenti mengetik
    this.searchSubs.push(
      this.searchSub.pipe(debounceTime(250), distinctUntilChanged()).subscribe(() => {
        this.activeIndex = -1;
        this.cdr.markForCheck();
      })
    );
  }

  get selectedLabel(): string {
    const found = this.options.find((o) => o.value === this.value);
    return found?.label ?? '';
  }

  get selectedIcon(): string | undefined {
    return this.options.find((o) => o.value === this.value)?.icon;
  }

  // Filter opsi berdasarkan searchTerm (case-insensitive)
  get filteredOptions(): SelectOption<T>[] {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) return this.options;
    return this.options.filter((o) => o.label.toLowerCase().includes(q));
  }

  isSelected(opt: SelectOption<T>): boolean {
    return opt.value === this.value;
  }

  toggle(): void {
    this.open = !this.open;
    if (this.open) {
      this.searchTerm = '';
      // Fokus search input otomatis setelah menu buka
      setTimeout(() => {
        const input = this.el.nativeElement.querySelector<HTMLInputElement>('.ks-search-input');
        input?.focus();
      }, 60);
    }
    this.cdr.markForCheck();
  }

  onSearch(v: string): void {
    this.searchTerm = v;
    this.searchSub.next(v); // debounce
  }

  // Navigasi keyboard: ArrowDown/Up, Enter, Escape
  onSearchKey(e: KeyboardEvent): void {
    const items = this.filteredOptions;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.activeIndex = Math.min(this.activeIndex + 1, items.length - 1);
      this.scrollToActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.activeIndex = Math.max(this.activeIndex - 1, 0);
      this.scrollToActive();
    } else if (e.key === 'Enter' && this.activeIndex >= 0 && items[this.activeIndex]) {
      e.preventDefault();
      this.select(items[this.activeIndex]);
    } else if (e.key === 'Escape') {
      this.open = false;
      this.cdr.markForCheck();
    }
  }

  private scrollToActive(): void {
    const items = this.el.nativeElement.querySelectorAll<HTMLElement>('.ks-item');
    if (items[this.activeIndex]) {
      items[this.activeIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      items.forEach((el, i) => el.classList.toggle('ks-item--active', i === this.activeIndex));
    }
    this.cdr.markForCheck();
  }

  select(opt: SelectOption<T>): void {
    if (opt.disabled) return;
    this.value = opt.value;
    this.valueChange.emit(opt.value);
    this.open = false;
    this.searchTerm = '';
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!this.el.nativeElement.contains(e.target as Node)) {
      this.open = false;
      this.cdr.markForCheck();
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.open = false;
    this.cdr.markForCheck();
  }

  @HostListener('document:scroll', ['$event'])
  onScroll(e: Event): void {
    if (!this.open) return;

    // ROOT CAUSE FIX:
    // - Scroll di dalam .ks-menu-inner (data-lenis-prevent, Lenis tidak intercept)
    //   → target ada di dalam host → biarkan dropdown tetap terbuka.
    // - Scroll halaman / Lenis scroll halaman → target document/window → close.
    const target = e.target as Node | null;
    if (!target) return;

    if (this.el.nativeElement.contains(target)) {
      return; // scroll di dalam menu — jangan tutup
    }
    this.open = false;
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.searchSubs.forEach((s) => s.unsubscribe());
  }
}
