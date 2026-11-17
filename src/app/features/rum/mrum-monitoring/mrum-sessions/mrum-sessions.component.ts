import { CommonModule } from '@angular/common';
import { ApplicationRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, HostListener } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MrumBreadcrumbComponent, BreadcrumbItem } from '../../shared/components/mrum-breadcrumb/mrum-breadcrumb.component';
import { catchError, filter, forkJoin, map, Observable, of, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import Highcharts from 'highcharts';
import { SharedService } from '../../../../services/shared.service';
import { DateService } from '../../../../services/date.service';
import { AutoRefreshService } from '../../../../services/auto-refresh.service';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { SearchPipe } from "../../../../pipes/search.pipe";
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DecoderService } from '../../../../services/decoder.service';
import { MrumService } from '../../../../services/mrum.service';
import { MrumParams } from '../../../../models/mrum/mrum-params';
import { HighchartsChartModule } from 'highcharts-angular';
import { MetricData } from '../../../../models/mrum/metric-data';
import { SortPipe } from '../../../../pipes/sort.pipe';

export let browserRefresh = false;

@Component({
  selector: 'app-mrum-sessions',
  imports: [CommonModule, RouterModule, NgbDropdownModule, FormsModule, SearchPipe, HighchartsChartModule, MrumBreadcrumbComponent],
  templateUrl: './mrum-sessions.component.html',
  styleUrl: './mrum-sessions.component.css'
})
export class MrumSessionsComponent implements OnInit, OnDestroy {

  @ViewChild('svgElement', { static: true }) svgElement!: ElementRef;
  @ViewChild('timelineContainer') timelineContainer!: ElementRef;

  isFullscreen: boolean = false;
  isDischarging: boolean = false;
  activeTooltipIndex: number | string | null = null;

  Highcharts: typeof Highcharts = Highcharts;

  timelineMarkers: any[] = [];

  formatMsToDuration(ms: number): string {
    if (!ms || isNaN(ms)) return '0s';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }


  constructor(
    private router: Router,
    private mrumService: MrumService,
    private dateService: DateService,
    private autoRefresh: AutoRefreshService,
    private route: ActivatedRoute,
  ) {

  }

  currentTabName: string = 'overview';
  
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
  httpRequestCount!: number | null;
  apdexScore: number | null = 0.92;
  isSessionIdCopied: boolean = false;

  sessionDetails: any = {
    sessionDuration: '0m 0s',
    actionsWithErrors: 0,
    device: 'Unknown',
    os: 'Unknown',
    apdexScore: 0,
    totalActions: 0
  };


  pieChartConfigs: {
    networkConnectionType: Highcharts.Options | null;
    device: Highcharts.Options | null;
    osVersion: Highcharts.Options | null;
    appVersion: Highcharts.Options | null;
  } = {
      networkConnectionType: null,
      device: null,
      osVersion: null,
      appVersion: null,
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
  httpRequestMetricData: MetricData = {
    timeSeries: [],
    aggregated: null
  };
  failureRateMetricData: MetricData = {
    timeSeries: [],
    aggregated: null
  };

  chartRefs: Record<string, Highcharts.Chart | undefined> = {};

  transactionNameList: string[] = [];
  versionList: string[] = [];
  osversionList: string[] = [];
  deviceList: string[] = [];
  transactions: any[] = [];

  sortField: string = 'latency';
  sortDirection: 'asc' | 'desc' = 'desc';
  filters: MrumParams = {
    osVersion: '',
    appVersion: '',
    device: '',
    outcome: '',
  };

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

  hasUrlDate = false;
  firstDateUpdateDone = false;
  isLive = false;

  // Events Pagination & Mock Data
  allEvents: any[] = [];
  paginatedEvents: any[] = [];
  totalEvents = 0;
  eventPageSize = 10;
  currentEventPage = 1;
  totalEventPages = 1;
  eventPaginationPages: number[] = [];
  eventPaginationStart = 0;
  eventPaginationEnd = 0;

  get errors() { return this.allEvents.filter(e => e.type === 'ERROR'); }
  get actions() { return this.allEvents.filter(e => e.type === 'ACTION'); }
  get screens() {
    const screenSegments: any[] = [];
    let currentScreen: any = null;
    let totalDurMs = (this.sessionDetails?.endTime || 0) - (this.sessionDetails?.startTime || 0);

    const formatDur = (ms: number) => {
        if (ms >= 60000) return Math.floor(ms / 60000) + 'm ' + Math.round((ms % 60000) / 1000) + 's';
        if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
        return Math.round(ms) + 'ms';
    };

    this.allEvents.forEach(e => {
      if (e.component && e.component !== 'Unknown') {
        if (!currentScreen || currentScreen.name !== e.component) {
          if (currentScreen) {
             currentScreen.width = e.leftPercent - currentScreen.leftPercent;
             let durMs = totalDurMs > 0 ? (currentScreen.width / 95) * totalDurMs : 0;
             currentScreen.durationStr = formatDur(durMs);
          }
          currentScreen = {
            id: 'scr_' + screenSegments.length,
            name: e.component,
            leftPercent: e.leftPercent,
            startTime: e.time,
            width: 10 // default for the last one
          };
          screenSegments.push(currentScreen);
        }
      }
    });
    if (currentScreen && this.allEvents.length > 0) {
      currentScreen.width = 100 - currentScreen.leftPercent;
      let durMs = totalDurMs > 0 ? (currentScreen.width / 95) * totalDurMs : 0;
      currentScreen.durationStr = formatDur(durMs);
    }
    return screenSegments;
  }

  ngOnInit(): void {
    document.addEventListener('fullscreenchange', this.onFullscreenChange.bind(this));

    this.route.queryParams.subscribe(params => {

      const serviceId = params['serviceId'];
      const tabName = params['tab'] || 'overview';
      const sessionId = params['sessionId'] || params['sId'] || params['sid'];
      const appVersion = params['appVersion'];
      const osVersion = params['osVersion'];
      const device = params['device'];
      const user = params['user'];
      this.isLive = params['isLive'] === 'true';

      if (params['st'] && params['et']) {
        this.startTime = params['st'];
        this.endTime = params['et'];
        this.hasUrlDate = true;
      }

      if (!serviceId) {
        this.router.navigate(['/mrum']);
        return;
      }
      if (!sessionId) {
        this.router.navigate(['/mrum/mrum-overview'], {
          queryParams: {
            serviceId: serviceId,
            st: this.startTime,
            et: this.endTime
          }
        });
        return;
      }
      // for transactions
      this.filters.appName = serviceId;
      this.filters.appVersion = appVersion || this.filters.appVersion;
      this.filters.sessionId = sessionId || this.filters.sessionId;
      this.filters.device = device || this.filters.device;
      this.filters.osVersion = osVersion || this.filters.osVersion;
      this.filters.user = user || this.filters.user;
      this.apdexScore = this.getStaticApdex(this.filters.sessionId);

      // for errors
      this.errorFilters.appName = serviceId;
      this.errorFilters.appVersion = appVersion || this.errorFilters.appVersion;
      this.errorFilters.sessionId = sessionId || this.errorFilters.sessionId;
      this.errorFilters.device = device || this.errorFilters.device;
      this.errorFilters.osVersion = osVersion || this.errorFilters.osVersion;

      this.currentTabName = tabName;
      this.updateBreadcrumbs();
      
      if (this.hasUrlDate) {
        this.getSessionDetails();
      }
    });

    this.dateService.setActiveComponent('MrumSessionsComponent');

    this.subscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'MrumSessionsComponent'),
      switchMap(() => this.dateService.date$)
    ).subscribe(dates => {
      this.datemodel = dates;

      if (this.hasUrlDate && !this.firstDateUpdateDone) {
        this.firstDateUpdateDone = true;
        return;
      }
      this.startTime = this.formatDate(this.datemodel.startdateTime);
      this.endTime = this.formatDate(this.datemodel.enddateTime);
      this.getSessionDetails();
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
    this.updateEventPagination();
  }

  updateEventPagination(): void {
    if (this.eventPageSize < 1) {
      this.eventPageSize = 1;
    }
    this.totalEventPages = Math.ceil(this.totalEvents / this.eventPageSize);
    if (this.currentEventPage > this.totalEventPages) {
      this.currentEventPage = this.totalEventPages;
    }
    if (this.currentEventPage < 1) {
      this.currentEventPage = 1;
    }

    this.eventPaginationStart = (this.currentEventPage - 1) * this.eventPageSize + 1;
    this.eventPaginationEnd = Math.min(this.currentEventPage * this.eventPageSize, this.totalEvents);

    // Generate pagination array (show all pages)
    this.eventPaginationPages = [];
    for (let i = 1; i <= this.totalEventPages; i++) {
      this.eventPaginationPages.push(i);
    }

    const startIndex = (this.currentEventPage - 1) * this.eventPageSize;
    this.paginatedEvents = this.allEvents.slice(startIndex, startIndex + this.eventPageSize);
  }

  changeEventPage(page: number, event: Event): void {
    event.preventDefault();
    if (page >= 1 && page <= this.totalEventPages) {
      this.currentEventPage = page;
      this.updateEventPagination();
    }
  }

  getEventBgColor(type: string): string {
    switch (type) {
      case 'APP': return '#eff6ff';
      case 'SCREEN': return '#faf5ff';
      case 'ACTION': return '#f0fdfa';
      case 'ERROR': return '#fff1f2';
      default: return '#ffffff';
    }
  }

  getEventBorderColor(type: string): string {
    switch (type) {
      case 'APP': return '#bfdbfe';
      case 'SCREEN': return '#e9d5ff';
      case 'ACTION': return '#99f6e4';
      case 'ERROR': return '#fecdd3';
      default: return '#e2e8f0';
    }
  }

  getEventTimeColor(type: string): string {
    switch (type) {
      case 'APP': return '#1d4ed8';
      case 'SCREEN': return '#6d28d9';
      case 'ACTION': return '#0f766e';
      case 'ERROR': return '#be123c';
      default: return '#334155';
    }
  }

  getEventBadgeStyle(type: string): { bg: string, color: string } {
    switch (type) {
      case 'APP': return { bg: '#dbeafe', color: '#1e40af' };
      case 'SCREEN': return { bg: '#ede9fe', color: '#5b21b6' };
      case 'ACTION': return { bg: '#ccfbf1', color: '#0f766e' };
      case 'ERROR': return { bg: '#e11d48', color: '#ffffff' };
      default: return { bg: '#f1f5f9', color: '#475569' };
    }
  }

  getEventNameColor(type: string): string {
    switch (type) {
      case 'APP': return '#1e3a8a';
      case 'SCREEN': return '#4c1d95';
      case 'ACTION': return '#134e4a';
      case 'ERROR': return '#be123c';
      default: return '#1e293b';
    }
  }

  getEventComponentColor(type: string): string {
    switch (type) {
      case 'APP': return '#2563eb';
      case 'SCREEN': return '#7c3aed';
      case 'ACTION': return '#0d9488';
      case 'ERROR': return '#9f1239';
      default: return '#64748b';
    }
  }

  getEventChevronColor(type: string): string {
    switch (type) {
      case 'APP': return '#3b82f6';
      case 'SCREEN': return '#8b5cf6';
      case 'ACTION': return '#14b8a6';
      case 'ERROR': return '#f43f5e';
      default: return '#94a3b8';
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('fullscreenchange', this.onFullscreenChange.bind(this));
    if (this.storageSub) {
      this.storageSub.unsubscribe();
    }
    this.clearAutoRefresh();
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
  }

  onFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
  }


  private clearAutoRefresh() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    const elem = this.timelineContainer?.nativeElement;

    if (this.isFullscreen) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
      }
    } else {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) { /* Safari */
          (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) { /* IE11 */
          (document as any).msExitFullscreen();
        }
      }
    }
  }

  toggleTooltip(index: any, event: Event) {
    event.stopPropagation();
    if (this.activeTooltipIndex === index) {
      this.activeTooltipIndex = null;
    } else {
      this.activeTooltipIndex = index;
    }
  }

  @HostListener('document:click')
  closeTooltip() {
    this.activeTooltipIndex = null;
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
        label: this.filters.appName || 'ecom-app', 
        url: '/mrum/mrum-overview', 
        queryParams: { serviceId: this.filters.appName || 'ecom-app', tab: 'overview', st: this.startTime, et: this.endTime } 
      },
      { 
        label: 'Sessions', 
        url: '/mrum/mrum-overview',
        queryParams: { serviceId: this.filters.appName || 'ecom-app', tab: 'sessions', viewMode: 'sessions', st: this.startTime, et: this.endTime } 
      }
    ];

    if (this.filters.sessionId) {
      let truncatedSessionId = this.filters.sessionId;
      if (truncatedSessionId.length > 16) {
        truncatedSessionId = truncatedSessionId.slice(0, 16) + '...';
      }
      this.breadcrumbData.push({ label: truncatedSessionId });
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

  setSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
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
    console.log("tabname:", tabName);
    this.getSessionDetails();
    switch (tabName) {
      case 'overview':
        this.loadOverviewData();
        this.getAppPerformanceMetrics();
        this.updateTimeSeriesCharts();
        break;
      case 'transactions':
        this.loadInitialData()
        this.getTransactions();
        break;
      case 'errors':
        this.loadInitialData();
        this.getErrors();
        break;

    }
  }


  loadInitialData(): void {
    const mrumParams: MrumParams = {
      appName: this.filters.appName,
      sessionId: this.filters.sessionId,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };

    this.versionList = [];
    this.deviceList = [];
    this.osversionList = [];

    forkJoin({
      sessions: this.mrumService.getSessions(mrumParams).pipe(
        map((res: any) => res?.serviceStatus === 'Success' ? res.serviceResponse.sessions || [] : []),
        catchError(() => of([]))
      ),
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

  getSessionDetails(): void {
    const mrumParams: MrumParams = {
      appName: this.filters.appName,
      sessionId: this.filters.sessionId,
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      user: this.filters.user
    };
    this.mrumService.getSessionDetails(mrumParams).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data?.serviceStatus === 'Success') {
          this.sessionDetails = data.serviceResponse;
          this.apdexScore = this.sessionDetails.apdexScore;

          const sessionStart = this.sessionDetails.events.length ? new Date(this.sessionDetails.events[0].timestamp).getTime() : 0;
          const sessionEnd = this.sessionDetails.events.length ? new Date(this.sessionDetails.events[this.sessionDetails.events.length - 1].timestamp).getTime() : 0;
          const sessionDur = sessionEnd - sessionStart;

          this.timelineMarkers = [
            { label: '0s', leftPercent: 0 },
            { label: this.formatMsToDuration(sessionDur * 0.25), leftPercent: 25 },
            { label: this.formatMsToDuration(sessionDur * 0.50), leftPercent: 50 },
            { label: this.formatMsToDuration(sessionDur * 0.75), leftPercent: 75 },
            { label: this.formatMsToDuration(sessionDur), leftPercent: 95 }
          ];

          if (this.sessionDetails.events && Array.isArray(this.sessionDetails.events)) {
            this.allEvents = this.sessionDetails.events.map((e: any, i: number) => {
              let leftPercent = 0;
              let widthPercent = 0;
              const eTime = new Date(e.timestamp).getTime();
              if (sessionDur > 0) {
                leftPercent = ((eTime - sessionStart) / sessionDur) * 95;
                const durationMs = (e.duration_us || 0) / 1000;
                widthPercent = (durationMs / sessionDur) * 95;
                if (widthPercent < 2) widthPercent = 2; // Increased minimum visible width for actions
              } else {
                leftPercent = 50; // Center if only one event
                widthPercent = 5; // Default width
              }

              let componentName = e.url;
              try {
                if (componentName && componentName.startsWith('http')) {
                  const parsedUrl = new URL(componentName);
                  componentName = parsedUrl.pathname.replace(/^\/+/, '').split('/')[0];
                } else if (componentName && componentName.startsWith('/')) {
                  componentName = componentName.replace(/^\/+/, '').split('/')[0];
                } else if (componentName && componentName.includes('/')) {
                  componentName = componentName.split('/')[0];
                }
              } catch (err) { }

              if (!componentName || componentName === 'Unknown') {
                 if (e.transactionType === 'screen') {
                    componentName = e.action || e.activity || 'Screen';
                 } else {
                    componentName = e.url || 'Unknown';
                 }
              }

              return {
                id: i,
                type: (e.outcome === 'failure' || e.processorEvent === 'error' || e.errorType === 'crash') ? 'ERROR' : (e.transactionType === 'screen' ? 'SCREEN' : 'ACTION'),
                time: new Date(e.timestamp).toLocaleTimeString(),
                name: e.action || e.activity || e.errorType || 'Unknown Action',
                component: componentName || 'Unknown',
                duration: e.duration_us != null ? ((e.duration_us) / 1000000).toFixed(2) + ' s' : 'N/A',
                apdex: e.apdex,
                errorCount: (e.outcome === 'failure' || e.processorEvent === 'error' || e.errorType === 'crash') ? 1 : null,
                expanded: false,
                leftPercent: leftPercent,
                widthPercent: widthPercent,
                traceId: e.traceId,
                url: e.url
              };
            });
            this.totalEvents = this.allEvents.length;
            this.updateEventPagination();

            this.sessionDetails.uiActions = this.allEvents.filter((e: any) => e.type === 'ACTION').length;
            this.sessionDetails.apiCalls = 0; // Not explicitly tracked as separate type in UI currently
            this.sessionDetails.totalActions = this.sessionDetails.uiActions + this.allEvents.filter((e: any) => e.type === 'SCREEN').length;
            this.sessionDetails.actionsWithErrors = this.allEvents.filter((e: any) => e.type === 'ERROR').length;
            
            let total = this.sessionDetails.totalActions + this.sessionDetails.actionsWithErrors;
            this.sessionDetails.errorPercentage = total > 0 ? ((this.sessionDetails.actionsWithErrors / total) * 100).toFixed(1) : 0;

            this.sessionDetails.totalScreens = this.allEvents.filter((e: any) => e.type === 'SCREEN').length;
            this.sessionDetails.uniqueScreens = new Set(this.allEvents.filter((e: any) => e.type === 'SCREEN').map((e: any) => e.name)).size;
          }
        }
      },
      error: (err: any) => {
        console.error('Error fetching session details:', err);
      }
    });
  }

  showEventDetails(event: any): void {
    if (event.type === 'ACTION') {
      this.router.navigate(['/mrum/actions', event.name], {
        queryParamsHandling: 'preserve'
      });
    } else if (event.type === 'SCREEN') {
      this.router.navigate(['/mrum/screens', event.name], {
        queryParamsHandling: 'preserve'
      });
    } else {
      console.log('Show details for event:', event);
    }
  }

  getApdexLabel(score: number | string | undefined | null): string {
    return this.mrumService.getApdexLabel(score);
  }

  getTransactions(): void {
    const baseParams: MrumParams = {
      appName: this.filters.appName,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };

    this.transactions = [];
    const filters = this.filters;

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

  get sortedTransactions(): any[] {
    return new SortPipe().transform(this.transactions, this.sortField, this.sortDirection);
  }

  loadOverviewData(): void {
    const mrumParams: MrumParams = {
      appName: this.filters.appName,
      appVersion: this.filters?.appVersion?.trim(),
      device: this.filters?.device?.trim(),
      osVersion: this.filters?.osVersion?.trim(),
      sessionId: this.filters.sessionId,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };
    
    this.mrumService.getOverview(mrumParams).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data?.serviceStatus === 'Success' && data.serviceResponse) {
          const res = data.serviceResponse;
          const kpis = res.kpis || {};
          const dist = res.distributions || {};

          this.httpRequestCount = kpis.totalUsers ?? null;

          const toRecord = (arr: any[]) => (arr || []).reduce((acc: Record<string, number>, item: any) => { acc[item.name] = item.count; return acc; }, {});

          const deviceRec = toRecord(dist.device);
          const networkRec = toRecord(dist.network);
          const osRec = toRecord(dist.osVersion);
          const appVerRec = toRecord(dist.appVersion);

          this.pieChartConfigs.device = this.isNonEmpty(deviceRec) ? this.getPieConfig('Device', deviceRec) : null;
          this.pieChartConfigs.networkConnectionType = this.isNonEmpty(networkRec) ? this.getPieConfig('Network Type', networkRec) : null;
          this.pieChartConfigs.osVersion = this.isNonEmpty(osRec) ? this.getPieConfig('OS Version', osRec) : null;
          this.pieChartConfigs.appVersion = this.isNonEmpty(appVerRec) ? this.getPieConfig('App Version', appVerRec) : null;

        } else {
          this.resetOverviewDefaults();
        }
      },
      error: (err: any) => {
        console.error('Error fetching overview data:', err);
        this.resetOverviewDefaults();
      }
    });
  }

  private resetOverviewDefaults(): void {
    this.httpRequestCount = null;
    this.pieChartConfigs = {
      networkConnectionType: null,
      device: null,
      osVersion: null,
      appVersion: null,
    };
  }


  getAppPerformanceMetrics(): void {
    const mrumParams: MrumParams = {
      appName: this.filters.appName,
      appVersion: this.filters?.appVersion?.trim(),
      device: this.filters?.device?.trim(),
      osVersion: this.filters?.osVersion?.trim(),
      sessionId: this.filters.sessionId,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };
    this.throughput = null;
    this.failureRate = null;
    this.latency = null;
    this.httpRequestCount = null;
  }




  getPieConfig(title: string, data: Record<string, number>): Highcharts.Options {
    return {
      chart: {
        type: 'pie',
        backgroundColor: 'transparent',
        height: 200,
        spacing: [5, 5, 5, 5]
      },

      title: { text: undefined },

      tooltip: {
        useHTML: true,
        backgroundColor: '#ffffff',
        borderColor: '#d9d9d9',
        borderRadius: 6,
        shadow: true,
        style: {
          color: '#333',
          fontSize: '12px',
          fontWeight: '500'
        },
        pointFormat: `
        <div style="padding:4px 6px">
          <b style="color:#1565c0">{point.name}</b><br/>
          <span>{point.y:.1f}%</span>
        </div>
      `
      },

      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          size: '100%',
          borderWidth: 1,
          borderColor: '#ffffff',
          dataLabels: {
            enabled: true,
            distance: 12,
            format: '{point.name}: {point.y:.1f}%',
            style: {
              color: '#333',
              fontSize: '10px',
              fontWeight: '500',
              textOutline: 'none'
            }
          },
          showInLegend: true
        }
      },

      legend: {
        enabled: true,
        align: 'center',
        verticalAlign: 'bottom',
        layout: 'horizontal',
        itemMarginTop: 4,
        itemMarginBottom: 4,
        itemStyle: {
          color: '#333',
          fontSize: '10px',
          fontWeight: '500'
        },
        itemHoverStyle: {
          color: '#1565c0'
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


  updateTimeSeriesCharts(): void {
    const mrumParams: MrumParams = {
      appName: this.filters.appName,
      appVersion: this.filters?.appVersion?.trim(),
      device: this.filters?.device?.trim(),
      osVersion: this.filters?.osVersion?.trim(),
      sessionId: this.filters.sessionId,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };

    this.mrumService.getApdexScore(mrumParams).subscribe((data: any) => {
      if (data.serviceStatus === 'Success' && data.serviceResponse.time_series.length > 0) {
        this.apdexMetricData.timeSeries = data.serviceResponse.time_series;
        this.apdexMetricData.aggregated = data.serviceResponse.aggregated;
        // setTimeout(() => {
        //   this.renderChartById('apdexChartContainer', 'Apdex', this.apdexMetricData.timeSeries, 'apdex');
        // }, 0);
      } else {
        this.apdexMetricData.timeSeries = [];
        this.apdexMetricData.aggregated = null;
      }
    });

    this.mrumService.getLatencyStats(mrumParams).subscribe((data: any) => {
      if (data.serviceStatus === 'Success' && data.serviceResponse.time_series.length > 0) {
        this.latencyMetricData.timeSeries = data.serviceResponse.time_series;
        this.latencyMetricData.aggregated = data.serviceResponse.aggregated;
        // setTimeout(() => {
        //   this.renderChartById('latencyChartContainer', 'Latency', this.latencyMetricData.timeSeries, 'avgLatencyMs');
        // }, 0);
      } else {
        this.latencyMetricData.timeSeries = [];
        this.latencyMetricData.aggregated = null;
      }
    });
    this.mrumService.getThroughput(mrumParams).subscribe((data: any) => {
      if (data.serviceStatus === 'Success' && data.serviceResponse.time_series.length > 0) {
        this.throughputMetricData.timeSeries = data.serviceResponse.time_series;
        this.throughputMetricData.aggregated = data.serviceResponse.aggregated;
        // setTimeout(() => {
        //   this.renderChartById('throughputChartContainer', 'Throughput', this.throughputMetricData.timeSeries, 'throughput');
        // }, 0);
      } else {
        this.throughputMetricData.timeSeries = [];
        this.throughputMetricData.aggregated = null;
      }
    });

    this.httpRequestMetricData.timeSeries = [];
    this.httpRequestMetricData.aggregated = null;
    this.mrumService.getFailedTransactionRate(mrumParams).subscribe((data: any) => {
      if (data.serviceStatus === 'Success' && data.serviceResponse.time_series.length > 0) {
        this.failureRateMetricData.timeSeries = data.serviceResponse.time_series;
        this.failureRateMetricData.aggregated = data.serviceResponse.aggregated;
        // setTimeout(() => {
        //   this.renderChartById('failureRateChartContainer', 'Failure Rate', this.failureRateMetricData.timeSeries, 'failureRate');
        // }, 0);
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

      xAxis: {
        type: 'datetime',
        lineColor: '#d0d0d0',
        tickColor: '#d0d0d0',
        labels: {
          style: { color: '#555', fontSize: '10px' },
          y: 18
        }
      },

      yAxis: {
        min: 0,
        tickAmount: 5,
        title: { text: undefined },
        gridLineColor: '#eeeeee',
        labels: {
          style: { color: '#555', fontSize: '10px' },
          x: -5
        },
        startOnTick: true,
        endOnTick: false
      },

      tooltip: {
        useHTML: true,
        backgroundColor: '#ffffff',
        borderColor: '#d9d9d9',
        borderRadius: 6,
        shadow: true,
        style: { color: '#333', fontSize: '12px' },
        formatter: function () {
          return `
          <div style="font-size:12px;">
            <div style="font-weight:600; margin-bottom:4px;">
              ${Highcharts.dateFormat('%e %b, %H:%M', this.x as number)}
            </div>
            <div><b>${this.y ?? 0}</b></div>
          </div>
        `;
        }
      },

      plotOptions: {
        spline: {
          lineWidth: 2,
          marker: { radius: 2, symbol: 'circle' },
          states: { hover: { lineWidth: 2 } }
        }
      },

      series: [{
        name: title,
        type: 'spline',
        data: completeSeries,
        marker: { enabled: true }
      }]
    };
  }


  getErrors(): void {
    const params: MrumParams = {
      appName: this.errorFilters.appName,
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      pageNumber: this.currentErrorPage,
      pageSize: this.errorPageSize,
      appVersion: this.errorFilters?.appVersion?.trim() || undefined,
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

  cleanParams(obj: Record<string, any>) {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined && v !== '')
    );
  }


  buildQueryParamsTransactions(txn: string) {
    return this.cleanParams({
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      serviceId: this.filters.appName,
      appVersion: this.filters?.appVersion?.trim(),
      osVersion: this.filters?.osVersion?.trim(),
      device: this.filters?.device?.trim(),
      traceId: this.filters?.traceId?.trim(),
      nTraceid: this.filters?.netraaTraceId?.trim(),
      mil: this.filters?.minLatency,
      mxl: this.filters?.maxLatency,
      txn: txn,
      tab: "traces",
    });
  }

  buildQueryParamsError(groupId: string) {
    return this.cleanParams({
      gId: groupId,
      tab: 'errors',
      serviceId: this.errorFilters.appName,
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      appVersion: this.errorFilters?.appVersion?.trim(),
      osVersion: this.errorFilters?.osVersion?.trim(),
      device: this.errorFilters?.device?.trim(),
      sessionId: this.errorFilters?.sessionId?.trim(),
      traceId: this.errorFilters?.traceId?.trim(),
      isCrash: this.errorFilters?.isCrash,
    });
  }


  getApdexTheme(score: number | null): any {
    if (score === null || score === undefined) {
      return { bg: '#f1f5f9', iconBg: '#e2e8f0', iconColor: '#64748b', textDark: '#334155', textLight: '#475569', label: 'N/A' };
    }
    if (score >= 0.90) {
      return { bg: '#ecfdf5', iconBg: '#d1fae5', iconColor: '#059669', textDark: '#064e3b', textLight: '#047857', label: 'EXCELLENT' };
    }
    if (score >= 0.75) {
      return { bg: '#f0fdfa', iconBg: '#ccfbf1', iconColor: '#10b981', textDark: '#134e4a', textLight: '#0f766e', label: 'GOOD' };
    }
    if (score >= 0.60) {
      return { bg: '#fefce8', iconBg: '#fef08a', iconColor: '#eab308', textDark: '#854d0e', textLight: '#a16207', label: 'FAIR' };
    }
    if (score >= 0.40) {
      return { bg: '#fff7ed', iconBg: '#ffedd5', iconColor: '#f97316', textDark: '#9a3412', textLight: '#c2410c', label: 'POOR' };
    }
    return { bg: '#fff1f2', iconBg: '#ffe4e6', iconColor: '#ef4444', textDark: '#881337', textLight: '#be123c', label: 'CRITICAL' };
  }

  getStaticApdex(sessionId: string | undefined): number {
    if (!sessionId) return 0.92;
    let sum = 0;
    for (let i = 0; i < sessionId.length; i++) {
      sum += sessionId.charCodeAt(i);
    }
    const rem = sum % 5;
    if (rem === 0) return 0.95; // Excellent
    if (rem === 1) return 0.80; // Good
    if (rem === 2) return 0.65; // Fair
    if (rem === 3) return 0.45; // Poor
    return 0.35; // Critical
  }

  copySessionId(): void {
    const sessionId = this.filters.sessionId || 'edeaa280-4b3f-8a21-9c3d-f1e2a3b4c5d6';
    navigator.clipboard.writeText(sessionId).then(() => {
      this.isSessionIdCopied = true;
      setTimeout(() => {
        this.isSessionIdCopied = false;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy session ID: ', err);
    });
  }

  navigateToUserDetails(): void {
    const userId = this.filters.user || this.sessionDetails?.userId || this.sessionDetails?.userName || 'unknown';
    const queryParams = {
      serviceId: this.filters.appName,
      st: this.startTime,
      et: this.endTime
    };
    this.router.navigate(['/mrum/users', userId], { queryParams });
  }
}
