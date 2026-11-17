import { AfterViewInit, ApplicationRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { catchError, filter, from, map, merge, of, Subject, Subscription, switchMap, takeUntil, withLatestFrom } from 'rxjs';
import { DateService } from '../../../../../services/date.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ApmApiService } from '../../../../../services/apm-api.service';
import { DecoderService } from '../../../../../services/decoder.service';
import { ServiceIdService } from '../../../../../services/service-id.service';
import { SharedService } from '../../../../../services/shared.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Highcharts from 'highcharts';
import { Span } from '../../../../../models/traceData';
import { EndpointTraceModalComponent } from "./endpoint-trace-modal/endpoint-trace-modal.component";
import { TableViewComponent } from '../table-view/table-view.component';
import { ListViewComponent } from '../list-view/list-view.component';
import { TraceDetailsModalComponent } from '../trace-details-modal/trace-details-modal.component';
import { TreeViewComponent } from '../tree-view/tree-view.component';
import { StatViewComponent } from '../stat-view/stat-view.component';
import { HighchartsChartModule } from 'highcharts-angular';
import { MeteringConfigService } from '../../../../../services/metering-config.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ThresholdService } from '../../../../../services/threshold.service';
import * as bootstrap from 'bootstrap';
import { AutoRefreshService } from '../../../../../services/auto-refresh.service';

@Component({
  selector: 'app-general-endpoint',
  imports: [
    RouterModule,
    CommonModule,
    FormsModule,
    TraceDetailsModalComponent,
    TableViewComponent,
    ListViewComponent,
    TreeViewComponent,
    StatViewComponent,
    HighchartsChartModule
  ],
  templateUrl: './general-endpoint.component.html',
  styleUrl: './general-endpoint.component.css'
})
export class GeneralEndpointComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild(EndpointTraceModalComponent) endpointTraceDetailModal!: EndpointTraceModalComponent;
  @ViewChild('traceDetailsSection') traceDetailsSection!: ElementRef;

  Highcharts: typeof Highcharts = Highcharts;

  constructor(private dateService: DateService,
    private apiService: ApmApiService,
    private serviceIdService: ServiceIdService,
    private decoderService: DecoderService,
    private appRef: ApplicationRef,
    private modalService: NgbModal,
    private sharedService: SharedService,
    private meteringConfigService: MeteringConfigService,
    private snackBar: MatSnackBar,
    private thresholdService: ThresholdService,
    private autoRefresh: AutoRefreshService,
  ) { }

  logoPath: any;

  selectedServiceId!: string;
  startTime!: number;
  endTime!: number;
  thresholdst!: number;
  datemodel: any;
  searchText: string = '';
  entityId!: string;
  entityInstanceId!: string;
  entityEndpointId!: string;
  ServiceInstanceNames: string[] = [];
  selectedServiceInstance!: string;
  selectedServiceEndpoint!: string;
  serviceId!: string;
  service!: string;
  subscriptions: Subscription = new Subscription();
  private datesubscription: Subscription = new Subscription();
  param = -1;
  private endpointDestroy$ = new Subject<void>();
  endPointNames: { key: string, value: string }[] = [];
  endpointTraceIDLogs: string = '';
  private destroy$ = new Subject<void>();
  EndpointLoadChart: Highcharts.Chart | null = null;
  EndpointAvgResponseTimeChart!: any
  EndpointResponseTimePercentileChart!: any
  EndpointSuccessRateChart: Highcharts.Chart | null = null;
  charts: Highcharts.Chart[] = [];

  thresholds: any = {};
  slaValue: number = 0;

  avgBaselineSR: any = null;
  avgBaselineLoad: any = null;

  successRateInfo: string = "Shows the percentage of successful requests over time. Helps track system reliability and detect failures or errors in operations.";
  loadInfo: string = "Indicates the number of active requests or tasks on the system. Helps assess system stress and detect when resources may be saturated.";
  latencyInfo: string = "Shows the response time of requests over time. Monitoring latency helps identify slow operations and potential performance bottlenecks.";
  latencyPercentileInfo: string = "Latency percentiles measure response times across requests to show how latency is distributed";

  isAutoRefreshEnabled!: boolean;
  refreshInterval!: number;
  private refreshIntervalId: any;
  private storageSub!: Subscription;

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    const storedServiceId = sessionStorage.getItem('SelectedServiceId');
    this.serviceId = storedServiceId ? btoa(storedServiceId) + '.1' : '';
    this.selectedServiceInstance = sessionStorage.getItem('SelectedServiceInstance')!;
    this.selectedServiceId = sessionStorage.getItem('SelectedServiceId')!;
    this.selectedServiceEndpoint = sessionStorage.getItem('SelectedServiceEndpoint')!;
    this.entityId = sessionStorage.getItem('encodedEntityIDForServices')!;
    const encodedEntityId = sessionStorage.getItem('encodedEntityIDForServices');
    this.logoPath = sessionStorage.getItem('logoPath');
    // this.service = atob((sessionStorage.getItem('encodedEntityIDForServices'))!.substring(0, (sessionStorage.getItem('encodedEntityIDForServices'))!.length - 2));

    if (encodedEntityId && encodedEntityId.length > 2) {
      this.service = atob(encodedEntityId.substring(0, encodedEntityId.length - 2));
    } else {
      this.service = '';
    }
    let encodedSelectedServiceId = btoa(this.selectedServiceId) + '.1';
    let encodedSelectedServiceInstance = btoa(this.selectedServiceInstance);
    let encodedSelectedServiceEndpoint = btoa(this.selectedServiceEndpoint);
    this.entityInstanceId = encodedSelectedServiceId + '_' + encodedSelectedServiceInstance;
    this.entityEndpointId = encodedSelectedServiceId + '_' + encodedSelectedServiceEndpoint;
    this.dateService.setActiveComponent('GeneralEndpointComponent');
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
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'GeneralEndpointComponent'),
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
      this.startTime = this.formatDate(this.datemodel.startdateTime);
      this.endTime = this.formatDate(this.datemodel.enddateTime);
      this.thresholdst = this.formatForThresholdDate(this.datemodel.startdateTime);
      this.getEndpointNames();
      const activeElement = document.querySelector('#endpoint-nav .nav-link.active') as HTMLAnchorElement;
      var activeTab = activeElement?.getAttribute('href')?.replace('#', '');
      if (activeTab) {
        this.loadData(activeTab);
      } else {
        this.loadData('overview');
      }
    });
  }

  ngOnDestroy(): void {
    this.endpointDestroy$.next();
    this.endpointDestroy$.complete();
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
  }

  ngAfterViewInit(): void {
    // this.loadData('overview');
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
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

  formatDate(date: string) {
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

  // getEndpointNames(): void {
  //   this.apiService.getEndpoint(this.entityId, this.startTime, this.endTime, this.param, this.param).pipe(
  //     switchMap(data => from(this.decoderService.decodeObject(data)))).pipe(takeUntil(this.endpointDestroy$)).subscribe((data: any) => {
  //       let endPointName = data;
  //       for (const key in endPointName) {
  //         if (endPointName.hasOwnProperty(key)) {
  //           this.endPointNames = (Object.values(endPointName).flat() as string[]).map((ep: string) => ({
  //             key: ep,
  //             value: ep
  //           }));

  //         }
  //       }
  //     })
  // }

  getEndpointNames(): void {
    this.apiService.getEndpoint(this.entityId, this.startTime, this.endTime, this.param, this.param)
      .pipe(
        switchMap(data => from(this.decoderService.decodeObject(data))),
        takeUntil(this.endpointDestroy$)
      )
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid endpoint response structure:", data);
            return;
          }

          if (!data.endpoints || !Array.isArray(data.endpoints)) {
            console.error("Missing or invalid 'endpoints' field in endpoint response:", data);
            return;
          }

          const hasNegative = data.endpoints.some((ep: any) =>
            ep.metrics &&
            Object.values(ep.metrics).some(
              (v: any) => typeof v === "number" && v < 0
            )
          );

          if (hasNegative) {
            console.error("Negative values found in endpoint metrics. Ignoring response:", data);
            return;
          }

          let endPointName = data;
          for (const key in endPointName) {
            if (endPointName.hasOwnProperty(key)) {
              this.endPointNames = (Object.values(endPointName).flat() as string[]).map((ep: string) => ({
                key: ep,
                value: ep
              }));
            }
          }
        },
        error: (err) => {
          console.error("Failed to load endpoint data:", err);
        }
      });
  }

  loadData(tabName: string): void {
    this.destroy$.next();
    switch (tabName) {
      case 'overview':
        this.getEndpointLoad();
        this.getEndpointAvgResponseTime();
        this.getEndpointResponseTimePercentile();
        this.getEndpointSuccessRate();
        this.getThreshold();
        break;
      case 'traces':
        this.fetchInstances();
        this.getTraceNames();
        this.getTraceSegmentsCount();
        break;
      case 'log':
        this.getLogNames();
        this.getLogsAggregatedData();
        this.getLogsAggregatedData2();
        this.getLogsCountTimeSeries();
        break;
    }
  }

  encodeBase64(value: string): string {
    try {
      return btoa(value);
    } catch (e) {
      return value;
    }
  }

  loadValue: any;
  // getEndpointLoad(): void {
  //   this.apiService.getEndpointLoad(this.entityEndpointId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.loadValue = data.load;
  //     this.initialize_EndpointLoad_graph(data.loadTimeSeries);
  //   })
  // }

  getEndpointLoad(): void {
    this.apiService
      .getEndpointLoad(this.entityEndpointId, this.startTime, this.endTime)
      .pipe(
        takeUntil(this.destroy$),
        map((data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid endpoint load response structure:", data);
            return null;
          }

          if (typeof data.load !== "number" || data.load < 0) {
            console.error("Invalid or negative 'load' value in endpoint load response:", data);
            return null;
          }

          if (!data.loadTimeSeries || !Array.isArray(data.loadTimeSeries)) {
            console.error("Missing or invalid 'loadTimeSeries' in endpoint load response:", data);
            return null;
          }

          const hasNegative = data.loadTimeSeries.some(
            (i: any) => typeof i.load === "number" && i.load < 0
          );
          if (hasNegative) {
            console.error("Negative load found in 'loadTimeSeries'. Ignoring endpoint load:", data);
            return null;
          }

          return data;
        }),
        catchError((err) => {
          console.error("Failed to load endpoint load:", err);
          return of(null);
        })
      )
      .subscribe((data: any) => {
        if (!data) return;
        this.loadValue = data.load;
        this.initialize_EndpointLoad_graph(data.loadTimeSeries);
      });
  }


  latencyValue: any;
  // getEndpointAvgResponseTime(): void {
  //   this.apiService.getEndpointAvgResponseTime(this.entityEndpointId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.latencyValue = data.latency;
  //     this.initialize_EndpointAvgResponseTime_graph(data.latencyTimeSeries);
  //   })
  // }

  getEndpointAvgResponseTime(): void {
    this.apiService
      .getEndpointAvgResponseTime(this.entityEndpointId, this.startTime, this.endTime)
      .pipe(
        takeUntil(this.destroy$),
        map((data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid endpoint average response time structure:", data);
            return null;
          }

          if (typeof data.latency !== "number" || data.latency < 0) {
            console.error("Invalid or negative 'latency' value in endpoint average response:", data);
            return null;
          }

          if (!data.latencyTimeSeries || !Array.isArray(data.latencyTimeSeries)) {
            console.error("Missing or invalid 'latencyTimeSeries' in endpoint load response:", data);
            return null;
          }

          const hasNegative = data.latencyTimeSeries.some(
            (i: any) => typeof i.latency === "number" && i.latency < 0
          );
          if (hasNegative) {
            console.error("Negative load found in 'latencyTimeSeries'. Ignoring endpoint average response time:", data);
            return null;
          }

          return data;
        }),
        catchError((err) => {
          console.error("Failed to load endpoint average response time:", err);
          return of(null);
        })
      )
      .subscribe((data: any) => {
        if (!data) return;
        this.latencyValue = data.latency;
        this.initialize_EndpointAvgResponseTime_graph(data.latencyTimeSeries);
      });
  }


  // getEndpointResponseTimePercentile(): void {
  //   this.apiService.getEndpointResponseTimePercentile(this.entityEndpointId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.initialize_EndpointResponseTimePercentile_graph(data);
  //   })
  // }

  getEndpointResponseTimePercentile(): void {
    this.apiService
      .getEndpointResponseTimePercentile(this.entityEndpointId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!Array.isArray(data)) {
            console.error("Invalid endpoint response time percentile structure:", data);
            return;
          }

          const hasInvalidOrNegative = data.some((item: any) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
              return true;
            }

            const percentiles = ["P50", "P75", "P90", "P95", "P99"];
            return percentiles.some((key) => {
              if (!(key in item)) {
                return false;
              }
              const value = item[key];
              return typeof value !== "number" || value < 0;
            });
          });

          if (hasInvalidOrNegative) {
            console.error(
              "Invalid or negative percentile values found in endpoint response time data:",
              data
            );
            return;
          }

          this.initialize_EndpointResponseTimePercentile_graph(data);
        },
        error: (err) => {
          console.error("Failed to load endpoint response time percentile:", err);
        }
      });
  }



  successRate: any;
  // getEndpointSuccessRate(): void {
  //   this.apiService.getEndpointSuccessRate(this.entityEndpointId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.successRate = data.successRate;
  //     this.initialize_EndpointSuccessRate_graph(data.successRateTimeSeries);
  //   })
  // }

  getEndpointSuccessRate(): void {
    this.apiService
      .getEndpointSuccessRate(this.entityEndpointId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid endpoint success rate response structure:", data);
            return;
          }

          if (typeof data.successRate !== "number" || data.successRate < 0) {
            console.error("Invalid or negative 'successRate' value in endpoint:", data);
            return;
          }

          if (!data.successRateTimeSeries || !Array.isArray(data.successRateTimeSeries)) {
            console.error("Missing or invalid 'successRateTimeSeries' for endpoint:", data);
            return;
          }

          const hasNegative = data.successRateTimeSeries.some(
            (item: any) =>
              typeof item.success_rate === "number" && item.success_rate < 0
          );

          if (hasNegative) {
            console.error("Negative success_rate found in endpoint time series:", data);
            return;
          }

          this.successRate = data.successRate;
          this.initialize_EndpointSuccessRate_graph(data.successRateTimeSeries);
        },

        error: (err) => {
          console.error("Failed to load endpoint success rate:", err);
        }
      });
  }

  Timebucket(timebucket: any) {
    timebucket = timebucket.toString();
    const year = parseInt(timebucket.slice(0, 4), 10);
    const month = parseInt(timebucket.slice(4, 6), 10) - 1;
    const day = parseInt(timebucket.slice(6, 8), 10);
    const hour = parseInt(timebucket.slice(8, 10), 10);
    const minute = parseInt(timebucket.slice(10, 12), 10);
    return new Date(year, month, day, hour, minute).getTime();
  }

  initialize_EndpointLoad_graph(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      if (!data || data.length === 0) {
        if (this.EndpointLoadChart) {
          this.EndpointLoadChart.destroy();
          this.EndpointLoadChart = null;
        }
        return;
      }

      const keys = ['Load'];

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
      const gridColor = styles.getPropertyValue('--border-color').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const series: Highcharts.SeriesAreasplineOptions[] = keys.map(key => ({
        name: 'Load',
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.3,
        data: data.map(d => {
          const y = Number(d['load']);
          return {
            y,
            color: this.avgBaselineLoad != null && y > this.avgBaselineLoad ? 'red' : undefined
          };
        })
      }));

      if (this.EndpointLoadChart) {
        this.EndpointLoadChart.destroy();
      }

      this.EndpointLoadChart = Highcharts.chart('EndpointLoad', {
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
          plotLines: this.avgBaselineLoad != null ? [{
            value: this.avgBaselineLoad,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            label: {
              text: `Avg Baseline: ${this.avgBaselineLoad}`,
              align: 'right',
              style: { color: 'red', fontSize: '9px' }
            },
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

      if (!this.charts.includes(this.EndpointLoadChart)) {
        this.charts.push(this.EndpointLoadChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  // Click1
  initialize_EndpointAvgResponseTime_graph(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );

      if (keys.length === 0) {
        if (this.EndpointAvgResponseTimeChart) {
          this.EndpointAvgResponseTimeChart.destroy();
          this.EndpointAvgResponseTimeChart = null;
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
      const gridColor = styles.getPropertyValue('--border-color').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 2,
        data: data.map(d => {
          const y = Number(d[key]);
          return {
            y,
            color: this.avgBaselineSR != null && y > this.avgBaselineSR ? 'red' : undefined
          };
        })
      }));

      if (this.EndpointAvgResponseTimeChart) {
        this.EndpointAvgResponseTimeChart.destroy();
      }

      this.EndpointAvgResponseTimeChart = Highcharts.chart('EndpointAvgResponseTime', {
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
          plotLines: this.avgBaselineLoad != null ? [{
            value: this.avgBaselineLoad,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            label: {
              text: `${this.avgBaselineLoad}`,
              align: 'right',
              style: { color: 'red', fontSize: '9px' }
            },
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
      if (!this.charts.includes(this.EndpointAvgResponseTimeChart)) {
        this.charts.push(this.EndpointAvgResponseTimeChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  onClick1(event: any) {
    document.querySelectorAll('.trace-dropdown').forEach(dropdown => dropdown.remove());
    const dropdown = document.createElement('div');
    dropdown.className = 'trace-dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.left = `${event.pageX}px`;
    dropdown.style.top = `${event.pageY}px`;
    dropdown.style.background = '#07182C';
    dropdown.style.border = '1px solid #07182C';
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
    this.openModal1(point);
  }

  openModal1(point: any) {
    if (this.endpointTraceDetailModal && this.endpointTraceDetailModal.openMinDurationModal) {
      this.endpointTraceDetailModal.openMinDurationModal(point.x, point.y);
    } else {
      console.error('endpointTraceDetailModal is not initialized or method does not exist');
    }
  }


  initialize_EndpointResponseTimePercentile_graph(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );

      if (keys.length === 0) {
        if (this.EndpointResponseTimePercentileChart) {
          this.EndpointResponseTimePercentileChart.destroy();
          this.EndpointResponseTimePercentileChart = null;
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
      const gridColor = styles.getPropertyValue('--border-color').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const colors = [
        '#007FFF',
        '#FF7F0E',
        '#2CA02C',
        '#D62728',
        '#9467BD',
        '#17BECF',
        '#E377C2',
        '#BCBD22'
      ];

      const series: Highcharts.SeriesAreasplineOptions[] = keys.map((key, i) => ({
        name: key,
        type: 'areaspline',
        marker: { radius: 2 },
        lineWidth: 1,
        fillOpacity: 0.1,
        color: colors[i % colors.length],
        data: data.map(d => {
          const y = Number(d[key]);
          return {
            y,
            color: this.avgBaselineSR != null && y > this.avgBaselineSR ? 'red' : undefined
          };
        })
      }));

      if (this.EndpointResponseTimePercentileChart) {
        this.EndpointResponseTimePercentileChart.destroy();
      }

      this.EndpointResponseTimePercentileChart = Highcharts.chart('EndpointResponseTimePercentile', {
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
          plotLines: this.avgBaselineLoad != null ? [{
            value: this.avgBaselineLoad,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            label: {
              text: `${this.avgBaselineLoad}`,
              align: 'right',
              style: { color: 'red', fontSize: '9px' }
            },
            zIndex: 5
          }] : []
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
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
          itemMarginTop: 3,
          itemMarginBottom: 0,
          itemDistance: 4,
          padding: 0
        },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      });
      if (!this.charts.includes(this.EndpointResponseTimePercentileChart)) {
        this.charts.push(this.EndpointResponseTimePercentileChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  // Click2 here
  initialize_EndpointSuccessRate_graph(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );

      if (keys.length === 0) {
        if (this.EndpointSuccessRateChart) {
          this.EndpointSuccessRateChart.destroy();
          this.EndpointSuccessRateChart = null;
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
      const gridColor = styles.getPropertyValue('--border-color').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const series: Highcharts.SeriesColumnOptions[] = [
        {
          name: 'Failure',
          type: 'column',
          data: data.map(d => {
            const y = Number(d[keys[0]]);
            return 100 - y;
          }),
          color: '#DC4245',
          stacking: 'normal'
        },
        {
          name: 'Success',
          type: 'column',
          data: data.map(d => {
            const y = Number(d[keys[0]]);
            return y;
          }),
          color: '#439534',
          stacking: 'normal'
        },

      ];

      if (this.EndpointSuccessRateChart) {
        this.EndpointSuccessRateChart.destroy();
      }

      this.EndpointSuccessRateChart = Highcharts.chart('EndpointSuccessRate', {
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
          plotLines: this.avgBaselineSR != null ? [{
            value: this.avgBaselineSR,
            color: '#7B4019',
            dashStyle: 'Dash',
            width: 2,
            label: {
              text: `Avg Baseline: ${this.avgBaselineSR}`,
              align: 'right',
              style: { color: 'red', fontSize: '9px' }
            },
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
          column: {
            stacking: 'normal',
            maxPointWidth: 10,
            grouping: true,
            borderWidth: 0
          }
        }
      });
      if (!this.charts.includes(this.EndpointSuccessRateChart)) {
        this.charts.push(this.EndpointSuccessRateChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error("Error Occurred ", e);
    }
  }

  onClick2(event: any) {
    // Remove any existing dropdowns
    document.querySelectorAll('.trace-dropdown').forEach(dropdown => dropdown.remove());
    // Create a new dropdown element
    const dropdown = document.createElement('div');
    dropdown.className = 'trace-dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.left = `${event.pageX}px`;
    dropdown.style.top = `${event.pageY}px`;
    dropdown.style.background = '#07182C';
    dropdown.style.border = '1px solid #07182C';
    dropdown.style.borderRadius = '4px';
    dropdown.style.padding = '2px';
    dropdown.style.zIndex = '1000';
    const removeDropdown = () => {
      dropdown.remove();
      document.removeEventListener('click', hideDropdown);
    };
    // Add the "View Related Trace" option to the dropdown
    const viewRelatedTracesOption = document.createElement('div');
    viewRelatedTracesOption.textContent = 'View Related Trace';
    viewRelatedTracesOption.style.cursor = 'pointer';
    viewRelatedTracesOption.style.fontSize = '12px';
    viewRelatedTracesOption.onclick = () => {
      this.handleViewRelatedTraces2(event.point);
      removeDropdown(); // Remove dropdown after clicking
    };
    dropdown.appendChild(viewRelatedTracesOption);
    // dropdown.appendChild(associationMetricsOption);

    document.body.appendChild(dropdown);

    const hideDropdown = (e: any) => {
      if (!dropdown.contains(e.target)) {
        removeDropdown();
      }
    };

    setTimeout(() => document.addEventListener('click', hideDropdown), 0);
  }

  handleViewRelatedTraces2(point: any) {
    this.openModal2(point);
  }

  openModal2(point: any) {
    if (this.endpointTraceDetailModal && this.endpointTraceDetailModal.openNoDurationModal) {
      this.endpointTraceDetailModal.openNoDurationModal(point.x, point.y);
    } else {
      console.error('endpointTraceDetailModal is not initialized or method does not exist');
    }
  }


  getThreshold() {
    const appId = sessionStorage.getItem("ApplicationId");
    const payload = {
        appId,
        entityId: this.entityEndpointId,
        st: this.thresholdst,
        et: this.endTime,
        type: 'SERVICE'
      };
    let componentId = btoa(this.selectedServiceEndpoint);
    this.meteringConfigService.getThreshold(payload)
      .subscribe(res => {
        this.thresholds = res;
      });
  }


  getThresholdDisplay(metric: string, actualValue: number): { value: number, color: string } {
    if (!this.thresholds || !this.thresholds[metric] || actualValue == null) {
      return { value: 0, color: '#3b82f6' };
    }

    const t = this.thresholds[metric];
    let displayValue = t.warningValue;
    let color = 'green';

    if (metric === 'endpoint_resp_time' || metric === 'endpoint_cpm' || metric === 'endpoint_percentile') {
      if (actualValue >= t.criticalValue) {
        displayValue = t.criticalValue;
        color = 'red';
      } else if (actualValue >= t.warningValue) {
        displayValue = t.warningValue;
        color = 'orange';
      }
    }
    else if (metric === 'endpoint_sla') {
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
        color = 'green';
      }
    }

    return { value: displayValue, color };
  }


  // TRACE

  loadingTrace: boolean = true;

  traceNames: any[] = [];
  selectedTraceId: string | null = null;

  currentPageTrace: number = 1;
  rowsPerPageTrace: number = 15;
  totalHitsTrace: number = 0;
  totalPagesTrace: number = 0;

  instancesTraces: any;
  instanceTraces: any;

  traceIDTrace: string | null = '';
  instNameTrace: string = 'All';
  endpointTrace: string = 'All';
  traceState: string = '';
  statusCodeTrace: string = 'All';
  customStatusCodeTrace: string = '';
  minDuration!: any;
  maxDuration!: any;
  sortParameter: 'start_time' | 'duration' | 'isError' = 'start_time';
  orderParameter: 'asc' | 'dec' = 'dec';

  instancesLogs: any;
  instanceLogs: any;



  // TRACE

  selectedCriteria: string | null = null;;
  dropdownOpen = false;

  criteriaList = [
    { key: 'instance', label: 'Instance' },
    { key: 'status', label: 'Status' },
    { key: 'statusCode', label: 'Status Code' },
    { key: 'traceID', label: 'Trace ID' },
    { key: 'minDuration', label: 'Min Duration' },
    { key: 'maxDuration', label: 'Max Duration' }
  ];

  shownCriteria: Record<string, boolean> = {
    instance: false,
    status: false,
    statusCode: false,
    traceID: false,
    minDuration: false,
    maxDuration: false
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
  }

  removeCriteria(criteriaKey: string) {
    this.shownCriteria[criteriaKey] = false;
    if (criteriaKey === 'instance') {
      this.instNameTrace = ''
      this.fetchInstances()
    };
    if (criteriaKey === 'status') this.traceState = '';
    if (criteriaKey === 'statusCode') {
      this.statusCodeTrace = 'All';
      this.customStatusCodeTrace = '';
    }
    if (criteriaKey === 'traceID') this.traceIDTrace = '';
    if (criteriaKey === 'minDuration') this.minDuration = null;
    if (criteriaKey === 'maxDuration') this.maxDuration = null;
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
  //   this.apiService.getServiceInstanceNames(this.entityId!, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe(
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
    this.apiService.getServiceInstanceNames(this.entityId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid service instance response structure:", data);
            return;
          }

          const values = Object.values(data);

          if (!values.length || !values.every(v => Array.isArray(v))) {
            console.error("Missing or invalid instance array values:", data);
            return;
          }

          const instanceArray = ([] as string[]).concat(...(values as string[][]));

          const invalidEntry = instanceArray.some(v => typeof v !== "string" || !v.trim());
          if (invalidEntry) {
            console.error("Invalid entries found in instance list. Ignoring response:", data);
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



  searchTrace(): void {
    this.currentPageTrace = 1;
    this.getTraceNames();
    this.getTraceSegmentsCount();
  }

  // getTraceNames(): void {
  //   this.loadingTrace = true;
  //   const sdt = +this.startTime + "00";
  //   const edt = +this.endTime + "59";
  //   let instanceId = '';
  //   let endpointId = this.entityEndpointId;
  //   if (this.instNameTrace !== 'All') {
  //     instanceId = btoa(this.instNameTrace);
  //     instanceId = `${this.entityId}_${instanceId}`;
  //   } else {
  //     instanceId = this.entityId!;
  //   }
  //   let params: {
  //     serviceId: string;
  //     st: number;
  //     et: number;
  //     page?: number;
  //     sortBy?: string;
  //     instanceId?: string;
  //     traceState?: number;
  //     endpointId?: string;
  //     traceId?: string;
  //     minTraceDuration?: number;
  //     maxTraceDuration?: number;
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
  //   if (this.traceState === 'success') {
  //     params.traceState = 0;
  //   } else if (this.traceState === 'error') {
  //     params.traceState = 1;
  //   }
  //   if (this.traceIDTrace) {
  //     params.traceId = this.traceIDTrace;
  //   }
  //   if (this.currentPageTrace) {
  //     params.page = this.currentPageTrace;
  //   }
  //   if (this.sortParameter) {
  //     params.sortBy = this.sortParameter;
  //   }
  //   if (this.minDuration) {
  //     params.minTraceDuration = this.minDuration;
  //   }
  //   if (this.maxDuration) {
  //     params.maxTraceDuration = this.maxDuration;
  //   }
  //   this.apiService.getTracesData(
  //     params.serviceId,
  //     params.st,
  //     params.et,
  //     params.page,
  //     params.sortBy,
  //     this.orderParameter,
  //     params.instanceId || undefined,
  //     params.traceState,
  //     params.endpointId || undefined,
  //     params.traceId || undefined,
  //     params.minTraceDuration || undefined,
  //     params.maxTraceDuration || undefined,
  //   ).pipe(
  //     switchMap(data => from(this.decoderService.decodeObject(data)))
  //   ).pipe(takeUntil(this.destroy$)).subscribe(
  //     (data: any) => {
  //       this.traceNames = data;
  //       if (this.traceNames.length > 0) {
  //         this.selectItem(this.traceNames[0]);
  //       }
  //       this.loadingTrace = false;
  //     }
  //   );
  // }

  getTraceNames(): void {
    this.loadingTrace = true;
    const sdt = +this.startTime + "00";
    const edt = +this.endTime + "59";
    let instanceId = '';
    let endpointId = this.entityEndpointId;

    if (this.instNameTrace !== 'All') {
      instanceId = btoa(this.instNameTrace);
      instanceId = `${this.entityId}_${instanceId}`;
    } else {
      instanceId = this.entityId!;
    }

    let params: any = {
      serviceId: this.entityId!,
      st: +sdt,
      et: +edt
    };

    if (instanceId !== this.entityId) params.instanceId = instanceId;
    if (endpointId !== this.entityId) params.endpointId = endpointId;
    if (this.traceState === 'success') params.traceState = 0;
    else if (this.traceState === 'error') params.traceState = 1;
    if (this.shownCriteria['statusCode'] && this.statusCodeTrace) {
      params.statusCode = this.statusCodeTrace === 'text' ? this.customStatusCodeTrace : this.statusCodeTrace;
    }
    if (this.traceIDTrace) params.traceId = this.traceIDTrace;
    if (this.currentPageTrace) params.page = this.currentPageTrace;
    if (this.sortParameter) params.sortBy = this.sortParameter;
    if (this.minDuration) params.minTraceDuration = this.minDuration;
    if (this.maxDuration) params.maxTraceDuration = this.maxDuration;

    this.apiService.getTracesData(
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
      params.statusCode || undefined
    )
      .pipe(
        switchMap(data => from(this.decoderService.decodeObject(data))),
        map((res: any) => {

          if (!res || !Array.isArray(res)) {
            console.error("Invalid traces response structure:", res);
            return [];
          }

          const hasNegative = res.some((item: any) =>
            Object.values(item).some(
              v => typeof v === "number" && v < 0
            )
          );
          if (hasNegative) {
            console.error("Negative values found in traces response. Ignoring response:", res);
            return [];
          }
          return res;
        }),
        catchError(err => {
          console.error("Failed to load traces data:", err);
          return of([]);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((data: any) => {
        this.traceNames = data;
        if (this.traceNames.length > 0) {
          this.selectItem(this.traceNames[0]);
        }
        this.loadingTrace = false;
      });
  }

  getTraceSegmentsCount(): void {
    this.loadingTrace = true;
    const sdt = +this.startTime + "00";
    const edt = +this.endTime + "59";
    let instanceId = '';
    let endpointId = this.entityEndpointId;

    if (this.instNameTrace !== 'All') {
      instanceId = btoa(this.instNameTrace);
      instanceId = `${this.entityId}_${instanceId}`;
    } else {
      instanceId = this.entityId!;
    }

    let params: any = {
      serviceId: this.entityId!,
      st: +sdt,
      et: +edt
    };

    if (instanceId !== this.entityId) params.instanceId = instanceId;
    if (endpointId !== this.entityId) params.endpointId = endpointId;
    if (this.traceState === 'success') params.traceState = 0;
    else if (this.traceState === 'error') params.traceState = 1;
    if (this.shownCriteria['statusCode'] && this.statusCodeTrace) {
      params.statusCode = this.statusCodeTrace === 'text' ? this.customStatusCodeTrace : this.statusCodeTrace;
    }
    if (this.traceIDTrace) params.traceId = this.traceIDTrace;
    if (this.minDuration) params.minTraceDuration = this.minDuration;
    if (this.maxDuration) params.maxTraceDuration = this.maxDuration;

    this.apiService.getTraceSegmentsCount(
      params.serviceId,
      params.st,
      params.et,
      params.instanceId || undefined,
      params.traceState,
      params.endpointId || undefined,
      params.traceId || undefined,
      params.minTraceDuration || undefined,
      params.maxTraceDuration || undefined,
      params.statusCode || undefined
    )
      .pipe(
        takeUntil(this.destroy$),
        map((res: any) => {
          if (typeof res !== "number") {
            console.error("Invalid trace segments response structure:", res);
            return null;
          }
          if (res < 0) {
            console.error("Negative trace count found. Ignoring response:", res);
            return null;
          }
          return res;
        }),
        catchError(err => {
          console.error("Failed to load trace segments count:", err);
          return of(null);
        })
      )
      .subscribe((data: any) => {
        if (data !== null) {
          this.totalHitsTrace = data;
          this.calculateTracePagination();
        }
      });
  }

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

  getTraceSegmentsCount2(): void {
    const sdt = +this.startTime + "00";
    const edt = +this.endTime + "59";
    let instanceId = '';
    let endpointId = this.entityEndpointId;
    if (this.instNameTrace !== 'All') {
      instanceId = btoa(this.instNameTrace);
      instanceId = `${this.entityId}_${instanceId}`;
    } else {
      instanceId = this.entityId!;
    }
    let params: any = {
      serviceId: this.entityId!,
      st: +sdt,
      et: +edt
    };
    if (instanceId !== this.entityId) {
      params.instanceId = instanceId;
    }
    if (this.traceState === 'success') {
      params.traceState = 0;
    } else if (this.traceState === 'error') {
      params.traceState = 1;
    }
    if (this.shownCriteria['statusCode'] && this.statusCodeTrace) {
      params.statusCode = this.statusCodeTrace === 'text' ? this.customStatusCodeTrace : this.statusCodeTrace;
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

    this.apiService.getTraceSegmentsCount(
      params.serviceId,
      params.st,
      params.et,
      params.instanceId || undefined,
      params.traceState,
      params.endpointId || undefined,
      params.traceId || undefined,
      params.minTraceDuration || undefined,
      params.maxTraceDuration || undefined,
      params.statusCode || undefined
    )
      .pipe(
        takeUntil(this.destroy$),
        map((res: any) => {
          if (typeof res !== "number") {
            console.error("Invalid trace segments response structure:", res);
            return null;
          }
          if (res < 0) {
            console.error("Negative trace count found. Ignoring response:", res);
            return null;
          }
          return res;
        }),
        catchError(err => {
          console.error("Failed to load trace segments count:", err);
          return of(null);
        })
      )
      .subscribe((data: any) => {
        if (data !== null) {
          this.totalHitsTrace = data;
          this.calculateTracePagination();
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

  get traceItemRange(): string {
    if (this.totalHitsTrace === 0) return '0/0';
    const start = (this.currentPageTrace - 1) * this.rowsPerPageTrace + 1;
    const end = Math.min(this.currentPageTrace * this.rowsPerPageTrace, this.totalHitsTrace);
    return `${end}/${this.totalHitsTrace}`;
  }

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
  } | null = null;

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
      // setTimeout(() => {
      //   this.traceDetailsSection.nativeElement.scrollIntoView({
      //     behavior: 'smooth',
      //     block: 'start'
      //   });
      // }, 0);
    } else {
      this.clearSelection();
    }
  }

  // fetchTraceDataList(traceId: string): void {
  //   this.apiService.getTraceMetaData(traceId).pipe(takeUntil(this.destroy$)).pipe(takeUntil(this.destroy$)).subscribe(
  //     (response: any) => {
  //       const spans = response || [];
  //       this.traceMetaData = response || [];
  //       this.traceData = JSON.parse(JSON.stringify(spans));
  //       this.hierarchicalList = this.buildHierarchicalList(spans);
  //     },
  //     error => {
  //     }
  //   );
  // }

  fetchTraceDataList(traceId: string): void {
    this.apiService
      .getTraceMetaData(traceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (!Array.isArray(response)) {
            console.error("Invalid trace metadata response structure:", response);
            this.traceMetaData = [];
            this.traceData = [];
            this.hierarchicalList = [];
            return;
          }

          const hasNegativeTime = response.some((span: any) =>
            (typeof span.startTime === "number" && span.startTime < 0) ||
            (typeof span.endTime === "number" && span.endTime < 0)
          );

          if (hasNegativeTime) {
            console.error("Negative time values found in trace metadata. Ignoring response:", response);
            this.traceMetaData = [];
            this.traceData = [];
            this.hierarchicalList = [];
            return;
          }

          const spans = response || [];
          this.traceMetaData = response || [];
          this.traceData = JSON.parse(JSON.stringify(spans));
          this.hierarchicalList = this.buildHierarchicalList(spans);
        },
        error: (error) => {
          console.error("Failed to fetch trace metadata:", error);
        }
      });
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
      tags: item.tags
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.modalData = null;
    this.showModal = false;
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



  // LOGS

  loadingLogs: boolean = true;

  entityLogId!: string;
  logNames: any[] = [];
  logStats: any;

  currentPageLog: number = 1;
  rowsPerPageLog: number = 15;
  totalHitsLog: number = 0;
  totalPagesLog: number = 0;

  traceIDLogs: string | null = '';
  tags: string = '';
  instNameLogs: string = 'All';
  endpointLog: string = 'All';
  keywordsOfContent: string = '';
  excludingKeywordsOfContent: string = '';
  sortLogs: boolean = false;

  logsTimeSeriesChart: Highcharts.Options | null = null;


  // LOGS

  openTraceTabLogs(selectedTraceId: any): void {
    const logTab = document.querySelector('.nav-link[href="#traces"]') as HTMLElement;
    if (logTab) {
      logTab.click();
    }
    this.traceIDTrace = selectedTraceId;
    // this.searchTrace();
    this.loadData('traces')
    this.selectCriteria('traceID');
  }

  selectedCriteriaLogs: string | null = null;;
  dropdownOpenLogs = false;
  selectedRowIndex: number | null = null;

  criteriaListLogs = [
    { key: 'instance', label: 'Instance' },
    { key: 'traceID', label: 'Trace ID' },
    { key: 'tags', label: 'Status' },
    { key: 'incContent', label: 'Inc Content' },
    { key: 'excContent', label: 'Exc Content' }
  ];

  shownCriteriaLogs: Record<string, boolean> = {
    instance: false,
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
    this.getLogsAggregatedData2();
    this.getLogsCountTimeSeries();
    this.selectedLevels = [];
  }

  searchLogs2(): void {
    this.currentPageLog = 1;
    this.getLogNames();
    this.getLogsAggregatedData();
    this.getLogsCountTimeSeries();
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
      default: return 'text-secondary';
    }
  }

  // getLogsAggregatedData(): void {
  //   const sdt = this.startTime + "00";
  //   const edt = this.endTime + "59";
  //   let instanceId = '';
  //   let endpointId = this.entityEndpointId;
  //   if (this.instNameLogs !== 'All') {
  //     instanceId = btoa(this.instNameLogs);
  //     instanceId = `${this.entityId}_${instanceId}`;
  //   } else {
  //     instanceId = this.entityId!;
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
  //   this.apiService.getLogsAggregatedData(
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
    let endpointId = this.entityEndpointId;

    if (this.instNameLogs !== 'All') {
      instanceId = btoa(this.instNameLogs);
      instanceId = `${this.entityId}_${instanceId}`;
    } else {
      instanceId = this.entityId!;
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

    if (instanceId !== this.entityId) params.instanceId = instanceId;
    if (endpointId !== this.entityId) params.endpointId = endpointId;
    if (this.traceIDLogs) params.traceId = this.traceIDLogs;
    if (this.tags) params.tags = this.tags;
    if (this.excludingKeywordsOfContent) params.excludingKeywordsOfContent = this.excludingKeywordsOfContent;
    if (this.keywordsOfContent) params.keywordsOfContent = this.keywordsOfContent;

    this.apiService.getLogsAggregatedData(
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

          if (typeof data.total_hits !== "number" || data.total_hits < 0) {
            console.error("Invalid or negative 'total_hits' value:", data);
            return;
          }

          this.totalHitsLog = data.total_hits || 0;
          this.totalPagesLog = Math.ceil(this.totalHitsLog / this.rowsPerPageLog);
        },

        error: (err) => {
          console.error("Failed to load logs aggregated data:", err);
        }
      });
  }


  getLogsAggregatedData2(): void {
    const sdt = this.startTime + "00";
    const edt = this.endTime + "59";
    let instanceId = '';
    let endpointId = this.entityEndpointId;

    if (this.instNameLogs !== 'All') {
      instanceId = btoa(this.instNameLogs);
      instanceId = `${this.entityId}_${instanceId}`;
    } else {
      instanceId = this.entityId!;
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

    if (instanceId !== this.entityId) params.instanceId = instanceId;
    if (endpointId !== this.entityId) params.endpointId = endpointId;
    if (this.traceIDLogs) params.traceId = this.traceIDLogs;
    if (this.tags) params.tags = this.tags;
    if (this.excludingKeywordsOfContent) params.excludingKeywordsOfContent = this.excludingKeywordsOfContent;
    if (this.keywordsOfContent) params.keywordsOfContent = this.keywordsOfContent;

    this.apiService.getLogsAggregatedData(
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

          if (typeof data.total_hits !== "number" || data.total_hits < 0) {
            console.error("Invalid or negative 'total_hits' value:", data);
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
      default: return 'logs-secondary-selected';
    }
  }

  getLogNames(): void {
    this.loadingLogs = true;
    const sdt = this.startTime + "00";
    const edt = this.endTime + "59";
    let instanceId = '';
    let endpointId = this.entityEndpointId;
    if (this.instNameLogs !== 'All') {
      instanceId = btoa(this.instNameLogs);
      instanceId = `${this.entityId}_${instanceId}`;
    } else {
      instanceId = this.entityId!;
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
      sort?: boolean
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
    this.apiService.getLogsData(
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
      catchError(err => {
        console.error("Failed to decode or fetch logs data:", err);
        this.loadingLogs = false;
        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (decodedData: any) => {
        if (!decodedData || typeof decodedData !== 'object') {
          console.error("Invalid decoded logs structure:", decodedData);
          this.logNames = [];
          this.loadingLogs = false;
          return;
        }

        if (!Array.isArray(decodedData)) {
          console.error("Expected decoded logs to be an array:", decodedData);
          this.logNames = [];
          this.loadingLogs = false;
          return;
        }

        const filtered = decodedData.filter((item: any) => {
          if (!item || typeof item !== 'object') return false;
          if ('timeBucket' in item && typeof item.timeBucket === 'number' && item.timeBucket < 0) {
            return false;
          }
          if (!item.content && !item.traceId && !item.ServiceId) return false;
          return true;
        });
        this.logNames = filtered;
        this.loadingLogs = false;
      },

      error: (err) => {
        console.error("Failed to load logs:", err);
        this.logNames = [];
        this.loadingLogs = false;
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

  get logItemRange(): string {
    if (this.totalHitsLog === 0) return '0/0';
    const start = (this.currentPageLog - 1) * this.rowsPerPageLog + 1;
    const end = Math.min(this.currentPageLog * this.rowsPerPageLog, this.totalHitsLog);
    return `${end}/${this.totalHitsLog}`;
  }

  getLogsCountTimeSeries(): void {
    const sdt = this.startTime;
    const edt = this.endTime;
    let instanceId = '';
    let endpointId = this.entityEndpointId;
    if (this.instNameLogs !== 'All') {
      instanceId = btoa(this.instNameLogs);
      instanceId = `${this.entityId}_${instanceId}`;
    } else {
      instanceId = this.entityId!;
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
    this.apiService.getLogsCountTimeSeries(
      params.serviceId,
      params.st,
      params.et,
      params.instanceId,
      params.endpointId,
      params.traceId,
      params.tags,
      params.excludingKeywordsOfContent,
      params.keywordsOfContent
    ).pipe(
      takeUntil(this.destroy$),
      map((data: any) => {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          console.error('Invalid logs count response structure:', data);
          return null;
        }

        if (!data.time_series || !Array.isArray(data.time_series)) {
          console.error("Missing or invalid 'time_series' in logs count response:", data);
          return null;
        }

        const hasNegativeTotal = data.time_series.some((ts: any) =>
          typeof ts.total === 'number' && ts.total < 0
        );
        if (hasNegativeTotal) {
          console.error('Negative total value found in logs time_series. Ignoring response:', data);
          return null;
        }

        return data.time_series;
      }),
      catchError(err => {
        console.error('Failed to load logs count time series:', err);
        return of(null);
      })
    ).subscribe((timeSeries: any) => {
      if (!timeSeries) {
        return;
      }
      this.getLogsCountTimeSeriesChart(timeSeries);
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
      const gridColor = styles.getPropertyValue('--border-color').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      // Assign colors to log levels
      const levelColors: Record<string, string> = {
        ERROR: '#FF4C4C',
        WARN: '#ffc107',
        INFO: '#4C9AFF',
        DEBUG: '#6c757d',
        TRACE: '#9C27B0'
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
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          formatter: function () {
            let tooltip = `<b>${this.points?.[0]?.category}</b><br/>`;
            const total = (this.points && this.points[0]?.total) || 0;
            tooltip += `<b>Total: ${total}</b><br/>`;

            this.points?.forEach(p => {
              tooltip += `<span style="color:${p.color}">\u25CF</span> ${p.series.name}: <b>${p.y}</b><br/>`;
            });

            return tooltip;
          }
        },
        legend: { enabled: true },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };
    } catch (e) {
      console.log("Error Occurred ", e);
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
