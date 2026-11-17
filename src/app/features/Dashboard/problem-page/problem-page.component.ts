import { CommonModule } from '@angular/common';
import { Component, ElementRef, NgZone, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DateService } from '../../../services/date.service';
import { Subject, Subscription, filter, forkJoin, switchMap, takeUntil } from 'rxjs';
import { User } from '../../../models/user';
import { Session } from '../../../models/session';
import { AuthenticationService } from '../../../services/authentication.service';
import { LoggerService } from '../../../services/logger.service';
import { ApplicationService } from '../../../services/application.service';
import { MeteringConfigService } from '../../../services/metering-config.service';
import { ApmApiService } from '../../../services/apm-api.service';
import Highcharts from 'highcharts';
import { FormsModule } from '@angular/forms';
import { InfraService } from '../../../services/infra.service';
import { ResponseData } from '../../../models/database';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StatusColors } from '../../../models/enums/StatusColors';
import { ServiceStatus } from '../../../models/enums/ServiceStatus';
import { DatabaseService } from '../../../services/database-api.service';
declare var bootstrap: any;

interface Section {
  id: string;
  title: string;
  children?: Section[];
}

interface AlertDetails {
  alertId: string;
  alertName: string;
  application: string;
  startTime: string;
  endTime: string;
  metric: string;
  warning: string;
  critical: string;
  frequency: string;
}

@Component({
  selector: 'app-problem-page',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './problem-page.component.html',
  styleUrl: './problem-page.component.css'
})
export class ProblemPageComponent {

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();

  Highcharts: typeof Highcharts = Highcharts;

  user: User = new User();
  currentUser: User | null = null;
  sessionObject: Session = new Session();

  datemodel: any;
  startTime!: number;
  endTime!: number;
  thresholdst!: number;
  thresholds: any = {};

  activeSection: string = '';
  activeParentSection: string = '';
  isProgrammaticScroll = false;
  activeChildParentBold: string | null = null;

  sections: Section[] = [
    {
      id: 'list-item-1',
      title: 'Application',
      children: [
        { id: 'list-item-1-1', title: 'Performance' }
      ]
    },
    {
      id: 'list-item-2',
      title: 'Infrastructure',
      children: [
        { id: 'list-item-2-1', title: 'Host' },
      ]
    },
    {
      id: 'list-item-3',
      title: 'Database',
      children: [
        {
          id: 'list-item-3-1',
          title: 'Query Volume',
        },
      ]
    },
    {
      id: 'list-item-4',
      title: 'Problem Table',
      children: [
        {
          id: 'list-item-4-1',
          title: 'Alert Based Problems',
        },
      ]
    }
  ];

  isNavigatedFromInfra: Boolean = true;
  avgqps: number = 0
  avgqpsMssql: number = 0
  roundUpto: number = 1000
  infraName: any;
  dbName: any;
  logicalCores: any;
  logicalCoresMap: { [ip: string]: number } = {};
  alertDetails: AlertDetails | null = null;

  isLinux: Boolean = false;
  isWindow: Boolean = false;
  selectedHostIp: any;
  encodedSelectedHostIp: any;
  ipAddressId: any;
  selectedAPMService: any;
  encodedSelectedAPMService: any;
  selectedAPMServiceId: any;
  selectedDatabaseList: any = [];
  encodedSelectedDatabase: any;

  dbInfraMapping: any[] = [];
  mappedApp: any;
  mappedInfra: any;
  mappedDatabases: any[] = [];

  appThreshold: any = [];
  infraThresholdMap: any = {};
  dbThresholdMap: any = {};

  successRate: number = 0;
  apdexValue: number = 0;
  latencyValue: number = 0;
  avgLoadValue: number = 0;

  charts: Highcharts.Chart[] = [];
  successRateTimeValueChart: Highcharts.Chart | null = null;
  ServiceApdexTimeValueChart: Highcharts.Chart | null = null;
  serviceAvgResponseTimeChart: Highcharts.Chart | null = null;
  serviceLoadTimeValueChart: Highcharts.Chart | null = null;

  successRateTimestamps: number[] = [];
  serviceApdexTimestamps: number[] = [];
  combinedDataTimestamps: number[] = [];
  serviceLoadTimestamps: number[] = [];

  chart_criteria: string | null = 'avg';
  latency_chart_data: string = "service_resp_time";

  chart_criteria_qps: string | null = 'avg';
  chart_criteria_slowQueries: string | null = 'avg';
  chart_criteria_readQuery: string | null = 'avg';

  chart_criteria_qps_mssql: string | null = 'avg';
  chart_criteria_slowQueries_mssql: string | null = 'avg';
  chart_criteria_readQuery_mssql: string | null = 'avg';

  chart_criteriaForMemoryRam: any = 'avg';
  chart_criteriaForMemorySwap: any = 'avg';
  chart_criteriaForCpuLoad: any = 'avg';
  chart_criteriaForNetworkBandwidth: any = 'avg';

  chartData_criteriaForMemoryRam: any = 'all';
  chartData_criteriaForMemorySwap: any = 'all';
  chartData_criteriaForCpuLoad: any = 'all';
  chartData_criteriaForNetworkBandwidth: any = 'all';

  chartValuesRam: { avg?: number; warning?: number; critical?: number } = {};
  chartValuesSwap: { avg?: number; warning?: number; critical?: number } = {};
  chartValuesCpuLoad: { avg?: number; warning?: number; critical?: number } = {};
  chartValuesNetworkBandwidth: { avg?: number; warning?: number; critical?: number } = {};

  memoryRamChartInstance: { [ip: string]: Highcharts.Chart } = {};
  memorySwapChartInstance: { [ip: string]: Highcharts.Chart } = {};
  cpuLoadChartInstance: { [ip: string]: Highcharts.Chart } = {};
  networkBandwidthChartInstance: { [ip: string]: Highcharts.Chart } = {};

  memoryRamChart: { [ip: string]: Highcharts.Options | null } = {};
  memorySwapChart: { [ip: string]: Highcharts.Options | null } = {};
  avgCpuLoadChart: { [ip: string]: Highcharts.Options | null } = {};
  networkBandwidthUsageChart: { [ip: string]: Highcharts.Options | null } = {};

  lastMemoryData: any[] = [];
  lastSwapData: any[] = [];
  lastCpuData: any[] = [];
  lastNetworkData: any[] = [];

  graphCurrentQPS!: Highcharts.Chart;
  graphSlowQueriesTrend!: Highcharts.Chart;
  graphCommandTrend!: Highcharts.Chart;

  graphMssqlCurrentQPS!: Highcharts.Chart;
  graphMssqlSlowQueriesTrend!: Highcharts.Chart;
  graphMssqlCommandTrend!: Highcharts.Chart;

  currentQPSdata: ResponseData[] = [];
  slowQueriesTrendData: ResponseData[] = [];
  commandTrendData: ResponseData[] = [];

  currentQPSdataMssql: ResponseData[] = [];
  slowQueriesTrendDataMssql: ResponseData[] = [];
  commandTrendDataMssql: ResponseData[] = [];

  successRateInfo: string = "Shows the percentage of successful requests over time. Helps track system reliability and detect failures or errors in operations.";
  apdexInfo: string = " Measures user satisfaction based on response times. Higher values indicate better perceived performance; lower values signal potential performance issues.";
  loadInfo: string = "Indicates the number of active requests or tasks on the system. Helps assess system stress and detect when resources may be saturated.";
  latencyInfo: string = "Shows the response time of requests over time. Monitoring latency helps identify slow operations and potential performance bottlenecks.";

  qpsInfo: string = "Queries per Second";
  slowQueriesInfo: string = "Slow Queries Trend , queries per second";
  commandsReadInfo: string = "Commands Trend , Rows Read";

  // CHART VISIBILITY
  isApdexChart: Boolean = false;
  isServiceLoadBreached: Boolean = false;
  isSuccessRateBreached: Boolean = false;

  isMemoryRamGraph: { [ip: string]: boolean } = {};
  isMemorySwapGraph: { [ip: string]: boolean } = {};
  isCpuLoadGraph: { [ip: string]: boolean } = {};
  isNetworkBandwidthGraph: { [ip: string]: boolean } = {};

  isQpsBreached: Boolean = false;
  isSlowQueriesBreached: Boolean = false;
  isReadQueriesBreached: Boolean = false;

  isQpsMssqlBreached: Boolean = false;
  isSlowQueriesMssqlBreached: Boolean = false;
  isReadQueriesMssqlBreached: Boolean = false;

  // ==================== PROBLEM TABLE (AllProblems-style) ====================
  problemStatusOptions = [
    { label: 'All', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'Closed', value: 'closed' }
  ];

  problemTableData: any[] = [];
  allMappedProblems: any[] = [];
  filteredTableData: any[] = [];
  selectedProblemStatus: string = 'all';

  openClosedFilter: ('Open' | 'Closed')[] = ['Open', 'Closed'];
  sideBarOpenApplied: Boolean = false;
  sideBarClosedApplied: Boolean = false;

  openClosedChartRef: any = null;
  preZoomTimeframe: any = null;
  isZooming = false;

  searchText: string = '';
  sortKey: string = 'startDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  currentPage: number = 1;
  itemsPerPage: number = 5;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTableData.length / this.itemsPerPage));
  }

  get pagedData(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredTableData.slice(startIndex, startIndex + this.itemsPerPage);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: string | number) {
    const pageNum = parseInt(page as string, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= this.totalPages) {
      this.currentPage = pageNum;
    }
  }

  totalCount: number = 0;
  openCount: number = 0;
  closedCount: number = 0;

  selectAll = false;
  showModal: boolean = false;
  selectedProblem: any = null;
  isRcaResponseAvailable: Boolean = false;
  withoutRca: Boolean = false;
  isTraceIdInRcaAvailable: Boolean = true;

  relevantData = {
    summary: [] as string[],
    technicalAnalysis: [] as string[],
    impactedComponents: [] as string[],
    recommendations: [] as string[]
  };

  // ==================== END PROBLEM TABLE ====================

  openModal(row: any) {
    this.isRcaResponseAvailable = false;
    this.getRcaResponse(row);
  }

  closeModal() {
    this.showModal = false;
    this.selectedProblem = null;
  }

  toggleSort(key: string) {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'desc';
    }
    this.filterProblems();
  }

  constructor(
    private el: ElementRef,
    private zone: NgZone,
    private route: ActivatedRoute,
    private dateService: DateService,
    private router: Router,
    private apmApiService: ApmApiService,
    private authService: AuthenticationService,
    private loggerService: LoggerService,
    private applicationService: ApplicationService,
    private meteringConfigService: MeteringConfigService,
    private infraService: InfraService,
    private databaseService: DatabaseService,
  ) { }

  ngOnInit(): void {
    this.dateService.setActiveComponent('ProblemPageComponent');
    this.authService.currentUser.subscribe((x) => (this.currentUser = x));
    this.route.queryParams.subscribe(params => {
      this.isNavigatedFromInfra = params['from'] === 'infra';
    });

    if (this.currentUser) {
      this.user = this.currentUser;
    }
    this.user.sessionDTO = this.sessionObject;
    this.sessionObject.featureName = 'RUAMBOT';
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    if (this.isNavigatedFromInfra) {
      const serviceIdForWindow = sessionStorage.getItem('serviceIdForWindow');
      if (serviceIdForWindow) {
        this.isWindow = true;
        this.isLinux = false;
        this.selectedHostIp = sessionStorage.getItem('serviceIdForWindow')!;
        this.encodedSelectedHostIp = sessionStorage.getItem('encodedServiceIdForInfra')!;
      } else {
        this.isLinux = true;
        this.isWindow = false;
        this.selectedHostIp = sessionStorage.getItem('serviceIdForInfra')!;
        this.encodedSelectedHostIp = sessionStorage.getItem('encodedServiceIdForInfra')!;
      }

      this.datesubscription = this.dateService.activeComponent$.pipe(
        filter(activeComponent => activeComponent === 'ProblemPageComponent'),
        switchMap(() => this.dateService.date$)
      ).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.thresholdst = this.formatForThresholdDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.getAppDbInfraMapping();
        this.getProblemTable();
      });
    } else {
      this.selectedAPMService = sessionStorage.getItem('SelectedServiceId')!;
      this.encodedSelectedAPMService = sessionStorage.getItem('encodedEntityIDForServices')!;
      this.selectedAPMServiceId = sessionStorage.getItem('ApplicationId')!;

      this.datesubscription = this.dateService.activeComponent$.pipe(
        filter(activeComponent => activeComponent === 'ProblemPageComponent'),
        switchMap(() => this.dateService.date$)
      ).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.thresholdst = this.formatForThresholdDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.getAppDbInfraMapping();
        this.getProblemTable();
      });
    }
  }

  parseToDate(dateInput: any): Date | null {
    if (!dateInput) return null;
    let s = dateInput.toString().trim();
    if (!s || s === '-') return null;

    // If it's a number (like YYYYMMDDHHmm from dateService)
    if (/^\d{8,14}$/.test(s)) {
      if (s.length < 12) return null;
      return new Date(
        parseInt(s.substring(0, 4)),
        parseInt(s.substring(4, 6)) - 1,
        parseInt(s.substring(6, 8)),
        parseInt(s.substring(8, 10)),
        parseInt(s.substring(10, 12))
      );
    }

    // If it's an ISO string, treat any timezone/missing timezone as IST (+05:30)
    if (s.includes('T') || s.includes('-')) {
      s = s.replace(/Z$/, '+05:30')
           .replace(/\+00:?00$/, '+05:30');
      if (!/\+\d{2}:?\d{2}$/.test(s) && !/-\d{2}:?\d{2}$/.test(s)) {
        s = s + '+05:30';
      }
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  formatDateTime(dateTimeString: string): string {
    if (!dateTimeString) return '-';
    const date = this.parseToDate(dateTimeString);
    if (!date || isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  }

  // ==================== PROBLEM TABLE METHODS (AllProblems-style) ====================

  getProblemTable() {
    const tool = sessionStorage.getItem("tool") ?? '';
    this.applicationService
      .getAllProblemAlertsByUserID(this.currentUser, this.startTime, this.endTime, tool)
      .subscribe({
        next: (response: any) => {
          let rawData: any[] = Array.isArray(response) ? response : response.serviceResponse || [];

          // Normalize status
          rawData.forEach(item => {
            if (item.problemStatus) item.problemStatus = item.problemStatus.toLowerCase();
          });

          // Filter by current application
          if (this.selectedAPMService) {
            rawData = rawData.filter(item => item.applicationName === this.selectedAPMService);
          }

          this.problemTableData = rawData;

          this.allMappedProblems = rawData.map(item => {
            return {
              problem: item.alertName || item.healthRuleName,
              impacted: item.applicationName,
              applicationType: item.applicationType,
              problemStatus: item.problemStatus,
              severity: item.status,
              startDate: this.formatDateTime(item.startTime),
              endDate: item.endTime ? this.formatDateTime(item.endTime) : '-',
              duration: this.calculateDuration(item.startTime, item.endTime, item.problemStatus),
              expanded: false,
              details: item
            };
          }).sort((a: any, b: any) => {
            const tA = a.details.startTime ? this.parseToDate(a.details.startTime)?.getTime() || 0 : 0;
            const tB = b.details.startTime ? this.parseToDate(b.details.startTime)?.getTime() || 0 : 0;
            return tB - tA;
          });

          this.filterProblems();
        },
        error: (error) => {
          console.error('Error fetching problem table:', error);
        }
      });
  }

  navigateToProblemDetail(row: any) {
    const pid = row?.details?.pid;
    if (pid != null) {
      this.router.navigate(['/allProblems', pid]);
    }
  }

  calculateDuration(startTime: string, endTime: string, status?: string): string {
    if (!startTime) return '-';
    const start = this.parseToDate(startTime);
    if (!start) return '-';
    let end: Date | null;

    if (status?.toLowerCase() === 'open') {
      end = new Date();
    } else if (endTime) {
      end = this.parseToDate(endTime);
    } else {
      return '-';
    }
    if (!end) return '-';

    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return '-';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  onProblemStatusChange(value: string) {
    this.selectedProblemStatus = value;
    if (value === 'open') {
      this.sideBarOpenApplied = true;
      this.sideBarClosedApplied = false;
      this.openClosedFilter = ['Open'];
    } else if (value === 'closed') {
      this.sideBarClosedApplied = true;
      this.sideBarOpenApplied = false;
      this.openClosedFilter = ['Closed'];
    } else {
      this.sideBarOpenApplied = false;
      this.sideBarClosedApplied = false;
      this.openClosedFilter = ['Open', 'Closed'];
    }
    this.filterProblems();
  }

  filterProblems() {
    this.filteredTableData = this.allMappedProblems.filter(row => {
      // Status filter
      const matchesStatus = this.selectedProblemStatus === 'all' || row.problemStatus === this.selectedProblemStatus;

      // Chart toggle filter
      const matchesToggle = (
        (row.problemStatus === 'open' && this.openClosedFilter.includes('Open')) ||
        (row.problemStatus === 'closed' && this.openClosedFilter.includes('Closed'))
      );

      // Search filter
      const search = this.searchText.toLowerCase();
      const matchesSearch = !search ||
        (row.problem || '').toLowerCase().includes(search) ||
        (row.impacted || '').toLowerCase().includes(search) ||
        (row.severity || '').toLowerCase().includes(search) ||
        (row.problemStatus || '').toLowerCase().includes(search) ||
        (row.startDate || '').toLowerCase().includes(search) ||
        (row.duration || '').toLowerCase().includes(search) ||
        (row.details?.pid?.toString() || '').includes(search);

      return matchesStatus && matchesToggle && matchesSearch;
    });

    // Sort
    this.filteredTableData.sort((a, b) => {
      let comparison = 0;
      if (this.sortKey === 'severity') {
        const getWeight = (s: string) => {
          if (!s) return 0;
          const low = s.toLowerCase();
          if (low.includes('critical')) return 3;
          if (low.includes('warning')) return 2;
          return 1;
        };
        comparison = getWeight(a.severity) - getWeight(b.severity);
      } else if (this.sortKey === 'duration') {
        const getMs = (p: any) => {
          const start = p.details.startTime ? this.parseToDate(p.details.startTime)?.getTime() || 0 : 0;
          let end: number;
          if (p.problemStatus === 'open') {
            end = new Date().getTime();
          } else {
            end = p.details.endTime ? (this.parseToDate(p.details.endTime)?.getTime() || start) : start;
          }
          return Math.max(0, end - start);
        };
        comparison = getMs(a) - getMs(b);
      } else {
        const tA = a.details.startTime ? this.parseToDate(a.details.startTime)?.getTime() || 0 : 0;
        const tB = b.details.startTime ? this.parseToDate(b.details.startTime)?.getTime() || 0 : 0;
        comparison = tA - tB;
      }
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.totalCount = this.filteredTableData.length;
    this.openCount = this.filteredTableData.filter(p => p.problemStatus === 'open').length;
    this.closedCount = this.filteredTableData.filter(p => p.problemStatus === 'closed').length;

    // Reset pagination on filter change
    this.currentPage = 1;

    this.renderOpenClosedChart();
  }

  toggleFilter(type: 'Open' | 'Closed') {
    if (this.sideBarClosedApplied || this.sideBarOpenApplied) return;
    const index = this.openClosedFilter.indexOf(type);
    if (index >= 0) {
      this.openClosedFilter.splice(index, 1);
    } else {
      this.openClosedFilter.push(type);
    }
    this.filterProblems();
  }

  resetZoom() {
    if (this.preZoomTimeframe) {
      this.dateService.setDate(this.preZoomTimeframe);
      this.preZoomTimeframe = null;
    }
  }

  renderOpenClosedChart(): void {
    if (!this.filteredTableData || !this.startTime || !this.endTime) return;

    const parseToMs = (num: number): number => {
      const s = num.toString();
      if (s.length < 12) return 0;
      return new Date(
        parseInt(s.substring(0, 4)),
        parseInt(s.substring(4, 6)) - 1,
        parseInt(s.substring(6, 8)),
        parseInt(s.substring(8, 10)),
        parseInt(s.substring(10, 12))
      ).getTime();
    };

    const startMs = parseToMs(this.startTime);
    const endMs = parseToMs(this.endTime);
    const durationMs = endMs - startMs;

    let bucketSizeMin = 30;
    if (durationMs <= 3600000) bucketSizeMin = 1;
    else if (durationMs <= 21600000) bucketSizeMin = 5;
    else if (durationMs <= 86400000) bucketSizeMin = 30;
    else if (durationMs <= 604800000) bucketSizeMin = 120;
    else bucketSizeMin = 720;

    const bucketSizeMs = bucketSizeMin * 60000;
    const buckets: any[] = [];
    for (let t = startMs; t <= endMs; t += bucketSizeMs) {
      buckets.push({ start: t, end: t + bucketSizeMs, problems: [] });
    }

    this.filteredTableData.forEach(p => {
      if (!p.details?.startTime) return;
      const pStart = this.parseToDate(p.details.startTime)?.getTime() || 0;
      const bucket = buckets.find(b => pStart >= b.start && pStart < b.end);
      if (bucket) bucket.problems.push(p);
    });

    const openSeriesData = buckets.map(b => ({
      x: b.start,
      y: b.problems.filter((p: any) => p.problemStatus === 'open').length,
    }));
    const closedSeriesData = buckets.map(b => ({
      x: b.start,
      y: b.problems.filter((p: any) => p.problemStatus === 'closed').length,
    }));

    const chartOptions: Highcharts.Options = {
      chart: {
        type: 'column',
        height: 200,
        backgroundColor: 'transparent',
        spacingBottom: 30,
        marginTop: 10,
        zooming: {
          type: 'x',
          resetButton: { theme: { display: 'none' } }
        },
        events: {
          selection: (event: any) => {
            if (event.xAxis) {
              const minMs = event.xAxis[0].min;
              const maxMs = event.xAxis[0].max;
              if (maxMs - minMs < 60000) return false;
              if (!this.preZoomTimeframe) {
                this.preZoomTimeframe = {
                  startdateTime: this.startTime.toString(),
                  enddateTime: this.endTime.toString(),
                  startTime: null, endTime: null
                };
              }
              const pad = (n: number) => n.toString().padStart(2, '0');
              const toStr = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
              this.isZooming = true;
              this.dateService.setDate({
                startdateTime: toStr(new Date(minMs)),
                enddateTime: toStr(new Date(maxMs)),
                startTime: null, endTime: null
              });
              return false;
            }
            return true;
          }
        }
      },
      title: { text: '' },
      xAxis: {
        type: 'datetime',
        min: startMs, max: endMs,
        labels: { style: { color: '#64748b', fontSize: '10px' }, y: 18 },
        lineColor: '#e2e8f0', tickColor: '#e2e8f0',
        crosshair: { color: 'rgba(59,130,246,0.08)', width: 25 }
      },
      yAxis: {
        min: 0,
        title: { text: 'ALERTS', style: { fontSize: '9px', fontWeight: '700', color: '#64748b' } },
        allowDecimals: false,
        gridLineDashStyle: 'Dash',
        gridLineColor: '#f1f5f9',
        labels: { style: { fontSize: '10px', color: '#64748b' } }
      },
      legend: { enabled: false },
      credits: { enabled: false },
      plotOptions: {
        column: {
          stacking: 'normal', borderWidth: 0,
          pointPadding: 0.08, groupPadding: 0.08,
          borderRadius: 3, dataLabels: { enabled: false }
        }
      },
      tooltip: {
        shared: true, useHTML: true,
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderWidth: 1, borderColor: '#e2e8f0',
        borderRadius: 10, shadow: true,
        formatter: function () {
          const points = this.points || [];
          let html = `<div style="padding:8px;min-width:160px;">
            <div style="font-weight:700;color:#1e293b;font-size:11px;margin-bottom:6px;">
              ${Highcharts.dateFormat('%b %d, %Y • %H:%M', this.x as number)}
            </div>`;
          let total = 0;
          points.forEach((p: any) => {
            total += p.y;
            const color = p.series.name === 'Open' ? '#f43f5e' : '#64748b';
            html += `<div style="display:flex;justify-content:space-between;margin-bottom:3px;">
              <span style="font-size:11px;color:#64748b;display:flex;align-items:center;gap:5px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;"></span>
                ${p.series.name}
              </span>
              <span style="font-size:11px;font-weight:700;color:#1e293b;">${p.y}</span>
            </div>`;
          });
          if (points.length > 1 && total > 0) {
            html += `<div style="border-top:1px solid #f1f5f9;margin-top:6px;padding-top:5px;display:flex;justify-content:space-between;">
              <span style="font-size:11px;font-weight:600;color:#334155;">Total</span>
              <span style="font-size:11px;font-weight:800;color:#1e293b;">${total}</span>
            </div>`;
          }
          return html + '</div>';
        }
      },
      series: [
        {
          type: 'column', name: 'Open', data: openSeriesData,
          color: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, '#f43f5e'], [1, '#be123c']] } as any
        },
        {
          type: 'column', name: 'Closed', data: closedSeriesData,
          color: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, '#94a3b8'], [1, '#475569']] } as any
        }
      ]
    };

    setTimeout(() => {
      if (this.openClosedChartRef) {
        this.openClosedChartRef.destroy();
        this.openClosedChartRef = null;
      }
      const container = document.getElementById('problemTimelineChart');
      if (container) {
        this.openClosedChartRef = Highcharts.chart('problemTimelineChart', chartOptions);
      }
    }, 0);
  }

  scrollToProblemsTable() {
    const el = document.getElementById('problems-table-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ==================== END PROBLEM TABLE METHODS ====================

  getAppDbInfraMapping(): void {
    if (this.currentUser) {
      this.applicationService.getAppDbInfraMapping(this.currentUser).subscribe((response: any) => {
        this.dbInfraMapping = response.serviceResponse;

        if (this.isNavigatedFromInfra) {
          const app = this.dbInfraMapping.find((item: any) =>
            item.appInfra?.some((infra: any) => infra.ipAddress === this.selectedHostIp)
          );

          const infraType = app.appInfra?.length ? app.appInfra[0].ipType : null;

          this.mappedInfra = app.appInfra.filter(
            (infra: any) => infra.ipAddress === this.selectedHostIp
          );
          this.ipAddressId = this.mappedInfra[0].ipAddressId;

          if (app) {
            if (app.applicationName) {
              this.selectedAPMService = app.applicationName;
              this.selectedAPMServiceId = app.applicationId;
              this.encodedSelectedAPMService = btoa(this.selectedAPMService) + ".1";
              this.getThreshold('SERVICE');
            }
            if (app.databases) {
              this.mappedDatabases = app.databases;
              this.getThreshold('DB');
            }
          }
          this.getThreshold(infraType);
        } else {
          this.getThreshold('SERVICE');
          const app = this.dbInfraMapping.find(
            (item: any) => item.applicationName === this.selectedAPMService
          );

          if (app) {
            this.selectedAPMServiceId = app.applicationId;
            if (app.appInfra && app.appInfra.length > 0) {
              this.mappedInfra = app.appInfra;
              app.appInfra.forEach((infra: any) => {
                const ip = infra.ipAddress;
                const encodedIp = btoa(ip) + ".1";
                const ipAddressId = infra.ipAddressId;
                const type = infra.ipType;

                console.log("Infra Data: ", infra);

                const payload = {
                  appId: ipAddressId,
                  serviceId: encodedIp,
                  st: this.thresholdst,
                  et: this.endTime,
                  type: 'LINUX',
                };
                this.meteringConfigService.getThreshold(payload).subscribe(res => {
                    this.infraThresholdMap[ip] = res;
                    this.loadInfraCharts(ip);
                  });
              });
            }
            if (app.databases) {
              this.mappedDatabases = app.databases;
              this.getThreshold('DB');
            }
          }
        }
      });
    }
  }

  loadInfraCharts(ip: string) {
    this.getMemoryRam(ip);
    this.getMemorySwap(ip);
    this.getCpuLoad(ip);
    this.getNetworkBandwidthUsage(ip);
  }

  getThreshold(type: string) {
    if (type === 'SERVICE') {
      const payload = {
        appId: this.selectedAPMServiceId,
        serviceId: this.encodedSelectedAPMService,
        st: this.thresholdst,
        et: this.endTime,
        type: type,
      };
      this.meteringConfigService.getThreshold(payload)
        .subscribe(res => {
          this.appThreshold = res;
          this.getSuccessRateTimeValue();
          this.getServiceApdexTimeValue();
          this.getServiceLoadTimeValue();
        });
    } else if (type === 'LINUX' || type === 'WINDOWS') {
      const payload = {
        appId: this.ipAddressId,
        serviceId: this.encodedSelectedHostIp,
        st: this.thresholdst,
        et: this.endTime,
        type: type,
      };
      this.meteringConfigService.getThreshold(payload)
        .subscribe(res => {
          this.infraThresholdMap[this.selectedHostIp] = res;
          this.getSystemProperties(this.selectedHostIp);
          this.getMemoryRam(this.selectedHostIp);
          this.getMemorySwap(this.selectedHostIp);
          this.getCpuLoad(this.selectedHostIp);
          this.getNetworkBandwidthUsage(this.selectedHostIp);
        });
    } else if (type === 'DB') {
      this.mappedDatabases.forEach((db: any) => {
        const encodedDb = btoa(db.dbName) + ".1";
        const dbId = db.dbId
        const payload = {
          appId: dbId,
          serviceId: encodedDb,
          st: this.thresholdst,
          et: this.endTime,
          type: 'RELATIONAL',
        };
        this.meteringConfigService
          .getThreshold(payload)
          .subscribe(res => {
            this.dbThresholdMap[db.dbName] = res;
            const dbName = db.dbName.toLowerCase();
            if (dbName.startsWith("mysql")) {
              this.loadCurrentQPSgraph(db.dbName);
              this.loadSlowQueriesTrendGraph(db.dbName);
              this.loadCommandTrendGraph(db.dbName);
            } else if (dbName.startsWith("mssql")) {
              this.loadCurrentQPSgraphMssql(db.dbName);
              this.loadSlowQueriesTrendGraphMssql(db.dbName);
              this.loadCommandTrendGraphMssql(db.dbName);
            }
          });
      });
    }
  }

  sanitizeIp(ip: string) {
    return ip.replace(/\./g, '_');
  }

  parseTimeBucket(bucket: string): Date {
    const year = +bucket.slice(0, 4);
    const month = +bucket.slice(4, 6) - 1;
    const day = +bucket.slice(6, 8);
    const hour = +bucket.slice(8, 10);
    const minute = +bucket.slice(10, 12);
    return new Date(year, month, day, hour, minute);
  }

  syncCharts(charts: (Highcharts.Chart | undefined)[]) {
    let lastXValue: number | null = null;

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
      const points = chart.series?.map((s) => s.searchPoint(event, true))?.filter((p): p is Highcharts.Point => !!p) ?? [];
      if (!points.length) return;
      const xValue = points[0].x;
      if (xValue === lastXValue) return;
      lastXValue = xValue;
      updateChartsForX(xValue, event);
    };

    const throttledHandleMouseMove = throttleRAF(handleMouseMove);

    charts.forEach((chart) => {
      if (!chart?.container) return;
      chart.container.addEventListener('mousemove', (e) => throttledHandleMouseMove(e as MouseEvent, chart), { passive: true });
      chart.container.addEventListener('click', (e) => {
        if (!chart?.pointer) return;
        const event = chart.pointer.normalize(e as MouseEvent);
        const points = chart.series?.map((s) => s.searchPoint(event, true))?.filter((p): p is Highcharts.Point => !!p) ?? [];
        if (!points.length) return;
        updateChartsForX(points[0].x, event);
      });
      chart.container.addEventListener('mouseleave', () => {
        lastXValue = null;
        window.requestAnimationFrame(() => {
          charts.forEach((c) => {
            if (!c) return;
            c.tooltip?.hide();
            c.xAxis?.forEach((axis) => axis.hideCrosshair());
            c.series?.forEach((s) => {
              s.points?.forEach((p) => {
                const pTyped = p as Highcharts.Point & { state?: string };
                if (pTyped.state) window.requestAnimationFrame(() => pTyped.setState());
              });
            });
          });
        });
      }, { passive: true });
    });
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

  getSuccessRateTimeValue(): void {
    this.apmApiService.getSuccessRateTimeValue(this.encodedSelectedAPMService, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.successRate = data.successRate;
      const timeSeries = data.successRateTimeSeries;
      this.getsuccessRateTimeValueChart(timeSeries);
    });
  }

  getsuccessRateTimeValueChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(new Set(data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))));
      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      if (keys.length === 0) {
        if (this.successRateTimeValueChart) { this.successRateTimeValueChart.destroy(); this.successRateTimeValueChart = null; }
        const container = document.getElementById('successRateTimeValueChartContainer');
        if (container) container.innerHTML = '';
        this.isSuccessRateBreached = false;
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));
      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }
      const categories = parsedDates.map(date =>
        format === 'date' ? date.toLocaleDateString() : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      this.successRateTimestamps = parsedDates.map(date => date.getTime());
      const failureData = data.map(d => +(100 - Number(d[keys[0]])).toFixed(2));
      this.isSuccessRateBreached = failureData.some(val => val > 0);

      const series: Highcharts.SeriesColumnOptions[] = [
        { name: 'Failure', type: 'column', data: data.map(d => +(100 - Number(d[keys[0]])).toFixed(2)), color: '#DC4245', stacking: 'normal' },
        { name: 'Success', type: 'column', data: data.map(d => Number(d[keys[0]])), color: '#549958', stacking: 'normal' }
      ];

      setTimeout(() => {
        if (this.successRateTimeValueChart) this.successRateTimeValueChart.destroy();
        const baseline = this.appThreshold?.service_sla?.avgBaseline ?? null;
        const serviceThresholds = this.appThreshold?.service_sla;
        this.successRateTimeValueChart = Highcharts.chart('successRateTimeValueChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent', spacing: [10, 5, 5, 5], style: { fontSize: '10px' } },
          title: { text: undefined },
          xAxis: { categories, tickPositions: [0, categories.length - 1], title: { text: "" }, labels: { style: { color: labelColor, fontSize: '9px' }, y: 10, formatter: function () { return categories[this.pos]; } }, gridLineColor: gridColor, lineColor: gridColor, tickColor: gridColor },
          yAxis: { min: 0, max: 100, tickAmount: 6, title: { text: "" }, labels: { style: { color: labelColor, fontSize: '9px' } }, gridLineColor: gridColor, plotLines: baseline != null ? [{ value: baseline, color: '#7B4019', dashStyle: 'Dash', width: 2, zIndex: 5 }] : [] },
          tooltip: {
            shared: true, backgroundColor: tooltipBgColor, style: { color: tooltipTextColor, fontSize: '10px' }, formatter: function () {
              let s = `<b>${categories[this.x]}</b><br/>`;
              const warningVal = serviceThresholds?.warningValue ?? null;
              const criticalVal = serviceThresholds?.criticalValue ?? null;
              this.points?.forEach(point => {
                const y = point.y ?? 0;
                let marker = "";
                if (point.series.name === "Success") {
                  if (criticalVal !== null && y < criticalVal) marker = ` <span style="color:red">(C)</span>`;
                  else if (warningVal !== null && y < warningVal) marker = ` <span style="color:orange">(W)</span>`;
                }
                s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${y}%</b>${marker}<br/>`;
              });
              if (serviceThresholds?.avgBaseline !== undefined) s += `<span style="color:#7B4019">●</span> Baseline: <b>${serviceThresholds.avgBaseline}%</b><br/>`;
              return s;
            }
          },
          legend: { enabled: false },
          series: series as Highcharts.SeriesOptionsType[],
          credits: { enabled: false }, exporting: { enabled: false }
        });
        if (!this.charts.includes(this.successRateTimeValueChart)) { this.charts.push(this.successRateTimeValueChart); this.syncCharts(this.charts); }
      }, 0);
    } catch (e) { console.error("Error Occurred ", e); }
  }

  getServiceApdexTimeValue(): void {
    this.apmApiService.getServiceApdexTimeValue(this.encodedSelectedAPMService, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.apdexValue = data.apdex;
      const timeSeries = data.apdexTimeSeries;
      this.getServiceApdexTimeValueChart(timeSeries);
    });
  }

  getServiceApdexTimeValueChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      if (!data || data.length === 0) { if (this.ServiceApdexTimeValueChart) { this.ServiceApdexTimeValueChart.destroy(); this.ServiceApdexTimeValueChart = null; } return; }
      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));
      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) { const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime()); format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time'; }
      const categories = parsedDates.map(date => format === 'date' ? date.toLocaleDateString() : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      this.isApdexChart = false;
      const series: Highcharts.SeriesAreasplineOptions[] = [{ name: 'Apdex', type: 'areaspline', marker: { radius: 2 }, lineWidth: 1, fillOpacity: 0.3, data: data.map(d => { const y = Number(d['load']); let color; if (this.appThreshold?.service_apdex?.criticalValue != null && y < this.appThreshold.service_apdex.criticalValue) { color = 'red'; this.isApdexChart = true; } else if (this.appThreshold?.service_apdex?.warningValue != null && y < this.appThreshold.service_apdex.warningValue) { color = 'orange'; this.isApdexChart = true; } return { y, color }; }) }];
      setTimeout(() => {
        if (this.ServiceApdexTimeValueChart) this.ServiceApdexTimeValueChart.destroy();
        const baseline = this.appThreshold?.service_apdex?.avgBaseline;
        this.serviceApdexTimestamps = parsedDates.map(date => date.getTime());
        this.ServiceApdexTimeValueChart = Highcharts.chart('serviceApdexTimeValueChartContainer', {
          chart: { type: 'areaspline', backgroundColor: 'transparent', spacing: [5, 5, 5, 5], style: { fontSize: '10px' } },
          title: { text: undefined }, xAxis: { categories, tickPositions: [0, categories.length - 1], title: { text: "" }, labels: { style: { color: labelColor, fontSize: '9px' }, y: 10, formatter: function () { return categories[this.pos]; } }, gridLineColor: gridColor, lineColor: gridColor, tickColor: gridColor },
          yAxis: { min: 0, max: 1, tickAmount: 6, title: { text: "" }, labels: { style: { color: labelColor, fontSize: '9px' } }, gridLineColor: gridColor, plotLines: baseline != null ? [{ value: baseline, color: '#7B4019', dashStyle: 'Dash', width: 2, zIndex: 5 }] : [] },
          tooltip: { shared: true, backgroundColor: tooltipBgColor, style: { color: tooltipTextColor, fontSize: '10px' }, formatter: function () { const categories = this.series.chart.xAxis[0].categories; let s = `<b>${categories[this.x]}</b><br/>`; this.points?.forEach(point => { s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`; }); if (baseline !== undefined) s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline}</b><br/>`; return s; } },
          legend: { enabled: false }, series: series as Highcharts.SeriesOptionsType[], credits: { enabled: false }, exporting: { enabled: false }
        });
        if (!this.charts.includes(this.ServiceApdexTimeValueChart)) { this.charts.push(this.ServiceApdexTimeValueChart); this.syncCharts(this.charts); }
      }, 0);
    } catch (e) { console.error("Error Occurred ", e); }
  }

  getServiceLoadTimeValue(): void {
    this.apmApiService.getServiceLoadTimeValue(this.encodedSelectedAPMService, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.avgLoadValue = data.load;
      const timeSeries = data.loadTimeSeries;
      this.getserviceLoadTimeValueChart(timeSeries);
    });
  }

  getserviceLoadTimeValueChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(new Set(data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))));
      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      if (keys.length === 0) {
        if (this.serviceLoadTimeValueChart) { this.serviceLoadTimeValueChart.destroy(); this.serviceLoadTimeValueChart = null; }
        const container = document.getElementById('serviceLoadTimeValueChartContainer');
        if (container) container.innerHTML = '';
        this.isServiceLoadBreached = false;
        return;
      }
      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));
      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) { const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime()); format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time'; }
      const categories = parsedDates.map(date => format === 'date' ? date.toLocaleDateString() : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      let isServiceLoadBreached = false;
      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({ name: key, type: 'spline', marker: { radius: 2 }, lineWidth: 1, data: data.map(d => { const y = Number(d[key]); let color: string | undefined; if (this.appThreshold?.service_cpm?.criticalValue != null && y > this.appThreshold.service_cpm.criticalValue) { color = 'red'; isServiceLoadBreached = true; } else if (this.appThreshold?.service_cpm?.warningValue != null && y > this.appThreshold.service_cpm.warningValue) { color = 'orange'; isServiceLoadBreached = true; } return { y, color }; }) }));
      this.isServiceLoadBreached = isServiceLoadBreached;
      setTimeout(() => {
        if (this.serviceLoadTimeValueChart) this.serviceLoadTimeValueChart.destroy();
        const baseline = this.appThreshold?.service_cpm?.avgBaseline;
        this.serviceLoadTimestamps = parsedDates.map(date => date.getTime());
        this.serviceLoadTimeValueChart = Highcharts.chart('serviceLoadTimeValueChartContainer', {
          chart: { type: 'spline', backgroundColor: 'transparent', spacing: [5, 5, 5, 5], style: { fontSize: '10px' } },
          title: { text: undefined }, xAxis: { categories, tickPositions: [0, categories.length - 1], title: { text: "" }, labels: { style: { color: labelColor, fontSize: '9px' }, y: 10, formatter: function () { return categories[this.pos]; } }, gridLineColor: gridColor, lineColor: gridColor, tickColor: gridColor },
          yAxis: { min: 0, tickAmount: 6, title: { text: "" }, labels: { style: { color: labelColor, fontSize: '9px' } }, gridLineColor: gridColor, plotLines: baseline != null ? [{ value: baseline, color: '#7B4019', dashStyle: 'Dash', width: 2, zIndex: 5 }] : [] },
          tooltip: { shared: true, backgroundColor: tooltipBgColor, style: { color: tooltipTextColor, fontSize: '10px' }, formatter: function () { const categories = this.series.chart.xAxis[0].categories; let s = `<b>${categories[this.x]}</b><br/>`; this.points?.forEach(point => { s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y} call/min</b><br/>`; }); if (baseline !== undefined) s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline} call/min</b><br/>`; return s; } },
          legend: { enabled: false }, series: series as Highcharts.SeriesOptionsType[], credits: { enabled: false }, exporting: { enabled: false }
        });
        if (!this.charts.includes(this.serviceLoadTimeValueChart)) { this.charts.push(this.serviceLoadTimeValueChart); this.syncCharts(this.charts); }
      }, 0);
    } catch (e) { console.error("Error Occurred ", e); }
  }

  getMemoryRam(ip: any): void {
    const encodedIp = btoa(ip) + ".1";
    this.infraService.getMemoryRam(encodedIp, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const parsedData = data.map((d: any) => ({ ...d, timestamp: new Date(d.time_bucket.substring(0, 4), Number(d.time_bucket.substring(4, 6)) - 1, Number(d.time_bucket.substring(6, 8)), Number(d.time_bucket.substring(8, 10)), Number(d.time_bucket.substring(10, 12))).getTime() }));
      this.lastMemoryData = parsedData;
      this.chartValuesRam = this.getSelectedMetricValues(this.lastMemoryData || [], ip);
      this.chartMemoryRam(parsedData, ip);
      this.zone.runOutsideAngular(() => { setTimeout(() => { this.memoryRamChartInstance[ip] = Highcharts.chart('memoryRamChart_' + this.sanitizeIp(ip), this.memoryRamChart[ip]!); if (!this.charts.includes(this.memoryRamChartInstance[ip])) { this.charts.push(this.memoryRamChartInstance[ip]); this.syncCharts(this.charts); } }, 50); });
    });
  }

  chartDropdownToMetricKey: { [key: string]: string } = { total: 'meter_vm_memory_total', available: 'meter_vm_memory_available', buff: 'meter_vm_memory_buff_cache', used: 'meter_vm_memory_used' };
  metricKeys = ['meter_vm_memory_total', 'meter_vm_memory_available', 'meter_vm_memory_buff_cache', 'meter_vm_memory_used'];
  metricMap: { [key: string]: string } = { meter_vm_memory_total: 'Total', meter_vm_memory_available: 'Available', meter_vm_memory_buff_cache: 'Buff/Cache', meter_vm_memory_used: 'Used' };
  badges: { [key: string]: { warning: number, critical: number, warningColor: string, criticalColor: string } } = {};
  badgeMetricKeys = ['meter_vm_memory_available', 'meter_vm_memory_buff_cache', 'meter_vm_memory_used'];

  bytesToMB(v: number) { return v / (1024 * 1024); }

  chartMemoryRam(data: { time_bucket: string;[key: string]: any }[], ip: any): void {
    try {
      if (!data?.length) { this.memoryRamChart[ip] = null; return; }
      const CRITICAL_COLOR = 'red';
      const WARNING_COLOR = 'orange';
      this.badges = {};
      this.isMemoryRamGraph[ip] = false;
      data.forEach(d => {
        const total = d['meter_vm_memory_total'];
        const available = d['meter_vm_memory_available'];
        const used = d['meter_vm_memory_used'];
        if (!total || !available || !used) return;
        const availablePercent = (available / total) * 100;
        const usedPercent = (used / total) * 100;
        if (!this.badges['meter_vm_memory_available']) this.badges['meter_vm_memory_available'] = { warning: 20, critical: 10, warningColor: 'gray', criticalColor: 'gray' };
        if (availablePercent < 10) { this.badges['meter_vm_memory_available'].criticalColor = CRITICAL_COLOR; this.isMemoryRamGraph[ip] = true; }
        else if (availablePercent < 20) { this.badges['meter_vm_memory_available'].warningColor = WARNING_COLOR; this.isMemoryRamGraph[ip] = true; }
        if (!this.badges['meter_vm_memory_used']) this.badges['meter_vm_memory_used'] = { warning: 80, critical: 90, warningColor: 'gray', criticalColor: 'gray' };
        if (usedPercent > 90 && availablePercent < 10) { this.badges['meter_vm_memory_used'].criticalColor = CRITICAL_COLOR; this.isMemoryRamGraph[ip] = true; }
        else if (usedPercent > 80 && availablePercent < 20) { this.badges['meter_vm_memory_used'].warningColor = WARNING_COLOR; this.isMemoryRamGraph[ip] = true; }
      });
      const defaultColors: { [key: string]: string } = { meter_vm_memory_total: '#023e8a', meter_vm_memory_available: '#480ca8', meter_vm_memory_buff_cache: '#679436', meter_vm_memory_used: '#5390d9' };
      const series: Highcharts.SeriesSplineOptions[] = this.metricKeys.map(key => ({ name: this.metricMap[key], type: 'spline', lineWidth: 1, color: defaultColors[key], marker: { enabled: true, radius: 2, symbol: 'circle', states: { hover: { radius: 3, halo: { size: 4, opacity: 0.15 } } } }, data: data.map(d => { const valueMB = typeof d[key] === 'number' ? d[key] : null; const total = d['meter_vm_memory_total']; const available = d['meter_vm_memory_available']; const used = d['meter_vm_memory_used']; const availablePercent = total ? (available / total) * 100 : 0; const usedPercent = total ? (used / total) * 100 : 0; if (valueMB === null) return { x: this.convertTimebucket(d.time_bucket), y: null }; let status: 'C' | 'W' | '' = ''; let markerColor = defaultColors[key]; if (key === 'meter_vm_memory_available') { if (availablePercent < 10) { status = 'C'; markerColor = CRITICAL_COLOR; } else if (availablePercent < 20) { status = 'W'; markerColor = WARNING_COLOR; } } if (key === 'meter_vm_memory_used') { if (usedPercent > 90 && availablePercent < 10) { status = 'C'; markerColor = CRITICAL_COLOR; } else if (usedPercent > 80 && availablePercent < 20) { status = 'W'; markerColor = WARNING_COLOR; } } return { x: this.convertTimebucket(d.time_bucket), y: valueMB, status, marker: { enabled: true, fillColor: markerColor, lineColor: markerColor, lineWidth: 1, radius: status ? 2 : 2 } }; }) }));
      const selectedKey = this.chartDropdownToMetricKey[this.chartData_criteriaForMemoryRam];
      series.forEach(s => { if (this.chartData_criteriaForMemoryRam === 'all') { (s as any).lineWidth = 1.5; (s as any).zIndex = 5; (s as any).opacity = 1; } else if (s.name === this.metricMap[selectedKey]) { (s as any).lineWidth = 2.5; (s as any).zIndex = 10; (s as any).opacity = 1; } else { (s as any).lineWidth = 1; (s as any).zIndex = 1; (s as any).opacity = 0.6; } });
      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim() || '#030303';
      const gridColor = styles.getPropertyValue('--border-color').trim() || '#ede8e8';
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim() || '#fff';
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim() || '#000';
      this.memoryRamChart[ip] = { chart: { type: 'line', backgroundColor: 'transparent', spacing: [5, 5, 5, 5], style: { fontSize: '8px' } }, title: { text: undefined }, xAxis: { type: 'datetime', crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' }, labels: { style: { color: labelColor, fontSize: '8px' } }, gridLineColor: gridColor, lineColor: '#cccccc', tickColor: '#cccccc', tickLength: 5, tickWidth: 1 }, yAxis: { min: 0, tickAmount: 6, title: { text: undefined }, labels: { style: { color: labelColor, fontSize: '8px' } }, gridLineColor: gridColor }, tooltip: { shared: true, useHTML: true, backgroundColor: tooltipBgColor, style: { color: tooltipTextColor, fontSize: '10px' }, xDateFormat: '%Y-%m-%d %H:%M', formatter: function () { const ctx = this as any; let tooltipHtml = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', ctx.x)}</b><br/>`; const totalPoint = ctx.points?.find((p: any) => p.series.name === 'Total'); const total = totalPoint?.y ?? null; ctx.points?.forEach((p: any) => { let statusColor = ''; const status = p.point?.status || ''; if (status === 'C') statusColor = CRITICAL_COLOR; else if (status === 'W') statusColor = WARNING_COLOR; let percentText = ''; if (total && (p.series.name === 'Available' || p.series.name === 'Used')) { const percent = ((p.y / total) * 100).toFixed(1); percentText = ` (${percent}%)`; } tooltipHtml += `<span style="color:${p.series.color}">●</span> ${p.series.name}: ${p.y?.toFixed(2)} MB${percentText} ${status ? `<span style="color:${statusColor}"> (${status})</span>` : ''}<br/>`; }); return tooltipHtml; } }, legend: { enabled: false }, series: series as Highcharts.SeriesOptionsType[], credits: { enabled: false } };
      const lastRecord = [...data].reverse().find(d => typeof d?.['meter_vm_memory_total'] === 'number' && d['meter_vm_memory_total'] > 0);
      const total = lastRecord?.['meter_vm_memory_total'];
      if (total && this.chart_criteriaForMemoryRam === 'threshold') {
        if (this.chartData_criteriaForMemoryRam === 'available') this.chartValuesRam = { warning: total * 0.20, critical: total * 0.10 };
        else if (this.chartData_criteriaForMemoryRam === 'used') this.chartValuesRam = { warning: total * 0.80, critical: total * 0.90 };
      } else { this.chartValuesRam = this.getSelectedMetricValues(data, ip); }
    } catch (e) { console.error("Error Occurred in Memory RAM Chart", e); }
  }

  getMemorySwap(ip: any): void {
    const encodedIp = btoa(ip) + ".1";
    this.infraService.getMemorySwap(encodedIp, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      data.forEach((d: any) => { d.meter_vm_memory_swap_used = d.meter_vm_memory_swap_total - d.meter_vm_memory_swap_free; });
      this.lastSwapData = data;
      this.chartMemorySwap(data, ip);
      this.zone.runOutsideAngular(() => { setTimeout(() => { this.memorySwapChartInstance[ip] = Highcharts.chart('memorySwapChart_' + this.sanitizeIp(ip), this.memorySwapChart[ip]!); if (!this.charts.includes(this.memorySwapChartInstance[ip])) { this.charts.push(this.memorySwapChartInstance[ip]); this.syncCharts(this.charts); } }, 50); });
    });
  }

  chartDropdownToMetricKeySwap: { [key: string]: string } = { totalSwap: 'meter_vm_memory_swap_total', free: 'meter_vm_memory_swap_free', usedSwap: 'meter_vm_memory_swap_used' };
  badgeSwapMetricKeys = ['meter_vm_memory_swap_used', 'meter_vm_memory_swap_free'];
  swapMetricKeys = ['meter_vm_memory_swap_total', 'meter_vm_memory_swap_free', 'meter_vm_memory_swap_used'];
  swapMetricMap: { [key: string]: string } = { meter_vm_memory_swap_total: 'Total', meter_vm_memory_swap_free: 'Free', meter_vm_memory_swap_used: 'Used' };
  badgesSwap: { [key: string]: { warning: number, critical: number, warningColor: string, criticalColor: string } } = {};
  showSwapBadgeDropdown = false;
  toggleSwapBadgeDropdown() { this.showSwapBadgeDropdown = !this.showSwapBadgeDropdown; }

  chartMemorySwap(data: { time_bucket: string;[key: string]: any }[], ip: any): void {
    try {
      if (!data?.length) { this.memorySwapChart[ip] = null; return; }
      const CRITICAL_COLOR = 'red'; const WARNING_COLOR = 'orange';
      const last = [...data].reverse().find(d => typeof d?.['meter_vm_memory_swap_total'] === 'number' && d['meter_vm_memory_swap_total'] > 0);
      const total = last?.['meter_vm_memory_swap_total'];
      if (total) { this.thresholds['meter_vm_memory_swap_free'] = { warningValue: total * 0.30, criticalValue: total * 0.10, warningColor: 'gray', criticalColor: 'gray' }; this.thresholds['meter_vm_memory_swap_used'] = { warningValue: total * 0.70, criticalValue: total * 0.90, warningColor: 'gray', criticalColor: 'gray' }; }
      this.swapMetricKeys.forEach(key => {
        if (key === 'meter_vm_memory_swap_total') { this.badgesSwap[key] = { warning: 0, critical: 0, warningColor: 'gray', criticalColor: 'gray' }; return; }
        const threshold = this.thresholds[key]; if (!threshold) return;
        const warningVal = threshold.warningValue; const criticalVal = threshold.criticalValue;
        let anyWarning = false; let anyCritical = false;
        data.forEach(d => {
          if (d[key] == null && key !== 'meter_vm_memory_swap_used') return;
          if (key === 'meter_vm_memory_swap_used' && (d['meter_vm_memory_swap_total'] == null || d['meter_vm_memory_swap_free'] == null)) return;
          const valueMB = key === 'meter_vm_memory_swap_used' ? d['meter_vm_memory_swap_total'] - d['meter_vm_memory_swap_free'] : d[key];
          if (key === 'meter_vm_memory_swap_free') { if (valueMB <= criticalVal) anyCritical = true; else if (valueMB <= warningVal) anyWarning = true; } else { if (valueMB >= criticalVal) anyCritical = true; else if (valueMB >= warningVal) anyWarning = true; }
        });
        this.isMemorySwapGraph[ip] = anyWarning || anyCritical;
        this.badgesSwap[key] = { warning: warningVal, critical: criticalVal, warningColor: anyWarning ? WARNING_COLOR : 'gray', criticalColor: anyCritical ? CRITICAL_COLOR : 'gray' };
      });
      const defaultColors: { [key: string]: string } = { meter_vm_memory_swap_total: '#45ba6a', meter_vm_memory_swap_free: '#7d8597', meter_vm_memory_swap_used: '#7dc8fe' };
      const series: Highcharts.SeriesAreasplineOptions[] = this.swapMetricKeys.map(key => ({ name: this.swapMetricMap[key], type: 'areaspline', lineWidth: 1, marker: { radius: 2, symbol: 'circle', states: { hover: { radius: 2, halo: { size: 4, opacity: 0.15 } } } }, color: defaultColors[key], fillOpacity: 0.3, data: data.map(d => { let valueMB: number | null = null; if (key === 'meter_vm_memory_swap_used') { if (d['meter_vm_memory_swap_total'] != null && d['meter_vm_memory_swap_free'] != null) valueMB = d['meter_vm_memory_swap_total'] - d['meter_vm_memory_swap_free']; } else if (d[key] != null) { valueMB = d[key]; } if (valueMB == null) return { x: this.convertTimebucket(d.time_bucket), y: null }; const value = valueMB; let status: 'C' | 'W' | '' = ''; let markerColor: string | undefined; const thr = (key !== 'meter_vm_memory_swap_total') ? this.thresholds[key] : null; if (thr) { const warningVal = thr.warningValue; const criticalVal = thr.criticalValue; if (key === 'meter_vm_memory_swap_free') { if (value <= criticalVal) { status = 'C'; markerColor = CRITICAL_COLOR; } else if (value <= warningVal) { status = 'W'; markerColor = WARNING_COLOR; } } if (key === 'meter_vm_memory_swap_used') { if (value >= criticalVal) { status = 'C'; markerColor = CRITICAL_COLOR; } else if (value >= warningVal) { status = 'W'; markerColor = WARNING_COLOR; } } } return { x: this.convertTimebucket(d.time_bucket), y: valueMB, status, marker: markerColor ? { fillColor: markerColor, lineColor: markerColor, radius: 2 } : { enabled: false } }; }) }));
      const selectedKey = this.chartDropdownToMetricKeySwap[this.chartData_criteriaForMemorySwap];
      series.forEach(s => { if (this.chartData_criteriaForMemorySwap === 'all') { (s as any).lineWidth = 1.5; (s as any).zIndex = 5; } else if (s.name === this.swapMetricMap[selectedKey]) { (s as any).lineWidth = 2.5; (s as any).zIndex = 10; } else { (s as any).lineWidth = 1; (s as any).zIndex = 1; (s as any).opacity = 0.6; } });
      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim() || '#030303'; const gridColor = styles.getPropertyValue('--border-color').trim() || '#ede8e8'; const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim() || '#fff'; const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim() || '#000';
      this.memorySwapChart[ip] = { chart: { type: 'line', backgroundColor: 'transparent', spacing: [5, 5, 5, 5], style: { fontSize: '8px' } }, title: { text: undefined }, xAxis: { type: 'datetime', crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' }, labels: { style: { color: labelColor, fontSize: '8px' } }, gridLineColor: gridColor, lineColor: '#cccccc', tickColor: '#cccccc', tickLength: 5, tickWidth: 1 }, yAxis: { min: 0, tickAmount: 6, title: { text: '' }, labels: { style: { color: labelColor, fontSize: '8px' } }, gridLineColor: gridColor }, tooltip: { shared: true, useHTML: true, backgroundColor: tooltipBgColor, style: { color: tooltipTextColor, fontSize: '10px' }, xDateFormat: '%Y-%m-%d %H:%M', formatter: function () { const ctx = this as any; let tooltipHtml = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', ctx.x)}</b><br/>`; const totalPoint = ctx.points?.find((p: any) => p.series.name === 'Total'); const total = totalPoint?.y ?? null; ctx.points?.forEach((p: any) => { const point = p.point as any; const value = point.y; let statusColor = ''; if (point.status === 'C') statusColor = 'red'; else if (point.status === 'W') statusColor = 'orange'; let percentText = ''; if (total && (p.series.name === 'Free' || p.series.name === 'Used')) { const percent = ((value / total) * 100).toFixed(1); percentText = ` (${percent}%)`; } tooltipHtml += `<span style="color:${p.series.color}">●</span> ${p.series.name}: ${value?.toFixed(2)} MB${percentText} ${point.status ? `<span style="color:${statusColor}"> (${point.status})</span>` : ''}<br/>`; }); return tooltipHtml; } }, legend: { enabled: false }, series: series as Highcharts.SeriesOptionsType[], credits: { enabled: false } };
      if (this.chart_criteriaForMemorySwap === 'threshold' && total) {
        if (this.chartData_criteriaForMemorySwap === 'free') this.chartValuesSwap = { warning: total * 0.30, critical: total * 0.10 };
        else if (this.chartData_criteriaForMemorySwap === 'usedSwap') this.chartValuesSwap = { warning: total * 0.70, critical: total * 0.90 };
      } else { this.chartValuesSwap = this.getSelectedMetricValuesSwap(data, ip); }
    } catch (e) { console.error("Error in Memory Swap Chart", e); }
  }

  getCpuLoad(ip: any): void {
    const encodedIp = btoa(ip) + ".1";
    this.infraService.getCpuLoad(encodedIp, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.lastCpuData = data;
      this.chartAvgCpuLoad(data, ip);
      this.zone.runOutsideAngular(() => { setTimeout(() => { this.cpuLoadChartInstance[ip] = Highcharts.chart('avgCpuLoadChart_' + this.sanitizeIp(ip), this.avgCpuLoadChart[ip]!); if (!this.charts.includes(this.cpuLoadChartInstance[ip])) { this.charts.push(this.cpuLoadChartInstance[ip]); this.syncCharts(this.charts); } }, 50); });
    });
  }

  chartDropdownToMetricKeyCpu: { [key: string]: string } = { load_1: 'meter_vm_cpu_load1', load_5: 'meter_vm_cpu_load5', load_15: 'meter_vm_cpu_load15' };
  badgeLoadKeys = ['meter_vm_cpu_load1', 'meter_vm_cpu_load5', 'meter_vm_cpu_load15'];
  metricLoadKeys = ['meter_vm_cpu_load1', 'meter_vm_cpu_load5', 'meter_vm_cpu_load15'];
  metricLoadMap: { [key: string]: string } = { meter_vm_cpu_load1: 'Load_1', meter_vm_cpu_load5: 'Load_5', meter_vm_cpu_load15: 'Load_15' };
  showLoadBadgeDropdown = false;
  showCpuLoadThreshold = false;
  badgesLoad: { [key: string]: { warning: number, critical: number, warningColor: string, criticalColor: string } } = {};
  toggleLoadBadgeDropdown() { this.showLoadBadgeDropdown = !this.showLoadBadgeDropdown; }

  chartAvgCpuLoad(data: { time_bucket: string;[key: string]: any }[], ip: any): void {
    try {
      if (!data.length) { this.avgCpuLoadChart[ip] = null; return; }
      const CRITICAL_COLOR = 'red'; const WARNING_COLOR = 'orange';
      const warning = this.logicalCoresMap[ip] * 0.75; const critical = this.logicalCoresMap[ip] * 1.0;
      const anyCritical = data.some(d => this.getCpuLoadStatus(d, ip) === 'C'); const anyWarning = !anyCritical && data.some(d => this.getCpuLoadStatus(d, ip) === 'W');
      this.metricLoadKeys.forEach(key => { this.badgesLoad[key] = { warning, critical, warningColor: anyWarning ? WARNING_COLOR : 'gray', criticalColor: anyCritical ? CRITICAL_COLOR : 'gray' }; });
      this.isCpuLoadGraph[ip] = data.some(d => this.getCpuLoadStatus(d, ip) !== '');
      const defaultColors: { [key: string]: string } = { meter_vm_cpu_load1: '#7dc8feff', meter_vm_cpu_load5: '#7d8597', meter_vm_cpu_load15: '#45ba6a' };
      const series: Highcharts.SeriesAreasplineOptions[] = this.metricLoadKeys.map((key) => ({ name: this.metricLoadMap[key], type: 'areaspline', lineWidth: 1, marker: { radius: 2, symbol: 'circle', states: { hover: { radius: 3, halo: { size: 4, opacity: 0.15 } } } }, color: defaultColors[key], fillOpacity: 0.3, data: data.map(d => { const value = typeof d[key] === 'number' ? d[key] : null; if (value === null) return { x: this.convertTimebucket(d.time_bucket), y: null }; let status: 'C' | 'W' | '' = ''; let markerColor = defaultColors[key]; if (value >= critical) { status = 'C'; markerColor = CRITICAL_COLOR; } else if (value >= warning) { status = 'W'; markerColor = WARNING_COLOR; } return { x: this.convertTimebucket(d.time_bucket), y: value, status, cores: this.logicalCores, marker: { fillColor: markerColor, lineColor: markerColor, lineWidth: 1, radius: 2 } }; }) }));
      const selectedKey = this.chartDropdownToMetricKeyCpu[this.chartData_criteriaForCpuLoad];
      series.forEach(s => { if (this.chartData_criteriaForCpuLoad === 'all') { (s as any).lineWidth = 1.5; (s as any).zIndex = 5; } else if (s.name === this.metricLoadMap[selectedKey]) { (s as any).lineWidth = 2.5; (s as any).zIndex = 10; } else { (s as any).lineWidth = 1; (s as any).zIndex = 1; (s as any).opacity = 0.6; } });
      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim() || '#030303'; const gridColor = styles.getPropertyValue('--border-color').trim() || '#ede8e8'; const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim() || '#fff'; const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim() || '#000';
      this.avgCpuLoadChart[ip] = { chart: { type: 'spline', backgroundColor: 'transparent', spacing: [5, 5, 5, 5], style: { fontSize: '8px' } }, title: { text: undefined }, xAxis: { type: 'datetime', crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' }, labels: { style: { color: labelColor, fontSize: '8px' } }, gridLineColor: gridColor, lineColor: '#ccc', tickColor: '#ccc', tickLength: 5, tickWidth: 1 }, yAxis: { min: 0, tickAmount: 6, title: { text: '' }, labels: { style: { color: labelColor, fontSize: '8px' } }, gridLineColor: gridColor }, tooltip: { shared: true, useHTML: true, backgroundColor: tooltipBgColor, style: { color: tooltipTextColor, fontSize: '10px' }, xDateFormat: '%Y-%m-%d %H:%M', formatter: function () { let tooltipHtml = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/>`; this.points?.forEach((p: any) => { const point = p.point as any; const cores = point.cores || 1; const percent = point.y != null ? (point.y / cores) * 100 : 0; const statusColor = point.status === 'C' ? 'red' : point.status === 'W' ? 'orange' : ''; tooltipHtml += `<span style="color:${p.series.color}">●</span> ${p.series.name}: ${point.y?.toFixed(2)} <span style="color:#666;">(${percent.toFixed(1)}%)</span> ${point.status ? `<span style="color:${statusColor}">(${point.status})</span>` : ''}<br/>`; }); return tooltipHtml; } }, legend: { enabled: false }, series: series as Highcharts.SeriesOptionsType[], credits: { enabled: false } };
      this.chartValuesCpuLoad = this.getSelectedMetricValuesCpuLoad(data, ip);
    } catch (e) { console.error('Error in CPU Load Chart', e); }
  }

  getCpuLoadStatus(d: any, ip: any): '' | 'W' | 'C' {
    const load1 = d.meter_vm_cpu_load1 ?? 0; const load5 = d.meter_vm_cpu_load5 ?? 0; const load15 = d.meter_vm_cpu_load15 ?? 0;
    const warning = this.logicalCoresMap[ip] * 0.75; const critical = this.logicalCoresMap[ip] * 1.0;
    if (load15 >= critical || (load5 >= critical && load15 >= warning)) return 'C';
    if (load5 >= warning && load1 >= warning) return 'W';
    return '';
  }

  getNetworkBandwidthUsage(ip: any): void {
    const encodedIp = btoa(ip) + ".1";
    this.infraService.getNetworkBandwidthUsage(encodedIp, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.lastNetworkData = data;
      this.chartNetworkBandwidthUsage(data, ip);
      this.zone.runOutsideAngular(() => { setTimeout(() => { this.networkBandwidthChartInstance[ip] = Highcharts.chart('networkBandwidthUsageChart_' + this.sanitizeIp(ip), this.networkBandwidthUsageChart[ip]!); if (!this.charts.includes(this.networkBandwidthChartInstance[ip])) { this.charts.push(this.networkBandwidthChartInstance[ip]); this.syncCharts(this.charts); } }, 50); });
    });
  }

  chartDropdownToMetricKeyNetwork: { [key: string]: string } = { all: 'all', receive: 'meter_vm_network_receive', transmit: 'meter_vm_network_transmit', traffic: 'network_traffic' };
  badgeNetworkKeys = ['meter_vm_network_receive', 'meter_vm_network_transmit', 'network_traffic'];
  networkKeyMap: { [key: string]: string } = { meter_vm_network_receive: 'Receive', meter_vm_network_transmit: 'Transmit', network_traffic: 'Traffic' };
  showNetworkBadgeDropdown = false;
  showNetworkThreshold = false;
  networkBadges: { [key: string]: { warning: number, critical: number, warningColor: string, criticalColor: string } } = {};
  toggleNetworkDropdown() { this.showNetworkBadgeDropdown = !this.showNetworkBadgeDropdown; }

  chartNetworkBandwidthUsage(data: { time_bucket: string;[key: string]: any }[], ip: any): void {
    try {
      if (!data?.length) { this.networkBandwidthUsageChart[ip] = null; this.isNetworkBandwidthGraph[ip] = false; return; }
      const infraThreshold = this.infraThresholdMap[ip]; if (!infraThreshold) return;
      const CRITICAL_COLOR = 'red'; const WARNING_COLOR = 'orange';
      this.badgeNetworkKeys.forEach(key => {
        let warning = ((infraThreshold[key]?.warningValue ?? 0) / 1024); let critical = ((infraThreshold[key]?.criticalValue ?? 0) / 1024);
        if (key === 'network_traffic') { const tx = infraThreshold['meter_vm_network_transmit']; const rx = infraThreshold['meter_vm_network_receive']; if (tx && rx) { warning = (tx.warningValue + rx.warningValue); critical = (tx.criticalValue + rx.criticalValue); } }
        const anyWarning = data.some(d => { const value = key === 'network_traffic' ? ((d['meter_vm_network_transmit'] ?? 0) + (d['meter_vm_network_receive'] ?? 0)) : (d[key] ?? 0); return value >= warning && value < critical; });
        const anyCritical = data.some(d => { const value = key === 'network_traffic' ? ((d['meter_vm_network_transmit'] ?? 0) + (d['meter_vm_network_receive'] ?? 0)) : (d[key] ?? 0); return value >= critical; });
        this.networkBadges[key] = { warning, critical, warningColor: anyWarning ? WARNING_COLOR : 'gray', criticalColor: anyCritical ? CRITICAL_COLOR : 'gray' };
      });
      this.isNetworkBandwidthGraph[ip] = this.badgeNetworkKeys.some(key => this.networkBadges[key].warningColor === WARNING_COLOR || this.networkBadges[key].criticalColor === CRITICAL_COLOR);
      const defaultColors: { [key: string]: string } = { meter_vm_network_receive: '#7dc8feff', meter_vm_network_transmit: '#7d8597', network_traffic: '#45ba6a' };
      const series: Highcharts.SeriesSplineOptions[] = Object.keys(this.networkKeyMap).map(key => {
        const thresholdWarning = key === 'network_traffic' ? ((infraThreshold['meter_vm_network_transmit']?.warningValue ?? 0) + (infraThreshold['meter_vm_network_receive']?.warningValue ?? 0)) : (infraThreshold[key]?.warningValue ?? 0);
        const thresholdCritical = key === 'network_traffic' ? ((infraThreshold['meter_vm_network_transmit']?.criticalValue ?? 0) + (infraThreshold['meter_vm_network_receive']?.criticalValue ?? 0)) : (infraThreshold[key]?.criticalValue ?? 0);
        return { name: this.networkKeyMap[key], type: 'spline', lineWidth: 1, color: defaultColors[key], marker: { radius: 2 }, data: data.map(d => { const rawValue = key === 'network_traffic' ? ((d['meter_vm_network_transmit'] ?? 0) + (d['meter_vm_network_receive'] ?? 0)) : (d[key] ?? 0); const hasValue = key === 'network_traffic' ? (d['meter_vm_network_transmit'] != null || d['meter_vm_network_receive'] != null) : (d[key] != null); const plotValue = hasValue ? rawValue : null; let status: 'C' | 'W' | '' = ''; let markerColor = defaultColors[key]; if (hasValue && thresholdCritical && rawValue >= thresholdCritical) { status = 'C'; markerColor = CRITICAL_COLOR; } else if (hasValue && thresholdWarning && rawValue >= thresholdWarning) { status = 'W'; markerColor = WARNING_COLOR; } return { x: this.convertTimebucket(d.time_bucket), y: plotValue, status, marker: { fillColor: markerColor, lineColor: markerColor, lineWidth: 1, radius: 2 } }; }) };
      });
      const selectedKey = this.chartDropdownToMetricKeyNetwork[this.chartData_criteriaForNetworkBandwidth];
      series.forEach(s => { const seriesKey = Object.keys(this.networkKeyMap).find(k => this.networkKeyMap[k] === s.name); if (!seriesKey) return; if (this.chartData_criteriaForNetworkBandwidth === 'all') { (s as any).lineWidth = 1.5; (s as any).zIndex = 5; (s as any).opacity = 1; } else if (seriesKey === selectedKey) { (s as any).lineWidth = 2.5; (s as any).zIndex = 10; (s as any).opacity = 1; } else { (s as any).lineWidth = 1; (s as any).zIndex = 1; (s as any).opacity = 0.6; } });
      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim() || '#333'; const gridColor = styles.getPropertyValue('--border-color').trim() || '#ddd'; const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim() || '#fff'; const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim() || '#000';
      this.networkBandwidthUsageChart[ip] = { chart: { type: 'line', backgroundColor: 'transparent', spacing: [5, 5, 5, 5], style: { fontSize: '8px' } }, title: { text: undefined }, xAxis: { type: 'datetime', crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' }, labels: { style: { color: labelColor, fontSize: '8px' } }, gridLineColor: gridColor, lineColor: '#ccc', tickColor: '#ccc', tickLength: 5, tickWidth: 1 }, yAxis: { min: 0, tickAmount: 6, title: { text: '' }, labels: { style: { color: labelColor, fontSize: '8px' } }, gridLineColor: gridColor }, tooltip: { shared: true, useHTML: true, backgroundColor: tooltipBgColor, style: { color: tooltipTextColor, fontSize: '10px' }, xDateFormat: '%Y-%m-%d %H:%M', formatter: function () { let tooltipHtml = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/>`; this.points?.forEach((p: any) => { const point = p.point as any; const statusColor = point.status === 'C' ? CRITICAL_COLOR : (point.status === 'W' ? WARNING_COLOR : ''); tooltipHtml += `<span style="color:${p.series.color}">●</span> ${p.series.name}: ${point.y?.toFixed(2)} ${point.status ? `<span style="color:${statusColor}">(${point.status})</span>` : ''}<br/>`; }); return tooltipHtml; } }, legend: { enabled: false }, series: series as Highcharts.SeriesOptionsType[], credits: { enabled: false } };
      if (!this.networkBandwidthChartInstance[ip]) return;
      else this.networkBandwidthChartInstance[ip].update(this.networkBandwidthUsageChart[ip] as Highcharts.Options, true, true);
      this.chartValuesNetworkBandwidth = this.getSelectedMetricValuesNetwork(data, ip);
    } catch (e) { console.error("Error in Network Bandwidth Chart", e); this.isNetworkBandwidthGraph[ip] = false; }
  }

  getNetworkBandwidthThreshold(ip: string, type: 'receive' | 'transmit') {
    const infraThreshold = this.infraThresholdMap[ip]; if (!infraThreshold) return null;
    const key = type === 'receive' ? 'meter_vm_network_receive' : 'meter_vm_network_transmit';
    const metric = infraThreshold[key]; if (!metric) return null;
    return { avgKB: metric.avgBaseline / 1024, warningKB: metric.warningValue / 1024, criticalKB: metric.criticalValue / 1024, unit: 'KB/s' };
  }

  getSystemProperties(ip: any): void {
    const encodedIp = btoa(ip) + ".1"; let type = "";
    if (this.isLinux) type = "linux"; else if (this.isWindow) type = "windows";
    this.infraService.getSystemProperties(encodedIp, this.startTime, this.endTime, type).pipe(takeUntil(this.destroy$)).subscribe((data: any) => { if (data?.logical_cores != null) { this.logicalCoresMap[ip] = data.logical_cores; } });
  }

  loadCurrentQPSgraph(dbName: any) {
    let consSum = 0;
    const encodedDbName = btoa(dbName) + ".1";
    this.databaseService.getServiceCurrentQPS(encodedDbName, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) { this.currentQPSdata = response.serviceResponse; this.currentQPSdata.forEach(element => { if (element['qps'] !== null) consSum += element['qps']; }); this.avgqps = Math.round((consSum / this.currentQPSdata.length) * this.roundUpto) / this.roundUpto; }
      else { this.currentQPSdata = []; }
      this.initialize_currentQPS_graph(dbName);
    }, err => { this.currentQPSdata = []; if (this.graphCurrentQPS) this.graphCurrentQPS.destroy(); });
  }

  initialize_currentQPS_graph(dbName: any): void {
    try {
      if (this.graphCurrentQPS) this.graphCurrentQPS.destroy();
      this.isQpsBreached = false;
      const dbThreshold = this.dbThresholdMap[dbName]; const metric = 'meter_mysql_qps'; const baseline = dbThreshold?.[metric]?.avgBaseline ?? undefined; const warning = dbThreshold?.[metric]?.warningValue ?? undefined; const critical = dbThreshold?.[metric]?.criticalValue ?? undefined;
      const chartData = this.currentQPSdata.map(qpsData => { const value = qpsData['qps']; let pointColor: string | undefined; if (critical !== undefined && value >= critical) { pointColor = 'red'; this.isQpsBreached = true; } else if (warning !== undefined && value >= warning) { pointColor = 'orange'; this.isQpsBreached = true; } return { x: this.convertTimebucket(qpsData.time_bucket), y: value, marker: { fillColor: pointColor } }; });
      const seriesData = [{ name: 'QPS', data: chartData, marker: { radius: 2, symbol: 'circle' } }];
      const chartOption: Highcharts.Options = this.getChartOption('spline', 'current_qps_graph', seriesData, baseline, dbThreshold, metric);
      this.zone.runOutsideAngular(() => { setTimeout(() => { this.graphCurrentQPS = Highcharts.chart('current_qps_graph', chartOption); }, 10); });
    } catch (error) { console.error('Error occurred while initializing QPS chart:', error); }
  }

  loadSlowQueriesTrendGraph(dbName: any) {
    const encodedDbName = btoa(dbName) + ".1";
    this.databaseService.getServiceSlowQueriesRate(encodedDbName, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) this.slowQueriesTrendData = response.serviceResponse;
      else { this.slowQueriesTrendData = []; }
      this.initialize_slow_queries_trend_graph(dbName);
    }, err => { this.slowQueriesTrendData = []; if (this.graphSlowQueriesTrend) this.graphSlowQueriesTrend.destroy(); });
  }

  initialize_slow_queries_trend_graph(dbName: any): void {
    try {
      if (this.graphSlowQueriesTrend) this.graphSlowQueriesTrend.destroy();
      this.isSlowQueriesBreached = false;
      const dbThreshold = this.dbThresholdMap[dbName]; const statusPalette = Object.values(StatusColors); const metric = 'meter_mysql_slow_queries_rate'; const baseline = dbThreshold?.[metric]?.avgBaseline ?? undefined; const warning = dbThreshold?.[metric]?.warningValue ?? undefined; const critical = dbThreshold?.[metric]?.criticalValue ?? undefined;
      const chartData = this.slowQueriesTrendData.map(graphData => { const value = graphData['slow_queries_rate']; let pointColor: string | undefined; if (critical !== undefined && value >= critical) { pointColor = 'red'; this.isSlowQueriesBreached = true; } else if (warning !== undefined && value >= warning) { pointColor = 'orange'; this.isSlowQueriesBreached = true; } return { x: this.convertTimebucket(graphData.time_bucket), y: value, marker: { fillColor: pointColor } }; });
      const seriesData = [{ name: 'Slow Queries Rate', data: chartData, color: statusPalette[2], marker: { radius: 3, symbol: 'circle' } }];
      const chartOption: Highcharts.Options = this.getChartOption('spline', 'slow_queries_trend', seriesData, baseline, dbThreshold, metric);
      this.zone.runOutsideAngular(() => { setTimeout(() => { this.graphSlowQueriesTrend = Highcharts.chart('slow_queries_trend', chartOption); }, 10); });
    } catch (error) { console.error('Failed to initialize Slow Queries Trend chart:', error); }
  }

  loadCommandTrendGraph(dbName: any) {
    const encodedDbName = btoa(dbName) + ".1";
    this.databaseService.getServiceCommandTrends(encodedDbName, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) { this.commandTrendData = response.serviceResponse.map((item: any) => ({ time_bucket: item.time_bucket, select_rate: item['select_rate'] })); }
        else this.commandTrendData = [];
        this.initialize_commands_trend_graph(dbName);
      }, error: () => { this.commandTrendData = []; if (this.graphCommandTrend) this.graphCommandTrend.destroy(); }
    });
  }

  initialize_commands_trend_graph(dbName: any): void {
    try {
      if (this.graphCommandTrend) this.graphCommandTrend.destroy();
      this.isReadQueriesBreached = false;
      const dbThreshold = this.dbThresholdMap[dbName]; const metric = 'meter_mysql_commands_select_rate'; const baseline = dbThreshold?.[metric]?.avgBaseline ?? undefined; const warning = dbThreshold?.[metric]?.warningValue ?? undefined; const critical = dbThreshold?.[metric]?.criticalValue ?? undefined;
      const rawSeries = this.getSeriesData(this.commandTrendData);
      const seriesData = rawSeries.map((series) => { const seriesName = series.name?.toLowerCase() || ''; let color = StatusColors.NEUTRAL; if (seriesName.includes('select') || seriesName.includes('insert')) color = StatusColors.INFO; else if (seriesName.includes('delete')) color = StatusColors.CRITICAL; else if (seriesName.includes('update')) color = StatusColors.WARNING; const dataWithThresholds = series.data.map((point: any) => { const value = point.y; let pointColor: string | undefined; if (critical !== undefined && value >= critical) { pointColor = 'red'; this.isReadQueriesBreached = true; } else if (warning !== undefined && value >= warning) { pointColor = 'orange'; this.isReadQueriesBreached = true; } return { ...point, marker: { fillColor: pointColor } }; }); return { ...series, data: dataWithThresholds, color, marker: { radius: 3, symbol: 'circle' } }; });
      const chartOption: Highcharts.Options = this.getChartOption('areaspline', 'commands_trend', seriesData, baseline, dbThreshold, metric);
      this.zone.runOutsideAngular(() => { setTimeout(() => { this.graphCommandTrend = Highcharts.chart('commands_trend', chartOption); }, 10); });
    } catch (error) { console.error("Error occurred while initializing command trend graph:", error); }
  }

  getSeriesData(responseData: ResponseData[]) {
    const series: any = {};
    responseData.forEach(graphData => {
      const time_bucket = this.convertTimebucket(graphData.time_bucket);
      Object.keys(graphData).forEach(key => { if (key != 'time_bucket') { if (!series[key]) series[key] = []; series[key].push({ x: time_bucket, y: graphData[key] }); } });
    });
    return Object.keys(series).map(key => ({ name: key.replace(/_/g, ' '), data: series[key], marker: { radius: 2 } }));
  }

  getChartOption(chartType: string, chartId: string, seriesData: any[], baseline?: number, thresholds?: any, metric?: string): Highcharts.Options {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
    return {
      chart: { showAxes: true, type: chartType, backgroundColor: 'transparent', renderTo: chartId, height: 180 },
      title: { text: '' }, credits: { enabled: false }, exporting: { enabled: false }, legend: { enabled: false },
      xAxis: { type: 'datetime', title: { text: '' }, labels: { style: { color: labelColor, fontSize: '8px' } }, lineColor: gridColor, tickLength: 0, gridLineColor: gridColor },
      yAxis: { min: 0, max: baseline ? Math.max(baseline, ...seriesData.map(s => Math.max(...s.data.map((p: any) => p.y ?? 0)))) : undefined, tickAmount: 6, title: { text: '' }, labels: { style: { color: labelColor, fontSize: '8px' } }, lineColor: labelColor, tickColor: labelColor, gridLineColor: gridColor, gridLineWidth: 0.5, plotLines: baseline ? [{ value: baseline, color: '#a78a7f', width: 2, dashStyle: 'Dash', zIndex: 5, label: { align: 'right', style: { color: 'red', fontSize: '9px' }, text: '' } }] : [] },
      tooltip: { shared: true, useHTML: true, backgroundColor: tooltipBgColor, style: { color: tooltipTextColor, fontSize: '10px' } },
      series: seriesData,
    };
  }

  loadCurrentQPSgraphMssql(dbName: any) {
    let consSum = 0; const encodedDbName = btoa(dbName) + ".1";
    this.databaseService.getServiceCurrentQPSForMssql(encodedDbName, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({ next: response => { if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) { if (response.serviceResponse.length === 0) { this.currentQPSdataMssql = []; this.graphMssqlCurrentQPS?.destroy(); return; } this.currentQPSdataMssql = response.serviceResponse; this.currentQPSdataMssql.forEach(element => { if (element['qps'] !== null) consSum += element['qps']; }); this.avgqpsMssql = Math.round((consSum / this.currentQPSdataMssql.length) * this.roundUpto) / this.roundUpto; this.initialize_currentQPS_graph_mssql(dbName); } else { this.currentQPSdataMssql = []; this.graphMssqlCurrentQPS?.destroy(); } }, error: () => { this.currentQPSdataMssql = []; this.graphMssqlCurrentQPS?.destroy(); } });
  }

  initialize_currentQPS_graph_mssql(dbName: any): void {
    try {
      if (this.graphCurrentQPS) this.graphCurrentQPS.destroy();
      const dbThreshold = this.dbThresholdMap[dbName]; const metric = 'meter_mssql_qps'; const baseline = dbThreshold?.[metric]?.avgBaseline ?? undefined; const warning = dbThreshold?.[metric]?.warningValue ?? undefined; const critical = dbThreshold?.[metric]?.criticalValue ?? undefined;
      const chartData = this.currentQPSdata.map(qpsData => { const value = qpsData['qps']; let pointColor: string; if (critical !== undefined && value >= critical) { pointColor = StatusColors.CRITICAL; this.isQpsMssqlBreached = true; } else if (warning !== undefined && value >= warning) { pointColor = StatusColors.WARNING; this.isQpsMssqlBreached = true; } else { pointColor = StatusColors[(qpsData['status'] ? qpsData['color'] : 'NORMAL') as keyof typeof StatusColors]; } return { x: this.convertTimebucket(qpsData.time_bucket), y: value, color: pointColor }; });
      const seriesData = [{ name: 'QPS', data: chartData, marker: { radius: 2, symbol: 'circle' } }];
      const options: Highcharts.Options = this.getChartOption('spline', 'current_qps_graph', seriesData, baseline, dbThreshold, metric);
      this.zone.runOutsideAngular(() => { setTimeout(() => { this.graphCurrentQPS = Highcharts.chart('current_qps_graph', options); }, 10); });
    } catch (error) { console.error('Error occurred while initializing MSSQL QPS chart:', error); }
  }

  loadSlowQueriesTrendGraphMssql(dbName: any) {
    const encodedDbName = btoa(dbName) + ".1";
    this.databaseService.getServiceSlowQueriesRateForMssql(encodedDbName, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({ next: response => { if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) { if (response.serviceResponse.length === 0) { this.slowQueriesTrendDataMssql = []; this.graphMssqlSlowQueriesTrend?.destroy(); return; } this.slowQueriesTrendDataMssql = response.serviceResponse; this.initialize_slow_queries_trend_graph_mssql(dbName); } else { this.slowQueriesTrendDataMssql = []; this.graphMssqlSlowQueriesTrend?.destroy(); } }, error: () => { this.slowQueriesTrendDataMssql = []; this.graphMssqlSlowQueriesTrend?.destroy(); } });
  }

  initialize_slow_queries_trend_graph_mssql(dbName: any): void {
    try {
      if (this.graphSlowQueriesTrend) this.graphSlowQueriesTrend.destroy();
      const dbThreshold = this.dbThresholdMap[dbName]; const metric = 'meter_mssql_slow_queries_rate'; const baseline = dbThreshold?.[metric]?.avgBaseline ?? undefined; const warning = dbThreshold?.[metric]?.warningValue ?? undefined; const critical = dbThreshold?.[metric]?.criticalValue ?? undefined;
      const seriesData = [{ name: 'Slow Queries Rate', data: this.slowQueriesTrendData.map(data => { const time_bucket = this.convertTimebucket(data.time_bucket); const slow_queries_rate = data['slow_queries_rate']; let pointColor: string; if (critical !== undefined && slow_queries_rate >= critical) { pointColor = StatusColors.CRITICAL; this.isSlowQueriesMssqlBreached = true; } else if (warning !== undefined && slow_queries_rate >= warning) { pointColor = StatusColors.WARNING; this.isSlowQueriesMssqlBreached = true; } else { const status = (data['status'] ? data['color'] : 'NORMAL') as keyof typeof StatusColors; pointColor = StatusColors[status]; } return { x: time_bucket, y: slow_queries_rate, color: pointColor }; }), marker: { radius: 2, symbol: 'circle' } }];
      const options: Highcharts.Options = this.getChartOption('spline', 'slow_queries_trend', seriesData, baseline, dbThreshold, metric);
      this.zone.runOutsideAngular(() => { setTimeout(() => { this.graphSlowQueriesTrend = Highcharts.chart('slow_queries_trend', options); }, 10); });
    } catch (error) { console.error("Error occurred while initializing Slow Queries Trend graph:", error); }
  }

  loadCommandTrendGraphMssql(dbName: any) {
    const encodedDbName = btoa(dbName) + ".1";
    this.databaseService.getServiceCommandTrendsForMssql(encodedDbName, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({ next: response => { if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) { if (response.serviceResponse.length === 0) { this.commandTrendDataMssql = []; this.graphMssqlCommandTrend?.destroy(); return; } this.commandTrendDataMssql = response.serviceResponse.map((item: any) => ({ time_bucket: item.time_bucket, select_rate: item['select_rate'] })); this.initialize_commands_trend_graph_mssql(dbName); } else { this.commandTrendDataMssql = []; this.graphMssqlCommandTrend?.destroy(); } }, error: () => { this.commandTrendDataMssql = []; this.graphMssqlCommandTrend?.destroy(); } });
  }

  initialize_commands_trend_graph_mssql(dbName: any): void {
    try {
      if (this.graphCommandTrend) this.graphCommandTrend.destroy();
      const dbThreshold = this.dbThresholdMap[dbName]; const metric = 'meter_mssql_commands_select_rate'; const baseline = dbThreshold?.[metric]?.avgBaseline ?? undefined; const warning = dbThreshold?.[metric]?.warningValue ?? undefined; const critical = dbThreshold?.[metric]?.criticalValue ?? undefined;
      const rawSeries = this.getSeriesData(this.commandTrendData);
      const seriesData = rawSeries.map(series => { const seriesName = series.name?.toLowerCase() || ''; const coloredData = series.data.map((point: any) => { const value = point.y; let pointColor: string = StatusColors.NEUTRAL; if (seriesName.includes('select') || seriesName.includes('insert')) pointColor = StatusColors.INFO; else if (seriesName.includes('delete')) pointColor = StatusColors.CRITICAL; else if (seriesName.includes('update')) pointColor = StatusColors.WARNING; if (critical !== undefined && value >= critical) { pointColor = StatusColors.CRITICAL; this.isReadQueriesMssqlBreached = true; } else if (warning !== undefined && value >= warning) { pointColor = StatusColors.WARNING; this.isReadQueriesMssqlBreached = true; } return { ...point, color: pointColor }; }); return { ...series, data: coloredData, marker: { radius: 2, symbol: 'circle' } }; });
      const chartOption: Highcharts.Options = this.getChartOption('areaspline', 'commands_trend', seriesData, baseline, dbThreshold, metric);
      this.zone.runOutsideAngular(() => { setTimeout(() => { this.graphCommandTrend = Highcharts.chart('commands_trend', chartOption); }, 10); });
    } catch (error) { console.error("Error occurred while initializing command trend graph:", error); }
  }

  getSelectedMetricValues(data: { time_bucket: string;[key: string]: any }[], ip: any): { avg?: number; warning?: number; critical?: number } {
    const selectedMetricKey = this.chartDropdownToMetricKey[this.chartData_criteriaForMemoryRam];
    if (!selectedMetricKey || !data || !data.length) return {};
    const values = data.map(d => d[selectedMetricKey]).filter(v => typeof v === 'number');
    if (!values.length) return {};
    const avgMB = values.reduce((sum, v) => sum + v, 0) / values.length;
    const lastPoint = data[data.length - 1]; const totalMB = lastPoint?.['meter_vm_memory_total'];
    if (!totalMB) return { avg: avgMB };
    if (selectedMetricKey === 'meter_vm_memory_available') return { avg: avgMB, warning: totalMB * 0.20, critical: totalMB * 0.10 };
    if (selectedMetricKey === 'meter_vm_memory_used') return { avg: avgMB, warning: totalMB * 0.80, critical: totalMB * 0.90 };
    return { avg: avgMB };
  }

  getSelectedMetricValuesSwap(data: any[], ip: any): { avg: number, warning: number, critical: number } {
    const last = [...data].reverse().find(d => typeof d?.['meter_vm_memory_swap_total'] === 'number' && d['meter_vm_memory_swap_total'] > 0);
    const total = last?.['meter_vm_memory_swap_total'] || 0;
    if (!total) return { avg: 0, warning: 0, critical: 0 };
    if (this.chartData_criteriaForMemorySwap === 'free') { const values = data.map(d => d['meter_vm_memory_swap_free'] ?? 0); const avg = values.reduce((a, b) => a + b, 0) / values.length; return { avg, warning: total * 0.30, critical: total * 0.10 }; }
    if (this.chartData_criteriaForMemorySwap === 'usedSwap') { const values = data.map(d => (d['meter_vm_memory_swap_total'] ?? 0) - (d['meter_vm_memory_swap_free'] ?? 0)); const avg = values.reduce((a, b) => a + b, 0) / values.length; return { avg, warning: total * 0.70, critical: total * 0.90 }; }
    if (this.chartData_criteriaForMemorySwap === 'totalSwap') { const values = data.map(d => d['meter_vm_memory_swap_total'] ?? 0); const avg = values.reduce((a, b) => a + b, 0) / values.length; return { avg, warning: 0, critical: 0 }; }
    return { avg: 0, warning: 0, critical: 0 };
  }

  getSelectedMetricValuesCpuLoad(data: { time_bucket: string;[key: string]: any }[], ip: any): { avg?: number; warning?: number; critical?: number } {
    const selectedMetricKey = this.chartDropdownToMetricKeyCpu[this.chartData_criteriaForCpuLoad];
    if (!selectedMetricKey) return {};
    const values: number[] = data.map(d => d[selectedMetricKey]).filter(v => typeof v === 'number');
    if (!values.length) return {};
    const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
    const threshold = this.thresholds[selectedMetricKey];
    const warning = threshold ? threshold.warningValue / 100 : undefined; const critical = threshold ? threshold.criticalValue / 100 : undefined;
    return { avg: avgValue, warning, critical };
  }

  getSelectedMetricValuesNetwork(data: { time_bucket: string;[key: string]: any }[], ip: any): { avg?: number; warning?: number; critical?: number } {
    const selectedMetricKey = this.chartDropdownToMetricKeyNetwork[this.chartData_criteriaForNetworkBandwidth];
    if (!selectedMetricKey || selectedMetricKey === 'all') return {};
    const infraThreshold = this.infraThresholdMap[ip]; if (!infraThreshold) return {};
    const values: number[] = data.map(d => { if (selectedMetricKey === 'network_traffic') return (d['meter_vm_network_transmit'] ?? 0) + (d['meter_vm_network_receive'] ?? 0); else return d[selectedMetricKey] ?? 0; }).filter(v => typeof v === 'number');
    if (!values.length) return {};
    const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
    let thresholdWarning: number | undefined; let thresholdCritical: number | undefined;
    if (selectedMetricKey === 'network_traffic') { const tx = infraThreshold['meter_vm_network_transmit']; const rx = infraThreshold['meter_vm_network_receive']; if (tx && rx) { thresholdWarning = (tx.warningValue + rx.warningValue) / 1024; thresholdCritical = (tx.criticalValue + rx.criticalValue) / 1024; } }
    else { const threshold = infraThreshold[selectedMetricKey]; thresholdWarning = threshold ? threshold.warningValue / 1024 : undefined; thresholdCritical = threshold ? threshold.criticalValue / 1024 : undefined; }
    return { avg: avgValue, warning: thresholdWarning, critical: thresholdCritical };
  }

  get isApplicationHealthy(): boolean { return !this.isSuccessRateBreached && !this.isApdexChart && !this.isServiceLoadBreached; }
  get isInfrastructureHealthy(): boolean {
    const ram = Object.values(this.isMemoryRamGraph).every(v => v === false); const swap = Object.values(this.isMemorySwapGraph).every(v => v === false); const cpu = Object.values(this.isCpuLoadGraph).every(v => v === false); const network = Object.values(this.isNetworkBandwidthGraph).every(v => v === false);
    return ram && swap && cpu && network;
  }
  get isDatabaseHealthy(): boolean { return !this.isQpsBreached && !this.isSlowQueriesBreached && !this.isReadQueriesBreached && !this.isQpsMssqlBreached && !this.isSlowQueriesMssqlBreached && !this.isReadQueriesMssqlBreached; }

  getRows(items: any[]): any[][] { const rowSize = 6; const rows = []; for (let i = 0; i < items.length; i += rowSize) rows.push(items.slice(i, i + rowSize)); return rows; }
  getHealthItems() { const items: { name: string; value: number; type: string }[] = []; items.push({ name: this.infraName || 'Infra', value: 100, type: 'Infra' }); return items; }

  getColor2(value: number): string {
    const red = [244, 67, 54]; const yellow = [255, 205, 0]; const green = [84, 153, 88]; let r, g, b;
    if (value <= 50) { const factor = value / 50; r = Math.round(red[0] + factor * (yellow[0] - red[0])); g = Math.round(red[1] + factor * (yellow[1] - red[1])); b = Math.round(red[2] + factor * (yellow[2] - red[2])); }
    else { const factor = (value - 50) / 50; r = Math.round(yellow[0] + factor * (green[0] - yellow[0])); g = Math.round(yellow[1] + factor * (green[1] - yellow[1])); b = Math.round(yellow[2] + factor * (green[2] - yellow[2])); }
    const baseColor = `rgba(${r},${g},${b},1)`; const lighterColor = `rgba(${Math.min(r + 60, 255)},${Math.min(g + 60, 255)},${Math.min(b + 60, 255)},1)`; const darkerColor = `rgba(${Math.max(r - 40, 0)},${Math.max(g - 40, 0)},${Math.max(b - 40, 0)},1)`;
    return `linear-gradient(135deg, ${lighterColor} 0%, ${baseColor} 50%, ${darkerColor} 100%)`;
  }

  updateChartVisibility(metric: any, ip: any) {
    if (metric === 'MemoryRam') {
      if (!this.memoryRamChartInstance) return;
      const selectedMetricKey = this.chartDropdownToMetricKey[this.chartData_criteriaForMemoryRam];
      const lastRecord = [...(this.lastMemoryData || [])].reverse().find(d => typeof d?.['meter_vm_memory_total'] === 'number' && d['meter_vm_memory_total'] > 0);
      const total = lastRecord?.['meter_vm_memory_total'] || 0;
      if (this.chart_criteriaForMemoryRam === 'threshold' && total) { if (this.chartData_criteriaForMemoryRam === 'available') this.chartValuesRam = { warning: total * 0.20, critical: total * 0.10 }; else if (this.chartData_criteriaForMemoryRam === 'used') this.chartValuesRam = { warning: total * 0.80, critical: total * 0.90 }; else this.chartValuesRam = {}; }
      else this.chartValuesRam = this.getSelectedMetricValues(this.lastMemoryData || [], ip);
      this.memoryRamChartInstance[ip].series.forEach(series => { const seriesKey = Object.keys(this.metricMap).find(k => this.metricMap[k] === series.name); if (!seriesKey) return; if (this.chartData_criteriaForMemoryRam === 'all') series.update({ lineWidth: 1.5, zIndex: 5 } as any, false); else { const isSelected = seriesKey === selectedMetricKey; series.update({ lineWidth: isSelected ? 2.5 : 1, zIndex: isSelected ? 10 : 1, opacity: isSelected ? 1 : 0.6 } as any, false); } series.points.forEach((p: any) => { let markerColor = this.getSeriesColor(seriesKey); if (p.status === 'C') markerColor = 'red'; else if (p.status === 'W') markerColor = 'orange'; p.update({ marker: { fillColor: markerColor, lineColor: markerColor } }, false); }); });
      this.memoryRamChartInstance[ip].redraw();
    } else if (metric === 'MemorySwap') {
      if (!this.memorySwapChartInstance) return;
      if (this.chartData_criteriaForMemorySwap === 'totalSwap') this.chart_criteriaForMemorySwap = 'avg';
      this.chartValuesSwap = this.getSelectedMetricValuesSwap(this.lastSwapData || [], ip);
      const selectedMetricKey = this.chartDropdownToMetricKeySwap[this.chartData_criteriaForMemorySwap];
      this.memorySwapChartInstance[ip].series.forEach(series => { const seriesKey = Object.keys(this.swapMetricMap).find(k => this.swapMetricMap[k] === series.name); if (!seriesKey) return; const baseColor = this.getSeriesColor(seriesKey); if (this.chartData_criteriaForMemorySwap === 'all') series.update({ lineWidth: 1.5, zIndex: 5, color: baseColor } as any, false); else { const isSelected = seriesKey === selectedMetricKey; series.update({ lineWidth: isSelected ? 2.5 : 1, zIndex: isSelected ? 10 : 1, color: baseColor } as any, false); } series.points.forEach((p: any) => { let markerColor: string; if (p.status === 'C') markerColor = 'red'; else if (p.status === 'W') markerColor = 'orange'; else markerColor = this.getSeriesColor(seriesKey); p.update({ marker: { fillColor: markerColor, lineColor: markerColor, radius: 2 } }, false); }); });
      this.memorySwapChartInstance[ip].redraw();
    } else if (metric === 'CpuLoad') {
      if (!this.cpuLoadChartInstance) return;
      this.chartValuesCpuLoad = this.getSelectedMetricValuesCpuLoad(this.lastCpuData || [], ip);
      const selectedKey = this.chartDropdownToMetricKeyCpu[this.chartData_criteriaForCpuLoad];
      this.cpuLoadChartInstance[ip].series.forEach(series => { const seriesKey = Object.keys(this.metricLoadMap).find(k => this.metricLoadMap[k] === series.name); if (!seriesKey) return; const baseColor = this.getSeriesColor(seriesKey); if (this.chartData_criteriaForCpuLoad === 'all') series.update({ lineWidth: 1.5, zIndex: 5, color: baseColor } as any, false); else { const isSelected = seriesKey === selectedKey; series.update({ lineWidth: isSelected ? 2.5 : 1, zIndex: isSelected ? 10 : 1, color: baseColor, opacity: isSelected ? 1 : 0.6 } as any, false); } series.points.forEach((p: any) => { let markerColor: string = baseColor; if (p.status === 'C') markerColor = 'red'; else if (p.status === 'W') markerColor = 'orange'; p.update({ marker: { fillColor: markerColor, lineColor: markerColor, radius: 2 } }, false); }); });
      this.cpuLoadChartInstance[ip].redraw();
    } else if (metric === 'NetworkBandwidth') {
      if (!this.networkBandwidthChartInstance) return;
      this.chartValuesNetworkBandwidth = this.getSelectedMetricValuesNetwork(this.lastNetworkData || [], ip);
      const selectedKey = this.chartDropdownToMetricKeyNetwork[this.chartData_criteriaForNetworkBandwidth];
      this.networkBandwidthChartInstance[ip].series.forEach(series => { const seriesKey = Object.keys(this.networkKeyMap).find(k => this.networkKeyMap[k] === series.name); if (!seriesKey) return; const baseColor = this.getSeriesColor(seriesKey); if (this.chartData_criteriaForNetworkBandwidth === 'all') series.update({ lineWidth: 1.5, zIndex: 5, color: baseColor, opacity: 1 } as any, false); else { const isSelected = seriesKey === selectedKey; series.update({ lineWidth: isSelected ? 2.5 : 1, zIndex: isSelected ? 10 : 1, color: baseColor, opacity: isSelected ? 1 : 0.6 } as any, false); } series.points.forEach((p: any) => { let markerColor: string = baseColor; if (p.status === 'C') markerColor = 'red'; else if (p.status === 'W') markerColor = 'orange'; p.update({ marker: { fillColor: markerColor, lineColor: markerColor, radius: 2 } }, false); }); });
      this.networkBandwidthChartInstance[ip].redraw();
    }
  }

  getSeriesColor(key: string): string {
    const defaultColors: { [key: string]: string } = { meter_vm_memory_total: '#1f77b4', meter_vm_memory_available: '#2ca02c', meter_vm_memory_buff_cache: '#416605', meter_vm_memory_used: '#7A9350', meter_vm_memory_swap_total: '#1f77b4', meter_vm_memory_swap_free: '#4a3594', meter_vm_memory_swap_used: '#556B2F', meter_vm_cpu_load1: '#1f77b4', meter_vm_cpu_load5: '#4e3280', meter_vm_cpu_load15: '#2ca02c', meter_vm_network_receive: '#1f77b4', meter_vm_network_transmit: '#9356e3', network_traffic: '#2ca02c' };
    return defaultColors[key] || '#000';
  }

  formatDate(date: string) { date = date.replace(/-/g, ""); date = date.replace(/:/g, ""); date = date.replace(" ", ""); return parseInt(date); }

  formatForThresholdDate(dateStr: string): number {
    const yyyy = parseInt(dateStr.substring(0, 4)); const MM = parseInt(dateStr.substring(4, 6)) - 1; const dd = parseInt(dateStr.substring(6, 8)); const hh = parseInt(dateStr.substring(8, 10)); const mm = parseInt(dateStr.substring(10, 12));
    let inputDate = new Date(yyyy, MM, dd, hh, mm); const today = new Date(); today.setHours(0, 0, 0, 0); const checkDate = new Date(inputDate); checkDate.setHours(0, 0, 0, 0);
    if (checkDate.getTime() === today.getTime()) inputDate.setDate(inputDate.getDate() - 1);
    const newYYYY = inputDate.getFullYear(); const newMM = String(inputDate.getMonth() + 1).padStart(2, "0"); const newDD = String(inputDate.getDate()).padStart(2, "0"); const newHH = String(inputDate.getHours()).padStart(2, "0"); const newMMm = String(inputDate.getMinutes()).padStart(2, "0");
    return parseInt(`${newYYYY}${newMM}${newDD}${newHH}${newMMm}`);
  }

  scrollTo(event: Event, id: string) {
    event.preventDefault();
    let el = document.getElementById(id);
    const parent = this.sections.find(sec => sec.id === id);
    if (parent && parent.children?.length) { el = document.getElementById(parent.children[0].id); this.activeParentSection = parent.id; this.activeChildParentBold = null; }
    else {
      const parentOfChild = this.sections.find(sec => sec.children?.some(c => c.id === id));
      if (parentOfChild) { this.activeParentSection = parentOfChild.id; const child = parentOfChild.children?.find(c => c.id === id); if (child && child.children?.length) { el = document.getElementById(child.children[0].id); this.activeChildParentBold = child.id; } else if (child) this.activeChildParentBold = null; }
      else { this.sections.forEach(section => { section.children?.forEach(child => { const grand = child.children?.find(g => g.id === id); if (grand) { this.activeParentSection = section.id; this.activeChildParentBold = child.id; } }); }); }
    }
    if (el) { this.isProgrammaticScroll = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); this.activeSection = el.id; setTimeout(() => { this.isProgrammaticScroll = false; }, 500); }
  }

  onScroll(container: HTMLElement) {
    if (this.isProgrammaticScroll) return;
    const containerRect = container.getBoundingClientRect();
    let currentSectionId = this.sections[0].id; let currentParentId = this.sections[0].id; let minDistance = Number.POSITIVE_INFINITY;
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 5;
    if (isAtBottom) { const lastSection = this.sections[this.sections.length - 1]; if (lastSection.children && lastSection.children.length > 0) { const lastChild = lastSection.children[lastSection.children.length - 1]; this.activeSection = lastChild.children?.length ? lastChild.children[lastChild.children.length - 1].id : lastChild.id; } else this.activeSection = lastSection.id; this.activeParentSection = lastSection.id; return; }
    this.sections.forEach(section => { const el = document.getElementById(section.id); if (el) { const rect = el.getBoundingClientRect(); const distanceFromTop = Math.abs(rect.top - containerRect.top); if (distanceFromTop < minDistance) { minDistance = distanceFromTop; currentSectionId = section.id; currentParentId = section.id; } } if (section.children) { section.children.forEach(child => { const childEl = document.getElementById(child.id); if (childEl) { const rect = childEl.getBoundingClientRect(); const distanceFromTop = Math.abs(rect.top - containerRect.top); if (distanceFromTop < minDistance) { minDistance = distanceFromTop; currentSectionId = child.id; currentParentId = section.id; } } if (child.children) { child.children.forEach(grand => { const grandEl = document.getElementById(grand.id); if (grandEl) { const rect = grandEl.getBoundingClientRect(); const distanceFromTop = Math.abs(rect.top - containerRect.top); if (distanceFromTop < minDistance) { minDistance = distanceFromTop; currentSectionId = grand.id; currentParentId = section.id; } } }); } }); } });
    this.activeSection = currentSectionId; this.activeParentSection = currentParentId;
  }

  getRcaResponse(row: any) {
    this.isRcaResponseAvailable = true;
    const requestBody = { application: row.impacted, st: this.startTime, et: this.endTime };
    this.applicationService.analyzeApplication(requestBody).subscribe({
      next: (response) => {
        const resp = response.answer;
        if (resp == "") {
          this.isRcaResponseAvailable = false; this.withoutRca = true;
          const finalRequest = { rca_response: null, application: row.impacted, st: this.startTime, et: this.endTime, prompt: `Alert ID: ${row.details.alertId}, named '${row.problem}', was triggered for the application '${row.impacted}'. The alert monitored the metric '${row.details.metricName}' from ${row.startDate} to ${row.endDate} for ${row.duration}. The warning threshold was ${row.details.thresholdWarningValue} and the critical threshold was ${row.details.thresholdCriticalValue}. The alert was triggered ${row.details.triggerCount} times during this period.` };
          this.applicationService.relevantTraceData(finalRequest).subscribe({ next: (response) => { this.alertDetails = this.parseAlert(response.rewritten_prompt); this.showModal = true; }, error: (error) => { this.isTraceIdInRcaAvailable = false; } });
        } else {
          this.withoutRca = false;
          const finalRequest = { rca_response: resp, application: row.impacted, st: this.startTime, et: this.endTime, prompt: `Alert ID: ${row.details.alertId}, named '${row.problem}', was triggered for the application '${row.impacted}'.` };
          if (resp) { this.applicationService.relevantTraceData(finalRequest).subscribe({ next: (response) => { this.parseRcaResponse(response.llm_response); this.showModal = true; }, error: (error) => { this.isTraceIdInRcaAvailable = false; } }); }
          else this.isRcaResponseAvailable = false;
        }
      }, error: (error) => { console.error('Error calling analyze API:', error); }
    });
  }

  parseRcaResponse(responseText: string): void {
    if (!responseText) return;
    const summaryMatch = responseText.match(/1\.\s*Summary:(.*?)(?=2\.)/s);
    const analysisMatch = responseText.match(/2\.\s*Technical Analysis:(.*?)(?=3\.)/s);
    const impactedMatch = responseText.match(/3\.\s*Impacted Components:(.*?)(?=4\.)/s);
    const recommendationMatch = responseText.match(/4\.\s*Recommendations:(.*)/s);
    this.relevantData = { summary: this.extractPoints(summaryMatch ? summaryMatch[1] : ''), technicalAnalysis: this.extractPoints(analysisMatch ? analysisMatch[1] : ''), impactedComponents: this.extractPoints(impactedMatch ? impactedMatch[1] : ''), recommendations: this.extractPoints(recommendationMatch ? recommendationMatch[1] : '') };
  }

  private extractPoints(section: string): string[] {
    if (!section) return [];
    return section.split(/\n|-\s+/).map(line => line.trim().replace(/^[-•]\s*/, '')).filter(line => line.length > 0);
  }

  parseAlert(text: string) {
    const alert: any = {};
    alert.alertId = text.match(/Alert ID:\s*(.+)/)?.[1]?.trim();
    alert.alertName = text.match(/Alert Name:\s*(.+)/)?.[1]?.trim();
    alert.application = text.match(/Application Affected:\s*(.+)/)?.[1]?.trim();
    alert.startTime = text.match(/Start Time:\s*(.+)/)?.[1]?.trim();
    alert.endTime = text.match(/End Time:\s*(.+)/)?.[1]?.trim();
    alert.metric = text.match(/Monitored Metric:\s*(.+)/)?.[1]?.trim();
    alert.warning = text.match(/Warning Threshold:\s*(.+)/)?.[1]?.trim();
    alert.critical = text.match(/Critical Threshold:\s*(.+)/)?.[1]?.trim();
    alert.frequency = text.match(/Alert Trigger Frequency:\s*(.+)/)?.[1]?.trim();
    return alert;
  }

  goToHost(): void { this.router.navigate(['/infra']); }
  goToHostService(): void { this.router.navigate(['/infra/linux-service']); }
  goToApmosysAPM(): void { this.router.navigate(['/service-page']); }
  goToServicePage(): void { this.router.navigate(['/service-page/general-service']); }

  ngAfterViewInit(): void {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => { new bootstrap.Tooltip(el); });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
    if (this.openClosedChartRef) this.openClosedChartRef.destroy();
  }
}