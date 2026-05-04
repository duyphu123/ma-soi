import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Card, GameConfigService } from '../game-config.service';

@Component({
  selector: 'app-card-draw',
  templateUrl: './card-draw.component.html',
  styleUrls: ['./card-draw.component.scss']
})
export class CardDrawComponent implements OnInit, AfterViewInit {
  queue: Card[] = [];
  revealed: Card | null = null;
  showDoneModal = false;
  readonly backImg = 'assets/cards/back2.jpg';
  @ViewChild('hideButton') hideButton?: ElementRef;
  @ViewChild('actionAnchor') actionAnchor?: ElementRef;
  private scrollRetryToken = 0;

  constructor(private cfg: GameConfigService, private router: Router) {}

  ngOnInit(): void {
    const config = this.cfg.getConfig();
    if (!config) {
      this.router.navigateByUrl('/cau-hinh');
      return;
    }

    const full = this.cfg.buildDeck();
    this.queue = this.shuffleDeck(full);
    this.revealed = null;
    this.showDoneModal = false;
    this.preloadFrontImages();
    this.scheduleScrollToActionZone();
  }

  ngAfterViewInit(): void {
    this.scheduleScrollToActionZone();
  }

  get remaining(): number {
    return this.queue.length + (this.revealed ? 1 : 0);
  }

  onClickBack() {
    if (this.revealed) return;
    if (this.queue.length === 0) {
      this.openDoneModal();
      return;
    }

    const card = this.queue.shift()!;
    this.revealed = card;
    this.cfg.addHistory(card);
    this.scheduleScrollToActionZone();
  }

  hideCurrent() {
    if (!this.revealed) return;
    this.revealed = null;
    if (this.queue.length === 0) this.openDoneModal();
  }

  resetDeck() {
    const config = this.cfg.getConfig();
    if (!config) return;

    const full = this.cfg.buildDeck();
    this.queue = this.shuffleDeck(full);
    this.revealed = null;
    this.showDoneModal = false;
    this.preloadFrontImages();
  }

  getCounts(): Array<{ name: string; count: number }> {
    const map = new Map<string, number>();
    this.queue.forEach(c => map.set(c.name, (map.get(c.name) || 0) + 1));
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }

  private preloadFrontImages() {
    const set = new Set(this.queue.map(c => c.img));
    set.forEach(src => {
      const i = new Image();
      i.src = src;
    });
  }

  onImgError(e: Event) {
    (e.target as HTMLImageElement).src = 'assets/card2/dan.jpg';
  }

  onCardVisualReady() {
    this.scheduleScrollToActionZone();
  }

  private shuffleDeck(input: Card[]): Card[] {
    const shuffled = input.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  goBack() {
    this.router.navigateByUrl('/cau-hinh');
  }

  goToHistory() {
    this.router.navigate(['/cau-hinh'], { queryParams: { tab: 'history' } });
  }

  closeDoneModal() {
    this.showDoneModal = false;
  }

  private openDoneModal() {
    this.showDoneModal = true;
  }

  private scheduleScrollToActionZone() {
    const token = ++this.scrollRetryToken;
    const attempt = (remaining: number) => {
      if (token !== this.scrollRetryToken) return;

      const done = this.scrollToActionZone();
      if (done || remaining <= 0) return;

      setTimeout(() => attempt(remaining - 1), 120);
    };

    requestAnimationFrame(() => attempt(8));
  }

  private scrollToActionZone() {
    const anchor = this.hideButton || this.actionAnchor;
    if (!anchor) return false;

    const el = anchor.nativeElement as HTMLElement;
    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const alreadyVisible = rect.top >= 0 && rect.bottom <= viewportHeight - 8;
    if (alreadyVisible) return true;

    el.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
      inline: 'nearest'
    });
    window.scrollBy({ top: 10, behavior: 'smooth' });

    return false;
  }
}
