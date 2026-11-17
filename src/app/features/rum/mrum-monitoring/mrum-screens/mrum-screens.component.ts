import { CommonModule } from '@angular/common';
import { ApplicationRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MrumBreadcrumbComponent, BreadcrumbItem } from '../../shared/components/mrum-breadcrumb/mrum-breadcrumb.component';
import { catchError, filter, forkJoin, from, map, Observable, of, Subject, Subscription, switchMap, takeUntil, throwError } from 'rxjs';
import Highcharts from 'highcharts';
import { SharedService } from '../../../../services/shared.service';
import { DateService } from '../../../../services/date.service';
import { AutoRefreshService } from '../../../../services/auto-refresh.service';
import $, { data } from 'jquery';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { SearchPipe } from "../../../../pipes/search.pipe";
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DecoderService } from '../../../../services/decoder.service';
import { Span } from '../../../../models/traceData';
import * as d3 from 'd3';
import { Modal } from 'bootstrap';
import { MrumService } from '../../../../services/mrum.service';
import { HTTP_TRANSFER_CACHE_ORIGIN_MAP } from '@angular/common/http';
import { MrumParams } from '../../../../models/mrum/mrum-params';
import { HighchartsChartModule } from 'highcharts-angular';
import { MetricData } from '../../../../models/mrum/metric-data';
import { TraceDetails } from '../../../../models/mrum/trace-details';
import { SpanStep } from '../../../../models/mrum/spn-step';
import { SpanNode } from '../../../../models/mrum/span-node';
import { MetadataEntry } from '../../../../models/mrum/meta-data-entry';
import { LogEntry } from '../../../../models/mrum/log-entry';

@Component({
    selector: 'app-mrum-screens',
    imports: [CommonModule, RouterModule, NgbDropdownModule, FormsModule, SearchPipe, HighchartsChartModule, MrumBreadcrumbComponent],
    templateUrl: './mrum-screens.component.html',
    styleUrl: './mrum-screens.component.css'
})
export class MrumScreensComponent implements OnInit, OnDestroy {

  @ViewChild('svgElement', { static: true }) svgElement!: ElementRef;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  Highcharts: typeof Highcharts = Highcharts;

  constructor(
    private router: Router,
    private mrumService: MrumService,
    private dateService: DateService,
    private autoRefresh: AutoRefreshService,
    private route: ActivatedRoute,
  ) {

  }

  currentTabName: string = 'Overview';
  selectedService!: string;
  selectedVersion!: string;
  selectedTransaction!: string;
  
  breadcrumbData: BreadcrumbItem[] = [];
  private storageSub!: Subscription;
  private destroy$ = new Subject<void>();
  private subscription: Subscription = new Subscription();
  subscriptions: Subscription = new Subscription();
  private refreshIntervalId: any;
  startTime!: number;
  endTime!: number;
  datemodel: any;
  isAutoRefreshEnabled!: boolean;
  refreshInterval!: number;


  latencyMetricData: MetricData = {
    timeSeries: [],
    aggregated: null
  };
  apdexMetricData: MetricData = {
    timeSeries: [],
    aggregated: null
  };
  throughputMetricData: MetricData = {
    timeSeries: [],
    aggregated: null
  };
  failureRateMetricData: MetricData = {
    timeSeries: [],
    aggregated: null
  };

  latencyDistribution?: any[]
  totalTransactions: Number = 0;
  totalFailedTransactions: Number = 0;

  transactionNameList: string[] = [];
  versionList: string[] = [];
  osversionList: string[] = [];
  deviceList: string[] = [];
  transactionFilters: MrumParams = {
    osVersion: '',
    appVersion: '',
    device: '',
    outcome: '',
    filter: 'timestamp-desc',
  };

  traceList: any[] = [];
  selectedTrace: any = null;
  activeTab: 'span' | 'meta' | 'logs' = 'span';
  traceDetails?: TraceDetails;
  currentPage: number = 1;
  pageSize: number = 10;
  totalCount: number = 0;
  totalPages: number = 1;
  showPagination: boolean = false;
  private scrollTimeout: any;
  traceTree: SpanStep[] = [];
  selectedSpan: SpanStep | null = null;
  shownParents: Set<string> = new Set();
  logs: LogEntry[] = [];
  selectedLog?: LogEntry;

  chartRefs: Record<string, Highcharts.Chart | undefined> = {};

  hasUrlDate = false;
  firstDateUpdateDone = false;

  ngOnInit(): void {

    this.route.queryParams.subscribe(params => {
      const serviceId = params['serviceId'];
      const transactionName = params['txn'];
      const tabName = params['tab'] || 'overview';

      if (!serviceId) {
        this.router.navigate(['/mrum']);
        return;
      }
      if (!transactionName) {
        this.router.navigate(['/mrum/mrum-overview'], {
          queryParams: {
            serviceId: serviceId,
            st: this.startTime,
            et: this.endTime
          }
        });
        return;
      }

      if (params['st'] && params['et']) {
        this.startTime = params['st'];
        this.endTime = params['et'];
        this.hasUrlDate = true;
      }

      this.transactionFilters.appName = serviceId;
      this.transactionFilters.transactionName = transactionName;
      this.transactionFilters.appVersion = params['appVersion'] || '';
      this.transactionFilters.osVersion = params['osVersion'] || '';
      this.transactionFilters.device = params['device'] || '';
      this.transactionFilters.sessionId = params['sId'] || undefined;
      this.transactionFilters.traceId = params['traceId'] || undefined;
      this.transactionFilters.netraaTraceId = params['nTraceid'] || undefined
      this.transactionFilters.maxLatency = params['mxl'] || undefined;
      this.transactionFilters.minLatency = params['mil'] || undefined;
      this.transactionFilters.outcome = params['outcome'] || '';

      this.selectedTransaction = transactionName || this.selectedTransaction;
      this.selectedService = serviceId || this.selectedService;
      this.currentTabName = tabName;

      this.updateBreadcrumbs();
      //this.loadData(tabName);
      this.selectTab(tabName);
    });

    this.dateService.setActiveComponent('MrumVersionsComponent');

    this.subscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'MrumVersionsComponent'),
      switchMap(() => this.dateService.date$)
    ).subscribe(dates => {
      this.datemodel = dates;
      if (this.hasUrlDate && !this.firstDateUpdateDone) {
        this.firstDateUpdateDone = true;
        return;
      }
      this.startTime = this.formatDate(this.datemodel.startdateTime);
      this.endTime = this.formatDate(this.datemodel.enddateTime);
      if (this.currentTabName) {
        this.loadData(this.currentTabName);
      }
    });

    this.loadInitialValues();
    try {
      this.storageSub = this.autoRefresh.getStorageSub().subscribe((data) => {
        if (data?.key === 'RefreshEnability') {
          this.isAutoRefreshEnabled = JSON.parse(data.value);
        }
        else if (data?.key === 'RefreshInterval') {
          this.refreshInterval = Number(data.value);
        }
      });
    }
    catch {
    }

    this.manageAutoRefresh();

  }

  ngOnDestroy(): void {
    if (this.storageSub) {
      this.storageSub.unsubscribe();
    }
    this.clearAutoRefresh();
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
  }


  private clearAutoRefresh() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  selectTab(tabName: string) {
    const element = document.querySelector(`#instance-nav .nav-link[href="#${tabName}"]`);
    if (element) {
      (element as HTMLElement).click();
    }
  }

  updateBreadcrumbs() {
    let truncatedTransaction = this.selectedTransaction;
    if (truncatedTransaction && truncatedTransaction.length > 50) {
      truncatedTransaction = truncatedTransaction.slice(0, 50) + '...';
    }

    this.breadcrumbData = [
      { label: 'MRUM', url: '/mrum' },
      { 
        label: this.selectedService || 'ecom-app', 
        url: '/mrum/mrum-overview', 
        queryParams: { serviceId: this.selectedService || 'ecom-app', tab: 'overview', st: this.startTime, et: this.endTime } 
      },
      { 
        label: 'Screens', 
        url: '/mrum/mrum-overview',
        queryParams: { serviceId: this.selectedService || 'ecom-app', tab: 'screens', st: this.startTime, et: this.endTime } 
      }
    ];

    if (this.selectedTransaction) {
      this.breadcrumbData.push({ label: truncatedTransaction });
    }
  }

  convertTimebucket(timebucket: any) {
    timebucket = timebucket.toString();
    const year = parseInt(timebucket.slice(0, 4), 10);
    const month = parseInt(timebucket.slice(4, 6), 10) - 1;
    const day = parseInt(timebucket.slice(6, 8), 10);
    const hour = parseInt(timebucket.slice(8, 10), 10);
    const minute = parseInt(timebucket.slice(10, 12), 10);
    const date = new Date(Date.UTC(year, month, day, hour, minute));
    return date.getTime();
  }


  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  onScroll(event: Event): void {
    clearTimeout(this.scrollTimeout);
    const target = event.target as HTMLElement;

    this.scrollTimeout = setTimeout(() => {
      const nearBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
      this.showPagination = nearBottom;
    }, 50);
  }

  private loadInitialValues() {
    const storedState = this.autoRefresh.getItem('RefreshEnability');
    const storedInterval = this.autoRefresh.getItem('RefreshInterval');
    if (storedState !== null) {
      this.isAutoRefreshEnabled = JSON.parse(storedState);
    }
    if (storedInterval !== null) {
      this.refreshInterval = Number(storedInterval);
    }
  }

  private manageAutoRefresh() {
    this.clearAutoRefresh();

    if (this.isAutoRefreshEnabled) {
      this.refreshIntervalId = setInterval(() => {
        this.reloadPage();
      }, this.refreshInterval * 1000);
    }
  }

  reloadPage() {
    this.dateService.triggerFunctionCall();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'NORMAL':
        return '#ffffff';
      case 'WARNING':
        return '#FCA510'; //ED9C40 //#FCA510 //B4892A
      case 'CRITICAL':
        return '#EF5350'; // E94F3D
      default:
        return '#ffffff';
    }
  }

  getStatusColor1(status: string): string {
    switch (status) {
      case 'NORMAL':
        return '#a7a7a7';
      case 'WARNING':
        return '#FCA510'; //ED9C40 //#FCA510 //B4892A
      case 'CRITICAL':
        return '#EF5350'; // E94F3D
      default:
        return '#ffffff';
    }
  }


  loadData(tabName: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabName, st: this.startTime, et: this.endTime },
      queryParamsHandling: 'merge'
    });
    this.destroy$.next();
    this.currentTabName = tabName;
    switch (tabName) {
      case 'overview':
        this.updateTimeSeriesCharts();

        break;
      case 'traces':
        this.loadInitialTransactionsData()
        this.getTransactionDetails();
        break;
    }
  }

  loadInitialTransactionsData(): void {
    const mrumParams: MrumParams = {
      appName: this.selectedService,
      transactionName: this.selectedTransaction,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };

    this.versionList = [];
    this.deviceList = [];
    this.osversionList = [];

    forkJoin({
      versions: this.mrumService.getAppVersions(mrumParams).pipe(
        map((res: any) => res?.serviceStatus === 'Success' ? res.serviceResponse || [] : []),
        catchError(() => of([]))
      ),
      devices: this.mrumService.getDevices(mrumParams).pipe(
        map((res: any) => res?.serviceStatus === 'Success' ? res.serviceResponse || [] : []),
        catchError(() => of([]))
      ),
      osVersions: this.mrumService.getOsVersions(mrumParams).pipe(
        map((res: any) => res?.serviceStatus === 'Success' ? res.serviceResponse || [] : []),
        catchError(() => of([]))
      )
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: result => {
        this.versionList = result.versions;
        this.deviceList = result.devices;
        this.osversionList = result.osVersions;
      },
      error: err => {
        console.error('Error fetching initial filter data:', err);
      }
    });
  }

  getTransactionDetails() {
    const baseParams: MrumParams = {
      appName: this.selectedService,
      transactionName: this.selectedTransaction,
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      pageNumber: this.currentPage,
      pageSize: this.pageSize
    };

    this.traceList = [];
    const filters = this.transactionFilters;

    if (filters.appVersion?.trim()) {
      baseParams.appVersion = filters.appVersion.trim();
    }

    if (filters.osVersion?.trim()) {
      baseParams.osVersion = filters.osVersion.trim();
    }

    if (filters.device?.trim()) {
      baseParams.device = filters.device.trim();
    }

    if (filters.sessionId?.trim()) {
      baseParams.sessionId = filters.sessionId.trim();
    }

    if (filters.outcome?.trim()) {
      baseParams.outcome = filters.outcome.trim();
    }

    if (filters.traceId?.trim()) {
      baseParams.traceId = filters.traceId.trim();
    }

    if (filters.netraaTraceId?.trim()) {
      baseParams.netraaTraceId = filters.netraaTraceId.trim();
    }

    if (filters.minLatency != null) {
      baseParams.minLatency = filters.minLatency;
    }

    if (filters.maxLatency != null) {
      baseParams.maxLatency = filters.maxLatency;
    }

    if (filters.filter?.trim()) {
      baseParams.filter = filters.filter;
    }

    this.mrumService.getTransactionDetails(baseParams).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data?.serviceStatus === 'Success') {
          const result = data?.serviceResponse?.transactions || [];
          this.traceList = result;
          this.totalCount = data?.serviceResponse?.count || 0;
          this.totalPages = Math.ceil(this.totalCount / this.pageSize);
          this.selectedTrace = this.traceList[0] ?? null;
          this.activeTab = 'span';
          this.getTraceDetails();
        } else {
          console.error('Error fetching transactions details:', data);
          this.traceList = [];
          this.selectedTrace = null;
        }
      },
      error: err => {
        console.error('Error fetching transaction details:', err);
        this.traceList = [];
        this.selectedTrace = null;

      }
    });
  }

  selectTrace(trace: any) {
    this.selectedTrace = trace;
    this.activeTab = 'span';
    this.getTraceDetails();
  }

  getLogDetails() {
    const mrumParams: MrumParams = {
      traceId: this.selectedTrace?.trace_id,
      appName: this.selectedService,
      appVersion: this.selectedVersion
    }
    console.log("mrumParams:", mrumParams);
    this.mrumService.getLogDetails(mrumParams).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data?.serviceStatus === 'Success') {
          this.logs = data.serviceResponse.logs;
          this.selectedLog = this.logs[0];
        } else {
          this.logs = [];
          this.selectedLog = undefined;
        }
      },
      error: err => {
        console.error('Error fetching transaction details:', err);
        this.logs = [];
        this.selectedLog = undefined;
      }
    });
  }

  selectLog(log: LogEntry) {
    this.selectedLog = log;
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.getTransactionDetails();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.getTransactionDetails();
    }
  }



  updateTimeSeriesCharts(): void {
    const mrumParams: MrumParams = {
      appName: this.selectedService,
      appVersion: this.selectedVersion,
      transactionName: this.selectedTransaction,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };

    const filters = this.transactionFilters;

    if (filters.appVersion?.trim()) {
      mrumParams.appVersion = filters.appVersion.trim();
    }

    if (filters.osVersion?.trim()) {
      mrumParams.osVersion = filters.osVersion.trim();
    }

    if (filters.device?.trim()) {
      mrumParams.device = filters.device.trim();
    }

    if (filters.sessionId?.trim()) {
      mrumParams.sessionId = filters.sessionId.trim();
    }

    if (filters.outcome?.trim()) {
      mrumParams.outcome = filters.outcome.trim();
    }

    if (filters.traceId?.trim()) {
      mrumParams.traceId = filters.traceId.trim();
    }

    if (filters.netraaTraceId?.trim()) {
      mrumParams.netraaTraceId = filters.netraaTraceId.trim();
    }

    if (filters.minLatency != null) {
      mrumParams.minLatency = filters.minLatency;
    }

    if (filters.maxLatency != null) {
      mrumParams.maxLatency = filters.maxLatency;
    }

    this.mrumService.getApdexScore(mrumParams).subscribe((data: any) => {
      if (data.serviceStatus === 'Success' && data.serviceResponse.time_series.length > 0) {
        this.apdexMetricData.timeSeries = data.serviceResponse.time_series;
        this.apdexMetricData.aggregated = data.serviceResponse.aggregated;
        setTimeout(() => {
          this.renderChartById('apdexChartContainer', 'Apdex', this.apdexMetricData.timeSeries, 'apdex');
        }, 0);
      } else {
        this.apdexMetricData.timeSeries = [];
        this.apdexMetricData.aggregated = null;
      }
    });

    this.mrumService.getLatencyStats(mrumParams).subscribe((data: any) => {
      if (data.serviceStatus === 'Success' && data.serviceResponse.time_series.length > 0) {
        this.latencyMetricData.timeSeries = data.serviceResponse.time_series;
        this.latencyMetricData.aggregated = data.serviceResponse.aggregated;
        setTimeout(() => {
          this.renderChartById('latencyChartContainer', 'Latency', this.latencyMetricData.timeSeries, 'avgLatencyMs');
        }, 0);
      } else {
        this.latencyMetricData.timeSeries = [];
        this.latencyMetricData.aggregated = null;
      }
    });
    this.mrumService.getThroughput(mrumParams).subscribe((data: any) => {
      if (data.serviceStatus === 'Success' && data.serviceResponse.time_series.length > 0) {
        this.throughputMetricData.timeSeries = data.serviceResponse.time_series;
        this.throughputMetricData.aggregated = data.serviceResponse.aggregated;
        setTimeout(() => {
          this.renderChartById('throughputChartContainer', 'Throughput', this.throughputMetricData.timeSeries, 'throughput');
        }, 0);
      } else {
        this.throughputMetricData.timeSeries = [];
        this.throughputMetricData.aggregated = null;
      }
    });

    this.mrumService.getFailedTransactionRate(mrumParams).subscribe((data: any) => {
      if (data.serviceStatus === 'Success' && data.serviceResponse.time_series.length > 0) {
        this.failureRateMetricData.timeSeries = data.serviceResponse.time_series;
        this.failureRateMetricData.aggregated = data.serviceResponse.aggregated;
        setTimeout(() => {
          this.renderChartById('failureRateChartContainer', 'Failure Rate', this.failureRateMetricData.timeSeries, 'failureRate');
        }, 0);
      } else {
        this.failureRateMetricData.timeSeries = [];
        this.failureRateMetricData.aggregated = null;
      }
    });

    this.mrumService.getLatencyDistribution(mrumParams).subscribe((data: any) => {
      if (data?.serviceStatus === 'Success' && data?.serviceResponse?.latency_distribution?.length > 0
      ) {
        this.latencyDistribution = data.serviceResponse.latency_distribution;
        this.totalTransactions = data.serviceResponse.total_transactions;
        this.totalFailedTransactions = data.serviceResponse.total_failed_transactions;

        setTimeout(() => {
          this.renderLatencyDistributionChart(this.latencyDistribution ?? []);
        }, 0);
      } else {
        this.latencyDistribution = [];
        this.totalTransactions = 0;
        this.totalFailedTransactions = 0;
      }
    });

  }


  getTraceDetails() {
    this.mrumService.getTraceDetails(this.selectedTrace.trace_id).subscribe((data: any) => {
      if (data?.serviceStatus === 'Success') {
        this.traceDetails = data.serviceResponse;
        if (this.traceDetails && this.traceDetails.steps) {
          this.traceTree = this.buildSpanTree(this.traceDetails.steps);
          this.selectedSpan = this.traceDetails.steps.find(step => !step.parent_id) || null;
        } else {
          this.traceTree = [];
          this.selectedSpan = null;
        }

      } else {
        this.traceDetails = undefined;
      }
    }
    );
  }

  buildSpanTree(steps: SpanStep[]): SpanStep[] {
    const idMap: { [id: string]: SpanStep & { children?: SpanStep[] } } = {};
    const roots: SpanStep[] = [];

    steps.forEach(step => (idMap[step.id] = { ...step, children: [] }));
    steps.forEach(step => {
      if (step.parent_id && idMap[step.parent_id]) {
        idMap[step.parent_id].children!.push(idMap[step.id]);
      } else {
        roots.push(idMap[step.id]);
      }
    });

    return roots;
  }

  getGroupedMetadata(meta: any): { [parent: string]: MetadataEntry[] } {
    const result: { [parent: string]: MetadataEntry[] } = {};

    const flatten = (obj: any, parentKey: string = '') => {
      Object.keys(obj || {}).forEach(key => {
        const value = obj[key];
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        const topKey = parentKey.split('.')[0] || key;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          flatten(value, fullKey);
        } else {
          if (!result[topKey]) result[topKey] = [];
          result[topKey].push({
            key: fullKey,
            value,
            parent: topKey
          });
        }
      });
    };

    flatten(meta);
    return result;
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  copyToClipboard(value: string): void {
    navigator.clipboard.writeText(value).then(() => {
      console.log('Copied to clipboard:', value);
    }).catch(err => {
      console.error('Copy failed', err);
    });
  }


  selectSpan(span: SpanStep): void {
    this.selectedSpan = span;
    this.activeTab = 'meta';
  }

  metadataSort = (a: any, b: any): number => {
    return a.key.localeCompare(b.key);
  };

  viewCorrelatedTraces(netraaTraceId: string): void {
    console.log("netraaTraceId: ", netraaTraceId);
    this.router.navigate(['/correlated-traces'], { queryParams: { netraaTraceId } });
  }

  viewRelatedError(traceId: string, spanId: string): void {
    this.router.navigate(['/mrum/mrum-overview'], { queryParams: { serviceId: this.transactionFilters.appName, st: this.startTime, et: this.endTime, traceId: traceId, tab: "errors" } });
  }


  renderChartById(
    containerId: string,
    title: string,
    timeSeries: any[],
    valueKey: string,
    statusKey: string = 'status',
    timeKey: string = 'time_bucket'
  ): void {
    console.log('Rendering chart for container:', containerId, 'with title:', title);
    if (this.chartRefs && this.chartRefs[containerId]) {
      this.chartRefs[containerId]!.destroy();
      this.chartRefs[containerId] = undefined;
    }

    const chartOptions = this.getTimeSeriesGraph(title, timeSeries, valueKey, statusKey, timeKey);
    this.chartRefs[containerId] = Highcharts.chart(containerId, chartOptions);
  }

  getTimeSeriesGraph(
    title: string,
    timeSeries: any[],
    valueKey: string,
    statusKey: string = 'status',
    timeKey: string = 'time_bucket'
  ): Highcharts.Options {

    const statusColors: Record<string, string> = {
      CRITICAL: '#e53935',
      WARNING: '#fb8c00',
      NORMAL: '#1e88e5'
    };

    const allTimeBuckets: number[] = [];
    const seriesPoints: any[] = [];

    timeSeries.forEach(item => {
      const time = this.convertTimebucket(item[timeKey] ?? item.timestamp);

      if (!allTimeBuckets.includes(time)) {
        allTimeBuckets.push(time);
      }

      seriesPoints.push({
        x: time,
        y: item[valueKey],
        color: statusColors[item[statusKey]] || '#1e88e5'
      });
    });

    const completeSeries = allTimeBuckets.sort((a, b) => a - b).map(time => {
      const point = seriesPoints.find(p => p.x === time);
      return point ? point : { x: time, y: null };
    });

    return {
      chart: {
        type: 'spline',
        backgroundColor: '#ffffff',
        height: 210
      },

      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },

      xAxis: {
        type: 'datetime',
        lineColor: '#e0e0e0',
        tickColor: '#e0e0e0',
        labels: { style: { color: '#555' } }
      },

      yAxis: {
        min: 0,
        gridLineColor: '#eeeeee',
        labels: { style: { color: '#555' } }
      },

      tooltip: {
        backgroundColor: '#ffffff',
        borderColor: '#d9d9d9',
        style: { color: '#333' }
      },

      series: [{
        type: 'spline',
        data: completeSeries
      }]
    };
  }


renderLatencyDistributionChart(data: any[]): void {

  const categories = data.map(d => d.latency_ms + ' ms');
  const successCounts = data.map(d => d.total_transactions - d.failed_transactions);
  const failedCounts = data.map(d => d.failed_transactions);

  Highcharts.chart('latencyDistributionChartContainer', {
    chart: {
      type: 'column',
      backgroundColor: '#ffffff', // ✅ same as line chart
      height: 210
    },

    title: { text: undefined },
    credits: { enabled: false },
    legend: { enabled: false },

    xAxis: {
      categories,
      lineColor: '#e0e0e0',  // ✅ same
      tickColor: '#e0e0e0',
      labels: {
        style: { color: '#555', fontSize: '10px' } // ✅ same
      }
    },

    yAxis: {
      min: 0,
      gridLineColor: '#eeeeee', // ✅ same
      title: { text: undefined },
      labels: {
        style: { color: '#555', fontSize: '10px' } // ✅ same
      }
    },

    tooltip: {
      useHTML: true,
      backgroundColor: '#ffffff', // ✅ same
      borderColor: '#d9d9d9',
      style: { color: '#333', fontSize: '12px' },
      shared: true,
      formatter: function () {
        const pointIndex = this.points?.[0]?.x ?? -1;
        const latency = pointIndex !== -1 ? data[pointIndex]?.latency_ms ?? 'N/A' : 'N/A';

        return `
          <b>Latency:</b> ${latency} ms<br/>
          <b>Total:</b> ${(this.points?.[0]?.y ?? 0) + (this.points?.[1]?.y ?? 0)}<br/>
          <span style="color:#e53935">●</span> Failed: ${this.points?.[0].y}<br/>
          <span style="color:#43a047">●</span> Success: ${this.points?.[1].y}<br/>
        `;
      }
    },

    plotOptions: {
      column: {
        stacking: 'normal',
        borderRadius: 4,
        pointPadding: 0.1,
        groupPadding: 0.1
      }
    },

    series: [
      {
        name: 'Failed',
        data: failedCounts,
        type: 'column',
        color: '#e53935'
      },
      {
        name: 'Success',
        data: successCounts,
        type: 'column',
        color: '#43a047'
      }
    ]
  });
}


  openThrouputPopup(event: MouseEvent, serviceName: string): void {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const popupWidth = 320;
    const popupHeight = 300;
    let newPopupX = event.clientX;
    let newPopupY = event.clientY;
    if (newPopupX + popupWidth > screenWidth) {
      newPopupX = screenWidth - popupWidth - 10;
    }
    if (newPopupY + popupHeight > screenHeight) {
      newPopupY = screenHeight - popupHeight - 10;
    }

  }

  openApdexPopup(event: MouseEvent, serviceName: string): void {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const popupWidth = 320;
    const popupHeight = 300;
    let newPopupX = event.clientX;
    let newPopupY = event.clientY;
    if (newPopupX + popupWidth > screenWidth) {
      newPopupX = screenWidth - popupWidth - 10;
    }
    if (newPopupY + popupHeight > screenHeight) {
      newPopupY = screenHeight - popupHeight - 10;
    }

  }

  openFailureRatePopup(event: MouseEvent, serviceName: string): void {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const popupWidth = 320;
    const popupHeight = 300;
    let newPopupX = event.clientX;
    let newPopupY = event.clientY;
    if (newPopupX + popupWidth > screenWidth) {
      newPopupX = screenWidth - popupWidth - 10;
    }
    if (newPopupY + popupHeight > screenHeight) {
      newPopupY = screenHeight - popupHeight - 10;
    }

  }
  openLatencyPopup(event: MouseEvent, serviceName: string): void {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const popupWidth = 320;
    const popupHeight = 300;
    let newPopupX = event.clientX;
    let newPopupY = event.clientY;
    if (newPopupX + popupWidth > screenWidth) {
      newPopupX = screenWidth - popupWidth - 10;
    }
    if (newPopupY + popupHeight > screenHeight) {
      newPopupY = screenHeight - popupHeight - 10;
    }

  }


}