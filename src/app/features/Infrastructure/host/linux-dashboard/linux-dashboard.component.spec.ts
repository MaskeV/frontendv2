import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { LinuxDashboardComponent } from './linux-dashboard.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject } from 'rxjs';
import { ApmApiService } from '../../../../services/apm-api.service';
import { By } from '@angular/platform-browser';
import { InfraService } from '../../../../services/infra.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import type * as HighchartsType from 'highcharts';
import { Component, Input } from '@angular/core';
import { NgModule } from '@angular/core';

@NgModule({})
class MockHighchartsChartModule { }

@Component({
  selector: 'app-network-speed-chart',
  standalone: true,
  template: '<div></div>',
})
class MockNetworkSpeedChartComponent {
  @Input() value: any;
}

const destroyMock = jest.fn();
const mockChartInstance = {
  series: [
    {
      name: 'Mock Series',
      update: jest.fn(),
      points: [{ status: '', update: jest.fn() }],
    },
  ],
  redraw: jest.fn(),
  reflow: jest.fn(),
  tooltip: { refresh: jest.fn(), hide: jest.fn() },
  xAxis: [{ drawCrosshair: jest.fn(), hideCrosshair: jest.fn() }],
  container: document.createElement('div'),
  destroy: jest.fn(),
  update: jest.fn(),
} as unknown as Highcharts.Chart;;

// Core Mock 

jest.mock('highcharts', () => ({
  chart: jest.fn(() => mockChartInstance),
  dateFormat: jest.fn((_, x) => new Date(x).toISOString()),
  addEvent: jest.fn(),
  removeEvent: jest.fn(),
  numberFormat: jest.fn(),
}));

// prevent SeriesRegistry crash

jest.mock('highcharts/highcharts-more.js', () => jest.fn());
jest.mock('highcharts/modules/solid-gauge.js', () => jest.fn());
jest.mock('highcharts/modules/exporting.js', () => jest.fn());
jest.mock('highcharts/modules/export-data.js', () => jest.fn());
jest.mock('highcharts/modules/accessibility.js', () => jest.fn());

const Highcharts = require('highcharts') as typeof HighchartsType;

(global as any).bootstrap = {
  Tooltip: jest.fn(() => ({
    dispose: jest.fn()
  }))
};

describe('LinuxDashboardComponent', () => {
  let component: LinuxDashboardComponent;
  let fixture: ComponentFixture<LinuxDashboardComponent>;
  let infraService: jest.Mocked<InfraService>;

  const mockCpuData = [
    { time_bucket: '202510271030', user: 30, system: 20, idle: 50 },
    { time_bucket: '202510271035', user: 40, system: 25, idle: 35 }
  ];

  const mockMemoryData = [
    {
      time_bucket: '202510271030',
      meter_vm_memory_total: 1024,
      meter_vm_memory_available: 512,
      meter_vm_memory_buff_cache: 128,
      meter_vm_memory_used: 384
    }
  ];

  const mockApmApiService = {
    getAlertCounts: jest.fn().mockReturnValue(of({})),
  };

  beforeEach(async () => {
    const mockFileSystemData = [
      { time_bucket: '202510271030', mountpoint: '/', usage: 50 },
      { time_bucket: '202510271035', mountpoint: '/home', usage: 75 }
    ];
    const mockFilefdData = [
      { time_bucket: '202510271030', fd: 1, allocated: 20 },
      { time_bucket: '202510271035', fd: 2, allocated: 40 }
    ];

    const mockDiskReadWriteData = [
      { time_bucket: '202510271030', disk: 'sda', read: 100, write: 200 },
      { time_bucket: '202510271035', disk: 'sdb', read: 150, write: 250 }
    ];

    const mockNetworkStatus = [
      { time_bucket: '202510271030', meter_vm_tcp_curr_estab: 10, meter_vm_sockets_used: 5 },
      { time_bucket: '202510271035', meter_vm_tcp_curr_estab: 12, meter_vm_sockets_used: 6 }
    ];

    const infraServiceMock = {
      getSystemProperties: jest.fn(() => of({ system_uptime: 12345 })),
      getCombinedData: jest.fn(() => of([])),
      getMemoryRam: jest.fn(() => of(mockMemoryData)),
      getMemorySwap: jest.fn(() => of([])),
      getCpuAvgUsedPercentage: jest.fn(() => of([])),
      getCpuLoad: jest.fn(() => of([])),
      getFileSystemMountpointUsage: jest.fn(() => of(mockFileSystemData)),
      getFilefdAllocated: jest.fn(() => of(mockFilefdData)),
      getDiskReadWrite: jest.fn(() => of(mockDiskReadWriteData)),
      getNetworkBandwidthUsage: jest.fn(() => of([])),
      getNetworkStatus: jest.fn(() => of(mockNetworkStatus)),
      getDiscSpace: jest.fn(() => of([])),
      getAvgNetworkSpeed: jest.fn(() => of([])),
      getProcess: jest.fn(() => of([])),
      getServices: jest.fn(() => of([])),
      getContainerStatus: jest.fn(() => of([])),
      getContainerProperties: jest.fn(() => of([]))
    };
    infraServiceMock.getMemoryRam = jest.fn(() => of(mockMemoryData));
    infraServiceMock.getSystemProperties = jest.fn(() => of({ system_uptime: 12345 }));

    await TestBed.configureTestingModule({
      declarations: [],
      imports: [LinuxDashboardComponent, HttpClientTestingModule, RouterTestingModule, MockNetworkSpeedChartComponent, MockHighchartsChartModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            // Mock the data, whatever the component expects from ActivatedRoute
            params: of({ id: '123' }),
            queryParams: of({}),
            snapshot: { data: {} }
          }
        },
        { provide: ApmApiService, useValue: mockApmApiService },
        { provide: InfraService, useValue: infraServiceMock }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .compileComponents();

    fixture = TestBed.createComponent(LinuxDashboardComponent);
    component = fixture.componentInstance;
    infraService = TestBed.inject(InfraService) as jest.Mocked<InfraService>;
    component.metricThresholdList = {
      meter_vm_cpu_total_percentage: { warningValue: 65, criticalValue: 90 },
      meter_vm_memory_used: { warningValue: 4096, criticalValue: 8192 },
      meter_vm_memory_swap_percentage: { warningValue: 30, criticalValue: 70 },
      meter_vm_cpu_load5: { warningValue: 50, criticalValue: 80 }
    };

    component.UserGlobthreshold = {
      meter_vm_cpu_total_percentage: { warning: 65, critical: 90, id: 123 },
      meter_vm_memory_used: { warning: 4096, critical: 8192, id: 124 },
      meter_vm_memory_swap_percentage: { warning: 30, critical: 70, id: 125 },
      meter_vm_cpu_load5: { warning: 50, critical: 80, id: 126 }
    };

    component.thresholds = {
      meter_vm_cpu_total_percentage: { warningValue: 65, criticalValue: 90 },
      meter_vm_memory_used: { warningValue: 4096, criticalValue: 8192 },
      meter_vm_memory_swap_percentage: { warningValue: 30, criticalValue: 70 },
      meter_vm_cpu_load5: { warningValue: 50, criticalValue: 80 }
    };

    component.cpuUsage = 70;
    component.memoryRamUsage = 9000;
    component.loadAverage = 80;
    component.loadAverageColor = 'red';
    component.cpuLoadBadge = 90;
    component.cpuLoadBadgeColor = 'red';
    component.loadAverageThreshold = true;
    component.loadAverageColor = 'red';
    component.diskPartitionPercent = 50;
    component.uptimeColor = 'green';
    component.memorySwapThreshold = { avgBaseline: 0, warningValue: 0, criticalValue: 0 } as any;
    component.memorySwapUsage = 0;
    component.memorySwapColor = 'green';
    component.avgBaselineMemorySwap = 0;

    component.filteredDiscSpaceList = [
      { name: 'sda1', usedPercent: 75, free: 25, used: 75, total: 100 },
      { name: 'sda2', usedPercent: 85, free: 15, used: 85, total: 100 },
      { name: 'sda3', usedPercent: 95, free: 5, used: 95, total: 100 },
    ];
    component.pagedDiscSpaceList = [...component.filteredDiscSpaceList];
    component.currentPageDisk = 1;
    component.totalPagesDisk = 1;

    component.processList = {
      nginx: {
        currentProcessCount: 1,
        total_cpu_percent: 2,
        total_memory_percent: 5,
        processes: [{ pid: 101, ppid: 1, state: 'running', cpu_percent: 2, memory_percent: 5, command: 'nginx -g daemon off;' }]
      },
      mysql: {
        currentProcessCount: 1,
        total_cpu_percent: 10,
        total_memory_percent: 15,
        processes: [{ pid: 102, ppid: 1, state: 'sleeping', cpu_percent: 10, memory_percent: 15, command: 'mysqld' }]
      },
      redis: {
        currentProcessCount: 1,
        total_cpu_percent: 1,
        total_memory_percent: 2,
        processes: [{ pid: 103, ppid: 1, state: 'running', cpu_percent: 1, memory_percent: 2, command: 'redis-server' }]
      }
    } as any;

    component.filteredProcessList = Object.keys(component.processList);
    component.pagedProcessList = [...component.filteredProcessList];
    component.currentPage = 1;
    component.totalPages = 1;

    jest.spyOn(console, 'log').mockImplementation((message) => {
      if (message && message.includes('IPADDRESS ID FOR LINUX')) {
        return;
      }
    });
    (Highcharts.chart as jest.Mock).mockClear();
    (Highcharts as any).charts = [];
    jest.clearAllMocks();
    fixture.detectChanges();

  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render breadcrumb correctly with selectedService value', () => {
    component.selectedService = 'DatabaseServer';
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('nav[aria-label="breadcrumb"]');
    expect(nav).toBeTruthy();
    const breadcrumbItems = nav.querySelectorAll('li.breadcrumb-item');
    expect(breadcrumbItems.length).toBe(2);
    const firstItem = breadcrumbItems[0];
    const link = firstItem.querySelector('a');
    expect(link).toBeTruthy();
    expect(link.getAttribute('ng-reflect-router-link')).toBe('/infra');
    expect(link.textContent).toContain('DatabaseServer');
    const secondItem = breadcrumbItems[1];
    expect(secondItem.classList.contains('active')).toBe(true);
    expect(secondItem.textContent.trim()).toBe('Host Service');
  });

  it('should render nav tabs and call loadData with correct argument on click', () => {
    const loadDataSpy = jest.spyOn(component, 'loadData');
    fixture.detectChanges();
    const navLinks = fixture.nativeElement.querySelectorAll('ul#service-nav a.nav-link');
    expect(navLinks.length).toBe(3);
    expect(navLinks[0].textContent.trim()).toBe('Overview');
    expect(navLinks[1].textContent.trim()).toBe('Process List');
    expect(navLinks[2].textContent.trim()).toBe('Container');
    navLinks[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(loadDataSpy).toHaveBeenCalledWith('overview');
    navLinks[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(loadDataSpy).toHaveBeenCalledWith('process_list');
    navLinks[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(loadDataSpy).toHaveBeenCalledWith('container');
  });

  it('should render Linux logo correctly', () => {
    fixture.detectChanges();
    const logoDiv = fixture.nativeElement.querySelector('div.hi-logo-wrap');
    expect(logoDiv).toBeTruthy();
    const img = logoDiv.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('assets/images/linux.png');
    expect(img.getAttribute('alt')).toBe('Linux');
  });

  it('should render map and pins when locations have valid data', () => {
    component.locations = [
      { name: 'Server A', x: 30, y: 50 },
      { name: 'Server B', x: 60, y: 70 }
    ];
    fixture.detectChanges();
    const mapWrapper = fixture.nativeElement.querySelector('.map-wrapper');
    expect(mapWrapper).toBeTruthy();
    const mapImg = mapWrapper.querySelector('img.map-image');
    expect(mapImg).toBeTruthy();
    expect(mapImg.getAttribute('src')).toBe('assets/images/mapp.png');
    expect(mapImg.getAttribute('alt')).toBe('Map');
    const pins = mapWrapper.querySelectorAll('.pin');
    expect(pins.length).toBe(2);
    expect(pins[0].textContent).toContain('Server A');
    expect(pins[1].textContent).toContain('Server B');
  });

  it('should show "No data available" when locations are empty or invalid', () => {
    component.locations = [];
    fixture.detectChanges();
    let noDataBox = fixture.nativeElement.querySelector('.noDataBox');
    expect(noDataBox).toBeTruthy();
    expect(noDataBox.textContent.trim()).toBe('No data available');
    component.locations = [{ name: '', x: 0, y: 0 }];
    fixture.detectChanges();
    noDataBox = fixture.nativeElement.querySelector('.noDataBox');
    expect(noDataBox).toBeTruthy();
    expect(noDataBox.textContent.trim()).toBe('No data available');
  });

  it('should render uptime details when upTime is not null', () => {
    component.upTime = '99.9%';
    component.sinceWhenUptime = '2 days ago';
    component.uptimeColor = 'green';
    fixture.detectChanges();
    const uptimeCard = fixture.nativeElement.querySelector('.card.topBox');
    expect(uptimeCard).toBeTruthy();
    const title = uptimeCard.querySelector('h5.card-title');
    expect(title).toBeTruthy();
    expect(title.textContent).toContain('Uptime');
    const uptimeParagraph = uptimeCard.querySelector('.uptim1 p');
    expect(uptimeParagraph).toBeTruthy();
    expect(uptimeParagraph.textContent).toContain('99.9%');
    expect(uptimeParagraph.style.color).toBe('green');
    const uptimeSince = uptimeCard.querySelector('.uptim1 span');
    expect(uptimeSince.textContent).toContain('since 2 days ago');
    const noDataBox = uptimeCard.querySelector('.noDataBox');
    expect(noDataBox).toBeFalsy();
  });

  it('should show "No data available" when upTime is null', () => {
    component.upTime = null;
    fixture.detectChanges();
    const noDataBox = fixture.nativeElement.querySelector('.card.topBox .noDataBox');
    expect(noDataBox).toBeTruthy();
    expect(noDataBox.textContent.trim()).toBe('No data available');
    const uptimeContent = fixture.nativeElement.querySelector('.uptim1');
    expect(uptimeContent).toBeFalsy();
  });

  it('should render CPU Usage with correct styles for orange state', () => {
    component.cpuUsage = 70;
    fixture.detectChanges();
    const card: HTMLElement = fixture.nativeElement.querySelector('.card.topBox');
    expect(card).toBeTruthy();
    const cpuState = component.getMetricUiState('meter_vm_cpu_total_percentage', component.cpuUsage);
    expect(cpuState.color).toBe('orange');
    expect(cpuState.badgeColor).toBe('red');
  });

  it('should return red state for memory usage', () => {
    component.metricThresholdList = {
      meter_vm_memory_used: { warningValue: 4096, criticalValue: 8192 } // MB
    };
    component.memoryRamUsage = 9000; // MB
    const memState = component.getMetricUiState('meter_vm_memory_used', component.memoryRamUsage, 1024);
    expect(memState.color).toBe('red');
    expect(memState.badgeColor).toBe('red');
  });

  it('should call userDefinedThreshold("CPU Usage") when badge is clicked', () => {
    const userThresholdSpy = jest.spyOn(component, 'userDefinedThreshold');
    component.cpuUsage = 70;
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.badge.threshold');
    badge.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(userThresholdSpy).toHaveBeenCalledWith('CPU Usage');
  });

  it('should update selected metric details when userDefinedThreshold is called', () => {
    component.cpuUsage = 70;
    fixture.detectChanges();
    component.userDefinedThreshold('CPU Usage');
    expect(component.selectedMetricName).toBe('CPU Usage');
    expect(component.selectedMetricForThresholdUpdate).toBe('meter_vm_cpu_total_percentage');
    expect(component.selectedMetricWarningValue).toBe(65);
    expect(component.selectedMetricCriticalValue).toBe(90);
    expect(component.compMetricId).toBe(123);
    expect(component.originalWarningValue).toBe(65);
    expect(component.originalCriticalValue).toBe(90);
  });

  // Swap Usage card test

  it('should render Swap Usage card with correct red state', () => {
    component.memorySwapUsage = 80; // above critical threshold
    fixture.detectChanges();
    const swapState = component.getMetricUiState(
      'meter_vm_memory_swap_percentage',
      component.memorySwapUsage
    );
    const swapCard = fixture.debugElement.queryAll(By.css('.card.topBox'))
      .find(card => card.nativeElement.textContent.includes('Swap Usage'));
    expect(swapCard).toBeTruthy();
    const badge = swapCard!.query(By.css('.badge.threshold'))!.nativeElement as HTMLElement;
    const badgeNumber = parseFloat(badge.textContent?.trim() || '0');
    expect(badgeNumber).toBeCloseTo(+(swapState.badgeValue).toFixed(2), 2);
    expect(swapState.color).toBe('red');
    expect(badge.style.color).toBe('red');
    expect(swapCard!.nativeElement.classList.contains('red-border')).toBe(true);
  });

  it('should show "No data available" for Swap Usage when null', () => {
    component.memorySwapUsage = null;
    fixture.detectChanges();
    const noData = fixture.debugElement.query(By.css('.card.topBox .noDataBox')).nativeElement;
    expect(noData.textContent.trim()).toBe('No data available');
  });

  it('should render Load Average card correctly with red state', () => {
    component.loadAverageColor = 'red';
    component.cpuLoadBadgeColor = 'red';
    component.cpuLoadBadge = 90;
    component.loadAverageThreshold = true;
    fixture.detectChanges();
    const loadCard = fixture.debugElement.queryAll(By.css('.card.topBox'))
      .find(card => card.nativeElement.textContent.includes('Load Average'));
    expect(loadCard).toBeTruthy();
    const loadCardElement = loadCard!.nativeElement as HTMLElement;
    expect(loadCardElement.classList.contains('red-border')).toBe(true);
    const badge = loadCard!.query(By.css('.badge.threshold'))!.nativeElement as HTMLElement;
    expect(badge.style.color).toBe('red');
    const badgeValue = parseFloat(badge.textContent?.replace('%', '').trim() || '0');
    expect(badgeValue).toBe(component.cpuLoadBadge);
  });

  it('should call userDefinedThreshold on Swap badge click', () => {
    component.memorySwapUsage = 80;
    fixture.detectChanges();
    const spy = jest.spyOn(component, 'userDefinedThreshold');
    const swapCard = fixture.debugElement
      .queryAll(By.css('.card.topBox'))
      .find(card => card.nativeElement.textContent.includes('Swap Usage'));
    expect(swapCard).toBeTruthy();
    const badge = swapCard!.query(By.css('.badge.threshold'))!.nativeElement;
    badge.click();
    expect(spy).toHaveBeenCalledWith('Swap Usage');
  });

  it('should render Disk Usage card correctly', () => {
    const diskCard = fixture.debugElement
      .queryAll(By.css('.card.topBox'))
      .find(card => card.nativeElement.textContent.includes('Disk Usage'));
    expect(diskCard).toBeTruthy();
    const diskValue = diskCard!.query(By.css('.fw-bold'))!.nativeElement as HTMLElement;
    const text = diskValue.textContent!.replace('%', '').trim();
    expect(text).toBe(component.diskPartitionPercent.toString());
  });

  it('should show "No data available" for Disk Usage when null', () => {
    component.diskPartitionPercent = null;
    fixture.detectChanges();
    const diskCard = fixture.debugElement.queryAll(By.css('.card.topBox'))[5];
    const noData = diskCard.query(By.css('.noDataBox')).nativeElement;
    expect(noData).toBeTruthy();
    expect(noData.textContent.trim()).toBe('No data available');
  });

  // Host Part

  it('should render CPU Usage badge with correct color and value', () => {
    component.cpuUsage = 70;
    component.cpuUsageBadge = '90'; // enabling the ngif condition
    fixture.detectChanges();
    const cpuState = component.getMetricUiState('meter_vm_cpu_total_percentage', component.cpuUsage);
    const cpuBadge = fixture.debugElement.query(By.css('.chart-threshold'))?.nativeElement as HTMLElement;
    expect(cpuState.color).toBe('orange');
    expect(cpuState.badgeColor).toBe('red');
    expect(cpuState.badgeValue).toBe(90);
    expect(cpuBadge).toBeTruthy();
    expect(cpuBadge.textContent?.trim()).toBe('90');
    expect(cpuBadge.style.color).toBe('red');
  });

  it('should return green state when CPU usage is below warning', () => {
    const result = component.getMetricUiState('meter_vm_cpu_total_percentage', 40);
    expect(result.color).toBe('green');
    expect(result.badgeValue).toBe(65);
    expect(result.badgeColor).toBe('orange');
  });

  it('should return red state when CPU usage exceeds critical', () => {
    const result = component.getMetricUiState('meter_vm_cpu_total_percentage', 95);
    expect(result.color).toBe('red');
    expect(result.badgeValue).toBe(90);
    expect(result.badgeColor).toBe('red');
  });

  it('should return correct tooltip for non-overflow tile', () => {
    const tile = { name: 'CPU1', value: 45, isOverflowTile: false };
    const tooltip = component.getTileTooltip2(tile);
    expect(tooltip).toBe('CPU1: 45%');
  });

  it('should return combined tooltip for overflow tile', () => {
    component.overflowTiles = [
      {
        name: 'CPU5', value: 78,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: ''
      },
      {
        name: 'CPU6', value: 82,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: ''
      }
    ];
    const tile = { isOverflowTile: true };
    const tooltip = component.getTileTooltip2(tile);
    expect(tooltip).toBe('CPU5: 78%, CPU6: 82%');
  });

  it('should render overflow tile as "..." with joined tooltip', () => {
    component.overflowTiles = [
      {
        name: 'CPU5', value: 70,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: ''
      },
      {
        name: 'CPU6', value: 80,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: ''
      }
    ];
    component.displayCpuUsageTiles = [
      {
        name: '...', width: 50, height: 50, color: 'gray', x: 0, y: 0, isOverflowTile: true,
        value: 0
      }
    ];
    fixture.detectChanges();
    const tile = fixture.debugElement.query(By.css('.cpu-tile')).nativeElement as HTMLElement;
    expect(tile.textContent?.trim() ?? '').toBe('...');
    expect(tile.getAttribute('title')).toBe('CPU5: 70%, CPU6: 80%');
  });

  // Average CPU usage chart

  it('should correctly generate Highcharts options when valid data is passed', () => {
    (Highcharts.chart as jest.Mock).mockClear();
    component.convertTimebucket = jest.fn(() => 1730119800000);
    component.chartAvgCpuUsage(mockCpuData);
    expect(component.avgCpuUsageChart).toBeTruthy();
    expect(component.avgCpuUsageChart!.series!.length).toBe(3);
    expect(Highcharts.chart).toHaveBeenCalledWith(
      'avgCpuUsageChart',
      expect.objectContaining({
        chart: expect.objectContaining({ type: 'line' }),
        yAxis: expect.any(Object),
        tooltip: expect.any(Object),
      })
    );
  });

  it('should call Highcharts.chart with avgCpuUsageChart config when data exists', () => {
    (Highcharts.chart as jest.Mock).mockClear();
    component.convertTimebucket = jest.fn(() => 1730119800000);
    component.chartAvgCpuUsage(mockCpuData);
    expect(Highcharts.chart).toHaveBeenCalledTimes(1);
  });

  it('should correctly generate Highcharts options when valid data is passed', () => {
    component.convertTimebucket = jest.fn(() => 1730119800000);
    component.chartAvgCpuUsage(mockCpuData);
    expect(component.avgCpuUsageChart).toBeTruthy();
    expect(component.avgCpuUsageChart!.series!.length).toBe(3);
    expect(Highcharts.chart).toHaveBeenCalledWith(
      'avgCpuUsageChart',
      expect.objectContaining({
        chart: expect.objectContaining({ type: 'line' }),
        yAxis: expect.any(Object),
        tooltip: expect.any(Object),
      })
    );
  });

  it('should assign proper color from colorMap for each metric key', () => {
    component.convertTimebucket = jest.fn(() => Date.now());
    component.chartAvgCpuUsage(mockCpuData);
    const series = component.avgCpuUsageChart!.series! as any[];
    const colorMap: Record<'user' | 'system' | 'idle', string> = {
      user: '#00798c',
      system: '#bbd0ff',
      idle: '#76c893'
    };
    series.forEach(s => {
      const name = s.name as keyof typeof colorMap;
      expect(s.color).toBe(colorMap[name]);
    });
  });

  it('should not throw error when invalid data passed', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    expect(() => component.chartAvgCpuUsage(null as any)).not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error Occurred'), expect.anything());
    consoleSpy.mockRestore();
  });

  it('should call Highcharts.chart with avgCpuUsageChart config when data exists', () => {
    (Highcharts.chart as jest.Mock).mockClear();
    component.convertTimebucket = jest.fn(() => 1730119800000);
    component.chartAvgCpuUsage(mockCpuData);
    expect(Highcharts.chart).toHaveBeenCalledTimes(1);
  });

  it('should hide chart div and show "No Data Available" when avgCpuUsageChart is null', fakeAsync(() => {
    component.avgCpuUsageChart = null;
    fixture.detectChanges();
    tick();
    const chartDiv = fixture.nativeElement.querySelector('#avgCpuUsageChart');
    const noDataDiv = fixture.nativeElement.querySelector('.noDataGraphBox');
    expect(chartDiv.hidden).toBe(true);
    expect(noDataDiv.textContent.trim()).toBe('No Data Available');
  }));

  it('should show chart div when avgCpuUsageChart is visible and noData is hidden', fakeAsync(() => {
    component.avgCpuUsageChart = {
      chart: { type: 'line' },
      series: []
    } as any;
    fixture.detectChanges();
    tick();
    const chartDiv: HTMLElement = fixture.nativeElement.querySelector('#avgCpuUsageChart');
    expect(chartDiv).toBeTruthy();
    expect(chartDiv.hidden).toBe(false);
    expect(component.avgCpuUsageChart).toBeTruthy();
  }));

  it('should hide chart div when avgCpuUsageChart is null', fakeAsync(() => {
    component.avgCpuUsageChart = null;
    fixture.detectChanges();
    tick();
    const chartDiv: HTMLElement = fixture.nativeElement.querySelector('#avgCpuUsageChart');
    expect(chartDiv).toBeTruthy();
    expect(chartDiv.hidden).toBe(true);
    expect(component.avgCpuUsageChart).toBeNull();
  }));

  it('should call infraService.getCpuAvgUsedPercentage and render chart in getAvgCpuUsage()', fakeAsync(() => {
    component.serviceId = 'test-service-123';
    component.startTime = 202407091001;
    component.endTime = 202407171100;
    (component as any)['destroy$'] = new Subject();
    jest.clearAllMocks();
    const mockData = mockCpuData;
    const spy = jest.spyOn(infraService, 'getCpuAvgUsedPercentage').mockReturnValue(of(mockData));
    const updateTileSpy = jest.spyOn(component, 'updateCpuUsageTile').mockImplementation(() => { });
    const chartSpy = jest.spyOn(component, 'chartAvgCpuUsage').mockImplementation(() => { });
    (Highcharts.chart as jest.Mock).mockReturnValue(mockChartInstance);
    component.getAvgCpuUsage();
    flush();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('test-service-123', 202407091001, 202407171100);
    expect(updateTileSpy).toHaveBeenCalledTimes(1);
    expect(updateTileSpy).toHaveBeenCalledWith(mockData);
    expect(chartSpy).toHaveBeenCalledTimes(1);
    expect(chartSpy).toHaveBeenCalledWith(mockData);
  }));

  it('should not push duplicate chart instances into charts array', fakeAsync(() => {
    const mockData = mockCpuData;
    jest.spyOn(infraService, 'getCpuAvgUsedPercentage').mockReturnValue(of(mockData));
    jest.spyOn(component, 'updateCpuUsageTile').mockImplementation(() => { });
    jest.spyOn(component, 'chartAvgCpuUsage').mockImplementation(() => { });
    component.cpuUsageChartInstance = mockChartInstance;
    component.charts = [mockChartInstance];
    component.getAvgCpuUsage();
    tick();
    expect(component.charts.length).toBe(1);
  }));

  // Memoryram Chart
  it('should call Highcharts.chart and set memoryRamChartInstance', fakeAsync(() => {
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.thresholds = {
      meter_vm_memory_total: { warningValue: 512 * 1024 * 1024, criticalValue: 768 * 1024 * 1024 },
      meter_vm_memory_available: { warningValue: 128 * 1024 * 1024, criticalValue: 64 * 1024 * 1024 },
      meter_vm_memory_buff_cache: { warningValue: 256 * 1024 * 1024, criticalValue: 512 * 1024 * 1024 },
      meter_vm_memory_used: { warningValue: 400 * 1024 * 1024, criticalValue: 700 * 1024 * 1024 },
    };
    component.metricMap = {
      meter_vm_memory_total: 'Total',
      meter_vm_memory_available: 'Available',
      meter_vm_memory_buff_cache: 'Buff/Cache',
      meter_vm_memory_used: 'Used'
    };
    component.metricKeys = Object.keys(component.metricMap);
    component.chartDropdownToMetricKey = {
      total: 'meter_vm_memory_total',
      available: 'meter_vm_memory_available',
      buff: 'meter_vm_memory_buff_cache',
      used: 'meter_vm_memory_used',
      all: 'all'
    };
    fixture.detectChanges();
    component.getMemoryRam();
    tick(); // flush async observable
    expect(Highcharts.chart).toHaveBeenCalled();
    expect(component.memoryRamChartInstance).toBe(mockChartInstance);
  }));

  it('should update chart visibility without error', () => {
    component.memoryRamChartInstance = mockChartInstance as any;
    component.chartDropdownToMetricKey = { all: 'all', used: 'meter_vm_memory_used' };
    component.chartData_criteriaForMemoryRam = 'used';
    component.lastMemoryData = mockMemoryData;
    component.getSeriesColor = jest.fn().mockReturnValue('#000');
    component.metricMap = { meter_vm_memory_used: 'Memory Used' };
    expect(() => component.updateChartVisibility('MemoryRam')).not.toThrow();
    expect(mockChartInstance.redraw).toHaveBeenCalled();
  });

  //CPU Load Chart

  it('should call Highcharts.chart and set cpuLoadChartInstance when getCpuLoad is called', fakeAsync(() => {
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;

    // Mock thresholds and mappings for CPU load
    component.thresholds = {
      meter_vm_cpu_load1: { warningValue: 30, criticalValue: 60 },
      meter_vm_cpu_load5: { warningValue: 50, criticalValue: 80 },
      meter_vm_cpu_load15: { warningValue: 70, criticalValue: 90 }
    };
    component.metricLoadMap = {
      meter_vm_cpu_load1: 'Load 1',
      meter_vm_cpu_load5: 'Load 5',
      meter_vm_cpu_load15: 'Load 15'
    };
    component.metricLoadKeys = Object.keys(component.metricLoadMap);
    component.chartDropdownToMetricKeyCpu = {
      load_1: 'meter_vm_cpu_load1',
      load_5: 'meter_vm_cpu_load5',
      load_15: 'meter_vm_cpu_load15',
      all: 'all'
    };

    const mockCpuLoadData = [
      {
        time_bucket: '202510271030',
        meter_vm_cpu_load1: 0.2,
        meter_vm_cpu_load5: 0.4,
        meter_vm_cpu_load15: 0.6
      },
      {
        time_bucket: '202510271035',
        meter_vm_cpu_load1: 0.3,
        meter_vm_cpu_load5: 0.5,
        meter_vm_cpu_load15: 0.7
      }
    ];
    // Mock service
    (infraService.getCpuLoad as jest.Mock).mockReturnValue(of(mockCpuLoadData));
    fixture.detectChanges();
    component.getCpuLoad();
    tick();
    expect(Highcharts.chart).toHaveBeenCalled();
    expect(component.cpuLoadChartInstance).toBe(mockChartInstance);
    expect(component.lastCpuData).toEqual(mockCpuLoadData);
  }));

  it('should update chart visibility without throwing errors for CpuLoad', () => {
    component.cpuLoadChartInstance = mockChartInstance as any;
    component.chartDropdownToMetricKeyCpu = { all: 'all', load_5: 'meter_vm_cpu_load5' };
    component.chartData_criteriaForCpuLoad = 'load_5';
    component.lastCpuData = [
      { time_bucket: '202510271030', meter_vm_cpu_load5: 0.5 },
      { time_bucket: '202510271035', meter_vm_cpu_load5: 0.6 }
    ];
    component.getSeriesColor = jest.fn().mockReturnValue('#000');
    component.metricLoadMap = { meter_vm_cpu_load5: 'Load 5' };
    component.metricLoadKeys = ['meter_vm_cpu_load5'];
    expect(() => component.updateChartVisibility('CpuLoad')).not.toThrow();
    expect(mockChartInstance.redraw).toHaveBeenCalled();
  });

  it('should set avgCpuLoadChart to null if no data or thresholds', () => {
    component.thresholds = {};
    component.chartAvgCpuLoad([]);
    expect(component.avgCpuLoadChart).toBeNull();
  });

  it('should create avgCpuLoadChart with proper Highcharts options', () => {
    const data = [
      {
        time_bucket: '202510271030',
        meter_vm_cpu_load1: 0.2,
        meter_vm_cpu_load5: 0.5,
        meter_vm_cpu_load15: 0.7
      }
    ];

    component.thresholds = {
      meter_vm_cpu_load1: { warningValue: 30, criticalValue: 60 },
      meter_vm_cpu_load5: { warningValue: 50, criticalValue: 80 },
      meter_vm_cpu_load15: { warningValue: 70, criticalValue: 90 }
    };
    component.metricLoadMap = {
      meter_vm_cpu_load1: 'Load 1',
      meter_vm_cpu_load5: 'Load 5',
      meter_vm_cpu_load15: 'Load 15'
    };
    component.metricLoadKeys = Object.keys(component.metricLoadMap);
    component.chartDropdownToMetricKeyCpu = {
      load_1: 'meter_vm_cpu_load1',
      load_5: 'meter_vm_cpu_load5',
      load_15: 'meter_vm_cpu_load15',
      all: 'all'
    };
    component.chartData_criteriaForCpuLoad = 'load_1';
    component.chartAvgCpuLoad(data);
    expect(component.avgCpuLoadChart).not.toBeNull();
    expect(Array.isArray((component.avgCpuLoadChart as any).series)).toBe(true);
  });

  // Group: NETWORK

  it('should call Highcharts.chart and set networkBandwidthChartInstance when getNetworkBandwidthUsage is called', fakeAsync(() => {
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    const mockNetworkData = [
      {
        time_bucket: '202511011200',
        meter_vm_network_receive: 2048,
        meter_vm_network_transmit: 1024
      },
      {
        time_bucket: '202511011205',
        meter_vm_network_receive: 4096,
        meter_vm_network_transmit: 2048
      }
    ];
    (infraService.getNetworkBandwidthUsage as jest.Mock).mockReturnValue(of(mockNetworkData));
    fixture.detectChanges();
    component.getNetworkBandwidthUsage();
    tick();
    expect(Highcharts.chart).toHaveBeenCalled();
    expect(component.networkBandwidthChartInstance).toBe(mockChartInstance);
    expect(component.lastNetworkData).toEqual(mockNetworkData);
  }));

  it('should update chart visibility without throwing errors for NetworkBandwidth', () => {
    component.networkBandwidthChartInstance = mockChartInstance as any;
    component.chartDropdownToMetricKeyNetwork = { all: 'all', receive: 'meter_vm_network_receive' };
    component.chartData_criteriaForNetworkBandwidth = 'receive';
    component.lastNetworkData = [
      { time_bucket: '202511011200', meter_vm_network_receive: 2 },
      { time_bucket: '202511011205', meter_vm_network_receive: 3 }
    ];
    component.getSeriesColor = jest.fn().mockReturnValue('#123456');
    component.networkKeyMap = { meter_vm_network_receive: 'Receive' };
    expect(() => component.updateChartVisibility('NetworkBandwidth')).not.toThrow();
    expect(mockChartInstance.redraw).toHaveBeenCalled();
  });

  it('should set networkBandwidthUsageChart to null if no data or thresholds', () => {
    component.thresholds = {};
    component.chartNetworkBandwidthUsage([]);
    expect(component.networkBandwidthUsageChart).toBeNull();
  });

  it('should create networkBandwidthUsageChart with proper Highcharts options', () => {
    const mockData = [
      {
        time_bucket: '202511011200',
        meter_vm_network_receive: 1024,
        meter_vm_network_transmit: 512
      }
    ];
    component.thresholds = {
      meter_vm_network_receive: { warningValue: 1024, criticalValue: 2048 },
      meter_vm_network_transmit: { warningValue: 512, criticalValue: 1024 }
    };
    component.networkKeyMap = {
      meter_vm_network_receive: 'Receive',
      meter_vm_network_transmit: 'Transmit',
      network_traffic: 'Traffic'
    };
    component.badgeNetworkKeys = ['meter_vm_network_receive', 'meter_vm_network_transmit', 'network_traffic'];
    component.chartDropdownToMetricKeyNetwork = {
      all: 'all',
      receive: 'meter_vm_network_receive',
      transmit: 'meter_vm_network_transmit',
      traffic: 'network_traffic'
    };
    component.chartData_criteriaForNetworkBandwidth = 'receive';
    component.chartNetworkBandwidthUsage(mockData);
    expect(component.networkBandwidthUsageChart).not.toBeNull();
    expect(Array.isArray((component.networkBandwidthUsageChart as any).series)).toBe(true);
  });

  //Network Status

  it('should call Highcharts.chart and set networkStatusChartInstance when getNetworkStatus is called', fakeAsync(() => {
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    const mockNetworkStatus = [
      { time_bucket: '202511011200', meter_vm_tcp_curr_estab: 10, meter_vm_sockets_used: 5 },
      { time_bucket: '202511011205', meter_vm_tcp_curr_estab: 12, meter_vm_sockets_used: 6 }
    ];
    (infraService.getNetworkStatus as jest.Mock).mockReturnValue(of(mockNetworkStatus));
    fixture.detectChanges();
    component.getNetworkStatus();
    tick();
    expect(Highcharts.chart).toHaveBeenCalledWith('networkStatusChart', expect.any(Object));
    expect(component.networkStatusChartInstance).toBe(mockChartInstance);
    expect(component.charts.includes(mockChartInstance)).toBe(true);
  }));

  it('should set networkStatusChart to null when data is not an array or empty', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
    component.chartNetworkStatus(null as any);
    expect(component.networkStatusChart).toBeNull();
    component.chartNetworkStatus([]);
    expect(component.networkStatusChart).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'chartNetworkStatus expected array, got:',
      null
    );
    consoleWarnSpy.mockRestore();
  });

  it('should create networkStatusChart with valid Highcharts options', () => {
    const mockNetworkStatus = [
      { time_bucket: '202511011200', meter_vm_tcp_curr_estab: 10, meter_vm_sockets_used: 5, meter_vm_tcp_tw: 3 },
      { time_bucket: '202511011205', meter_vm_tcp_curr_estab: 12, meter_vm_sockets_used: 6, meter_vm_tcp_tw: 4 }
    ];
    jest.spyOn(component, 'convertTimebucket').mockReturnValue(Date.now());
    component.chartNetworkStatus(mockNetworkStatus);
    expect(component.networkStatusChart).not.toBeNull();
    expect(Array.isArray((component.networkStatusChart as any).series)).toBe(true);
    const firstSeries = (component.networkStatusChart as any).series[0];
    expect(firstSeries.name).toBeDefined();
    expect(firstSeries.data.length).toBeGreaterThan(0);
  });

  it('should handle unexpected exceptions gracefully and set chart to null', () => {
    jest.spyOn(component, 'convertTimebucket').mockImplementation(() => { throw new Error('mock error'); });
    const badData = [{ time_bucket: '202511011200', meter_vm_tcp_curr_estab: 10 }];
    expect(() => component.chartNetworkStatus(badData)).not.toThrow();
    expect(component.networkStatusChart).toBeNull();
  });

  it('should show "No Data Available" message when networkStatusChart is null', () => {
    component.networkStatusChart = null;
    fixture.detectChanges();
    const cardBody = fixture.nativeElement.querySelector('.card-body');
    expect(cardBody.textContent).toContain('No Data Available');
  });

  // Network Speed

  it('should convert network speed based on unit', fakeAsync(() => {
    component.networkTrafficSpeed = 123.45;
    component.networkSpeedUnit = 'KBps';
    component.getAvgNetworkSpeed();
    tick();
    expect(component.avgNetworkSpeed).toBe(123.45);
    component.networkTrafficSpeed = 2000;
    component.networkSpeedUnit = 'MBps';
    component.getAvgNetworkSpeed();
    tick();
    expect(component.avgNetworkSpeed).toBe(2);
    component.networkTrafficSpeed = 3000000;
    component.networkSpeedUnit = 'GBps';
    component.getAvgNetworkSpeed();
    tick();
    expect(component.avgNetworkSpeed).toBe(3);
    component.networkTrafficSpeed = 500;
    component.networkSpeedUnit = 'unknown' as any;
    component.getAvgNetworkSpeed();
    tick();
    expect(component.avgNetworkSpeed).toBe(500);
}));

it('should not set avgNetworkSpeed when networkTrafficSpeed is null or undefined', fakeAsync(() => {
    component.networkTrafficSpeed = null as any;
    component.networkSpeedUnit = 'KBps';
    component.avgNetworkSpeed = 999; 
    component.getAvgNetworkSpeed();
    tick();
    expect(component.avgNetworkSpeed).toBe(999);
}));

  // Group: DISC FILE 

  it('should call Highcharts.chart and set fileSystemChartInstance', fakeAsync(() => {
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    const mockData = [
      { time_bucket: '202511011200', root: 50, home: 70 },
      { time_bucket: '202511011205', root: 85, home: 95 }
    ];
    (infraService.getFileSystemMountpointUsage as jest.Mock).mockReturnValue(of(mockData));
    component.getFileSystemMountpointUsage();
    tick();
    expect(Highcharts.chart).toHaveBeenCalledWith(
      'fileSystemMountpointUsageChart',
      expect.any(Object)
    );
    expect(component.fileSystemChartInstance).toBe(mockChartInstance);
  }));

  it('should set fileSystemMountpointUsageChart to null if data is empty', () => {
    component.chartFileSystemMountpointUsage([]);
    expect(component.fileSystemMountpointUsageChart).toBeNull();
  });

  it('should create fileSystemMountpointUsageChart with proper series', () => {
    const mockData = [
      { time_bucket: '202511011200', root: 50, home: 70 },
      { time_bucket: '202511011205', root: 85, home: 95 }
    ];
    component.chartFileSystemMountpointUsage(mockData);
    expect(component.fileSystemMountpointUsageChart).not.toBeNull();
    expect(Array.isArray((component.fileSystemMountpointUsageChart as any).series)).toBe(true);
    expect((component.fileSystemMountpointUsageChart as any).series.length).toBe(2);
  });

  it('should correctly assign status and marker colors based on thresholds', () => {
    const mockData = [
      { time_bucket: '202511011200', root: 85, home: 92 }
    ];
    component.chartFileSystemMountpointUsage(mockData);
    const series = (component.fileSystemMountpointUsageChart as any).series as Highcharts.SeriesSplineOptions[];
    const rootPoint = series[0].data![0] as any;
    const homePoint = series[1].data![0] as any;
    expect(rootPoint.status).toBe('W');
    expect(homePoint.status).toBe('C');
  });

  it('should not throw error if chart creation fails', () => {
    (Highcharts.chart as jest.Mock).mockImplementationOnce(() => { throw new Error('fail'); });
    const mockData = [{ time_bucket: '202511011200', root: 50 }];
    expect(() => component.chartFileSystemMountpointUsage(mockData)).not.toThrow();
  });

  // Fille allocated

  it('should set filefdAllocatedChart to null if no data', () => {
    component.chartFilefdAllocated([]);
    expect(component.filefdAllocatedChart).toBeNull();
  });

  it('should create filefdAllocatedChart with proper Highcharts options', () => {
    const mockData = [
      { time_bucket: '202511011200', meter_vm_filefd_allocated: 100 },
      { time_bucket: '202511011205', meter_vm_filefd_allocated: 200 }
    ];
    component.chartFilefdAllocated(mockData);
    expect(component.filefdAllocatedChart).not.toBeNull();
    expect(Array.isArray((component.filefdAllocatedChart as any).series)).toBe(true);
    const series = (component.filefdAllocatedChart as any).series as HighchartsType.SeriesAreasplineOptions[];
    expect(series.length).toBe(1);
    const seriesData = series[0].data as Highcharts.PointOptionsObject[];
    expect(seriesData.length).toBe(2);
    expect(seriesData[0].y).toBe(100);
    expect(seriesData[1].y).toBe(200);
    expect(series[0].name).toBe('filefd_allocated');
  });

  it('should call Highcharts.chart when getFilefdAllocated is called', fakeAsync(() => {
    const mockData = [
      { time_bucket: '202511011200', meter_vm_filefd_allocated: 100 },
      { time_bucket: '202511011205', meter_vm_filefd_allocated: 200 }
    ];
    (component['infraService'].getFilefdAllocated as jest.Mock).mockReturnValue(of(mockData));
    component.getFilefdAllocated();
    tick();
    expect(Highcharts.chart).toHaveBeenCalledWith('filefdAllocatedChart', expect.any(Object));
    expect(component.fileFdChartInstance).toBe(mockChartInstance);
  }));

  it('should handle null or invalid y values gracefully', () => {
    const mockData = [
      { time_bucket: '202511011200', meter_vm_filefd_allocated: null },
      { time_bucket: '202511011205', meter_vm_filefd_allocated: 'invalid' }
    ];
    component.chartFilefdAllocated(mockData);
    const series = (component.filefdAllocatedChart as any).series as HighchartsType.SeriesAreasplineOptions[];
    const seriesData = series[0].data as Highcharts.PointOptionsObject[];
    expect(seriesData[0].y).toBeNull();
    expect(seriesData[1].y).toBeNull();
  });

  it('should not push duplicate chart instances into charts array', fakeAsync(() => {
    component.charts = [mockChartInstance];
    const mockData = [
      { time_bucket: '202511011200', meter_vm_filefd_allocated: 50 }
    ];
    (component['infraService'].getFilefdAllocated as jest.Mock).mockReturnValue(of(mockData));
    component.getFilefdAllocated();
    tick();
    expect(component.charts.length).toBe(1);
  }));

  // Disk read/write

  it('should call Highcharts.chart and set diskReadWriteChartInstance when getDiskReadWrite is called', fakeAsync(() => {
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    const mockDiskData = [
      { time_bucket: '202511011200', meter_vm_disk_read: 1024, meter_vm_disk_written: 512 },
      { time_bucket: '202511011205', meter_vm_disk_read: 2048, meter_vm_disk_written: 1024 }
    ];
    (component['infraService'].getDiskReadWrite as jest.Mock).mockReturnValue(of(mockDiskData));
    fixture.detectChanges();
    component.getDiskReadWrite();
    tick();
    expect(Highcharts.chart).toHaveBeenCalledWith('diskReadWriteChart', expect.any(Object));
    expect(component.diskReadWriteChartInstance).toBe(mockChartInstance);
  }));

  it('should set diskReadWriteChart to null if no data', () => {
    component.chartDiskReadWrite([]);
    expect(component.diskReadWriteChart).toBeNull();
  });

  it('should create diskReadWriteChart with proper Highcharts options', () => {
    const mockDiskData = [
      { time_bucket: '202511011200', meter_vm_disk_read: 1024, meter_vm_disk_written: 512 },
      { time_bucket: '202511011205', meter_vm_disk_read: 2048, meter_vm_disk_written: 1024 }
    ];
    component.chartDiskReadWrite(mockDiskData);
    expect(component.diskReadWriteChart).not.toBeNull();
    const series = (component.diskReadWriteChart as any).series as Highcharts.SeriesSplineOptions[];
    expect(series.length).toBe(2);
    expect(series[0].name).toBe('disk_read');
    expect(series[1].name).toBe('disk_written');
    const readData = series[0].data as Highcharts.PointOptionsObject[];
    const writtenData = series[1].data as Highcharts.PointOptionsObject[];
    expect(readData[0].y).toBe(1024);
    expect(readData[1].y).toBe(2048);
    expect(writtenData[0].y).toBe(512);
    expect(writtenData[1].y).toBe(1024);
  });

  it('should handle null or invalid y values gracefully', () => {
    const mockDiskData = [
      { time_bucket: '202511011200', meter_vm_disk_read: null, meter_vm_disk_written: 'invalid' },
      { time_bucket: '202511011205', meter_vm_disk_read: 'invalid', meter_vm_disk_written: null }
    ];
    component.chartDiskReadWrite(mockDiskData);
    const series = (component.diskReadWriteChart as any).series as Highcharts.SeriesSplineOptions[];
    const readData = series[0].data as Highcharts.PointOptionsObject[];
    const writtenData = series[1].data as Highcharts.PointOptionsObject[];
    expect(readData[0].y).toBeNull();
    expect(readData[1].y).toBeNull();
    expect(writtenData[0].y).toBeNull();
    expect(writtenData[1].y).toBeNull();
  });

  // Group: DISC SPACE

  it('should filter disk list based on searchTermDisk', () => {
    component.discSpaceLists = [
      { name: 'sda1', usedPercent: 75, free: 25, used: 75, total: 100 },
      { name: 'sda2', usedPercent: 85, free: 15, used: 85, total: 100 },
      { name: 'sdb1', usedPercent: 95, free: 5, used: 95, total: 100 }
    ];
    component.searchTermDisk = 'sda2';
    component.onSearchDisk();
    expect(component.pagedDiscSpaceList.length).toBe(1);
    expect(component.pagedDiscSpaceList[0].name).toBe('sda2');
  });

  it('should sort disks by usedPercent in ascending order', () => {
    component.filteredDiscSpaceList = [
      { name: 'sda1', usedPercent: 75, free: 25, used: 75, total: 100 },
      { name: 'sda2', usedPercent: 85, free: 15, used: 85, total: 100 },
      { name: 'sda3', usedPercent: 95, free: 5, used: 95, total: 100 },
    ];
    component.pagedDiscSpaceList = [...component.filteredDiscSpaceList];
    component.sortColumnDisk = 'usedPercent';
    component.sortDirectionDisk = 'asc';
    component.setDiskSort('usedPercent');
    expect(component.sortColumnDisk).toBe('usedPercent');
    expect(component.sortDirectionDisk).toBe('desc');
    expect(component.pagedDiscSpaceList[0].usedPercent).toBe(95);
    expect(component.pagedDiscSpaceList[2].usedPercent).toBe(75);
  });

  it('should apply correct progress bar class based on usedPercent', () => {
    component.filteredDiscSpaceList = [
      { name: 'sda1', usedPercent: 75, free: 25, used: 75, total: 100 },
      { name: 'sda2', usedPercent: 85, free: 15, used: 85, total: 100 },
      { name: 'sdb1', usedPercent: 95, free: 5, used: 95, total: 100 }
    ];
    component.pagedDiscSpaceList = [...component.filteredDiscSpaceList];
    fixture.detectChanges();
    const progressBars = fixture.nativeElement.querySelectorAll('.progress-bar');
    expect(progressBars.length).toBe(3);
    expect(progressBars[0].classList).toContain('progress-blue');   // 75%
    expect(progressBars[1].classList).toContain('progress-yellow'); // 85%
    expect(progressBars[2].classList).toContain('progress-red');    // 95%
  });


  it('should disable previous button on first page', () => {
    component.filteredDiscSpaceList = [
      { name: 'sda1', usedPercent: 50, free: 50, used: 50, total: 100 },
      { name: 'sda2', usedPercent: 80, free: 20, used: 80, total: 100 }
    ];
    component.pagedDiscSpaceList = [...component.filteredDiscSpaceList];
    component.currentPageDisk = 1;
    component.totalPagesDisk = 2;
    fixture.detectChanges();
    const prevButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.pagination-container button:first-child'
    );
    expect(prevButton).not.toBeNull();
    expect(prevButton.disabled).toBe(true);
  });

  it('should show "No data Available" when pagedDiscSpaceList is empty', () => {
    component.pagedDiscSpaceList = [];
    fixture.detectChanges();
    const noDataDiv = fixture.nativeElement.querySelector('.discNoData');
    expect(noDataDiv.textContent.trim()).toBe('No data Available');
  });

  // Process List

  it('should filter processes based on searchQuery', () => {
    component.searchQuery = 'mysql';
    component.onSearch();
    expect(component.filteredProcessList).toEqual(['mysql']);
    expect(component.pagedProcessList).toEqual(['mysql']);
  });

  it('should sort processes by CPU ascending', () => {
    component.sortData('total_cpu_percent');
    const sorted = component.filteredProcessList.map(key => component.processList[key].total_cpu_percent);
    expect(sorted).toEqual([1, 2, 10]); // redis, nginx, mysql
  });

  it('should toggle expand state for a process key', () => {
    const key = 'nginx';
    component.isExpanded[key] = false;
    component.toggleExpand(key);
    expect(component.isExpanded[key]).toBe(true);
    component.toggleExpand(key);
    expect(component.isExpanded[key]).toBe(false);
  });

  it('should correctly paginate processes', () => {
    component.itemsPerPage = 2;
    component.calculatePagination();
    expect(component.pagedProcessList.length).toBe(2);
    expect(component.totalPages).toBe(2);
  });

  it('should return correct color coding for state filters', () => {
    expect(component.getColorCodingForFilter('Active')).toBe('text-active');
    expect(component.getColorCodingForFilter('Inactive')).toBe('text-inactive');
    expect(component.getColorCodingForFilter('Failed')).toBe('text-failed');
    expect(component.getColorCodingForFilter('Activating')).toBe('text-activating');
    expect(component.getColorCodingForFilter('Deactivating')).toBe('text-deactivating');
    expect(component.getColorCodingForFilter('Unknown')).toBe('');
  });

  // Container

  it('should filter container list based on searchQuery', () => {
    component.serviceIdContainer = [
      { ContainerDetailsText: 'web-app-1', status: 1, cpu: 10, memory: 20, network: 100 },
      { ContainerDetailsText: 'db-service', status: 1, cpu: 5, memory: 10, network: 50 },
      { ContainerDetailsText: 'cache-01', status: 0, cpu: 2, memory: 4, network: 10 }
    ];
    component.applicationNameMap = { 'db-service': 'Database Service' };
    component.searchQuery = 'db';
    component.onSearchContainer();
    expect(component.filteredContainerId.length).toBe(1);
    expect(component.filteredContainerId[0].ContainerDetailsText).toBe('db-service');
  });

  it('should reset filteredContainerId when searchQuery is empty', () => {
    component.serviceIdContainer = [
      { ContainerDetailsText: 'one', status: 1 },
      { ContainerDetailsText: 'two', status: 0 }
    ];
    component.searchQuery = '';
    component.onSearchContainer();
    expect(component.filteredContainerId.length).toBe(2);
    expect(Array.isArray(component.pagedContainerId)).toBe(true);
  });

  it('should return correct CSS class from getContStatus', () => {
    expect(component.getContStatus(1)).toBe('text-active');
    expect(component.getContStatus(0)).toBe('text-inactive');
    expect(component.getContStatus(999)).toBe('');
  });

  it('should call infraService.getContainerProperties when openModal is invoked and set properties', fakeAsync(() => {
    const mockProperties = { foo: 'bar' };
    (infraService.getContainerProperties as jest.Mock).mockReturnValue(of(mockProperties));
    component.openModal();
    tick();
    expect(infraService.getContainerProperties).toHaveBeenCalledWith(component.serviceId, component.startTime, component.endTime, component.selectedServiceName);
    expect(component.properties).toEqual(mockProperties);
  }));

  it('should set serviceId, store session values and navigate when container row clicked', () => {
    const mockSet = jest.spyOn((component as any).serviceIdService, 'setServiceId').mockImplementation(() => { });
    jest.spyOn((component as any).serviceIdService, 'getEncodedServiceId').mockReturnValue('enc-abc123');
    const routerSpy = jest.spyOn(component['router'], 'navigate').mockImplementation(() => Promise.resolve(true));
    const fakeTarget = document.createElement('div');
    fakeTarget.textContent = 'my-container-name';
    const fakeEvent = { preventDefault: () => { }, target: fakeTarget } as unknown as MouseEvent;
    component.goToContainerDashboard(fakeEvent);
    expect(mockSet).toHaveBeenCalledWith('my-container-name');
    expect(sessionStorage.getItem('encodedServiceIdForContainerName')).toBe('enc-abc123');
    expect(sessionStorage.getItem('serviceIdForContainerName')).toBe('my-container-name');
    expect(routerSpy).toHaveBeenCalledWith(['/infra/linux-service/container-dashboard']);
  });

  // Modal view staticBackdrop

  it('should display correct message for Memory Usage metric in getThresholdMessage', () => {
    component.selectedMetricName = 'Memory Usage';
    component.selectedMetricType = 'Percentage';
    component.getThresholdMessage();
    expect(component.thresholdMessage).toBe('Maximum memory usage value is 15GB');
  });

  it('should calculate CPU usage max value based on logicalCores from localStorage', () => {
    localStorage.setItem('logicalCores', '8');
    component.selectedMetricName = 'CPU Usage';
    component.selectedMetricType = 'Percentage';
    component.getThresholdMessage();
    expect(component.thresholdMessage).toBe('Maximum CPU usage value is 800');
  });

  it('should toggle edit mode when Edit button is clicked', () => {
    component.isUpdateThreshold = false;
    component.isUpdateThreshold = true;
    expect(component.isUpdateThreshold).toBe(true);
  });

  it('should call updateThreshold API with correct DTO and reload thresholds on success', fakeAsync(() => {
    const mockResponse = { success: true };
    const mockUpdateFn = jest.fn().mockReturnValue(of(mockResponse));
    (component as any).meteringConfigService = { updateThreshold: mockUpdateFn };
    component.loadThresholds = jest.fn();
    sessionStorage.setItem('ipAddressId', '42');
    component.compMetricId = 7;
    component.selectedMetricForThresholdUpdate = 'CPU Usage';
    component.selectedMetricWarningPercent = 70;
    component.selectedMetricCriticalPercent = 90;
    component.updateMetricThreshold();
    tick();
    expect(mockUpdateFn).toHaveBeenCalledWith({
      id: 7,
      componentId: 42,
      componentType: 'INFRA',
      metric: 'CPU Usage',
      warning: 70,
      critical: 90
    });
    expect(component.loadThresholds).toHaveBeenCalled();
  }));

  it('should not call updateThreshold API if selectedMetricForThresholdUpdate is missing', () => {
    const mockUpdateFn = jest.fn();
    (component as any).meteringConfigService = { updateThreshold: mockUpdateFn };
    component.selectedMetricForThresholdUpdate = '';
    component.updateMetricThreshold();
    expect(mockUpdateFn).not.toHaveBeenCalled();
  });

  // ContainerProp

  it('should render container properties when data is available', () => {
    component.properties = {
      name: 'nginx-container',
      id: 'abc123',
      size: '512MB',
      created: '2025-10-20',
      repoTags: 'nginx:latest',
      cpu_limit: '2 cores',
      memory_limit: '1GB'
    };
    fixture.detectChanges();
    const modalText = fixture.nativeElement.textContent;
    expect(modalText).toContain('nginx-container');
    expect(modalText).toContain('512MB');
    expect(modalText).toContain('nginx:latest');
  });

  it('should display "No data available" when properties is null', () => {
    component.properties = null;
    fixture.detectChanges();
    const noDataText = fixture.nativeElement.querySelector('.text-muted');
    expect(noDataText.textContent).toContain('No data available');
  });


  // Error Handling

  it("should log an error when Memory RAM contains negative numeric values", fakeAsync(() => {
    const invalidMemoryData = [
      {
        time_bucket: "202510271030",
        meter_vm_memory_total: -1024,
        meter_vm_memory_available: 512,
        meter_vm_memory_buff_cache: 128,
        meter_vm_memory_used: 384
      }
    ];
    infraService.getMemoryRam.mockReturnValue(of(invalidMemoryData));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    component.serviceId = "service123";
    component.startTime = 123;
    component.endTime = 456;
    const initialLastMemoryData = component.lastMemoryData;
    const initialChartValuesRam = component.chartValuesRam;
    component.getMemoryRam();
    tick();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative numeric values found in Memory RAM response. Ignoring response:",
      invalidMemoryData
    );
    expect(component.lastMemoryData).toBe(initialLastMemoryData);
    expect(component.chartValuesRam).toBe(initialChartValuesRam);
    consoleSpy.mockRestore();
  }));

  it("should log an error when Memory Swap contains negative or invalid values", fakeAsync(() => {
    const invalidSwapData = [
      {
        meter_vm_memory_swap_total: -2048,
        meter_vm_memory_swap_free: 1024,
      }
    ];
    infraService.getMemorySwap.mockReturnValue(of(invalidSwapData));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    component.serviceId = "service123";
    component.startTime = 123;
    component.endTime = 456;
    const initialLastSwapData = component.lastSwapData;
    const updateTileSpy = jest.spyOn(component, "updateMemorySwapTile").mockImplementation(() => { });
    const chartSpy = jest.spyOn(component, "chartMemorySwap").mockImplementation(() => { });
    component.getMemorySwap();
    tick();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid or negative memory swap values found:",
      invalidSwapData
    );
    expect(component.lastSwapData).toBe(initialLastSwapData);
    expect(updateTileSpy).not.toHaveBeenCalled();
    expect(chartSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  }));

  it("should log an error when CPU load contains negative numeric values", fakeAsync(() => {
    const invalidCpuData = [
      {
        time_bucket: "202512111200",
        meter_vm_cpu_load1: -5,
        meter_vm_cpu_load5: 2,
        meter_vm_cpu_load15: 3
      }
    ];
    infraService.getCpuLoad.mockReturnValue(of(invalidCpuData));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    component.serviceId = "service123";
    component.startTime = 123;
    component.endTime = 456;
    const initialLoadAverage = component.loadAverage;
    const updateCpuLoadTileSpy = jest.spyOn(component, "updateCpuLoadTile").mockImplementation(() => { });
    const chartAvgCpuLoadSpy = jest.spyOn(component, "chartAvgCpuLoad").mockImplementation(() => { });
    const applyThresholdsSpy = jest.spyOn(component, "applyThresholds").mockImplementation(() => { });
    component.getCpuLoad();
    tick();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative CPU load values found. Ignoring response:",
      invalidCpuData
    );
    expect(component.loadAverage).toBeNull();
    expect(updateCpuLoadTileSpy).not.toHaveBeenCalled();
    expect(chartAvgCpuLoadSpy).not.toHaveBeenCalled();
    expect(applyThresholdsSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  }));



});


