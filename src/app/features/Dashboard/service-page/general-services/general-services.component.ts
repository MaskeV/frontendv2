import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { catchError, filter, finalize, forkJoin, from, map, merge, Observable, of, Subject, Subscription, switchMap, takeUntil, throwError, withLatestFrom } from 'rxjs';
import { ApmApiService } from '../../../../services/apm-api.service';
import * as Highcharts from 'highcharts';
import { DateService } from '../../../../services/date.service';
import { AutoRefreshService } from '../../../../services/auto-refresh.service';
import { FormsModule } from '@angular/forms';
import { InstanceDataMap } from '../../../../models/instanceData';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DecoderService } from '../../../../services/decoder.service';
import { EndpointDataMap } from '../../../../models/endpointData';
import { Span } from '../../../../models/traceData';
import * as d3 from 'd3';
import { TopologyModalComponent } from './topology-modal/topology-modal.component';
import { TableViewComponent } from "./table-view/table-view.component";
import { ListViewComponent } from "./list-view/list-view.component";
import { TreeViewComponent } from "./tree-view/tree-view.component";
import { StatViewComponent } from "./stat-view/stat-view.component";
import { TraceDetailsModalComponent } from "./trace-details-modal/trace-details-modal.component";
import { TraceDetailsComponent } from '../trace-details/trace-details.component';
import { HighchartsChartModule } from "highcharts-angular";
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ServiceIdService } from '../../../../services/service-id.service';
import { MeteringConfigService } from '../../../../services/metering-config.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as bootstrap from 'bootstrap';
import { ApplicationService } from '../../../../services/application.service';
import { AuthenticationService } from '../../../../services/authentication.service';
import { LoggerService } from '../../../../services/logger.service';
import { User } from '../../../../models/user';
import { Session } from '../../../../models/session';

interface NodeDatum extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  componentName?: string;
  layer?: string;
  openAlertCount?: number;
}

interface LinkDatum extends d3.SimulationLinkDatum<NodeDatum> {
  source: string | NodeDatum;
  target: string | NodeDatum;
  load?: number | string;
}

@Component({
  selector: 'app-general-services',
  imports: [
    RouterModule,
    CommonModule,
    HighchartsChartModule,
    TraceDetailsModalComponent,
    FormsModule,
    TableViewComponent,
    ListViewComponent,
    StatViewComponent,
    TreeViewComponent,
    MatButtonModule,
    MatTooltipModule,
    TraceDetailsComponent
  ],
  templateUrl: './general-services.component.html',
  styleUrl: './general-services.component.css'
})
export class GeneralServicesComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('svgElement', { static: true }) svgElement!: ElementRef;
  @ViewChild('traceDetailsSection') traceDetailsSection!: ElementRef;
  @ViewChild('traceDetails') traceDetailModal!: TraceDetailsComponent;

  private storageSub!: Subscription;
  private destroy$ = new Subject<void>();
  private subscription: Subscription = new Subscription();
  subscriptions: Subscription = new Subscription();
  private refreshSubject = new Subject<void>();
  refresh$ = this.refreshSubject.asObservable();

  Highcharts: typeof Highcharts = Highcharts;

  user: User = new User();
  currentUser: User | null = null;
  sessionObject: Session = new Session();
  private refreshIntervalId: any;


  datemodel: any;
  isAutoRefreshEnabled!: boolean;
  refreshInterval!: number;

  selectedService!: string;
  entityId!: string | null;
  startTime!: number;
  endTime!: number;
  thresholdst!: number;

  logoPath: any;

  infraName: string = '';
  dbName: string = '';
  infraId: string = '';
  ipType: string = '';

  alertData: any[] = [];
  private searchDebounceTimer: any;

  uptimeData1Day: any;
  uptimeData5Day: any;
  uptimeData10Day: any;

  healthScore = {}
  projectHealthScore: any;

  successRate: number = 0;
  apdexValue: number = 0;
  latencyValue: number = 0;
  avgLoadValue: number = 0;
  totalHitsValue: number = 0;
  errorValue: number = 0;
  ignoredErrorCount: number = 0;

  healthMetrics: Record<string, any> = {};
  appHealthScore: any;
  applicationMetrics: Record<string, any> = {};
  infraHealthScore: any;
  infraHealthScores: { name: string; value: number }[] = [];
  infraMetrics: Record<string, any> = {};
  dbHealthScore: any;
  dbFailingMetricsMap: Record<string, Array<{ key: string; criticalValue: number; warningValue: number; aggregatedValue: number; status?: string; metricWeight?: number; weightedScore?: number; }>> = {};
  infraNotMapped = false;
  dbNotMapped = false;

  chart_criteria: string | null = 'avg';
  latency_chart_data: string = "service_resp_time";

  charts: Highcharts.Chart[] = [];
  successRateTimeValueChart: Highcharts.Chart | null = null;
  serviceAvgResponseTimeChart: Highcharts.Chart | null = null;
  ServiceApdexTimeValueChart: Highcharts.Chart | null = null;
  serviceLoadTimeValueChart: Highcharts.Chart | null = null;

  successRateTimestamps: number[] = [];
  serviceApdexTimestamps: number[] = [];
  serviceLoadTimestamps: number[] = [];
  combinedDataTimestamps: number[] = [];

  endpointChart: Highcharts.Options | null = null;
  uptime1DaysChart: Highcharts.Options | null = null;
  uptime5DaysChart: Highcharts.Options | null = null;
  uptime10DaysChart: Highcharts.Options | null = null;
  projectHealthChart: Highcharts.Options | null = null;
  infraHealthChart: Highcharts.Options | null = null;
  dbHealthChart: Highcharts.Options | null = null;

  thresholds: any = {};
  slaValue: number = 0;
  componentId: string | null = '';

  successRateInfo: string = "Shows the percentage of successful requests over time. Helps track system reliability and detect failures or errors in operations.";
  apdexInfo: string = " Measures user satisfaction based on response times. Higher values indicate better perceived performance; lower values signal potential performance issues.";
  loadInfo: string = "Indicates the number of active requests or tasks on the system. Helps assess system stress and detect when resources may be saturated.";
  latencyInfo: string = "Shows the response time of requests over time. Monitoring latency helps identify slow operations and potential performance bottlenecks.";
  hf: string = "(Score of each KPI × Weight of KPI) / Total Weight of all KPIs used. "

  dbAvgRespTime: string = "Average time taken by the database to respond to queries.";
  dbSuccessRate: string = "Percentage of successful database access attempts out of total attempts.";
  dbTraffic: string = "Number of database calls made per minute.";
  dbLatencyPercentile: string = "Response time threshold within which a certain percentage of database requests complete.";

  healthScoreTitle: string = "Project Health Score = (Σ weightedScores of all metrics) / (Σ metricWeights), rounded to two decimal places. The weighted score is each metric’s status (Normal = 100, Warning = 50, Critical = 0) weight multiplied by its metric weight."

  // INSTANCE

  loadingInstance: boolean = true;

  instanceLoadData: any[] = [];
  slowInstanceData: any[] = [];
  instanceSuccessRateData: any;

  entityInstanceId!: string;
  instanceNames: string[] = [];
  instanceId: InstanceDataMap = {};
  filteredInstanceNames: string[] = [];

  currentPageInstance: number = 1;
  rowsPerPageInstance: number = 20;
  totalHitsInstance: number = 0;
  totalPagesInstance: number = 0;

  serviceInstanceLoadTimeValueChart: Highcharts.Options | null = null;
  instShowPopup: boolean = false;
  instPopupX: number = 0;
  instPopupY: number = 0;
  serviceInstanceSuccessRateTimevaluesChart: Highcharts.Options | null = null;
  instShowSrPopup: boolean = false;
  instPopupSrX: number = 0;
  instPopupSrY: number = 0;
  serviceInstanceLatencyTimevaluesChart: Highcharts.Options | null = null;
  instShowLtPopup: boolean = false;
  instPopupLtX: number = 0;
  instPopupLtY: number = 0;


  // ENDPOINT
  loadingEndpoints = false;

  endpointLoadData: any[] = [];
  slowEndpointData: any[] = [];
  endpointSuccessRateData: any;

  entityEndpointId!: string;
  endPointNames: any[] = [];
  endpointId: EndpointDataMap = {};

  searchTextEndpoint: string = '';
  endpointSortBy: string = '';
  endpointFilter: string = '';
  endpointOrder: 'asc' | 'desc' = 'asc';
  columnDropdownOpen: boolean = false;
  showColumns = {
    endpoints: true,
    load: true,
    successRate: true,
    failureCount: true,
    failureRate: true,
    latency: true,
    hits: true,
    c1xx: true,
    c2xx: true,
    c3xx: true,
    c4xx: true,
    c5xx: true
  };
  errorCountEndpoint: number = 0;
  currentPageEndpoint: number = 1;
  rowsPerPageEndpoint: number = 20;
  totalHitsEndpoint: number = 0;
  totalPagesEndpoint: number = 0;

  EndpointLoadChart: Highcharts.Options | null = null;
  showPopup: boolean = false;
  popupX: number = 0;
  popupY: number = 0;
  EndpointSuccessRateChart: Highcharts.Options | null = null;
  showSRPopup: boolean = false;
  popupSrX: number = 0;
  popupSrY: number = 0;
  EndpointAvgResponseTimeChart: Highcharts.Options | null = null;
  showLtPopup: boolean = false;
  popupLtX: number = 0;
  popupLtY: number = 0;

  // TOPOLOGY

  private themeObserver: MutationObserver | undefined;
  width = 1250;
  height = 450;
  nodeRadius = 18;
  nodes: any[] = [];
  links: any[] = [];
  selectedTopologyLevel: number = 1;

  // Topology Sidebar properties
  selectedTopologyLayer: string = 'ALL';
  availableLayers: string[] = ['ALL', 'Service', 'Message Queue', 'Database', 'Cache', 'External API', 'Other'];

  getLayerColor(layer: string): string {
    switch (layer) {
      case 'Service': return '#9333ea'; // Purple
      case 'Database': return '#eab308'; // Yellow
      case 'Message Queue': return '#8b4513'; // Brown
      case 'Cache': return '#f97316'; // Orange
      case 'External API': return '#14b8a6'; // Teal
      case 'User': return '#22c55e'; // Green
      case 'ALL': return '#6366f1'; // Indigo for ALL
      case 'Other':
      default: return '#94a3b8'; // Gray
    }
  }

  getLayerCount(layer: string): number {
    if (layer === 'ALL') return this.nodes.length;
    return this.nodes.filter(n => n.layer === layer).length;
  }

  selectLayer(layer: string): void {
    this.selectedTopologyLayer = layer;
    this.updateGraphVisibility();
  }

  updateGraphVisibility(): void {
    if (!this.svgElement) return;
    const svg = d3.select(this.svgElement.nativeElement);
    
    // Update nodes opacity
    svg.selectAll('.node')
      .transition().duration(300)
      .style('opacity', (d: any) => {
        if (this.selectedTopologyLayer === 'ALL') return 1;
        return d.layer === this.selectedTopologyLayer ? 1 : 0.15;
      });

    // Update links opacity
    svg.selectAll('.link')
      .transition().duration(300)
      .style('opacity', (d: any) => {
        if (this.selectedTopologyLayer === 'ALL') return 1;
        const sourceLayer = d.source.layer;
        const targetLayer = d.target.layer;
        if (sourceLayer === this.selectedTopologyLayer || targetLayer === this.selectedTopologyLayer) {
          return 1;
        }
        return 0.15;
      });
  }

  // TRACE

  loadingTrace: boolean = false;

  traceNames: any[] = [];
  selectedTraceId: string | null = null;

  currentPageTrace: number = 1;
  rowsPerPageTrace: number = 20;
  totalHitsTrace: number = 0;
  totalPagesTrace: number = 0;

  instancesTraces: any;
  instanceTraces: any;
  endpointsTraces: any;
  endpointTraces: any;

  traceIDTrace: string | undefined = '';
  instNameTrace: string = 'All';
  endpointTrace: string = 'All';
  textEndpoint: string = '';
  traceState: string = '';
  minDuration!: any;
  maxDuration!: any;
  statusCodeTrace: string = 'All';
  customStatusCodeTrace: string = '';
  tagsList: string[] = [];
  tagsTrace: string = '';
  tagValidationError: boolean = false;
  sortParameter: 'start_time' | 'duration' | 'isError' = 'start_time';
  orderParameter: 'asc' | 'dec' = 'dec';

  selectedItem: string | null = null;
  hierarchicalList: any[] = [];
  traceMetaData: any[] = [];
  selectedView: 'list' | 'tree' | 'table' | 'stat' = 'table';
  public traceData!: Array<Span>;

  showModal: boolean = false;

  modalData: {
    serviceCode: any;
    serviceInstanceName: any;
    endpointName: any;
    type: any;
    component: any;
    peer: any;
    isError: any;
    tags: any;
    logs: any;
  } | null = null;


  // LOGS

  loadingLogs: boolean = true;

  entityLogId!: string;
  logNames: any[] = [];
  logStats: any;

  currentPageLog: number = 1;
  rowsPerPageLog: number = 20;
  totalHitsLog: number = 0;
  totalPagesLog: number = 0;

  instancesLogs: any;
  instanceLogs: any;
  endpointsLogs: any;
  endpointLogs: any;

  traceIDLogs: string | null = '';
  tags: string = '';
  instNameLogs: string = 'All';
  endpointLog: string = 'All';
  keywordsOfContent: string = '';
  excludingKeywordsOfContent: string = '';
  sortLogs: boolean = false;

  logsTimeSeriesChart: Highcharts.Options | null = null;

  // DATABASE

  dbNames: string[] = [];
  selectedDb: string = '';
  databaseSuccessRate: number = 0;
  databaseLatency: number = 0;
  databaseLoad: number = 0;

  uptimeDatabase = {
    "sevenDays": [
      {
        count: 92,
        type: 'Uptime for 7 days'
      }
    ]
  };

  charts2: Highcharts.Chart[] = [];
  databaseAccessSuccessRateChart: Highcharts.Chart | null = null;
  databaseAvgResponseTimeChart: Highcharts.Chart | null = null;
  databaseTrafficChart: Highcharts.Chart | null = null;
  databaseAccessLatencyPercentileChart: Highcharts.Chart | null = null;
  databaseSlowStatementsChart: Highcharts.Options | null = null;
  databaseUptimeChart: Highcharts.Options | null = null;

  constructor(
    private dateService: DateService,
    private apmApiService: ApmApiService,
    private autoRefresh: AutoRefreshService,
    private decoderService: DecoderService,
    private modalService: NgbModal,
    private router: Router,
    private serviceIdService: ServiceIdService,
    private meteringConfigService: MeteringConfigService,
    private snackBar: MatSnackBar,
    private applicationService: ApplicationService,
    private authService: AuthenticationService,
    private loggerService: LoggerService,
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(el => {
          const instance = bootstrap.Tooltip.getInstance(el);
          if (instance) {
            instance.hide();
            instance.dispose();
          }
        });
      }
    });
  }

  ngOnInit(): void {
    this.authService.currentUser.subscribe((x) => (this.currentUser = x));
    this.entityId = sessionStorage.getItem('encodedEntityIDForServices');
    this.selectedService = sessionStorage.getItem('SelectedServiceId')!;

    this.logoPath = sessionStorage.getItem('logoPath');

    this.dateService.setActiveComponent('GeneralServiceApmComponent');
    this.loadInitialValues();
    this.manageAutoRefresh();
    try {
      this.storageSub = this.autoRefresh.getStorageSub().subscribe((data) => {
        if (data?.key === 'RefreshEnability') {
          this.isAutoRefreshEnabled = JSON.parse(data.value);
          this.manageAutoRefresh();
        }
        else if (data?.key === 'RefreshInterval') {
          this.refreshInterval = Number(data.value);
          this.manageAutoRefresh();
        }
      });
    }
    catch {
      console.log("Exception Occurred!");
    }

    this.subscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'GeneralServiceApmComponent'),
      switchMap(() => merge(
        // normal date change
        this.dateService.date$,

        // auto refresh → re-emit latest date
        this.dateService.refresh$.pipe(
          withLatestFrom(this.dateService.date$),
          map(([_, date]) => date)
        )
      ))
    ).subscribe(dates => {
      this.datemodel = dates;
      const activeElement = document.querySelector('#service-nav .nav-link.active') as HTMLAnchorElement;
      var activeTab = activeElement?.getAttribute('href')?.replace('#', '');
      if (sessionStorage.getItem('traceStartTime') && sessionStorage.getItem('traceEndTime')) {
        this.traceState = 'error';
        const storedStart = sessionStorage.getItem('traceStartTime');
        const storedEnd = sessionStorage.getItem('traceEndTime');
        this.startTime = Number(storedStart);
        this.endTime = Number(storedEnd);
        activeTab = sessionStorage.getItem('selectedTab')!;
        sessionStorage.removeItem('traceStartTime');
        sessionStorage.removeItem('traceEndTime');
        sessionStorage.removeItem('selectedTab');
        this.activateTabUI(activeTab);
      }
      else if (sessionStorage.getItem('logsErrorStartTime') && sessionStorage.getItem('logsErrorEndTime')) {
        this.tags = 'error';
        const storedStart = sessionStorage.getItem('logsErrorStartTime');
        const storedEnd = sessionStorage.getItem('logsErrorEndTime');
        this.startTime = Number(storedStart);
        this.endTime = Number(storedEnd);
        activeTab = sessionStorage.getItem('selectedTab')!;
        sessionStorage.removeItem('logsErrorStartTime');
        sessionStorage.removeItem('logsErrorEndTime');
        sessionStorage.removeItem('selectedTab');
        this.activateTabUI(activeTab);
      }
      else if (sessionStorage.getItem('dbStartTime') && sessionStorage.getItem('dbEndTime')) {
        this.selectedDb = sessionStorage.getItem('selectedDb')!;
        const storedStart = sessionStorage.getItem('dbStartTime');
        const storedEnd = sessionStorage.getItem('dbEndTime');
        this.startTime = Number(storedStart);
        this.endTime = Number(storedEnd);
        activeTab = sessionStorage.getItem('selectedTab')!;
        sessionStorage.removeItem('dbStartTime');
        sessionStorage.removeItem('dbEndTime');
        sessionStorage.removeItem('selectedTab');
        sessionStorage.removeItem('selectedDb');
        this.activateTabUI(activeTab);
      }
      else if (sessionStorage.getItem('appLatencyStartTime') && sessionStorage.getItem('appLatencyEndTime')) {
        const storedStart = sessionStorage.getItem('appLatencyStartTime');
        const storedEnd = sessionStorage.getItem('appLatencyEndTime');
        this.startTime = Number(storedStart);
        this.endTime = Number(storedEnd);
        activeTab = sessionStorage.getItem('selectedTab')!;
        sessionStorage.removeItem('appLatencyStartTime');
        sessionStorage.removeItem('appLatencyEndTime');
        sessionStorage.removeItem('selectedTab');
        this.activateTabUI(activeTab);
      }
      else {
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.thresholdst = this.formatForThresholdDate(this.datemodel.startdateTime);

        if (this.currentUser) {
          this.user = this.currentUser;
        }
        this.user.sessionDTO = this.sessionObject;
        this.sessionObject.featureName = 'RUAMBOT';
        this.sessionObject.requestURI = this.router.url.split('?')[0];
        this.sessionObject.userId = this.user.userId;
        this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
        this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
        this.sessionObject.browserName =
          this.loggerService.getBrowserNameAndVersion().name;
        this.sessionObject.browserVersion =
          this.loggerService.getBrowserNameAndVersion().version;

        const activeTab = document.querySelector('#service-nav .nav-link.active') as HTMLElement;
        if (activeTab) {
          const tabName = activeTab.getAttribute('href')?.replace('#', '');
          if (tabName) {
            this.loadData(tabName);
          }
        }
      }
      // this.loadInitialValues();
      //   try {
      //   this.storageSub = this.autoRefresh.getStorageSub().subscribe((data) => {
      //     if (data?.key === 'RefreshEnability') {
      //       this.isAutoRefreshEnabled = JSON.parse(data.value);
      //       this.manageAutoRefresh();
      //     }
      //     else if (data?.key === 'RefreshInterval') {
      //       this.refreshInterval = Number(data.value);
      //       this.manageAutoRefresh();
      //     }
      //   });
      // }
      // catch {
      //   console.log("Exception Occurred!");
      // }
    });
  }

  ngAfterViewInit(): void {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
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

  private manageAutoRefresh() {
    this.clearAutoRefresh();
    if (!this.isAutoRefreshEnabled) return;

    if (this.isAutoRefreshEnabled) {
      this.refreshIntervalId = setInterval(() => {
        this.reloadPage();
      }, this.refreshInterval * 1000);
    }
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

  private clearAutoRefresh() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  reloadPage() {
    this.dateService.triggerFunctionCall1();
  }

  activateTabUI(tabId: string): void {
    const tabLink = document.querySelector(`#service-nav a[href="#${tabId}"]`) as HTMLElement;
    if (tabLink) {
      tabLink.click();
    } else {
    }
  }

  formatDate(date: any) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  formatForThresholdDate(dateStr: string): number {
    const yyyy = parseInt(dateStr.substring(0, 4));
    const MM = parseInt(dateStr.substring(4, 6)) - 1;
    const dd = parseInt(dateStr.substring(6, 8));
    const hh = parseInt(dateStr.substring(8, 10));
    const mm = parseInt(dateStr.substring(10, 12));

    let inputDate = new Date(yyyy, MM, dd, hh, mm);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(inputDate);
    checkDate.setHours(0, 0, 0, 0);
    if (checkDate.getTime() === today.getTime()) {
      inputDate.setDate(inputDate.getDate() - 1);
    }

    const newYYYY = inputDate.getFullYear();
    const newMM = String(inputDate.getMonth() + 1).padStart(2, "0");
    const newDD = String(inputDate.getDate()).padStart(2, "0");
    const newHH = String(inputDate.getHours()).padStart(2, "0");
    const newMMm = String(inputDate.getMinutes()).padStart(2, "0");

    return parseInt(`${newYYYY}${newMM}${newDD}${newHH}${newMMm}`);
  }

  parseTimeBucket(bucket: string): Date {
    const year = +bucket.slice(0, 4);
    const month = +bucket.slice(4, 6) - 1;
    const day = +bucket.slice(6, 8);
    const hour = +bucket.slice(8, 10);
    const minute = +bucket.slice(10, 12);
    return new Date(year, month, day, hour, minute);
  }

  loadData(tabName: string): void {
    this.instShowPopup = false;
    this.instShowSrPopup = false;
    this.instShowLtPopup = false;
    this.showPopup = false;
    this.showSRPopup = false;
    this.showLtPopup = false;
    this.showAlerts = false;
    this.destroy$.next();
    switch (tabName) {
      case 'overview':
        this.componentId = this.entityId;
        this.getAppWeight();
        this.getThreshold("SERVICE");
        this.getEndpointChartData();
        this.getUptime()
        this.getAlertCounts();
        this.getOverviewKpi();
        this.getAppDbInfraMapping();

        break;
      case 'instance':
        this.getServiceInstanceLoad();
        this.getSlowServiceInstance();
        this.getServiceInstanceSuccessRate();
        this.getServiceInstanceNames();
        break;
      case 'endpoint':
        this.getEndpointsLoadInCurrentService();
        this.getSlowEndpointsInCurrentService();
        this.getEndpointSuccessRateInCurrentService();
        this.getEndpointNames();
        break;
      case 'topology':
        this.loadTopologyData();
        break;
      case 'trace':
        this.fetchInstances();
        this.fetchEndpoints();
        this.getTraceNames();
        this.getTraceSegmentsCount();
        break;
      case 'log':
        this.getLogNames();
        this.getLogsAggregatedData();
        this.getLogsAggregatedData2();
        this.getLogsCountTimeSeries();
        break;
      case 'db':
        this.getDatabaseNamesForServices();
        this.getDatabaseUptime();
        break;
    }
  }

  openEndpointTabSearch(selectedEndpoint: any): void {
    const endpointTab = document.querySelector('.nav-link[href="#endpoint"]') as HTMLElement;
    if (endpointTab) {
      endpointTab.click();
    }
    this.searchTextEndpoint = selectedEndpoint + ':';
    this.endpointSortBy = 'success_rate';
    this.endpointOrder = 'asc';
    this.getEndpointNames();
  }

  // getThreshold(type: string) {
  //   this.meteringConfigService.getThreshold(this.entityId, this.componentId, null, this.thresholdst, this.endTime, type)
  //     .subscribe(res => {
  //       this.thresholds = res;
  //     });
  //   if (type === 'SERVICE') {
  //     this.getSuccessRateTimeValue();
  //     this.getServiceApdexTimeValue();
  //     this.getCombinedResponseData();
  //     this.getServiceLoadTimeValue();
  //   }
  // }

  getThreshold(type: string) {
    const appId = sessionStorage.getItem("ApplicationId");
    let payload = {};
    if (type === 'DATABASE') {
      payload = {
        appId,
        serviceId: this.componentId,
        st: this.thresholdst,
        et: this.endTime,
        type: 'DATABASE',   // probably should also be DATABASE
        alertMetadata: [this.selectedDb]
      };
    } else {
      payload = {
        appId,
        serviceId: this.entityId,
        st: this.thresholdst,
        et: this.endTime,
        type: 'SERVICE'
      };
    }
    
    this.meteringConfigService.getThreshold(payload)
      .subscribe({
        next: (res: any) => {

          if (!res || typeof res !== "object" || Array.isArray(res)) {
            console.error("Invalid threshold response structure:", res);
            return;
          }

          const invalidEntry = Object.values(res).some((item: any) => {
            if (!item || typeof item !== "object") {
              return true;
            }

            const {
              criticalValue,
              warningValue,
              avgBaseline
            } = item;

            if (
              (typeof criticalValue === "number" && criticalValue < 0) ||
              (typeof warningValue === "number" && warningValue < 0) ||
              (typeof avgBaseline === "number" && avgBaseline < 0)
            ) {
              return true;
            }

            return false;
          });

          if (invalidEntry) {
            console.error("Invalid or negative values found in threshold response. Ignoring response:", res);
            return;
          }

          this.thresholds = res;
        },

        error: (err) => {
          console.error("Failed to load threshold data:", err);
        }
      });

      console.log("Type is: ", type);

    if (type === 'SERVICE') {
      console.log("Calling APIS");
      this.getSuccessRateTimeValue();
      this.getServiceApdexTimeValue();
      this.getCombinedResponseData();
      this.getServiceLoadTimeValue();
    }
  }


  // getOverviewKpi(): void {
  //   this.apmApiService.getInstanceOverviewKpi(this.entityId!, '', this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.errorValue = data.error_count;
  //     this.totalHitsValue = data.hit_count;
  //   })
  // }

  getOverviewKpi(): void {
    this.apmApiService
      .getInstanceOverviewKpi(this.entityId!, '', this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid overview KPI response structure:", data);
            return;
          }

          const invalidEntry =
            typeof data.hit_count !== "number" ||
            typeof data.error_count !== "number" ||
            data.hit_count < 0 ||
            data.error_count < 0;

          if (invalidEntry) {
            console.error("Invalid or negative overview KPI values found. Ignoring response:", data);
            return;
          }

          this.errorValue = data.error_count;
          this.totalHitsValue = data.hit_count;
          this.ignoredErrorCount = data.ignored_error_count;
        },

        error: (err) => {
          console.error("Failed to load overview KPI data:", err);
        }
      });
  }


  goToProblemPage(): void {
    this.router.navigate(['/problemPage'], { queryParams: { from: 'service-page' } });
  }

  getAlertCounts(): void {
    this.apmApiService.getCombinedData([this.entityId || ''], this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        if (response && response.length > 0) {
           const data = response[0];
           this.alertData = [{
              total_count: data.total_alert_count !== undefined ? data.total_alert_count : data.total_count,
              openalertcount: data.openalertcount !== undefined ? data.openalertcount : (data.open_alert_count !== undefined ? data.open_alert_count : 0),
              closealertcount: data.closealertcount !== undefined ? data.closealertcount : (data.closed_alert_count !== undefined ? data.closed_alert_count : (data.close_alert_count !== undefined ? data.close_alert_count : 0))
           }];
        } else {
           this.alertData = [{ total_count: 0, openalertcount: 0, closealertcount: 0 }];
        }
      });
  }

  goToInfra(): void {
    this.serviceIdService.setServiceId(this.infraName);
    const encodedId = this.serviceIdService.getEncodedServiceId();
    sessionStorage.setItem('encodedServiceIdForInfra', encodedId);
    sessionStorage.setItem('serviceIdForInfra', this.infraName);
    this.router.navigate(['/infra/linux-service']);
  }

  goToDatabase(dbName: string): void {
    this.selectedDb = dbName;
    sessionStorage.setItem('SelectedDb', dbName);
    this.componentId = btoa(this.selectedDb) + '.0';

    const dbTab = document.querySelector('.nav-link[href="#db"]') as HTMLElement;
    if (dbTab) dbTab.click();

    this.getDatabaseAvgResponseTime();
    this.getDatabaseAccessSuccessRate();
    this.getDatabaseTraffic();
    this.getDatabaseAccessLatencyPercentile();
    this.getDatabaseSlowStatements();
    this.getThreshold("DATABASE");
  }

  getColor(value: number): string {
    const red = [239, 68, 68];      // #ef4444 (soft red)
    const yellow = [245, 158, 11];  // #f59e0b (warm amber)
    const green = [34, 197, 94];    // #22c55e (fresh green)

    let r, g, b;

    if (value <= 50) {
      const factor = value / 50;
      r = Math.round(red[0] + factor * (yellow[0] - red[0]));
      g = Math.round(red[1] + factor * (yellow[1] - red[1]));
      b = Math.round(red[2] + factor * (yellow[2] - red[2]));
    } else {
      const factor = (value - 50) / 50;
      r = Math.round(yellow[0] + factor * (green[0] - yellow[0]));
      g = Math.round(yellow[1] + factor * (green[1] - yellow[1]));
      b = Math.round(yellow[2] + factor * (green[2] - yellow[2]));
    }

    return `rgba(${r},${g},${b})`;
  }

  getColor2(value: number): string {
    const red = [239, 68, 68];      // #ef4444 (soft red)
    const yellow = [245, 158, 11];  // #f59e0b (warm amber)
    const green = [34, 197, 94];    // #22c55e (fresh green)
    // const green = [40, 167, 69];

    let r, g, b;

    if (value <= 50) {
      const factor = value / 50;
      r = Math.round(red[0] + factor * (yellow[0] - red[0]));
      g = Math.round(red[1] + factor * (yellow[1] - red[1]));
      b = Math.round(red[2] + factor * (yellow[2] - red[2]));
    } else {
      const factor = (value - 50) / 50;
      r = Math.round(yellow[0] + factor * (green[0] - yellow[0]));
      g = Math.round(yellow[1] + factor * (green[1] - yellow[1]));
      b = Math.round(yellow[2] + factor * (green[2] - yellow[2]));
    }

    const baseColor = `rgba(${r},${g},${b},1)`;
    const lighterColor = `rgba(${Math.min(r + 60, 255)},${Math.min(g + 60, 255)},${Math.min(b + 60, 255)},1)`;
    const darkerColor = `rgba(${Math.max(r - 40, 0)},${Math.max(g - 40, 0)},${Math.max(b - 40, 0)},1)`;

    return `linear-gradient(135deg, ${lighterColor} 0%, ${baseColor} 50%, ${darkerColor} 100%)`;
  }

  getRows(items: any[]): any[][] {
    const rowSize = 6;
    const rows = [];
    for (let i = 0; i < items.length; i += rowSize) {
      rows.push(items.slice(i, i + rowSize));
    }
    return rows;
  }

  getHealthItems() {
    const items: { name: string; value: number; type: string }[] = [];

    if (this.appHealthScore !== undefined) {
      items.push({ name: this.selectedService || 'Service', value: this.appHealthScore, type: 'Service' });
    }

    // Add all infra entries
    if (this.infraHealthScores?.length) {
      this.infraHealthScores.forEach(infra => {
        items.push({ name: infra.name || 'Infra', value: infra.value, type: 'Infra' });
      });
    }

    if (this.dbHealthScore?.length) {
      items.push(...this.dbHealthScore);
    }

    return items;
  }

  getHealthScoreValueApplication(): void {
    const appId = sessionStorage.getItem("ApplicationId");
    this.apmApiService
      .getHealthScoreValue(
        appId,
        this.entityId!,
        this.entityId!,
        this.thresholdst,
        this.startTime,
        this.endTime,
        'SERVICE'
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid application health score response structure:", data);
            return;
          }

          if (
            data.projectHealthScore !== undefined &&
            (typeof data.projectHealthScore !== "number" || data.projectHealthScore < 0)
          ) {
            console.error(
              "Invalid or negative 'projectHealthScore' found. Ignoring response:",
              data
            );
            return;
          }

          if (data.metrics !== undefined && typeof data.metrics !== "object") {
            console.error("Invalid 'metrics' structure in application health score:", data);
            return;
          }

          const metricsValues = data.metrics ? Object.values(data.metrics) : [];

          const invalidMetric = metricsValues.some((metric: any) => {
            if (!metric || typeof metric !== "object") return true;

            return (
              (metric.criticalValue !== undefined &&
                (typeof metric.criticalValue !== "number" || metric.criticalValue < 0)) ||
              (metric.warningValue !== undefined &&
                (typeof metric.warningValue !== "number" || metric.warningValue < 0)) ||
              (metric.avgBaseline !== undefined &&
                (typeof metric.avgBaseline !== "number" || metric.avgBaseline < 0)) ||
              (metric.aggregatedValue !== undefined &&
                (typeof metric.aggregatedValue !== "number" || metric.aggregatedValue < 0)) ||
              (metric.metricWeight !== undefined &&
                (typeof metric.metricWeight !== "number" || metric.metricWeight < 0)) ||
              (metric.statusWeight !== undefined &&
                (typeof metric.statusWeight !== "number" || metric.statusWeight < 0)) ||
              (metric.weightedScore !== undefined &&
                (typeof metric.weightedScore !== "number" || metric.weightedScore < 0))
            );
          });

          if (invalidMetric) {
            console.error(
              "Invalid or negative metric values found in application health score. Ignoring response:",
              data
            );
            return;
          }

          this.appHealthScore = data?.projectHealthScore ?? 0;
          this.applicationMetrics = data?.metrics ?? {};
        },

        error: (err) => {
          console.error("Failed to load application health score:", err);
        }
      });
  }


  getTotalMetricWeight(): number {
    if (!this.applicationMetrics) return 0;

    return Object.values(this.applicationMetrics)
      .reduce((sum: number, m: any) => sum + (m.metricWeight || 0), 0);
  }

  getTotalWeightedScore(): number {
    if (!this.applicationMetrics) return 0;

    return Object.values(this.applicationMetrics)
      .reduce((sum: number, m: any) => sum + (m.weightedScore || 0), 0);
  }

  getHealthScoreValueInfra(): void {
    const componentId = btoa(this.infraName) + '.1';
    const appId = sessionStorage.getItem("ApplicationId");
    this.apmApiService
      .getHealthScoreValue(
        appId,
        this.entityId!,
        componentId,
        this.thresholdst,
        this.startTime,
        this.endTime,
        'INFRA',
        this.infraId,
        this.ipType
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            console.error("Invalid infra health score response structure:", data);
            return;
          }

          if (
            data.projectHealthScore !== undefined &&
            (typeof data.projectHealthScore !== 'number' || data.projectHealthScore < 0)
          ) {
            console.error("Invalid or negative 'projectHealthScore' found. Ignoring response:", data);
            return;
          }

          if (data.metrics !== undefined && typeof data.metrics !== 'object') {
            console.error("Invalid 'metrics' structure in infra health score response:", data);
            return;
          }

          const invalidMetric = Object.values(data.metrics || {}).some((metric: any) => {
            if (!metric || typeof metric !== 'object') return true;

            const numericFields = [
              'criticalValue',
              'metricWeight',
              'avgBaseline',
              'warningValue',
              'statusWeight',
              'weightedScore',
              'aggregatedValue'
            ];

            return numericFields.some(
              key =>
                metric[key] !== undefined &&
                (typeof metric[key] !== 'number' || metric[key] < 0)
            );
          });

          if (invalidMetric) {
            console.error("Invalid or negative metric values found in infra health score. Ignoring response:", data);
            return;
          }
          this.infraHealthScore = data?.projectHealthScore ?? 0;

          if (Object.keys(data?.metrics || {}).length === 0 && data?.projectHealthScore === 0) {
            this.infraNotMapped = true;
          } else {
            this.infraNotMapped = false;
          }

          // this.infraMetrics = data?.metrics ?? {};

          const memoryMetrics = [
            'meter_vm_memory_available',
            'meter_vm_memory_buff_cache',
            'meter_vm_memory_swap_free',
            'meter_vm_memory_used'
          ];

          const formattedMetrics = { ...(data?.metrics ?? {}) };

          Object.keys(formattedMetrics).forEach((key) => {
            if (memoryMetrics.includes(key)) {
              const metric = formattedMetrics[key];

              ['criticalValue', 'avgBaseline', 'warningValue', 'aggregatedValue'].forEach((field) => {
                if (typeof metric[field] === 'number') {
                  metric[field] = this.convertBytes(metric[field]);
                }
              });
            }
          });

          this.infraMetrics = formattedMetrics;
        },

        error: (err) => {
          console.error("Failed to load infra health score:", err);
        }
      });
  }


  getTotalMetricWeightInfra(): number {
    if (!this.infraMetrics) return 0;

    return Object.values(this.infraMetrics)
      .reduce((sum: number, m: any) => sum + (m.metricWeight || 0), 0);
  }

  getTotalWeightedScoreInfra(): number {
    if (!this.infraMetrics) return 0;

    return Object.values(this.infraMetrics)
      .reduce((sum: number, m: any) => sum + (m.weightedScore || 0), 0);
  }

  convertBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const gb = bytes / (1024 * 1024 * 1024);
    const mb = bytes / (1024 * 1024);
    const kb = bytes / 1024;

    if (gb >= 1) {
      return gb.toFixed(2) + ' GB';
    } else if (mb >= 1) {
      return mb.toFixed(2) + ' MB';
    } else if (kb >= 1) {
      return kb.toFixed(2) + ' KB';
    } else {
      return bytes + ' Bytes';
    }
  }

  getHealthScoreValueDb(): void {
    this.apmApiService.getDatabaseNamesForServices(this.entityId!, this.startTime, this.endTime)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Error fetching database names:', err);
          return of({});
        }),
        switchMap((data: any) => {
          const firstKey = Object.keys(data || {})[0];
          const dbList: string[] = (firstKey ? data[firstKey] : []) || [];
          if (!dbList.length) {
            console.warn('No databases found for entityId:', this.entityId);
            return of([]);
          }

          const encodedComponentIds = dbList.map(db => btoa(db) + '.0');
          const appId = sessionStorage.getItem("ApplicationId");
          const apiCalls = encodedComponentIds.map((componentId, index) => {
            return this.apmApiService.getHealthScoreValue(
              appId,
              this.entityId!,
              componentId,
              this.thresholdst,
              this.startTime,
              this.endTime,
              'DATABASE'
            ).pipe(
              map((score: any) => {
                const payload = Array.isArray(score) ? (score.length ? score[0] : {}) : (score || {});
                const healthScore = payload?.projectHealthScore ?? 0;
                const metrics = payload?.metrics ?? {};
                const metricKeys = Object.keys(metrics || {});
                const metricsArray = metricKeys.map(k => {
                  const m = metrics[k] || {};
                  return {
                    key: k,
                    criticalValue: m.criticalValue ?? 0,
                    warningValue: m.warningValue ?? 0,
                    aggregatedValue: m.aggregatedValue ?? 0,
                    status: m.status ?? '',
                    metricWeight: m.metricWeight,
                    weightedScore: m.weightedScore
                  };
                })

                return {
                  name: dbList[index],
                  value: healthScore,
                  metrics: metricsArray,
                  mapped: !(metricKeys.length === 0 && healthScore === 0),
                  type: 'Database'
                };
              }),
              catchError(err => {
                console.error(`Error fetching health score for ${componentId}:`, err);
                return of({
                  name: dbList[index],
                  value: 0,
                  metrics: [],
                  mapped: false,
                });
              })
            );
          });

          return forkJoin(apiCalls);
        })
      )
      .subscribe({
        next: (results: Array<{ name: string; value: number; metrics: Array<any>; mapped: boolean }>) => {
          this.dbHealthScore = results;
          this.dbFailingMetricsMap = {};
          results.forEach(r => {
            this.dbFailingMetricsMap[r.name] = r.metrics;
          });
          this.dbNotMapped = results.length > 0 && results.every(r => !r.mapped);
        },
        error: (err) => {
          console.error('Unexpected error in getHealthScoreValueDb:', err);
        }
      });
  }

  getTotalMetricWeightDb(dbName: string): number {
    const db = this.dbHealthScore?.find((d: any) => d.name === dbName);
    if (!db || !db.metrics?.length) return 0;

    return db.metrics.reduce(
      (sum: number, m: any) => sum + (m.metricWeight || 0),
      0
    );
  }

  getTotalWeightedScoreDb(dbName: string): number {
    const db = this.dbHealthScore?.find((d: any) => d.name === dbName);
    if (!db || !db.metrics?.length) return 0;

    return db.metrics.reduce(
      (sum: number, m: any) => sum + (m.weightedScore || 0),
      0
    );
  }

  isProblemErrorModal = false;

  openProblemErrorModal() {
    this.isProblemErrorModal = true;
  }

  closeProblemErrorModal() {
    this.isProblemErrorModal = false;
  }

  hasDbProblems(): boolean {
    return Object.values(this.dbFailingMetricsMap || {}).some(arr => arr && arr.length > 0);
  }

  dbFailingEntries(): {
    db: string; metrics: Array<{
      key: string; criticalValue: number; warningValue: number; aggregatedValue: number;
      status?: string; metricWeight?: number; weightedScore?: number;
    }>
  }[] {
    return Object.keys(this.dbFailingMetricsMap || {})
      .filter(k => (this.dbFailingMetricsMap[k] || []).length > 0)
      .map(k => ({
        db: k,
        metrics: this.dbFailingMetricsMap[k]
      }));
  }

  getAppDbInfraMapping(): void {
    if (!this.currentUser) return;
    this.applicationService
      .getAppDbInfraMapping(this.currentUser)
      .subscribe({
        next: (response: any) => {
          if (!response || typeof response !== "object" || Array.isArray(response)) {
            console.error("Invalid app-db infra mapping response structure:", response);
            return;
          }

          if (!Array.isArray(response.serviceResponse)) {
            console.error("Missing or invalid 'serviceResponse' in app-db infra mapping:", response);
            return;
          }

          const details = response.serviceResponse;
          const appId = Number(sessionStorage.getItem('ApplicationId'));

          if (isNaN(appId)) {
            console.error("Invalid ApplicationId in sessionStorage:", appId);
            return;
          }

          const matchedItem = details.find(
            (item: any) => item.applicationId === appId
          );

          if (!matchedItem) {
            console.warn('No matching infra application found for appId:', appId);
            this.infraNotMapped = true;
            this.getHealthScoreValueApplication();
            this.getHealthScoreValueDb();
            setTimeout(() => this.getProjectHealthValue(), 2000);
            return;
          }
          if (matchedItem.appInfra && !Array.isArray(matchedItem.appInfra)) {
            console.error("Invalid 'appInfra' structure:", matchedItem);
            return;
          }

          if (matchedItem.databases && !Array.isArray(matchedItem.databases)) {
            console.error("Invalid 'databases' structure:", matchedItem);
            return;
          }
          if (Array.isArray(matchedItem.appInfra) && matchedItem.appInfra.length > 0) {
            this.infraHealthScores = [];

            matchedItem.appInfra.forEach(
              (infra: { ipAddressId: any; ipAddress: any; ipType: any }) => {

                if (infra.ipType !== 'LINUX') {
                  return;
                }

                if (infra.ipAddressId) {
                  this.infraName = infra.ipAddress;
                  this.infraId = (infra.ipAddressId);
                  this.ipType = infra.ipType;

                  this.getHealthScoreValueInfraForInfra(infra).then((score: number) => {
                    this.infraHealthScores.push({
                      name: infra.ipAddress,
                      value: score
                    });
                  });

                } else {
                  console.warn('Skipping infra — infraId is null for', infra);
                }
              }
            );
          }

          this.getHealthScoreValueApplication();
          this.getHealthScoreValueDb();
          setTimeout(() => this.getProjectHealthValue(), 2000);
        },

        error: (err) => {
          console.error("Failed to load app-db infra mapping:", err);
        }
      });
  }


  getHealthScoreValueInfraForInfra(infra: { ipAddressId: any; ipAddress: any; ipType: any }): Promise<number> {
    return new Promise((resolve) => {
      this.infraId = (infra.ipAddressId);
      this.infraName = infra.ipAddress;
      this.ipType = infra.ipType;
      this.getHealthScoreValueInfra();
      setTimeout(() => resolve(this.infraHealthScore || 0), 500);
    });
  }



  appWt: number = 0;
  infraWt: number = 0;
  dbWt: number = 0;

  originalAppWt = 0;
  originalInfraWt = 0;
  originalDbWt = 0;

  isDefault: boolean = true;
  isDirty: boolean = false;

  isHealthWtModal = false;

  openHealthWtModal() {
    this.getAppWeight();
    this.isHealthWtModal = true;
    this.originalAppWt = this.appWt;
    this.originalInfraWt = this.infraWt;
    this.originalDbWt = this.dbWt;

    this.isDirty = false;
  }

  closeHealthWtModal() {
    this.isHealthWtModal = false;
  }

  onWeightChange() {
    this.isDirty =
      this.appWt !== this.originalAppWt ||
      this.infraWt !== this.originalInfraWt ||
      this.dbWt !== this.originalDbWt;
  }


  showSnack(message: string): void {
    this.snackBar.open(message, '', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  getAppWeight(): void {
    const appIdStr = sessionStorage.getItem('ApplicationId');

    if (!appIdStr) {
      alert("ApplicationId not found in session");
      return;
    }

    const appId = Number(appIdStr);

    this.apmApiService.getAppWeight(appId)
      .subscribe({
        next: (response: any) => {
          this.appWt = Number(response.appWeight);
          this.infraWt = Number(response.infraWeight);
          this.dbWt = Number(response.dbWeight);
          this.isDefault = response.isDefault;
        },
        error: (err) => {
          console.error("Failed to get app weight:", err);
          this.showSnack("Failed to get app weight");
        }
      });
  }

  saveAppWeight(): void {
    const appIdStr = sessionStorage.getItem('ApplicationId');

    if (!appIdStr) {
      alert("ApplicationId not found in session");
      return;
    }

    const appId = Number(appIdStr);

    this.apmApiService.saveAppWeight(appId, this.appWt, this.infraWt, this.dbWt, this.currentUser)
      .subscribe({
        next: (response: string) => {
          this.showSnack(response);
          this.closeHealthWtModal();
          this.getAppDbInfraMapping();
        },
        error: (err) => {
          console.error("Failed to save app weight:", err);
          this.showSnack("Failed to save app weight");
          this.closeHealthWtModal();
        }
      });
  }

  deleteAppWeight(): void {
    const appIdStr = sessionStorage.getItem('ApplicationId');

    if (!appIdStr) {
      alert("ApplicationId not found in session");
      return;
    }

    const appId = Number(appIdStr);

    this.apmApiService.deleteAppWeight(appId, this.currentUser)
      .subscribe({
        next: (response: string) => {
          this.showSnack(response);
          this.closeHealthWtModal();
          this.getAppDbInfraMapping();
        },
        error: (err) => {
          console.error("Failed to delete app weight:", err);
          this.showSnack("Failed to delete app weight");
          this.closeHealthWtModal();
        }
      });
  }

  getProjectHealthValue(): void {
    const appScore = this.appHealthScore ?? 0;
    const infraScore = this.infraHealthScore ?? 0;
    let dbScore = 0;
    if (Array.isArray(this.dbHealthScore) && this.dbHealthScore.length > 0) {
      const sum = this.dbHealthScore.reduce((acc, item) => acc + (item.value || 0), 0);
      dbScore = sum / this.dbHealthScore.length;
    }
    const combinedHealth = parseFloat(((this.appWt / 100) * appScore + (this.dbWt / 100) * dbScore + (this.infraWt / 100) * infraScore).toFixed(2));
    const projectHealthData = [
      { type: 'Project Health', count: combinedHealth }
    ];
    this.projectHealthScore = combinedHealth
    this.getProjectHealthChart(projectHealthData);
  }

  getProjectHealthChart(data: { type: string; count: number }[]): void {
    try {
      if (!data || data.length === 0) {
        this.projectHealthChart = null;
        return;
      }

      const seriesData: Highcharts.PointOptionsObject[] = data.map(item => ({
        y: item.count,
        name: item.type,
        color: this.getColor(item.count)
      }));

      const styles = getComputedStyle(document.body);
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const labelColor = styles.getPropertyValue('--text-color').trim();

      this.projectHealthChart = {
        chart: { type: 'bar', backgroundColor: 'transparent', spacing: [0, 10, 0, 0] },
        title: { text: undefined },
        xAxis: [
          {
            categories: data.map(d => d.type),
            visible: false
          },
          {
            opposite: true,
            linkedTo: 0,
            categories: data.map(d => `${d.count}%`),
            labels: {
              style: { color: labelColor, fontSize: '10px' },
              align: 'left',
              x: 5
            },
            lineWidth: 0,
            tickLength: 0,
            gridLineWidth: 0
          }
        ],
        yAxis: {
          min: 0,
          max: 100,
          visible: false
        },
        tooltip: {
          enabled: false,
          shared: false,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () { return `${this.y}%`; }
        },
        legend: { enabled: false },
        plotOptions: {
          bar: {
            borderWidth: 0,
            pointWidth: 15,
            dataLabels: { enabled: false }
          }
        },
        series: [{ name: 'Project Health', type: 'bar', data: seriesData }],
        credits: { enabled: false }
      };
    } catch (e) {
      console.error("Error Occurred", e);
    }
  }

  convertMinutes(minutes: number): string {
    if (!minutes && minutes !== 0) return '-';

    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;

    if (days > 0) return `${days} day ${hours} hr`;
    if (hours > 0) return `${hours} hr ${mins} min`;
    return `${mins} min`;
  }


  // getUptime(): void {
  //   const endTime = this.endTime.toString();
  //   const et = endTime.slice(0, -4);

  //   this.apmApiService.getUptimeService(this.entityId!, et).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.uptimeData1Day = data?.['1_day'];
  //     this.uptimeData5Day = data?.['5_day'];
  //     this.uptimeData10Day = data?.['10_day'];
  //     const chartData1Day = [{
  //       type: 'Last 1 Day',
  //       count: (data['1_day'] as any)?.availability_percentage ?? 0
  //     }];
  //     this.chartUptime1Day(chartData1Day);

  //     const chartData5Day = [{
  //       type: 'Last 5 Days',
  //       count: (data['5_day'] as any)?.availability_percentage ?? 0
  //     }];
  //     this.chartUptime5Days(chartData5Day);

  //     const chartData10Day = [{
  //       type: 'Last 10 Days',
  //       count: (data['10_day'] as any)?.availability_percentage ?? 0
  //     }];
  //     this.chartUptime10Days(chartData10Day);
  //   });
  // }

  getUptime(): void {
    const endTime = this.endTime.toString();
    const et = endTime.slice(0, -4);

    this.apmApiService
      .getUptimeService(this.entityId!, et)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid uptime response structure:", data);
            return;
          }

          const requiredKeys = ['1_day', '5_day', '10_day'];
          const missingKey = requiredKeys.some(k => !data[k]);

          if (missingKey) {
            console.error("Missing uptime buckets in response:", data);
            return;
          }

          const invalidEntry = requiredKeys.some(key => {
            const entry = data[key];
            return (
              typeof entry !== "object" ||
              typeof entry.availability_percentage !== "number" ||
              entry.availability_percentage < 0 ||
              entry.availability_percentage > 100 ||
              typeof entry.downtime_duration_minutes !== "number" ||
              entry.downtime_duration_minutes < 0
            );
          });

          if (invalidEntry) {
            console.error("Invalid or negative values found in uptime response. Ignoring response:", data);
            return;
          }

          this.uptimeData1Day = data['1_day'];
          this.uptimeData5Day = data['5_day'];
          this.uptimeData10Day = data['10_day'];

          const chartData1Day = [{
            type: 'Last 1 Day',
            count: (data['1_day'] as any)?.availability_percentage ?? 0
          }];
          this.chartUptime1Day(chartData1Day);

          const chartData5Day = [{
            type: 'Last 5 Days',
            count: (data['5_day'] as any)?.availability_percentage ?? 0
          }];
          this.chartUptime5Days(chartData5Day);

          const chartData10Day = [{
            type: 'Last 10 Days',
            count: (data['10_day'] as any)?.availability_percentage ?? 0
          }];
          this.chartUptime10Days(chartData10Day);
        },

        error: (err) => {
          console.error("Failed to load uptime data:", err);
        }
      });
  }


  chartUptime1Day(data: any[]): void {
    try {
      if (!data || data.length === 0) {
        this.uptime1DaysChart = null;
        return;
      }

      const categories = data.map(item => item.type);
      const seriesData = data.map(item => ({
        y: item.count,
        name: item.type,
        color: this.getColor(item.count)
      }));

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      this.uptime1DaysChart = {
        chart: {
          type: 'bar',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' },
        },
        title: { text: undefined },
        xAxis: {
          categories,
          title: { text: "" },
          labels: { enabled: false },
          lineWidth: 0,
          tickLength: 0,
          gridLineWidth: 0
        },
        yAxis: {
          min: 0,
          max: 100,
          title: { text: "" },
          labels: { enabled: false },
          lineWidth: 0,
          tickLength: 0,
          gridLineWidth: 0
        },
        tooltip: {
          enabled: false,
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
        },
        legend: { enabled: false },
        plotOptions: {
          bar: {
            pointWidth: 18,
            groupPadding: 0,
            pointPadding: 0,
            borderWidth: 0,
            dataLabels: {
              enabled: true,
              inside: true,
              align: 'left',
              format: '{point.name}',
              style: {
                color: '#ffffff',
                fontWeight: 'normal',
                textOutline: 'none',
                fontSize: '9px'
              }
            }
          }
        },
        series: [{
          name: 'Uptime for 1 Day %',
          type: 'bar',
          data: seriesData,
        }],
        credits: { enabled: false }
      };
    } catch (e) {
      console.error("Error Occurred", e);
    }
  }

  chartUptime5Days(data: any[]): void {
    try {
      if (!data || data.length === 0) {
        this.uptime5DaysChart = null;
        return;
      }

      const categories = data.map(item => item.type);
      const seriesData = data.map(item => ({
        y: item.count,
        name: item.type,
        color: this.getColor(item.count)
      }));

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      this.uptime5DaysChart = {
        chart: {
          type: 'bar',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' },
        },
        title: { text: undefined },
        xAxis: {
          categories,
          title: { text: "" },
          labels: { enabled: false },
          lineWidth: 0,
          tickLength: 0,
          gridLineWidth: 0
        },
        yAxis: {
          min: 0,
          max: 100,
          title: { text: "" },
          labels: { enabled: false },
          lineWidth: 0,
          tickLength: 0,
          gridLineWidth: 0
        },
        tooltip: {
          enabled: false,
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        plotOptions: {
          bar: {
            pointWidth: 18,
            groupPadding: 0,
            pointPadding: 0,
            borderWidth: 0,
            dataLabels: {
              enabled: true,
              inside: true,
              align: 'left',
              format: '{point.name}',
              style: {
                color: '#ffffff',
                fontWeight: 'normal',
                textOutline: 'none',
                fontSize: '9px'
              }
            }
          }
        },
        series: [{
          name: 'Uptime for 5 Days %',
          type: 'bar',
          data: seriesData,
        }],
        credits: { enabled: false }
      };
    } catch (e) {
      console.error("Error Occurred", e);
    }
  }

  chartUptime10Days(data: any[]): void {
    try {
      if (!data || data.length === 0) {
        this.uptime10DaysChart = null;
        return;
      }

      const categories = data.map(item => item.type);
      const seriesData = data.map(item => ({
        y: item.count,
        name: item.type,
        color: this.getColor(item.count)
      }));

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      this.uptime10DaysChart = {
        chart: {
          type: 'bar',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' },
        },
        title: { text: undefined },
        xAxis: {
          categories,
          title: { text: "" },
          labels: { enabled: false },
          lineWidth: 0,
          tickLength: 0,
          gridLineWidth: 0
        },
        yAxis: {
          min: 0,
          max: 100,
          title: { text: "" },
          labels: { enabled: false },
          lineWidth: 0,
          tickLength: 0,
          gridLineWidth: 0
        },
        tooltip: {
          enabled: false,
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        plotOptions: {
          bar: {
            pointWidth: 18,
            groupPadding: 0,
            pointPadding: 0,
            borderWidth: 0,
            dataLabels: {
              enabled: true,
              inside: true,
              align: 'left',
              format: '{point.name}',
              style: {
                color: '#ffffff',
                fontWeight: 'normal',
                textOutline: 'none',
                fontSize: '9px'
              }
            }
          }
        },
        series: [{
          name: 'Uptime for 10 Days %',
          type: 'bar',
          data: seriesData,
        }],
        credits: { enabled: false }
      };
    } catch (e) {
      console.error("Error Occurred", e);
    }
  }

  endpointData: any;
  // getEndpointChartData(): void {
  //   this.apmApiService.getEndpointApiType(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.endpointData = data
  //     this.chartEndpoint(data);
  //   })
  // }

  getEndpointChartData(): void {
    this.apmApiService
      .getEndpointApiType(this.entityId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || !Array.isArray(data)) {
            console.error("Invalid endpoint chart response structure:", data);
            return;
          }

          const invalidEntry = data.some((item: any) =>
            !item ||
            typeof item !== "object" ||
            typeof item.type !== "string" ||
            typeof item.count !== "number" || item.count < 0 ||
            typeof item.error_count !== "number" || item.error_count < 0 ||
            typeof item.success_rate !== "number" || item.success_rate < 0
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative values found in endpoint chart data. Ignoring response:",
              data
            );
            return;
          }

          this.endpointData = data;
          this.chartEndpoint(data);
        },

        error: (err) => {
          console.error("Failed to load endpoint chart data:", err);
        }
      });
  }


  chartEndpoint(data: { type: string; count: number; success_rate: number }[]): void {
    try {
      if (!data || data.length === 0) {
        this.endpointChart = null;
        return;
      }

      const categories = data.map(item => item.type);
      const seriesData = data.map(item => ({
        y: item.count,
        name: item.type,
        color: Math.round(item.success_rate) === 100 ? '#30AEF999' : '#F4433699'
      }));

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      this.endpointChart = {
        chart: {
          type: 'bar',
          backgroundColor: 'transparent',
          spacing: [5, 40, 5, 5], // space on right for outside labels
          style: { fontSize: '10px' },
        },
        title: { text: undefined },
        xAxis: [
          {
            categories,
            title: { text: "" },
            labels: { enabled: false },
            lineWidth: 0,
            tickLength: 0,
            gridLineWidth: 0
          },
          {
            opposite: true,
            linkedTo: 0,
            categories: data.map(d => d.count.toString()),
            labels: {
              style: { color: labelColor, fontSize: '10px' },
              align: 'right',
              x: 20,
              formatter: function (): string {
                const index = this.pos;
                const total = this.axis.categories?.length ?? 0;
                if (index === 0 || index === total - 1) {
                  return String(this.value);
                }
                return '';
              }
            },
            lineWidth: 0,
            tickLength: 0,
            gridLineWidth: 0
          }
        ],
        yAxis: {
          min: 0,
          title: { text: "" },
          labels: { enabled: false },
          gridLineColor: gridColor,
          gridLineWidth: 0
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        plotOptions: {
          bar: {
            maxPointWidth: 30,
            dataLabels: [
              {
                enabled: true,
                inside: true,
                align: 'left',
                format: '{point.name}',
                style: {
                  color: labelColor,
                  fontWeight: 'normal',
                  textOutline: 'none',
                  fontSize: '10px'
                }
              }
            ]
          }
        },
        series: [{
          name: 'API Count',
          type: 'bar',
          data: seriesData
        }],
        credits: { enabled: false }
      };
    } catch (e) {
      console.error("Error Occurred", e);
    }
  }

  onClick1(event: any, type: string) {
    document.querySelectorAll('.trace-dropdown').forEach(dropdown => dropdown.remove());
    const dropdown = document.createElement('div');
    dropdown.className = 'trace-dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.left = `${event.pageX}px`;
    dropdown.style.top = `${event.pageY}px`;
    dropdown.style.background = '#f3f4f6';
    dropdown.style.border = '1px solid #d1d5db';
    dropdown.style.borderRadius = '4px';
    dropdown.style.padding = '2px';
    dropdown.style.zIndex = '1000';
    const removeDropdown = () => {
      dropdown.remove();
      document.removeEventListener('click', hideDropdown);
    };
    const viewRelatedTracesOption = document.createElement('div');
    viewRelatedTracesOption.textContent = 'View Related Trace';
    viewRelatedTracesOption.style.cursor = 'pointer';
    viewRelatedTracesOption.style.fontSize = '12px';
    viewRelatedTracesOption.onclick = () => {
      if (type === 'ServiceSuccessRate') {
        this.openModalNoDurServiceSR(event.point);
        removeDropdown();
      } else if (type === 'ServiceApdex') {
        this.openModalNoDurServiceApdex(event.point);
        removeDropdown();
      } else if (type === 'ServiceLoad') {
        this.openModalNoDurServiceLoad(event.point);
        removeDropdown();
      } else if (type === 'ServiceLatency') {
        this.openModalMinDurServiceLR(event.point);
        removeDropdown();
      } else {
        console.error("Error Occurred: Wrong type ", type);
      }
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

  openModalNoDurServiceSR(point: any) {
    const realTimestamp = this.successRateTimestamps[point.x];
    this.traceDetailModal.openNoDurationModal(realTimestamp, point.y);
  }

  openModalNoDurServiceApdex(point: any) {
    const realTimestamp = this.serviceApdexTimestamps[point.x];
    this.traceDetailModal.openNoDurationModal(realTimestamp, point.y);
  }

  openModalNoDurServiceLoad(point: any) {
    const realTimestamp = this.serviceLoadTimestamps[point.x];
    this.traceDetailModal.openNoDurationModal(realTimestamp, point.y);
  }

  openModalMinDurServiceLR(point: any) {
    const realTimestamp = this.combinedDataTimestamps[point.x];
    this.traceDetailModal.openMinDurationModal(realTimestamp, point.y);
  }

  getSuccessRateTimeValue(): void {
    this.apmApiService.getSuccessRateTimeValue(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.successRate = data.successRate;
      const timeSeries = data.successRateTimeSeries;
      this.getsuccessRateTimeValueChart(timeSeries);
    })
  }

  getsuccessRateTimeValueChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.successRateTimeValueChart) {
          this.successRateTimeValueChart.destroy();
        }

        this.successRateTimeValueChart = Highcharts.chart('successRateTimeValueChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
          noData: { style: { display: 'none' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      this.successRateTimestamps = parsedDates.map(date => date.getTime());

      const series: Highcharts.SeriesColumnOptions[] = [
        {
          name: 'Failure',
          type: 'column',
          data: data.map(d => +(100 - Number(d[keys[0]])).toFixed(2)),
          color: '#ef4444',
          stacking: 'normal'
        },
        {
          name: 'Success',
          type: 'column',
          data: data.map(d => Number(d[keys[0]])),
          color: '#22c55e',
          stacking: 'normal'
        }
      ];

      if (this.successRateTimeValueChart) {
        this.successRateTimeValueChart.destroy();
      }

      const baseline = this.thresholds?.service_sla?.avgBaseline ?? null;
      const serviceThresholds = this.thresholds?.service_sla;

      this.successRateTimeValueChart = Highcharts.chart('successRateTimeValueChartContainer', {
        chart: {
          type: 'column',
          backgroundColor: 'transparent',
          spacing: [10, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            y: 10,
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          max: 100,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          plotLines: baseline != null ? [{
            value: baseline,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            zIndex: 5
          }] : []
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            let s = `<b>${categories[this.x]}</b><br/>`;

            const warningVal = serviceThresholds?.warningValue ?? null;
            const criticalVal = serviceThresholds?.criticalValue ?? null;

            this.points?.forEach(point => {
              const y = point.y ?? 0;
              let marker = "";

              if (point.series.name === "Success") {
                if (criticalVal !== null && y < criticalVal) {
                  marker = ` <span style="color:red">(C)</span>`;
                } else if (warningVal !== null && y < warningVal) {
                  marker = ` <span style="color:orange">(W)</span>`;
                }
              }

              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${y}%</b>${marker}<br/>`;
            });

            if (serviceThresholds?.avgBaseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${serviceThresholds.avgBaseline}%</b><br/>`;
            }
            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false },
        plotOptions: {
          series: {
            cursor: 'pointer',
            point: {
              events: {
                click: (event) => { this.onClick1(event, 'ServiceSuccessRate') }
              }
            }
          },
          column: {
            stacking: 'normal',
            maxPointWidth: 10,
            grouping: true,
            borderWidth: 0
          }
        }
      });

      if (!this.charts.includes(this.successRateTimeValueChart)) {
        this.charts.push(this.successRateTimeValueChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  openTraceTabSucessRate(): void {
    const traceTab = document.querySelector('.nav-link[href="#trace"]') as HTMLElement;
    if (traceTab) {
      traceTab.click();
    }
    this.traceState = 'error';
    this.loadData('trace');
    this.selectCriteria('status');
  }

  // getCombinedResponseData(): void {
  //   forkJoin([
  //     this.apmApiService.getServiceAvgResponseTime(this.entityId!, this.startTime, this.endTime),
  //     this.apmApiService.getServiceResponseTimePercentile(this.entityId!, this.startTime, this.endTime)
  //   ])
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe(([avgRes, percentileRes]: [any, any]) => {
  //       this.latencyValue = avgRes.latency;
  //       const avgData = avgRes.latencyTimeSeries || [];
  //       const percentileData = percentileRes || [];
  //       this.getCombinedResponseTimeChart(avgData, percentileData);
  //     });
  // }

  Math = Math;
  getCombinedResponseData(): void {
    forkJoin([
      this.apmApiService.getServiceAvgResponseTime(
        this.entityId!,
        this.startTime,
        this.endTime
      ),
      this.apmApiService.getServiceResponseTimePercentile(
        this.entityId!,
        this.startTime,
        this.endTime
      )
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([avgRes, percentileRes]: [any, any]) => {

          if (!avgRes || typeof avgRes !== "object" || Array.isArray(avgRes)) {
            console.error("Invalid average response time structure:", avgRes);
            return;
          }

          if (typeof avgRes.latency !== "number" || avgRes.latency < 0) {
            console.error("Invalid or negative latency value:", avgRes);
            return;
          }

          if (
            avgRes.latencyTimeSeries &&
            !Array.isArray(avgRes.latencyTimeSeries)
          ) {
            console.error(
              "Invalid latencyTimeSeries structure:",
              avgRes.latencyTimeSeries
            );
            return;
          }

          const invalidAvgEntry =
            Array.isArray(avgRes.latencyTimeSeries) &&
            avgRes.latencyTimeSeries.some(
              (item: any) =>
                (item.latency !== undefined &&
                  typeof item.latency !== "number") ||
                item.latency < 0 ||
                !item.time_bucket
            );

          if (invalidAvgEntry) {
            console.error(
              "Invalid or negative latency entries found. Ignoring response:",
              avgRes
            );
            return;
          }

          if (!percentileRes || !Array.isArray(percentileRes)) {
            console.error(
              "Invalid response time percentile structure:",
              percentileRes
            );
            return;
          }

          const invalidPercentileEntry = percentileRes.some(
            (item: any) =>
              !item.time_bucket ||
              ["P99", "P95", "P90", "P75", "P50"].some(
                key =>
                  item[key] !== undefined &&
                  (typeof item[key] !== "number" || item[key] < 0)
              )
          );

          if (invalidPercentileEntry) {
            console.error(
              "Invalid or negative percentile values found. Ignoring response:",
              percentileRes
            );
            return;
          }

          this.latencyValue = avgRes.latency;
          const avgData = avgRes.latencyTimeSeries || [];
          const percentileData = percentileRes || [];
          this.getCombinedResponseTimeChart(avgData, percentileData);
        },

        error: (err) => {
          console.error("Failed to load combined response time data:", err);
        }
      });
  }


  getCombinedResponseTimeChart(avgData: any[], percentileData: any[]): void {
    try {
      const allBuckets = Array.from(
        new Set([
          ...avgData.map(a => a.time_bucket),
          ...percentileData.map(p => p.time_bucket)
        ])
      ).sort();

      const mergedData = allBuckets.map(bucket => {
        const avg = avgData.find(a => a.time_bucket === bucket);
        const perc = percentileData.find(p => p.time_bucket === bucket);
        return {
          time_bucket: bucket,
          latency: avg?.latency ?? null,
          P50: perc?.P50 ?? null,
          P75: perc?.P75 ?? null,
          P90: perc?.P90 ?? null,
          P95: perc?.P95 ?? null,
          P99: perc?.P99 ?? null
        };
      });

      const parsedDates = mergedData.map(item => this.parseTimeBucket(item.time_bucket));
      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      const isAllNull = mergedData.every(d =>
        d.latency === null && d.P50 === null && d.P75 === null &&
        d.P90 === null && d.P95 === null && d.P99 === null
      );

      if (mergedData.length === 0 || isAllNull) {
        if (this.serviceAvgResponseTimeChart) {
          this.serviceAvgResponseTimeChart.destroy();
        }

        this.serviceAvgResponseTimeChart = Highcharts.chart('combinedResponseTimeChartContainer', {
          chart: { type: 'areaspline', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
          noData: { style: { display: 'none' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const series: Highcharts.SeriesOptionsType[] = [];

      series.push({
        name: 'Average Latency',
        type: 'areaspline',
        data: mergedData.map(d => d.latency),
        marker: { radius: 1 },
        lineWidth: 1,
        fillOpacity: 0.3
      });

      const percentileKeys = ['P50', 'P75', 'P90', 'P95', 'P99'];
      percentileKeys.forEach(key => {
        series.push({
          name: key,
          type: 'spline',
          data: mergedData.map(d => (d as any)[key]),
          marker: { radius: 1 },
          lineWidth: 1
        });
      });

      if (this.serviceAvgResponseTimeChart) {
        this.serviceAvgResponseTimeChart.destroy();
      }

      const baseline = this.thresholds?.service_resp_time?.avgBaseline;

      this.combinedDataTimestamps = parsedDates.map(date => date.getTime());

      this.serviceAvgResponseTimeChart = Highcharts.chart('combinedResponseTimeChartContainer', {
        chart: {
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            y: 10,
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          plotLines: baseline != null ? [{
            value: baseline,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            zIndex: 5
          }] : []
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () { // <-- use function() NOT arrow
            const categories = this.series.chart.xAxis[0].categories;
            let s = `<b>${categories[this.x]}</b><br/>`;

            const thresholds = (this.series.chart as any).componentRef.thresholds?.service_resp_time;
            const warningVal = thresholds?.warningValue ?? null;
            const criticalVal = thresholds?.criticalValue ?? null;
            const baseline = thresholds?.avgBaseline;

            this.points?.forEach(point => {
              const y = point.y ?? 0;
              let marker = "";

              if (point.series.name === "Average Latency") {
                if (criticalVal !== null && y > criticalVal) {
                  marker = ` <span style="color:red">(C)</span>`;
                } else if (warningVal !== null && y > warningVal) {
                  marker = ` <span style="color:orange">(W)</span>`;
                }
              }

              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${y} ms</b>${marker}<br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline} ms</b><br/>`;
            }

            return s;
          }
        },
        plotOptions: {
          series: {
            cursor: 'pointer',
            point: {
              events: {
                click: function (event) {
                  const chart = this.series.chart;
                  const xIndex = this.index;
                  const avgSeries = chart.series.find(s => s.name === 'Average Latency');
                  const avgLatency = avgSeries?.data[xIndex]?.y ?? null;
                  const componentRef = (chart as any).componentRef;
                  const nativeEvt = (event as any).pointerEvent ?? event;
                  componentRef.onClick1(
                    Object.assign({}, nativeEvt, {
                      point: { ...this, avgLatency }
                    }),
                    'ServiceLatency'
                  );
                }
              }
            }
          }
        },
        legend: {
          enabled: true,
          align: 'center',
          verticalAlign: 'bottom',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '9px'
          },
          symbolHeight: 2,
          symbolWidth: 10,
          symbolRadius: 0,
          itemMarginTop: 0,
          itemMarginBottom: 2,
          itemDistance: 4,
          padding: 0,
          y: 0,
        },
        series,
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      (this.serviceAvgResponseTimeChart as any).componentRef = this;
      if (!this.charts.includes(this.serviceAvgResponseTimeChart)) {
        this.charts.push(this.serviceAvgResponseTimeChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred", e);
    }
  }

  // getServiceApdexTimeValue(): void {
  //   this.apmApiService.getServiceApdexTimeValue(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.apdexValue = data.apdex;
  //     const timeSeries = data.apdexTimeSeries;
  //     this.getServiceApdexTimeValueChart(timeSeries);
  //   })
  // }

  getServiceApdexTimeValue(): void {
    this.apmApiService
      .getServiceApdexTimeValue(this.entityId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid service apdex response structure:", data);
            return;
          }

          if (typeof data.apdex !== "number" || data.apdex < 0) {
            console.error("Invalid or negative 'apdex' value found. Ignoring response:", data);
            return;
          }

          if (!data.apdexTimeSeries || !Array.isArray(data.apdexTimeSeries)) {
            console.error("Missing or invalid 'apdexTimeSeries'. Ignoring response:", data);
            return;
          }

          const invalidEntry = data.apdexTimeSeries.some(
            (item: any) =>
              !item.time_bucket ||
              (item.load !== undefined &&
                (typeof item.load !== "number" || item.load < 0))
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative 'load' entries found in apdexTimeSeries. Ignoring response:",
              data
            );
            return;
          }

          this.apdexValue = data.apdex;
          const timeSeries = data.apdexTimeSeries;
          this.getServiceApdexTimeValueChart(timeSeries);
        },

        error: (err) => {
          console.error("Failed to load service apdex metrics:", err);
        }
      });
  }


  getServiceApdexTimeValueChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const styles = getComputedStyle(document.body);
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (!data || data.length === 0) {
        if (this.ServiceApdexTimeValueChart) {
          this.ServiceApdexTimeValueChart.destroy();
        }

        this.ServiceApdexTimeValueChart = Highcharts.chart('serviceApdexTimeValueChartContainer', {
          chart: { type: 'areaspline', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' }
          },
          noData: { style: { display: 'none' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const keys = ['apdex'];

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const series: Highcharts.SeriesAreasplineOptions[] = keys.map(key => ({
        name: 'Apdex',
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.3,
        data: data.map(d => {
          const y = Number(d['load']);
          return {
            y,
            color:
              this.thresholds?.service_apdex?.criticalValue != null && y < this.thresholds?.service_apdex?.criticalValue
                ? 'red'
                : this.thresholds?.service_apdex?.warningValue != null && y < this.thresholds?.service_apdex?.warningValue
                  ? 'orange'
                  : undefined
          };
        })
      }));

      if (this.ServiceApdexTimeValueChart) {
        this.ServiceApdexTimeValueChart.destroy();
      }

      const baseline = this.thresholds?.service_apdex?.avgBaseline;

      this.serviceApdexTimestamps = parsedDates.map(date => date.getTime());

      this.ServiceApdexTimeValueChart = Highcharts.chart('serviceApdexTimeValueChartContainer', {
        chart: {
          type: 'areaspline',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            y: 10,
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          max: 1,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          plotLines: baseline != null ? [{
            value: baseline,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            zIndex: 5
          }] : []
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            const categories = this.series.chart.xAxis[0].categories;
            let s = `<b>${categories[this.x]}</b><br/>`;

            this.points?.forEach(point => {
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline}</b><br/>`;
            }
            return s;
          }
        },
        plotOptions: {
          series: {
            cursor: 'pointer',
            point: {
              events: {
                click: (event) => { this.onClick1(event, 'ServiceApdex') }
              }
            }
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });

      if (!this.charts.includes(this.ServiceApdexTimeValueChart)) {
        this.charts.push(this.ServiceApdexTimeValueChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  // getServiceLoadTimeValue(): void {
  //   this.apmApiService.getServiceLoadTimeValue(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.avgLoadValue = data.load;
  //     const timeSeries = data.loadTimeSeries;
  //     this.getserviceLoadTimeValueChart(timeSeries);
  //   })
  // }

  getServiceLoadTimeValue(): void {
    this.apmApiService
      .getServiceLoadTimeValue(this.entityId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid service load time response structure:", data);
            return;
          }

          if (typeof data.load !== "number" || data.load < 0) {
            console.error("Invalid or negative 'load' value found. Ignoring response:", data);
            return;
          }

          if (!Array.isArray(data.loadTimeSeries)) {
            console.error("Missing or invalid 'loadTimeSeries' in response:", data);
            return;
          }

          const invalidEntry = data.loadTimeSeries.some(
            (item: any) =>
              (item.load !== undefined &&
                (typeof item.load !== "number" || item.load < 0)) ||
              !item.time_bucket
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative 'load' entries found in loadTimeSeries. Ignoring response:",
              data
            );
            return;
          }
          this.avgLoadValue = data.load;
          const timeSeries = data.loadTimeSeries;
          this.getserviceLoadTimeValueChart(timeSeries);
        },

        error: (err) => {
          console.error("Failed to load service load time metrics:", err);
        }
      });
  }


  getserviceLoadTimeValueChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.serviceLoadTimeValueChart) {
          this.serviceLoadTimeValueChart.destroy();
        }

        this.serviceLoadTimeValueChart = Highcharts.chart('serviceLoadTimeValueChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          noData: { style: { display: 'none' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const y = Number(d[key]);
          return {
            y,
            color:
              this.thresholds?.service_cpm?.criticalValue != null && y > this.thresholds?.service_cpm?.criticalValue
                ? 'red'
                : this.thresholds?.service_cpm?.warningValue != null && y > this.thresholds?.service_cpm?.warningValue
                  ? 'orange'
                  : undefined
          };
        })
      }));

      if (this.serviceLoadTimeValueChart) {
        this.serviceLoadTimeValueChart.destroy();
      }

      const baseline = this.thresholds?.service_cpm?.avgBaseline;

      this.serviceLoadTimestamps = parsedDates.map(date => date.getTime());

      this.serviceLoadTimeValueChart = Highcharts.chart('serviceLoadTimeValueChartContainer', {
        chart: {
          type: 'spline',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            y: 10,
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          plotLines: baseline != null ? [{
            value: baseline,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            zIndex: 5
          }] : []
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            const categories = this.series.chart.xAxis[0].categories;
            let s = `<b>${categories[this.x]}</b><br/>`;

            this.points?.forEach(point => {
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y} call/min</b><br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline} call/min</b><br/>`;
            }
            return s;
          }
        },
        plotOptions: {
          series: {
            cursor: 'pointer',
            point: {
              events: {
                click: (event) => { this.onClick1(event, 'ServiceLoad') }
              }
            }
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.serviceLoadTimeValueChart)) {
        this.charts.push(this.serviceLoadTimeValueChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }


  // INSTANCE

  setServiceInstance(event: MouseEvent): void {
    event.preventDefault()
    const aElement = event.target as HTMLElement;
    const serviceId = aElement.textContent;
    sessionStorage.setItem('SelectedServiceInstance', serviceId!);
    this.router.navigate(['/service-page/general-service/general-instance']);
  }

  openTraceTabInstance(selectedInstance: any): void {
    const traceTab = document.querySelector('.nav-link[href="#trace"]') as HTMLElement;
    if (traceTab) {
      traceTab.click();
    }
    this.instNameTrace = selectedInstance;
    this.loadData('trace');
    this.selectCriteria('instance');
  }


  // getServiceInstanceLoad(): void {
  //   this.apmApiService.getServiceInstanceLoad(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.instanceLoadData = data;
  //   })
  // }

  getServiceInstanceLoad(): void {
    this.apmApiService
      .getServiceInstanceLoad(this.entityId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || !Array.isArray(data)) {
            console.error("Invalid service instance load response structure:", data);
            return;
          }

          const invalidEntry = data.some(
            (item: any) =>
              !item ||
              typeof item.instance !== "string" ||
              !item.instance.trim() ||
              (typeof item.value !== "number" && item.value !== undefined) ||
              item.value < 0
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative 'value' entries found in service instance load response. Ignoring response:",
              data
            );
            return;
          }

          this.instanceLoadData = data;
        },

        error: (err) => {
          console.error("Failed to load service instance load data:", err);
        }
      });
  }


  // getSlowServiceInstance(): void {
  //   this.apmApiService.getSlowServiceInstance(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.slowInstanceData = data;
  //   })
  // }

  getSlowServiceInstance(): void {
    this.apmApiService
      .getSlowServiceInstance(this.entityId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || !Array.isArray(data)) {
            console.error("Invalid slow service instance response structure:", data);
            return;
          }

          const invalidEntry = data.some(
            (item: any) =>
              typeof item !== "object" ||
              typeof item.instance !== "string" ||
              !item.instance.trim() ||
              typeof item.value !== "number" ||
              item.value < 0
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative values found in slow service instance response. Ignoring response:",
              data
            );
            return;
          }

          this.slowInstanceData = data;
        },

        error: (err) => {
          console.error("Failed to load slow service instance data:", err);
        }
      });
  }


  // getServiceInstanceSuccessRate(): void {
  //   this.apmApiService.getServiceInstanceSuccessRate(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data) => {
  //     this.instanceSuccessRateData = Object.entries(data).map(([key, val]) => {
  //       const value = parseFloat(val);
  //       return {
  //         instance: key,
  //         value,
  //         status: value === 100 ? 'NORMAL' : 'CRITICAL'
  //       };
  //     });
  //   });
  // }

  getServiceInstanceSuccessRate(): void {
    this.apmApiService
      .getServiceInstanceSuccessRate(this.entityId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            console.error("Invalid instance success rate response structure:", data);
            return;
          }

          const invalidEntry = Object.entries(data).some(([key, val]) => {
            const value = parseFloat(val as any);

            return (
              typeof key !== 'string' ||
              !key.trim() ||
              isNaN(value) ||
              value < 0 ||
              value > 100
            );
          });

          if (invalidEntry) {
            console.error(
              "Invalid or negative instance success rate values found. Ignoring response:",
              data
            );
            return;
          }

          this.instanceSuccessRateData = Object.entries(data).map(([key, val]) => {
            const value = parseFloat(val as any);
            return {
              instance: key,
              value,
              status: value >= 99 ? 'NORMAL' : (value >= 95 ? 'WARNING' : 'CRITICAL')
            };
          });
        },

        error: (err) => {
          console.error("Failed to load service instance success rate:", err);
        }
      });
  }


  searchQuery = '';

  onSearch(): void {
    const q = this.searchQuery.trim().toLowerCase();

    if (!q) {
      this.filteredInstanceNames = [...this.instanceNames];
      return;
    }

    this.filteredInstanceNames = this.instanceNames.filter(name =>
      name.toLowerCase().includes(q)
    );
  }


  // getServiceInstanceNames(): void {
  //   this.apmApiService.getServiceInstanceNames(this.entityId!, this.startTime, this.endTime)
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe((data: any) => {
  //       const instanceList = Object.keys(data).flatMap(key => data[key]);
  //       this.totalHitsInstance = instanceList.length || 0;
  //       this.totalPagesInstance = Math.ceil(this.totalHitsInstance / this.rowsPerPageInstance);
  //       this.instanceNames = Array.from(new Set(instanceList));
  //       this.filteredInstanceNames = this.instanceNames;
  //       this.getInstanceCombinedData();
  //     });
  // }

  getServiceInstanceNames(): void {
    this.apmApiService
      .getServiceInstanceNames(this.entityId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid service instance response structure:", data);
            return;
          }

          const values = Object.values(data);

          if (!values.length || !values.every(v => Array.isArray(v))) {
            console.error("Missing or invalid service instance arrays:", data);
            return;
          }

          const instanceList = Object.keys(data).flatMap(key => data[key]);

          const invalidEntry = instanceList.some(
            (v: any) => typeof v !== "string" || !v.trim()
          );

          if (invalidEntry) {
            console.error("Invalid instance names found. Ignoring response:", data);
            return;
          }

          this.totalHitsInstance = instanceList.length || 0;
          this.totalPagesInstance = Math.ceil(
            this.totalHitsInstance / this.rowsPerPageInstance
          );
          this.instanceNames = Array.from(new Set(instanceList));
          this.filteredInstanceNames = this.instanceNames;
          this.getInstanceCombinedData();
        },

        error: (err) => {
          console.error("Failed to load service instance names:", err);
        }
      });
  }


  // getInstanceCombinedData(): void {
  //   const selectedServiceId = sessionStorage.getItem('encodedEntityIDForServices') || '';

  //   const instanceDataObservables = this.instanceNames.map(instanceName => {
  //     const encodedInstanceId = btoa(instanceName);
  //     const entityInstanceId = `${selectedServiceId}_${encodedInstanceId}`;

  //     return this.apmApiService.getCombinedData(entityInstanceId, this.startTime, this.endTime).pipe(
  //       map(data => ({ instanceName, data })),
  //       catchError(() => of({ instanceName, data: null }))
  //     );
  //   });

  //   forkJoin(instanceDataObservables).subscribe(results => {
  //     this.instanceId = results.reduce((acc, { instanceName, data }) => {
  //       acc[instanceName] = data;
  //       return acc;
  //     }, {} as { [key: string]: any });
  //     this.loadingInstance = false;
  //   });
  // }

  getInstanceCombinedData(): void {
    const selectedServiceId = sessionStorage.getItem('encodedEntityIDForServices') || '';

    // ✅ Prepare entityIds list (instead of multiple calls)
    const entityIds = this.instanceNames.map(instanceName => {
      const encodedInstanceId = btoa(instanceName);
      return `${selectedServiceId}_${encodedInstanceId}`;
    });

    this.apmApiService
      .getCombinedData(entityIds, this.startTime, this.endTime)
      .pipe(
        map((response: any) => {

          if (!Array.isArray(response)) {
            console.error("Invalid bulk response:", response);
            return [];
          }
          const entityToInstanceMap: { [key: string]: string } = {};
          this.instanceNames.forEach(instanceName => {
            const encodedInstanceId = btoa(instanceName);
            const entityInstanceId = `${selectedServiceId}_${encodedInstanceId}`;
            entityToInstanceMap[entityInstanceId] = instanceName;
          });

          return response.map((data: any) => {

            const entityId = data?.entityId;
            const instanceName = entityToInstanceMap[entityId];

            if (!instanceName) return null;
            if (!data || typeof data !== "object" || Array.isArray(data)) {
              console.error(
                "Invalid instance combined data response structure:",
                data,
                "for instance:",
                instanceName
              );
              return { instanceName, data: null };
            }

            const hasInvalidNumeric =
              (typeof data.service_load === "number" && data.service_load < 0) ||
              (typeof data.avg_latency === "number" && data.avg_latency < 0) ||
              (typeof data.success_rate === "number" && data.success_rate < 0);

            if (hasInvalidNumeric) {
              console.error(
                "Negative numeric values found in instance combined data. Ignoring response:",
                data,
                "for instance:",
                instanceName
              );
              return { instanceName, data: null };
            }

            if (
              data.properties &&
              (typeof data.properties !== "object" || Array.isArray(data.properties))
            ) {
              console.error(
                "Invalid 'properties' structure in instance combined data:",
                data,
                "for instance:",
                instanceName
              );
              return { instanceName, data: null };
            }

            return { instanceName, data };
          }).filter(x => x !== null);
        }),
        catchError(err => {
          console.error("Failed to load instance combined data:", err);
          return of([]);
        })
      )
      .subscribe(results => {

        this.instanceId = results.reduce((acc, { instanceName, data }) => {
          acc[instanceName] = data;
          return acc;
        }, {} as { [key: string]: any });

        this.loadingInstance = false;
      });
  }


  calculateInstancePagination(): void {
    this.totalPagesInstance = Math.ceil(this.totalHitsInstance / this.rowsPerPageInstance);
  }

  previousInstancePage(): void {
    if (this.currentPageInstance > 1) {
      this.currentPageInstance--;
      this.getServiceInstanceNames();
    }
  }

  nextInstancePage(): void {
    if (this.currentPageInstance < this.totalPagesInstance) {
      this.currentPageInstance++;
      this.getServiceInstanceNames();
    }
  }

  goToInstancePage(page: number): void {
    this.currentPageInstance = page;
    this.getServiceInstanceNames();
  }

  get totalInstancePagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];

    if (this.totalPagesInstance <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPagesInstance }, (_, i) => i + 1);
    } else {
      if (this.currentPageInstance <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPagesInstance];
      } else if (this.currentPageInstance >= this.totalPagesInstance - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPagesInstance - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPageInstance - 1, this.currentPageInstance, this.currentPageInstance + 1, '...', this.totalPagesInstance];
      }
    }
    return pages;
  }

  isAttributeModal = false;
  selectedInstance: any = null;

  openAttributeModal(instance: any) {
    this.selectedInstance = instance;
    this.isAttributeModal = true;
  }

  closeAttributeModal() {
    this.isAttributeModal = false;
    this.selectedInstance = null;
  }

  getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  openInstLoadPopup(event: MouseEvent, instanceName: string): void {
    this.instPopupX = event.clientX;
    this.instPopupY = event.clientY;
    this.instShowPopup = true;
    this.getServiceInstanceLoadTimevalues(instanceName);
  }

  closeInstPopup(): void {
    this.instShowPopup = false;
  }

  // getServiceInstanceLoadTimevalues(instanceName: string): void {
  //   this.apmApiService.getServiceInstanceLoadTimevalues(this.entityId + '_' + btoa(instanceName), this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     const timeSeries = data.loadTimeSeries;
  //     this.getServiceInstanceLoadTimevaluesChart(timeSeries);
  //   })
  // }

  getServiceInstanceLoadTimevalues(instanceName: string): void {
    this.apmApiService
      .getServiceInstanceLoadTimevalues(
        this.entityId + '_' + btoa(instanceName),
        this.startTime,
        this.endTime
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid service instance load response structure:", data);
            return;
          }

          if (!Array.isArray(data.loadTimeSeries)) {
            console.error("Missing or invalid 'loadTimeSeries' in service instance load response:", data);
            return;
          }

          const invalidEntry = data.loadTimeSeries.some(
            (item: any) =>
              (typeof item.load === "number" && item.load < 0) ||
              (item.load !== undefined && typeof item.load !== "number") ||
              !item.time_bucket
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative 'load' entries found in service instance loadTimeSeries. Ignoring response:",
              data
            );
            return;
          }

          const timeSeries = data.loadTimeSeries;
          this.getServiceInstanceLoadTimevaluesChart(timeSeries);
        },

        error: (err) => {
          console.error("Failed to load service instance load time values:", err);
        }
      });
  }


  getServiceInstanceLoadTimevaluesChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );
      if (keys.length === 0) {
        this.serviceInstanceLoadTimeValueChart = null;
        return;
      }
      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const getColorByStatus = (status: string): string => {
        switch (status?.toUpperCase()) {
          case 'CRITICAL': return '#F44336';
          case 'WARNING': return '#FFC107';
          case 'NORMAL': return '#30AEF9';
          default: return '#30AEF9';
        }
      };

      const series: Highcharts.SeriesLineOptions[] = keys.map(key => ({
        name: key,
        type: 'line',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => ({
          y: Number(d[key]),
          color: getColorByStatus(d['status'])
        }))
      }));

      this.serviceInstanceLoadTimeValueChart = {
        chart: {
          type: 'line',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  openInstSrPopup(event: MouseEvent, instanceName: string): void {
    this.instPopupSrX = event.clientX;
    this.instPopupSrY = event.clientY;
    this.instShowSrPopup = true;
    this.getServiceInstanceSuccessRateTimevalues(instanceName);
  }

  closeInstSrPopup(): void {
    this.instShowSrPopup = false;
  }

  // getServiceInstanceSuccessRateTimevalues(instanceName: string): void {
  //   this.apmApiService.getServiceInstanceSuccessRateTimevalues(this.entityId + '_' + btoa(instanceName), this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.successRate = data.successRate;
  //     const timeSeries = data.successRateTimeSeries;
  //     this.getServiceInstanceSuccessRateTimevaluesChart(timeSeries);
  //   })
  // }

  getServiceInstanceSuccessRateTimevalues(instanceName: string): void {
    this.apmApiService
      .getServiceInstanceSuccessRateTimevalues(
        this.entityId + '_' + btoa(instanceName),
        this.startTime,
        this.endTime
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid service instance success rate response structure:", data);
            return;
          }

          if (typeof data.successRate !== "number" || data.successRate < 0) {
            console.error("Invalid or negative 'successRate' value found. Ignoring response:", data);
            return;
          }

          const invalidEntry = data.successRateTimeSeries.some(
            (item: any) =>
              (typeof item.success_rate !== "number" && item.success_rate !== undefined) ||
              item.success_rate < 0 ||
              !item.time_bucket
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative 'success_rate' entries found in successRateTimeSeries. Ignoring response:",
              data
            );
            return;
          }

          this.successRate = data.successRate;
          const timeSeries = data.successRateTimeSeries;
          this.getServiceInstanceSuccessRateTimevaluesChart(timeSeries);
        },

        error: (err) => {
          console.error("Failed to load service instance success rate metrics:", err);
        }
      });
  }


  getServiceInstanceSuccessRateTimevaluesChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );
      if (keys.length === 0) {
        this.serviceInstanceSuccessRateTimevaluesChart = null;
        return;
      }
      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const series: Highcharts.SeriesColumnOptions[] = keys.map(key => ({
        name: key,
        type: 'column',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => ({
          y: Number(d[key]),
          color: Number(d[key]) === 100 ? '#4CAF50' : '#F44336' // Green or Red
        }))

      }));

      this.serviceInstanceSuccessRateTimevaluesChart = {
        chart: {
          type: 'column',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          max: 100,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        plotOptions: {
          column: {
            maxPointWidth: 10,
            grouping: true,
            borderWidth: 0
          }
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  openInstLtPopup(event: MouseEvent, instanceName: string): void {
    this.instPopupLtX = event.clientX;
    this.instPopupLtY = event.clientY;
    this.instShowLtPopup = true;
    this.getServiceInstanceLatencyTimevalues(instanceName);
  }

  closeInstLtPopup(): void {
    this.instShowLtPopup = false;
  }

  // getServiceInstanceLatencyTimevalues(instanceName: string): void {
  //   this.apmApiService.getServiceInstanceLatencyTimevalues(this.entityId + '_' + btoa(instanceName), this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     const timeSeries = data.latencyTimeSeries;
  //     this.getServiceInstanceLatencyTimevaluesChart(timeSeries);
  //   })
  // }

  getServiceInstanceLatencyTimevalues(instanceName: string): void {
    this.apmApiService
      .getServiceInstanceLatencyTimevalues(
        this.entityId + '_' + btoa(instanceName),
        this.startTime,
        this.endTime
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid instance latency response structure:", data);
            return;
          }

          const invalidEntry = data.latencyTimeSeries.some(
            (item: any) =>
              typeof item.latency !== "number" ||
              item.latency < 0 ||
              !item.time_bucket
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative latency entries found. Ignoring response:",
              data
            );
            return;
          }

          const timeSeries = data.latencyTimeSeries;
          this.getServiceInstanceLatencyTimevaluesChart(timeSeries);
        },

        error: (err) => {
          console.error("Failed to load service instance latency metrics:", err);
        }
      });
  }


  getServiceInstanceLatencyTimevaluesChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );
      if (keys.length === 0) {
        this.serviceInstanceLatencyTimevaluesChart = null;
        return;
      }
      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const getColorByStatus = (status: string): string => {
        switch (status?.toUpperCase()) {
          case 'CRITICAL': return '#F44336';
          case 'WARNING': return '#FFC107';
          case 'NORMAL': return '#30AEF9';
          default: return '#30AEF9';
        }
      };

      const series: Highcharts.SeriesAreasplineOptions[] = keys.map(key => ({
        name: key,
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => ({
          y: Number(d[key]),
          color: getColorByStatus(d['status'])
        }))
      }));

      this.serviceInstanceLatencyTimevaluesChart = {
        chart: {
          type: 'areaspline',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }


  getThresholdDisplay(metric: string, actualValue: number): { value: number, color: string } {
    if (!this.thresholds || !this.thresholds[metric] || actualValue == null) {
      return { value: 0, color: '#3b82f6' };
    }

    const t = this.thresholds[metric];
    let displayValue = t.warningValue;
    let color = '#3A8754';

    if (metric === 'service_resp_time' || metric === 'service_cpm' || metric === 'service_percentile') {
      if (actualValue >= t.criticalValue) {
        displayValue = t.criticalValue;
        color = 'red';
      } else if (actualValue >= t.warningValue) {
        displayValue = t.warningValue;
        color = 'orange';
      }
    }
    else if (metric === 'service_apdex' || metric === 'service_sla') {
      if (actualValue < t.criticalValue) {
        displayValue = t.criticalValue;
        color = 'red';
      } else if (actualValue < t.warningValue) {
        displayValue = t.warningValue;
        color = 'orange';
      }
    }
    else if (metric === 'database_access_sla') {
      if (actualValue < t.criticalValue) {
        color = 'red';
      } else if (actualValue < t.warningValue) {
        color = 'orange';
      } else {
        color = '#3A8754';
      }
    }
    else if (metric === 'database_access_cpm' ||
      metric === 'database_access_resp_time' ||
      metric === 'database_access_percentile') {
      if (actualValue > t.criticalValue) {
        color = 'red';
      } else if (actualValue > t.warningValue) {
        color = 'orange';
      } else {
        color = '#3A8754';
      }
    }

    return { value: displayValue, color };
  }


  // ENDPOINT

  setServiceEndpoints(event: MouseEvent): void {
    event.preventDefault()
    const aElement = event.target as HTMLElement;
    const serviceEndpoint = aElement.textContent?.trim();
    sessionStorage.setItem('SelectedServiceEndpoint', serviceEndpoint!);
    this.router.navigate(['/service-page/general-service/general-endpoint']);
  }

  getProgressBarClass(status: string): string {
    switch (status) {
      case 'CRITICAL': return 'bg-danger-bar';
      case 'WARNING': return 'bg-warning-bar';
      default: return 'bg-normal-bar';
    }
  }

  openTraceTabEndoint(selectedEndpoint: any): void {
    const traceTab = document.querySelector('.nav-link[href="#trace"]') as HTMLElement;
    if (traceTab) {
      traceTab.click();
    }
    this.endpointTrace = selectedEndpoint;
    this.loadData('trace');
    this.selectCriteria('endpoint');
  }


  // convertMinutes(minutes: number): string {
  //   if (!minutes && minutes !== 0) return '-';

  //   const days = Math.floor(minutes / 1440);
  //   const hours = Math.floor((minutes % 1440) / 60);
  //   const mins = minutes % 60;

  //   if (days > 0) return `${days} day ${hours} hr`;
  //   if (hours > 0) return `${hours} hr ${mins} min`;
  //   return `${mins} min`; 
  // }

  convertMiliSec(ms: number): string {
    if (!ms && ms !== 0) return '-';

    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;

    if (minutes > 0) return `${minutes} min ${seconds} sec`;
    if (seconds > 0) return `${seconds} sec ${milliseconds} ms`;
    return `${milliseconds} ms`;
  }


  // getEndpointsLoadInCurrentService(): void {
  //   this.apmApiService.getEndpointsLoadInCurrentService(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.endpointLoadData = data
  //   })
  // }

  getEndpointsLoadInCurrentService(): void {
    this.apmApiService
      .getEndpointsLoadInCurrentService(this.entityId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || !Array.isArray(data)) {
            console.error("Invalid endpoint load response structure:", data);
            return;
          }

          const invalidEntry = data.some(
            (item: any) =>
              typeof item !== "object" ||
              typeof item.endpoint !== "string" ||
              !item.endpoint.trim() ||
              typeof item.value !== "number" ||
              item.value < 0
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative endpoint load entries found. Ignoring response:",
              data
            );
            return;
          }

          this.endpointLoadData = data;
        },

        error: (err) => {
          console.error("Failed to load endpoint load data:", err);
        }
      });
  }


  // getSlowEndpointsInCurrentService(): void {
  //   this.apmApiService.getSlowEndpointsInCurrentService(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.slowEndpointData = data;
  //   })
  // }

  getSlowEndpointsInCurrentService(): void {
    this.apmApiService
      .getSlowEndpointsInCurrentService(this.entityId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || !Array.isArray(data)) {
            console.error("Invalid slow endpoints response structure:", data);
            return;
          }

          const invalidEntry = data.some(
            (item: any) =>
              typeof item !== "object" ||
              typeof item.endpoint !== "string" ||
              !item.endpoint.trim() ||
              typeof item.value !== "number" ||
              item.value < 0
          );

          if (invalidEntry) {
            console.error("Invalid or negative slow endpoint entries found. Ignoring response:", data);
            return;
          }

          this.slowEndpointData = data;
        },

        error: (err) => {
          console.error("Failed to load slow endpoints data:", err);
        }
      });
  }


  // getEndpointSuccessRateInCurrentService(): void {
  //   this.apmApiService.getEndpointSuccessRateInCurrentService(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data) => {
  //     this.endpointSuccessRateData = Object.entries(data).map(([key, val]) => {
  //       const value = parseFloat(val);
  //       return {
  //         endpoint: key,
  //         value,
  //         status: value === 100 ? 'NORMAL' : 'CRITICAL'
  //       };
  //     });
  //   });
  // }

  getEndpointSuccessRateInCurrentService(): void {
    this.apmApiService
      .getEndpointSuccessRateInCurrentService(this.entityId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid endpoint success rate response structure:", data);
            return;
          }

          const entries = Object.entries(data);

          if (!entries.length) {
            console.error("Empty endpoint success rate response:", data);
            return;
          }

          const invalidEntry = entries.some(([key, val]) => {
            const parsed = parseFloat(val as any);

            return (
              typeof key !== "string" ||
              !key.trim() ||
              isNaN(parsed) ||
              parsed < 0 ||
              parsed > 100
            );
          });

          if (invalidEntry) {
            console.error(
              "Invalid endpoint success rate values found. Ignoring response:",
              data
            );
            return;
          }

          this.endpointSuccessRateData = entries.map(([key, val]) => {
            const value = parseFloat(val as any);
            return {
              endpoint: key,
              value,
              status: value >= 99 ? 'NORMAL' : (value >= 95 ? 'WARNING' : 'CRITICAL')
            };
          });
        },

        error: (err) => {
          console.error("Failed to load endpoint success rate:", err);
        }
      });
  }


  // getEndpointNames(): void {
  //   this.loadingEndpoints = true;
  //   const params: { serviceId: string; st: number; et: number; searchWord?: string; sortBy?: string; order?: string } = {
  //     serviceId: this.entityId!,
  //     st: this.startTime,
  //     et: this.endTime,
  //     ...(this.searchTextEndpoint && { searchWord: this.searchTextEndpoint }),
  //     ...(this.endpointSortBy && { sortBy: this.endpointSortBy }),
  //     ...(this.endpointOrder && { order: this.endpointOrder })
  //   };

  //   this.apmApiService.endpointNamesUpdated(
  //     params.serviceId,
  //     params.st,
  //     params.et,
  //     this.rowsPerPageEndpoint,
  //     this.currentPageEndpoint,
  //     params.searchWord,
  //     params.sortBy,
  //     params.order
  //   ).pipe(takeUntil(this.destroy$), catchError(err => {
  //     console.error('Error fetching endpoint names', err);
  //     return of({ total_hits: 0, endpoints: [] });
  //   }),
  //     finalize(() => this.loadingEndpoints = false)
  //   ).subscribe((data: any) => {
  //     this.totalHitsEndpoint = data.total_hits || 0;
  //     this.errorCountEndpoint = data.error_count || 0;
  //     this.totalPagesEndpoint = Math.ceil(this.totalHitsEndpoint / this.rowsPerPageEndpoint);
  //     this.endPointNames = data.endpoints || [];
  //   });
  // }

  getEndpointNames(): void {
    this.loadingEndpoints = true;

    const params: {
      serviceId: string;
      st: number;
      et: number;
      searchWord?: string;
      sortBy?: string;
      order?: string;
      filter?: string;
    } = {
      serviceId: this.entityId!,
      st: this.startTime,
      et: this.endTime,
      ...(this.searchTextEndpoint && { searchWord: this.searchTextEndpoint }),
      ...(this.endpointSortBy && { sortBy: this.endpointSortBy }),
      ...(this.endpointOrder && { order: this.endpointOrder }),
      ...(this.endpointFilter && { filter: this.endpointFilter })
    };

    this.apmApiService
      .endpointNamesUpdated(
        params.serviceId,
        params.st,
        params.et,
        this.rowsPerPageEndpoint,
        this.currentPageEndpoint,
        params.searchWord,
        params.sortBy,
        params.order,
        params.filter
      )
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error("Error fetching endpoint names", err);
          return of({ total_hits: 0, error_count: 0, endpoints: [] });
        }),
        finalize(() => (this.loadingEndpoints = false))
      )
      .subscribe((data: any) => {

        if (!data || typeof data !== "object" || Array.isArray(data)) {
          console.error("Invalid endpoint names response structure:", data);
          return;
        }

        if (!Array.isArray(data.endpoints)) {
          console.error("Missing or invalid 'endpoints' array:", data);
          return;
        }

        const invalidEndpoint = data.endpoints.some((ep: any) =>
          !ep ||
          typeof ep.endpoint_id !== "string" ||
          !ep.endpoint_id.trim() ||
          !ep.metrics ||
          typeof ep.metrics !== "object" ||
          typeof ep.metrics.endpoint_load !== "number" ||
          ep.metrics.endpoint_load < 0 ||
          typeof ep.metrics.total_hits !== "number" ||
          ep.metrics.total_hits < 0 ||
          typeof ep.metrics.latency !== "number" ||
          ep.metrics.latency < 0 ||
          typeof ep.metrics.success_rate !== "number" ||
          ep.metrics.success_rate < 0 ||
          (ep.metrics.c2xx !== undefined && typeof ep.metrics.c2xx !== "number") ||
          (ep.metrics.c4xx !== undefined && typeof ep.metrics.c4xx !== "number") ||
          (ep.metrics.c5xx !== undefined && typeof ep.metrics.c5xx !== "number")
        );

        if (invalidEndpoint) {
          console.error(
            "Invalid or negative endpoint metrics found. Ignoring response:",
            data
          );
          return;
        }

        this.totalHitsEndpoint = data.total_hits || 0;
        this.errorCountEndpoint = data.error_count || 0;
        this.totalPagesEndpoint = Math.ceil(
          this.totalHitsEndpoint / this.rowsPerPageEndpoint
        );
        this.endPointNames = data.endpoints || [];
      });
  }


  seeErrorEndpoint(): void {
    this.endpointFilter = 'error';
    this.currentPageEndpoint = 1;
    this.getEndpointNames();
  }

  seeSuccessEndpoint(): void {
    this.endpointFilter = 'success';
    this.currentPageEndpoint = 1;
    this.getEndpointNames();
  }

  seeAllEndpoint(): void {
    this.endpointFilter = '';
    this.currentPageEndpoint = 1;
    this.getEndpointNames();
  }

  toggleEndpointLoad(): void {
    this.endpointSortBy = 'endpoint_load'
    this.endpointOrder = this.endpointOrder === 'asc' ? 'desc' : 'asc';
    this.getEndpointNames();
  }

  toggleEndpointSuccessRate(): void {
    this.endpointSortBy = 'success_rate'
    this.endpointOrder = this.endpointOrder === 'asc' ? 'desc' : 'asc';
    this.getEndpointNames();
  }

  toggleEndpointLatency(): void {
    this.endpointSortBy = 'latency'
    this.endpointOrder = this.endpointOrder === 'asc' ? 'desc' : 'asc';
    this.getEndpointNames();
  }

  toggleEndpointTotalHit(): void {
    this.endpointSortBy = 'total_hits'
    this.endpointOrder = this.endpointOrder === 'asc' ? 'desc' : 'asc';
    this.getEndpointNames();
  }

  toggleEndpointFailureCount(): void {
    this.endpointSortBy = 'failure_count'
    this.endpointOrder = this.endpointOrder === 'asc' ? 'desc' : 'asc';
    this.getEndpointNames();
  }

  toggleEndpointFailureRate(): void {
    this.endpointSortBy = 'failure_rate'
    this.endpointOrder = this.endpointOrder === 'asc' ? 'desc' : 'asc';
    this.getEndpointNames();
  }

  toggleEndpoint1xx(): void {
    this.endpointSortBy = 'c1xx';
    this.endpointOrder = this.endpointOrder === 'asc' ? 'desc' : 'asc';
    this.getEndpointNames();
  }

  toggleEndpoint2xx(): void {
    this.endpointSortBy = 'c2xx';
    this.endpointOrder = this.endpointOrder === 'asc' ? 'desc' : 'asc';
    this.getEndpointNames();
  }

  toggleEndpoint3xx(): void {
    this.endpointSortBy = 'c3xx';
    this.endpointOrder = this.endpointOrder === 'asc' ? 'desc' : 'asc';
    this.getEndpointNames();
  }

  toggleEndpoint4xx(): void {
    this.endpointSortBy = 'c4xx';
    this.endpointOrder = this.endpointOrder === 'asc' ? 'desc' : 'asc';
    this.getEndpointNames();
  }

  toggleEndpoint5xx(): void {
    this.endpointSortBy = 'c5xx';
    this.endpointOrder = this.endpointOrder === 'asc' ? 'desc' : 'asc';
    this.getEndpointNames();
  }

  calculateEndpointPagination(): void {
    this.totalPagesEndpoint = Math.ceil(this.totalHitsEndpoint / this.rowsPerPageEndpoint);
  }

  previousEndpointPage(): void {
    if (this.currentPageEndpoint > 1) {
      this.currentPageEndpoint--;
      this.getEndpointNames();
    }
  }

  nextEndpointPage(): void {
    if (this.currentPageEndpoint < this.totalPagesEndpoint) {
      this.currentPageEndpoint++;
      this.getEndpointNames();
    }
  }

  goToEndpointPage(page: number): void {
    this.currentPageEndpoint = page;
    this.getEndpointNames();
  }

  toggleColumnDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.columnDropdownOpen = !this.columnDropdownOpen;
  }

  toggleColumn(columnName: 'endpoints' | 'load' | 'successRate' | 'failureCount' | 'failureRate' | 'latency' | 'hits' | 'c1xx' | 'c2xx' | 'c3xx' | 'c4xx' | 'c5xx', event: MouseEvent): void {
    event.stopPropagation();
    this.showColumns[columnName] = !this.showColumns[columnName];
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.columnDropdownOpen = false;
  }

  get endpointItemRange(): string {
    if (this.totalHitsEndpoint === 0) return '0/0';
    const start = (this.currentPageEndpoint - 1) * this.rowsPerPageEndpoint + 1;
    const end = Math.min(this.currentPageEndpoint * this.rowsPerPageEndpoint, this.totalHitsEndpoint);
    return `${end}/${this.totalHitsEndpoint}`;
  }

  get totalEndpointPagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];

    if (this.totalPagesEndpoint <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPagesEndpoint }, (_, i) => i + 1);
    } else {
      if (this.currentPageEndpoint <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPagesEndpoint];
      } else if (this.currentPageEndpoint >= this.totalPagesEndpoint - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPagesEndpoint - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPageEndpoint - 1, this.currentPageEndpoint, this.currentPageEndpoint + 1, '...', this.totalPagesEndpoint];
      }
    }
    return pages;
  }

  openLoadPopup(event: MouseEvent, endpointName: string): void {
    this.popupX = event.clientX;
    this.popupY = event.clientY;
    this.showPopup = true;
    this.getEndpointLoad(endpointName);
  }

  closePopup(): void {
    this.showPopup = false;
  }

  // getEndpointLoad(endpointName: string): void {
  //   this.apmApiService.getEndpointLoad(this.entityId + '_' + btoa(endpointName), this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     const timeSeries = data.loadTimeSeries;
  //     this.getEndpointLoadChart(timeSeries);
  //   })
  // }

  getEndpointLoad(endpointName: string): void {
    this.apmApiService
      .getEndpointLoad(
        this.entityId + '_' + btoa(endpointName),
        this.startTime,
        this.endTime
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid endpoint load response structure:", data);
            return;
          }

          if (!data.loadTimeSeries || !Array.isArray(data.loadTimeSeries)) {
            console.error("Missing or invalid 'loadTimeSeries' in endpoint load response:", data);
            return;
          }

          const invalidEntry = data.loadTimeSeries.some(
            (item: any) =>
              (typeof item.load === "number" && item.load < 0) ||
              !item.time_bucket
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative 'load' entries found in endpoint loadTimeSeries. Ignoring response:",
              data
            );
            return;
          }

          const timeSeries = data.loadTimeSeries;
          this.getEndpointLoadChart(timeSeries);
        },

        error: (err) => {
          console.error("Failed to load endpoint load metrics:", err);
        }
      });
  }


  getEndpointLoadChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );
      if (keys.length === 0) {
        this.EndpointLoadChart = null;
        return;
      }
      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const getColorByStatus = (status: string): string => {
        switch (status?.toUpperCase()) {
          case 'CRITICAL': return '#F44336';
          case 'WARNING': return '#FFC107';
          case 'NORMAL': return '#30AEF9';
          default: return '#30AEF9';
        }
      };

      const series: Highcharts.SeriesLineOptions[] = keys.map(key => ({
        name: key,
        type: 'line',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => ({
          y: Number(d[key]),
          color: getColorByStatus(d['status'])
        }))
      }));

      this.EndpointLoadChart = {
        chart: {
          type: 'line',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  openSrPopup(event: MouseEvent, endpointName: string): void {
    this.popupSrX = event.clientX;
    this.popupSrY = event.clientY;
    this.showSRPopup = true;
    this.getEndpointSuccessRate(endpointName);
  }

  closeSrPopup(): void {
    this.showSRPopup = false;
  }

  // getEndpointSuccessRate(instanceName: string): void {
  //   this.apmApiService.getEndpointSuccessRate(this.entityId + '_' + btoa(instanceName), this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.successRate = data.successRate;
  //     const timeSeries = data.successRateTimeSeries;
  //     this.getEndpointSuccessRateChart(timeSeries);
  //   })
  // }

  getEndpointSuccessRate(instanceName: string): void {
    this.apmApiService
      .getEndpointSuccessRate(
        this.entityId + '_' + btoa(instanceName),
        this.startTime,
        this.endTime
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid endpoint success rate response structure:", data);
            return;
          }

          if (typeof data.successRate !== "number" || data.successRate < 0) {
            console.error("Invalid or negative 'successRate' value:", data);
            return;
          }

          if (!data.successRateTimeSeries || !Array.isArray(data.successRateTimeSeries)) {
            console.error("Missing or invalid 'successRateTimeSeries':", data);
            return;
          }

          const invalidEntry = data.successRateTimeSeries.some(
            (item: any) =>
              !item.time_bucket ||
              (item.success_rate !== undefined &&
                (typeof item.success_rate !== "number" || item.success_rate < 0))
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative 'success_rate' entries found in successRateTimeSeries. Ignoring response:",
              data
            );
            return;
          }

          this.successRate = data.successRate;
          const timeSeries = data.successRateTimeSeries;
          this.getEndpointSuccessRateChart(timeSeries);
        },

        error: (err) => {
          console.error("Failed to load endpoint success rate:", err);
        }
      });
  }


  getEndpointSuccessRateChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );
      if (keys.length === 0) {
        this.EndpointSuccessRateChart = null;
        return;
      }
      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const series: Highcharts.SeriesColumnOptions[] = keys.map(key => ({
        name: key,
        type: 'column',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => ({
          y: Number(d[key]),
          color: Number(d[key]) === 100 ? '#4CAF50' : '#F44336' // Green or Red
        }))

      }));

      this.EndpointSuccessRateChart = {
        chart: {
          type: 'column',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          max: 100,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        plotOptions: {
          column: {
            maxPointWidth: 10,
            grouping: true,
            borderWidth: 0
          }
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  openLtPopup(event: MouseEvent, endpointName: string): void {
    this.popupLtX = event.clientX;
    this.popupLtY = event.clientY;
    this.showLtPopup = true;
    this.getEndpointAvgResponseTime(endpointName);
  }

  closeLtPopup(): void {
    this.showLtPopup = false;
  }

  // getEndpointAvgResponseTime(endpointName: string): void {
  //   this.apmApiService.getEndpointAvgResponseTime(this.entityId + '_' + btoa(endpointName), this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     const timeSeries = data.latencyTimeSeries;
  //     this.getEndpointAvgResponseTimeChart(timeSeries);
  //   })
  // }

  getEndpointAvgResponseTime(endpointName: string): void {
    this.apmApiService
      .getEndpointAvgResponseTime(
        this.entityId + '_' + btoa(endpointName),
        this.startTime,
        this.endTime
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object") {
            console.error("Invalid endpoint avg response time structure:", data);
            return;
          }

          if (!data.latencyTimeSeries || !Array.isArray(data.latencyTimeSeries)) {
            console.error("Missing or invalid 'latencyTimeSeries' in endpoint avg response time:", data);
            return;
          }

          const invalidEntry = data.latencyTimeSeries.some(
            (item: any) =>
              !item.time_bucket ||
              (item.latency !== undefined &&
                (typeof item.latency !== "number" || item.latency < 0))
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative 'latency' entries found in endpoint avg response time. Ignoring response:",
              data
            );
            return;
          }

          const timeSeries = data.latencyTimeSeries;
          this.getEndpointAvgResponseTimeChart(timeSeries);
        },

        error: (err) => {
          console.error("Failed to load endpoint avg response time:", err);
        }
      });
  }


  getEndpointAvgResponseTimeChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );
      if (keys.length === 0) {
        this.EndpointAvgResponseTimeChart = null;
        return;
      }
      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const getColorByStatus = (status: string): string => {
        switch (status?.toUpperCase()) {
          case 'CRITICAL': return '#F44336';
          case 'WARNING': return '#FFC107';
          case 'NORMAL': return '#30AEF9';
          default: return '#30AEF9';
        }
      };

      const series: Highcharts.SeriesAreasplineOptions[] = keys.map(key => ({
        name: key,
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.3,
        data: data.map(d => ({
          y: Number(d[key]),
          color: getColorByStatus(d['status'])
        }))
      }));

      this.EndpointAvgResponseTimeChart = {
        chart: {
          type: 'areaspline',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  // TOPOLOGY

  observeThemeChange() {
    this.themeObserver = new MutationObserver(() => {
      this.loadTopologyData();
    });
    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  loadTopologyData(): void {
    this.apmApiService.getServiceTopology(this.entityId!, this.startTime, this.endTime, this.selectedTopologyLevel)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (response: any) => {
          if (!response || !response.topology) {
            console.error("Invalid topology response", response);
            return;
          }
          
          const processed = this.processData(response.topology);
          const metrics = response.metrics || {};
          
          // Assign metrics to nodes
          processed.nodes.forEach(node => {
             if (node.name === 'User') {
                 node.successRate = null;
                 node.latency = null;
                 node.apdex = null;
                 return;
             }
             const nodeData = metrics[node.serviceId];
             if (nodeData) {
                 node.successRate = nodeData.success_rate ?? null;
                 node.latency = nodeData.latency ?? null;
                 node.apdex = nodeData.apdex ?? null;
                 node.openAlertCount = nodeData.openalertcount !== undefined ? nodeData.openalertcount : (nodeData.open_alert_count !== undefined ? nodeData.open_alert_count : 0);
             } else {
                 node.successRate = null;
                 node.latency = null;
                 node.apdex = null;
                 node.openAlertCount = 0;
             }
          });
          
          // Assign metrics to links
          processed.links.forEach(link => {
              const targetNode = typeof link.target === 'string' ? processed.nodes.find(n => n.id === link.target) : link.target;
              if (targetNode && targetNode.serviceId && metrics[targetNode.serviceId]) {
                  link.load = metrics[targetNode.serviceId].load ?? 0;
              } else {
                  link.load = 0;
              }
          });
          
          this['nodes'] = processed.nodes;
          this['links'] = processed.links;
          this.renderGraph();
        },
        error: (err) => {
          console.error('Error loading topology data', err);
        }
      });
  }

  processData(data: any[]): { nodes: any[], links: any[] } {
    const nodesMap: { [key: string]: any } = {};
    const nodes: any[] = [];
    const links: any[] = [];
    data.forEach(item => {
      const source = item.source_service_name;
      const dest = item.dest_service_name;
      if (!nodesMap[source]) {
        let sourceLayer = source === 'User' ? 'User' : (item.source_layer || 'Other');
        nodesMap[source] = {
          id: source,
          name: source,
          serviceId: source,
          componentId: item.componentId,
          layer: sourceLayer,
          componentName: item.source_componentName || (source === 'User' ? 'User' : 'Unknown')
        };
      } else {
        if (item.source_layer && (!nodesMap[source].layer || nodesMap[source].layer === 'Other')) {
          nodesMap[source].layer = item.source_layer || 'Other';
        }
        if (item.source_componentName && (!nodesMap[source].componentName || nodesMap[source].componentName === 'Unknown' || nodesMap[source].componentName === 'N/A')) {
          nodesMap[source].componentName = item.source_componentName;
        }
      }
      if (!nodesMap[dest]) {
        let destLayer = dest === 'User' ? 'User' : (item.layer || 'Other');
        
        nodesMap[dest] = {
          id: dest,
          name: dest,
          serviceId: dest,
          componentId: item.componentId,
          componentName: item.componentName,
          layer: destLayer
        };
      } else {
        if (item.layer && (!nodesMap[dest].layer || nodesMap[dest].layer === 'Other')) {
          nodesMap[dest].layer = item.layer || 'Other';
        }
        if (item.componentName && (!nodesMap[dest].componentName || nodesMap[dest].componentName === 'Unknown' || nodesMap[dest].componentName === 'N/A')) {
          nodesMap[dest].componentName = item.componentName;
        }
      }
      nodes.push(nodesMap[source], nodesMap[dest]);
      links.push({
        source: nodesMap[source],
        target: nodesMap[dest],
        value: item.value || 1,
        load: item.load || 0
      });
    });
    return {
      nodes: Array.from(new Set(nodes)),
      links
    };
  }

  renderGraph(): void {
    const svg = d3.select(this.svgElement.nativeElement)
      .attr('width', this.width)
      .attr('height', this.height);

    svg.selectAll('*').remove();

    const container = svg.append('g');

    svg.call(d3.zoom().scaleExtent([0.5, 5]).on('zoom', (event) => {
      container.attr('transform', event.transform);
    }));

    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('markerWidth', 15)
      .attr('markerHeight', 15)
      .attr('refX', 22)
      .attr('refY', 4)
      .attr('orient', 'auto')
      .attr('markerUnits', 'strokeWidth')
      .append('path')
      .attr('d', 'M0,0 L11.25,3.75 L0,7.5 L3.75,3.75 z')
      .attr('fill', '#219EBC');

    svg.append('defs').append('style').text(`
        .dashed {
          stroke-dasharray: 10, 5;
          animation: dash 250ms linear infinite;
        }
        @keyframes dash {
          from { stroke-dashoffset: 10; }
          to { stroke-dashoffset: 0; }
        }
      `);

    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

    const simulation = d3.forceSimulation<NodeDatum>(this.nodes)
      .alphaDecay(0.003)
      .velocityDecay(0.96)
      .force('link', d3.forceLink<NodeDatum, LinkDatum>(this.links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-1500).distanceMax(500))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collide', d3.forceCollide().radius(this.nodeRadius * 4).iterations(3))
      .force('x', d3.forceX((d: NodeDatum) => d.name === 'User' ? this.nodeRadius + 50 : this.width / 2).strength(0.15))
      .force('y', d3.forceY(this.height / 2).strength(0.1));

    const link = container.selectAll<SVGPathElement, LinkDatum>('.link')
      .data(this.links)
      .enter().append('path')
      .attr('class', 'link dashed')
      .attr('fill', 'none')
      .attr('stroke', '#219EBC')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrow)');

    const linkLabels = container.selectAll('.link-label')
      .data(this.links)
      .enter().append('text')
      .attr('class', 'link-label')
      .attr('text-anchor', 'middle')
      .attr('fill', labelColor)
      .style('font-size', '10px')
      .text(d => d.load ? `${d.load} calls/min` : '');

    const tooltip = d3.select('body').append('div')
      .attr('class', 'custom-topology-tooltip')
      .style('opacity', 0)
      .style('background', 'var(--navBar-bg-color)')
      .style('backdrop-filter', 'blur(8px)')
      .style('color', 'var(--navBar-text-color)')
      .style('padding', '16px')
      .style('border-radius', '8px')
      .style('border', '1px solid rgba(255, 255, 255, 0.15)')
      .style('box-shadow', '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)')
      .style('position', 'absolute')
      .style('font-size', '13px')
      .style('font-family', "'Inter', system-ui, sans-serif")
      .style('min-width', '220px')
      .style('z-index', '9999')
      .style('pointer-events', 'none');

    const node = container.selectAll<SVGGElement, NodeDatum>('.node')
      .data(this.nodes)
      .enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => {
        if (d.name === 'User') {
          d.x = this.nodeRadius;
          d.y = this.height / 2;
        }
        return `translate(${d.x}, ${d.y})`;
      })
      .call(d3.drag<SVGGElement, NodeDatum>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.1).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
          this.nodes.forEach(node => {
            if (node !== d) {
              node.fx = node.x;
              node.fy = node.y;
            }
          });
        })
        .on('end', (event, d) => {
          d.fx = d.x;
          d.fy = d.y;
        }))
      .on('mouseover', (event, d) => {
        if (d.name !== 'User') {
          tooltip.transition()
            .duration(200)
            .style('opacity', 1);
          tooltip.html(`
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 12px; color: var(--navBar-text-color); display: flex; align-items: center; gap: 8px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: ${this.getLayerColor(d.layer || 'Other')}"></div>
                ${d.name}
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: rgba(255,255,255,0.7);">Component</span>
              <span style="font-weight: 500; color: var(--navBar-text-color);">${d.componentName || 'N/A'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: rgba(255,255,255,0.7);">Layer</span>
              <span style="font-weight: 600; color: var(--navBar-text-color);">${d.layer || 'N/A'}</span>
            </div>
            <div style="height: 1px; background: rgba(255,255,255,0.15); margin: 12px 0;"></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: rgba(255,255,255,0.7);">Success Rate</span>
              <span style="font-weight: 500; color: var(--navBar-text-color);">${d.successRate ?? 'N/A'}%</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: rgba(255,255,255,0.7);">Latency</span>
              <span style="font-weight: 500; color: var(--navBar-text-color);">${d.latency ?? 'N/A'} ms</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: rgba(255,255,255,0.7);">Apdex</span>
              <span style="font-weight: 500; color: var(--navBar-text-color);">${d.apdex ?? 'N/A'}</span>
            </div>
          `)
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 28) + 'px');
        }
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', (event, d) => {
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    const outerRadius = this.nodeRadius;
    const innerRadius = this.nodeRadius * 0.8;
    const imageSize = this.nodeRadius;

    node.append('circle')
      .attr('r', outerRadius)
      .attr('fill', d => d.openAlertCount && d.openAlertCount > 0 ? '#ef4444' : this.getLayerColor(d.layer || 'Other'))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1);

    node.append('circle')
      .attr('r', innerRadius)
      .attr('fill', '#1f2d3d');

    node.append('image')
      .attr('xlink:href', d => {
        if (d.name === 'User') return 'assets/img/technologies/USER.png';
        const type = d.componentName ? d.componentName.toUpperCase() : 'UNDEFINED';
        return `assets/img/technologies/${type}.png`;
      })
      .attr('width', imageSize)
      .attr('height', imageSize)
      .attr('x', -imageSize / 2)
      .attr('y', -imageSize / 2)
      .on('error', function () {
        d3.select(this).attr('xlink:href', 'assets/img/technologies/UNDEFINED.png');
      });

    // Node labels (below nodes)
    const labels = container.selectAll('.node-label')
      .data(this.nodes)
      .enter().append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', labelColor)
      .style('pointer-events', 'none')
      .attr('x', d => d.x)
      .attr('y', d => d.y + this.nodeRadius + 10)
      .text(d => d.name);

    // Removed node metrics text below the label

    // Update all positions on simulation tick
    simulation.on('tick', () => {
      link.attr('d', d => `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`);
      node.attr('transform', d => `translate(${d.x}, ${d.y})`);
      labels.attr('x', d => d.x!).attr('y', d => d.y! + this.nodeRadius + 10);

      linkLabels
        .attr('x', d => (d.source.x! + d.target.x!) / 2)
        .attr('y', d => (d.source.y! + d.target.y!) / 2 - 5);
    });

    container.style('cursor', 'default');
    
    // Apply initial visibility
    this.updateGraphVisibility();
  }

  updateTooltip(node: any) {
    const serviceId = node.serviceId;
    const componentId = node.componentId;
    if (!serviceId || !componentId) {
      return Promise.reject('Missing serviceId or componentId in node');
    }
    return this.apmApiService.getCombinedDataTopology(serviceId, this.startTime, this.endTime, componentId)
      .pipe(
        map(apiResponse => {
          return {
            successRate: apiResponse.success_rate ?? null,
            serviceLoad: apiResponse.load ?? null,
            serviceLatency: apiResponse.latency ?? null,
          };
        }),
        catchError(error => {
          return throwError(() => new Error('Error fetching combined topology data'));
        })
      ).toPromise();
  }


  // TRACE

  copyTraceId(traceId: string | null, event: MouseEvent) {
    event.stopPropagation();
    if (!traceId) return;
    const textarea = document.createElement('textarea');
    textarea.value = traceId;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      this.snackBar.open('Trace ID copied!', '', {
        duration: 2000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom'
      });
    } catch (err) {
      console.error('Fallback: Could not copy text', err);
    }
    document.body.removeChild(textarea);

  }

  selectedCriteria: string | null = null;;
  dropdownOpen = false;

  criteriaList = [
    { key: 'instance', label: 'Instance' },
    { key: 'endpoint', label: 'Endpoint' },
    { key: 'status', label: 'Status' },
    { key: 'traceID', label: 'Trace ID' },
    { key: 'minDuration', label: 'Min Duration' },
    { key: 'maxDuration', label: 'Max Duration' },
    { key: 'statusCode', label: 'Status Code' },
    { key: 'tags', label: 'Tags' }
  ];

  shownCriteria: Record<string, boolean> = {
    instance: false,
    endpoint: false,
    status: false,
    traceID: false,
    minDuration: false,
    maxDuration: false,
    statusCode: false,
    tags: false
  };

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeDropdown() {
    setTimeout(() => {
      this.dropdownOpen = false;
    }, 150);
  }

  selectCriteria(key: string) {
    if (!this.shownCriteria[key]) {
      this.shownCriteria[key] = true;
    }
    this.searchTrace();
  }

  removeCriteria(criteriaKey: string) {
    this.shownCriteria[criteriaKey] = false;
    if (criteriaKey === 'instance') {
      this.instNameTrace = ''
      this.fetchInstances()
    };
    if (criteriaKey === 'endpoint') {
      this.endpointTrace = 'All';
      this.textEndpoint = '';
      this.fetchEndpoints()
    };
    if (criteriaKey === 'status') this.traceState = '';
    if (criteriaKey === 'traceID') this.traceIDTrace = '';
    if (criteriaKey === 'minDuration') this.minDuration = null;
    if (criteriaKey === 'maxDuration') this.maxDuration = null;
    if (criteriaKey === 'statusCode') this.statusCodeTrace = 'All';
    if (criteriaKey === 'tags') this.tagsTrace = '';
    this.searchTrace();
  }

  get allCriteriaSelected(): boolean {
    return this.criteriaList.every(c => this.shownCriteria[c.key]);
  }

  get availableCriteria() {
    return this.criteriaList.filter(c => !this.shownCriteria[c.key]);
  }

  get anyFilterActive(): boolean {
    return Object.values(this.shownCriteria).some(v => v === true);
  }

  decodeBase64(encoded: string): string {
    try {
      return atob(encoded);
    } catch (e) {
      return encoded;
    }
  }

  getStatusColorClass(isError: number): string {
    switch (isError) {
      case 1: return 'bg-danger';
      case 0: return 'bg-success';
      default: return 'bg-primary';
    }
  }

  // fetchInstances(): void {
  //   this.apmApiService.getServiceInstanceNames(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe(
  //     data => {
  //       const instanceArray = ([] as string[]).concat(...Object.values(data));
  //       this.instancesTraces = [{ name: 'All', value: 'All' }, ...instanceArray.map(instance => ({ name: instance, value: instance }))];
  //       this.instanceTraces = 'All';

  //       this.instancesLogs = [{ name: 'All', value: 'All' }, ...instanceArray.map(instance => ({ name: instance, value: instance }))];
  //       this.instanceLogs = 'All';
  //     },
  //     error => {
  //     }
  //   );
  // }

  fetchInstances(): void {
    this.apmApiService
      .getServiceInstanceNames(this.entityId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            console.error("Invalid service instance response structure:", data);
            return;
          }

          const values = Object.values(data);

          if (!values.length || !values.every(v => Array.isArray(v))) {
            console.error("Missing or invalid instance array values:", data);
            return;
          }

          const instanceArray = ([] as string[]).concat(...(values as string[][]));

          const invalidEntry = instanceArray.some(
            v => typeof v !== 'string' || !v.trim()
          );

          if (invalidEntry) {
            console.error(
              "Invalid entries found in instance list. Ignoring response:",
              data
            );
            return;
          }

          this.instancesTraces = [
            { name: 'All', value: 'All' },
            ...instanceArray.map(instance => ({ name: instance, value: instance }))
          ];
          this.instanceTraces = 'All';

          this.instancesLogs = [
            { name: 'All', value: 'All' },
            ...instanceArray.map(instance => ({ name: instance, value: instance }))
          ];
          this.instanceLogs = 'All';
        },

        error: (err) => {
          console.error("Failed to load service instance names:", err);
        }
      });
  }


  // fetchEndpoints(): void {
  //   this.apmApiService.getEndpoint(this.entityId!, this.startTime, this.endTime, -1, -1).pipe
  //     (switchMap(data => from(this.decoderService.decodeObject(data)))).pipe(takeUntil(this.destroy$)).subscribe(
  //       data => {
  //         const keys = Object.keys(data);
  //         const dynamicKey = keys.find(key => key !== 'total_hits');
  //         if (dynamicKey && data[dynamicKey]) {
  //           const endpointsArray = ([] as string[]).concat(...data[dynamicKey]);
  //           this.endpointsTraces = [{ name: 'All', value: 'All' }, ...endpointsArray.map(endpoint => ({ name: endpoint, value: endpoint }))];
  //           this.endpointTraces = 'All';

  //           this.endpointsLogs = [{ name: 'All', value: 'All' }, ...endpointsArray.map(endpoint => ({ name: endpoint, value: endpoint }))];
  //           this.endpointLogs = 'All';
  //         } else {
  //         }
  //       },
  //       error => {
  //       }
  //     );
  // }

  fetchEndpoints(): void {
    this.apmApiService
      .getEndpoint(this.entityId!, this.startTime, this.endTime, -1, -1)
      .pipe(
        switchMap(data => from(this.decoderService.decodeObject(data))),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            console.error("Invalid endpoint response structure:", data);
            return;
          }

          const keys = Object.keys(data);

          const dynamicKey = keys.find(key => key !== 'total_hits' && key !== 'error_count');

          if (!dynamicKey || !Array.isArray(data[dynamicKey])) {
            console.error("Missing or invalid endpoints array in response:", data);
            return;
          }

          const endpointsArray = ([] as string[]).concat(...data[dynamicKey]);

          const invalidEntry = endpointsArray.some(
            endpoint => typeof endpoint !== 'string' || !endpoint.trim()
          );

          if (invalidEntry) {
            console.error("Invalid endpoint entries found. Ignoring response:", data);
            return;
          }

          this.endpointsTraces = [
            { name: 'All', value: 'All' },
            ...endpointsArray.map(endpoint => ({ name: endpoint, value: endpoint }))
          ];
          this.endpointTraces = 'All';

          this.endpointsLogs = [
            { name: 'All', value: 'All' },
            ...endpointsArray.map(endpoint => ({ name: endpoint, value: endpoint }))
          ];
          this.endpointLogs = 'All';
        },

        error: (err) => {
          console.error("Failed to load endpoints:", err);
        }
      });
  }


  autoSearch(debounce = false): void {
    if (debounce) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.searchTrace();
      }, 400);
    } else {
      this.searchTrace();
    }
  }

  searchTrace(): void {
    this.currentPageTrace = 1;
    this.getTraceNames();
    this.getTraceSegmentsCount();
  }

  cancelCustomEndpoint(): void {
    this.textEndpoint = '';
    this.endpointTrace = 'All';
    this.searchTrace();
  }

  getTraceNames(): void {
    this.loadingTrace = true;
    const sdt = +this.startTime + "00";
    const edt = +this.endTime + "59";

    let instanceId = '';
    let endpointId = '';

    const endpointValue = this.textEndpoint?.trim()
      ? this.textEndpoint
      : this.endpointTrace;

    if (this.instNameTrace !== 'All') {
      instanceId = btoa(this.instNameTrace);
      instanceId = `${this.entityId}_${instanceId}`;
    } else {
      instanceId = this.entityId!;
    }

    if (endpointValue !== 'All') {
      endpointId = btoa(endpointValue);
      endpointId = `${this.entityId}_${endpointId}`;
    } else {
      endpointId = this.entityId!;
    }

    const params: {
      serviceId: string;
      st: number;
      et: number;
      page?: number;
      sortBy?: string;
      instanceId?: string;
      traceState?: number;
      endpointId?: string;
      traceId?: string;
      minTraceDuration?: number;
      maxTraceDuration?: number;
    } = {
      serviceId: this.entityId!,
      st: +sdt,
      et: +edt
    };

    if (instanceId !== this.entityId) {
      params.instanceId = instanceId;
    }

    if (endpointId !== this.entityId) {
      params.endpointId = endpointId;
    }

    if (this.traceState === 'success') {
      params.traceState = 0;
    } else if (this.traceState === 'error') {
      params.traceState = 1;
    }

    if (this.traceIDTrace) {
      params.traceId = this.traceIDTrace;
    }

    if (this.currentPageTrace) {
      params.page = this.currentPageTrace;
    }

    if (this.sortParameter) {
      params.sortBy = this.sortParameter;
    }

    if (this.minDuration) {
      params.minTraceDuration = this.minDuration;
    }

    if (this.maxDuration) {
      params.maxTraceDuration = this.maxDuration;
    }

    this.apmApiService.getTracesData(
      params.serviceId,
      params.st,
      params.et,
      params.page,
      params.sortBy,
      this.orderParameter,
      params.instanceId || undefined,
      params.traceState,
      params.endpointId || undefined,
      params.traceId || undefined,
      params.minTraceDuration || undefined,
      params.maxTraceDuration || undefined,
      undefined,
      this.statusCodeTrace === 'text' ? this.customStatusCodeTrace : this.statusCodeTrace,
      this.tagsList.length ? this.tagsList.join(',') : undefined
    ).pipe(
      switchMap(data => from(this.decoderService.decodeObject(data))),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data: any) => {

        if (!data || !Array.isArray(data)) {
          console.error("Invalid trace response structure:", data);
          this.loadingTrace = false;
          return;
        }

        const invalidEntry = data.some((item: any) =>
          !item.traceId ||
          typeof item.latency !== "number" ||
          item.latency < 0 ||
          !item.startTime ||
          !item.timeBucket
        );

        if (invalidEntry) {
          console.error("Invalid trace entries found. Ignoring response:", data);
          this.loadingTrace = false;
          return;
        }

        this.traceNames = data;

        if (this.traceNames.length > 0) {
          this.selectItem(this.traceNames[0]);
        }

        this.loadingTrace = false;
      },

      error: (err) => {
        console.error("Failed to load trace data:", err);
        this.loadingTrace = false;
      }
    });
  }

  private readonly TAG_REGEX = /^\s*\S+\s*=\s*\S+\s*$/;

  onTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.commitTag(this.tagsTrace.replace(/,$/, ''));
    }
    if (event.key === 'Backspace' && !this.tagsTrace && this.tagsList.length) {
      this.tagsList.pop();
      this.autoSearch(true);
    }
  }

  onTagBlur(): void {
    if (this.tagsTrace.trim()) this.commitTag(this.tagsTrace);
  }

  private commitTag(raw: string): void {
    const val = raw.trim();
    if (!val) return;
    if (!this.TAG_REGEX.test(val)) {
      this.tagValidationError = true;
      return;
    }
    this.tagValidationError = false;
    const normalized = val.replace(/\s*=\s*/, '=').trim();
    if (!this.tagsList.includes(normalized)) {
      this.tagsList.push(normalized);
    }
    this.tagsTrace = '';
    this.searchTrace();
  }

  removeTag(index: number): void {
    this.tagsList.splice(index, 1);
    this.searchTrace();
  }

  getTraceSegmentsCount(): void {
    // this.clearSelection();
    const sdt = +this.startTime + "00";
    const edt = +this.endTime + "59";
    let instanceId = '';
    let endpointId = '';
    const endpointValue = this.textEndpoint?.trim() ? this.textEndpoint : this.endpointTrace;

    if (this.instNameTrace !== 'All') {
      instanceId = btoa(this.instNameTrace);
      instanceId = `${this.entityId}_${instanceId}`;
    } else {
      instanceId = this.entityId!;
    }

    if (endpointValue !== 'All') {
      endpointId = btoa(endpointValue);
      endpointId = `${this.entityId}_${endpointId}`;
    } else {
      endpointId = this.entityId!;
    }

    let params: {
      serviceId: string;
      st: number;
      et: number;
      instanceId?: string;
      traceState?: number;
      endpointId?: string;
      traceId?: string;
      minTraceDuration?: number;
      maxTraceDuration?: number;
    } = {
      serviceId: this.entityId!,
      st: +sdt,
      et: +edt
    };

    if (instanceId !== this.entityId) {
      params.instanceId = instanceId;
    }
    if (endpointId !== this.entityId) {
      params.endpointId = endpointId;
    }
    if (this.traceState === 'success') {
      params.traceState = 0;
    } else if (this.traceState === 'error') {
      params.traceState = 1;
    }
    if (this.traceIDTrace) {
      params.traceId = this.traceIDTrace;
    }
    if (this.minDuration) {
      params.minTraceDuration = this.minDuration;
    }
    if (this.maxDuration) {
      params.maxTraceDuration = this.maxDuration;
    }

    this.apmApiService
      .getTraceSegmentsCount(
        params.serviceId,
        params.st,
        params.et,
        params.instanceId || undefined,
        params.traceState,
        params.endpointId || undefined,
        params.traceId || undefined,
        params.minTraceDuration || undefined,
        params.maxTraceDuration || undefined,
        this.statusCodeTrace === 'text' ? this.customStatusCodeTrace : this.statusCodeTrace,
        this.tagsList.length ? this.tagsList.join(',') : undefined
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (typeof data !== "number") {
            console.error("Invalid trace segments count response structure:", data);
            return;
          }

          if (data < 0) {
            console.error("Negative trace segments count found. Ignoring response:", data);
            return;
          }
          this.totalHitsTrace = data;
          this.calculateTracePagination();
        },

        error: (err) => {
          console.error("Failed to load trace segments count:", err);
        }
      });
  }


  calculateTracePagination(): void {
    this.totalPagesTrace = Math.ceil(this.totalHitsTrace / this.rowsPerPageTrace);
  }

  previousTracePage(): void {
    if (this.currentPageTrace > 1) {
      this.currentPageTrace--;
      this.getTraceNames();
    }
  }

  nextTracePage(): void {
    if (this.currentPageTrace < this.totalPagesTrace) {
      this.currentPageTrace++;
      this.getTraceNames();
    }
  }

  goToTracePage(page: number): void {
    this.currentPageTrace = page;
    this.getTraceNames();
  }

  get traceItemRange(): string {
    if (this.totalHitsTrace === 0) return '0/0';
    const start = (this.currentPageTrace - 1) * this.rowsPerPageTrace + 1;
    const end = Math.min(this.currentPageTrace * this.rowsPerPageTrace, this.totalHitsTrace);
    return `${end}/${this.totalHitsTrace}`;
  }

  get totalTracePagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];

    if (this.totalPagesTrace <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPagesTrace }, (_, i) => i + 1);
    } else {
      if (this.currentPageTrace <= visiblePages) {
        pages = [
          ...Array.from({ length: visiblePages }, (_, i) => i + 1),
          '...',
          this.totalPagesTrace
        ];
      } else if (this.currentPageTrace >= this.totalPagesTrace - visiblePages + 1) {
        pages = [
          1,
          '...',
          ...Array.from(
            { length: visiblePages },
            (_, i) => this.totalPagesTrace - visiblePages + i + 1
          )
        ];
      } else {
        pages = [
          1,
          '...',
          this.currentPageTrace - 1,
          this.currentPageTrace,
          this.currentPageTrace + 1,
          '...',
          this.totalPagesTrace
        ];
      }
    }
    return pages;
  }

  clearSelection(): void {
    this.selectedItem = null;
    this.selectedTraceId = null;
    this.hierarchicalList = [];
    this.traceMetaData = [];
    this.traceData = [];
    // this.showModal = false;
  }

  selectItem(item: any): void {
    if (item) {
      this.clearSelection();
      this.selectedItem = this.decodeBase64(item.endpointId);
      this.selectedTraceId = item.traceId;
      this.selectedView = "table"
      this.fetchTraceDataList(item.traceId);
    } else {
      this.clearSelection();
    }
  }

  fetchTraceDataList(traceId: string): void {
    this.apmApiService.getTraceMetaData(traceId).pipe(takeUntil(this.destroy$)).pipe(takeUntil(this.destroy$)).subscribe(
      (response: any) => {
        const spans = response || [];
        this.traceMetaData = response || [];
        this.traceData = JSON.parse(JSON.stringify(spans));
        this.hierarchicalList = this.buildHierarchicalList(spans);
      },
      error => {
        console.error("Error Occured!");
      }
    );
  }

  buildHierarchicalList(spans: any[]): any[] {
    const spanMap = new Map<string, any>();
    const root: any[] = [];

    spans.forEach(span => {
      span.spanId = span.segmentId + span.spanId;
      if (span.parentSpanId === -1 && span.refs && span.refs.length > 0) {
        const ref = span.refs[0];
        span.parentSpanId = ref.parentSegmentId + ref.parentSpanId;
      } else {
        span.parentSpanId = span.segmentId + span.parentSpanId;
      }
      span.children = [];
      spanMap.set(span.spanId, span);
    });

    spanMap.forEach(span => {
      if (span.parentSpanId === `${span.segmentId}-1`) {
        root.push(span);
      } else {
        const parent = spanMap.get(span.parentSpanId);
        if (parent) {
          parent.children.push(span);
        }
      }
    });

    const hierarchicalList: any[] = [];

    function flatten(span: any, level: number) {
      hierarchicalList.push({ ...span, level });
      span.children.forEach((child: any) => flatten(child, level + 1));
    }
    root.forEach(span => flatten(span, 0));
    return hierarchicalList;
  }

  openLogTabTraceId(selectedTraceId: any): void {
    const logTab = document.querySelector('.nav-link[href="#log"]') as HTMLElement;
    if (logTab) {
      logTab.click();
    }
    this.traceIDLogs = selectedTraceId;
    this.loadData('log');
    this.selectCriteriaLogs('traceID');
  }

  changeView(view: 'table' | 'list' | 'tree' | 'stat') {
    this.selectedView = view;
  }

  onTableRowSelected(row: any): void {
    this.openModal(row);
  }

  onListItemSelected(item: any): void {
    this.openModal(item);
  }

  openModal(item: Span): void {
    this.modalData = {
      serviceCode: item.serviceCode,
      serviceInstanceName: item.serviceInstanceName,
      endpointName: item.endpointName,
      type: item.type,
      component: item.component,
      peer: item.peer,
      isError: item.isError,
      tags: item.tags,
      logs: item.logs
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.modalData = null;
    this.showModal = false;
  }

  // LOGS

  openTraceTabWithTraceId(selectedTraceId: any): void {
    const logTab = document.querySelector('.nav-link[href="#trace"]') as HTMLElement;
    if (logTab) {
      logTab.click();
    }
    this.traceIDTrace = selectedTraceId;
    // this.searchTrace();
    this.loadData('trace')
    this.selectCriteria('traceID');
  }

  selectedCriteriaLogs: string | null = null;;
  dropdownOpenLogs = false;
  selectedRowIndex: number | null = null;

  criteriaListLogs = [
    { key: 'instance', label: 'Instance' },
    { key: 'endpoint', label: 'Endpoint' },
    { key: 'traceID', label: 'Trace ID' },
    { key: 'tags', label: 'Status' },
    { key: 'incContent', label: 'Inc Content' },
    { key: 'excContent', label: 'Exc Content' }
  ];

  shownCriteriaLogs: Record<string, boolean> = {
    instance: false,
    endpoint: false,
    traceID: false,
    tags: false,
    incContent: false,
    excContent: false
  };

  toggleRowSelection(index: number) {
    if (this.selectedRowIndex === index) {
      this.selectedRowIndex = null; // deselect if already selected
    } else {
      this.selectedRowIndex = index; // select new row
    }
  }

  toggleDropdownLogs() {
    this.dropdownOpenLogs = !this.dropdownOpenLogs;
  }

  closeDropdownLogs() {
    setTimeout(() => {
      this.dropdownOpenLogs = false;
    }, 150);
  }

  selectCriteriaLogs(key: string) {
    if (!this.shownCriteriaLogs[key]) {
      this.shownCriteriaLogs[key] = true;
    }
  }

  removeCriteriaLogs(criteriaKey: string) {
    this.shownCriteriaLogs[criteriaKey] = false;
    if (criteriaKey === 'instance') {
      this.instNameLogs = ''
      this.fetchInstances()
    };
    if (criteriaKey === 'endpoint') {
      this.endpointLog = '';
      this.fetchEndpoints()
    };
    if (criteriaKey === 'traceID') this.traceIDLogs = '';
    if (criteriaKey === 'tags') this.tags = '';
    if (criteriaKey === 'incContent') this.keywordsOfContent = '';
    if (criteriaKey === 'excContent') this.excludingKeywordsOfContent = '';
  }

  get allCriteriaSelectedLogs(): boolean {
    return this.criteriaListLogs.every(c => this.shownCriteriaLogs[c.key]);
  }

  get availableCriteriaLogs() {
    return this.criteriaListLogs.filter(c => !this.shownCriteriaLogs[c.key]);
  }

  get anyFilterActiveLogs(): boolean {
    return Object.values(this.shownCriteriaLogs).some(v => v === true);
  }

  formatDate1(timeBucket: any): string {
    if (!timeBucket) return '';

    const str = String(timeBucket).trim();
    if (![12, 14].includes(str.length) || !/^\d+$/.test(str)) return '';

    const year = Number(str.substring(0, 4));
    const month = Number(str.substring(4, 6)) - 1;
    const day = Number(str.substring(6, 8));
    const hour = Number(str.substring(8, 10));
    const minute = Number(str.substring(10, 12));
    const second = str.length === 14 ? Number(str.substring(12, 14)) : 0;

    const date = new Date(year, month, day, hour, minute, second);

    const pad = (n: number) => (n < 10 ? '0' + n : n);

    return `${year}-${pad(month + 1)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
  }

  searchLogs(): void {
    this.currentPageLog = 1;
    this.getLogNames();
    this.getLogsAggregatedData();
    this.getLogsCountTimeSeries();
    this.getLogsAggregatedData2();
    this.selectedLevels = [];
  }

  searchLogs2(): void {
    this.currentPageLog = 1;
    this.getLogNames();
    this.getLogsAggregatedData();
    this.getLogsCountTimeSeries();
  }

  formatEndpointId(endpointId: string): string {
    if (!endpointId) return '';
    if (/^[A-Za-z0-9+/=]+$/.test(endpointId) && endpointId.length % 4 === 0) {
      try {
        const decoded = atob(endpointId);
        endpointId = decoded;
      } catch (err) {
        console.warn('Base64 decode failed:', err);
      }
    }
    const [method] = endpointId.split(':', 2);
    const m = method?.toUpperCase();
    const httpMethods = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);
    if (httpMethods.has(m)) {
      return m;
    }
    return '';
  }

  getLevelColor(level: string | undefined): string {
    if (!level) return 'text-secondary';
    switch (level.toUpperCase()) {
      case 'INFO': return 'text-primary';
      case 'ERROR': return 'text-danger';
      case 'DEBUG': return 'text-secondary';
      case 'WARN': return 'text-warning';
      case 'WARNING': return 'text-warning';
      case 'TRACE': return 'text-primary-emphasis';
      case 'NOTICE': return 'text-notice';
      case 'CRITICAL': return 'text-danger';
      case 'ALERT': return 'text-alert';
      case 'EMERGENCY': return 'text-emergency';
      default: return 'text-secondary';
    }
  }

  // getLogsAggregatedData(): void {
  //   const sdt = this.startTime + "00";
  //   const edt = this.endTime + "59";
  //   let instanceId = '';
  //   let endpointId = '';
  //   if (this.instNameLogs !== 'All') {
  //     instanceId = btoa(this.instNameLogs);
  //     instanceId = `${this.entityId}_${instanceId}`;
  //   } else {
  //     instanceId = this.entityId!;
  //   }
  //   if (this.endpointLog !== 'All') {
  //     endpointId = btoa(this.endpointLog);
  //     endpointId = `${this.entityId}_${endpointId}`;
  //   } else {
  //     endpointId = this.entityId!;
  //   }
  //   let params: {
  //     serviceId: string;
  //     st: number;
  //     et: number;
  //     instanceId?: string;
  //     endpointId?: string;
  //     traceId?: string;
  //     tags?: string;
  //     excludingKeywordsOfContent?: string;
  //     keywordsOfContent?: string;
  //   } = {
  //     serviceId: this.entityId!,
  //     st: +sdt,
  //     et: +edt
  //   };
  //   if (instanceId !== this.entityId) {
  //     params.instanceId = instanceId;
  //   }
  //   if (endpointId !== this.entityId) {
  //     params.endpointId = endpointId;
  //   }
  //   if (this.traceIDLogs) {
  //     params.traceId = this.traceIDLogs;
  //   }
  //   if (this.tags) {
  //     params.tags = this.tags;
  //   }
  //   if (this.excludingKeywordsOfContent) {
  //     params.excludingKeywordsOfContent = this.excludingKeywordsOfContent;
  //   }
  //   if (this.keywordsOfContent) {
  //     params.keywordsOfContent = this.keywordsOfContent;
  //   }
  //   this.apmApiService.getLogsAggregatedData(
  //     params.serviceId,
  //     params.st,
  //     params.et,
  //     params.instanceId,
  //     params.endpointId,
  //     params.traceId,
  //     params.tags,
  //     params.excludingKeywordsOfContent,
  //     params.keywordsOfContent
  //   ).pipe(takeUntil(this.destroy$)
  //   ).subscribe((data: any) => {
  //     this.totalHitsLog = data.total_hits || 0;
  //     this.totalPagesLog = Math.ceil(this.totalHitsLog / this.rowsPerPageLog);
  //   });
  // }

  getLogsAggregatedData(): void {
    const sdt = this.startTime + "00";
    const edt = this.endTime + "59";

    let instanceId = '';
    let endpointId = '';

    if (this.instNameLogs !== 'All') {
      instanceId = btoa(this.instNameLogs);
      instanceId = `${this.entityId}_${instanceId}`;
    } else {
      instanceId = this.entityId!;
    }

    if (this.endpointLog !== 'All') {
      endpointId = btoa(this.endpointLog);
      endpointId = `${this.entityId}_${endpointId}`;
    } else {
      endpointId = this.entityId!;
    }

    let params: {
      serviceId: string;
      st: number;
      et: number;
      instanceId?: string;
      endpointId?: string;
      traceId?: string;
      tags?: string;
      excludingKeywordsOfContent?: string;
      keywordsOfContent?: string;
    } = {
      serviceId: this.entityId!,
      st: +sdt,
      et: +edt
    };

    if (instanceId !== this.entityId) {
      params.instanceId = instanceId;
    }
    if (endpointId !== this.entityId) {
      params.endpointId = endpointId;
    }
    if (this.traceIDLogs) {
      params.traceId = this.traceIDLogs;
    }
    if (this.tags) {
      params.tags = this.tags;
    }
    if (this.excludingKeywordsOfContent) {
      params.excludingKeywordsOfContent = this.excludingKeywordsOfContent;
    }
    if (this.keywordsOfContent) {
      params.keywordsOfContent = this.keywordsOfContent;
    }

    this.apmApiService
      .getLogsAggregatedData(
        params.serviceId,
        params.st,
        params.et,
        params.instanceId,
        params.endpointId,
        params.traceId,
        params.tags,
        params.excludingKeywordsOfContent,
        params.keywordsOfContent
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid logs aggregated response structure:", data);
            return;
          }

          if (
            typeof data.total_hits !== "number" ||
            data.total_hits < 0
          ) {
            console.error("Invalid or negative 'total_hits' in logs aggregated response:", data);
            return;
          }

          const invalidCount = Object.entries(data).some(
            ([key, value]) =>
              key !== "total_hits" &&
              typeof value === "number" &&
              value < 0
          );

          if (invalidCount) {
            console.error("Negative log level counts found. Ignoring response:", data);
            return;
          }
          this.totalHitsLog = data.total_hits || 0;
          this.totalPagesLog = Math.ceil(
            this.totalHitsLog / this.rowsPerPageLog
          );
        },

        error: (err) => {
          console.error("Failed to load logs aggregated data:", err);
        }
      });
  }


  // getLogsAggregatedData2(): void {
  //   const sdt = this.startTime + "00";
  //   const edt = this.endTime + "59";
  //   let instanceId = '';
  //   let endpointId = '';
  //   if (this.instNameLogs !== 'All') {
  //     instanceId = btoa(this.instNameLogs);
  //     instanceId = `${this.entityId}_${instanceId}`;
  //   } else {
  //     instanceId = this.entityId!;
  //   }
  //   if (this.endpointLog !== 'All') {
  //     endpointId = btoa(this.endpointLog);
  //     endpointId = `${this.entityId}_${endpointId}`;
  //   } else {
  //     endpointId = this.entityId!;
  //   }
  //   let params: {
  //     serviceId: string;
  //     st: number;
  //     et: number;
  //     instanceId?: string;
  //     endpointId?: string;
  //     traceId?: string;
  //     tags?: string;
  //     excludingKeywordsOfContent?: string;
  //     keywordsOfContent?: string;
  //   } = {
  //     serviceId: this.entityId!,
  //     st: +sdt,
  //     et: +edt
  //   };
  //   if (instanceId !== this.entityId) {
  //     params.instanceId = instanceId;
  //   }
  //   if (endpointId !== this.entityId) {
  //     params.endpointId = endpointId;
  //   }
  //   if (this.traceIDLogs) {
  //     params.traceId = this.traceIDLogs;
  //   }
  //   if (this.tags) {
  //     params.tags = this.tags;
  //   }
  //   if (this.excludingKeywordsOfContent) {
  //     params.excludingKeywordsOfContent = this.excludingKeywordsOfContent;
  //   }
  //   if (this.keywordsOfContent) {
  //     params.keywordsOfContent = this.keywordsOfContent;
  //   }
  //   this.apmApiService.getLogsAggregatedData(
  //     params.serviceId,
  //     params.st,
  //     params.et,
  //     params.instanceId,
  //     params.endpointId,
  //     params.traceId,
  //     params.tags,
  //     params.excludingKeywordsOfContent,
  //     params.keywordsOfContent
  //   ).pipe(takeUntil(this.destroy$)
  //   ).subscribe((data: any) => {
  //     this.logStats = data
  //   });
  // }

  getLogsAggregatedData2(): void {
    const sdt = this.startTime + "00";
    const edt = this.endTime + "59";
    let instanceId = '';
    let endpointId = '';

    if (this.instNameLogs !== 'All') {
      instanceId = btoa(this.instNameLogs);
      instanceId = `${this.entityId}_${instanceId}`;
    } else {
      instanceId = this.entityId!;
    }

    if (this.endpointLog !== 'All') {
      endpointId = btoa(this.endpointLog);
      endpointId = `${this.entityId}_${endpointId}`;
    } else {
      endpointId = this.entityId!;
    }

    let params: {
      serviceId: string;
      st: number;
      et: number;
      instanceId?: string;
      endpointId?: string;
      traceId?: string;
      tags?: string;
      excludingKeywordsOfContent?: string;
      keywordsOfContent?: string;
    } = {
      serviceId: this.entityId!,
      st: +sdt,
      et: +edt
    };

    if (instanceId !== this.entityId) {
      params.instanceId = instanceId;
    }
    if (endpointId !== this.entityId) {
      params.endpointId = endpointId;
    }
    if (this.traceIDLogs) {
      params.traceId = this.traceIDLogs;
    }
    if (this.tags) {
      params.tags = this.tags;
    }
    if (this.excludingKeywordsOfContent) {
      params.excludingKeywordsOfContent = this.excludingKeywordsOfContent;
    }
    if (this.keywordsOfContent) {
      params.keywordsOfContent = this.keywordsOfContent;
    }

    this.apmApiService.getLogsAggregatedData(
      params.serviceId,
      params.st,
      params.et,
      params.instanceId,
      params.endpointId,
      params.traceId,
      params.tags,
      params.excludingKeywordsOfContent,
      params.keywordsOfContent
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            console.error("Invalid logs aggregated response structure:", data);
            return;
          }

          if (typeof data.total_hits !== 'number') {
            console.error("Missing or invalid 'total_hits' in logs aggregated response:", data);
            return;
          }

          const hasNegative = Object.entries(data).some(
            ([key, value]) =>
              key !== 'total_hits' &&
              typeof value === 'number' &&
              value < 0
          );

          if (hasNegative || data.total_hits < 0) {
            console.error("Negative values found in logs aggregated response. Ignoring response:", data);
            return;
          }

          this.logStats = data;
        },

        error: (err) => {
          console.error("Failed to load logs aggregated data:", err);
        }
      });
  }


  getLogKeys(): string[] {
    if (!this.logStats) return [];
    return Object.keys(this.logStats).filter(key => key !== 'total_hits');
  }

  selectedLevels: string[] = [];

  toggleSelection(level: string): void {
    const index = this.selectedLevels.indexOf(level);
    if (index === -1) {
      this.selectedLevels.push(level);
    } else {
      this.selectedLevels.splice(index, 1);
    }
    this.tags = this.selectedLevels.join(',');
    // this.selectCriteriaLogs('tags');
    this.searchLogs2();
  }


  isSelected(level: string): boolean {
    return this.selectedLevels.includes(level);
  }

  getSelectedAsString(): string {
    return this.selectedLevels.join(', ');
  }

  getBtnColor(level: string | undefined): string {
    if (!level) return 'logs-secondary';
    switch (level.toUpperCase()) {
      case 'INFO': return 'logs-info';
      case 'ERROR': return 'logs-error';
      case 'DEBUG': return 'logs-debug';
      case 'WARN': return 'logs-warn';
      case 'WARNING': return 'logs-warn';
      case 'TRACE': return 'logs-trace';
      case 'CRITICAL': return 'logs-error';
      case 'ALERT': return 'logs-alert';
      case 'EMERGENCY': return 'logs-emergency';
      case 'NOTICE': return 'logs-success'
      default: return 'logs-secondary';
    }
  }

  getSelectedBtnColor(level: string | undefined): string {
    if (!level) return 'logs-secondary-selected';
    switch (level.toUpperCase()) {
      case 'INFO': return 'logs-info-selected';
      case 'ERROR': return 'logs-error-selected';
      case 'DEBUG': return 'logs-debug-selected';
      case 'WARN': return 'logs-warn-selected';
      case 'WARNING': return 'logs-warn-selected';
      case 'TRACE': return 'logs-trace-selected';
      case 'CRITICAL': return 'logs-error-selected';
      case 'ALERT': return 'logs-alert-selected';
      case 'EMERGENCY': return 'logs-emergency-selected';
      case 'NOTICE': return 'logs-success-selected'
      default: return 'logs-secondary-selected';
    }
  }

  // getLogNames(): void {
  //   this.loadingLogs = true;
  //   const sdt = this.startTime + "00";
  //   const edt = this.endTime + "59";
  //   let instanceId = '';
  //   let endpointId = '';
  //   if (this.instNameLogs !== 'All') {
  //     instanceId = btoa(this.instNameLogs);
  //     instanceId = `${this.entityId}_${instanceId}`;
  //   } else {
  //     instanceId = this.entityId!;
  //   }
  //   if (this.endpointLog !== 'All') {
  //     endpointId = btoa(this.endpointLog);
  //     endpointId = `${this.entityId}_${endpointId}`;
  //   } else {
  //     endpointId = this.entityId!;
  //   }
  //   let params: {
  //     serviceId: string;
  //     st: number;
  //     et: number;
  //     instanceId?: string;
  //     endpointId?: string;
  //     traceId?: string;
  //     tags?: string;
  //     excludingKeywordsOfContent?: string;
  //     keywordsOfContent?: string;
  //     sort?: boolean
  //   } = {
  //     serviceId: this.entityId!,
  //     st: +sdt,
  //     et: +edt
  //   };
  //   if (instanceId !== this.entityId) {
  //     params.instanceId = instanceId;
  //   }
  //   if (endpointId !== this.entityId) {
  //     params.endpointId = endpointId;
  //   }
  //   if (this.traceIDLogs) {
  //     params.traceId = this.traceIDLogs;
  //   }
  //   if (this.tags) {
  //     params.tags = this.tags;
  //   }
  //   if (this.excludingKeywordsOfContent) {
  //     params.excludingKeywordsOfContent = this.excludingKeywordsOfContent;
  //   }
  //   if (this.keywordsOfContent) {
  //     params.keywordsOfContent = this.keywordsOfContent;
  //   }
  //   if (this.sortLogs) {
  //     params.sort = this.sortLogs;
  //   }
  //   this.apmApiService.getLogsData(
  //     params.serviceId,
  //     params.st,
  //     params.et,
  //     this.currentPageLog,
  //     this.rowsPerPageLog,
  //     params.instanceId,
  //     params.endpointId,
  //     params.traceId,
  //     params.tags,
  //     params.excludingKeywordsOfContent,
  //     params.keywordsOfContent,
  //     params.sort
  //   ).pipe(
  //     switchMap(data => from(this.decoderService.decodeObject(data))),
  //     takeUntil(this.destroy$),
  //     finalize(() => this.loadingLogs = false)
  //   ).subscribe((decodedData: any) => {
  //     this.logNames = decodedData
  //   });
  // }

  getLogNames(): void {
    this.loadingLogs = true;

    const sdt = this.startTime + "00";
    const edt = this.endTime + "59";

    let instanceId = '';
    let endpointId = '';

    if (this.instNameLogs !== 'All') {
      instanceId = btoa(this.instNameLogs);
      instanceId = `${this.entityId}_${instanceId}`;
    } else {
      instanceId = this.entityId!;
    }

    if (this.endpointLog !== 'All') {
      endpointId = btoa(this.endpointLog);
      endpointId = `${this.entityId}_${endpointId}`;
    } else {
      endpointId = this.entityId!;
    }

    let params: {
      serviceId: string;
      st: number;
      et: number;
      instanceId?: string;
      endpointId?: string;
      traceId?: string;
      tags?: string;
      excludingKeywordsOfContent?: string;
      keywordsOfContent?: string;
      sort?: boolean;
    } = {
      serviceId: this.entityId!,
      st: +sdt,
      et: +edt
    };

    if (instanceId !== this.entityId) {
      params.instanceId = instanceId;
    }
    if (endpointId !== this.entityId) {
      params.endpointId = endpointId;
    }
    if (this.traceIDLogs) {
      params.traceId = this.traceIDLogs;
    }
    if (this.tags) {
      params.tags = this.tags;
    }
    if (this.excludingKeywordsOfContent) {
      params.excludingKeywordsOfContent = this.excludingKeywordsOfContent;
    }
    if (this.keywordsOfContent) {
      params.keywordsOfContent = this.keywordsOfContent;
    }
    if (this.sortLogs) {
      params.sort = this.sortLogs;
    }

    this.apmApiService.getLogsData(
      params.serviceId,
      params.st,
      params.et,
      this.currentPageLog,
      this.rowsPerPageLog,
      params.instanceId,
      params.endpointId,
      params.traceId,
      params.tags,
      params.excludingKeywordsOfContent,
      params.keywordsOfContent,
      params.sort
    ).pipe(
      switchMap(data => from(this.decoderService.decodeObject(data))),
      takeUntil(this.destroy$),
      finalize(() => this.loadingLogs = false)
    ).subscribe({
      next: (decodedData: any) => {

        if (!decodedData || !Array.isArray(decodedData)) {
          console.error("Invalid logs response structure:", decodedData);
          return;
        }

        this.logNames = decodedData;
      },

      error: (err) => {
        console.error("Failed to load logs data:", err);
      }
    });
  }


  toggleSortLogs(): void {
    this.sortLogs = !this.sortLogs
    this.getLogNames();
  }

  calculateLogPagination(): void {
    this.totalPagesLog = Math.ceil(this.totalHitsLog / this.rowsPerPageLog);
  }

  previousLogPage(): void {
    if (this.currentPageLog > 1) {
      this.currentPageLog--;
      this.getLogNames();
    }
  }

  nextLogPage(): void {
    if (this.currentPageLog < this.totalPagesLog) {
      this.currentPageLog++;
      this.getLogNames();
    }
  }

  goToLogPage(page: number): void {
    this.currentPageLog = page;
    this.getLogNames();
  }

  get logItemRange(): string {
    if (this.totalHitsLog === 0) return '0/0';
    const start = (this.currentPageLog - 1) * this.rowsPerPageLog + 1;
    const end = Math.min(this.currentPageLog * this.rowsPerPageLog, this.totalHitsLog);
    return `${end}/${this.totalHitsLog}`;
  }

  get totalLogPagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];

    if (this.totalPagesLog <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPagesLog }, (_, i) => i + 1);
    } else {
      if (this.currentPageLog <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPagesLog];
      } else if (this.currentPageLog >= this.totalPagesLog - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPagesLog - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPageLog - 1, this.currentPageLog, this.currentPageLog + 1, '...', this.totalPagesLog];
      }
    }
    return pages;
  }

  // getLogsCountTimeSeries(): void {
  //   const sdt = this.startTime;
  //   const edt = this.endTime;
  //   let instanceId = '';
  //   let endpointId = '';
  //   if (this.instNameLogs !== 'All') {
  //     instanceId = btoa(this.instNameLogs);
  //     instanceId = `${this.entityId}_${instanceId}`;
  //   } else {
  //     instanceId = this.entityId!;
  //   }
  //   if (this.endpointLog !== 'All') {
  //     endpointId = btoa(this.endpointLog);
  //     endpointId = `${this.entityId}_${endpointId}`;
  //   } else {
  //     endpointId = this.entityId!;
  //   }
  //   let params: {
  //     serviceId: string;
  //     st: number;
  //     et: number;
  //     instanceId?: string;
  //     endpointId?: string;
  //     traceId?: string;
  //     tags?: string;
  //     excludingKeywordsOfContent?: string;
  //     keywordsOfContent?: string;
  //   } = {
  //     serviceId: this.entityId!,
  //     st: +sdt,
  //     et: +edt
  //   };
  //   if (instanceId !== this.entityId) {
  //     params.instanceId = instanceId;
  //   }
  //   if (endpointId !== this.entityId) {
  //     params.endpointId = endpointId;
  //   }
  //   if (this.traceIDLogs) {
  //     params.traceId = this.traceIDLogs;
  //   }
  //   if (this.tags) {
  //     params.tags = this.tags;
  //   }
  //   if (this.excludingKeywordsOfContent) {
  //     params.excludingKeywordsOfContent = this.excludingKeywordsOfContent;
  //   }
  //   if (this.keywordsOfContent) {
  //     params.keywordsOfContent = this.keywordsOfContent;
  //   }
  //   this.apmApiService.getLogsCountTimeSeries(
  //     params.serviceId,
  //     params.st,
  //     params.et,
  //     params.instanceId,
  //     params.endpointId,
  //     params.traceId,
  //     params.tags,
  //     params.excludingKeywordsOfContent,
  //     params.keywordsOfContent
  //   ).pipe(takeUntil(this.destroy$)
  //   ).subscribe((data: any) => {
  //     this.getLogsCountTimeSeriesChart(data.time_series)
  //   });
  // }

  getLogsCountTimeSeries(): void {
    const sdt = this.startTime;
    const edt = this.endTime;
    let instanceId = '';
    let endpointId = '';

    if (this.instNameLogs !== 'All') {
      instanceId = btoa(this.instNameLogs);
      instanceId = `${this.entityId}_${instanceId}`;
    } else {
      instanceId = this.entityId!;
    }

    if (this.endpointLog !== 'All') {
      endpointId = btoa(this.endpointLog);
      endpointId = `${this.entityId}_${endpointId}`;
    } else {
      endpointId = this.entityId!;
    }

    let params: {
      serviceId: string;
      st: number;
      et: number;
      instanceId?: string;
      endpointId?: string;
      traceId?: string;
      tags?: string;
      excludingKeywordsOfContent?: string;
      keywordsOfContent?: string;
    } = {
      serviceId: this.entityId!,
      st: +sdt,
      et: +edt
    };

    if (instanceId !== this.entityId) {
      params.instanceId = instanceId;
    }
    if (endpointId !== this.entityId) {
      params.endpointId = endpointId;
    }
    if (this.traceIDLogs) {
      params.traceId = this.traceIDLogs;
    }
    if (this.tags) {
      params.tags = this.tags;
    }
    if (this.excludingKeywordsOfContent) {
      params.excludingKeywordsOfContent = this.excludingKeywordsOfContent;
    }
    if (this.keywordsOfContent) {
      params.keywordsOfContent = this.keywordsOfContent;
    }

    this.apmApiService
      .getLogsCountTimeSeries(
        params.serviceId,
        params.st,
        params.et,
        params.instanceId,
        params.endpointId,
        params.traceId,
        params.tags,
        params.excludingKeywordsOfContent,
        params.keywordsOfContent
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            console.error("Invalid logs count response structure:", data);
            return;
          }

          if (!Array.isArray(data.time_series)) {
            console.error("Missing or invalid 'time_series' in logs count response:", data);
            return;
          }

          const invalidEntry = data.time_series.some((item: any) =>
            typeof item.total !== 'number' ||
            item.total < 0 ||
            !item.time_bucket
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative log count entries found. Ignoring response:",
              data
            );
            return;
          }

          this.getLogsCountTimeSeriesChart(data.time_series);
        },

        error: (err) => {
          console.error("Failed to load logs count time series:", err);
        }
      });
  }


  getLogsCountTimeSeriesChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );
      if (keys.length === 0) {
        this.logsTimeSeriesChart = null;
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      // Assign colors to log levels
      const levelColors: Record<string, string> = {
        ERROR: '#ff0000',
        WARN: '#ffdd77ff',
        WARNING: '#ffdd77ff',
        INFO: '#4C9AFF',
        DEBUG: '#6c757d',
        TRACE: '#17a2b8',
        NOTICE: '#4ca746',
        ALERT: '#dc8e35',
        CRITICAL: '#a00010ff',
        EMERGENCY: '#9135dc',
      };

      const series: Highcharts.SeriesColumnOptions[] = keys.map(key => ({
        name: key,
        data: data.map(d => Number(d[key])),
        type: 'column',
        color: levelColors[key] || '#888888',
        marker: { radius: 2 },
        lineWidth: 1
      }));

      this.logsTimeSeriesChart = {
        chart: {
          type: 'column',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' }, y: 10, },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        plotOptions: {
          column: {
            maxPointWidth: 10,
            grouping: true,
            borderWidth: 0
          }
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            let tooltip = `<b>${this.points?.[0]?.category}</b><br/>`;
            // show total from data
            const total = (this.points && this.points[0]?.total) || 0;
            tooltip += `<b>Total: ${total}</b><br/>`;

            this.points?.forEach(p => {
              tooltip += `<span style="color:${p.color}">\u25CF</span> ${p.series.name}: <b>${p.y}</b><br/>`;
            });

            return tooltip;
          }
        },
        // legend: { enabled: true },
        legend: {
          enabled: true,
          align: 'center',
          verticalAlign: 'bottom',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '9px'
          },
          symbolWidth: 10,
          itemMarginTop: 0,
          itemMarginBottom: 2,
          itemDistance: 4,
          padding: 0,
          y: 0,
        },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  expandedLogIndex: number | null = null;

  toggleDetailApp(index: number): void {
    if (this.expandedLogIndex === index) {
      this.expandedLogIndex = null;
    } else {
      this.expandedLogIndex = index;
    }
  }

  toggleSort(column: 'start_time' | 'duration' | 'isError') {
    if (this.sortParameter === column) {
      this.orderParameter = this.orderParameter === 'asc' ? 'dec' : 'asc';
    } else {
      this.sortParameter = column;
      this.orderParameter = 'asc';
    }
    this.getTraceNames();
  }


  // DATABASE

  copyDbStatement(dbStatement: string | null, event: MouseEvent) {
    event.stopPropagation();
    if (!dbStatement) return;
    const textarea = document.createElement('textarea');
    textarea.value = dbStatement;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      this.snackBar.open('Query statement copied!', '', {
        duration: 2000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom'
      });
    } catch (err) {
      console.error('Fallback: Could not copy text', err);
    }
    document.body.removeChild(textarea);
  }

  setDb(event: Event): void {
    const value = (event.target as HTMLSelectElement)?.value;
    if (value) {
      this.selectedDb = value;
      sessionStorage.setItem('SelectedDb', value);
      this.getDatabaseAvgResponseTime();
      this.getDatabaseAccessSuccessRate();
      this.getDatabaseTraffic();
      this.getDatabaseAccessLatencyPercentile();
      this.getDatabaseSlowStatements();
      this.componentId = btoa(this.selectedDb) + '.0';
      this.getThreshold("DATABASE");
    }
  }

  getDatabaseNamesForServices(): void {
    this.apmApiService
      .getDatabaseNamesForServices(this.entityId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid database names response structure:", data);
            return;
          }

          let str = this.entityId;
          const str2 = str?.substring(0, str.length - 2) ?? '';
          let id: string;

          try {
            id = atob(str2);
          } catch (e) {
            console.error("Failed to decode service id for database names:", str2);
            return;
          }

          if (!data[id] || !Array.isArray(data[id])) {
            console.error("Missing or invalid database list for service:", data);
            return;
          }

          const invalidEntry = data[id].some(
            (db: any) => typeof db !== "string" || !db.trim()
          );

          if (invalidEntry) {
            console.error("Invalid database names found. Ignoring response:", data);
            return;
          }

          this.dbNames = data[id];

          if (this.dbNames.length > 0) {
            this.selectedDb = this.dbNames[0];
            sessionStorage.setItem('SelectedDb', this.dbNames[0]);
          } else {
            this.selectedDb = "None";
          }

          this.getDatabaseAvgResponseTime();
          this.getDatabaseAccessSuccessRate();
          this.getDatabaseTraffic();
          this.getDatabaseAccessLatencyPercentile();
          this.getDatabaseSlowStatements();

          this.componentId = btoa(this.selectedDb) + '.0';
          this.getThreshold("DATABASE");
        },

        error: (err) => {
          console.error("Failed to load database names for services:", err);
        }
      });
  }


  // getDatabaseAvgResponseTime(): void {
  //   let id = this.selectedDb;
  //   let dbId = btoa(id) + '.0';
  //   this.apmApiService.getDatabaseAvgResponseTime(dbId, this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.databaseLatency = data.latency;
  //     this.getDatabaseAvgResponseTimeChart(data.latencyTimeSeries);
  //   });
  // }

  getDatabaseAvgResponseTime(): void {
    let id = this.selectedDb;
    let dbId = btoa(id) + '.0';

    this.apmApiService
      .getDatabaseAvgResponseTime(dbId, this.entityId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid DB avg response time response structure:", data);
            return;
          }

          if (typeof data.latency !== "number" || data.latency < 0) {
            console.error("Invalid or negative 'latency' value found in DB response:", data);
            return;
          }

          if (!data.latencyTimeSeries || !Array.isArray(data.latencyTimeSeries)) {
            console.error("Missing or invalid 'latencyTimeSeries' in DB response:", data);
            return;
          }

          const invalidEntry = data.latencyTimeSeries.some(
            (item: any) =>
              (typeof item.latency === "number" && item.latency < 0) ||
              !item.time_bucket
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative 'latency' entries found in DB latencyTimeSeries. Ignoring response:",
              data
            );
            return;
          }

          this.databaseLatency = data.latency;
          this.getDatabaseAvgResponseTimeChart(data.latencyTimeSeries);
        },

        error: (err) => {
          console.error("Failed to load database average response time:", err);
        }
      });
  }


  getDatabaseAvgResponseTimeChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );

      if (keys.length === 0) {
        if (this.databaseAvgResponseTimeChart) {
          this.databaseAvgResponseTimeChart.destroy();
          this.databaseAvgResponseTimeChart = null;
        }
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        // data: data.map(d => ({
        //   y: Number(d[key]),
        //   color: Number(d[key]) === 100 ? '#4CAF50' : '#F44336' // Green or Red
        // }))
        data: data.map(d => {
          const y = Number(d[key]);
          return {
            y,
            color:
              this.thresholds?.database_access_sla?.criticalValue != null && y > this.thresholds?.database_access_sla?.criticalValue
                ? 'red'
                : this.thresholds?.database_access_sla?.warningValue != null && y > this.thresholds?.database_access_sla?.warningValue
                  ? 'orange'
                  : undefined
          };
        })
      }));

      // Destroy existing chart instance if it exists
      if (this.databaseAvgResponseTimeChart) {
        this.databaseAvgResponseTimeChart.destroy();
      }

      // Initialize chart instance
      this.databaseAvgResponseTimeChart = Highcharts.chart('databaseAvgResponseTimeChartContainer', {
        chart: {
          type: 'spline',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            y: 10,
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          plotLines: this.thresholds?.database_access_percentile?.avgBaseline != null ? [{
            value: this.thresholds?.database_access_percentile?.avgBaseline,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            zIndex: 5
          }] : []

        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false },
        plotOptions: {
          // series: {
          //   cursor: 'pointer',
          //   point: {
          //     events: {
          //       click: (event) => { this.onClick1(event, 'NoDuration') }
          //     }
          //   }
          // }
        }
      });
      if (!this.charts2.includes(this.databaseAvgResponseTimeChart)) {
        this.charts2.push(this.databaseAvgResponseTimeChart);
        this.syncCharts(this.charts2);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  // getDatabaseAccessSuccessRate(): void {
  //   let id = this.selectedDb;
  //   let dbId = btoa(id) + '.0';
  //   this.apmApiService.getDatabaseAccessSuccessRate(dbId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.databaseSuccessRate = data.successRate;
  //     this.getDatabaseAccessSuccessRateChart(data.successRateTimeSeries);
  //   });
  // }

  getDatabaseAccessSuccessRate(): void {
    let id = this.selectedDb;
    let dbId = btoa(id) + '.0';

    this.apmApiService
      .getDatabaseAccessSuccessRate(dbId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid database access success rate response structure:", data);
            return;
          }

          if (typeof data.successRate !== "number" || data.successRate < 0) {
            console.error("Invalid or negative 'successRate' value. Ignoring response:", data);
            return;
          }

          if (!data.successRateTimeSeries || !Array.isArray(data.successRateTimeSeries)) {
            console.error("Missing or invalid 'successRateTimeSeries':", data);
            return;
          }

          const invalidEntry = data.successRateTimeSeries.some(
            (item: any) =>
              (typeof item.success_rate === "number" && item.success_rate < 0) ||
              !item.time_bucket
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative 'success_rate' entries found in successRateTimeSeries. Ignoring response:",
              data
            );
            return;
          }

          this.databaseSuccessRate = data.successRate;
          this.getDatabaseAccessSuccessRateChart(data.successRateTimeSeries);
        },

        error: (err) => {
          console.error("Failed to load database access success rate:", err);
        }
      });
  }


  getDatabaseAccessSuccessRateChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );

      if (keys.length === 0) {
        if (this.databaseAccessSuccessRateChart) {
          this.databaseAccessSuccessRateChart.destroy();
          this.databaseAccessSuccessRateChart = null;
        }
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const series: Highcharts.SeriesColumnOptions[] = [
        {
          name: 'Failure',
          type: 'column',
          data: data.map(d => {
            const y = Number(d[keys[0]]);
            const result = +(100 - y).toFixed(2);
            return result;
          }),
          color: '#ef4444',
          stacking: 'normal'
        },
        {
          name: 'Success',
          type: 'column',
          data: data.map(d => {
            const y = Number(d[keys[0]]);
            return y;
          }),
          color: '#22c55e',
          stacking: 'normal'
        },

      ];

      if (this.databaseAccessSuccessRateChart) {
        this.databaseAccessSuccessRateChart.destroy();
      }

      this.databaseAccessSuccessRateChart = Highcharts.chart('databaseAccessSuccessRateChartContainer', {
        chart: {
          type: 'column',
          backgroundColor: 'transparent',
          spacing: [10, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            y: 10,
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          max: 100,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          plotLines: this.thresholds?.database_access_resp_time?.avgBaseline != null ? [{
            value: this.thresholds?.database_access_resp_time?.avgBaseline,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            zIndex: 5
          }] : []
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false },
        plotOptions: {
          // series: {
          //   cursor: 'pointer',
          //   point: {
          //     events: {
          //       click: (event) => { this.onClick1(event, 'NoDuration') }
          //     }
          //   }
          // },
          column: {
            stacking: 'normal',
            maxPointWidth: 10,
            grouping: true,
            borderWidth: 0
          }
        }
      });
      if (!this.charts2.includes(this.databaseAccessSuccessRateChart)) {
        this.charts2.push(this.databaseAccessSuccessRateChart);
        this.syncCharts(this.charts2);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  // getDatabaseTraffic(): void {
  //   let id = this.selectedDb;
  //   let dbId = btoa(id) + '.0';
  //   this.apmApiService.getDatabaseTraffic(dbId, this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.databaseLoad = data.load;
  //     this.getDatabaseTrafficChart(data.loadTimeSeries);
  //   });
  // }

  getDatabaseTraffic(): void {
    let id = this.selectedDb;
    let dbId = btoa(id) + '.0';

    this.apmApiService
      .getDatabaseTraffic(dbId, this.entityId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            console.error("Invalid database traffic response structure:", data);
            return;
          }

          if (typeof data.load !== 'number' || data.load < 0) {
            console.error("Invalid or negative 'load' value in database traffic response:", data);
            return;
          }

          if (!data.loadTimeSeries || !Array.isArray(data.loadTimeSeries)) {
            console.error("Missing or invalid 'loadTimeSeries' in database traffic response:", data);
            return;
          }

          const invalidEntry = data.loadTimeSeries.some((item: any) =>
            !item.time_bucket ||
            (typeof item.load === 'number' && item.load < 0)
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative 'load' entries found in database traffic time series. Ignoring response:",
              data
            );
            return;
          }

          this.databaseLoad = data.load;
          this.getDatabaseTrafficChart(data.loadTimeSeries);
        },

        error: (err) => {
          console.error("Failed to load database traffic metrics:", err);
        }
      });
  }


  getDatabaseTrafficChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );

      if (keys.length === 0) {
        if (this.databaseTrafficChart) {
          this.databaseTrafficChart.destroy();
          this.databaseTrafficChart = null;
        }
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const series: Highcharts.SeriesAreasplineOptions[] = keys.map(key => ({
        name: key,
        // data: data.map(d => Number(d[key])),
        data: data.map(d => {
          const y = Number(d[key]);
          return {
            y,
            color:
              this.thresholds?.database_access_cpm?.criticalValue != null && y > this.thresholds?.database_access_cpm?.criticalValue
                ? 'red'
                : this.thresholds?.database_access_cpm?.warningValue != null && y > this.thresholds?.database_access_cpm?.warningValue
                  ? 'orange'
                  : undefined
          };
        }),
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.3
      }));

      // Destroy previous chart instance
      if (this.databaseTrafficChart) {
        this.databaseTrafficChart.destroy();
      }

      // Create new chart instance
      this.databaseTrafficChart = Highcharts.chart('databaseTrafficChartContainer', {
        chart: {
          type: 'areaspline',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            y: 10,
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          plotLines: this.thresholds?.database_access_cpm?.avgBaseline != null ? [{
            value: this.thresholds?.database_access_cpm?.avgBaseline,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            zIndex: 5
          }] : []
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      });
      if (!this.charts2.includes(this.databaseTrafficChart)) {
        this.charts2.push(this.databaseTrafficChart);
        this.syncCharts(this.charts2);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  // getDatabaseAccessLatencyPercentile(): void {
  //   let id = this.selectedDb;
  //   let dbId = btoa(id) + '.0';
  //   this.apmApiService.getDatabaseAccessLatencyPercentile(dbId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.getDatabaseAccessLatencyPercentileChart(data);
  //   });
  // }

  getDatabaseAccessLatencyPercentile(): void {
    let id = this.selectedDb;
    let dbId = btoa(id) + '.0';

    this.apmApiService
      .getDatabaseAccessLatencyPercentile(dbId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || !Array.isArray(data)) {
            console.error("Invalid DB access latency percentile response structure:", data);
            return;
          }

          const invalidEntry = data.some((item: any) =>
            !item.time_bucket ||

            (item.P99 !== undefined && (typeof item.P99 !== "number" || item.P99 < 0)) ||
            (item.P95 !== undefined && (typeof item.P95 !== "number" || item.P95 < 0)) ||
            (item.P90 !== undefined && (typeof item.P90 !== "number" || item.P90 < 0)) ||
            (item.P75 !== undefined && (typeof item.P75 !== "number" || item.P75 < 0)) ||
            (item.P50 !== undefined && (typeof item.P50 !== "number" || item.P50 < 0))
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative DB access latency percentile entries found. Ignoring response:",
              data
            );
            return;
          }

          this.getDatabaseAccessLatencyPercentileChart(data);
        },

        error: (err) => {
          console.error("Failed to load DB access latency percentile metrics:", err);
        }
      });
  }


  getDatabaseAccessLatencyPercentileChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );

      if (keys.length === 0) {
        if (this.databaseAccessLatencyPercentileChart) {
          this.databaseAccessLatencyPercentileChart.destroy();
          this.databaseAccessLatencyPercentileChart = null;
        }
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const series: Highcharts.SeriesAreasplineOptions[] = keys.map(key => ({
        name: key,
        data: data.map(d => Number(d[key])),
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.3
      }));

      // Destroy previous chart instance
      if (this.databaseAccessLatencyPercentileChart) {
        this.databaseAccessLatencyPercentileChart.destroy();
      }

      // Create new chart instance
      this.databaseAccessLatencyPercentileChart = Highcharts.chart('databaseAccessLatencyPercentileChartContainer', {
        chart: {
          type: 'areaspline',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          tickPositions: [0, categories.length - 1],
          title: { text: "" },
          labels: {
            style: { color: labelColor, fontSize: '9px' },
            y: 10,
            formatter: function () {
              return categories[this.pos];
            }
          },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          plotLines: this.thresholds?.database_access_resp_time?.avgBaseline != null ? [{
            value: this.thresholds?.database_access_resp_time?.avgBaseline,
            color: '#7B4019',
            dashStyle: 'Dash',
            zIndex: 5
          }] : []
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      });
      if (!this.charts2.includes(this.databaseAccessLatencyPercentileChart)) {
        this.charts2.push(this.databaseAccessLatencyPercentileChart);
        this.syncCharts(this.charts2);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  slowStatementData: any;
  // getDatabaseSlowStatements(): void {
  //   let id = this.selectedDb;
  //   let dbId = btoa(id) + '.0';
  //   this.apmApiService.getDatabaseSlowStatements(dbId, this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.slowStatementData = data
  //   });
  // }

  getDatabaseSlowStatements(): void {
    let id = this.selectedDb;
    let dbId = btoa(id) + '.0';

    this.apmApiService
      .getDatabaseSlowStatements(dbId, this.entityId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || !Array.isArray(data)) {
            console.error("Invalid database slow statements response structure:", data);
            return;
          }

          const invalidEntry = data.some((item: any) =>
            typeof item !== "object" ||
            typeof item.trace_id !== "string" || !item.trace_id.trim() ||
            typeof item.latency !== "number" || item.latency < 0 ||
            !item.statement || typeof item.statement !== "string"
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative entries found in database slow statements. Ignoring response:",
              data
            );
            return;
          }

          this.slowStatementData = data;
        },

        error: (err) => {
          console.error("Failed to load database slow statements:", err);
        }
      });
  }


  getProgressWidth(value: number, dataArray: any[], key: string = ''): number {
    if (!dataArray || dataArray.length === 0) return 0;
    const max = Math.max(...dataArray.map(d => Number(d[key] || 0)));
    if (max === 0) return 0;
    const width = (Number(value) / max) * 100;
    return Math.max(width, 5);
  }

  getDatabaseSlowStatementsChart(data: { statement: string; latency: number; status: string }[]): void {
    try {
      if (!data || data.length === 0) {
        this.databaseSlowStatementsChart = null;
        return;
      }

      const getColorByStatus = (status: string): string => {
        switch (status?.toUpperCase()) {
          case 'CRITICAL': return '#F4433699';
          case 'WARNING': return '#FFC10799';
          case 'NORMAL': return '#30AEF999';
          default: return '#30AEF999';
        }
      };

      const categories = data.map(item => item.statement);
      const seriesData = data.map(item => ({
        y: item.latency,
        name: item.statement,
        color: getColorByStatus(item.status)
      }));

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      this.databaseSlowStatementsChart = {
        chart: {
          type: 'bar',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' },
        },
        title: { text: undefined },
        xAxis: {
          categories,
          title: { text: "" },
          labels: { enabled: false },
          lineWidth: 0,
          tickLength: 0,
          gridLineWidth: 0
        },
        yAxis: {
          min: 0,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        plotOptions: {
          bar: {
            maxPointWidth: 30,
            pointPadding: 0.05,
            groupPadding: 0.05,
            dataLabels: {
              enabled: true,
              inside: true,
              align: 'left',
              // format: '{point.name}',
              formatter: function () {
                const maxLen = 50; // characters to show
                return this.name.length > maxLen
                  ? this.name.substring(0, maxLen) + '...'
                  : this.name;
              },
              style: {
                color: labelColor,
                fontWeight: 'normal',
                textOutline: 'none',
                fontSize: '9px'
              }
            }
          }
        },
        series: [{
          name: 'Query Latency (ms)',
          type: 'bar',
          data: seriesData,

        }],
        credits: { enabled: false }
      };
    } catch (e) {
      console.error("Error Occurred", e);
    }
  }

  getDatabaseUptime(): void {
    this.getDatabaseUptimeChart(this.uptimeDatabase.sevenDays);
  }

  getDatabaseUptimeChart(data: any[]): void {
    try {
      if (!data || data.length === 0) {
        this.databaseUptimeChart = null;
        return;
      }

      const categories = data.map(item => item.type);
      const seriesData = data.map(item => ({
        y: item.count,
        name: item.type,
      }));

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      this.databaseUptimeChart = {
        chart: {
          type: 'bar',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' },
        },
        title: { text: undefined },
        xAxis: {
          categories,
          title: { text: "" },
          labels: { enabled: false },
          lineWidth: 0,
          tickLength: 0,
          gridLineWidth: 0
        },
        yAxis: {
          min: 0,
          title: { text: "" },
          labels: { enabled: false },
          lineWidth: 0,
          tickLength: 0,
          gridLineWidth: 0
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        plotOptions: {
          bar: {
            pointWidth: 30,
            groupPadding: 0,
            pointPadding: 0,
            borderWidth: 0,
            dataLabels: {
              enabled: true,
              inside: true,
              align: 'left',
              format: '{point.name}',
              style: {
                color: labelColor,
                fontWeight: 'normal',
                textOutline: 'none',
                fontSize: '9px'
              }
            }
          }
        },
        series: [{
          name: 'Uptime for 7 Days',
          type: 'bar',
          data: seriesData,
          color: '#28a74599'
        }],
        credits: { enabled: false }
      };
    } catch (e) {
      console.error("Error Occurred", e);
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

  // 1. Property — dropdown open/close state
  showAlerts = false;

  // 2. Toggle open/close
  toggleAlerts(): void {
    this.showAlerts = !this.showAlerts;
  }

  // 3. Total count (badge pe dikhta hai)
  getTotalAlerts(): number {
    return this.alertData.reduce(
      (sum, a) => sum + (a.total_count || 0),
      0
    );
  }

  getTotalCritical(): number {
    return this.alertData.reduce(
      (sum, a) => sum + (a.openalertcount || 0),
      0
    );
  }

  getTotalWarning(): number {
    return this.alertData.reduce(
      (sum, a) => sum + (a.closealertcount || 0),
      0
    );
  }
} 