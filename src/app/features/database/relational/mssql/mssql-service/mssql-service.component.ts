import { Component, inject, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import * as Highcharts from 'highcharts';
import { Subject, Subscription } from 'rxjs';
import { filter, switchMap, takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '../../../../../services/authentication.service';
import { DatabaseService } from '../../../../../services/database-api.service';
import { LoggerService } from '../../../../../services/logger.service';
import { ServiceStatus } from '../../../../../models/enums/ServiceStatus';
import { StatusColors } from '../../../../../models/enums/StatusColors';
import { ResponseData } from '../../../../../models/database';
import { MsSqlSlowStatements } from '../../../../../models/MsSqlSlowStatements';
import { Session } from '../../../../../models/session';
import { User } from '../../../../../models/user';
import { DateService } from '../../../../../services/date.service';
import { InstanceData } from '../../../../../models/database';
import { SearchItemPipe } from "../../../../../pipes/search-item.pipe";
import { SortPipe } from "../../../../../pipes/sort.pipe";
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MeteringConfigService } from '../../../../../services/metering-config.service';
// Initialize any extra Highcharts modules if needed
// More(Highcharts);

@Component({
    selector: 'app-mssql-service',
    imports: [CommonModule, SearchItemPipe, SortPipe, FormsModule, RouterModule, MatButtonModule, MatTooltipModule],
    templateUrl: './mssql-service.component.html',
    styleUrls: ['./mssql-service.component.css']
})
export class MssqlServiceComponent implements OnInit, OnDestroy {
  // themeObserver!: MutationObserver;
  private themeObserver: MutationObserver | undefined;

  private databaseService = inject(DatabaseService);
  private dateService = inject(DateService);
  private authService = inject(AuthenticationService);
  private router = inject(Router);
  private loggerService = inject(LoggerService);
  private meteringConfigService = inject(MeteringConfigService);

  serviceId!: string;
  serviceName!: string;
  currentUser!: User;
  startTime!: number;
  endTime!: number;
  sessionObject: Session = new Session();
  sortparam: any;
  sortDirection = 'asc';
  page: number = 1;

  currentQPSdata: ResponseData[] = [];
  currentTPSdata: ResponseData[] = [];
  slowQueriesTrendData: ResponseData[] = [];
  commandTrendData: ResponseData[] = [];
  commandTrendWriteData: ResponseData[] = [];
  trendsData: ResponseData[] = [];
  connectsData: ResponseData[] = [];
  connectionErrorsData: ResponseData[] = [];
  instanceList: InstanceData[] = [];
  databaseSlowStatements: MsSqlSlowStatements[] = [];

  graphCurrentQPS: Highcharts.Chart | null = null;
  graphCurrentTPS: Highcharts.Chart | null = null;
  graphSlowQueriesTrend: Highcharts.Chart | null = null;
  graphCommandTrend: Highcharts.Chart | null = null;
  graphCommandTrendWrite: Highcharts.Chart | null = null;
  graphTrends: Highcharts.Chart | null = null;
  graphConnects: Highcharts.Chart | null = null;
  graphConnectionErrors: Highcharts.Chart | null = null;

  private destroy$ = new Subject<void>();
  searchText!: string;
  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();
  datemodel: any;
  isResizing = false;
  isThemeChanged = false;
  img_dark = "assets/images/MsSql_dark.png";
  img_light = "assets/images/MsSql_light.png";

  qpsInfo ="Batch Requests measures the number of SQL statement batches submitted to the SQL Server per second. Higher values indicate increased database workload.";
tpsInfo: string = " Transaction Per Second";
slowQueriesInfo ="Displays the number of SQL queries that exceed the configured slow query threshold per second. Higher values may indicate inefficient queries or increased database workload.";
commandsReadInfo ="Displays the number of index seeks, scans, and lookups performed per second. Higher values indicate increased index activity due to query execution.";
commandsWriteInfo =
  "Displays the number of leaf-level index insert, update, and delete operations performed per second. Higher values indicate increased index write activity.";
threadsInfo: string = "Total Threads Info";
connectionsInfo: string = "Connections Available And Connections Aborted";
connectionsErrorsInfo: string = "Connection Errors";

// Pagination
  currentPage: number = 1;
  pageInput: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  // This will hold only the items for the current page

  // This is your filtered/sorted list before pagination
  pagedSlowStatements: any[] = [];
  filteredSlowStatements: MsSqlSlowStatements[] = [];
  searchQuery: string = '';

  maxconnected: number = 0
  avgqps: number = 0
  avgtps: number = 0
  roundUpto : number = 1000
  thresholds: any = {};
  thresholdst!: number;
  chart_criteria_qps: string | null = 'avg';
  chart_criteria_slowQueries: string | null = 'avg';
  chart_criteria_readQuery: string | null = 'avg';
  isQpsBreached: boolean = false
  isSlowQueriesBreached: boolean = false
  isReadQueriesBreached: boolean = false

  // MSSQL SP ERRORS
  isMssqlSpErrorsLoading: boolean = false;
  mssqlSpErrorsList: any[] = [];
  filteredMssqlSpErrorsList: any[] = [];
  pagedMssqlSpErrors: any[] = [];
  searchTextMssqlSpErrors: string = '';
  currentPageMssqlSpErrors: number = 1;
  itemsPerPageMssqlSpErrors: number = 5;
  totalPagesMssqlSpErrors: number = 0;
  sortParamMssqlSpErrors: string = '';
  sortDirectionMssqlSpErrors: string = 'asc';

  // MSSQL DEADLOCKS
  isMssqlDeadlocksLoading: boolean = false;
  mssqlDeadlocksList: any[] = [];
  filteredMssqlDeadlocksList: any[] = [];
  pagedMssqlDeadlocks: any[] = [];
  searchTextMssqlDeadlocks: string = '';
  currentPageMssqlDeadlocks: number = 1;
  itemsPerPageMssqlDeadlocks: number = 5;
  totalPagesMssqlDeadlocks: number = 0;
  sortParamMssqlDeadlocks: string = '';
  sortDirectionMssqlDeadlocks: string = 'asc';




  // ngOnInit(): void {
  //   // this.themeObserver = new MutationObserver(() => {
  //   //   this.refreshAllCharts();
  //   // });
  //   // this.themeObserver.observe(document.body, {
  //   //   attributes: true,
  //   //   attributeFilter: ['data-theme', 'theme-switch']
  //   // });
  //   this.serviceId = sessionStorage.getItem('encodedDatabaseServiceId') ?? '';
  //   this.serviceName = sessionStorage.getItem('databaseServiceId') ?? '';
  //   this.dateService.setActiveComponent('MssqlServiceComponent');

  //   // this.authService.currentUser
  //   //   .pipe(takeUntil(this.destroy$))
  //   //   .subscribe(user => {
  //   //     this.currentUser = user;
  //   //   });
  //   this.currentUser.sessionDTO = this.sessionObject;
  //   this.sessionObject.featureName = 'Database';
  //   this.sessionObject.requestURI = this.router.url.split('?')[0];
  //   this.sessionObject.userId = this.currentUser.userId;
  //   this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
  //   this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
  //   this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
  //   this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;
  //   this.observeThemeChange();
  //   this.datesubscription=this.dateService.activeComponent$.pipe(
  //       filter(activeComponent => activeComponent === 'MssqlServiceComponent'),
  //       switchMap(() => this.dateService.date$)).subscribe(dates => {
  //       this.datemodel = dates;
  //       this.startTime = this.formatDate(this.datemodel.startdateTime);
  //       this.endTime = this.formatDate(this.datemodel.enddateTime);
  //       // this.refreshAllCharts();
  //       const activeTab = $('#database-nav .nav-link.active').attr('href')?.replace('#', '');
  //       if (activeTab) {
  //         this.loadData(activeTab);
  //       } else {
  //         this.loadData('inspections');
  //       }
  //     });
  // }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.serviceId = sessionStorage.getItem('encodedDatabaseServiceId') ?? '';
    this.serviceName = sessionStorage.getItem('databaseServiceId') ?? '';
    this.dateService.setActiveComponent('MssqlServiceComponent');
    this.observeThemeChange();
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'MssqlServiceComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.thresholdst = this.formatForThresholdDate(this.datemodel.startdateTime);

        this.endTime = this.formatDate(this.datemodel.enddateTime);
        const activeElement = document.querySelector('#database-nav .nav-link.active') as HTMLAnchorElement;
        const activeTab = activeElement?.getAttribute('href')?.replace('#', '');
        if (activeTab) {
          this.loadData(activeTab);
        } else {
          this.loadData('inspections');
        }

      });
  }

  loadData(nav: string): void {
    // this.destroy$.next();
    switch (nav) {
      case 'inspections':
        this.getThreshold("DB");
        this.loadCurrentQPSgraph();
        // this.loadCurrentTPSgraph();
        this.loadSlowQueriesTrendGraph();
        this.loadCommandTrendGraph();
        // this.loadTrendsGraph();
        this.loadConnectsGraph();
        this.loadConnectionErrorsGraph();
        break;
      case 'instances':
        this.loadInstacneData();
        break;
      case 'slow_statements':
        this.loadSlowStatements();
        this.getMssqlSpErrors();
        this.getMssqlDeadlocks();
        break;
    }
  }

  observeThemeChange() {
    this.themeObserver = new MutationObserver(() => {
      this.initialize_commands_trend_graph();
      this.initialize_commands_trend_write_graph();
      this.initialize_connection_errors_graph();
      this.initialize_connects_graph();
      this.initialize_currentQPS_graph();
      this.initialize_currentTPS_graph();
      this.initialize_slow_queries_trend_graph();
      this.initialize_trends_graph();
      this.isThemeChanged = !this.isThemeChanged;
    });

    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme', 'theme-switch']
    });
  }


  initResize(event: MouseEvent, colIndex: number) {
    event.preventDefault();
  
    const th = (event.target as HTMLElement).parentElement!;
    const startX = event.pageX;
    const startWidth = th.offsetWidth;
  
    const mouseMoveHandler = (e: MouseEvent) => {
      const newWidth = startWidth + (e.pageX - startX);
      this.isResizing = true;

      if (newWidth > 30) { // minimum width limit to prevent too small columns
        th.style.width = newWidth + 'px';
      }
    };
  
    const mouseUpHandler = () => {
      this.isResizing = false;

      window.removeEventListener('mousemove', mouseMoveHandler);
      window.removeEventListener('mouseup', mouseUpHandler);
    };
  
    window.addEventListener('mousemove', mouseMoveHandler);
    window.addEventListener('mouseup', mouseUpHandler);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
    this.themeObserver?.disconnect();
  }

  // ngAfterViewInit(): void {
  //   this.loadData('inspections'); // Default load without checking DOM
  // }

  refreshAllCharts() {
    // this.initialize_commands_trend_graph();
    // this.initialize_connection_errors_graph();
    // this.initialize_connects_graph();
    // this.initialize_currentQPS_graph();
    // this.initialize_currentTPS_graph();
    // this.initialize_slow_queries_trend_graph();
    // this.initialize_trends_graph();
    this.loadCurrentQPSgraph();
    this.loadSlowQueriesTrendGraph();
    this.loadCommandTrendGraph();
    this.loadTrendsGraph();
    this.loadConnectsGraph();
    this.loadConnectionErrorsGraph();
    this.loadInstacneData();
    this.loadSlowStatements();
  }



  resetPage() {
    this.currentQPSdata = [];
    this.currentTPSdata = [];
    this.slowQueriesTrendData = [];
    this.commandTrendData = [];
    this.commandTrendWriteData = [];
    this.trendsData = [];
    this.connectsData = [];
    this.connectionErrorsData = [];
  }

  getThreshold(type: string) {
    const appId = sessionStorage.getItem('msSqlId');
    const payload = {
      appId: appId,
      serviceId: this.serviceId,
      st: this.thresholdst,
      et: this.endTime,
      type: "RELATIONAL"
    };
    this.meteringConfigService.getThreshold(payload)
      .subscribe(res => {
        this.thresholds = res;
        this.refreshAllCharts();

      });
  }



  getThresholdDisplay(metric: string, actualValue: number): { value: number, color: string } {
    if (!this.thresholds || !this.thresholds[metric] || actualValue == null) {
      return { value: 0, color: '#3b82f6' }; // default blue
    }
  
    const t = this.thresholds[metric];
    let displayValue = t.warningValue;  // by default, show actual value
    let color = 'green'; // default safe
  
    // Define higher-is-worse metrics
    const higherIsWorse = [
      'meter_mssql_connection_errors_internal',
      'meter_mssql_commands_delete_rate',
      'meter_mssql_commands_update_rate',
      'meter_mssql_commands_select_rate',
      'meter_mssql_commands_insert_rate',
      'meter_mssql_slow_queries_rate',
      'meter_mssql_qps',
      'meter_mssql_threads_created',
      'meter_mssql_threads_connected',
      'meter_mssql_threads_running',
      'meter_mssql_threads_cached'
    ];
  
    if (higherIsWorse.includes(metric)) {
      if (actualValue >= t.criticalValue) {
        displayValue = t.criticalValue;
        color = 'red';
      } else if (actualValue >= t.warningValue) {
        displayValue = t.warningValue;
        color = 'orange';
      }
    } else { // lower-is-worse metrics
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

  loadInstacneData() {
    this.databaseService.getInstanceDataForMssql(this.serviceId, this.startTime, this.endTime, -1, -1)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.instanceList = response.serviceStatus === ServiceStatus.SUCCESS ? response.serviceResponse : [];
        },
        error: () => this.instanceList = []
      });
  }

  loadCurrentQPSgraph() {
    let consSum = 0;
    this.databaseService.getServiceCurrentQPSForMssql(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) {
            // keep only valid TPS values
            if (response.serviceResponse.length === 0) {
              this.currentQPSdata = [];
              this.graphCurrentQPS?.destroy();
              return;
            }
  
            // case 2 & 3: response has data (may contain nulls)
            this.currentQPSdata = response.serviceResponse;
            this.currentQPSdata.forEach(element=>{
              if (element['qps']!==null){
                consSum+=element['qps']
              }
            });
            this.avgqps = Math.round((consSum/this.currentQPSdata.length)*this.roundUpto)/this.roundUpto
  
            // always initialize the graph (it will look empty if all TPS are null)
            this.initialize_currentQPS_graph();
  
          } else {
            // fallback for invalid response
            this.currentQPSdata = [];
            this.graphCurrentQPS?.destroy();
          }
        },
        error: () => {
          this.currentQPSdata = [];
          this.graphCurrentQPS?.destroy();
        }
      });
  }

  loadCurrentTPSgraph() {
    let consSum =0;
    this.databaseService.getServiceCurrentTPS(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) {
            
            // case 1: empty response → show "No data"
            if (response.serviceResponse.length === 0) {
              this.currentTPSdata = [];
              this.graphCurrentTPS?.destroy();
              return;
            }
  
            // case 2 & 3: response has data (may contain nulls)
            this.currentTPSdata = response.serviceResponse;
            this.currentTPSdata.forEach(element=>{
              if (element['tps']!==null){
                consSum+=element['tps']
              }
            });
            this.avgtps = Math.round((consSum/this.currentTPSdata.length)*this.roundUpto)/this.roundUpto
  
            // always initialize the graph (it will look empty if all TPS are null)
            this.initialize_currentTPS_graph();
  
          } else {
            // fallback for invalid response
            this.currentTPSdata = [];
            this.graphCurrentTPS?.destroy();
          }
        },
        error: () => {
          this.currentTPSdata = [];
          this.graphCurrentTPS?.destroy();
        }
      });
  }
  
  
  

  loadSlowQueriesTrendGraph() {
    this.databaseService.getServiceSlowQueriesRateForMssql(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) {
            // keep only valid TPS values
            if (response.serviceResponse.length === 0) {
              this.slowQueriesTrendData = [];
              this.graphSlowQueriesTrend?.destroy();
              return;
            }
  
            // case 2 & 3: response has data (may contain nulls)
            this.slowQueriesTrendData = response.serviceResponse;
  
            // always initialize the graph (it will look empty if all TPS are null)
            this.initialize_slow_queries_trend_graph();
  
          } else {
            // fallback for invalid response
            this.slowQueriesTrendData = [];
            this.graphSlowQueriesTrend?.destroy();
          }
        },
        error: () => {
          this.slowQueriesTrendData = [];
          this.graphSlowQueriesTrend?.destroy();
        }
      });
  }

  // loadCommandTrendGraph() {
  //   this.databaseService.getServiceCommandTrendsForMssql(this.serviceId, this.startTime, this.endTime)
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe({
  //       next: response => {
  //         if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) {
            
  //           // case 1: empty response → show "No data"
  //           if (response.serviceResponse.length === 0) {
  //             this.commandTrendData = [];
  //             this.graphCommandTrend?.destroy();
  //             return;
  //           }
  
  //           // case 2 & 3: response has data (may contain nulls)
  //           this.commandTrendData = response.serviceResponse;
  
  //           // always initialize the graph (it will look empty if all TPS are null)
  //           this.initialize_commands_trend_graph();
  
  //         } else {
  //           // fallback for invalid response
  //           this.commandTrendData = [];
  //           this.graphCommandTrend?.destroy();
  //         }
  //       },
  //       error: () => {
  //         this.commandTrendData = [];
  //         this.graphCommandTrend?.destroy();
  //       }
  //     });
  // }

  loadCommandTrendGraph() {
    this.databaseService.getServiceCommandTrendsForMssql(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) {
            
            // case 1: empty response → show "No data"
            if (response.serviceResponse.length === 0) {
              this.commandTrendData = [];
              this.commandTrendWriteData = [];
              this.graphCommandTrend?.destroy();
              this.graphCommandTrendWrite?.destroy();
              return;
            }
  
            // case 2: response has data → split into read/write
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
  
            // initialize graphs (even if values are null, graph will just look empty)
            this.initialize_commands_trend_graph();
            this.initialize_commands_trend_write_graph();
  
          } else {
            // fallback for invalid response
            this.commandTrendData = [];
            this.commandTrendWriteData = [];
            this.graphCommandTrend?.destroy();
            this.graphCommandTrendWrite?.destroy();
          }
        },
        error: () => {
          this.commandTrendData = [];
          this.commandTrendWriteData = [];
          this.graphCommandTrend?.destroy();
          this.graphCommandTrendWrite?.destroy();
        }
      });
  }
  

  loadTrendsGraph() {
    let max = 0;
    this.databaseService.getServiceThreadsForMssql(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) {
            
            // case 1: empty response → show "No data"
            if (response.serviceResponse.length === 0) {
              this.trendsData = [];
              this.graphTrends?.destroy();
              return;
            }
  
            // case 2 & 3: response has data (may contain nulls)
            this.trendsData = response.serviceResponse;
            this.trendsData.forEach(element => {
              if (element['threads_connected'] !== null && element['threads_connected']>max){
                max = element['threads_connected']
              }
            });
            this.maxconnected = max;
  
            // always initialize the graph (it will look empty if all TPS are null)
            this.initialize_trends_graph();
  
          } else {
            // fallback for invalid response
            this.trendsData = [];
            this.graphTrends?.destroy();
          }
        },
        error: () => {
          this.trendsData = [];
          this.graphTrends?.destroy();
        }
      });
  }

  loadConnectsGraph() {
    this.databaseService.getServiceConnectsForMssql(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) {
            
            // case 1: empty response → show "No data"
            if (response.serviceResponse.length === 0) {
              this.connectsData = [];
              this.graphConnects?.destroy();
              return;
            }
  
            // case 2 & 3: response has data (may contain nulls)
            this.connectsData = response.serviceResponse;
  
            // always initialize the graph (it will look empty if all TPS are null)
            this.initialize_connects_graph();
  
          } else {
            // fallback for invalid response
            this.connectsData = [];
            this.graphConnects?.destroy();
          }
        },
        error: () => {
          this.connectsData = [];
          this.graphConnects?.destroy();
        }
      });
  }

    loadConnectionErrorsGraph() {
      this.databaseService.getServiceConnectionErrorsForMssql(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response) => {
        if (response.serviceStatus === ServiceStatus.SUCCESS) {
          this.connectionErrorsData = response.serviceResponse;
        } else {
          this.connectionErrorsData = [];
          console.error(response.serviceError);
        }
        this.initialize_connection_errors_graph();
      }, err => {
        this.connectionErrorsData = [];
        if (this.graphConnectionErrors) {
          this.graphConnectionErrors.destroy();
        }
      });
    }
  

  // loadConnectionErrorsGraph() {
  //   this.databaseService.getServiceConnectionErrorsForMssql(this.serviceId, this.startTime, this.endTime)
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe({
  //       next: response => {
  //         if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) {
            
  //           // case 1: empty response → show "No data"
  //           if (response.serviceResponse.length === 0) {
  //             this.connectionErrorsData = [];
  //             this.graphConnectionErrors?.destroy();
  //             return;
  //           }
  
  //           // case 2 & 3: response has data (may contain nulls)
  //           this.connectionErrorsData = response.serviceResponse;
  
  //           // always initialize the graph (it will look empty if all TPS are null)
  //           this.initialize_connection_errors_graph();
  
  //         } else {
  //           // fallback for invalid response
  //           this.connectionErrorsData = [];
  //           this.graphConnectionErrors?.destroy();
  //         }
  //       },
  //       error: () => {
  //         this.connectionErrorsData = [];
  //         this.graphConnectionErrors?.destroy();
  //       }
  //     });
  // }

  initialize_currentQPS_graph(): void {
    try {
      if (this.graphCurrentQPS) this.graphCurrentQPS.destroy();
  
      const metric = 'meter_mssql_qps';
      const baseline = this.thresholds?.[metric]?.avgBaseline ?? undefined;
      const warning = this.thresholds?.[metric]?.warningValue ?? undefined;
      const critical = this.thresholds?.[metric]?.criticalValue ?? undefined;
  
      const chartData = this.currentQPSdata.map(qpsData => {
        const value = qpsData['qps'];
        let pointColor: string;
  
        if (critical !== undefined && value >= critical) {
          pointColor = StatusColors.CRITICAL; // 🔴 Critical
          this.isQpsBreached = true;
        } else if (warning !== undefined && value >= warning) {
          pointColor = StatusColors.WARNING;  // 🟠 Warning
          this.isQpsBreached = true;
        } else {
          // fallback: use status color if available, otherwise normal
          pointColor = StatusColors[
            (qpsData['status'] ? qpsData['color'] : 'NORMAL') as keyof typeof StatusColors
          ];
        }
  
        return {
          x: this.convertTimebucket(qpsData.time_bucket),
          y: value,
          color: pointColor
        };
      });
  
      const seriesData = [{
        name: 'QPS',
        data: chartData,
        marker: { radius: 2, symbol: 'circle' }
      }];
  
      const options: Highcharts.Options = this.getChartOption(
        'spline',
        'current_qps_graph',
        seriesData,
        baseline,
        this.thresholds,
        metric
      );
  
      this.graphCurrentQPS = Highcharts.chart(options);
  
    } catch (error) {
      console.error('Error occurred while initializing MSSQL QPS chart:', error);
    }
  }
  
  
  initialize_currentTPS_graph() {
    // this.graphCurrentTPS?.destroy();
    const seriesData = [{
      name: 'TPS',
      data: this.currentTPSdata.map(tpsData => ({
        x: this.convertTimebucket(tpsData.time_bucket),
        y: tpsData['tps'],
        color: StatusColors[(tpsData['status'] ? tpsData['color'] : 'NORMAL') as keyof typeof StatusColors]
      })),
      marker: { radius: 2 }
    }];
    const options = this.getChartOption('spline', 'current_tps_graph', seriesData);
    this.graphCurrentTPS = Highcharts.chart(options);
  }

  initialize_slow_queries_trend_graph(): void {
    try {
      // Destroy previous chart if exists
      if (this.graphSlowQueriesTrend) {
        this.graphSlowQueriesTrend.destroy();
      }
  
      const metric = 'meter_mssql_slow_queries_rate';
      const baseline = this.thresholds?.[metric]?.avgBaseline ?? undefined;
      const warning = this.thresholds?.[metric]?.warningValue ?? undefined;
      const critical = this.thresholds?.[metric]?.criticalValue ?? undefined;
  
      // Prepare chart data with threshold-based colors
      const seriesData = [{
        name: 'Slow Queries',
        data: this.slowQueriesTrendData.map(data => {
          const time_bucket = this.convertTimebucket(data.time_bucket);
          const slow_queries_rate = data['slow_queries_rate'];
  
          let pointColor: string;
          if (critical !== undefined && slow_queries_rate >= critical) {
            pointColor = StatusColors.CRITICAL; // 🔴 Critical
            this.isSlowQueriesBreached = true

          } else if (warning !== undefined && slow_queries_rate >= warning) {
            pointColor = StatusColors.WARNING; // 🟠 Warning
            this.isSlowQueriesBreached = true
          } else {
            // fallback to status-based coloring
            const status = (data['status'] ? data['color'] : 'NORMAL') as keyof typeof StatusColors;
            pointColor = StatusColors[status];
          }
  
          return {
            x: time_bucket,
            y: slow_queries_rate,
            color: pointColor
          };
        }),
        marker: { radius: 2, symbol: 'circle' }
      }];
  
      // Build final chart options with thresholds
      const options: Highcharts.Options = this.getChartOption(
        'spline',
        'slow_queries_trend',
        seriesData,
        baseline,
        this.thresholds,
        metric
      );
  
      this.graphSlowQueriesTrend = new Highcharts.Chart(options);
  
    } catch (error) {
      console.error("Error occurred while initializing Slow Queries Trend graph:", error);
    }
  }
  
  

  // initialize_commands_trend_graph() {
  //   // this.graphCommandTrend?.destroy();
  //   const options = this.getChartOption('areaspline', 'commands_trend', this.getSeriesData(this.commandTrendData));
  //   this.graphCommandTrend = Highcharts.chart(options);
  // }
  
  // initialize_commands_trend_write_graph() {
  //   // this.graphCommandTrend?.destroy();
  //   const options = this.getChartOption('areaspline', 'commands_trend_write', this.getSeriesData(this.commandTrendWriteData));
  //   this.graphCommandTrendWrite = Highcharts.chart(options);
  // }

  initialize_commands_trend_graph(): void {
    try {
      // Destroy previous chart if exists
      if (this.graphCommandTrend) {
        this.graphCommandTrend.destroy();
      }
  
      const metric = 'meter_mssql_commands_select_rate';
      const baseline = this.thresholds?.[metric]?.avgBaseline ?? undefined;
      const warning = this.thresholds?.[metric]?.warningValue ?? undefined;
      const critical = this.thresholds?.[metric]?.criticalValue ?? undefined;
  
      // Get formatted series data
      const rawSeries = this.getSeriesData(this.commandTrendData);
  
      // Apply colors based on thresholds OR series name patterns
      const seriesData = rawSeries.map(series => {
        const seriesName = series.name?.toLowerCase() || '';
        const coloredData = series.data.map((point: any) => {
          const value = point.y;
  
          // Default fallback based on series type
          let pointColor: string = StatusColors.NEUTRAL;
          if (seriesName.includes('select') || seriesName.includes('insert')) {
            pointColor = StatusColors.INFO;    // 🟢
          } else if (seriesName.includes('delete')) {
            pointColor = StatusColors.CRITICAL; // 🔴
          } else if (seriesName.includes('update')) {
            pointColor = StatusColors.WARNING;  // 🟠
          }
  
          // Threshold overrides (take priority)
          if (critical !== undefined && value >= critical) {
            pointColor = StatusColors.CRITICAL;
            this.isReadQueriesBreached = true

          } else if (warning !== undefined && value >= warning) {
            pointColor = StatusColors.WARNING;
            this.isReadQueriesBreached = true

          }
  
          return {
            ...point,
            color: pointColor
          };
        });
  
        return {
          ...series,
          data: coloredData,
          marker: { radius: 2, symbol: 'circle' }
        };
      });
  
      // Build final chart options with thresholds
      const chartOption: Highcharts.Options = this.getChartOption(
        'areaspline',
        'commands_trend',
        seriesData,
        baseline,
        this.thresholds,
        metric
      );
  
      this.graphCommandTrend = new Highcharts.Chart(chartOption);
    } catch (error) {
      console.error("Error occurred while initializing command trend graph:", error);
    }
  }
  
    initialize_commands_trend_write_graph(): void {
      try {
        // Destroy previous chart if exists
        if (this.graphCommandTrendWrite) {
          this.graphCommandTrendWrite.destroy();
        }
  
        // Get formatted series data
        const rawSeries = this.getSeriesData(this.commandTrendWriteData);
  
        // Apply colors based on series name patterns
        const seriesData = rawSeries.map((series) => {
          const seriesName = series.name?.toLowerCase() || '';
          let color = StatusColors.NEUTRAL;
  
          if (seriesName.includes('select') || seriesName.includes('insert')) {
            color = StatusColors.NORMAL;    // Green
          } else if (seriesName.includes('update')) {
            color = StatusColors.WARNING;   // Orange
          } else if (seriesName.includes('delete')) {
            color = StatusColors.CRITICAL;  // Red
          }
  
          return {
            ...series,
            color: color,
            marker: {
              radius: 2
            }
          };
        });
  
        // Get final chart options
        const chartOption: Highcharts.Options = this.getChartOption(
          'areaspline',
          'commands_trend_write',
          seriesData
        );
  
        this.graphCommandTrendWrite = new Highcharts.Chart(chartOption);
      } catch (error) {
        console.error("Error occurred while initializing command trend write graph:", error);
      }
    }

  initialize_trends_graph() {
    // this.graphTrends?.destroy();
    const options = this.getChartOption('areaspline', 'trends', this.getSeriesData(this.trendsData));
    this.graphTrends = Highcharts.chart(options);
  }

  initialize_connects_graph() {
    // this.graphConnects?.destroy();
    const options = this.getChartOption('spline', 'connects', this.getSeriesData(this.connectsData));
    this.graphConnects = Highcharts.chart(options);
  }

  // initialize_connection_errors_graph() {
  //   // this.graphConnectionErrors?.destroy();
  //   const seriesData = [{
  //     name: 'Internal Errors',
  //     data: this.connectionErrorsData.map(data => ({
  //       x: this.convertTimebucket(data.time_bucket),
  //       y: data['connection_errors_internal'],
  //       color: StatusColors[(data['status'] ? data['color'] : 'NORMAL') as keyof typeof StatusColors]
  //     })),
  //     marker: { radius: 2 }
  //   }];
  //   const options = this.getChartOption('spline', 'connection_errors', seriesData);
  //   this.graphConnectionErrors = Highcharts.chart(options);
  // }

    initialize_connection_errors_graph() {
      try {
        if (this.graphConnectionErrors) {
          this.graphConnectionErrors.destroy();
        }
    
        // Prepare series for each metric
        const metrics = [
          { key: 'internal', name: 'Internal Errors' },
          { key: 'max_connections', name: 'Max Connections' },
          { key: 'accept', name: 'Accept Errors' },
          { key: 'tcpwrap', name: 'TCP Wrap Errors' }
        ];
    
        const seriesData = metrics.map(metric => {
          const chartData = this.connectionErrorsData.map(graphData => {
            const time_bucket = this.convertTimebucket(graphData.time_bucket);
            return {
              x: time_bucket,
              y: graphData[metric.key] ?? 0 // fallback to 0 if null
            };
          });
    
          return {
            name: metric.name,
            data: chartData,
            marker: { radius: 2 }
          };
        });
    
        // You can still keep threshold logic per metric if needed
        const metric = 'meter_mysql_connection_errors_internal'; 
        const baseline = this.thresholds?.[metric]?.avgBaseline ?? undefined;
    
        const chartOption: Highcharts.Options = this.getChartOption(
          'spline',
          'connection_errors',
          seriesData,
          baseline,
          this.thresholds,
          metric
        );
    
        this.graphConnectionErrors = new Highcharts.Chart(chartOption);
    
      } catch (error) {
        console.error("Error occurred while initializing Connection Errors graph:", error);
      }
    }

  getSeriesData(responseData: ResponseData[]) {
    const seriesMap: { [key: string]: any[] } = {};
    responseData.forEach(data => {
      const time = this.convertTimebucket(data.time_bucket);
      Object.keys(data).forEach(key => {
        if (key !== 'time_bucket') {
          seriesMap[key] ??= [];
          seriesMap[key].push({ x: time, y: data[key] });
        }
      });
    });
    const displayNameMap: { [key: string]: string } = {
      'select_rate': 'Access Ops/sec',
      'insert_rate': 'Insert Ops/sec',
      'update_rate': 'Update Ops/sec',
      'delete_rate': 'Delete Ops/sec',
      'slow_queries_rate': 'Slow Queries'
    };
    return Object.keys(seriesMap).map(key => {
      let seriesName = displayNameMap[key] || key.replace(/_/g, ' ');
      if (!displayNameMap[key]) {
        seriesName = seriesName.charAt(0).toUpperCase() + seriesName.slice(1);
      }
      return {
        name: seriesName,
        data: seriesMap[key],
        marker: { radius: 2 }
      };
    });
  }

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
        renderTo: chartId,
      },
      plotOptions: { areaspline: { fillOpacity: 0.3}},
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

  loadSlowStatements() {
    this.databaseService
      .getServiceSlowStatementsForMssql(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        response => {
          if (
            response.serviceStatus === ServiceStatus.SUCCESS &&
            Array.isArray(response.serviceResponse)
          ) {
            this.databaseSlowStatements = response.serviceResponse
              .filter((item: any) =>
                typeof item.query === 'string' &&
                item.query.trim() !== '' &&
                item.query.trim().toLowerCase() !== 'null'
              )
              .map((item: any, index: any) => ({
                ...item,
                originalIndex: index + 1
              }));
          } else {
            this.databaseSlowStatements = [];
          }

          this.filteredSlowStatements = [...this.databaseSlowStatements];

          this.currentPage = 1;
          this.pageInput = 1;

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




  // loadSlowStatements() {
  //   this.databaseService
  //     .getServiceSlowStatementsForMssql(this.serviceId, this.startTime, this.endTime)
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe(
  //       response => {
  //         if (response.serviceStatus === ServiceStatus.SUCCESS && Array.isArray(response.serviceResponse)) {
  //           // Add originalIndex
  //           this.databaseSlowStatements = response.serviceResponse.map((item, index) => ({
  //             ...item,
  //             originalIndex: index + 1
  //           }));
  //         } else {
  //           this.databaseSlowStatements = [];
  //         }

  //         // ✅ Always sync filtered data with the latest fetch
  //         this.filteredSlowStatements = [...this.databaseSlowStatements];

  //         // Reset page to 1
  //         this.currentPage = 1;
  //         this.pageInput = 1;

  //         // Recalculate pagination
  //         this.calculatePagination();
  //       },
  //       err => {
  //         this.databaseSlowStatements = [];
  //         this.filteredSlowStatements = [];
  //         this.pagedSlowStatements = [];
  //         this.totalPages = 1;
  //       }
  //     );
  // }


  setServiceInstance(instanceName: string) {
    const encodedId = `${this.serviceId}_${btoa(instanceName)}`;
    sessionStorage.setItem('databaseInstanceId', instanceName);
    sessionStorage.setItem('encodedDatabaseInstanceId', encodedId);
    this.router.navigate(['/database/mssql/instance'])
  }

  convertTimebucket(timebucket: string) {
    const year = +timebucket.slice(0, 4);
    const month = +timebucket.slice(4, 6) - 1;
    const day = +timebucket.slice(6, 8);
    const hour = +timebucket.slice(8, 10);
    const minute = +timebucket.slice(10, 12);
    return new Date(year, month, day, hour, minute).getTime();}

  formatDate(date: string) {
    return +date.replace(/[-:\s]/g, '');
  }

  sortBy(field: string): void {
    // Toggle sort direction
    if (this.sortparam === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortparam = field;
      this.sortDirection = 'asc';
    }

    // Sort the array
    this.databaseSlowStatements.sort((a, b) => {
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

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    // Reset page after sorting
    this.currentPage = 1;
    this.pageInput = 1;
    this.calculatePagination();
  }
  pageChange($event: number) {
    this.page = $event;
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

    // Reset to first page after filtering
    this.currentPage = 1;
    this.pageInput = this.currentPage;
    this.calculatePagination();
  }

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
        this.pageInput= --this.currentPage;
        this.calculatePagination();
      }
    }
  
    nextPage(): void {
      if (this.currentPage < this.totalPages) {
        this.pageInput=++this.currentPage;
        this.calculatePagination();
      }
    }
  
    goToPage(page: number): void {
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

  // MSSQL SP ERRORS PAGINATION & SEARCH
  getMssqlSpErrors(): void {
    this.isMssqlSpErrorsLoading = true;
    this.databaseService.getSpErrorsForMssql(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.isMssqlSpErrorsLoading = false;
          if (data && (data.serviceStatus === 'Success' || data.serviceStatus === 'SUCCESS')) {
            this.mssqlSpErrorsList = data.serviceResponse;
            this.onSearchMssqlSpErrors();
          } else {
            this.mssqlSpErrorsList = [];
            this.filteredMssqlSpErrorsList = [];
            this.pagedMssqlSpErrors = [];
          }
        },
        error: (err) => {
          this.isMssqlSpErrorsLoading = false;
          console.error("Error fetching MSSQL SP Errors:", err);
          this.mssqlSpErrorsList = [];
          this.filteredMssqlSpErrorsList = [];
          this.pagedMssqlSpErrors = [];
        }
      });
  }

  onSearchMssqlSpErrors() {
    this.currentPageMssqlSpErrors = 1;
    if (!this.searchTextMssqlSpErrors) {
      this.filteredMssqlSpErrorsList = [...this.mssqlSpErrorsList];
    } else {
      const search = this.searchTextMssqlSpErrors.toLowerCase();
      this.filteredMssqlSpErrorsList = this.mssqlSpErrorsList.filter(item =>
        (item.errorMessage && item.errorMessage.toLowerCase().includes(search)) ||
        (item.errorCode && item.errorCode.toLowerCase().includes(search)) ||
        (item.database && item.database.toLowerCase().includes(search)) ||
        (item.user && item.user.toLowerCase().includes(search)) ||
        (item.clientHost && item.clientHost.toLowerCase().includes(search))
      );
    }
    this.updatePagedMssqlSpErrors();
  }

  updatePagedMssqlSpErrors() {
    this.totalPagesMssqlSpErrors = Math.ceil(this.filteredMssqlSpErrorsList.length / this.itemsPerPageMssqlSpErrors);
    if (this.totalPagesMssqlSpErrors === 0) this.totalPagesMssqlSpErrors = 1;
    const startIndex = (this.currentPageMssqlSpErrors - 1) * this.itemsPerPageMssqlSpErrors;
    const endIndex = startIndex + this.itemsPerPageMssqlSpErrors;
    this.pagedMssqlSpErrors = this.filteredMssqlSpErrorsList.slice(startIndex, endIndex);
  }

  previousPageMssqlSpErrors() {
    if (this.currentPageMssqlSpErrors > 1) {
      this.currentPageMssqlSpErrors--;
      this.updatePagedMssqlSpErrors();
    }
  }

  nextPageMssqlSpErrors() {
    if (this.currentPageMssqlSpErrors < this.totalPagesMssqlSpErrors) {
      this.currentPageMssqlSpErrors++;
      this.updatePagedMssqlSpErrors();
    }
  }

  goToPageMssqlSpErrors(page: string | number) {
    const pageNumber = typeof page === 'string' ? parseInt(page, 10) : page;
    if (pageNumber >= 1 && pageNumber <= this.totalPagesMssqlSpErrors) {
      this.currentPageMssqlSpErrors = pageNumber;
      this.updatePagedMssqlSpErrors();
    }
  }

  sortByMssqlSpErrors(field: string): void {
    if (this.sortParamMssqlSpErrors === field) {
      this.sortDirectionMssqlSpErrors = this.sortDirectionMssqlSpErrors === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortParamMssqlSpErrors = field;
      this.sortDirectionMssqlSpErrors = 'asc';
    }

    this.filteredMssqlSpErrorsList.sort((a, b) => {
      const valueA = a[field];
      const valueB = b[field];

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

      return this.sortDirectionMssqlSpErrors === 'asc' ? comparison : -comparison;
    });

    this.currentPageMssqlSpErrors = 1;
    this.updatePagedMssqlSpErrors();
  }

  // MSSQL DEADLOCKS PAGINATION & SEARCH
  getMssqlDeadlocks(): void {
    this.isMssqlDeadlocksLoading = true;
    this.databaseService.getDeadlockDetailsForMssql(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.isMssqlDeadlocksLoading = false;
          if (data && (data.serviceStatus === 'Success' || data.serviceStatus === 'SUCCESS')) {
            this.mssqlDeadlocksList = data.serviceResponse;
            this.onSearchMssqlDeadlocks();
          } else {
            this.mssqlDeadlocksList = [];
            this.filteredMssqlDeadlocksList = [];
            this.pagedMssqlDeadlocks = [];
          }
        },
        error: (err) => {
          this.isMssqlDeadlocksLoading = false;
          console.error("Error fetching MSSQL Deadlocks:", err);
          this.mssqlDeadlocksList = [];
          this.filteredMssqlDeadlocksList = [];
          this.pagedMssqlDeadlocks = [];
        }
      });
  }

  onSearchMssqlDeadlocks() {
    this.currentPageMssqlDeadlocks = 1;
    if (!this.searchTextMssqlDeadlocks) {
      this.filteredMssqlDeadlocksList = [...this.mssqlDeadlocksList];
    } else {
      const search = this.searchTextMssqlDeadlocks.toLowerCase();
      this.filteredMssqlDeadlocksList = this.mssqlDeadlocksList.filter(item =>
        (item.query1 && item.query1.toLowerCase().includes(search)) ||
        (item.user1 && item.user1.toLowerCase().includes(search)) ||
        (item.host1 && item.host1.toLowerCase().includes(search)) ||
        (item.query2 && item.query2.toLowerCase().includes(search)) ||
        (item.user2 && item.user2.toLowerCase().includes(search)) ||
        (item.host2 && item.host2.toLowerCase().includes(search)) ||
        (item.resourceDescription && item.resourceDescription.toLowerCase().includes(search))
      );
    }
    this.updatePagedMssqlDeadlocks();
  }

  updatePagedMssqlDeadlocks() {
    this.totalPagesMssqlDeadlocks = Math.ceil(this.filteredMssqlDeadlocksList.length / this.itemsPerPageMssqlDeadlocks);
    if (this.totalPagesMssqlDeadlocks === 0) this.totalPagesMssqlDeadlocks = 1;
    const startIndex = (this.currentPageMssqlDeadlocks - 1) * this.itemsPerPageMssqlDeadlocks;
    const endIndex = startIndex + this.itemsPerPageMssqlDeadlocks;
    this.pagedMssqlDeadlocks = this.filteredMssqlDeadlocksList.slice(startIndex, endIndex);
  }

  previousPageMssqlDeadlocks() {
    if (this.currentPageMssqlDeadlocks > 1) {
      this.currentPageMssqlDeadlocks--;
      this.updatePagedMssqlDeadlocks();
    }
  }

  nextPageMssqlDeadlocks() {
    if (this.currentPageMssqlDeadlocks < this.totalPagesMssqlDeadlocks) {
      this.currentPageMssqlDeadlocks++;
      this.updatePagedMssqlDeadlocks();
    }
  }

  goToPageMssqlDeadlocks(page: string | number) {
    const pageNumber = typeof page === 'string' ? parseInt(page, 10) : page;
    if (pageNumber >= 1 && pageNumber <= this.totalPagesMssqlDeadlocks) {
      this.currentPageMssqlDeadlocks = pageNumber;
      this.updatePagedMssqlDeadlocks();
    }
  }

  sortByMssqlDeadlocks(field: string): void {
    if (this.sortParamMssqlDeadlocks === field) {
      this.sortDirectionMssqlDeadlocks = this.sortDirectionMssqlDeadlocks === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortParamMssqlDeadlocks = field;
      this.sortDirectionMssqlDeadlocks = 'asc';
    }

    this.filteredMssqlDeadlocksList.sort((a, b) => {
      const valueA = a[field];
      const valueB = b[field];

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

      return this.sortDirectionMssqlDeadlocks === 'asc' ? comparison : -comparison;
    });

    this.currentPageMssqlDeadlocks = 1;
    this.updatePagedMssqlDeadlocks();
  }
  
}
