import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DatabaseService } from '../../../../../services/database-api.service';
import { DateService } from '../../../../../services/date.service';
import { ResponseData } from '../../../../../models/database';
import * as Highcharts from 'highcharts';
import { ServiceStatus } from '../../../../../models/enums/ServiceStatus';
import { StatusColors } from '../../../../../models/enums/StatusColors';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import 'highcharts/modules/accessibility';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DaysFormatPipe } from "../../../../../pipes/days-format-pipe.pipe";
import { DataSizePipe as DataSizePipe } from "../../../../../pipes/data-size.pipe";
import { NumberAbbreviatePipe } from '../../../../../pipes/number-abbreviate.pipe';
import { ThresholdService } from '../../../../../services/threshold.service';
import { MeteringConfigService } from '../../../../../services/metering-config.service';




@Component({
    selector: 'app-mysql-instance',
    imports: [CommonModule, FormsModule, RouterModule, NumberAbbreviatePipe, MatButtonModule, MatTooltipModule, DaysFormatPipe, DataSizePipe],
    templateUrl: './mysql-instance.component.html',
    styleUrl: './mysql-instance.component.css'
})
export class MysqlInstanceComponent {


  instanceName!: string;
  instanceId!: string;
  serviceId!: string;
  serviceName!: string;
  startTime!: number;
  endTime!: number;
  subscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();

  // For Instance Page
  upTime: string | undefined;
  maxConnections: string | undefined;
  avlConnections: string | undefined;
  innoDbBufferSize: string | undefined;
  threadCacheSize: string | undefined;

  instanceList: string[] = [];
  currentQPSdata: ResponseData[] = [];
  currentTPSdata: ResponseData[] = [];
  slowQueriesTrendData: ResponseData[] = [];
  commandTrendData: ResponseData[] = [];
  commandTrendWriteData: ResponseData[] = [];
  trendsData: ResponseData[] = [];
  connectsData: ResponseData[] = [];
  connectionErrorsData: ResponseData[] = [];
  InnodbBufferPoolUsageData: ResponseData[] = [];
  InnodbBufferPoolMetricsData: ResponseData[] = [];
  thresholds: any = {};
  themeObserver!: MutationObserver;
  avgqps: number = 0
  avgtps: number = 0
  roundUpto: number = 1000;
  thresholdst!: number;
  chart_criteria_qps: string | null = 'avg';
  chart_criteria_slowQueries: string | null = 'avg';
  chart_criteria_readQuery: string | null = 'avg';

  // Graph instances
  graphCurrentQPS: Highcharts.Chart | undefined;
  graphCurrentTPS: Highcharts.Chart | undefined;
  graphSlowQueriesTrend: Highcharts.Chart | undefined;
  graphCommandTrend: Highcharts.Chart | undefined;
  graphCommandTrendWrite!: Highcharts.Chart;
  graphTrends: Highcharts.Chart | undefined;
  graphConnects: Highcharts.Chart | undefined;
  graphConnectionErrors: Highcharts.Chart | undefined;
  graphInnodbBufferPoolUsage: Highcharts.Chart | undefined;
  graphInnodbBufferPoolMetrics: Highcharts.Chart | undefined;
  showFullValues: boolean = false;
  upTimeShowFull = false;
  maxConnectionsShowFull = false;
  avlConnectionsShowFull = false;
  innoDbBufferSizeShowFull = false;
  threadCacheSizeShowFull = false;
  qpsInfo: string = "Queries per Second";
  tpsInfo: string = " Transaction Per Second";
  slowQueriesInfo: string = "Slow Queries Trend , queries per second";
  commandsReadInfo: string = "Commands Trend , Rows Read";
  commandsWriteInfo: string = "Commands Trend , Rows Written";
  threadsInfo: string = "Total Threads Info";
  connectionsInfo: string = "Connections Available And Connections Aborted";
  connectionsErrorsInfo: string = "Connection Errors";
  innodbBufferPoolUsage: string = "Inno DB Buffer Pool Usage";
  innodbBufferPoolMetrics: string = "Inno DB Buffer Pool Metrics";
  isQpsBreached: boolean = false
  isSlowQueriesBreached: boolean = false
  isReadQueriesBreached: boolean = false



  constructor(
    private dateService: DateService,
    private databaseService: DatabaseService,
    private thresholdService : ThresholdService,
    private meteringConfigService : MeteringConfigService
  ) { }

  ngOnInit(): void {
    this.instanceId = sessionStorage.getItem('encodedDatabaseInstanceId') ?? '';
    this.serviceId = sessionStorage.getItem('encodedDatabaseServiceId') ?? '';
    this.instanceName = sessionStorage.getItem('databaseInstanceId') ?? '';
    this.serviceName = sessionStorage.getItem('databaseServiceId') ?? '';
    this.dateService.setActiveComponent('DatabaseInstanceComponent');
    this.subscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'DatabaseInstanceComponent'),
      switchMap(() => this.dateService.date$)).subscribe((datemodel) => {
        this.startTime = this.formatDate(datemodel.startdateTime);
        this.thresholdst = this.formatForThresholdDate(datemodel.startdateTime);
        this.endTime = this.formatDate(datemodel.enddateTime);
        this.loadData();
        // this.refreshAllCharts();
      });
    this.themeObserver = new MutationObserver(() => {
      this.refreshAllCharts();
    });
    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme', 'theme-switch']
    });
  }
  // Add this to your component class
  showFullValueMap: { [key: string]: boolean } = {
    upTime: false,
    maxConnections: false,
    innoDbBufferSize: false,
    threadCacheSize: false
  };

  // Toggle function
  toggleShowFull(metricKey: string): void {
    this.showFullValueMap[metricKey] = !this.showFullValueMap[metricKey];
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
  }

  refreshAllCharts() {
    this.initialize_commands_trend_graph();
    this.initialize_commands_trend_write_graph();
    this.initialize_connection_errors_graph();
    this.initialize_connects_graph();
    this.initialize_currentQPS_graph();
    this.initialize_currentTPS_graph();
    this.initialize_slow_queries_trend_graph();
    this.initialize_trends_graph();
    this.initialize_InnoDb_BufferPoolUsage_graph();
    this.initialize_InnoDb_BufferPoolMetrics_graph();
  }

  loadData() {
    this.refreshAllCharts();
    this.getThreshold("DB");
    this.getInstanceNames();
    this.getUpTime();
    this.getMaxConnections();
    this.getInnoDbBufferSize();
    this.getThreadCacheSize();
    this.loadCurrentQPSgraph();
    this.loadCurrentTPSgraph();
    this.loadSlowQueriesTrendGraph();
    this.loadCommandTrendGraph();
    this.loadTrendsGraph();
    this.loadConnectsGraph();
    this.loadConnectionErrorsGraph();
    this.loadInnodbBufferPoolUsage();
    this.loadInnodbBufferPoolMetrics();
  }

  toggleConnectionsView() {
    this.maxConnectionsShowFull = !this.maxConnectionsShowFull;
    this.avlConnectionsShowFull = !this.avlConnectionsShowFull;
  }

  getThreshold(type: string) {
    const appId = sessionStorage.getItem('mySqlId');
    const payload = {
      appId: appId,
      entityId: this.instanceId,
      st: this.thresholdst,
      et: this.endTime,
      type: "RELATIONAL"
    };
    this.meteringConfigService.getThreshold(payload)
      .subscribe({
        next: (res: any) => {
          if (!res || typeof res !== "object" || Array.isArray(res)) {
            console.error("Invalid threshold response structure:", res);
            return;
          }
          const hasNegative = this.containsNegativeValue(res);
          if (hasNegative) {
            console.error("Negative values found in threshold response. Ignoring response:", res);
            return;
          }
          this.thresholds = res;
          this.loadCurrentQPSgraph();
          this.loadSlowQueriesTrendGraph();
          this.loadCommandTrendGraph();
        },
        error: (err) => {
          console.error("Failed to load threshold data:", err);
        }
      });
  }

  private containsNegativeValue(obj: any): boolean {
    try {
      const check = (value: any): boolean => {
        if (typeof value === "number") {
          return value < 0;
        }
        if (typeof value === "string" && !isNaN(Number(value))) {
          return Number(value) < 0;
        }
        if (Array.isArray(value)) {
          return value.some(v => check(v));
        }
        if (typeof value === "object" && value !== null) {
          return Object.values(value).some(v => check(v));
        }
        return false;
      };

      return check(obj);
    } catch (e) {
      console.error("Error while checking negative values:", e);
      return true;
    }
  }

  getThresholdDisplay(metric: string, actualValue: number): { value: number, color: string } {
    if (!this.thresholds || !this.thresholds[metric] || actualValue == null) {
      return { value: 0, color: '#3b82f6' }; // default blue
    }

    const t = this.thresholds[metric];
    let displayValue = t.warningValue;
    let color = 'green'; // default safe

    // Define higher-is-worse metrics
    const higherIsWorse = [
      'meter_mysql_instance_connection_errors_internal',
      'meter_mysql_instance_commands_delete_rate',
      'meter_mysql_instance_commands_update_rate',
      'meter_mysql_instance_commands_select_rate',
      'meter_mysql_instance_commands_insert_rate',
      'meter_mysql_instance_slow_queries_rate',
      'meter_mysql_instance_qps',
      'meter_mysql_instance_threads_created',
      'meter_mysql_instance_threads_connected',
      'meter_mysql_instance_threads_running',
      'meter_mysql_instance_threads_cached'
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

  loadInstanceData() {
    if (this.instanceName == '') {
      return;
    }
    this.instanceId = this.serviceId + '.1_' + btoa(this.instanceName);
    this.loadData();
  }
  getInstanceNames() {
    this.databaseService.getInstanceNames(this.serviceId, this.startTime, this.endTime, -1, -1).pipe(takeUntil(this.destroy$)).subscribe(response => {
      if (response.serviceStatus == ServiceStatus.SUCCESS) {
        this.instanceList = response.serviceResponse;
      }
      else {
        this.instanceList = [];
      }
    }, err => {
      this.instanceList = [];
    })
  }
  getUpTime() {
    this.databaseService.getUpTime(this.instanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe(response => {
      if (response.serviceStatus == ServiceStatus.SUCCESS) {
        this.upTime = response.serviceResponse['uptime'];
      }
      else {
        this.upTime = undefined;
      }
    }, err => {
      this.upTime = undefined;
    })
  }
  getMaxConnections() {
    this.databaseService.getMaxConnections(this.instanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe(response => {
      if (response.serviceStatus == ServiceStatus.SUCCESS) {
        this.maxConnections = response.serviceResponse['maxConnections'];
      }
      else {
        this.maxConnections = undefined;
      }
    }, err => {
      this.maxConnections = undefined;
    })
  }
  getInnoDbBufferSize() {
    this.databaseService.getInnoDbBufferSize(this.instanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe(response => {
      if (response.serviceStatus == ServiceStatus.SUCCESS) {
        this.innoDbBufferSize = response.serviceResponse['innoDbBufferPoolSize'];
      }
      else {
        this.innoDbBufferSize = undefined;
      }
    }, err => {
      this.innoDbBufferSize = undefined;
    })
  }
  getThreadCacheSize() {
    this.databaseService.getThreadCacheSize(this.instanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe(response => {
      if (response.serviceStatus == ServiceStatus.SUCCESS) {
        this.threadCacheSize = response.serviceResponse['threadCacheSize'];
      }
      else {
        this.threadCacheSize = undefined;
      }
    }, err => {
      this.threadCacheSize = undefined;
    })
  }
  loadCurrentQPSgraph() {
    let conSum = 0
    this.databaseService.getInstanceCurrentQPS(this.instanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.currentQPSdata = response.serviceResponse;
        this.currentQPSdata.forEach(element => {
          if (element['qps'] !== 0) {
            conSum += element['qps']
          }
        });
        this.avgqps = Math.round((conSum / this.currentQPSdata.length) * this.roundUpto) / this.roundUpto
      } else {
        this.currentQPSdata = [];
        console.error(response.serviceError);
      }
      this.initialize_currentQPS_graph();
    }, err => {
      this.currentQPSdata = [];
      if (this.graphCurrentQPS) {
        this.graphCurrentQPS.destroy();
      }
    });
  }

  loadCurrentTPSgraph() {
    let conSum = 0;
    this.databaseService.getInstanceCurrentTPS(this.instanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.currentTPSdata = response.serviceResponse;
        this.currentTPSdata.forEach(element => {
          if (element['tps'] !== 0) {
            conSum += element['tps']
          }
        });
        this.avgtps = Math.round((conSum / this.currentTPSdata.length) * this.roundUpto) / this.roundUpto
      } else {
        this.currentTPSdata = [];
        console.error(response.serviceError);
      }
      this.initialize_currentTPS_graph();
    }, err => {
      this.currentTPSdata = [];
      if (this.graphCurrentTPS) {
        this.graphCurrentTPS.destroy();
      }
    });
  }

  loadSlowQueriesTrendGraph() {
    this.databaseService.getInstanceSlowQueriesRate(this.instanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.slowQueriesTrendData = response.serviceResponse;
      } else {
        this.slowQueriesTrendData = [];
        console.error(response.serviceError);
      }
      this.initialize_slow_queries_trend_graph();
    }, err => {
      this.slowQueriesTrendData = [];
      if (this.graphSlowQueriesTrend) {
        this.graphSlowQueriesTrend.destroy();
      }
    });
  }

  loadCommandTrendGraph() {
    this.databaseService.getServiceCommandTrends(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
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
        this.initialize_commands_trend_graph();
        this.initialize_commands_trend_write_graph();
      }, err => {
        this.commandTrendData = [];
        this.commandTrendWriteData = [];
        if (this.graphCommandTrend) {
          this.graphCommandTrend.destroy();
        }
        if (this.graphCommandTrendWrite) {
          this.graphCommandTrendWrite.destroy();
        }
      });
  }

  loadTrendsGraph() {
    this.databaseService.getInstanceThreads(this.instanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.trendsData = response.serviceResponse;
      } else {
        this.trendsData = [];
        console.error(response.serviceError);
      }
      this.initialize_trends_graph();
    }, err => {
      this.trendsData = [];
      if (this.graphTrends) {
        this.graphTrends.destroy();
      }
    });
  }

  loadConnectsGraph() {
    let tempList: any[] = []
    this.databaseService.getInstanceConnects(this.instanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.connectsData = response.serviceResponse;
        this.connectsData.forEach(element => {
          if (element['connects_available'] !== null) {
            tempList.push(element)
          }
        });
        const len = tempList.length
        if (len > 0)
          this.avlConnections = tempList[len - 1]['connects_available']
      } else {
        this.connectsData = [];
        console.error(response.serviceError);
      }
      this.initialize_connects_graph();
    }, err => {
      this.connectsData = [];
      if (this.graphConnects) {
        this.graphConnects.destroy();
      }
    });
  }

  loadConnectionErrorsGraph() {
    this.databaseService.getInnoDbBufferPoolUsage(this.instanceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response) => {
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

  loadInnodbBufferPoolUsage() {
    this.databaseService.getInnoDbBufferPoolUsage(this.instanceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$)).subscribe((response) => {
        if (response.serviceStatus === ServiceStatus.SUCCESS) {
          this.InnodbBufferPoolUsageData = response.serviceResponse;

        } else {
          this.InnodbBufferPoolUsageData = [];
          console.error(response.serviceError);
        }
        this.initialize_InnoDb_BufferPoolUsage_graph();
      }, err => {
        this.InnodbBufferPoolUsageData = [];
        if (this.graphInnodbBufferPoolUsage) {
          this.graphInnodbBufferPoolUsage.destroy();
        }
      });
  }

  loadInnodbBufferPoolMetrics() {
    this.databaseService.getInnoDbBufferPoolMetrics(this.instanceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$)).subscribe((response) => {
        if (response.serviceStatus === ServiceStatus.SUCCESS) {
          this.InnodbBufferPoolMetricsData = response.serviceResponse;

        } else {
          this.InnodbBufferPoolMetricsData = [];
          console.error(response.serviceError);
        }
        this.initialize_InnoDb_BufferPoolMetrics_graph();
      }, err => {
        this.InnodbBufferPoolMetricsData = [];
        if (this.graphInnodbBufferPoolMetrics) {
          this.graphInnodbBufferPoolMetrics.destroy();
        }
      });
  }



  initialize_currentQPS_graph() {
    try {
      if (this.graphCurrentQPS) {
        this.graphCurrentQPS.destroy();
      }

      const metric = 'meter_mysql_nstance_qps';
      const baseline = this.thresholds?.[metric]?.avgBaseline ?? undefined;
      const warning = this.thresholds?.[metric]?.warningValue ?? undefined;
      const critical = this.thresholds?.[metric]?.criticalValue ?? undefined;

      const chartData = this.currentQPSdata.map(qpsData => {
        const time_bucket = this.convertTimebucket(qpsData.time_bucket);
        const QPS = qpsData['qps'];
        const status = (qpsData['status'] ? qpsData['color'] : 'NORMAL') as keyof typeof StatusColors;

        // 🔑 Determine marker color based on thresholds
        let markerColor: string | undefined = StatusColors[status];
        if (critical !== undefined && QPS >= critical) {
          markerColor = 'red';
          this.isQpsBreached = true;
          // critical breach
        } else if (warning !== undefined && QPS >= warning) {
          markerColor = 'yellow';    // warning breach
          this.isQpsBreached = true;

        }

        return {
          x: time_bucket,
          y: QPS,
          marker: { fillColor: markerColor } // marker overrides line color
        };
      });

      const seriesData = [{
        name: 'QPS',
        data: chartData,
        marker: {
          radius: 3,
          symbol: 'circle'
        }
      }];

      const chartOption: any = this.getChartOption(
        'spline',
        'current_qps_graph',
        seriesData,
        baseline,
        this.thresholds,
        metric
      );

      this.graphCurrentQPS = new Highcharts.Chart(chartOption);
    } catch (error) {
      console.error("Error Occurred!", error);
    }
  }


  initialize_currentTPS_graph() {
    try {
      if (this.graphCurrentTPS) {
        this.graphCurrentTPS.destroy();
      }
      const chartData = this.currentTPSdata.map(graphData => {
        const time_bucket = this.convertTimebucket(graphData.time_bucket);
        const TPS = graphData['tps'];
        const status = (graphData['status'] ? graphData['color'] : 'NORMAL') as keyof typeof StatusColors;
        return {
          x: time_bucket,
          y: TPS,
          color: StatusColors[status]
        };
      });
      const seriesData = [{
        name: 'TPS',
        data: chartData,
        marker: {
          radius: 2
        }
      }];
      const chartOption: any = this.getChartOption('spline', 'current_tps_graph', seriesData);
      // this.graphCurrentTPS = new Highcharts.Chart(chartOption);
      this.graphCurrentTPS = Highcharts.chart(chartOption);
    } catch (error) {
      console.error("Error Occurred!", error);
    }
  }


  initialize_slow_queries_trend_graph() {
    try {
      if (this.graphSlowQueriesTrend) {
        this.graphSlowQueriesTrend.destroy();
      }

      const metric = 'meter_mysql_nstance_slow_queries_rate';
      const baseline = this.thresholds?.[metric]?.avgBaseline ?? undefined;
      const warning = this.thresholds?.[metric]?.warningValue ?? undefined;
      const critical = this.thresholds?.[metric]?.criticalValue ?? undefined;

      const chartData = this.slowQueriesTrendData.map(graphData => {
        const time_bucket = this.convertTimebucket(graphData.time_bucket);
        const slow_queries_rate = graphData['slow_queries_rate'];
        const status = (graphData['status'] ? graphData['color'] : 'NORMAL') as keyof typeof StatusColors;

        // 🔑 Determine marker color based on thresholds
        let markerColor: string | undefined = StatusColors[status];
        if (critical !== undefined && slow_queries_rate >= critical) {
          markerColor = 'red';       // critical breach
          this.isSlowQueriesBreached = true

        } else if (warning !== undefined && slow_queries_rate >= warning) {
          markerColor = 'yellow';    // warning breach
          this.isSlowQueriesBreached = true

        }

        return {
          x: time_bucket,
          y: slow_queries_rate,
          marker: { fillColor: markerColor } // marker overrides line color
        };
      });

      const seriesData = [{
        name: 'Slow Queries Rate',
        data: chartData,
        marker: {
          radius: 3,
          symbol: 'circle'
        }
      }];

      const chartOption: Highcharts.Options = this.getChartOption(
        'spline',
        'slow_queries_trend',
        seriesData,
        baseline,
        this.thresholds,
        metric
      );

      // this.graphSlowQueriesTrend = new Highcharts.Chart(chartOption);
      this.graphSlowQueriesTrend = Highcharts.chart(chartOption);
    } catch (error) {
      console.error("Error Occurred!", error);
    }
  }


  initialize_commands_trend_graph(): void {
    try {
      // Destroy previous chart if exists
      if (this.graphCommandTrend) {
        this.graphCommandTrend.destroy();
      }

      const metric = 'meter_mysql_nstance_commands_select_rate';
      const baseline = this.thresholds?.[metric]?.avgBaseline ?? undefined;
      const warning = this.thresholds?.[metric]?.warningValue ?? undefined;
      const critical = this.thresholds?.[metric]?.criticalValue ?? undefined;

      // Get formatted series data
      const rawSeries = this.getSeriesData(this.commandTrendData);

      // Apply colors and threshold-based marker colors
      const seriesData = rawSeries.map(series => {
        const seriesName = series.name?.toLowerCase() || '';
        let lineColor = StatusColors.NEUTRAL;

        if (seriesName.includes('select') || seriesName.includes('insert')) {
          lineColor = StatusColors.INFO;    // Green
        } else if (seriesName.includes('delete')) {
          lineColor = StatusColors.CRITICAL;  // Red
        } else if (seriesName.includes('update')) {
          lineColor = StatusColors.WARNING;   // Orange
        }

        // Apply marker color per point based on thresholds
        const dataWithThresholdMarkers = series.data.map((point: any) => {
          const value = point.y;
          let markerColor: string | undefined = undefined;

          if (critical !== undefined && value >= critical) {
            markerColor = 'red';       // Critical breach
            this.isReadQueriesBreached = true

          } else if (warning !== undefined && value >= warning) {
            markerColor = 'yellow';    // Warning breach
            this.isReadQueriesBreached = true

          }

          return {
            ...point,
            marker: { fillColor: markerColor }
          };
        });

        return {
          ...series,
          data: dataWithThresholdMarkers,
          color: lineColor,
          marker: { radius: 3, symbol: 'circle' }
        };
      });

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
    try {
      if (this.graphTrends) {
        this.graphTrends.destroy();
      }
      const seriesData = this.getSeriesData(this.trendsData);
      const chartOption: any = this.getChartOption('areaspline', 'trends', seriesData);
      this.graphTrends = new Highcharts.Chart(chartOption);
    } catch (error) {
      console.error("Error Occurred!", error);
    }
  }

  initialize_connects_graph() {
    try {
      if (this.graphConnects) {
        this.graphConnects.destroy();
      }
      const seriesData = this.getSeriesData(this.connectsData);
      const chartOption: any = this.getChartOption('spline', 'connects', seriesData);
      this.graphConnects = new Highcharts.Chart(chartOption);
    } catch (error) {
      console.error("Error Occurred!", error);
    }
  }


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
      const metric = 'meter_mysql_nstance_connection_errors_internal';
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
  initialize_InnoDb_BufferPoolUsage_graph() {
    try {
      if (this.graphInnodbBufferPoolUsage) {
        this.graphInnodbBufferPoolUsage.destroy();
      }
      const seriesData = this.getSeriesData(this.InnodbBufferPoolUsageData);
      const chartOption: any = this.getChartOption('area', 'innoDb_BufferPool_usage', seriesData);

      // Override tooltip but keep same look
      chartOption.tooltip.formatter = function () {
        // Format the date
        const dateStr = Highcharts.dateFormat('%A, %b %e, %I:%M %p', this.x);
      
        // Apply custom font style to the header
        let s = `<span style="font-size: 8px; font-weight: normal;">${dateStr}</span><br/>`;
      
        // Add each point
        this.points.forEach((point: { color: any; series: { name: any; }; y: any; }) => {
          s += `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${point.y} MB</b><br/>`;
        });
      
        return s;
      };
      


      this.graphInnodbBufferPoolUsage = new Highcharts.Chart(chartOption);
    } catch (error) {
      console.error("Error Occurred!", error);
    }
  }

  initialize_InnoDb_BufferPoolMetrics_graph() {
    try {
      if (this.graphInnodbBufferPoolMetrics) {
        this.graphInnodbBufferPoolMetrics.destroy();
      }
      const seriesData = this.getSeriesData(this.InnodbBufferPoolMetricsData);
      const chartOption: any = this.getChartOption('area', 'innoDb_BufferPool_metrics', seriesData);

      this.graphInnodbBufferPoolMetrics = new Highcharts.Chart(chartOption);
    } catch (error) {
      console.error("Error Occurred!", error);
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

  getChartOption(chartType: string, chartId: string, seriesData: any[], baseline?: number, thresholds?: any, metric?: string): Highcharts.Options {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();


    return {
      time: { useUTC: false } as any,
      chart: {
        showAxes: true,
        type: chartType,
        backgroundColor: 'transparent',
        renderTo: chartId,
        spacing: [5, 5, 5, 5],
        style: { fontSize: '10px' }
      },
      title: { text: '' },
      credits: { enabled: false },
      exporting: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        type: 'datetime',
        tickAmount: 2,
        title: { text: '' },
        labels: {
          style: { color: labelColor, fontSize: '9px' },
          y: 10
        },
        lineColor: gridColor,
        tickLength: 0,
        gridLineColor: gridColor
      },
      yAxis: {
        min: 0,
        max: baseline ? Math.max(baseline, ...seriesData.map(s => Math.max(...s.data.map((p: any) => p.y ?? 0)))) : undefined,
        tickAmount: 6,
        title: { text: '' },
        labels: {
          style: { color: labelColor, fontSize: '9px' },
          x: -5
        },
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
      plotOptions: {
        areaspline: {
          fillOpacity: 0.3,
          lineWidth: 1,
          marker: {
            enabled: true,
            radius: 2,
            states: {
              hover: { enabled: true }
            }
          }
        },
        spline: {
          lineWidth: 1,
          marker: {
            enabled: true,
            radius: 2,
            states: {
              hover: { enabled: true }
            }
          }
        },
        area: {
          fillOpacity: 0.3,
          lineWidth: 1,
          marker: {
            enabled: true,
            radius: 2,
            states: {
              hover: { enabled: true }
            }
          }
        }
      },
      series: seriesData,
    };
  }
  convertTimebucket(timebucket: string) {
    const year = parseInt(timebucket.slice(0, 4), 10);
    const month = parseInt(timebucket.slice(4, 6), 10) - 1;
    const day = parseInt(timebucket.slice(6, 8), 10);
    const hour = parseInt(timebucket.slice(8, 10), 10);
    const minute = parseInt(timebucket.slice(10, 12), 10);
    const date = new Date(year, month, day, hour, minute);
    return date.getTime();
  }
  formatDate(date: string) {
    date = date.replace(/-/g, '');
    date = date.replace(/:/g, '');
    date = date.replace(' ', '');
    return parseInt(date);
  }


}
