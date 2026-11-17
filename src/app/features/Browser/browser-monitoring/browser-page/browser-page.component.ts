import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { takeUntil, filter, switchMap } from 'rxjs/operators';
import * as Highcharts from 'highcharts';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HighchartsChartModule } from 'highcharts-angular';
import { Span } from '../../../../models/traceData';
import { BrowserApiService } from '../../../../services/browser-api.service';
import { DateService } from '../../../../services/date.service';
import { ServiceIdService } from '../../../../services/service-id.service';
import { SharedService } from '../../../../services/shared.service';
import { ListViewComponent } from '../../../Dashboard/service-page/general-services/list-view/list-view.component';
import { StatViewComponent } from '../../../Dashboard/service-page/general-services/stat-view/stat-view.component';
import { TableViewComponent } from '../../../Dashboard/service-page/general-services/table-view/table-view.component';
import { TraceDetailsModalComponent } from '../../../Dashboard/service-page/general-services/trace-details-modal/trace-details-modal.component';
import { TreeViewComponent } from '../../../Dashboard/service-page/general-services/tree-view/tree-view.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as bootstrap from 'bootstrap';

@Component({
  selector: 'app-browser-page',
  imports: [FormsModule, CommonModule, RouterModule, ListViewComponent,
    TreeViewComponent,
    TableViewComponent,
    StatViewComponent,
    TraceDetailsModalComponent,
    MatTooltipModule,
    HighchartsChartModule],
  templateUrl: './browser-page.component.html',
  styleUrls: ['./browser-page.component.css']
})
export class BrowserPageComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  private datesubscription: Subscription = new Subscription();

  serviceId!: string;
  pageId!: string;
  entityId!: string;
  serviceName = '';
  startTime!: number;
  endTime!: number;
  datemodel: any;

  pageErrorCountChart!: Highcharts.Chart;
  pageLifecyclePerfChart!: Highcharts.Chart;
  pageRenderingChart!: Highcharts.Chart;
  networkLatencyPerfChart!: Highcharts.Chart;
  navigationPerfChart!: Highcharts.Chart;
  pageFptLatenctChart!: Highcharts.Chart;
  pageTTLLatencyChart!: Highcharts.Chart;
  pageDomLatencyChart!: Highcharts.Chart;
  pageLoadLatencyChart!: Highcharts.Chart;
  appLoadChart!: Highcharts.Chart;
  appErrorRateChart!: Highcharts.Chart;

  rowsPerPage = 20;
  currentPage = 1;
  totalPages: number = 0;
  totalTraces: any;

  instName: string = 'All';
  selectedLatency: string | null = null;
  selectedItem: string | null = null;
  selectedTraceId: string | null = null;
  selectedView: 'list' | 'tree' | 'table' | 'stat' = 'table';
  instances: { name: string, value: string }[] = [{ name: 'All', value: 'All' }];
  tableData: { endpointId: string, startTime: number, timeBucket: string, isError: number, traceId: string, instance: string, latency: any; }[] = [];
  filteredData: any[] = [];
  showModal: boolean = false;
  modalData: any = null;
  traceMetaData: any[] = [];
  hierarchicalList: any[] = [];
  public traceData: Array<Span> | undefined;
  sortParameter: 'start_time' | 'duration' = 'start_time';
  orderParameter: 'asc' | 'dec' = 'dec';
  param = -1;
  pageIdDecoded: string = '';

  Highcharts: typeof Highcharts = Highcharts;
  logsErrorChart: any = null;

  versionIdLogs: string = 'All';
  categoryLogs: string = 'All';
  instancesLogs: { name: string; value: string }[] = [{ name: 'All', value: 'All' }];
  currentPageLogs = 1;
  size = 20;
  sizeParam = -1;
  totalPagesLogs = 0;
  totalLogs = 0;
  tableDataLogs: any[] = [];
  filteredDataLogs: any[] = [];
  noData = false;
  loadingLogs = false;

  dropdownOpen = false;
  criteriaList = [
    { key: 'status', label: 'Status' },
    { key: 'traceID', label: 'Trace ID' },
    { key: 'minDuration', label: 'Min Duration' },
    { key: 'maxDuration', label: 'Max Duration' }
  ];
  shownCriteria: Record<string, boolean> = {
    status: false,
    traceID: false,
    minDuration: false,
    maxDuration: false
  };
  traceState: string = '';
  traceID: string = '';
  minDuration: number = 0;
  maxDuration: number = 0;

  dropDownOpenLogs = false;
  criteriaListLogs = [
    { key: 'instance', label: 'Version' },
    { key: 'category', label: 'Category' }
  ];
  showCriteriaLogs: any = {
    instance: false,
    category: false
  };

  constructor(
    private browserApi: BrowserApiService,
    private dateSvc: DateService,
    private serviceIdService: ServiceIdService,
    private sharedService: SharedService,
    private browserApiService: BrowserApiService,
    private snakBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.serviceId = sessionStorage.getItem('encodedServiceIdforBrowser') || '';
    this.pageId = sessionStorage.getItem('encodedPageId') || '';
    this.entityId = `${this.serviceId}_${this.pageId}`;
    this.serviceName = this.decodeBase64(this.serviceId);
    this.pageIdDecoded = this.decodeBase64(this.pageId);

    this.dateSvc.setActiveComponent('BrowserPageComponent');
    this.datesubscription = this.dateSvc.activeComponent$
      .pipe(
        filter(c => c === 'BrowserPageComponent'),
        switchMap(() => this.dateSvc.date$)
      )
      .subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.toNumberTS(this.datemodel.startdateTime);
        this.endTime = this.toNumberTS(this.datemodel.enddateTime);
        setTimeout(() => {
          const link = document.querySelector('#bp-tabs .nav-link.active') as HTMLAnchorElement | null;
          const tab = link?.getAttribute('href')?.replace('#', '') || 'overview';
          this.loadData(tab);
        });
      });
  }

  ngAfterViewInit(): void {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
    document.addEventListener('mousemove', this.onMouseMove);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
    document.removeEventListener('mousemove', this.onMouseMove);
  }

  private onMouseMove = (e: MouseEvent): void => {
    const el = (e.target as HTMLElement).closest('.log-hoverable-cell') as HTMLElement | null;
    if (!el) return;
    const x = e.clientX + 14;
    const y = e.clientY - 10;
    el.style.setProperty('--tooltip-x', `${Math.min(x, window.innerWidth - 400)}px`);
    el.style.setProperty('--tooltip-y', `${y}px`);
  };

  decodeBase64(encoded: string): string {
    try {
      const pureBase64 = encoded.split(/[_\.]/)[0];
      return atob(pureBase64);
    } catch {
      return encoded;
    }
  }

  private toNumberTS(d: string): number {
    return parseInt(d.replace(/[-:\s]/g, ''), 10);
  }

  convertTimebucket(tb: number | string): number {
    const t = tb.toString();
    return new Date(+t.slice(0, 4), +t.slice(4, 6) - 1, +t.slice(6, 8), +t.slice(8, 10), +t.slice(10, 12)).getTime();
  }

  formatTimeBucket(timeBucket: number | string | undefined): string {
    if (!timeBucket) return 'N/A';
    const s = timeBucket.toString();
    return `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)} ${s.substring(8, 10)}:${s.substring(10, 12)}:${s.substring(12, 14)}`;
  }

  loadData(tab: string): void {
    if (!this.startTime || !this.endTime) return;
    this.destroy$.next();
    if (tab === 'trace') {
      this.fetchData();
      return;
    }
    switch (tab) {
      case 'overview':
        this.getPageDOMLatency();
        this.getPageErrorCount();
        this.getPageFMPLatency();
        this.getPageFPTLatency();
        this.getPageFirstPeakLatency();
        this.getPageLoadLatency();
        this.getPagePerformance();
        this.getPageTTLLatency();
        break;
      case 'log':
        this.fetchInstancesLogs();
        this.getLogsAggregatedData();
        this.getLogsErrorTimeSeries();
        break;
    }
  }

  getPageErrorCount() {
    this.browserApi.getPageErrorCount(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(d => this.drawSeries('pageErrorCountGraph', d as any, c => this.pageErrorCountChart = c));
  }

  getPagePerformance() {
    this.browserApi.getPagePerformance(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        const d = data as any[];
        const f = (k: string[]) => d.map(r => ({ time_bucket: r.time_bucket, ...k.reduce((a: any, x: string) => (a[x] = r[x], a), {} as any) }));
        this.drawSeries('pageLifecyclePerf', f(['load_page_avg', 'dom_ready_avg', 'dom_analysis_avg']), c => this.pageLifecyclePerfChart = c);
        this.drawSeries('pageRendering', f(['fpt_avg', 'res_avg']), c => this.pageRenderingChart = c);
        this.drawSeries('networkLatencyPerf', f(['ttfb_avg', 'dns_avg', 'tcp_avg', 'redirect_avg']), c => this.networkLatencyPerfChart = c);
        this.drawSeries('navigationPerf', f(['trans_avg']), c => this.navigationPerfChart = c);
      });
  }

  getPageFPTLatency() { this.browserApi.getPageFPTLatency(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe(d => this.drawSeries('pageFptLatenctGraph', d as any, c => this.pageFptLatenctChart = c)); }
  getPageTTLLatency() { this.browserApi.getPageTTLLatency(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe(d => this.drawSeries('pageTTLLatencyGraph', d as any, c => this.pageTTLLatencyChart = c)); }
  getPageDOMLatency() { this.browserApi.getPageDOMLatency(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe(d => this.drawSeries('pageDomLatencyGraph', d as any, c => this.pageDomLatencyChart = c)); }
  getPageLoadLatency() { this.browserApi.getPageLoadLatency(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe(d => this.drawSeries('pageLoadLatencyGraph', d as any, c => this.pageLoadLatencyChart = c)); }
  getPageFirstPeakLatency() { this.browserApi.getPageFirstPeakLatency(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe(d => this.drawSeries('appLoadGraph', d as any, c => this.appLoadChart = c)); }
  getPageFMPLatency() { this.browserApi.getPageFMPLatency(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe(d => this.drawSeries('appErrorRateGraph', d as any, c => this.appErrorRateChart = c)); }

  private drawSeries(containerId: string, data: any[], assign: (c: Highcharts.Chart) => void): void {
    try {
      const buckets: number[] = [];
      const map: Record<string, Array<[number, number | null]>> = {};
      data?.forEach((row: any) => {
        const t = this.convertTimebucket(row.time_bucket);
        if (!buckets.includes(t)) buckets.push(t);
      });
      buckets.sort((a, b) => a - b);
      data?.forEach((row: any) => {
        Object.keys(row).forEach(k => {
          if (k === 'time_bucket') return;
          if (!map[k]) map[k] = [];
          map[k].push([this.convertTimebucket(row.time_bucket), row[k]]);
        });
      });
      const series = Object.keys(map).map(name => ({
        name,
        data: buckets.map(t => { const p = map[name].find(v => v[0] === t); return p ?? [t, null]; }),
        marker: { radius: 2 },
        lineWidth: 1.4
      } as Highcharts.SeriesSplineOptions));
      const opts: Highcharts.Options = {
        chart: { type: 'spline', renderTo: containerId, backgroundColor: 'transparent', spacing: [5, 5, 5, 5] },
        title: { text: undefined },
        credits: { enabled: false },
        exporting: { enabled: false },
        legend: { enabled: false },
        xAxis: { type: 'datetime', tickLength: 0, lineColor: '#e9ecef', labels: { style: { color: '#030303', fontSize: '8px' } }, gridLineColor: '#ede8e8' },
        yAxis: { min: 0, title: { text: undefined }, tickAmount: 6, gridLineColor: '#ede8e8', labels: { style: { color: '#030303', fontSize: '8px' } } },
        tooltip: {
          shared: true, useHTML: true, backgroundColor: '#fff', style: { color: '#000', fontSize: '11px' },
          formatter: function () {
            const d = Highcharts.dateFormat('%Y-%m-%d %H:%M', (this as any).x);
            let html = `<b>${d}</b><br/>`;
            (this as any).points?.forEach((p: any) => { html += `<span style="color:${p.color}">●</span> <b>${p.series.name}</b>: ${p.y ?? '—'}<br/>`; });
            return html;
          }
        },
        plotOptions: { series: { turboThreshold: 0, connectNulls: true } },
        series: series as any
      };
      assign(new Highcharts.Chart(opts as any));
    } catch (e) { }
  }

  get allCriteriaSelected(): boolean {
    return this.criteriaList.every(c => this.shownCriteria[c.key]);
  }

  get availableCriteria() {
    return this.criteriaList.filter(c => !this.shownCriteria[c.key]);
  }

  toggleDropdown() { this.dropdownOpen = !this.dropdownOpen; }
  selectCriteria(key: string) { this.shownCriteria[key] = true; }

  removeCriteria(key: string) {
    this.shownCriteria[key] = false;
    if (key === 'status') this.traceState = '';
    if (key === 'traceID') this.traceID = '';
    if (key === 'minDuration') this.minDuration = 0;
    if (key === 'maxDuration') this.maxDuration = 0;
    this.getTraceCount();
    this.getTracesData();
  }

  trackByTraceId(index: number, item: any): string {
    return item.traceId;
  }

  copyTraceId(traceId: string | null, event: MouseEvent) {
    event.stopPropagation();
    if (!traceId) return;
    navigator.clipboard.writeText(traceId).then(() => {
      this.snakBar.open('Trace ID copied!', '', { duration: 2000, horizontalPosition: 'end', verticalPosition: 'bottom' });
    });
  }

  getServiceInstanceNames(): void {
    this.browserApiService.getVersionNames(this.entityId, this.startTime, this.endTime, this.param, this.param)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        const instanceArray = ([] as string[]).concat(
          ...Object.entries(data).filter(([key]) => key !== 'total_hits' && Array.isArray((data as any)[key])).map(([_, value]) => value as string[])
        );
        this.instances = [{ name: 'All', value: 'All' }, ...instanceArray.map(i => ({ name: i, value: i }))];
        this.instName = 'All';
      }, err => console.error('Error fetching instances:', err));
  }

  getTracesData(): void {
    let endpointId = '';
    if (this.pageId) endpointId = this.decodeBase64(this.pageId);

    const params: any = {
      serviceId: this.serviceId,
      st: +this.startTime,
      et: +this.endTime
    };

    if (this.instName !== 'All') params.instanceId = this.instName;
    if (endpointId) params.endpointId = endpointId;
    if (this.traceState) params.traceState = this.traceState === 'success' ? 0 : 1;
    if (this.traceID) params.EndpointtraceID = this.traceID;
    if (this.minDuration) params.minTraceDuration = this.minDuration;
    if (this.maxDuration) params.maxTraceDuration = this.maxDuration;

    this.browserApiService.getTracesData(
      params.serviceId, params.st, params.et,
      this.currentPage, this.sortParameter, this.orderParameter,
      undefined, params.traceState,
      params.endpointId || undefined,
      params.EndpointtraceID || undefined,
      params.minTraceDuration || undefined,
      params.maxTraceDuration || undefined
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        this.tableData = data.map((item: any) => ({
          endpointId: item.endpoint_id,
          startTime: item.start_time,
          timeBucket: item.time_bucket,
          isError: item.is_error,
          traceId: item.trace_id,
          instance: item.instance,
          latency: item.latency
        }));
        if (this.tableData.length > 0) this.selectItem(this.tableData[0]);
      },
      error: (err) => { console.error('Error fetching trace data:', err); this.tableData = []; this.clearSelection(); }
    });
  }

  getTraceCount(): void {
    let endpointId = '';
    if (this.pageId) endpointId = this.decodeBase64(this.pageId);

    const params: any = {
      serviceId: this.serviceId,
      st: +this.startTime,
      et: +this.endTime
    };

    if (this.instName !== 'All') params.instanceId = this.instName;
    if (endpointId) params.endpointId = endpointId;
    if (this.traceState) params.traceState = this.traceState === 'success' ? 0 : 1;
    if (this.traceID) params.EndpointtraceID = this.traceID;
    if (this.minDuration) params.minTraceDuration = this.minDuration;
    if (this.maxDuration) params.maxTraceDuration = this.maxDuration;

    this.browserApiService.getTraceCount(
      params.serviceId, params.st, params.et,
      undefined, params.traceState,
      params.endpointId || undefined,
      params.EndpointtraceID || undefined,
      params.minTraceDuration || undefined,
      params.maxTraceDuration || undefined
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => { this.totalTraces = data.total_count; this.calculateTotalPages(); },
      error: (err) => { console.error('Error fetching trace count:', err); this.clearSelection(); }
    });
  }

  calculateTotalPages(): void {
    this.totalPages = Math.max(1, Math.ceil(this.totalTraces / this.rowsPerPage));
  }

  previousTracePage(): void {
    if (this.currentPage > 1) { this.currentPage--; this.getTracesData(); }
  }

  nextTracePage() {
    if (this.currentPage < this.totalPages) { this.currentPage++; this.getTracesData(); }
  }

  goToTracePage(page: number): void {
    this.currentPage = page;
    this.getTracesData();
  }

  get traceItemRange(): string {
    if (this.totalTraces === 0) return '0/0';
    const end = Math.min(this.currentPage * this.rowsPerPage, this.totalTraces);
    return `${end}/${this.totalTraces}`;
  }

  fetchData(): void {
    this.currentPage = 1;
    this.clearSelection();
    this.getServiceInstanceNames();
    this.getTraceCount();
    this.getTracesData();
  }

  search(): void {
    this.clearSelection();
    this.currentPage = 1;
    this.getTraceCount();
    this.getTracesData();
  }

  selectItem(item: any): void {
    if (!item) { this.clearSelection(); return; }
    this.selectedView = 'table';
    this.selectedItem = item.endpointId;
    this.selectedTraceId = item.traceId;
    this.selectedLatency = item.latency;
    this.getTracesDataList(item.traceId);
  }

  clearSelection(): void {
    this.selectedItem = null;
    this.selectedTraceId = null;
    this.selectedLatency = null;
    this.hierarchicalList = [];
    this.traceMetaData = [];
    this.traceData = [];
    this.showModal = false;
  }

  changeView(view: 'list' | 'tree' | 'table' | 'stat'): void {
    this.selectedView = view;
  }

  getTracesDataList(traceId: string): void {
    this.browserApiService.getTraceMetaData(traceId).pipe(takeUntil(this.destroy$)).subscribe(
      (response: any) => {
        const spans = response || [];
        this.traceMetaData = spans;
        this.traceData = JSON.parse(JSON.stringify(spans));
        this.hierarchicalList = this.buildHierarchicalList(spans);
      },
      err => console.error('Error fetching trace metadata:', err)
    );
  }

  buildHierarchicalList(spans: any[]): any[] {
    const spanMap = new Map<string, any>();
    const root: any[] = [];
    spans.forEach(span => {
      span.spanId = span.segmentId + span.spanId;
      if (span.parentSpanId === -1 && span.refs && span.refs.length > 0) {
        span.parentSpanId = span.refs[0].parentSegmentId + span.refs[0].parentSpanId;
      } else {
        span.parentSpanId = span.segmentId + span.parentSpanId;
      }
      span.children = [];
      spanMap.set(span.spanId, span);
    });
    spanMap.forEach(span => {
      if (span.parentSpanId === `${span.segmentId}-1`) root.push(span);
      else { const parent = spanMap.get(span.parentSpanId); if (parent) parent.children.push(span); }
    });
    const list: any[] = [];
    function flatten(span: any, level: number) { list.push({ ...span, level }); span.children.forEach((c: any) => flatten(c, level + 1)); }
    root.forEach(span => flatten(span, 0));
    return list;
  }

  onListItemSelected(item: any): void { this.openModal(item); }
  onTableRowSelected(row: any): void { this.openModal(row); }

  openModal(item: Span): void {
    this.modalData = {
      serviceCode: item.serviceCode,
      serviceInstanceName: item.serviceInstanceName,
      endpointName: item.endpointName,
      type: item.type,
      component: item.component,
      peer: item.peer,
      isError: item.isError,
      tags: item.tags
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.modalData = null;
  }

  toggleDropDownLogs() { this.dropDownOpenLogs = !this.dropDownOpenLogs; }

  selectCriteriaLogs(key: string) {
    this.showCriteriaLogs[key] = true;
    this.dropDownOpenLogs = false;
  }

  removeCriteriaLogs(key: string) {
    this.showCriteriaLogs[key] = false;
    if (key === 'instance') this.versionIdLogs = 'All';
    if (key === 'category') this.categoryLogs = 'All';
    this.getLogsAggregatedData();
    this.getLogsErrorTimeSeries();
  }

  get allCriteriaSelectedLogs(): boolean {
    return this.criteriaListLogs.every(c => this.showCriteriaLogs[c.key]);
  }

  get availableCriteriaLogs() {
    return this.criteriaListLogs.filter(c => !this.showCriteriaLogs[c.key]);
  }

  fetchInstancesLogs(): void {
    this.browserApi.getVersionNames(this.serviceId, this.startTime, this.endTime, this.sizeParam, this.sizeParam)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const arr = ([] as string[]).concat(
            ...Object.entries(data || {}).filter(([k]) => k !== 'total_hits').map(([, v]) => Array.isArray(v) ? v : [v])
          );
          this.instancesLogs = [{ name: 'All', value: 'All' }, ...arr.map(x => ({ name: x, value: x }))];
        }
      });
  }

  fetchLogs(): void {
    const version = this.versionIdLogs === 'All' ? undefined : this.versionIdLogs;
    const category = this.categoryLogs === 'All' ? undefined : this.categoryLogs;
    const pageSize = this.size || 20;

    this.loadingLogs = true;
    this.noData = false;

    this.browserApi.getLogsData(
      this.serviceId, +this.startTime, +this.endTime,
      this.pageIdDecoded, this.currentPageLogs, pageSize, version, category
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (resp: any) => {
        let rows = [];
        let totalHits = 0;
        if (Array.isArray(resp)) {
          rows = resp;
          totalHits = resp.length;
        } else if (resp && Array.isArray(resp.logs)) {
          rows = resp.logs;
          totalHits = resp.total_hits ?? rows.length;
        }
        this.tableDataLogs = rows;
        this.filteredDataLogs = rows;
        this.totalLogs = totalHits;
        this.totalPagesLogs = Math.max(1, Math.ceil(totalHits / pageSize));
        this.noData = rows.length === 0;
        this.loadingLogs = false;
        if (this.currentPageLogs > this.totalPagesLogs) {
          this.currentPageLogs = this.totalPagesLogs;
          this.fetchLogs();
        }
      },
      error: () => { this.tableDataLogs = []; this.noData = true; this.loadingLogs = false; }
    });
  }

  getLogsAggregatedData(): void {
    const version = this.versionIdLogs === 'All' ? undefined : this.versionIdLogs;
    const category = this.categoryLogs === 'All' ? undefined : this.categoryLogs;

    this.browserApi.getLogsAggregatedData(
      this.serviceId, +this.startTime, +this.endTime,
      this.pageIdDecoded, this.size || 20, version, category
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.fetchLogs(); },
      error: () => { this.fetchLogs(); }
    });
  }

  searchLogs(): void {
    this.currentPageLogs = 1;
    this.getLogsAggregatedData();
    this.getLogsErrorTimeSeries();
  }

  previousPage() {
    if (this.currentPageLogs > 1) { this.currentPageLogs--; this.fetchLogs(); }
  }

  nextPage() {
    if (this.currentPageLogs < this.totalPagesLogs) { this.currentPageLogs++; this.fetchLogs(); }
  }

  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPagesLogs) { this.currentPageLogs = p; this.fetchLogs(); }
  }

  getStartIndex(): number {
    if (!this.totalLogs) return 0;
    return (this.currentPageLogs - 1) * this.size + 1;
  }

  getEndIndex(): number {
    return Math.min((this.currentPageLogs - 1) * this.size + this.tableDataLogs.length, this.totalLogs);
  }

  get totalPagesArray(): (number | string)[] {
    const visible = 3;
    const total = this.totalPagesLogs;
    if (total <= visible + 2) return Array.from({ length: total }, (_, i) => i + 1);
    if (this.currentPageLogs <= visible) return [...Array.from({ length: visible }, (_, i) => i + 1), '...', total];
    if (this.currentPageLogs >= total - visible + 1) return [1, '...', ...Array.from({ length: visible }, (_, i) => total - visible + i + 1)];
    return [1, '...', this.currentPageLogs - 1, this.currentPageLogs, this.currentPageLogs + 1, '...', total];
  }

  getLogsErrorTimeSeries(): void {
    const version = this.versionIdLogs === 'All' ? undefined : this.versionIdLogs;
    const category = this.categoryLogs === 'All' ? undefined : this.categoryLogs;
    this.browserApi.getLogsErrorTimeSeries(this.serviceId, this.startTime, this.endTime, version, this.pageIdDecoded, category)
      .subscribe({
        next: (res) => { this.buildLogsErrorChart(res?.time_series || []); },
        error: (err) => { console.error(err); this.logsErrorChart = null; }
      });
  }

  buildLogsErrorChart(data: any[]): void {
    if (!data || !Array.isArray(data) || data.length === 0) { this.logsErrorChart = null; return; }
    const labels = data.map(d => `${d.time_bucket.slice(0, 4)}-${d.time_bucket.slice(4, 6)}-${d.time_bucket.slice(6, 8)}`);
    const seriesData = data.map(d => ({ y: Number(d.ERROR || 0), total: Number(d.total ?? d.ERROR ?? 0) }));
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
    this.logsErrorChart = {
      chart: { type: 'column', backgroundColor: 'transparent', spacing: [5, 5, 5, 5] },
      title: { text: null },
      plotOptions: { column: { pointPadding: 0.1, maxPointWidth: 10, borderWidth: 0.05 } },
      xAxis: { categories: labels, labels: { style: { color: labelColor, fontSize: '9px' }, y: 10 }, gridLineColor: gridColor },
      yAxis: { min: 0, tickAmount: 6, title: { text: "" }, labels: { style: { color: labelColor, fontSize: '9px' } }, gridLineColor: gridColor },
      tooltip: {
        shared: true, backgroundColor: tooltipBgColor, style: { color: tooltipTextColor, fontSize: '10px' }, useHTML: true,
        formatter: function (this: any) {
          const category = this.points?.[0]?.category ?? this.x;
          const total = (this.points && (this.points[0]?.point?.total ?? this.points[0]?.total)) ?? (this.point && this.point.total) ?? (this.y ?? 0);
          const errorVal = this.points?.[0]?.y ?? this.y ?? 0;
          return `<b>${category}</b><br/><b>Total: ${total}</b><br/><span style="color:#FF4C4C">●</span> ERROR: <b>${errorVal}</b>`;
        }
      },
      legend: { enabled: false },
      series: [{ name: "ERROR", type: "column", data: seriesData, color: "#FF4C4C" }],
      credits: { enabled: false }
    };
  }

  showLogDetailsModal = false;
  logModalTitle = '';
  logModalContent = '';

  openLogModal(title: string, content: string): void {
    this.logModalTitle = title;
    this.logModalContent = content;
    this.showLogDetailsModal = true;
  }

  closeLogModal(): void {
    this.showLogDetailsModal = false;
  }
}