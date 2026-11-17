import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Highcharts from 'highcharts';
import { GridsterConfig, GridsterModule } from 'angular-gridster2';
import { DashboardApiService } from '../../../../services/dashboard-api.service';
import { filter, forkJoin, of, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import 'highcharts/modules/heatmap';
import 'highcharts/modules/tilemap';
import { DashboardConfigComponent } from '../dashboard-config/dashboard-config.component';
import { DashboardRefreshService } from '../../../../services/dashboard-refresh.service';
import { User } from '../../../../models/user';
import { Session } from '../../../../models/session';
import { DecoderService } from '../../../../services/decoder.service';
import { LoggerService } from '../../../../services/logger.service';
import { AuthenticationService } from '../../../../services/authentication.service';
import { SanitizationService } from '../../../../services/sanitization.service';
import { CustomDashboardThemeService } from '../custom-dashboard-theme.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-dynamic-dashboard',
  imports: [CommonModule, GridsterModule, FormsModule, MatButtonModule, MatTooltipModule, DashboardConfigComponent],
  templateUrl: './dynamic-dashboard.component.html',
  styleUrl: './dynamic-dashboard.component.css'
})
export class DynamicDashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  Highcharts: typeof Highcharts = Highcharts;

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();
  destroy$ = new Subject<void>();

  user = new User();
  currentUser: User = new User();
  sessionObject: Session = new Session();

  datemodel: any;
  startTime: any;
  endTime: any;

  currentDashboardId: string = '';
  currentDashboardName: string = '';
  dashboard: any[] = [];

  private renderedCharts: Map<string, Highcharts.Chart> = new Map();

  changedLayouts: any[] = [];

  chartList: any;
  groups: any[] = [];

  Math = Math;

  isFullScreen: boolean = false;

  selectedWidgetId: number | null = null;

  // ---------------- SIDE PANEL ----------------

  isSidePanelOpen: boolean = false;
  sidePanelTab: 'chart' | 'text' | 'arrows' | 'url' = 'chart';

  toggleSidePanel() {
    this.isSidePanelOpen = !this.isSidePanelOpen;
    if (!this.isSidePanelOpen) {
      // closing — clear edit state
      this.editingWidget = null;
      this.newText = '';
    }
  }

  openSidePanel() {
    this.editingWidget = null;
    this.newText = '';
    this.sidePanelTab = 'chart';
    this.isSidePanelOpen = true;
  }

  closeSidePanel() {
    this.isSidePanelOpen = false;
    this.selectedWidgetId = null;
  }

  // ---------------- CONTEXT MENU ----------------

  contextMenu: { visible: boolean; x: number; y: number; item: any } = {
    visible: false,
    x: 0,
    y: 0,
    item: null
  };

  onWidgetDblClick(item: any, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    this.selectedWidgetId = item.id;

    this.contextMenu = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      item
    };
  }
  closeContextMenu() {
    this.contextMenu = { visible: false, x: 0, y: 0, item: null };
  }

  editingWidget: any = null;

  handleContextEdit(item: any) {
    console.log('Edit widget:', item);
    this.editingWidget = item;
    this.closeContextMenu();

    if (item.type === 'text') {
      this.sidePanelTab = 'text';
      this.newText = item.data || '';
    } else if (item.type === 'arrow') {
      this.sidePanelTab = 'arrows';
    } else if (item.type === 'url') {
      this.sidePanelTab = 'url';
      this.newUrl = item.entity || '';
      this.imageSrc = item.entity || null;
    } else {
      this.sidePanelTab = 'chart';
    }

    if (!this.isSidePanelOpen) {
      this.toggleSidePanel();
    }
  }

  handleContextDelete(item: any) {
    if (!item) return;
    this.closeContextMenu();

    this.dashboardApiService.deleteCharts([item.id])
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadDashboardDetails(this.currentDashboardId);
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.context-menu')) {
      this.closeContextMenu();
    }

    if (
      !target.closest('.widget') &&
      !target.closest('.kpi-card') &&
      !target.closest('.table-container') &&
      !target.closest('.chart-container')
    ) {
      this.selectedWidgetId = null;
    }
  }

  constructor(
    private authService: AuthenticationService,
    private cdr: ChangeDetectorRef,
    private dateService: DateService,
    private dashboardApiService: DashboardApiService,
    private router: Router,
    private dashboardRefreshService: DashboardRefreshService,
    private decoderService: DecoderService,
    private loggerService: LoggerService,
    private sanitizationService: SanitizationService,
    public themeService: CustomDashboardThemeService,
  ) {
    this.authService.currentUser.subscribe(
      x => this.currentUser = x || new User()
    );
  }

  options: GridsterConfig = {
    draggable: { enabled: true },
    resizable: { enabled: true },
    pushItems: true,
    displayGrid: 'onDrag&Resize',
    gridType: 'fit',
    minCols: 36,
    minRows: 36,
    margin: 8,
    outerMargin: true,

    itemChangeCallback: (item) => {
      this.onLayoutChange(item);
    },

    itemResizeCallback: (item) => {
      this.onLayoutChange(item);
      setTimeout(() => Highcharts.charts.forEach(c => c?.reflow()), 100);
    }
  };

  // ---------------- INIT ----------------

  ngOnInit() {
    this.user = this.decoderService.decryptJson(
      JSON.parse(sessionStorage.getItem('currentUser')!)
    ) as User;

    this.sessionObject.featureName = 'Custom Dashboard';
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.currentUser.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');

    const browser = this.loggerService.getBrowserNameAndVersion();
    this.sessionObject.browserName = browser.name;
    this.sessionObject.browserVersion = browser.version;

    this.currentUser.sessionDTO = this.sessionObject;

    this.dateService.setActiveComponent('DashboardConfigComponent');

    this.currentDashboardId = sessionStorage.getItem('dashboardId') || '';
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'DashboardConfigComponent'),
      switchMap(() => this.dateService.date$)
    ).subscribe(dates => {
      this.datemodel = dates;
      this.startTime = this.formatDate(this.datemodel.startdateTime);
      this.endTime = this.formatDate(this.datemodel.enddateTime);
      if (this.currentDashboardId) {
        this.loadDashboardDetails(this.currentDashboardId);
      }
    });

    this.dashboardRefreshService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() =>
        this.loadDashboardDetails(sessionStorage.getItem('dashboardId')!)
      );

    this.themeService.isDark$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      const containers = document.querySelectorAll('.chart-container');
      containers.forEach((el: any) => {
        el.style.transition = 'opacity 0.25s ease';
        el.style.opacity = '0';
      });

      setTimeout(() => {
        this.renderAllCharts();
        containers.forEach((el: any) => {
          el.style.opacity = '1';
        });
      }, 260);
    });
  }

  ngAfterViewInit() {
    setTimeout(() => this.renderAllCharts(), 400);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
  }

  // ---------------- DATE ----------------

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  parseTimeBucket(bucket: string): Date {
    return new Date(
      +bucket.slice(0, 4),
      +bucket.slice(4, 6) - 1,
      +bucket.slice(6, 8),
      +bucket.slice(8, 10),
      +bucket.slice(10, 12)
    );
  }

  goToDashboardPage(): void {
    this.router.navigate(['/custom-dashboard']);
  }

  // ---------------- DASHBOARD ----------------

  loadDashboardDetails(dashboardId: string) {
    this.dashboardApiService
      .customDashboardDetails(dashboardId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res.serviceStatus === 'Success') {

            const dashboardData = res.serviceResponse[0];
            this.currentDashboardName = dashboardData.name;
            const allWidgets: any[] = dashboardData.widgets || [];
            allWidgets.forEach(w => {
              if (w.type === 'table') {
                const grouped: any = {};
                const metrics = new Set<string>();
                const metricUnits: any = {};
                w.hasEntityData = w.data.some((x: any) => !!x.entity);
                w.data.forEach((x: any) => {
                  const rowKey = x.entity
                    ? `${x.applicationName} | ${x.entity}`
                    : x.applicationName;
                  if (!grouped[rowKey]) {
                    grouped[rowKey] = {};
                  }
                  grouped[rowKey][x.metric] = x;
                  metrics.add(x.metric);
                  if (!metricUnits[x.metric]) {
                    metricUnits[x.metric] = x.unit;
                  }
                });
                w.data = grouped;
                w.metrics = [...metrics];
                w.metricUnits = metricUnits;
              }
            });

            allWidgets.forEach(w => {
              const localLayout = this.changedLayouts.find(l => l.id === w.id);
              if (localLayout) {
                w.x = localLayout.x;
                w.y = localLayout.y;
                w.cols = localLayout.cols;
                w.rows = localLayout.rows;
              }
            });

            allWidgets.forEach(w => {
              if (w.type.startsWith('numeric')) {
                w.selectedMetric = 0;
              }
            });

            const customLayoutWidgets = allWidgets.filter(w => w.x !== null && w.y !== null && w.x !== undefined && w.y !== undefined);
            const autoLayoutWidgets = allWidgets.filter(w => w.x === null || w.y === null || w.x === undefined || w.y === undefined);

            const autoCharts = autoLayoutWidgets.filter(w => !w.type.startsWith('numeric') && w.type !== 'arrow' && w.type !== 'text' && w.type !== 'url');
            const autoKpis = autoLayoutWidgets.filter(w => w.type.startsWith('numeric'));
            const autoOthers = autoLayoutWidgets.filter(w => w.type === 'arrow' || w.type === 'text' || w.type === 'url');

            const chartCount = autoCharts.length;
            if (chartCount === 1) {
              autoCharts[0].cols = 36; autoCharts[0].rows = 14; autoCharts[0].x = 0; autoCharts[0].y = 0;
            } else if (chartCount === 2) {
              autoCharts[0].cols = 18; autoCharts[0].rows = 10; autoCharts[0].x = 0; autoCharts[0].y = 0;
              autoCharts[1].cols = 18; autoCharts[1].rows = 10; autoCharts[1].x = 18; autoCharts[1].y = 0;
            } else if (chartCount >= 3) {
              autoCharts.forEach((w, i) => {
                w.cols = 12; w.rows = 8; w.x = (i % 3) * 12; w.y = Math.floor(i / 3) * 8;
              });
            }

            let startY = 0;
            if (chartCount === 1) startY = 14;
            else if (chartCount === 2) startY = 10;
            else if (chartCount >= 3) startY = Math.ceil(chartCount / 3) * 8;

            autoKpis.forEach((w, k) => {
              w.cols = 6; w.rows = 4; w.x = (k % 6) * 6; w.y = startY + Math.floor(k / 6) * 4;
            });

            let nextY = startY;
            if (autoKpis.length > 0) nextY = startY + Math.ceil(autoKpis.length / 6) * 4;

            let currentX = 0; let currentY = nextY;
            autoOthers.forEach(w => {
              const defaultCols = w.type === 'text' ? 6 : 2;
              w.cols = defaultCols; w.rows = 2;
              if (currentX + w.cols > 36) { currentX = 0; currentY += 2; }
              w.x = currentX; w.y = currentY;
              currentX += w.cols;
            });

            this.dashboard = allWidgets;
            setTimeout(() => this.renderAllCharts(), 200);

          } else {
            this.dashboard = [];
          }
        },
        error: err => console.error(err)
      });
  }

  // ---------------- LAYOUT ----------------

  onLayoutChange(item: any) {
    const layout = { id: item.id, x: item.x, y: item.y, cols: item.cols, rows: item.rows };
    const index = this.changedLayouts.findIndex(l => l.id === item.id);
    if (index > -1) this.changedLayouts[index] = layout;
    else this.changedLayouts.push(layout);
  }

  saveAllObservable() {
    const tempWidgets = this.dashboard.filter(w => w.id < 0);
    const pinObservables = tempWidgets.map(w => {
      const layout = this.changedLayouts.find(l => l.id === w.id);
      const x = layout ? layout.x : (w.x ?? null);
      const y = layout ? layout.y : (w.y ?? null);
      const cols = layout ? layout.cols : w.cols;
      const rows = layout ? layout.rows : w.rows;
      const updatedOn = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ');

      const payload = {
        dashboardId: Number(this.currentDashboardId),
        metricNames: [],
        entity: '',
        appNames: [],
        chartType: w.type,
        chartName: w.data,
        x: x,
        y: y,
        gridCols: cols,
        gridRows: rows,
      };
      const safePayload = this.sanitizationService.sanitizePayload(payload);
      const safeUserName = this.sanitizationService.sanitizePayload(this.currentUser.userId);

      return this.dashboardApiService.pinCustomDashboard(safePayload, safeUserName, updatedOn);
    });

    const saveTemp$ = pinObservables.length > 0 ? forkJoin(pinObservables) : of([]);

    return saveTemp$.pipe(
      switchMap(() => {
        const existingChangedLayouts = this.changedLayouts.filter(l => l.id > 0);
        if (existingChangedLayouts.length > 0) {
          const updatedOn = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ');
          const safePayload = this.sanitizationService.sanitizePayload(existingChangedLayouts);
          const safeUserName = this.sanitizationService.sanitizePayload(this.currentUser.userId);
          return this.dashboardApiService.saveDashboardLayout(safePayload, safeUserName, updatedOn);
        } else {
          return of({ serviceStatus: 'Success' });
        }
      })
    );
  }

  saveLayout() {
    const hasTemp = this.dashboard.some(w => w.id < 0);
    if (!this.changedLayouts.length && !hasTemp) return;

    this.saveAllObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.changedLayouts = [];
          this.loadDashboardDetails(this.currentDashboardId);
        },
        error: err => console.error("Error saving layout or pinning widgets", err)
      });
  }

  // ---------------- THRESHOLD ----------------

  getSeriesThreshold(widget: any, seriesName: string) {
    const metric = seriesName.includes(' - ') ? seriesName.split(' - ')[1] : seriesName;
    return widget.thresholds?.find((t: any) => t.metric === metric || t.metricName === metric);
  }

  // ---------------- KPI ----------------

  selectKpiMetric(item: any, index: number, event: any) {
    event.stopPropagation();
    item.selectedMetric = index;
  }

  // ---------------- CHART ----------------

  renderAllCharts() {
    this.dashboard.forEach(w => {
      if (!w.type.startsWith('numeric') && w.type !== 'table' && w.type !== 'text' && w.type !== 'arrow' && w.type !== 'url') {
        this.renderChart(w);
      }
    });
  }

  // ── Constants ─────────────────────────────────────────────────────────────────
  HEX_GAP = 2;
  SQRT3 = Math.sqrt(3);

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private resolveChartType(widgetType: string): { chartType: string; stacking?: string } {
    if (widgetType === 'stackedColumn') return { chartType: 'column', stacking: 'normal' };
    if (widgetType === 'stackedArea') return { chartType: 'area', stacking: 'normal' };
    return { chartType: widgetType };
  }

  private getThresholdColor(value: number, threshold: any): string {
    if (!threshold) return '#4CAF50';
    const { warningValue, criticalValue, goodDirection } = threshold;
    const low = goodDirection === 'LOW';
    if (criticalValue != null && (low ? value >= criticalValue : value <= criticalValue)) return '#F44336';
    if (warningValue != null && (low ? value >= warningValue : value <= warningValue)) return '#FF9800';
    return '#4CAF50';
  }

  private applyThresholdColor(value: number, threshold: any): { y: number; color?: string } {
    if (!threshold?.warningValue || !threshold?.criticalValue || !threshold?.goodDirection) {
      return { y: value };
    }
    const color = this.getThresholdColor(value, threshold);
    return color !== '#4CAF50' ? { y: value, color } : { y: value };
  }

  private observeResize(container: HTMLElement, callback: () => void): void {
    (container as any)._hexResizeObserver?.disconnect();
    const ro = new ResizeObserver(callback);
    ro.observe(container);
    (container as any)._hexResizeObserver = ro;
  }

  private computeHexLayout(cw: number, ch: number, count: number): { R: number; cols: number } {
    let bestR = 0, bestCols = 1;
    for (let c = 1; c <= count; c++) {
      const r = Math.ceil(count / c);
      const rFromW = (cw - (c + 1) * this.HEX_GAP) / (c * 1.5 + 0.5);
      const rFromH = (ch - (r + 1) * this.HEX_GAP) / (r * this.SQRT3 + this.SQRT3 / 2);
      const R = Math.min(rFromW, rFromH);
      if (R > bestR) { bestR = R; bestCols = c; }
    }
    return { R: Math.max(bestR, 8), cols: bestCols };
  }

  private buildHexTile({ d, cx, cy, R, color, tooltipId, widgetId }: {
    d: any; cx: number; cy: number; R: number;
    color: string; tooltipId: string; widgetId: string;
  }): string {
    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i;
      return `${cx + (R - this.HEX_GAP / 2) * Math.cos(angle)},${cy + (R - this.HEX_GAP / 2) * Math.sin(angle)}`;
    }).join(' ');

    const fontSize = Math.max(7, Math.min(11, R * 0.28));
    const nameFontSize = Math.max(6, Math.min(9, R * 0.22));
    const maxChars = Math.floor(R * 0.55);
    const shortName = d.name.length > maxChars ? d.name.slice(0, maxChars - 1) + '…' : d.name;
    const displayVal = d.logical_cores ? `${d.value}%` : `${d.value}`;
    const tooltipText = d.logical_cores
      ? `${d.name}: ${d.value}% / ${d.logical_cores * 100}%`
      : `${d.name}: ${d.value}`;

    const labels = R > 16
      ? `<text x="${cx}" y="${cy - fontSize * 0.3}" text-anchor="middle" dominant-baseline="middle"
          fill="#fff" font-weight="700" font-size="${fontSize}px" font-family="Inter,sans-serif"
          pointer-events="none" style="text-shadow:0 1px 2px rgba(0,0,0,0.4)">${displayVal}</text>`
      : `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
          fill="#fff" font-weight="700" font-size="${fontSize}px" font-family="Inter,sans-serif"
          pointer-events="none">${d.value}</text>`;

    return `
    <g class="hex-tile" style="cursor:pointer" filter="url(#hex-shadow-${widgetId})">
      <polygon points="${points}" fill="${color}" stroke="#fff" stroke-width="2"
        style="transition:opacity 0.15s"
        onmouseenter="this.style.opacity='0.82';
          var t=document.getElementById('${tooltipId}');
          if(t){t.textContent='${tooltipText.replace(/'/g, "\\'")}';t.style.display='block';}"
        onmouseleave="this.style.opacity='1';
          var t=document.getElementById('${tooltipId}');
          if(t){t.style.display='none';}"
      />
      ${labels}
    </g>`;
  }

  private renderHoneycomb(container: HTMLElement, widget: any): void {
    const data = widget.data
      .filter((x: any) => x.value != null)
      .map((x: any) => ({
        value: +x.value,
        logical_cores: x.logical_cores ? +x.logical_cores : null,
        name: x.appName ?? '',
      }));

    if (!data.length) return;

    const threshold = widget.thresholds?.[0] ?? null;
    const tooltipId = `hex-tooltip-${widget.id}`;

    const render = () => {
      const cw = container.clientWidth || 400;
      const ch = container.clientHeight || 300;

      const { R, cols } = this.computeHexLayout(cw, ch, data.length);
      const rows = Math.ceil(data.length / cols);
      const gridW = (cols * 1.5 + 0.5) * R + (cols + 1) * this.HEX_GAP;
      const gridH = (rows * this.SQRT3 + this.SQRT3 / 2) * R + (rows + 1) * this.HEX_GAP;
      const offsetX = (cw - gridW) / 2 + R;
      const offsetY = (ch - gridH) / 2 + R;

      const tiles = data.map((d: any, i: number) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = offsetX + col * (1.5 * R + this.HEX_GAP);
        const cy = offsetY + row * (this.SQRT3 * R + this.HEX_GAP) + (col % 2 === 1 ? (this.SQRT3 * R + this.HEX_GAP) / 2 : 0);
        const color = this.getThresholdColor(d.value, threshold);
        return this.buildHexTile({ d, cx, cy, R, color, tooltipId, widgetId: widget.id });
      }).join('');

      container.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" style="display:block;overflow:visible">
        <defs>
          <filter id="hex-shadow-${widget.id}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="rgba(0,0,0,0.25)"/>
          </filter>
        </defs>
        ${tiles}
      </svg>
      <div id="${tooltipId}" style="display:none;position:absolute;bottom:8px;left:50%;
        transform:translateX(-50%);background:rgba(17,24,39,0.92);color:#fff;font-size:11px;
        font-family:Inter,sans-serif;padding:5px 10px;border-radius:6px;pointer-events:none;
        white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:10;"></div>
    `;
    };

    render();
    this.observeResize(container, render);
  }

  // ── Entry point ───────────────────────────────────────────────────────────────
  renderChart(widget: any): void {
    const containerId = `chart-${widget.id}`;
    const container = document.getElementById(containerId);
    if (!container) return;

    if (widget.type === 'hexagonal') {
      this.renderHoneycomb(container, widget);
      return;
    }

    let categories: string[];
    let series: any[];

    const isEndpointData = Array.isArray(widget.data)
      && widget.data[0]?.hasOwnProperty('total_hits')
      && !widget.series;

    const isStatusCodeData =
      Array.isArray(widget.data) &&
      widget.data.length > 0 &&
      widget.data[0]?.hasOwnProperty('entity') &&
      !widget.data[0]?.hasOwnProperty('total_hits');

    if (isEndpointData) {
      categories = widget.data.map(
        (e: any) => e.entity || e.applicationName || ''
      );

      const metricKeys = Object.keys(widget.data?.[0] || {}).filter(
        key =>
          !['entity', 'applicationName', 'unit', 'metric'].includes(key) &&
          widget.data.some((row: any) => typeof row[key] === 'number')
      );
      series = metricKeys.map(metricKey => ({
        name: metricKey,
        data: widget.data.map((e: any) => e[metricKey] ?? 0)
      }));
    } else if (isStatusCodeData) {

      categories = widget.data.map(
        (item: any) => item.entity || item.applicationName || ''
      );

      const statusCodeSet = new Set<string>();
      widget.data.forEach((item: any) => {
        Object.keys(item).forEach((k: string) => {
          if (k !== 'applicationName' && k !== 'entity') statusCodeSet.add(k);
        });
      });

      series = [...statusCodeSet].map(code => ({
        name: code,
        data: widget.data.map((item: any) => Number(item[code]) || 0)
      }));

    } else {

      const parsedDates = widget.categories?.map(
        (c: string) => this.parseTimeBucket(c)
      ) || [];

      const isTime =
        parsedDates.length > 1 &&
        Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime()) < 86400000;

      categories = parsedDates.map((d: Date) =>
        isTime
          ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          : `${d.getDate()}/${d.getMonth() + 1}`
      );

      series = widget.series;
    }

    const { chartType, stacking } = this.resolveChartType(widget.type);

    const legendEnabled = widget.legendEnable === true || widget.legendEnable === 'true' || String(widget.legendEnable) === 'true';
    const xLabel = widget.xAxisDataLabel || null;
    const yLabel = widget.yAxisDataLabel || null;
    const forceLegend = series.length > 1;

    const chart = Highcharts.chart(containerId, {
      chart: { type: chartType, spacing: [5, 5, 5, 5], backgroundColor: this.chartBg },
      title: { text: null },
      credits: { enabled: false },
      plotOptions: {
        series: {
          connectNulls: false,
          dataLabels: { style: { fontSize: '9px' }, enabled: !!stacking },
          ...(stacking ? { stacking } : {})
        },
        area: { fillOpacity: 0.3 },
      },
      xAxis: {
        categories,
        tickPositions: (() => {
          const len = categories.length;
          if (len <= 1) return [0];

          // Category-based charts (endpoint/statusCode) — show ALL labels
          if (isEndpointData || isStatusCodeData) {
            return Array.from({ length: len }, (_, i) => i);
          }

          // Time-series — smart tick distribution
          const first = 0;
          const last = len - 1;
          const targetTicks = len <= 10 ? len - 1
            : len <= 30 ? 5
              : len <= 60 ? 6
                : len <= 120 ? 7
                  : len <= 288 ? 8
                    : 10;

          const positions = new Set<number>([first, last]);
          if (targetTicks >= len) {
            for (let i = 0; i < len; i++) positions.add(i);
          } else {
            const step = (last - first) / (targetTicks - 1);
            for (let i = 1; i < targetTicks - 1; i++) {
              positions.add(Math.round(first + step * i));
            }
          }
          return [...positions].sort((a, b) => a - b);
        })(),
        title: xLabel
          ? { text: xLabel, style: { fontSize: '10px', color: this.chartTextColor } }
          : { text: null },
        labels: {
          style: { fontSize: '9px', color: this.chartTextColor },
          rotation: categories.length > 20 ? -45 : 0,
          overflow: 'justify',
        },
        lineColor: this.chartGridColor,
        tickColor: this.chartGridColor,
      },
      yAxis: {
        min: 0,
        tickAmount: 6,
        title: yLabel
          ? { text: yLabel, style: { fontSize: '10px', color: this.chartTextColor } }
          : { text: null },
        labels: { enabled: true, style: { fontSize: '9px', color: this.chartTextColor } },
        gridLineColor: this.chartGridColor,
      },
      tooltip: { shared: true },
      // renderChart() mein legend block replace karo:
      legend: (() => {
        const isLegendOn = widget.legendEnable === true || String(widget.legendEnable) === 'true';
        if (!isLegendOn) return { enabled: false };
        const pos = widget.legendAlign || 'bottom';
        return {
          enabled: true,
          align: pos === 'left' ? 'left' : pos === 'right' ? 'right' : 'center',
          verticalAlign: pos === 'left' || pos === 'right' ? 'middle' : 'bottom',
          layout: pos === 'left' || pos === 'right' ? 'vertical' : 'horizontal',
          itemStyle: { color: this.chartTextColor, fontWeight: '400', fontSize: '10px' },
        };
      })(),

      series: series.map((s: any) => {
        const threshold = this.getSeriesThreshold(widget, s.name);
        return {
          ...s,
          type: chartType,
          marker: { enabled: true, radius: 2 },
          data: s.data.map((v: any) => this.applyThresholdColor(v, threshold)),
        };
      }),
    } as any);

    this.renderedCharts.set(containerId, chart);
    this.syncCharts(Array.from(this.renderedCharts.values()));
  }


  private get chartBg(): string {
    return this.themeService.isDark ? '#1a1d27' : '#ffffff';
  }

  private get chartTextColor(): string {
    return this.themeService.isDark ? '#9ca3af' : '#6b7280';
  }

  private get chartGridColor(): string {
    return this.themeService.isDark ? '#2e3244' : '#e5e7eb';
  }

  showTextModal: boolean = false;
  newText: string = '';

  openTextModal() { this.showTextModal = true; }
  closeTextModal() { this.showTextModal = false; this.newText = ''; }

  createTextCard() {
    if (!this.newText.trim()) return;

    const payload = {
      dashboardId: Number(this.currentDashboardId),
      metricNames: [],
      entity: '',
      appNames: [],
      chartType: 'text',
      chartName: this.newText.trim(),
      x: null,
      y: null,
      gridCols: 4,
      gridRows: 1,
    };
    const safePayload = this.sanitizationService.sanitizePayload(payload);
    const safeUserName = this.sanitizationService.sanitizePayload(this.currentUser.userId);
    const updatedOn = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ');

    this.dashboardApiService.pinCustomDashboard(safePayload, safeUserName, updatedOn)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        if (res.serviceStatus === 'Success') {
          this.loadDashboardDetails(this.currentDashboardId);
        } else {
          console.error("Error Occured in Text creation.")
        }
      });

    this.closeTextModal();
  }

  updateTextCard() {
    if (!this.newText.trim()) return;
    const payload = {
      id: this.editingWidget.id,
      dashboardId: Number(this.currentDashboardId),
      metricNames: [],
      appNames: [],
      metricName: '',
      appName: '',
      chartType: 'text',
      chartName: this.newText.trim()
    };
    const safePayload = this.sanitizationService.sanitizePayload(payload);
    const safeUserName = this.sanitizationService.sanitizePayload(this.currentUser.userId);
    const updatedOn = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ');

    this.dashboardApiService.updateCustomDashboardDetails(safePayload, safeUserName, updatedOn)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        if (res.serviceStatus === 'Success') {
          this.loadDashboardDetails(this.currentDashboardId);
        } else {
          console.error("Error Occured in Text creation.")
        }
      });

    this.closeTextModal();
  }

  addArrow(icon: string) {
    const payload = {
      dashboardId: Number(this.currentDashboardId),
      metricNames: [],
      entity: '',
      appNames: [],
      chartType: 'arrow',
      chartName: icon,
      x: null,
      y: null,
      gridCols: 1,
      gridRows: 1,
    };
    const safePayload = this.sanitizationService.sanitizePayload(payload);
    const safeUserName = this.sanitizationService.sanitizePayload(this.currentUser.userId);
    const updatedOn = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ');
    this.dashboardApiService.pinCustomDashboard(safePayload, safeUserName, updatedOn).pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        if (res.serviceStatus === 'Success') {
          this.loadDashboardDetails(this.currentDashboardId);
        } else {
          console.error("Error Occured in Arrow creation.")
        }
      });
  }

  updateArrow(icon: string) {
    const payload = {
      id: this.editingWidget.id,
      dashboardId: Number(this.currentDashboardId),
      metricNames: [],
      appNames: [],
      metricName: '',
      appName: '',
      chartType: 'arrow',
      chartName: icon
    };

    const safePayload = this.sanitizationService.sanitizePayload(payload);
    const safeUserName = this.sanitizationService.sanitizePayload(this.currentUser.userId);
    const updatedOn = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ');

    this.dashboardApiService.updateCustomDashboardDetails(safePayload, safeUserName, updatedOn).pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        if (res.serviceStatus === 'Success') {
          this.loadDashboardDetails(this.currentDashboardId);
        } else {
          console.error("Error Occured in Arrow creation.")
        }
      });
  }

  newUrl: string = '';
  imageSrc: string | null = null;

  clearImagePreview() {
    this.newUrl = '';
    this.imageSrc = null;
  }

  getImageFromUrl(): void {
    if (this.newUrl.startsWith('data:image')) {
      this.imageSrc = this.newUrl;  // base64 — use directly
      return;
    }
    // external URL — still call backend
    this.dashboardApiService.getImageFromUrl(this.newUrl).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.imageSrc = URL.createObjectURL(data);
        },
        error: (err) => console.error("Failed to load image:", err)
      });
  }

  addImage() {
    const payload = {
      dashboardId: Number(this.currentDashboardId),
      metricNames: [],
      entity: this.newUrl,
      appNames: [],
      chartType: 'url',
      chartName: '',
      x: null,
      y: null,
      gridCols: 1,
      gridRows: 1,
    };
    const safePayload = this.sanitizationService.sanitizePayload(payload);
    const safeUserName = this.sanitizationService.sanitizePayload(this.currentUser.userId);
    const updatedOn = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ');
    this.dashboardApiService.pinCustomDashboard(safePayload, safeUserName, updatedOn).pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        if (res.serviceStatus === 'Success') {
          this.loadDashboardDetails(this.currentDashboardId);
        } else {
          console.error("Error Occured in Arrow creation.")
        }
      });
  }

  updateImage() {
    if (!this.newUrl.trim()) return;
    const payload = {
      id: this.editingWidget.id,
      dashboardId: Number(this.currentDashboardId),
      metricNames: [],
      appNames: [],
      metricName: '',
      appName: '',
      entity: this.newUrl,
      chartType: 'url',
      chartName: ''
    };
    const safePayload = this.sanitizationService.sanitizePayload(payload);
    const safeUserName = this.sanitizationService.sanitizePayload(this.currentUser.userId);
    const updatedOn = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' ');

    this.dashboardApiService.updateCustomDashboardDetails(safePayload, safeUserName, updatedOn)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        if (res.serviceStatus === 'Success') {
          this.loadDashboardDetails(this.currentDashboardId);
        } else {
          console.error("Error Occured in Image creation.")
        }
      });
  }

  toggleFullScreen() {
    const elem = document.querySelector('.dashboard-shell');
    if (!elem) return;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().then(() => {
        this.isFullScreen = true;
        this.cdr.detectChanges();
        setTimeout(() => Highcharts.charts.forEach(c => c?.reflow()), 200);
      }).catch(err => console.error(`Error attempting to enable fullscreen: ${err.message}`));
    } else {
      document.exitFullscreen().then(() => {
        this.isFullScreen = false;
        this.cdr.detectChanges();
        setTimeout(() => Highcharts.charts.forEach(c => c?.reflow()), 200);
      });
    }
  }

  syncCharts(charts: (Highcharts.Chart | undefined)[]) {
    let lastXValue: number | null = null;

    // Throttle function (using requestAnimationFrame for smoother updates)
    const throttleRAF = (func: Function) => {
      let ticking = false;
      return (...args: any[]) => {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(() => {
            func(...args);
            ticking = false;
          });
        }
      };
    };

    const updateChartsForX = (xValue: number, event: Highcharts.PointerEventObject) => {
      charts.forEach((chart) => {
        if (!chart) return;

        const tooltipPoints: Highcharts.Point[] = [];

        chart.series?.forEach((s) => {
          const point = s.searchPoint(event, true);
          if (point) {
            const pTyped = point as Highcharts.Point & { state?: string };
            if (pTyped.state !== 'hover') pTyped.setState('hover');
            tooltipPoints.push(pTyped);
          }
        });

        if (tooltipPoints.length) {
          chart.tooltip?.refresh(tooltipPoints);

          chart.xAxis?.forEach((axis) => {
            const axisPoint = tooltipPoints.find((p) => p.series?.xAxis === axis);
            if (axisPoint) axis.drawCrosshair(event, axisPoint);
          });
        }
      });
    };

    const handleMouseMove = (e: MouseEvent, chart: Highcharts.Chart) => {
      if (!chart?.pointer) return;

      const event = chart.pointer.normalize(e);
      const points = chart.series
        ?.map((s) => s.searchPoint(event, true))
        ?.filter((p): p is Highcharts.Point => !!p) ?? [];

      if (!points.length) return;

      const xValue = points[0].x;
      if (xValue === lastXValue) return;
      lastXValue = xValue;

      updateChartsForX(xValue, event);
    };

    const throttledHandleMouseMove = throttleRAF(handleMouseMove);

    charts.forEach((chart) => {
      if (!chart?.container) return;

      // Hover
      chart.container.addEventListener(
        'mousemove',
        (e) => throttledHandleMouseMove(e as MouseEvent, chart),
        { passive: true }
      );

      // Click → show all tooltips for clicked x
      chart.container.addEventListener('click', (e) => {
        if (!chart?.pointer) return;
        const event = chart.pointer.normalize(e as MouseEvent);
        const points = chart.series
          ?.map((s) => s.searchPoint(event, true))
          ?.filter((p): p is Highcharts.Point => !!p) ?? [];
        if (!points.length) return;

        const xValue = points[0].x;
        updateChartsForX(xValue, event);
      });

      // Mouse leave
      chart.container.addEventListener(
        'mouseleave',
        () => {
          lastXValue = null;
          window.requestAnimationFrame(() => {
            charts.forEach((c) => {
              if (!c) return;

              // Hide tooltip and crosshair
              c.tooltip?.hide();
              c.xAxis?.forEach((axis) => axis.hideCrosshair());

              // Batch clear hover state
              c.series?.forEach((s) => {
                s.points?.forEach((p) => {
                  const pTyped = p as Highcharts.Point & { state?: string };
                  if (pTyped.state) {
                    // Using requestAnimationFrame to prevent forced reflow
                    window.requestAnimationFrame(() => pTyped.setState());
                  }
                });
              });
            });
          });
        },
        { passive: true }
      );
    });
  }

  @HostListener('document:fullscreenchange')
  @HostListener('document:webkitfullscreenchange')
  @HostListener('document:mozfullscreenchange')
  @HostListener('document:MSFullscreenChange')
  onFullscreenChange() {
    this.isFullScreen = !!document.fullscreenElement;
    // Reset to light when exiting fullscreen
    if (!this.isFullScreen && this.themeService.isDark) {
      this.themeService.setDark(false);
    }
    this.cdr.detectChanges();
    setTimeout(() => Highcharts.charts.forEach(c => c?.reflow()), 200);
  }
  isExporting: boolean = false;

async downloadDashboardPdf() {
  this.closeContextMenu();
  this.closeSidePanel();
  if (!this.dashboard.length) return;

  this.isExporting = true;
  this.cdr.detectChanges();

  Highcharts.charts.forEach(c => c?.reflow());
  await new Promise(res => setTimeout(res, 300));

  try {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageMargin = 6;
    const widgetGap = 2.5;

    pdf.setFillColor(240, 242, 247);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    const totalCols = 36;
    const usablePdfWidth = pageWidth - pageMargin * 2;
    const colWidthMm = usablePdfWidth / totalCols;
    const rowHeightMm = 6.2;

    const contentTopMm = pageMargin + 2;
    const usableHeightMm = pageHeight - contentTopMm - pageMargin;
    const rowsPerPage = usableHeightMm / rowHeightMm;

    const sortedWidgets = [...this.dashboard].sort((a, b) => (a.y || 0) - (b.y || 0));

    // Greedy bin-packing by Y position: keep advancing pageStartY to the next
    // unplaced widget's Y, and on each page take EVERY remaining widget that
    // fully fits within [pageStartY, pageStartY + rowsPerPage].
    const placed = new Set<number>();
    const pages: any[][] = [];

    while (placed.size < sortedWidgets.length) {
      const remaining = sortedWidgets.filter(w => !placed.has(w.id));
      const pageStartY = Math.min(...remaining.map(w => w.y || 0));
      const maxY = pageStartY + rowsPerPage;

      let fitting = remaining.filter(w => {
        const top = w.y || 0;
        const bottom = top + (w.rows || 1);
        return top >= pageStartY - 0.01 && bottom <= maxY + 0.01;
      });

      if (fitting.length === 0) {
        // Single oversized widget — force it alone so we don't infinite-loop
        fitting = remaining.filter(w => (w.y || 0) === pageStartY);
      }

      fitting.forEach(w => placed.add(w.id));
      pages.push(fitting);
    }

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      if (pageIndex > 0) {
        pdf.addPage();
        pdf.setFillColor(240, 242, 247);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      }
      const pageWidgets = pages[pageIndex];
      if (!pageWidgets.length) continue;

      const pageBaseY = Math.min(...pageWidgets.map(w => w.y || 0));

      for (const widget of pageWidgets) {
        const x = (widget.x || 0) * colWidthMm + pageMargin + widgetGap / 2;
        const y = ((widget.y || 0) - pageBaseY) * rowHeightMm + contentTopMm + widgetGap / 2;
        const w = (widget.cols || 1) * colWidthMm - widgetGap;
        const h = (widget.rows || 1) * rowHeightMm - widgetGap;

        await this.renderWidgetToPdf(pdf, widget, x, y, w, h);
      }
    }

    const safeName = (this.currentDashboardName || 'dashboard').replace(/[^a-z0-9]/gi, '_');
    const timestamp = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
    pdf.save(`${safeName}_${timestamp}.pdf`);

  } catch (err) {
    console.error('PDF export failed:', err);
  } finally {
    this.isExporting = false;
    this.cdr.detectChanges();
  }
}

  private async renderWidgetToPdf(pdf: jsPDF, widget: any, x: number, y: number, w: number, h: number) {
    // ALL text-type widgets render as a colorful blue banner, no separate title printed
    if (widget.type === 'text') {
      pdf.setFillColor(37, 65, 178); // blue banner like image 4
      pdf.rect(x, y, w, h, 'F');

      pdf.setFontSize(widget.cols >= 24 ? 11 : 8.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(String(widget.data || '').toUpperCase(), x + w / 2, y + h / 2 + 1.2, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      return; // stop here — no title bar, no duplicate text
    }

    // Card background for all other widget types
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, y, w, h, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.15);
    pdf.rect(x, y, w, h);

    let contentTop = y + 1.5;
    const contentX = x + 1.5;
    const contentW = w - 3;

    if (widget.title) {
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(55, 65, 81);
      pdf.text(widget.title, contentX, contentTop + 1.5);
      contentTop += 4;
    }

    const innerHeight = h - (contentTop - y) - 1.5;

    switch (widget.type) {
      case 'table':
        await this.renderTableScreenshotToPdf(pdf, widget, contentX, contentTop, contentW, innerHeight);
        break;

      case 'hexagonal':
        await this.renderSvgWidgetToPdf(pdf, widget, contentX, contentTop, contentW, innerHeight);
        break;

      case 'arrow':
      case 'url':
        pdf.setFontSize(6.5);
        pdf.setTextColor(180, 185, 195);
        pdf.text(`[${widget.type}]`, x + w / 2, y + h / 2, { align: 'center' });
        break;

      default:
        await this.renderHighchartToPdf(pdf, widget, contentX, contentTop, contentW, innerHeight);
        break;
    }
  }

  private async renderTableScreenshotToPdf(pdf: jsPDF, widget: any, x: number, y: number, w: number, h: number) {
    const widgetEl = document.getElementById(`widget-${widget.id}`);
    const tableContainer = widgetEl?.querySelector('.table-container') as HTMLElement;

    if (!tableContainer) {
      console.warn(`Table container not found for widget ${widget.id}`);
      return;
    }

    try {
      // Capture EXACTLY what's visible on screen right now — no expanding, no full-row capture.
      // This naturally clips to the widget's current scroll viewport, same as what the user sees.
      const canvas = await html2canvas(tableContainer, {
        backgroundColor: this.themeService.isDark ? '#1a1d27' : '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        width: tableContainer.clientWidth,
        height: tableContainer.clientHeight,
        x: tableContainer.scrollLeft,
        y: tableContainer.scrollTop,
        scrollX: 0,
        scrollY: 0,
      });

      if (canvas.width === 0 || canvas.height === 0) {
        console.warn(`Captured zero-size canvas for table widget ${widget.id}`);
        return;
      }

      const imgData = canvas.toDataURL('image/png');
      const aspectRatio = canvas.height / canvas.width;

      let drawW = w;
      let drawH = w * aspectRatio;
      if (drawH > h) {
        drawH = h;
        drawW = h / aspectRatio;
      }

      pdf.addImage(imgData, 'PNG', x, y, drawW, drawH);
    } catch (err) {
      console.error('Table screenshot failed for widget', widget.id, err);
    }
  }

  private async renderHighchartToPdf(pdf: jsPDF, widget: any, x: number, y: number, w: number, h: number) {
    const chart = this.renderedCharts.get(`chart-${widget.id}`);
    if (!chart) return;

    try {
      const svgEl = chart.container.querySelector('svg');
      if (!svgEl) return;

      const svgString = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = await this.loadImage(url);
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = this.themeService.isDark ? '#1a1d27' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/png');
      pdf.addImage(dataUrl, 'PNG', x, y, w, h);
    } catch (err) {
      console.error('Chart render to PDF failed for widget', widget.id, err);
    }
  }

  private async renderSvgWidgetToPdf(pdf: jsPDF, widget: any, x: number, y: number, w: number, h: number) {
    const container = document.getElementById(`chart-${widget.id}`);
    const svgEl = container?.querySelector('svg');
    if (!svgEl) return;

    try {
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = await this.loadImage(url);
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = this.themeService.isDark ? '#1a1d27' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/png');
      pdf.addImage(dataUrl, 'PNG', x, y, w, h);
    } catch (err) {
      console.error('Hex widget render to PDF failed for widget', widget.id, err);
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  private getWidgetElement(widget: any): HTMLElement | null {
    return document.getElementById(`widget-${widget.id}`);
  }
  private resizingColumn: { th: HTMLElement; startX: number; startWidth: number } | null = null;

  onColumnResizeStart(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    const th = target.closest('th') as HTMLElement;
    if (!th) return;

    this.resizingColumn = {
      th,
      startX: event.clientX,
      startWidth: th.offsetWidth,
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.resizingColumn) return;
      const delta = e.clientX - this.resizingColumn.startX;
      const newWidth = Math.max(50, this.resizingColumn.startWidth + delta);
      this.resizingColumn.th.style.width = `${newWidth}px`;
      this.resizingColumn.th.style.minWidth = `${newWidth}px`;
    };

    const onMouseUp = () => {
      this.resizingColumn = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
}