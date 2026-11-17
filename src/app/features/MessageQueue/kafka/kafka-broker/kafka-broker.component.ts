import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params, RouterModule } from '@angular/router';
import { MatIcon } from "@angular/material/icon";
import * as Highcharts from 'highcharts';
import { filter, min, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import { KafkaService } from '../../../../services/kafka.service';
import { ServiceResponse } from '../../../../models/common/ServiceResponse';
import { ServiceStatus } from '../../../../models/enums/ServiceStatus';
import { HotToastService } from '@ngxpert/hot-toast';
import { NumericDataPipe } from '../../../../pipes/numeric-data.pipe';
import { ShortNumberPipe } from '../../../../pipes/short-number.pipe';
import { StringDataPipe } from '../../../../pipes/string-data.pipe';
import { BytesPipe } from '../../../../pipes/bytes.pipe';
import { SeriesOptionsType } from 'highcharts';
import 'highcharts/modules/no-data-to-display';

interface BrokerKpi {
  max_lag: number | null;
  isr_shrinks?: number | null;
  isr_expands?: number | null;
  min_isr_partition_count?: number | null;
  under_replicated_partitions?: number | null;
  uptime_seconds?: number | null;
  active_controller?: number | null;
  partition_count?: number | null;
}

interface MetricStats {
  min: number;
  max: number;
  sum: number;
  count: number;
  avg: number;
}



@Component({
    selector: 'app-kafka-broker',
    imports: [CommonModule, RouterModule, MatIcon, NumericDataPipe, ShortNumberPipe, StringDataPipe, BytesPipe],
    templateUrl: './kafka-broker.component.html',
    styleUrl: './kafka-broker.component.css'
})
export class KafkaBrokerComponent implements OnInit, OnDestroy {

  // Basic Declaration
  entityId: string | null;
  clusterId!: string;
  clusterName!: string;
  brokerId!: string | null;
  brokerName!: string;
  memoryToggle: boolean = false;
  brokerKPI: BrokerKpi = {
    max_lag: null,
    isr_shrinks: null,
    isr_expands: null,
    min_isr_partition_count: null,
    under_replicated_partitions: null,
    uptime_seconds: null,
    active_controller: null,
    partition_count: null
  }
  uptime?: string;
  isActiveController?: string;

  // KPI data
  healthyPartitionPct?: number;
  healthyPartition?: number;
  underReplicatedPartitionPct?: number;
  bytesIn?: number;
  bytesInPct?: number;
  bytesOut?: number;
  bytesOutPct?: number;
  throughput?: number;
  cpuUsage?: number;
  memoryUsageData: any[] = [];
  memoryUsageMetaData: any;
  gcCount?: number;
  messagesInPerSec?: number;
  topicFetchReqPerSec?: number;
  topicProduceReqPerSec?: number;
  maxLag?: number;
  queueTime?: number;
  replicationThroughput?: { [metric: string]: MetricStats };



  // Graphs Declaration
  cpuUsageChart!: Highcharts.Chart;
  memoryUsageChart!: Highcharts.Chart;
  gcCountChart!: Highcharts.Chart;
  messagesInChart!: Highcharts.Chart;
  maxLagChart!: Highcharts.Chart;
  queueTimeChart!: Highcharts.Chart;

  // Colour Codes
  GC_COUNT_COLORS = [
    { line: '#F59E0B', stops: [[0, 'rgba(245,158,11,0.35)'], [1, 'rgba(245,158,11,0.08)']] },
    { line: '#d97706', stops: [[0, 'rgba(245, 158, 11,0.35)'], [1, 'rgba(245, 158, 11,0.08)']] },
  ]

  // Common Variables
  startTime!: number;
  endTime!: number;
  subscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();


  constructor(private activatedRoute: ActivatedRoute, private dateService: DateService, private kafkaService: KafkaService, private toast: HotToastService) {
    this.entityId = this.activatedRoute.snapshot.paramMap.get('brokerId');

  }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    if (!this.entityId) {
      this.entityId = sessionStorage.getItem('encodedEntityId');
    }
    if (this.entityId) {
      const [clusterId, brokerId] = this.entityId.split('.1_');
      this.clusterId = clusterId;
      this.brokerId = brokerId;
      this.clusterName = atob(this.clusterId);
      this.brokerName = atob(this.brokerId);
    }
    this.dateService.setActiveComponent('KafkaBrokerComponent');

    this.subscription.add(
      this.dateService.activeComponent$.pipe(
        filter(activeComponent => activeComponent === 'KafkaBrokerComponent'),
        switchMap(() => this.dateService.date$)
      ).subscribe((datemodel) => {
        this.startTime = this.formatDate(datemodel.startdateTime);
        this.endTime = this.formatDate(datemodel.enddateTime);
        this.loadData();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.memoryToggle = false;
    this.getKPIData();
    this.getThroughputData();
    this.getCpuUsageData();
    this.getMemoryUsageData();
    this.getGarbageCollectorCountData()
    this.getMessagesInData();
    this.getTopicFetchRequestsPerSecond();
    this.getTopicProduceRequestsPerSecond();
    this.getMaxLagData();
    this.getRequestQueueTimeMs();
    this.getReplicationThroughput();
  }

  getKPIData() {
    const API = 'getAllKPIs';
    this.kafkaService.getBrokerData(this.entityId, this.startTime, this.endTime, API)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              this.brokerKPI = response.serviceResponse;
              this.uptime = this.formatActiveTime(this.brokerKPI.uptime_seconds);
              if (this.brokerKPI.under_replicated_partitions != null && this.brokerKPI.partition_count != null) {
                this.healthyPartition = this.brokerKPI.partition_count - this.brokerKPI.under_replicated_partitions;
                this.healthyPartitionPct = this.calculatePercent(this.healthyPartition, this.brokerKPI.partition_count);
                this.underReplicatedPartitionPct = this.calculatePercent(this.brokerKPI.under_replicated_partitions, this.brokerKPI.partition_count);
              } else {
                this.healthyPartition = undefined;
                this.healthyPartitionPct = undefined;
                this.underReplicatedPartitionPct = undefined;
              }
              this.isActiveController =
                this.brokerKPI?.active_controller == null
                  ? 'No Data'
                  : Number(this.brokerKPI.active_controller) === 1
                    ? 'Yes'
                    : 'No';
            } else {
              this.uptime = undefined;
              this.isActiveController = undefined;
              this.healthyPartition = undefined;
              this.healthyPartitionPct = undefined;
              this.underReplicatedPartitionPct = undefined;
              this.brokerKPI = {
                max_lag: null,
                isr_shrinks: null,
                isr_expands: null,
                min_isr_partition_count: null,
                under_replicated_partitions: null,
                uptime_seconds: null,
                active_controller: null,
                partition_count: null
              }
              console.log(response.serviceResponse);
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.uptime = undefined;
            this.isActiveController = undefined;
            this.healthyPartition = undefined;
            this.healthyPartitionPct = undefined;
            this.underReplicatedPartitionPct = undefined;
            this.brokerKPI = {
              max_lag: null,
              isr_shrinks: null,
              isr_expands: null,
              min_isr_partition_count: null,
              under_replicated_partitions: null,
              uptime_seconds: null,
              active_controller: null,
              partition_count: null
            }
            console.error("Unable fetch brokerKPI due to !!");
          }
        });
  }

  getThroughputData() {
    const API = 'getThroughputPerSec';
    this.kafkaService.getBrokerData(this.entityId, this.startTime, this.endTime, API)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              const metaData = response?.metaData?.throughput;
              this.bytesIn = metaData?.bytes_in_per_second?.avg;
              this.bytesOut = metaData?.bytes_out_per_second?.avg;
              const bytesInMax = metaData?.bytes_in_per_second?.max;
              const bytesOutMax = metaData?.bytes_out_per_second?.max;
              this.bytesInPct = this.calculatePercent(this.bytesIn, bytesInMax);
              this.bytesOutPct = this.calculatePercent(this.bytesOut, bytesOutMax);
              if (this.bytesIn != null && this.bytesOut != null) {
                this.throughput = this.bytesIn + this.bytesOut;
              } else {
                this.throughput = undefined;
              }

            } else {
              this.throughput = undefined;
              this.bytesIn = undefined;
              this.bytesOut = undefined;
              this.bytesInPct = undefined;
              this.bytesOutPct = undefined;
              console.log(response.serviceResponse);
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.throughput = undefined;
            this.bytesIn = undefined;
            this.bytesOut = undefined;
            this.bytesInPct = undefined;
            this.bytesOutPct = undefined;
            console.error("Unable fetch throughput data !!");
          }
        });
  }

  getCpuUsageData() {
    const API = 'getCPUUsage';
    this.kafkaService.getBrokerData(this.entityId, this.startTime, this.endTime, API)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              this.cpuUsage = response?.metaData?.kpi?.cpu_time_total?.avg;
              this.renderCPUusageChart(response.serviceResponse, response.metaData);
            } else {
              this.cpuUsage = undefined;
              this.renderCPUusageChart([], undefined);
              console.log(response.serviceResponse);
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.cpuUsage = undefined;
            this.renderCPUusageChart([], undefined);
            console.error("Unable fetch cpu usage data !!");
          }
        });
  }

  getMemoryUsageData() {
    const API = 'getMemoryUsage';
    this.kafkaService.getBrokerData(this.entityId, this.startTime, this.endTime, API)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              this.memoryUsageData = response.serviceResponse;
              this.memoryUsageMetaData = response?.metaData;
            } else {
              this.memoryUsageData = [];
              this.memoryUsageMetaData = undefined;
              console.log(response.serviceResponse);
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.memoryUsageData = [];
            this.memoryUsageMetaData = undefined;
            console.error("Unable fetch memory usage data !!");
          }
        });
  }

  getGarbageCollectorCountData() {
    const API = 'getGarbageCollectorCount';
    this.kafkaService.getBrokerData(this.entityId, this.startTime, this.endTime, API)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              const metaData = response.metaData;
              this.gcCount = this.calculateKPI(metaData?.dataTable, 'avg');
              this.renderGCCountChart(response.serviceResponse, metaData);
            } else {
              this.gcCount = undefined;
              this.renderGCCountChart([], undefined);
              console.log(response.serviceResponse);
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.gcCount = undefined;
            this.renderGCCountChart([], undefined);
            console.error("Unable fetch GC count data !!");
          }
        });
  }

  getMessagesInData() {
    const API = 'getMessagesPerSecond';
    this.kafkaService.getBrokerData(this.entityId, this.startTime, this.endTime, API)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              const metaData = response.metaData;
              this.messagesInPerSec = metaData?.kpi?.messages_per_second?.avg;
              this.renderMessagesInChart(response.serviceResponse, metaData);
            } else {
              this.messagesInPerSec = undefined;
              this.renderMessagesInChart([], undefined);
              console.log(response.serviceResponse);
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.messagesInPerSec = undefined;
            this.renderMessagesInChart([], undefined);
            console.error("Unable fetch Messages in data !!");
          }
        });
  }

  getTopicFetchRequestsPerSecond() {
    const API = 'getTopicFetchRequestsPerSecond';
    this.kafkaService.getBrokerData(this.entityId, this.startTime, this.endTime, API)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              const metaData = response.metaData?.dataTable;
              this.topicFetchReqPerSec = metaData?.total?.avg;
            } else {
              this.topicFetchReqPerSec = undefined;
              console.log(response.serviceResponse);
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.topicFetchReqPerSec = undefined;
            console.error("Unable to get Topic Fetch data !!");
          }
        });
  }

  getTopicProduceRequestsPerSecond() {
    const API = 'getTopicProduceRequestsPerSecond';
    this.kafkaService.getBrokerData(this.entityId, this.startTime, this.endTime, API)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              const metaData = response.metaData?.dataTable;
              this.topicProduceReqPerSec = metaData?.total?.avg;
            } else {
              this.topicProduceReqPerSec = undefined;
              console.log(response.serviceResponse);
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.topicProduceReqPerSec = undefined;
            console.error("Unable to get Topic Produce data !!");
          }
        });
  }

  getMaxLagData() {
    const API = 'getMaxLag';
    this.kafkaService.getBrokerData(this.entityId, this.startTime, this.endTime, API)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              const metaData = response.metaData?.kpi;
              this.maxLag = metaData?.max_lag?.max;
              this.renderMaxLagChart(response.serviceResponse, metaData);
            } else {
              this.maxLag = undefined;
              this.renderMaxLagChart([], undefined);
              console.log(response.serviceResponse);
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.maxLag = undefined;
            this.renderMaxLagChart([], undefined);
            console.error("Unable to get Max Lag data !!");
          }
        });
  }

  getRequestQueueTimeMs() {
    const API = 'getRequestQueueTimeMs';
    this.kafkaService.getBrokerData(this.entityId, this.startTime, this.endTime, API)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              const metaData = response.metaData?.kpi;
              this.queueTime = metaData?.request_queue_time_ms?.avg;
              this.renderQueueTimeChart(response.serviceResponse, metaData);
            } else {
              this.queueTime = undefined;
              this.renderQueueTimeChart([], undefined);
              console.log(response.serviceResponse);
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.queueTime = undefined;
            this.renderQueueTimeChart([], undefined);
            console.error("Unable to get queue time data !!");
          }
        });
  }

  getReplicationThroughput() {
    const API = 'getReplicationThroughput';
    this.kafkaService.getBrokerData(this.entityId, this.startTime, this.endTime, API)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              this.replicationThroughput = response.metaData?.kpi;
            } else {
              this.replicationThroughput = undefined;
              console.log(response.serviceResponse);
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.replicationThroughput = undefined;
            console.error("Unable to get replication throughput data !!");
          }
        });
  }

  toggleMemoryChart() {
    this.memoryToggle = !this.memoryToggle;
    if (this.memoryToggle) {
      setTimeout(() => this.renderMemoryUsageChart(), 0)
    }
  }

  // Charts Util - Render Charts
  renderCPUusageChart(responseData: any[], metaData: any) {
    const chartId = 'cpu-usage-chart';
    const seriesData = this.getUniSeriesData('column', responseData, 'cpu_time_total', 'cpu_usage_percentage');
    const chartOption = this.getCPUusageChartOption(seriesData);
    this.cpuUsageChart = new Highcharts.Chart(chartId, chartOption);
  }

  renderMemoryUsageChart() {
    const chartId = 'memory-usage-chart';
    const seriesData = this.getUniSeriesData('areaspline', this.memoryUsageData, 'memory_usage_percentage', 'memory_usage_percentage');
    const chartOption = this.getMemoryUsageChartOption(seriesData);
    this.memoryUsageChart = new Highcharts.Chart(chartId, chartOption);
  }

  renderGCCountChart(responseData: any[], metaData: any) {
    const chartId = 'gc-count-chart';
    const seriesData = this.getSeriesData('areaspline', responseData, this.GC_COUNT_COLORS, metaData?.dataTable);
    const chartOption = this.getGCCountChartOption(seriesData);
    this.gcCountChart = new Highcharts.Chart(chartId, chartOption);
  }

  renderMessagesInChart(responseData: any[], metaData: any) {
    const chartId = 'messages-in-chart';
    const seriesData = this.getUniSeriesData('areaspline', responseData, 'messages_per_second', 'messages_in_per_second');
    const chartOption = this.getMessagesInChartOption(seriesData);
    this.messagesInChart = new Highcharts.Chart(chartId, chartOption);
  }

  renderMaxLagChart(responseData: any[], metaData: any) {
    const chartId = 'max-lag-chart';
    const seriesData = this.getMaxLagSeriesData('column', responseData, 'max_lag', 'max_lag', metaData?.max_lag?.max);
    const chartOption = this.getMaxLagChartOption(seriesData);
    this.maxLagChart = new Highcharts.Chart(chartId, chartOption);
  }

  renderQueueTimeChart(responseData: any[], metaData: any) {
    const chartId = 'queue-time-chart';
    const seriesData = this.getUniSeriesData('areaspline', responseData, 'request_queue_time_ms', 'request_queue_time');
    const chartOption = this.getQueueTimeChartOption(seriesData);
    this.queueTimeChart = new Highcharts.Chart(chartId, chartOption);
  }


  // Chart Option
  getChartOption(chartType: string, seriesData: any[], chartColor: string, areasplineColor0: string = 'rgba(255, 255, 255, 0.35)', areasplineColor1: string = 'rgba(255, 255, 255, 0.09)'): Highcharts.Options {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();


    return {
      lang: {
        noData: 'No Data Available'
      },
      noData: {
        style: {
          fontSize: '14px',
          fontWeight: '500',
          color: '#9ca3af'
        }
      },
      chart: {
        showAxes: false,
        type: chartType,
      },
      title: { text: '' },
      credits: { enabled: false },
      exporting: { enabled: false },
      legend: { enabled: false },
      colors: [chartColor],
      xAxis: {
        type: 'datetime',
        title: { text: '' },
        lineWidth: 0,
        tickWidth: 0,
        labels: {
          enabled: true,
          style: {
            color: '#6B7280',
            fontSize: '11px'
          }
        },
        lineColor: gridColor,
        tickLength: 0
      },
      yAxis: {
        allowDecimals: false,
        title: { text: '' },
        labels: {
          style: {
            color: '#6B7280',
            fontSize: '11px'
          },
          enabled: true
        },
        lineColor: labelColor,
        gridLineWidth: 1
      },
      plotOptions: {
        areaspline: {
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, areasplineColor0],
              [1, areasplineColor1]
            ],

          },
          threshold: 0
        }
      },
      tooltip: {
        backgroundColor: tooltipBgColor,
        style: { color: tooltipTextColor, fontSize: '10px' }
      },
      series: seriesData,
    };
  }

  getChartOptionNoColor(chartType: string, seriesData: any[]): Highcharts.Options {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();


    return {
      lang: {
        noData: 'No Data Available'
      },
      noData: {
        style: {
          fontSize: '14px',
          fontWeight: '500',
          color: '#9ca3af'
        }
      },
      chart: {
        showAxes: false,
        type: chartType,
      },
      title: { text: '' },
      credits: { enabled: false },
      exporting: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        type: 'datetime',
        title: { text: '' },
        lineWidth: 0,
        tickWidth: 0,
        labels: {
          enabled: true,
          style: {
            color: '#6B7280',
            fontSize: '11px'
          }
        },
        lineColor: gridColor,
        tickLength: 0
      },
      yAxis: {
        title: { text: '' },
        allowDecimals: false,
        labels: {
          style: {
            color: '#6B7280',
            fontSize: '11px'
          },
          enabled: true
        },
        lineColor: labelColor,
        gridLineWidth: 1
      },
      plotOptions: {
        areaspline: {
          threshold: null
        }
      },
      tooltip: {
        backgroundColor: tooltipBgColor,
        style: { color: tooltipTextColor, fontSize: '10px' }
      },
      series: seriesData,
    };
  }

  getCPUusageChartOption(seriesData: Array<SeriesOptionsType>): Highcharts.Options {
    return {
      lang: {
        noData: 'No Data Available'
      },
      noData: {
        style: {
          fontSize: '14px',
          fontWeight: '500',
          color: '#9ca3af'
        }
      },
      chart: {
        type: 'column',
        backgroundColor: 'transparent'
      },
      legend: {
        enabled: false
      },

      title: { text: '' },

      xAxis: {
        type: 'datetime',
        lineWidth: 0,
        tickWidth: 0,
        tickLength: 0,
        labels: {
          enabled: true,
          style: {
            color: '#6B7280',
            fontSize: '11px'
          }
        }
      },
      yAxis: {
        allowDecimals: false,
        title: { text: '' },
        labels: {
          style: {
            color: '#6B7280',
            fontSize: '11px'
          },
          enabled: true
        }
      },

      plotOptions: {
        column: {
          borderRadius: 4,
          pointPadding: 0.1,
          groupPadding: 0.05
        }
      },

      colorAxis: {
        stops: [
          [0.0, '#CFE2FF'],
          [1.0, '#3B82FF']
        ]
      },
      series: seriesData,
      credits: { enabled: false }
    };

  }

  getMemoryUsageChartOption(seriesData: Array<SeriesOptionsType>): Highcharts.Options {
    return this.getChartOption('areaspline', seriesData, '#8B5CF6', 'rgb(139, 92, 246,0.35)', 'rgb(139, 92, 246,0.09)');
  }

  getGCCountChartOption(seriesData: Array<SeriesOptionsType>): Highcharts.Options {
    return this.getChartOptionNoColor('line', seriesData);
  }

  getMessagesInChartOption(seriesData: Array<SeriesOptionsType>): Highcharts.Options {
    return this.getChartOption('line', seriesData, '#2CB0EC', 'rgb(44, 176, 236,0.35)', 'rgb(44, 176, 236,0.09)');
  }

  getMaxLagChartOption(seriesData: Array<SeriesOptionsType>): Highcharts.Options {
    const chartOption = this.getChartOptionNoColor('column', seriesData);
    chartOption.plotOptions = {
      column: {
        borderRadius: 4,
        pointPadding: 0.1,
        groupPadding: 0.05
      }
    }
    return chartOption;
  }

  getQueueTimeChartOption(seriesData: Array<SeriesOptionsType>): Highcharts.Options {
    return this.getChartOption('line', seriesData, '#198754', 'rgb(25, 135, 84,0.35)', 'rgb(25, 135, 84,0.09)');
  }

  getUniSeriesData(chartType: string, responseData: any[], key?: string, name?: string) {
    if (!responseData?.length || !key) {
      return [];
    }
    const seriesMap = new Map<string, { x: number; y: number }[]>();

    responseData.forEach(point => {
      const timestamp = this.convertTimebucketForCharts(point['time_bucket']);
      const series =
        seriesMap.get(key) ??
        (() => {
          const arr: { x: number; y: number }[] = [];
          seriesMap.set(key, arr);
          return arr;
        })();

      series.push({
        x: timestamp,
        y: Number(point[key] ?? undefined)
      });
    });

    const seriesData: any[] = Array.from(
      seriesMap.entries(),
      ([k, data], index) => {
        return {
          type: chartType,
          name,
          data,
          colorKey: 'y',
          marker: {
            radius: 3
          }
        }
      }
    );
    return seriesData;
  }

  getSeriesData(chartType: string, responseData: any[], colorCodes: any[], metaData: any) {
    if (!responseData?.length || !metaData) {
      return [];
    }
    const seriesMap = new Map<string, { x: number; y: number }[]>();

    responseData.forEach(point => {
      const timestamp = this.convertTimebucketForCharts(point['time_bucket']);
      Object.keys(metaData).forEach(key => {
        const series =
          seriesMap.get(key) ??
          (() => {
            const arr: { x: number; y: number }[] = [];
            seriesMap.set(key, arr);
            return arr;
          })();

        series.push({
          x: timestamp,
          y: Number(point[key] ?? undefined)
        });
      });
    });

    const seriesData: any[] = Array.from(
      seriesMap.entries(),
      ([name, data], index) => {
        const color = colorCodes[index % colorCodes.length];
        return {
          type: chartType,
          name,
          data,
          color: color.line,
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: color.stops
          },
          marker: {
            radius: 3
          }
        }
      }
    );
    return seriesData;
  }

  getMaxLagSeriesData(chartType: string, responseData: any[], key?: string, name?: string, max?: number) {
    if (!responseData?.length || !key) {
      return [];
    }
    const seriesMap = new Map<string, { x: number; y: number, color: any }[]>();

    responseData.forEach(point => {
      const timestamp = this.convertTimebucketForCharts(point['time_bucket']);
      const series =
        seriesMap.get(key) ??
        (() => {
          const arr: { x: number; y: number, color: any }[] = [];
          seriesMap.set(key, arr);
          return arr;
        })();

      series.push({
        x: timestamp,
        y: Number(point[key] ?? undefined),
        color: Number(point[key] ?? undefined) === max ? '#FB7185' : '#CBD5E1'
      });
    });

    const seriesData: any[] = Array.from(
      seriesMap.entries(),
      ([k, data], index) => {
        return {
          type: chartType,
          name,
          data,
          colorKey: 'y',
          marker: {
            radius: 3
          }
        }
      }
    );
    return seriesData;
  }


  // Date Utils
  formatDate(date: string) {
    date = date.replace(/-/g, '');
    date = date.replace(/:/g, '');
    date = date.replace(' ', '');
    return parseInt(date);
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

  convertTimebucketForCharts(timebucket: string) {
    const year = parseInt(timebucket.slice(0, 4), 10);
    const month = parseInt(timebucket.slice(4, 6), 10) - 1;
    const day = parseInt(timebucket.slice(6, 8), 10);
    const hour = parseInt(timebucket.slice(8, 10), 10);
    const minute = parseInt(timebucket.slice(10, 12), 10);
    return new Date(year, month, day, hour, minute).getTime();
;
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
  formatActiveTime(seconds: number | null | undefined): string {
    if (seconds == null || seconds <= 0 || !Number.isFinite(seconds)) {
      return 'No Data';
    }
    let x = this.convertTimebucket(String(this.endTime));
    let i = Date.now();
    const endMs = Math.min(
      this.convertTimebucket(String(this.endTime)),
      Date.now()
    );
    const valueMs = seconds * 1000;

    const diffSeconds = Math.floor((endMs - valueMs) / 1000);
    return this.formatActiveDurationLong(diffSeconds);
  }

  formatActiveDurationLong(totalSeconds: number | null | undefined): string {
    if (totalSeconds == null || totalSeconds <= 0 || !Number.isFinite(totalSeconds)) {
      return 'No Data';
    }

    const MIN = 60;
    const HOUR = 3600;
    const DAY = 86400;
    const MONTH = 30 * DAY;
    const YEAR = 365 * DAY;

    let s = Math.floor(totalSeconds);

    const y = Math.floor(s / YEAR); s %= YEAR;
    const mo = Math.floor(s / MONTH); s %= MONTH;
    const d = Math.floor(s / DAY); s %= DAY;
    const h = Math.floor(s / HOUR); s %= HOUR;
    const m = Math.floor(s / MIN);
    const sec = s % MIN;

    if (y > 0) return `${y}y${mo ? ` ${mo}mo` : ''}`;
    if (mo > 0) return `${mo}mo${d ? ` ${d}d` : ''}`;
    if (d > 0) return `${d}d${h ? ` ${h}h` : ''}`;
    if (h > 0) return `${h}h${m ? ` ${m}m` : ''}`;
    if (m > 0) return `${m}m`;

    return `${sec}s`;
  }





  // Common Utils
  getClusterRouterLink(clusterId: string) {
    return [
      '/message-queue',
      'kafka-service',
      'cluster',
      `${clusterId}.1`
    ];
  }

  calculateKPI(metaData: { [metric: string]: MetricStats }, statsType: 'min' | 'max' | 'avg' | 'sum' | 'count'): number | undefined {
    if (metaData == null || Object.keys(metaData).length === 0) {
      return undefined;
    }
    let finalValue: number = 0;
    Object.values(metaData).forEach(value => {
      finalValue = finalValue + value[statsType];
    })
    return finalValue;
  }

  calculatePercent(current: number | undefined | null, max: number | undefined | null): number | undefined {
    if (current == null || max == null) {
      return undefined;
    }
    if (max <= 0) return 0;
    return Math.round((current / max) * 100);
  }


  // Toast Util
  showToast(message: string, type: "success" | "error") {
    if (type === 'error') {
      this.toast.error(message, {
        dismissible: true,
        duration: 2500
      });
    } else if (type === 'success') {
      this.toast.success(message, {
        dismissible: true,
        duration: 2500,
        iconTheme: {
          primary: 'var(--sideBar-bg-color1)',
          secondary: '#FFFAEE',
        }
      });
    }
  }

}
