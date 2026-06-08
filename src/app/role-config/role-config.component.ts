import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import {
  CardTeam,
  ExtraCardDef,
  GameConfigService,
  GameMode,
  HistoryItem,
  RoleConfig,
  SpecialRoleDef,
  SpecialRoleKey,
} from '../game-config.service';

interface ConfirmCardItem {
  name: string;
  img: string;
  count?: number;
  team?: CardTeam;
  custom?: boolean;
}

const THUMB_FILE_MAP: { [key: string]: string } = {
  'baove.jpg': 'baove.PNG',
  'cao.jpg': 'cao.jpg',
  'cungcoi.jpg': 'cungcoi.jpg',
  'dan.jpg': 'dan.jpg',
  'gau.jpg': 'gau.jpg',
  'gialang.jpg': 'gialang.PNG',
  'hoangtu.jpg': 'hoangtu.PNG',
  'hunter.jpg': 'hunter.jpg',
  'lieu.jpg': 'lieu.PNG',
  'matngu.jpg': 'matngu.PNG',
  'nhanban.jpg': 'nhanban.PNG',
  'phanboi.jpg': 'phanboi.jpg',
  'phuthuy.jpg': 'phuthuy.PNG',
  'sinhdoi.jpg': 'sinhdoi.jpg',
  'soi_bansoi.jpg': 'soi_bansoi.PNG',
  'soi_con.jpg': 'soi_con.PNG',
  'soi_ngu.jpg': 'soi_ngu.PNG',
  'soi_nguoi.jpg': 'soi_nguoi.PNG',
  'soi_nguyen.jpg': 'soi_nguyen.PNG',
  'soi_thuong.jpg': 'soi_thuong.PNG',
  'soi_tri.jpg': 'soi_tri.PNG',
  'tamlinh.jpg': 'tamlinh.jpg',
  'thaucam.jpg': 'thaucam.PNG',
  'tientri.jpg': 'tientri.PNG',
  'tietlo.jpg': 'tietlo.jpg',
  'tusi.jpg': 'tusi.jpg',
};

@Component({
  selector: 'app-role-config',
  templateUrl: './role-config.component.html',
  styleUrls: ['./role-config.component.scss']
})
export class RoleConfigComponent implements AfterViewInit {
  form: FormGroup;
  activeMode: GameMode = 'ultimate';
  activeTab: 'config' | 'history' = 'config';
  historyFilter: 'all' | 'wolf' | 'villager' | 'special' = 'all';
  history: HistoryItem[] = [];
  showConfirmModal = false;
  showAddCardModal = false;
  addCardTeam: CardTeam = 'wolf';
  addCardName = '';
  addCardError = '';
  configPanelHeight = 0;
  configPanelTop = 0;
  private configPanelStartTop = 0;
  private panelRafId = 0;

  readonly modeTabs: Array<{ key: GameMode; label: string }> = [
    { key: 'ultimate', label: 'Ultimate' },
    { key: 'character', label: 'Character' },
  ];

  private sub?: Subscription;
  private defaults: RoleConfig = {
    soi: 0,
    dan: 0,
    phanBoi: false,
    soiNguyen: true,
    soiNguoi: true,
    baoVe: true,
    tietLo: true,
    phuThuy: true,
    tienTri: true,
    cungCoi: true,
    hoangTu: false,
    tuSi: false,
    tamLinh: false,
    thauCam: false,
    matNgu: false,
    soiCon: false,
    cao: false,
    gau: false,
    giaLang: false,
    lieu: false,
    nhanBan: false,
    sinhDoi: false,
    soiBanSoi: false,
    soiNgu: false,
    soiTri: false,
    hunter: false,
    cupid: false,
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private gameCfg: GameConfigService
  ) {
    this.form = this.fb.group({
      soi: [this.defaults.soi, [Validators.required, Validators.min(0), Validators.max(99)]],
      dan: [this.defaults.dan, [Validators.required, Validators.min(0), Validators.max(99)]],
      phanBoi: [this.defaults.phanBoi],
      soiNguyen: [this.defaults.soiNguyen],
      soiNguoi: [this.defaults.soiNguoi],
      baoVe: [this.defaults.baoVe],
      tietLo: [this.defaults.tietLo],
      phuThuy: [this.defaults.phuThuy],
      tienTri: [this.defaults.tienTri],
      cungCoi: [this.defaults.cungCoi],
      hoangTu: [this.defaults.hoangTu],
      tuSi: [this.defaults.tuSi],
      tamLinh: [this.defaults.tamLinh],
      thauCam: [this.defaults.thauCam],
      matNgu: [this.defaults.matNgu],
      soiCon: [this.defaults.soiCon],
      cao: [this.defaults.cao],
      gau: [this.defaults.gau],
      giaLang: [this.defaults.giaLang],
      lieu: [this.defaults.lieu],
      nhanBan: [this.defaults.nhanBan],
      sinhDoi: [this.defaults.sinhDoi],
      soiBanSoi: [this.defaults.soiBanSoi],
      soiNgu: [this.defaults.soiNgu],
      soiTri: [this.defaults.soiTri],
      hunter: [this.defaults.hunter],
      cupid: [this.defaults.cupid],
    });
  }

  @ViewChild('tabsAnchor') tabsAnchor?: ElementRef;
  @ViewChild('configPanel') configPanel?: ElementRef;

  get wolfRoles(): SpecialRoleDef[] {
    return this.gameCfg.getWolfRolesForMode(this.activeMode);
  }

  get villagerRoles(): SpecialRoleDef[] {
    return this.gameCfg.getVillagerRolesForMode(this.activeMode);
  }

  get extraWolfCards(): ExtraCardDef[] {
    return this.gameCfg.getExtraCards('wolf', this.activeMode);
  }

  get extraVillagerCards(): ExtraCardDef[] {
    return this.gameCfg.getExtraCards('villager', this.activeMode);
  }

  get filteredHistory(): HistoryItem[] {
    if (this.historyFilter === 'wolf') {
      return this.history.filter(item => this.isWolfRoleName(item.card.name));
    }

    if (this.historyFilter === 'villager') {
      return this.history.filter(item => item.card.name === 'Dân');
    }

    if (this.historyFilter === 'special') {
      return this.history.filter(item => !this.isWolfRoleName(item.card.name) && item.card.name !== 'Dân');
    }

    return this.history;
  }

  get total(): number {
    const v = this.form.value as RoleConfig;
    const visibleRoles = this.wolfRoles.concat(this.villagerRoles);
    const base = (v.soi || 0) + (v.dan || 0);
    const extra = visibleRoles.reduce((acc, role) => {
      return acc + (v[role.key] ? this.gameCfg.getRoleCopies(role.key, this.activeMode) : 0);
    }, 0);
    return base + extra + this.extraWolfCards.filter(card => card.enabled).length + this.extraVillagerCards.filter(card => card.enabled).length;
  }

  get wolfCount(): number {
    const v = this.form.value as RoleConfig;
    return (v.soi || 0) + this.wolfRoles.reduce((acc, role) => {
      return acc + (v[role.key] ? this.gameCfg.getRoleCopies(role.key, this.activeMode) : 0);
    }, 0) + this.extraWolfCards.filter(card => card.enabled).length;
  }

  get villagerCount(): number {
    const v = this.form.value as RoleConfig;
    return (v.dan || 0) + this.villagerRoles.reduce((acc, role) => {
      return acc + (v[role.key] ? this.gameCfg.getRoleCopies(role.key, this.activeMode) : 0);
    }, 0) + this.extraVillagerCards.filter(card => card.enabled).length;
  }

  get confirmWolfCards(): string[] {
    const v = this.form.value as RoleConfig;
    const cards: string[] = [];
    if (v.soi > 0) cards.push(`Sói thường x${v.soi}`);
    this.wolfRoles.forEach(role => {
      if (v[role.key]) cards.push(role.name);
    });
    return cards;
  }

  get confirmVillagerCards(): string[] {
    const v = this.form.value as RoleConfig;
    const cards: string[] = [];
    if (v.dan > 0) cards.push(`Dân thường x${v.dan}`);
    this.villagerRoles.forEach(role => {
      if (v[role.key]) cards.push(role.name);
    });
    return cards;
  }

  get confirmWolfItems(): ConfirmCardItem[] {
    const v = this.form.value as RoleConfig;
    const items: ConfirmCardItem[] = [];

    if (v.soi > 0) {
      items.push({ name: 'Sói thường', img: this.thumbPath('soi_thuong.jpg'), count: v.soi });
    }

    this.wolfRoles.forEach(role => {
      if (v[role.key]) {
        const copies = this.gameCfg.getRoleCopies(role.key, this.activeMode);
        for (let i = 0; i < copies; i++) {
          items.push({ name: role.name, img: this.thumbPath(role.fileName) });
        }
      }
    });

    this.extraWolfCards.filter(card => card.enabled).forEach(card => {
      items.push({ name: card.name, img: card.img, team: card.team, custom: card.custom });
    });

    return items;
  }

  get confirmWolfBaseItems(): ConfirmCardItem[] {
    return this.confirmWolfItems.filter(item => !!item.count);
  }

  get confirmWolfSpecialItems(): ConfirmCardItem[] {
    return this.confirmWolfItems.filter(item => !item.count);
  }

  get confirmVillagerItems(): ConfirmCardItem[] {
    const v = this.form.value as RoleConfig;
    const items: ConfirmCardItem[] = [];

    if (v.dan > 0) {
      items.push({ name: 'Dân thường', img: this.thumbPath('dan.jpg'), count: v.dan });
    }

    this.villagerRoles.forEach(role => {
      if (v[role.key]) {
        const copies = this.gameCfg.getRoleCopies(role.key, this.activeMode);
        for (let i = 0; i < copies; i++) {
          items.push({ name: role.name, img: this.thumbPath(role.fileName) });
        }
      }
    });

    this.extraVillagerCards.filter(card => card.enabled).forEach(card => {
      items.push({ name: card.name, img: card.img, team: card.team, custom: card.custom });
    });

    return items;
  }

  get confirmVillagerBaseItems(): ConfirmCardItem[] {
    return this.confirmVillagerItems.filter(item => !!item.count);
  }

  get confirmVillagerSpecialItems(): ConfirmCardItem[] {
    return this.confirmVillagerItems.filter(item => !item.count);
  }

  switchMode(mode: GameMode) {
    if (this.activeMode === mode) return;
    this.activeMode = mode;
    this.showConfirmModal = false;
    this.showAddCardModal = false;
    this.historyFilter = 'all';
    this.gameCfg.setMode(mode);
    this.loadModeState();
    if (this.activeTab === 'history') this.reloadHistory();
    setTimeout(() => {
      this.measureConfigPanel();
      this.syncPanelLoop();
    }, 0);
  }

  switchTab(tab: 'config' | 'history') {
    this.activeTab = tab;
    this.showConfirmModal = false;
    this.showAddCardModal = false;
    this.historyFilter = 'all';
    if (tab === 'history') {
      this.stopPanelLoop();
      this.reloadHistory();
      return;
    }
    setTimeout(() => {
      this.measureConfigPanel();
      this.syncPanelLoop();
    }, 0);
  }

  ngOnInit(): void {
    this.activeMode = this.gameCfg.getMode();
    this.gameCfg.setMode(this.activeMode);

    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (
      tab !== 'history' &&
      this.gameCfg.getDrawState(this.activeMode) &&
      !this.gameCfg.consumeConfigWhileDrawingAllowance()
    ) {
      this.router.navigateByUrl('/chon-bai');
      return;
    }

    this.loadModeState();

    if (tab === 'history') this.activeTab = 'history';

    this.sub = this.form.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe(val => this.gameCfg.setConfig(val as RoleConfig, this.activeMode));

    this.reloadHistory();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.measureConfigPanel();
      this.syncPanelLoop();
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
    this.stopPanelLoop();
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.measureConfigPanel();
  }

  @HostListener('document:scroll')
  onDocumentScroll() {
    this.measureConfigPanel();
  }

  @HostListener('window:touchmove')
  onWindowTouchMove() {
    this.measureConfigPanel();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.measureConfigPanel();
  }

  private loadModeState() {
    const saved = this.gameCfg.getConfig(this.activeMode);
    if (saved) {
      this.form.patchValue(saved, { emitEvent: false });
      return;
    }

    this.form.reset(this.defaults, { emitEvent: false });
    this.gameCfg.setConfig(this.form.value as RoleConfig, this.activeMode);
  }

  private reloadHistory() {
    this.history = this.gameCfg.getHistory(this.activeMode);
  }

  private measureConfigPanel() {
    if (this.activeTab !== 'config') return;
    if (!this.tabsAnchor || !this.configPanel) return;

    const tabsRect = this.tabsAnchor.nativeElement.getBoundingClientRect();
    const panelRect = this.configPanel.nativeElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const naturalTop = Math.round(tabsRect.bottom + 8);

    if (!this.configPanelStartTop || scrollTop === 0) {
      this.configPanelStartTop = naturalTop;
    }

    this.configPanelTop = Math.max(38, Math.round(this.configPanelStartTop - scrollTop));
    this.configPanelHeight = Math.ceil(panelRect.height);
  }

  private syncPanelLoop() {
    this.stopPanelLoop();
    if (this.activeTab !== 'config') return;

    const tick = () => {
      if (this.activeTab !== 'config') {
        this.panelRafId = 0;
        return;
      }

      this.measureConfigPanel();
      this.panelRafId = window.requestAnimationFrame(tick);
    };

    this.panelRafId = window.requestAnimationFrame(tick);
  }

  private stopPanelLoop() {
    if (!this.panelRafId) return;
    window.cancelAnimationFrame(this.panelRafId);
    this.panelRafId = 0;
  }

  private markAllTouched(control: AbstractControl): void {
    if (!control) return;

    if (control instanceof FormGroup) {
      Object.values(control.controls).forEach(c => this.markAllTouched(c));
    } else if (control instanceof FormArray) {
      control.controls.forEach(c => this.markAllTouched(c));
    }

    control.markAsTouched();
    control.updateValueAndValidity();
  }

  numbersOnly(e: KeyboardEvent) {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (allowed.indexOf(e.key) >= 0) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  }

  onCountInput(controlName: 'soi' | 'dan', event: Event) {
    const input = event.target as HTMLInputElement;
    const digitsOnly = (input.value || '').replace(/\D+/g, '');
    const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
    const nextValue = normalized === '' ? 0 : Math.min(99, Number(normalized));

    if (input.value !== String(nextValue)) {
      input.value = String(nextValue);
    }

    const control = this.form.get(controlName);
    if (control) control.setValue(nextValue, { emitEvent: false });
    this.gameCfg.setConfig(this.form.value as RoleConfig, this.activeMode);
  }

  reset() {
    this.showConfirmModal = false;
    this.showAddCardModal = false;
    this.form.reset(this.defaults);
    this.gameCfg.clearExtraCards(this.activeMode);
    this.gameCfg.clearHistory(this.activeMode);
    this.gameCfg.clearDrawState(this.activeMode);
    this.gameCfg.setConfig(this.form.value as RoleConfig, this.activeMode);
    this.reloadHistory();
  }

  confirm() {
    this.markAllTouched(this.form);
    if (this.form.invalid) {
      alert('Vui lòng nhập số hợp lệ cho Sói và Dân.');
      return;
    }

    this.gameCfg.setMode(this.activeMode);
    this.gameCfg.setConfig(this.form.value as RoleConfig, this.activeMode);
    this.showConfirmModal = true;
  }

  closeConfirmModal() {
    this.showConfirmModal = false;
  }

  openAddCardModal(team: CardTeam) {
    this.showConfirmModal = false;
    this.addCardTeam = team;
    this.addCardName = '';
    this.addCardError = '';
    this.showAddCardModal = true;
  }

  closeAddCardModal() {
    this.showAddCardModal = false;
    this.addCardName = '';
    this.addCardError = '';
  }

  onAddCardNameChange(value: string) {
    this.addCardName = value;
    this.addCardError = '';
  }

  submitAddCard() {
    if (this.gameCfg.hasExtraCardName(this.addCardName, this.activeMode)) {
      this.addCardError = 'Tên lá bài custom đã tồn tại';
      return;
    }

    const created = this.gameCfg.addExtraCard(this.addCardName, this.addCardTeam, this.activeMode);
    if (!created) return;
    this.closeAddCardModal();
  }

  toggleExtraCard(card: ExtraCardDef, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.gameCfg.setExtraCardEnabled(card.id, card.team, !card.enabled, this.activeMode);
  }

  submitConfirmedGame() {
    this.showConfirmModal = false;
    this.gameCfg.setMode(this.activeMode);
    this.gameCfg.setConfig(this.form.value as RoleConfig, this.activeMode);
    this.gameCfg.clearHistory(this.activeMode);
    this.gameCfg.clearDrawState(this.activeMode);
    this.router.navigateByUrl('/chon-bai');
  }

  getRoleClass(name: string): string {
    if (this.isWolfRoleName(name)) return 'wolf';
    if (name === 'Dân') return 'villager';
    if (name !== 'Sói' && name !== 'Dân') return 'special';
    return 'villager';
  }

  onPlayerNameChange(h: HistoryItem) {
    this.gameCfg.updateHistoryName(h.order, h.playerName || '', this.activeMode);
  }

  trackRole(_: number, role: { key: SpecialRoleKey }) {
    return role.key;
  }

  trackExtraCard(_: number, card: ExtraCardDef) {
    return card.id;
  }

  thumbPath(fileName: string): string {
    const key = (fileName || '').toLowerCase();
    const thumbFile = THUMB_FILE_MAP[key];
    if (thumbFile) {
      return `assets/card2-thumbs/${thumbFile}`;
    }

    return `assets/card2/${fileName}`;
  }

  onThumbError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/card2/dan.jpg';
  }

  clearHistory() {
    this.gameCfg.clearHistory(this.activeMode);
    this.reloadHistory();
  }

  setHistoryFilter(filter: 'all' | 'wolf' | 'villager' | 'special') {
    this.historyFilter = filter;
  }

  private isWolfRoleName(name: string): boolean {
    return this.gameCfg.isWolfCardName(name, this.activeMode);
  }
}
