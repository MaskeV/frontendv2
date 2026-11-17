import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, forkJoin, debounceTime } from 'rxjs';
import { MrumService } from '../../../../../services/mrum.service';
import { MrumParams } from '../../../../../models/mrum/mrum-params';
import { SearchPipe } from '../../../../../pipes/search.pipe';
import * as Highcharts from 'highcharts';
import { DateService } from '../../../../../services/date.service';

@Component({
  selector: 'app-session-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SearchPipe],
  templateUrl: './session-overview.component.html',
  styleUrls: ['./session-overview.component.css']
})
export class SessionOverviewComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  private loadData$ = new Subject<void>();
  
  // Base State
  selectedService: string = '';
  startTime: string = '';
  endTime: string = '';

  versionList: string[] = [];
  deviceList: string[] = [];
  osversionList: string[] = [];

  // Feature State
  sessionViewMode: 'users' | 'sessions' = 'sessions';
  activeSessionTab: string = 'all';
  sessionFilters = {
    appVersion: '',
    device: '',
    osVersion: '',
    sessionId: '',
    user: '',
    version: 'All',
    os: 'All',
    transactionName: ''
  };

  // Data
  paginatedSessions: any[] = [];
  paginatedUsers: any[] = [];
  totalSessions: number = 0;
  totalUsers: number = 0;
  expandedUserRows: { [key: number]: boolean } = {};

  // KPIs
  uniqueUsers: number = 0;
  avgSessionDuration: string = '0m 0s';
  sessionsPerUser: number = 0;
  bounceRate: string = '0%';
  avgActionsPerSession: number = 0;
  kpisTrend: any[] = [];

  // Pagination Window
  currentSessionsPage: number = 1;
  sessionPageSize: number = 10;
  totalSessionsPages: number = 1;
  paginationStart: number = 1;
  paginationEnd: number = 1;
  paginationPages: (number | string)[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mrumService: MrumService,
    private dateService: DateService
  ) {}

  ngOnInit(): void {
    this.loadData$.pipe(
      takeUntil(this.destroy$),
      debounceTime(50)
    ).subscribe(() => {
      this.executeLoadData();
    });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.selectedService = params['serviceId'] || '';
      
      // Only load initial if not yet set by dateService
      if (!this.startTime) this.startTime = params['st'] || '';
      if (!this.endTime) this.endTime = params['et'] || '';
      
      const viewMode = params['viewMode'];
      if (viewMode === 'users' || viewMode === 'sessions') {
        this.sessionViewMode = viewMode;
      }
      
      const status = params['status'];
      if (status) {
        this.activeSessionTab = status;
      }

      this.sessionFilters.transactionName = params['actionName'] || '';

      this.loadData$.next();
    });

    this.dateService.date$.pipe(takeUntil(this.destroy$)).subscribe(dates => {
      if (dates && dates.startdateTime && dates.enddateTime) {
        this.startTime = this.formatDate(dates.startdateTime).toString();
        this.endTime = this.formatDate(dates.enddateTime).toString();
        this.loadData$.next();
      }
    });
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "");
    return parseInt(date);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.renderSparklines();
    }, 500);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loadData$.next();
  }

  private executeLoadData(): void {
    this.loadDropdowns();
    this.getSessionsKPIs();
    if (this.sessionViewMode === 'users') {
      this.getUsers();
    } else {
      this.getSessions();
    }
  }

  loadDropdowns(): void {
    if (!this.selectedService || !this.startTime || !this.endTime) return;
    const params: MrumParams = {
      appName: this.selectedService,
      st: this.startTime,
      et: this.endTime
    };
    
    const dropdownCalls = [
      this.mrumService.getAppVersions(params),
      this.mrumService.getOsVersions(params),
      this.mrumService.getDevices(params)
    ];

    forkJoin(dropdownCalls).pipe(takeUntil(this.destroy$)).subscribe({
      next: (results: any[]) => {
        if (results[0]?.serviceStatus === 'Success') {
          this.versionList = results[0].serviceResponse;
        }
        if (results[1]?.serviceStatus === 'Success') {
          this.osversionList = results[1].serviceResponse;
        }
        if (results[2]?.serviceStatus === 'Success') {
          this.deviceList = results[2].serviceResponse;
        }
      },
      error: (err: any) => console.error('Error fetching dropdowns:', err)
    });
  }

  setSessionViewMode(mode: 'users' | 'sessions'): void {
    this.sessionViewMode = mode;
    this.currentSessionsPage = 1;
    this.activeSessionTab = 'all';
    
    // reset specific filters
    this.sessionFilters.sessionId = '';
    this.sessionFilters.user = '';

    if (mode === 'users') {
      this.getUsers();
    } else {
      this.getSessions();
    }
  }

  setActiveSessionTab(tab: string): void {
    this.activeSessionTab = tab;
    this.currentSessionsPage = 1;
    if (this.sessionViewMode === 'users') {
      this.getUsers();
    } else {
      this.getSessions();
    }
  }

  buildBaseParams(): MrumParams {
    let statusFilter = '';
    if (this.activeSessionTab === 'error') statusFilter = 'error';
    if (this.activeSessionTab === 'crash') statusFilter = 'crash';
    if (this.activeSessionTab === 'error_crash') statusFilter = 'error_crash';
    if (this.activeSessionTab === 'live') statusFilter = 'live';
    if (this.activeSessionTab === 'active') statusFilter = 'active';
    if (this.activeSessionTab === 'inactive') statusFilter = 'inactive';

    return {
      appName: this.selectedService,
      st: this.startTime,
      et: this.endTime,
      pageNumber: this.currentSessionsPage,
      pageSize: this.sessionPageSize,
      appVersion: this.sessionFilters.appVersion || (this.sessionFilters.version !== 'All' ? this.sessionFilters.version : undefined),
      osVersion: this.sessionFilters.osVersion || (this.sessionFilters.os !== 'All' ? this.sessionFilters.os : undefined),
      device: this.sessionFilters.device,
      transactionName: this.sessionFilters.transactionName || undefined,
      status: statusFilter
    };
  }

  getSessions(): void {
    const params = this.buildBaseParams();
    params.sessionId = this.sessionFilters.sessionId;

    this.paginatedSessions = [];
    this.totalSessions = 0;

    this.mrumService.getSessions(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data?.serviceStatus === 'Success') {
          this.paginatedSessions = data.serviceResponse.sessions || [];
          this.totalSessions = data.serviceResponse.total || 0;
          this.totalSessionsPages = Math.ceil(this.totalSessions / (this.sessionPageSize || 10)) || 1;
          this.updatePaginationWindow();
        }
      },
      error: (err: any) => console.error('Error fetching sessions:', err)
    });
  }

  getUsers(): void {
    const params = this.buildBaseParams();

    this.paginatedUsers = [];
    this.totalUsers = 0;

    this.mrumService.getUsers(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data?.serviceStatus === 'Success') {
          this.paginatedUsers = data.serviceResponse.users || [];
          this.totalUsers = data.serviceResponse.totalUsers || 0;
          this.totalSessionsPages = Math.ceil(this.totalUsers / (this.sessionPageSize || 10)) || 1;
          this.updatePaginationWindow();
        }
      },
      error: (err: any) => console.error('Error fetching users:', err)
    });
  }

  getSessionsKPIs(): void {
    const params = {
      appName: this.selectedService,
      st: this.startTime,
      et: this.endTime,
      appVersion: this.sessionFilters.appVersion,
      osVersion: this.sessionFilters.osVersion,
      device: this.sessionFilters.device,
      sessionId: this.sessionFilters.sessionId
    };

    this.mrumService.getSessionsDashboardKPIs(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data?.serviceStatus === 'Success') {
          const kpis = data.serviceResponse;
          this.uniqueUsers = kpis.uniqueUsers || 0;
          this.avgSessionDuration = kpis.avgSessionDuration || '0m 0s';
          this.sessionsPerUser = kpis.sessionsPerUser || 0;
          this.bounceRate = kpis.bounceRate || '0%';
          this.avgActionsPerSession = kpis.avgActionsPerSession || 0;
          this.kpisTrend = kpis.trend || [];

          setTimeout(() => {
            this.renderSparklines();
          }, 100);
        }
      },
      error: (err: any) => console.error('Error fetching Session KPIs:', err)
    });
  }

  // --- Pagination Methods ---

  get paginationDisplayRange(): string {
    if (this.totalSessions === 0) return '0 - 0';
    const start = (this.currentSessionsPage - 1) * (this.sessionPageSize || 10) + 1;
    const end = Math.min(this.currentSessionsPage * (this.sessionPageSize || 10), this.totalSessions);
    return `${start} - ${end}`;
  }

  get paginationDisplayRangeUsers(): string {
    if (this.totalUsers === 0) return '0 - 0';
    const start = (this.currentSessionsPage - 1) * (this.sessionPageSize || 10) + 1;
    const end = Math.min(this.currentSessionsPage * (this.sessionPageSize || 10), this.totalUsers);
    return `${start} - ${end}`;
  }

  onSessionPageSizeChange(): void {
    if (this.sessionPageSize == null || this.sessionPageSize < 1) {
      this.sessionPageSize = 1;
    }
    this.currentSessionsPage = 1;
    if (this.sessionViewMode === 'users') {
      this.getUsers();
    } else {
      this.getSessions();
    }
  }

  changeSessionsPage(page: string | number | any): void {
    if (page === '...') return;
    if (page < 1 || page > this.totalSessionsPages) return;
    this.currentSessionsPage = page;
    if (this.sessionViewMode === 'users') {
      this.getUsers();
    } else {
      this.getSessions();
    }
  }

  updatePaginationWindow(): void {
    const window = this.mrumService.calculatePaginationWindow(this.currentSessionsPage, this.totalSessionsPages);
    this.paginationStart = window.start;
    this.paginationEnd = window.end;
    this.paginationPages = window.pages;
  }

  // --- Utility Methods ---

  formatDurationInMinutes(durationMillis: number | undefined | null): string {
    return this.mrumService.formatDurationInMinutes(durationMillis);
  }

  getApdexColor(score: number | string | undefined | null): string {
    return this.mrumService.getApdexColor(score);
  }

  getApdexLabel(score: number | string | undefined | null): string {
    return this.mrumService.getApdexLabel(score);
  }

  buildQueryParamsSessions(sessionId: string, isLive: boolean, user?: any): any {
    const params: any = {
      serviceId: this.selectedService,
      st: this.startTime,
      et: this.endTime,
      sessionId: sessionId,
      isLive: isLive ? 'true' : 'false'
    };
    if (user && (user.userName || user.email)) {
      params.user = user.userName || user.email;
    }
    return params;
  }

  navigateToSession(sessionId: string, isLive: boolean, user?: any): void {
    const queryParams = this.buildQueryParamsSessions(sessionId, isLive, user);
    this.router.navigate(['/mrum/mrum-session'], { queryParams });
  }

  navigateToUserDetails(user: any): void {
    const userId = user.userId || user.userHandle || user.userName || 'unknown';
    const queryParams = {
      serviceId: this.selectedService,
      st: this.startTime,
      et: this.endTime
    };
    this.router.navigate(['/mrum/users', userId], { queryParams });
  }

  toggleUserRow(index: number): void {
    this.expandedUserRows[index] = !this.expandedUserRows[index];
  }

  // --- Highcharts ---

  renderSparklines(): void {
    const trendData = this.kpisTrend || [];
    
    if (trendData.length > 0) {
      this.renderSparkline('kpiTotalSessionsSparkline', 'column', trendData, 'totalSessions', '#3b82f6', 'Sessions', '#dbeafe', '#1e40af', '#eff6ff');
      this.renderSparkline('kpiBounceRateSparkline', 'column', trendData, 'bounceRate', '#ef4444', 'Bounce Rate (%)', '#fee2e2', '#991b1b', '#fef2f2');
      this.renderSparkline('kpiSessionsPerUserSparkline', 'column', trendData, 'sessionsPerUser', '#f59e0b', 'Sessions/User', '#fef3c7', '#92400e', '#fffbeb');
      this.renderSparkline('kpiUniqueUsersSparkline', 'column', trendData, 'uniqueUsers', '#a855f7', 'Unique Users', '#f3e8ff', '#6b21a8', '#faf5ff');
      this.renderSparkline('kpiAvgSessionDurationSparkline', 'column', trendData, 'avgDuration', '#22c55e', 'Duration (sec)', '#dcfce7', '#166534', '#f0fdf4');
      this.renderSparkline('kpiAvgActionsPerSessionSparkline', 'column', trendData, 'avgActions', '#0ea5e9', 'Avg Actions', '#e0f2fe', '#075985', '#f0f9ff');
    } else {
      this.renderSparkline('kpiTotalSessionsSparkline', 'column', [], '', '#3b82f6', '', '#dbeafe', '#1e40af', '#eff6ff');
      this.renderSparkline('kpiBounceRateSparkline', 'column', [], '', '#ef4444', '', '#fee2e2', '#991b1b', '#fef2f2');
      this.renderSparkline('kpiSessionsPerUserSparkline', 'column', [], '', '#f59e0b', '', '#fef3c7', '#92400e', '#fffbeb');
      this.renderSparkline('kpiUniqueUsersSparkline', 'column', [], '', '#a855f7', '', '#f3e8ff', '#6b21a8', '#faf5ff');
      this.renderSparkline('kpiAvgSessionDurationSparkline', 'column', [], '', '#22c55e', '', '#dcfce7', '#166534', '#f0fdf4');
      this.renderSparkline('kpiAvgActionsPerSessionSparkline', 'column', [], '', '#0ea5e9', '', '#e0f2fe', '#075985', '#f0f9ff');
    }
  }

  renderSparkline(containerId: string, type: string, rawData: any[], valueKey: string, color: string, name: string, fillColor: string, lineColor: string, tooltipBgColor: string = 'white'): void {
    const el = document.getElementById(containerId);
    if (!el) return;

    let chartData = [];
    if (rawData && rawData.length > 0) {
      chartData = rawData.map(item => {
        let val = 0;
        if (valueKey === 'avgDuration' && item.avgDuration) {
          val = Math.round(item.avgDuration / 1000);
        } else if (item[valueKey] !== undefined) {
          val = item[valueKey];
        }
        return [new Date(item.timestamp).getTime(), val];
      });
    } else {
      const now = Date.now();
      chartData = Array.from({length: 10}).map((_, i) => [now - (9 - i) * 3600000, 0]);
    }

    Highcharts.chart(containerId, {
      chart: {
        type: type,
        margin: [0, 0, 0, 0],
        spacing: [0, 0, 0, 0],
        backgroundColor: 'transparent',
        height: '100%',
        width: null
      },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: {
        type: 'datetime',
        visible: false,
        minPadding: 0,
        maxPadding: 0
      },
      yAxis: {
        visible: false,
        endOnTick: false,
        startOnTick: false,
        minPadding: 0,
        maxPadding: 0,
        min: 0
      },
      legend: { enabled: false },
      tooltip: {
        enabled: true,
        outside: true,
        backgroundColor: tooltipBgColor,
        borderWidth: 1,
        borderColor: color,
        shadow: true,
        style: { fontSize: '11px', color: lineColor, fontWeight: '600' },
        formatter: function (this: any) {
          const date = new Date(this.x as number);
          const dateString = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          const displayTime = `${dateString} ${timeString}`;
          return `<b>${displayTime}</b><br/><b>${this.y}</b> ${name}`;
        }
      },
      plotOptions: {
        series: {
          enableMouseTracking: true,
          states: { hover: { enabled: true } },
          marker: { enabled: false }
        },
        column: {
          borderRadius: 2,
          pointPadding: 0.1,
          groupPadding: 0,
          borderWidth: 0
        },
        area: {
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, fillColor],
              [1, 'transparent']
            ]
          },
          marker: { radius: 2 },
          lineWidth: 2,
          lineColor: lineColor,
          states: { hover: { lineWidth: 2 } },
          threshold: null
        }
      },
      series: [{
        type: type as any,
        name: name,
        data: chartData,
        color: color,
        showInLegend: false
      }]
    });
  }
}