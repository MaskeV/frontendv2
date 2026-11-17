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
import { SessionSummary } from '../../../../models/mrum/session-summary';
import { SortPipe } from '../../../../pipes/sort.pipe';

Highcharts.setOptions({
  lang: { noData: 'No Data' }
});

@Component({
    selector: 'app-mrum-versions',
    imports: [CommonModule, RouterModule, NgbDropdownModule, FormsModule, HighchartsChartModule, MrumBreadcrumbComponent],
    templateUrl: './mrum-versions.component.html',
    styleUrl: './mrum-versions.component.css'
})
export class MrumVersionsComponent implements OnInit, OnDestroy {

  @ViewChild('svgElement', { static: true }) svgElement!: ElementRef;

  Highcharts: typeof Highcharts = Highcharts;

  constructor(
    private router: Router,
    private mrumService: MrumService,
    private sharedService: SharedService,
    private dateService: DateService,
    private autoRefresh: AutoRefreshService,
    private decoderService: DecoderService,
    private appRef: ApplicationRef,
    private modalService: NgbModal,
    private route: ActivatedRoute,
  ) {

  }

  currentTabName: string = 'Overview';
  selectedService!: string;
  selectedVersion!: string;
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

  throughput!: number | null;
  failureRate!: number | null;
  latency!: number | null;
  crashRate!: number | null;
  httpRequestCount!: number | null;
  apdexScore!: number | null;


  pieChartConfigs: {
    networkConnectionType: Highcharts.Options | null;
    device: Highcharts.Options | null;
    osVersion: Highcharts.Options | null;
  } = {
      networkConnectionType: null,
      device: null,
      osVersion: null,
    };


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
  sessionsMetricData: MetricData = {
    timeSeries: [],
    aggregated: null
  };
  httpRequestMetricData: MetricData = {
    timeSeries: [],
    aggregated: null
  };
  failureRateMetricData: MetricData = {
    timeSeries: [],
    aggregated: null
  };

  // transactions tab
  transactionNameList: string[] = [];
  osversionList: string[] = [];
  deviceList: string[] = [];
  transactions: any[] = [];
  transactionFilters: MrumParams = {
    osVersion: '',
    appVersion: '',
    device: '',
    outcome: '',
  };

  sortField: string = 'latency';
  sortDirection: 'asc' | 'desc' = 'desc';

  //session tab
  sessionFilters: MrumParams = {
    osVersion: '',
    appVersion: '',
    device: '',
  };
  paginatedSessions: SessionSummary[] = [];
  totalSessions = 0;
  sessionPageSize = 10;
  currentSessionsPage = 1;
  totalSessionsPages = 1;
  paginationPages: number[] = [];
  paginationStart = 0;
  paginationEnd = 0;
  //error tab
  errorFilters: MrumParams = {
    osVersion: '',
    appVersion: '',
    device: '',
    isCrash: undefined,
  };
  paginatedError: any[] = [];
  totalError = 0;
  errorPageSize = 10;
  currentErrorPage = 1;
  totalErrorPages = 1;
  errorPaginationPages: number[] = [];
  errorPaginationStart = 0;
  errorPaginationEnd = 0;

  chartRefs: Record<string, Highcharts.Chart | undefined> = {};

  hasUrlDate = false;
  firstDateUpdateDone = false;

  ngOnInit(): void {

    this.route.queryParams.subscribe(params => {

      const serviceId = params['serviceId'];
      const version = params['version'];
      const tabName = params['tab'] || 'overview';

      if (params['st'] && params['et']) {
        this.startTime = params['st'];
        this.endTime = params['et'];
        this.hasUrlDate = true;
      }

      if (!serviceId) {
        this.router.navigate(['/mrum']);
        return;
      }
      if (!version) {
        this.router.navigate(['/mrum/mrum-overview'], {
          queryParams: {
            serviceId: serviceId,
            st: this.startTime,
            et: this.endTime
          }
        });
        return;
      }


      this.selectedVersion = version || this.selectedVersion;
      this.selectedService = serviceId || this.selectedService;
      this.errorFilters.appName = serviceId;
      this.errorFilters.appVersion = version;
      this.sessionFilters.appName = serviceId;
      this.sessionFilters.appVersion = version;
      this.transactionFilters.appVersion = version;
      this.transactionFilters.appName = serviceId;
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
    this.breadcrumbData = [
      { label: 'MRUM', url: '/mrum' },
      { 
        label: this.selectedService || 'ecom-app', 
        url: '/mrum/mrum-overview', 
        queryParams: { serviceId: this.selectedService || 'ecom-app', tab: 'overview', st: this.startTime, et: this.endTime } 
      },
      { 
        label: 'Versions', 
        url: '/mrum/mrum-overview',
        queryParams: { serviceId: this.selectedService || 'ecom-app', tab: 'versions', st: this.startTime, et: this.endTime } 
      },
      { 
        label: this.selectedVersion 
      }
    ];
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

  activateTabUI(tabId: string): void {
    const tabLink = document.querySelector(`#service-nav a[href="#${tabId}"]`) as HTMLElement;
    if (tabLink) {
      tabLink.click();
    } else {
    }
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
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
        this.loadOverviewData();
        this.getAppPerformanceMetrics();
        this.updateTimeSeriesCharts();
        break;
      case 'transactions':
        this.loadInitialTransactionsData();
        this.getTransactions();
        break;
      case 'sessions':
        this.loadInitialTransactionsData();
        this.getSessions();
        break;
      case 'errors':
        this.loadInitialTransactionsData();
        this.getErrors();
        break;
    }
  }


  loadInitialTransactionsData(): void {
    const mrumParams: MrumParams = {
      appName: this.selectedService,
      appVersion: this.selectedVersion,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };

    this.deviceList = [];
    this.osversionList = [];

    forkJoin({
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
        this.deviceList = result.devices;
        this.osversionList = result.osVersions;
      },
      error: err => {
        console.error('Error fetching initial filter data:', err);
      }
    });
  }


  getTransactions(): void {
    const baseParams: MrumParams = {
      appName: this.selectedService,
      appVersion: this.selectedVersion,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };

    this.transactions = [];
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

    if (filters.transactionName?.trim()) {
      baseParams.transactionName = filters.transactionName;
    }

    this.mrumService.getTransactions(baseParams).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data?.serviceStatus === 'Success') {
          const transactionNames = data.serviceResponse.transactions || [];
          this.transactionNameList = transactionNames;

          const metricsCalls: Observable<any>[] = transactionNames.map((txnName: string) => {
            return of({
              name: txnName,
              apdex: 0,
              latency: 0,
              throughput: 0,
              failedRate: 0
            });
          });

          forkJoin(metricsCalls).pipe(takeUntil(this.destroy$)).subscribe({
            next: (results: any[]) => {
              this.transactions = results.filter(r => r !== null);
            },
            error: err => {
              console.error('Error in performance metrics fetch:', err);
              this.transactions = [];
            }
          });
        } else {
          console.error('Error fetching transactions:', data);
          this.transactions = [];
        }
      },
      error: err => {
        console.error('Error fetching transaction list:', err);
        this.transactions = [];
      }
    });
  }

  getSessions(): void {
    const { osVersion, device, sessionId } = this.sessionFilters;
    const params = {
      appName: this.selectedService,
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      pageNumber: this.currentSessionsPage,
      pageSize: this.sessionPageSize,
      appVersion: this.selectedVersion,
      osVersion,
      device,
      sessionId
    };

    this.paginatedSessions = [];
    this.mrumService.getSessions(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data?.serviceStatus === 'Success') {
          const sessionIds: string[] = data.serviceResponse.sessions || [];
          this.totalSessions = data.serviceResponse.total || 0;
          this.totalSessionsPages = Math.ceil(this.totalSessions / this.sessionPageSize);
          this.updatePaginationWindow();
          const summaries$ = sessionIds.map((id) => {
            const summaryParams: MrumParams = {
              appName: this.selectedService,
              st: this.startTime.toString(),
              et: this.endTime.toString(),
              sessionId: id,
              appVersion: this.selectedVersion,
              osVersion,
              device
            };
            return this.mrumService.getSessionsSummary(summaryParams).pipe(
              map(res => ({
                sessionId: id,
                latency: res?.serviceResponse?.latency ?? 0,
                throughput: res?.serviceResponse?.throughput ?? 0,
                apdex: res?.serviceResponse?.apdex ?? 0,
                failure_rate: res?.serviceResponse?.failure_rate ?? 0,
                isCrash: res?.serviceResponse?.isCrash ?? false
              })),
              catchError(() => of({ sessionId: id, latency: 0, throughput: 0, apdex: 0, failure_rate: 0, isCrash: false }))
            );
          });

          forkJoin(summaries$).subscribe({
            next: (results: SessionSummary[]) => {
              this.paginatedSessions = results;
            },
            error: err => {
              console.error('Error in fetching session summaries:', err);
            }
          });
        }
      },
      error: err => {
        console.error('Error fetching sessions:', err);
      }
    });
  }


  getErrors(): void {
    const params: MrumParams = {
      appName: this.selectedService,
      appVersion: this.selectedVersion,
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      pageNumber: this.currentErrorPage,
      pageSize: this.errorPageSize,
      osVersion: this.errorFilters?.osVersion?.trim() || undefined,
      device: this.errorFilters?.device?.trim() || undefined,
      sessionId: this.errorFilters?.sessionId?.trim() || undefined,
      traceId: this.errorFilters?.traceId?.trim() || undefined,
      isCrash: this.errorFilters?.isCrash || undefined,
    };
    this.errorPaginationPages = [];
    this.mrumService.getErrorLogs(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data?.serviceStatus === 'Success') {
          this.paginatedError = data.serviceResponse.errors;
          this.totalError = data.serviceResponse.total || 0;
          this.totalErrorPages = Math.ceil(this.totalError / this.errorPageSize);
          this.updateErrorPaginationWindow();
        } else {
          this.paginatedError = [];
        }
      },
      error: err => {
        this.paginatedError = [];
        console.error('Error fetching error:', err);
      }
    });
  }

  changeErrorPage(page: number): void {
    if (page < 1 || page > this.totalErrorPages) return;
    this.currentErrorPage = page;
    this.getErrors();
    this.updateErrorPaginationWindow();
  }

  updateErrorPaginationWindow(): void {
    const windowSize = 3;
    const half = Math.floor(windowSize / 2);

    let start = Math.max(2, this.currentErrorPage - half);
    let end = Math.min(this.totalErrorPages - 1, this.currentErrorPage + half);

    if (this.currentErrorPage <= 2) {
      end = Math.min(1 + windowSize, this.totalErrorPages - 1);
    } else if (this.currentErrorPage >= this.totalErrorPages - 1) {
      start = Math.max(this.totalErrorPages - windowSize, 2);
    }

    this.errorPaginationStart = start;
    this.errorPaginationEnd = end;

    this.errorPaginationPages = [];
    for (let i = start; i <= end; i++) {
      this.errorPaginationPages.push(i);
    }
  }


  changeSessionsPage(page: number): void {
    if (page < 1 || page > this.totalSessionsPages) return;
    this.currentSessionsPage = page;
    this.getSessions();
    this.updatePaginationWindow();
  }

  updatePaginationWindow(): void {
    const windowSize = 3;
    const half = Math.floor(windowSize / 2);

    let start = Math.max(2, this.currentSessionsPage - half);
    let end = Math.min(this.totalSessionsPages - 1, this.currentSessionsPage + half);

    if (this.currentSessionsPage <= 2) {
      end = Math.min(1 + windowSize, this.totalSessionsPages - 1);
    } else if (this.currentSessionsPage >= this.totalSessionsPages - 1) {
      start = Math.max(this.totalSessionsPages - windowSize, 2);
    }

    this.paginationStart = start;
    this.paginationEnd = end;

    this.paginationPages = [];
    for (let i = start; i <= end; i++) {
      this.paginationPages.push(i);
    }
  }


  loadOverviewData(): void {
    const mrumParams: MrumParams = {
      appName: this.selectedService,
      appVersion: this.selectedVersion,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };
    
    this.mrumService.getOverview(mrumParams).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data?.serviceStatus === 'Success' && data.serviceResponse) {
          const res = data.serviceResponse;
          const kpis = res.kpis || {};
          const dist = res.distributions || {};

          this.crashRate = kpis.crashRate ?? null;
          this.httpRequestCount = kpis.totalUsers ?? null;

          const toRecord = (arr: any[]) => (arr || []).reduce((acc: Record<string, number>, item: any) => { acc[item.name] = item.count; return acc; }, {});

          const deviceRec = toRecord(dist.device);
          const networkRec = toRecord(dist.network);
          const osRec = toRecord(dist.osVersion);

          this.pieChartConfigs.device = this.isNonEmpty(deviceRec) ? this.getPieConfig('Device', deviceRec) : null;
          this.pieChartConfigs.networkConnectionType = this.isNonEmpty(networkRec) ? this.getPieConfig('Network Type', networkRec) : null;
          this.pieChartConfigs.osVersion = this.isNonEmpty(osRec) ? this.getPieConfig('OS Version', osRec) : null;

        } else {
          this.resetOverviewDefaults();
        }
      },
      error: (err : any) => {
        console.error('Error fetching overview data:', err);
        this.resetOverviewDefaults();
      }
    });
  }

  private resetOverviewDefaults(): void {
    this.crashRate = null;
    this.httpRequestCount = null;
    this.pieChartConfigs = {
      networkConnectionType: null,
      device: null,
      osVersion: null,
    };
  }


  getAppPerformanceMetrics(): void {
    const mrumParams: MrumParams = {
      appName: this.selectedService,
      appVersion: this.selectedVersion,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };
    this.throughput = null;
    this.failureRate = null;
    this.latency = null;
    this.apdexScore = null;
  }




getPieConfig(title: string, data: Record<string, number>): Highcharts.Options {
  return {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      height: 200
    },

    title: { text: undefined },

    tooltip: {
      useHTML: true,
      backgroundColor: '#ffffff',
      borderColor: '#d9d9d9',
      borderRadius: 6,
      style: {
        color: '#333',
        fontSize: '12px'
      },
      pointFormat: `<b>{point.name}</b>: {point.y:.1f}%`
    },

    plotOptions: {
      pie: {
        size: '90%',
        innerSize: '50%',
        dataLabels: { enabled: false },
        showInLegend: true
      }
    },

    legend: {
      itemStyle: {
        color: '#333',
        fontSize: '10px'
      }
    },

    series: [{
      type: 'pie',
      data: Object.entries(data).map(([k, v]) => ({ name: k, y: v }))
    }],

    credits: { enabled: false }
  };
}

  private isNonEmpty(obj: Record<string, number> | null | undefined): boolean {
    return !!(obj && Object.keys(obj).length > 0);
  }


  updateTimeSeriesCharts(): void {
    const mrumParams: MrumParams = {
      appName: this.selectedService,
      appVersion: this.selectedVersion,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };

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
    this.sessionsMetricData.timeSeries = [];
    this.sessionsMetricData.aggregated = null;

    this.httpRequestMetricData.timeSeries = [];
    this.httpRequestMetricData.aggregated = null;
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
      CRITICAL: '#E45E5E',
      WARNING: '#ED9C40',
      NORMAL: '#219ebc'
    };

    const allTimeBuckets: number[] = [];
    const seriesPoints: { x: number, y: number | null, color: string }[] = [];

    timeSeries.forEach(item => {
      const time = this.convertTimebucket(item[timeKey] ?? item.timestamp);
      if (!allTimeBuckets.includes(time)) {
        allTimeBuckets.push(time);
      }

      const value = item[valueKey];
      const status = item[statusKey];
      const color = statusColors[status] || '#219ebc';

      seriesPoints.push({ x: time, y: value, color });
    });

    const completeSeries = allTimeBuckets
      .sort((a, b) => a - b)
      .map(time => {
        const point = seriesPoints.find(p => p.x === time);
        return point ? point : { x: time, y: null, color: '#7CB5EC' };
      });

 return {
    chart: {
      type: 'spline',
      backgroundColor: 'transparent',
      height: 215
    },

    title: { text: undefined },
    credits: { enabled: false },
    legend: { enabled: false },

    xAxis: {
      type: 'datetime',
      lineColor: '#d0d0d0',
      tickColor: '#d0d0d0',
      labels: {
        style: { color: '#555', fontSize: '10px' }
      }
    },

    yAxis: {
      min: 0,
      gridLineColor: '#eeeeee',
      labels: {
        style: { color: '#555', fontSize: '10px' }
      }
    },

    tooltip: {
      useHTML: true,
      backgroundColor: '#ffffff',
      borderColor: '#d9d9d9',
      borderRadius: 6,
      style: {
        color: '#333',
        fontSize: '12px'
      }
    },

    plotOptions: {
      spline: {
        lineWidth: 2,
        marker: { radius: 2 }
      }
    },

    series: [{
      type: 'spline',
      data: completeSeries
    }]
  };
  }

  get sortedTransactions(): any[] {
    return new SortPipe().transform(this.transactions, this.sortField, this.sortDirection);
  }

  setSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
  }


  cleanParams(obj: Record<string, any>) {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined && v !== '')
    );
  }

  buildQueryParams(groupId: string) {
    return this.cleanParams({
      gId: groupId,
      tab: 'overview',
      serviceId: this.selectedService,
      appVersion: this.selectedVersion,
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      osVersion: this.errorFilters?.osVersion?.trim(),
      device: this.errorFilters?.device?.trim(),
      sessionId: this.errorFilters?.sessionId?.trim(),
      traceId: this.errorFilters?.traceId?.trim(),
      isCrash: this.errorFilters?.isCrash,
    });
  }

  buildQueryParamsSessions(sessionId: string) {
    return this.cleanParams({
      sId: sessionId,
      tab: 'overview',
      serviceId: this.selectedService,
      appVersion: this.selectedVersion,
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      osVersion: this.sessionFilters?.osVersion?.trim(),
      device: this.sessionFilters?.device?.trim(),
    });
  }

  buildQueryParamsTransactions(txn: string) {
    return this.cleanParams({
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      serviceId: this.selectedService,
      appVersion: this.selectedVersion,
      osVersion: this.transactionFilters?.osVersion?.trim(),
      device: this.transactionFilters?.device?.trim(),
      traceId: this.transactionFilters?.traceId?.trim(),
      nTraceid: this.transactionFilters?.netraaTraceId?.trim(),
      sId: this.transactionFilters?.sessionId?.trim(),
      outcome: this.transactionFilters?.outcome?.trim(),
      mil: this.transactionFilters?.minLatency,
      mxl: this.transactionFilters?.maxLatency,
      txn: txn,
      tab: 'overview',
    });
  }



}