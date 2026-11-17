import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, filter, switchMap, takeUntil } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import * as Highcharts from 'highcharts';
import { RabbitmqService } from '../../../../services/rabbitmq.service';
import { ServiceResponse } from '../../../../models/common/ServiceResponse';
import { ServiceStatus } from '../../../../models/enums/ServiceStatus';
import { ShortNumberPipe } from '../../../../pipes/short-number.pipe';
import { MatIcon } from "@angular/material/icon";
import { NumericDataPipe } from '../../../../pipes/numeric-data.pipe';
import { StringDataPipe } from '../../../../pipes/string-data.pipe';
import { BytesPipe } from '../../../../pipes/bytes.pipe';
import * as bootstrap from 'bootstrap';
import { AfterViewInit } from '@angular/core';
import { NavigationStart } from '@angular/router';
import 'highcharts/modules/no-data-to-display';

@Component({
  selector: 'app-rabbitmq-node',
  standalone: true,
  imports: [CommonModule, RouterModule, ShortNumberPipe, MatIcon, NumericDataPipe, StringDataPipe, BytesPipe],
  templateUrl: './rabbitmq-node.component.html',
  styleUrl: './rabbitmq-node.component.css'
})
export class RabbitmqNodeComponent implements OnInit, OnDestroy, AfterViewInit {
  clusterId: string | null = null;
  clusterName: string = '';
  nodeName: string = '';
  entityId: string = '';

  startTime!: number;
  endTime!: number;

  nodeKPI: any = {
    connections_total: null,
    channel_total: null,
    queue_total: null,
    consumer_total: null,
    publisher_total: null,
    incoming_messages_total: null,
    outgoing_messages_total: null,
    unacknowledged_messages: null,
    messages_ready: null,
    allocated_total_bytes: null
  };

  memoryUsageData: any[] = [];
  memoryUsageMetaData: any;
  memoryUtilizationMetaData: any;
  memoryToggle: boolean = false;

  private subscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();
  isLoadingKPI = false;
  skeletonRows = Array(8).fill(0);

  // Charts
  memoryUtilizationChart!: Highcharts.Chart;
  memoryUsageChart!: Highcharts.Chart;
  connectionsChart!: Highcharts.Chart;
  channelsChart!: Highcharts.Chart;
  consumersChart!: Highcharts.Chart;
  publishersChart!: Highcharts.Chart;
  messageRatesChart!: Highcharts.Chart;
  queueStatsChart!: Highcharts.Chart;

  AREA_COLORS = [
    { line: '#6366F1', stops: [[0, 'rgba(99,102,241,0.35)'], [1, 'rgba(99,102,241,0.08)']] },
    { line: '#10B981', stops: [[0, 'rgba(16,185,129,0.35)'], [1, 'rgba(16,185,129,0.08)']] },
    { line: '#F97316', stops: [[0, 'rgba(249,115,22,0.35)'], [1, 'rgba(249,115,22,0.08)']] },
    { line: '#14B8A6', stops: [[0, 'rgba(20,184,166,0.35)'], [1, 'rgba(20,184,166,0.08)']] },
    { line: '#f4d35e', stops: [[0, 'rgba(244, 211, 94, 0.35)'], [1, 'rgba(244, 211, 94, 0.08)']] },
    { line: '#ee964b', stops: [[0, 'rgba(238, 150, 75, 0.35)'], [1, 'rgba(238, 150, 75, 0.08)']] },
  ];

  constructor(
    private route: ActivatedRoute,
    private rabbitmqService: RabbitmqService,
    private dateService: DateService,
    private router: Router
  ) {
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

  ngAfterViewInit(): void {
    this.initializeTooltips();
  }

  private initializeTooltips(): void {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
  }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.entityId = params.get('nodeId') || '';
      if (this.entityId) {
        const parts = this.entityId.split('_');
        if (parts.length >= 2) {
          this.clusterId = parts[0];
          const encodedNodeName = parts[1];
          try {
            this.nodeName = atob(encodedNodeName);
          } catch {
            this.nodeName = encodedNodeName;
          }

          if (this.clusterId) {
            let baseId = this.clusterId;
            if (this.clusterId.endsWith('.1')) {
              baseId = this.clusterId.substring(0, this.clusterId.length - 2);
            }
            try {
              this.clusterName = atob(baseId);
            } catch {
              this.clusterName = baseId;
            }
          }
        }
      }
    });

    this.dateService.setActiveComponent('RabbitmqNodeComponent');
    this.subscription.add(
      this.dateService.activeComponent$.pipe(
        filter(activeComponent => activeComponent === 'RabbitmqNodeComponent'),
        switchMap(() => this.dateService.date$)
      ).subscribe((datemodel: any) => {
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
    this.isLoadingKPI = true;
    this.loadNodeKPIs();
    this.loadMemoryUtilization();
    this.loadMemoryUsage();
    this.loadConnectionsAndChannels();
    this.loadConsumersAndPublishers();
    this.loadMessageRates();
    this.loadQueueStats();
  }

  loadNodeKPIs() {
    this.rabbitmqService.getNodeKPIs(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceResponse<any>) => {
          this.isLoadingKPI = false;
          if (response.serviceStatus === ServiceStatus.SUCCESS) {
            this.nodeKPI = response.serviceResponse;
            setTimeout(() => this.initializeTooltips(), 500);
          }
        },
        error: () => this.isLoadingKPI = false
      });
  }

  loadMemoryUtilization() {
    this.rabbitmqService.getNodeMemoryUtilization(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceResponse<any>) => {
          if (response.serviceStatus === ServiceStatus.SUCCESS) {
            this.memoryUtilizationMetaData = response.metaData;
            this.renderChart('memory-utilization-chart', response.serviceResponse, response.metaData, 'memoryUtilizationChart', 'column', '%', false, 0, true);
          }
        }
      });
  }

  loadMemoryUsage() {
    this.rabbitmqService.getNodeMemoryUsage(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceResponse<any>) => {
          if (response.serviceStatus === ServiceStatus.SUCCESS) {
            this.memoryUsageData = response.serviceResponse;
            this.memoryUsageMetaData = response.metaData;
            this.renderChart('memory-usage-chart', response.serviceResponse, response.metaData, 'memoryUsageChart', 'column', 'Bytes', false, 1, false, [], true);
          }
        }
      });
  }

  loadConnectionsAndChannels() {
    this.rabbitmqService.getNodeConnectionsAndChannels(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceResponse<any>) => {
          if (response.serviceStatus === ServiceStatus.SUCCESS) {
            this.renderChart('connections-channels-chart', response.serviceResponse, response.metaData, 'connectionsChart', 'spline', 'Count', false, 0, false, [
              { line: '#ee6c4d', stops: [[0, 'rgba(238, 108, 77, 0.35)'], [1, 'rgba(238, 108, 77, 0.08)']] },
              { line: '#588157', stops: [[0, 'rgba(88, 129, 87, 0.35)'], [1, 'rgba(88, 129, 87, 0.08)']] }
            ]);
          }
        }
      });
  }

  loadConsumersAndPublishers() {
    this.rabbitmqService.getNodeConsumersAndPublishers(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceResponse<any>) => {
          if (response.serviceStatus === ServiceStatus.SUCCESS) {
            this.renderChart('consumers-publishers-chart', response.serviceResponse, response.metaData, 'consumersChart', 'column', 'Count', false, 4);
          }
        }
      });
  }

  loadMessageRates() {
    this.rabbitmqService.getNodeMessageStats(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceResponse<any>) => {
          if (response.serviceStatus === ServiceStatus.SUCCESS) {
            this.renderChart('message-rates-chart', response.serviceResponse, response.metaData, 'messageRatesChart', 'areaspline', 'Messages / s', false, 2);
          }
        }
      });
  }

  loadQueueStats() {
    this.rabbitmqService.getNodeQueueStats(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceResponse<any>) => {
          if (response.serviceStatus === ServiceStatus.SUCCESS) {
            this.renderChart('queue-stats-chart', response.serviceResponse, response.metaData, 'queueStatsChart', 'areaspline', 'Messages', true, 0);
          }
        }
      });
  }


  toggleMemoryChart() {
    this.memoryToggle = !this.memoryToggle;
    if (this.memoryToggle) {
      setTimeout(() => {
        this.renderChart('memory-usage-chart', this.memoryUsageData, this.memoryUsageMetaData, 'memoryUsageChart', 'area', 'Bytes', false, 0, false, [], true);
      }, 0);
    }
  }

  renderChart(chartId: string, responseData: any[], metaData: any, chartVar: string, chartType: string = 'areaspline', yAxisTitle: string = '', isStacked: boolean = false, colorOffset: number = 0, useColorAxis: boolean = false, customColors: any[] = [], isBytes: boolean = false) {
    const element = document.getElementById(chartId);
    if (!element) {
      setTimeout(() => this.renderChart(chartId, responseData, metaData, chartVar, chartType, yAxisTitle, isStacked, colorOffset, useColorAxis, customColors, isBytes), 100);
      return;
    }
    const seriesData = this.getSeriesData(chartType, responseData, metaData, colorOffset, useColorAxis, customColors);
    (this as any)[chartVar] = new Highcharts.Chart(chartId, this.getChartOption(seriesData, yAxisTitle, chartType, isStacked, useColorAxis, isBytes));
  }

  getSeriesData(chartType: string, responseData: any[], metaData: any, colorOffset: number = 0, useColorAxis: boolean = false, customColors: any[] = []) {
    if (!responseData?.length) return [];
    const metrics = Object.keys(responseData[0]).filter(k => k !== 'time_bucket');
    const seriesMap = new Map<string, { x: number, y: number }[]>();

    responseData.forEach(point => {
      const timestamp = this.convertTimebucket(String(point['time_bucket']));
      metrics.forEach(key => {
        if (!seriesMap.has(key)) seriesMap.set(key, []);
        seriesMap.get(key)?.push({ x: timestamp, y: point[key] });
      });
    });

    const palette = customColors.length > 0 ? customColors : this.AREA_COLORS;

    return Array.from(seriesMap.entries()).map(([name, data], index) => {
      const color = palette[(index + colorOffset) % palette.length];
      return {
        type: chartType,
        name: name
          .replace('meter_rabbitmq_node_', '')
          .replace('meter_rabbitmq_', '')
          .replace(/_total/g, '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .replace('Incoming Messages', 'Published')
          .replace('Outgoing Messages', 'Delivered'),
        data: data,
        colorKey: useColorAxis ? 'y' : undefined,
        color: color.line,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: color.stops
        }
      };
    });
  }

  getChartOption(seriesData: any[], yAxisTitle: string = '', chartType: string = 'line', isStacked: boolean = false, useColorAxis: boolean = false, isBytes: boolean = false): Highcharts.Options {
    const isRate = yAxisTitle.toLowerCase().includes('/ s') || yAxisTitle.toLowerCase().includes('rate');
    const byteFormatter = function(value: any, decimals: number = 0) {
      if (value === 0) return '0 B';
      if (value == null) return 'No Data';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
      const i = Math.floor(Math.log(value) / Math.log(k));
      return parseFloat((value / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    };

    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim() || '#6B7280';
    const gridColor = styles.getPropertyValue('--border-color').trim() || '#e5e7eb';
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim() || '#ffffff';
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim() || '#000000';

    return {
      lang: { noData: 'No Data Available' },
      noData: { style: { fontSize: '14px', fontWeight: '500', color: '#9ca3af' } },
      chart: { 
        backgroundColor: 'transparent', 
        type: chartType,
        showAxes: true,
        spacing: [10, 10, 10, 10]
      },
      title: { text: '' },
      xAxis: {
        type: 'datetime',
        title: { text: '' },
        lineWidth: 1,
        tickWidth: 1,
        tickLength: 5,
        labels: { 
          enabled: true,
          style: { color: '#6B7280', fontSize: '11px' }
        },
        lineColor: gridColor
      },
      yAxis: {
        title: { text: '' },
        allowDecimals: false,
        min: 0,
        labels: { 
          style: { color: '#6B7280', fontSize: '11px' },
          enabled: true,
          formatter: function(this: any) {
            return isBytes ? byteFormatter(this.value, 0) : this.value;
          }
        },
        lineColor: labelColor,
        gridLineWidth: 1
      },
      credits: { enabled: false },
      exporting: { enabled: false },
      legend: { enabled: false },
      tooltip: { 
        shared: true, 
        backgroundColor: tooltipBgColor,
        formatter: isBytes ? function(this: any) {
          let s = `<span style="font-size: 10px">${Highcharts.dateFormat('%A, %b %e, %H:%M', this.x)}</span><br/>`;
          this.points.forEach((point: any) => {
            const val = byteFormatter(point.y, 2);
            s += `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${val}</b><br/>`;
          });
          return s;
        } : undefined,
        valueDecimals: (isBytes || isRate || yAxisTitle.includes('%')) ? 2 : 0,
        style: { color: tooltipTextColor, fontSize: '10px' }
      },
      plotOptions: {
        series: {
          stacking: isStacked ? 'normal' : undefined,
          marker: {
            enabled: chartType === 'spline' || chartType === 'line' || chartType === 'areaspline' || chartType === 'area',
            radius: 3
          },
          lineWidth: 2
        },
        areaspline: {
          threshold: null,
          fillOpacity: 0.1
        },
        column: {
          borderRadius: 2,
          pointPadding: 0,
          groupPadding: 0
        }
      },
      colorAxis: useColorAxis ? {
        stops: [
          [0.0, '#CFE2FF'],
          [1.0, '#3B82FF']
        ]
      } : undefined,
      series: seriesData as any
    };
  }

  convertTimebucket(tb: string): number {
    if (!tb || tb.length < 12) return Date.now();
    const year = parseInt(tb.substring(0, 4));
    const month = parseInt(tb.substring(4, 6)) - 1;
    const day = parseInt(tb.substring(6, 8));
    const hour = parseInt(tb.substring(8, 10));
    const minute = parseInt(tb.substring(10, 12));
    return new Date(year, month, day, hour, minute).getTime();
  }

  formatDate(date: any): number {
    if (!date) return 0;
    const dateStr = date.toString().replace(/-/g, '').replace(/:/g, '').replace(' ', '');
    return Number(dateStr.substring(0, 12));
  }
}

