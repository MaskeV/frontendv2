import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { GeneralInstanceComponent } from './general-instance.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import type * as HighchartsType from 'highcharts';
import { ChangeDetectorRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { Tab } from 'bootstrap';
import { ApmApiService } from '../../../../../services/apm-api.service';
import { DecoderService } from '../../../../../services/decoder.service';

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

describe('GeneralInstanceComponent', () => {
  let component: GeneralInstanceComponent;
  let fixture: ComponentFixture<GeneralInstanceComponent>;
  let cdr: ChangeDetectorRef;
  let mockApiService: any;
  let mockDecoderService: any;

  beforeEach(async () => {
    capturedChartOptions = null;
    mockApiService = {
      getTraceSegmentsCount: jest.fn().mockReturnValue(of(289)),
      getUptimeAvailability: jest.fn().mockReturnValue(of({
        "1_day": { uptime_percentage: 100, downtime_duration_minutes: 0 },
        "5_day": { uptime_percentage: 100, downtime_duration_minutes: 0 },
        "10_day": { uptime_percentage: 90.04, downtime_duration_minutes: 1434 }
      })),
      getServiceInstanceLoadTimevalues: jest.fn().mockReturnValue(of({
        load: 39.61,
        loadTimeSeries: [
          { load: 133, time_bucket: '202511181330', status: 'NORMAL' },
          { load: 40, time_bucket: '202511181331', status: 'NORMAL' },
          { load: 5, time_bucket: '202511181332', status: 'NORMAL' },
          { time_bucket: '202511181333' },
          { load: 2, time_bucket: '202511181334', status: 'NORMAL' },
        ]
      })),
      getServiceInstanceSuccessRateTimevalues: jest.fn().mockReturnValue(of({
        successRate: 100.0,
        successRateTimeSeries: [
          { time_bucket: '202511181330', success_rate: 100.0 },
          { time_bucket: '202511181330', success_rate: 100.0 },
          { time_bucket: '202511181330', success_rate: 100.0 },
        ]
      })),
      getServiceInstanceLatencyTimevalues: jest.fn().mockReturnValue(
        of({
          latency: 601057.5,
          latencyTimeSeries: [
            { latency: 549886, time_bucket: '202511120000', status: 'NORMAL' },
            { time_bucket: '202511130000' },
            { time_bucket: '202511140000' },
            { time_bucket: '202511150000' },
            { time_bucket: '202511160000' },
            { latency: 652229, time_bucket: '202511170000', status: 'NORMAL' },
            { time_bucket: '202511180000' },
            { time_bucket: '202511190000' }
          ]
        })
      ),
      getServiceInstanceDatabaseConnectionPool: jest.fn().mockReturnValue(
        of([{
          "nonsbi_final_15jan2025_192.168.9.16:3306-leakDetectionThreshold": 0.0,
          "nonsbi_final_15jan2025_192.168.9.16:3306-threadsAwaitingConnection": 0.0,
          "nonsbi_final_15jan2025_192.168.9.16:3306-idleTimeout": 600000.0,
          "nonsbi_final_15jan2025_192.168.9.16:3306-maximumPoolSize": 10.0,
          "nonsbi_final_15jan2025_192.168.9.16:3306-totalConnections": 9.0,
          "nonsbi_final_15jan2025_192.168.9.16:3306-connectionTimeout": 30000.0,
          "nonsbi_final_15jan2025_192.168.9.16:3306-idleConnections": 9.0,
          "time_bucket": "202511120000",
          "nonsbi_final_15jan2025_192.168.9.16:3306-minimumIdle": 10.0,
          "nonsbi_final_15jan2025_192.168.9.16:3306-validationTimeout": 5000.0,
          "nonsbi_final_15jan2025_192.168.9.16:3306-activeConnections": 1.0
        },
        {
          "nonsbi_final_15jan2025_192.168.9.16:3306-leakDetectionThreshold": 0.0,
          "nonsbi_final_15jan2025_192.168.9.16:3306-threadsAwaitingConnection": 0.0,
          "nonsbi_final_15jan2025_192.168.9.16:3306-idleTimeout": 600000.0,
          "nonsbi_final_15jan2025_192.168.9.16:3306-maximumPoolSize": 10.0,
          "nonsbi_final_15jan2025_192.168.9.16:3306-totalConnections": 9.0,
          "nonsbi_final_15jan2025_192.168.9.16:3306-connectionTimeout": 30000.0,
          "nonsbi_final_15jan2025_192.168.9.16:3306-idleConnections": 9.0,
          "time_bucket": "202511130000",
          "nonsbi_final_15jan2025_192.168.9.16:3306-minimumIdle": 10.0,
          "nonsbi_final_15jan2025_192.168.9.16:3306-validationTimeout": 5000.0,
          "nonsbi_final_15jan2025_192.168.9.16:3306-activeConnections": 1.0
        }],)
      ),
      getServiceInstanceThreadPool: jest.fn().mockReturnValue(
        of([{
          "pool_size-tomcat_execute_pool": 10.0,
          "time_bucket": "202511191524",
          "active_size-tomcat_execute_pool": 0.0,
          "max_pool_size-tomcat_execute_pool": 200.0,
          "queue_size-tomcat_execute_pool": 0.0,
          "core_pool_size-tomcat_execute_pool": 10.0
        },
        {
          "pool_size-tomcat_execute_pool": 10.0,
          "time_bucket": "202511191525",
          "active_size-tomcat_execute_pool": 0.0,
          "max_pool_size-tomcat_execute_pool": 200.0,
          "queue_size-tomcat_execute_pool": 0.0,
          "core_pool_size-tomcat_execute_pool": 10.0
        }],)
      ),
      getTracesData: jest.fn().mockReturnValue(
        of([
          {
            traceId: 'ZwUHAimxw4eTV7VuKRYMjRlpjsPJbhMCe1XgJYk0eWxiLSiyFYZwOGj6Vl3LzndIKF0LTKBmsrQUnYrZA0xSZu8ffrMG',
            isError: 0,
            instance: 'CzhwThO2vNjDD94pRBBs3jVt0p3rsNAFQ5YcUFJ+xITzZIAE',
            endpointId: 'HlJkCyjopMb5Mr0xfmp4wjQ4vczJQHBaL66rWoyYnY3s3ePHdenitQ==',
            latency: 3,
            startTime: 1763098909011,
            timeBucket: 20251114111149
          }
        ])
      ),
      getTraceMetaData: jest.fn().mockReturnValue(
        of([
          {
            "traceId": "eabcc0807bf34659a4ebee9675cc8bb6.6823.17635476652090001",
            "segmentId": "eabcc0807bf34659a4ebee9675cc8bb6.6823.17635476652090000",
            "spanId": 0,
            "parentSpanId": -1,
            "refs": [],
            "serviceCode": "Netraa_LH::reports_generation",
            "serviceInstanceName": "reports_generation",
            "startTime": 1763547665209,
            "endTime": 1763547665210,
            "endpointName": "Mysql/JDBC/Connection/close",
            "type": "Exit",
            "peer": "192.168.9.16:3306",
            "component": "mysql-connector-java",
            "isError": false,
            "layer": "Database",
            "tags": [
              {
                "value": "Mysql",
                "key": "db.type"
              },
              {
                "value": "nonsbi_final_15jan2025",
                "key": "db.instance"
              },
              {
                "value": "",
                "key": "db.statement"
              }
            ],
            "logs": []
          }
        ])
      ),
      getLogsData: jest.fn().mockReturnValue(of([
        { traceId: 'trace1', instance: 'Inst1', endpointId: 'EP1', content: 'content1', tags: { level: 'INFO' } },
        { traceId: 'trace2', instance: 'Inst2', endpointId: 'EP2', content: 'content2', tags: { level: 'ERROR' } },
      ])),
      getLogsAggregatedData: jest.fn().mockReturnValue(of({ total_hits: 2 })),
      getLogsCountTimeSeries: jest.fn().mockReturnValue(of({
        time_series: [
          { total: 1, time_bucket: '202511141100', INFO: 1 },
          { total: 1, time_bucket: '202511141101', INFO: 1 }
        ]
      })),
      getJvmCpu: jest.fn().mockReturnValue(
        of([
          { jvm_cpu: 1.0, time_bucket: '202511191754' },
          { jvm_cpu: 1.0, time_bucket: '202511191755' },
          { jvm_cpu: 1.0, time_bucket: '202511191756' }
        ])
      ),

      getJvmMemory: jest.fn().mockReturnValue(
        of([
          { noheap_max: 0.0, time_bucket: '202511191754', heap: 449.02, heap_max: 2486.0, noheap: 228.28 },
          { noheap_max: 0.0, time_bucket: '202511191755', heap: 453.42, heap_max: 2486.0, noheap: 228.30 },
          { noheap_max: 0.0, time_bucket: '202511191756', heap: 457.65, heap_max: 2486.0, noheap: 228.31 }
        ])
      ),

      getJvmMemoryDetail: jest.fn().mockReturnValue(
        of([
          { oldgen: 437.54, metaspace: 137.37, newgen: 7.87, permgen: 17.12, survivor: 3.61, time_bucket: '202511191754' },
          { oldgen: 437.54, metaspace: 137.37, newgen: 12.27, permgen: 17.12, survivor: 3.61, time_bucket: '202511191755' },
          { oldgen: 437.54, metaspace: 137.37, newgen: 16.5, permgen: 17.12, survivor: 3.61, time_bucket: '202511191756' }
        ])
      ),

      getJvmGCTime: jest.fn().mockReturnValue(
        of([
          { young_gc: 0, old_gc: 0, time_bucket: '202511191754' },
          { young_gc: 0, old_gc: 0, time_bucket: '202511191755' },
          { young_gc: 0, old_gc: 0, time_bucket: '202511191756' }
        ])
      ),

      getJvmGCCount: jest.fn().mockReturnValue(
        of([
          { young_gc: 0, old_gc: 0, time_bucket: '202511191754' },
          { young_gc: 0, old_gc: 0, time_bucket: '202511191755' },
          { young_gc: 0, old_gc: 0, time_bucket: '202511191756' }
        ])
      ),

      getJvmThreadCount: jest.fn().mockReturnValue(
        of([
          { peak: 64, live: 60, daemon: 50, time_bucket: '202511191754' },
          { peak: 64, live: 60, daemon: 50, time_bucket: '202511191755' },
          { peak: 64, live: 60, daemon: 50, time_bucket: '202511191756' }
        ])
      ),

      getJvmThreadStateCount: jest.fn().mockReturnValue(
        of([
          { runnable: 23, blocked: 0, waiting: 18, timed_waiting: 19, time_bucket: '202511191754' },
          { runnable: 23, blocked: 0, waiting: 18, timed_waiting: 19, time_bucket: '202511191755' },
          { runnable: 23, blocked: 0, waiting: 18, timed_waiting: 19, time_bucket: '202511191756' }
        ])
      ),

      getJvmClassCount: jest.fn().mockReturnValue(
        of([
          { loaded: 23888, total_loaded: 24122, total_unloaded: 234, time_bucket: '202511191754' },
          { loaded: 23888, total_loaded: 24122, total_unloaded: 234, time_bucket: '202511191755' },
          { loaded: 23888, total_loaded: 24122, total_unloaded: 234, time_bucket: '202511191756' }
        ])
      ),
      getEndpoint: jest.fn().mockReturnValue(of({})),
      getThreshold: jest.fn().mockReturnValue(of({})),
    };
    mockDecoderService = {
      decodeObject: jest.fn().mockImplementation((data: any) => Promise.resolve(data))
    };
    await TestBed.configureTestingModule({
      imports: [GeneralInstanceComponent, HttpClientTestingModule],
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
        { provide: ApmApiService, useValue: mockApiService },
        { provide: DecoderService, useValue: mockDecoderService },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .compileComponents();

    fixture = TestBed.createComponent(GeneralInstanceComponent);
    component = fixture.componentInstance;
    component.entityId = '123';
    component.startTime = Date.now();
    component.endTime = Date.now();
    component.size = 10;

    component.thresholds = {
      service_cpm: {
        criticalValue: 100,
        warningValue: 50,
        avgBaseline: 10
      },
      service_sla: { criticalValue: 70, warningValue: 85, avgBaseline: 90 },
      service_resp_time: { criticalValue: 500, warningValue: 100, avgBaseline: 300 },
    };

    component.languages = [
      { id: 'overview', label: 'Overview' },
      { id: 'jvm', label: 'JVM' },
      { id: 'log', label: 'Logs' }
    ];

    cdr = fixture.componentRef.injector.get(ChangeDetectorRef);
    (Highcharts.chart as jest.Mock).mockClear();
    (Highcharts as any).charts = [];
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Restore all mocks after each test
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //  Metric Card

  it('should render service metric cards with correct values', fakeAsync(() => {
    component.kpis = {
      Availablity: 92,
      latency: 180,
      load: 250,
      hits: 12000,
      error: 5
    };
    component.thresholds = {
      service_sla: { warningValue: 95, criticalValue: 90 },
      service_resp_time: { warningValue: 150, criticalValue: 250 },
      service_cpm: { warningValue: 200, criticalValue: 300 }
    };
    cdr.detectChanges();
    tick();
    cdr.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.card-kpi p.kpi')?.textContent).toContain('92');
    expect(compiled.textContent).toContain('180');
    expect(compiled.textContent).toContain('250');
    expect(compiled.textContent).toContain('12000');
    expect(compiled.textContent).toContain('5');
  }));

  it('should apply correct threshold colors for service metrics', () => {
    component.thresholds = {
      service_sla: { warningValue: 95, criticalValue: 90 },
      service_resp_time: { warningValue: 150, criticalValue: 250 },
      service_cpm: { warningValue: 200, criticalValue: 300 }
    };
    let r = component.getThresholdDisplay('service_sla', 85);
    expect(r.color).toBe('red');
    expect(r.value).toBe(90);
    r = component.getThresholdDisplay('service_sla', 93);
    expect(r.color).toBe('orange');
    expect(r.value).toBe(95);
    r = component.getThresholdDisplay('service_sla', 98);
    expect(r.color).toBe('#198754');
    r = component.getThresholdDisplay('service_resp_time', 300);
    expect(r.color).toBe('red');
    expect(r.value).toBe(250);
    r = component.getThresholdDisplay('service_resp_time', 200);
    expect(r.color).toBe('orange');
    expect(r.value).toBe(150);
    r = component.getThresholdDisplay('service_resp_time', 100);
    expect(r.color).toBe('#198754');
    r = component.getThresholdDisplay('service_cpm', 350);
    expect(r.color).toBe('red');
    expect(r.value).toBe(300);
    r = component.getThresholdDisplay('service_cpm', 210);
    expect(r.color).toBe('orange');
    expect(r.value).toBe(200);
    r = component.getThresholdDisplay('service_cpm', 150);
    expect(r.color).toBe('#198754');
  });

  it('should apply border color correctly when SLA approaches thresholds', fakeAsync(() => {
    component.kpis = { Availablity: 92 };
    component.thresholds = {
      service_sla: { warningValue: 95, criticalValue: 90 }
    };
    cdr.detectChanges();
    tick();
    cdr.detectChanges();
    const card: HTMLElement = fixture.nativeElement.querySelector('.card-body');
    const style = getComputedStyle(card);
    expect(style.borderColor).toBe('orange');
  }));

  it('should navigate to traces tab on click', () => {
    const mockShow = jest.fn();
    (Tab as any).mockImplementation(() => ({ show: mockShow }));
    jest.spyOn(component, 'loadData').mockImplementation(() => { });
    jest.spyOn(component, 'selectCriteria').mockImplementation(() => { });
    document.body.innerHTML = `<a href="#traces" id="traces-tab"></a>`;
    const event = new MouseEvent('click');
    component.navigateToTraces(event);
    expect(mockShow).toHaveBeenCalled();
    expect(component.status).toBe("error");
  });

  it('should call getUptimeAvailability and populate uptimeData', fakeAsync(() => {
    const spyBullet = jest.spyOn(component, 'AppAvailBulletChart');
    component.loadUptime();
    tick();
    expect(mockApiService.getUptimeAvailability).toHaveBeenCalledWith(
      component.entityInstanceId,
      component.endTime.toString().substring(0, 8)
    );
    expect(component.uptimeData['5_day'].uptime_percentage).toBe(100);
    expect(component.uptimeData['10_day'].uptime_percentage).toBe(90.04);
    expect(spyBullet).toHaveBeenCalledWith(
      expect.stringContaining('Downtime: 0 mins'), 100, 100, '5'
    );
    expect(spyBullet).toHaveBeenCalledWith(
      expect.stringContaining('Downtime: 1434 mins'), 90.04, 100, '10'
    );
  }));

  it('should create proper Highcharts options for 5-day and 10-day charts', fakeAsync(() => {
    component.loadUptime();
    tick();
    const series5 = component.AppAvailHighcharts5Day.series![0] as any;
    const series10 = component.AppAvailHighcharts10Day.series![0] as any;
    expect(series5.data[0].y).toBe(100);
    expect(series10.data[0].y).toBe(90.04);
    const xAxis5 = component.AppAvailHighcharts5Day.xAxis as any;
    const xAxis10 = component.AppAvailHighcharts10Day.xAxis as any;
    expect(xAxis5.categories[0]).toContain('Downtime: 0 mins');
    expect(xAxis10.categories[0]).toContain('Downtime: 1434 mins');
  }));

  it('should call getServiceInstanceLoadTimevalues API and initialize chart with correct series and xAxis', fakeAsync(() => {
    component.entityInstanceId = 'entityId';
    component.startTime = 0;
    component.endTime = 999999;
    component.getServiceInstanceLoadTimevalues();
    tick();
    expect(mockApiService.getServiceInstanceLoadTimevalues)
      .toHaveBeenCalledWith('entityId', 0, 999999);
    const chart = component.ServiceInstanceLoadTimevaluesChart;
    expect(chart).toBeDefined();
  }));

  it('should handle empty data gracefully', fakeAsync(() => {
    mockApiService.getServiceInstanceLoadTimevalues.mockReturnValue(
      of({ load: 0, loadTimeSeries: [] })
    );
    component.getServiceInstanceLoadTimevalues();
    tick();
    expect(component.ServiceInstanceLoadTimevaluesChart).toBeUndefined();
  }));

  it('should update kpis.load properly', fakeAsync(() => {
    component.getServiceInstanceLoadTimevalues();
    tick();
    expect(component.kpis.load).toBe('39.61');
  }));

  it('should render chart correctly in AVG mode with proper color coding', fakeAsync(() => {
    component.chart_criteria = 'avg';
    mockApiService.getServiceInstanceLoadTimevalues.mockReturnValue(
      of({
        load: 50,
        loadTimeSeries: [
          { time_bucket: '2025-01-01 10:00', load: 130, status: 'CRITICAL' },
          { time_bucket: '2025-01-01 10:01', load: 60, status: 'WARNING' },
          { time_bucket: '2025-01-01 10:02', load: 10, status: 'NORMAL' }
        ]
      })
    );
    component.thresholds = {
      service_cpm: {
        criticalValue: 100,
        warningValue: 50,
        avgBaseline: 70
      }
    };
    jest.spyOn(component, 'convertTimebucket').mockImplementation((t) => {
      return t === '2025-01-01 10:00' ? 1 :
        t === '2025-01-01 10:01' ? 2 :
          3;
    });
    component.getServiceInstanceLoadTimevalues();
    tick();
    expect(capturedChartOptions).toBeDefined();
    expect(capturedChartOptions.series).toBeDefined();
    expect(capturedChartOptions.series.length).toBeGreaterThan(0);
    const seriesData = capturedChartOptions.series[0].data;
    expect(seriesData.length).toBe(3);
    expect(seriesData[0].color).toBe('#E94F3D');
    expect(seriesData[1].color).toBe('#ED9C40');
    expect(seriesData[2].color).toBe('#7CB5EC');
  }));

  it('should re-render chart when chart_criteria is changed', fakeAsync(() => {
    component.chart_criteria = 'avg';
    mockApiService.getServiceInstanceLoadTimevalues.mockReturnValue(
      of({
        load: 30,
        loadTimeSeries: [
          { time_bucket: '2025-01-01 10:00', load: 70, status: 'WARNING' }
        ]
      })
    );
    component.thresholds = {
      service_cpm: { criticalValue: 120, warningValue: 50, avgBaseline: 60 }
    };
    jest.spyOn(component, 'convertTimebucket').mockReturnValue(1641034800000);
    component.getServiceInstanceLoadTimevalues();
    tick();
    cdr.detectChanges();
    expect(capturedChartOptions).toBeDefined();
    expect(capturedChartOptions).not.toBeNull();
    if (capturedChartOptions && capturedChartOptions.series) {
      expect(capturedChartOptions.series[0].name).toBe('Load');
      expect(capturedChartOptions.series[0].data.length).toBe(1);
    }
    expect(component.ServiceInstanceLoadTimevaluesChart).toBeDefined();
    expect(component.kpis.load).toBe('30');
    const firstChartOptions = JSON.parse(JSON.stringify(capturedChartOptions));
    capturedChartOptions = null;
    (Highcharts.chart as jest.Mock).mockClear();
    (Highcharts.Chart as jest.Mock).mockClear();
    if (component.ServiceInstanceLoadTimevaluesChart) {
      component.ServiceInstanceLoadTimevaluesChart.destroy();
      component.ServiceInstanceLoadTimevaluesChart = undefined as any;
    }
    component.chart_criteria = 'threshold';
    mockApiService.getServiceInstanceLoadTimevalues.mockReturnValue(
      of({
        load: 30,
        loadTimeSeries: [
          { time_bucket: '2025-01-01 10:00', load: 70, status: 'WARNING' }
        ]
      })
    );
    component.getServiceInstanceLoadTimevalues();
    tick();
    cdr.detectChanges();
    expect(capturedChartOptions).toBeDefined();
    expect(capturedChartOptions).not.toBeNull();
    if (capturedChartOptions) {
      expect(capturedChartOptions.series).toBeDefined();
      expect(capturedChartOptions.series[0].data.length).toBe(1);
      expect(capturedChartOptions.yAxis.plotLines).toBeDefined();
      expect(capturedChartOptions.yAxis.plotLines.length).toBeGreaterThan(0);
      expect(capturedChartOptions.yAxis.plotLines[0].value).toBe(60);
    }
    expect(component.ServiceInstanceLoadTimevaluesChart).toBeDefined();
    expect(capturedChartOptions).not.toEqual(firstChartOptions);
    expect(mockApiService.getServiceInstanceLoadTimevalues).toHaveBeenCalledTimes(2);
    if (component.ServiceInstanceLoadTimevaluesChart) {
      component.ServiceInstanceLoadTimevaluesChart.destroy();
    }
  }));

  it('should call getServiceInstanceSuccessRateTimevalues API and initialize chart with correct series and xAxis', fakeAsync(() => {
    component.entityInstanceId = 'entityId';
    component.startTime = 0;
    component.endTime = 999999;

    mockApiService.getServiceInstanceSuccessRateTimevalues = jest
      .fn()
      .mockReturnValue(of({
        successRate: 100,
        successRateTimeSeries: [
          { time_bucket: '202511191104', success_rate: 100 }
        ]
      }));

    component.getServiceInstanceSuccessRateTimevalues();
    tick();

    expect(mockApiService.getServiceInstanceSuccessRateTimevalues)
      .toHaveBeenCalledWith('entityId', 0, 999999);

    expect(component.ServiceInstanceSuccessRateTimevaluesChart).toBeDefined();
  }));

  it('should handle empty data gracefully', fakeAsync(() => {
    mockApiService.getServiceInstanceSuccessRateTimevalues = jest
      .fn()
      .mockReturnValue(of({
        successRate: 0,
        successRateTimeSeries: []
      }));

    component.getServiceInstanceSuccessRateTimevalues();
    tick();

    expect(component.ServiceInstanceSuccessRateTimevaluesChart).toBeUndefined();
  }));

  it('should update KPIs.Availablity properly', fakeAsync(() => {
    mockApiService.getServiceInstanceSuccessRateTimevalues = jest
      .fn()
      .mockReturnValue(of({
        successRate: 95,
        successRateTimeSeries: [
          { time_bucket: '202511191104', success_rate: 95 }
        ]
      }));

    component.getServiceInstanceSuccessRateTimevalues();
    tick();

    expect(component.kpis.Availablity).toBe('95');
  }));

  // it('should render chart correctly in AVG mode with proper color coding', fakeAsync(() => {
  //   component.chart_criteria = 'avg';

  //   mockApiService.getServiceInstanceSuccessRateTimevalues = jest
  //     .fn()
  //     .mockReturnValue(of({
  //       successRate: 100,
  //       successRateTimeSeries: [
  //         { time_bucket: '202511191104', success_rate: 100 },
  //         { time_bucket: '202511191105', success_rate: 60 },
  //         { time_bucket: '202511191106', success_rate: 10 }
  //       ]
  //     }));

  //   component.thresholds = {
  //     service_sla: {
  //       criticalValue: 30,
  //       warningValue: 70,
  //       avgBaseline: 80
  //     }
  //   };

  //   jest.spyOn(component, 'convertTimebucket').mockImplementation((tb) => {
  //     return tb === '202511191104' ? 1 :
  //            tb === '202511191105' ? 2 :
  //            3;
  //   });

  //   component.getServiceInstanceSuccessRateTimevalues();
  //   tick();

  //   expect(capturedChartOptions).toBeDefined();
  //   expect(capturedChartOptions.series.length).toBeGreaterThan(0);

  //   const points = capturedChartOptions.series[0].data;

  //   expect(points.length).toBe(3);

  //   expect(points[0].marker.fillColor).toBe('#8338ec'); // good
  //   expect(points[1].marker.fillColor).toBe('#ED9C40'); // warning
  //   expect(points[2].marker.fillColor).toBe('#E94F3D'); // critical
  // }));

  it('should call getServiceInstanceLatencyTimevalues API and initialize chart', fakeAsync(() => {
    component.entityInstanceId = 'abc123';
    component.startTime = 0;
    component.endTime = 999999;
    component.getServiceInstanceLatencyTimevalues();
    tick();
    expect(mockApiService.getServiceInstanceLatencyTimevalues)
      .toHaveBeenCalledWith('abc123', 0, 999999);
    expect(component.ServiceInstanceLatencyTimevaluesChart).toBeDefined();
  }));

  it('should handle empty latency data gracefully', fakeAsync(() => {
    mockApiService.getServiceInstanceLatencyTimevalues.mockReturnValue(
      of({
        latency: 0,
        latencyTimeSeries: []
      })
    );
    component.getServiceInstanceLatencyTimevalues();
    tick();
    expect(component.ServiceInstanceLatencyTimevaluesChart).toBeUndefined();
  }));

  it('should update kpis.latency properly', fakeAsync(() => {
    component.getServiceInstanceLatencyTimevalues();
    tick();
    expect(component.kpis.latency).toBe('601057.5');
  }));

  it('should render latency chart correctly in AVG mode with proper color coding', fakeAsync(() => {
    component.chart_criteria = 'avg';
    mockApiService.getServiceInstanceLatencyTimevalues.mockReturnValue(
      of({
        latency: 100,
        latencyTimeSeries: [
          { latency: 10, time_bucket: '2025-01-01 10:00', status: 'NORMAL' },
          { latency: 200, time_bucket: '2025-01-01 10:01', status: 'WARNING' },
          { latency: 400, time_bucket: '2025-01-01 10:02', status: 'CRITICAL' }
        ]
      })
    );
    component.thresholds = {
      service_resp_time: { criticalValue: 300, warningValue: 100, avgBaseline: 150 }
    };
    jest.spyOn(component, 'convertTimebucket').mockImplementation((tb => {
      return tb === '2025-01-01 10:00' ? 1 :
        tb === '2025-01-01 10:01' ? 2 :
          3;
    }));
    component.getServiceInstanceLatencyTimevalues();
    tick();
    expect(capturedChartOptions).toBeDefined();
    expect(capturedChartOptions.series[0].data.length).toBe(3);
    const pts = capturedChartOptions.series[0].data;
    expect(pts[0].color).toBe('#0071A7');
    expect(pts[1].color).toBe('#ED9C40');
    expect(pts[2].color).toBe('#E94F3D');
  }));

  it('should call getServiceInstanceDatabaseConnectionPool API and initialize chart', fakeAsync(() => {
    component.entityInstanceId = 'abc123';
    component.startTime = 0;
    component.endTime = 999999;
    component.getServiceInstanceDatabaseConnectionPool();
    tick();
    expect(mockApiService.getServiceInstanceDatabaseConnectionPool)
      .toHaveBeenCalledWith('abc123', 0, 999999);
    expect(component.ServiceInstanceDatabaseConnectionPoolChart).toBeDefined();
  }));

  it('should handle empty latency data gracefully', fakeAsync(() => {
    mockApiService.getServiceInstanceDatabaseConnectionPool.mockReturnValue(
      of({
        latency: 0,
        latencyTimeSeries: []
      })
    );
    component.getServiceInstanceDatabaseConnectionPool();
    tick();
    expect(component.ServiceInstanceDatabaseConnectionPoolChart).toBeUndefined();
  }));

  it('should call getServiceInstanceThreadPool API and initialize chart', fakeAsync(() => {
    component.entityInstanceId = 'abc123';
    component.startTime = 0;
    component.endTime = 999999;
    component.getServiceInstanceThreadPool();
    tick();
    expect(mockApiService.getServiceInstanceThreadPool)
      .toHaveBeenCalledWith('abc123', 0, 999999);
    expect(component.ServiceInstanceThreadPoolChart).toBeDefined();
  }));

  it('should handle empty latency data gracefully', fakeAsync(() => {
    mockApiService.getServiceInstanceThreadPool.mockReturnValue(
      of({
        latency: 0,
        latencyTimeSeries: []
      })
    );
    component.getServiceInstanceThreadPool();
    tick();
    expect(component.ServiceInstanceThreadPoolChart).toBeUndefined();
  }));

  // Traces Tab

  it('should toggle dropdown when toggleDropdown is called', () => {
    component.dropdownOpen = false;
    component.toggleDropdown();
    expect(component.dropdownOpen).toBe(true);
    component.toggleDropdown();
    expect(component.dropdownOpen).toBe(false);
  });

  it('should show criteria when selectCriteria is called', () => {
    component.shownCriteria = {
      endpoint: false,
      status: false,
      traceID: false
    };
    component.selectCriteria('endpoint');
    expect(component.shownCriteria['endpoint']).toBe(true);
    component.selectCriteria('status');
    expect(component.shownCriteria['status']).toBe(true);
  });

  it('should hide criteria and reset values when removeCriteria is called', () => {
    component.shownCriteria = {
      endpoint: true,
      status: true,
      traceID: true,
      minDuration: true,
      maxDuration: true
    };
    component.status = 'error';
    component.traceID = 'trace123';
    component.minDuration = 100;
    component.maxDuration = 500;
    jest.spyOn(component, 'fetchEndpoints').mockImplementation(() => { });
    component.removeCriteria('status');
    expect(component.shownCriteria['status']).toBe(false);
    expect(component.status).toBe('');
    component.removeCriteria('traceID');
    expect(component.shownCriteria['traceID']).toBe(false);
    expect(component.traceID).toBe('');
    component.removeCriteria('minDuration');
    expect(component.shownCriteria['minDuration']).toBe(false);
    expect(component.minDuration).toBeNull();
    component.removeCriteria('maxDuration');
    expect(component.shownCriteria['maxDuration']).toBe(false);
    expect(component.maxDuration).toBeNull();
    component.removeCriteria('endpoint');
    expect(component.shownCriteria['endpoint']).toBe(false);
    expect(component.endpointTrace).toBe('All');
    expect(component.textEndpoint).toBe('');
    expect(component.fetchEndpoints).toHaveBeenCalled();

  });

  it('should call fetchTraceData and select first item when search is called', fakeAsync(() => {
    const mockTraceData = [
      {
        traceId: 'trace1',
        endpointId: 'ZW5kcG9pbnQx',
        isError: 0,
        latency: 100,
        startTime: 1763547665209,
        timeBucket: '20251119155105',
        instance: 'instance1'
      }
    ];
    mockApiService.getTracesData = jest.fn().mockReturnValue(of(mockTraceData));
    jest.spyOn(component, 'clearSelection').mockImplementation(() => { });
    jest.spyOn(component, 'fetchTraceData').mockImplementation(() => {
      component.paginatedData = mockTraceData;
    });
    jest.spyOn(component, 'selectItem').mockImplementation(() => { });
    component.search();
    expect(component.clearSelection).toHaveBeenCalled();
    expect(component.currentPage).toBe(1);
    expect(component.fetchTraceData).toHaveBeenCalled();
    tick(5000);
    expect(component.selectItem).toHaveBeenCalledWith(mockTraceData[0]);
  }));

  it('should toggle sort parameters correctly', fakeAsync(() => {
    jest.spyOn(component, 'fetchTraceData').mockImplementation(() => { });
    component.sortParameter = 'start_time';
    component.orderParameter = 'asc';
    component.toggleSort('start_time');
    expect(component.sortParameter).toBe('start_time');
    expect(component.orderParameter).toBe('dec');
    component.toggleSort('duration');
    expect(component.sortParameter).toBe('duration');
    expect(component.orderParameter).toBe('asc');
    component.toggleSort('isError');
    expect(component.sortParameter).toBe('isError');
    expect(component.orderParameter).toBe('asc');
    expect(component.fetchTraceData).toHaveBeenCalledTimes(3);
  }));

  it('should select item and fetch trace details', fakeAsync(() => {
    const mockItem = {
      traceId: 'trace123',
      endpointId: btoa('GET:/api/test'),
      isError: 0,
      latency: 100
    };
    jest.spyOn(component, 'clearSelection').mockImplementation(() => { });
    jest.spyOn(component, 'fetchTraceDataList').mockImplementation(() => { });
    component.traceDetailsSection = {
      nativeElement: {
        scrollIntoView: jest.fn()
      }
    } as any;
    component.selectItem(mockItem);
    expect(component.clearSelection).toHaveBeenCalled();
    expect(component.selectedItem).toBe('GET:/api/test');
    expect(component.selectedTraceId).toBe('trace123');
    expect(component.currentView).toBe('table');
    expect(component.fetchTraceDataList).toHaveBeenCalledWith('trace123');
    tick(100);
    expect(component.traceDetailsSection.nativeElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start'
    });
  }));

  it('should clear selection when selectItem is called with null', () => {
    jest.spyOn(component, 'clearSelection').mockImplementation(() => { });
    component.selectItem(null);
    expect(component.clearSelection).toHaveBeenCalled();
  });

  it('should return correct status color class', () => {
    expect(component.getStatusColorClass(1)).toBe('bg-danger');
    expect(component.getStatusColorClass(0)).toBe('bg-success');
    expect(component.getStatusColorClass(2)).toBe('bg-light');
  });

  it('should decode base64 string correctly', () => {
    const original = 'GET:/api/test';
    const encoded = btoa(original);
    expect(component.decodeBase64(encoded)).toBe(original);
  });

  it('should return original string if base64 decode fails', () => {
    const invalidBase64 = 'invalid!!!base64';
    expect(component.decodeBase64(invalidBase64)).toBe(invalidBase64);
  });

  it('should format time bucket correctly', () => {
    const timeBucket = 20251119155105;
    const formatted = component.formatTimeBucket(timeBucket);
    expect(formatted).toBe('2025-11-19 15:51:05');
  });

  it('should change view when changeView is called', () => {
    component.changeView('list');
    expect(component.selectedView).toBe('list');
    component.changeView('tree');
    expect(component.selectedView).toBe('tree');
    component.changeView('stat');
    expect(component.selectedView).toBe('stat');
  });

  it('should open log tab with trace ID', fakeAsync(() => {
    const mockTraceId = 'trace123';
    const mockLogTab = {
      click: jest.fn()
    } as any;
    jest.spyOn(document, 'querySelector').mockReturnValue(mockLogTab);
    jest.spyOn(component, 'searchLogs').mockImplementation(() => { });
    jest.spyOn(component, 'loadData').mockImplementation(() => { });
    component.openLogTabTraceId(mockTraceId);
    expect(mockLogTab.click).toHaveBeenCalled();
    tick(150);
    expect(component.traceIDLogs).toBe(mockTraceId);
    expect(component.searchLogs).toHaveBeenCalled();
    expect(component.loadData).toHaveBeenCalledWith('log');
  }));

  it('should open modal when onTableRowSelected is called', () => {
    const mockRow = {
      serviceCode: 'service1',
      serviceInstanceName: 'instance1',
      endpointName: 'endpoint1',
      type: 'HTTP',
      component: 'component1',
      peer: 'peer1',
      isError: 0,
      tags: []
    };
    jest.spyOn(component, 'openModal');
    component.onTableRowSelected(mockRow);
    expect(component.openModal).toHaveBeenCalledWith(mockRow);
  });

  it('should clear modal data and hide modal when closeModal is called', () => {
    component.modalData = {
      serviceCode: 'test',
      serviceInstanceName: '',
      endpointName: '',
      type: '',
      component: '',
      peer: '',
      isError: false,
      tags: [],
      logs: []
    };
    component.showModal = true;
    component.closeModal();
    expect(component.modalData).toBeNull();
    expect(component.showModal).toBe(false);
  });

  it('should call openModal when onListItemSelected is called', () => {
    const mockItem = {
      serviceCode: 'service1',
      endpointName: 'endpoint1'
    };
    jest.spyOn(component, 'openModal');
    component.onListItemSelected(mockItem);
    expect(component.openModal).toHaveBeenCalledWith(mockItem);
  });

  it('should fetch trace data with all parameters', fakeAsync(() => {
    const mockTraceData = [
      {
        traceId: 'trace1',
        endpointId: 'ZW5kcG9pbnQx',
        isError: 0,
        latency: 100,
        startTime: 1763547665209,
        timeBucket: 20251119155105,
        instance: 'instance1'
      }
    ];
    component.traceDetailsSection = {
      nativeElement: { scrollIntoView: jest.fn() }
    } as any;
    mockApiService.getTracesData = jest.fn().mockReturnValue(of(mockTraceData));
    mockDecoderService.decodeObject = jest.fn().mockResolvedValue(mockTraceData);
    jest.spyOn(component, 'clearSelection').mockImplementation(() => { });
    component.entityId = 'service1';
    component.entityInstanceId = 'instance1';
    component.startTime = 202511191550;
    component.endTime = 202511191600;
    component.endpointTrace = 'GET:/api/test';
    component.status = 'error';
    component.traceID = 'trace123';
    component.minDuration = 100;
    component.maxDuration = 500;
    component.currentPage = 1;
    component.sortParameter = 'duration';
    component.orderParameter = 'asc';
    jest.spyOn(component, 'encodeBase64').mockReturnValue('encoded');
    component.fetchTraceData();
    tick();
    expect(mockApiService.getTracesData).toHaveBeenCalledWith(
      'service1',
      20251119155000,
      20251119160059,
      1,
      'duration',
      'asc',
      'instance1',
      1,
      expect.any(String),
      'trace123',
      100,
      500
    );
  }));

  // Logs Tab

  it('should load logs when log tab is selected', () => {
    const spy1 = jest.spyOn(component, 'fetchDataLogs');
    const spy2 = jest.spyOn(component, 'getLogsAggregatedData2');
    const spy3 = jest.spyOn(component, 'getLogsCountTimeSeries');
    component.loadData('log');
    expect(spy1).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();
    expect(spy3).toHaveBeenCalled();
  });

  it('should fetch traces with all parameters and populate table & paginatedData', fakeAsync(() => {
    const mockData = [
      { traceId: 'T1', endpointId: 'EP', isError: 0, latency: 100, startTime: 123, timeBucket: 20250101, instance: 'I1' }
    ];
    jest.spyOn(component, 'encodeBase64').mockReturnValue('encoded');
    jest.spyOn(component, 'selectItem').mockImplementation(() => { });
    component.traceDetailsSection = { nativeElement: { scrollIntoView: jest.fn() } } as any;
    mockApiService.getTracesData.mockReturnValue(of(mockData));
    component.entityId = 'S1';
    component.entityInstanceId = 'I1';
    component.startTime = 202501011200;
    component.endTime = 202501011259;
    component.currentPage = 1;
    component.sortParameter = 'duration';
    component.orderParameter = 'asc';
    component.endpoints = [
      { name: 'GET:/api/test', value: 'encoded' }
    ];

    component.fetchTraceData();
    tick();
    expect(component.selectItem).toHaveBeenCalledWith(mockData[0]);
  }));

  it('should open log tab with trace ID and trigger click, searchLogs, loadData', fakeAsync(() => {
    const mockClick = jest.fn();
    jest.spyOn(document, 'querySelector').mockReturnValue({ click: mockClick } as any);
    jest.spyOn(component, 'searchLogs').mockImplementation(() => { });
    jest.spyOn(component, 'loadData').mockImplementation(() => { });
    component.openLogTabTraceId('trace123');
    expect(mockClick).toHaveBeenCalled();
    tick(110);
    expect(component.traceIDLogs).toBe('trace123');
    expect(component.searchLogs).toHaveBeenCalled();
    expect(component.loadData).toHaveBeenCalledWith('log');
  }));

  it('should fetch log names and decode results', fakeAsync(() => {
    const mockLogs = [
      { traceId: 'L1', instance: 'I1', endpointId: 'E1', content: 'c1', tags: { level: 'INFO' } }
    ];
    mockApiService.getLogsData.mockReturnValue(of(mockLogs));
    mockDecoderService.decodeObject.mockResolvedValue(mockLogs);
    component.startTime = 2025010112;
    component.endTime = 2025010114;
    component.entityId = 'S1';
    component.entityInstanceId = 'I1';
    component.getLogNames();
    tick();
    expect(component.logNames).toEqual(mockLogs);
    expect(component.loadingLogs).toBe(false);
  }));

  it('should fetch aggregated logs count & compute total pages', fakeAsync(() => {
    mockApiService.getLogsAggregatedData.mockReturnValue(of({ total_hits: 200 }));
    component.rowsPerPageLog = 10;
    component.entityId = 'S1';
    component.startTime = 2025010112;
    component.endTime = 2025010114;
    component.getLogsAggregatedData();
    tick();
    expect(component.totalHitsLog).toBe(200);
    expect(component.totalPagesLog).toBe(20);
  }));

  it('should build time-series logs chart', fakeAsync(() => {
    const series = {
      time_series: [
        { total: 1, time_bucket: '202501010000', INFO: 1 },
        { total: 1, time_bucket: '202501010001', INFO: 1 }
      ]
    };
    mockApiService.getLogsCountTimeSeries.mockReturnValue(of(series));
    component.entityId = 'S1';
    component.startTime = 2025010100;
    component.endTime = 2025010200;
    component.getLogsCountTimeSeries();
    tick();
    expect(component.logsTimeSeriesChart).toBeTruthy();
    expect(component.logsTimeSeriesChart!.series!.length).toBe(1);
    expect(component.logsTimeSeriesChart!.chart!.type).toBe('column');

  }));

  it('should toggle dropdown logs', () => {
    component.dropdownOpenLogs = false;
    component.toggleDropdownLogs();
    expect(component.dropdownOpenLogs).toBe(true);
    component.toggleDropdownLogs();
    expect(component.dropdownOpenLogs).toBe(false);
  });

  it('should show criteria item when selected', () => {
    component.shownCriteriaLogs = { traceID: false };
    component.selectCriteriaLogs('traceID');
    expect(component.shownCriteriaLogs['traceID']).toBe(true);
  });

  it('should toggle sortLogs and fetch log names', () => {
    const spy = jest.spyOn(component, 'getLogNames').mockImplementation(() => { });
    component.sortLogs = false;
    component.toggleSortLogs();
    expect(component.sortLogs).toBe(true);
    expect(spy).toHaveBeenCalled();
  });

  it('should go to next log page', () => {
    component.currentPageLog = 1;
    component.totalPagesLog = 5;
    component.nextLogPage();
    expect(component.currentPageLog).toBe(2);
  });

  // Source

  it('should call onLanguageChange when a radio button is clicked', fakeAsync(() => {
    const spy = jest.spyOn(component, 'onLanguageChange');
    cdr.detectChanges();
    const inputs: NodeListOf<HTMLInputElement> =
      fixture.nativeElement.querySelectorAll('input[type="radio"]');
    const jvmRadio = inputs[1];
    jvmRadio.dispatchEvent(new Event('change'));
    tick();
    expect(spy).toHaveBeenCalled();
  }));

  // JVM
  it('should render JVM CPU chart with correct data', fakeAsync(() => {
    const spy = jest.spyOn(component, 'initialize_JVM_CPU_graph');
    component.getJvmCpu();
    tick();
    expect(mockApiService.getJvmCpu).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ jvm_cpu: 1.0, time_bucket: '202511191754' })
      ])
    );
    expect(Highcharts.Chart).toHaveBeenCalled();
  }));

  it('should render JVM Memory chart with correct series', fakeAsync(() => {
    const spy = jest.spyOn(component, 'initialize_JvmMemory_graph');
    component.getJvmMemory();
    tick();
    expect(mockApiService.getJvmMemory).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    const callArgs = (Highcharts.Chart as jest.Mock).mock.calls[0][0];
    expect(callArgs.series.length).toBeGreaterThan(0);
  }));

  it('should render JVM Memory Detail chart with correct keys', fakeAsync(() => {
    const spy = jest.spyOn(component, 'initialize_JvmMemoryDetail_graph');
    component.getJvmMemoryDetail();
    tick();
    expect(mockApiService.getJvmMemoryDetail).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    const chartArgs = (Highcharts.Chart as jest.Mock).mock.calls[0][0];
    expect(chartArgs.series.length).toBeGreaterThan(0);
  }));

  it('should render JVM GC Time chart correctly', fakeAsync(() => {
    const spy = jest.spyOn(component, 'initialize_JvmGCTime_graph');
    component.getJvmGCTime();
    tick();
    expect(mockApiService.getJvmGCTime).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  }));

  it('should render JVM GC Count chart correctly', fakeAsync(() => {
    const spy = jest.spyOn(component, 'initialize_JvmGCCountChart_graph');
    component.getJvmGCCount();
    tick();
    expect(mockApiService.getJvmGCCount).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  }));

  it('should render JVM Thread Count chart correctly', fakeAsync(() => {
    const spy = jest.spyOn(component, 'initialize_JvmThreadCount_graph');
    component.getJvmThreadCount();
    tick();
    expect(mockApiService.getJvmThreadCount).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  }));

  it('should render JVM Thread State Count chart correctly', fakeAsync(() => {
    const spy = jest.spyOn(component, 'initialize_JvmThreadStateCountChart_graph');
    component.getJvmThreadStateCount();
    tick();
    expect(mockApiService.getJvmThreadStateCount).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  }));

  it('should render JVM Class Count chart correctly', fakeAsync(() => {
    const spy = jest.spyOn(component, 'initialize_JvmClassCount_graph');
    component.getJvmClassCount();
    tick();
    expect(mockApiService.getJvmClassCount).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  }));

});
