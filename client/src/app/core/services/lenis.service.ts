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

    // Mobile & touch: auto smooth untuk native feel; desktop: Lenis
    this.lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
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
