import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RedisComponent } from './redis.component';
import { of, throwError } from 'rxjs';
import { RedisService } from '../../../services/redis.service';
import { By } from '@angular/platform-browser';
import type * as HighchartsType from 'highcharts';
import { ChangeDetectorRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';

let capturedChartOptions: any = null;

const mockChartInstance = {
  series: [
    {
      name: 'Mock Series',
      options: { data: [] },
      update: jest.fn(),
      points: [{ status: '', update: jest.fn() }],
      remove: jest.fn(),
    },
  ],
  options: {
    yAxis: [{ plotLines: [] }]
  },
  redraw: jest.fn(),
  reflow: jest.fn(),
  tooltip: { refresh: jest.fn(), hide: jest.fn() },
  xAxis: [{ drawCrosshair: jest.fn(), hideCrosshair: jest.fn() }],
  container: document.createElement('div'),
  destroy: jest.fn(),
  update: jest.fn(),
  showLoading: jest.fn(),
} as unknown as Highcharts.Chart;

// Core Mock 
jest.mock('highcharts', () => ({
  chart: jest.fn((options) => {
    capturedChartOptions = options;
    return mockChartInstance;
  }),
  Chart: jest.fn(function (this: any, options: any) {
    capturedChartOptions = options;
    return mockChartInstance;
  }),
  dateFormat: jest.fn((_, x) => new Date(x).toISOString()),
  addEvent: jest.fn(),
  removeEvent: jest.fn(),
  numberFormat: jest.fn(),
}));

jest.mock('bootstrap', () => ({
  Tab: jest.fn().mockImplementation(() => ({
    show: jest.fn()
  }))
}));

// prevent SeriesRegistry crash
jest.mock('highcharts/highcharts-more.js', () => jest.fn());
jest.mock('highcharts/modules/solid-gauge.js', () => jest.fn());
jest.mock('highcharts/modules/exporting.js', () => jest.fn());
jest.mock('highcharts/modules/export-data.js', () => jest.fn());
jest.mock('highcharts/modules/accessibility.js', () => jest.fn());

const Highcharts = require('highcharts') as typeof HighchartsType;
const mockShow = jest.fn();
(global as any).bootstrap = {
  Tooltip: jest.fn(() => ({
    dispose: jest.fn()
  })),
};

describe('RedisComponent', () => {
  let component: RedisComponent;
  let fixture: ComponentFixture<RedisComponent>;

  let mockRedisService: any;
  capturedChartOptions = null;
  let cdr: ChangeDetectorRef;
  let router: Router;

  const mockStats = {
    meter_redis_db_keys: 4396,
    meter_redis_connected_clients: 1,
    meter_redis_memory_usage: 1,
    meter_redis_uptime: 19281911,
    meter_redis_blocked_clients: 0,
    meter_redis_expired_keys_total: 17169,
    meter_redis_evicted_keys_total: 0
  };

  const mockMemoryUsage = {
    latency: 0,
    latencyTimeSeries: [
      { time_bucket: "202511241516", memory_usage: 1 },
      { time_bucket: "202511241517", memory_usage: 2 },
      { time_bucket: "202511241518", memory_usage: 3 }
    ]
  };

  const mockUptime = {
    latency: 0,
    latencyTimeSeries: [
      { time_bucket: "202511241516", uptime: 19283178 },
      { time_bucket: "202511241517", uptime: 19283238 },
      { time_bucket: "202511241518", uptime: 19283298 }
    ]
  };

  const mockNetworkMetrics = {
    bytesTimeSeries: [
      { time_bucket: "202511241516", net_input_bytes: 104, net_output_bytes: 5998 },
      { time_bucket: "202511241517", net_input_bytes: 130, net_output_bytes: 5782 },
      { time_bucket: "202511241518", net_input_bytes: 218, net_output_bytes: 8854 }
    ]
  };

  const mockDBKeysMetrics = {
    dbKeysMetricsTimeSeries: [
      { time_bucket: "202511241516", db_keys: 4396, expired_keys_total: 17171, evicted_keys_total: 0 },
      { time_bucket: "202511241517", db_keys: 4396, expired_keys_total: 17171, evicted_keys_total: 0 },
      { time_bucket: "202511241518", db_keys: 4396, expired_keys_total: 17171, evicted_keys_total: 0 }
    ]
  };

  const mockClientMetrics = {
    clientsTimeSeries: [
      { time_bucket: "202511241516", connected_clients: 1, blocked_clients: 0 },
      { time_bucket: "202511241517", connected_clients: 1, blocked_clients: 0 },
      { time_bucket: "202511241518", connected_clients: 1, blocked_clients: 0 }
    ]
  };

  const mockHitRate = {
    latency: 0,
    latencyTimeSeries: [
      { time_bucket: "202511241516", uptime: 84 },
      { time_bucket: "202511241517", uptime: 84 },
      { time_bucket: "202511241518", uptime: 84 }
    ]
  };

  const mockTotalCommandRate = [
    {
      time_bucket: "202511241516",
      set: 0, ping: 0, keys: 1, setinfo: 0, del: 0, psubscribe: 0,
      list: 0, histogram: 1, setname: 1, docs: 0, len: 1,
      publish: 0, get: 1, flushall: 0, hello: 0, punsubscribe: 0,
      latest: 1, info: 1
    },
    {
      time_bucket: "202511241517",
      set: 0, ping: 0, keys: 1, setinfo: 0, del: 0, psubscribe: 0,
      list: 0, histogram: 1, setname: 1, docs: 0, len: 1,
      publish: 0, get: 1, flushall: 0, hello: 0, punsubscribe: 0,
      latest: 1, info: 1
    },
    {
      time_bucket: "202511241518",
      set: 0, ping: 0, keys: 1, setinfo: 0, del: 0, psubscribe: 0,
      list: 0, histogram: 1, setname: 1, docs: 0, len: 1,
      publish: 0, get: 1, flushall: 0, hello: 0, punsubscribe: 0,
      latest: 1, info: 1
    }
  ];

  const mockAverageTimeSpent = [
    {
      time_bucket: "202511241516",
      set: 0, ping: 1, keys: 1, setinfo: 0, del: 0,
      psubscribe: 0, list: 0, histogram: 1, setname: 1,
      docs: 0, len: 1, publish: 0, get: 1, flushall: 0,
      hello: 0, punsubscribe: 0, latest: 1, info: 1
    },
    {
      time_bucket: "202511241517",
      set: 0, ping: 1, keys: 1, setinfo: 0, del: 0,
      psubscribe: 0, list: 0, histogram: 1, setname: 0,
      docs: 0, len: 1, publish: 0, get: 1, flushall: 0,
      hello: 0, punsubscribe: 0, latest: 1, info: 1
    }
  ];

  const mockRedisInstances = {
    "redis::redis-server-172.16.138.144": [
      {
        instance: "172.16.138.144:6376",
        metrics: {
          meter_redis_instance_db_keys: 5,
          meter_redis_instance_connected_clients: 1,
          meter_redis_instance_expired_keys_total: 51,
          meter_redis_instance_memory_usage: 1,
          meter_redis_instance_uptime: 19285151
        }
      }
    ]
  };

  const mockRouter = {
    navigate: jest.fn()
  };

  beforeEach(async () => {
    mockRedisService = {
      getLatestRedisStats: jest.fn().mockReturnValue(of(mockStats)),
      getMemoryUsage: jest.fn().mockReturnValue(of(mockMemoryUsage)),
      getRedisUptime: jest.fn().mockReturnValue(of(mockUptime)),
      getNetworkMetrics: jest.fn().mockReturnValue(of(mockNetworkMetrics)),
      getDBKeysMetrics: jest.fn().mockReturnValue(of(mockDBKeysMetrics)),
      getClientMetrics: jest.fn().mockReturnValue(of(mockClientMetrics)),
      getHitRate: jest.fn().mockReturnValue(of(mockHitRate)),
      getTotalCommandRate: jest.fn().mockReturnValue(of(mockTotalCommandRate)),
      getAverageTimeSpent: jest.fn().mockReturnValue(of(mockAverageTimeSpent)),
      getRedisInstances: jest.fn().mockReturnValue(of(mockRedisInstances)),
    };

    await TestBed.configureTestingModule({
      imports: [RedisComponent],
      providers: [
        { provide: RedisService, useValue: mockRedisService },
        { provide: Router, useValue: mockRouter }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .compileComponents();

    fixture = TestBed.createComponent(RedisComponent);
    component = fixture.componentInstance;
    component.redisInstances = {};
    router = TestBed.inject(Router);
    component.objectKeys = (obj: any) => Object.keys(obj);
    (Highcharts.chart as jest.Mock).mockClear();
    (Highcharts as any).charts = [];
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
    cdr = fixture.componentRef.injector.get(ChangeDetectorRef);

  });

  afterEach(() => {
    jest.restoreAllMocks(); // Restore all mocks after each test
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call loadStats() and set redisStats', () => {
    component.redisEncryptedEntity = 'abcd';
    component.startTime = 202501011000;
    component.endTime = 202501011100;
    component.loadStats();
    expect(mockRedisService.getLatestRedisStats).toHaveBeenCalledWith(
      'abcd',
      202501011000,
      202501011100
    );
    expect(component.redisStats).toEqual(mockStats);
  });

  it('should render metric values correctly in HTML', () => {
    component.redisStats = mockStats;
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('4396');
    expect(compiled.textContent).toContain('1');
    expect(compiled.textContent).toContain('0');
    expect(compiled.textContent).toContain('17169');
  });

  it('should format uptime correctly', () => {
    expect(component.formatUptime(3661))
      .toBe('1h 1m');
    expect(component.formatUptime(90061))
      .toBe('1d 1h 1m');
  });

  it('should update DOM when redisStats changes', () => {
    component.redisStats = mockStats;
    fixture.detectChanges();
    const uptimeEl = fixture.debugElement.query(
      By.css('.metric-box .kpi-value')
    ).nativeElement;
    expect(uptimeEl.textContent.trim()).toBe(
      component.formatUptime(mockStats.meter_redis_uptime)
    );
  });

  it('should display "No Data" in all metric cards when API returns null values', () => {
    const mockNullStats = {
      meter_redis_db_keys: null,
      meter_redis_connected_clients: null,
      meter_redis_memory_usage: null,
      meter_redis_uptime: null,
      meter_redis_blocked_clients: null,
      meter_redis_expired_keys_total: null,
      meter_redis_evicted_keys_total: null,
    };
    mockRedisService.getLatestRedisStats.mockReturnValue(of(mockNullStats));
    component.loadStats();
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    // Uptime card
    expect(compiled.textContent).toContain('No Data');
    // Connected Clients
    expect(compiled.textContent).toContain('No Data');
    // Blocked Clients
    expect(compiled.textContent).toContain('No Data');
    // DB Keys
    expect(compiled.textContent).toContain('No Data');
    // Expired Keys
    expect(compiled.textContent).toContain('No Data');
    // Evicted Keys
    expect(compiled.textContent).toContain('No Data');
  });

  // Memory Chart

  it('should call getMemoryUsage() and populate memoryUsage variable', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initMemoryUsageChart();
    expect(mockRedisService.getMemoryUsage).toHaveBeenCalledWith(
      "abc123", 202511241500, 202511241600
    );
    expect(component.memoryUsage).toEqual(mockMemoryUsage);
  });

  it('should populate chartOptions with correct area chart settings', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initMemoryUsageChart();
    fixture.detectChanges();
    const opts = component.chartOptions as any;
    expect(opts.chart.type).toBe("area");
    expect(opts.series[0].name).toBe("Memory Usage");
    expect(opts.series[0].color).toBe("#3b82f6");
    expect(opts.series[0].data).toEqual([1, 2, 3]);
  });

  it('should generate correct categories from timestamps', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initMemoryUsageChart();
    fixture.detectChanges();
    const opts = component.chartOptions as any;
    const cats = (opts.xAxis as any).categories as string[];
    expect(cats.length).toBe(3);
    expect(typeof cats[0]).toBe("string");
  });

  it('should render <highcharts-chart> in template', () => {
    fixture.detectChanges();
    const chartEl = fixture.debugElement.query(By.css('highcharts-chart'));
    expect(chartEl).not.toBeNull();
  });

  it('should store chartOptions with correct series.data', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initMemoryUsageChart();
    fixture.detectChanges();
    const opts = component.chartOptions as any;
    expect(opts.series[0].data).toEqual([1, 2, 3]);
  });

  // Uptime Chart

  it('should call getRedisUptime() and populate uptime data', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initUptimeChart();
    expect(mockRedisService.getRedisUptime).toHaveBeenCalledWith(
      "abc123",
      202511241500,
      202511241600
    );
    expect(component.uptimeChartOptions).toBeTruthy();
  });

  it('should populate uptimeChartOptions with correct line chart settings', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initUptimeChart();
    fixture.detectChanges();
    const opts = component.uptimeChartOptions as any;
    expect(opts.chart.type).toBe("line");
    expect(opts.series[0].name).toBe("Uptime");
    expect(opts.series[0].color).toBe("#09c212ff");
    expect(opts.series[0].data).toEqual([19283178, 19283238, 19283298]);
  });

  it('should generate correct uptime categories from timestamps', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initUptimeChart();
    fixture.detectChanges();
    const opts = component.uptimeChartOptions as any;
    const cats = opts.xAxis.categories as string[];
    expect(cats.length).toBe(3);
    expect(typeof cats[0]).toBe("string");
  });

  it('should render uptime <highcharts-chart> in template', () => {
    fixture.detectChanges();
    const uptimeChartEl = fixture.debugElement.query(
      By.css('highcharts-chart')
    );
    expect(uptimeChartEl).not.toBeNull();
  });

  it('should store uptimeChartOptions with correct series.data', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initUptimeChart();
    fixture.detectChanges();
    const opts = component.uptimeChartOptions as any;
    expect(opts.series[0].data).toEqual([19283178, 19283238, 19283298]);
  });

  it('should format uptime correctly in yAxis labels', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initUptimeChart();
    fixture.detectChanges();
    const opts = component.uptimeChartOptions as any;
    const formatterFn = opts.yAxis.labels.formatter;
    const ctx = { value: 90061 }; //1 day 1 hour 1 minute
    expect(formatterFn.call(ctx)).toBe("1d 1h 1m");
  });

  it('should format tooltip uptime correctly', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initUptimeChart();
    fixture.detectChanges();
    const opts = component.uptimeChartOptions as any;
    const tooltipFormatter = opts.tooltip.formatter;
    const ctx = {
      series: { name: "Uptime" },
      y: 3661 // 1h 1m
    };
    const result = tooltipFormatter.call(ctx);
    expect(result).toBe("<b>Uptime</b><br/>0d 1h 1m");
  });

  // Network Chart

  it('should call getNetworkMetrics() and populate network data', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initNetworkChart();
    expect(mockRedisService.getNetworkMetrics).toHaveBeenCalledWith(
      "abc123",
      202511241500,
      202511241600
    );
    expect(component.networkChartOptions).toBeDefined();
  });

  it('should populate networkChartOptions with correct area chart settings', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initNetworkChart();
    fixture.detectChanges();
    const opts = component.networkChartOptions as any;
    expect(opts.chart.type).toBe("area");
    expect(opts.series.length).toBe(2);
    expect(opts.series[0].name).toBe("Net Input Bytes");
    expect(opts.series[1].name).toBe("Net Output Bytes");
    expect(opts.series[0].color).toBe("#f5840bff");
    expect(opts.series[1].color).toBe("#10b981");
    expect(opts.series[0].data).toEqual([104, 130, 218]);
    expect(opts.series[1].data).toEqual([5998, 5782, 8854]);
  });

  it('should generate correct categories from network timestamps', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initNetworkChart();
    fixture.detectChanges();
    const opts = component.networkChartOptions as any;
    const categories = (opts.xAxis as any).categories;
    expect(categories.length).toBe(3);
    expect(typeof categories[0]).toBe("string");
  });

  it('should render <highcharts-chart> for network chart', () => {
    fixture.detectChanges();
    const chartEl = fixture.debugElement.query(By.css('highcharts-chart'));
    expect(chartEl).not.toBeNull();
  });

  it('should build correct series.data for network chart', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initNetworkChart();
    fixture.detectChanges();
    const opts = component.networkChartOptions as any;
    expect(opts.series[0].data).toEqual([104, 130, 218]);
    expect(opts.series[1].data).toEqual([5998, 5782, 8854]);
  });

  // Keys Trend (count)

  it('should call getDBKeysMetrics() and populate data for keys chart', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initDBKeysChart();
    expect(mockRedisService.getDBKeysMetrics).toHaveBeenCalledWith(
      "abc123",
      202511241500,
      202511241600
    );
    expect(component.keysChartOptions).toBeDefined();
  });

  it('should populate keysChartOptions with correct area chart settings', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initDBKeysChart();
    fixture.detectChanges();
    const opts = component.keysChartOptions as any;
    expect(opts.chart.type).toBe("area");
    expect(opts.series.length).toBe(3);
    expect(opts.series[0].name).toBe("DB Keys");
    expect(opts.series[1].name).toBe("Expired Keys");
    expect(opts.series[2].name).toBe("Evicted Keys");
    expect(opts.series[0].color).toBe("#3b82f6");
    expect(opts.series[1].color).toBe("#f59e0b");
    expect(opts.series[2].color).toBe("#ef4444");
    expect(opts.series[0].data).toEqual([4396, 4396, 4396]);
    expect(opts.series[1].data).toEqual([17171, 17171, 17171]);
    expect(opts.series[2].data).toEqual([0, 0, 0]);
  });

  it('should generate correct categories for DBKeys chart', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initDBKeysChart();
    fixture.detectChanges();
    const opts = component.keysChartOptions as any;
    const categories = (opts.xAxis as any).categories;
    expect(categories.length).toBe(3);
    expect(typeof categories[0]).toBe("string");
  });

  it('should render <highcharts-chart> for keys chart', () => {
    fixture.detectChanges();
    const chartEl = fixture.debugElement.query(By.css('highcharts-chart'));
    expect(chartEl).not.toBeNull();
  });

  it('should correctly populate all series values for keys chart', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initDBKeysChart();
    fixture.detectChanges();
    const opts = component.keysChartOptions as any;
    expect(opts.series[0].data).toEqual([4396, 4396, 4396]);
    expect(opts.series[1].data).toEqual([17171, 17171, 17171]);
    expect(opts.series[2].data).toEqual([0, 0, 0]);
  });

  // Clients Connected/Blocked (count)

  it('should call getClientMetrics() and populate client chart data', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initConnectedBlockedChart();
    expect(mockRedisService.getClientMetrics).toHaveBeenCalledWith(
      "abc123",
      202511241500,
      202511241600
    );
    expect(component.clientChartOptions).toBeDefined();
  });

  it('should populate clientChartOptions with correct area chart settings', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initConnectedBlockedChart();
    fixture.detectChanges();
    const opts = component.clientChartOptions as any;
    expect(opts.chart.type).toBe("area");
    expect(opts.series.length).toBe(2);
    expect(opts.series[0].name).toBe("Connected Clients");
    expect(opts.series[1].name).toBe("Blocked Clients");
    expect(opts.series[0].color).toBe("#d20bf5ff");
    expect(opts.series[1].color).toBe("#109db9ff");
    expect(opts.series[0].data).toEqual([1, 1, 1]);
    expect(opts.series[1].data).toEqual([0, 0, 0]);
  });

  it('should generate correct categories for client chart', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initConnectedBlockedChart();
    fixture.detectChanges();
    const opts = component.clientChartOptions as any;
    const categories = (opts.xAxis as any).categories;
    expect(categories.length).toBe(3);
    expect(typeof categories[0]).toBe("string");
  });

  it('should render <highcharts-chart> for client chart', () => {
    fixture.detectChanges();
    const chartEl = fixture.debugElement.query(By.css('highcharts-chart'));
    expect(chartEl).not.toBeNull();
  });

  it('should correctly populate connected and blocked client series', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initConnectedBlockedChart();
    fixture.detectChanges();
    const opts = component.clientChartOptions as any;
    expect(opts.series[0].data).toEqual([1, 1, 1]);
    expect(opts.series[1].data).toEqual([0, 0, 0]);
  });

  // Hit Rate (%)

  it('should call getHitRate() and populate hit-rate data', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initHitRateChart();
    expect(mockRedisService.getHitRate).toHaveBeenCalledWith(
      "abc123",
      202511241500,
      202511241600
    );
    expect(component.lineChartOptions).toBeDefined();
  });

  it('should populate lineChartOptions with correct line chart settings', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initHitRateChart();
    fixture.detectChanges();
    const opts = component.lineChartOptions as any;
    expect(opts.chart.type).toBe("line");
    expect(opts.series.length).toBe(1);
    expect(opts.series[0].name).toBe("Hit Rate");
    expect(opts.series[0].color).toBe("#be09b5ff");
    expect(opts.series[0].data).toEqual([84, 84, 84]);
  });

  it('should generate correct categories for hit-rate chart', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initHitRateChart();
    fixture.detectChanges();
    const opts = component.lineChartOptions as any;
    const cats = (opts.xAxis as any).categories;
    expect(cats.length).toBe(3);
    expect(typeof cats[0]).toBe("string");
  });

  it('should render <highcharts-chart> for hit-rate chart', () => {
    fixture.detectChanges();
    const chartEl = fixture.debugElement.query(By.css('highcharts-chart'));
    expect(chartEl).not.toBeNull();
  });

  it('should correctly map hit-rate uptime values to chart series data', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initHitRateChart();
    fixture.detectChanges();
    const opts = component.lineChartOptions as any;
    expect(opts.series[0].data).toEqual([84, 84, 84]);
  });

  // Command Rate (count/sec)

  it('should call getTotalCommandRate with correct params', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initTotalCommandRateChart();
    expect(mockRedisService.getTotalCommandRate).toHaveBeenCalledWith(
      "abc123",
      202511241500,
      202511241600
    );
  });

  it('should initialize commandsChartOptions after data load', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initTotalCommandRateChart();
    fixture.detectChanges();
    expect(component.commandsChartOptions).toBeDefined();
  });

  it('should generate correct xAxis categories from timestamps', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initTotalCommandRateChart();
    fixture.detectChanges();
    const opts = component.commandsChartOptions as any;
    const cats = opts.xAxis.categories;
    expect(cats.length).toBe(3);
    expect(typeof cats[0]).toBe("string");
  });

  it('should render <highcharts-chart> for command rate chart', () => {
    fixture.detectChanges();
    const chart = fixture.debugElement.query(By.css('highcharts-chart'));
    expect(chart).not.toBeNull();
  });

  it('should create all expected series for command rate chart', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initTotalCommandRateChart();
    fixture.detectChanges();
    const opts = component.commandsChartOptions as any;
    expect(opts.series.length).toBe(18);
    const seriesNames = opts.series.map((s: any) => s.name);
    expect(seriesNames).toContain("set");
    expect(seriesNames).toContain("ping");
    expect(seriesNames).toContain("keys");
    expect(seriesNames).toContain("setinfo");
    expect(seriesNames).toContain("del");
    expect(seriesNames).toContain("psubscribe");
    expect(seriesNames).toContain("list");
    expect(seriesNames).toContain("histogram");
    expect(seriesNames).toContain("setname");
    expect(seriesNames).toContain("docs");
    expect(seriesNames).toContain("len");
    expect(seriesNames).toContain("publish");
    expect(seriesNames).toContain("get");
    expect(seriesNames).toContain("flushall");
    expect(seriesNames).toContain("hello");
    expect(seriesNames).toContain("punsubscribe");
    expect(seriesNames).toContain("latest");
    expect(seriesNames).toContain("info");
  });

  it('should correctly map command-rate values to series data', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initTotalCommandRateChart();
    fixture.detectChanges();
    const opts = component.commandsChartOptions as any;
    const setSeries = opts.series.find((s: any) => s.name === "set");
    const getSeries = opts.series.find((s: any) => s.name === "get");
    const keysSeries = opts.series.find((s: any) => s.name === "keys");
    expect(setSeries.data).toEqual([0, 0, 0]);
    expect(getSeries.data).toEqual([1, 1, 1]);
    expect(keysSeries.data).toEqual([1, 1, 1]);
  });

  // Average Time Spent By Command (sec)

  it('should call getAverageTimeSpent with correct params', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initAverageTimeSpentByCommandChart();
    expect(mockRedisService.getAverageTimeSpent).toHaveBeenCalledWith(
      "abc123",
      202511241500,
      202511241600
    );
  });

  it('should initialize averageTimeChartOptions after receiving API data', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initAverageTimeSpentByCommandChart();
    fixture.detectChanges();
    expect(component.averageTimeChartOptions).toBeDefined();
  });

  it('should generate correct xAxis categories', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initAverageTimeSpentByCommandChart();
    fixture.detectChanges();
    const opts = component.averageTimeChartOptions as any;
    const cats = opts.xAxis.categories;
    expect(cats.length).toBe(2);
    expect(typeof cats[0]).toBe('string');
  });

  it('should render highcharts-chart for Average Time chart', () => {
    fixture.detectChanges();
    const chart = fixture.debugElement.query(By.css('highcharts-chart'));
    expect(chart).not.toBeNull();
  });

  it('should create all expected series for Average Time chart', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initAverageTimeSpentByCommandChart();
    fixture.detectChanges();
    const opts = component.averageTimeChartOptions as any;
    expect(opts.series.length).toBe(18);
    const names = opts.series.map((s: any) => s.name);
    expect(names).toContain("set");
    expect(names).toContain("ping");
    expect(names).toContain("keys");
    expect(names).toContain("setinfo");
    expect(names).toContain("del");
    expect(names).toContain("psubscribe");
    expect(names).toContain("list");
    expect(names).toContain("histogram");
    expect(names).toContain("setname");
    expect(names).toContain("docs");
    expect(names).toContain("len");
    expect(names).toContain("publish");
    expect(names).toContain("get");
    expect(names).toContain("flushall");
    expect(names).toContain("hello");
    expect(names).toContain("punsubscribe");
    expect(names).toContain("latest");
    expect(names).toContain("info");
  });

  it('should correctly map Average Time data to chart series', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initAverageTimeSpentByCommandChart();
    fixture.detectChanges();
    const opts = component.averageTimeChartOptions as any;
    const setSeries = opts.series.find((s: any) => s.name === "set");
    const pingSeries = opts.series.find((s: any) => s.name === "ping");
    const keysSeries = opts.series.find((s: any) => s.name === "keys");
    const histogramSeries = opts.series.find((s: any) => s.name === "histogram");
    const getSeries = opts.series.find((s: any) => s.name === "get");
    expect(setSeries.data).toEqual([0, 0]);
    expect(pingSeries.data).toEqual([1, 1]);
    expect(keysSeries.data).toEqual([1, 1]);
    expect(histogramSeries.data).toEqual([1, 1]);
    expect(getSeries.data).toEqual([1, 1]);
  });

  // Instance Tab

  it('should call getRedisInstances with correct params', () => {
    component.redisEncryptedEntity = "abc123";
    component.startTime = 111;
    component.endTime = 222;
    mockRedisService.getRedisInstances = jest
      .fn()
      .mockReturnValue(of(mockRedisInstances));
    component.fetchRedisInstances();
    expect(mockRedisService.getRedisInstances).toHaveBeenCalledWith(
      "abc123",
      111,
      222
    );
  });

  it('should store API response into redisInstances', () => {
    mockRedisService.getRedisInstances = jest
      .fn()
      .mockReturnValue(of(mockRedisInstances));
    component.fetchRedisInstances();
    expect(component.redisInstances).toEqual(mockRedisInstances);
  });

  it('should render table rows based on redisInstances', () => {
    mockRedisService.getRedisInstances = jest
      .fn()
      .mockReturnValue(of(mockRedisInstances));
    component.fetchRedisInstances();
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
  });

  it('should display instance IP correctly', () => {
    mockRedisService.getRedisInstances = jest
      .fn()
      .mockReturnValue(of(mockRedisInstances));
    component.fetchRedisInstances();
    fixture.detectChanges();
    const cell = fixture.nativeElement.querySelector('tbody tr td span');
    expect(cell.textContent.trim()).toBe("172.16.138.144:6376");
  });

  it('should display connected clients correctly', () => {
    component.redisInstances = mockRedisInstances;
    fixture.detectChanges();
    const tds = fixture.nativeElement.querySelectorAll('tbody tr td');
    expect(tds.length).toBeGreaterThan(1);
    const value = tds[1].textContent.trim();
    expect(value).toContain("1");
  });

  it('should display DB keys correctly', () => {
    component.redisInstances = mockRedisInstances;
    fixture.detectChanges();
    const value = fixture.nativeElement.querySelectorAll('tbody tr td')[2].textContent;
    expect(value.trim()).toContain("5");
  });

  it('should format uptime correctly in DOM', () => {
    component.redisInstances = mockRedisInstances;
    fixture.detectChanges();
    const uptimeCell = fixture.nativeElement.querySelectorAll('tbody tr td')[5];
    const formatted = component.formatUptime(19285151);
    expect(uptimeCell.textContent.trim()).toBe(formatted);
  });

  it('formatUptime should return "0m" when input is null or negative', () => {
    expect(component.formatUptime(null as any)).toBe("0m");
    expect(component.formatUptime(-5)).toBe("0m");
  });

  it('formatUptime should format minutes correctly', () => {
    expect(component.formatUptime(300)).toBe("5m");
  });

  it('formatUptime should format hours + minutes', () => {
    expect(component.formatUptime(5400)).toBe("1h 30m");
  });

  it('formatUptime should format days + hours + minutes', () => {
    const secs = 1 * 24 * 3600 + 2 * 3600 + 10 * 60;
    expect(component.formatUptime(secs)).toBe("1d 2h 10m");
  });

  it('should navigate to /redis/instance-details on instance click', () => {
    const routerSpy = jest.spyOn(router, 'navigate');
    const instance = "172.16.138.144:6376";
    component.redisEncryptedEntity = "abc123";
    component.gotoRedisInstanceDetails(instance);
    const encoded = btoa(instance);
    const expectedKey = "abc123_" + encoded;
    expect(sessionStorage.getItem("selectedRedisInstance")).toBe(expectedKey);
    expect(sessionStorage.getItem("redisInstance")).toBe(instance);
    expect(routerSpy).toHaveBeenCalledWith(["/redis/instance-details"]);
  });

  // Error Handling

  // LoadStats

  it('should set fallback redisStats and log error when API fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const mockError = new Error('API failed');
    mockRedisService.getLatestRedisStats.mockReturnValue(throwError(() => mockError));
    component.loadStats();
    expect(component.redisStats).toEqual({
      meter_redis_db_keys: 0,
      meter_redis_connected_clients: 0,
      meter_redis_expired_keys_total: 0,
      meter_redis_memory_usage: 0,
      meter_redis_blocked_clients: 0,
      meter_redis_uptime: 0,
      meter_redis_evicted_keys_total: 0,
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load Redis stats:',
      mockError
    );
    consoleSpy.mockRestore();
  });

  // Memorychart

  it('should reject invalid or missing latencyTimeSeries structure', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    const badData = { latency: 0.0 };
    mockRedisService.getMemoryUsage.mockReturnValue(of(badData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initMemoryUsageChart();
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid memory usage response:",
      badData
    );
    expect(component.chartOptions).toBeUndefined();
  });

  it('should reject data containing negative memory_usage values', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    const negativeData = {
      latencyTimeSeries: [
        { time_bucket: "202511261300", memory_usage: 5 },
        { time_bucket: "202511261301", memory_usage: -10 },
        { time_bucket: "202511261302", memory_usage: 6 }
      ]
    };
    mockRedisService.getMemoryUsage.mockReturnValue(of(negativeData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initMemoryUsageChart();
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Memory usage contains negative values. Ignoring response:",
      negativeData
    );
    expect(component.chartOptions).toBeUndefined();
  });

  it('should handle extreme value spikes without failing', () => {
    const spikeData = {
      latencyTimeSeries: [
        { time_bucket: "202511261300", memory_usage: 5 },
        { time_bucket: "202511261301", memory_usage: 200 },
        { time_bucket: "202511261302", memory_usage: 180 },
        { time_bucket: "202511261303", memory_usage: 10 }
      ]
    };
    mockRedisService.getMemoryUsage.mockReturnValue(of(spikeData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initMemoryUsageChart();
    fixture.detectChanges();
    const opts = component.chartOptions as any;
    expect(opts.series[0].data).toEqual([5, 200, 180, 10]);
    expect(component.chartOptions).toBeDefined();
  });

  // Hitchart

  it('should reject hit-rate data containing negative uptime values', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    const negativeData = {
      latencyTimeSeries: [
        { time_bucket: "202511261347", uptime: -10 },
        { time_bucket: "202511261348", uptime: 20 }
      ]
    };
    mockRedisService.getHitRate.mockReturnValue(of(negativeData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initHitRateChart();
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Hit Rate contains negative values. Invalid response:",
      negativeData
    );
    expect(component.lineChartOptions).toBeUndefined();
  });

  it('should handle large spikes in hit-rate data without breaking chart rendering', () => {
    const spikeData = {
      latencyTimeSeries: [
        { time_bucket: "202511261347", uptime: 10 },
        { time_bucket: "202511261348", uptime: 999999 },
        { time_bucket: "202511261349", uptime: 15 },
        { time_bucket: "202511261350", uptime: 20 }
      ]
    };
    mockRedisService.getHitRate.mockReturnValue(of(spikeData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initHitRateChart();
    fixture.detectChanges();
    const opts = component.lineChartOptions as any;
    expect(opts).toBeDefined();
    expect(opts.series[0].data).toEqual([10, 999999, 15, 20]);
    expect(opts.yAxis.tickAmount).toBe(6);
  });

  it('should console an error and skip chart rendering if response structure is invalid', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    const badData = { notValid: true };
    mockRedisService.getHitRate.mockReturnValue(of(badData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initHitRateChart();
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid hit-rate response:",
      badData
    );
    expect(component.lineChartOptions).toBeUndefined();
  });

  // Networkchart

  it('should handle invalid network metrics structure', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    const badData = { wrongField: [] };
    mockRedisService.getNetworkMetrics.mockReturnValue(of(badData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initNetworkChart();
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid network metrics response:",
      badData
    );
    expect(component.networkChartOptions).toBeUndefined();
  });

  it('should handle missing bytesTimeSeries array', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    const emptyData = { bytesTimeSeries: null };
    mockRedisService.getNetworkMetrics.mockReturnValue(of(emptyData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initNetworkChart();
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid network metrics response:",
      emptyData
    );
    expect(component.networkChartOptions).toBeUndefined();
  });

  it('should handle API error gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    mockRedisService.getNetworkMetrics.mockReturnValue(
      throwError(() => new Error("Network error"))
    );
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initNetworkChart();
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load network metrics:",
      expect.any(Error)
    );
    expect(component.networkChartOptions).toBeUndefined();
  });

  // Keyschart

  it('should reject data with negative DB Key metric values', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    const negativeData = {
      dbKeysMetricsTimeSeries: [
        { time_bucket: "202511261347", db_keys: -10, expired_keys_total: 0, evicted_keys_total: 0 },
        { time_bucket: "202511261348", db_keys: 100, expired_keys_total: 5, evicted_keys_total: 0 }
      ]
    };
    mockRedisService.getDBKeysMetrics.mockReturnValue(of(negativeData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initDBKeysChart();
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      " DB Keys metrics contain negative values:",
      negativeData
    );
    expect(component.keysChartOptions).toBeUndefined();
  });

  it('should reject invalid DB Keys structure', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    const invalidData = {
      wrongField: []
    };
    mockRedisService.getDBKeysMetrics.mockReturnValue(of(invalidData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initDBKeysChart();
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid DB Keys metrics response:",
      invalidData
    );
    expect(component.keysChartOptions).toBeUndefined();
  });

  it('should handle extreme spikes in DB Keys/Expired/Evicted data', () => {
    const spikeData = {
      dbKeysMetricsTimeSeries: [
        { time_bucket: "202511261347", db_keys: 100, expired_keys_total: 0, evicted_keys_total: 1 },
        { time_bucket: "202511261348", db_keys: 50000, expired_keys_total: 2000, evicted_keys_total: 0 },
        { time_bucket: "202511261349", db_keys: 120, expired_keys_total: 0, evicted_keys_total: 800 },
        { time_bucket: "202511261350", db_keys: 99, expired_keys_total: 0, evicted_keys_total: 0 }
      ]
    };
    mockRedisService.getDBKeysMetrics.mockReturnValue(of(spikeData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initDBKeysChart();
    fixture.detectChanges();
    const opts = component.keysChartOptions as any;
    expect(opts.series[0].data).toEqual([100, 50000, 120, 99]);
    expect(opts.series[1].data).toEqual([0, 2000, 0, 0]);
    expect(opts.series[2].data).toEqual([1, 0, 800, 0]);
    expect(component.keysChartOptions).toBeDefined();
  });

  // Uptimechart

  it('should reject uptime response with invalid structure', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    const invalidRes = { foo: 'bar' };
    mockRedisService.getRedisUptime.mockReturnValue(of(invalidRes));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initUptimeChart();
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid uptime response:",
      invalidRes
    );
    expect(component.uptimeChartOptions).toBeUndefined();
  });

  it('should reject negative uptime values and not render the chart', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    const negativeData = {
      latencyTimeSeries: [
        { time_bucket: "202511261400", uptime: -100 },
        { time_bucket: "202511261401", uptime: 200 }
      ]
    };
    mockRedisService.getRedisUptime.mockReturnValue(of(negativeData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initUptimeChart();
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid uptime value detected (negative uptime):",
      [-100, 200]
    );
    expect(component.uptimeChartOptions).toBeUndefined();
  });

  it('should handle extreme uptime spikes and still render the chart', () => {
    const spikeData = {
      latencyTimeSeries: [
        { time_bucket: "202511261400", uptime: 100 },
        { time_bucket: "202511261401", uptime: 5000000 }, // huge spike
        { time_bucket: "202511261402", uptime: 150 },
        { time_bucket: "202511261403", uptime: 200 }
      ]
    };
    mockRedisService.getRedisUptime.mockReturnValue(of(spikeData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initUptimeChart();
    fixture.detectChanges();
    const opts = component.uptimeChartOptions as any;
    expect(opts.series[0].data).toEqual([100, 5000000, 150, 200]);
    expect(component.uptimeChartOptions).toBeDefined();
  });

  // initConnectedBlockedChart

  it('should reject data with negative connected_clients values', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    const negativeData = {
      clientsTimeSeries: [
        { time_bucket: "202511261347", connected_clients: -5, blocked_clients: 0 },
        { time_bucket: "202511261348", connected_clients: 1, blocked_clients: 0 }
      ]
    };
    mockRedisService.getClientMetrics.mockReturnValue(of(negativeData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initConnectedBlockedChart();
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Client metrics contain negative values. Chart will not be rendered.",
      negativeData
    );
    expect(component.clientChartOptions).toBeUndefined();
  });

  it('should handle extreme value spikes in data', () => {
    const spikeData = {
      clientsTimeSeries: [
        { time_bucket: "202511261347", connected_clients: 1, blocked_clients: 0 },
        { time_bucket: "202511261348", connected_clients: 1000, blocked_clients: 0 },
        { time_bucket: "202511261349", connected_clients: 2, blocked_clients: 0 },
        { time_bucket: "202511261350", connected_clients: 1, blocked_clients: 500 }
      ]
    };
    mockRedisService.getClientMetrics.mockReturnValue(of(spikeData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initConnectedBlockedChart();
    fixture.detectChanges();
    const opts = component.clientChartOptions as any;
    expect(opts.series[0].data).toEqual([1, 1000, 2, 1]);
    expect(opts.series[1].data).toEqual([0, 0, 0, 500]);
    expect(component.clientChartOptions).toBeDefined();
  });

  // initTotalCommandRateChart

  it('should reject empty or invalid command rate response', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    const invalidData = null;
    mockRedisService.getTotalCommandRate.mockReturnValue(of(invalidData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initTotalCommandRateChart();
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid/empty command rate response:",
      invalidData
    );
    expect(component.commandsChartOptions).toBeUndefined();
  });

  it('should reject command rate response with negative values', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    const negativeData = [
      {
        time_bucket: "202511261230",
        set: -10,
        ping: 5,
        keys: 3,
        del: 1
      }
    ];
    mockRedisService.getTotalCommandRate.mockReturnValue(of(negativeData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initTotalCommandRateChart();
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Command rate response contains negative values; ignoring response.",
      negativeData
    );
    expect(component.commandsChartOptions).toBeUndefined();
  });

  it('should handle extreme spikes in command rate data', () => {
    const spikeData = [
      {
        time_bucket: "202511261230",
        set: 1,
        ping: 2,
        keys: 3,
        setinfo: 4,
        del: 5,
        psubscribe: 6,
        list: 7,
        histogram: 8,
        setname: 9,
        docs: 10,
        len: 11,
        publish: 12,
        get: 13,
        flushall: 14,
        hello: 15,
        punsubscribe: 16,
        latest: 17,
        info: 18
      },
      {
        time_bucket: "202511261231",
        set: 9999,
        ping: 1,
        keys: 1,
        setinfo: 1,
        del: 1,
        psubscribe: 1,
        list: 1,
        histogram: 1,
        setname: 1,
        docs: 1,
        len: 1,
        publish: 1,
        get: 1,
        flushall: 1,
        hello: 1,
        punsubscribe: 1,
        latest: 1,
        info: 1
      }
    ];
    mockRedisService.getTotalCommandRate.mockReturnValue(of(spikeData));
    component.redisEncryptedEntity = "abc123";
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initTotalCommandRateChart();
    fixture.detectChanges();
    const opts = component.commandsChartOptions as any;
    expect(opts.series[0].data).toEqual([1, 9999]);
    expect(opts.series[1].data).toEqual([2, 1]);
    expect(opts.series[2].data).toEqual([3, 1]);
    expect(component.commandsChartOptions).toBeDefined();
  });

  // initAverageTimeSpentByCommandChart

  it('should reject data with any negative numeric values', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const negativeData = [
      {
        time_bucket: "202511261347",
        set: -5,
        ping: 0,
        keys: 0,
        setinfo: 0,
        del: 0,
        psubscribe: 0,
        list: 0,
        histogram: 0,
        setname: 0,
        docs: 0,
        len: 0,
        publish: 0,
        get: 0,
        flushall: 0,
        hello: 0,
        punsubscribe: 0,
        latest: 0,
        info: 0
      },
      {
        time_bucket: "202511261348",
        set: 1,
        ping: 1,
        keys: 1,
        setinfo: 0,
        del: 0,
        psubscribe: 0,
        list: 0,
        histogram: 0,
        setname: 0,
        docs: 0,
        len: 0,
        publish: 0,
        get: 0,
        flushall: 0,
        hello: 0,
        punsubscribe: 0,
        latest: 0,
        info: 0
      }
    ];
    mockRedisService.getAverageTimeSpent.mockReturnValue(of(negativeData));
    component.redisEncryptedEntity = 'abc123';
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initAverageTimeSpentByCommandChart();
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative values detected in average time spent response:",
      negativeData
    );
    expect(component.averageTimeChartOptions).toBeUndefined();
    consoleSpy.mockRestore();
  });

  it('should render chart data correctly when there are extreme spikes (chart auto-scales)', () => {
    const spikeData = [
      {
        time_bucket: "202511261347",
        set: 1,
        ping: 0,
        keys: 0,
        setinfo: 0,
        del: 0,
        psubscribe: 0,
        list: 0,
        histogram: 0,
        setname: 0,
        docs: 0,
        len: 0,
        publish: 0,
        get: 0,
        flushall: 0,
        hello: 0,
        punsubscribe: 0,
        latest: 0,
        info: 0
      },
      {
        time_bucket: "202511261348",
        set: 1000,
        ping: 0,
        keys: 0,
        setinfo: 0,
        del: 0,
        psubscribe: 0,
        list: 0,
        histogram: 0,
        setname: 0,
        docs: 0,
        len: 0,
        publish: 0,
        get: 0,
        flushall: 0,
        hello: 0,
        punsubscribe: 0,
        latest: 0,
        info: 0
      },
      {
        time_bucket: "202511261349",
        set: 2,
        ping: 0,
        keys: 0,
        setinfo: 0,
        del: 0,
        psubscribe: 0,
        list: 0,
        histogram: 0,
        setname: 0,
        docs: 0,
        len: 0,
        publish: 0,
        get: 0,
        flushall: 0,
        hello: 0,
        punsubscribe: 0,
        latest: 0,
        info: 0
      },
      {
        time_bucket: "202511261350",
        set: 1,
        ping: 500,
        keys: 0,
        setinfo: 0,
        del: 0,
        psubscribe: 0,
        list: 0,
        histogram: 0,
        setname: 0,
        docs: 0,
        len: 0,
        publish: 0,
        get: 0,
        flushall: 0,
        hello: 0,
        punsubscribe: 0,
        latest: 0,
        info: 0
      }
    ];
    mockRedisService.getAverageTimeSpent.mockReturnValue(of(spikeData));
    component.redisEncryptedEntity = 'abc123';
    component.startTime = 202511241500;
    component.endTime = 202511241600;
    (component as any).initAverageTimeSpentByCommandChart();
    fixture.detectChanges();
    const opts: any = component.averageTimeChartOptions;
    expect(opts).toBeDefined();
    expect(opts.series[0].data).toEqual([1, 1000, 2, 1]);
    expect(opts.series[1].data).toEqual([0, 0, 0, 500]);
    expect(component.averageTimeChartOptions).toBeDefined();
  });

  // fetchRedisInstances

  it('should set fallback redisInstances and log error when API fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const mockError = new Error('API failed');
    mockRedisService.getRedisInstances.mockReturnValue(
      throwError(() => mockError)
    );
    component.fetchRedisInstances();
    expect(component.redisInstances).toEqual({});
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load Redis instances:',
      mockError
    );
    consoleSpy.mockRestore();
  });

});
