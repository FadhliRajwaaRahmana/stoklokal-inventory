// core/services/toast.service.ts — notifikasi toast global
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly stack$ = new BehaviorSubject<Toast[]>([]);
  private counter = 0;

  get stack() {
    return this.stack$.asObservable();
  }

  show(message: string, type: Toast['type'] = 'info', duration = 3500): void {
    const id = ++this.counter;
    const current = this.stack$.value;
    this.stack$.next([...current, { id, message, type }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error', 5000);
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  dismiss(id: number): void {
    this.stack$.next(this.stack$.value.filter((t) => t.id !== id));
  }
}
