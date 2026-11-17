import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ServiceIdService } from '../../../../services/service-id.service';
import { CommonModule } from '@angular/common';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import * as Highcharts from 'highcharts';
import { FormsModule } from '@angular/forms';
import { SortPipe } from '../../../../pipes/sort.pipe';
import { ObjectFilterPipe } from '../../../../pipes/object-filter.pipe';
import { PaginatePipe } from '../../../../pipes/paginate.pipe';
import { RabbitmqService } from '../../../../services/rabbitmq.service';
import { ServiceResponse } from '../../../../models/common/ServiceResponse';
import { ServiceStatus } from '../../../../models/enums/ServiceStatus';
import { HotToastService } from '@ngxpert/hot-toast';
import { NumericDataPipe } from '../../../../pipes/numeric-data.pipe';
import { StringDataPipe } from '../../../../pipes/string-data.pipe';
import { MatIcon } from "@angular/material/icon";
import { MatMenu, MatMenuTrigger } from "@angular/material/menu";
import { ShortNumberPipe } from '../../../../pipes/short-number.pipe';
import * as bootstrap from 'bootstrap';
import { AfterViewInit } from '@angular/core';
import { NavigationStart } from '@angular/router';
import 'highcharts/highcharts-3d';
import 'highcharts/modules/cylinder';
import 'highcharts/modules/funnel3d';
import 'highcharts/modules/pyramid3d';
import 'highcharts/modules/no-data-to-display';
import D3Funnel from 'd3-funnel';
import { ApplicationService } from '../../../../services/application.service';
import { AuthenticationService } from '../../../../services/authentication.service';

type NodeHealth = 'HEALTHY' | 'HIGH LOAD' | 'CRITICAL';

interface RabbitmqNode {
  host: string | undefined;
  status: number;
  connections: number;
  channels: number;
  queues: number;
  memory: number;
  messages: number;
  health?: NodeHealth;
}

interface ClusterOverview {
  total_nodes: number | null;
  queue_total: number | null;
  channel_total: number | null;
  connections_total: number | null;
  messages_published: number | null;
  consumer_total: number | null;
  publisher_total: number | null;
  messages_ready: number | null;
  unacknowledged_messages: number | null;
  incoming_messages_total: number | null;
  outgoing_messages_total: number | null;
  returned_messages: number | null;
  dropped_messages: number | null;
}

@Component({
    selector: 'app-rabbitmq-overview',
    standalone: true,
    imports: [RouterModule, CommonModule, FormsModule, SortPipe, ObjectFilterPipe, PaginatePipe, NumericDataPipe, StringDataPipe, ShortNumberPipe, MatIcon, MatMenu, MatMenuTrigger],
    templateUrl: './rabbitmq-overview.component.html',
    styleUrl: './rabbitmq-overview.component.css'
})
export class RabbitmqOverviewComponent implements OnInit, OnDestroy, AfterViewInit {

  clusterId: string | null;
  clusterName!: string;
  selectedTab: string | null = 'overview';
  
  AREA_COLORS = [
    { line: '#fdca40', stops: [[0, 'rgba(253, 202, 64, 0.35)'], [1, 'rgba(253, 202, 64, 0.08)']] }, 
    { line: '#059669', stops: [[0, 'rgba(5, 150, 105, 0.35)'], [1, 'rgba(5, 150, 105, 0.08)']] }, 
    { line: '#8a4fff', stops: [[0, 'rgba(138, 79, 255, 0.35)'], [1, 'rgba(138, 79, 255, 0.08)']] }, 
    { line: '#7189ff', stops: [[0, 'rgba(113, 137, 255, 0.35)'], [1, 'rgba(113, 137, 255, 0.08)']] }, 
    { line: '#f4d35e', stops: [[0, 'rgba(244, 211, 94, 0.35)'], [1, 'rgba(244, 211, 94, 0.08)']] }, 
    { line: '#ee964b', stops: [[0, 'rgba(238, 150, 75, 0.35)'], [1, 'rgba(238, 150, 75, 0.08)']] } 
  ];

  clusterKPI: ClusterOverview = {
    total_nodes: null,
    queue_total: null,
    channel_total: null,
    connections_total: null,
    messages_published: null,
    consumer_total: null,
    publisher_total: null,
    messages_ready: null,
    unacknowledged_messages: null,
    incoming_messages_total: null,
    outgoing_messages_total: null,
    returned_messages: null,
    dropped_messages: null
  };

  messageRatesIndicator: string[] = [];
  queuedMessagesIndicator: string[] = [];
  churnRatesIndicator: string[] = [];
  erlangMemoryIndicator: string[] = [];
  lastUpdated: string = '';
  funnelIndicator: any[] = [];
  applicationTechnology?: string;
  applicationType?: string;

  messageRatesChart!: Highcharts.Chart;
  queuedMessagesChart!: Highcharts.Chart;
  memoryUsageChart!: Highcharts.Chart;
  resourceUsageChart!: Highcharts.Chart;
  churnRatesChart!: Highcharts.Chart;
  erlangMemoryChart!: Highcharts.Chart;
  funnelChart!: Highcharts.Chart;

  nodes: RabbitmqNode[] = [];

  startTime!: number;
  endTime!: number;
  subscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();
  searchText = '';
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' | 'none' = 'none';
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;
  inputPage: number = 1;
  totalItems: number = 0;

  isLoading = false;
  isLoadingOverview = false;
  isLoadingFunnel = false;
  skeletonRows = Array(10).fill(0);
  funnelSkeletonRows = Array(7).fill(0);

  healthClassMap: any = {
    'HEALTHY': 'health-healthy',
    'HIGH LOAD': 'health-high-load',
    'CRITICAL': 'health-critical'
  };

  dotClassMap: any = {
    'HEALTHY': 'dot-healthy',
    'HIGH LOAD': 'dot-high-load',
    'CRITICAL': 'dot-critical'
  };

  constructor(
    private rabbitmqService: RabbitmqService,
    private dateService: DateService,
    private route: ActivatedRoute,
    private router: Router,
    private serviceIdService: ServiceIdService,
    private toast: HotToastService,
    private applicationService: ApplicationService,
    private authService: AuthenticationService
  ) {
    this.clusterId = this.route.snapshot.paramMap.get('clusterId');
    this.selectedTab = this.route.snapshot.queryParamMap.get('tab') || 'overview';

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
      this.getAppMetadata();
    }
    
    this.dateService.setActiveComponent('RabbitmqOverviewComponent');
    this.subscription.add(
      this.dateService.activeComponent$.pipe(
        filter(activeComponent => activeComponent === 'RabbitmqOverviewComponent'),
        switchMap(() => this.dateService.date$)
      ).subscribe((datemodel: any) => {
        this.startTime = this.formatDate(datemodel.startdateTime);
        this.endTime = this.formatDate(datemodel.enddateTime);
        this.loadData(this.selectedTab);
      })
    );

    this.subscription.add(
      this.route.queryParamMap
        .pipe(takeUntil(this.destroy$))
        .subscribe(params => {
          const tab = params.get('tab');
          if (tab && tab !== this.selectedTab) {
            this.selectedTab = tab;
            this.loadData(this.selectedTab);
          }
        })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  navigateToNode(nodeHost: string | undefined) {
    if (!nodeHost) return;
    const nodeEntityId = this.clusterId + '_' + btoa(nodeHost);
    this.router.navigate(['/message-queue', 'rabbitmq-service', 'cluster', 'node', nodeEntityId]);
  }

  loadData(tab: string | null) {
    switch (tab) {
      case 'overview':
        this.navigatePage(tab);
        this.isLoadingOverview = true;
        this.isLoadingFunnel = true;
        this.loadClusterKPIs();
        this.getMessageRatesData();
        this.getQueuedMessagesData();
        this.getMemoryUsageData();
        this.getResourceUsageData();
        this.getChurnRatesData();
        this.getErlangMemoryData();
        this.getMessageFunnelData();
        break;
      case 'node':
        this.navigatePage(tab);
        this.getNodesData();
        break;
    }
  }

  getChurnRatesData() {
    this.churnRatesIndicator = [];
    this.rabbitmqService.getChurnRates(this.clusterId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceResponse<any>) => {
          if (response.serviceStatus === ServiceStatus.SUCCESS) {
            this.renderChurnRatesChart(response.serviceResponse, response.metaData);
            if (response.metaData?.kpi) {
                Object.entries(response.metaData.kpi).forEach(([key, value]) => {
                  const v = value as { max: number };
                  this.churnRatesIndicator.push(`${key} - ${Math.round(v.max || 0)}/s`);
                });
            }
          }
        }
      });
  }

  getErlangMemoryData() {
    this.erlangMemoryIndicator = [];
    this.rabbitmqService.getErlangMemoryData(this.clusterId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceResponse<any>) => {
          if (response.serviceStatus === ServiceStatus.SUCCESS) {
            this.renderErlangMemoryChart(response.serviceResponse, response.metaData);
          }
        }
      });
  }

  getMessageFunnelData() {
    this.isLoadingFunnel = true;
    this.rabbitmqService.getMessageFunnel(this.clusterId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceResponse<any>) => {
          this.isLoadingFunnel = false;
          if (response.serviceStatus === ServiceStatus.SUCCESS) {
            this.renderFunnelChart(response.serviceResponse);
          }
        },
        error: () => this.isLoadingFunnel = false
      });
  }

  renderChurnRatesChart(responseData: any[], metaData: any) {
    const seriesData = this.getSeriesData('column', responseData, metaData, 3);
    this.churnRatesChart = new Highcharts.Chart('churn-rates-chart', this.getChartOption(seriesData, 'Events / s', 'column'));
  }

  renderErlangMemoryChart(responseData: any[], metaData: any) {
    const seriesData = this.getSeriesData('column', responseData, metaData, 1, [
      { line: '#468faf', stops: [[0, 'rgba(70, 143, 175, 0.35)'], [1, 'rgba(70, 143, 175, 0.08)']] }
    ]);
    this.erlangMemoryChart = new Highcharts.Chart('erlang-memory-chart', this.getChartOption(seriesData, 'Bytes', 'column', false, true, true));
  }

  navigatePage(tab: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab },
      queryParamsHandling: 'merge'
    });
  }

  formatDate(date: any): number {
    if (!date) return 0;
    return Number(date.toString().replace(/-/g, '').replace(/:/g, '').replace(' ', '').substring(0, 12));
  }

  loadClusterKPIs() {
    this.rabbitmqService.getClusterKPIs(this.clusterId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceResponse<any>) => {
          this.isLoadingOverview = false;
          if (response.serviceStatus === ServiceStatus.SUCCESS && response.serviceResponse) {
            // Mapping nested or old names to normalized names if necessary
            const data = response.serviceResponse;
            this.clusterKPI = {
              total_nodes: data.totalNodes || data.total_nodes,
              queue_total: data.queues?.total ?? data.queue_total,
              channel_total: data.channels?.total ?? data.channel_total,
              connections_total: data.connections?.total ?? data.connections_total,
              messages_published: data.messagesPublished?.total ?? data.messages_published,
              consumer_total: data.consumers?.total ?? data.consumer_total,
              publisher_total: data.publishers?.total ?? data.publisher_total,
              messages_ready: data.readyMessages?.total ?? data.messages_ready,
              unacknowledged_messages: data.unacknowledgedMessages?.total ?? data.unacknowledged_messages,
              incoming_messages_total: data.incomingMessages?.total ?? data.incoming_messages_total,
              outgoing_messages_total: data.outgoingMessages?.total ?? data.outgoing_messages_total,
              returned_messages: data.returnedMessages?.total ?? data.returned_messages,
              dropped_messages: data.droppedMessages?.total ?? data.dropped_messages
            };
            setTimeout(() => this.initializeTooltips(), 500);
          }
        },
        error: () => this.isLoadingOverview = false
      });
  }

  getMessageRatesData() {
    this.messageRatesIndicator = [];
    this.rabbitmqService.getMessageRates(this.clusterId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceResponse<any>) => {
          if (response.serviceStatus === ServiceStatus.SUCCESS) {
            this.renderMessageRatesChart(response.serviceResponse, response.metaData);
            if (response.metaData?.kpi) {
                Object.entries(response.metaData.kpi).forEach(([key, value]) => {
                  const v = value as { max: number };
                  this.messageRatesIndicator.push(`${key} - ${Math.round(v.max || 0)}/s`);
                });
            }
          }
        }
      });
  }

  getQueuedMessagesData() {
    this.queuedMessagesIndicator = [];
    this.rabbitmqService.getQueuedMessages(this.clusterId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceResponse<any>) => {
          if (response.serviceStatus === ServiceStatus.SUCCESS) {
            this.renderQueuedMessagesChart(response.serviceResponse, response.metaData);
            if (response.metaData?.kpi) {
                Object.entries(response.metaData.kpi).forEach(([key, value]) => {
                  const v = value as { max: number };
                  this.queuedMessagesIndicator.push(`${key} - ${Math.round(v.max || 0)}`);
                });
            }
          }
        }
      });
  }

  getMemoryUsageData() {
    this.rabbitmqService.getClusterMemoryUsage(this.clusterId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceResponse<any>) => {
          if (response.serviceStatus === ServiceStatus.SUCCESS) {
            this.renderMemoryUsageChart(response.serviceResponse, response.metaData);
          }
        }
      });
  }

  getResourceUsageData() {
    this.rabbitmqService.getResourceUsage(this.clusterId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceResponse<any>) => {
          if (response.serviceStatus === ServiceStatus.SUCCESS) {
            this.renderResourceUsageChart(response.serviceResponse, response.metaData);
          }
        }
      });
  }

  getNodesData() {
    this.isLoading = true;
    this.rabbitmqService.getInstancesData(this.clusterId!, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceResponse<any>) => {
          this.isLoading = false;
          if (response.serviceStatus === ServiceStatus.SUCCESS) {
            this.nodes = response.serviceResponse || [];
            this.calculatePagination(this.nodes, this.searchText, ['host', 'health']);
            this.inputPage = this.currentPage;
            this.nodes.forEach(node => {
               node.health = 'HEALTHY'; // CPU metric no longer available in nodes
            });
            setTimeout(() => this.initializeTooltips(), 500);
          }
        },
        error: () => this.isLoading = false
      });
  }

  renderMessageRatesChart(responseData: any[], metaData: any) {
    const seriesData = this.getSeriesData('areaspline', responseData, metaData, 0);
    this.messageRatesChart = new Highcharts.Chart('message-rates-chart', this.getChartOption(seriesData, 'Messages / s', 'areaspline'));
  }

  renderQueuedMessagesChart(responseData: any[], metaData: any) {
    const seriesData = this.getSeriesData('areaspline', responseData, metaData, 2);
    this.queuedMessagesChart = new Highcharts.Chart('queued-messages-chart', this.getChartOption(seriesData, 'Message Count', 'areaspline', true));
  }

  renderMemoryUsageChart(responseData: any[], metaData: any) {
    const seriesData = this.getSeriesData('column', responseData, metaData, 4);
    this.memoryUsageChart = new Highcharts.Chart('memory-usage-chart', this.getChartOption(seriesData, 'Disk Space', 'column', false, true));
  }

  renderResourceUsageChart(responseData: any[], metaData: any) {
    const seriesData = this.getSeriesData('spline', responseData, metaData, 0);
    this.resourceUsageChart = new Highcharts.Chart('resource-usage-chart', this.getChartOption(seriesData, 'Count', 'spline', false, false));
  }

  renderFunnelChart(data: any) {
    if (!data) return;

    const published = Math.round(data.published || 0);
    const confirmed = Math.round(data.confirmed || 0);
    const routed = Math.round(data.routed || 0);
    const ready = Math.round(data.ready || 0);
    const delivered = Math.round(data.delivered || 0);
    const unacked = Math.round(data.unacknowledged || 0);
    const acked = Math.round(data.acknowledged || 0);

    const funnelData = [
      ['Published', published],
      ['Confirmed', confirmed],
      ['Routed', routed],
      ['Ready in Queue', ready],
      ['Delivered', delivered],
      ['Unacknowledged', unacked],
      ['Acknowledged', acked]
    ];

    this.lastUpdated = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    let stages = [
      { label: 'Published', value: published, color: '#3f37c9', desc: 'Total messages sent to RabbitMQ' },
      { label: 'Confirmed', value: confirmed, color: '#4895ef', desc: 'Successfully received by broker' },
      { label: 'Routed', value: routed, color: '#2a9134', desc: 'Correctly mapped to queues' },
      { label: 'Ready in Queue', value: ready, color: '#edc531', desc: 'Waiting to be delivered' },
      { label: 'Delivered to Consumer', value: delivered, color: '#ff9e00', desc: 'Sent to client applications' },
      { label: 'Unacknowledged', value: unacked, color: '#d62828', desc: 'Delivered but not yet processed' },
      { label: 'Acknowledged', value: acked, color: '#6a994e', desc: 'Successfully processed by client' }
    ];

    // Hide Confirmed if it is 0
    if (confirmed === 0) {
      stages = stages.filter(s => s.label !== 'Confirmed');
    }

    this.funnelIndicator = stages.map((s, i) => {
      let pct = '100.00';
      if (i > 0) {
        const prevValue = stages[i-1].value;
        pct = prevValue > 0 ? (s.value / prevValue * 100).toFixed(2) : '0.00';
      }
      return {
        name: s.label,
        count: s.value,
        pct: pct,
        color: s.color,
        desc: s.desc
      };
    });


    const funnelChartData = this.funnelIndicator.filter(item => !item.isLoss).map(item => ({
      label: item.name,
      value: item.count,
      backgroundColor: item.color,
      color: item.color,
      formattedValue: `${Math.round(item.count)} (${item.pct}%)`
    }));

    const options = {
      chart: {
        width: 400,
        height: 400,
        bottomWidth: 1/2,
        bottomPinch: 0,
        curve: {
          enabled: true,
          height: 20
        }
      },
      block: {
        dynamicHeight: false,
        fill: {
          type: 'gradient'
        },
        highlight: true
      },
      label: {
        enabled: true,
        fontFamily: 'Inter, sans-serif',
        fontSize: '11px',
        fill: '#fff'
      },
      tooltip: {
        enabled: true,
        format: '{l}: {f}'
      }
    };

    setTimeout(() => {
      const container = document.getElementById('message-funnel-chart');
      if (container) {
        container.innerHTML = '';
        const chart = new D3Funnel('#message-funnel-chart');
        chart.draw(funnelChartData, options);
      }
    }, 100);
  }

  getSeriesData(chartType: string, responseData: any[], metaData: any, colorOffset: number = 0, customColors: any[] = []) {
    if (!responseData?.length) return [];
    const metrics = Object.keys(responseData[0]).filter(k => k !== 'time_bucket');
    const seriesMap = new Map<string, any[]>();
    responseData.forEach(point => {
      const timestamp = this.convertTimebucket(point['time_bucket']);
      metrics.forEach(metric => {
        if (!seriesMap.has(metric)) seriesMap.set(metric, []);
        seriesMap.get(metric)?.push({ x: timestamp, y: point[metric] });
      });
    });
    return Array.from(seriesMap.entries()).map(([name, data], index) => {
      const color = customColors.length > 0 ? customColors[index % customColors.length] : this.AREA_COLORS[(index + colorOffset) % this.AREA_COLORS.length];
      const formattedName = name
        .replace('meter_rabbitmq_node_', '')
        .replace('meter_rabbitmq_', '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      return {
        type: chartType,
        name: formattedName,
        data: data,
        color: color.line,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: color.stops
        }
      };
    });
  }

  getChartOption(seriesData: any[], yAxisTitle: string, chartType: string = 'line', isStacked: boolean = false, isBytes: boolean = false, useColorAxis: boolean = false): Highcharts.Options {
    const byteFormatter = function(value: any, decimals: number = 0) {
      if (value === 0) return '0 B';
      if (value == null) return 'No Data';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
      const i = Math.floor(Math.log(value) / Math.log(k));
      return parseFloat((value / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    };

    return {
      lang: { noData: 'No Data Available' },
      noData: {
        style: { fontSize: '14px', fontWeight: '500', color: '#9ca3af' }
      },
      chart: { 
        backgroundColor: 'transparent', 
        type: chartType,
        spacing: [10, 10, 5, 0]
      },
      title: { text: '' },
      xAxis: { 
        type: 'datetime', 
        lineWidth: 0,
        tickWidth: 0,
        tickLength: 0,
        labels: { 
          enabled: true,
          style: { fontSize: '11px', color: '#6B7280' }
        }
      },
      yAxis: { 
        title: { text: '' },
        allowDecimals: false,
        min: 0,
        gridLineColor: '#e5e7eb',
        labels: { 
          enabled: true,
          style: { fontSize: '11px', color: '#6B7280' },
          formatter: function(this: any) {
            return isBytes ? byteFormatter(this.value, 0) : this.value;
          }
        } 
      },
      credits: { enabled: false },
      legend: { enabled: false },
      tooltip: { 
        shared: true,
        backgroundColor: '#ffffff',
        borderRadius: 6,
        shadow: true,
        formatter: isBytes ? function(this: any) {
          let s = `<span style="font-size: 10px">${Highcharts.dateFormat('%A, %b %e, %H:%M', this.x)}</span><br/>`;
          this.points.forEach((point: any) => {
            const val = byteFormatter(point.y, 2);
            s += `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${val}</b><br/>`;
          });
          return s;
        } : undefined,
        valueDecimals: isBytes ? 2 : 0,
        style: { fontSize: '11px' }
      },
      plotOptions: {
        series: {
          stacking: isStacked ? 'normal' : undefined,
          marker: {
            enabled: true,
            radius: 4,
            lineWidth: 2
          },
          lineWidth: 2.5
        },
        areaspline: {
          threshold: 0,
          fillOpacity: 0.1
        },
        column: {
          borderRadius: 4,
          pointPadding: 0.1,
          groupPadding: 0.05
        }
      },
      colorAxis: useColorAxis ? {
        stops: [
          [0.0, '#CFE2FF'],
          [1.0, '#468faf']
        ]
      } : undefined as any,
      series: seriesData as any
    };
  }

  convertTimebucket(tb: string): number {
    const year = parseInt(tb.substring(0, 4));
    const month = parseInt(tb.substring(4, 6)) - 1;
    const day = parseInt(tb.substring(6, 8));
    const hour = parseInt(tb.substring(8, 10));
    const minute = parseInt(tb.substring(10, 12));
    return new Date(year, month, day, hour, minute).getTime();
  }

  sortData(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : (this.sortDirection === 'desc' ? 'none' : 'asc');
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.inputPage = this.currentPage;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.inputPage = this.currentPage;
    }
  }

  goToPage() {
    let page = Number(this.inputPage);
    if (isNaN(page) || page < 1) page = 1;
    else if (page > this.totalPages) page = this.totalPages;

    this.currentPage = page;
    this.inputPage = page;
  }

  resetCurrentPage(data: any[], search: string, fields: string[]) {
    this.currentPage = 1;
    this.inputPage = 1;
    this.calculatePagination(data, search, fields);
  }

  calculatePagination(data: any[], search: string, fields: string[]) {
    if (!data) return;
    let filtered = data;
    if (search && fields.length > 0) {
      const lowerSearch = search.toLowerCase();
      filtered = data.filter(item =>
        fields.some(field => {
          const val = item[field];
          return val && val.toString().toLowerCase().includes(lowerSearch);
        })
      );
    }
    this.totalItems = filtered.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  getAppMetadata() {
    this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        const featureType = sessionStorage.getItem("featureType") ?? 'RABBITMQ';
        this.applicationService.getFullApplicationData(user.userId, featureType).pipe(takeUntil(this.destroy$)).subscribe(appData => {
          if (appData && appData.serviceStatus === 'Success') {
            const apps = appData.serviceResponse?.applications || [];
            const matchedApp = apps.find((app: any) => app.applicationName === this.clusterName);
            if (matchedApp) {
              this.applicationTechnology = matchedApp.applicationTechnology;
              this.applicationType = matchedApp.applicationType;
            }
          }
        });
      }
    });
  }

  getImagePath(tech: string | undefined | null, appType: string | undefined | null): string {
    const t = tech ? tech.trim().toLowerCase() : '';
    const a = appType ? appType.trim().toLowerCase() : '';
    return 'assets/images/' + (t || a || 'undefined') + '.png';
  }

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/img/technologies/UNKNOWN_CLOUD.png';
  }
}
