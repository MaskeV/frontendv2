import * as Highcharts from 'highcharts';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { InfraService } from '../../../../services/infra.service';
import { DateService } from '../../../../services/date.service';
import { ServiceIdService } from '../../../../services/service-id.service';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { HighchartsChartModule } from 'highcharts-angular';

import { NgbDropdownModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { hierarchy, treemap, HierarchyRectangularNode } from 'd3-hierarchy';
import { NetworkSpeedChartComponent } from './network-speed-chart/network-speed-chart.component';
import { MeteringConfigService, ComponentMetricThresholdDTO } from '../../../../services/metering-config.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApmApiService } from '../../../../services/apm-api.service';
import { MatButtonModule } from '@angular/material/button';
import { User } from '../../../../models/user';
import { Session } from '../../../../models/session';
import { ThresholdService } from '../../../../services/threshold.service';
import { PointClickEventObject, Point } from 'highcharts';
import { BytesToGbPipe } from '../../../../bytes-to-gb.pipe';

export let browserRefresh = false;
declare var bootstrap: any;

interface CpuUsage {
  name: string;
  value: number;
  color: string;
}

interface CpuTile extends CpuUsage {
  x: number;
  y: number;
  width: number;
  height: number;
  isOverflowTile?: boolean;
}

@Component({
  selector: 'app-linux-dashboard',
  imports: [
    FormsModule,
    CommonModule,
    RouterModule,
    HighchartsChartModule,
    NgbDropdownModule,
    NetworkSpeedChartComponent,
    MatTooltipModule,
    MatButtonModule,
    BytesToGbPipe
  ],
  templateUrl: './linux-dashboard.component.html',
  styleUrls: ['./linux-dashboard.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class LinuxDashboardComponent implements OnInit, OnDestroy {

  private themeObserver: MutationObserver | undefined;
  Highcharts: typeof Highcharts = Highcharts;

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  // For pinned filesystem tooltip
  fsPinnedTooltipVisible = false;
  fsPinnedTooltipHtml = '';
  fsPinnedTooltipPosition = { left: 0, top: 0 };

  datemodel: any;
  startTime!: number;
  endTime!: number;

  selectedService!: string;
  serviceId!: string;
  ipAddrId: any;
  entityId!: string;
  componentId: string | null = '';

  chartOptions: Highcharts.Options = {};
  charts: Highcharts.Chart[] = [];

  logicalCores: any;
  upTime: any;
  sinceWhenUptime: any;
  hostLocation: any;
  cpuUsage: any;
  loadAverage: any;
  memoryRamUsage: any;
  memorySwapUsage: any;
  memoryRamChart: Highcharts.Options | null = null;
  memorySwapChart: Highcharts.Options | null = null;
  avgCpuUsageChart: Highcharts.Options | null = null;
  avgCpuLoadChart: Highcharts.Options | null = null;
  fileSystemMountpointUsageChart: Highcharts.Options | null = null;
  tooltipLocked: boolean = false;
  filefdAllocatedChart: Highcharts.Options | null = null;
  diskReadWriteChart: Highcharts.Options | null = null;
  diskSpaceChart: Highcharts.Options | null = null;
  networkBandwidthUsageChart: Highcharts.Options | null = null;
  networkStatusChart: Highcharts.Options | null = null;
  // discSpaceLists: Array<{ name: any; free: any; used: any; total: any, usedPercent: any, freePercent: any }> = [];

  processList: { [key: string]: any } = {};
  filteredProcessList: any[] = [];
  pagedProcessList: any[] = [];

  searchQuery = '';
  showSearch = false;

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  currentPage = 1;
  itemsPerPage = 25;
  totalPages = 0;

  serviceList: any[] = [];
  filteredServiceList: any[] = [];
  pagedServiceList: any[] = [];

  searchQuery2 = '';
  showSearch2 = false;

  sortColumn2: string = '';
  sortDirection2: 'asc' | 'desc' = 'asc';

  currentPage2 = 1;
  itemsPerPage2 = 25;
  totalPages2 = 0;

  isExpanded: { [key: string]: boolean } = {};
  processKeys: string[] = [];
  key: any;

  locations = [
    { name: 'Mumbai', x: 73, y: 50 }
  ];

  cpuSizeW = 0;
  cpuSizeH = 0;
  tileGap = 0;

  memoryRamTile: CpuUsage[] = [];
  memorySwapTile: CpuUsage[] = [];
  cpuUsageTile: CpuUsage[] = [];
  cpuLoadTile: CpuUsage[] = [];

  displayMemoryRamTiles: CpuTile[] = [];
  displayMemorySwapTiles: CpuTile[] = [];
  displayCpuUsageTiles: CpuTile[] = [];
  displayCpuLoadTiles: CpuTile[] = [];
  overflowTiles: CpuTile[] = [];

  alertData: any[] = [];

  avgNetworkSpeed: any;
  networkTrafficSpeed: any;
  networkSpeedUnit: string = 'KBps';
  diskPartitionPercent: any;
  thresholds: any = {};
  entireThreshold: any = {};
  // UserGlobthreshold: any = {};
  SystemMetrics: any = {};
  metricThresholdList: {
    [metricName: string]: {
      warningValue: number;
      criticalValue: number;
    };
  } = {};

  cpuUsageThresholdKPI: any;

  cpuUsageThreshold: any;
  memorySwapThreshold: any;
  memorySwapFreeThreshold: any;
  memorySwapTotalThreshold: any;
  memoryRamThreshold: any;
  loadAverageThreshold: any;

  uptimeColor: string = 'green';
  cpuUsageColor: string = 'green';
  memoryRamColor: string = 'green';
  memorySwapColor: string = 'green';
  loadAverageColor: string = 'green';

  cpuUsageBadge: any;
  cpuUsageBadgeColor: any;
  memoryRamBadge: any;
  memoryRamBadgeColor: any;
  memorySwapBadge: any;
  memorySwapBadgeColor: any;
  cpuLoadBadge: any;
  cpuLoadBadgeColor: any;

  avgBaselineCpuUsage: any;
  avgBaselineMemoryRam: any;
  avgBaselineMemorySwap: any;
  avgBaselineCpuLoad: any;

  ServiceInstanceThreadPoolChart!: any;
  fileSystemChart!: any

  memoryRamChartInstance: Highcharts.Chart | null = null;
  memorySwapChartInstance: Highcharts.Chart | null = null;
  cpuUsageChartInstance: Highcharts.Chart | null = null;
  cpuLoadChartInstance: Highcharts.Chart | null = null;
  fileSystemChartInstance: Highcharts.Chart | null = null;
  fileFdChartInstance: Highcharts.Chart | null = null;
  diskReadWriteChartInstance: Highcharts.Chart | null = null;
  networkBandwidthChartInstance: Highcharts.Chart | null = null;
  networkStatusChartInstance: Highcharts.Chart | null = null;

  chartValuesRam: { avg?: number; warning?: number; critical?: number } = {};
  chartValuesSwap: { avg?: number; warning?: number; critical?: number } = {};
  chartValuesCpuLoad: { avg?: number; warning?: number; critical?: number } = {};
  chartValuesNetworkBandwidth: { avg?: number; warning?: number; critical?: number } = {};

  chartData_criteriaForMemoryRam: any = 'all';
  chartData_criteriaForMemorySwap: any = 'all';
  chartData_criteriaForCpuLoad: any = 'all';
  chartData_criteriaForNetworkBandwidth: any = 'all';

  chart_criteriaForMemoryRam: any = 'avg';
  chart_criteriaForMemorySwap: any = 'avg';
  chart_criteriaForCpuLoad: any = 'avg';
  chart_criteriaForNetworkBandwidth: any = 'avg';

  lastMemoryData: any[] = [];
  lastSwapData: any[] = [];
  lastCpuData: any[] = [];
  lastNetworkData: any[] = [];

  isMemoryRamGraph: Boolean = false;
  isMemorySwapGraph: Boolean = false;
  isCpuUsageGraph: Boolean = false;
  isCpuLoadGraph: Boolean = false;
  isNetworkBandwidthGraph: Boolean = false;

  dataSource: any;
  memoryUsage = 45;
  networkSpeed = 60;

  selectedMetricName: any;
  selectedMetricForThresholdUpdate: any;
  selectedMetricWarningValue: any;
  selectedMetricWarningPercent: number | null = null;
  selectedMetricCriticalPercent: number | null = null;
  selectedMetricCriticalValue: any;
  originalWarningValue: any;
  originalCriticalValue: any;
  thresholdst!: number;

  isUpdateThreshold: boolean = false;
  selectedMetricType: string = 'Percentage';
  thresholdMessage: string = '';
  compMetricId: any;

  // container

  user: User = new User();
  currentUser: User | null = null;
  sessionObject: Session = new Session();
  currentContainerPage = 1;
  itemsPerContainerPage = 30;
  totalContainerPages = 0;
  selectedServiceName!: string;

  serviceIdContainer!: any;
  applicationNameMap: any;
  cpu_usage_arr: { [key: string]: any } = {};

  filteredContainerId: any[] = [];
  pagedContainerId: any[] = [];
  properties: any;

  public showChartModal = false;
  public selectedProcessName = '';
  public isChartLoading = false;

  constructor(
    private infraService: InfraService,
    private dateService: DateService,
    private serviceIdService: ServiceIdService,
    private modalService: NgbModal,
    private meteringConfigService: MeteringConfigService,
    private apmApiService: ApmApiService,
    private router: Router,
    private thresholdService: ThresholdService,
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

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.selectedService = sessionStorage.getItem('serviceIdForInfra')!;
    this.serviceId = sessionStorage.getItem('encodedServiceIdForInfra')!;
    this.entityId = sessionStorage.getItem('encodedEntityIDForServices')!;
    this.selectedServiceName = sessionStorage.getItem('serviceIdForContainerName')!;
    this.ipAddrId = sessionStorage.getItem('ipAddressId');
    this.dateService.setActiveComponent('LinuxDashboardComponent');
    // this.observeThemeChange();
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'LinuxDashboardComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.thresholdst = this.formatForThresholdDate(this.datemodel.startdateTime);

        this.endTime = this.formatDate(this.datemodel.enddateTime);
        // this.loadData('overview');
        const activeTab = document.querySelector('#service-nav .nav-link.active') as HTMLElement;
        if (activeTab) {
          const tabName = activeTab.getAttribute('href')?.replace('#', '');
          if (tabName) {
            this.loadData(tabName);
          }
        }
        this.filteredProcessList = Object.keys(this.processList);
        this.calculatePagination();
      });
  }

  ngAfterViewInit() {
    // this.loadData('overview');
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
    this.themeObserver?.disconnect();

  }


  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.updateCpuDimensions();
    this.calculateMemoryRamTiles();
    this.calculateMemorySwapTiles();
    this.calculateCpuUsageTiles();
    this.calculateCpuLoadTiles();

    [
      this.memoryRamChartInstance,
      this.memorySwapChartInstance,
      this.cpuUsageChartInstance,
      this.cpuLoadChartInstance,
      this.fileSystemChartInstance,
      this.fileFdChartInstance,
      this.diskReadWriteChartInstance,
      this.networkBandwidthChartInstance,
      this.networkStatusChartInstance
    ].forEach(chart => chart?.reflow());
  }

  updateCpuDimensions() {
    const container = document.querySelector('.card .graphDiv .d-flex');
    if (container) {
      const rect = container.getBoundingClientRect();
      this.cpuSizeW = rect.width;  // Use actual container width
      this.cpuSizeH = rect.height; // Use actual container height
    } else {
      this.cpuSizeW = window.innerWidth / 3; // fallback = 33.3% of window
      this.cpuSizeH = 180;
    }
  }

  updateMemoryRamTile(data: any[]): void {
    if (!data || data.length === 0) {
      this.memoryRamTile = [];
      return;
    }

    const categories = [
      { key: 'meter_vm_memory_used', name: 'used' },
      { key: 'meter_vm_memory_available', name: 'available' }
    ];

    const sums: Record<string, number> = {};
    categories.forEach(cat => sums[cat.key] = 0);

    const count = data.length;
    data.forEach(item => {
      categories.forEach(cat => {
        sums[cat.key] += Number(item[cat.key]) || 0;
      });
    });

    const avgs: Record<string, number> = {};
    categories.forEach(cat => avgs[cat.key] = sums[cat.key] / count);

    const total = Number(data[0].meter_vm_memory_total) || 1;

    this.memoryRamTile = categories.map(cat => ({
      name: cat.name,
      value: +avgs[cat.key].toFixed(2),
      total: total,
      color: this.getColorForTiles(cat.name)
    }));

    this.calculateMemoryRamTiles();
  }

  updateMemorySwapTile(data: any[]): void {
    if (!data || data.length === 0) {
      this.memorySwapTile = [];
      return;
    }

    const avgTotal = data.reduce(
      (sum, item) => sum + Number(item.meter_vm_memory_swap_total || 0),
      0
    ) / data.length;

    const avgFree = data.reduce(
      (sum, item) => sum + Number(item.meter_vm_memory_swap_free || 0),
      0
    ) / data.length;

    const avgUsed = avgTotal - avgFree;

    this.memorySwapTile = [
      {
        name: 'used',
        value: +avgUsed.toFixed(2),
        color: this.getColorForTiles('total2')
      },
      {
        name: 'free',
        value: +avgFree.toFixed(2),
        color: this.getColorForTiles('free')
      }
    ];

    this.calculateMemorySwapTiles();
  }

  updateCpuUsageTile(data: any[]): void {
    if (!data || data.length === 0) {
      this.cpuUsageTile = [];
      return;
    }

    const categories = ['system', 'softirq', 'idle', 'steal', 'irq', 'iowait', 'user', 'nice'];

    const sums: Record<string, number> = {};
    categories.forEach(cat => sums[cat] = 0);
    const count = data.length;
    data.forEach(item => {
      categories.forEach(cat => {
        sums[cat] += Number(item[cat]) || 0;
      });
    });

    const avgs: Record<string, number> = {};
    categories.forEach(cat => avgs[cat] = sums[cat] / count);
    this.cpuUsageTile = categories.map(cat => ({
      name: cat,
      value: +avgs[cat].toFixed(2),
      color: this.getColorForTiles(cat)
    }));

    this.calculateCpuUsageTiles();
  }

  updateCpuLoadTile(data: any[]): void {
    if (!data || data.length === 0) {
      this.cpuLoadTile = [];
      return;
    }

    const categories = [
      { key: 'meter_vm_cpu_load1', name: 'load1' },
      { key: 'meter_vm_cpu_load5', name: 'load5' },
      { key: 'meter_vm_cpu_load15', name: 'load15' }
    ];

    const avgs: Record<string, number> = {};
    categories.forEach(cat => {
      avgs[cat.key] = data.reduce(
        (sum, item) => sum + Number(item[cat.key] || 0),
        0
      ) / data.length;
    });

    this.cpuLoadTile = categories.map(cat => ({
      name: cat.name,
      value: +avgs[cat.key].toFixed(2),
      color: this.getColorForTiles(cat.name)
    }));

    this.calculateCpuLoadTiles();
  }

  getColorForTiles(cat: string): string {
    const colorMap: Record<string, string> = {

      // Memory RAM Metrices
      used: '#CADCAE',
      available: '#8ABB6C',
      buff_cache: '#B07AA1',
      total1: '#bde0fe',

      // Memory Swap Metrices
      total2: '#e6ccb2',
      free: '#eda268',

      // CPU Usage Metrices
      system: '#FFB6C1',
      softirq: '#ee964b',
      idle: '#FAA0A0',
      steal: '#f4bbd3',
      irq: '#b6db8f',
      iowait: '#8fb6db',
      user: '#FA8072',
      nice: '#8fdbb6',

      // CPU Load Metrices
      load1: '#BDB5D5',
      load5: '#E0B0FF',
      load15: '#D8BFD8'

    };
    return colorMap[cat] || '#ccc';
  }

  calculateMemoryRamTiles() {
    const containerWidth = this.cpuSizeW;
    const containerHeight = this.cpuSizeH;
    const tileGap = this.tileGap;

    const data = { children: this.memoryRamTile };

    const root = hierarchy<{ children: CpuUsage[] } | CpuUsage>(data)
      .sum((d: any) => (d as CpuUsage).value)
      .sort((a, b) => ((b.data as CpuUsage).value || 0) - ((a.data as CpuUsage).value || 0));

    treemap<{ children: CpuUsage[] } | CpuUsage>()
      .size([containerWidth, containerHeight])
      .paddingInner(tileGap)(root);

    this.displayMemoryRamTiles = (root.leaves() as HierarchyRectangularNode<CpuUsage>[]).map((leaf) => {
      const data = leaf.data;
      return {
        ...data,
        x: leaf.x0,
        y: leaf.y0,
        width: leaf.x1 - leaf.x0,
        height: leaf.y1 - leaf.y0
      };
    });

  }

  calculateMemorySwapTiles() {
    const containerWidth = this.cpuSizeW;
    const containerHeight = this.cpuSizeH;
    const tileGap = this.tileGap;

    const data = { children: this.memorySwapTile };

    const root = hierarchy<{ children: CpuUsage[] } | CpuUsage>(data)
      .sum((d: any) => (d as CpuUsage).value)
      .sort((a, b) => ((b.data as CpuUsage).value || 0) - ((a.data as CpuUsage).value || 0));

    treemap<{ children: CpuUsage[] } | CpuUsage>()
      .size([containerWidth, containerHeight])
      .paddingInner(tileGap)(root);

    this.displayMemorySwapTiles = (root.leaves() as HierarchyRectangularNode<CpuUsage>[]).map((leaf) => {
      const data = leaf.data;
      return {
        ...data,
        x: leaf.x0,
        y: leaf.y0,
        width: leaf.x1 - leaf.x0,
        height: leaf.y1 - leaf.y0
      };
    });

  }

  calculateCpuUsageTiles() {
    const containerWidth = this.cpuSizeW;
    const containerHeight = this.cpuSizeH;
    const tileGap = this.tileGap;

    const data = { children: this.cpuUsageTile };

    const root = hierarchy<{ children: CpuUsage[] } | CpuUsage>(data)
      .sum((d: any) => (d as CpuUsage).value)
      .sort((a, b) => ((b.data as CpuUsage).value || 0) - ((a.data as CpuUsage).value || 0));

    treemap<{ children: CpuUsage[] } | CpuUsage>()
      .size([containerWidth, containerHeight])
      .paddingInner(tileGap)(root);

    this.displayCpuUsageTiles = (root.leaves() as HierarchyRectangularNode<CpuUsage>[]).map((leaf) => {
      const data = leaf.data;
      return {
        ...data,
        x: leaf.x0,
        y: leaf.y0,
        width: leaf.x1 - leaf.x0,
        height: leaf.y1 - leaf.y0
      };
    });

  }

  calculateCpuLoadTiles() {
    const containerWidth = this.cpuSizeW;
    const containerHeight = this.cpuSizeH;
    const tileGap = this.tileGap;

    const data = { children: this.cpuLoadTile };

    const root = hierarchy<{ children: CpuUsage[] } | CpuUsage>(data)
      .sum((d: any) => (d as CpuUsage).value)
      .sort((a, b) => ((b.data as CpuUsage).value || 0) - ((a.data as CpuUsage).value || 0));

    treemap<{ children: CpuUsage[] } | CpuUsage>()
      .size([containerWidth, containerHeight])
      .paddingInner(tileGap)(root);

    this.displayCpuLoadTiles = (root.leaves() as HierarchyRectangularNode<CpuUsage>[]).map((leaf) => {
      const data = leaf.data;
      return {
        ...data,
        x: leaf.x0,
        y: leaf.y0,
        width: leaf.x1 - leaf.x0,
        height: leaf.y1 - leaf.y0
      };
    });

  }

  getTileTooltip(tile: any): string {
    return tile.isOverflowTile
      ? this.overflowTiles.map(t => `${t.name}: ${t.value}MB`).join(', ')
      : `${tile.name}: ${tile.value}MB`;
  }

  getTileTooltip2(tile: any): string {
    return tile.isOverflowTile
      ? this.overflowTiles.map(t => `${t.name}: ${t.value}%`).join(', ')
      : `${tile.name}: ${tile.value}%`;
  }

  convertTimebucket(timebucket: any) {
    timebucket = timebucket.toString();
    const year = parseInt(timebucket.slice(0, 4), 10);
    const month = parseInt(timebucket.slice(4, 6), 10) - 1;
    const day = parseInt(timebucket.slice(6, 8), 10);
    const hour = parseInt(timebucket.slice(8, 10), 10);
    const minute = parseInt(timebucket.slice(10, 12), 10);

    return new Date(year, month, day, hour, minute).getTime();
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

  loadData(tabName: string): void {
    this.searchQuery = '';
    this.searchQuery2 = '';
    this.searchTermDisk = '';
    this.destroy$.next();
    switch (tabName) {
      case 'overview':
        this.getThreshold("INFRA");
        // this.loadThresholds();

        this.updateCpuDimensions();
        this.calculateMemoryRamTiles();
        this.calculateMemorySwapTiles();
        this.calculateCpuUsageTiles();
        this.calculateCpuLoadTiles();

        this.getSystemProperties();
        this.getCombinedData();
        this.getMemoryRam();
        this.getMemorySwap();
        this.getAvgCpuUsage();
        this.getCpuLoad();
        this.getFileSystemMountpointUsage();
        this.getFilefdAllocated();
        this.getDiskReadWrite();
        this.getNetworkBandwidthUsage();
        this.getNetworkStatus();
        this.getDiscSpace();
        this.getAlertCounts();
        this.getDiscSpaceThreshold();
        break;
      case 'process_list':
        this.getProcess();
        this.getservices();
        break;
      case 'container':
        this.getContainerStatus();
        break;
    }
  }

  observeThemeChange() {
    this.themeObserver = new MutationObserver(() => {
      this.getMemoryRam();
      this.getMemorySwap();
      this.getAvgCpuUsage();
      this.getCpuLoad();
      this.getFileSystemMountpointUsage();
      this.getFilefdAllocated();
      this.getDiskReadWrite();
      this.getNetworkBandwidthUsage();
      this.getAvgNetworkSpeed();
      this.getNetworkStatus();
      this.getDiscSpace();
    });

    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  get formattedLabel(): string {
    return this.avgNetworkSpeed ? `${this.avgNetworkSpeed.toFixed(2)} Kbps` : '0 Kbps';
  }

  formatUptime(uptime: string): string {
    if (!uptime || typeof uptime !== 'string') {
      return `0d 0h <span class="small-time">0m 0s</span>`;
    }

    let days = 0, hours = 0, minutes = 0, seconds = 0;

    // Support both formats: "158:19:42:06" or "2 Days 04:15:12"
    if (uptime.includes('Day')) {
      const dayMatch = uptime.match(/(\d+)\s*Day[s]?/i);
      if (dayMatch) days = parseInt(dayMatch[1], 10) || 0;
      const timePart = uptime.split(/Day[s]?/i)[1].trim();
      const timeParts = timePart.split(':');
      hours = parseInt(timeParts[0], 10) || 0;
      minutes = parseInt(timeParts[1], 10) || 0;
      seconds = parseInt(timeParts[2], 10) || 0;
    } else {
      const parts = uptime.split(':');
      if (parts.length === 4) {
        days = parseInt(parts[0], 10) || 0;
        hours = parseInt(parts[1], 10) || 0;
        minutes = parseInt(parts[2], 10) || 0;
        seconds = parseInt(parts[3], 10) || 0;
      } else if (parts.length === 3) {
        hours = parseInt(parts[0], 10) || 0;
        minutes = parseInt(parts[1], 10) || 0;
        seconds = parseInt(parts[2], 10) || 0;
      } else {
        return uptime;
      }
    }

    const totalDays = days + hours / 24 + minutes / 1440; // total days as float
    const totalHours = (days * 24) + hours;
    const totalMs = (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;

    // Calculate since date
    const sinceUTC = new Date(Date.now() - totalMs);
    this.sinceWhenUptime = sinceUTC.toLocaleDateString();

    // Determine display format
    let formatted = '';

    if (totalDays < 1) {
      // Within 1 day → show hours, minutes, seconds
      formatted = `${hours}h <span class="small-time">${minutes}m ${seconds}s</span>`;
    } else if (totalDays < 30) {
      // Within a month → show days and hours
      formatted = `${days}d ${hours}h`;
    } else if (totalDays < 365) {
      // More than 1 month but less than a year → show months and days
      const months = Math.floor(totalDays / 30);
      const remDays = Math.floor(totalDays % 30);
      formatted = `${months}mo ${remDays}d`;
    } else {
      // More than or equal to 1 year → show years and months
      const years = Math.floor(totalDays / 365);
      const months = Math.floor((totalDays % 365) / 30);
      formatted = `${years}y ${months}mo`;
    }
    return formatted;
  }


  syncCharts(charts: (Highcharts.Chart | undefined)[]) {
    let lastXValue: number | null = null;

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

    const updateChartsForX = (xValue: number) => {
      charts.forEach((chart) => {
        if (!chart) return;

        const xAxis = chart.xAxis?.[0];
        if (!xAxis) return;

        // Convert the shared X value (timestamp) to chart-relative pixels
        const chartX = xAxis.toPixels(xValue);
        const fakeEvent = { chartX, chartY: 0 } as any;

        const tooltipPoints: Highcharts.Point[] = [];

        chart.series?.forEach((s) => {
          const point = s.searchPoint(fakeEvent, true);
          if (point) {
            // Only sync if the point is reasonably close to the target X value
            // (e.g., within 2% of the visible range)
            const extremes = xAxis.getExtremes();
            const threshold = (extremes.max - extremes.min) * 0.02;
            if (Math.abs(point.x - xValue) <= threshold) {
              const pTyped = point as Highcharts.Point & { state?: string };
              if (pTyped.state !== 'hover') pTyped.setState('hover');
              tooltipPoints.push(pTyped);
            } else {
              const pTyped = point as Highcharts.Point & { state?: string };
              if (pTyped.state === 'hover') pTyped.setState('');
            }
          }
        });

        if (tooltipPoints.length) {
          chart.tooltip?.refresh(tooltipPoints);
          xAxis.drawCrosshair(fakeEvent, tooltipPoints[0]);
        } else {
          chart.tooltip?.hide();
          xAxis.hideCrosshair();
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

      updateChartsForX(xValue);
    };

    const throttledHandleMouseMove = throttleRAF(handleMouseMove);

    charts.forEach((chart) => {
      if (!chart?.container) return;

      chart.container.addEventListener(
        'mousemove',
        (e) => throttledHandleMouseMove(e as MouseEvent, chart),
        { passive: true }
      );

      chart.container.addEventListener('click', (e) => {
        if (!chart?.pointer) return;
        const event = chart.pointer.normalize(e as MouseEvent);
        const points = chart.series
          ?.map((s) => s.searchPoint(event, true))
          ?.filter((p): p is Highcharts.Point => !!p) ?? [];
        if (!points.length) return;

        const xValue = points[0].x;
        updateChartsForX(xValue);
      });

      chart.container.addEventListener(
        'mouseleave',
        () => {
          lastXValue = null;
          window.requestAnimationFrame(() => {
            charts.forEach((c) => {
              if (!c) return;

              c.tooltip?.hide();
              c.xAxis?.forEach((axis) => axis.hideCrosshair());

              c.series?.forEach((s) => {
                s.points?.forEach((p) => {
                  const pTyped = p as Highcharts.Point & { state?: string };
                  if (pTyped.state === 'hover') {
                    pTyped.setState('');
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

  getSystemProperties(): void {
    this.infraService.getSystemProperties(this.serviceId, this.startTime, this.endTime, "linux").pipe(takeUntil(this.destroy$)).subscribe((data: any) => {

      if (data) {
        this.logicalCores = data.logical_cores;
        if (data.system_uptime) {
          this.upTime = this.formatUptime(data.system_uptime);
        }
        else {
          this.upTime = null;
        }

        if (this.locations.length > 0 && data.hostLocation) {
          this.locations[0].name = data.hostLocation.split('_')[0];
        }
      } else {
        this.upTime = null;
      }

    });
  }

  getCombinedData(): void {
    this.infraService.getCombinedData(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.cpuUsage = (data && data.cpu_usage != null) ? data.cpu_usage.toFixed(2) : null;
      // this.cpuUsage = 300;
      this.memoryRamUsage = (data && data.memory_ram_usage != null) ? +(data.memory_ram_usage / (1024)).toFixed(2) : null;
      this.memorySwapUsage = (data && data.memory_swap_usage != null) ? data.memory_swap_usage : null;
      if (data) {
        this.alertData = [{
          total_count: data.total_alert_count !== undefined ? data.total_alert_count : 0,
          openalertcount: data.open_alert_count !== undefined ? data.open_alert_count : 0,
          closealertcount: data.closed_alert_count !== undefined ? data.closed_alert_count : 0
        }];
      } else {
        this.alertData = [{ total_count: 0, openalertcount: 0, closealertcount: 0 }];
      }
      this.applyThresholds();
    });
  }

  getMemoryRam(): void {
    this.infraService.getMemoryRam(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {

        const parsedData = data.map((d: any) => ({
          ...d,
          timestamp: new Date(
            d.time_bucket.substring(0, 4),
            Number(d.time_bucket.substring(4, 6)) - 1,
            Number(d.time_bucket.substring(6, 8)),
            Number(d.time_bucket.substring(8, 10)),
            Number(d.time_bucket.substring(10, 12))
          ).getTime()
        }));

        this.lastMemoryData = parsedData;
        // this.chartValuesRam = this.getSelectedMetricValues(this.lastMemoryData || []);
        this.chartValuesRam = this.getSelectedMetricValues(this.lastMemoryData || []);

        // const selectedKey =
        //   this.chartDropdownToMetricKey[this.chartData_criteriaForMemoryRam];

        // if (this.chart_criteriaForMemoryRam === 'threshold' &&
        //   this.badges[selectedKey]) {
        //   this.chartValuesRam.warning = this.badges[selectedKey].warning;
        //   this.chartValuesRam.critical = this.badges[selectedKey].critical;
        // }

        this.updateMemoryRamTile(data);
        this.chartMemoryRam(parsedData);
        this.memoryRamChartInstance = Highcharts.chart('memoryRAMChart', this.memoryRamChart!);

        if (!this.charts.includes(this.memoryRamChartInstance)) {
          this.charts.push(this.memoryRamChartInstance);
          this.syncCharts(this.charts);
        }
      });
  }

  chartDropdownToMetricKey: { [key: string]: string } = {
    total: 'meter_vm_memory_total',
    available: 'meter_vm_memory_available',
    buff: 'meter_vm_memory_buff_cache',
    used: 'meter_vm_memory_used'
  };

  metricKeys = ['meter_vm_memory_total', 'meter_vm_memory_available', 'meter_vm_memory_buff_cache', 'meter_vm_memory_used'];

  metricMap: { [key: string]: string } = {
    meter_vm_memory_total: 'Total',
    meter_vm_memory_available: 'Available',
    meter_vm_memory_buff_cache: 'Buff/Cache',
    meter_vm_memory_used: 'Used'
  };

  badges: { [key: string]: { warning: number, critical: number, warningColor: string, criticalColor: string } } = {};
  badgeMetricKeys = ['meter_vm_memory_available', 'meter_vm_memory_used'];

  bytesToMB(v: number) {
    return v / (1024 * 1024);
  }

  chartMemoryRam(data: { time_bucket: string;[key: string]: any }[]): void {

    try {
      if (!data?.length) {
        this.memoryRamChart = null;
        return;
      }

      const CRITICAL_COLOR = 'red';
      const WARNING_COLOR = 'orange';

      this.badges = {};
      this.isMemoryRamGraph = false;

      data.forEach(d => {

        const total = d['meter_vm_memory_total'];
        const available = d['meter_vm_memory_available'];
        const used = d['meter_vm_memory_used'];

        if (!total || !available || !used) return;

        const availablePercent = (available / total) * 100;
        const usedPercent = (used / total) * 100;

        // -------- AVAILABLE --------
        if (!this.badges['meter_vm_memory_available']) {
          this.badges['meter_vm_memory_available'] = {
            warning: 20,
            critical: 10,
            warningColor: 'gray',
            criticalColor: 'gray'
          };
        }

        if (availablePercent < 10) {
          this.badges['meter_vm_memory_available'].criticalColor = CRITICAL_COLOR;
          this.isMemoryRamGraph = true;
        }
        else if (availablePercent < 20) {
          this.badges['meter_vm_memory_available'].warningColor = WARNING_COLOR;
          this.isMemoryRamGraph = true;
        }

        // -------- USED --------
        if (!this.badges['meter_vm_memory_used']) {
          this.badges['meter_vm_memory_used'] = {
            warning: 80,
            critical: 90,
            warningColor: 'gray',
            criticalColor: 'gray'
          };
        }

        if (usedPercent > 90 && availablePercent < 10) {
          this.badges['meter_vm_memory_used'].criticalColor = CRITICAL_COLOR;
          this.isMemoryRamGraph = true;
        }
        else if (usedPercent > 80 && availablePercent < 20) {
          this.badges['meter_vm_memory_used'].warningColor = WARNING_COLOR;
          this.isMemoryRamGraph = true;
        }
      });

      const defaultColors: { [key: string]: string } = {
        meter_vm_memory_total: '#023e8a',
        meter_vm_memory_available: '#480ca8',
        meter_vm_memory_buff_cache: '#679436',
        meter_vm_memory_used: '#5390d9'
      };

      const series: Highcharts.SeriesSplineOptions[] = this.metricKeys.map(key => ({
        name: this.metricMap[key],
        type: 'spline',
        lineWidth: 1,
        color: defaultColors[key],
        marker: {
          enabled: true,
          radius: 2,
          symbol: 'circle',
          states: { hover: { radius: 3, halo: { size: 4, opacity: 0.15 } } }
        },
        data: data.map(d => {
          const valueMB = typeof d[key] === 'number' ? d[key] : null;

          const total = d['meter_vm_memory_total'];
          const available = d['meter_vm_memory_available'];
          const used = d['meter_vm_memory_used'];

          const availablePercent = total ? (available / total) * 100 : 0;
          const usedPercent = total ? (used / total) * 100 : 0;

          if (valueMB === null) return { x: this.convertTimebucket(d.time_bucket), y: null };

          let status: 'C' | 'W' | '' = '';
          let markerColor = defaultColors[key];

          // ALERT ONLY FOR AVAILABLE
          if (key === 'meter_vm_memory_available') {
            if (availablePercent < 10) {
              status = 'C';
              markerColor = CRITICAL_COLOR;
            }
            else if (availablePercent < 20) {
              status = 'W';
              markerColor = WARNING_COLOR;
            }
          }

          // ALERT ONLY FOR USED (with available condition)
          if (key === 'meter_vm_memory_used') {
            if (usedPercent > 90 && availablePercent < 10) {
              status = 'C';
              markerColor = CRITICAL_COLOR;
            }
            else if (usedPercent > 80 && availablePercent < 20) {
              status = 'W';
              markerColor = WARNING_COLOR;
            }
          }

          return {
            x: this.convertTimebucket(d.time_bucket),
            y: valueMB,
            status,
            marker: {
              enabled: true,
              fillColor: markerColor,
              lineColor: markerColor,
              lineWidth: 1,
              radius: status ? 2 : 2
            }
          };
        })
      }));

      const selectedKey = this.chartDropdownToMetricKey[this.chartData_criteriaForMemoryRam];
      series.forEach(s => {
        if (this.chartData_criteriaForMemoryRam === 'all') {
          (s as any).lineWidth = 1.5;
          (s as any).zIndex = 5;
          (s as any).opacity = 1;
        } else if (s.name === this.metricMap[selectedKey]) {
          (s as any).lineWidth = 2.5;
          (s as any).zIndex = 10;
          (s as any).opacity = 1;
        } else {
          (s as any).lineWidth = 1;
          (s as any).zIndex = 1;
          (s as any).opacity = 0.6;
        }
      });

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim() || '#030303';
      const gridColor = styles.getPropertyValue('--border-color').trim() || '#ede8e8';
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim() || '#fff';
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim() || '#000';

      this.memoryRamChart = {

        chart: { type: 'line', backgroundColor: 'transparent', spacing: [5, 5, 5, 5], style: { fontSize: '8px' } },
        title: { text: undefined },
        xAxis: {
          type: 'datetime',
          crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor, lineColor: '#cccccc', tickColor: '#cccccc', tickLength: 5, tickWidth: 1
        },
        yAxis: {
          min: 0, tickAmount: 6, title: { text: undefined },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          useHTML: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          xDateFormat: '%Y-%m-%d %H:%M',
          formatter: function () {

            const ctx = this as any;   // <-- TYPE FIX
            let tooltipHtml = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', ctx.x)}</b><br/>`;

            // Get Total value
            const totalPoint = ctx.points?.find((p: any) => p.series.name === 'Total');
            const total = totalPoint?.y ?? null;

            ctx.points?.forEach((p: any) => {

              let statusColor = '';
              const status = p.point?.status || '';

              if (status === 'C') statusColor = CRITICAL_COLOR;
              else if (status === 'W') statusColor = WARNING_COLOR;

              let percentText = '';

              if (
                total &&
                (p.series.name === 'Available' || p.series.name === 'Used')
              ) {
                const percent = ((p.y / total) * 100).toFixed(1);
                percentText = ` (${percent}%)`;
              }

              tooltipHtml += `
                <span style="color:${p.series.color}">●</span> 
                ${p.series.name}: ${p.y?.toFixed(2)} MB${percentText}
                ${status ? `<span style="color:${statusColor}"> (${status})</span>` : ''}
                <br/>
              `;
            });

            return tooltipHtml;
          }
        },

        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };

      // ----------------- THRESHOLD DISPLAY (MB) -----------------
      const lastRecord = [...data].reverse()
        .find(d => typeof d?.['meter_vm_memory_total'] === 'number' && d['meter_vm_memory_total'] > 0);

      console.log("LAST RECORD:", lastRecord);

      const total = lastRecord?.['meter_vm_memory_total'];
      console.log("LAST RECORD TOTAL:", total);

      console.log("Dropdown metric:", this.chartData_criteriaForMemoryRam);
      console.log("Criteria mode:", this.chart_criteriaForMemoryRam);
      console.log("Total memory:", total);

      if (total && this.chart_criteriaForMemoryRam === 'threshold') {

        if (this.chartData_criteriaForMemoryRam === 'available') {
          this.chartValuesRam = {
            warning: total * 0.20,   // 20% of total
            critical: total * 0.10   // 10% of total
          };
        }

        else if (this.chartData_criteriaForMemoryRam === 'used') {
          this.chartValuesRam = {
            warning: total * 0.80,   // 80% of total
            critical: total * 0.90   // 90% of total
          };
        }

      } else {
        this.chartValuesRam = this.getSelectedMetricValues(data);
      }

      console.log("CHART VALUES RAM:", this.chartValuesRam);

    } catch (e) {
      console.error("Error Occurred in Memory RAM Chart", e);
    }
  }


  getMemorySwap(): void {
    this.infraService.getMemorySwap(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {

      data.forEach((d: { time_bucket: string; meter_vm_memory_swap_total: number; meter_vm_memory_swap_free: number; meter_vm_memory_swap_used?: number }) => {
        d.meter_vm_memory_swap_used = d.meter_vm_memory_swap_total - d.meter_vm_memory_swap_free;
      });
      this.lastSwapData = data;

      this.updateMemorySwapTile(data);
      this.chartMemorySwap(data);
      this.memorySwapChartInstance = Highcharts.chart('memorySwapChart', this.memorySwapChart!);
      if (!this.charts.includes(this.memorySwapChartInstance)) {
        this.charts.push(this.memorySwapChartInstance);
        this.syncCharts(this.charts);
      }
    })
  }

  chartDropdownToMetricKeySwap: { [key: string]: string } = {
    totalSwap: 'meter_vm_memory_swap_total',
    free: 'meter_vm_memory_swap_free',
    usedSwap: 'meter_vm_memory_swap_used'
  };

  badgeSwapMetricKeys = ['meter_vm_memory_swap_used', 'meter_vm_memory_swap_free'];
  swapMetricKeys = ['meter_vm_memory_swap_total', 'meter_vm_memory_swap_free', 'meter_vm_memory_swap_used'];

  swapMetricMap: { [key: string]: string } = {
    meter_vm_memory_swap_total: 'Total',
    meter_vm_memory_swap_free: 'Free',
    meter_vm_memory_swap_used: 'Used'
  };

  badgesSwap: { [key: string]: { warning: number, critical: number, warningColor: string, criticalColor: string } } = {};
  showSwapBadgeDropdown = false;

  toggleSwapBadgeDropdown() {
    this.showSwapBadgeDropdown = !this.showSwapBadgeDropdown;
  }

  chartMemorySwap(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      if (!data?.length) {
        this.memorySwapChart = null;
        return;
      }

      const CRITICAL_COLOR = 'red';
      const WARNING_COLOR = 'orange';

      // ====== DYNAMIC THRESHOLD BASED ON TOTAL ======
      const last = [...data].reverse()
        .find(d => typeof d?.['meter_vm_memory_swap_total'] === 'number'
          && d['meter_vm_memory_swap_total'] > 0);

      const total = last?.['meter_vm_memory_swap_total'];  // MB

      if (total) {

        // FREE swap threshold (LOW is bad)
        this.thresholds['meter_vm_memory_swap_free'] = {
          warningValue: total * 0.30,   // 30% LEFT
          criticalValue: total * 0.10,  // 10% LEFT
          warningColor: 'gray',
          criticalColor: 'gray'
        };

        // USED swap threshold (HIGH is bad)
        this.thresholds['meter_vm_memory_swap_used'] = {
          warningValue: total * 0.70,   // 70% USED
          criticalValue: total * 0.90,  // 90% USED
          warningColor: 'gray',
          criticalColor: 'gray'
        };
      }

      this.swapMetricKeys.forEach(key => {
        if (key === 'meter_vm_memory_swap_total') {
          this.badgesSwap[key] = { warning: 0, critical: 0, warningColor: 'gray', criticalColor: 'gray' };
          return;
        }

        const threshold = this.thresholds[key];
        if (!threshold) return;

        const warningVal = threshold.warningValue;
        const criticalVal = threshold.criticalValue;

        let anyWarning = false;
        let anyCritical = false;

        data.forEach(d => {
          if (d[key] == null && key !== 'meter_vm_memory_swap_used') return;
          if (key === 'meter_vm_memory_swap_used' && (d['meter_vm_memory_swap_total'] == null || d['meter_vm_memory_swap_free'] == null)) return;

          const valueMB = key === 'meter_vm_memory_swap_used'
            ? d['meter_vm_memory_swap_total'] - d['meter_vm_memory_swap_free']
            : d[key];

          const valueBytes = valueMB;

          if (key === 'meter_vm_memory_swap_free') {
            if (valueBytes <= criticalVal) anyCritical = true;
            else if (valueBytes <= warningVal) anyWarning = true;
          } else {
            if (valueBytes >= criticalVal) anyCritical = true;
            else if (valueBytes >= warningVal) anyWarning = true;
          }
        });


        this.isMemorySwapGraph = anyWarning || anyCritical;

        this.badgesSwap[key] = {
          warning: warningVal,
          critical: criticalVal,
          warningColor: anyWarning ? WARNING_COLOR : 'gray',
          criticalColor: anyCritical ? CRITICAL_COLOR : 'gray'
        };
      });

      const defaultColors: { [key: string]: string } = {
        meter_vm_memory_swap_total: '#45ba6a',
        meter_vm_memory_swap_free: '#7d8597',
        meter_vm_memory_swap_used: '#7dc8fe'
      };

      const series: Highcharts.SeriesAreasplineOptions[] = this.swapMetricKeys.map(key => ({
        name: this.swapMetricMap[key],
        type: 'areaspline',
        lineWidth: 1,
        marker: { radius: 2, symbol: 'circle', states: { hover: { radius: 2, halo: { size: 4, opacity: 0.15 } } } },
        color: defaultColors[key],
        fillOpacity: 0.3,
        data: data.map(d => {
          let valueMB: number | null = null;

          if (key === 'meter_vm_memory_swap_used') {
            if (d['meter_vm_memory_swap_total'] != null && d['meter_vm_memory_swap_free'] != null)
              valueMB = d['meter_vm_memory_swap_total'] - d['meter_vm_memory_swap_free'];
          } else if (d[key] != null) {
            valueMB = d[key];
          }

          if (valueMB == null) {
            return { x: this.convertTimebucket(d.time_bucket), y: null };
          }

          const value = valueMB; // keep this in MB


          let status: 'C' | 'W' | '' = '';
          let markerColor: string | undefined;

          const thr = (key !== 'meter_vm_memory_swap_total') ? this.thresholds[key] : null;
          if (thr) {
            const warningVal = thr.warningValue;
            const criticalVal = thr.criticalValue;
            if (key === 'meter_vm_memory_swap_free') {
              if (value <= criticalVal) { status = 'C'; markerColor = CRITICAL_COLOR; }
              else if (value <= warningVal) { status = 'W'; markerColor = WARNING_COLOR; }
            }

            if (key === 'meter_vm_memory_swap_used') {
              if (value >= criticalVal) { status = 'C'; markerColor = CRITICAL_COLOR; }
              else if (value >= warningVal) { status = 'W'; markerColor = WARNING_COLOR; }
            }
          }

          return {
            x: this.convertTimebucket(d.time_bucket),
            y: valueMB,
            status,
            marker: markerColor ? { fillColor: markerColor, lineColor: markerColor, radius: 2 } : { enabled: false }
          };
        })
      }));

      const selectedKey = this.chartDropdownToMetricKeySwap[this.chartData_criteriaForMemorySwap];
      series.forEach(s => {
        if (this.chartData_criteriaForMemorySwap === 'all') {
          (s as any).lineWidth = 1.5; (s as any).zIndex = 5;
        } else if (s.name === this.swapMetricMap[selectedKey]) {
          (s as any).lineWidth = 2.5; (s as any).zIndex = 10;
        } else {
          (s as any).lineWidth = 1; (s as any).zIndex = 1; (s as any).opacity = 0.6;
        }
      });

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim() || '#030303';
      const gridColor = styles.getPropertyValue('--border-color').trim() || '#ede8e8';
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim() || '#fff';
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim() || '#000';

      this.memorySwapChart = {
        chart: { type: 'line', backgroundColor: 'transparent', spacing: [5, 5, 5, 5], style: { fontSize: '8px' } },
        title: { text: undefined },
        xAxis: {
          type: 'datetime', crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor, lineColor: '#cccccc', tickColor: '#cccccc', tickLength: 5, tickWidth: 1
        },
        yAxis: {
          min: 0, tickAmount: 6, title: { text: '' },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          useHTML: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          xDateFormat: '%Y-%m-%d %H:%M',
          formatter: function () {

            const ctx = this as any;
            let tooltipHtml = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', ctx.x)}</b><br/>`;

            // Get TOTAL for percentage calculation
            const totalPoint = ctx.points?.find((p: any) => p.series.name === 'Total');
            const total = totalPoint?.y ?? null;

            ctx.points?.forEach((p: any) => {

              const point = p.point as any;
              const value = point.y;

              let statusColor = '';
              if (point.status === 'C') statusColor = 'red';
              else if (point.status === 'W') statusColor = 'orange';

              // ----------- PERCENTAGE -----------
              let percentText = '';
              if (total && (p.series.name === 'Free' || p.series.name === 'Used')) {
                const percent = ((value / total) * 100).toFixed(1);
                percentText = ` (${percent}%)`;
              }

              tooltipHtml += `
                <span style="color:${p.series.color}">●</span>
                ${p.series.name}: ${value?.toFixed(2)} MB${percentText}
                ${point.status ? `<span style="color:${statusColor}"> (${point.status})</span>` : ''}
                <br/>
              `;
            });

            return tooltipHtml;
          }
        },

        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };

      if (!this.memorySwapChartInstance)
        this.memorySwapChartInstance = Highcharts.chart('memorySwapChart', this.memorySwapChart);
      else
        this.memorySwapChartInstance.update(this.memorySwapChart!, true, true);

      // this.chartValuesSwap = this.getSelectedMetricValuesSwap(data);
      if (this.chart_criteriaForMemorySwap === 'threshold' && total) {

        if (this.chartData_criteriaForMemorySwap === 'free') {
          this.chartValuesSwap = {
            warning: total * 0.30,     // 30%
            critical: total * 0.10     // 10%
          };
        }

        else if (this.chartData_criteriaForMemorySwap === 'usedSwap') {
          this.chartValuesSwap = {
            warning: total * 0.70,     // 70%
            critical: total * 0.90     // 90%
          };
        }

      } else {
        this.chartValuesSwap = this.getSelectedMetricValuesSwap(data);
      }


    } catch (e) {
      console.error("Error in Memory Swap Chart", e);
    }
  }

  getAvgCpuUsage(): void {
    this.infraService.getCpuAvgUsedPercentage(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.updateCpuUsageTile(data);
      this.chartAvgCpuUsage(data);
      this.cpuUsageChartInstance = Highcharts.chart('avgCpuUsageChart', this.avgCpuUsageChart!);
      if (!this.charts.includes(this.cpuUsageChartInstance)) {
        this.charts.push(this.cpuUsageChartInstance);
        this.syncCharts(this.charts);
      }
    })
  }

  chartAvgCpuUsage(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket'))
        )
      );

      if (keys.length === 0) {
        this.avgCpuUsageChart = null;
        const chart = Highcharts.charts.find(c => (c as any)?.renderTo?.id === 'avgCpuUsageChart');
        if (chart) {
          chart.destroy();
        }
        return;
      }

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--border-color').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const colorMap: { [key: string]: string } = {
        user: '#00798c',
        system: '#bbd0ff',
        idle: '#76c893',
        iowait: '#7d8597',
        nice: '#b388eb',
        irq: '#45ba6a',
        softirq: '#2348eb',
        steal: '#492e69'
      };

      const series: Highcharts.SeriesLineOptions[] = keys.map(key => ({
        name: key,
        color: colorMap[key] || undefined,
        data: data.map(d => ({
          x: this.convertTimebucket(d.time_bucket),
          y: typeof d[key] === 'number' ? d[key] : null
        })),
        type: 'line',
        marker: {
          radius: 2,
          symbol: 'circle'
        },
        lineWidth: 1
      }));

      this.avgCpuUsageChart = {
        chart: {
          type: 'line',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '8px' }
        },
        title: { text: undefined },
        xAxis: {
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'ShortDot'
          },
          type: 'datetime',
          title: { text: undefined },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor,
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 5,
          tickWidth: 1,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: undefined },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor,
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          xDateFormat: '%Y-%m-%d %H:%M'
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };
      Highcharts.chart('avgCpuUsageChart', this.avgCpuUsageChart!);
    } catch (e) {
      console.log("Error Occurred ", e);
    }
  }

  getCpuLoad(): void {
    this.infraService.getCpuLoad(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.updateCpuLoadTile(data);
      this.lastCpuData = data;
      this.chartAvgCpuLoad(data);

      this.cpuLoadChartInstance = Highcharts.chart('avgCpuLoadChart', this.avgCpuLoadChart!);
      if (!this.charts.includes(this.cpuLoadChartInstance)) {
        this.charts.push(this.cpuLoadChartInstance);
        this.syncCharts(this.charts);
      }

      if (!data || !Array.isArray(data)) {
        this.loadAverage = null;
        return;
      }

      const perBucketAverages: number[] = data
        .map(entry => {
          const values = [
            entry.meter_vm_cpu_load1,
            entry.meter_vm_cpu_load5,
            entry.meter_vm_cpu_load15
          ].filter((v): v is number => typeof v === 'number');

          if (values.length === 0) {
            return undefined;
          }

          const sum = values.reduce((acc, val) => acc + val, 0);
          return sum / values.length;
        })
        .filter((avg): avg is number => avg !== undefined);

      const overallAvg = perBucketAverages.length
        ? perBucketAverages.reduce((acc, val) => acc + val, 0) / perBucketAverages.length
        : 0;

      this.loadAverage = overallAvg.toFixed(2);
      this.applyThresholds();

    })
  }


  chartDropdownToMetricKeyCpu: { [key: string]: string } = {
    load_1: 'meter_vm_cpu_load1',
    load_5: 'meter_vm_cpu_load5',
    load_15: 'meter_vm_cpu_load15'
  };

  badgeLoadKeys = ['meter_vm_cpu_load1', 'meter_vm_cpu_load5', 'meter_vm_cpu_load15'];

  metricLoadKeys = ['meter_vm_cpu_load1', 'meter_vm_cpu_load5', 'meter_vm_cpu_load15'];

  metricLoadMap: { [key: string]: string } = {
    meter_vm_cpu_load1: 'Load_1',
    meter_vm_cpu_load5: 'Load_5',
    meter_vm_cpu_load15: 'Load_15'
  };

  showLoadBadgeDropdown = false;
  showCpuLoadThreshold = false;

  badgesLoad: {
    [key: string]: { warning: number, critical: number, warningColor: string, criticalColor: string }
  } = {};

  toggleLoadBadgeDropdown() {
    this.showLoadBadgeDropdown = !this.showLoadBadgeDropdown;
  }

  chartAvgCpuLoad(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const self = this;
      if (!data.length) {
        this.avgCpuLoadChart = null;
        return;
      }

      const CRITICAL_COLOR = 'red';
      const WARNING_COLOR = 'orange';

      const warning = this.logicalCores * 0.75;
      const critical = this.logicalCores * 1.0;

      /* ---------------------- BADGES (GLOBAL SRE LOGIC) ---------------------- */
      const anyCritical = data.some(d => this.getCpuLoadStatus(d) === 'C');
      const anyWarning = !anyCritical && data.some(d => this.getCpuLoadStatus(d) === 'W');

      this.metricLoadKeys.forEach(key => {
        this.badgesLoad[key] = {
          warning,
          critical,
          warningColor: anyWarning ? WARNING_COLOR : 'gray',
          criticalColor: anyCritical ? CRITICAL_COLOR : 'gray'
        };
      });

      this.isCpuLoadGraph = data.some(d => this.getCpuLoadStatus(d) !== '');

      /* ---------------------- SERIES ---------------------- */
      const defaultColors: { [key: string]: string } = {
        meter_vm_cpu_load1: '#7dc8feff',
        meter_vm_cpu_load5: '#7d8597',
        meter_vm_cpu_load15: '#45ba6a'
      };

      const series: Highcharts.SeriesAreasplineOptions[] =
        this.metricLoadKeys.map((key) => ({
          name: this.metricLoadMap[key],
          type: 'areaspline',
          lineWidth: 1,
          marker: {
            radius: 2,
            symbol: 'circle',
            states: {
              hover: { radius: 3, halo: { size: 4, opacity: 0.15 } }
            }
          },
          color: defaultColors[key],
          fillOpacity: 0.3,

          data: data.map(d => {
            const value = typeof d[key] === 'number' ? d[key] : null;
            if (value === null) {
              return { x: this.convertTimebucket(d.time_bucket), y: null };
            }

            let status: 'C' | 'W' | '' = '';
            let markerColor = defaultColors[key];

            /* ✅ PER-METRIC LOGIC (This is the FIX) */
            if (value >= critical) {
              status = 'C';
              markerColor = CRITICAL_COLOR;
            }
            else if (value >= warning) {
              status = 'W';
              markerColor = WARNING_COLOR;
            }

            return {
              x: this.convertTimebucket(d.time_bucket),
              y: value,
              status,
              cores: this.logicalCores,
              marker: {
                fillColor: markerColor,
                lineColor: markerColor,
                lineWidth: 1,
                radius: 2
              }
            };
          })
        }));

      /* ---------------------- DROPDOWN FOCUS ---------------------- */
      const selectedKey =
        this.chartDropdownToMetricKeyCpu[this.chartData_criteriaForCpuLoad];

      series.forEach(s => {
        if (this.chartData_criteriaForCpuLoad === 'all') {
          (s as any).lineWidth = 1.5;
          (s as any).zIndex = 5;
        }
        else if (s.name === this.metricLoadMap[selectedKey]) {
          (s as any).lineWidth = 2.5;
          (s as any).zIndex = 10;
        }
        else {
          (s as any).lineWidth = 1;
          (s as any).zIndex = 1;
          (s as any).opacity = 0.6;
        }
      });

      /* ---------------------- THEME ---------------------- */
      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim() || '#030303';
      const gridColor = styles.getPropertyValue('--border-color').trim() || '#ede8e8';
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim() || '#fff';
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim() || '#000';

      /* ---------------------- CHART OPTIONS ---------------------- */
      this.avgCpuLoadChart = {
        chart: {
          type: 'spline',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '8px' }
        },
        title: { text: undefined },
        xAxis: {
          type: 'datetime',
          crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor,
          lineColor: '#ccc',
          tickColor: '#ccc',
          tickLength: 5,
          tickWidth: 1
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: '' },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          useHTML: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          xDateFormat: '%Y-%m-%d %H:%M',
          formatter: function () {

            let tooltipHtml =
              `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/>`;

            this.points?.forEach((p: any) => {
              const point = p.point as any;

              const cores = point.cores || self.logicalCores || 1;
              const percent = point.y != null ? (point.y / cores) * 100 : 0;

              const statusColor =
                point.status === 'C'
                  ? 'red'
                  : point.status === 'W'
                    ? 'orange'
                    : '';

              tooltipHtml +=
                `<span style="color:${p.series.color}">\u25CF</span> ` +
                `${p.series.name}: ${point.y?.toFixed(2)} ` +
                `<span style="color:#666;">(${percent.toFixed(1)}%)</span> ` +
                `${point.status ? `<span style="color:${statusColor}">(${point.status})</span>` : ''}<br/>`;
            });

            return tooltipHtml;
          }
        },

        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };

      /* ---------------------- UPDATE ---------------------- */
      if (!this.cpuLoadChartInstance) {
        this.cpuLoadChartInstance = Highcharts.chart('avgCpuLoadChart', this.avgCpuLoadChart);
        (this.cpuLoadChartInstance as any).logicalCores = this.logicalCores;
      } else {
        this.cpuLoadChartInstance.update(this.avgCpuLoadChart!, true, true);
        (this.cpuLoadChartInstance as any).logicalCores = this.logicalCores;
      }

      this.chartValuesCpuLoad = this.getSelectedMetricValuesCpuLoad(data);

    } catch (e) {
      console.error('Error in CPU Load Chart', e);
    }
  }

  getCpuLoadStatus(d: any): '' | 'W' | 'C' {
    const load1 = d.meter_vm_cpu_load1 ?? 0;
    const load5 = d.meter_vm_cpu_load5 ?? 0;
    const load15 = d.meter_vm_cpu_load15 ?? 0;

    const warning = this.logicalCores * 0.75;
    const critical = this.logicalCores * 1.0;

    // 🔴 CRITICAL (sustained)
    if (
      load15 >= critical ||
      (load5 >= critical && load15 >= warning)
    ) {
      return 'C';
    }

    // 🟠 WARNING (medium sustained)
    if (
      load5 >= warning &&
      load1 >= warning
    ) {
      return 'W';
    }

    return '';
  }

  getFileSystemMountpointUsage(): void {
    this.infraService.getFileSystemMountpointUsage(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.chartFileSystemMountpointUsage(data);
      this.fileSystemChartInstance = Highcharts.chart('fileSystemMountpointUsageChart', this.fileSystemMountpointUsageChart!);
      if (!this.charts.includes(this.fileSystemChartInstance)) {
        this.charts.push(this.fileSystemChartInstance);
        this.syncCharts(this.charts);
      }
    })
  }

  chartFileSystemMountpointUsage(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket')))
      );

      if (keys.length === 0) {
        this.fileSystemMountpointUsageChart = null;
        return;
      }

      const lineColors = ['#73946B', '#3E5F44', '#8AA624', '#568F87', '#647FBC', '#556B2F'];
      const warningColor = '#ff9900';
      const criticalColor = '#cc0000';

      const series: Highcharts.SeriesLineOptions[] = keys.map((key, index) => {
        const baseColor = lineColors[index % lineColors.length];

        return {
          name: key,
          data: data.map(d => {
            const yVal = typeof d[key] === 'number' ? d[key] : null;

            let status = '';
            if (yVal !== null) {
              if (yVal >= 90) status = 'C';
              else if (yVal >= 80) status = 'W';
            }

            return {
              x: this.convertTimebucket(d.time_bucket),
              y: yVal,
              status: status,
              marker: {
                enabled: true,
                radius: 2,
                fillColor:
                  yVal !== null
                    ? yVal >= 90
                      ? criticalColor
                      : yVal >= 80
                        ? warningColor
                        : baseColor
                    : undefined
              }
            };
          }),
          type: 'line',
          color: baseColor,
          marker: { symbol: 'circle', radius: 1 },
          lineWidth: 1
        };
      });

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--border-color').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const self = this;

      this.fileSystemMountpointUsageChart = {

        chart: {
          type: 'spline',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '8px' }
        },

        plotOptions: {
          series: {
            stickyTracking: true,
            point: {
              events: {
                click: function (e: Highcharts.PointClickEventObject) {
                  self.openFsPinnedTooltip(this, e);
                }
              }
            }
          }
        },

        title: { text: undefined },

        xAxis: {
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'ShortDot'
          },
          type: 'datetime',
          title: { text: undefined },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor,
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 5,
          tickWidth: 1
        },

        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: undefined },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor
        },

        // normal hover tooltip, with scroll
        tooltip: {
          enabled: true,
          shared: true,
          useHTML: true,
          backgroundColor: tooltipBgColor,
          borderRadius: 8,
          style: {
            color: tooltipTextColor,
            fontSize: '10px'
          },
          formatter: function () {
            let tooltipHtml = `
        <div style="max-height:180px; overflow-y:auto; min-width:100px; padding-right:6px">
        <b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x as number)}</b><br/>`;

            this.points?.forEach(p => {
              const point: any = p;

              let statusColor = '';
              if (point.status === 'C') statusColor = criticalColor;
              else if (point.status === 'W') statusColor = warningColor;

              tooltipHtml += `
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="color:${p.series.color}">\u25CF</span>
            <span>${p.series.name}: ${p.y}</span>
            ${point.status ? `<span style="color:${statusColor}">(${point.status})</span>` : ''}
          </div>
        `;
            });

            return tooltipHtml + '</div>';
          }
        },

        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };


      // create chart
      this.fileSystemChartInstance = Highcharts.chart('fileSystemMountpointUsageChart', this.fileSystemMountpointUsageChart);

      // ✅ Unlock when leaving tooltip
      document.addEventListener('mousemove', (e: any) => {
        if (!self.tooltipLocked) return;

        const tooltip = document.querySelector('.scrollable-tooltip');

        // when leaving tooltip -> unlock
        if (!tooltip || !tooltip.contains(e.target as Node)) {

          self.tooltipLocked = false;

          if (self.fileSystemChartInstance) {
            self.fileSystemChartInstance.update({
              plotOptions: {
                series: {
                  enableMouseTracking: true
                }
              }
            }, false);
          }

        }
      });


    } catch (e) {
      console.log("Error Occurred ", e);
    }
  }

  openFsPinnedTooltip(point: Highcharts.Point, e: Highcharts.PointClickEventObject) {
    if (!this.fileSystemChartInstance) return;

    const xVal = point.x as number;
    const timeStr = Highcharts.dateFormat('%Y-%m-%d %H:%M', xVal);

    // Build content similar to normal tooltip
    let html = `<b>${timeStr}</b><br/>`;

    const chart = this.fileSystemChartInstance;
    chart.series.forEach(s => {
      const pAtX = s.points.find(pt => pt.x === xVal);
      if (!pAtX || pAtX.y === null) return;

      const p: any = pAtX;
      let statusColor = '';
      if (p.status === 'C') statusColor = '#cc0000';
      else if (p.status === 'W') statusColor = '#ff9900';

      html += `
        <div style="display:flex;align-items:center;">
          <span style="color:${s.color}">\u25CF</span>
          <span>${s.name}: ${pAtX.y}</span>
          ${p.status ? `<span style="color:${statusColor}">(${p.status})</span>` : ''}
        </div>
      `;
    });

    this.fsPinnedTooltipHtml = html;

    // ===============================
    //  GAP-FREE POSITIONING
    // ===============================

    const graphic = (point as any).graphic?.getBBox?.();
    if (!graphic) return;

    // Exact marker position in chart (px)
    const pointX = chart.plotLeft + graphic.x + graphic.width / 2;
    const pointY = chart.plotTop + graphic.y + graphic.height / 2;

    // Tooltip size (match CSS max)
    const tooltipWidth = 400;
    const tooltipHeight = 150;
    const offset = 6; // distance from point

    // Plot area bounds (inside chart)
    const plotLeft = chart.plotLeft;
    const plotRight = chart.plotLeft + chart.plotWidth;
    const plotTop = chart.plotTop;
    const plotBottom = chart.plotTop + chart.plotHeight;

    // 👉 Default: open to the RIGHT of the point
    let left = pointX + offset;

    // If that overflows the right edge → open to the LEFT of the point
    if (left + tooltipWidth > plotRight) {
      left = pointX - tooltipWidth - offset;
    }

    // Ensure we never go beyond the left edge of plot area
    if (left < plotLeft) {
      left = plotLeft;
    }

    // Vertically: center on the point
    let top = pointY - tooltipHeight / 2;

    // Clamp vertically inside plot area
    if (top < plotTop) {
      top = plotTop;
    }
    if (top + tooltipHeight > plotBottom) {
      top = plotBottom - tooltipHeight;
    }

    this.fsPinnedTooltipPosition = { left, top };
    this.fsPinnedTooltipVisible = true;

    // Disable native hover tooltip while pinned
    chart.update({ tooltip: { enabled: false } }, false);
    chart.redraw();
  }

  closeFsPinnedTooltip() {
    if (!this.fileSystemChartInstance) {
      this.fsPinnedTooltipVisible = false;
      return;
    }

    this.fsPinnedTooltipVisible = false;

    // re-enable normal hover tooltips
    this.fileSystemChartInstance.update({ tooltip: { enabled: true } }, false);
    this.fileSystemChartInstance.redraw();
  }

  getFilefdAllocated(): void {
    this.infraService.getFilefdAllocated(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.chartFilefdAllocated(data);
      this.fileFdChartInstance = Highcharts.chart('filefdAllocatedChart', this.filefdAllocatedChart!);
      if (!this.charts.includes(this.fileFdChartInstance)) {
        this.charts.push(this.fileFdChartInstance);
        this.syncCharts(this.charts);
      }
    })
  }

  chartFilefdAllocated(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket'))
        )
      );

      if (keys.length === 0) {
        this.filefdAllocatedChart = null;
        return;
      }

      const keyMap: { [key: string]: string } = {
        meter_vm_filefd_allocated: 'filefd_allocated'
      };

      const keysToDisplay = Object.keys(keyMap);

      const series: Highcharts.SeriesAreasplineOptions[] = keysToDisplay.map(key => ({
        name: keyMap[key],
        data: data.map(d => ({
          x: this.convertTimebucket(d.time_bucket),
          y: typeof d[key] === 'number' ? d[key] : null
        })),
        type: 'areaspline',
        marker: { radius: 2 },
        color: '#7dc8feff',
        fillOpacity: 0.3,
        lineWidth: 1
      }));

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--border-color').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      this.filefdAllocatedChart = {
        chart: {
          type: 'area',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '8px' }
        },
        title: { text: undefined },
        xAxis: {
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'ShortDot'
          },
          type: 'datetime',
          title: { text: undefined },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor,
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 5,
          tickWidth: 1,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: undefined },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          xDateFormat: '%Y-%m-%d %H:%M'
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };
      Highcharts.chart('filefdAllocatedChart', this.filefdAllocatedChart!);
    } catch (e) {
      console.log("Error Occurred ", e);
    }
  }

  getDiskSpaceChart(): void {
    this.infraService.getDiskReadWrite(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.chartDiskReadWrite(data);

    })
  }

  chartdiskSpace(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket'))
        )
      );

      if (keys.length === 0) {
        this.diskSpaceChart = null;
        return;
      }

      const series: Highcharts.SeriesSplineOptions[] = keys.map(key => ({
        name: key,
        data: data.map(d => ({
          x: this.convertTimebucket(d.time_bucket),
          y: typeof d[key] === 'number' ? d[key] : null
        })),
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 2
      }));

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--border-color').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      this.diskSpaceChart = {
        chart: {
          type: 'area',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '9px' }
        },
        title: { text: undefined },
        xAxis: {
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'ShortDot'
          },
          type: 'datetime',
          title: { text: undefined },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor,
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 5,
          tickWidth: 1,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: undefined },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          xDateFormat: '%Y-%m-%d %H:%M'
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };
      Highcharts.chart('diskSpaceChart', this.diskSpaceChart!);
    } catch (e) {
      console.log("Error Occurred ", e);
    }
  }

  getDiskReadWrite(): void {
    this.infraService.getDiskReadWrite(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.chartDiskReadWrite(data);
      this.diskReadWriteChartInstance = Highcharts.chart('diskReadWriteChart', this.diskReadWriteChart!);
      if (!this.charts.includes(this.diskReadWriteChartInstance)) {
        this.charts.push(this.diskReadWriteChartInstance);
        this.syncCharts(this.charts);
      }
    })
  }

  chartDiskReadWrite(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket'))
        )
      );

      if (keys.length === 0) {
        this.diskReadWriteChart = null;
        return;
      }

      const keyMap: { [key: string]: string } = {
        meter_vm_disk_read: 'disk_read',
        meter_vm_disk_written: 'disk_written'
      };

      const keysToDisplay = Object.keys(keyMap);

      const defaultColors: { [key: string]: string } = {
        meter_vm_disk_read: '#f3fd3cff',
        meter_vm_disk_written: '#FD8D3C'
      };

      const series: Highcharts.SeriesAreasplineOptions[] = keysToDisplay.map(key => ({
        name: keyMap[key],
        data: data.map(d => ({
          x: this.convertTimebucket(d.time_bucket),
          y: typeof d[key] === 'number' ? d[key] : null
        })),
        type: 'areaspline',
        marker: { radius: 2 },
        color: defaultColors[key],
        fillOpacity: 0.3,
        lineWidth: 1
      }));

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--border-color').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      this.diskReadWriteChart = {
        chart: {
          type: 'area',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '8px' }
        },
        title: { text: undefined },
        xAxis: {
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'ShortDot'
          },
          type: 'datetime',
          title: { text: undefined },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor,
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 5,
          tickWidth: 1,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: undefined },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          xDateFormat: '%Y-%m-%d %H:%M'
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };
      Highcharts.chart('diskReadWriteChart', this.diskReadWriteChart!);
    } catch (e) {
      console.log("Error Occurred ", e);
    }
  }

  getNetworkBandwidthUsage(): void {
    this.infraService.getNetworkBandwidthUsage(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      // this.lastNetworkData = data;
      // console.log("LAST NETWORK DATA:", this.lastNetworkData[this.lastNetworkData.length - 1]);

      let validData = [...data];
      while (
        validData.length > 0 &&
        Object.keys(validData[validData.length - 1]).length === 1 &&
        validData[validData.length - 1].hasOwnProperty('time_bucket')
      ) {
        validData.pop();
      }

      // Fallback: if all entries are empty, keep at least one to avoid crash
      if (validData.length === 0 && data.length > 0) {
        validData = [data[data.length - 1]];
      }

      this.lastNetworkData = validData;
      console.log("LAST VALID NETWORK DATA:", this.lastNetworkData[this.lastNetworkData.length - 1]);
      const lastValidTrafficData = [...data].reverse().find(d => d?.network_traffic != null);
      this.networkTrafficSpeed = lastValidTrafficData?.network_traffic ?? null;
      console.log("LAST VALID NETWORK TRAFFIC DATA:", lastValidTrafficData?.network_traffic ?? null);


      this.chartNetworkBandwidthUsage(validData);
      this.networkBandwidthChartInstance = Highcharts.chart('networkBandwidthUsageChart', this.networkBandwidthUsageChart!);
      if (!this.charts.includes(this.networkBandwidthChartInstance)) {
        this.charts.push(this.networkBandwidthChartInstance);
        this.syncCharts(this.charts);
      }
      this.getAvgNetworkSpeed();
    })
  }

  chartDropdownToMetricKeyNetwork: { [key: string]: string } = {
    all: 'all',
    receive: 'meter_vm_network_receive',
    transmit: 'meter_vm_network_transmit',
    traffic: 'network_traffic'
  };

  badgeNetworkKeys = ['meter_vm_network_receive', 'meter_vm_network_transmit', 'network_traffic'];
  networkKeyMap: { [key: string]: string } = {
    meter_vm_network_receive: 'Receive',
    meter_vm_network_transmit: 'Transmit',
    network_traffic: 'Traffic'
  };

  showNetworkBadgeDropdown = false;
  showNetworkThreshold = false;
  networkBadges: {
    [key: string]: { warning: number, critical: number, warningColor: string, criticalColor: string }
  } = {};

  toggleNetworkDropdown() {
    this.showNetworkBadgeDropdown = !this.showNetworkBadgeDropdown;
  }

  chartNetworkBandwidthUsage(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      if (!data?.length || !this.entireThreshold) {
        this.networkBandwidthUsageChart = null;
        this.isNetworkBandwidthGraph = false;
        return;
      }

      const CRITICAL_COLOR = 'red';
      const WARNING_COLOR = 'orange';

      this.badgeNetworkKeys.forEach(key => {
        let warning = Number(this.entireThreshold[key]?.warningValue ?? 0);
        let critical = Number(this.entireThreshold[key]?.criticalValue ?? 0);

        if (key === 'network_traffic') {
          const tx = this.entireThreshold['meter_vm_network_transmit'];
          const rx = this.entireThreshold['meter_vm_network_receive'];

          if (tx && rx) {
            warning = Number(tx?.warningValue ?? 0) + Number(rx?.warningValue ?? 0);
            critical = Number(tx?.criticalValue ?? 0) + Number(rx?.criticalValue ?? 0);
          }

          console.log("WARNING meter_vm_network_transmit : ", tx?.warningValue, tx?.criticalValue);
          console.log("CRITICAL meter_vm_network_receive : ", rx?.warningValue, rx?.criticalValue);
        }
        
        console.log("NETWORK BANDWIDTH WARNING CRITICAL-----------", warning, critical);

        const anyWarning = data.some(d => {
          const value = key === 'network_traffic'
            ? ((d['meter_vm_network_transmit'] ?? 0) + (d['meter_vm_network_receive'] ?? 0))
            : (d[key] ?? 0);
          return value >= warning && value < critical;
        });

        const anyCritical = data.some(d => {
          const value = key === 'network_traffic'
            ? ((d['meter_vm_network_transmit'] ?? 0) + (d['meter_vm_network_receive'] ?? 0))
            : (d[key] ?? 0);
          return value >= critical;
        });

        this.networkBadges[key] = {
          warning,
          critical,
          warningColor: anyWarning ? WARNING_COLOR : 'gray',
          criticalColor: anyCritical ? CRITICAL_COLOR : 'gray'
        };
      });

      this.isNetworkBandwidthGraph = this.badgeNetworkKeys.some(
        key => this.networkBadges[key].warningColor === WARNING_COLOR || this.networkBadges[key].criticalColor === CRITICAL_COLOR
      );

      const defaultColors: { [key: string]: string } = {
        meter_vm_network_receive: '#7dc8feff',
        meter_vm_network_transmit: '#7d8597',
        network_traffic: '#45ba6a'
      };

      const series: Highcharts.SeriesSplineOptions[] = Object.keys(this.networkKeyMap).map(key => {
        const thresholdWarning = key === 'network_traffic'
          ? (Number(this.entireThreshold['meter_vm_network_transmit']?.warningValue ?? 0) + Number(this.entireThreshold['meter_vm_network_receive']?.warningValue ?? 0))
          : Number(this.entireThreshold[key]?.warningValue ?? 0);

        const thresholdCritical = key === 'network_traffic'
          ? (Number(this.entireThreshold['meter_vm_network_transmit']?.criticalValue ?? 0) + Number(this.entireThreshold['meter_vm_network_receive']?.criticalValue ?? 0))
          : Number(this.entireThreshold[key]?.criticalValue ?? 0);

        return {
          name: this.networkKeyMap[key],
          type: 'spline',
          lineWidth: 1,
          color: defaultColors[key],
          marker: { radius: 2 },
          data: data.map(d => {
            const rawValue = key === 'network_traffic'
              ? ((d['meter_vm_network_transmit'] ?? 0) + (d['meter_vm_network_receive'] ?? 0))
              : (d[key] ?? 0);

            const hasValue = key === 'network_traffic'
              ? (d['meter_vm_network_transmit'] != null || d['meter_vm_network_receive'] != null)
              : (d[key] != null);

            // For plotting, use null if no value exists
            const plotValue = hasValue ? rawValue : null;

            let status: 'C' | 'W' | '' = '';
            let markerColor = defaultColors[key];
            let markerRadius = 2;

            // Force LOW direction for network bandwidth (exceeding threshold is bad)
            const direction = 'LOW';

            if (hasValue && thresholdCritical > 0) {
              const isCritical = direction === 'LOW'
                ? rawValue >= thresholdCritical
                : rawValue <= thresholdCritical;

              const isWarning = direction === 'LOW'
                ? rawValue >= thresholdWarning
                : rawValue <= thresholdWarning;

              if (isCritical) {
                status = 'C';
                markerColor = CRITICAL_COLOR;
              } else if (isWarning) {
                status = 'W';
                markerColor = WARNING_COLOR;
              }
            }


            // if (hasValue && thresholdCritical && rawValue >= thresholdCritical) {
            //   status = 'C';
            //   markerColor = CRITICAL_COLOR;
            // } else if (hasValue && thresholdWarning && rawValue >= thresholdWarning) {
            //   status = 'W';
            //   markerColor = WARNING_COLOR;
            // }

            return {
              x: this.convertTimebucket(d.time_bucket),
              y: plotValue, // 👈 Use null here only for graph plotting
              status,
              marker: { fillColor: markerColor, lineColor: markerColor, lineWidth: 1, radius: markerRadius }
            };
          })

        };
      });

      const selectedKey = this.chartDropdownToMetricKeyNetwork[this.chartData_criteriaForNetworkBandwidth];
      series.forEach(s => {
        const seriesKey = Object.keys(this.networkKeyMap).find(k => this.networkKeyMap[k] === s.name);
        if (!seriesKey) return;

        if (this.chartData_criteriaForNetworkBandwidth === 'all') {
          (s as any).lineWidth = 1.5;
          (s as any).zIndex = 5;
          (s as any).opacity = 1;
        } else if (seriesKey === selectedKey) {
          (s as any).lineWidth = 2.5;
          (s as any).zIndex = 10;
          (s as any).opacity = 1;
        } else {
          (s as any).lineWidth = 1;
          (s as any).zIndex = 1;
          (s as any).opacity = 0.6;
        }
      });

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim() || '#333';
      const gridColor = styles.getPropertyValue('--border-color').trim() || '#ddd';
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim() || '#fff';
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim() || '#000';

      this.networkBandwidthUsageChart = {
        chart: { type: 'line', backgroundColor: 'transparent', spacing: [5, 5, 5, 5], style: { fontSize: '8px' } },
        title: { text: undefined },
        xAxis: {
          type: 'datetime',
          crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor,
          lineColor: '#ccc',
          tickColor: '#ccc',
          tickLength: 5,
          tickWidth: 1
        },
        yAxis: { min: 0, tickAmount: 6, title: { text: '' }, labels: { style: { color: labelColor, fontSize: '8px' } }, gridLineColor: gridColor },
        tooltip: {
          shared: true,
          useHTML: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          xDateFormat: '%Y-%m-%d %H:%M',
          formatter: function () {
            let tooltipHtml = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/>`;
            this.points?.forEach((p: any) => {
              const point = p.point as any;
              const statusColor = point.status === 'C' ? CRITICAL_COLOR : (point.status === 'W' ? WARNING_COLOR : '');
              tooltipHtml += `<span style="color:${p.series.color}">\u25CF</span> ${p.series.name}: ${point.y?.toFixed(2)} ${point.status ? `<span style="color:${statusColor}">(${point.status})</span>` : ''}<br/>`;
            });
            return tooltipHtml;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };

      if (!this.networkBandwidthChartInstance) {
        this.networkBandwidthChartInstance = Highcharts.chart('networkBandwidthUsageChart', this.networkBandwidthUsageChart);
      } else {
        this.networkBandwidthChartInstance.update(this.networkBandwidthUsageChart, true, true);
      }

      this.chartValuesNetworkBandwidth = this.getSelectedMetricValuesNetwork(data);

    } catch (e) {
      console.error("Error in Network Bandwidth Chart", e);
      this.isNetworkBandwidthGraph = false;
    }
  }

  getNetworkStatus(): void {
    this.infraService.getNetworkStatus(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.chartNetworkStatus(data);
      if (!this.networkStatusChart) {
        return;
      }
      this.networkStatusChartInstance = Highcharts.chart('networkStatusChart', this.networkStatusChart!);
      if (!this.charts.includes(this.networkStatusChartInstance)) {
        this.charts.push(this.networkStatusChartInstance);
        this.syncCharts(this.charts);
      }
    })
  }

  chartNetworkStatus(data: { time_bucket: string;[key: string]: any }[]): void {
    try {

      if (!Array.isArray(data)) {
        console.warn('chartNetworkStatus expected array, got:', data);
        this.networkStatusChart = null;
        return;
      }

      if (data.length === 0) {
        this.networkStatusChart = null;
        return;
      }
      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket'))
        )
      );

      if (keys.length === 0) {
        this.networkStatusChart = null;
        return;
      }

      const keyMap: { [key: string]: string } = {
        meter_vm_tcp_curr_estab: 'tcp_curr_estab',
        meter_vm_sockets_used: 'sockets_used',
        meter_vm_tcp_tw: 'tcp_tw',
        meter_vm_tcp_alloc: 'tcp_alloc',
        meter_vm_udp_inuse: 'udp_inuse'
      };

      const keysToDisplay = Object.keys(keyMap);

      const colorMap: { [key: string]: string } = {
        meter_vm_tcp_curr_estab: '#00798c',
        meter_vm_sockets_used: '#70a288',
        meter_vm_tcp_tw: '#76c893',
        meter_vm_tcp_alloc: '#7d8597',
        meter_vm_udp_inuse: '#45ba6a'
      };

      // const series: Highcharts.SeriesSplineOptions[] = keysToDisplay.map(key => ({
      //   name: keyMap[key],
      //   color: colorMap[key] || undefined,
      //   data: data.map(d => ({
      //     x: this.convertTimebucket(d.time_bucket),
      //     y: typeof d[key] === 'number' ? d[key] : null
      //   })),
      //   type: 'spline',
      //   marker: { radius: 2 },
      //   lineWidth: 1
      // }));

      const series: Highcharts.SeriesSplineOptions[] = keysToDisplay.map(key => ({
        name: keyMap[key],
        color: colorMap[key] || undefined,
        data: data.map(d => {
          // safe convertTimebucket call: guard undefined time_bucket
          const ts = d && d.time_bucket !== undefined ? this.convertTimebucket(d.time_bucket) : Date.now();
          return {
            x: ts,
            y: typeof d[key] === 'number' ? d[key] : null
          };
        }),
        type: 'spline',
        marker: { radius: 2 },
        lineWidth: 1
      }));

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--border-color').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      this.networkStatusChart = {
        chart: {
          type: 'spline',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '8px' }
        },
        title: { text: undefined },
        xAxis: {
          crosshair: {
            width: 2,
            color: 'blue',
            dashStyle: 'ShortDot'
          },
          type: 'datetime',
          title: { text: undefined },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor,
          lineColor: '#cccccc',
          tickColor: '#cccccc',
          tickLength: 5,
          tickWidth: 1,
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: undefined },
          labels: { style: { color: labelColor, fontSize: '8px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          xDateFormat: '%Y-%m-%d %H:%M'
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };

      // Highcharts.chart('networkStatusChart', this.networkStatusChart!);
    } catch (e) {
      console.log("Error Occurred ", e);
      this.networkStatusChart = null;
    }
  }

  getDiscSpace(): void {
    this.infraService.getDiscSpace(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {

        this.discSpaceLists = Object.values(data).map((item: any) => {
          const used = Number(item['used']?.trim());
          const total = Number(item['total']?.trim());
          const free = Number(item['free']?.trim());
          const name = item.name?.trim();

          const usedPercent = total > 0 ? Math.round((used / total) * 100) : 0;
          const freePercent = 100 - usedPercent;

          if (name === '/' || name?.startsWith('/ ')) {
            this.diskPartitionPercent = usedPercent;
          }

          return {
            name,
            free,
            used,
            total,
            usedPercent,
            freePercent
          };
        });
        this.updateDiskData();
      });
  }

  itemsPerPageDisk: number = 8;
  currentPageDisk: number = 1;
  totalPagesDisk: number = 0;

  discSpaceLists: any[] = [];         // raw API data
  filteredDiscSpaceList: any[] = [];  // after search/sort
  pagedDiscSpaceList: any[] = [];     // current page
  diskUsageThreshold: any = { warningValue: 0, criticalValue: 0 };

  searchTermDisk: string = '';
  sortColumnDisk: string = '';
  sortDirectionDisk: 'asc' | 'desc' = 'asc';

  updateDiskData(): void {
    this.filteredDiscSpaceList = [...this.discSpaceLists];
    this.onSearchDisk();
    this.onSortDisk();
    this.calculatePaginationDisk();
  }

  onSearchDisk(): void {
    const term = this.searchTermDisk.toLowerCase();
    this.filteredDiscSpaceList = this.discSpaceLists.filter(item =>
      item.name?.toLowerCase().includes(term) ||
      item.used?.toString().includes(term) ||
      item.free?.toString().includes(term) ||
      item.total?.toString().includes(term)
    );
    this.currentPageDisk = 1;
    this.calculatePaginationDisk();
  }


  onSortDisk(): void {
    if (!this.sortColumnDisk) return;
    this.filteredDiscSpaceList.sort((a, b) => {
      const valA = a[this.sortColumnDisk];
      const valB = b[this.sortColumnDisk];

      if (valA < valB) return this.sortDirectionDisk === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirectionDisk === 'asc' ? 1 : -1;
      return 0;
    });
  }

  setDiskSort(column: string): void {
    if (this.sortColumnDisk === column) {
      this.sortDirectionDisk = this.sortDirectionDisk === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumnDisk = column;
      this.sortDirectionDisk = 'asc';
    }
    this.onSortDisk();
    this.calculatePaginationDisk();
  }

  calculatePaginationDisk(): void {
    this.totalPagesDisk = Math.ceil(this.filteredDiscSpaceList.length / this.itemsPerPageDisk);
    this.pagedDiscSpaceList = this.filteredDiscSpaceList.slice(
      (this.currentPageDisk - 1) * this.itemsPerPageDisk,
      this.currentPageDisk * this.itemsPerPageDisk
    );
  }


  previousPageDisk(): void {
    if (this.currentPageDisk > 1) {
      this.currentPageDisk--;
      this.calculatePaginationDisk();
    }
  }

  nextPageDisk(): void {
    if (this.currentPageDisk < this.totalPagesDisk) {
      this.currentPageDisk++;
      this.calculatePaginationDisk();
    }
  }

  goToPageDisk(page: number): void {
    this.currentPageDisk = page;
    this.calculatePaginationDisk();
  }

  get startIndexDisk(): number {
    return ((this.currentPageDisk - 1) * this.itemsPerPageDisk) + 1;
  }

  get endIndexDisk(): number {
    return Math.min(this.currentPageDisk * this.itemsPerPageDisk, this.discSpaceLists.length);
  }

  getDiscSpaceThreshold(): void {
    this.thresholdService.getThresholdByMetric(this.serviceId, 'HOST', 'meter_vm_disk_usage_percentage', this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.diskUsageThreshold = data
        console.log("Threshold for disk: ", this.diskUsageThreshold);
      });
  }

  getAvgNetworkSpeed(): void {
    console.log("THIS.AVGNETWORKSPEED:", this.networkTrafficSpeed);
    console.log("UNIT:", this.networkSpeedUnit);

    if (this.networkTrafficSpeed) {
      switch (this.networkSpeedUnit) {
        case 'KBps': this.avgNetworkSpeed = this.networkTrafficSpeed;
          break;

        case 'MBps': this.avgNetworkSpeed = this.networkTrafficSpeed / 1000;
          break;
        case 'GBps': this.avgNetworkSpeed = this.networkTrafficSpeed / 1000000;
          break;

        default: this.avgNetworkSpeed = this.networkTrafficSpeed;
          break;
      }
    }
  }

  getThreshold(type: string) {
    this.componentId = this.serviceId;

    const payload = {
      appId: this.ipAddrId,
      serviceId: this.componentId,
      st: this.thresholdst,
      et: this.endTime,
      type: "LINUX"
    };

    this.meteringConfigService.getThreshold(payload)
      .subscribe(res => {
        this.thresholds = res;
        this.entireThreshold = res;
        console.log("Threshold: ", res);
        this.cpuUsageThreshold = res["meter_vm_cpu_total_percentage"];
        this.memorySwapThreshold = res["meter_vm_memory_swap_percentage"];
        this.memorySwapFreeThreshold = res["meter_vm_memory_swap_free"];
        this.memorySwapTotalThreshold = res["meter_vm_memory_swap_total"];
        this.memoryRamThreshold = res["meter_vm_memory_used"];
        this.loadAverageThreshold = res["meter_vm_cpu_load5"];
        // this.cpuUsage = 183;
        this.cpuUsageColor = this.getThresholdColor(this.cpuUsageThreshold, this.cpuUsage);
        this.avgBaselineCpuUsage = this.cpuUsageThreshold.avgBaseline;
        if (this.cpuUsage < this.cpuUsageThreshold?.warningValue) {
          this.cpuUsageBadge = this.cpuUsageThreshold?.warningValue;
          this.cpuUsageBadgeColor = 'orange';
        } else {
          this.cpuUsageBadge = this.cpuUsageThreshold.criticalValue;
          this.cpuUsageBadgeColor = 'red';
        }

        // this.memoryRamUsage = 15.15;
        this.memoryRamColor = this.getThresholdColor(this.memoryRamThreshold, this.memoryRamUsage);
        this.avgBaselineMemoryRam = this.memoryRamThreshold.avgBaseline;
        if (this.memoryRamUsage < this.memoryRamThreshold?.warningValue) {
          this.memoryRamBadge = this.memoryRamThreshold?.warningValue;
          this.memoryRamBadgeColor = 'orange';
        } else {
          this.memoryRamBadge = this.memoryRamThreshold.criticalValue;
          this.memoryRamBadgeColor = 'red';
        }

        // this.memorySwapUsage = 80.27;
        this.memorySwapColor = this.getThresholdColor(this.memorySwapThreshold, this.memorySwapUsage);
        this.avgBaselineMemorySwap = this.memorySwapThreshold?.avgBaseline;
        if (this.memorySwapUsage < this.memorySwapThreshold?.warningValue) {
          this.memorySwapBadge = this.memorySwapThreshold?.warningValue;
          this.memorySwapBadgeColor = 'orange';
        } else {
          this.memorySwapBadge = this.memorySwapThreshold.criticalValue;
          this.memorySwapBadgeColor = 'red';
        }

        // this.loadAverage = 1276.21;
        this.loadAverageColor = this.getThresholdColor(this.loadAverageThreshold, this.loadAverage);
        this.avgBaselineCpuLoad = this.loadAverageThreshold.avgBaseline;
        if (this.loadAverage < this.loadAverageThreshold.warningValue) {
          this.cpuLoadBadge = this.loadAverageThreshold.warningValue;
          this.cpuLoadBadgeColor = 'orange';
        } else {
          this.cpuLoadBadge = this.loadAverageThreshold.criticalValue;
          this.cpuLoadBadgeColor = 'red';
        }
        // this.calculateVisibilityForGraphs();

        // this.getMemoryRam();
        // this.getMemorySwap();
        // this.getAvgCpuUsage();
        // this.getCpuLoad();
        // this.getNetworkBandwidthUsage();
      });
  }

  getThresholdColor(metric: any, value: any): string {
    if (!metric || value == null) return 'green';

    const numericValue = Number(value);

    if (numericValue >= metric.criticalValue) {
      return 'red';
    } else if (numericValue >= metric.warningValue) {
      return 'orange';
    }
    return 'green';
  }

  updateChartVisibility(metric: any) {

    if (metric === 'MemoryRam') {
      if (!this.memoryRamChartInstance) return;

      const selectedMetricKey = this.chartDropdownToMetricKey[this.chartData_criteriaForMemoryRam];

      // ✅ Get valid total
      const lastRecord = [...(this.lastMemoryData || [])].reverse()
        .find(d => typeof d?.['meter_vm_memory_total'] === 'number' && d['meter_vm_memory_total'] > 0);

      const total = lastRecord?.['meter_vm_memory_total'] || 0;

      // ✅ THRESHOLD MODE
      if (this.chart_criteriaForMemoryRam === 'threshold' && total) {

        if (this.chartData_criteriaForMemoryRam === 'available') {
          this.chartValuesRam = {
            warning: total * 0.20,
            critical: total * 0.10
          };
        }

        else if (this.chartData_criteriaForMemoryRam === 'used') {
          this.chartValuesRam = {
            warning: total * 0.80,
            critical: total * 0.90
          };
        }

        else {
          this.chartValuesRam = {};
        }

      }
      // ✅ AVG MODE
      else {
        this.chartValuesRam = this.getSelectedMetricValues(this.lastMemoryData || []);
      }
      this.memoryRamChartInstance.series.forEach(series => {

        const seriesKey = Object.keys(this.metricMap)
          .find(k => this.metricMap[k] === series.name);

        if (!seriesKey) return;

        const baseColor = this.getSeriesColor(seriesKey);

        // Highlight only selected series
        if (this.chartData_criteriaForMemoryRam === 'all') {
          series.update({
            lineWidth: 1.5,
            zIndex: 5
          } as any, false);
        } else {
          const isSelected = seriesKey === selectedMetricKey;

          series.update({
            lineWidth: isSelected ? 2.5 : 1,
            zIndex: isSelected ? 10 : 1,
            opacity: isSelected ? 1 : 0.6
          } as any, false);
        }

        // ✅ THIS REFRESHES MARKERS
        series.points.forEach((p: any) => {

          let markerColor = this.getSeriesColor(seriesKey);

          if (p.status === 'C') markerColor = 'red';
          else if (p.status === 'W') markerColor = 'orange';

          p.update({
            marker: {
              fillColor: markerColor,
              lineColor: markerColor
            }
          }, false);
        });

      });

      this.memoryRamChartInstance.redraw();

    }
    else if (metric === 'MemorySwap') {
      if (!this.memorySwapChartInstance) return;

      if (this.chartData_criteriaForMemorySwap === 'totalSwap') {
        this.chart_criteriaForMemorySwap = 'avg';
      }

      this.chartValuesSwap = this.getSelectedMetricValuesSwap(this.lastSwapData || []);
      const selectedMetricKey = this.chartDropdownToMetricKeySwap[this.chartData_criteriaForMemorySwap];

      this.memorySwapChartInstance.series.forEach(series => {
        const seriesKey = Object.keys(this.swapMetricMap).find(k => this.swapMetricMap[k] === series.name);
        if (!seriesKey) return;

        const baseColor = this.getSeriesColor(seriesKey);

        if (this.chartData_criteriaForMemorySwap === 'all') {
          series.update({ lineWidth: 1.5, zIndex: 5, color: baseColor } as any, false);
        } else {
          const isSelected = seriesKey === selectedMetricKey;
          series.update({ lineWidth: isSelected ? 2.5 : 1, zIndex: isSelected ? 10 : 1, color: baseColor } as any, false);
        }

        series.points.forEach((p: any) => {
          let markerColor: string;

          if (p.status === 'C') markerColor = 'red';
          else if (p.status === 'W') markerColor = 'orange';
          else markerColor = this.getSeriesColor(seriesKey);

          p.update({
            marker: {
              fillColor: markerColor,
              lineColor: markerColor,
              radius: p.status ? 2 : 2
            }
          }, false);
        });
      });

      this.memorySwapChartInstance.redraw();
    }
    else if (metric === 'CpuLoad') {
      if (!this.cpuLoadChartInstance) return;

      this.chartValuesCpuLoad = this.getSelectedMetricValuesCpuLoad(this.lastCpuData || []);
      const selectedKey = this.chartDropdownToMetricKeyCpu[this.chartData_criteriaForCpuLoad];

      this.cpuLoadChartInstance.series.forEach(series => {
        const seriesKey = Object.keys(this.metricLoadMap).find(k => this.metricLoadMap[k] === series.name);
        if (!seriesKey) return;

        const baseColor = this.getSeriesColor(seriesKey);

        if (this.chartData_criteriaForCpuLoad === 'all') {
          series.update({ lineWidth: 1.5, zIndex: 5, color: baseColor } as any, false);
        } else {
          const isSelected = seriesKey === selectedKey;
          series.update({ lineWidth: isSelected ? 2.5 : 1, zIndex: isSelected ? 10 : 1, color: baseColor, opacity: isSelected ? 1 : 0.6 } as any, false);
        }

        series.points.forEach((p: any) => {
          let markerColor: string = baseColor;
          if (p.status === 'C') markerColor = 'red';
          else if (p.status === 'W') markerColor = 'orange';

          p.update({ marker: { fillColor: markerColor, lineColor: markerColor, radius: p.status ? 2 : 2 } }, false);
        });
      });

      this.cpuLoadChartInstance.redraw();
    }
    else if (metric === 'NetworkBandwidth') {
      if (!this.networkBandwidthChartInstance) return;

      this.chartValuesNetworkBandwidth = this.getSelectedMetricValuesNetwork(this.lastNetworkData || []);
      const selectedKey = this.chartDropdownToMetricKeyNetwork[this.chartData_criteriaForNetworkBandwidth];

      this.networkBandwidthChartInstance.series.forEach(series => {
        const seriesKey = Object.keys(this.networkKeyMap).find(k => this.networkKeyMap[k] === series.name);
        if (!seriesKey) return;

        const baseColor = this.getSeriesColor(seriesKey);

        if (this.chartData_criteriaForNetworkBandwidth === 'all') {
          series.update({ lineWidth: 1.5, zIndex: 5, color: baseColor, opacity: 1 } as any, false);
        } else {
          const isSelected = seriesKey === selectedKey;
          series.update({ lineWidth: isSelected ? 2.5 : 1, zIndex: isSelected ? 10 : 1, color: baseColor, opacity: isSelected ? 1 : 0.6 } as any, false);
        }

        series.points.forEach((p: any) => {
          let markerColor: string = baseColor;
          if (p.status === 'C') markerColor = 'red';
          else if (p.status === 'W') markerColor = 'orange';

          p.update({ marker: { fillColor: markerColor, lineColor: markerColor, radius: p.status ? 2 : 2 } }, false);
        });
      });

      this.networkBandwidthChartInstance.redraw();
    }

  }


  getSeriesColor(key: string): string {
    const defaultColors: { [key: string]: string } = {
      meter_vm_memory_total: '#1f77b4',
      meter_vm_memory_available: '#2ca02c',
      meter_vm_memory_buff_cache: '#416605',
      meter_vm_memory_used: '#7A9350',

      meter_vm_memory_swap_total: '#1f77b4',
      meter_vm_memory_swap_free: '#4a3594',
      meter_vm_memory_swap_used: '#556B2F',

      meter_vm_cpu_load1: '#1f77b4',
      meter_vm_cpu_load5: '#4e3280',
      meter_vm_cpu_load15: '#2ca02c',

      meter_vm_network_receive: '#1f77b4',
      meter_vm_network_transmit: '#9356e3',
      network_traffic: '#2ca02c'

    };
    return defaultColors[key] || '#000';
  }

  getSelectedMetricValues(
    data: { time_bucket: string;[key: string]: any }[]
  ): { avg?: number; warning?: number; critical?: number } {

    const selectedMetricKey = this.chartDropdownToMetricKey[this.chartData_criteriaForMemoryRam];
    if (!selectedMetricKey || !data || !data.length) return {};

    const values = data
      .map(d => d[selectedMetricKey])
      .filter(v => typeof v === 'number');

    if (!values.length) return {};

    // ✅ Data is already in MB
    const avgMB = values.reduce((sum, v) => sum + v, 0) / values.length;

    // Get TOTAL memory from last record
    const lastPoint = data[data.length - 1];
    const totalMB = lastPoint?.['meter_vm_memory_total'];

    if (!totalMB) {
      return { avg: avgMB };
    }

    // ---------------- AVAILABLE ----------------
    if (selectedMetricKey === 'meter_vm_memory_available') {
      return {
        avg: avgMB,
        warning: totalMB * 0.20,   // 20% of total
        critical: totalMB * 0.10   // 10% of total
      };
    }

    // ---------------- USED ----------------
    if (selectedMetricKey === 'meter_vm_memory_used') {
      return {
        avg: avgMB,
        warning: totalMB * 0.80,   // 80% of total
        critical: totalMB * 0.90   // 90% of total
      };
    }

    // ---------------- BUFF/CACHE & TOTAL ----------------
    return {
      avg: avgMB
    };
  }

  getSelectedMetricValuesSwap(data: any[]): { avg: number, warning: number, critical: number } {

    const last = [...data].reverse()
      .find(d => typeof d?.['meter_vm_memory_swap_total'] === 'number'
        && d['meter_vm_memory_swap_total'] > 0);

    const total = last?.['meter_vm_memory_swap_total'] || 0;  // MB

    if (!total) {
      return { avg: 0, warning: 0, critical: 0 };
    }

    // ✅ FREE
    if (this.chartData_criteriaForMemorySwap === 'free') {
      const values = data.map(d => d['meter_vm_memory_swap_free'] ?? 0);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;

      return {
        avg,
        warning: total * 0.30,
        critical: total * 0.10
      };
    }

    // ✅ USED
    if (this.chartData_criteriaForMemorySwap === 'usedSwap') {
      const values = data.map(d =>
        (d['meter_vm_memory_swap_total'] ?? 0) -
        (d['meter_vm_memory_swap_free'] ?? 0)
      );
      const avg = values.reduce((a, b) => a + b, 0) / values.length;

      return {
        avg,
        warning: total * 0.70,
        critical: total * 0.90
      };
    }

    // ✅ TOTAL
    if (this.chartData_criteriaForMemorySwap === 'totalSwap') {
      const values = data.map(d => d['meter_vm_memory_swap_total'] ?? 0);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;

      return { avg, warning: 0, critical: 0 };
    }

    return { avg: 0, warning: 0, critical: 0 };
  }

  getSelectedMetricValuesCpuLoad(
    data: { time_bucket: string;[key: string]: any }[]
  ): { avg?: number; warning?: number; critical?: number } {
    const selectedMetricKey =
      this.chartDropdownToMetricKeyCpu[this.chartData_criteriaForCpuLoad];
    if (!selectedMetricKey) return {};

    const values: number[] = data
      .map(d => d[selectedMetricKey])
      .filter(v => typeof v === 'number');

    if (!values.length) return {};

    // ✅ values already in %, keep as-is
    const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;

    const threshold = this.thresholds[selectedMetricKey];
    // ✅ thresholds come in "×100", divide by 100
    const warning = threshold ? threshold.warningValue / 100 : undefined;
    const critical = threshold ? threshold.criticalValue / 100 : undefined;

    return { avg: avgValue, warning, critical };
  }

  getSelectedMetricValuesNetwork(data: { time_bucket: string;[key: string]: any }[]): { avg?: number; warning?: number; critical?: number } {
    const selectedMetricKey = this.chartDropdownToMetricKeyNetwork[this.chartData_criteriaForNetworkBandwidth];
    if (!selectedMetricKey || selectedMetricKey === 'all') return {};

    const values: number[] = data.map(d => {
      if (selectedMetricKey === 'network_traffic') {
        return (d['meter_vm_network_transmit'] ?? 0) + (d['meter_vm_network_receive'] ?? 0);
      } else {
        return d[selectedMetricKey] ?? 0;
      }
    }).filter(v => typeof v === 'number');

    if (!values.length) return {};

    // Data is already in KB/s, avg should also be in KB/s
    const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;

    let thresholdWarning: number | undefined;
    let thresholdCritical: number | undefined;

    if (selectedMetricKey === 'network_traffic') {
      const tx = this.thresholds['meter_vm_network_transmit'];
      const rx = this.thresholds['meter_vm_network_receive'];
      if (tx && rx) {
        thresholdWarning = Number(tx.warningValue ?? 0) + Number(rx.warningValue ?? 0);
        thresholdCritical = Number(tx.criticalValue ?? 0) + Number(rx.criticalValue ?? 0);
      }
    } else {
      const threshold = this.thresholds[selectedMetricKey];
      thresholdWarning = threshold && threshold.warningValue != null ? Number(threshold.warningValue) : undefined;
      thresholdCritical = threshold && threshold.criticalValue != null ? Number(threshold.criticalValue) : undefined;
    }

    return { avg: avgValue, warning: thresholdWarning, critical: thresholdCritical };
  }

  isInfraThresholdsEmpty(): boolean {
    return Object.keys(this.thresholds || {}).length === 0;
  }

  // PROCESS AND SERVICES
  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.searchQuery = '';
      this.filteredProcessList = Object.keys(this.processList);
    }
  }

  onSearch(): void {
    const keys = Object.keys(this.processList);
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      this.filteredProcessList = keys.filter(key =>
        key.toLowerCase().includes(query)
      );
    } else {
      this.filteredProcessList = [...keys];
    }
    this.currentPage = 1;
    this.calculatePagination();
  }

  toggleExpand(key: string): void {
    this.isExpanded[key] = !this.isExpanded[key];
  }

  getProcess(): void {
    this.infraService.getProcess(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.processList = data;
      this.processKeys = Object.keys(this.processList);
      this.processKeys.forEach(key => { this.isExpanded[key] = false; });
      this.filteredProcessList = [...this.processKeys];
      this.calculatePagination();
    });
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredProcessList.length / this.itemsPerPage);
    this.pagedProcessList = this.filteredProcessList.slice(
      (this.currentPage - 1) * this.itemsPerPage,
      this.currentPage * this.itemsPerPage
    );
  }


  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.calculatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.calculatePagination();
    }
  }

  goToPage(page: any): void {
    this.currentPage = page;
    this.calculatePagination();
  }

  get startIndex(): number {
    return ((this.currentPage - 1) * this.itemsPerPage) + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredProcessList.length);
  }

  sortData(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredProcessList.sort((keyA, keyB) => {
      const valueA = this.getComparableValue(keyA, column);
      const valueB = this.getComparableValue(keyB, column);
      if (valueA == null || valueB == null) return 0;
      let comparison: number;
      const numA = parseFloat(valueA);
      const numB = parseFloat(valueB);
      const isNumeric = !isNaN(numA) && !isNaN(numB);

      if (isNumeric) {
        comparison = numA - numB;
      } else {
        comparison = valueA.toString().localeCompare(valueB.toString(), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.currentPage = 1;
    this.calculatePagination();
  }

  private getComparableValue(key: string, column: string): any {
    const processData = this.processList[key as any];

    if (!processData) return null;

    if (column === 'key') return key;

    if (['total_cpu_percent', 'total_memory_percent', 'currentProcessCount'].includes(column)) {
      return processData[column];
    }

    const firstProcess = processData.processes?.[0];
    if (firstProcess && column in firstProcess) {
      return firstProcess[column];
    }

    return null;
  }

  selectedCommand: string | null = null;
  openCommandModal(template: TemplateRef<any>, command: string) {
    this.selectedCommand = command;
    this.modalService.open(template, {
      backdrop: 'static',
      centered: false,
      keyboard: false,
    });
  }

  expandedCommandSet: Set<string> = new Set();
  toggleCommand(key: string, pid: number): void {
    const uniqueId = `${key}-${pid}`;
    if (this.expandedCommandSet.has(uniqueId)) {
      this.expandedCommandSet.delete(uniqueId);
    } else {
      this.expandedCommandSet.add(uniqueId);
    }
  }

  toggleSearch2(): void {
    this.showSearch2 = !this.showSearch2;
    if (!this.showSearch2) {
      this.searchQuery2 = '';
      this.filteredServiceList = [...this.serviceList];
    }
  }

  onSearch2(): void {
    if (this.searchQuery2) {
      const query = this.searchQuery2.toLowerCase();
      this.filteredServiceList = this.serviceList.filter(app =>
        app.toLowerCase().includes(query)
      );
    } else {
      this.filteredServiceList = [...this.serviceList];
    }
    this.calculatePagination2();
  }

  getservices(): void {
    this.infraService.getServices(this.serviceId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.serviceList = data;
      this.filteredServiceList = [...this.serviceList];
      this.calculatePagination2();
    });
  }

  calculatePagination2(): void {
    this.totalPages2 = Math.ceil(this.filteredServiceList.length / this.itemsPerPage2);
    this.pagedServiceList = this.filteredServiceList.slice(
      (this.currentPage2 - 1) * this.itemsPerPage2,
      this.currentPage2 * this.itemsPerPage2
    );
  }

  previousPage2(): void {
    if (this.currentPage2 > 1) {
      this.currentPage2--;
      this.calculatePagination2();
    }
  }

  nextPage2(): void {
    if (this.currentPage2 < this.totalPages2) {
      this.currentPage2++;
      this.calculatePagination2();
    }
  }

  goToPage2(page: any): void {
    this.currentPage2 = page;
    this.calculatePagination2();
  }

  get startIndex2(): number {
    return ((this.currentPage2 - 1) * this.itemsPerPage2) + 1;
  }

  get endIndex2(): number {
    return Math.min(this.currentPage2 * this.itemsPerPage2, this.serviceList.length);
  }

  formatServiceName(item: string): string {
    return item.replace(/-(active|inactive|failed|activating|deactivating)$/, '');
  }

  getRowClass(item: string): string {
    if (item.endsWith('-active')) {
      return 'text-active';
    } else if (item.endsWith('-inactive')) {
      return 'text-inactive';
    } else if (item.endsWith('-failed')) {
      return 'text-failed';
    } else if (item.endsWith('-activating')) {
      return 'text-activating';
    } else if (item.endsWith('-deactivating')) {
      return 'text-deactivating';
    } else {
      return '';
    }
  }

  getColorCodingForFilter(item: string): string {
    switch (item) {
      case 'Active':
        return 'text-active';
      case 'Inactive':
        return 'text-inactive';
      case 'Failed':
        return 'text-failed';
      case 'Activating':
        return 'text-activating';
      case 'Deactivating':
        return 'text-deactivating';
      default:
        return '';
    }
  }


  stateFilterOptions: string[] = ['Active', 'Inactive', 'Failed', 'Activating', 'Deactivating'];
  selectedStateFilters: Set<string> = new Set();

  onToggleState(state: string): void {
    if (this.selectedStateFilters.has(state)) {
      this.selectedStateFilters.delete(state);
    } else {
      this.selectedStateFilters.add(state);
    }
    this.applyCombinedFilters();
  }

  clearFilters(): void {
    this.selectedStateFilters.clear();
    this.applyCombinedFilters();
  }

  applyCombinedFilters(): void {
    const query = this.searchQuery2 ? this.searchQuery2.toLowerCase() : '';

    this.filteredServiceList = this.serviceList.filter(item => {
      const matchesQuery = !query || item.toLowerCase().includes(query);

      const matchesState = this.selectedStateFilters.size === 0 ||
        Array.from(this.selectedStateFilters).some(state => item.endsWith(`-${state.toLowerCase()}`));

      return matchesQuery && matchesState;
    });

    this.calculatePagination2();
  }

  getAlertCounts(): void {
    // Alert counts are retrieved dynamically via getCombinedData()
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

  goToProblemPage(): void {
    this.router.navigate(['/problemPage'], { queryParams: { from: 'infra' } });
  }

  goToAlertHistory(): void {
    this.router.navigate(['/alert-notification']);
  }

  applyThresholds() {
    if (this.cpuUsageThreshold && this.cpuUsage != null) {
      this.cpuUsageColor = this.getThresholdColor(this.cpuUsageThreshold, this.cpuUsage);
      if (this.cpuUsage < this.cpuUsageThreshold.warningValue) {
        this.cpuUsageBadge = this.cpuUsageThreshold.warningValue;
        this.cpuUsageBadgeColor = 'orange';
      } else {
        this.cpuUsageBadge = this.cpuUsageThreshold.criticalValue;
        this.cpuUsageBadgeColor = 'red';
      }
    }

    if (this.memoryRamThreshold && this.memoryRamUsage != null) {
      this.memoryRamColor = this.getThresholdColor(
        this.memoryRamThreshold,
        this.memoryRamUsage * (1024 * 1024 * 1024) // convert GB → bytes for comparison
      );

      if (this.memoryRamUsage * (1024 * 1024 * 1024) < this.memoryRamThreshold.warningValue) {
        this.memoryRamBadge = this.memoryRamThreshold.warningValue / (1024 * 1024 * 1024); // bytes → GB
        this.memoryRamBadgeColor = 'orange';
      } else {
        this.memoryRamBadge = this.memoryRamThreshold.criticalValue / (1024 * 1024 * 1024); // bytes → GB
        this.memoryRamBadgeColor = 'red';
      }
    }

    this.memorySwapColor = this.getThresholdColor(this.memorySwapThreshold, this.memorySwapUsage);
    this.avgBaselineMemorySwap = this.memorySwapThreshold.avgBaseline;
    if (this.memorySwapUsage < this.memorySwapThreshold.warningValue) {
      this.memorySwapBadge = this.memorySwapThreshold.warningValue;
      this.memorySwapBadgeColor = 'orange';
    } else {
      this.memorySwapBadge = this.memorySwapThreshold.criticalValue;
      this.memorySwapBadgeColor = 'red';
    }

    this.loadAverageColor = this.getThresholdColor(this.loadAverageThreshold, this.loadAverage);
    this.avgBaselineCpuLoad = this.loadAverageThreshold.avgBaseline;
    if (this.loadAverage < this.loadAverageThreshold.warningValue) {
      this.cpuLoadBadge = this.loadAverageThreshold.warningValue;
      this.cpuLoadBadgeColor = 'orange';
    } else {
      this.cpuLoadBadge = this.loadAverageThreshold.criticalValue;
      this.cpuLoadBadgeColor = 'red';
    }

  }

  userDefinedThreshold(metric: string): void {
    this.selectedMetricName = metric;

    switch (metric) {
      case 'CPU Usage':
        this.selectedMetricForThresholdUpdate = 'meter_vm_cpu_total_percentage';
        break;
      case 'Memory Usage':
        this.selectedMetricForThresholdUpdate = 'meter_vm_memory_used';
        break;
      case 'Swap Usage':
        this.selectedMetricForThresholdUpdate = 'meter_vm_memory_swap_percentage';
        break;
      case 'Load Average':
        this.selectedMetricForThresholdUpdate = 'meter_vm_cpu_load5';
        break;
      default:
        this.selectedMetricForThresholdUpdate = null;
        return;
    }

    const threshold = this.thresholds[this.selectedMetricForThresholdUpdate];
    const metricThreshold = this.entireThreshold[this.selectedMetricForThresholdUpdate];
    if (metricThreshold) {
      this.selectedMetricWarningPercent = metricThreshold.warning;
      this.selectedMetricCriticalPercent = metricThreshold.critical;
      this.compMetricId = metricThreshold.id
    }
    if (metric === 'Memory Usage') {
      this.selectedMetricWarningValue = +(this.metricThresholdList[this.selectedMetricForThresholdUpdate].warningValue / (1024)).toFixed(2);
      this.selectedMetricCriticalValue = +(this.metricThresholdList[this.selectedMetricForThresholdUpdate].criticalValue / (1024)).toFixed(2);
    } else if (metric === 'Swap Usage') {
      this.selectedMetricWarningValue = +(this.metricThresholdList[this.selectedMetricForThresholdUpdate].warningValue / (1024)).toFixed(2);
      this.selectedMetricCriticalValue = +(this.metricThresholdList[this.selectedMetricForThresholdUpdate].criticalValue / (1024)).toFixed(2);
    }
    else if (metric === 'CPU Usage') {
      this.selectedMetricWarningValue = this.metricThresholdList[this.selectedMetricForThresholdUpdate].warningValue;
      this.selectedMetricCriticalValue = this.metricThresholdList[this.selectedMetricForThresholdUpdate].criticalValue;
    }
    else {
      this.selectedMetricWarningValue = threshold.warningValue;
      this.selectedMetricCriticalValue = threshold.criticalValue;
    }

    this.originalWarningValue = this.selectedMetricWarningValue;
    this.originalCriticalValue = this.selectedMetricCriticalValue;
  }

  get isThresholdValid(): boolean {
    return this.selectedMetricWarningValue < this.selectedMetricCriticalValue;
  }

  get isThresholdChanged(): boolean {
    return (
      this.selectedMetricWarningValue !== this.originalWarningValue ||
      this.selectedMetricCriticalValue !== this.originalCriticalValue
    );
  }

  updateThreshold(): void {

    if (!this.selectedMetricForThresholdUpdate || !this.isThresholdValid) return;

    const warning = this.selectedMetricWarningValue;
    const critical = this.selectedMetricCriticalValue;

    switch (this.selectedMetricName) {
      case 'Memory Usage':
        this.thresholds[this.selectedMetricForThresholdUpdate].warningValue = warning * 1024 * 1024 * 1024;
        this.thresholds[this.selectedMetricForThresholdUpdate].criticalValue = critical * 1024 * 1024 * 1024;

        this.memoryRamColor = this.getThresholdColor(
          this.thresholds[this.selectedMetricForThresholdUpdate],
          this.memoryRamUsage * 1024 * 1024 * 1024
        );

        this.memoryRamBadge =
          (this.memoryRamUsage * 1024 * 1024 * 1024 < this.thresholds[this.selectedMetricForThresholdUpdate].warningValue)
            ? + (
              this.thresholds[this.selectedMetricForThresholdUpdate].warningValue /
              (1024 * 1024 * 1024)
            ).toFixed(2)
            : +(
              this.thresholds[this.selectedMetricForThresholdUpdate].criticalValue /
              (1024 * 1024 * 1024)
            ).toFixed(2);
        this.memoryRamBadgeColor =
          this.memoryRamUsage * 1024 * 1024 * 1024 < this.thresholds[this.selectedMetricForThresholdUpdate].warningValue
            ? 'orange'
            : 'red';

        break;

      case 'Swap Usage':
        this.thresholds[this.selectedMetricForThresholdUpdate].warningValue = warning * 1024 * 1024; // MB → bytes
        this.thresholds[this.selectedMetricForThresholdUpdate].criticalValue = critical * 1024 * 1024;

        this.memorySwapColor = this.getThresholdColor(
          this.thresholds[this.selectedMetricForThresholdUpdate],
          this.memorySwapUsage * 1024 * 1024
        );

        this.memorySwapBadge =
          this.memorySwapUsage * 1024 * 1024 < this.thresholds[this.selectedMetricForThresholdUpdate].warningValue
            ? +(
              this.thresholds[this.selectedMetricForThresholdUpdate].warningValue / (1024 * 1024)
            ).toFixed(2)
            : +(
              this.thresholds[this.selectedMetricForThresholdUpdate].criticalValue / (1024 * 1024)
            ).toFixed(2);
        this.memorySwapBadgeColor =
          this.memorySwapUsage * 1024 * 1024 < this.thresholds[this.selectedMetricForThresholdUpdate].warningValue
            ? 'orange'
            : 'red';
        break;

      case 'CPU Usage':
        this.thresholds[this.selectedMetricForThresholdUpdate].warningValue = warning;
        this.thresholds[this.selectedMetricForThresholdUpdate].criticalValue = critical;

        this.cpuUsageColor = this.getThresholdColor(this.thresholds[this.selectedMetricForThresholdUpdate], this.cpuUsage);
        this.cpuUsageBadge = this.cpuUsage < warning ? warning : critical;
        this.cpuUsageBadgeColor = this.cpuUsage < warning ? 'orange' : 'red';
        break;

      case 'Load Average':
        this.thresholds[this.selectedMetricForThresholdUpdate].warningValue = warning;
        this.thresholds[this.selectedMetricForThresholdUpdate].criticalValue = critical;

        this.loadAverageColor = this.getThresholdColor(this.thresholds[this.selectedMetricForThresholdUpdate], this.loadAverage);
        this.cpuLoadBadge = this.loadAverage < warning ? warning : critical;
        this.cpuLoadBadgeColor = this.loadAverage < warning ? 'orange' : 'red';
        break;
    }

    this.originalWarningValue = warning;
    this.originalCriticalValue = critical;
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


  getThresholdMessage(): void {
    this.thresholdMessage = '';
    if (this.selectedMetricType === 'Percentage') {
      switch (this.selectedMetricName) {
        case 'Memory Usage':
          this.thresholdMessage = 'Maximum memory usage value is 15GB';
          break;

        case 'Swap Usage':
          this.thresholdMessage = 'Maximum swap usage value is 6GB';
          break;

        case 'CPU Usage':
          const coreNumber = Number(localStorage.getItem('logicalCores'));
          this.thresholdMessage = 'Maximum CPU usage value is ' + (coreNumber * 100);
          break;
      }
    }
  }

  loadThresholds(): void {
    let ipAddressId = sessionStorage.getItem('ipAddressId');
    let encodedId = btoa(this.ipAddrId);
    this.meteringConfigService.getThresholdsByComponent(encodedId, "INFRA")
      .subscribe({
        next: (data) => {
          this.entireThreshold = data;
          this.loadSysMetrics()

          console.log('Thresholds:', data);
        },
        error: (err) => console.error('Error loading thresholds:', err)
      });
  }

  loadSysMetrics() {
    let ipAddressId = sessionStorage.getItem('ipAddressId');
    let encodedId = btoa(this.ipAddrId);
    this.meteringConfigService.getSystemMetricsByIpAddrId(encodedId, "infra")
      .subscribe({
        next: (data: any[]) => {
          this.SystemMetrics = data;
          this.calculateAndStoreThresholds();
        },
        error: (err) => console.error('Error fetching metrics', err)
      });
  }

  // Store thresholds once
  calculateAndStoreThresholds() {
    if (!this.SystemMetrics?.length || !this.entireThreshold) return;

    // Convert array to key-value map for easier access
    const metricsMap: { [key: string]: number } = {};
    this.SystemMetrics.forEach((m: any) => {
      metricsMap[m.metricName] = m.value;
    });

    for (const metricName in this.entireThreshold) {
      const thresholds = this.entireThreshold[metricName];

      let maxValue = 0;
      switch (metricName) {
        case 'meter_vm_cpu_total_percentage':
          maxValue = metricsMap['cpu_total'] || 0;
          break;
        case 'meter_vm_memory_used':
          maxValue = metricsMap['memory_total'] || 0;
          break;
        case 'meter_vm_memory_swap_percentage':
          maxValue = metricsMap['memory_swap_total'] || 0;
          break;
        case 'meter_vm_fs_root_usage':
          maxValue = metricsMap['fs_root_total'] || 0;
          break;
        default:
          maxValue = 0;
      }

      const warningValue = (maxValue * thresholds.warningValue) / 100;
      const criticalValue = (maxValue * thresholds.criticalValue) / 100;

      this.metricThresholdList[metricName] = {
        warningValue,
        criticalValue
      };
    }
  }

  // Returns UI state dynamically without pre-calling
  getMetricUiState(
    metricName: string,
    actualValue: number
  ): { color: string; badgeValue: number | null; badgeColor: string } {

    const metric = this.entireThreshold?.[metricName];

    if (!metric || actualValue == null) {
      return { color: '', badgeValue: null, badgeColor: '' };
    }

    const warning = metric.warningValue;
    const critical = metric.criticalValue;
    const direction = metric.goodDirection; // LOW | HIGH

    // Ignore invalid thresholds (0 or null)
    const hasWarning = warning && warning > 0;
    const hasCritical = critical && critical > 0;

    let color = 'green';
    let badgeValue: number | null = hasWarning ? warning : null;
    let badgeColor = 'orange';

    if (direction === 'LOW') {
      if (hasCritical && actualValue >= critical) {
        color = 'red';
        badgeValue = critical;
        badgeColor = 'red';
      } else if (hasWarning && actualValue >= warning) {
        color = 'orange';
        badgeValue = warning;
        badgeColor = 'orange';
      }
    } else {
      // ❌ lower value is bad
      if (hasCritical && actualValue <= critical) {
        color = 'red';
        badgeValue = critical;
        badgeColor = 'red';
      } else if (hasWarning && actualValue <= warning) {
        color = 'orange';
        badgeValue = warning;
        badgeColor = 'orange';
      }
    }

    return { color, badgeValue, badgeColor };
  }


  updateMetricThreshold() {
    if (!this.selectedMetricForThresholdUpdate) return;
    let ipAddressId = sessionStorage.getItem('ipAddressId');
    // send updated percentages to API
    const thresholdDto: ComponentMetricThresholdDTO = {
      id: this.compMetricId,
      componentId: Number(ipAddressId),
      componentType: "INFRA",
      metric: this.selectedMetricForThresholdUpdate,
      warning: Number(this.selectedMetricWarningPercent),
      critical: Number(this.selectedMetricCriticalPercent)
    };
    this.meteringConfigService.updateThreshold(thresholdDto).subscribe({
      next: (res) => {
        console.log('Threshold updated successfully:', res)
        // this.UserGlobthreshold = {}
        this.SystemMetrics = {}
        this.metricThresholdList = {}
        this.loadThresholds()
      },
      error: (err) => console.error('Error updating threshold:', err)
    });

  }



  goToContainerDashboard(serviceId: string, event?: MouseEvent): void {
    if (event) event.preventDefault();

    if (serviceId) {
      this.serviceIdService.setServiceId(serviceId);
      const encodedId = this.serviceIdService.getEncodedServiceId();
      sessionStorage.setItem('encodedServiceIdForContainerName', encodedId);
      sessionStorage.setItem('serviceIdForContainerName', serviceId);
      this.goToContainerDashboardPage();
    } else {
      console.error('Service ID is undefined or empty');
    }
  }

  onSearchContainer(): void {
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      this.filteredContainerId = this.serviceIdContainer.filter((container: any) => {
        const containerId = container.ContainerDetailsText.toLowerCase();
        const appName = (this.applicationNameMap?.[container.ContainerDetailsText] || '').toLowerCase();
        return containerId.includes(query) || appName.includes(query);
      });
    } else {
      this.filteredContainerId = [...this.serviceIdContainer];
    }
    this.calculateContainerPagination();
  }

  getContainerStatus(): void {
    this.infraService
      .getContainerStatus(this.serviceId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {

        // extract metric maps
        const cpuData = data['meter_vm_container_cpu_usage_percent'] || {};
        const memoryData = data['meter_vm_container_memory_usage_percent'] || {};
        const netRxData = data['meter_vm_container_network_received_bytes'] || {};
        const netTxData = data['meter_vm_container_network_transmitted_bytes'] || {};
        const statusData = data['meter_vm_container_status'] || {};

        // gather all unique container names
        const allContainers = new Set<string>([
          ...Object.keys(statusData),
          ...Object.keys(cpuData),
          ...Object.keys(memoryData),
          ...Object.keys(netRxData),
          ...Object.keys(netTxData)
        ]);

        // combine per container
        this.serviceIdContainer = Array.from(allContainers).map(container => ({
          ContainerDetailsText: container.startsWith('-') ? container.substring(1) : container,
          containerName: container,
          status: statusData[container] ?? 0,
          cpu: cpuData[container] ?? 0,
          memory: memoryData[container] ?? 0,
          network: (netRxData[container] ?? 0) + (netTxData[container] ?? 0)
        }));

        // assign to filtered and paged data
        this.filteredContainerId = this.serviceIdContainer.length
          ? [...this.serviceIdContainer]
          : [];
        this.pagedContainerId = [...this.filteredContainerId];

        this.calculateContainerPagination();
      });
  }


  calculateContainerPagination(): void {
    this.totalContainerPages = Math.ceil(this.filteredContainerId.length / this.itemsPerContainerPage);
    this.pagedContainerId = this.filteredContainerId.slice(
      (this.currentContainerPage - 1) * this.itemsPerContainerPage,
      this.currentContainerPage * this.itemsPerContainerPage
    );
  }

  previousContainerPage(): void {
    if (this.currentContainerPage > 1) {
      this.currentContainerPage--;
      this.calculateContainerPagination();
    }
  }

  nextContainerPage(): void {
    if (this.currentContainerPage < this.totalContainerPages) {
      this.currentContainerPage++;
      this.calculateContainerPagination();
    }
  }

  goToContainerPage(page: any): void {
    this.currentContainerPage = page;
    this.calculateContainerPagination();
  }

  alphanumericCompare(a: string, b: string): number {
    const re = /(\d+|\D+)/g;
    const aParts = a.match(re) || [];
    const bParts = b.match(re) || [];

    const len = Math.min(aParts.length, bParts.length);
    for (let i = 0; i < len; i++) {
      const aPart = aParts[i];
      const bPart = bParts[i];

      const aNum = parseInt(aPart, 10);
      const bNum = parseInt(bPart, 10);

      const bothNumeric = !isNaN(aNum) && !isNaN(bNum);
      if (bothNumeric) {
        if (aNum !== bNum) return aNum - bNum;
      } else {
        const cmp = aPart.localeCompare(bPart, undefined, { sensitivity: 'base' });
        if (cmp !== 0) return cmp;
      }
    }

    return aParts.length - bParts.length;
  }


  get endContainerIndex(): number {
    return Math.min(this.currentContainerPage * this.itemsPerContainerPage, this.filteredContainerId.length);
  }

  getContStatus(item: number): string {
    if (item == 1) {
      return 'text-active';
    } else if (item == 0) {
      return 'text-inactive';
    } else {
      return '';
    }
  }

  openModal(name: string) {
    this.selectedServiceName = name;
    this.getContainerProperties();
  }
  getContainerProperties(): void {
    this.infraService.getContainerProperties(this.serviceId, this.startTime, this.endTime, this.selectedServiceName).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.properties = data;
    });
  }
  goToContainerDashboardPage(): void {
    this.router.navigate(['/infra/linux-service/container-dashboard']);
  }

  openProcessChartModal(key: string, pid?: string, ppid?: string) {
    this.selectedProcessName = pid ? `${key} (PID: ${pid})` : key;
    this.isChartLoading = true;
    this.showChartModal = true;
    this.chartOptions = {};

    console.log('Fetching time-series for', key, 'with PID:', pid, 'and PPID:', ppid);

    this.infraService.getProcessTimeSeries(
      this.serviceId,
      String(this.startTime), String(this.endTime),
      key,
      pid,
      ppid,
      'linux'
    ).subscribe({
      next: (data) => {
        const chartData = (data as Record<string, any>)[key];
        if (chartData) {
          this.createProcessChart(chartData);
        } else {
          console.warn('No time-series data found for', key);
          this.chartOptions = this.getEmptyChartOptions();
        }
        this.isChartLoading = false;
      },
      error: (err) => {
        console.error('Failed to load chart data', err);
        this.isChartLoading = false;
        this.chartOptions = this.getEmptyChartOptions();
      }
    });
  }

  private createProcessChart(chartData: any) {
    const cpuSeriesData = chartData.cpu_percent.map((point: any) => [
      this.parseTimeBucket_process(point.time_bucket.toString()),
      parseFloat(point.value)
    ]);

    const memSeriesData = chartData.memory_percent.map((point: any) => [
      this.parseTimeBucket_process(point.time_bucket.toString()),
      parseFloat(point.value)
    ]);

    this.chartOptions = {
      chart: {
        type: 'line',
        zoomType: 'x',
        style: { fontSize: '10px' }
      } as any,
      title: {
        text: ''
      },
      xAxis: {
        type: 'datetime',
        title: {
          text: 'Time',
          style: { fontSize: '10px' }
        },
        crosshair: true
      },
      yAxis: {
        title: {
          text: 'Usage (%)',
          style: { fontSize: '10px' }
        },
        min: 0,
        tickAmount: 10
      },
      tooltip: {
        shared: true,
        headerFormat: '<b>{point.key:%A, %b %d, %Y %H:%M}</b><br/>',
        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:.2f} %</b><br/>'
      },
      legend: {
        enabled: true
      },
      series: [
        {
          name: 'CPU Percent',
          type: 'line',
          data: cpuSeriesData,
          color: '#28a745'
        },
        {
          name: 'Memory Percent',
          type: 'line',
          data: memSeriesData,
          color: '#007bff'
        }
      ],
      credits: {
        enabled: false
      }
    };
  }

  private getEmptyChartOptions(): Highcharts.Options {
    return {
      title: {
        text: `No Time-Series Data Available for ${this.selectedProcessName}`
      },
      series: [],
      credits: {
        enabled: false
      }
    };
  }

  private parseTimeBucket_process(timeBucketStr: string): number {
    if (!timeBucketStr || timeBucketStr.length < 12) {
      return 0;
    }
    const year = parseInt(timeBucketStr.substring(0, 4), 10);
    const month = parseInt(timeBucketStr.substring(4, 6), 10) - 1;
    const day = parseInt(timeBucketStr.substring(6, 8), 10);
    const hour = parseInt(timeBucketStr.substring(8, 10), 10);
    const minute = parseInt(timeBucketStr.substring(10, 12), 10);

    return new Date(year, month, day, hour, minute).getTime();
  }

  closeChartModal() {
    this.showChartModal = false;
    this.chartOptions = {};
    this.selectedProcessName = '';
  }

  // 1. Dropdown state
  showAlerts = false;

  // 2. Toggle
  toggleAlerts(): void {
    this.showAlerts = !this.showAlerts;
  }

  // 3. Total alerts (bell badge)
  getTotalAlerts(): number {
    return this.alertData.reduce(
      (sum, a) => sum + (a.total_count || 0),
      0
    );
  }

  // 4. Total critical (trigger count)
  getTotalCritical(): number {
    return this.alertData.reduce(
      (sum, a) => sum + (a.openalertcount || 0),
      0
    );
  }

  // 5. Total warning (trigger count)
  getTotalWarning(): number {
    return this.alertData.reduce(
      (sum, a) => sum + (a.closealertcount || 0),
      0
    );
  }
  activeTilePanel: string | null = null;

  toggleTilePanel(key: string): void {
    this.activeTilePanel = this.activeTilePanel === key ? null : key;
  }


}
