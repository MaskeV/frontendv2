import { Component, OnDestroy, OnInit } from '@angular/core';
import * as Highcharts from 'highcharts';
import { Subject, Subscription } from 'rxjs';
import { filter, switchMap, takeUntil } from 'rxjs/operators';
import { DatabaseService } from '../../../../../services/database-api.service';
import { ServiceStatus } from '../../../../../models/enums/ServiceStatus';
import { StatusColors } from '../../../../../models/enums/StatusColors';
import { ResponseData } from '../../../../../models/database';
import { DateService } from '../../../../../services/date.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SearchItemPipe } from '../../../../../pipes/search-item.pipe';
import { SortPipe } from '../../../../../pipes/sort.pipe';
import { RouterModule } from '@angular/router';
import 'highcharts/modules/accessibility';
import { NumberAbbreviatePipe } from "../../../../../pipes/number-abbreviate.pipe";
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { DaysFormatPipe } from "../../../../../pipes/days-format-pipe.pipe";
import { DataSizePipe } from "../../../../../pipes/data-size.pipe";
import { ThresholdService } from '../../../../../services/threshold.service';
import { MeteringConfigService } from '../../../../../services/metering-config.service';


@Component({
    selector: 'app-mssql-instance',
    imports: [FormsModule, CommonModule, SearchItemPipe, SortPipe, RouterModule, NumberAbbreviatePipe, MatTooltipModule, MatButtonModule, DaysFormatPipe, DataSizePipe],
    templateUrl: './mssql-instance.component.html',
    styleUrl: './mssql-instance.component.css'
})
export class MssqlInstanceComponent implements  OnInit, OnDestroy {

  // common properties
  instanceName!: string;
  instanceId!: string;
  serviceId!: string;
  serviceName!: string;
  startTime!: number ;
    endTime!: number;
  subscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();

  // For Instance Page
  upTime!: string;
  maxConnections!: string;
  avlConnections!: string;
  bufferPoolSize!: string;
  workerThreadSize!: string;

  instanceList: string[] = [];
  currentQPSdata: ResponseData[] = [];
  currentTPSdata: ResponseData[] = [];
  slowQueriesTrendData: ResponseData[] = [];
  commandTrendData: ResponseData[] = [];
  commandTrendWriteData: ResponseData[] = [];
  trendsData: ResponseData[] = [];
  connectsData: ResponseData[] = [];
  connectionErrorsData: ResponseData[] = [];
  themeObserver!: MutationObserver;
  avgqps: number = 0
  avgtps: number = 0
  roundUpto: number = 1000
  thresholds: any = {};
  thresholdst!: number;


  // Graph instances
  graphCurrentQPS!: Highcharts.Chart;
  graphCurrentTPS!: Highcharts.Chart;
  graphSlowQueriesTrend!: Highcharts.Chart;
  graphCommandTrend!: Highcharts.Chart;
    graphCommandTrendWrite!: Highcharts.Chart;
  graphTrends!: Highcharts.Chart;
  graphConnects!: Highcharts.Chart;
  graphConnectionErrors!: Highcharts.Chart;


  instnaceDetails: object = {
    "uptime": "14.616 day",
    "maxConnection": 3000,
    "bufferPoolSize": "2048 MB",
    "workerThreadSize": 100
  };

  showFullValues: boolean = false;
  upTimeShowFull = false;
maxConnectionsShowFull = false;
avlConnectionsShowFull = false;
innoDbBufferSizeShowFull = false;
threadCacheSizeShowFull = false;
isThemeChanged = false;
chart_criteria_qps: string | null = 'avg';
chart_criteria_slowQueries: string | null = 'avg';
chart_criteria_readQuery: string | null = 'avg';
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
isQpsBreached: boolean = false
isSlowQueriesBreached: boolean = false
isReadQueriesBreached: boolean = false

  constructor(
    private dateService: DateService,
    private databaseService: DatabaseService,
    private meteringConfigService : MeteringConfigService,
  ) { }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.instanceId = sessionStorage.getItem('encodedDatabaseInstanceId')!;
    this.serviceId = sessionStorage.getItem('encodedDatabaseServiceId')!;
    this.instanceName = sessionStorage.getItem('databaseInstanceId')!;
    this.serviceName = sessionStorage.getItem('databaseServiceId')!;
    this.dateService.setActiveComponent('DatabaseInstanceComponent');
    this.themeObserver = new MutationObserver(() => {
      this.refreshAllCharts();
      this.isThemeChanged = !this.isThemeChanged;
    });
    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme', 'theme-switch']
    });

    this.subscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'DatabaseInstanceComponent'),
      switchMap(() => this.dateService.date$)).subscribe((datemodel) => {
        this.startTime = this.formatDate(datemodel.startdateTime);
        this.endTime = this.formatDate(datemodel.enddateTime);
        this.thresholdst = this.formatForThresholdDate(datemodel.startdateTime);

        this.loadData();
        this.refreshAllCharts();
      });
  }

  showFullValueMap: { [key: string]: boolean } = {
    upTime: false,
    maxConnections: false,
    bufferPoolSize: false,
    workerThreadSize: false
  };

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
  }

  refreshAllCharts(){
    this.initialize_commands_trend_graph();
    this.initialize_commands_trend_write_graph();
    this.initialize_connection_errors_graph();
    this.initialize_connects_graph();
    this.initialize_currentQPS_graph();
    this.initialize_slow_queries_trend_graph();
    this.initialize_trends_graph();
    this.initialize_currentTPS_graph();
  }

  loadData() {
    this.getThreshold("DB");
    this.getInstanceNames();
    this.getUpTime();
    this.getMaxConnections();
    this.getBufferPoolSize();
    this.getWorkerThreadSize();
    this.loadCurrentQPSgraph();
    this.loadSlowQueriesTrendGraph();
    this.loadCommandTrendGraph();
    this.loadTrendsGraph();
    this.loadConnectsGraph();
    this.loadConnectionErrorsGraph();
    this.loadCurrentTPSgraph();
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


  getThreshold(type: string) {
    const appId = sessionStorage.getItem('msSqlId');
    const payload = {
      appId: appId,
      entityId: this.instanceId,
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
      'meter_mssql_instance_connection_errors_internal',
      'meter_mssql_instance_commands_delete_rate',
      'meter_mssql_instance_commands_update_rate',
      'meter_mssql_instance_commands_select_rate',
      'meter_mssql_instance_commands_insert_rate',
      'meter_mssql_instance_slow_queries_rate',
      'meter_mssql_instance_qps',
      'meter_mssql_instance_threads_created',
      'meter_mssql_instance_threads_connected',
      'meter_mssql_instance_threads_running',
      'meter_mssql_instance_threads_cached'
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


  toggleConnectionsView() {
    this.maxConnectionsShowFull = !this.maxConnectionsShowFull;
    this.avlConnectionsShowFull = !this.avlConnectionsShowFull;
  }

  loadInstanceData() {
    if (this.instanceName == '') {
      return;
    }
    this.instanceId = this.serviceId + '.1_' + btoa(this.instanceName);
    this.loadData();
  }
  getInstanceNames() {
    this.databaseService.getInstanceNamesForMssql(this.serviceId, this.startTime!, this.endTime!, -1, -1).pipe(takeUntil(this.destroy$)).subscribe(response => {
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
    this.databaseService.getUpTimeForMssql(this.instanceId, this.startTime!, this.endTime!).pipe(takeUntil(this.destroy$)).subscribe(response => {
      if (response.serviceStatus == ServiceStatus.SUCCESS) {
        this.upTime = response.serviceResponse['uptime'];
      }
      else {
        this.upTime = undefined!;
      }
    }, err => {
      this.upTime = undefined!;
    })
  }
  getMaxConnections() {
    this.databaseService.getMaxConnectionsForMssql(this.instanceId, this.startTime!, this.endTime!).pipe(takeUntil(this.destroy$)).subscribe(response => {
      if (response.serviceStatus == ServiceStatus.SUCCESS) {
        this.maxConnections = response.serviceResponse['maxConnections'];
      }
      else {
        this.maxConnections = undefined!;
      }
    }, err => {
      this.maxConnections = undefined!;
    })
  }
  getBufferPoolSize() {
    this.databaseService.getBufferSizeForMssql(this.instanceId, this.startTime!, this.endTime!).pipe(takeUntil(this.destroy$)).subscribe(response => {
      if (response.serviceStatus == ServiceStatus.SUCCESS) {
        this.bufferPoolSize = response.serviceResponse['bufferPoolSize'];
      }
      else {
        this.bufferPoolSize = undefined!;
      }
    }, err => {
      this.bufferPoolSize = undefined!;
    })
  }
  getWorkerThreadSize() {
    this.databaseService.getWorkerThreadSizeForMssql(this.instanceId, this.startTime!, this.endTime!).pipe(takeUntil(this.destroy$)).subscribe(response => {
      if (response.serviceStatus == ServiceStatus.SUCCESS) {
        this.workerThreadSize = response.serviceResponse['workerThreadSize'];
      }
      else {
        this.workerThreadSize = undefined!;
      }
    }, err => {
      this.workerThreadSize = undefined!;
    })
  }
  loadCurrentQPSgraph() {
    let conSum = 0
    this.databaseService.getInstanceCurrentQPSForMssql(this.instanceId, this.startTime!, this.endTime!).pipe(takeUntil(this.destroy$)).subscribe((response) => {
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
    this.databaseService.getInstanceCurrentTPS(this.instanceId, this.startTime!, this.endTime!).pipe(takeUntil(this.destroy$)).subscribe((response) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.currentTPSdata = response.serviceResponse;
        this.currentTPSdata.forEach(element=>{
          if (element['tps']!==0){
            conSum+=element['tps']
          }
        });
        this.avgtps = Math.round((conSum/this.currentTPSdata.length)*this.roundUpto)/this.roundUpto
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
    this.databaseService.getInstanceSlowQueriesRateForMssql(this.instanceId, this.startTime!, this.endTime!).pipe(takeUntil(this.destroy$)).subscribe((response) => {
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

  // loadCommandTrendGraph() {
  //   this.databaseService.getInstanceCommandTrendsForMssql(this.instanceId, this.startTime!, this.endTime!).pipe(takeUntil(this.destroy$)).subscribe((response) => {
  //     if (response.serviceStatus === ServiceStatus.SUCCESS) {
  //       this.commandTrendData = response.serviceResponse;
  //     } else {
  //       this.commandTrendData = [];
  //       console.error(response.serviceError);
  //     }
  //     this.initialize_commands_trend_graph();
  //   }, err => {
  //     this.commandTrendData = [];
  //     if (this.graphCommandTrend) {
  //       this.graphCommandTrend.destroy();
  //     }
  //   });
  // }

  loadCommandTrendGraph() {
    this.databaseService.getInstanceCommandTrendsForMssql(this.instanceId, this.startTime!, this.endTime!)
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
    this.databaseService.getInstanceThreadsForMssql(this.instanceId, this.startTime!, this.endTime!).pipe(takeUntil(this.destroy$)).subscribe((response) => {
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
    let tempList :any[] = []
    this.databaseService.getInstanceConnectsForMssql(this.instanceId, this.startTime!, this.endTime!).pipe(takeUntil(this.destroy$)).subscribe((response) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.connectsData = response.serviceResponse;
        this.connectsData.forEach(element=>{
          if (element['connects_available']!==null){
            tempList.push(element)
          }
        });
        const len = tempList.length
        if (len>0)
          this.avlConnections = tempList[len-1]['connects_available']
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

  // loadConnectionErrorsGraph() {
  //   this.databaseService.getInstanceConnectionErrorsForMssql(this.instanceId, this.startTime!, this.endTime!).pipe(takeUntil(this.destroy$)).subscribe((response) => {
  //     if (response.serviceStatus === ServiceStatus.SUCCESS) {
  //       this.connectionErrorsData = response.serviceResponse;
  //     } else {
  //       this.connectionErrorsData = [];
  //       console.error(response.serviceError);
  //     }
  //     this.initialize_connection_errors_graph();
  //   }, err => {
  //     this.connectionErrorsData = [];
  //     if (this.graphConnectionErrors) {
  //       this.graphConnectionErrors.destroy();
  //     }
  //   });
  // }

  loadConnectionErrorsGraph() {
    this.databaseService.getInstanceConnectionErrorsForMssql(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response) => {
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


  // initialize_currentQPS_graph() {
  //   try {
  //     if (this.graphCurrentQPS) {
  //       this.graphCurrentQPS.destroy();
  //     }
  //     const chartData = this.currentQPSdata.map(qpsData => {
  //       const time_bucket = this.convertTimebucket(qpsData.time_bucket);
  //       const internal_errors = qpsData['connection_errors_internal'];

  //       // const status = qpsData.status ? qpsData.color : 'NORMAL';
  //       const status = (qpsData['status'] ? qpsData['color'] : 'NORMAL') as keyof typeof StatusColors;

  //       return {
  //         x: time_bucket,
  //         y: internal_errors,
  //         color: StatusColors[status]
  //       };
  //     });
  //     const seriesData = [{
  //       name: 'QPS',
  //       data: chartData,
  //       marker: {
  //         radius: 2
  //       }
  //     }];
  //     const chartOption: any = this.getChartOption('spline', 'current_qps_graph', seriesData);
  //     this.graphCurrentQPS = new Highcharts.Chart(chartOption);
  //   } catch (error) {
  //     console.error("Error Occurred!", error);
  //   }
  // }

    initialize_currentQPS_graph() {
      try {
        if (this.graphCurrentQPS) {
          this.graphCurrentQPS.destroy();
        }
        const metric = 'meter_mssql_instance_qps';
        const baseline = this.thresholds?.[metric]?.avgBaseline ?? undefined;
        const warning = this.thresholds?.[metric]?.warningValue ?? undefined;
        const critical = this.thresholds?.[metric]?.criticalValue ?? undefined;
        const chartData = this.currentQPSdata.map(qpsData => {
          const time_bucket = this.convertTimebucket(qpsData.time_bucket);
          const QPS = qpsData['qps'];
          const status = (qpsData['status'] ? qpsData['color'] : 'NORMAL') as keyof typeof StatusColors;
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
        const chartOption: any = this.getChartOption( 'spline',
          'current_qps_graph',
          seriesData,
          baseline,
          this.thresholds,
          metric);
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
      this.graphCurrentTPS = new Highcharts.Chart(chartOption);
    } catch (error) {
      console.error("Error Occurred!", error);
    }
  }

  
  initialize_slow_queries_trend_graph() {
    try {
      if (this.graphSlowQueriesTrend) {
        this.graphSlowQueriesTrend.destroy();
      }
      const metric = 'meter_mssql_instance_slow_queries_rate';
      const baseline = this.thresholds?.[metric]?.avgBaseline ?? undefined;
      const warning = this.thresholds?.[metric]?.warningValue ?? undefined;
      const critical = this.thresholds?.[metric]?.criticalValue ?? undefined;
      const chartData = this.slowQueriesTrendData.map(graphData => {
        const time_bucket = this.convertTimebucket(graphData.time_bucket);
        const slow_queries_rate = graphData['slow_queries_rate'];
        const status = (graphData['status'] ? graphData['color'] : 'NORMAL') as keyof typeof StatusColors;

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
        name: 'Slow Queries',
        data: chartData,
        marker: {
          radius: 3,
          symbol: 'circle'
        }
      }];
      const chartOption: any = this.getChartOption('spline', 'slow_queries_trend',
        seriesData,
        baseline,
        this.thresholds,
        metric);
      this.graphSlowQueriesTrend = new Highcharts.Chart(chartOption);
    } catch (error) {
      console.error("Error Occurred!", error);
    }
  }

  // initialize_commands_trend_graph() {
  //   try {
  //     if (this.graphCommandTrend) {
  //       this.graphCommandTrend.destroy();
  //     }
  //     const seriesData = this.getSeriesData(this.commandTrendData);
  //     const chartOption: any = this.getChartOption('areaspline', 'commands_trend', seriesData);
  //     this.graphCommandTrend = new Highcharts.Chart(chartOption);
  //   } catch (error) {
  //     console.error("Error Occurred!", error);
  //   }
  // }

    initialize_commands_trend_graph(): void {
      try {
        // Destroy previous chart if exists
        if (this.graphCommandTrend) {
          this.graphCommandTrend.destroy();
        }
        const metric = 'meter_mssql_instance_commands_select_rate';
              const baseline = this.thresholds?.[metric]?.avgBaseline ?? undefined;
              const warning = this.thresholds?.[metric]?.warningValue ?? undefined;
              const critical = this.thresholds?.[metric]?.criticalValue ?? undefined;
          
    
        // Get formatted series data
        const rawSeries = this.getSeriesData(this.commandTrendData);
    
        // Apply colors based on series name patterns
        const seriesData = rawSeries.map((series) => {
          const seriesName = series.name?.toLowerCase() || '';
          let color = StatusColors.NEUTRAL;
          
          if (seriesName.includes('select') || seriesName.includes('insert')) {
            color = StatusColors.INFO;    // Green
          } else if (seriesName.includes('delete')) {
            color = StatusColors.CRITICAL;  // Red
          } else if (seriesName.includes('update')) {
            color = StatusColors.WARNING;   // Orange
          }

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
          color: color,
          marker: { radius: 3, symbol: 'circle' }
          };
        });
    
        // Get final chart options
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
    const series : any = {};
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
    const displayNameMap: { [key: string]: string } = {
      'select_rate': 'Access Ops/Sec',
      'insert_rate': 'Insert Ops/sec',
      'update_rate': 'Update Ops/sec',
      'delete_rate': 'Delete Ops/sec',
      'slow_queries_rate': 'Slow Queries'
    };
    const seriesData = Object.keys(series).map(key => {
      let seriesName = displayNameMap[key] || key.replace(/_/g, ' ');
      if (!displayNameMap[key]) {
        seriesName = seriesName.charAt(0).toUpperCase() + seriesName.slice(1);
      }
      return {
        name: seriesName,
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
