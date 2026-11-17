import { Component, OnInit, OnDestroy, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import * as Highcharts from 'highcharts';
import { Subject, Subscription } from 'rxjs';
import { filter, switchMap, takeUntil } from 'rxjs/operators';
import { AuthenticationService } from '../../../../../services/authentication.service';
import { DatabaseService } from '../../../../../services/database-api.service';
import { LoggerService } from '../../../../../services/logger.service';
import { ServiceStatus } from '../../../../../models/enums/ServiceStatus';
import { StatusColors } from '../../../../../models/enums/StatusColors';
import { InstanceData, ResponseData } from '../../../../../models/database';
import { MySQLDDLStatement } from '../../../../../models/MySqlDDLStatements';
import { MySQLSlowStatement } from '../../../../../models/MySqlSlowStatements';
import { Session } from '../../../../../models/session';
import { User } from '../../../../../models/user';
import { DateService } from '../../../../../services/date.service';
import { SearchItemPipe } from "../../../../../pipes/search-item.pipe";
import { FormsModule } from '@angular/forms';
// import { SortPipe } from "../../../../pipes/sort.pipe";
import { SortPipe } from "../../../../../pipes/sort.pipe";
import { PaginatePipe } from '../../../../../pipes/paginate.pipe';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { ThresholdService } from '../../../../../services/threshold.service';
import { MeteringConfigService } from '../../../../../services/metering-config.service';

@Component({
  selector: 'app-database-service',
  imports: [CommonModule, SearchItemPipe, FormsModule, SortPipe, RouterModule, MatButtonModule,
    MatTooltipModule, PaginatePipe],
  templateUrl: './mysql-service.component.html',
  styleUrls: ['./mysql-service.component.css']
})
export class MySqlServiceComponent implements OnInit, OnDestroy {
  // Basic 
  themeObserver!: MutationObserver;
  serviceId!: string;
  serviceName!: string;
  currentUser!: User;
  startTime!: number;
  endTime!: number;
  sessionObject: Session = new Session();
  subscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();
  sortparam: any;
  sortDirection = 'asc';
  page: number = 1;
  thresholdst!: number;
  chart_criteria: string | null = 'avg';

  charts: Highcharts.Chart[] = [];

  // For Inspection Tab
  currentQPSdata: ResponseData[] = [];
  currentTPSdata: ResponseData[] = [];
  slowQueriesTrendData: ResponseData[] = [];
  commandTrendData: ResponseData[] = [];
  commandTrendWriteData: ResponseData[] = [];
  trendsData: ResponseData[] = [];
  connectsData: ResponseData[] = [];
  connectionErrorsData: ResponseData[] = [];

  qpsChart: Highcharts.Chart | null = null;
  tpsChart: Highcharts.Chart | null = null;
  slowQueriesChart: Highcharts.Chart | null = null;
  readQueriesChart: Highcharts.Chart | null = null;
  writeQueriesChart: Highcharts.Chart | null = null;
  threadsChart: Highcharts.Chart | null = null;
  connectsChart: Highcharts.Chart | null = null;
  connectionErrorChart: Highcharts.Chart | null = null;

  qpsTimestamps: number[] = [];
  tpsTimestamps: number[] = [];
  slowQueriesTimestamps: number[] = [];
  readQueriesTimestamps: number[] = [];
  writeQueriesTimestamps: number[] = [];
  threadsTimestamps: number[] = [];
  connectsTimestamps: number[] = [];
  connectionErrorTimestamps: number[] = [];

  selectedWriteMetric: 'insert' | 'update' | 'delete' = 'delete';
  selectedThreadsMetric: 'connected' | 'created' | 'cached' | 'running' = 'connected';

  // Graph instances
  graphTrends!: Highcharts.Chart;
  graphConnects!: Highcharts.Chart;
  graphConnectionErrors!: Highcharts.Chart;

  // For Instances Tab
  searchText: string = '';
  instanceList: InstanceData[] = [];

  // For Slow Statements
  databaseSlowStatements: MySQLSlowStatement[] = [];
  // For DDL Statements
  databaseDdlStatements: MySQLDDLStatement[] = [];

  private databaseService = inject(DatabaseService);
  private dateService = inject(DateService);
  private authService = inject(AuthenticationService);
  private router = inject(Router);
  private loggerService = inject(LoggerService);
  private thresholdService = inject(ThresholdService)
  dataSource: any;
  // Pagination
  currentPage: number = 1;
  pageInput: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  // This will hold only the items for the current page

  // This is your filtered/sorted list before pagination
  pagedSlowStatements: any[] = [];
  filteredSlowStatements: MySQLSlowStatement[] = [];
  searchQuery: string = '';

  // Pagination + filtering for DDL Statements
  currentPageDDL: number = 1;
  pageInputDDL: number = 1;
  itemsPerPageDDL: number = 10;
  totalPagesDDL: number = 1;

  pagedDdlStatements: any[] = [];
  filteredDdlStatements: any[] = [];
  searchQueryDDL: string = '';
  thresholds: any = {};
  isSlowQueriesBreached: boolean = false
  isReadQueriesBreached: boolean = false


  sortparamDDL: string = '';
  sortDirectionDDL: 'asc' | 'desc' = 'asc';

  // Lock Queries
  databaseLockQueries: any[] = [];
  currentPageLock: number = 1;
  pageInputLock: number = 1;
  itemsPerPageLock: number = 10;
  totalPagesLock: number = 1;
  pagedLockQueries: any[] = [];
  filteredLockQueries: any[] = [];
  searchQueryLock: string = '';
  sortparamLock: string = '';
  sortDirectionLock: 'asc' | 'desc' = 'asc';
  maxconnected: number = 0
  avgqps: number = 0
  avgtps: number = 0
  roundUpto: number = 1000




  qpsInfo: string = "Queries per Second";
  tpsInfo: string = " Transaction Per Second";
  slowQueriesInfo: string = "Slow Queries Trend , queries per second";
  commandsReadInfo: string = "Commands Trend , Rows Read";
  commandsWriteInfo: string = "Commands Trend , Rows Written";
  threadsInfo: string = "Total Threads Info";
  connectionsInfo: string = "Connections Available And Connections Aborted";
  connectionsErrorsInfo: string = "Connection Errors";
  SystemMetrics: any = {};
  UserGlobthreshold: any = {};
  metricThresholdList: {
    [metricName: string]: {
      warningValue: number;
      criticalValue: number;
    };
  } = {};
  constructor(private meteringConfigService: MeteringConfigService,) {

  }
  ngOnInit(): void {
    this.serviceId = sessionStorage.getItem('encodedDatabaseServiceId')!;
    this.serviceName = sessionStorage.getItem('databaseServiceId')!;
    this.dateService.setActiveComponent('DatabaseServiceComponent');

    this.calculatePagination();

    this.subscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'DatabaseServiceComponent'),
      switchMap(() => this.dateService.date$)
    ).subscribe((datemodel) => {
      this.startTime = this.formatDate(datemodel.startdateTime);
      this.thresholdst = this.formatForThresholdDate(datemodel.startdateTime);

      this.endTime = this.formatDate(datemodel.enddateTime);
      const activeElement = document.querySelector('#database-nav .nav-link.active') as HTMLAnchorElement;
      const activeTab = activeElement?.getAttribute('href')?.replace('#', '');
      if (activeTab) {
        this.loadData(activeTab);
      } else {
        this.loadData('inspections');
      }
    });
  }

  initResize(event: MouseEvent, colIndex: number) {
    event.preventDefault();

    const th = (event.target as HTMLElement).parentElement!;
    const startX = event.pageX;
    const startWidth = th.offsetWidth;

    const mouseMoveHandler = (e: MouseEvent) => {
      const newWidth = startWidth + (e.pageX - startX);
      if (newWidth > 30) { // minimum width limit to prevent too small columns
        th.style.width = newWidth + 'px';
      }
    };

    const mouseUpHandler = () => {
      window.removeEventListener('mousemove', mouseMoveHandler);
      window.removeEventListener('mouseup', mouseUpHandler);
    };

    window.addEventListener('mousemove', mouseMoveHandler);
    window.addEventListener('mouseup', mouseUpHandler);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
  }

  convertTimebucket(timebucket: string) {
    const year = parseInt(timebucket.slice(0, 4), 10);
    const month = parseInt(timebucket.slice(4, 6), 10) - 1;
    const day = parseInt(timebucket.slice(6, 8), 10);
    const hour = parseInt(timebucket.slice(8, 10), 10);
    const minute = parseInt(timebucket.slice(10, 12), 10);
    const date = new Date(Date.UTC(year, month, day, hour, minute));
    return date.getTime();
  }

  parseTimeBucket(bucket: string): Date {
    const year = +bucket.slice(0, 4);
    const month = +bucket.slice(4, 6) - 1;
    const day = +bucket.slice(6, 8);
    const hour = +bucket.slice(8, 10);
    const minute = +bucket.slice(10, 12);
    return new Date(year, month, day, hour, minute);
  }


  formatDate(date: string) {
    date = date.replace(/-/g, '');
    date = date.replace(/:/g, '');
    date = date.replace(' ', '');
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

  loadData(nav: string) {
    switch (nav) {
      case 'inspections':
        this.getThreshold();
        this.loadCurrentQPSgraph();
        this.loadCurrentTPSgraph();
        this.loadSlowQueriesTrendGraph();
        this.loadCommandTrendGraph();
        this.loadTrendsGraph();
        this.loadConnectsGraph();
        this.loadConnectionErrorsGraph();
        // this.getThresholdsByComponent();

        break;
      case 'instances':
        this.loadInstacneData();
        break;
      case 'slow_statements':
        this.loadSlowStatements();
        this.loadDdlStatements();
        this.loadLockQueries();
        break;
      case 'ddl_statements':
        this.loadDdlStatements();
        break;
    }
  }

  onSearchSlowStatements(): void {
    const query = this.searchQuery?.toLowerCase().trim();

    if (query) {
      this.filteredSlowStatements = this.databaseSlowStatements.filter(stmt => {
        return Object.keys(stmt).some((key) => {
          const value = (stmt as any)[key];
          return value != null && value.toString().toLowerCase().includes(query);
        });
      });
    } else {
      this.filteredSlowStatements = [...this.databaseSlowStatements];
    }

    this.currentPage = 1;
    this.pageInput = this.currentPage;
    this.calculatePagination();
  }

  onSearchDdlStatements(): void {
    const query = this.searchQueryDDL?.toLowerCase().trim();

    if (query) {
      this.filteredDdlStatements = this.databaseDdlStatements.filter(stmt => {
        return Object.keys(stmt).some((key) => {
          const value = (stmt as any)[key];
          return value != null && value.toString().toLowerCase().includes(query);
        });
      });
    } else {
      this.filteredDdlStatements = [...this.databaseDdlStatements];
    }

    this.currentPageDDL = 1;
    this.pageInputDDL = 1;
    this.calculatePaginationDDL();
  }

  onSearchLockQueries(): void {
    const query = this.searchQueryLock?.toLowerCase().trim();

    if (query) {
      this.filteredLockQueries = this.databaseLockQueries.filter(stmt => {
        return Object.keys(stmt).some((key) => {
          const value = (stmt as any)[key];
          return value != null && value.toString().toLowerCase().includes(query);
        });
      });
    } else {
      this.filteredLockQueries = [...this.databaseLockQueries];
    }

    this.currentPageLock = 1;
    this.pageInputLock = 1;
    this.calculatePaginationLock();
  }



  // Calculate pagination
  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredSlowStatements.length / this.itemsPerPage) || 1;

    // 🔹 Clamp currentPage_1 so it never exceeds totalPages_1
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    this.pagedSlowStatements = this.filteredSlowStatements.slice(
      (this.currentPage - 1) * this.itemsPerPage,
      this.currentPage * this.itemsPerPage
    );
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.pageInput = --this.currentPage;
      this.calculatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.pageInput = ++this.currentPage;
      this.calculatePagination();
    }
  }

  goToPage(page: any): void {
    let pageNumber = Number(page);

    if (!pageNumber || pageNumber < 1) pageNumber = 1;
    else if (pageNumber > this.totalPages) pageNumber = this.totalPages;
    this.currentPage = pageNumber;
    this.pageInput = pageNumber;
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

  calculatePaginationDDL(): void {
    this.totalPagesDDL = Math.ceil(this.filteredDdlStatements.length / this.itemsPerPageDDL) || 1;

    // 🔹 Clamp currentPage_1 so it never exceeds totalPages_1
    if (this.currentPageDDL > this.totalPagesDDL) {
      this.currentPageDDL = this.totalPagesDDL;
    }
    if (this.currentPageDDL < 1) {
      this.currentPageDDL = 1;
    }

    this.pagedDdlStatements = this.filteredDdlStatements.slice(
      (this.currentPageDDL - 1) * this.itemsPerPageDDL,
      this.currentPageDDL * this.itemsPerPageDDL
    );
  }

  previousPageDDL(): void {
    if (this.currentPageDDL > 1) {
      this.pageInputDDL = --this.currentPageDDL;
      this.calculatePaginationDDL();
    }
  }

  nextPageDDL(): void {
    if (this.currentPageDDL < this.totalPagesDDL) {
      this.pageInputDDL = ++this.currentPageDDL;
      this.calculatePaginationDDL();
    }
  }

  goToPageDDL(page: any): void {
    let pageNumber = Number(page);

    if (!pageNumber || pageNumber < 1) pageNumber = 1;
    else if (pageNumber > this.totalPagesDDL) pageNumber = this.totalPagesDDL;
    this.currentPageDDL = pageNumber;
    this.pageInputDDL = pageNumber;
    this.calculatePaginationDDL();
  }

  get totalPagesArrayDDL(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];

    if (this.totalPagesDDL <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPagesDDL }, (_, i) => i + 1);
    } else {
      if (this.currentPageDDL <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPagesDDL];
      } else if (this.currentPageDDL >= this.totalPagesDDL - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPagesDDL - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPageDDL - 1, this.currentPageDDL, this.currentPageDDL + 1, '...', this.totalPagesDDL];
      }
    }

    return pages;
  }

  calculatePaginationLock(): void {
    this.totalPagesLock = Math.ceil(this.filteredLockQueries.length / this.itemsPerPageLock) || 1;

    if (this.currentPageLock > this.totalPagesLock) {
      this.currentPageLock = this.totalPagesLock;
    }
    if (this.currentPageLock < 1) {
      this.currentPageLock = 1;
    }

    this.pagedLockQueries = this.filteredLockQueries.slice(
      (this.currentPageLock - 1) * this.itemsPerPageLock,
      this.currentPageLock * this.itemsPerPageLock
    );
  }

  previousPageLock(): void {
    if (this.currentPageLock > 1) {
      this.pageInputLock = --this.currentPageLock;
      this.calculatePaginationLock();
    }
  }

  nextPageLock(): void {
    if (this.currentPageLock < this.totalPagesLock) {
      this.pageInputLock = ++this.currentPageLock;
      this.calculatePaginationLock();
    }
  }

  goToPageLock(page: any): void {
    let pageNumber = Number(page);

    if (!pageNumber || pageNumber < 1) pageNumber = 1;
    else if (pageNumber > this.totalPagesLock) pageNumber = this.totalPagesLock;
    this.currentPageLock = pageNumber;
    this.pageInputLock = pageNumber;
    this.calculatePaginationLock();
  }

  get totalPagesArrayLock(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];

    if (this.totalPagesLock <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPagesLock }, (_, i) => i + 1);
    } else {
      if (this.currentPageLock <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPagesLock];
      } else if (this.currentPageLock >= this.totalPagesLock - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPagesLock - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPageLock - 1, this.currentPageLock, this.currentPageLock + 1, '...', this.totalPagesLock];
      }
    }

    return pages;
  }

  getThreshold() {
    const appId = sessionStorage.getItem('mySqlId');
    const payload = {
      appId: appId,
      serviceId: this.serviceId,
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
    this.meteringConfigService.getThresholdsByComponent(this.serviceId, "DB")
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

  loadInstacneData() {
    this.databaseService.getInstanceData(this.serviceId, this.startTime, this.endTime, -1, -1).pipe(takeUntil(this.destroy$)).subscribe((response) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.instanceList = response.serviceResponse;
      } else {
        this.instanceList = [];
        console.error(response.serviceError);
      }
    }, err => this.instanceList = [])
  }

  loadCurrentQPSgraph() {
    let consSum = 0;
    this.databaseService.getServiceCurrentQPS(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.currentQPSdata = response.serviceResponse;
        this.currentQPSdata.forEach(element => {
          if (element['qps'] !== null) {
            consSum += element['qps']
          }
        });
        this.avgqps = Math.round((consSum / this.currentQPSdata.length) * this.roundUpto) / this.roundUpto
      } else {
        this.currentQPSdata = [];
        console.error(response.serviceError);
      }
      this.getQpsChart(this.currentQPSdata);
    }, err => {
      this.currentQPSdata = [];
    });
  }

  getQpsChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      if (!data || data.length === 0) {
        if (this.qpsChart) {
          this.qpsChart.destroy();
          this.qpsChart = null;
        }
        return;
      }

      const keys = ['qps'];

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
        name: 'QPS',
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.3,
        data: data.map(d => {
          const y = Number(d['qps']);
          const threshold = this.getThresholdDisplayChart('meter_mysql_qps', y);

          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.qpsChart) {
        this.qpsChart.destroy();
      }

      const baseline = this.thresholds?.meter_mysql_qps?.avgBaseline;

      this.qpsTimestamps = parsedDates.map(date => date.getTime());

      this.qpsChart = Highcharts.chart('qpsChartContainer', {
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

      if (!this.charts.includes(this.qpsChart)) {
        this.charts.push(this.qpsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  loadCurrentTPSgraph() {
    let consSum = 0;
    this.databaseService.getServiceCurrentTPS(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.currentTPSdata = response.serviceResponse;
        this.currentTPSdata.forEach(element => {
          if (element['tps'] !== null) {
            consSum += element['tps']
          }
        });
        this.avgtps = Math.round((consSum / this.currentTPSdata.length) * this.roundUpto) / this.roundUpto

      } else {
        this.currentTPSdata = [];
        console.error(response.serviceError);
      }
      this.getTpsChart(this.currentTPSdata);
    }, err => {
      this.currentTPSdata = [];
      console.log("Error Occured: ", err);
    });
  }

  getTpsChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      if (!data || data.length === 0) {
        if (this.tpsChart) {
          this.tpsChart.destroy();
          this.tpsChart = null;
        }
        return;
      }

      const keys = ['tps'];

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
        name: 'TPS',
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const y = Number(d['tps']);
          const threshold = this.getThresholdDisplayChart('meter_mysql_tps', y);

          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.tpsChart) {
        this.tpsChart.destroy();
      }

      const baseline = this.thresholds?.meter_mysql_tps?.avgBaseline;

      this.tpsTimestamps = parsedDates.map(date => date.getTime());

      this.tpsChart = Highcharts.chart('tpsChartContainer', {
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

      if (!this.charts.includes(this.tpsChart)) {
        this.charts.push(this.tpsChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  loadSlowQueriesTrendGraph() {
    this.databaseService.getServiceSlowQueriesRate(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.slowQueriesTrendData = response.serviceResponse;
      } else {
        this.slowQueriesTrendData = [];
        console.error(response.serviceError);
      }
      this.getSlowQueriesChart(this.slowQueriesTrendData);
    }, err => {
      this.slowQueriesTrendData = [];
      console.log("Error Occured: ", err);
    });
  }

  getSlowQueriesChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      if (!data || data.length === 0) {
        if (this.slowQueriesChart) {
          this.slowQueriesChart.destroy();
          this.slowQueriesChart = null;
        }
        return;
      }

      const keys = ['slow_queries_rate'];

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
        name: 'Slow Query Rate',
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        data: data.map(d => {
          const y = Number(d['slow_queries_rate']);
          const threshold = this.getThresholdDisplayChart('meter_mysql_slow_queries_rate', y);

          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.slowQueriesChart) {
        this.slowQueriesChart.destroy();
      }

      const baseline = this.thresholds?.meter_mysql_slow_queries_rate?.avgBaseline;

      this.slowQueriesTimestamps = parsedDates.map(date => date.getTime());

      this.slowQueriesChart = Highcharts.chart('slowQueriesChartContainer', {
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

      if (!this.charts.includes(this.slowQueriesChart)) {
        this.charts.push(this.slowQueriesChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  loadCommandTrendGraph() {
    this.databaseService.getServiceCommandTrends(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) {
            // Separate select_rate (read) and others (write)
            this.commandTrendData = response.serviceResponse.map(item => ({
              time_bucket: item.time_bucket,
              select_rate: item['select_rate']
            }));

            this.commandTrendWriteData = response.serviceResponse.map(item => ({
              time_bucket: item.time_bucket,
              insert_rate: item['insert_rate'],
              delete_rate: item['delete_rate'],
              update_rate: item['update_rate'],
            }));

          } else {
            this.commandTrendData = [];
            this.commandTrendWriteData = [];
            console.error(response.serviceError);
          }

          // Initialize both graphs
          this.getReadQueriesChart(this.commandTrendData);
          this.getWriteQueriesChart(this.commandTrendWriteData);
        },
        error: (err) => {
          this.commandTrendData = [];
          this.commandTrendWriteData = [];
          console.log("Error Occured: ", err);
        }
      });
  }

  getReadQueriesChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      if (!data || data.length === 0) {
        if (this.readQueriesChart) {
          this.readQueriesChart.destroy();
          this.readQueriesChart = null;
        }
        return;
      }

      const keys = ['select_rate'];

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
        name: 'Read Query Trend',
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.3,
        data: data.map(d => {
          const y = Number(d['select_rate']);
          const threshold = this.getThresholdDisplayChart('meter_mysql_commands_select_rate', y);

          return {
            y,
            color: threshold.color
          };
        })
      }));

      if (this.readQueriesChart) {
        this.readQueriesChart.destroy();
      }

      const baseline = this.thresholds?.meter_mysql_commands_select_rate?.avgBaseline;

      this.readQueriesTimestamps = parsedDates.map(date => date.getTime());

      this.readQueriesChart = Highcharts.chart('readQueriesChartContainer', {
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

      if (!this.charts.includes(this.readQueriesChart)) {
        this.charts.push(this.readQueriesChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getWriteMetricKey(): string {
    switch (this.selectedWriteMetric) {
      case 'insert':
        return 'meter_mysql_commands_insert_rate';
      case 'update':
        return 'meter_mysql_commands_update_rate';
      case 'delete':
      default:
        return 'meter_mysql_commands_delete_rate';
    }
  }

  getWriteQueriesChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      if (!data || data.length === 0) {
        if (this.writeQueriesChart) {
          this.writeQueriesChart.destroy();
          this.writeQueriesChart = null;
        }
        return;
      }

      type WriteMetric = 'insert_rate' | 'update_rate' | 'delete_rate';

      const keys: WriteMetric[] = ['insert_rate', 'update_rate', 'delete_rate'];

      const metricMap: Record<WriteMetric, string> = {
        insert_rate: 'meter_mysql_commands_insert_rate',
        update_rate: 'meter_mysql_commands_update_rate',
        delete_rate: 'meter_mysql_commands_delete_rate'
      };

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
        name:
          key === 'insert_rate' ? 'Insert' :
            key === 'update_rate' ? 'Update' :
              'Delete',
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.3,
        data: data.map(d => {
          const y = Number(d[key]);

          if (isNaN(y)) return null;

          const threshold = this.getThresholdDisplayChart(metricMap[key], y);

          return {
            y,
            color: threshold?.color // undefined → default color
          };
        }).filter(Boolean) as Highcharts.PointOptionsObject[]
      }));

      if (this.writeQueriesChart) {
        this.writeQueriesChart.destroy();
      }

      this.writeQueriesTimestamps = parsedDates.map(date => date.getTime());

      this.writeQueriesChart = Highcharts.chart('writeQueriesChartContainer', {
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
          gridLineColor: gridColor
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

            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });

      if (!this.charts.includes(this.writeQueriesChart)) {
        this.charts.push(this.writeQueriesChart);
        this.syncCharts(this.charts);
      }

    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  loadTrendsGraph() {
    let max = 0;
    this.databaseService.getServiceThreads(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.trendsData = response.serviceResponse;
        this.trendsData.forEach(element => {
          if (element['threads_connected'] !== null && element['threads_connected'] > max) {
            max = element['threads_connected']
          }
        });
        this.maxconnected = max;

      } else {
        this.trendsData = [];
        console.error(response.serviceError);
      }
      this.getThreadsChart(this.trendsData);
    }, err => {
      this.trendsData = [];
      if (this.graphTrends) {
        this.graphTrends.destroy();
      }
    });
  }

  getThreadsMetricKey(): string {
    switch (this.selectedThreadsMetric) {
      case 'connected':
        return 'meter_mysql_threads_connected';
      case 'created':
        return 'meter_mysql_threads_created';
      case 'cached':
        return 'meter_mysql_threads_cached';
      case 'running':
      default:
        return 'meter_mysql_threads_running';
    }
  }

  getThreadsChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      if (!data || data.length === 0) {
        if (this.threadsChart) {
          this.threadsChart.destroy();
          this.threadsChart = null;
        }
        return;
      }

      type WriteMetric = 'threads_connected' | 'threads_created' | 'threads_cached' | 'threads_running';

      const keys: WriteMetric[] = ['threads_connected', 'threads_created', 'threads_cached', 'threads_running'];

      const metricMap: Record<WriteMetric, string> = {
        threads_connected: 'meter_mysql_threads_connected',
        threads_created: 'meter_mysql_threads_created',
        threads_cached: 'meter_mysql_threads_cached',
        threads_running: 'meter_mysql_threads_running'
      };

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
        name:
          key === 'threads_connected' ? 'Connected' :
            key === 'threads_created' ? 'Created' :
              key === 'threads_cached' ? 'Cached' :
              'Running',
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.3,
        data: data.map(d => {
          const y = Number(d[key]);

          if (isNaN(y)) return null;

          const threshold = this.getThresholdDisplayChart(metricMap[key], y);

          return {
            y,
            color: threshold?.color
          };
        }).filter(Boolean) as Highcharts.PointOptionsObject[]
      }));

      if (this.threadsChart) {
        this.threadsChart.destroy();
      }

      this.threadsTimestamps = parsedDates.map(date => date.getTime());

      this.threadsChart = Highcharts.chart('threadsChartContainer', {
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
          gridLineColor: gridColor
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

            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });

      if (!this.charts.includes(this.threadsChart)) {
        this.charts.push(this.threadsChart);
        this.syncCharts(this.charts);
      }

    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  loadConnectsGraph() {
    this.databaseService.getServiceConnects(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.connectsData = response.serviceResponse;
      } else {
        this.connectsData = [];
        console.error(response.serviceError);
      }
      this.getConnectsChart(this.connectsData);
    }, err => {
      this.connectsData = [];
      if (this.graphConnects) {
        this.graphConnects.destroy();
      }
    });
  }

  getConnectsChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      if (!data || data.length === 0) {
        if (this.connectsChart) {
          this.connectsChart.destroy();
          this.connectsChart = null;
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

      const keys = ['connects_available', 'connects_aborted'];

      const series: Highcharts.SeriesAreasplineOptions[] = keys.map(key => ({
        name:
          key === 'connects_available' ? 'Available' :
            key === 'connects_aborted' ? 'Aborted' :
              key,
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.3,
        data: data.map(d => {
          const y = Number(d[key]);
          return isNaN(y) ? null : y;
        })
      }));

      if (this.connectsChart) {
        this.connectsChart.destroy();
      }

      this.threadsTimestamps = parsedDates.map(date => date.getTime());

      this.connectsChart = Highcharts.chart('connectsChartContainer', {
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
            y: 10
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
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            const categories = this.series.chart.xAxis[0].categories;
            let s = `<b>${categories[this.x]}</b><br/>`;

            this.points?.forEach(point => {
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

            return s;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });

      if (!this.charts.includes(this.connectsChart)) {
        this.charts.push(this.connectsChart);
        this.syncCharts(this.charts);
      }

    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  loadConnectionErrorsGraph() {
    this.databaseService.getServiceConnectionErrors(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.connectionErrorsData = response.serviceResponse;
      } else {
        this.connectionErrorsData = [];
        console.error(response.serviceError);
      }
      this.getConnectionErrorChart(this.connectionErrorsData);
    }, err => {
      this.connectionErrorsData = [];
      if (this.graphConnectionErrors) {
        this.graphConnectionErrors.destroy();
      }
    });
  }

  getConnectionErrorChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      if (!data || data.length === 0) {
        if (this.connectionErrorChart) {
          this.connectionErrorChart.destroy();
          this.connectionErrorChart = null;
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

      const keys = ['internal', 'max_connections', 'accept', 'tcpwrap'];

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name:
          key === 'internal' ? 'Internal Error' : key === 'max_connections' ? 'Max Conn.' : key === 'accept' ? 'Accept Error' : key === 'tcpwrap' ? 'TCP Warp Error' : key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.3,
        data: data.map(d => {
          const y = Number(d[key]);
          return isNaN(y) ? null : y;
        })
      }));

      if (this.connectionErrorChart) {
        this.connectionErrorChart.destroy();
      }

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
            y: 10
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
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            const categories = this.series.chart.xAxis[0].categories;
            let s = `<b>${categories[this.x]}</b><br/>`;

            this.points?.forEach(point => {
              s += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b><br/>`;
            });

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

  getSeriesData(responseData: ResponseData[]) {
    const series: any = {};
    responseData.forEach(graphData => {
      const time_bucket = this.convertTimebucket(graphData.time_bucket);
      Object.keys(graphData).forEach(key => {
        if (key != 'time_bucket') {
          if (!series[key]) {
            series[key] = []
          }
          series[key].push({
            x: time_bucket,
            y: graphData[key]
          });
        }
      });
    });
    const seriesData = Object.keys(series).map(key => {
      return {
        name: key.replace(/_/g, ' '),
        data: series[key],
        marker: {
          radius: 2
        }
      }
    })
    return seriesData;
  }
  // getChartOption(chartType: string, chartId: string, seriesData: any[]): Highcharts.Options {
  //   const styles = getComputedStyle(document.body);
  //   const labelColor = styles.getPropertyValue('--text-color').trim();
  //   const gridColor = styles.getPropertyValue('--border-color').trim();
  //   const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
  //   const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
  //   return {
  //     chart: {
  //       showAxes: true,
  //       type: chartType,
  //       backgroundColor: 'transparent',
  //       renderTo: chartId,

  //     },
  //     title: {
  //       text: ''
  //     },
  //     credits: {
  //       enabled: false
  //     },
  //     exporting: {
  //       enabled: false
  //     },
  //     legend: {
  //       enabled: false,
  //       align: 'center',
  //       verticalAlign: 'top',
  //       layout: 'horizontal',
  //       itemStyle: {
  //         fontSize: '8px'
  //       }
  //     },
  //     xAxis: {
  //       type: 'datetime',
  //       title: {
  //         text: ''
  //       },
  //       labels: {
  //         style: {
  //           color: labelColor,
  //           fontSize: '8px'
  //         }
  //       },
  //       lineColor: gridColor,
  //       tickLength: 0,
  //       gridLineColor: gridColor
  //     },
  //     yAxis: {
  //       min: 0,
  //       max: baseline > maxvalue ? baseline : maxvalue,
  //       tickAmount: 6,
  //       title: {
  //         text: ''
  //       },
  //       labels: {
  //         style: {
  //           color: labelColor,
  //           fontSize: '8px'
  //         }
  //       },
  //       lineColor: labelColor,
  //       tickColor: labelColor,
  //       gridLineColor: gridColor,
  //       gridLineWidth: 0.5,
  //       // endOnTick: false,
  //       // startOnTick: true,
  //       plotLines: [
  //         {
  //           value: baseline ?? 1000,

  //           color: '#a78a7f',
  //           width: 2,
  //           dashStyle: 'Dash',
  //           zIndex: 5,
  //           label: {
  //             align: 'right',
  //             style: {
  //               color: 'red',
  //               fontSize: '9px'
  //             }
  //           }
  //         }
  //       ]
  //     },
  //     tooltip: {
  //       shared: true,
  //       useHTML: true,
  //       backgroundColor: tooltipBgColor,
  //       style: {
  //         // whiteSpace: 'wrap',
  //         color: tooltipTextColor,
  //         fontSize: '10px'
  //       }
  //       // formatter: function () {
  //       //   let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
  //       //   this.points?.forEach((point: any) => {
  //       //     tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b> ${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
  //       //   });
  //       //   tooltipContent += '</ul>';
  //       //   return tooltipContent;
  //       // }
  //     },
  //     series: seriesData
  //   };
  // }

  getChartOption(chartType: string, chartId: string, seriesData: any[], baseline?: number, thresholds?: any, metric?: string): Highcharts.Options {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();


    return {
      chart: {
        showAxes: true,
        type: chartType,
        backgroundColor: 'transparent',
        renderTo: chartId
      },
      title: { text: '' },
      credits: { enabled: false },
      exporting: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        type: 'datetime',
        title: { text: '' },
        labels: { style: { color: labelColor, fontSize: '8px' } },
        lineColor: gridColor,
        tickLength: 0,
        gridLineColor: gridColor
      },
      yAxis: {
        min: 0,
        max: baseline ? Math.max(baseline, ...seriesData.map(s => Math.max(...s.data.map((p: any) => p.y ?? 0)))) : undefined,
        tickAmount: 6,
        title: { text: '' },
        labels: { style: { color: labelColor, fontSize: '8px' } },
        lineColor: labelColor,
        tickColor: labelColor,
        gridLineColor: gridColor,
        gridLineWidth: 0.5,
        plotLines: baseline ? [
          {
            value: baseline,
            color: '#a78a7f',
            width: 2,
            dashStyle: 'Dash',
            zIndex: 5,
            label: {
              align: 'right',
              style: { color: 'red', fontSize: '9px' },
              text: ''
            }
          }
        ] : []
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: tooltipBgColor,
        style: { color: tooltipTextColor, fontSize: '10px' }
      },
      series: seriesData,
    };
  }


  // loadSlowStatements() {
  //   this.databaseService.getServiceSlowStatements(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe(response => {
  //     if (response.serviceStatus == ServiceStatus.SUCCESS) {
  //       // Add originalIndex to each item here
  //       this.databaseSlowStatements = response.serviceResponse.map((item, index) => ({
  //         ...item,
  //         originalIndex: index + 1  // 1-based index
  //       }));
  //     } else {
  //       this.databaseSlowStatements = [];
  //     }
  //   }, err => {
  //     this.databaseSlowStatements = [];
  //   });
  // }

  loadSlowStatements() {
    this.databaseService
      .getServiceSlowStatements(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        response => {
          if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) {
            // Add originalIndex
            this.databaseSlowStatements = response.serviceResponse.map((item, index) => ({
              ...item,
              originalIndex: index + 1
            }));
          } else {
            this.databaseSlowStatements = [];
          }

          // Always sync filtered data with the latest fetch
          this.filteredSlowStatements = [...this.databaseSlowStatements];

          // Reset page to 1
          this.currentPage = 1;
          this.pageInput = 1;

          // Recalculate pagination
          this.calculatePagination();
        },
        err => {
          this.databaseSlowStatements = [];
          this.filteredSlowStatements = [];
          this.pagedSlowStatements = [];
          this.totalPages = 1;
        }
      );
  }


  // loadDdlStatements() {
  //   this.databaseService.getServiceDdlStatements(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe(response => {
  //     if (response.serviceStatus === ServiceStatus.SUCCESS) {
  //       this.databaseDdlStatements = response.serviceResponse;
  //     } else {
  //       this.databaseDdlStatements = [];
  //     }
  //   }, err => {
  //     this.databaseDdlStatements = [];
  //   })
  // }

  loadDdlStatements() {
    this.databaseService.getServiceDdlStatements(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        response => {
          if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) {
            // Add Sr. No index
            this.databaseDdlStatements = response.serviceResponse.map((item, index) => ({
              ...item,
              originalIndex: index + 1
            }));
          } else {
            this.databaseDdlStatements = [];
          }

          // Always sync filtered data
          this.filteredDdlStatements = [...this.databaseDdlStatements];

          // Reset pagination
          this.currentPageDDL = 1;
          this.pageInputDDL = 1;

          this.calculatePaginationDDL();
        },
        err => {
          this.databaseDdlStatements = [];
          this.filteredDdlStatements = [];
          this.pagedDdlStatements = [];
          this.totalPagesDDL = 1;
        }
      );
  }

  loadLockQueries() {
    this.databaseService.getServiceLockQueries(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        response => {
          if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) {
            this.databaseLockQueries = response.serviceResponse.map((item, index) => ({
              ...item,
              originalIndex: index + 1
            }));
          } else {
            this.databaseLockQueries = [];
          }

          this.filteredLockQueries = [...this.databaseLockQueries];
          this.currentPageLock = 1;
          this.pageInputLock = 1;
          this.calculatePaginationLock();
        },
        err => {
          this.databaseLockQueries = [];
          this.filteredLockQueries = [];
          this.pagedLockQueries = [];
          this.totalPagesLock = 1;
        }
      );
  }

  setServiceInstance(instanceName: string) {
    const encodedId = this.serviceId + '_' + btoa(instanceName);
    sessionStorage.setItem('databaseInstanceId', instanceName);
    sessionStorage.setItem('encodedDatabaseInstanceId', encodedId);
    this.router.navigate(['/database/instance']);
  }

  sortBy(field: string): void {
    if (this.sortparam === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortparam = field;
      this.sortDirection = 'asc';
    }

    this.databaseSlowStatements.sort((a, b) => {
      const valueA = a[field as keyof typeof a];
      const valueB = b[field as keyof typeof b];

      if (valueA == null) return 1;
      if (valueB == null) return -1;
      if (valueA === valueB) return 0;

      let comparison: number;
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        comparison = valueA - valueB;
      } else {
        comparison = String(valueA).localeCompare(String(valueB), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    // Re-apply search to update filteredSlowStatements and recalculate pagination
    this.onSearchSlowStatements();
  }

  sortByDDL(field: string): void {
    if (this.sortparamDDL === field) {
      this.sortDirectionDDL = this.sortDirectionDDL === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortparamDDL = field;
      this.sortDirectionDDL = 'asc';
    }

    this.databaseDdlStatements.sort((a: any, b: any) => {
      const valueA = a[field];
      const valueB = b[field];

      if (valueA == null) return 1;
      if (valueB == null) return -1;
      if (valueA === valueB) return 0;

      let comparison: number;
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        comparison = valueA - valueB;
      } else {
        comparison = String(valueA).localeCompare(String(valueB), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return this.sortDirectionDDL === 'asc' ? comparison : -comparison;
    });

    // Re-apply search to update filteredDdlStatements and recalculate pagination
    this.onSearchDdlStatements();
  }

  sortByLock(field: string): void {
    if (this.sortparamLock === field) {
      this.sortDirectionLock = this.sortDirectionLock === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortparamLock = field;
      this.sortDirectionLock = 'asc';
    }

    this.databaseLockQueries.sort((a: any, b: any) => {
      const valueA = a[field];
      const valueB = b[field];

      if (valueA == null) return 1;
      if (valueB == null) return -1;
      if (valueA === valueB) return 0;

      let comparison: number;
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        comparison = valueA - valueB;
      } else {
        comparison = String(valueA).localeCompare(String(valueB), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return this.sortDirectionLock === 'asc' ? comparison : -comparison;
    });

    this.onSearchLockQueries();
  }


  pageChange($event: number) {
    this.page = $event;
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

}