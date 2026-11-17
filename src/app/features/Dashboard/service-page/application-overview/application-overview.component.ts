import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HighchartsChartModule } from 'highcharts-angular';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import * as Highcharts from 'highcharts';
import { DateService } from '../../../../services/date.service';
import { ApmApiService } from '../../../../services/apm-api.service';
import { AuthenticationService } from '../../../../services/authentication.service';
import { NavigationStart, Router } from '@angular/router';
import { User } from '../../../../models/user';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InfraService } from '../../../../services/infra.service';
import { ApplicationService } from '../../../../services/application.service';
export let browserRefresh = false;
import * as bootstrap from 'bootstrap';
import { SharedService } from '../../../../services/shared.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatabaseService } from '../../../../services/database-api.service';
import { LoggerService } from '../../../../services/logger.service';
import { Session } from '../../../../models/session';
import { TraceDetailsComponent } from '../trace-details/trace-details.component';

@Component({
    selector: 'app-application-overview',
    imports: [
        CommonModule,
        FormsModule,
        HighchartsChartModule,
        MatTooltipModule,
        TraceDetailsComponent
    ],
    templateUrl: './application-overview.component.html',
    styleUrl: './application-overview.component.css'
})
export class ApplicationOverviewComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('traceDetails') traceDetailModal!: TraceDetailsComponent;

  user: User = new User();
  currentUser: User | null = null;
  sessionObject: Session = new Session();

  private destroy$ = new Subject<void>();
  private subscription: Subscription = new Subscription();

  Highcharts: typeof Highcharts = Highcharts;

  datemodel: any;
  startTime!: number;
  endTime!: number;

  selectedService: any = '';
  serviceNames: any;
  entityId: any = '';

  charts: Highcharts.Chart[] = [];
  successRateTimeValueChart: Highcharts.Chart | null = null;
  serviceAvgResponseTimeChart: Highcharts.Chart | null = null;
  ServiceApdexTimeValueChart: Highcharts.Chart | null = null;
  serviceLoadTimeValueChart: Highcharts.Chart | null = null;

  successRateTimestamps: number[] = [];
  rspTimeTimestamps: number[] = [];
  serviceApdexTimestamps: number[] = [];
  serviceLoadTimestamps: number[] = [];

  slowEndpointData: any[] = [];
  endpointSuccessRateData: any;
  slowStatementData: any;
  selectedDb: any;
  selectedDb2: any;

  successRateInfo: string = "Shows the percentage of successful requests over time. Helps track system reliability and detect failures or errors in operations.";
  apdexInfo: string = " Measures user satisfaction based on response times. Higher values indicate better perceived performance; lower values signal potential performance issues.";
  loadInfo: string = "Indicates the number of active requests or tasks on the system. Helps assess system stress and detect when resources may be saturated.";
  latencyInfo: string = "Shows the response time of requests over time. Monitoring latency helps identify slow operations and potential performance bottlenecks.";
  endpointSRInfo: string = "Endpoints with the lowest success rates (showing up to 10).";
  endpointLatencyInfo: string = "Endpoints with the highest response time (showing up to 10).";

  // Infra

  entityId2: string = ''

  cpuAvgUsedPercentageChart: Highcharts.Chart | null = null;
  networkBandwidthUsageChart: Highcharts.Chart | null = null;
  memoryRamChartChart: Highcharts.Chart | null = null;
  diskReadWriteChart: Highcharts.Chart | null = null;

  cpuPercentageInfo: string = "Breaks down CPU time spent on user, system, idle, I/O wait, interrupts, and hypervisor tasks. Helps detect CPU bottlenecks and ensure efficient processing.";
  memoryRamInfo: string = "Shows total, used, available memory, and buffers/cache. Helps track memory pressure, optimize performance, and prevent out-of-memory issues."
  networkBandwidthInfo: string = "It measures data transmitted and received per second, giving insight into overall network load, traffic patterns, and potential bottlenecks.";
  diskInfo: string = "This metric shows the rate of data being read from and written to the disk for the selected server (IP).";

  // DB

  entityId3: string = '';

  qpsDataChart: Highcharts.Chart | null = null;
  tpsDataChart: Highcharts.Chart | null = null;
  commandTrendsDataChart: Highcharts.Chart | null = null;
  threadsDataChart: Highcharts.Chart | null = null;
  connectsDataChart: Highcharts.Chart | null = null;

  qpsInfo: string = "Queries processed per second.";
  tpsInfo: string = "Transactions processed per second.";
  queryTrendsInfo: string = "Rate of read and write queries over time.";
  threadsInfo: string = "Types of threads and its respective number over time.";
  conntectsInfo: string = "Available and aborted database connections over time.";

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private dateService: DateService,
    private infraService: InfraService,
    private sharedService: SharedService,
    private apmApiService: ApmApiService,
    private authService: AuthenticationService,
    private applicationService: ApplicationService,
    private databaseService: DatabaseService,
    private loggerService: LoggerService,
  ) {
    Highcharts.setOptions({
      plotOptions: {
        series: {
          cursor: 'pointer'
        }
      }
    });
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
    this.subscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        browserRefresh = !this.router.navigated;
      }
    });
    this.getservicenames();
    this.dateService.setActiveComponent('ApplicationOverviewComponent');
    this.subscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'ApplicationOverviewComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
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
        this.loadData();
      });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  ngAfterViewInit(): void {
    this.getservicenames();
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  parseTimeBucket(bucket: string): Date {
    const year = +bucket.slice(0, 4);
    const month = +bucket.slice(4, 6) - 1;
    const day = +bucket.slice(6, 8);
    const hour = +bucket.slice(8, 10);
    const minute = +bucket.slice(10, 12);
    return new Date(year, month, day, hour, minute);
  }

  loadData(): void {
    this.getServiceApdexTimeValue();
    this.getSuccessRateTimeValue();
    this.getServiceAvgResponseTime();
    this.getServiceLoadTimeValue();
    this.getSlowEndpointsInCurrentService();
    this.getEndpointSuccessRateInCurrentService();
    this.getDatabaseNamesForServices();

    this.getCpuAvgUsedPercentage();
    this.getNetworkBandwidthUsage();
    this.getMemoryRam();
    this.getDiskReadWrite();

    this.getQpsData();
    this.getTpsData();
    this.getCommandTrendsData();
    this.getThreadsData();
    this.getConnectsData();
  }

  infraOptions: any[] = [];
  dbOptions: any[] = [];
  selectedInfra: any = null;

  getservicenames(): void {
    if (this.currentUser) {
      this.applicationService.getAppDbInfraMapping(this.currentUser).subscribe((response: any) => {
        this.serviceNames = response.serviceResponse || [];
        if (this.serviceNames && this.serviceNames.length > 0) {
          this.selectedService = this.serviceNames[0];
          this.setService();
        }
      });
    }
  }

  setService(): void {
    this.infraOptions = Array.isArray(this.selectedService?.appInfra) ? this.selectedService.appInfra : [];
    this.dbOptions = Array.isArray(this.selectedService?.databases) ? this.selectedService.databases : [];

    this.selectedInfra = this.infraOptions.length ? this.infraOptions[0] : null;
    this.selectedDb = this.dbOptions.length ? this.dbOptions[0] : null;

    const appName = this.selectedService?.applicationName;
    if (appName) this.entityId = btoa(appName) + '.1';

    const infraName = this.selectedInfra?.ipAddress;
    if (infraName) this.entityId2 = btoa(infraName) + '.1';
    else this.entityId2 = '';

    const dbName = this.selectedDb?.dbName;
    if (dbName) this.entityId3 = btoa(dbName) + '.1';
    else this.entityId3 = '';

    this.loadData();
  }

  onInfraChange(): void {
    const infraName = this.selectedInfra?.ipAddress;
    if (infraName) this.entityId2 = btoa(infraName) + '.1';
    else this.entityId2 = '';
    this.loadData();
  }

  onDbChange(): void {
    const dbName = this.selectedDb?.dbName;
    if (dbName) this.entityId3 = btoa(dbName) + '.1';
    else this.entityId3 = '';
    this.loadData();
  }

  goToAppDashboard(): void {
    const appName = this.selectedService?.applicationName;
    const appId = this.selectedService?.applicationId;

    sessionStorage.setItem('encodedEntityIDForServices', this.entityId);
    sessionStorage.setItem('SelectedServiceId', appName);
    sessionStorage.setItem('ApplicationId', appId);

    this.router.navigate(['/service-page/general-service']);

    const modalElement = document.getElementById('staticBackdrop');
    if (modalElement) {
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      } else {
        const newInstance = new bootstrap.Modal(modalElement);
        newInstance.hide();
      }

      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }

      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
    }
  }

  goToInfraDashboard(): void {
    const infraName = this.selectedInfra?.ipAddress;
    const infraId = this.selectedInfra?.ipAddressId;
    let infraType = this.selectedInfra?.ipType;

    sessionStorage.setItem('encodedServiceIdForInfra', this.entityId2);
    sessionStorage.setItem('serviceIdForInfra', infraName);
    sessionStorage.setItem('ipAddressId', infraId);

    if(infraType = 'LINUX'){
      this.router.navigate(['/infra/linux-service']);
    } else{
      this.router.navigate(['/infra/window-service']);
    }

    const modalElement = document.getElementById('staticBackdrop');
    if (modalElement) {
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      } else {
        const newInstance = new bootstrap.Modal(modalElement);
        newInstance.hide();
      }

      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }

      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
    }
  }

  goToDBDashboard(): void {
    const dbName = this.selectedDb?.dbName;
    let dbType = this.selectedDb?.dbType;

    if (dbType === 'DATABASE') {
      sessionStorage.setItem('databaseServiceId', dbName);
      sessionStorage.setItem('encodedDatabaseServiceId', this.entityId3);
      this.router.navigate(['/database/service']);
    } else if (dbType === 'MSSQL') {
      sessionStorage.setItem('databaseServiceId', dbName);
      sessionStorage.setItem('encodedDatabaseServiceId', this.entityId3);
      this.router.navigate(['/database/mssql/service']);
    } else if (dbType === 'ORACLE') {
      sessionStorage.setItem('serviceIdForOracle', dbName);
      sessionStorage.setItem('encodedServiceIdForOracle', this.entityId3);
      this.router.navigate(['/oracle-monitoring/service']);
    }

    const modalElement = document.getElementById('staticBackdrop');
    if (modalElement) {
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      } else {
        const newInstance = new bootstrap.Modal(modalElement);
        newInstance.hide();
      }

      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }

      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
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
    const realTimestamp = this.rspTimeTimestamps[point.x];
    this.traceDetailModal.openMinDurationModal(realTimestamp, point.y);
  }


  getServiceApdexTimeValue(): void {
    this.apmApiService.getServiceApdexTimeValue(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const timeSeries = data.apdexTimeSeries;
      this.getServiceApdexTimeValueChart(timeSeries);
    })
  }

  getServiceApdexTimeValueChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      if (!data || data.length === 0) {
        if (this.ServiceApdexTimeValueChart) {
          this.ServiceApdexTimeValueChart.destroy();
          this.ServiceApdexTimeValueChart = null;
        }
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

      const styles = getComputedStyle(document.body);
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
          };
        })
      }));

      if (this.ServiceApdexTimeValueChart) {
        this.ServiceApdexTimeValueChart.destroy();
      }

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
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
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

  getSuccessRateTimeValue(): void {
    this.apmApiService.getSuccessRateTimeValue(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const timeSeries = data.successRateTimeSeries;
      this.getSuccessRateTimeValueChart(timeSeries);
    })
  }

  getSuccessRateTimeValueChart(data: { time_bucket: string;[key: string]: any }[]): void {
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

  getServiceAvgResponseTime(): void {
    this.apmApiService.getServiceAvgResponseTime(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const timeSeries = data.latencyTimeSeries;
      this.getServiceAvgResponseTimeChart(timeSeries);
    })
  }

  getServiceAvgResponseTimeChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item =>
            Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total' && k !== 'status')
          )
        )
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--chart-grid-line').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
      const noDataColor = styles.getPropertyValue('--noData-color').trim();

      if (keys.length === 0) {
        if (this.serviceAvgResponseTimeChart) {
          this.serviceAvgResponseTimeChart.destroy();
        }

        this.serviceAvgResponseTimeChart = Highcharts.chart('serviceAvgResponseTimeChartContainer', {
          chart: { type: 'spline', backgroundColor: 'transparent' },
          title: {
            text: 'No Data Available',
            align: 'center',
            verticalAlign: 'middle',
            style: {
              fontSize: '14px',
              color: noDataColor,
              fontWeight: '500',
              letterSpacing: '0.7px'
            }
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
          const y = Number(d[key]); // <-- FIXED HERE
          return { y };
        })
      }));

      if (this.serviceAvgResponseTimeChart) {
        this.serviceAvgResponseTimeChart.destroy();
      }

      this.serviceAvgResponseTimeChart = Highcharts.chart('serviceAvgResponseTimeChartContainer', {
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
          title: { text: '' },
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
          title: { text: '' },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        plotOptions: {
          series: {
            cursor: 'pointer',
            point: {
              events: {
                click: (event) => { this.onClick1(event, 'ServiceLatency') }
              }
            }
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      });

      if (!this.charts.includes(this.serviceAvgResponseTimeChart)) {
        this.charts.push(this.serviceAvgResponseTimeChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error('Error Occurred ', e);
    }
  }


  getServiceLoadTimeValue(): void {
    this.apmApiService.getServiceLoadTimeValue(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const timeSeries = data.loadTimeSeries;
      this.getserviceLoadTimeValueChart(timeSeries);
    })
  }

  getserviceLoadTimeValueChart(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total' && k !== 'status'))
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
          const y = Number(d['load']);
          return {
            y,
          };
        })
      }));

      if (this.serviceLoadTimeValueChart) {
        this.serviceLoadTimeValueChart.destroy();
      }

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
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
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

  getProgressWidth(value: number, dataArray: any[], key: string = ''): number {
    if (!dataArray || dataArray.length === 0) return 0;
    const max = Math.max(...dataArray.map(d => Number(d[key] || 0)));
    if (max === 0) return 0;
    const width = (Number(value) / max) * 100;
    return Math.max(width, 5);
  }

  getProgressBarClass(status: string): string {
    switch (status) {
      case 'CRITICAL': return 'bg-danger-bar';
      case 'WARNING': return 'bg-warning-bar';
      default: return 'bg-normal-bar';
    }
  }

  getSlowEndpointsInCurrentService(): void {
    this.apmApiService.getSlowEndpointsInCurrentService(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.slowEndpointData = data;
    })
  }

  getEndpointSuccessRateInCurrentService(): void {
    this.apmApiService.getEndpointSuccessRateInCurrentService(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.endpointSuccessRateData = Object.entries(data).map(([key, val]) => {
        const value = parseFloat(val);
        return {
          endpoint: key,
          value,
          status: value >= 99 ? 'NORMAL' : (value >= 95 ? 'WARNING' : 'CRITICAL')
        };
      });
    });
  }

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

  dbNames: string[] = [];
  getDatabaseNamesForServices(): void {
    this.apmApiService.getDatabaseNamesForServices(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      let str = this.entityId;
      const str2 = str?.substring(0, str.length - 2) ?? '';
      let id = atob(str2);
      this.dbNames = data[id];
      if (this.dbNames.length > 0) {
        this.selectedDb2 = this.dbNames[0];
        this.getDatabaseSlowStatements();
      }
      else {
        this.selectedDb2 = "None";
      }
    });
  }

  setDb(event: Event): void {
    const value = (event.target as HTMLSelectElement)?.value;
    if (value) {
      this.selectedDb2 = value;
      this.getDatabaseSlowStatements();
    }
  }

  getDatabaseSlowStatements(): void {
    const encodedId  = btoa(this.selectedDb2) + '.0'
    this.apmApiService.getDatabaseSlowStatements(encodedId, this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.slowStatementData = data
    });
  }


  // INFRA

  getCpuAvgUsedPercentage(): void {
    this.infraService.getCpuAvgUsedPercentage(this.entityId2!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const timeSeries = data;
      this.getCpuAvgUsedPercentageChart(timeSeries);
    })
  }

  getCpuAvgUsedPercentageChart(data: { time_bucket: string;[key: string]: any }[]): void {
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

      if (keys.length === 0) {
        if (this.cpuAvgUsedPercentageChart) {
          this.cpuAvgUsedPercentageChart.destroy();
        }

        this.cpuAvgUsedPercentageChart = Highcharts.chart('cpuAvgUsedPercentageChartContainer', {
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
        data: data.map(d => Number(d[key]))
      }));

      if (this.cpuAvgUsedPercentageChart) {
        this.cpuAvgUsedPercentageChart.destroy();
      }

      this.cpuAvgUsedPercentageChart = Highcharts.chart('cpuAvgUsedPercentageChartContainer', {
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
      if (!this.charts.includes(this.cpuAvgUsedPercentageChart)) {
        this.charts.push(this.cpuAvgUsedPercentageChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getNetworkBandwidthUsage(): void {
    this.infraService.getNetworkBandwidthUsage(this.entityId2!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const timeSeries = data;
      this.getNetworkBandwidthUsageChart(timeSeries);
    })
  }

  getNetworkBandwidthUsageChart(data: { time_bucket: string;[key: string]: any }[]): void {
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

      if (keys.length === 0) {
        if (this.networkBandwidthUsageChart) {
          this.networkBandwidthUsageChart.destroy();
        }

        this.networkBandwidthUsageChart = Highcharts.chart('networkBandwidthUsageChartContainer', {
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
        data: data.map(d => Number(d[key]))
      }));

      if (this.networkBandwidthUsageChart) {
        this.networkBandwidthUsageChart.destroy();
      }

      this.networkBandwidthUsageChart = Highcharts.chart('networkBandwidthUsageChartContainer', {
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
      if (!this.charts.includes(this.networkBandwidthUsageChart)) {
        this.charts.push(this.networkBandwidthUsageChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getMemoryRam(): void {
    this.infraService.getMemoryRam(this.entityId2!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const timeSeries = data;
      this.getMemoryRamChart(timeSeries);
    })
  }

  getMemoryRamChart(data: { time_bucket: string;[key: string]: any }[]): void {
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

      if (keys.length === 0) {
        if (this.memoryRamChartChart) {
          this.memoryRamChartChart.destroy();
        }

        this.memoryRamChartChart = Highcharts.chart('memoryRamChartContainer', {
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
        data: data.map(d => Number(d[key]))
      }));

      if (this.memoryRamChartChart) {
        this.memoryRamChartChart.destroy();
      }

      this.memoryRamChartChart = Highcharts.chart('memoryRamChartContainer', {
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
      if (!this.charts.includes(this.memoryRamChartChart)) {
        this.charts.push(this.memoryRamChartChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getDiskReadWrite(): void {
    this.infraService.getDiskReadWrite(this.entityId2!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const timeSeries = data;
      this.getDiskReadWriteChart(timeSeries);
    })
  }

  getDiskReadWriteChart(data: { time_bucket: string;[key: string]: any }[]): void {
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

      if (keys.length === 0) {
        if (this.diskReadWriteChart) {
          this.diskReadWriteChart.destroy();
        }

        this.diskReadWriteChart = Highcharts.chart('diskReadWriteChartContainer', {
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
        data: data.map(d => Number(d[key]))
      }));

      if (this.diskReadWriteChart) {
        this.diskReadWriteChart.destroy();
      }

      this.diskReadWriteChart = Highcharts.chart('diskReadWriteChartContainer', {
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
      if (!this.charts.includes(this.diskReadWriteChart)) {
        this.charts.push(this.diskReadWriteChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  // DB

  getQpsData(): void {
    this.databaseService.getServiceCurrentQPS(this.entityId3!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const timeSeries = data.serviceResponse;
      this.getQpsDataChart(timeSeries);
    })
  }

  getQpsDataChart(data: { time_bucket: string;[key: string]: any }[]): void {
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

      if (keys.length === 0) {
        if (this.qpsDataChart) {
          this.qpsDataChart.destroy();
        }

        this.qpsDataChart = Highcharts.chart('qpsDataChartContainer', {
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
        data: data.map(d => Number(d[key]))
      }));

      if (this.qpsDataChart) {
        this.qpsDataChart.destroy();
      }

      this.qpsDataChart = Highcharts.chart('qpsDataChartContainer', {
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
      if (!this.charts.includes(this.qpsDataChart)) {
        this.charts.push(this.qpsDataChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getTpsData(): void {
    this.databaseService.getServiceCurrentTPS(this.entityId3!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const timeSeries = data.serviceResponse;
      this.getTpsDataChart(timeSeries);
    })
  }

  getTpsDataChart(data: { time_bucket: string;[key: string]: any }[]): void {
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

      if (keys.length === 0) {
        if (this.tpsDataChart) {
          this.tpsDataChart.destroy();
        }

        this.tpsDataChart = Highcharts.chart('tpsDataChartContainer', {
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
        data: data.map(d => Number(d[key]))
      }));

      if (this.tpsDataChart) {
        this.tpsDataChart.destroy();
      }

      this.tpsDataChart = Highcharts.chart('tpsDataChartContainer', {
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
      if (!this.charts.includes(this.tpsDataChart)) {
        this.charts.push(this.tpsDataChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getCommandTrendsData(): void {
    this.databaseService.getServiceCommandTrends(this.entityId3!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const timeSeries = data.serviceResponse;
      this.getCommandTrendsDataChart(timeSeries);
    })
  }

  getCommandTrendsDataChart(data: { time_bucket: string;[key: string]: any }[]): void {
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

      if (keys.length === 0) {
        if (this.commandTrendsDataChart) {
          this.commandTrendsDataChart.destroy();
        }

        this.commandTrendsDataChart = Highcharts.chart('commandTrendsDataChartContainer', {
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
        data: data.map(d => Number(d[key]))
      }));

      if (this.commandTrendsDataChart) {
        this.commandTrendsDataChart.destroy();
      }

      this.commandTrendsDataChart = Highcharts.chart('commandTrendsDataChartContainer', {
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
      if (!this.charts.includes(this.commandTrendsDataChart)) {
        this.charts.push(this.commandTrendsDataChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getThreadsData(): void {
    this.databaseService.getServiceThreads(this.entityId3!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const timeSeries = data.serviceResponse;
      this.getThreadsDataChart(timeSeries);
    })
  }

  getThreadsDataChart(data: { time_bucket: string;[key: string]: any }[]): void {
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

      if (keys.length === 0) {
        if (this.threadsDataChart) {
          this.threadsDataChart.destroy();
        }

        this.threadsDataChart = Highcharts.chart('threadsDataChartContainer', {
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
        data: data.map(d => Number(d[key]))
      }));

      if (this.threadsDataChart) {
        this.threadsDataChart.destroy();
      }

      this.threadsDataChart = Highcharts.chart('threadsDataChartContainer', {
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
      if (!this.charts.includes(this.threadsDataChart)) {
        this.charts.push(this.threadsDataChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  getConnectsData(): void {
    this.databaseService.getServiceConnects(this.entityId3!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const timeSeries = data.serviceResponse;
      this.getConnectsDataChart(timeSeries);
    })
  }

  getConnectsDataChart(data: { time_bucket: string;[key: string]: any }[]): void {
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

      if (keys.length === 0) {
        if (this.connectsDataChart) {
          this.connectsDataChart.destroy();
        }

        this.connectsDataChart = Highcharts.chart('connectsDataChartContainer', {
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
        data: data.map(d => Number(d[key]))
      }));

      if (this.connectsDataChart) {
        this.connectsDataChart.destroy();
      }

      this.connectsDataChart = Highcharts.chart('connectsDataChartContainer', {
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
      if (!this.charts.includes(this.connectsDataChart)) {
        this.charts.push(this.connectsDataChart);
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

}
