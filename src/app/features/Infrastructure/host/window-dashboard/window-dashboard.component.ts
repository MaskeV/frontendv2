import * as Highcharts from 'highcharts';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { InfraService } from '../../../../services/infra.service';
import { DateService } from '../../../../services/date.service';
import { ServiceIdService } from '../../../../services/service-id.service';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { HighchartsChartModule } from 'highcharts-angular';

import { NgbDropdownModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { hierarchy, treemap, HierarchyRectangularNode } from 'd3-hierarchy';
import { MeteringConfigService, ComponentMetricThresholdDTO } from '../../../../services/metering-config.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApmApiService } from '../../../../services/apm-api.service';
import { MatButtonModule } from '@angular/material/button';
import { User } from '../../../../models/user';
import { Session } from '../../../../models/session';
import { ThresholdService } from '../../../../services/threshold.service';
import { NetworkSpeedChartComponent } from '../linux-dashboard/network-speed-chart/network-speed-chart.component';

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
  selector: 'app-window-dashboard',
  imports: [
    FormsModule,
    CommonModule,
    RouterModule,
    HighchartsChartModule,
    NgbDropdownModule,
    NetworkSpeedChartComponent,
    MatTooltipModule,
    MatButtonModule,
  ],
  templateUrl: './window-dashboard.component.html',
  styleUrl: './window-dashboard.component.css'
})
export class WindowDashboardComponent implements OnInit, OnDestroy {

  host = 'windows';

  private themeObserver: MutationObserver | undefined;
  Highcharts: typeof Highcharts = Highcharts;

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;

  selectedService!: string;
  serviceId!: string;
  entityId!: string;
  componentId: string | null = '';

  chartOptions: Highcharts.Options = {};
  charts: Highcharts.Chart[] = [];

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

  cpuSizeW = window.innerWidth * 0.296;
  cpuSizeH = window.innerHeight * 0.044;
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
  UserGlobthreshold: any = {};
  SystemMetrics: any = {};
  metricThresholdList: {
    [metricName: string]: {
      warningValue: number;
      criticalValue: number;
    };
  } = {};
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
  latestSwapUsed: any;
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
  ) { }

  ngOnInit(): void {
    // this.selectedService = sessionStorage.getItem('serviceIdForInfra')!;
    // this.serviceId = sessionStorage.getItem('encodedServiceIdForInfra')!;

    // this.selectedService = sessionStorage.getItem('serviceIdForWindow')!;
    // this.serviceId = sessionStorage.getItem('encodedServiceIdForWindow')!;

    // this.entityId = sessionStorage.getItem('encodedEntityIDForServices')!;
    // this.selectedServiceName = sessionStorage.getItem('serviceIdForContainerName')!;
    // this.dateService.setActiveComponent('WindowDashboardComponent');
    // this.observeThemeChange();
    // this.datesubscription = this.dateService.activeComponent$.pipe(
    //   filter(activeComponent => activeComponent === 'LinuxDashboardComponent'),
    //   switchMap(() => this.dateService.date$)).subscribe(dates => {
    //     this.datemodel = dates;
    //     this.startTime = this.formatDate(this.datemodel.startdateTime);
    //     this.thresholdst = this.formatForThresholdDate(this.datemodel.startdateTime);

    //     this.endTime = this.formatDate(this.datemodel.enddateTime);
    //     this.loadData('overview');
    //     this.filteredProcessList = Object.keys(this.processList);
    //     this.calculatePagination();
    //   });

    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.selectedService = sessionStorage.getItem('serviceIdForWindow')!;
    this.serviceId = sessionStorage.getItem('encodedServiceIdForWindow')!;

    this.dateService.setActiveComponent('WindowDashboardComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'WindowDashboardComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.thresholdst = this.formatForThresholdDate(this.datemodel.startdateTime);
        // this.loadData('overview');
        const activeTab = document.querySelector('#service-nav .nav-link.active') as HTMLElement;
        if (activeTab) {
          const tabName = activeTab.getAttribute('href')?.replace('#', '');
          if (tabName) {
            this.loadData(tabName);
          }
        }
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

    if (this.memoryRamChartInstance) {
      this.memoryRamChartInstance.reflow();
    }
  }

  updateCpuDimensions() {
    this.cpuSizeW = window.innerWidth * 0.296;
    this.cpuSizeH = window.innerHeight * 0.044;
  }

  updateMemoryRamTile(data: any[]): void {
    if (!data || data.length === 0) {
      this.memoryRamTile = [];
      return;
    }

    const categories = [
      { key: 'meter_win_memory_used', name: 'used' },
      { key: 'meter_win_memory_available', name: 'available' }
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

    const total = Number(data[0].meter_win_memory_total) || 1;

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
      (sum, item) => sum + Number(item.meter_win_memory_swap_total || 0),
      0
    ) / data.length;

    const avgFree = data.reduce(
      (sum, item) => sum + Number(item.meter_win_memory_swap_free || 0),
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

    const categories = ['priviledged', 'idle', 'dpc', 'interrupt', 'user'];

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
      { key: 'meter_win_cpu_load1', name: 'load1' },
      { key: 'meter_win_cpu_load5', name: 'load5' },
      { key: 'meter_win_cpu_load15', name: 'load15' }
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
      priviledged: '#00798c',
      idle: '#bbd0ff',
      dpc: '#76c893',
      interrupt: '#7d8597',
      user: '#b388eb',

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
    this.destroy$.next();
    switch (tabName) {
      case 'overview':
        this.getThreshold("INFRA");
        this.loadThresholds();

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
        break;
      case 'process_list':
        this.getProcess();
        this.getservices();
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
    this.infraService.getSystemProperties(this.serviceId, this.startTime, this.endTime, "windows").pipe(takeUntil(this.destroy$)).subscribe((data: any) => {

      if (data) {
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
    this.infraService.getCombinedDataWindows(this.serviceId, this.startTime, this.endTime, this.host).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.cpuUsage = (data && data.cpu_usage != null) ? data.cpu_usage.toFixed(2) : null;
      // this.cpuUsage = 300;
      this.memoryRamUsage = (data && data.memory_ram_usage != null) ? +(data.memory_ram_usage / (1024)).toFixed(2) : null;
      this.memorySwapUsage = (data && data.memory_swap_usage != null) ? data.memory_swap_usage : null;
      this.applyThresholds();
    });
  }

  getMemoryRam(): void {
    this.infraService.getMemoryRamWindows(this.serviceId, this.startTime, this.endTime, this.host)
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
        this.chartValuesRam = this.getSelectedMetricValues(this.lastMemoryData || []);
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
    total: 'meter_win_memory_total',
    available: 'meter_win_memory_available',
    buff: 'meter_win_memory_buff_cache',
    used: 'meter_win_memory_used'
  };

  metricKeys = ['meter_win_memory_total', 'meter_win_memory_available', 'meter_win_memory_buff_cache', 'meter_win_memory_used'];

  metricMap: { [key: string]: string } = {
    meter_win_memory_total: 'Total',
    meter_win_memory_available: 'Available',
    meter_win_memory_buff_cache: 'Buff/Cache',
    meter_win_memory_used: 'Used'
  };

  badges: { [key: string]: { warning: number, critical: number, warningColor: string, criticalColor: string } } = {};
  badgeMetricKeys = ['meter_win_memory_available', 'meter_win_memory_buff_cache', 'meter_win_memory_used'];

  bytesToMB(v: number) {
    return v / (1024 * 1024);
  }

  chartMemoryRam(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      if (!data?.length || !this.thresholds) {
        this.memoryRamChart = null;
        return;
      }

      const CRITICAL_COLOR = 'red';
      const WARNING_COLOR = 'orange';

      this.badgeMetricKeys.forEach(key => {
        const threshold = this.thresholds[key];
        if (!threshold) return;

        const warningMB = threshold.warningValue / (1024 * 1024);
        const criticalMB = threshold.criticalValue / (1024 * 1024);

        let anyWarning = false;
        let anyCritical = false;

        data.forEach(d => {
          const valueMB = typeof d[key] === 'number' ? d[key] : 0;
          if (criticalMB > 0 && valueMB >= criticalMB) anyCritical = true;
          else if (warningMB > 0 && valueMB >= warningMB) anyWarning = true;
        });

        this.isMemoryRamGraph = anyWarning || anyCritical;

        this.badges[key] = {
          warning: warningMB,
          critical: criticalMB,
          warningColor: anyWarning ? WARNING_COLOR : 'gray',
          criticalColor: anyCritical ? CRITICAL_COLOR : 'gray'
        };
      });

      const defaultColors: { [key: string]: string } = {
        meter_win_memory_total: '#023e8a',
        meter_win_memory_available: '#480ca8',
        meter_win_memory_buff_cache: '#679436',
        meter_win_memory_used: '#5390d9'
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
          if (valueMB === null) return { x: this.convertTimebucket(d.time_bucket), y: null };

          let status: 'C' | 'W' | '' = '';
          let markerColor = defaultColors[key];

          const threshold = this.thresholds[key];
          if (threshold) {
            const warningMB = threshold.warningValue / (1024 * 1024);
            const criticalMB = threshold.criticalValue / (1024 * 1024);

            if (criticalMB > 0 && valueMB >= criticalMB) {
              status = 'C';
              markerColor = CRITICAL_COLOR;
            } else if (warningMB > 0 && valueMB >= warningMB) {
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
            let tooltipHtml = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/>`;
            this.points?.forEach((p: any) => {
              const point = p.point as any;
              let statusColor = '';
              if (point.status === 'C') statusColor = CRITICAL_COLOR;
              else if (point.status === 'W') statusColor = WARNING_COLOR;
              tooltipHtml += `<span style="color:${p.series.color}">\u25CF</span> ${p.series.name}: ${point.y?.toFixed(2)} ${point.status ? `<span style="color:${statusColor}">(${point.status})</span>` : ''}<br/>`;
            });
            return tooltipHtml;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false }
      };

      this.chartValuesRam = this.getSelectedMetricValues(data);

    } catch (e) {
      console.error("Error Occurred in Memory RAM Chart", e);
    }
  }

  getMemorySwap(): void {
    this.infraService.getMemorySwapWindows(this.serviceId, this.startTime, this.endTime, this.host).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {

      data.forEach((d: { time_bucket: string; meter_win_memory_swap_total: number; meter_win_memory_swap_free: number; meter_win_memory_swap_used?: number }) => {
        d.meter_win_memory_swap_used = d.meter_win_memory_swap_total - d.meter_win_memory_swap_free;
      });
      this.lastSwapData = data;

      const latestValid = [...data].reverse().find(d =>
        d.meter_win_memory_swap_total != null &&
        d.meter_win_memory_swap_free != null
      );

      this.latestSwapUsed = (latestValid && latestValid.meter_win_memory_swap_total) ?
        ((latestValid.meter_win_memory_swap_total - latestValid.meter_win_memory_swap_free) / latestValid.meter_win_memory_swap_total) * 100 : null;
      this.memorySwapUsage = this.latestSwapUsed;

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
    totalSwap: 'meter_win_memory_swap_total',
    free: 'meter_win_memory_swap_free',
    usedSwap: 'meter_win_memory_swap_used'
  };

  badgeSwapMetricKeys = ['meter_win_memory_swap_used', 'meter_win_memory_swap_free'];
  swapMetricKeys = ['meter_win_memory_swap_total', 'meter_win_memory_swap_free', 'meter_win_memory_swap_used'];

  swapMetricMap: { [key: string]: string } = {
    meter_win_memory_swap_total: 'Total',
    meter_win_memory_swap_free: 'Free',
    meter_win_memory_swap_used: 'Used'
  };

  badgesSwap: { [key: string]: { warning: number, critical: number, warningColor: string, criticalColor: string } } = {};
  showSwapBadgeDropdown = false;

  toggleSwapBadgeDropdown() {
    this.showSwapBadgeDropdown = !this.showSwapBadgeDropdown;
  }

  chartMemorySwap(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      if (!data?.length || !this.thresholds) {
        this.memorySwapChart = null;
        return;
      }

      const CRITICAL_COLOR = 'red';
      const WARNING_COLOR = 'orange';

      if (this.thresholds['meter_win_memory_swap_free']) {
        const freeThr = this.thresholds['meter_win_memory_swap_free'];
        const totalThr = this.thresholds['meter_win_memory_swap_total'] ?? { warningValue: 0, criticalValue: 0 };

        const warningUsed = totalThr.criticalValue - (freeThr.criticalValue ?? 0);
        const criticalUsed = totalThr.warningValue - (freeThr.warningValue ?? 0);

        this.thresholds['meter_win_memory_swap_used'] = {
          warningValue: warningUsed,
          criticalValue: criticalUsed
        };
      }

      this.swapMetricKeys.forEach(key => {
        if (key === 'meter_win_memory_swap_total') {
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
          if (d[key] == null && key !== 'meter_win_memory_swap_used') return;
          if (key === 'meter_win_memory_swap_used' && (d['meter_win_memory_swap_total'] == null || d['meter_win_memory_swap_free'] == null)) return;

          const valueMB = key === 'meter_win_memory_swap_used'
            ? d['meter_win_memory_swap_total'] - d['meter_win_memory_swap_free']
            : d[key];

          const valueBytes = valueMB * 1_000_000;

          if (key === 'meter_win_memory_swap_free') {
            if (valueBytes >= criticalVal) anyCritical = true;
            else if (valueBytes >= warningVal) anyWarning = true;
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
        meter_win_memory_swap_total: '#45ba6a',
        meter_win_memory_swap_free: '#7d8597',
        meter_win_memory_swap_used: '#7dc8fe'
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

          if (key === 'meter_win_memory_swap_used') {
            if (d['meter_win_memory_swap_total'] != null && d['meter_win_memory_swap_free'] != null)
              valueMB = d['meter_win_memory_swap_total'] - d['meter_win_memory_swap_free'];
          } else if (d[key] != null) {
            valueMB = d[key];
          }

          if (valueMB == null) {
            return { x: this.convertTimebucket(d.time_bucket), y: null };
          }

          const valueBytes = valueMB * 1_000_000;

          let status: 'C' | 'W' | '' = '';
          let markerColor: string | undefined;

          const thr = this.thresholds[key];
          if (thr) {
            const warningVal = thr.warningValue;
            const criticalVal = thr.criticalValue;

            if (key === 'meter_win_memory_swap_free') {
              if (valueBytes >= criticalVal) { status = 'C'; markerColor = CRITICAL_COLOR; }
              else if (valueBytes >= warningVal) { status = 'W'; markerColor = WARNING_COLOR; }
            } else {
              if (valueBytes >= criticalVal) { status = 'C'; markerColor = CRITICAL_COLOR; }
              else if (valueBytes >= warningVal) { status = 'W'; markerColor = WARNING_COLOR; }
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
          shared: true, useHTML: true, backgroundColor: tooltipBgColor, style: { color: tooltipTextColor, fontSize: '10px' },
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

      if (!this.memorySwapChartInstance)
        this.memorySwapChartInstance = Highcharts.chart('memorySwapChart', this.memorySwapChart);
      else
        this.memorySwapChartInstance.update(this.memorySwapChart!, true, true);

      this.chartValuesSwap = this.getSelectedMetricValuesSwap(data);

    } catch (e) {
      console.error("Error in Memory Swap Chart", e);
    }
  }

  getAvgCpuUsage(): void {
    this.infraService.getCpuAvgUsedPercentageWindows(this.serviceId, this.startTime, this.endTime, this.host).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
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
        priviledged: '#00798c',
        idle: '#bbd0ff',
        dpc: '#76c893',
        interrupt: '#7d8597',
        user: '#b388eb'
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
    this.infraService.getCpuLoadWindows(this.serviceId, this.startTime, this.endTime, this.host).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
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
            entry.meter_win_cpu_load1,
            entry.meter_win_cpu_load5,
            entry.meter_win_cpu_load15
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
    load_1: 'meter_win_cpu_load1',
    load_5: 'meter_win_cpu_load5',
    load_15: 'meter_win_cpu_load15'
  };

  badgeLoadKeys = ['meter_win_cpu_load1', 'meter_win_cpu_load5', 'meter_win_cpu_load15'];

  metricLoadKeys = ['meter_win_cpu_load1', 'meter_win_cpu_load5', 'meter_win_cpu_load15'];

  metricLoadMap: { [key: string]: string } = {
    meter_win_cpu_load1: 'Load_1',
    meter_win_cpu_load5: 'Load_5',
    meter_win_cpu_load15: 'Load_15'
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
      if (!data.length || !this.thresholds) {
        this.avgCpuLoadChart = null;
        return;
      }

      const CRITICAL_COLOR = 'red';
      const WARNING_COLOR = 'orange';

      this.metricLoadKeys.forEach(key => {
        const threshold = this.thresholds[key];
        if (!threshold) return;

        const warning = threshold.warningValue / 100;
        const critical = threshold.criticalValue / 100;

        const anyWarning = data.some(d => (typeof d[key] === 'number' ? d[key] : 0) >= warning);
        const anyCritical = data.some(d => (typeof d[key] === 'number' ? d[key] : 0) >= critical);

        this.badgesLoad[key] = {
          warning,
          critical,
          warningColor: anyWarning ? WARNING_COLOR : 'gray',
          criticalColor: anyCritical ? CRITICAL_COLOR : 'gray'
        };
      });

      this.isCpuLoadGraph = this.metricLoadKeys.some(key => {
        const threshold = this.thresholds[key];
        if (!threshold) return false;
        const warning = threshold.warningValue / 100;
        const critical = threshold.criticalValue / 100;
        return data.some(d => {
          const v = typeof d[key] === 'number' ? d[key] : 0;
          return v >= warning || v >= critical;
        });
      });

      const defaultColors: { [key: string]: string } = {
        meter_win_cpu_load1: '#7dc8feff',
        meter_win_cpu_load5: '#7d8597',
        meter_win_cpu_load15: '#45ba6a'
      };

      const series: Highcharts.SeriesAreasplineOptions[] = this.metricLoadKeys.map(key => ({
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
          if (value === null) return { x: this.convertTimebucket(d.time_bucket), y: null };

          let status: 'C' | 'W' | '' = '';
          let markerColor = defaultColors[key];

          const threshold = this.thresholds[key];
          if (threshold) {
            const warning = threshold.warningValue / 100;
            const critical = threshold.criticalValue / 100;

            if (value >= critical) {
              status = 'C';
              markerColor = CRITICAL_COLOR;
            } else if (value >= warning) {
              status = 'W';
              markerColor = WARNING_COLOR;
            }
          }

          return {
            x: this.convertTimebucket(d.time_bucket),
            y: value,
            status,
            marker: { fillColor: markerColor, lineColor: markerColor, lineWidth: 1, radius: status ? 2 : 2 }
          };
        })
      }));

      const selectedKey = this.chartDropdownToMetricKeyCpu[this.chartData_criteriaForCpuLoad];
      series.forEach(s => {
        if (this.chartData_criteriaForCpuLoad === 'all') {
          (s as any).lineWidth = 1.5;
          (s as any).zIndex = 5;
        } else if (s.name === this.metricLoadMap[selectedKey]) {
          (s as any).lineWidth = 2.5;
          (s as any).zIndex = 10;
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

      this.avgCpuLoadChart = {
        chart: { type: 'spline', backgroundColor: 'transparent', spacing: [5, 5, 5, 5], style: { fontSize: '8px' } },
        title: { text: undefined },
        xAxis: { type: 'datetime', crosshair: { width: 2, color: 'blue', dashStyle: 'ShortDot' }, labels: { style: { color: labelColor, fontSize: '8px' } }, gridLineColor: gridColor, lineColor: '#ccc', tickColor: '#ccc', tickLength: 5, tickWidth: 1 },
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

      if (!this.cpuLoadChartInstance)
        this.cpuLoadChartInstance = Highcharts.chart('avgCpuLoadChart', this.avgCpuLoadChart);
      else
        this.cpuLoadChartInstance.update(this.avgCpuLoadChart!, true, true);

      this.chartValuesCpuLoad = this.getSelectedMetricValuesCpuLoad(data);

    } catch (e) {
      console.error("Error in CPU Load Chart", e);
    }
  }

  getFileSystemMountpointUsage(): void {
    this.infraService.getFileSystemMountpointUsageWindows(this.serviceId, this.startTime, this.endTime, this.host).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
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
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket'))
        )
      );

      if (keys.length === 0) {
        this.fileSystemMountpointUsageChart = null;
        return;
      }

      const lineColors = [
        '#73946B',
        '#3E5F44',
        '#8AA624',
        '#568F87',
        '#647FBC',
        '#556B2F'
      ];

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

      this.fileSystemMountpointUsageChart = {
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
          gridLineColor: gridColor,
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          xDateFormat: '%Y-%m-%d %H:%M',
          formatter: function () {
            let tooltipHtml = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/>`;

            this.points?.forEach(p => {
              const point: any = p;

              let statusColor = '';
              if (point.status === 'C') statusColor = criticalColor;
              else if (point.status === 'W') statusColor = warningColor;

              tooltipHtml += `
                <span style="color:${p.series.color}">\u25CF</span>  <!-- line color dot -->
                ${p.series.name}: ${p.y} 
                ${point.status ? `<span style="color:${statusColor}">(${point.status})</span>` : ''}
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

      Highcharts.chart('fileSystemMountpointUsageChart', this.fileSystemMountpointUsageChart!);

    } catch (e) {
      console.log("Error Occurred ", e);
    }
  }

  getFilefdAllocated(): void {
    this.infraService.getFilefdAllocatedWindows(this.serviceId, this.startTime, this.endTime, this.host).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
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
        meter_win_filefd_allocated: 'filefd_allocated'
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
    this.infraService.getDiscSpaceWindows(this.serviceId, this.startTime, this.endTime, this.host).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
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
    this.infraService.getDiskReadWriteWindows(this.serviceId, this.startTime, this.endTime, this.host).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
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
        meter_win_disk_read: 'disk_read',
        meter_win_disk_written: 'disk_written'
      };

      const keysToDisplay = Object.keys(keyMap);

      const defaultColors: { [key: string]: string } = {
        meter_win_disk_read: '#f3fd3cff',
        meter_win_disk_written: '#FD8D3C'
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
    this.infraService.getNetworkBandwidthUsageWindows(this.serviceId, this.startTime, this.endTime, this.host).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
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
    receive: 'meter_win_network_receive',
    transmit: 'meter_win_network_transmit',
    traffic: 'network_traffic'
  };

  badgeNetworkKeys = ['meter_win_network_receive', 'meter_win_network_transmit', 'network_traffic'];
  networkKeyMap: { [key: string]: string } = {
    meter_win_network_receive: 'Receive',
    meter_win_network_transmit: 'Transmit',
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
      if (!data?.length || !this.thresholds) {
        this.networkBandwidthUsageChart = null;
        this.isNetworkBandwidthGraph = false;
        return;
      }

      const CRITICAL_COLOR = 'red';
      const WARNING_COLOR = 'orange';

      this.badgeNetworkKeys.forEach(key => {
        let warning = (this.thresholds[key]?.warningValue ?? 0) / 1024;
        let critical = (this.thresholds[key]?.criticalValue ?? 0) / 1024;

        if (key === 'network_traffic') {
          const tx = this.thresholds['meter_win_network_transmit'];
          const rx = this.thresholds['meter_win_network_receive'];
          if (tx && rx) {
            warning = (tx.warningValue + rx.warningValue) / 1024;
            critical = (tx.criticalValue + rx.criticalValue) / 1024;
          }
        }

        const anyWarning = data.some(d => {
          const value = key === 'network_traffic'
            ? ((d['meter_win_network_transmit'] ?? 0) + (d['meter_win_network_receive'] ?? 0))
            : (d[key] ?? 0);
          return value >= warning && value < critical;
        });

        const anyCritical = data.some(d => {
          const value = key === 'network_traffic'
            ? ((d['meter_win_network_transmit'] ?? 0) + (d['meter_win_network_receive'] ?? 0))
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
        meter_win_network_receive: '#7dc8feff',
        meter_win_network_transmit: '#7d8597',
        network_traffic: '#45ba6a'
      };

      const series: Highcharts.SeriesSplineOptions[] = Object.keys(this.networkKeyMap).map(key => {
        const thresholdWarning = key === 'network_traffic'
          ? ((this.thresholds['meter_win_network_transmit']?.warningValue ?? 0) + (this.thresholds['meter_win_network_receive']?.warningValue ?? 0)) / 1024
          : (this.thresholds[key]?.warningValue ?? 0) / 1024;

        const thresholdCritical = key === 'network_traffic'
          ? ((this.thresholds['meter_win_network_transmit']?.criticalValue ?? 0) + (this.thresholds['meter_win_network_receive']?.criticalValue ?? 0)) / 1024
          : (this.thresholds[key]?.criticalValue ?? 0) / 1024;

        return {
          name: this.networkKeyMap[key],
          type: 'spline',
          lineWidth: 1,
          color: defaultColors[key],
          marker: { radius: 2 },
          data: data.map(d => {
            const rawValue = key === 'network_traffic'
              ? ((d['meter_win_network_transmit'] ?? 0) + (d['meter_win_network_receive'] ?? 0))
              : (d[key] ?? 0);

            const hasValue = key === 'network_traffic'
              ? (d['meter_win_network_transmit'] != null || d['meter_win_network_receive'] != null)
              : (d[key] != null);

            // For plotting, use null if no value exists
            const plotValue = hasValue ? rawValue : null;

            let status: 'C' | 'W' | '' = '';
            let markerColor = defaultColors[key];
            let markerRadius = 2;

            if (hasValue && thresholdCritical && rawValue >= thresholdCritical) {
              status = 'C';
              markerColor = CRITICAL_COLOR;
            } else if (hasValue && thresholdWarning && rawValue >= thresholdWarning) {
              status = 'W';
              markerColor = WARNING_COLOR;
            }

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
    this.infraService.getNetworkStatusWindows(this.serviceId, this.startTime, this.endTime, this.host).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.chartNetworkStatus(data);
      this.networkStatusChartInstance = Highcharts.chart('networkStatusChart', this.networkStatusChart!);
      if (!this.charts.includes(this.networkStatusChartInstance)) {
        this.charts.push(this.networkStatusChartInstance);
        this.syncCharts(this.charts);
      }
    })
  }

  chartNetworkStatus(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
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
        meter_win_tcp_curr_estab: 'tcp_curr_estab',
        meter_win_sockets_used: 'sockets_used',
        meter_win_tcp_tw: 'tcp_tw',
        meter_win_tcp_alloc: 'tcp_alloc',
        meter_win_udp_inuse: 'udp_inuse'
      };

      const keysToDisplay = Object.keys(keyMap);

      const colorMap: { [key: string]: string } = {
        meter_win_tcp_curr_estab: '#00798c',
        meter_win_sockets_used: '#70a288',
        meter_win_tcp_tw: '#76c893',
        meter_win_tcp_alloc: '#7d8597',
        meter_win_udp_inuse: '#45ba6a'
      };

      const series: Highcharts.SeriesSplineOptions[] = keysToDisplay.map(key => ({
        name: keyMap[key],
        color: colorMap[key] || undefined,
        data: data.map(d => ({
          x: this.convertTimebucket(d.time_bucket),
          y: typeof d[key] === 'number' ? d[key] : null
        })),
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

      Highcharts.chart('networkStatusChart', this.networkStatusChart!);
    } catch (e) {
      console.log("Error Occurred ", e);
    }
  }

  getDiscSpace(): void {
    this.infraService
      .getDiscSpaceWindows(this.serviceId, this.startTime, this.endTime, this.host)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {

        const diskMap = new Map<string, any>();

        Object.values(data).forEach((item: any) => {
          const name = item.name?.trim();

          // Skip if disk already added
          if (diskMap.has(name)) {
            return;
          }

          const used = Number(item['used']?.trim());
          const total = Number(item['total']?.trim());
          const free = Number(item['free']?.trim());

          const usedPercent = total > 0 ? Math.round((used / total) * 100) : 0;
          const freePercent = 100 - usedPercent;

          if (name?.toUpperCase().startsWith('C:') || name?.toUpperCase().startsWith('C:/')) {
            this.diskPartitionPercent = usedPercent;
          }

          diskMap.set(name, {
            name,
            free,
            used,
            total,
            usedPercent,
            freePercent
          });
        });

        this.discSpaceLists = Array.from(diskMap.values());

        this.updateDiskData();
      });
  }

  itemsPerPageDisk: number = 8;
  currentPageDisk: number = 1;
  totalPagesDisk: number = 0;

  discSpaceLists: any[] = [];         // raw API data
  filteredDiscSpaceList: any[] = [];  // after search/sort
  pagedDiscSpaceList: any[] = [];     // current page

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

  get totalPagesArrayDisk(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.totalPagesDisk <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPagesDisk }, (_, i) => i + 1);
    } else {
      if (this.currentPageDisk <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPagesDisk];
      } else if (this.currentPageDisk >= this.totalPagesDisk - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPagesDisk - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPageDisk - 1, this.currentPageDisk, this.currentPageDisk + 1, '...', this.totalPagesDisk];
      }
    }
    return pages;
  }

  get startIndexDisk(): number {
    return (this.currentPageDisk - 1) * this.itemsPerPageDisk;
  }

  get endIndexDisk(): number {
    return Math.min(this.currentPageDisk * this.itemsPerPageDisk, this.discSpaceLists.length);
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
    let ipAddressId = sessionStorage.getItem('ipAddressId');
    console.log("IPADDRESS ID FOR LINUX", ipAddressId);
    this.componentId = this.serviceId;

    const payload = {
      appId: ipAddressId,
      serviceId: this.componentId,
      st: this.thresholdst,
      et: this.endTime,
      type: "WINDOWS"
    };

    this.meteringConfigService.getThreshold(payload)
      .subscribe(res => {
        this.thresholds = res;
        console.log("Threshold: ", res);
        this.cpuUsageThreshold = res["meter_win_cpu_total_percentage"];
        this.memorySwapThreshold = res["meter_win_memory_swap_percentage"];
        this.memorySwapFreeThreshold = res["meter_win_memory_swap_free"];
        this.memorySwapTotalThreshold = res["meter_win_memory_swap_total"];
        this.memoryRamThreshold = res["meter_win_memory_used"];
        this.loadAverageThreshold = res["meter_win_cpu_load5"];
        // this.cpuUsage = 183;
        this.cpuUsageColor = this.getThresholdColor(this.cpuUsageThreshold, this.cpuUsage);
        this.avgBaselineCpuUsage = this.cpuUsageThreshold.avgBaseline;
        if (this.cpuUsage < this.cpuUsageThreshold.warningValue) {
          this.cpuUsageBadge = this.cpuUsageThreshold.warningValue;
          this.cpuUsageBadgeColor = 'orange';
        } else {
          this.cpuUsageBadge = this.cpuUsageThreshold.criticalValue;
          this.cpuUsageBadgeColor = 'red';
        }

        // this.memoryRamUsage = 15.15;
        this.memoryRamColor = this.getThresholdColor(this.memoryRamThreshold, this.memoryRamUsage);
        this.avgBaselineMemoryRam = this.memoryRamThreshold.avgBaseline;
        if (this.memoryRamUsage < this.memoryRamThreshold.warningValue) {
          this.memoryRamBadge = this.memoryRamThreshold.warningValue;
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
        this.getMemoryRam();
        this.getMemorySwap();
        this.getAvgCpuUsage();
        this.getCpuLoad();
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

  // calculateVisibilityForGraphs(): void {
  //   const cpuThreshold = this.thresholds["meter_win_cpu_total_percentage"];
  //   if (!cpuThreshold) return;

  //   const criticalForCpuUsage = cpuThreshold.criticalValue;
  //   const warningForCpuUsage = cpuThreshold.warningValue;

  //   if (this.cpuUsage >= criticalForCpuUsage) {
  //     this.cpuUsageBadge = `${criticalForCpuUsage.toFixed(2)}%`;
  //     this.cpuUsageBadgeColor = 'red';
  //     this.isCpuUsageGraph = true;
  //   } else if (this.cpuUsage >= warningForCpuUsage) {
  //     this.cpuUsageBadge = `${warningForCpuUsage.toFixed(2)}%`;
  //     this.cpuUsageBadgeColor = 'orange';
  //     this.isCpuUsageGraph = true;
  //   } else {
  //     this.cpuUsageBadge = '';
  //     this.cpuUsageBadgeColor = '';
  //     this.isCpuUsageGraph = false;
  //   }
  // }

  updateChartVisibility(metric: any) {

    if (metric === 'MemoryRam') {
      if (!this.memoryRamChartInstance) return;

      this.chartValuesRam = this.getSelectedMetricValues(this.lastMemoryData || []);

      const selectedMetricKey = this.chartDropdownToMetricKey[this.chartData_criteriaForMemoryRam];

      this.memoryRamChartInstance.series.forEach(series => {
        const seriesKey = Object.keys(this.metricMap).find(k => this.metricMap[k] === series.name);
        if (!seriesKey) return;

        const baseColor = this.getSeriesColor(seriesKey);

        if (this.chartData_criteriaForMemoryRam === 'all') {
          series.update({
            lineWidth: 1.5,
            zIndex: 5,
            color: baseColor
          } as any, false);
        } else {
          const isSelected = seriesKey === selectedMetricKey;
          series.update({
            lineWidth: isSelected ? 2.5 : 1,
            zIndex: isSelected ? 10 : 1,
            color: baseColor
          } as any, false);
        }

        series.points.forEach((p: any) => {
          let markerColor: string = baseColor;
          if (p.status === 'C') markerColor = 'red';
          else if (p.status === 'W') markerColor = 'orange';

          p.update({
            marker: {
              fillColor: markerColor,
              lineColor: markerColor,
              radius: p.status ? 2 : 2
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
      meter_win_memory_total: '#1f77b4',
      meter_win_memory_available: '#2ca02c',
      meter_win_memory_buff_cache: '#416605',
      meter_win_memory_used: '#7A9350',

      meter_win_memory_swap_total: '#1f77b4',
      meter_win_memory_swap_free: '#4a3594',
      meter_win_memory_swap_used: '#556B2F',

      meter_win_cpu_load1: '#1f77b4',
      meter_win_cpu_load5: '#4e3280',
      meter_win_cpu_load15: '#2ca02c',

      meter_win_network_receive: '#1f77b4',
      meter_win_network_transmit: '#9356e3',
      network_traffic: '#2ca02c'

    };
    return defaultColors[key] || '#000';
  }

  getSelectedMetricValues(data: { time_bucket: string;[key: string]: any }[]): {
    avg?: number,
    warning?: number,
    critical?: number
  } {
    const selectedMetricKey = this.chartDropdownToMetricKey[this.chartData_criteriaForMemoryRam];
    if (!selectedMetricKey) return {};

    const values = data
      .map(d => d[selectedMetricKey])
      .filter(v => typeof v === 'number');

    if (!values.length) return {};

    // ✅ Data is already in MB, don’t reconvert
    const avgMB = values.reduce((sum, v) => sum + v, 0) / values.length;

    // ✅ Convert thresholds from bytes → MB
    const threshold = this.thresholds[selectedMetricKey];
    const warningMB = threshold ? threshold.warningValue / (1024 * 1024) : undefined;
    const criticalMB = threshold ? threshold.criticalValue / (1024 * 1024) : undefined;

    return {
      avg: avgMB,
      warning: warningMB,
      critical: criticalMB
    };
  }


  getSelectedMetricValuesSwap(data: any[]): { avg: number, warning: number, critical: number } {
    if (!this.chartData_criteriaForMemorySwap || this.chartData_criteriaForMemorySwap === 'all') {
      return { avg: 0, warning: 0, critical: 0 };
    }

    const key = this.chartDropdownToMetricKeySwap[this.chartData_criteriaForMemorySwap];
    if (!key || !data.length) {
      return { avg: 0, warning: 0, critical: 0 };
    }

    const bytesToMB = (v: number) => v / (1024 * 1024);

    if (key === 'meter_win_memory_swap_used') {
      // Calculate used values in MB
      const usedValues = data.map(d => (d['meter_win_memory_swap_total'] ?? 0) - (d['meter_win_memory_swap_free'] ?? 0));
      const avgUsed = usedValues.reduce((a, b) => a + b, 0) / usedValues.length;

      const totalThr = this.thresholds['meter_win_memory_swap_total'];
      const freeThr = this.thresholds['meter_win_memory_swap_free'];

      let warningMB = 0;
      let criticalMB = 0;

      if (totalThr && freeThr) {
        // Invert free thresholds for used memory
        // Critical free → warning used, Warning free → critical used
        warningMB = bytesToMB(totalThr.criticalValue - freeThr.criticalValue);
        criticalMB = bytesToMB(totalThr.warningValue - freeThr.warningValue);
      }

      return { avg: avgUsed, warning: warningMB, critical: criticalMB };
    }

    if (key === 'meter_win_memory_swap_total') {
      const totalValues = data.map(d => d[key] ?? 0);
      const avgTotal = totalValues.reduce((a, b) => a + b, 0) / totalValues.length;
      return { avg: avgTotal, warning: 0, critical: 0 };
    }

    // For swap_free or others
    const values = data.map(d => d[key] ?? 0);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    const threshold = this.thresholds[key];
    return {
      avg, // already MB
      warning: threshold ? bytesToMB(threshold.warningValue) : 0,
      critical: threshold ? bytesToMB(threshold.criticalValue) : 0
    };
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
        return (d['meter_win_network_transmit'] ?? 0) + (d['meter_win_network_receive'] ?? 0);
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
      const tx = this.thresholds['meter_win_network_transmit'];
      const rx = this.thresholds['meter_win_network_receive'];
      if (tx && rx) {
        thresholdWarning = (tx.warningValue + rx.warningValue) / 1024; // convert to KB
        thresholdCritical = (tx.criticalValue + rx.criticalValue) / 1024;
      }
    } else {
      const threshold = this.thresholds[selectedMetricKey];
      thresholdWarning = threshold ? threshold.warningValue / 1024 : undefined;
      thresholdCritical = threshold ? threshold.criticalValue / 1024 : undefined;
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
    console.log("PROCESS LIST CALLED!!");

    this.infraService.getProcessWindows(this.serviceId, this.startTime, this.endTime, this.host).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
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

  get startIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage;
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
    this.infraService.getServicesWindows(this.serviceId, this.startTime, this.endTime, this.host).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
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

  get totalPagesArray2(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.totalPages2 <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPages2 }, (_, i) => i + 1);
    } else {
      if (this.currentPage2 <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPages2];
      } else if (this.currentPage2 >= this.totalPages2 - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPages2 - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPage2 - 1, this.currentPage2, this.currentPage2 + 1, '...', this.totalPages2];
      }
    }
    return pages;
  }

  get startIndex2(): number {
    return (this.currentPage2 - 1) * this.itemsPerPage2;
  }

  get endIndex2(): number {
    return Math.min(this.currentPage2 * this.itemsPerPage2, this.serviceList.length);
  }

  formatServiceName(item: string): string {
    return item.replace(/-(active|inactive|failed|activating|deactivating|running|stopped)$/i, '');
  }

  getRowClass(item: string): string {
    const lower = item.toLowerCase();
    if (lower.endsWith('-active') || lower.endsWith('-running')) {
      return 'text-active';
    } else if (lower.endsWith('-inactive') || lower.endsWith('-stopped')) {
      return 'text-inactive';
    } else if (lower.endsWith('-failed')) {
      return 'text-failed';
    } else if (lower.endsWith('-activating')) {
      return 'text-activating';
    } else if (lower.endsWith('-deactivating')) {
      return 'text-deactivating';
    } else {
      return '';
    }
  }

  getColorCodingForFilter(item: string): string {
    switch (item) {
      case 'Active':
      case 'Running':
        return 'text-active';
      case 'Inactive':
      case 'Stopped':
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


  stateFilterOptions: string[] = ['Active', 'Running', 'Inactive', 'Stopped', 'Failed', 'Activating', 'Deactivating'];
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

    // Map each filter label to the actual suffix(es) it matches (case-insensitive)
    const stateToSuffixes: Record<string, string[]> = {
      'active':       ['-active'],
      'running':      ['-running'],
      'inactive':     ['-inactive'],
      'stopped':      ['-stopped'],
      'failed':       ['-failed'],
      'activating':   ['-activating'],
      'deactivating': ['-deactivating'],
    };

    this.filteredServiceList = this.serviceList.filter(item => {
      const itemLower = item.toLowerCase();
      const matchesQuery = !query || itemLower.includes(query);

      const matchesState = this.selectedStateFilters.size === 0 ||
        Array.from(this.selectedStateFilters).some(state => {
          const suffixes = stateToSuffixes[state.toLowerCase()] || [`-${state.toLowerCase()}`];
          return suffixes.some(suffix => itemLower.endsWith(suffix));
        });

      return matchesQuery && matchesState;
    });

    this.calculatePagination2();
  }

  getAlertCounts(): void {
    let ipAddressId = sessionStorage.getItem('ipAddressId')!;
    const st = this.formatDate1(this.startTime);
    const et = this.formatDate1(this.endTime);
    this.apmApiService.getAlertCounts('INFRA', ipAddressId, st, et).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.alertData = [data];
    })
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
        this.selectedMetricForThresholdUpdate = 'meter_win_cpu_total_percentage';
        break;
      case 'Memory Usage':
        this.selectedMetricForThresholdUpdate = 'meter_win_memory_used';
        break;
      case 'Swap Usage':
        this.selectedMetricForThresholdUpdate = 'meter_win_memory_swap_percentage';
        break;
      case 'Load Average':
        this.selectedMetricForThresholdUpdate = 'meter_win_cpu_load5';
        break;
      default:
        this.selectedMetricForThresholdUpdate = null;
        return;
    }

    const threshold = this.thresholds[this.selectedMetricForThresholdUpdate];
    const metricThreshold = this.UserGlobthreshold[this.selectedMetricForThresholdUpdate];
    if (metricThreshold) {
      this.selectedMetricWarningPercent = metricThreshold.warning;
      this.selectedMetricCriticalPercent = metricThreshold.critical;
      this.compMetricId = metricThreshold.id
    }
    if (metric === 'Memory Usage') {
      this.selectedMetricWarningValue = +(this.metricThresholdList[this.selectedMetricForThresholdUpdate].warningValue / (1024)).toFixed(2);
      this.selectedMetricCriticalValue = +(this.metricThresholdList[this.selectedMetricForThresholdUpdate].criticalValue / (1024)).toFixed(2);
    } else if (metric === 'Swap Usage') {
      this.selectedMetricWarningValue = this.metricThresholdList[this.selectedMetricForThresholdUpdate].warningValue;
      this.selectedMetricCriticalValue = this.metricThresholdList[this.selectedMetricForThresholdUpdate].criticalValue;
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
        this.thresholds[this.selectedMetricForThresholdUpdate].warningValue = warning;
        this.thresholds[this.selectedMetricForThresholdUpdate].criticalValue = critical;

        this.memorySwapColor = this.getThresholdColor(
          this.thresholds[this.selectedMetricForThresholdUpdate],
          this.memorySwapUsage
        );

        this.memorySwapBadge =
          this.memorySwapUsage < this.thresholds[this.selectedMetricForThresholdUpdate].warningValue
            ? warning
            : critical;
        this.memorySwapBadgeColor =
          this.memorySwapUsage < this.thresholds[this.selectedMetricForThresholdUpdate].warningValue
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
    if (this.selectedMetricType = 'Percentage') {
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
    this.meteringConfigService.getThresholdsByComponent(ipAddressId, "INFRA")
      .subscribe({
        next: (data) => {
          this.UserGlobthreshold = data;
          this.loadSysMetrics()

          console.log('Thresholds:', data);
        },
        error: (err) => console.error('Error loading thresholds:', err)
      });
  }




  loadSysMetrics() {
    const ipAddressId = sessionStorage.getItem('ipAddressId');
    const encodedId = btoa(ipAddressId || '');
    this.meteringConfigService.getSystemMetricsByIpAddrId(encodedId, "infra")
      .subscribe({
        next: (data) => {
          this.SystemMetrics = data
          this.calculateAndStoreThresholds()
        },
        error: (err) => console.error('Error fetching metrics', err)
      });
  }


  // Store thresholds once
  calculateAndStoreThresholds() {
    if (!this.SystemMetrics?.length || !this.UserGlobthreshold) return;

    const systemMetric = this.SystemMetrics[0];

    for (const metricName in this.UserGlobthreshold) {
      const thresholds = this.UserGlobthreshold[metricName];

      let maxValue = 0;
      if (metricName === 'meter_win_cpu_total_percentage') {
        maxValue = systemMetric.cpuTotal;
      } else if (metricName === 'meter_win_memory_used') {
        maxValue = systemMetric.memoryTotal;
      } else if (metricName === 'meter_win_memory_swap_percentage') {
        maxValue = 100;
      } else if (metricName === 'meter_win_fs_root_usage') {
        maxValue = systemMetric.fsRootTotal;
      }

      const warningValue = (maxValue * thresholds.warning) / 100;
      const criticalValue = (maxValue * thresholds.critical) / 100;

      this.metricThresholdList[metricName] = {
        warningValue,
        criticalValue
      };
    }
  }

  // Returns UI state dynamically without pre-calling
  getMetricUiState(
    metricName: string,
    actualValue: number,
    conversionFactor: number = 1 // default = no conversion
  ): { color: string; badgeValue: number; badgeColor: string } {
    const metric = this.metricThresholdList[metricName];
    if (!metric || actualValue == null) {
      return { color: '', badgeValue: 0, badgeColor: '' };
    }

    let color = '';
    let badgeValue = 0;
    let badgeColor = '';

    const warningValueConverted = metric.warningValue / conversionFactor;
    const criticalValueConverted = metric.criticalValue / conversionFactor;

    if (actualValue < warningValueConverted) {
      color = 'green';
      badgeValue = warningValueConverted;
      badgeColor = 'orange';
    } else if (actualValue >= warningValueConverted && actualValue < criticalValueConverted) {
      color = 'orange';
      badgeValue = criticalValueConverted;
      badgeColor = 'red';
    } else if (actualValue >= criticalValueConverted) {
      color = 'red';
      badgeValue = criticalValueConverted;
      badgeColor = 'red';
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
        this.UserGlobthreshold = {}
        this.SystemMetrics = {}
        this.metricThresholdList = {}
        this.loadThresholds()
      },
      error: (err) => console.error('Error updating threshold:', err)
    });

  }



  goToContainerDashboard(event: MouseEvent): void {
    event.preventDefault();
    const aElement = event.target as HTMLElement;
    const serviceId = aElement.textContent?.trim();

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
        const cpuData = data['meter_win_container_cpu_usage_percent'] || {};
        const memoryData = data['meter_win_container_memory_usage_percent'] || {};
        const netRxData = data['meter_win_container_network_received_bytes'] || {};
        const netTxData = data['meter_win_container_network_transmitted_bytes'] || {};
        const statusData = data['meter_win_container_status'] || {};

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

  openModal() {
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
      'windows'
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



}
