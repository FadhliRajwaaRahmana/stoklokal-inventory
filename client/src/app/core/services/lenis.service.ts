// core/services/lenis.service.ts — Lenis smooth scroll (global, sekali inisialisasi)
// Terintegrasi dengan GSAP ScrollTrigger agar animasi reveal smooth & sinkron
import { Injectable, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Injectable({ providedIn: 'root' })
export class LenisService {
  private readonly platformId = inject(PLATFORM_ID);
  private lenis: Lenis | null = null;

  init(): void {
    if (!isPlatformBrowser(this.platformId) || this.lenis) return;

    // Mobile & touch: aktifkan syncTouch agar scroll sentuh juga smooth (opsi 1 user)
    this.lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: true,          // smooth scroll di touch/mobile
      syncTouchLerp: 0.12,      // kehalusan sentuh (makin kecil makin smooth)
      touchMultiplier: 1.4,
      // ----- Fix scroll horizontal di mobile -----
      // Lenis dengan syncTouch meng-intercept SEMUA gesture sentuh → scroll
      // horizontal pada area scrollable (tabel, dropdown, chips) ter-block.
      // prevent() membiarkan elemen dengan data-lenis-prevent discroll NATIF
      // (sentuh horizontal tetap jalan, smooth vertical tetap aktif di luar).
      prevent: (node: HTMLElement) => {
        if (!node || node.nodeType !== 1) return false;
        if (node.hasAttribute?.('data-lenis-prevent')) return true;
        return (
          node.scrollHeight > node.clientHeight ||
          node.scrollWidth > node.clientWidth
        ) && getComputedStyle(node).overflowY === 'auto';
      },
    });

    // ----- Integrasi Lenis ⇄ GSAP ScrollTrigger (kunci smoothness) -----
    // 1. Paksa ScrollTrigger update setiap frame Lenis berjalan
    this.lenis.on('scroll', ScrollTrigger.update);

    // 2. Jalankan Lenis lewat GSAP ticker — satu loop, sinkron dengan semua animasi
    gsap.ticker.add((time) => {
      this.lenis?.raf(time * 1000);
    });
    // lagSmoothing default (bukan 0) — hindari mikro-jank pada frame lambat

    // 3. Refresh ScrollTrigger setelah Lenis aktif (hitung ulang posisi trigger)
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
  }

  scrollTo(target: number | HTMLElement, offset = 0): void {
    this.lenis?.scrollTo(target, { offset });
  }

  stop(): void {
    this.lenis?.stop();
  }

  start(): void {
    this.lenis?.start();
  }
}
