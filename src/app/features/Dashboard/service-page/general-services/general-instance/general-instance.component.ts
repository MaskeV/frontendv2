import { Component, OnDestroy, OnInit, ViewChild, HostListener, ElementRef, AfterViewInit } from '@angular/core';
import { DateService } from '../../../../../services/date.service';
import { filter, from, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApmApiService } from '../../../../../services/apm-api.service';
import Highcharts from 'highcharts';
import 'highcharts/modules/bullet';
import { HighchartsChartModule } from 'highcharts-angular';
import $ from 'jquery';
import { Span } from '../../../../../models/traceData';
import { ServiceIdService } from '../../../../../services/service-id.service';
import { DecoderService } from '../../../../../services/decoder.service';
import * as d3 from 'd3';
import { Modal } from 'bootstrap';
import { InstanceTraceModalComponent } from "./instance-trace-modal/instance-trace-modal.component";
import { PaginatePipe } from '../../../../../pipes/paginate.pipe';
import { TableViewComponent } from '../table-view/table-view.component';
import { ListViewComponent } from '../list-view/list-view.component';
import { StatViewComponent } from '../stat-view/stat-view.component';
import { TraceDetailsModalComponent } from '../trace-details-modal/trace-details-modal.component';
import { TreeViewComponent } from '../tree-view/tree-view.component';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Tab } from 'bootstrap';
import { ThresholdService } from '../../../../../services/threshold.service';
import { MeteringConfigService } from '../../../../../services/metering-config.service';
declare var bootstrap: any;

@Component({
  selector: 'app-general-instance',
  imports: [CommonModule, FormsModule, RouterModule, InstanceTraceModalComponent, HighchartsChartModule,
    TableViewComponent, ListViewComponent, StatViewComponent, TraceDetailsModalComponent, TreeViewComponent, MatButtonModule, MatTooltipModule],
  templateUrl: './general-instance.component.html',
  styleUrl: './general-instance.component.css'
})
export class GeneralInstanceComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild(InstanceTraceModalComponent) instanceTraceDetailModal!: InstanceTraceModalComponent;
  @ViewChild('traceDetailsSection') traceDetailsSection!: ElementRef;

  constructor(private dateService: DateService,
    private apiService: ApmApiService,
    private serviceIdService: ServiceIdService,
    private decoderService: DecoderService,
    private snackBar: MatSnackBar,
    private thresholdService: ThresholdService,
    private meteringConfigService: MeteringConfigService,
  ) {

  }

  Highcharts: typeof Highcharts = Highcharts;
  EndpointChart: any
  kpis: any = {
    Availablity: "",
    latency: "",
    load: "",
    error: "",
    ignoredError: "",
    hits: ""
  }

  expandedLogIndex: number | null = null;
  selectedRowIndex: number | null = null;

  selectedCriteriaLogs: string | null = null;;
  dropdownOpenLogs = false;

  criteriaListLogs = [

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
  charts: Highcharts.Chart[] = [];
  AppAvailHighcharts5Day!: Highcharts.Options;
  AppAvailHighcharts10Day!: Highcharts.Options;

  logoPath: any;

  totalItems = 0;
  pageSize = 5;
  currentPage = 1;
  inputPage: number = 1;
  selectedServiceId!: string;
  serviceId!: string;
  selectedServiceInstance!: string;
  entityId!: string;
  service!: string;
  entityInstanceId!: string;
  private dateSubscription: Subscription = new Subscription();
  datemodel: any;
  startTime!: number;
  thresholdst!: number;
  endTime!: number;
  enddate!: string;
  subscriptions: Subscription = new Subscription();
  private destroy$ = new Subject<void>();

  // overview part
  ServiceInstanceNames: string[] = [];
  ServiceInstanceLoadTimevaluesChart: any;
  ServiceInstanceSuccessRateTimevaluesChart!: any;
  ServiceInstanceLatencyTimevaluesChart!: any;
  ServiceInstanceDatabaseConnectionPoolChart!: any;
  ServiceInstanceThreadPoolChart!: any;
  selectedPoint: any;

  slowEndpointsInCurrentServiceValuePairs: { isCopied: boolean; slowEndpointsInCurrentServiceText: string, slowEndpointsInCurrentServiceValue: any, status: string; percentile: number; }[] = [];
  isDataAvailable!: boolean;
  param = -1;

  // TRACE

  traceNames: any[] = [];
  selectedTraceId: string | null = null;

  currentPageTrace: number = 1;
  rowsPerPageTrace: number = 20;
  totalHitsTrace: number = 0;
  totalPagesTrace: number = 0;

  endpoints: { name: string, value: string }[] = [{ name: 'All', value: 'All' }];
  endpointTrace: string = 'All';
  textEndpoint: string = '';
  status: string = '';
  statusCode: string = 'All';
  customStatusCodeTrace: string = '';
  traceID: string = '';
  minDuration!: any;
  maxDuration!: any;
  logStats: any;
  sortLogs: boolean = false;



  thresholds: any = {};
  uptimeData: any = {};
  slaValue: number = 0;
  componentId: string | null = '';
  chart_criteria: string | null = 'avg';
  jvm_mem_chart_data: string = 'All';
  jvm_mem_detail_chart_data: string = 'All';
  jvm_gc_time_chart_data: string = 'All';

  sortParameter: 'start_time' | 'duration' | 'isError' = 'start_time';
  orderParameter: 'asc' | 'dec' = 'dec';
  selectedItem: string | null = null;
  selectedLatency: string | null = null;
  hierarchicalList: any[] = [];
  traceMetaData: any[] = [];
  public traceData!: Array<Span>;
  showModal: boolean = false;
  paginatedData: { endpointId: string, startTime: number, timeBucket: string, isError: number, traceId: string, instance: string, latency?: any }[] = [];
  tableData: { endpointId: string, startTime: number, timeBucket: string, isError: number, traceId: string, instance: string }[] = [];
  filteredData: { endpointId: string, startTime: number, timeBucket: string, isError: number, traceId: string, instance: string }[] = [];
  rowsPerPage: number = 20;
  totalPages: number = 0;
  maxVisiblePages: number = 3;
  visiblePageNumbers: number[] = [];

  currentPageLogs: number = 1;

  tableDataLogs: { content: string, tags: any, traceId: string | null, instance: string, timeBucket: number | null, endpointId: string | null }[] = [];
  filteredDataLogs: { content: string, tags: any, traceId: string | null, instance: string, timeBucket: number | null, endpointId: string | null }[] = [];
  paginatedDataLogs: { content: string, tags: any, traceId: string | null, instance: string, timeBucket: number | null, endpointId: string | null }[] = [];
  noData!: boolean;
  size = 20;
  totalPagesLogs: number = 0;
  maxVisiblePagesLogs = 3;
  visiblePageNumbersLogs: number[] = [];
  logData: any = {};
  logDataKeys!: string[];
  selectedView: 'list' | 'tree' | 'table' | 'stat' = 'table';

  // log part

  loadingLogs: boolean = true;

  entityLogId!: string;
  logNames: any[] = [];

  currentPageLog: number = 1;
  rowsPerPageLog: number = 15;
  totalHitsLog: number = 0;
  totalPagesLog: number = 0;

  traceIDLogs: string | null = '';
  tags: string = '';
  instNameLogs: string = 'All';
  endpointLogs: string = 'All';
  keywordsOfContent: string = '';
  excludingKeywordsOfContent: string = '';

  logsTimeSeriesChart: Highcharts.Options | null = null;

  endpointsLogs: { name: string, value: string }[] = [{ name: 'All', value: 'All' }];
  instancesLogs: { name: string, value: string }[] = [{ name: 'All', value: 'All' }];
  selectedTraceIdLogs: string | null = null;
  selectedItemLogs: { ServiceId?: string, content: string, tags: any, traceId: string | null, instance: string, timeBucket: number | null, endpointId: string | null } | null = null;
  showModalLogs: boolean = false;

  // JVM part
  JvmCpuChart!: any;
  JvmMemoryChart!: any;
  JvmMemoryDetailChart!: any;
  JvmGCTimeChart!: any;
  JvmGCCountChart!: any;
  JvmThreadCountChart!: any;
  JvmThreadStateCountChart!: any;
  JvmClassCountChart!: any;

  // PVM part
  PvmCpuUtilizationChart!: any;
  PvmThreadCountChart!: any;
  PvmGcCountChart!: any;
  PvmMemChart!: any;
  PvmGCTimeChart!: any;
  hasPvmCpuData: boolean = false;
  hasPvmThreadCount: boolean = false;
  hasPvmGCCount: boolean = false;
  hasPvmMemUtilization: boolean = false;
  hasPvmGCTime: boolean = false;

  // Golang part

  MemoryHeapSizeChart!: any;
  LiveThreadsNumChart!: any;
  GoRoutineScheduleTimeChart!: any;
  GcCountPerMinuteChart!: any;
  GcPauseTimePerMinuteChart!: any;
  GcGoalSizeChart!: any;
  GcFreeSizeChart!: any;
  HeapAllocSizeChart!: any;
  HeapObjectCountChart!: any;
  FreeSizePerMinuteChart!: any;
  AllocSizePerMinuteChart!: any;
  MetaDataMspanChart!: any;
  MetaDataMcacheChart!: any;
  hasMemoryHeapSize: boolean = false;
  hasLiveThreadsNum: boolean = false;
  hasGoRoutineScheduleTime: boolean = false;
  hasGcCountPerMinute: boolean = false;
  hasGcPauseTimePerMinute: boolean = false;
  hasGcGoalSize: boolean = false;
  hasGcFreeSize: boolean = false;
  hasHeapAllocSize: boolean = false;
  hasHeapObjectCount: boolean = false;
  hasFreeSizePerMinute: boolean = false;
  hasAllocSizePerMinute: boolean = false;
  hasMetaDataMspan: boolean = false;
  hasMetaDataMcache: boolean = false;

  // .Net part

  hasCrlCPUData: boolean = false;
  hasClrGcData: boolean = false;
  hasClrHeapMemoryData: boolean = false;
  hasClrThreadData: boolean = false;
  crlCPUDataChart: any;
  crlClrGcChart: any;
  crlClrHeapMemoryChart: any;
  crlClrThreadChart: any;
  languages = [
    { id: 'jvm', label: 'JVM' },
    { id: 'pvm', label: 'PVM' },
    { id: 'golang', label: 'Golang' },
    { id: 'dotnet', label: '.NET' }
  ];

  selectedLanguage: any = { id: 'jvm', label: 'JVM' };


  selectedCriteria: string | null = null;;
  dropdownOpen = false;



  @ViewChild('criteriaDropdown', { static: false }) criteriaDropdown!: ElementRef;
  @ViewChild('criteriaCard', { static: false }) criteriaCard!: ElementRef;

  criteriaList = [
    { key: 'endpoint', label: 'Endpoint' },
    { key: 'status', label: 'Status' },
    { key: 'statusCode', label: 'Status Code' },
    { key: 'traceID', label: 'Trace ID' },
    { key: 'minDuration', label: 'Min Duration' },
    { key: 'maxDuration', label: 'Max Duration' }
  ];

  shownCriteria: Record<string, boolean> = {
    endpoint: false,
    status: false,
    statusCode: false,
    traceID: false,
    minDuration: false,
    maxDuration: false

  };

  currentView: 'table' | 'list' | 'flame' | 'tree' | 'stat' | 'logs' = 'table';

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



  // Example data


  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.logoPath = sessionStorage.getItem('logoPath');
    // this.totalPages = this.allData.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    const storedServiceId = sessionStorage.getItem('SelectedServiceId');
    this.serviceId = storedServiceId ? btoa(storedServiceId) + '.1' : '';
    this.selectedServiceInstance = sessionStorage.getItem('SelectedServiceInstance')!;
    this.selectedServiceId = sessionStorage.getItem('SelectedServiceId')!;
    this.entityId = sessionStorage.getItem('encodedEntityIDForServices')!;
    // this.service = atob((sessionStorage.getItem('encodedEntityIDForServices'))!.substring(0, (sessionStorage.getItem('encodedEntityIDForServices'))!.length - 2));
    if (this.entityId && this.entityId?.length > 2) {
      this.service = atob(this.entityId.substring(0, this.entityId?.length - 2));
    } else {
      this.service = '';
    }
    let encodedSelectedServiceId = btoa(this.selectedServiceId) + '.1';
    let encodedSelectedServiceInstance = btoa(this.selectedServiceInstance);
    this.dateService.setActiveComponent('GeneralInstanceComponent');
    this.entityInstanceId = encodedSelectedServiceId + '_' + encodedSelectedServiceInstance;
    this.dateSubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'GeneralInstanceComponent'),
      switchMap(() => this.dateService.date$)
    ).subscribe(dates => {
      this.datemodel = dates;
      this.startTime = this.formatDate(this.datemodel.startdateTime);
      this.thresholdst = this.formatForThresholdDate(this.datemodel.startdateTime);

      this.endTime = this.formatDate(this.datemodel.enddateTime);

      let activeTab = $('#instance-nav .nav-link.active').attr('href')?.replace('#', '');
      activeTab = activeTab == "source" ? this.selectedLanguage.id : activeTab;
      if (activeTab) {
        this.loadData(activeTab);
      }
    });
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.dateSubscription.unsubscribe();
  }
  get availableCriteria() {
    return this.criteriaList.filter(c => !this.shownCriteria[c.key]);
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





  loadData(tabName: string): void {
    this.destroy$.next();
    switch (tabName) {
      case 'overview':
        this.componentId = this.serviceId;
        this.getThreshold("SERVICE");
        this.getServiceInstanceNames();



        this.getServiceInstanceDatabaseConnectionPool();
        this.getServiceInstanceThreadPool();
        // this.getSlowEndpointsInCurrentService()
        this.getInstanceOverviewKpi()
        this.AppAvailBulletChart('', 92, 95, '5');
        this.AppAvailBulletChart('', 85, 95, '10');

        this.loadUptime()

        break;
      case 'traces':
        this.fetchData();
        break;
      case 'log':
        this.fetchDataLogs();
        this.getLogsAggregatedData2();
        this.getLogsCountTimeSeries();
        break;
      case 'jvm':



        this.getJvmMemoryDetail(),

          this.getJvmGCCount(),
          this.getJvmThreadCount(),
          this.getJvmThreadStateCount(),
          this.getJvmClassCount();
        this.componentId = this.entityInstanceId;
        this.getThreshold("JVM");


        break;
      case 'pvm':
        this.getPvmCpuUtilization();
        this.getPvmThreadCount();
        this.getPvmGCCount();
        this.getPvmMemUtilization();
        this.getPvmGCTime();
        break;
      case 'golang':
        this.getMemoryHeapSize();
        this.getLiveThreadsNum();
        this.getGoRoutineScheduleTime();
        this.getGcCountPerMinute();
        this.getGcPauseTimePerMinute();
        this.getGcGoalSize();
        this.getGcFreeSize();
        this.getHeapAllocSize();
        this.getHeapObjectCount();
        this.getFreeSizePerMinute();
        this.getAllocSizePerMinute();
        this.getMetaDataMspan();
        this.getMetaDataMcache();
        break;
      case 'dotnet':
        this.getCrlCPU();
        this.getClrGc();
        this.getClrHeapMemory();
        this.getClrThread();
        break;
    }
  }

  // overview part

  convertTimebucket(timebucket: any) {
    timebucket = timebucket.toString();
    const year = parseInt(timebucket.slice(0, 4), 10);
    const month = parseInt(timebucket.slice(4, 6), 10) - 1;
    const day = parseInt(timebucket.slice(6, 8), 10);
    const hour = parseInt(timebucket.slice(8, 10), 10);
    const minute = parseInt(timebucket.slice(10, 12), 10);

    return new Date(year, month, day, hour, minute).getTime();
  }

  // getServiceInstanceNames(): void {
  //   this.apiService.getServiceInstanceNames(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     const decodedInstance = atob((this.entityId).substring(0, (this.entityId).length - 2))
  //     this.ServiceInstanceNames = data[decodedInstance];
  //   })
  // }

  getServiceInstanceNames(): void {
    this.apiService
      .getServiceInstanceNames(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid service instance response structure:", data);
            return;
          }

          const decodedInstance = atob(this.entityId.substring(0, this.entityId.length - 2));

          const instanceList = data[decodedInstance];
          if (!Array.isArray(instanceList)) {
            console.error("Missing or invalid instance list for decoded instance key:", data);
            return;
          }

          const hasInvalid = instanceList.some(
            v => typeof v !== "string" || !v.trim()
          );

          if (hasInvalid) {
            console.error("Invalid entries found in service instance list. Ignoring response:", data);
            return;
          }

          this.ServiceInstanceNames = instanceList;
        },

        error: (err) => {
          console.error("Failed to load service instance names:", err);
        }
      });
  }


  // getServiceInstanceLoadTimevalues(): void {
  //   this.apiService.getServiceInstanceLoadTimevalues(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.initialize_ServiceInstanceLoadTimevalues_graph(data);
  //   })
  // }

  getServiceInstanceLoadTimevalues(): void {
    this.apiService
      .getServiceInstanceLoadTimevalues(this.entityInstanceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid instance load time response structure:", data);
            return;
          }

          if (typeof data.load !== "number" || data.load < 0) {
            console.error("Invalid or negative 'load' value in instance load response:", data);
            return;
          }

          const hasNegative = data.loadTimeSeries.some(
            (entry: any) =>
              typeof entry.load === "number" && entry.load < 0
          );

          if (hasNegative) {
            console.error("Negative load value found in instance loadTimeSeries. Ignoring response:", data);
            return;
          }

          this.initialize_ServiceInstanceLoadTimevalues_graph(data);
        },

        error: (err) => {
          console.error("Failed to load service instance load time values:", err);
        }
      });
  }


  initialize_ServiceInstanceLoadTimevalues_graph(data: any) {
    try {
      const criticalpoint = this.thresholds?.["service_instance_cpm"]?.criticalValue
      const warningpoint = this.thresholds?.["service_instance_cpm"]?.warningValue
      // Check if chart exists and remove existing series to reset the chart
      if (this.ServiceInstanceLoadTimevaluesChart) {
        while (this.ServiceInstanceLoadTimevaluesChart.series.length > 0) {
          this.ServiceInstanceLoadTimevaluesChart.series[0].remove(false);
          this.ServiceInstanceLoadTimevaluesChart.showLoading('No Data');
        }

        this.ServiceInstanceLoadTimevaluesChart.update({
          xAxis: { categories: [] },
          yAxis: { categories: [] }
        }, false);
      }

      if (!data || data.length === 0) {
        return;
      }

      const serviceLoadValues: any = {};
      const allTimeBuckets: any[] = [];

      const timeSeries = Array.isArray(data.loadTimeSeries) ? data.loadTimeSeries : [];
      this.kpis.load = data.load !== null ? `${data.load}` : 'NA';
      // document.getElementById('load')!.innerText = data.load !== null ? `${data.load} call/min` : 'No Data';



      // Extract all unique time buckets
      timeSeries.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });

      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);

      const statusColors: any = {
        'CRITICAL': '#E94F3D', // Red
        'WARNING': '#ED9C40', // Yellow
        'NORMAL': '#7CB5EC' // Blue
      };
      let pointColor = '#7CB5EC'
      // Process data
      timeSeries.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        const load = ele.load; // Ensure correct key is used
        const status = ele.status;

        if (!serviceLoadValues['Load']) {
          serviceLoadValues['Load'] = [];
        }

        if (ele.load > criticalpoint) {
          pointColor = '#E94F3D';   // Critical
        } else if (ele.load > warningpoint) {
          pointColor = '#ED9C40';   // Warning
        } else {
          pointColor = '#7CB5EC';   // Good
        }

        serviceLoadValues['Load'].push({
          x: time,
          y: load,
          color: pointColor || 'grey' // Default to grey if status is unknown
        });
      });

      // Ensure missing data is represented as null
      const seriesData = [{
        name: 'Load',
        data: allTimeBuckets.map(time => {
          const point = serviceLoadValues['Load'].find((p: any) => p.x === time);
          return point ? point : { x: time, y: null, color: 'grey' };
        }),
        marker: { radius: 1 }
      }];

      // Set min to the first time bucket
      const minTime = this.convertTimebucket(timeSeries[0].time_bucket);
      const baseline = this.thresholds?.["service_instance_cpm"]?.avgBaseline
      const opts1: any = {
        chart: {
          type: 'column',  // Change to column chart
          backgroundColor: 'transparent',
          renderTo: 'ServiceInstanceLoadTimevalues',
        },
        title: { text: null },
        credits: { enabled: false },
        exporting: { enabled: false },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: { fontSize: '8px' }
        },
        xAxis: {
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'shortdot'
          },
          type: 'datetime',
          title: { enabled: false },
          min: minTime,
          tickColor: '#cccccc',
          lineColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
          labels: { style: { color: '#4b4b4b', fontSize: '9' }, y: 15 }
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { enabled: false },
          labels: { style: { color: '#4b4b4b', fontSize: '9' }, x: -7 },
          endOnTick: false,
          startOnTick: true,
          gridLineColor: '#e0dede',
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          plotLines: [
            {
              value: baseline ?? 500,

              color: '#a78a7f',
              width: 2,
              dashStyle: 'Dash',
              zIndex: 5,
              label: {
                align: 'right',
                style: {
                  color: 'red',
                  fontSize: '9px'
                }
              }
            }
          ]
        },
        tooltip: {
          shared: true,
          useHTML: true,
          style: { fontSize: '10px', fontFamily: 'system-ui' },
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              tooltipContent += `<li style="list-style-type: none" ><span  style="color: ${point.color};">●</span> <b >Load:</b>&nbsp;&nbsp;${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += `<li style="list-style-type: none; color:#432818;">
        <span style="color:#432818;">-</span> <b >Baseline:</b>&nbsp;&nbsp; ${baseline}
      </li>`;
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          column: {
            pointPadding: 0.02,
            borderWidth: 0,
            borderRadius: 2,
            groupPadding: 0.1,
            pointWidth: 6
          }
        },
        series: seriesData
      };


      this.ServiceInstanceLoadTimevaluesChart = new Highcharts.Chart(opts1);
      if (!this.charts.includes(this.ServiceInstanceLoadTimevaluesChart)) {
        this.charts.push(this.ServiceInstanceLoadTimevaluesChart);
        this.syncCharts(this.charts);
      }
    } catch (error) {
    }
  }

  // getServiceInstanceSuccessRateTimevalues(): void {
  //   this.apiService.getServiceInstanceSuccessRateTimevalues(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {

  //     this.initialize_ServiceInstanceSuccessRateTimevalues_graph(data);
  //   })
  // }

  getServiceInstanceSuccessRateTimevalues(): void {
    this.apiService
      .getServiceInstanceSuccessRateTimevalues(
        this.entityInstanceId,
        this.startTime,
        this.endTime
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid success rate instance response structure:", data);
            return;
          }

          if (typeof data.successRate !== "number" || data.successRate < 0) {
            console.error("Invalid or negative 'successRate' value:", data);
            return;
          }

          const hasNegative = data.successRateTimeSeries.some(
            (item: any) =>
              typeof item.success_rate === "number" && item.success_rate < 0
          );

          if (hasNegative) {
            console.error(
              "Negative success_rate value found in successRateTimeSeries. Ignoring response:",
              data
            );
            return;
          }

          this.initialize_ServiceInstanceSuccessRateTimevalues_graph(data);
        },

        error: (err) => {
          console.error("Failed to load service instance success rate time values:", err);
        }
      });
  }


  initialize_ServiceInstanceSuccessRateTimevalues_graph(data: any) {

    try {
      const criticalpoint = this.thresholds?.["service_instance_sla"]?.criticalValue
      const warningpoint = this.thresholds?.["service_instance_sla"]?.warningValue
      // Check if chart exists and remove existing series to reset the chart
      if (this.ServiceInstanceSuccessRateTimevaluesChart) {
        while (this.ServiceInstanceSuccessRateTimevaluesChart.series.length > 0) {
          this.ServiceInstanceSuccessRateTimevaluesChart.series[0].remove(false);
          this.ServiceInstanceSuccessRateTimevaluesChart.showLoading('No Data');
        }

        this.ServiceInstanceSuccessRateTimevaluesChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }

      const ServiceInstanceSuccessRateTimevalues: any = {};
      const allTimeBuckets: any[] = [];


      const timeSeries = Array.isArray(data.successRateTimeSeries) ? data.successRateTimeSeries : [];
      this.kpis.Availablity = data.successRate !== null ? `${data.successRate}` : 'NA';
      // document.getElementById('successRate')!.innerText = data.successRate !== null ? `${data.successRate} %` : 'No Data';
      // Extract all unique time buckets
      timeSeries.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });

      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);

      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      let pointColor = '#8338ec';
      timeSeries.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!ServiceInstanceSuccessRateTimevalues[key]) {
              ServiceInstanceSuccessRateTimevalues[key] = [];
            }
            if (ele.success_rate < criticalpoint) {
              pointColor = '#E94F3D';   // Critical
            } else if (ele.success_rate < warningpoint) {
              pointColor = '#ED9C40';   // Warning
            } else {
              pointColor = '#8338ec';   // Good
            }

            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);

            // Push the value for the specific time bucket
            ServiceInstanceSuccessRateTimevalues[key].push([time, ele[key]]);
          }
        });
      });

      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(ServiceInstanceSuccessRateTimevalues).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = ServiceInstanceSuccessRateTimevalues[key].find((p: any) => p[0] === time);
          const pointValue = point ? point[1] : null;

          // Determine color based on success rate
          const isFullSuccess = pointValue === 100;


          return {
            x: time,
            y: pointValue,
            marker: {
              enabled: true,
              radius: 2,
              // fillColor: isFullSuccess ? '#8338ec' : '#bf0603',
              // lineColor: isFullSuccess ? '#8338ec' : '#bf0603',
              fillColor: pointColor,
              lineColor: pointColor,
              lineWidth: 1
            }
          };
        });

        return {
          name: key,
          data: filledData,
          type: 'spline',
          color: '#8338ec', // line color (purple)
          lineWidth: 1,
          point: {
            events: {
              click: (event: any) => this.onClick1(event)
            }
          }
        };
      });


      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(timeSeries[0].time_bucket);
      const baseline = this.thresholds?.["service_instance_sla"]?.avgBaseline

      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'ServiceInstanceSuccessRateTimevalues',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'shortdot'
          },
          type: 'datetime',
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          }
        },
        yAxis: {
          min: 0,
          max: 100,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            x: -7
          },
          gridLineColor: '#e0dede',
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          endOnTick: false,
          startOnTick: true,
          plotLines: [
            {
              value: baseline ?? 100,

              color: '#a78a7f',
              width: 2,
              dashStyle: 'Dash',
              zIndex: 5,
              label: {
                align: 'right',
                style: {
                  color: 'red',
                  fontSize: '9px'
                }
              }
            }
          ]
        },
        tooltip: {
          shared: true,
          useHTML: true,
          style: { fontSize: '10px', fontFamily: 'system-ui' },
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;

            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b>&nbsp;&nbsp; ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += `<li style="list-style-type: none; color:#432818;">
        <span style="color:#432818;">-</span> <b>Baseline:</b>&nbsp;&nbsp; ${baseline}
      </li>`;
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 5,
            color: '#8338ec',
            marker: {
              enabled: true,
              radius: 4,
              fillColor: '#bf0603',
              lineWidth: 4,
              lineColor: '#bf0603'
            }
          }
        },
        series: seriesData
      };

      this.ServiceInstanceSuccessRateTimevaluesChart = new Highcharts.Chart(opts1);
      if (!this.charts.includes(this.ServiceInstanceSuccessRateTimevaluesChart)) {
        this.charts.push(this.ServiceInstanceSuccessRateTimevaluesChart);
        this.syncCharts(this.charts);
      }
    }
    catch {

    }
  }

  onClick1(event: any) {
    document.querySelectorAll('.trace-dropdown').forEach(dropdown => dropdown.remove());
    const dropdown = document.createElement('div');
    dropdown.className = 'trace-dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.left = `${event.pageX}px`;
    dropdown.style.top = `${event.pageY}px`;
    dropdown.style.background = '#f3f4f6';
    dropdown.style.border = '1px solid #d1d5db';
    dropdown.style.borderRadius = '4px';
    dropdown.style.padding = '4px 8px';
    dropdown.style.zIndex = '1000';
    dropdown.style.color = '#0b3b4f';
    dropdown.style.fontWeight = '500';
    dropdown.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
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
    if (this.instanceTraceDetailModal && this.instanceTraceDetailModal.openNoDurationModal) {
      this.instanceTraceDetailModal.openNoDurationModal(point.x, point.y);
    } else {
      console.error('instanceTraceDetailModal is not initialized or method does not exist');
    }
  }

  // getServiceInstanceLatencyTimevalues(): void {
  //   this.apiService.getServiceInstanceLatencyTimevalues(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.initialize_ServiceInstanceLatencyTimevalues_graph(data);
  //   })
  // }

  getServiceInstanceLatencyTimevalues(): void {
    this.apiService
      .getServiceInstanceLatencyTimevalues(this.entityInstanceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid instance latency response structure:", data);
            return;
          }

          if (typeof data.latency !== "number" || data.latency < 0) {
            console.error("Invalid or negative 'latency' value in instance latency response:", data);
            return;
          }

          const hasInvalid = data.latencyTimeSeries.some(
            (item: any) =>
              typeof item.latency === "number" && item.latency < 0
          );

          if (hasInvalid) {
            console.error("Negative 'latency' values found in latencyTimeSeries. Ignoring response:", data);
            return;
          }

          this.initialize_ServiceInstanceLatencyTimevalues_graph(data);
        },

        error: (err) => {
          console.error("Failed to load service instance latency values:", err);
        }
      });
  }


  initialize_ServiceInstanceLatencyTimevalues_graph(data: any) {
    try {

      const criticalpoint = this.thresholds?.["service_resp_time"]?.criticalValue
      const warningpoint = this.thresholds?.["service_resp_time"]?.warningValue
      if (this.ServiceInstanceLatencyTimevaluesChart) {
        while (this.ServiceInstanceLatencyTimevaluesChart.series.length > 0) {
          this.ServiceInstanceLatencyTimevaluesChart.series[0].remove(false);
          this.ServiceInstanceLatencyTimevaluesChart.showLoading('No Data');
        }
        this.ServiceInstanceLatencyTimevaluesChart.update({
          xAxis: { categories: [] },
          yAxis: { categories: [] }
        }, false);
      }

      const ServiceInstanceLatencyTimevalues: any = {};
      const allTimeBuckets: number[] = [];

      const timeSeries = Array.isArray(data.latencyTimeSeries)
        ? data.latencyTimeSeries.filter((d: any) => d.latency !== undefined)
        : [];

      this.kpis.latency =
        data.latency !== null ? `${data.latency}` : 'NA';
      // document.getElementById('latency')!.innerText =
      //   data.latency !== null ? `${data.latency} ms` : 'No Data';
      let maxvalue = 0;
      timeSeries.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (maxvalue < ele.latency) {

          maxvalue = ele.latency
        }
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });

      allTimeBuckets.sort((a, b) => a - b);

      const statusColors: any = {
        CRITICAL: '#E94F3D',
        WARNING: '#ED9C40',
        NORMAL: '#0071A7'
      };

      timeSeries.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        const latency = ele.latency;

        let pointColor = '#0071A7';
        if (latency > criticalpoint) {
          pointColor = '#E94F3D';
        } else if (latency > warningpoint) {
          pointColor = '#ED9C40';
        }

        if (!ServiceInstanceLatencyTimevalues['Latency']) {
          ServiceInstanceLatencyTimevalues['Latency'] = [];
        }

        ServiceInstanceLatencyTimevalues['Latency'].push({
          x: time,
          y: latency,
          color: pointColor
        });
      });


      const seriesData: Highcharts.SeriesOptionsType[] = [{
        name: 'Latency',
        type: 'spline',
        data: allTimeBuckets.map(time => {
          const point = ServiceInstanceLatencyTimevalues['Latency'].find((p: any) => p.x === time);
          return point ? point : { x: time, y: null };
        }),
        marker: { enabled: true, radius: 2 },
        point: {
          events: {
            click: (event: any) => this.onClick2(event)
          }
        },
        color: '#0071A7', // default line color
        lineWidth: 2,
        zones: [
          {
            value: warningpoint, // up to warning
            color: '#0071A7' // blue
          },
          {
            value: criticalpoint, // between warning and critical
            color: '#ED9C40' // yellow
          },
          {
            color: '#E94F3D' // above critical
          }
        ]
      }];



      // Add only the Avg series
      seriesData.push({
        name: 'Avg',
        type: 'areaspline',
        data: allTimeBuckets.map(time => ({ x: time, y: data.latency ?? null })),
        marker: { enabled: false },
        color: '#ea9ab2',
        dashStyle: 'Solid',
        fillOpacity: 0.2,
        custom: { key: 'avg' }
      });

      const minTime = this.convertTimebucket(timeSeries[0]?.time_bucket) ?? 0;
      const baseline = this.thresholds?.["service_resp_time"]?.avgBaseline

      const opts1: Highcharts.Options = {
        chart: {
          type: 'spline',
          backgroundColor: '#FFFFFF',
          renderTo: 'ServiceInstanceLatencyTimevalues',
          spacingBottom: 0,
          spacingTop: 10,
          spacingLeft: 5,
          spacingRight: 5,
          marginBottom: 20,
        },
        title: { text: '' },
        credits: { enabled: false },
        exporting: { enabled: false },
        legend: {
          enabled: true,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            color: '#4b4b4b',
            fontWeight: 'bold',
            fontFamily: 'system-ui',
            fontSize: '8px',
            cursor: 'pointer',
            userSelect: 'none'
          },
          symbolHeight: 1,
          symbolWidth: 10,
          symbolRadius: 0,
          itemMarginTop: 0,
          itemMarginBottom: 0,
          itemDistance: 4,
          padding: 0
        },
        xAxis: {

          type: 'datetime',
          title: { text: null },
          min: minTime,
          labels: {
            style: { color: '#4b4b4b', fontSize: '9px', fontFamily: 'system-ui' },
            y: 17
          },
          gridLineColor: '#e0dede',
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
          // tickLength: 6,
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'ShortDot'
          },
        },
        yAxis: {
          min: 0,
          max: baseline > maxvalue ? baseline : maxvalue,
          tickAmount: 6,
          title: { text: undefined },
          labels: { style: { color: '#4b4b4b', fontSize: '9px', fontFamily: 'system-ui' }, x: -7 },
          gridLineColor: '#e0dede',
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          endOnTick: false,
          startOnTick: true,
          plotLines: [
            {
              value: baseline ?? 1000,

              color: '#a78a7f',
              width: 2,
              dashStyle: 'Dash',
              zIndex: 5,
              label: {
                align: 'right',
                style: {
                  color: 'red',
                  fontSize: '9px'
                }
              }
            }
          ]
        },
        tooltip: {
          shared: true,
          useHTML: true,
          style: { fontSize: '10px', fontFamily: 'system-ui' },
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b>&nbsp;&nbsp; ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += `<li style="list-style-type: none; color:#432818;">
        <span style="color:#432818;">-</span> <b>Baseline:</b> &nbsp;&nbsp;${baseline}
      </li>`;
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: { lineWidth: 2, marker: { radius: 3 } },
          areaspline: { marker: { radius: 0 }, fillOpacity: 0.2 }
        },
        series: seriesData
      };

      this.ServiceInstanceLatencyTimevaluesChart = new Highcharts.Chart(opts1);
      if (!this.charts.includes(this.ServiceInstanceLatencyTimevaluesChart)) {
        this.charts.push(this.ServiceInstanceLatencyTimevaluesChart);
        this.syncCharts(this.charts);
      }

    } catch (error) {
      console.error('Error initializing latency graph:', error);
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
    dropdown.style.background = '#f3f4f6';
    dropdown.style.border = '1px solid #d1d5db';
    dropdown.style.borderRadius = '4px';
    dropdown.style.padding = '4px 8px';
    dropdown.style.zIndex = '1000';
    dropdown.style.color = '#0b3b4f';
    dropdown.style.fontWeight = '500';
    dropdown.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
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
    if (this.instanceTraceDetailModal && this.instanceTraceDetailModal.openMinDurationModal) {
      this.instanceTraceDetailModal.openMinDurationModal(point.x, point.y);
    } else {
      console.error('instanceTraceDetailModal is not initialized or method does not exist');
    }
  }


  // getServiceInstanceDatabaseConnectionPool(): void {
  //   this.apiService.getServiceInstanceDatabaseConnectionPool(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.initialize_ServiceInstanceDatabaseConnectionPool_graph(data);
  //   })
  // }

  getServiceInstanceDatabaseConnectionPool(): void {
    this.apiService
      .getServiceInstanceDatabaseConnectionPool(
        this.entityInstanceId,
        this.startTime,
        this.endTime
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || !Array.isArray(data)) {
            console.error(
              "Invalid database connection pool response structure:",
              data
            );
            return;
          }

          const hasNegative = data.some(entry =>
            Object.values(entry).some(val =>
              typeof val === "number" && val < 0
            )
          );

          if (hasNegative) {
            console.error(
              "Negative numeric values found in DB connection pool response. Ignoring response:",
              data
            );
            return;
          }

          this.initialize_ServiceInstanceDatabaseConnectionPool_graph(data);
        },

        error: (err) => {
          console.error(
            "Failed to load service instance DB connection pool metrics:",
            err
          );
        }
      });
  }


  initialize_ServiceInstanceDatabaseConnectionPool_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.ServiceInstanceDatabaseConnectionPoolChart) {
        while (this.ServiceInstanceDatabaseConnectionPoolChart.series.length > 0) {
          this.ServiceInstanceDatabaseConnectionPoolChart.series[0].remove(false);
          this.ServiceInstanceDatabaseConnectionPoolChart.showLoading('No Data');
        }

        this.ServiceInstanceDatabaseConnectionPoolChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }

      const ServiceInstanceDatabaseConnectionPool: any = {};
      const allTimeBuckets: any[] = [];

      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });

      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);

      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!ServiceInstanceDatabaseConnectionPool[key]) {
              ServiceInstanceDatabaseConnectionPool[key] = [];
            }

            const time = this.convertTimebucket(ele.time_bucket);
            ServiceInstanceDatabaseConnectionPool[key].push([time, ele[key]]);
          }
        });
      });
      const customColors = ['#218380', '#a47152', '#87986a', '#ffd670'];
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(ServiceInstanceDatabaseConnectionPool).map((key, index) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = ServiceInstanceDatabaseConnectionPool[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });

        return {
          name: key,
          data: filledData,
          color: customColors[index % customColors.length],
          marker: {
            radius: 3 // increase marker size for scatter points
          }
        };
      });

      const minTime = this.convertTimebucket(data[0].time_bucket);

      const opts1: any = {
        chart: {
          type: 'scatter',           // Changed here to scatter
          backgroundColor: 'transparent',
          renderTo: 'ServiceInstanceDatabaseConnectionPool',
          events: {
            click: (event: any) => {
              this.hideCustomTooltip();
            }
          }
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'shortdot'
          },
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            x: -7
          },
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          enabled: true,
          shared: true,
          style: { fontSize: '10px', fontFamily: 'system-ui' },
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;

            if (this.points && this.points.length) {
              // Shared tooltip with multiple points
              this.points.forEach((point: any) => {
                tooltipContent += `<li style="list-style-type: none;">
          <span style="color: ${point.series.color};">●</span> 
          <b>${point.series.name}:</b> &nbsp;&nbsp;${point.y}
        </li>`;
              });
            } else if (this.point) {

              const point = this.point;
              tooltipContent += `<li style="list-style-type: none;">
        <span style="color: ${point.series.color};">●</span> 
        <b>${point.series.name}:</b>&nbsp;&nbsp; ${point.y}
      </li>`;
            }

            tooltipContent += '</ul>';
            return tooltipContent;
          }
        }
        ,
        series: seriesData,
        plotOptions: {
          scatter: {
            marker: {
              radius: 3,
              states: {
                hover: {
                  enabled: true,
                  lineColor: 'rgb(100,100,100)'
                }
              }
            }
          },
          series: {
            cursor: 'pointer',
            point: {
              events: {
                click: (event: any) => {
                  this.showCustomTooltip(event.point, event.chartX, event.chartY, true);
                  this.highlightSelectedPoint(event.point);
                }
              }
            }
          }
        }
      };

      this.ServiceInstanceDatabaseConnectionPoolChart = new Highcharts.Chart(opts1);
      if (!this.charts.includes(this.ServiceInstanceDatabaseConnectionPoolChart)) {
        this.charts.push(this.ServiceInstanceDatabaseConnectionPoolChart);
        this.syncCharts(this.charts);
      }

      document.addEventListener('click', (event) => {
        const chartContainer = document.getElementById('ServiceInstanceDatabaseConnectionPool');
        if (chartContainer && !chartContainer.contains(event.target as Node)) {
          // this.hideCustomTooltip();
        }
      });
    } catch {
      // Handle errors if needed
    }
  }


  hideCustomTooltip() {
    const tooltipEl = document.getElementById('custom-tooltip');
    if (tooltipEl) {
      tooltipEl.remove();
    }
    // Reset the marker style for previously selected points
    this.resetSelectedPoint();
  }

  resetSelectedPoint() {
    if (this.selectedPoint) {
      this.selectedPoint.update({
        marker: {
          radius: 2, // Reset radius
          fillColor: null // Reset to default color
        }
      });
      this.selectedPoint = null;
    }
  }

  showCustomTooltip(point: any, x: number, y: number, lockPosition = false) {
    const chartContainer = document.getElementById('ServiceInstanceDatabaseConnectionPool');

    if (!chartContainer) {
      return;
    }

    // Get the chart container dimensions
    const chartRect = chartContainer.getBoundingClientRect();

    // Calculate the tooltip content
    let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', point.x)}</b><br/><br/><ul style="padding-left: 1em;max-height: 20vh;overflow-y: auto;">`;

    point.series.chart.series.forEach((series: any) => {
      const pointInSeries = series.data.find((p: any) => p.x === point.x);
      tooltipContent += `<li style="list-style-type: none;"><span style="color: ${series.color};">●</span> <b>${series.name}:</b> ${pointInSeries ? pointInSeries.y : 'No Data'}</li>`;
    });

    tooltipContent += '</ul>';

    // Create or update the custom tooltip element
    let tooltipEl = document.getElementById('custom-tooltip');
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'custom-tooltip';
      tooltipEl.style.position = 'absolute';
      tooltipEl.style.border = '1px solid black';
      tooltipEl.style.backgroundColor = 'white';
      tooltipEl.style.color = '#0f0f0f';
      tooltipEl.style.fontSize = '12px';
      tooltipEl.style.padding = '5px';
      tooltipEl.style.boxShadow = '0px 0px 10px rgba(0,0,0,0.5)';
      tooltipEl.style.zIndex = '9999';
      document.body.appendChild(tooltipEl);
    }

    tooltipEl.innerHTML = tooltipContent;

    // Calculate the position for the tooltip
    let tooltipX = x + chartRect.left + 10; // Default right position
    let tooltipY = y + chartRect.top - 40; // Position slightly above

    const tooltipWidth = tooltipEl.offsetWidth;
    const tooltipHeight = tooltipEl.offsetHeight;

    // Adjust the position if the tooltip goes beyond the right or bottom boundaries
    if (tooltipX + tooltipWidth > chartRect.right) {
      tooltipX = chartRect.right - tooltipWidth - 10; // Move left to fit within the right boundary
    }

    if (tooltipY < chartRect.top) {
      tooltipY = chartRect.top + 10; // Adjust to avoid going above the top boundary
    }

    // Ensure tooltip doesn't go below the chart's bottom boundary
    if (tooltipY + tooltipHeight > chartRect.bottom) {
      tooltipY = chartRect.bottom - tooltipHeight - 10;
    }

    // Ensure tooltip doesn't go beyond the left boundary
    if (tooltipX < chartRect.left) {
      tooltipX = chartRect.left + 10;
    }

    // Update tooltip position within the chart area
    tooltipEl.style.left = `${tooltipX}px`;
    tooltipEl.style.top = `${tooltipY}px`;

    // Lock the position if a point was clicked
    if (lockPosition) {
      tooltipEl.dataset['locked'] = 'true';
    }
  }

  highlightSelectedPoint(point: any) {
    // If there was a previously selected point, reset it
    if (this.selectedPoint) {
      this.resetSelectedPoint();
    }

    // Increase the marker radius or change its color to indicate selection
    point.update({
      marker: {
        radius: 6, // Increase radius
        fillColor: 'red' // Change color to red for selected
      }
    });

    // Keep track of the selected point to reset later
    this.selectedPoint = point;
  }

  // getServiceInstanceThreadPool(): void {
  //   this.apiService.getServiceInstanceThreadPool(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.initialize_ServiceInstanceThreadPool_graph(data);
  //   })
  // }

  getServiceInstanceThreadPool(): void {
    this.apiService
      .getServiceInstanceThreadPool(this.entityInstanceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || !Array.isArray(data)) {
            console.error("Invalid thread pool response structure:", data);
            return;
          }

          const hasNegative = data.some(entry =>
            Object.values(entry).some(v => typeof v === "number" && v < 0)
          );

          if (hasNegative) {
            console.error("Negative thread pool metric values found. Ignoring response:", data);
            return;
          }

          this.initialize_ServiceInstanceThreadPool_graph(data);
        },

        error: (err) => {
          console.error("Failed to load service instance thread pool data:", err);
        }
      });
  }


  initialize_ServiceInstanceThreadPool_graph(data: any) {

    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.ServiceInstanceThreadPoolChart) {
        while (this.ServiceInstanceThreadPoolChart.series.length > 0) {
          this.ServiceInstanceThreadPoolChart.series[0].remove(false);
          this.ServiceInstanceThreadPoolChart.showLoading('No Data');
        }

        this.ServiceInstanceThreadPoolChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }

      const ServiceInstanceThreadPool: any = {};
      const allTimeBuckets: any[] = [];

      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });

      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);

      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!ServiceInstanceThreadPool[key]) {
              ServiceInstanceThreadPool[key] = [];
            }

            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);

            // Push the value for the specific time bucket
            ServiceInstanceThreadPool[key].push([time, ele[key]]);
          }
        });
      });
      const customColors = ['#fe7f2d', '#9d4edd', '#335c67'];
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(ServiceInstanceThreadPool).map((key, index) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = ServiceInstanceThreadPool[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });

        return {
          name: key,
          data: filledData,
          color: customColors[index % customColors.length],
          marker: {
            radius: 3
          }
        };
      });

      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);

      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'ServiceInstanceThreadPool',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'shortdot'
          },
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 16
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
          gridLineColor: '#e0dede',

        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            x: -7
          },
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          style: { fontSize: '10px', fontFamily: 'system-ui' },
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;

            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b>&nbsp;&nbsp; ${point.y !== null ? point.y : 'No Data'}</li>`;
            });

            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 2,
          }
        },
        series: seriesData
      };

      this.ServiceInstanceThreadPoolChart = new Highcharts.Chart(opts1);
      if (!this.charts.includes(this.ServiceInstanceThreadPoolChart)) {
        this.charts.push(this.ServiceInstanceThreadPoolChart);
        this.syncCharts(this.charts);
      }
    }
    catch {

    }
  }

  // trace part

  fetchData(): void {
    this.currentPageTrace = 1;
    this.fetchEndpoints();
    this.fetchTraceData();
    this.getTraceSegmentsCount();
  }

  // fetchEndpoints(): void {
  //   const encodedServiceId = this.serviceIdService.getEncodedServiceId() || this.serviceId;

  //   this.apiService.getEndpoint(this.entityId, this.startTime, this.endTime, this.param, this.param)
  //     .pipe(
  //       switchMap(data => from(this.decoderService.decodeObject(data)))
  //     ).pipe(takeUntil(this.destroy$))
  //     .subscribe({
  //       next: (data: any) => {
  //         if (data && typeof data === 'object') {
  //           const endpointsArray = ([] as string[]).concat(
  //             ...Object.values(data).map(value => Array.isArray(value) ? value : [value])
  //           );
  //           this.endpoints = [
  //             { name: 'All', value: 'All' },
  //             ...endpointsArray.map(endpoint => ({ name: endpoint, value: endpoint }))
  //           ];
  //           this.endpointTrace = 'All';
  //         } else {
  //         }
  //       },
  //       error: (error: any) => {
  //       }
  //     });
  // }

  fetchEndpoints(): void {
    const encodedServiceId = this.serviceIdService.getEncodedServiceId() || this.serviceId;
    this.apiService.getEndpoint(this.entityId, this.startTime, this.endTime, this.param, this.param)
      .pipe(
        switchMap(data => from(this.decoderService.decodeObject(data))),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid endpoint response structure:", data);
            return;
          }

          const values = Object.values(data);

          if (!values.length || !values.every(v => Array.isArray(v))) {
            console.error("Missing or invalid endpoint array values:", data);
            return;
          }

          const endpointsArray = ([] as string[]).concat(...(values as string[][]));

          const invalidEntry = endpointsArray.some(
            ep => typeof ep !== "string" || !ep.trim()
          );

          if (invalidEntry) {
            console.error("Invalid entries found in endpoint list. Ignoring response:", data);
            return;
          }

          this.endpoints = [
            { name: 'All', value: 'All' },
            ...endpointsArray.map(ep => ({ name: ep, value: ep }))
          ];

          this.endpointTrace = 'All';
        },

        error: (error: any) => {
          console.error("Failed to load endpoints:", error);
        }
      });
  }

  private searchDebounceTimer: any;
  autoSearch(debounce = false): void {
    if (debounce) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.search();
      }, 400);
    } else {
      this.search();
    }
  }

  search(): void {
    this.clearSelection();
    this.currentPageTrace = 1;
    this.sortParameter
    this.orderParameter
    this.fetchTraceData();
    this.getTraceSegmentsCount();
    setTimeout(() => {
      if (this.paginatedData.length > 0) {
        this.selectItem(this.paginatedData[0]);
      } else {
        this.clearSelection();
      }
    }, 2000);
  }

  clearSelection(): void {
    this.selectedItem = null;
    this.selectedTraceId = null;
    this.hierarchicalList = [];
    this.traceMetaData = [];
    this.traceData = [];
    this.showModal = false;
  }

  selectItem(item: any): void {
    if (item) {
      this.clearSelection();
      this.selectedItem = this.decodeBase64(item.endpointId);
      this.selectedTraceId = item.traceId;
      this.selectedView = "table"
      this.fetchTraceDataList(item.traceId);
      setTimeout(() => {
        this.traceDetailsSection.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 0);

    } else {
      this.clearSelection();
    }
  }

  decodeBase64(encoded: string): string {
    try {
      return atob(encoded);
    } catch (e) {
      return encoded;
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

          if (!response || !Array.isArray(response)) {
            console.error("Invalid trace metadata response structure:", response);
            return;
          }

          const invalidEntry = response.some(
            (span: any) => !span || typeof span !== "object" || Array.isArray(span)
          );
          if (invalidEntry) {
            console.error("Invalid span entry found in trace metadata. Ignoring response:", response);
            return;
          }

          const missingKeys = response.some(
            (span: any) =>
              !("spanId" in span) ||
              !("parentSpanId" in span) ||
              !("endpointName" in span)
          );
          if (missingKeys) {
            console.error("Missing required span keys in trace metadata:", response);
            return;
          }

          const spans = response || [];
          this.traceMetaData = response || [];
          this.traceData = JSON.parse(JSON.stringify(spans));
          this.hierarchicalList = this.buildHierarchicalList(spans);
        },

        error: (err) => {
          console.error("Failed to load trace metadata:", err);
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

  cancelCustomEndpoint(): void {
    this.textEndpoint = '';
    this.endpointTrace = 'All';
    this.search();
  }

  // fetchTraceData(): void {
  //   this.clearSelection();
  //   const encodedServiceId = this.serviceIdService.getEncodedServiceId() || this.serviceId;

  //   const sdt = this.startTime + "00";
  //   const edt = this.endTime + "59";

  //   let instanceId = this.entityInstanceId;
  //   let endpointId = '';

  //   const endpointValue = this.textEndpoint?.trim() ? this.textEndpoint : this.endpointTrace;

  //   if (endpointValue !== 'All') {
  //     endpointId = btoa(endpointValue);
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
  //     traceState?: number;
  //     traceId?: string;
  //     minTraceDuration?: number;
  //     maxTraceDuration?: number;
  //     rowsPerPageTrace?: number;
  //   } = {
  //     serviceId: this.entityId,
  //     st: +sdt,
  //     et: +edt
  //   };

  //   if (instanceId !== this.entityId) {
  //     params.instanceId = instanceId;
  //   }

  //   if (endpointId !== this.entityId) {
  //     params.endpointId = endpointId;
  //   }

  //   if (this.status) {
  //     params.traceState = this.status === 'success' ? 0 : 1;
  //   }

  //   if (this.traceID) {
  //     params.traceId = this.traceID;
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
  //     this.currentPageTrace,
  //     this.sortParameter,
  //     this.orderParameter,
  //     params.instanceId || undefined,
  //     params.traceState,
  //     params.endpointId || undefined,
  //     params.traceId || undefined,
  //     params.minTraceDuration || undefined,
  //     params.maxTraceDuration || undefined,
  //     params.rowsPerPageTrace || undefined,
  //   ).pipe(switchMap(data => from(this.decoderService.decodeObject(data)))).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.traceNames = data;
  //     if (this.traceNames.length > 0) {
  //       this.selectItem(this.traceNames[0]);
  //     }
  //   });
  // }

  fetchTraceData(): void {
    this.clearSelection();
    this.traceNames = [];
    const encodedServiceId = this.serviceIdService.getEncodedServiceId() || this.serviceId;

    const sdt = this.startTime + "00";
    const edt = this.endTime + "59";

    let instanceId = this.entityInstanceId;
    let endpointId = '';

    const endpointValue = this.textEndpoint?.trim() ? this.textEndpoint : this.endpointTrace;

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
      endpointId?: string;
      traceState?: number;
      traceId?: string;
      minTraceDuration?: number;
      maxTraceDuration?: number;
      rowsPerPageTrace?: number;
      statusCode?: string;
    } = {
      serviceId: this.entityId,
      st: +sdt,
      et: +edt
    };

    if (instanceId !== this.entityId) {
      params.instanceId = instanceId;
    }

    if (endpointId !== this.entityId) {
      params.endpointId = endpointId;
    }

    if (this.status) {
      params.traceState = this.status === 'success' ? 0 : 1;
    }

    if (this.shownCriteria['statusCode'] && this.statusCode) {
      params.statusCode = this.statusCode === 'text' ? this.customStatusCodeTrace : this.statusCode;
    }

    if (this.traceID) {
      params.traceId = this.traceID;
    }

    if (this.minDuration) {
      params.minTraceDuration = this.minDuration;
    }

    if (this.maxDuration) {
      params.maxTraceDuration = this.maxDuration;
    }

    this.apiService.getTracesData(
      params.serviceId,
      params.st,
      params.et,
      this.currentPageTrace,
      this.sortParameter,
      this.orderParameter,
      params.instanceId || undefined,
      params.traceState,
      params.endpointId || undefined,
      params.traceId || undefined,
      params.minTraceDuration || undefined,
      params.maxTraceDuration || undefined,
      params.rowsPerPageTrace || undefined,
      params.statusCode || undefined
    )
      .pipe(
        switchMap(data => from(this.decoderService.decodeObject(data))),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data: any) => {
          if (!data || !Array.isArray(data)) {
            console.error("Invalid trace response structure:", data);
            return;
          }

          if (data.length === 0) {
            console.error("Empty trace list received:", data);
            return;
          }

          const hasNegativeLatency = data.some(
            (t: any) => typeof t.latency === "number" && t.latency < 0
          );

          if (hasNegativeLatency) {
            console.error("Negative latency values found. Ignoring trace response:", data);
            return;
          }

          this.traceNames = data;

          if (this.traceNames.length > 0) {
            this.selectItem(this.traceNames[0]);
          }
        },

        error: (err) => {
          console.error("Failed to load trace data:", err);
        }
      });
  }



  // getTraceSegmentsCount(): void {
  //   // this.clearSelection();
  //   const sdt = +this.startTime + "00";
  //   const edt = +this.endTime + "59";

  //   let instanceId = this.entityInstanceId;
  //   let endpointId = '';

  //   const endpointValue = this.textEndpoint?.trim() ? this.textEndpoint : this.endpointTrace;

  //   if (endpointValue !== 'All') {
  //     endpointId = btoa(endpointValue);
  //     endpointId = `${this.entityId}_${endpointId}`;
  //   } else {
  //     endpointId = this.entityId!;
  //   }
  //   let params: {
  //     serviceId: string;
  //     st: number;
  //     et: number;
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
  //   if (this.status === 'success') {
  //     params.traceState = 0;
  //   } else if (this.status === 'error') {
  //     params.traceState = 1;
  //   }
  //   if (this.traceID) {
  //     params.traceId = this.traceID;
  //   }
  //   if (this.minDuration) {
  //     params.minTraceDuration = this.minDuration;
  //   }
  //   if (this.maxDuration) {
  //     params.maxTraceDuration = this.maxDuration;
  //   }
  //   this.apiService.getTraceSegmentsCount(
  //     params.serviceId,
  //     params.st,
  //     params.et,
  //     params.instanceId || undefined,
  //     params.traceState,
  //     params.endpointId || undefined,
  //     params.traceId || undefined,
  //     params.minTraceDuration || undefined,
  //     params.maxTraceDuration || undefined,
  //   ).pipe(takeUntil(this.destroy$)).subscribe(
  //     (data: any) => {
  //       this.totalHitsTrace = data;
  //       this.calculateTracePagination();
  //     }
  //   );
  // }

  getTraceSegmentsCount(): void {
    const sdt = +this.startTime + "00";
    const edt = +this.endTime + "59";

    let instanceId = this.entityInstanceId;
    let endpointId = '';

    const endpointValue = this.textEndpoint?.trim() ? this.textEndpoint : this.endpointTrace;

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
      statusCode?: string;
    } = {
      serviceId: this.entityId!,
      st: +sdt,
      et: +edt
    };

    if (instanceId !== this.entityId) params.instanceId = instanceId;
    if (endpointId !== this.entityId) params.endpointId = endpointId;
    if (this.status === 'success') params.traceState = 0;
    else if (this.status === 'error') params.traceState = 1;
    if (this.shownCriteria['statusCode'] && this.statusCode) params.statusCode = this.statusCode === 'text' ? this.customStatusCodeTrace : this.statusCode;
    if (this.traceID) params.traceId = this.traceID;
    if (this.minDuration) params.minTraceDuration = this.minDuration;
    if (this.maxDuration) params.maxTraceDuration = this.maxDuration;

    this.apiService
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
        params.statusCode || undefined
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (typeof data !== "number" || isNaN(data) || data < 0) {
            console.error("Invalid trace segments count received:", data);
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
      this.fetchTraceData();
    }
  }

  nextTracePage(): void {
    if (this.currentPageTrace < this.totalPagesTrace) {
      this.currentPageTrace++;
      this.fetchTraceData();
    }
  }

  goToTracePage(page: number): void {
    this.currentPageTrace = page;
    this.fetchTraceData();
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

  encodeBase64(value: string): string {
    try {
      return btoa(value);
    } catch (e) {
      return value;
    }
  }

  getSortParameter(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.sortParameter = selectedValue as 'start_time' | 'duration';
    this.fetchTraceData();  // Fetch data again based on the new sort parameter
  }

  getOrderParameter(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.orderParameter = selectedValue as 'asc' | 'dec';
    this.fetchTraceData();
  }

  formatTimeBucket(timeBucket: any): string {
    const timeString = timeBucket.toString();
    return `${timeString.substring(0, 4)}-${timeString.substring(4, 6)}-${timeString.substring(6, 8)} ${timeString.substring(8, 10)}:${timeString.substring(10, 12)}:${timeString.substring(12, 14)}`;
  }

  openLogTabTraceId(selectedTraceId: any): void {
    const logTab = document.querySelector('.nav-link[href="#log"]') as HTMLElement; // fixed selector
    if (logTab) {
      logTab.click();
    }

    setTimeout(() => {
      this.traceIDLogs = selectedTraceId;
      this.searchLogs();
    }, 100);

    this.loadData('log');
  }

  searchLogs(): void {
    this.currentPageLogs = 1;
    this.getLogNames();
    this.getLogsAggregatedData();
    this.getLogsAggregatedData2();
    this.getLogsCountTimeSeries();
    this.selectedLevels = [];
  }

  searchLogs2(): void {
    this.currentPageLogs = 1;
    this.getLogNames();
    this.getLogsAggregatedData();
    this.getLogsCountTimeSeries();
  }

  calculateTotalPagesLogs(): void {
    const totalItems = this.filteredDataLogs.length;
    const itemsPerPage = this.rowsPerPage;
    if (totalItems === itemsPerPage) {
      this.totalPagesLogs = this.currentPageLogs + 1;
    } else {
      this.totalPagesLogs = this.currentPageLogs;
    }
    this.updateVisiblePageNumbersLogs();
  }

  updatePaginatedDataLogs(): void {
    this.paginatedDataLogs = this.filteredDataLogs;
  }

  updateVisiblePageNumbersLogs(): void {
    const startPage = Math.max(1, this.currentPageLogs - Math.floor(this.maxVisiblePagesLogs / 2));
    const endPage = Math.min(this.totalPagesLogs, startPage + this.maxVisiblePagesLogs - 1);
    this.visiblePageNumbersLogs = [];
    for (let i = startPage; i <= endPage; i++) {
      this.visiblePageNumbersLogs.push(i);
    }
    // Ensure no duplication and display the correct sequence up to totalPages
    if (endPage < this.totalPagesLogs) {
      for (let i = endPage + 1; i <= Math.min(this.totalPagesLogs, endPage + this.maxVisiblePagesLogs); i++) {
        this.visiblePageNumbersLogs.push(i);
      }
    }
  }





  //  log part

  openPieChart(): void {
    const modalElement = document.getElementById('logPieChartModal');
    if (modalElement) {
      const modal = new Modal(modalElement);
      modal.show();
      this.drawPieChart();
    }
  }

  drawPieChart(): void {
    const data = this.prepareChartData();
    // Clear previous SVG
    d3.select("#pieChart").selectAll("svg").remove();
    d3.select("#pieChart").selectAll(".legend").remove();

    if (data.length === 0) {
      const width = 400;
      const height = 400;

      // Create an SVG container
      const svg = d3.select("#pieChart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

      svg.append("text")
        .attr("x", 450 / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#000")
        .style("font-family", "Arial, sans-serif")
        .text("No Data");

      return; // Exit the function if no data
    }

    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select("#pieChart")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const predefinedColors = {
      'ERROR': '#e31a1c',    // Red
      'CRITICAL': '#8B0000', // Dark Red
      'WARNING': '#efb118',  // Yellow
      'INFO': '#33a02c'      // Green
    };

    const usedColors = ['#e31a1c', '#8B0000', '#efb118', '#33a02c', '#b2df8a'];

    const colorScale = d3.scaleOrdinal()
      .domain(data.map(d => d.label.toString()))
      .range(d3.schemePaired.filter((c: string) => !usedColors.includes(c)));

    const pie = d3.pie<any>()
      .value((d: { value: any; }) => d.value)
      .sort(null);

    const arc = d3.arc<any>()
      .innerRadius(0)
      .outerRadius(radius - 10);

    const arcHover = d3.arc<any>() // Define arc for hover effect (larger radius)
      .innerRadius(0)
      .outerRadius(radius - 5);

    const arcs = svg.selectAll("arc")
      .data(pie(data))
      .enter()
      .append("g")
      .attr("class", "arc");

    let animationFinished = false;  // Flag to track if the animation is complete

    arcs.append("path")
      .attr("d", arc)
      .attr("fill", (d: { data: { label: string | number; }; }, i: number): string => {
        const label = d.data.label as keyof typeof predefinedColors;
        return predefinedColors[label] || colorScale(label) as string;
      })

      .attr("stroke", "#fff")
      .attr("stroke-width", "2px")
      .transition()
      .duration(1000)
      .attrTween("d", function (d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function (t) {
          return arc(interpolate(t)) || "";
        };
      })

      .on("end", () => {
        animationFinished = true;  // Set flag to true when animation completes
      });

    // Hover animations
    arcs.selectAll("path")
      .on("mouseover", function (event, d: any) {
        if (!animationFinished) return;  // Ignore hover if animation is not complete

        d3.select(this)
          .transition()
          .duration(300)
          .style("opacity", 1);

        arcs.selectAll("path")
          .filter((arcData: any) => arcData.data.label !== d.data.label)
          .transition()
          .duration(300)
          .style("opacity", 0.5);
      })
      .on("mouseout", function (event: any, d: any) {
        if (!animationFinished) return;  // Ignore hover if animation is not complete

        d3.select(this)
          .transition()
          .duration(300)
          .style("opacity", 1);

        arcs.selectAll("path")
          .transition()
          .duration(300)
          .style("opacity", 1);
      });

    arcs.append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("dy", "0.35em")
      .style("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#000")
      .style("font-family", "Arial, sans-serif")
      .style("font-weight", "bold")
      .text((d: { data: { label: any; }; }) => d.data.label)
      .style("opacity", 0)
      .transition()
      .delay(1000)
      .duration(500)
      .style("opacity", 1);

    const legend = d3.select("#pieChart")
      .append("div")
      .attr("class", "legend")
      .style("position", "absolute")
      .style("top", "20px")
      .style("left", `${width + 20}px`)
      .style("font-family", "Arial, sans-serif")
      .style("font-weight", "bold");

    const legendItems = legend.selectAll("div")
      .data(data)
      .enter()
      .append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("margin-bottom", "5px");

    legendItems.append("div")
      .style("width", "12px")
      .style("height", "12px")
      .style("background-color", (d: { label: string | number; }, i: number): string => {
        const label = d.label as keyof typeof predefinedColors;
        return predefinedColors[label] || colorScale(label) as string;
      })

      .style("margin-right", "8px");

    legendItems.append("span")
      .style("font-size", "12px")
      .style("color", "#000")
      .style("font-family", "Arial, sans-serif")
      .style("font-weight", "bold")
      .text((d: { label: any; value: any; }) => `${d.label}: ${d.value}`);
  }

  prepareChartData(): any[] {
    const totalHits = this.logData.total_hits;
    const data: any[] = [];
    this.logDataKeys.forEach((key) => {
      if (key !== 'total_hits') {
        data.push({ label: key, value: this.logData[key] });
      }
    });
    return data;
  }

  openBarGraph(): void {
    const modalElement = document.getElementById('logBarGraphModal');
    if (modalElement) {
      const modal = new Modal(modalElement);
      modal.show();
      this.drawBarGraph();
    }
  }

  drawBarGraph(): void {
    const data = this.prepareChartData();

    // Clear previous SVG
    d3.select("#barGraph").select("svg").remove();

    // Check if data is available
    if (data.length === 0) {
      const width = 500;
      const height = 400;
      const margin = { top: 20, right: 20, bottom: 50, left: 40 };

      // Create an SVG container
      const svg = d3.select("#barGraph")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

      // Add text element to show "No Data"
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#000")
        .style("font-family", "Arial, sans-serif")
        .text("No Data");

      return; // Exit the function if no data
    }

    const width = 500;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 50, left: 40 };

    const svg = d3.select("#barGraph")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, width - margin.left - margin.right])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) as number])
      .nice()
      .range([height - margin.top - margin.bottom, 0]);

    // Define the color mapping for specific labels
    const predefinedColors = {
      'ERROR': '#e31a1c',    // Red
      'CRITICAL': '#8B0000', // Dark Red
      'WARNING': '#efb118',  // Yellow
      'INFO': '#33a02c'      // Green
    };

    const usedColors = ['#e31a1c', '#8B0000', '#efb118', '#33a02c', '#b2df8a'];

    // Use a color scale for other values, avoiding predefined colors
    const colorScale = d3.scaleOrdinal()
      .domain(data.map(d => d.label.toString()))
      .range(d3.schemePaired.filter(c => !usedColors.includes(c)));

    let animationFinished = false;  // Flag to track if the animation is complete

    // Add bars with opening animation
    svg.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.label) as number)
      .attr("y", height - margin.top - margin.bottom) // Start from the bottom
      .attr("width", x.bandwidth())
      .attr("height", 0) // Start with height 0
      .attr("fill", (d, i): string => {
        const label = d.label as keyof typeof predefinedColors;
        return predefinedColors[label] || colorScale(label) as string;
      })

      .attr("stroke", "#fff")
      .attr("stroke-width", "1px")
      .transition() // Start transition
      .duration(800) // Duration of the transition
      .attr("y", d => y(d.value)) // Move to the correct y position
      .attr("height", d => height - margin.top - margin.bottom - y(d.value)) // Animate to full height
      .on("end", () => {
        animationFinished = true;  // Set flag to true when animation completes
      });

    // Add hover effect
    svg.selectAll(".bar")
      .on("mouseover", function (event, d) {
        // Set opacity for other bars
        if (!animationFinished) return;  // Ignore hover if animation is not complete
        svg.selectAll(".bar").transition().duration(200).style("opacity", 0.2);
        d3.select(this).transition().duration(200).style("opacity", 1);
      })
      .on("mouseout", function () {
        if (!animationFinished) return;  // Ignore hover if animation is not complete
        // Restore opacity for all bars
        svg.selectAll(".bar").transition().duration(200).style("opacity", 1);
      });

    // Add X Axis
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.5em")
      .attr("dy", "0.15em")
      .attr("transform", "rotate(-45)");

    // Add Y Axis
    svg.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y));

    // Add text labels on top of bars
    svg.selectAll(".bar-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", d => x(d.label) as number + x.bandwidth() / 2) // Center text on bar
      .attr("y", d => y(d.value) - 5) // Position text above the bar
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#000")
      .style("font-family", "Arial, sans-serif")
      .style("font-weight", "bold")
      .text(d => d.value);
  }

  fetchDataLogs(): void {
    this.currentPageLogs = 1;
    this.fetchEndpointsLogs();
    this.getLogNames();
    this.getLogsAggregatedData();
    this.getLogsAggregatedData2();
    this.getLogsCountTimeSeries();
  }

  // fetchEndpointsLogs(): void {
  //   this.apiService.getEndpoint(this.entityId, this.startTime, this.endTime, this.param, this.param).pipe(switchMap(data => from(this.decoderService.decodeObject(data)))).pipe(takeUntil(this.destroy$)).
  //     subscribe(
  //       (data: { [x: string]: any; }) => {
  //         const keys = Object.keys(data);
  //         const dynamicKey = keys.find(key => key !== 'total_hits');
  //         if (dynamicKey && data[dynamicKey]) {
  //           const endpointsArray = ([] as string[]).concat(...data[dynamicKey]);
  //           this.endpointsLogs = [{ name: 'All', value: 'All' }, ...endpointsArray.map(endpoint => ({ name: endpoint, value: endpoint }))];
  //           this.endpointLogs = 'All';
  //         } else {
  //         }
  //       },
  //       (error: any) => {
  //       }
  //     );
  // }

  fetchEndpointsLogs(): void {
    this.apiService.getEndpoint(
      this.entityId,
      this.startTime,
      this.endTime,
      this.param,
      this.param
    )
      .pipe(
        switchMap((data) => from(this.decoderService.decodeObject(data))),
        takeUntil(this.destroy$)
      )
      .subscribe(
        (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid endpoint logs response structure:", data);
            return;
          }

          const keys = Object.keys(data);
          const dynamicKey = keys.find(key => key !== "total_hits");

          if (!dynamicKey || !Array.isArray(data[dynamicKey])) {
            console.error("Missing or invalid endpoint array values:", data);
            return;
          }

          const endpointsArray = ([] as string[]).concat(...data[dynamicKey]);

          const invalidEntry = endpointsArray.some(
            v => typeof v !== "string" || !v.trim()
          );

          if (invalidEntry) {
            console.error("Invalid entries found in endpoint logs list. Ignoring response:", data);
            return;
          }

          this.endpointsLogs = [
            { name: "All", value: "All" },
            ...endpointsArray.map(endpoint => ({
              name: endpoint,
              value: endpoint,
            })),
          ];

          this.endpointLogs = "All";
        },

        (error: any) => {
          console.error("Failed to load endpoint logs:", error);
        }
      );
  }


  openModalLogs(item: {
    ServiceId?: string,
    content: string,
    tags: any,
    traceId: string | null,
    instance: string,
    timeBucket: number | null,
    endpointId: string | null
  }) {
    this.selectedItemLogs = item;
    this.showModalLogs = true;
  }

  openTraceTabTraceId(selectedTraceId: string): void {
    const traceTab = document.querySelector('.nav-link[href="#trace"]') as HTMLElement;
    if (traceTab) {
      traceTab.click();
    }
    setTimeout(() => {
      this.traceID = selectedTraceId;
      this.search();
    }, 100);
  }

  getTruncatedContent(content: string): string {
    if (!content) {
      return '';
    }
    const words = content.split(/\s+/);
    return words.slice(0, 50).join(' ') + (words.length > 50 ? '...' : '');
  }

  changePageLogs(page: number): void {
    if (page > 0 && page <= this.totalPagesLogs) {
      this.currentPageLogs = page;
      this.getLogNames();
      this.updatePaginatedDataLogs();
    }
  }

  // JVM part

  // getJvmCpu(): void {
  //   this.apiService.getJvmCpu(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.initialize_JVM_CPU_graph(data);

  //   })
  // }

  getJvmCpu(): void {
    this.apiService
      .getJvmCpu(this.entityInstanceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || !Array.isArray(data)) {
            console.error("Invalid JVM CPU response structure:", data);
            return;
          }

          const invalidEntry = data.some(
            (item: any) =>
              typeof item.jvm_cpu !== "number" && item.jvm_cpu !== undefined ||
              item.jvm_cpu < 0 ||
              !item.time_bucket
          );

          if (invalidEntry) {
            console.error("Invalid or negative 'jvm_cpu' entries found. Ignoring response:", data);
            return;
          }
          this.initialize_JVM_CPU_graph(data);
        },

        error: (err) => {
          console.error("Failed to load JVM CPU metrics:", err);
        }
      });
  }


  // getJvmMemory(): void {
  //   this.apiService.getJvmMemory(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.initialize_JvmMemory_graph(data);
  //   })
  // }

  getJvmMemory(): void {
    this.apiService
      .getJvmMemory(this.entityInstanceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || !Array.isArray(data)) {
            console.error("Invalid JVM memory response structure:", data);
            return;
          }

          const invalidEntry = data.some(entry =>
            ["heap", "heap_max", "noheap", "noheap_max"]
              .some(key => key in entry && typeof entry[key] === "number" && entry[key] < 0)
          );

          if (invalidEntry) {
            console.error("Negative numeric values found in JVM memory response. Ignoring response:", data);
            return;
          }

          const missingTimeBucket = data.some(entry =>
            !entry.time_bucket || typeof entry.time_bucket !== "string"
          );

          if (missingTimeBucket) {
            console.error("Missing or invalid 'time_bucket' in JVM memory response:", data);
            return;
          }

          this.initialize_JvmMemory_graph(data);
        },

        error: (err) => {
          console.error("Failed to load JVM memory metrics:", err);
        }
      });
  }


  // getJvmMemoryDetail(): void {
  //   this.apiService.getJvmMemoryDetail(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.initialize_JvmMemoryDetail_graph(data);
  //   })
  // }

  getJvmMemoryDetail(): void {
    this.apiService
      .getJvmMemoryDetail(this.entityInstanceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || !Array.isArray(data)) {
            console.error("Invalid JVM memory detail response structure:", data);
            return;
          }

          const hasNegative = data.some(entry =>
            Object.values(entry).some(
              v => typeof v === "number" && v < 0
            )
          );

          if (hasNegative) {
            console.error("Negative JVM memory values found. Ignoring response:", data);
            return;
          }

          // const requiredKeys = ["oldgen", "newgen", "metaspace", "permgen", "survivor", "time_bucket"];
          // const missingKeys = data.some(entry =>
          //   !requiredKeys.every(k => k in entry)
          // );

          // if (missingKeys) {
          //   console.error("Missing required JVM memory fields in response:", data);
          //   return;
          // }

          this.initialize_JvmMemoryDetail_graph(data);
        },

        error: (err) => {
          console.error("Failed to load JVM memory details:", err);
        }
      });
  }


  // getJvmGCTime(): void {
  //   this.apiService.getJvmGCTime(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.initialize_JvmGCTime_graph(data);
  //   })
  // }

  getJvmGCTime(): void {
    this.apiService
      .getJvmGCTime(this.entityInstanceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || !Array.isArray(data)) {
            console.error("Invalid JVM GC Time response structure:", data);
            return;
          }

          const invalidEntry = data.some((item: any) =>
            (typeof item.young_gc !== "number" && item.young_gc !== undefined) ||
            (typeof item.young_gc === "number" && item.young_gc < 0) ||
            (typeof item.old_gc !== "number" && item.old_gc !== undefined) ||
            (typeof item.old_gc === "number" && item.old_gc < 0) ||
            !item.time_bucket
          );

          if (invalidEntry) {
            console.error("Invalid or negative JVM GC values found. Ignoring response:", data);
            return;
          }

          this.initialize_JvmGCTime_graph(data);
        },

        error: (err) => {
          console.error("Failed to load JVM GC Time metrics:", err);
        }
      });
  }


  // getJvmGCCount(): void {
  //   this.apiService.getJvmGCCount(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.initialize_JvmGCCountChart_graph(data);
  //   })
  // }

  getJvmGCCount(): void {
    this.apiService
      .getJvmGCCount(this.entityInstanceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || !Array.isArray(data)) {
            console.error("Invalid JVM GC response structure:", data);
            return;
          }

          const invalidEntry = data.some(
            (item: any) =>
              (typeof item.young_gc !== "number" && item.young_gc !== undefined) ||
              (typeof item.old_gc !== "number" && item.old_gc !== undefined) ||
              (typeof item.young_gc === "number" && item.young_gc < 0) ||
              (typeof item.old_gc === "number" && item.old_gc < 0) ||
              !item.time_bucket
          );

          if (invalidEntry) {
            console.error("Invalid or negative JVM GC entries found. Ignoring response:", data);
            return;
          }

          this.initialize_JvmGCCountChart_graph(data);
        },

        error: (err) => {
          console.error("Failed to load JVM GC metrics:", err);
        }
      });
  }


  // getJvmThreadCount(): void {
  //   this.apiService.getJvmThreadCount(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.initialize_JvmThreadCount_graph(data);
  //   })
  // }

  getJvmThreadCount(): void {
    this.apiService
      .getJvmThreadCount(this.entityInstanceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || !Array.isArray(data)) {
            console.error("Invalid JVM Thread Count response structure:", data);
            return;
          }

          const invalidEntry = data.some(
            (item: any) =>
              !item.time_bucket ||
              (typeof item.peak === "number" && item.peak < 0) ||
              (typeof item.live === "number" && item.live < 0) ||
              (typeof item.daemon === "number" && item.daemon < 0)
          );

          if (invalidEntry) {
            console.error(
              "Invalid or negative JVM thread count entries found. Ignoring response:",
              data
            );
            return;
          }

          this.initialize_JvmThreadCount_graph(data);
        },

        error: (err) => {
          console.error("Failed to load JVM Thread Count metrics:", err);
        }
      });
  }


  // getJvmThreadStateCount(): void {
  //   this.apiService.getJvmThreadStateCount(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.initialize_JvmThreadStateCountChart_graph(data);
  //   })
  // }

  getJvmThreadStateCount(): void {
    this.apiService
      .getJvmThreadStateCount(this.entityInstanceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || !Array.isArray(data)) {
            console.error("Invalid JVM Thread State Count response structure:", data);
            return;
          }

          const invalidEntry = data.some((item: any) =>
            typeof item.runnable !== "number" ||
            typeof item.blocked !== "number" ||
            typeof item.waiting !== "number" ||
            typeof item.timed_waiting !== "number" ||
            item.runnable < 0 ||
            item.blocked < 0 ||
            item.waiting < 0 ||
            item.timed_waiting < 0 ||
            !item.time_bucket
          );

          if (invalidEntry) {
            console.error("Invalid or negative JVM Thread State Count entries found. Ignoring response:", data);
            return;
          }

          this.initialize_JvmThreadStateCountChart_graph(data);
        },

        error: (err) => {
          console.error("Failed to load JVM Thread State Count metrics:", err);
        }
      });
  }


  // getJvmClassCount(): void {
  //   this.apiService.getJvmClassCount(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
  //     this.initialize_JvmClassCount_graph(data);

  //   })
  // }

  getJvmClassCount(): void {
    this.apiService
      .getJvmClassCount(this.entityInstanceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || !Array.isArray(data)) {
            console.error("Invalid JVM Class Count response structure:", data);
            return;
          }

          const invalidEntry = data.some(
            (item: any) =>
              typeof item.loaded !== "number" && item.loaded !== undefined ||
              typeof item.total_loaded !== "number" && item.total_loaded !== undefined ||
              typeof item.total_unloaded !== "number" && item.total_unloaded !== undefined ||
              item.loaded < 0 ||
              item.total_loaded < 0 ||
              item.total_unloaded < 0 ||
              !item.time_bucket
          );

          if (invalidEntry) {
            console.error("Invalid or negative JVM Class Count entries found. Ignoring response:", data);
            return;
          }

          this.initialize_JvmClassCount_graph(data);
        },

        error: (err) => {
          console.error("Failed to load JVM Class Count metrics:", err);
        }
      });
  }


  // JVM CPU (%)
  initialize_JVM_CPU_graph(data: any) {
    try {
      const criticalpoint = this.thresholds?.["instance_jvm_cpu"]?.criticalValue;
      const warningpoint = this.thresholds?.["instance_jvm_cpu"]?.warningValue;

      // Reset chart if it already exists
      if (this.JvmCpuChart) {
        while (this.JvmCpuChart.series.length > 0) {
          this.JvmCpuChart.series[0].remove(false);
          this.JvmCpuChart.showLoading('No Data');
        }
        this.JvmCpuChart.update({ xAxis: { categories: [] }, yAxis: { categories: [] } }, false);
      }

      const JVM_CPU: any = {};
      const allTimeBuckets: any[] = [];

      // Extract unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) allTimeBuckets.push(time);
      });
      allTimeBuckets.sort((a, b) => a - b);

      // Organize data with color per point
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!JVM_CPU[key]) JVM_CPU[key] = [];

            const time = this.convertTimebucket(ele.time_bucket);
            let pointColor = '#9c7a97'; // default Good
            if (ele.jvm_cpu > criticalpoint) pointColor = '#E94F3D'; // Critical
            else if (ele.jvm_cpu > warningpoint) pointColor = '#ED9C40'; // Warning

            JVM_CPU[key].push({ x: time, y: ele[key], color: pointColor });
          }
        });
      });

      // Fill missing points with null
      const seriesData = [{
        name: 'JVM CPU',
        type: 'areaspline',
        data: data.map((ele: any) => {
          const time = this.convertTimebucket(ele.time_bucket);
          const y = ele.jvm_cpu ?? null;
          return [time, y];
        }),
        fillColor: '#d7b9d5',
        marker: { radius: 2 },
        zoneAxis: 'y', // Important for y-based zones
        zones: [
          { value: warningpoint, color: '#9c7a97' }, // Good
          { value: criticalpoint, color: '#ED9C40' }, // Warning
          { color: '#E94F3D' } // Critical
        ]
      }];


      const minTime = this.convertTimebucket(data[0].time_bucket);
      const baseline = this.thresholds?.["instance_jvm_cpu"]?.avgBaseline;

      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'areaspline',
          backgroundColor: 'transparent',
          renderTo: 'JVM_CPU',
        },
        title: { text: null },
        credits: { enabled: false },
        exporting: { enabled: false },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: { fontSize: '8px' }
        },
        xAxis: {
          crosshair: { width: 2, color: 'blue', dashStyle: 'shortdot' },
          type: 'datetime',
          title: { enabled: false },
          min: minTime,
          labels: { style: { color: '#4b4b4b', fontSize: '9' }, y: 15 },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { enabled: false },
          labels: { style: { color: '#4b4b4b', fontSize: '9' }, x: -7 },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
          plotLines: [
            {
              value: baseline ?? 1000,
              color: '#a78a7f',
              width: 2,
              dashStyle: 'Dash',
              zIndex: 5,
              label: { align: 'right', style: { color: 'red', fontSize: '9px' } }
            }
          ]
        },
        tooltip: {
          shared: true,
          useHTML: true,
          style: { fontSize: '10px', fontFamily: 'system-ui' },
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>JVM CPU:</b> &nbsp;&nbsp;${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += `<li style="list-style-type: none; color:#432818;">
        <span style="color:#432818;">-</span> <b>Baseline:</b>&nbsp;&nbsp; ${baseline}
      </li>`;
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: { spline: { lineWidth: 2 } },
        series: seriesData
      };

      this.JvmCpuChart = new Highcharts.Chart(opts1);
      if (!this.charts.includes(this.JvmCpuChart)) {
        this.charts.push(this.JvmCpuChart);
        this.syncCharts(this.charts);
      }
    }
    catch { }
  }


  updateJvmMemChart(selectedValue: string) {
    const map: Record<string, string> = {
      instance_jvm_memory_heap: 'heap',
      instance_jvm_memory_heap_max: 'heap_max',
      instance_jvm_memory_noheap: 'noheap',
      instance_jvm_memory_noheap_max: 'noheap_max'
    };

    const sel = selectedValue === 'All' ? 'All' : map[selectedValue];

    this.JvmMemoryChart.series.forEach((s: any) => {
      const highlight = sel === 'All' || s.name === sel;

      s.update({
        opacity: highlight ? 1 : 0.2,
        marker: {
          radius: highlight ? 2 : 1
        }
      }, false);

      s.points.forEach((p: any) => {
        p.update({
          marker: {
            radius: highlight ? 2 : 1,
            fillColor: p.options.marker?.fillColor
          }
        }, false);
      });
    });

    this.JvmMemoryChart.redraw();
  }

  updateJvmMemDetailChart(selectedValue: string) {
    if (!this.JvmMemoryDetailChart) return;

    const seriesMap: Record<string, string> = {
      All: 'All',
      instance_jvm_memory_pool_oldgen: 'oldgen',
      instance_jvm_memory_pool_metaspace: 'metaspace'
    };

    const selectedSeriesName = seriesMap[selectedValue];

    this.JvmMemoryDetailChart.series.forEach((series: any) => {
      const isSelected = selectedSeriesName === 'All' || series.name === selectedSeriesName;

      series.update(
        {
          opacity: isSelected ? 1 : 0.2,
          marker: {
            radius: isSelected ? 4 : 2,
            fillColor: undefined // keeps original point colors
          }
        },
        false // defer redraw
      );
    });

    this.JvmMemoryDetailChart.redraw();
  }

  initialize_JvmMemory_graph(data: any) {
    try {
      if (this.JvmMemoryChart) {
        while (this.JvmMemoryChart.series.length > 0) {
          this.JvmMemoryChart.series[0].remove(false);
        }
        this.JvmMemoryChart.update({
          xAxis: { categories: [] },
          yAxis: { categories: [] }
        }, false);
      }

      const JVM_Memory: any = {};
      const allTimeBuckets: any[] = [];

      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) allTimeBuckets.push(time);
      });
      allTimeBuckets.sort((a, b) => a - b);

      // Map data into series format
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!JVM_Memory[key]) JVM_Memory[key] = [];
            const time = this.convertTimebucket(ele.time_bucket);
            JVM_Memory[key].push([time, ele[key]]);
          }
        });
      });

      // Thresholds for each metric
      const thresholds: any = {
        heap: {
          critical: this.thresholds?.["instance_jvm_memory_heap"]?.criticalValue / (1024 * 1024),
          warning: this.thresholds?.["instance_jvm_memory_heap"]?.warningValue / (1024 * 1024)
        },
        heap_max: {
          critical: this.thresholds?.["instance_jvm_memory_heap_max"]?.criticalValue / (1024 * 1024),
          warning: this.thresholds?.["instance_jvm_memory_heap_max"]?.warningValue / (1024 * 1024)
        },
        noheap: {
          critical: this.thresholds?.["instance_jvm_memory_noheap"]?.criticalValue / (1024 * 1024),
          warning: this.thresholds?.["instance_jvm_memory_noheap"]?.warningValue / (1024 * 1024)
        },
        noheap_max: {
          critical: this.thresholds?.["instance_jvm_memory_noheap_max"]?.criticalValue / (1024 * 1024),
          warning: this.thresholds?.["instance_jvm_memory_noheap_max"]?.warningValue / (1024 * 1024)
        }
      };

      const customColors = ['#315ad6', '#51a4ed', '#90a955', '#ed51d8'];

      const selectedMetric = this.jvm_mem_chart_data || 'All';

      const seriesData = Object.keys(JVM_Memory).map((key, index) => {
        const seriesColor = customColors[index % customColors.length];
        const highlight = selectedMetric === 'All' || selectedMetric === key;

        const filledData = allTimeBuckets.map((time) => {
          const point = JVM_Memory[key].find((p: any) => p[0] === time);
          const value = point ? point[1] : null;

          let markerFillColor = seriesColor;

          if (value !== null) {
            if (thresholds[key]?.critical !== undefined && value >= thresholds[key].critical) {
              markerFillColor = 'red';
            } else if (thresholds[key]?.warning !== undefined && value >= thresholds[key].warning) {
              markerFillColor = 'orange';
            }
          }

          if (!highlight && markerFillColor !== 'red' && markerFillColor !== 'orange') markerFillColor = '#ccc';

          return {
            x: time,
            y: value,
            marker: {
              fillColor: markerFillColor,
              radius: highlight ? 2 : 1,
              symbol: 'circle'
            }
          };
        });

        return {
          name: key,
          data: filledData,
          _originalColor: seriesColor,
          color: highlight ? seriesColor : '#ccc',
          opacity: highlight ? 1 : 0.2,
          marker: {
            enabled: true,
            radius: highlight ? 2 : 1,
            symbol: 'circle',
            fillColor: highlight ? seriesColor : '#ccc'
          }
        };
      });

      const minTime = this.convertTimebucket(data[0].time_bucket);

      const opts: any = {
        chart: {
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'JVM_Memory',
        },
        title: { text: null },
        credits: { enabled: false },
        exporting: { enabled: false },
        legend: { enabled: false },
        xAxis: {
          type: 'datetime',
          min: minTime,
          crosshair: { width: 2, color: 'blue', dashStyle: 'shortdot' },
          labels: { style: { color: '#4b4b4b', fontSize: '9' }, y: 15 },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { enabled: false },
          labels: { style: { color: '#4b4b4b', fontSize: '9' }, x: -7 },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true
        },
        tooltip: {
          shared: true,
          useHTML: true,
          style: { fontSize: '10px', fontFamily: 'system-ui' },
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><ul>`;
            this.points.forEach((point: any) => {
              tooltipContent += `<li style="list-style-type:none;"><span style="color:${point.color}">●</span> <b>${point.series.name}:</b> &nbsp;&nbsp;${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 2, marker: {
              enabled: true,       // show marker
              radius: 1,           // size of the dot
              symbol: 'circle'     // enforce circular shape
            }
          }
        },
        series: seriesData
      };

      this.JvmMemoryChart = new Highcharts.Chart(opts);

      if (!this.charts.includes(this.JvmMemoryChart)) {
        this.charts.push(this.JvmMemoryChart);
        this.syncCharts(this.charts);
      }
    }
    catch (err) {
      console.error('Error initializing JVM Memory chart', err);
    }
  }

  initialize_JvmMemoryDetail_graph(data: any) {
    try {
      if (this.JvmMemoryDetailChart) {
        while (this.JvmMemoryDetailChart.series.length > 0) {
          this.JvmMemoryDetailChart.series[0].remove(false);
          this.JvmMemoryDetailChart.showLoading('No Data');
        }
        this.JvmMemoryDetailChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const JvmMemoryDetail: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!JvmMemoryDetail[key]) {
              JvmMemoryDetail[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            JvmMemoryDetail[key].push([time, ele[key]]);
          }
        });
      });
      const customColors = ['#ff70a6', '#78c6a3', '#7b2cbf', '#758bfd', '#ffc43d'];
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(JvmMemoryDetail).map((key, index) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = JvmMemoryDetail[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          color: customColors[index % customColors.length],
          marker: {
            radius: 2
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'JVM_Memory_detail',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'shortdot'
          },
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,

        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            x: -7
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          style: { fontSize: '10px', fontFamily: 'system-ui' },
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> &nbsp;&nbsp;${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 2,
          }
        },
        series: seriesData
      };
      this.JvmMemoryDetailChart = new Highcharts.Chart(opts1);
      if (!this.charts.includes(this.JvmMemoryDetailChart)) {
        this.charts.push(this.JvmMemoryDetailChart);
        this.syncCharts(this.charts);
      }
    }
    catch {
    }
  }

  // JVM GC Time (ms)

  updateJvmGcChart(selectedValue: string) {
    if (!this.JvmGCTimeChart) return;

    // Map dropdown value to series name
    const seriesMap: Record<string, string> = {
      All: 'All',
      instance_jvm_young_gc_time: 'young_gc',
      instance_jvm_old_gc_time: 'old_gc'
    };

    const selectedSeriesName = seriesMap[selectedValue];

    this.JvmGCTimeChart.series.forEach((series: any) => {
      const isSelected = selectedSeriesName === 'All' || series.name === selectedSeriesName;

      series.update(
        {
          opacity: isSelected ? 1 : 0.2,
          marker: {
            radius: isSelected ? 4 : 2,
            fillColor: undefined // keeps original point colors, including thresholds
          }
        },
        false // defer redraw
      );
    });

    this.JvmGCTimeChart.redraw();
  }


  initialize_JvmGCTime_graph(data: any) {
    try {
      // Reset chart if it exists
      if (this.JvmGCTimeChart) {
        while (this.JvmGCTimeChart.series.length > 0) {
          this.JvmGCTimeChart.series[0].remove(false);
        }
        this.JvmGCTimeChart.update({
          xAxis: { categories: [] },
          yAxis: { categories: [] }
        }, false);
      }

      const JvmGCTime: any = {};
      const allTimeBuckets: any[] = [];

      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) allTimeBuckets.push(time);
      });
      allTimeBuckets.sort((a, b) => a - b);

      // Map data into series format
      let maxvalue = 0;
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!JvmGCTime[key]) JvmGCTime[key] = [];
            const time = this.convertTimebucket(ele.time_bucket);
            if (ele[key] > maxvalue) maxvalue = ele[key];
            JvmGCTime[key].push([time, ele[key]]);
          }
        });
      });

      // Thresholds
      const thresholds: any = {
        young_gc: {
          critical: this.thresholds?.["instance_jvm_young_gc_time"]?.criticalValue,
          warning: this.thresholds?.["instance_jvm_young_gc_time"]?.warningValue
        },
        old_gc: {
          critical: this.thresholds?.["instance_jvm_old_gc_time"]?.criticalValue,
          warning: this.thresholds?.["instance_jvm_old_gc_time"]?.warningValue
        }
      };

      // Line colors
      const customColors = ['#315ad6', 'rgb(48,174,249)'];

      const seriesData = Object.keys(JvmGCTime).map((key, index) => {
        const lineColor = customColors[index % customColors.length];

        const filledData = allTimeBuckets.map((time) => {
          const point = JvmGCTime[key].find((p: any) => p[0] === time);
          const value = point ? point[1] : null;

          // default same as line
          let pointColor = lineColor;

          // Override only for warning/critical
          if (value !== null) {
            if (thresholds[key]?.critical !== undefined && value >= thresholds[key].critical) {
              pointColor = 'red';
            } else if (thresholds[key]?.warning !== undefined && value >= thresholds[key].warning) {
              pointColor = 'orange';
            }
          }

          return {
            x: time,
            y: value,
            marker: {
              enabled: true,
              radius: 2,
              fillColor: pointColor
            }
          };
        });

        return {
          name: key,
          data: filledData,
          color: lineColor, // line stays fixed
          marker: { radius: 2, symbol: 'circle' }
        };
      });

      const minTime = this.convertTimebucket(data[0].time_bucket);
      const baseline = this.thresholds?.["instance_jvm_young_gc_time"]?.avgBaseline;

      const opts1: any = {
        chart: { type: 'spline', backgroundColor: 'transparent', renderTo: 'JvmGCTime' },
        title: { text: null },
        credits: { enabled: false },
        exporting: { enabled: false },
        legend: { enabled: false },
        xAxis: {
          type: 'datetime',
          min: minTime,
          crosshair: { width: 2, color: 'blue', dashStyle: 'shortdot' },
          labels: { style: { color: '#4b4b4b', fontSize: '9' }, y: 15 },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          max: maxvalue > baseline ? maxvalue : baseline,
          tickAmount: 6,
          title: { enabled: false },
          labels: { style: { color: '#4b4b4b', fontSize: '9' }, x: -7 },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
          plotLines: [{
            value: baseline ?? 1000,
            color: '#a78a7f',
            width: 2,
            dashStyle: 'Dash',
            zIndex: 5,
            label: { align: 'right', style: { color: 'red', fontSize: '9px' } }
          }]
        },
        tooltip: {
          shared: true,
          useHTML: true,
          style: { fontSize: '10px', fontFamily: 'system-ui' },
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><ul>`;
            this.points.forEach((point: any) => {
              tooltipContent += `<li style="list-style-type:none;"><span style="color:${point.color}">●</span> <b>${point.series.name}:</b>&nbsp;&nbsp;${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += `<li style="list-style-type: none; color:#432818;">
        <span style="color:#432818;">-</span> <b>Baseline:</b>&nbsp;&nbsp;${baseline}
      </li>`;
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 2,
            marker: { enabled: true, radius: 2, symbol: 'circle' }
          }
        },
        series: seriesData
      };

      this.JvmGCTimeChart = new Highcharts.Chart(opts1);
      if (!this.charts.includes(this.JvmGCTimeChart)) {
        this.charts.push(this.JvmGCTimeChart);
        this.syncCharts(this.charts);
      }
    }
    catch (err) {
      console.error('Error initializing JVM GC Time chart', err);
    }
  }

  // JVM Thread Count
  initialize_JvmThreadCount_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.JvmThreadCountChart) {
        while (this.JvmThreadCountChart.series.length > 0) {
          this.JvmThreadCountChart.series[0].remove(false);
          this.JvmThreadCountChart.showLoading('No Data');
        }
        this.JvmThreadCountChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const JvmThreadCount: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!JvmThreadCount[key]) {
              JvmThreadCount[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            JvmThreadCount[key].push([time, ele[key]]);
          }
        });
      });
      const customColors = ['#a47152', '#ff8500', '#0582ca'];
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(JvmThreadCount).map((key, index) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = JvmThreadCount[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          color: customColors[index % customColors.length],
          marker: {
            radius: 2
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'JvmThreadCount',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'shortdot'
          },
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            x: -7
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          style: { fontSize: '10px', fontFamily: 'system-ui' },
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b>&nbsp;&nbsp;${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 2,
          }
        },
        series: seriesData
      };
      this.JvmThreadCountChart = new Highcharts.Chart(opts1);
      if (!this.charts.includes(this.JvmThreadCountChart)) {
        this.charts.push(this.JvmThreadCountChart);
        this.syncCharts(this.charts);
      }
    }
    catch {
    }
  }

  // JVM Thread State Count
  initialize_JvmThreadStateCountChart_graph(data: any) {
    try {
      if (this.JvmThreadStateCountChart) {
        while (this.JvmThreadStateCountChart.series.length > 0) {
          this.JvmThreadStateCountChart.series[0].remove(false);
          this.JvmThreadStateCountChart.showLoading('No Data');
        }
        this.JvmThreadStateCountChart.update({ xAxis: { categories: [] }, yAxis: { categories: [] } }, false);
      }

      const JvmThreadStateCount: any = {};
      const allTimeBuckets: any[] = [];
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) allTimeBuckets.push(time);
      });
      allTimeBuckets.sort((a, b) => a - b);

      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!JvmThreadStateCount[key]) JvmThreadStateCount[key] = [];
            const time = this.convertTimebucket(ele.time_bucket);
            JvmThreadStateCount[key].push([time, ele[key]]);
          }
        });
      });

      const stateDisplayNames: { [key: string]: string } = {
        runnable: 'Active',
        waiting: 'Idle',
        timewaiting: 'Paused',
        blocked: 'Blocked'
      };

      // Your specific colors assigned here:
      const stateColors: { [key: string]: string } = {
        blocked: '#a663cc',
        runnable: '#f4a259',
        timewaiting: '#f4e285',
        waiting: '#ee6c4d'
      };

      const seriesData = Object.keys(JvmThreadStateCount).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = JvmThreadStateCount[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: stateDisplayNames[key.toLowerCase()] || key,
          data: filledData,
          color: stateColors[key.toLowerCase()] || '#8cb369',
          marker: { radius: 1 },
          showInLegend: key.toLowerCase() === 'blocked' ? false : true
        };
      });


      const minTime = this.convertTimebucket(data[0].time_bucket);

      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'column',
          backgroundColor: 'transparent',
          renderTo: 'JvmThreadStateCount',
        },
        title: { text: null },
        credits: { enabled: false },
        exporting: { enabled: false },
        legend: {
          enabled: true,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '9px',
            fontWeight: 'bold',
            fontFamily: 'system-ui',
            cursor: 'pointer',
            userSelect: 'none'
          },

          itemMarginTop: 0,
          itemMarginBottom: 0,
        },
        xAxis: {
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'shortdot'
          },
          type: 'datetime',
          title: { enabled: false },
          min: minTime,
          labels: { style: { color: '#4b4b4b', fontSize: '9' }, y: 15 },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { enabled: false },
          labels: { style: { color: '#4b4b4b', fontSize: '9' }, x: -7 },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        plotOptions: {
          column: {
            stacking: 'normal',
            pointPadding: 0.04,
            groupPadding: 0.07,
            borderWidth: 0,
            borderRadius: 2,
            pointWidth: 6,
            dataLabels: { enabled: false }
          }
        },
        tooltip: {
          shared: true,
          useHTML: true,
          style: { fontSize: '10px', fontFamily: 'system-ui' },
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b>&nbsp;&nbsp; ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        series: seriesData
      };

      this.JvmThreadStateCountChart = new Highcharts.Chart(opts1);
      if (!this.charts.includes(this.JvmThreadStateCountChart)) {
        this.charts.push(this.JvmThreadStateCountChart);
        this.syncCharts(this.charts);
      }
    } catch (e) {
      console.error('Error initializing JVM Thread State Count Chart:', e);
    }
  }




  // JVM GC Count
  initialize_JvmGCCountChart_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.JvmGCCountChart) {
        while (this.JvmGCCountChart.series.length > 0) {
          this.JvmGCCountChart.series[0].remove(false);
          this.JvmGCCountChart.showLoading('No Data');
        }
        this.JvmGCCountChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const JvmGCCount: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!JvmGCCount[key]) {
              JvmGCCount[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            JvmGCCount[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(JvmGCCount).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = JvmGCCount[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          color: 'rgb(124,181,236)',
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'column',
          backgroundColor: 'transparent',
          renderTo: 'JvmGCCount',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'shortdot'
          },
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            x: -7
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        plotOptions: {
          column: {
            stacking: 'normal',
            pointPadding: 0.04,
            groupPadding: 0.05,
            borderWidth: 0,
            pointWidth: 6,
            borderRadius: 2,
            dataLabels: {
              enabled: false
            }
          }
        }
        ,
        tooltip: {
          shared: true,
          useHTML: true,
          style: { fontSize: '10px', fontFamily: 'system-ui' },
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b>&nbsp;&nbsp; ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        series: seriesData
      };
      this.JvmGCCountChart = new Highcharts.Chart(opts1);
      if (!this.charts.includes(this.JvmGCCountChart)) {
        this.charts.push(this.JvmGCCountChart);
        this.syncCharts(this.charts);
      }
    }
    catch {
    }
  }

  // JVM Class Count
  initialize_JvmClassCount_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.JvmClassCountChart) {
        while (this.JvmClassCountChart.series.length > 0) {
          this.JvmClassCountChart.series[0].remove(false);
          this.JvmClassCountChart.showLoading('No Data');
        }
        this.JvmClassCountChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const JvmClassCount: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!JvmClassCount[key]) {
              JvmClassCount[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            JvmClassCount[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(JvmClassCount).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = JvmClassCount[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'area',
          backgroundColor: 'transparent',
          renderTo: 'JvmClassCount',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'shortdot'
          },
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        // plotOptions: {
        //         column: {
        //           stacking: 'normal',
        //           pointPadding: 0.1,
        //           borderWidth: 0,
        //           dataLabels: {
        //             enabled: false
        //           }
        //         }
        //       },
        tooltip: {
          shared: true,
          useHTML: true,
          style: { fontSize: '10px', fontFamily: 'system-ui' },
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b>&nbsp;&nbsp; ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        series: seriesData
      };
      this.JvmClassCountChart = new Highcharts.Chart(opts1);
      if (!this.charts.includes(this.JvmClassCountChart)) {
        this.charts.push(this.JvmClassCountChart);
      }
    }
    catch {
    }
  }

  // PVM part

  getPvmCpuUtilization(): void {
    this.apiService.getPvmCpuUtilization(this.entityInstanceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
        this.hasPvmCpuData = hasData;
        if (hasData) {
        setTimeout(() => {
          this.initialize_PvmCpuUtilization_graph(data);
        }, 0);
      }
      });
  }

  getPvmThreadCount(): void {
    this.apiService.getPvmThreadCount(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasPvmThreadCount = hasData;
      if (hasData) {
        setTimeout(() => {
          this.initialize_pvmThreadCount_graph(data);
        }, 0);
      }
    })
  }

  getPvmGCCount(): void {
    this.apiService.getPvmGCCount(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasPvmGCCount = hasData;
      if (hasData) {
        setTimeout(() => {
          this.initialize_pvmGcCount_graph(data);
        }, 0);
      }
    })
  }

  getPvmMemUtilization(): void {
    this.apiService.getPvmMemUtilization(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasPvmMemUtilization = hasData;
      if (hasData) {
        setTimeout(() => {
          this.initialize_PvmMem_graph(data);
        }, 0);
      }
    })
  }

  getPvmGCTime(): void {
    this.apiService.getPvmGCTime(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasPvmGCTime = hasData;
      if (hasData) {
        setTimeout(() => {
          this.initialize_PvmGcTime_graph(data);
        }, 0);
      }
    })
  }

  // Host CPU Utilization / PVM CPU Utilization (%) graph
  initialize_PvmCpuUtilization_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.PvmCpuUtilizationChart) {
        while (this.PvmCpuUtilizationChart.series.length > 0) {
          this.PvmCpuUtilizationChart.series[0].remove(false);
          this.PvmCpuUtilizationChart.showLoading('No Data');
        }
        this.PvmCpuUtilizationChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const PvmCpuUtilization: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!PvmCpuUtilization[key]) {
              PvmCpuUtilization[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            PvmCpuUtilization[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(PvmCpuUtilization).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = PvmCpuUtilization[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'area',
          backgroundColor: 'transparent',
          renderTo: 'PvmCpuUtilization',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        series: seriesData
      };
      this.PvmCpuUtilizationChart = new Highcharts.Chart(opts1);
    }
    catch {
    }
  }

  // PVM Thread Count graph
  initialize_pvmThreadCount_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.PvmThreadCountChart) {
        while (this.PvmThreadCountChart.series.length > 0) {
          this.PvmThreadCountChart.series[0].remove(false);
          this.PvmThreadCountChart.showLoading('No Data');
        }
        this.PvmThreadCountChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const pvmThreadCount: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!pvmThreadCount[key]) {
              pvmThreadCount[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            pvmThreadCount[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(pvmThreadCount).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = pvmThreadCount[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'pvmThreadCount',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };
      this.PvmThreadCountChart = new Highcharts.Chart(opts1);
    }
    catch {
    }
  }

  // PVM GC Count graph
  initialize_pvmGcCount_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.PvmGcCountChart) {
        while (this.PvmGcCountChart.series.length > 0) {
          this.PvmGcCountChart.series[0].remove(false);
          this.PvmGcCountChart.showLoading('No Data');
        }
        this.PvmGcCountChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const pvmGcCount: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!pvmGcCount[key]) {
              pvmGcCount[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            pvmGcCount[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(pvmGcCount).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = pvmGcCount[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'column',
          backgroundColor: 'transparent',
          renderTo: 'pvmGcCount',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        plotOptions: {
          column: {
            stacking: 'normal',
            pointPadding: 0.1,
            borderWidth: 0,
            dataLabels: {
              enabled: false
            }
          }
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        series: seriesData
      };
      this.PvmGcCountChart = new Highcharts.Chart(opts1);
    }
    catch {
    }
  }

  // Host Mem Utilization / PVM Mem Utilization (%) graph
  initialize_PvmMem_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.PvmMemChart) {
        while (this.PvmMemChart.series.length > 0) {
          this.PvmMemChart.series[0].remove(false);
          this.PvmMemChart.showLoading('No Data');
        }
        this.PvmMemChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const pvmMem: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!pvmMem[key]) {
              pvmMem[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            pvmMem[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(pvmMem).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = pvmMem[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'area',
          backgroundColor: 'transparent',
          renderTo: 'pvmMem',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        series: seriesData
      };
      this.PvmMemChart = new Highcharts.Chart(opts1);
    }
    catch {
    }
  }

  // PVM GC Time (ms) graph
  initialize_PvmGcTime_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.PvmGCTimeChart) {
        while (this.PvmGCTimeChart.series.length > 0) {
          this.PvmGCTimeChart.series[0].remove(false);
          this.PvmGCTimeChart.showLoading('No Data');
        }
        this.PvmGCTimeChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const PvmGcTime: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!PvmGcTime[key]) {
              PvmGcTime[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            PvmGcTime[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(PvmGcTime).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = PvmGcTime[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'PvmGcTime',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };
      this.PvmGCTimeChart = new Highcharts.Chart(opts1);
    }
    catch {
    }
  }

  // Golang part

  getMemoryHeapSize(): void {
    this.apiService.getMemoryHeapSize(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasMemoryHeapSize = hasData;
      if (hasData) {
        this.initialize_MemoryHeapSize_graph(data);
      }
    })
  }

  getLiveThreadsNum(): void {
    this.apiService.getLiveThreadsNum(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasLiveThreadsNum = hasData;
      if (hasData) {
        this.initialize_LiveThreadsNum_graph(data);
      }
    })
  }

  getGoRoutineScheduleTime(): void {
    this.apiService.getGoRoutineScheduleTime(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasGoRoutineScheduleTime = hasData;
      if (hasData) {
        this.initialize_GoRoutineScheduleTime_graph(data);
      }
    })
  }

  getGcCountPerMinute(): void {
    this.apiService.getGcCountPerMinute(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasGcCountPerMinute = hasData;
      if (hasData) {
        this.initialize_GcCountPerMinute_graph(data);
      }
    })
  }

  getGcPauseTimePerMinute(): void {
    this.apiService.getGcPauseTimePerMinute(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasGcPauseTimePerMinute = hasData;
      if (hasData) {
        this.initialize_GcPauseTimePerMinute_graph(data);
      }
    })
  }

  getGcGoalSize(): void {
    this.apiService.getGcGoalSize(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasGcGoalSize = hasData;
      if (hasData) {
        this.initialize_GcGoalSize_graph(data);
      }
    })
  }

  getGcFreeSize(): void {
    this.apiService.getGcFreeSize(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasGcFreeSize = hasData;
      if (hasData) {
        this.initialize_GcFreeSize_graph(data);
      }
    })
  }

  getHeapAllocSize(): void {
    this.apiService.getHeapAllocSize(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasHeapAllocSize = hasData;
      if (hasData) {
        this.initialize_HeapAllocSize_graph(data);
      }
    })
  }

  getHeapObjectCount(): void {
    this.apiService.getHeapObjectCount(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasHeapObjectCount = hasData;
      if (hasData) {
        this.initialize_HeapObjectCount_graph(data);
      }
    })
  }

  getFreeSizePerMinute(): void {
    this.apiService.getFreeSizePerMinute(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasFreeSizePerMinute = hasData;
      if (hasData) {
        this.initialize_FreeSizePerMinute_graph(data);
      }
    })
  }

  getAllocSizePerMinute(): void {
    this.apiService.getAllocSizePerMinute(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasAllocSizePerMinute = hasData;
      if (hasData) {
        this.initialize_AllocSizePerMinute_graph(data);
      }
    })
  }

  getMetaDataMspan(): void {
    this.apiService.getMetaDataMspan(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasMetaDataMspan = hasData;
      if (hasData) {
        this.initialize_MetaDataMspan_graph(data);
      }
    })
  }

  getMetaDataMcache(): void {
    this.apiService.getMetaDataMcache(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasMetaDataMcache = hasData;
      if (hasData) {
        this.initialize_MetaDataMcache_graph(data);
      }
    })
  }

  // Memory Heap Size (MB)
  initialize_MemoryHeapSize_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.MemoryHeapSizeChart) {
        while (this.MemoryHeapSizeChart.series.length > 0) {
          this.MemoryHeapSizeChart.series[0].remove(false);
          this.MemoryHeapSizeChart.showLoading('No Data');
        }
        this.MemoryHeapSizeChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const MemoryHeapSize: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!MemoryHeapSize[key]) {
              MemoryHeapSize[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            MemoryHeapSize[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(MemoryHeapSize).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = MemoryHeapSize[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'MemoryHeapSize',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };

      this.MemoryHeapSizeChart = new Highcharts.Chart(opts1);
    }
    catch {
    }
  }

  // Live Threads Num
  initialize_LiveThreadsNum_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.LiveThreadsNumChart) {
        while (this.LiveThreadsNumChart.series.length > 0) {
          this.LiveThreadsNumChart.series[0].remove(false);
          this.LiveThreadsNumChart.showLoading('No Data');
        }
        this.LiveThreadsNumChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const LiveThreadsNum: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!LiveThreadsNum[key]) {
              LiveThreadsNum[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);

            // Push the value for the specific time bucket
            LiveThreadsNum[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(LiveThreadsNum).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = LiveThreadsNum[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'LiveThreadsNum',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };
      this.LiveThreadsNumChart = new Highcharts.Chart(opts1);
    }
    catch { }
  }

  // GC Count Per Minute
  initialize_GcCountPerMinute_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.GcCountPerMinuteChart) {
        while (this.GcCountPerMinuteChart.series.length > 0) {
          this.GcCountPerMinuteChart.series[0].remove(false);
          this.GcCountPerMinuteChart.showLoading('No Data');
        }
        this.GcCountPerMinuteChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const GcCountPerMinute: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!GcCountPerMinute[key]) {
              GcCountPerMinute[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            GcCountPerMinute[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(GcCountPerMinute).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = GcCountPerMinute[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'GcCountPerMinute',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };
      this.GcCountPerMinuteChart = new Highcharts.Chart(opts1);
    }
    catch { }
  }

  // GC Goal Size (MB)
  initialize_GcGoalSize_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.GcGoalSizeChart) {
        while (this.GcGoalSizeChart.series.length > 0) {
          this.GcGoalSizeChart.series[0].remove(false);
          this.GcGoalSizeChart.showLoading('No Data');
        }
        this.GcGoalSizeChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const GcGoalSize: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!GcGoalSize[key]) {
              GcGoalSize[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            GcGoalSize[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(GcGoalSize).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = GcGoalSize[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'GcGoalSize',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };
      this.GcGoalSizeChart = new Highcharts.Chart(opts1);
    }
    catch {
    }
  }

  // GC Free Size Per Minute (MB)
  initialize_GcFreeSize_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.GcFreeSizeChart) {
        while (this.GcFreeSizeChart.series.length > 0) {
          this.GcFreeSizeChart.series[0].remove(false);
          this.GcFreeSizeChart.showLoading('No Data');
        }
        this.GcFreeSizeChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const GcFreeSize: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);

      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!GcFreeSize[key]) {
              GcFreeSize[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            GcFreeSize[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(GcFreeSize).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = GcFreeSize[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);

      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'GcFreeSize',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };
      this.GcFreeSizeChart = new Highcharts.Chart(opts1);
    }
    catch { }
  }

  // GoRoutine Schedule Time (millisecond)
  initialize_GoRoutineScheduleTime_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.GoRoutineScheduleTimeChart) {
        while (this.GoRoutineScheduleTimeChart.series.length > 0) {
          this.GoRoutineScheduleTimeChart.series[0].remove(false);
          this.GoRoutineScheduleTimeChart.showLoading('No Data');
        }
        this.GoRoutineScheduleTimeChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const GoRoutineScheduleTime: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!GoRoutineScheduleTime[key]) {
              GoRoutineScheduleTime[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            GoRoutineScheduleTime[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(GoRoutineScheduleTime).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = GoRoutineScheduleTime[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'GoRoutineScheduleTime',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };
      this.GoRoutineScheduleTimeChart = new Highcharts.Chart(opts1);
    }
    catch { }
  }

  // GC Pause Time Per Minute (milliseconds)
  initialize_GcPauseTimePerMinute_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.GcPauseTimePerMinuteChart) {
        while (this.GcPauseTimePerMinuteChart.series.length > 0) {
          this.GcPauseTimePerMinuteChart.series[0].remove(false);
          this.GcPauseTimePerMinuteChart.showLoading('No Data');
        }
        this.GcPauseTimePerMinuteChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const GcPauseTimePerMinute: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!GcPauseTimePerMinute[key]) {
              GcPauseTimePerMinute[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            GcPauseTimePerMinute[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(GcPauseTimePerMinute).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = GcPauseTimePerMinute[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'GcPauseTimePerMinute',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };
      this.GcPauseTimePerMinuteChart = new Highcharts.Chart(opts1);
    }
    catch { }
  }

  // Heap Alloc Size Per Minutes (MB)
  initialize_HeapAllocSize_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.HeapAllocSizeChart) {
        while (this.HeapAllocSizeChart.series.length > 0) {
          this.HeapAllocSizeChart.series[0].remove(false);
          this.HeapAllocSizeChart.showLoading('No Data');
        }
        this.HeapAllocSizeChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const HeapAllocSize: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!HeapAllocSize[key]) {
              HeapAllocSize[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            HeapAllocSize[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(HeapAllocSize).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = HeapAllocSize[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'HeapAllocSize',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };
      this.HeapAllocSizeChart = new Highcharts.Chart(opts1);
    }
    catch { }
  }


  // Heap Object Count
  initialize_HeapObjectCount_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.HeapObjectCountChart) {
        while (this.HeapObjectCountChart.series.length > 0) {
          this.HeapObjectCountChart.series[0].remove(false);
          this.HeapObjectCountChart.showLoading('No Data');
        }
        this.HeapObjectCountChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const HeapObjectCount: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!HeapObjectCount[key]) {
              HeapObjectCount[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            HeapObjectCount[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(HeapObjectCount).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = HeapObjectCount[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'HeapObjectCount',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };
      this.HeapObjectCountChart = new Highcharts.Chart(opts1);
    }
    catch { }
  }

  // Free Size Per Minute (KB)
  initialize_FreeSizePerMinute_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.FreeSizePerMinuteChart) {
        while (this.FreeSizePerMinuteChart.series.length > 0) {
          this.FreeSizePerMinuteChart.series[0].remove(false);
          this.FreeSizePerMinuteChart.showLoading('No Data');
        }
        this.FreeSizePerMinuteChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const FreeSizePerMinute: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!FreeSizePerMinute[key]) {
              FreeSizePerMinute[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            FreeSizePerMinute[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(FreeSizePerMinute).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = FreeSizePerMinute[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'FreeSizePerMinute',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };
      this.FreeSizePerMinuteChart = new Highcharts.Chart(opts1);
    }
    catch { }
  }

  // Alloc Size Per Minute (KB)
  initialize_AllocSizePerMinute_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.AllocSizePerMinuteChart) {
        while (this.AllocSizePerMinuteChart.series.length > 0) {
          this.AllocSizePerMinuteChart.series[0].remove(false);
          this.AllocSizePerMinuteChart.showLoading('No Data');
        }
        this.AllocSizePerMinuteChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const AllocSizePerMinute: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!AllocSizePerMinute[key]) {
              AllocSizePerMinute[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            AllocSizePerMinute[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(AllocSizePerMinute).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = AllocSizePerMinute[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'AllocSizePerMinute',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };
      this.AllocSizePerMinuteChart = new Highcharts.Chart(opts1);
    }
    catch { }
  }


  // Metadata Mspan (MB)
  initialize_MetaDataMspan_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.MetaDataMspanChart) {
        while (this.MetaDataMspanChart.series.length > 0) {
          this.MetaDataMspanChart.series[0].remove(false);
          this.MetaDataMspanChart.showLoading('No Data');
        }
        this.MetaDataMspanChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const MetaDataMspan: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!MetaDataMspan[key]) {
              MetaDataMspan[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            MetaDataMspan[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(MetaDataMspan).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = MetaDataMspan[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'column',
          backgroundColor: 'transparent',
          renderTo: 'MetaDataMspan',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: 'white',
              fontSize: '9'
            }
          }
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: 'white',
              fontSize: '9'
            },
            x: -7
          },
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        plotOptions: {
          column: {
            stacking: 'normal',
            pointPadding: 0.1,
            borderWidth: 0,
            dataLabels: {
              enabled: false
            }
          }
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        series: seriesData
      };
      this.MetaDataMspanChart = new Highcharts.Chart(opts1);
    }
    catch { }
  }



  // Metadata Mcache (MB)
  initialize_MetaDataMcache_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.MetaDataMcacheChart) {
        while (this.MetaDataMcacheChart.series.length > 0) {
          this.MetaDataMcacheChart.series[0].remove(false);
          this.MetaDataMcacheChart.showLoading('No Data');
        }
        this.MetaDataMcacheChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const MetaDataMcache: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!MetaDataMcache[key]) {
              MetaDataMcache[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            MetaDataMcache[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(MetaDataMcache).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = MetaDataMcache[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'column',
          backgroundColor: 'transparent',
          renderTo: 'MetaDataMcache',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: 'white',
              fontSize: '9'
            }
          }
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: 'white',
              fontSize: '9'
            },
            x: -7
          },
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        plotOptions: {
          column: {
            stacking: 'normal',
            pointPadding: 0.1,
            borderWidth: 0,
            dataLabels: {
              enabled: false
            }
          }
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        series: seriesData
      };
      this.MetaDataMcacheChart = new Highcharts.Chart(opts1);
    }
    catch { }
  }

  // .Net part

  getCrlCPU(): void {
    this.apiService.getClrCpu(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasCrlCPUData = hasData;
      if (hasData) {
        setTimeout(() => {
          this.initialize_CrlCPU_graph(data);
        }, 0);
      }
    })
  }

  getClrGc(): void {
    this.apiService.getClrGc(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasClrGcData = hasData;
      if (hasData) {
        setTimeout(() => {
          this.initialize_ClrGc_graph(data);
        }, 0);
      }
    })
  }

  getClrHeapMemory(): void {
    this.apiService.getClrHeapMemory(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasClrHeapMemoryData = hasData;
      if (hasData) {
        setTimeout(() => {
          this.initialize_ClrHeapMemory_graph(data);
        }, 0);
      }
    })
  }

  getClrThread(): void {
    this.apiService.getClrThread(this.entityInstanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const hasData = Array.isArray(data) && data.some(d => Object.keys(d).length > 1);
      this.hasClrThreadData = hasData;
      if (hasData) {
        setTimeout(() => {
          this.initialize_ClrThread_graph(data);
        }, 0);
      }
    })
  }

  initialize_CrlCPU_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.crlCPUDataChart) {
        while (this.crlCPUDataChart.series.length > 0) {
          this.crlCPUDataChart.series[0].remove(false);
          this.crlCPUDataChart.showLoading('No Data');
        }
        this.crlCPUDataChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const crlCPUDataChart: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!crlCPUDataChart[key]) {
              crlCPUDataChart[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            crlCPUDataChart[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(crlCPUDataChart).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = crlCPUDataChart[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'crlCPU',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };
      this.crlCPUDataChart = new Highcharts.Chart(opts1);
    }
    catch { }
  }

  initialize_ClrGc_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.crlClrGcChart) {
        while (this.crlClrGcChart.series.length > 0) {
          this.crlClrGcChart.series[0].remove(false);
          this.crlClrGcChart.showLoading('No Data');
        }
        this.crlClrGcChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const crlClrGcChart: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!crlClrGcChart[key]) {
              crlClrGcChart[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            crlClrGcChart[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(crlClrGcChart).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = crlClrGcChart[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'crlGC',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };
      this.crlClrGcChart = new Highcharts.Chart(opts1);
    }
    catch { }
  }

  initialize_ClrHeapMemory_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.crlClrHeapMemoryChart) {
        while (this.crlClrHeapMemoryChart.series.length > 0) {
          this.crlClrHeapMemoryChart.series[0].remove(false);
          this.crlClrHeapMemoryChart.showLoading('No Data');
        }
        this.crlClrHeapMemoryChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const crlClrHeapMemoryChart: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!crlClrHeapMemoryChart[key]) {
              crlClrHeapMemoryChart[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            crlClrHeapMemoryChart[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(crlClrHeapMemoryChart).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = crlClrHeapMemoryChart[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'crlHM',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };
      this.crlClrHeapMemoryChart = new Highcharts.Chart(opts1);
    }
    catch { }
  }

  initialize_ClrThread_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.crlClrThreadChart) {
        while (this.crlClrThreadChart.series.length > 0) {
          this.crlClrThreadChart.series[0].remove(false);
          this.crlClrThreadChart.showLoading('No Data');
        }
        this.crlClrThreadChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }
      const crlClrThreadChart: any = {};
      const allTimeBuckets: any[] = [];
      // Extract all unique time buckets
      data.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.time_bucket);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });
      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);
      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      data.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'time_bucket') {
            if (!crlClrThreadChart[key]) {
              crlClrThreadChart[key] = [];
            }
            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.time_bucket);
            // Push the value for the specific time bucket
            crlClrThreadChart[key].push([time, ele[key]]);
          }
        });
      });
      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(crlClrThreadChart).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = crlClrThreadChart[key].find((p: any) => p[0] === time);
          return point ? point : [time, null];
        });
        return {
          name: key,
          data: filledData,
          marker: {
            radius: 1
          }
        };
      });
      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(data[0].time_bucket);
      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'crlTH',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            },
            y: 15
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 0,
          tickWidth: 0,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: '#4b4b4b',
              fontSize: '9'
            }
          },
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          gridLineColor: '#e0dede',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>${point.series.name}:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        plotOptions: {
          spline: {
            lineWidth: 1,
          }
        },
        series: seriesData
      };
      this.crlClrThreadChart = new Highcharts.Chart(opts1);
    }
    catch { }
  }

  initializeEndpointChart(chartData: any[]) {
    const options: Highcharts.Options = {
      chart: {
        type: 'bar',
        marginRight: 10,
        animation: { duration: 500 }
      },
      title: { text: '' },
      subtitle: {
        text: '',
        align: 'left',
        style: { fontSize: '0px', fontWeight: 'bold' }
      },
      credits: { enabled: false },
      exporting: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        type: 'category',
        labels: {
          style: { fontSize: '9px', fontWeight: 'bold', color: '#2B4F55', fontFamily: 'Verdana, sans-serif' },
          formatter: function () {
            const series = (this as any).axis.series[0];

            const point = series.data[this.pos];

            return point ? `${point.y} ms` : '';
          }

        }
      },
      yAxis: {
        opposite: true,
        visible: false,
        tickPixelInterval: 150,

        title: { text: undefined }
      },
      plotOptions: {
        bar: {
          animation: false,

          borderWidth: 0,

          colorByPoint: true,
          dataSorting: {
            enabled: true,
            matchByName: true
          },
          dataLabels: [
            {
              enabled: true,
              align: 'left',
              inside: true,
              format: '{point.name}',
              style: {
                fontWeight: 'bold',
                fontSize: '9px',
                color: '#2B4F55',
                fontFamily: 'Verdana, sans-serif'
              }
            }
          ]
        }
      },
      series: [
        {
          type: 'bar',
          name: 'Response Time',
          data: chartData.map(item => ({
            name: item.slowEndpointsInCurrentServiceText,
            y: Number(item.slowEndpointsInCurrentServiceValue)
          })),
          colors: ['#FCBA9D']
        }
      ]
    };

    this.EndpointChart = Highcharts.chart('EndPointChart', options);
  }

  getStatusColorClass(isError: number): string {
    switch (isError) {
      case 1: return 'bg-danger';
      case 0: return 'bg-success';
      default: return 'bg-light';
    }
  }

  AppAvailBulletChart(title: string, value: number, target: number, type: '5' | '10') {
    const chartOptions: Highcharts.Options = {
      chart: {
        inverted: true,
        marginLeft: 10,
        type: 'bullet',
        height: 75
      },
      credits: { enabled: false },
      tooltip: {
        shared: true,
        formatter: function () {
          // For multiple series hover
          if (this.points) {
            return this.points.map(p => `${p.series.name}: ${p.y}`).join('<br/>');
          }
          // For single series
          return `${this.series.name}: ${this.y}`;
        }
      }

      ,

      title: { text: '' },
      xAxis: {
        visible: false,
        categories: [
          `<span class="hc-cat-title">${title}</span><br/>` +
          `<span class="hc-cat-title">${value.toFixed(2)}%</span>`
        ],
        labels: {
          useHTML: true,
          style: {
            fontSize: '9px',
            fontWeight: 'normal',
            color: '#000',
            fontFamily: 'system-ui'
          }
        }
      },
      yAxis: {
        gridLineWidth: 0,
        labels: {
          padding: 0,
          style: { fontSize: '0.8em', color: '#333', lineHeight: '2px' }
        },
        plotBands: [
          { from: 0, to: 70, color: 'rgb(128, 128, 128, 0.3)' },
          { from: 70, to: 90, color: 'rgb(128, 128, 128, 0.2)' },
          { from: 90, to: 100, color: 'rgb(128, 128, 128, 0.1)' }
        ],
        max: 100,
        title: { text: undefined }
      },
      legend: { enabled: false },
      exporting: { enabled: false },
      series: [{
        type: 'bullet',
        name: 'Availability',
        data: [{
          y: value,
          target: target
        }],
        pointPadding: 0.25,
        //  pointWidth: 2, 
        borderWidth: 0,
        color: '#198754',
        targetOptions: { width: '200%' }
        ,
        dataLabels: {
          enabled: false,
          format: '{point.y}%',
          align: 'right',
          verticalAlign: 'bottom',
          inside: false,
          style: {
            fontWeight: 'bold',
            color: '#f5f5f5',
            fontFamily: 'system-ui'
          }
        }
      }]
    };

    if (type === '5') {
      this.AppAvailHighcharts5Day = chartOptions;
    } else {
      this.AppAvailHighcharts10Day = chartOptions;
    }
  }


  onLanguageChange(lang: any) {
    this.selectedLanguage = lang;


    this.loadData(lang.id)

  }



  // getInstanceOverviewKpi(): void {
  //   this.apiService.getInstanceOverviewKpi(this.serviceId, this.entityInstanceId, this.startTime, this.endTime).subscribe((data: any) => {

  //     this.kpis.error = data.error_count;
  //     this.kpis.hits = data.hit_count;
  //   })
  // }

  getInstanceOverviewKpi(): void {
    this.apiService
      .getInstanceOverviewKpi(this.serviceId, this.entityInstanceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {

          if (!data || typeof data !== "object" || Array.isArray(data)) {
            console.error("Invalid instance KPI response structure:", data);
            return;
          }

          const invalidValues =
            typeof data.hit_count !== "number" ||
            data.hit_count < 0 ||
            typeof data.error_count !== "number" ||
            data.error_count < 0 ||
            typeof data.ignored_error_count !== "number" ||
            data.ignored_error_count < 0;

          if (invalidValues) {
            console.error("Invalid or negative KPI values found. Ignoring response:", data);
            return;
          }

          this.kpis.error = data.error_count;
          this.kpis.hits = data.hit_count;
          this.kpis.ignoredError = data.ignored_error_count;
        },

        error: (err) => {
          console.error("Failed to load instance KPI:", err);
        }
      });

  }




  onCriteriaSelected() {
    if (this.selectedCriteria && !this.shownCriteria[this.selectedCriteria]) {
      this.shownCriteria[this.selectedCriteria] = true;
    }
  }

  removeCriteria(criteriaKey: string) {
    this.shownCriteria[criteriaKey] = false;
    if (criteriaKey === 'endpoint') {
      this.endpointTrace = 'All';
      this.textEndpoint = '';
      this.fetchEndpoints()
    };
    if (criteriaKey === 'status') this.status = '';
    if (criteriaKey === 'statusCode') {
      this.statusCode = 'All';
      this.customStatusCodeTrace = '';
    }
    if (criteriaKey === 'traceID') this.traceID = '';
    if (criteriaKey === 'minDuration') this.minDuration = null;
    if (criteriaKey === 'maxDuration') this.maxDuration = null;
    this.fetchTraceData();
  }

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

  get allCriteriaSelected(): boolean {
    return this.criteriaList.every(c => this.shownCriteria[c.key]);
  }

  get anyFilterActive(): boolean {
    return Object.values(this.shownCriteria).some(v => v === true);
  }


  // Listen for document clicks to detect outside clicks
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const clickedInsideCard = this.criteriaCard?.nativeElement.contains(event.target);
    const clickedInsideDropdown = this.criteriaDropdown?.nativeElement.contains(event.target);

    if (!clickedInsideCard && !clickedInsideDropdown) {
      this.dropdownOpen = false;
    }
  }


  changeView(view: 'table' | 'list' | 'tree' | 'stat') {
    this.selectedView = view;
  }



  toggleSort(column: 'start_time' | 'duration' | 'isError') {
    if (this.sortParameter === column) {
      this.orderParameter = this.orderParameter === 'asc' ? 'dec' : 'asc';
    } else {
      this.sortParameter = column;
      this.orderParameter = 'asc';
    }
    this.fetchTraceData();
  }


  onTableRowSelected(row: any): void {
    this.openModal(row);
  }

  openModal(item: Span): void {
    console.log("Opening Modal");

    this.modalData = {
      serviceCode: item.serviceCode,
      serviceInstanceName: item.serviceInstanceName,
      endpointName: item.endpointName,
      type: item.type,
      component: item.component,
      peer: item.peer,
      isError: item.isError,
      tags: item.tags,
      logs: item.logs,
    };
    console.log("Modal Data: ", this.modalData);
    this.showModal = true;
    console.log("Modal Status: ", this.showModal);
  }

  closeModal(): void {
    this.modalData = null;
    this.showModal = false;
  }

  onListItemSelected(item: any): void {
    this.openModal(item);
  }

  // LOGS

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
    return endpointId;
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
  //   let instanceId = this.entityInstanceId;
  //   let endpointId = '';
  //   if (this.instNameLogs !== 'All') {
  //     instanceId = btoa(this.instNameLogs);
  //     instanceId = `${this.entityId}_${instanceId}`;
  //   } else {
  //     instanceId = this.entityId!;
  //   }
  //   if (this.endpointLogs !== 'All') {
  //     endpointId = btoa(this.endpointLogs);
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

    let instanceId = this.entityInstanceId;
    let endpointId = '';

    if (this.instNameLogs !== 'All') {
      instanceId = btoa(this.instNameLogs);
      instanceId = `${this.entityId}_${instanceId}`;
    } else {
      instanceId = this.entityId!;
    }

    if (this.endpointLogs !== 'All') {
      endpointId = btoa(this.endpointLogs);
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

          const invalidValues =
            (data.total_hits !== undefined && (typeof data.total_hits !== "number" || data.total_hits < 0)) ||
            (data.ERROR !== undefined && (typeof data.ERROR !== "number" || data.ERROR < 0)) ||
            (data.INFO !== undefined && (typeof data.INFO !== "number" || data.INFO < 0)) ||
            (data.WARN !== undefined && (typeof data.WARN !== "number" || data.WARN < 0));

          if (invalidValues) {
            console.error("Invalid or negative logs aggregated values found. Ignoring response:", data);
            return;
          }

          this.totalHitsLog = data.total_hits || 0;
          this.totalPagesLog = Math.ceil(this.totalHitsLog / this.rowsPerPageLog);
        },

        error: (err) => {
          console.error("Failed to load logs aggregated metrics:", err);
        }
      });
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

  // getLogsCountTimeSeries(): void {
  //   const sdt = this.startTime;
  //   const edt = this.endTime;
  //   let instanceId = this.entityInstanceId;
  //   let endpointId = '';

  //   if (this.endpointLogs !== 'All') {
  //     endpointId = btoa(this.endpointLogs);
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
  //   this.apiService.getLogsCountTimeSeries(
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
    let instanceId = this.entityInstanceId;
    let endpointId = '';

    if (this.endpointLogs !== 'All') {
      endpointId = btoa(this.endpointLogs);
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

    this.apiService
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

          if (!data || typeof data !== "object" || !Array.isArray(data.time_series)) {
            console.error("Invalid logs count response structure:", data);
            return;
          }

          const hasInvalid = data.time_series.some(
            (item: any) =>
              typeof item.total !== "number" ||
              item.total < 0 ||
              !item.time_bucket
          );

          if (hasInvalid) {
            console.error("Invalid or negative 'total' values found in logs time series. Ignoring response:", data);
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
      const gridColor = styles.getPropertyValue('--border-color').trim();
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
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
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
            // show total from data
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


  toggleRowSelection(index: number) {
    if (this.selectedRowIndex === index) {
      this.selectedRowIndex = null;
    } else {
      this.selectedRowIndex = index;
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

    if (criteriaKey === 'endpoint') {
      this.endpointLogs = ''
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

  navigateToTraces(event: Event) {
    event.preventDefault();
    const tabEl = document.querySelector<HTMLAnchorElement>('a[href="#traces"]');
    if (tabEl) {
      const tab = new Tab(tabEl);
      tab.show();
      this.status = "error"
      this.selectCriteria("status")
      this.loadData("traces")
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

  openTraceTabLogs(selectedTraceId: any): void {
    const logTab = document.querySelector('.nav-link[href="#traces"]') as HTMLElement;
    if (logTab) {
      logTab.click();
    }
    this.traceID = selectedTraceId;
    // this.searchTrace();
    this.loadData('traces')
    this.selectCriteria('traceID');
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
  //   if (this.endpointLogs !== 'All') {
  //     endpointId = btoa(this.endpointLogs);
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

    if (this.endpointLogs !== 'All') {
      endpointId = btoa(this.endpointLogs);
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

    if (instanceId !== this.entityId) params.instanceId = instanceId;
    if (endpointId !== this.entityId) params.endpointId = endpointId;
    if (this.traceIDLogs) params.traceId = this.traceIDLogs;
    if (this.tags) params.tags = this.tags;
    if (this.excludingKeywordsOfContent) params.excludingKeywordsOfContent = this.excludingKeywordsOfContent;
    if (this.keywordsOfContent) params.keywordsOfContent = this.keywordsOfContent;

    this.apiService
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
            console.error("Invalid aggregated log response structure:", data);
            return;
          }

          const numericFields = ["total_hits", "INFO", "WARN", "ERROR"];
          const hasInvalid = numericFields.some(key =>
            data[key] !== undefined && (typeof data[key] !== "number" || data[key] < 0)
          );

          if (hasInvalid) {
            console.error("Invalid or negative aggregated log values found. Ignoring response:", data);
            return;
          }

          this.logStats = data;
        },

        error: (err) => {
          console.error("Failed to load aggregated log metrics:", err);
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
  //   let instanceId = this.entityInstanceId;
  //   let endpointId = '';

  //   if (this.endpointLogs !== 'All') {
  //     endpointId = btoa(this.endpointLogs);
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
  //   this.apiService.getLogsData(
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
  //     takeUntil(this.destroy$)
  //   ).subscribe((decodedData: any) => {
  //     this.logNames = decodedData
  //     this.loadingLogs = false;
  //   });
  // }

  getLogNames(): void {
    this.loadingLogs = true;

    const sdt = this.startTime + "00";
    const edt = this.endTime + "59";
    let instanceId = this.entityInstanceId;
    let endpointId = '';

    if (this.endpointLogs !== 'All') {
      endpointId = btoa(this.endpointLogs);
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

    if (instanceId !== this.entityId) params.instanceId = instanceId;
    if (endpointId !== this.entityId) params.endpointId = endpointId;
    if (this.traceIDLogs) params.traceId = this.traceIDLogs;
    if (this.tags) params.tags = this.tags;
    if (this.excludingKeywordsOfContent) params.excludingKeywordsOfContent = this.excludingKeywordsOfContent;
    if (this.keywordsOfContent) params.keywordsOfContent = this.keywordsOfContent;
    if (this.sortLogs) params.sort = this.sortLogs;

    this.apiService
      .getLogsData(
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
      )
      .pipe(
        switchMap(data => from(this.decoderService.decodeObject(data))),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (decodedData: any) => {

          if (!decodedData || !Array.isArray(decodedData)) {
            console.error("Invalid logs response structure:", decodedData);
            this.loadingLogs = false;
            return;
          }

          const hasInvalid = decodedData.some((item: any) =>
            !item ||
            typeof item !== "object" ||
            !item.traceId ||
            !item.timeBucket ||
            typeof item.timeBucket !== "number"
          );

          if (hasInvalid) {
            console.error("Invalid entries found in logs list. Ignoring response:", decodedData);
            this.loadingLogs = false;
            return;
          }

          this.logNames = decodedData;
          this.loadingLogs = false;
        },

        error: (err) => {
          console.error("Failed to load logs data:", err);
          this.loadingLogs = false;
        }
      });
  }


  toggleSortLogs(): void {
    this.sortLogs = !this.sortLogs
    this.getLogNames();
  }
  // getThreshold(type: string) {
  //   this.thresholdService.getThreshold(this.entityId, this.componentId, null, this.thresholdst, this.endTime, type)
  //     .subscribe(res => {
  //       this.thresholds = res;
  //       this.initializeCharts(type);
  //     });
  // }

  getThreshold(type: string) {
    const appId = sessionStorage.getItem("ApplicationId");
    const payload = {
        appId,
        serviceId: this.entityInstanceId,
        st: this.thresholdst,
        et: this.endTime,
        type: 'SERVICE'
      };
    this.meteringConfigService
      .getThreshold(payload)
      .subscribe({
        next: (res: any) => {

          if (!res || typeof res !== "object" || Array.isArray(res)) {
            console.error("Invalid threshold response structure:", res);
            return;
          }

          const thresholdBlocks = Object.values(res);

          const invalidBlock = thresholdBlocks.some((block: any) => {
            if (!block || typeof block !== "object") return true;

            const { criticalValue, warningValue, avgBaseline } = block;

            return (
              (typeof criticalValue === "number" && criticalValue < 0) ||
              (typeof warningValue === "number" && warningValue < 0) ||
              (typeof avgBaseline === "number" && avgBaseline < 0)
            );
          });

          if (invalidBlock) {
            console.error("Invalid or negative threshold values found. Ignoring response:", res);
            return;
          }

          this.thresholds = res;
          this.initializeCharts(type);
        },

        error: (err) => {
          console.error("Failed to load threshold metrics:", err);
        }
      });
  }


  initializeCharts(type: any) {
    if (type == "SERVICE") {

      this.getServiceInstanceSuccessRateTimevalues();
      this.getServiceInstanceLatencyTimevalues();
      this.getServiceInstanceLoadTimevalues();
    }
    else if (type == "JVM") {
      this.getJvmCpu()
      this.getJvmMemory()
      this.getJvmGCTime()
    }
  }

  getThresholdDisplay(metric: string, actualValue: number): { value: number, color: string } {
    if (!this.thresholds || !this.thresholds[metric] || actualValue == null) {
      return { value: 0, color: '#3b82f6' };
    }

    const t = this.thresholds[metric];
    let displayValue = t.warningValue;
    let color = '#198754';

    if (metric === 'service_instance_resp_time' || metric === 'service_instance_cpm') {
      if (actualValue >= t.criticalValue) {
        displayValue = t.criticalValue;
        color = 'red';
      } else if (actualValue >= t.warningValue) {
        displayValue = t.warningValue;
        color = 'orange';
      }
    }
    else if (metric === 'service_instance_sla') {
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

  loadUptime(): void {


    this.apiService.getUptimeAvailability(this.entityInstanceId, this.endTime.toString().substring(0, 8)).subscribe({
      next: (data) => {
        this.uptimeData = data;
        const uptime5 = data['5_day']?.uptime_percentage ?? 0;
        const downtime5 = data['5_day']?.downtime_duration_minutes ?? 0;

        const uptime10 = data['10_day']?.uptime_percentage ?? 0;
        const downtime10 = data['10_day']?.downtime_duration_minutes ?? 0;
        this.AppAvailBulletChart(`Uptime (5-day)<br/>Downtime: ${downtime5} mins`, uptime5, 100, '5');
        this.AppAvailBulletChart(`Uptime (10-day)<br/>Downtime: ${downtime10} mins`, uptime10, 100, '10');
      },
      error: (err) => {
        console.error('Error fetching uptime availability:', err);
      }
    });
  }

  ngAfterViewInit() {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
  }

}