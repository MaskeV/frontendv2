
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
import { SortPipe } from '../../../../pipes/sort.pipe';
import { SearchPipe } from "../../../../pipes/search.pipe";
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VersionOverviewComponent } from '../mrum-versions/version-overview/version-overview.component';
import { ScreensOverviewComponent } from '../mrum-screens/screens-overview/screens-overview.component';
import { SessionOverviewComponent } from '../mrum-sessions/session-overview/session-overview.component';
import { ErrorOverviewComponent } from '../mrum-errors-crashes/error-overview/error-crashes-overview.component';
import { DependencyOverviewComponent } from '../mrum-dependecies/dependency-overview/dependency-overview.component';
import { ServiceMapOverviewComponent } from '../mrum-service-map/service-map-overview/service-map-overview.component';
import { DecoderService } from '../../../../services/decoder.service';
import { Span } from '../../../../models/traceData';
import * as d3 from 'd3';
import { Modal } from 'bootstrap';
import { MrumService } from '../../../../services/mrum.service';
import { HTTP_TRANSFER_CACHE_ORIGIN_MAP } from '@angular/common/http';
import { MrumParams } from '../../../../models/mrum/mrum-params';
import { HighchartsChartModule } from 'highcharts-angular';
import { MetricData } from '../../../../models/mrum/metric-data';
import * as topologyRaw from '@highcharts/map-collection/custom/world.topo.json';
const topology = (topologyRaw as any).default || topologyRaw;
import 'highcharts/modules/map';
import { SessionSummary } from '../../../../models/mrum/session-summary';
import 'highcharts/modules/treemap';



@Component({
  selector: 'app-mrum-overview',
  imports: [CommonModule, RouterModule, NgbDropdownModule, FormsModule, HighchartsChartModule, SortPipe, SearchPipe, VersionOverviewComponent, ScreensOverviewComponent, SessionOverviewComponent, ErrorOverviewComponent, DependencyOverviewComponent, ServiceMapOverviewComponent, MrumBreadcrumbComponent],
  templateUrl: './mrum-overview.component.html',
  styleUrl: './mrum-overview.component.css'
})
export class MrumOverviewComponent implements OnInit, OnDestroy {
  showEvcErrors: boolean = true;
  showEvcCrashes: boolean = true;
  showEotErrors: boolean = true;
  showEotCrashes: boolean = true;
  showPbErrorsAndroid: boolean = true;
  showPbErrorsIos: boolean = true;
  showPbErrorsOther: boolean = true;

  showPbCrashesAndroid: boolean = true;
  showPbCrashesIos: boolean = true;
  showPbCrashesOther: boolean = true;

  mockEotData: any[] = [];
  eotCrashesPoints: any[] = [];

  sessionsGraphData: any[] = [];
  maxSessionsCount: number = 1;

  usersGraphData: any[] = [];
  maxUsersCount: number = 1;

  actionsGraphData: any[] = [];
  maxActionsCount: number = 1;
  eotErrorsPoints: any[] = [];
  eotYAxisLabels: { val: number, y: number }[] = [];
  eotXAxisLabels: { x: number, label: string }[] = [];
  eotCrashesPath: string = '';
  eotCrashesAreaPath: string = '';
  eotErrorsPath: string = '';
  eotErrorsAreaPath: string = '';

  get maxErrors(): number {
    if (!this.mockEotData || this.mockEotData.length === 0) return 1;
    return Math.max(...this.mockEotData.map(d => d.errors), 1);
  }

  get maxCrashes(): number {
    if (!this.mockEotData || this.mockEotData.length === 0) return 1;
    return Math.max(...this.mockEotData.map(d => d.crashes), 1);
  }

  calculateEotGraph() {
    let maxVal = -Infinity;
    let minVal = Infinity;

    this.mockEotData.forEach(d => {
      if (this.showEotCrashes) {
        if (d.crashes > maxVal) maxVal = d.crashes;
        if (d.crashes < minVal) minVal = d.crashes;
      }
      if (this.showEotErrors) {
        if (d.errors > maxVal) maxVal = d.errors;
        if (d.errors < minVal) minVal = d.errors;
      }
    });

    if (maxVal === -Infinity) {
      maxVal = 50;
      minVal = 0;
    }

    let rangeInit = maxVal - minVal;
    if (rangeInit === 0) rangeInit = maxVal > 0 ? maxVal : 5;

    let step = 10;
    if (rangeInit > 200) step = 100;
    else if (rangeInit > 100) step = 50;
    else if (rangeInit > 50) step = 25;
    else if (rangeInit > 20) step = 10;
    else if (rangeInit > 10) step = 5;
    else if (rangeInit > 5) step = 2;
    else step = 1;

    let minY = Math.floor(minVal / step) * step;
    let maxY = Math.ceil(maxVal / step) * step;

    // Ground to 0 if the minimum is relatively small to keep the chart anchored
    if (minY > 0 && minY <= step * 2 && minVal < 50) {
      minY = 0;
    }

    if (maxY < 5 && maxVal > 0) {
      maxY = Math.max(maxVal + 2, 4);
      step = 1;
    }

    let range = maxY - minY;
    if (range === 0) {
      maxY += step;
      range = step;
    }

    const startX = 30;
    const width = 460;
    const startY = 130;
    const height = 120; // leaves 10px top margin

    this.eotYAxisLabels = [];
    for (let i = minY; i <= maxY; i += step) {
      const y = startY - ((i - minY) / range) * height;
      this.eotYAxisLabels.push({ val: i, y: y });
    }

    this.eotCrashesPoints = [];
    this.eotErrorsPoints = [];
    this.eotXAxisLabels = [];

    const numPoints = this.mockEotData.length;

    this.mockEotData.forEach((d, i) => {
      const x = startX + (i / (numPoints - 1)) * width;
      const cy = startY - ((d.crashes - minY) / range) * height;
      const ey = startY - ((d.errors - minY) / range) * height;

      let rectX = x - 65;
      if (rectX < -10) { rectX = -10; }
      if (rectX + 130 > 510) { rectX = 380; }
      let textX = rectX + 65;

      let cyRectY = cy - 34;
      if (cyRectY < 0) { cyRectY = cy + 12; }
      let cyTextY = cyRectY + 14;

      let eyRectY = ey - 34;
      if (eyRectY < 0) { eyRectY = ey + 12; }
      let eyTextY = eyRectY + 14;

      let tooltipTime = d.tooltipTime || d.time;
      this.eotCrashesPoints.push({ x, y: cy, time: d.time, tooltipTime, val: d.crashes, rectX, textX, rectY: cyRectY, textY: cyTextY });
      this.eotErrorsPoints.push({ x, y: ey, time: d.time, tooltipTime, val: d.errors, rectX, textX, rectY: eyRectY, textY: eyTextY });

      if (i % 2 === 0) {
        this.eotXAxisLabels.push({ x, label: d.time });
      }
    });

    const buildPath = (points: any[]) => {
      if (points.length === 0) return '';
      let path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
      }
      return path;
    };

    this.eotCrashesPath = buildPath(this.eotCrashesPoints);
    this.eotCrashesAreaPath = this.eotCrashesPath + ` L ${startX + width} ${startY} L ${startX} ${startY} Z`;

    this.eotErrorsPath = buildPath(this.eotErrorsPoints);
    this.eotErrorsAreaPath = this.eotErrorsPath + ` L ${startX + width} ${startY} L ${startX} ${startY} Z`;
  }



  getEvcDash(type: 'crashes' | 'errors'): { array: string, offset: string } {
    const totalCircumference = 251.2;
    const values = { crashes: this.showEvcCrashes ? this.errorsCrashesOverview.totalCrashes : 0, errors: this.showEvcErrors ? this.errorsCrashesOverview.totalErrors : 0 };
    const total = values.crashes + values.errors;
    if (total === 0) return { array: '0 251.2', offset: '0' };
    const crashesLen = (values.crashes / total) * totalCircumference;
    const errorsLen = (values.errors / total) * totalCircumference;
    if (type === 'crashes') return { array: `${crashesLen} ${totalCircumference}`, offset: '0' };
    if (type === 'errors') return { array: `${errorsLen} ${totalCircumference}`, offset: `-${crashesLen}` };
    return { array: '0 251.2', offset: '0' };
  }

  getPbErrorsDash(platform: 'android' | 'ios' | 'other'): { array: string, offset: string } {
    const totalCircumference = 251.2;
    const values = { android: this.showPbErrorsAndroid ? (this.pbStats?.android?.errors || 0) : 0, ios: this.showPbErrorsIos ? (this.pbStats?.ios?.errors || 0) : 0, other: this.showPbErrorsOther ? (this.pbStats?.other?.errors || 0) : 0 };
    const total = values.android + values.ios + values.other;
    if (total === 0) return { array: '0 251.2', offset: '0' };
    const androidLen = (values.android / total) * totalCircumference;
    const iosLen = (values.ios / total) * totalCircumference;
    const otherLen = (values.other / total) * totalCircumference;
    if (platform === 'android') return { array: `${androidLen} ${totalCircumference}`, offset: '0' };
    if (platform === 'ios') return { array: `${iosLen} ${totalCircumference}`, offset: `-${androidLen}` };
    if (platform === 'other') return { array: `${otherLen} ${totalCircumference}`, offset: `-${androidLen + iosLen}` };
    return { array: '0 251.2', offset: '0' };
  }

  getPbCrashesDash(platform: 'android' | 'ios' | 'other'): { array: string, offset: string } {
    const totalCircumference = 251.2;
    const values = { android: this.showPbCrashesAndroid ? (this.pbStats?.android?.crashes || 0) : 0, ios: this.showPbCrashesIos ? (this.pbStats?.ios?.crashes || 0) : 0, other: this.showPbCrashesOther ? (this.pbStats?.other?.crashes || 0) : 0 };
    const total = values.android + values.ios + values.other;
    if (total === 0) return { array: '0 251.2', offset: '0' };
    const androidLen = (values.android / total) * totalCircumference;
    const iosLen = (values.ios / total) * totalCircumference;
    const otherLen = (values.other / total) * totalCircumference;
    if (platform === 'android') return { array: `${androidLen} ${totalCircumference}`, offset: '0' };
    if (platform === 'ios') return { array: `${iosLen} ${totalCircumference}`, offset: `-${androidLen}` };
    if (platform === 'other') return { array: `${otherLen} ${totalCircumference}`, offset: `-${androidLen + iosLen}` };
    return { array: '0 251.2', offset: '0' };
  }

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

  selectedService!: string;

  _technologyType: string = '';

  get technologyType(): string {
    if (this._technologyType) return this._technologyType;
    const nameLower = (this.selectedService || '').toLowerCase();
    if (nameLower.includes('reactnative')) return 'ReactNative';
    if (nameLower.includes('ios')) return 'Swift';
    return 'Kotlin';
  }

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


  currentTabName = 'Overview';
  
  breadcrumbData: BreadcrumbItem[] = [];

  tabDisplayNames: { [key: string]: string } = {
    overview: 'Overview',
    versions: 'Versions',
    screens: 'Screens',
    sessions: 'Users & Sessions',
    errors: 'Errors & Crashes',
    serviceMap: 'Service Map',
    dependencies: 'Dependencies'
  };

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
    appVersion: Highcharts.Options | null;
  } = {
      networkConnectionType: null,
      device: null,
      osVersion: null,
      appVersion: null
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
  actionMetricData: MetricData = {
    timeSeries: [],
    aggregated: null
  };

  chartRefs: Record<string, Highcharts.Chart | undefined> = {};

  //versiosn
  versionList: string[] = [];
  versionData: Record<string, {
    throughput?: number;
    failureRate?: number;
    latency?: number;
    apdex?: number;
  }> = {};
  searchText: string = '';

  // Associated Services
  associatedServices: any[] = [];
  associatedServicesPage = 1;
  associatedServicesPageSize = 6;

  topActions: any[] = [];
  topPages: any[] = [];
  osVersionStats: { name: string, usage: number, count: number }[] = [];
  appVersionStats: { name: string, usage: number, count: number }[] = [];

  get paginatedAssociatedServices() {
    const startIndex = (this.associatedServicesPage - 1) * this.associatedServicesPageSize;
    return this.associatedServices.slice(startIndex, startIndex + this.associatedServicesPageSize);
  }

  getServiceColumnClass(totalItemsOnPage: number, index: number): string {
    if (totalItemsOnPage === 1) return 'col-12';
    if (totalItemsOnPage === 2) return 'col-6';
    if (totalItemsOnPage === 3) {
      return index < 2 ? 'col-6' : 'col-12';
    }
    if (totalItemsOnPage === 4) return 'col-6';
    if (totalItemsOnPage === 5) {
      return index < 3 ? 'col-4' : 'col-6';
    }
    return 'col-4';
  }

  //transactions
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

  //sessions (variables removed, logic moved to SessionOverviewComponent)

  formatDurationInMinutes(latency: any): string {
    return this.mrumService.formatDurationInMinutes(latency);
  }

  getApdexColor(score: number | string | undefined | null): string {
    return this.mrumService.getApdexColor(score);
  }

  getApdexLabel(score: number | string | undefined | null): string {
    return this.mrumService.getApdexLabel(score);
  }



  totalSessions = 0;
  sessionPageSize = 10;
  currentSessionsPage = 1;
  totalSessionsPages = 1;
  paginationPages: number[] = [];
  paginationStart = 0;
  paginationEnd = 0;

  uniqueUsers = 0;
  avgSessionDuration = '0m 0s';
  sessionsPerUser = 0;
  bounceRate = '0%';
  avgActionsPerSession = 0;

  //errors
  errorFilters: MrumParams = {
    osVersion: '',
    appVersion: '',
    device: '',
    isCrash: undefined,
  };

  errorsCrashesOverview: any = {
    totalErrors: 0,
    errorUsers: 0,
    errorFreeSessions: 0,
    totalCrashes: 0,
    crashUsers: 0,
    crashFreeSessions: 0,
    totalSessions: 0
  };

  topAffectedUsers: any[] = [];
  topErrorTypes: any[] = [];
  topCrashes: any[] = [];
  errorsByAppVersion: any[] = [];
  crashesByAppVersion: any[] = [];
  topErrorMessages: any[] = [];
  platformBreakdown: any[] = [];

  pbStats: any = {
    android: { errors: 0, crashes: 0 },
    ios: { errors: 0, crashes: 0 },
    other: { errors: 0, crashes: 0 },
    totalErrors: 0,
    totalCrashes: 0
  };

  getErrorsCrashesDashboard(): void {
    const mrumParams: MrumParams = {
      appName: this.selectedService,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };
    this.mrumService.getErrorsCrashesOverview(mrumParams).subscribe((res: any) => {
      if (res && res.serviceStatus === 'Success') {
        this.errorsCrashesOverview = res.serviceResponse;
      }
    });

    this.mrumService.getErrorsCrashesOverTime(mrumParams).subscribe((res: any) => {
      if (res && res.serviceStatus === 'Success' && res.serviceResponse) {
        this.mockEotData = res.serviceResponse.map((r: any) => {
          const timestampStr = r.timestamp || '';
          let time = '';
          let tooltipTime = '';
          if (timestampStr.length >= 12) {
            time = timestampStr.substring(8, 10) + ':' + timestampStr.substring(10, 12);
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthIdx = parseInt(timestampStr.substring(4, 6), 10) - 1;
            const month = monthNames[monthIdx] || '';
            const day = timestampStr.substring(6, 8);
            tooltipTime = `${month}-${day} ${time}`;
          } else {
            time = timestampStr;
            tooltipTime = timestampStr;
          }
          return { time: time, tooltipTime: tooltipTime, errors: r.errors, crashes: r.crashes };
        });
        if (this.mockEotData.length === 0) {
          this.mockEotData = [{ time: '00:00', crashes: 0, errors: 0 }];
        }
        this.calculateEotGraph();
      }
    });

    this.mrumService.getTopAffectedUsers(mrumParams).subscribe((res: any) => {
      if (res && res.serviceStatus === 'Success' && res.serviceResponse) {
        this.topAffectedUsers = res.serviceResponse;
      }
    });

    this.mrumService.getTopErrorTypes(mrumParams).subscribe((res: any) => {
      if (res && res.serviceStatus === 'Success' && res.serviceResponse) {
        this.topErrorTypes = res.serviceResponse;
      }
    });

    this.mrumService.getTopCrashes(mrumParams).subscribe((res: any) => {
      if (res && res.serviceStatus === 'Success' && res.serviceResponse) {
        this.topCrashes = res.serviceResponse;
      }
    });

    this.mrumService.getErrorsByAppVersion(mrumParams).subscribe((res: any) => {
      if (res && res.serviceStatus === 'Success' && res.serviceResponse) {
        this.errorsByAppVersion = res.serviceResponse;
      }
    });

    this.mrumService.getCrashesByAppVersion(mrumParams).subscribe((res: any) => {
      if (res && res.serviceStatus === 'Success' && res.serviceResponse) {
        this.crashesByAppVersion = res.serviceResponse;
      }
    });

    this.mrumService.getTopErrorMessages(mrumParams).subscribe((res: any) => {
      if (res && res.serviceStatus === 'Success' && res.serviceResponse) {
        this.topErrorMessages = res.serviceResponse;
      }
    });

    this.mrumService.getPlatformBreakdown(mrumParams).subscribe((res: any) => {
      if (res && res.serviceStatus === 'Success' && res.serviceResponse) {
        this.platformBreakdown = res.serviceResponse;
        this.pbStats = {
          android: { errors: 0, crashes: 0 },
          ios: { errors: 0, crashes: 0 },
          other: { errors: 0, crashes: 0 },
          totalErrors: 0,
          totalCrashes: 0
        };
        this.platformBreakdown.forEach(p => {
          let key = 'other';
          if (p.platform?.toLowerCase().includes('android')) key = 'android';
          else if (p.platform?.toLowerCase().includes('ios') || p.platform?.toLowerCase().includes('iphone') || p.platform?.toLowerCase().includes('ipad')) key = 'ios';

          this.pbStats[key].errors += (p.errors || 0);
          this.pbStats[key].crashes += (p.crashes || 0);
          this.pbStats.totalErrors += (p.errors || 0);
          this.pbStats.totalCrashes += (p.crashes || 0);
        });
      }
    });
  }

  httpErrorMetricData: MetricData = {
    timeSeries: [],
    aggregated: 0
  };

  crashMetricData: MetricData = {
    timeSeries: [],
    aggregated: 0
  };
  errorMetricData: MetricData = {
    timeSeries: [],
    aggregated: null
  };

  deviceErrorStats?: any[];
  versionErrorStats?: any[];
  osErrorStats?: any[];
  paginatedError: any[] = [];
  totalError = 0;
  errorPageSize = 10;
  currentErrorPage = 1;
  totalErrorPages = 1;
  errorPaginationPages: number[] = [];
  errorPaginationStart = 0;
  errorPaginationEnd = 0;


  //service Map
  //mapOptions: Highcharts.Options | undefined;
  selectedMetric: string = 'apdex';
  mapOptions: Highcharts.Options = {};
  countryData: any[] = [];

  mapPageSize = 10;
  mapCurrentPage = 1;

  sortField: string = 'usagePercent';
  sortDirection: 'asc' | 'desc' = 'desc';

  //dependency
  dependencyFilters: MrumParams = {
    osVersion: '',
    appVersion: '',
    device: '',
  };

  paginatedDependency: any[] = [];
  totalDependency = 0;
  dependencyPageSize = 10;
  currentDependencyPage = 1;
  totalDependencyPages = 1;
  dependencyPaginationPages: number[] = [];
  dependencyPaginationStart = 0;
  dependencyPaginationEnd = 0;

  hasUrlDate = false;
  firstDateUpdateDone = false;
  ngOnInit(): void {
    this.calculateEotGraph();
    this.route.queryParams.subscribe(params => {
      if (!params['serviceId']) {
        this.router.navigate(['/mrum']);
        return;
      }

      const serviceId = params['serviceId'];
      const tabName = params['tab'] || 'overview';

      if (params['st'] && params['et']) {
        this.startTime = params['st'];
        this.endTime = params['et'];
        this.hasUrlDate = true;
      }

      this.selectedService = serviceId || this.selectedService;
      this._technologyType = params['tech'] || '';
      this.transactionFilters.appName = this.selectedService;
      this.errorFilters.traceId = params['traceId'] || undefined;
      this.errorFilters.spanId = params['spanId'] || undefined;
      this.currentTabName = this.tabDisplayNames[tabName] || 'Overview';
      this.updateBreadcrumbs();
      this.selectTab(tabName);
    });

    this.dateService.setActiveComponent('MrumOverviewComponent');

    this.subscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'MrumOverviewComponent'),
      switchMap(() => this.dateService.date$)
    ).subscribe(dates => {
      this.datemodel = dates;

      if (this.hasUrlDate && !this.firstDateUpdateDone) {
        this.firstDateUpdateDone = true;
        return;
      }

      this.startTime = this.formatDate(this.datemodel.startdateTime);
      this.endTime = this.formatDate(this.datemodel.enddateTime);

      const activeTab = $('#service-nav .nav-link.active').attr('href')?.replace('#', '');
      if (activeTab) {
        this.loadData(activeTab);
      }
    });

    this.loadInitialValues();

    try {
      this.storageSub = this.autoRefresh.getStorageSub().subscribe((data) => {
        if (data?.key === 'RefreshEnability') {
          this.isAutoRefreshEnabled = JSON.parse(data.value);
        } else if (data?.key === 'RefreshInterval') {
          this.refreshInterval = Number(data.value);
        }
      });
    } catch { }

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

  ngAfterViewInit(): void {
    $('#myTab a').on('shown.bs.tab', (event: any) => {
      const activeTab = $(event.target).attr('href'); // Get the active tab ID
      // this.loadData(activeTab.replace('#', ''));
    });
  }

  setSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.mapCurrentPage = 1;
  }

  private clearAutoRefresh() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  selectTab(tabName: string) {
    const element = document.querySelector(`#service-nav .nav-link[href="#${tabName}"]`);
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
      { label: this.currentTabName }
    ];
  }

  convertTimebucket(timebucket: any) {
    timebucket = timebucket.toString();
    const year = parseInt(timebucket.slice(0, 4), 10);
    const month = parseInt(timebucket.slice(4, 6), 10) - 1;
    const day = parseInt(timebucket.slice(6, 8), 10);
    const hour = parseInt(timebucket.slice(8, 10), 10);
    const minute = parseInt(timebucket.slice(10, 12), 10);
    const date = new Date(year, month, day, hour, minute);
    return date.getTime();
  }

  activateTabUI(tabId: string): void {
    const tabLink = document.querySelector(`#service-nav a[href="#${tabId}"]`) as HTMLElement;
    if (tabLink) {
      tabLink.click();
    } else {
    }
  }

  scrollToBottom(): void {
    // setTimeout(() => {
    //   this.bottomElement.nativeElement.scrollIntoView({ behavior: 'smooth' });
    // }, 200);
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
    this.currentTabName = this.tabDisplayNames[tabName] || tabName;

    this.destroy$.next();
    switch (tabName) {
      case 'overview':
        this.loadOverviewData();
        this.updateTimeSeriesCharts();
        this.loadServiceMapData();
        break;
      case 'versions':
        this.loadVersionSummary();
        break;
      case 'screens':
        this.loadInitialTransactionsData();
        this.getTransactions();
        break;
      case 'sessions':
        // Session component manages its own data fetching via URL params
        break;
      case 'errors':
        this.loadInitialTransactionsData();
        this.getErrorsCrashesDashboard();
        this.plotTimeSeriesForErrorCharts();
        this.plotMostAffectedGraphs();
        this.getErrors();
        break;
      case 'dependencies':
        this.loadInitialTransactionsData();
        this.getDependencies();
        break;
      case 'serviceMap':
        this.loadServiceMapData();
        break;
    }
  }

  loadInitialTransactionsData(): void {
    const mrumParams: MrumParams = {
      appName: this.selectedService,
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
        this.versionList = result.versions && result.versions.length > 0 ? result.versions : ['2.30.1', '2.31.1', '2.31.2'];
        this.deviceList = result.devices && result.devices.length > 0 ? result.devices : ['samsung SM-S918B', 'iPhone 14 Pro', 'OnePlus 11', 'Redmi Note 13', 'iPhone 13', 'POCO X6 Pro', 'samsung Galaxy S23', 'Motorola Edge 40', 'iPhone 15', 'realme GT 6'];
        this.osversionList = result.osVersions && result.osVersions.length > 0 ? result.osVersions : ['Android 13', 'Android 14', 'iOS 17.4', 'iOS 17.5'];
      },
      error: err => {
        console.error('Error fetching initial filter data:', err);
      }
    });
  }


  getTransactions(): void {
    const baseParams: MrumParams = {
      appName: this.selectedService,
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



  getDependencies() {
    const { appVersion, osVersion, device, filter } = this.dependencyFilters;
    const params = {
      appName: this.selectedService,
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      pageNumber: this.currentDependencyPage,
      pageSize: this.dependencyPageSize,
      appVersion,
      osVersion,
      device,
      filter
    };

    this.paginatedDependency = [];
    this.mrumService.getDependencies(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data?.serviceStatus === 'Success') {
          const dependecies: string[] = data.serviceResponse.dependencies || [];
          this.totalDependency = data.serviceResponse.size || 0;
          this.totalDependencyPages = Math.ceil(this.totalDependency / this.dependencyPageSize);
          this.updateDependencyPaginationWindow();
          const summaries$ = dependecies.map((dep) => {
            const dependencyParams: MrumParams = {
              appName: this.selectedService,
              st: this.startTime.toString(),
              et: this.endTime.toString(),
              filter: dep,
              appVersion,
              osVersion,
              device
            };
            return this.mrumService.getDependencyOverview(dependencyParams).pipe(
              map(res => ({
                dependency: dep,
                latency: res?.serviceResponse?.latency ?? 0,
                throughput: res?.serviceResponse?.throughput ?? 0,
                apdex: res?.serviceResponse?.apdex ?? 0,
                failure_rate: res?.serviceResponse?.failure_rate ?? 0,
              })),
              catchError(() => of({ dependency: dep, latency: 0, throughput: 0, apdex: 0, failure_rate: 0 }))
            );
          });

          forkJoin(summaries$).subscribe({
            next: (results: any[]) => {
              this.paginatedDependency = results;
            },
            error: err => {
              console.error('Error in fetching dependencies overview:', err);
            }
          });
        }
      },
      error: err => {
        console.error('Error fetching dependency:', err);
      }
    });
  }

  changeDependencyPage(page: number): void {
    if (page < 1 || page > this.totalDependencyPages) return;
    this.currentDependencyPage = page;
    this.getDependencies();
    this.updateDependencyPaginationWindow();
  }

  updateDependencyPaginationWindow(): void {
    const windowSize = 3;
    const half = Math.floor(windowSize / 2);

    let start = Math.max(2, this.currentDependencyPage - half);
    let end = Math.min(this.totalDependencyPages - 1, this.currentDependencyPage + half);

    if (this.currentDependencyPage <= 2) {
      end = Math.min(1 + windowSize, this.totalDependencyPages - 1);
    } else if (this.currentDependencyPage >= this.totalDependencyPages - 1) {
      start = Math.max(this.totalDependencyPages - windowSize, 2);
    }

    this.dependencyPaginationStart = start;
    this.dependencyPaginationEnd = end;

    this.dependencyPaginationPages = [];
    for (let i = start; i <= end; i++) {
      this.dependencyPaginationPages.push(i);
    }
  }


  getErrors(): void {
    const params: MrumParams = {
      appName: this.selectedService,
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      pageNumber: this.currentErrorPage,
      pageSize: this.errorPageSize,
      appVersion: this.errorFilters?.appVersion?.trim() || undefined,
      osVersion: this.errorFilters?.osVersion?.trim() || undefined,
      device: this.errorFilters?.device?.trim() || undefined,
      sessionId: this.errorFilters?.sessionId?.trim() || undefined,
      traceId: this.errorFilters?.traceId?.trim() || undefined,
      spanId: this.errorFilters?.spanId?.trim() || undefined,
      isCrash: this.errorFilters?.isCrash || undefined,
    };
    //this.buildQueryParams();
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






  /**
   * Single overview call — replaces getOverviewMetrics() + updateHighchartsPie().
   * Reads from GET /mrum/overview/api/getOverview.
   * Populates: KPIs (crashRate, sessions, users, actions),
   *            pie charts (device, network, osVersion, appVersion),
   *            apdex score + timeline, topActions, topPages, associatedServices.
   */
  loadOverviewData(): void {
    const mrumParams: MrumParams = {
      appName: this.selectedService,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };

    this.mrumService.getOverview(mrumParams).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const data = res?.serviceStatus === 'Success' ? res.serviceResponse : {};
        const kpisRes = data.kpis || {};
        const timelineRes = { timeline: data.timeline || [], apdexTimeline: data.apdexTimeline || [] };
        const distRes = data.distributions || {};
        const tablesRes = {
          topActions: data.topActions || [],
          topPages: data.topPages || [],
          associatedServices: data.associatedServices || [],
          geographic: data.geographic || []
        };

        // ── KPIs ──
        this.crashRate = kpisRes.crashRate ?? 0;
        this.httpRequestCount = kpisRes.totalUsers ?? 0;   // reuse field for total users
        this.apdexScore = kpisRes.apdex ?? null;

        // Expose for template
        this.sessionsMetricData.aggregated = kpisRes.totalSessions ?? 0;
        this.httpRequestMetricData.aggregated = kpisRes.totalUsers ?? 0;
        this.actionMetricData.aggregated = kpisRes.totalActions ?? 0;

        // ── Unified timeline → mapped to sparklines ──
        const timeline: any[] = timelineRes.timeline || [];

        this.apdexMetricData.timeSeries = timeline.map(t => ({ time_bucket: t.timestamp, apdex: t.apdex ?? 0, status: this.getApdexLabel(t.apdex) }));
        this.sessionsMetricData.timeSeries = timeline.map(t => ({ time_bucket: t.timestamp, sessionCount: t.sessions ?? 0 }));
        this.httpRequestMetricData.timeSeries = timeline.map(t => ({ time_bucket: t.timestamp, userCount: t.users ?? 0 }));
        this.actionMetricData.timeSeries = timeline.map(t => ({ time_bucket: t.timestamp, actionCount: t.actions ?? 0 }));
        this.errorMetricData.timeSeries = timeline.map(t => ({ time_bucket: t.timestamp, errorRate: t.errorRate ?? 0 }));
        this.crashMetricData.timeSeries = timeline.map(t => ({ time_bucket: t.timestamp, crashRate: t.crashRate ?? 0 }));

        const validApdex = this.apdexMetricData.timeSeries.filter((t: any) => t.apdex > 0).map((t: any) => t.apdex);
        this.apdexMetricData.aggregated = validApdex.length > 0 ? (validApdex.reduce((a: number, b: number) => a + b, 0) / validApdex.length) : 0;
        this.errorMetricData.aggregated = kpisRes.errorRate ?? 0;
        this.crashMetricData.aggregated = kpisRes.crashRate ?? 0;

        setTimeout(() => {
          this.renderChartById('apdexChartContainer', 'Apdex', this.apdexMetricData.timeSeries, 'apdex', 'status', 'time_bucket', '#f0fdf4', '#14532d');
          this.renderSparkline('sessionsSparkline', 'column', this.sessionsMetricData.timeSeries, 'sessionCount', '#16a34a', undefined, '#dcfce7', '#14532d');
          this.renderSparkline('usersSparkline', 'column', this.httpRequestMetricData.timeSeries, 'userCount', '#9333ea', 'User Count', '#f3e8ff', '#4c1d95');
          this.renderSparkline('actionsSparkline', 'column', this.actionMetricData.timeSeries, 'actionCount', '#0284c7', 'Action Count', '#e0f2fe', '#0c4a6e');
          this.renderSparkline('errorRateSparkline', 'line', this.errorMetricData.timeSeries, 'errorRate', '#dc2626', 'Error Rate', '#fee2e2', '#7f1d1d');
          this.renderSparkline('crashRateSparkline', 'line', this.crashMetricData.timeSeries, 'crashRate', '#ea580c', 'Crash Rate', '#ffedd5', '#7c2d12');
          this.renderChartById('errorRateChart', 'Error Rate', this.errorMetricData.timeSeries, 'errorRate');
        }, 0);

        // ── Top Actions + Pages ──
        this.topActions = (tablesRes.topActions || []).map((a: any) => ({
          name: a.name,
          count: a.count,
          avgDurationMs: a.avgDurationMs,
          perMin: a.perMin,
          timeConsumedPct: a.timeConsumedPct
        }));
        this.topPages = (tablesRes.topPages || []).map((p: any) => ({
          name: p.name,
          count: p.count,
          avgDurationMs: p.avgDurationMs,
          perMin: p.perMin,
          usage: p.usage
        }));

        // ── Associated Services ──
        this.associatedServices = tablesRes.associatedServices || [];

        // ── Pie charts: convert array [{name, count, usage}] → Record<name, count> ──
        const toRecord = (arr: any[]) =>
          (arr || []).reduce((acc: Record<string, number>, item: any) => {
            acc[item.name] = item.count;
            return acc;
          }, {});

        const deviceRec = toRecord(distRes.device);
        const networkRec = toRecord(distRes.network);
        const osRec = toRecord(distRes.osVersion);
        const appVerRec = toRecord(distRes.appVersion);

        this.pieChartConfigs.device = this.isNonEmpty(deviceRec)
          ? this.getPieConfig('Device', deviceRec, '#f0fdfa', '#115e59')
          : this.getPieConfig('Device', {}, '#f0fdfa', '#115e59');

        this.pieChartConfigs.networkConnectionType = this.isNonEmpty(networkRec)
          ? this.getPieConfig('Network Type', networkRec, '#eef2ff', '#3730a3')
          : this.getPieConfig('Network Type', {}, '#eef2ff', '#3730a3');

        this.pieChartConfigs.osVersion = this.isNonEmpty(osRec)
          ? this.getPieConfig('OS Version', osRec)
          : this.getPieConfig('OS Version', {});
        this.osVersionStats = this.processStats(osRec, true);

        this.pieChartConfigs.appVersion = this.isNonEmpty(appVerRec)
          ? this.getPieConfig('App Version', appVerRec)
          : this.getPieConfig('App Version', {});
        this.appVersionStats = this.processStats(appVerRec);

      },
      error: (err: any) => {
        console.error('Error fetching overview data:', err);
        this.resetOverviewDefaults();
      }
    });
  }

  private resetOverviewDefaults(): void {
    this.crashRate = 0;
    this.httpRequestCount = 0;
    this.apdexScore = null;
    this.topActions = [];
    this.topPages = [];
    this.associatedServices = [];
    this.pieChartConfigs = {
      networkConnectionType: this.getPieConfig('Network Type', {}, '#eef2ff', '#3730a3'),
      device: this.getPieConfig('Device', {}, '#f0fdfa', '#115e59'),
      osVersion: this.getPieConfig('OS Version', {}),
      appVersion: this.getPieConfig('App Version', {})
    };
    this.osVersionStats = [];
    this.appVersionStats = [];
  }


  processStats(data: Record<string, number>, isOsVersion: boolean = false): { name: string, usage: number, count: number }[] {
    if (!data) return [];
    const total = Object.values(data).reduce((acc, val) => acc + val, 0);
    if (total === 0) return [];
    return Object.entries(data).map(([name, count]) => ({
      name: isOsVersion ? name.split(',')[0] : name,
      count,
      usage: (count * 100) / total
    })).sort((a, b) => b.count - a.count).slice(0, 5);
  }
  getPieConfig(title: string, data: Record<string, number>, bgColor?: string, textColor?: string): Highcharts.Options {
    const colorsMap: Record<string, string[]> = {
      'Device': ['#7c3aed', '#2563eb', '#10b981'], // Purple, Blue, Green
      'Network Type': ['#2563eb', '#7c3aed', '#db2777', '#10b981'], // Blue, Purple, Magenta, Green
      'OS Version': ['#2563eb', '#7c3aed', '#db2777', '#10b981'],
      'App Version': ['#2563eb', '#7c3aed', '#db2777', '#10b981']
    };
    const colors = colorsMap[title] || ['#2563eb', '#7c3aed', '#db2777', '#10b981'];

    return {
      chart: {
        type: 'pie',
        backgroundColor: 'transparent',
        height: 180,
        spacing: [5, 5, 5, 5]
      },
      title: {
        text: undefined
      },
      colors: colors,
      tooltip: {
        useHTML: true,
        backgroundColor: bgColor || '#ffffff',
        borderColor: textColor || '#d9d9d9',
        borderRadius: 6,
        shadow: true,
        headerFormat: '',
        style: {
          color: textColor || '#333'
        },
        pointFormat: `
          <div style="padding:4px 6px; font-family: sans-serif; color: ${textColor || '#333'};">
            <b style="color:${textColor || '#333'}">{point.name}</b><br/>
            <span>{point.y:.1f}%</span>
          </div>
        `
      },
      plotOptions: {
        pie: {
          innerSize: '70%',
          allowPointSelect: true,
          cursor: 'pointer',
          borderWidth: 0,
          dataLabels: {
            enabled: false
          },
          showInLegend: true
        }
      },
      legend: {
        enabled: true,
        align: 'right',
        verticalAlign: 'middle',
        layout: 'vertical',
        itemMarginTop: 4,
        itemMarginBottom: 4,
        itemStyle: {
          color: textColor || '#333',
          fontSize: '11px',
          fontWeight: '500',
          fontFamily: 'sans-serif'
        },
        labelFormatter: function (this: any) {
          return `${this.name} <span style="color: ${textColor || '#666'}; font-weight: normal; margin-left: 8px;">${this.y.toFixed(1)}%</span>`;
        }
      },
      series: [{
        type: 'pie',
        name: title,
        data: Object.entries(data).map(([key, val]) => ({
          name: key,
          y: val
        }))
      }],
      credits: { enabled: false }
    };
  }

  private isNonEmpty(obj: Record<string, number> | null | undefined): boolean {
    return !!(obj && Object.keys(obj).length > 0);
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
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      appVersion: this.errorFilters?.appVersion?.trim(),
      osVersion: this.errorFilters?.osVersion?.trim(),
      device: this.errorFilters?.device?.trim(),
      sessionId: this.errorFilters?.sessionId?.trim(),
      traceId: this.errorFilters?.traceId?.trim(),
      isCrash: this.errorFilters?.isCrash,
      spanId: this.errorFilters?.spanId?.trim(),
    });
  }





  plotMostAffectedGraphs(): void {
    const mrumParams: MrumParams = {
      appName: this.selectedService,
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      appVersion: this.errorFilters?.appVersion?.trim() || undefined,
      osVersion: this.errorFilters?.osVersion?.trim() || undefined,
      device: this.errorFilters?.device?.trim() || undefined,
      sessionId: this.errorFilters?.sessionId?.trim() || undefined
    };

    this.mrumService.getMostAffected(mrumParams).subscribe((data: any) => {
      if (data?.serviceStatus === 'Success' && data?.serviceResponse) {
        const response = data.serviceResponse;
        this.deviceErrorStats = response.device;
        this.versionErrorStats = response.appVersion;
        this.osErrorStats = response.osVersion;
        console.log("devices:", this.deviceErrorStats);
        setTimeout(() => {
          this.renderTreeMapChart('deviceErrorChart', 'Most Affected Devices', response.device);
          this.renderTreeMapChart('osErrorChart', 'Most Affected OS Versions', response.appVersion);
          this.renderTreeMapChart('versionErrorChart', 'Most Affected App Versions', response.osVersion);
        }, 0);
      } else {
        console.warn('Most affected data not available');
      }
    });
  }


  plotTimeSeriesForErrorCharts(): void {
    const mrumParams: MrumParams = {
      appName: this.selectedService,
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      appVersion: this.errorFilters?.appVersion?.trim() || undefined,
      osVersion: this.errorFilters?.osVersion?.trim() || undefined,
      device: this.errorFilters?.device?.trim() || undefined,
      sessionId: this.errorFilters?.sessionId?.trim() || undefined
    };

    this.mrumService.getHttpErrorRate(mrumParams).subscribe((data: any) => {
      if (data && data.serviceStatus === 'Success' && data.serviceResponse && data.serviceResponse.time_series && data.serviceResponse.time_series.length > 0) {
        this.httpErrorMetricData.timeSeries = data.serviceResponse.time_series;
        this.httpErrorMetricData.aggregated = data.serviceResponse.aggregated;
      } else {
        this.httpErrorMetricData.timeSeries = [];
        this.httpErrorMetricData.aggregated = 0;
      }
      setTimeout(() => {
        this.renderChartById('httpErrorRateChart', 'Http Error Rate', this.httpErrorMetricData.timeSeries, 'failureRate');
      }, 0);
    }, error => {
      this.httpErrorMetricData.timeSeries = [];
      this.httpErrorMetricData.aggregated = 0;
      setTimeout(() => {
        this.renderChartById('httpErrorRateChart', 'Http Error Rate', this.httpErrorMetricData.timeSeries, 'failureRate');
      }, 0);
    });
  }

  updateTimeSeriesCharts(): void {
    const mrumParams: MrumParams = {
      appName: this.selectedService,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };


    this.mrumService.getLatencyStats(mrumParams).subscribe((data: any) => {
      if (data && data.serviceStatus === 'Success' && data.serviceResponse && data.serviceResponse.time_series && data.serviceResponse.time_series.length > 0 && data.serviceResponse.aggregated >= 0) {
        this.latencyMetricData.timeSeries = data.serviceResponse.time_series;
        this.latencyMetricData.aggregated = data.serviceResponse.aggregated;
      } else {
        this.latencyMetricData.timeSeries = [];
        this.latencyMetricData.aggregated = 0;
      }
      setTimeout(() => {
        this.renderChartById('latencyChartContainer', 'Latency', this.latencyMetricData.timeSeries, 'avgLatencyMs');
        this.renderSparkline('latencySparkline', 'line', this.latencyMetricData.timeSeries, 'avgLatencyMs', '#0ea5e9');
      }, 0);
    }, error => {
      this.latencyMetricData.timeSeries = [];
      this.latencyMetricData.aggregated = 0;
      setTimeout(() => {
        this.renderChartById('latencyChartContainer', 'Latency', this.latencyMetricData.timeSeries, 'avgLatencyMs');
        this.renderSparkline('latencySparkline', 'line', this.latencyMetricData.timeSeries, 'avgLatencyMs', '#0ea5e9');
      }, 0);
    });

    this.mrumService.getThroughput(mrumParams).subscribe((data: any) => {
      if (data && data.serviceStatus === 'Success' && data.serviceResponse && data.serviceResponse.time_series && data.serviceResponse.time_series.length > 0 && data.serviceResponse.aggregated >= 0) {
        this.throughputMetricData.timeSeries = data.serviceResponse.time_series;
        this.throughputMetricData.aggregated = data.serviceResponse.aggregated;
      } else {
        this.throughputMetricData.timeSeries = [];
        this.throughputMetricData.aggregated = 0;
      }
    }, error => {
      this.throughputMetricData.timeSeries = [];
      this.throughputMetricData.aggregated = 0;
    });



    this.mrumService.getFailedTransactionRate(mrumParams).subscribe((data: any) => {
      if (data && data.serviceStatus === 'Success' && data.serviceResponse && data.serviceResponse.time_series && data.serviceResponse.time_series.length > 0 && data.serviceResponse.aggregated >= 0) {
        this.failureRateMetricData.timeSeries = data.serviceResponse.time_series;
        this.failureRateMetricData.aggregated = data.serviceResponse.aggregated;
      } else {
        this.failureRateMetricData.timeSeries = [];
        this.failureRateMetricData.aggregated = 0;
      }
    }, error => {
      this.failureRateMetricData.timeSeries = [];
      this.failureRateMetricData.aggregated = 0;
    });
  }



  formatTooltipTime(timestampStr: string): string {
    if (!timestampStr) return '';
    if (timestampStr.length >= 12) {
      const time = timestampStr.substring(8, 10) + ':' + timestampStr.substring(10, 12);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(timestampStr.substring(4, 6), 10) - 1;
      const month = monthNames[monthIdx] || '';
      const day = timestampStr.substring(6, 8);
      return `${month}-${day} ${time}`;
    }
    return timestampStr;
  }

  renderSparkline(containerId: string, type: 'line' | 'column', timeSeriesData: any[], valueKey: string, color: string, labelOverride?: string, bgColor?: string, textColor?: string): void {
    const points = timeSeriesData.map(item => {
      const tb = item.time_bucket ?? item.timestamp;
      let timestamp = Date.now();
      if (tb && typeof tb === 'string' && tb.length === 12) {
        const y = parseInt(tb.substring(0, 4), 10);
        const m = parseInt(tb.substring(4, 6), 10) - 1;
        const d = parseInt(tb.substring(6, 8), 10);
        const h = parseInt(tb.substring(8, 10), 10);
        const min = parseInt(tb.substring(10, 12), 10);
        timestamp = new Date(y, m, d, h, min).getTime();
      }
      return [timestamp, item[valueKey] ?? null];
    });

    const container = document.getElementById(containerId);
    if (!container) return;

    Highcharts.chart(containerId, {
      chart: {
        type: type,
        backgroundColor: 'transparent',
        margin: [2, 2, 2, 2],
        height: 50,
        style: { overflow: 'visible' }
      },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: {
        type: 'datetime',
        visible: false
      },
      yAxis: { visible: false },
      legend: { enabled: false },
      tooltip: {
        enabled: true,
        outside: true,
        backgroundColor: bgColor || 'rgba(255, 255, 255, 0.95)',
        borderWidth: 1,
        borderColor: textColor || '#ddd',
        shadow: true,
        style: {
          color: textColor || '#333333'
        },
        formatter: function (this: any) {
          const date = new Date(this.x as number);
          const dateString = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          const displayTime = `${dateString} ${timeString}`;
          const val = this.y !== null && this.y !== undefined ? (this.y as number).toFixed(2) : 'N/A';
          // Make valueKey user-friendly if needed or use override
          const label = labelOverride || valueKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return `<div style="font-size:11px; padding: 4px; color:${textColor || '#333333'}"><b>${displayTime}</b><br/><span style="color:${color}">●</span> ${label}: <b>${val}</b></div>`;
        },
        useHTML: true
      },
      plotOptions: {
        series: {
          enableMouseTracking: true,
          lineWidth: type === 'line' ? 2 : 1,
          color: color,
          states: { hover: { enabled: true, lineWidthPlus: 0 } },
          marker: { enabled: type === 'line', radius: type === 'line' ? 2 : 0, states: { hover: { enabled: true, radius: 3 } } }
        },
        column: {
          pointWidth: 4,
          borderWidth: 0,
          states: { hover: { brightness: 0.1 } }
        }
      },
      series: [{
        type: type,
        data: points
      }] as any
    });
  }


  renderChartById(
    containerId: string,
    title: string,
    timeSeries: any[],
    valueKey: string,
    statusKey: string = 'status',
    timeKey: string = 'time_bucket',
    bgColor?: string,
    textColor?: string
  ): void {
    console.log('Rendering chart for container:', containerId, 'with title:', title);
    if (this.chartRefs && this.chartRefs[containerId]) {
      this.chartRefs[containerId]!.destroy();
      this.chartRefs[containerId] = undefined;
    }

    const chartOptions = this.getTimeSeriesGraph(title, timeSeries, valueKey, statusKey, timeKey, bgColor, textColor);
    const container = document.getElementById(containerId);
    if (container) {
      this.chartRefs[containerId] = Highcharts.chart(containerId, chartOptions);
    } else {
      console.warn(`Container ${containerId} not found, skipping chart rendering.`);
    }
  }


  getTimeSeriesGraph(
    title: string,
    timeSeries: any[],
    valueKey: string,
    statusKey: string = 'status',
    timeKey: string = 'time_bucket',
    bgColor?: string,
    textColor?: string
  ): Highcharts.Options {

    // Status-based colors (same logic, cleaner tones)
    const statusColors: Record<string, string> = {
      CRITICAL: '#d32f2f',
      WARNING: '#f9a825',
      NORMAL: '#1976d2'
    };

    const allTimeBuckets: number[] = [];
    const seriesPoints: { x: number; y: number | null; color: string }[] = [];

    timeSeries.forEach(item => {
      const time = this.convertTimebucket(item[timeKey] ?? item.timestamp);

      if (!allTimeBuckets.includes(time)) {
        allTimeBuckets.push(time);
      }

      const value = item[valueKey];
      const status = item[statusKey];
      const color = statusColors[status] || '#1976d2';

      seriesPoints.push({ x: time, y: value, color });
    });

    const completeSeries = allTimeBuckets
      .sort((a, b) => a - b)
      .map(time => {
        const point = seriesPoints.find(p => p.x === time);
        return point ? point : { x: time, y: null, color: '#90caf9' };
      });

    return {
      chart: {
        type: 'spline',
        backgroundColor: 'transparent',
        height: 230,
        spacingTop: 8,
        spacingBottom: 12,
        marginBottom: 55
      },

      title: { text: undefined },
      credits: { enabled: false },
      exporting: { enabled: false },
      legend: { enabled: false },

      // ---------------- X AXIS ----------------
      xAxis: {
        type: 'datetime',
        lineColor: '#d0d0d0',
        tickColor: '#d0d0d0',
        labels: {
          style: {
            color: textColor || '#555',
            fontSize: '10px'
          },
          y: 18
        }
      },

      // ---------------- Y AXIS ----------------
      yAxis: {
        min: 0,
        max: valueKey === 'apdex' ? 1.0 : undefined,
        tickAmount: 5,
        title: { text: valueKey === 'apdex' ? 'Score' : undefined },
        lineWidth: 1,
        lineColor: '#d0d0d0',
        gridLineColor: '#eeeeee',
        labels: {
          style: {
            color: textColor || '#555',
            fontSize: '10px'
          },
          x: -5
        },
        plotBands: valueKey === 'apdex' ? [
          { from: 0.90, to: 1.0, color: 'rgba(5, 150, 105, 0.05)', label: { text: '' } }, // Excellent
          { from: 0.75, to: 0.89, color: 'rgba(16, 185, 129, 0.05)', label: { text: '' } }, // Good
          { from: 0.60, to: 0.74, color: 'rgba(234, 179, 8, 0.05)', label: { text: '' } }, // Fair
          { from: 0.40, to: 0.59, color: 'rgba(249, 115, 22, 0.05)', label: { text: '' } }, // Poor
          { from: 0.0, to: 0.39, color: 'rgba(239, 68, 68, 0.08)', label: { text: '' } } // Critical
        ] : [],
        startOnTick: true,
        endOnTick: false
      },

      // ---------------- TOOLTIP ----------------
      tooltip: {
        useHTML: true,
        backgroundColor: bgColor || '#ffffff',
        borderColor: textColor || '#d9d9d9',
        borderRadius: 6,
        shadow: true,
        style: {
          color: textColor || '#333',
          fontSize: '12px'
        },
        formatter: function (this: any) {
          const formatString = '%e %b %Y, %I:%M %p';
          return `
          <div style="font-size:12px; color:${textColor || '#333'}">
            <div style="font-weight:600;margin-bottom:4px;">
              ${Highcharts.dateFormat(formatString, this.x as number)}
            </div>
            <div>
              <b>${this.y === null || this.y === undefined ? '-' : (valueKey === 'apdex' ? (this.y as number).toFixed(2) : this.y)}</b>
            </div>
          </div>
        `;
        }
      },

      // ---------------- LINE STYLE ----------------
      plotOptions: {
        spline: {
          lineWidth: 2,
          marker: {
            radius: 2,
            symbol: 'circle'
          },
          states: {
            hover: {
              lineWidth: 2
            }
          }
        }
      },

      // ---------------- SERIES ----------------
      series: [
        {
          name: title,
          type: 'spline',
          data: completeSeries,
          color: valueKey === 'apdex' ? '#8b5cf6' : '#1976d2',
          marker: { enabled: true }
        }
      ]
    };
  }



  renderTreeMapChart(containerId: string, title: string, data: Record<string, number>): void {
    const categories = Object.keys(data);
    const values = Object.values(data);

    const treeMapData = categories.map((key, i) => {
      const value = values[i];
      let color = '#219ebc'; // Default: Normal

      if (value > 75) {
        color = '#E45E5E'; // Critical
      } else if (value > 50) {
        color = '#ED9C40'; // Warning
      }

      return { name: key, value, color };
    });

    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Chart container '${containerId}' not found.`);
      return;
    }

    const options: Highcharts.Options = {
      chart: {
        type: 'treemap',
        backgroundColor: 'transparent',
        height: 200,
        spacing: [5, 5, 5, 5]
      },
      title: { text: undefined },
      tooltip: {
        useHTML: true,
        backgroundColor: 'rgba(43, 49, 74, 0.9)',
        borderColor: '#1f253a',
        style: {
          color: '#ffffff',
          fontSize: '12px'
        },
        formatter: function (this: any): string {
          return `<b>${this.point.name}</b><br/>${this.point.value?.toFixed(1)}%`;
        }
      },
      plotOptions: {
        treemap: {
          layoutAlgorithm: 'squarified',
          dataLabels: {
            enabled: true,
            style: {
              color: '#ffffff',
              fontSize: '10px',
              textOutline: 'none'
            },
            formatter: function () {
              const label = this.name || '';
              return label;
            }
          }
        }
      },
      series: [{
        type: 'treemap',
        name: title,
        data: treeMapData,
        colorByPoint: false,
        showInLegend: false
      }],
      credits: { enabled: false }
    };

    Highcharts.chart(containerId, options);
  }




  loadVersionSummary(): void {
    const baseParams: MrumParams = {
      appName: this.selectedService,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };

    this.mrumService.getAppVersions(baseParams).pipe(
      takeUntil(this.destroy$),
      switchMap((versionRes: any) => {
        if (versionRes?.serviceStatus !== 'Success') {
          this.versionList = [];
          return of([]);
        }

        this.versionList = (versionRes.serviceResponse || [])
          .filter((v: string | null | undefined) => v != null)
          .filter((v: string, i: number, self: string[]) => self.indexOf(v) === i);

        const calls = this.versionList.map(version => {
          return of({ version, res: { serviceStatus: 'Failure' } });
        });

        return forkJoin(calls);
      })
    ).subscribe((results: { version: string, res: any }[]) => {
      results.forEach(({ version, res }) => {
        if (res?.serviceStatus === 'Success') {
          const data = res.serviceResponse;
          this.versionData[version] = {
            throughput: data.throughput ?? null,
            failureRate: data.failure_rate ?? null,
            latency: data.latency ?? null,
            apdex: data.apdex ?? null
          };
        } else {
          this.versionData[version] = {};
        }
      });
    });
  }

  get sortedTransactions(): any[] {
    return new SortPipe().transform(this.transactions, this.sortField, this.sortDirection);
  }



  loadServiceMapData(): void {
    const mrumParams: MrumParams = {
      appName: this.selectedService,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };
    this.mrumService.getAppUsageByCountry(mrumParams).subscribe((response: any) => {
      let dataList = response?.serviceResponse || [];
      this.countryData = dataList;
      const mapOptions = this.getMapChartOptions(dataList, '#f0f9ff', '#0c4a6e');

      setTimeout(() => {
        if (document.getElementById('geo-map-overview')) {
          Highcharts.mapChart('geo-map-overview', mapOptions);
        }
        if (document.getElementById('geo-map-service')) {
          Highcharts.mapChart('geo-map-service', mapOptions);
        }
      }, 0);
    }, error => {
      console.error('Error fetching country map data:', error);
      const dataList: any[] = [];
      this.countryData = dataList;
      const mapOptions = this.getMapChartOptions(dataList, '#f0f9ff', '#0c4a6e');
      setTimeout(() => {
        if (document.getElementById('geo-map-overview')) {
          Highcharts.mapChart('geo-map-overview', mapOptions);
        }
        if (document.getElementById('geo-map-service')) {
          Highcharts.mapChart('geo-map-service', mapOptions);
        }
      }, 0);
    });
  }

  getFlagEmoji(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  updateMap(): void {
    const dataList = this.countryData || [];
    const options = this.getMapChartOptions(dataList, '#f0f9ff', '#0c4a6e');
    setTimeout(() => {
      if (document.getElementById('geo-map-overview')) {
        Highcharts.mapChart('geo-map-overview', options);
      }
      if (document.getElementById('geo-map-service')) {
        Highcharts.mapChart('geo-map-service', options);
      }
    }, 0);
  }

  getMapChartOptions(data: any[], bgColor?: string, textColor?: string): Highcharts.Options {
    const metricLabelMap: Record<string, string> = {
      usagePercent: 'Usage %',
      sessions: 'Sessions',
      crashes: 'Crashes',
      apdex: 'Apdex',
      crashPercent: 'Crash %'
    };

    const metricKey = this.selectedMetric;
    const legendTitle = metricLabelMap[metricKey] || metricKey;

    return {
      chart: {
        map: topology,
        backgroundColor: 'transparent'
      },
      title: { text: undefined },
      mapNavigation: { enabled: true, buttonOptions: { align: 'right' } },
      mapView: {
        fitToGeometry: {
          type: 'MultiPoint',
          coordinates: [[-164, 54], [-35, 84], [179, -38], [-68, -55]]
        }
      },
      legend: {
        title: {
          text: legendTitle,
          style: { color: textColor || '#ccc' }
        },
        align: 'left',
        verticalAlign: 'bottom',
        floating: true,
        layout: 'vertical',
        backgroundColor: 'transparent',
        symbolRadius: 0,
        symbolHeight: 14
      },
      colorAxis: this.getColorAxisForMetric(this.selectedMetric),
      tooltip: {
        useHTML: true,
        backgroundColor: bgColor || '#ffffff',
        borderColor: textColor || '#d9d9d9',
        borderRadius: 6,
        shadow: true,
        style: {
          color: textColor || '#333',
          padding: '8px',
          fontSize: '13px',
          fontFamily: 'inherit'
        },
        formatter: function (this: any) {
          const point = this.point as any;
          return `
          <strong>${point.name}</strong><br/>
          Sessions: ${point.sessions}<br/>
          Crashes: ${point.crashes}<br/>
          Apdex: ${point.apdex}<br/>
          Usage %: ${point.usagePercent}%<br/>
          Crash %: ${point.crashPercent}%
        `;
        }
      },
      series: [{
        type: 'map',
        name: legendTitle,
        animation: true,
        nullColor: '#f8f9fa',
        dataLabels: { enabled: false },
        states: {
          hover: { color: '#a4edba' }
        },
        data: data.map((item: any) => ({
          code: item.countryCode.toUpperCase() === 'UK' ? 'GB' : item.countryCode.toUpperCase(),
          name: item.countryName,
          value: item[metricKey],
          sessions: item.sessions,
          crashes: item.crashes,
          apdex: item.apdex,
          usagePercent: item.usagePercent,
          crashPercent: item.crashPercent
        })),
        joinBy: ['iso-a2', 'code']
      }],
      credits: { enabled: false }
    };
  }

  getColorAxisForMetric(metric: string): any {
    switch (metric) {
      case 'usagePercent':
        return {
          min: 0,
          max: 100,
          stops: [
            [0, '#f44336'],
            [0.5, '#ffeb3b'],
            [1, '#4caf50']
          ]
        };

      case 'sessions':
        return {
          min: 0,
          max: 5000,
          stops: [
            [0, '#e0f7fa'],
            [0.5, '#4dd0e1'],
            [1, '#006064']
          ]
        };

      case 'crashes':
        return {
          min: 0,
          max: 100,
          stops: [
            [0, '#ffcccb'],
            [0.5, '#ff6666'],
            [1, '#b71c1c']
          ]
        };

      case 'apdex':
        return {
          min: 0,
          max: 1,
          stops: [
            [0, '#d32f2f'],
            [0.5, '#fbc02d'],
            [1, '#388e3c']
          ]
        };

      case 'crashPercent':
        return {
          min: 0,
          max: 100,
          stops: [
            [0, '#fff3e0'],
            [0.5, '#ffb74d'],
            [1, '#e65100']
          ]
        };

      default:
        return {
          min: 0,
          max: 100,
          stops: [
            [0, '#d7e9f7'],
            [0.5, '#90caf9'],
            [1, '#1976d2']
          ]
        };
    }
  }


  get totalPages(): number {
    return Math.ceil(this.sortedCountryData.length / this.mapPageSize);
  }

  get totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get sortedCountryData(): any[] {
    return new SortPipe().transform(this.countryData, this.sortField, this.sortDirection);
  }

  get paginatedData(): any[] {
    const start = (this.mapCurrentPage - 1) * this.mapPageSize;
    return this.sortedCountryData.slice(start, start + this.mapPageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.mapCurrentPage = page;
    }
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


  onClick1(event: any) {
    document.querySelectorAll('.trace-dropdown').forEach(dropdown => dropdown.remove());
    const dropdown = document.createElement('div');
    dropdown.className = 'trace-dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.left = `${event.pageX}px`;
    dropdown.style.top = `${event.pageY}px`;
    dropdown.style.background = 'white';
    dropdown.style.border = '1px solid black';
    dropdown.style.padding = '5px';
    dropdown.style.zIndex = '1000';
    const removeDropdown = () => {
      dropdown.remove();
      document.removeEventListener('click', hideDropdown);
    };
    const viewRelatedTracesOption = document.createElement('div');
    viewRelatedTracesOption.textContent = 'View Related Trace';
    viewRelatedTracesOption.style.cursor = 'pointer';
    viewRelatedTracesOption.onclick = () => {
      this.handleViewRelatedTraces1(event.point);
      removeDropdown(); // Remove dropdown after clicking
    };
    dropdown.appendChild(viewRelatedTracesOption);
    document.body.appendChild(dropdown);
    const hideDropdown = (e: any) => {
      if (!dropdown.contains(e.target)) {
        removeDropdown();
      }
    };
    setTimeout(() => document.addEventListener('click', hideDropdown), 0);
  }

  handleViewRelatedTraces1(point: any) {
    // this.openModal1(point);
  }


  buildQueryParamsTransactions(txn: string) {
    return this.cleanParams({
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      serviceId: this.transactionFilters.appName,
      appVersion: this.transactionFilters?.appVersion?.trim(),
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

  buildQueryParamsDependencies(dependency: string) {
    return this.cleanParams({
      dep: dependency,
      serviceId: this.selectedService,
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      appVersion: this.dependencyFilters?.appVersion?.trim(),
      osVersion: this.dependencyFilters?.osVersion?.trim(),
      device: this.dependencyFilters?.device?.trim(),
    });
  }

  generateMockTimeSeries(valueKey: string, minVal: number, maxVal: number, pointsCount: number = 24): any[] {
    const timeSeries = [];

    let startMs = new Date().getTime() - 24 * 60 * 60 * 1000;
    let endMs = new Date().getTime();

    if (this.startTime && this.endTime && this.startTime.toString().length === 12 && this.endTime.toString().length === 12) {
      const parseStr = (str: string) => {
        const y = parseInt(str.substring(0, 4), 10);
        const m = parseInt(str.substring(4, 6), 10) - 1;
        const d = parseInt(str.substring(6, 8), 10);
        const h = parseInt(str.substring(8, 10), 10);
        const min = parseInt(str.substring(10, 12), 10);
        return new Date(y, m, d, h, min).getTime();
      };
      startMs = parseStr(this.startTime.toString());
      endMs = parseStr(this.endTime.toString());
    }

    const stepMs = (endMs - startMs) / Math.max(1, (pointsCount - 1));

    for (let i = 0; i < pointsCount; i++) {
      const d = new Date(startMs + i * stepMs);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hour = String(d.getHours()).padStart(2, '0');
      const minute = String(d.getMinutes()).padStart(2, '0');
      const timebucket = `${year}${month}${day}${hour}${minute}`;

      let val: number;
      if (valueKey === 'apdex') {
        val = 0.72 + Math.random() * 0.23;
      } else {
        val = Math.random() * (maxVal - minVal) + minVal;
      }

      timeSeries.push({
        time_bucket: timebucket,
        [valueKey]: parseFloat(val.toFixed(2)),
        status: val > maxVal * 0.9 ? 'CRITICAL' : val > maxVal * 0.7 ? 'WARNING' : 'NORMAL'
      });
    }
    return timeSeries;
  }

  getDynamicRateHeader(type: 'Crash' | 'Error'): string {
    const totalSessions = this.errorsCrashesOverview?.totalSessions || 0;
    if (totalSessions >= 1000) {
      return `${type} / 1K Sessions`;
    } else if (totalSessions >= 100) {
      return `${type} / 100 Sessions`;
    }
    return `${type}s`;
  }

  getDynamicRateValue(count: number): number {
    const totalSessions = this.errorsCrashesOverview?.totalSessions || 0;
    if (totalSessions >= 1000) {
      return totalSessions > 0 ? (count / (totalSessions / 1000)) : 0;
    } else if (totalSessions >= 100) {
      return totalSessions > 0 ? (count / (totalSessions / 100)) : 0;
    }
    return count;
  }

}
