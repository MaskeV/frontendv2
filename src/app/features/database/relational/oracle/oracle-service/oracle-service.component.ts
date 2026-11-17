import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import Highcharts from 'highcharts';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DateService } from '../../../../../services/date.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HighchartsChartModule } from 'highcharts-angular';
import { OracleApiService } from '../../../../../services/oracle-api.service';
import { ServiceStatus } from '../../../../../models/enums/ServiceStatus';
import * as bootstrap from 'bootstrap';
import { SearchItemPipe } from '../../../../../pipes/search-item.pipe';
import { SortOraclePipe } from '../../../../../pipes/sort-oracle.pipe';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MeteringConfigService } from '../../../../../services/metering-config.service';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
    selector: 'app-oracle-service',
    imports: [
        FormsModule,
        CommonModule,
        RouterModule,
        HighchartsChartModule,
        SearchItemPipe,
        SortOraclePipe,
        MatTooltip
    ],
    templateUrl: './oracle-service.component.html',
    styleUrl: './oracle-service.component.css'
})
export class OracleServiceComponent implements OnInit, OnDestroy, AfterViewInit {
  private themeObserver: MutationObserver | undefined;

  Highcharts: typeof Highcharts = Highcharts;

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  thresholdst!: number;
  endTime!: number;

  selectedService!: string;
  entityId!: string;

  combinedData: any;
  upTime: any;
  sinceWhenUptime: any;

  chart_criteria: string | null = 'avg';

  charts: Highcharts.Chart[] = [];

  sessionDetailsCharts: Highcharts.Chart | null = null;
  sessionUtilizationChart: Highcharts.Chart | null = null;
  processDetailsChart: Highcharts.Chart | null = null;
  bufferCacheHitRatioChart: Highcharts.Chart | null = null;
  openCursorChart: Highcharts.Chart | null = null;
  deadlockChart: Highcharts.Chart | null = null;
  userErrorChart: Highcharts.Chart | null = null;
  connectionErrorChart: Highcharts.Chart | null = null;
  currentQpsChart: Highcharts.Chart | null = null;
  slowQueryRateChart: Highcharts.Chart | null = null;
  commandTrendChart: Highcharts.Chart | null = null;
  connectsDetailsChart: Highcharts.Chart | null = null;
  locksDetailsChart: Highcharts.Chart | null = null;
  staleQueriesChart: Highcharts.Chart | null = null;
  proceduresDetailsChart: Highcharts.Chart | null = null;
  functionsDetailsChart: Highcharts.Chart | null = null;
  packagesDetailsChart: Highcharts.Chart | null = null;
  locksByTypeChart: Highcharts.Chart | null = null;
  procedureExecutionChart: Highcharts.Chart | null = null;
  procedureErrorChart: Highcharts.Chart | null = null;
  slowQueryDurRange: Highcharts.Chart | null = null;

  sessionUtilizationTimestamps: number[] = [];
  processDetailsTimestamps: number[] = [];
  bufferCacheHitRatioTimestamps: number[] = [];
  openCursorTimestamps: number[] = [];
  deadlockTimestamps: number[] = [];
  userErrorTimestamps: number[] = [];
  connectionErrorTimestamps: number[] = [];
  currentQpsTimestamps: number[] = [];
  slowQueryRateTimestamps: number[] = [];
  staleQueriesTimestamps: number[] = [];

  roundUpto: number = 1000
  avgSessionUtilization: number = 0;
  avgBufferCacheRatio: number = 0;
  avgUserError: number = 0;
  avgConnectionError: number = 0;
  avgDeadlocks: number = 0;
  avgSlowQueryRate: number = 0;
  avgStaleQueries: number = 0;

  tooltips: Record<string, string> = {
    qps: "Queries per second; higher means better throughput.",
    stale: "Long-running or inactive queries consuming resources.",
    slow: "Queries exceeding execution time threshold.",
    bufferCache: "Memory hit ratio; higher reduces disk reads.",
    openCursor: "Open cursors; high values may indicate leaks.",
    process: "Database process usage and distribution.",
    connection: "Active and total DB connections.",
    command: "SQL command execution trend over time.",
    locks: "Locks that may block other operations.",
    sessionDetails: "Active vs inactive session breakdown.",
    sessionUtil: "Session usage vs total capacity.",
    userError: "Errors from invalid queries or operations.",
    connectionError: "Failed DB connection attempts.",
    deadlock: "Sessions blocking each other.",
    procedures: "Stored procedure details.",
    functions: "Database function details.",
    packages: "Database package details.",
    locksType: "Lock distribution by type.",
    procExec: "Stored procedure executions count.",
    procError: "Procedure execution errors."
  };

  // INSTANCE

  instanceList: any;
  searchText!: string;
  sortparam: any;
  sortDirection = 'asc';

  // SLOW STATEMENTS
  isSlowStatementLoading: boolean = false;
  isSlowStatementChartLoading: boolean = false;

  statementList: any[] = [];
  filteredStatements: any[] = [];
  pagedStatements: any[] = [];

  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalHitsSlowStatement: number = 0;
  totalPages: number = 0;

  searchQuery!: string;
  sortparam2: any;
  sortDirection2 = 'asc';

  minInput: number | null = null;
  maxInput: number | null = null;
  rangeInput = '';
  ranges: { min: number; max: number }[] = [
    { min: 4, max: 6 },
    { min: 7, max: 9 },
    { min: 10, max: 12 },
    { min: 13, max: 15 },
    { min: 16, max: 18 },
    { min: 19, max: 21 },
    { min: 22, max: 24 }
  ];
  rangeError = '';
  showTableModal = false;
  tableData: any[] = [];
  selectedInterval = '';
  alertTimer: any;

  // LOCK QUERY DETAILS
  isLockQueryDetailsLoading: boolean = false;
  lockQueryDetailsList: any[] = [];
  pagedLockQueries: any[] = [];
  currentPageLock: number = 1;
  itemsPerPageLock: number = 5;
  totalPagesLock: number = 0;
  sortparamLock: any;
  sortDirectionLock = 'asc';

  // ORACLE LOCKS 
  isOracleLocksLoading: boolean = false;
  oracleLocksList: any[] = [];
  filteredOracleLocksList: any[] = [];
  pagedOracleLocks: any[] = [];
  searchTextOracleLocks: string = '';
  currentPageOracleLocks: number = 1;
  itemsPerPageOracleLocks: number = 5;
  totalPagesOracleLocks: number = 0;

  // ORACLE SLOW QUERIES
  isOracleSlowQueriesLoading: boolean = false;
  oracleSlowQueriesList: any[] = [];
  filteredOracleSlowQueriesList: any[] = [];
  pagedOracleSlowQueries: any[] = [];
  searchTextOracleSlowQueries: string = '';
  currentPageOracleSlowQueries: number = 1;
  itemsPerPageOracleSlowQueries: number = 5;
  totalPagesOracleSlowQueries: number = 0;

  // ORACLE INVALID SP
  isOracleInvalidSpLoading: boolean = false;
  oracleInvalidSpList: any[] = [];
  filteredOracleInvalidSpList: any[] = [];
  pagedOracleInvalidSp: any[] = [];
  searchTextOracleInvalidSp: string = '';
  currentPageOracleInvalidSp: number = 1;
  itemsPerPageOracleInvalidSp: number = 5;
  totalPagesOracleInvalidSp: number = 0;


  constructor(
    private dateService: DateService,
    private oracleApiService: OracleApiService,
    private snackBar: MatSnackBar,
    private router: Router,
    private meteringConfigService: MeteringConfigService
  ) { }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.selectedService = sessionStorage.getItem('serviceIdForOracle')!;
    this.entityId = sessionStorage.getItem('encodedServiceIdForOracle')!;
    this.dateService.setActiveComponent('OracleServiceComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'OracleServiceComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.thresholdst = this.formatForThresholdDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        const activeTab = document.querySelector('#service-nav .nav-link.active') as HTMLElement;
        if (activeTab) {
          const tabName = activeTab.getAttribute('href')?.replace('#', '');
          if (tabName) {
            this.loadData(tabName);
          }
        }
      });
  }

  ngAfterViewInit(): void {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
    this.themeObserver?.disconnect();
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  parseTimeBucket(bucket: string): Date {
    const year = +bucket.slice(0, 4);
    const month = +bucket.slice(4, 6) - 1; // 0-based index
    const day = +bucket.slice(6, 8);
    const hour = +bucket.slice(8, 10);
    const minute = +bucket.slice(10, 12);
    return new Date(year, month, day, hour, minute);
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

  loadData(tabName: string): void {
    this.destroy$.next();
    switch (tabName) {
      case 'overview':
        this.getSessionDetails();
        this.getSessionUtilization();
        this.getProcessDetails();
        this.getBufferCacheHitRatio();
        this.getOpenCursor();
        this.getDeadlock();
        this.getUserError();
        this.getConnectionError();
        this.getCurrentQps();
        this.getSlowQueryRate();
        this.getCommandTrend();
        this.getConnectsDetails();
        this.getCombinedData();
        this.getStaleQueryCount();
        this.getLockDetails();
        this.getProceduresDetails();
        this.getFunctionsDetails();
        this.getPackagesDetails();
        this.getLocksByType();
        this.getProcedureExecution();
        this.getProcedureError();
        this.getThreshold();
        break;
      case 'instance':
        this.getInstancesData();
        break;
      case 'slowStatements':
        this.getSlowQueries();
        this.generateChart();
        this.getLockQueryDetails();
        this.getOracleLocks();
        this.getOracleSlowQueries();
        this.getOracleInvalidSp();
        break;
    }
  }

  setServiceId(instanceName: string) {
    const encodedId = `${this.entityId}_${btoa(instanceName)}`;
    sessionStorage.setItem('OracleInstanceServiceId', instanceName);
    sessionStorage.setItem('OracleInstanceEncodedServiceId', encodedId);
    this.router.navigate(['/oracle-monitoring/instance'])
  }

  thresholds: any = {};
  getThreshold() {
    const appId = sessionStorage.getItem('oracleId');
    const payload = {
      appId: appId,
      serviceId: this.entityId,
      st: this.thresholdst,
      et: this.endTime,
      type: "RELATIONAL"
    };
    this.meteringConfigService.getThreshold(payload)
      .subscribe({
        next: (res: any) => {

          if (res && typeof res === 'object' && !Array.isArray(res) && Object.keys(res).length === 0) {
            this.getThresholdsByComponent();
            return;
          }

          if (!res || typeof res !== "object" || Array.isArray(res)) {
            console.error("Invalid threshold response structure:", res);
            return;
          }

          const invalidEntry = Object.values(res).some((item: any) => {
            if (!item || typeof item !== "object") {
              return true;
            }

            const { criticalValue, warningValue, avgBaseline } = item;

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
  }

  getThresholdsByComponent(): void {
    this.meteringConfigService.getThresholdsByComponent(this.entityId, "DB")
      .subscribe({
        next: (data) => {
          this.thresholds = data;
        },
        error: (err) => console.error('Error loading thresholds:', err)
      });
  }

  getThresholdDisplay(metric: string, actualValue: number): { value: number, color: string } {
    if (!this.thresholds || !this.thresholds[metric] || actualValue == null) {
      return { value: 0, color: '#3b82f6' };
    }

    const t = this.thresholds[metric];
    const direction = t.goodDirection; // "HIGH" or "LOW"

    let displayValue = t.warningValue;
    let color = '#3A8754'; // green

    if (direction === 'LOW') {
      // lower is better → higher values are bad
      if (actualValue >= t.criticalValue) {
        displayValue = t.criticalValue;
        color = 'red';
      } else if (actualValue >= t.warningValue) {
        displayValue = t.warningValue;
        color = 'orange';
      }
    }
    else if (direction === 'HIGH') {
      // higher is better → lower values are bad
      if (actualValue < t.criticalValue) {
        displayValue = t.criticalValue;
        color = 'red';
      } else if (actualValue < t.warningValue) {
        displayValue = t.warningValue;
        color = 'orange';
      }
    }

    return { value: displayValue, color };
  }

  getThresholdDisplayChart(metric: string, actualValue: number): { value?: number, color?: string } {
    if (!this.thresholds || !this.thresholds[metric] || actualValue == null) {
      return {}; // <-- no color at all
    }

    const t = this.thresholds[metric];
    const direction = t.goodDirection;

    let displayValue = t.warningValue;
    let color: string | undefined;

    if (direction === 'LOW') {
      if (actualValue >= t.criticalValue) {
        displayValue = t.criticalValue;
        color = 'red';
      } else if (actualValue >= t.warningValue) {
        displayValue = t.warningValue;
        color = 'orange';
      }
    } else if (direction === 'HIGH') {
      if (actualValue < t.criticalValue) {
        displayValue = t.criticalValue;
        color = 'red';
      } else if (actualValue < t.warningValue) {
        displayValue = t.warningValue;
        color = 'orange';
      }
    }

    return { value: displayValue, color };
  }

  getLockQueryDetails(): void {
    this.isLockQueryDetailsLoading = true;
    this.oracleApiService.getLockQueryDetails(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.isLockQueryDetailsLoading = false;
          if (data && data.serviceResponse) {
            this.lockQueryDetailsList = data.serviceResponse;
            this.updatePagedLockQueries();
          } else {
            this.lockQueryDetailsList = [];
            this.pagedLockQueries = [];
          }
        },
        error: (err) => {
          this.isLockQueryDetailsLoading = false;
          console.error("Error fetching lock query details:", err);
          this.lockQueryDetailsList = [];
          this.pagedLockQueries = [];
        }
      });
  }

  updatePagedLockQueries() {
    this.totalPagesLock = Math.ceil(this.lockQueryDetailsList.length / this.itemsPerPageLock);
    const startIndex = (this.currentPageLock - 1) * this.itemsPerPageLock;
    const endIndex = startIndex + this.itemsPerPageLock;
    this.pagedLockQueries = this.lockQueryDetailsList.slice(startIndex, endIndex);
  }

  previousPageLock() {
    if (this.currentPageLock > 1) {
      this.currentPageLock--;
      this.updatePagedLockQueries();
    }
  }

  nextPageLock() {
    if (this.currentPageLock < this.totalPagesLock) {
      this.currentPageLock++;
      this.updatePagedLockQueries();
    }
  }

  goToPageLock(page: string) {
    const pageNumber = parseInt(page, 10);
    if (pageNumber >= 1 && pageNumber <= this.totalPagesLock) {
      this.currentPageLock = pageNumber;
      this.updatePagedLockQueries();
    }
  }

  sortByLock(param: string) {
    this.sortparamLock = param;
    this.sortDirectionLock = this.sortDirectionLock === 'asc' ? 'desc' : 'asc';
  }

  toggleExpandLock(item: any) {
    item.expanded = !item.expanded;
  }


  // COMBINED DATA

  getCombinedData(): void {
    this.oracleApiService.getCombinedData(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.combinedData = data;
      if (this.combinedData.uptime) {
        this.upTime = this.formatUptime(data.uptime);
      }
      else {
        this.upTime = null;
      }
    })
  }

  formatUptime(seconds: number | null | undefined): string {
    if (seconds == null || isNaN(seconds)) {
      return `0d 0h <span class="small-time">0m 0s</span>`;
    }

    let days = Math.floor(seconds / 86400);
    let hours = Math.floor((seconds % 86400) / 3600);
    let minutes = Math.floor((seconds % 3600) / 60);
    let secs = Math.floor(seconds % 60);

    const totalDaysFloat = seconds / 86400;

    // Calculate "since when"
    const endStr = this.endTime.toString();

    // Parse components
    const year = Number(endStr.substring(0, 4));
    const month = Number(endStr.substring(4, 6)) - 1; // JS months = 0-11
    const day = Number(endStr.substring(6, 8));
    const hour = Number(endStr.substring(8, 10));
    const minute = Number(endStr.substring(10, 12));

    // Create end-time with seconds = 59
    const endDate = new Date(year, month, day, hour, minute, 59);

    // Now calculate "since when" from uptime
    const sinceWhenDate = new Date(endDate.getTime() - seconds * 1000);

    // Format as needed
    this.sinceWhenUptime = sinceWhenDate.toLocaleString();

    console.log("Since When : ", this.sinceWhenUptime);

    // ----- FORMAT OUTPUT -----

    let formatted = '';

    if (totalDaysFloat < 1) {
      // Less than 1 day
      formatted = `${hours}h <span class="small-time">${minutes}m ${secs}s</span>`;
    } else if (totalDaysFloat < 30) {
      // Less than a month
      formatted = `${days}d ${hours}h`;
    } else if (totalDaysFloat < 365) {
      // Less than a year
      const months = Math.floor(totalDaysFloat / 30);
      const remDays = Math.floor(totalDaysFloat % 30);
      formatted = `${months}mo ${remDays}d`;
    } else {
      // More than or equal to a year
      const years = Math.floor(totalDaysFloat / 365);
      const months = Math.floor((totalDaysFloat % 365) / 30);
      formatted = `${years}y ${months}mo`;
    }

    return formatted;
  }


  // SESSION

  getSessionDetails(): void {
    this.oracleApiService.getSessionDetails(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getSessionDetailsCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getSessionDetailsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.sessionDetailsCharts) {
          this.sessionDetailsCharts.destroy();
        }

        this.sessionDetailsCharts = Highcharts.chart('sessionDetailsChartsContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.sessionDetailsCharts) {
        this.sessionDetailsCharts.destroy();
      }

      this.sessionDetailsCharts = Highcharts.chart('sessionDetailsChartsContainer', {
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
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.sessionDetailsCharts)) {
        this.charts.push(this.sessionDetailsCharts);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getSessionUtilization(): void {
    let consSum = 0;
    this.oracleApiService.getSessionUtilization(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          data.serviceResponse.forEach((element: (any)) => {
            if (element['session_utilization'] !== null) {
              consSum += element['session_utilization']
            }
          });
          this.avgSessionUtilization = Math.round((consSum / data.serviceResponse.length) * this.roundUpto) / this.roundUpto
          this.getSessionUtilizationCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getSessionUtilizationCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.sessionUtilizationChart) {
          this.sessionUtilizationChart.destroy();
        }

        this.sessionUtilizationChart = Highcharts.chart('sessionUtilizationChartContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const value = d[key];
          const y = value === null || value === undefined || value === '' ? null : Number(value);
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_oracle_session_utilization', y) : {};
          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.sessionUtilizationChart) {
        this.sessionUtilizationChart.destroy();
      }

      const baseline = this.thresholds?.meter_oracle_session_utilization?.avgBaseline || this.avgSessionUtilization;
      this.sessionUtilizationTimestamps = parsedDates.map(date => date.getTime());

      this.sessionUtilizationChart = Highcharts.chart('sessionUtilizationChartContainer', {
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
          tickColor: gridColor,
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
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.sessionUtilizationChart)) {
        this.charts.push(this.sessionUtilizationChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  // PROCESS

  getProcessDetails(): void {
    this.oracleApiService.getProcessDetails(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getProcessDetailsCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getProcessDetailsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.processDetailsChart) {
          this.processDetailsChart.destroy();
        }

        this.processDetailsChart = Highcharts.chart('processDetailsChartContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.processDetailsChart) {
        this.processDetailsChart.destroy();
      }

      this.processDetailsChart = Highcharts.chart('processDetailsChartContainer', {
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
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.processDetailsChart)) {
        this.charts.push(this.processDetailsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  // BUFFER AND CACHE

  getBufferCacheHitRatio(): void {
    let consSum = 0;
    this.oracleApiService.getBufferCacheHitRatio(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          data.serviceResponse.forEach((element: (any)) => {
            if (element['buffer_cache_hit_ratio'] !== null) {
              consSum += element['buffer_cache_hit_ratio']
            }
          });
          this.avgBufferCacheRatio = Math.round((consSum / data.serviceResponse.length) * this.roundUpto) / this.roundUpto
          this.getBufferCacheHitRatioCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getBufferCacheHitRatioCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.bufferCacheHitRatioChart) {
          this.bufferCacheHitRatioChart.destroy();
        }

        this.bufferCacheHitRatioChart = Highcharts.chart('bufferCacheHitRatioChartContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const value = d[key];
          const y = value === null || value === undefined || value === '' ? null : Number(value);
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_oracle_buffer_cache_hit_ratio', y) : {};
          return {
            y,
            color: threshold.color
          };
        })
        
      }));

      if (this.bufferCacheHitRatioChart) {
        this.bufferCacheHitRatioChart.destroy();
      }

      const baseline = this.thresholds?.meter_oracle_buffer_cache_hit_ratio?.avgBaseline || this.avgBufferCacheRatio;
      this.bufferCacheHitRatioTimestamps = parsedDates.map(date => date.getTime());

      this.bufferCacheHitRatioChart = Highcharts.chart('bufferCacheHitRatioChartContainer', {
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
          tickColor: gridColor,
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
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.bufferCacheHitRatioChart)) {
        this.charts.push(this.bufferCacheHitRatioChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getOpenCursor(): void {
    this.oracleApiService.getOpenCursor(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getOpenCursorCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getOpenCursorCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.openCursorChart) {
          this.openCursorChart.destroy();
        }

        this.openCursorChart = Highcharts.chart('openCursorChartContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.openCursorChart) {
        this.openCursorChart.destroy();
      }

      this.openCursorChart = Highcharts.chart('openCursorChartContainer', {
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
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.openCursorChart)) {
        this.charts.push(this.openCursorChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  // ERROR AND DEADLOCK

  getDeadlock(): void {
    let consSum = 0;
    this.oracleApiService.getDeadlock(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          data.serviceResponse.forEach((element: (any)) => {
            if (element['deadlocks'] !== null) {
              consSum += element['deadlocks']
            }
          });
          this.avgDeadlocks = Math.round((consSum / data.serviceResponse.length) * this.roundUpto) / this.roundUpto
          this.getDeadlockCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getDeadlockCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.deadlockChart) {
          this.deadlockChart.destroy();
        }

        this.deadlockChart = Highcharts.chart('deadlockChartContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const value = d[key];
          const y = value === null || value === undefined || value === '' ? null : Number(value);
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_oracle_deadlocks', y) : {};
          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.deadlockChart) {
        this.deadlockChart.destroy();
      }

      const baseline = this.thresholds?.meter_oracle_deadlocks?.avgBaseline || this.avgDeadlocks;
      this.deadlockTimestamps = parsedDates.map(date => date.getTime());

      this.deadlockChart = Highcharts.chart('deadlockChartContainer', {
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
          tickColor: gridColor,
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
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline}</b><br/>`;
            }
            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.deadlockChart)) {
        this.charts.push(this.deadlockChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getUserError(): void {
    let consSum = 0;
    this.oracleApiService.getUserError(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          data.serviceResponse.forEach((element: (any)) => {
            if (element['user_errors'] !== null) {
              consSum += element['user_errors']
            }
          });
          this.avgUserError = Math.round((consSum / data.serviceResponse.length) * this.roundUpto) / this.roundUpto
          this.getUserErrorCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getUserErrorCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.userErrorChart) {
          this.userErrorChart.destroy();
        }

        this.userErrorChart = Highcharts.chart('userErrorChartContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const value = d[key];
          const y = value === null || value === undefined || value === '' ? null : Number(value);
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_oracle_user_errors', y) : {};
          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.userErrorChart) {
        this.userErrorChart.destroy();
      }

      const baseline = this.thresholds?.meter_oracle_user_errors?.avgBaseline || this.avgUserError;
      this.userErrorTimestamps = parsedDates.map(date => date.getTime());

      this.userErrorChart = Highcharts.chart('userErrorChartContainer', {
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
          tickColor: gridColor,
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
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline}</b><br/>`;
            }
            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.userErrorChart)) {
        this.charts.push(this.userErrorChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getConnectionError(): void {
    let consSum = 0;
    this.oracleApiService.getConnectionError(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          data.serviceResponse.forEach((element: (any)) => {
            if (element['connection_errors'] !== null) {
              consSum += element['connection_errors']
            }
          });
          this.avgConnectionError = Math.round((consSum / data.serviceResponse.length) * this.roundUpto) / this.roundUpto
          this.getConnectionErrorCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getConnectionErrorCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.connectionErrorChart) {
          this.connectionErrorChart.destroy();
        }

        this.connectionErrorChart = Highcharts.chart('connectionErrorChartContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const value = d[key];
          const y = value === null || value === undefined || value === '' ? null : Number(value);
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_oracle_connection_errors', y) : {};
          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.connectionErrorChart) {
        this.connectionErrorChart.destroy();
      }
      const baseline = this.thresholds?.meter_oracle_connection_errors?.avgBaseline || this.avgConnectionError;
      this.connectionErrorTimestamps = parsedDates.map(date => date.getTime());

      this.connectionErrorChart = Highcharts.chart('connectionErrorChartContainer', {
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
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline}</b><br/>`;
            }
            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.connectionErrorChart)) {
        this.charts.push(this.connectionErrorChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getCurrentQps(): void {
    this.oracleApiService.getCurrentQps(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getCurrentQpsCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getCurrentQpsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.currentQpsChart) {
          this.currentQpsChart.destroy();
        }

        this.currentQpsChart = Highcharts.chart('currentQpsChartContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const value = d[key];
          const y = value === null || value === undefined || value === '' ? null : Number(value);
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_oracle_qps', y) : {};
          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.currentQpsChart) {
        this.currentQpsChart.destroy();
      }

      const baseline = this.thresholds?.meter_mysql_qps?.avgBaseline || this.combinedData?.avg_qps;

      this.currentQpsTimestamps = parsedDates.map(date => date.getTime());

      this.currentQpsChart = Highcharts.chart('currentQpsChartContainer', {
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
          tickColor: gridColor,
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
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline}</b><br/>`;
            }
            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.currentQpsChart)) {
        this.charts.push(this.currentQpsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getCommandTrend(): void {
    this.oracleApiService.getCommandTrend(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getCommandTrendCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getCommandTrendCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.commandTrendChart) {
          this.commandTrendChart.destroy();
        }

        this.commandTrendChart = Highcharts.chart('commandTrendChartContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.commandTrendChart) {
        this.commandTrendChart.destroy();
      }

      this.commandTrendChart = Highcharts.chart('commandTrendChartContainer', {
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
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.commandTrendChart)) {
        this.charts.push(this.commandTrendChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getSlowQueryRate(): void {
    let consSum = 0;
    this.oracleApiService.getSlowQueryRate(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          data.serviceResponse.forEach((element: (any)) => {
            if (element['connection_errors'] !== null) {
              consSum += element['connection_errors']
            }
          });
          this.avgSlowQueryRate = Math.round((consSum / data.serviceResponse.length) * this.roundUpto) / this.roundUpto
          this.getSlowQueryRateCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getSlowQueryRateCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.slowQueryRateChart) {
          this.slowQueryRateChart.destroy();
        }

        this.slowQueryRateChart = Highcharts.chart('slowQueryRateChartContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const value = d[key];
          const y = value === null || value === undefined || value === '' ? null : Number(value);
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_oracle_slow_queries_count', y) : {};
          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.slowQueryRateChart) {
        this.slowQueryRateChart.destroy();
      }

      const baseline = this.thresholds?.meter_oracle_slow_queries_count?.avgBaseline || this.avgSlowQueryRate;
      this.slowQueryRateTimestamps = parsedDates.map(date => date.getTime());

      this.slowQueryRateChart = Highcharts.chart('slowQueryRateChartContainer', {
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
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline}</b><br/>`;
            }
            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.slowQueryRateChart)) {
        this.charts.push(this.slowQueryRateChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getConnectsDetails(): void {
    this.oracleApiService.getConnectsDetails(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getConnectsDetailsCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getConnectsDetailsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.connectsDetailsChart) {
          this.connectsDetailsChart.destroy();
        }

        this.connectsDetailsChart = Highcharts.chart('connectsDetailsChartContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.connectsDetailsChart) {
        this.connectsDetailsChart.destroy();
      }

      this.connectsDetailsChart = Highcharts.chart('connectsDetailsChartContainer', {
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
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.connectsDetailsChart)) {
        this.charts.push(this.connectsDetailsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getLockDetails(): void {
    this.oracleApiService.getLockDetails(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getLockDetailsCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getLockDetailsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.locksDetailsChart) {
          this.locksDetailsChart.destroy();
        }

        this.locksDetailsChart = Highcharts.chart('locksDetailsChartContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const val = d[key];
          return {
            y: val === null || val === undefined || val === '' ? null : Number(val)
          };

        })
      }));

      if (this.locksDetailsChart) {
        this.locksDetailsChart.destroy();
      }

      this.locksDetailsChart = Highcharts.chart('locksDetailsChartContainer', {
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
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.locksDetailsChart)) {
        this.charts.push(this.locksDetailsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  // DATABASE OBJECTS METRICS

  getProceduresDetails(): void {
    this.oracleApiService.getProceduresDetails(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getProceduresDetailsCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getProceduresDetailsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.proceduresDetailsChart) {
          this.proceduresDetailsChart.destroy();
        }

        this.proceduresDetailsChart = Highcharts.chart('proceduresDetailsChartContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const y = Number(d[key]) || 0;
          return { y };
        })
      }));

      if (this.proceduresDetailsChart) {
        this.proceduresDetailsChart.destroy();
      }

      this.proceduresDetailsChart = Highcharts.chart('proceduresDetailsChartContainer', {
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
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.proceduresDetailsChart)) {
        this.charts.push(this.proceduresDetailsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getFunctionsDetails(): void {
    this.oracleApiService.getFunctionsDetails(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getFunctionsDetailsCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getFunctionsDetailsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.functionsDetailsChart) {
          this.functionsDetailsChart.destroy();
        }

        this.functionsDetailsChart = Highcharts.chart('functionsDetailsChartContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const y = Number(d[key]) || 0;
          return { y };
        })
      }));

      if (this.functionsDetailsChart) {
        this.functionsDetailsChart.destroy();
      }

      this.functionsDetailsChart = Highcharts.chart('functionsDetailsChartContainer', {
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
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.functionsDetailsChart)) {
        this.charts.push(this.functionsDetailsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getPackagesDetails(): void {
    this.oracleApiService.getPackagesDetails(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getPackagesDetailsCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getPackagesDetailsCharts(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.packagesDetailsChart) {
          this.packagesDetailsChart.destroy();
        }

        this.packagesDetailsChart = Highcharts.chart('packagesDetailsChartContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const y = Number(d[key]) || 0;
          return { y };
        })
      }));

      if (this.packagesDetailsChart) {
        this.packagesDetailsChart.destroy();
      }

      this.packagesDetailsChart = Highcharts.chart('packagesDetailsChartContainer', {
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
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.packagesDetailsChart)) {
        this.charts.push(this.packagesDetailsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  // LOCKS, PROCEDURE EXECUTION, AND ERRORS

  getLocksByType(): void {
    this.oracleApiService.getLocksByType(this.entityId, this.startTime.toString(), this.endTime.toString()).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getLocksByTypeChart(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getLocksByTypeChart(data: { lock_type: string; lock_mode: string; lock_count: number }[]): void {
    try {
      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (!data || data.length === 0) {
        if (this.locksByTypeChart) {
          this.locksByTypeChart.destroy();
        }
        this.locksByTypeChart = Highcharts.chart('locksByTypeChartContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          noData: { style: { display: 'none' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      // Aggregate data by lock_type and lock_mode
      const aggregated: { [key: string]: { [mode: string]: number } } = {};
      data.forEach(item => {
        if (!aggregated[item.lock_type]) {
          aggregated[item.lock_type] = {};
        }
        if (!aggregated[item.lock_type][item.lock_mode]) {
          aggregated[item.lock_type][item.lock_mode] = 0;
        }
        aggregated[item.lock_type][item.lock_mode] += item.lock_count;
      });

      // Get unique lock types and modes
      const lockTypes = Object.keys(aggregated).sort();
      const lockModes = Array.from(new Set(data.map(d => d.lock_mode)));

      // Color mapping for lock modes
      const modeColors: { [key: string]: string } = {
        'Exclusive': '#dc3545',
        'Share': '#0d6efd',
        'Row-X': '#fd7e14',
        'Row-S': '#198754',
        'Null': '#6c757d'
      };

      // Create series for each lock mode
      const series: Highcharts.SeriesColumnOptions[] = lockModes.map(mode => ({
        name: mode,
        type: 'column',
        data: lockTypes.map(type => aggregated[type][mode] || 0),
        color: modeColors[mode] || '#6c757d'
      }));

      if (this.locksByTypeChart) {
        this.locksByTypeChart.destroy();
      }

      this.locksByTypeChart = Highcharts.chart('locksByTypeChartContainer', {
        chart: {
          type: 'column',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories: lockTypes,
          title: { text: 'Lock Type', style: { color: labelColor, fontSize: '10px' } },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          title: { text: 'Lock Count', style: { color: labelColor, fontSize: '10px' } },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          stackLabels: {
            enabled: false
          }
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            return `${this.series.name}: ${this.y}`;
          }
        },
        plotOptions: {
          column: {
            stacking: 'normal',
            dataLabels: {
              enabled: false
            }
          }
        },
        legend: {
          enabled: false,
          itemStyle: { color: labelColor, fontSize: '9px' }
        },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getProcedureExecution(): void {
    this.oracleApiService.getProcedureExecution(this.entityId, this.startTime.toString(), this.endTime.toString()).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getProcedureExecutionChart(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getProcedureExecutionChart(data: { owner: string; procedureName: string; value: number }[]): void {
    try {
      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (!data || data.length === 0) {
        if (this.procedureExecutionChart) {
          this.procedureExecutionChart.destroy();
        }
        this.procedureExecutionChart = Highcharts.chart('procedureExecutionChartContainer', {
          chart: { type: 'bar', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          noData: { style: { display: 'none' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      // Aggregate by procedure name (sum values for same procedure)
      const aggregated: { [key: string]: { owner: string; value: number } } = {};
      data.forEach(item => {
        if (!aggregated[item.procedureName]) {
          aggregated[item.procedureName] = { owner: item.owner, value: 0 };
        }
        aggregated[item.procedureName].value += item.value;
      });

      // Convert to array and sort by value descending
      const sortedData = Object.entries(aggregated)
        .map(([name, data]) => ({ procedureName: name, owner: data.owner, value: data.value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10

      const categories = sortedData.map(d => d.procedureName);
      const values = sortedData.map(d => d.value);
      const owners = sortedData.map(d => d.owner);

      // Dynamic color assignment for owners
      const getOwnerColor = (owner: string): string => {
        // Predefined colors for known owners
        const predefinedColors: { [key: string]: string } = {
          'SYS': '#0d6efd',
          'MDSYS': '#6f42c1'
        };

        if (predefinedColors[owner]) {
          return predefinedColors[owner];
        }

        // Generate consistent color for unknown owners using hash
        const colorPalette = [
          '#20c997', // teal
          '#fd7e14', // orange
          '#dc3545', // red
          '#ffc107', // yellow
          '#17a2b8', // cyan
          '#28a745', // green
          '#e83e8c', // pink
          '#6610f2', // indigo
        ];

        // Simple hash function to get consistent index
        let hash = 0;
        for (let i = 0; i < owner.length; i++) {
          hash = owner.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colorPalette.length;
        return colorPalette[index];
      };

      // Group data by owner for separate series
      const uniqueOwners = Array.from(new Set(owners));
      const seriesData: Highcharts.SeriesBarOptions[] = uniqueOwners.map(owner => {
        const ownerData = sortedData.map(d => {
          return d.owner === owner ? d.value : null;
        });

        return {
          name: owner,
          type: 'bar',
          data: ownerData,
          color: getOwnerColor(owner)
        };
      });

      if (this.procedureExecutionChart) {
        this.procedureExecutionChart.destroy();
      }

      this.procedureExecutionChart = Highcharts.chart('procedureExecutionChartContainer', {
        chart: {
          type: 'bar',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories: categories,
          title: { text: '', style: { color: labelColor, fontSize: '10px' } },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          title: { text: 'Execution Count', style: { color: labelColor, fontSize: '10px' } },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function (this: any) {
            return `Owner: ${this.series.name}<br/>Executions: ${this.y}`;
          }
        },
        plotOptions: {
          bar: {
            dataLabels: {
              enabled: true,
              style: { color: labelColor, fontSize: '8px', fontWeight: 'normal' }
            }
          }
        },
        legend: {
          enabled: false,
          itemStyle: { color: labelColor, fontSize: '9px' }
        },
        series: seriesData as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getProcedureError(): void {
    this.oracleApiService.getProcedureError(this.entityId, this.startTime.toString(), this.endTime.toString()).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.getProcedureErrorChart(data);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getProcedureErrorChart(data: { owner?: string; procedureName: string; value: number }[]): void {
    try {
      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (!data || data.length === 0) {
        if (this.procedureErrorChart) {
          this.procedureErrorChart.destroy();
        }
        this.procedureErrorChart = Highcharts.chart('procedureErrorChartContainer', {
          chart: { type: 'bar', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          noData: { style: { display: 'none' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      // Aggregate by procedure name (sum values for same procedure)
      const aggregated: { [key: string]: number } = {};
      data.forEach(item => {
        if (!aggregated[item.procedureName]) {
          aggregated[item.procedureName] = 0;
        }
        aggregated[item.procedureName] += item.value;
      });

      // Convert to array and sort by value descending
      const sortedData = Object.entries(aggregated)
        .map(([name, value]) => ({ procedureName: name, value: value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10

      const categories = sortedData.map(d => d.procedureName);
      const values = sortedData.map(d => d.value);

      if (this.procedureErrorChart) {
        this.procedureErrorChart.destroy();
      }

      this.procedureErrorChart = Highcharts.chart('procedureErrorChartContainer', {
        chart: {
          type: 'bar',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories: categories,
          title: { text: '', style: { color: labelColor, fontSize: '10px' } },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor,
          lineColor: gridColor,
          tickColor: gridColor
        },
        yAxis: {
          min: 0,
          title: { text: 'Error Count', style: { color: labelColor, fontSize: '10px' } },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            return `Errors: ${this.y}`;
          }
        },
        plotOptions: {
          bar: {
            pointWidth: 20,
            dataLabels: {
              enabled: true,
              style: { color: '#fff', fontSize: '9px', fontWeight: 'bold' }
            },
            color: '#dc3545'
          }
        },
        legend: { enabled: false },
        series: [{
          name: 'Error Count',
          type: 'bar',
          data: values
        }] as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getStaleQueryCount(): void {
    let consSum = 0;
    this.oracleApiService.getStaleQueryCount(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          data.serviceResponse.forEach((element: (any)) => {
            if (element['stale_queries'] !== null) {
              consSum += element['stale_queries']
            }
          });
          this.avgStaleQueries = Math.round((consSum / data.serviceResponse.length) * this.roundUpto) / this.roundUpto
          this.getStaleQueryCountCharts(data.serviceResponse);
        } catch (e) {
          console.error("Error occured:", e);
        }
      },
      error: (err) => {
        console.error("API Error:", err);
      }
    });
  }

  getStaleQueryCountCharts(data: { time_bucket: string;[key: string]: any }[]): void {
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

      const hasValidData = data.some(item =>
        keys.some(k => {
          const val = item[k];
          return val !== null && val !== undefined && val !== '';
        })
      );

      if (!hasValidData) {
        if (this.staleQueriesChart) {
          this.staleQueriesChart.destroy();
        }

        this.staleQueriesChart = Highcharts.chart('staleQueriesChartContainer', {
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

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const value = d[key];
          const y = value === null || value === undefined || value === '' ? null : Number(value);
          const threshold = y !== null ? this.getThresholdDisplayChart('meter_oracle_stale_queries', y) : {};
          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.staleQueriesChart) {
        this.staleQueriesChart.destroy();
      }

      const baseline = this.thresholds?.meter_oracle_stale_queries?.avgBaseline || this.avgStaleQueries;
      this.staleQueriesTimestamps = parsedDates.map(date => date.getTime());

      this.staleQueriesChart = Highcharts.chart('staleQueriesChartContainer', {
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
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

            if (baseline !== undefined) {
              s += `<span style="color:#7B4019">●</span> Baseline: <b>${baseline}</b><br/>`;
            }
            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });
      if (!this.charts.includes(this.staleQueriesChart)) {
        this.charts.push(this.staleQueriesChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
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

  // INSTANCE

  getInstancesData(): void {
    this.oracleApiService.getInstancesData(this.entityId, this.startTime, this.endTime, -1, -1).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.instanceList = response.serviceResponse;
      } else {
        this.instanceList = [];
        console.error(response.serviceError);
      }
    })
  }

  sortBy(field: string): void {
    if (this.sortparam === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortparam = field;
      this.sortDirection = 'asc';
    }

    this.instanceList.sort((a: { [x: string]: any; }, b: { [x: string]: any; }) => {
      const valueA = a[field as keyof typeof a];
      const valueB = b[field as keyof typeof b];

      if (valueA == null || valueB == null) return 0;

      let comparison: number;

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        comparison = valueA - valueB;
      } else {
        comparison = valueA.toString().localeCompare(valueB.toString(), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }


  // SLOW STATEMENTS

  toggleExpand(item: any): void {
    item.expanded = !item.expanded;
  }

  onSearch(): void {
    if (this.searchQuery) {
      const query = (this.searchQuery || '').toLowerCase();
      this.filteredStatements = this.statementList.filter((app) =>
        app.name.toLowerCase().includes(query)
      );
    } else {
      this.filteredStatements = [...this.statementList];
    }
    this.calculatePagination();
  }

  getSlowQueries(): void {
    this.isSlowStatementLoading = true;
    this.oracleApiService.getSlowQueries(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const responseData = data;
      if (Array.isArray(responseData)) {
        this.statementList = data.map((row: any) => ({
          ...row,
          expanded: false
        }));
      } else {
        this.statementList = [];
      }
      this.filteredStatements = [...this.statementList];
      this.calculatePagination();
      this.isSlowStatementLoading = false;
    })
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredStatements.length / this.itemsPerPage);
    this.pagedStatements = this.filteredStatements.slice(
      (this.currentPage - 1) * this.itemsPerPage,
      this.currentPage * this.itemsPerPage
    );
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.calculatePagination();
    } else {
      console.log("Error occured");
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.calculatePagination();
    } else {
      console.log("Error occured");
    }
  }

  goToPage(page: any): void {
    this.currentPage = page;
    this.calculatePagination();
  }

  get totalPagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.totalPages <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    } else {
      if (this.currentPage <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPages];
      } else if (this.currentPage >= this.totalPages - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPages - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPage - 1, this.currentPage, this.currentPage + 1, '...', this.totalPages];
      }
    }
    return pages;
  }

  get startIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.statementList.length);
  }

  get endIndex(): number {
    return this.statementList.length;
  }

  sortBy2(field: string): void {
    // Toggle sort direction
    if (this.sortparam2 === field) {
      this.sortDirection2 = this.sortDirection2 === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortparam2 = field;
      this.sortDirection2 = 'asc';
    }

    // Sort the array
    this.filteredStatements.sort((a: { [x: string]: any; }, b: { [x: string]: any; }) => {
      const valueA = a[field as keyof typeof a]; // cast for TS
      const valueB = b[field as keyof typeof b];

      if (valueA == null || valueB == null) return 0;

      let comparison: number;

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        comparison = valueA - valueB;
      } else {
        comparison = valueA.toString().localeCompare(valueB.toString(), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return this.sortDirection2 === 'asc' ? comparison : -comparison;
    });
    this.currentPage = 1;
    this.calculatePagination();
  }

  convertSeconds(sec: number): string {
    if (sec == null || isNaN(sec)) return 'N/A';

    const MINUTE = 60;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
    const MONTH = 30 * DAY;

    if (sec >= MONTH) {
      const months = Math.floor(sec / MONTH);
      const remainingAfterMonths = sec % MONTH;
      const days = Math.floor(remainingAfterMonths / DAY);

      return `${months} month${months > 1 ? 's' : ''} ${days} day${days !== 1 ? 's' : ''}`;
    }

    if (sec >= DAY) {
      const days = Math.floor(sec / DAY);
      const remainingAfterDays = sec % DAY;
      const hours = Math.floor(remainingAfterDays / HOUR);

      return `${days} day${days > 1 ? 's' : ''} ${hours} hr`;
    }

    const hours = Math.floor(sec / HOUR);
    const minutes = Math.floor((sec % HOUR) / MINUTE);

    return `${hours} hr ${minutes} min`;

  }

  // SLOW STATEMENT DURATION

  // addRange(): void {
  //   if (this.minInput == null || this.maxInput == null) {
  //     this.showSnack('Both Min and Max are required');
  //     return;
  //   }

  //   if (this.minInput < 4) {
  //     this.showSnack('Min value must be 4 or greater');
  //     return;
  //   }

  //   if (this.minInput >= this.maxInput) {
  //     this.showSnack('Min must be less than Max');
  //     return;
  //   }

  //   this.ranges.push({
  //     min: this.minInput,
  //     max: this.maxInput
  //   });

  //   this.minInput = null;
  //   this.maxInput = null;
  // }

  addRange(): void {
    if (this.minInput == null || this.maxInput == null) {
      this.showSnack('Both Min and Max are required');
      return;
    }

    if (this.minInput < 4) {
      this.showSnack('Min value must be 4 or greater');
      return;
    }

    if (this.minInput >= this.maxInput) {
      this.showSnack('Min must be less than Max');
      return;
    }

    // 🚫 Duplicate range check
    const isDuplicate = this.ranges.some(
      r => r.min === this.minInput && r.max === this.maxInput
    );

    if (isDuplicate) {
      this.showSnack(`Duplicate duration range not allowed: ${this.minInput}-${this.maxInput}`);
      return;
    }

    // ✅ Add range
    this.ranges.push({
      min: this.minInput,
      max: this.maxInput
    });

    // Reset inputs
    this.minInput = null;
    this.maxInput = null;
  }


  showSnack(message: string): void {
    this.snackBar.open(message, '', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }


  removeRange(index: number): void {
    this.ranges.splice(index, 1);
  }

  generateChart(): void {
    const apiPayload = this.ranges.map(r => ({
      min: r.min,
      max: r.max
    }));

    const missingParams: string[] = [];

    if (!this.entityId) {
      missingParams.push('Service ID');
    }

    if (!this.startTime) {
      missingParams.push('Start Time');
    }

    if (!this.endTime) {
      missingParams.push('End Time');
    }

    if (!apiPayload || apiPayload.length === 0) {
      missingParams.push('Duration Ranges');
    }

    if (missingParams.length) {
      this.showSnack(`Missing parameter(s): ${missingParams.join(', ')}`);
      return;
    }

    this.isSlowStatementChartLoading = true;

    this.oracleApiService.getSlowQueryDurationBuckets(this.entityId, this.startTime, this.endTime, 'count', apiPayload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        try {
          this.isSlowStatementChartLoading = false;
          this.getSlowQueryDurationBucketsCharts(data);
        } catch (err: any) {
          console.error("Error occured:", err);
          const message = err?.error?.serviceResponse || err?.error?.message || 'Something went wrong';
          this.showSnack(message);
          this.isSlowStatementChartLoading = false;
        }
      },
      error: (err) => {
        console.error("API Error:", err);
        const message = err?.error?.serviceResponse || err?.error?.message || 'Something went wrong';
        this.showSnack(message);
        this.isSlowStatementChartLoading = false;
      }
    });
  }

  getSlowQueryDurationBucketsCharts(data: { interval: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'interval' && k !== 'total'))
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.slowQueryDurRange) {
          this.slowQueryDurRange.destroy();
        }

        this.slowQueryDurRange = Highcharts.chart('slowQueryDurRangeContainer', {
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: 'No Data Available', align: 'center', verticalAlign: 'middle', style: { fontSize: '14px', color: noDataColor, fontWeight: '500', letterSpacing: '0.7px' } },
          noData: { style: { display: 'none' } },
          series: [],
          credits: { enabled: false }
        });
        return;
      }

      const categories = data.map(item => (item.interval));

      const series: Highcharts.SeriesColumnOptions[] = keys.map(key => ({
        name: key,
        type: 'column',
        maxPointWidth: 14,
        data: data.map(d => {
          const val = d[key];
          return val === null || val === undefined || val === ''
            ? null
            : Number(val);
        })
      }));

      if (this.slowQueryDurRange) {
        this.slowQueryDurRange.destroy();
      }

      this.slowQueryDurRange = Highcharts.chart('slowQueryDurRangeContainer', {
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
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
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
                click: (event) => { this.onClick(event) }
              }
            }
          }
        }
      });
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  onClick(event: any) {
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
    const viewQueriesOption = document.createElement('div');
    viewQueriesOption.textContent = 'View Queries';
    viewQueriesOption.style.cursor = 'pointer';
    viewQueriesOption.style.fontSize = '12px';
    viewQueriesOption.onclick = () => {
      this.getTableData(event.point.category);
      removeDropdown();
    };

    dropdown.appendChild(viewQueriesOption);
    document.body.appendChild(dropdown);
    const hideDropdown = (e: any) => {
      if (!dropdown.contains(e.target)) {
        removeDropdown();
      }
    };
    setTimeout(() => document.addEventListener('click', hideDropdown), 0);
  }


  getTableData(interval: any): void {
    const [min, max] = interval
      .replace(/[^\d-]/g, '')
      .split('-')
      .map(Number);

    const apiPayload = [
      { min, max }
    ];

    this.oracleApiService.getSlowQueryDurationBuckets(this.entityId, this.startTime, this.endTime, 'queries', apiPayload).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.selectedInterval = interval;
      this.tableData = data[interval] || [];
      this.showTableModal = true;
    })
  }

  getOracleLocks(): void {
    this.isOracleLocksLoading = true;
    this.oracleApiService.getOracleLocks(this.entityId, this.startTime.toString(), this.endTime.toString())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.isOracleLocksLoading = false;
          if (data && (data.serviceStatus === 'Success' || data.serviceStatus === 'SUCCESS')) {
            this.oracleLocksList = data.serviceResponse;
            this.onSearchOracleLocks();
          } else {
            this.oracleLocksList = [];
            this.filteredOracleLocksList = [];
            this.pagedOracleLocks = [];
          }
        },
        error: (err) => {
          this.isOracleLocksLoading = false;
          console.error("Error fetching Oracle Locks:", err);
          this.oracleLocksList = [];
          this.filteredOracleLocksList = [];
          this.pagedOracleLocks = [];
        }
      });
  }

  getOracleSlowQueries(): void {
    this.isOracleSlowQueriesLoading = true;
    this.oracleApiService.getOracleSlowQueries(this.entityId, this.startTime.toString(), this.endTime.toString())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.isOracleSlowQueriesLoading = false;
          if (data && (data.serviceStatus === 'Success' || data.serviceStatus === 'SUCCESS')) {
            this.oracleSlowQueriesList = data.serviceResponse;
            this.onSearchOracleSlowQueries();
          } else {
            this.oracleSlowQueriesList = [];
            this.filteredOracleSlowQueriesList = [];
            this.pagedOracleSlowQueries = [];
          }
        },
        error: (err) => {
          this.isOracleSlowQueriesLoading = false;
          console.error("Error fetching Oracle Slow Queries:", err);
          this.oracleSlowQueriesList = [];
          this.filteredOracleSlowQueriesList = [];
          this.pagedOracleSlowQueries = [];
        }
      });
  }

  getOracleInvalidSp(): void {
    this.isOracleInvalidSpLoading = true;
    this.oracleApiService.getOracleInvalidSp(this.entityId, this.startTime.toString(), this.endTime.toString())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.isOracleInvalidSpLoading = false;
          // Note: Response shows "Success" instead of "SUCCESS" in user example
          if (data && (data.serviceStatus === 'Success' || data.serviceStatus === 'SUCCESS')) {
            this.oracleInvalidSpList = data.serviceResponse;
            this.onSearchOracleInvalidSp();
          } else {
            this.oracleInvalidSpList = [];
            this.filteredOracleInvalidSpList = [];
            this.pagedOracleInvalidSp = [];
          }
        },
        error: (err) => {
          this.isOracleInvalidSpLoading = false;
          console.error("Error fetching Oracle Invalid SP:", err);
          this.oracleInvalidSpList = [];
          this.filteredOracleInvalidSpList = [];
          this.pagedOracleInvalidSp = [];
        }
      });
  }

  // ORACLE LOCKS PAGINATION & SEARCH
  onSearchOracleLocks() {
    this.currentPageOracleLocks = 1;
    if (!this.searchTextOracleLocks) {
      this.filteredOracleLocksList = [...this.oracleLocksList];
    } else {
      const search = this.searchTextOracleLocks.toLowerCase();
      this.filteredOracleLocksList = this.oracleLocksList.filter(item =>
        (item.blocked_event && item.blocked_event.toLowerCase().includes(search)) ||
        (item.blocked_machine && item.blocked_machine.toLowerCase().includes(search)) ||
        (item.blocked_sql && item.blocked_sql.toLowerCase().includes(search)) ||
        (item.blocked_user && item.blocked_user.toLowerCase().includes(search)) ||
        (item.blocking_machine && item.blocking_machine.toLowerCase().includes(search)) ||
        (item.blocking_sql && item.blocking_sql.toLowerCase().includes(search)) ||
        (item.blocking_user && item.blocking_user.toLowerCase().includes(search))
      );
    }
    this.updatePagedOracleLocks();
  }

  updatePagedOracleLocks() {
    this.totalPagesOracleLocks = Math.ceil(this.filteredOracleLocksList.length / this.itemsPerPageOracleLocks);
    const startIndex = (this.currentPageOracleLocks - 1) * this.itemsPerPageOracleLocks;
    const endIndex = startIndex + this.itemsPerPageOracleLocks;
    this.pagedOracleLocks = this.filteredOracleLocksList.slice(startIndex, endIndex);
  }

  previousPageOracleLocks() {
    if (this.currentPageOracleLocks > 1) {
      this.currentPageOracleLocks--;
      this.updatePagedOracleLocks();
    }
  }

  nextPageOracleLocks() {
    if (this.currentPageOracleLocks < this.totalPagesOracleLocks) {
      this.currentPageOracleLocks++;
      this.updatePagedOracleLocks();
    }
  }

  goToPageOracleLocks(page: string | number) {
    const pageNumber = typeof page === 'string' ? parseInt(page, 10) : page;
    if (pageNumber >= 1 && pageNumber <= this.totalPagesOracleLocks) {
      this.currentPageOracleLocks = pageNumber;
      this.updatePagedOracleLocks();
    }
  }

  // ORACLE SLOW QUERIES PAGINATION & SEARCH
  onSearchOracleSlowQueries() {
    this.currentPageOracleSlowQueries = 1;
    if (!this.searchTextOracleSlowQueries) {
      this.filteredOracleSlowQueriesList = [...this.oracleSlowQueriesList];
    } else {
      const search = this.searchTextOracleSlowQueries.toLowerCase();
      this.filteredOracleSlowQueriesList = this.oracleSlowQueriesList.filter(item =>
        (item.sql_text && item.sql_text.toLowerCase().includes(search)) ||
        (item.username && item.username.toLowerCase().includes(search)) ||
        (item.machine && item.machine.toLowerCase().includes(search))
      );
    }
    this.updatePagedOracleSlowQueries();
  }

  updatePagedOracleSlowQueries() {
    this.totalPagesOracleSlowQueries = Math.ceil(this.filteredOracleSlowQueriesList.length / this.itemsPerPageOracleSlowQueries);
    const startIndex = (this.currentPageOracleSlowQueries - 1) * this.itemsPerPageOracleSlowQueries;
    const endIndex = startIndex + this.itemsPerPageOracleSlowQueries;
    this.pagedOracleSlowQueries = this.filteredOracleSlowQueriesList.slice(startIndex, endIndex);
  }

  previousPageOracleSlowQueries() {
    if (this.currentPageOracleSlowQueries > 1) {
      this.currentPageOracleSlowQueries--;
      this.updatePagedOracleSlowQueries();
    }
  }

  nextPageOracleSlowQueries() {
    if (this.currentPageOracleSlowQueries < this.totalPagesOracleSlowQueries) {
      this.currentPageOracleSlowQueries++;
      this.updatePagedOracleSlowQueries();
    }
  }

  goToPageOracleSlowQueries(page: string | number) {
    const pageNumber = typeof page === 'string' ? parseInt(page, 10) : page;
    if (pageNumber >= 1 && pageNumber <= this.totalPagesOracleSlowQueries) {
      this.currentPageOracleSlowQueries = pageNumber;
      this.updatePagedOracleSlowQueries();
    }
  }

  // ORACLE INVALID SP PAGINATION & SEARCH
  onSearchOracleInvalidSp() {
    this.currentPageOracleInvalidSp = 1;
    if (!this.searchTextOracleInvalidSp) {
      this.filteredOracleInvalidSpList = [...this.oracleInvalidSpList];
    } else {
      const search = this.searchTextOracleInvalidSp.toLowerCase();
      this.filteredOracleInvalidSpList = this.oracleInvalidSpList.filter(item =>
        (item.object_name && item.object_name.toLowerCase().includes(search)) ||
        (item.owner && item.owner.toLowerCase().includes(search)) ||
        (item.error_snippet && item.error_snippet.toLowerCase().includes(search))
      );
    }
    this.updatePagedOracleInvalidSp();
  }

  updatePagedOracleInvalidSp() {
    this.totalPagesOracleInvalidSp = Math.ceil(this.filteredOracleInvalidSpList.length / this.itemsPerPageOracleInvalidSp);
    const startIndex = (this.currentPageOracleInvalidSp - 1) * this.itemsPerPageOracleInvalidSp;
    const endIndex = startIndex + this.itemsPerPageOracleInvalidSp;
    this.pagedOracleInvalidSp = this.filteredOracleInvalidSpList.slice(startIndex, endIndex);
  }

  previousPageOracleInvalidSp() {
    if (this.currentPageOracleInvalidSp > 1) {
      this.currentPageOracleInvalidSp--;
      this.updatePagedOracleInvalidSp();
    }
  }

  nextPageOracleInvalidSp() {
    if (this.currentPageOracleInvalidSp < this.totalPagesOracleInvalidSp) {
      this.currentPageOracleInvalidSp++;
      this.updatePagedOracleInvalidSp();
    }
  }

  goToPageOracleInvalidSp(page: string | number) {
    const pageNumber = typeof page === 'string' ? parseInt(page, 10) : page;
    if (pageNumber >= 1 && pageNumber <= this.totalPagesOracleInvalidSp) {
      this.currentPageOracleInvalidSp = pageNumber;
      this.updatePagedOracleInvalidSp();
    }
  }

}
