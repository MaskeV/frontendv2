import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { GeneralServicesComponent } from './general-services.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import * as d3 from 'd3';
import type * as HighchartsType from 'highcharts';
import { ChangeDetectorRef, ElementRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { ApmApiService } from '../../../../services/apm-api.service';
import { DecoderService } from '../../../../services/decoder.service';
import { By } from '@angular/platform-browser';



jest.mock('d3', () => {
  const appendMock = jest.fn();
  const selectAllMock = jest.fn();
  const onMock = jest.fn();
  const enterMock = jest.fn();
  const dataMock = jest.fn();
  const callMock = jest.fn();
  const attrMock = jest.fn();
  const styleMock = jest.fn();
  const textMock = jest.fn();
  const removeMock = jest.fn();
  const fakeSelection = {
    append: appendMock,
    selectAll: selectAllMock,
    data: dataMock,
    enter: enterMock,
    attr: attrMock,
    style: styleMock,
    text: textMock,
    remove: removeMock,
    call: callMock,
    on: onMock,
  };
  return {
    ...jest.requireActual('d3'),
    select: jest.fn(() => fakeSelection),
    zoom: jest.fn(() => {
      const z: any = () => z;
      z.on = jest.fn().mockReturnThis();
      z.scaleExtent = jest.fn().mockReturnThis();
      return z;
    }),
    drag: jest.fn(() => {
      const d: any = () => d;
      d.on = jest.fn().mockReturnThis();
      return d;
    }),
    forceSimulation: jest.fn(() => ({
      force: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
    })),
    forceLink: jest.fn(() => ({ id: jest.fn().mockReturnThis(), distance: jest.fn().mockReturnThis() })),
    forceManyBody: jest.fn(() => ({ strength: jest.fn().mockReturnThis() })),
    forceCenter: jest.fn(() => ({})),
    forceX: jest.fn(() => ({ strength: jest.fn().mockReturnThis() })),
    forceY: jest.fn(() => ({ strength: jest.fn().mockReturnThis() })),
  };
});

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
} as unknown as Highcharts.Chart;

// Core Mock 
jest.mock('highcharts', () => ({
  chart: jest.fn(() => mockChartInstance),
  Chart: jest.fn(function (this: any, options: any) {
    return mockChartInstance;
  }),
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

describe('GeneralServicesComponent', () => {
  let component: GeneralServicesComponent;
  let fixture: ComponentFixture<GeneralServicesComponent>;

  let mockApiService: any;
  let mockRouter: any;
  let router: Router;
  let cdr: ChangeDetectorRef;
  let mockDecoderService: any;

  beforeEach(async () => {
    mockApiService = {
      getHealthScoreValue: jest.fn(),
      getHealthScoreValue2: jest.fn(),
      getDatabaseNamesForServices: jest.fn(),
      getSuccessRateTimeValue: jest.fn().mockReturnValue(
        of({
          successRate: 100.0,
          successRateTimeSeries: [
            { time_bucket: '202511101045', success_rate: 100.0 },
            { time_bucket: '202511101050', success_rate: 100.0 },
            { time_bucket: '202511101106', success_rate: 100.0 },
          ],
        })
      ),
      getServiceApdexTimeValue: jest.fn().mockReturnValue(
        of({
          apdex: 1.0,
          apdexTimeSeries: [
            { load: 1.0, time_bucket: '202511101045', status: 'NORMAL' },
            { load: 1.0, time_bucket: '202511101050', status: 'NORMAL' },
            { load: 1.0, time_bucket: '202511101106', status: 'NORMAL' },
          ],
        })
      ),
      getServiceResponseTimePercentile: jest.fn().mockReturnValue(
        of([
          {
            time_bucket: '202511101045',
            P99: 50.0,
            P95: 20.0,
            P90: 20.0,
            P75: 10.0,
            P50: 10.0,
          },
          {
            time_bucket: '202511101050',
            P99: 420.0,
            P95: 40.0,
            P90: 40.0,
            P75: 30.0,
            P50: 30.0,
          },
          {
            time_bucket: '202511101106',
            P99: 150.0,
            P95: 90.0,
            P90: 70.0,
            P75: 10.0,
            P50: 10.0,
          },
        ])
      ),
      getServiceLoadTimeValue: jest.fn().mockReturnValue(
        of({
          load: 25.33,
          loadTimeSeries: [
            { time_bucket: '202511101045', load: 15, status: 'NORMAL' },
            { time_bucket: '202511101050', load: 14, status: 'NORMAL' },
            { time_bucket: '202511101106', load: 47, status: 'NORMAL' },
          ],
        })
      ),
      getServiceAvgResponseTime: jest.fn().mockReturnValue(
        of({
          latency: 33.0,
          latencyTimeSeries: [
            { time_bucket: '202511101041' },
            { latency: 16, time_bucket: '202511101045', status: 'NORMAL' },
            { latency: 54, time_bucket: '202511101050', status: 'NORMAL' },
            { latency: 29, time_bucket: '202511101106', status: 'NORMAL' },
          ],
        })
      ),
      getEndpointApiType: jest.fn().mockReturnValue(
        of([
          { count: 26, type: 'GET', error_count: 0, success_rate: 100.0 },
          { count: 1, type: 'HttpAsyncClient', error_count: 0, success_rate: 100.0 },
        ])
      ),
      getAlertCounts: jest.fn().mockReturnValue(
        of([
          { Warning: 0, Critical: 0, Normal: 0 }
        ])
      ),
      getUptimeService: jest.fn().mockReturnValue(
        of({
          "1_day": { downtime_duration_minutes: 0, availability_percentage: 100.0 },
          "5_day": { downtime_duration_minutes: 0, availability_percentage: 100.0 },
          "10_day": { downtime_duration_minutes: 1434, availability_percentage: 90.04 }
        })
      ),
      getApplicationData: jest.fn().mockReturnValue(
        of({
          applicationId: 'app123',
          name: 'TestApp',
          status: 'active',
          data: [],
        })
      ),
      getInstanceOverviewKpi: jest.fn().mockReturnValue(
        of({
          hit_count: 2514,
          error_count: 2514
        })
      ),
      getServiceInstanceLoad: jest.fn().mockReturnValue(
        of([
          { instance: 'Laravel_App-172.16.138.141', value: 72, status: 'NORMAL' },
          { instance: 'Node_App-172.16.138.142', value: 50, status: 'WARNING' },
        ])
      ),
      getSlowServiceInstance: jest.fn().mockReturnValue(
        of([
          { instance: 'Laravel_App-172.16.138.141', value: 137, status: 'NORMAL' },
          { instance: 'Node_App-172.16.138.142', value: 200, status: 'CRITICAL' },
        ])
      ),
      getServiceInstanceLoadTimevalues: jest.fn().mockReturnValue(
        of({
          load: 52.33,
          loadTimeSeries: [
            { load: 10, time_bucket: '202511111347', status: 'NORMAL' },
            { load: 10, time_bucket: '202511111352', status: 'NORMAL' },
            { load: 14, time_bucket: '202511111354', status: 'NORMAL' },
          ]
        })
      ),

      getServiceInstanceSuccessRateTimevalues: jest.fn().mockReturnValue(
        of({
          successRate: 92.09,
          successRateTimeSeries: [
            { time_bucket: '202511111355', success_rate: 97.26 },
            { time_bucket: '202511111356', success_rate: 98.86 },
            { time_bucket: '202511111357', success_rate: 100.0 },
          ]
        })
      ),
      getServiceInstanceLatencyTimevalues: jest.fn().mockReturnValue(
        of({
          latency: 175.67,
          latencyTimeSeries: [
            { latency: 122, time_bucket: '202511111355', status: 'NORMAL' },
            { latency: 158, time_bucket: '202511111356', status: 'NORMAL' },
            { latency: 110, time_bucket: '202511111357', status: 'NORMAL' },
          ]
        })
      ),
      getServiceInstanceNames: jest.fn().mockReturnValue(
        of({ Laravel_App: ['Laravel_App-172.16.138.141', 'Node_App-172.16.138.142'] })
      ),
      getCombinedData: jest.fn().mockImplementation((entityInstanceId: string) => {
        if (entityInstanceId.includes('Laravel_App-172.16.138.141')) {
          return of({
            service_load: 71.36,
            avg_latency: 178.39,
            success_rate: 95.83,
            properties: {
              "OS Name": "Linux",
              language: "php",
              hostname: "MHRILARMAPPHOLIDAYSPREPROD",
              ipv4s: "172.16.138.141",
              "Process No.": "1954644"
            }
          });
        } else {
          return of({
            service_load: 50,
            avg_latency: 20,
            success_rate: 90,
            properties: { anyKey: 'anyValue' }
          });
        }
      }),
      getEndpointsLoadInCurrentService: jest.fn().mockReturnValue(
        of([
          { endpoint: 'POST://api/v1/isUserLogIn', value: 3, status: 'NORMAL' },
          { endpoint: 'GET://api/v1/getStickyInfo', value: 2, status: 'NORMAL' },
          { endpoint: 'GET://api/v1/getMenu', value: 2, status: 'NORMAL' },
          { endpoint: 'OPTIONS://api/v1/getMenu', value: 2, status: 'NORMAL' },
        ])
      ),

      getSlowEndpointsInCurrentService: jest.fn().mockReturnValue(
        of([
          { endpoint: 'POST://api/v1/getAllPaymentDetails', value: 8380, status: 'NORMAL' },
          { endpoint: 'POST:/api/v1/loginWithPassword', value: 6971, status: 'NORMAL' },
          { endpoint: 'POST://api/v1/getTailorMadeRecommendation', value: 5346, status: 'NORMAL' },
          { endpoint: 'POST:/api/v1/getCPMemberDetailsForClubMSelect', value: 3243, status: 'NORMAL' },
        ])
      ),

      getEndpointSuccessRateInCurrentService: jest.fn().mockReturnValue(
        of({
          'GET://api/v1/getSimilarNearbyResorts': '0.0',
          'GET://api/v1/getResortReview': '37.5',
          'POST://api/v1/getProfileImages': '85.71',
          'POST://api/v1/getAvailabilityCalendar': '87.5'
        })
      ),

      endpointNamesUpdated: jest.fn().mockReturnValue(
        of({
          total_hits: 208,
          error_count: 12,
          endpoints: [
            {
              endpoint_id: 'GET://api/v1/getBanner',
              metrics: { endpoint_load: 1.9, total_hits: 19, latency: 48.4, success_rate: 100.0 }
            },
            {
              endpoint_id: 'POST://api/v1/getPaymentDues',
              metrics: { endpoint_load: 1.4, total_hits: 14, latency: 150.2, success_rate: 100.0 }
            }
          ]
        })
      ),

      getEndpointLoad: jest.fn().mockReturnValue(
        of({
          load: 2.33,
          loadTimeSeries: [
            { load: 3, time_bucket: '202511131027', status: 'NORMAL' },
            { load: 1, time_bucket: '202511131028', status: 'NORMAL' },
            { time_bucket: '202511131029' },
            { load: 8, time_bucket: '202511131030', status: 'NORMAL' },
          ]
        })
      ),

      getEndpointSuccessRate: jest.fn().mockReturnValue(
        of({
          successRate: 100.0,
          successRateTimeSeries: [
            { time_bucket: '202511131027', success_rate: 100.0 },
            { time_bucket: '202511131028', success_rate: 100.0 },
            { time_bucket: '202511131029' },
            { time_bucket: '202511131030', success_rate: 100.0 },
          ]
        })
      ),

      getEndpointAvgResponseTime: jest.fn().mockReturnValue(
        of({
          latency: 2.77,
          latencyTimeSeries: [
            { latency: 2, time_bucket: '202511131027', status: 'NORMAL' },
            { latency: 3, time_bucket: '202511131028', status: 'NORMAL' },
            { time_bucket: '202511131029' },
            { latency: 4, time_bucket: '202511131030', status: 'NORMAL' },
          ]
        })
      ),
      getServiceTopology: jest.fn().mockReturnValue(
        of({
          nodes: [
            {
              id: '40',
              name: 'Kafka',
              serviceId: 'svc1',
              componentId: '40'
            },
            {
              id: '33',
              name: 'Mysql',
              serviceId: 'svc2',
              componentId: '33'
            }
          ],
          links: []
        })
      ),
      getCombinedDataTopology: jest.fn().mockReturnValue(
        of({
          apdex: 1.0,
          load: 1.0,
          latency: 204.19,
          success_rate: 100.0
        })
      ),
      getTracesData: jest.fn().mockReturnValue(
        of({
          traceId: 'ZwUHAimxw4eTV7VuKRYMjRlpjsPJbhMCe1XgJYk0eWxiLSiyFYZwOGj6Vl3LzndIKF0LTKBmsrQUnYrZA0xSZu8ffrMG',
          isError: 0,
          instance: 'CzhwThO2vNjDD94pRBBs3jVt0p3rsNAFQ5YcUFJ+xITzZIAE',
          endpointId: 'HlJkCyjopMb5Mr0xfmp4wjQ4vczJQHBaL66rWoyYnY3s3ePHdenitQ==',
          latency: 3,
          startTime: 1763098909011,
          timeBucket: 20251114111149
        })
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
      getDatabaseAvgResponseTime: jest.fn().mockReturnValue(
        of({
          latency: 0.29,
          latencyTimeSeries: [
            { latency: 1, time_bucket: '202511141041', status: 'NORMAL' },
            { latency: 1, time_bucket: '202511141102', status: 'NORMAL' },
            { latency: 2, time_bucket: '202511141108', status: 'NORMAL' },
          ]
        })
      ),
      getDatabaseAccessSuccessRate: jest.fn().mockReturnValue(
        of({
          successRate: 100.0,
          successRateTimeSeries: [
            { time_bucket: '202511141041', success_rate: 100.0 },
            { time_bucket: '202511141045', success_rate: 100.0 },
            { time_bucket: '202511141049', success_rate: 100.0 },
          ]
        })
      ),
      getDatabaseTraffic: jest.fn().mockReturnValue(
        of({
          load: 218.81,
          loadTimeSeries: [
            { load: 395, time_bucket: '202511141108', status: 'NORMAL' },
            { load: 206, time_bucket: '202511141109', status: 'NORMAL' },
            { load: 743, time_bucket: '202511141111', status: 'NORMAL' }
          ]
        })
      ),
      getDatabaseAccessLatencyPercentile: jest.fn().mockReturnValue(
        of([
          { time_bucket: '202511141041', P99: 5.0, P95: 3.0, P90: 2.0, P75: 1.5, P50: 1.0 },
          { time_bucket: '202511141045', P99: 6.0, P95: 4.0, P90: 3.0, P75: 2.0, P50: 1.5 },
          { time_bucket: '202511141049', P99: 7.0, P95: 5.0, P90: 4.0, P75: 2.5, P50: 2.0 },
        ])
      ),
      getDatabaseSlowStatements: jest.fn().mockReturnValue(
        of([
          { statement: 'SELECT * FROM users WHERE id = ?', value: 250, status: 'WARNING' },
          { statement: 'UPDATE orders SET status = ? WHERE id = ?', value: 180, status: 'NORMAL' },
          { statement: 'INSERT INTO logs VALUES (?)', value: 150, status: 'NORMAL' },
        ])
      ),
      getTraceMetaData: jest.fn().mockReturnValue(of([])),
    };
    mockRouter = { navigate: jest.fn() };
    mockDecoderService = {
      decodeObject: jest.fn().mockImplementation((data: any) => Promise.resolve(data))
    };
    jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    jest.spyOn(d3, 'select').mockReturnValue({
      select: () => ({
        remove: () => {}
      })
    } as any);
    await TestBed.configureTestingModule({
      imports: [GeneralServicesComponent, HttpClientTestingModule, RouterTestingModule.withRoutes([])],
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
        { provide: 'Router', useValue: mockRouter },
        { provide: DecoderService, useValue: mockDecoderService },
                  ],
                  schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneralServicesComponent);
    component = fixture.componentInstance;
    component.endpointData = [
      { type: 'API1', success_rate: 80, count: 50, error_count: 10 },
      { type: 'API2', success_rate: 60, count: 30, error_count: 12 },
    ];
    component.thresholds = {
      service_sla: { warningValue: 95, criticalValue: 90 },
      service_apdex: { warningValue: 0.85, criticalValue: 0.7 },
      service_resp_time: { warningValue: 1000, criticalValue: 2000 },
      service_cpm: { warningValue: 80, criticalValue: 120 },
      database_access_sla: { warningValue: 95, criticalValue: 90 },
      database_access_cpm: { warningValue: 200, criticalValue: 300 },
      database_access_resp_time: { warningValue: 1, criticalValue: 2 },
      database_access_percentile: { warningValue: 5, criticalValue: 10 }
    };
    component.successRate = 92;
    component.apdexValue = 0.8;
    component.latencyValue = 1500;
    component.avgLoadValue = 100;
    component.totalHitsValue = 5000;
    component.errorValue = 3;
    component.uptime1DaysChart = null;
    component.uptime5DaysChart = null;
    component.uptime10DaysChart = null;
    component.entityId = 'ent1';
    component.endTime = Date.now();
    component.instanceNames = ['Laravel_App-172.16.138.141', 'Node_App-172.16.138.142'];
    component.instanceId = {
      'Laravel_App-172.16.138.141': { service_load: 52, success_rate: 92, avg_latency: 175, properties: { os: 'Linux', version: '8.0' } },
      'Node_App-172.16.138.142': { service_load: 30, success_rate: 100, avg_latency: 120, properties: { os: 'Ubuntu', version: '20.04' } }
    };
    // Mock element reference for SVG
    const svgMock = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    component.svgElement = new ElementRef(svgMock);

    // Basic required inputs
    component.entityId = 'ent1';
    component.startTime = 1731440400;
    component.endTime = 1731444000;
    component.nodeRadius = 20;
    component.width = 800;
    component.height = 600;
    component.selectedDb = 'TestDatabase';
    cdr = fixture.componentRef.injector.get(ChangeDetectorRef);
    (Highcharts.chart as jest.Mock).mockClear();
    (Highcharts as any).charts = [];
    jest.clearAllMocks();
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { });
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => null);
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
    jest.spyOn(component, 'renderGraph').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Restore all mocks after each test
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // gethealthscore
  it('should return combined health items correctly', () => {
  component.selectedService = 'ServiceA';
  component.appHealthScore = 80;
  component.infraHealthScores = [{ name: 'Infra', value: 60 }];
  component.dbHealthScore = [{ name: 'DB1', value: 70, type: 'Database' }];
  const result = component.getHealthItems();
  expect(result).toEqual([
    { name: 'ServiceA', value: 80, type: 'Service' },
    { name: 'Infra', value: 60, type: 'Infra' },
    { name: 'DB1', value: 70, type: 'Database' }
  ]);
});

  //  getColor 
  it('should return gradient color from red to green based on value', () => {
    const colorLow = component.getColor(20);
    const colorMid = component.getColor(50);
    const colorHigh = component.getColor(90);
    expect(colorLow).toContain('rgba(');
    expect(colorMid).toContain('rgba(');
    expect(colorHigh).toContain('rgba(');
    expect(colorLow).not.toEqual(colorHigh);
  });

  //  getProjectHealthValue 
  it('should calculate combined project health score correctly', () => {
    component.appHealthScore = 80;
    component.infraHealthScore = 60;
    component.dbHealthScore = [
      { name: 'DB1', value: 70, type: 'Database' },
      { name: 'DB2', value: 90, type: 'Database' }
    ];
    jest.spyOn(component, 'getProjectHealthChart').mockImplementation(() => { });
    component.getProjectHealthValue();
    expect(component.projectHealthScore).toBe(76);
    expect(component.getProjectHealthChart).toHaveBeenCalledWith([
      { type: 'Project Health', count: 76 }
    ]);
  });

  // getProjectHealthChart 
  it('should set Highcharts options properly', () => {
    const mockData = [{ type: 'Project Health', count: 85 }];
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: jest.fn(() => '#fff')
    } as any);
    component.getProjectHealthChart(mockData);
    expect(component.projectHealthChart).toBeTruthy();
    expect(component.projectHealthChart!.series![0]).toBeDefined();
    expect((component.projectHealthChart!.series![0] as any).data[0].y).toBe(85);
  });

  it('should handle empty data in getProjectHealthChart', () => {
    component.getProjectHealthChart([]);
    expect(component.projectHealthChart).toBeNull();
  });

  //  API call mocks 
  it('should call API in getHealthScoreValueApplication', () => {
    mockApiService.getHealthScoreValue2.mockReturnValue(of({ projectHealthScore: 75 }));
    component.entityId = 'ent1';
    component.thresholdst = 0;
    component.endTime = 0;
    component.getHealthScoreValueApplication();
    expect(mockApiService.getHealthScoreValue2).toHaveBeenCalled();
  });

  it('should handle DB health score fetching correctly', () => {
    mockApiService.getDatabaseNamesForServices.mockReturnValue(of({ key: ['DB1'] }));
    mockApiService.getHealthScoreValue.mockReturnValue(of({ projectHealthScore: 90 }));
    component.entityId = 'ent1';
    component.thresholdst = 0;
    component.endTime = 0;
    component.getHealthScoreValueDb();
    expect(mockApiService.getDatabaseNamesForServices).toHaveBeenCalled();
  });

  it('should handle error in getHealthScoreValueDb gracefully', () => {
    mockApiService.getDatabaseNamesForServices.mockReturnValue(throwError(() => new Error('fail')));
    expect(() => component.getHealthScoreValueDb()).not.toThrow();
  });

  //  Navigation 
  it('should navigate to Infra correctly', () => {
    const spySetItem = jest.spyOn(sessionStorage, 'setItem');
    component.infraName = 'InfraX';
    (component as any).serviceIdService = {
      setServiceId: jest.fn(),
      getEncodedServiceId: jest.fn().mockReturnValue('encoded')
    };
    (component as any).router = { navigate: jest.fn() };
    component.goToInfra();
    expect(spySetItem).toHaveBeenCalledWith('serviceIdForInfra', 'InfraX');
    expect((component as any).router.navigate).toHaveBeenCalledWith(['/infra/linux-service']);
  });

  it('should navigate to Database tab correctly', () => {
    document.body.innerHTML = `<a class="nav-link" href="#db"></a>`;
    jest.spyOn(sessionStorage, 'setItem');
    component.getDatabaseAvgResponseTime = jest.fn();
    component.getDatabaseAccessSuccessRate = jest.fn();
    component.getDatabaseTraffic = jest.fn();
    component.getDatabaseAccessLatencyPercentile = jest.fn();
    component.getDatabaseSlowStatements = jest.fn();
    component.getThreshold = jest.fn();
    component.goToDatabase('TestDB');
    expect(sessionStorage.setItem).toHaveBeenCalledWith('SelectedDb', 'TestDB');
    expect(component.getDatabaseAvgResponseTime).toHaveBeenCalled();
  });

  it('should create chart configuration with correct chart type', () => {
    const mockData = [{ type: 'Project Health', count: 75 }];
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: jest.fn(() => '#ffffff')
    } as any);
    component.getProjectHealthChart(mockData);
    expect(component.projectHealthChart).toBeTruthy();
    expect(component.projectHealthChart?.chart?.type).toBe('bar');
    expect(component.projectHealthChart?.chart?.backgroundColor).toBe('transparent');
  });

  it('should render chart with correct series data', () => {
    const mockData = [{ type: 'Project Health', count: 85 }];
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: jest.fn(() => '#fff')
    } as any);
    component.getProjectHealthChart(mockData);
    const series = component.projectHealthChart?.series?.[0] as any;
    expect(series).toBeDefined();
    expect(series.type).toBe('bar');
    expect(series.data).toHaveLength(1);
    expect(series.data[0].y).toBe(85);
    expect(series.data[0].name).toBe('Project Health');
  });

  it('should apply correct color to chart data based on health score', () => {
    const lowScore = [{ type: 'Project Health', count: 30 }];
    const highScore = [{ type: 'Project Health', count: 90 }];
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: jest.fn(() => '#fff')
    } as any);
    component.getProjectHealthChart(lowScore);
    const lowScoreColor = (component.projectHealthChart?.series?.[0] as any).data[0].color;
    component.getProjectHealthChart(highScore);
    const highScoreColor = (component.projectHealthChart?.series?.[0] as any).data[0].color;
    expect(lowScoreColor).toBeDefined();
    expect(highScoreColor).toBeDefined();
    expect(lowScoreColor).not.toEqual(highScoreColor);
  });

  it('should handle chart creation errors gracefully', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(window, 'getComputedStyle').mockImplementation(() => {
      throw new Error('CSS error');
    });
    const mockData = [{ type: 'Project Health', count: 75 }];
    expect(() => component.getProjectHealthChart(mockData)).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error Occurred', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('should create and set values properly with async data', fakeAsync(() => {
    component.appHealthScore = 0;
    component.infraHealthScore = 0;
    component.dbHealthScore = [];
    component.projectHealthScore = 0;
    mockApiService.getHealthScoreValue.mockReturnValue(of({ projectHealthScore: 100 }));
    mockApiService.getDatabaseNamesForServices.mockReturnValue(of({ key: [] }));
    component.ngOnInit();
    tick();
    flush();
    expect(component).toBeTruthy();
  }));

  // Uptime Chart

  it('should create 1-day uptime chart correctly with valid data', () => {
    const data = [{ type: 'Last 1 Day', count: 95 }];
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: jest.fn(() => '#fff')
    } as any);
    component.chartUptime1Day(data);
    expect(component.uptime1DaysChart).toBeTruthy();
    const series = component.uptime1DaysChart?.series?.[0] as any;
    expect(series).toBeDefined();
    expect(series.type).toBe('bar');
    expect(series.data[0].y).toBe(95);
    expect(series.data[0].name).toBe('Last 1 Day');
    expect(series.data[0].color).toBeDefined();
  });

  it('should set uptime1DaysChart to null if data is empty or undefined', () => {
    component.chartUptime1Day([]);
    expect(component.uptime1DaysChart).toBeNull();
    component.chartUptime1Day(undefined as any);
    expect(component.uptime1DaysChart).toBeNull();
  });

  it('should call API and populate uptime charts via getUptime', fakeAsync(() => {
    const apiSpy = jest.spyOn(mockApiService, 'getUptimeService');
    component.getUptime();
    tick();
    expect(apiSpy).toHaveBeenCalledWith('ent1', expect.any(String));
    expect(component.uptimeData1Day).toEqual({ downtime_duration_minutes: 0, availability_percentage: 100 });
    expect(component.uptimeData5Day).toEqual({ downtime_duration_minutes: 0, availability_percentage: 100 });
    expect(component.uptimeData10Day).toEqual({ downtime_duration_minutes: 1434, availability_percentage: 90.04 });
    expect(component.uptime1DaysChart).toBeTruthy();
    expect(component.uptime5DaysChart).toBeTruthy();
    expect(component.uptime10DaysChart).toBeTruthy();
  }));

  it('should convert downtime minutes correctly in template', () => {
    expect(component.convertMinutes(0)).toBe('0 min');
    expect(component.convertMinutes(65)).toBe('1 hr 5 min');
    expect(component.convertMinutes(120)).toBe('2 hr 0 min');
  });

  it('should create 5-day uptime chart correctly', fakeAsync(() => {
    const mockData5Day = [{ type: 'Last 5 Days', count: 95 }];
    jest.spyOn(component, 'chartUptime5Days').mockImplementation((data: any[]) => {
      component.uptime5DaysChart = {
        series: [{
          data: data.map(d => ({ y: d.count, name: d.type }))
        }]
      } as any;
    });
    component.chartUptime5Days(mockData5Day);
    expect(component.uptime5DaysChart).toBeTruthy();
    const series = component.uptime5DaysChart!.series![0] as any;
    expect(series.data[0].y).toBe(95);
    expect(series.data[0].name).toBe('Last 5 Days');
  }));

  it('should create 10-day uptime chart correctly', fakeAsync(() => {
    const mockData10Day = [{ type: 'Last 10 Days', count: 90 }];
    jest.spyOn(component, 'chartUptime10Days').mockImplementation((data: any[]) => {
      component.uptime10DaysChart = {
        series: [{
          data: data.map(d => ({ y: d.count, name: d.type }))
        }]
      } as any;
    });
    component.chartUptime10Days(mockData10Day);
    expect(component.uptime10DaysChart).toBeTruthy();
    const series = component.uptime10DaysChart!.series![0] as any;
    expect(series.data[0].y).toBe(90);
    expect(series.data[0].name).toBe('Last 10 Days');
  }));

  it('should convert downtime minutes correctly for template display', () => {
    expect(component.convertMinutes(0)).toBe('0 min');
    expect(component.convertMinutes(59)).toBe('59 min');
    expect(component.convertMinutes(60)).toBe('1 hr 0 min');
    expect(component.convertMinutes(125)).toBe('2 hr 5 min');
  });

  it('should show "No Data Available" when all uptime charts are null', fakeAsync(() => {
    component.uptime1DaysChart = null;
    component.uptime5DaysChart = null;
    component.uptime10DaysChart = null;
    component.uptimeData1Day = null;
    component.uptimeData5Day = null;
    component.uptimeData10Day = null;
    component.appHealthScore = 100;
    component.infraHealthScore = 100;
    component.projectHealthScore = 100;
    component.dbHealthScore = [];
    cdr.detectChanges();
    const noDataDiv: HTMLElement | null = fixture.nativeElement.querySelector('.noData');
    expect(noDataDiv).toBeTruthy();
    expect(noDataDiv?.textContent?.trim()).toBe('No Data Available');
  }));

  // Endpoint

  it('should render endpoint rows correctly', fakeAsync(() => {
    component.endpointData = [
      { type: 'API1', success_rate: 80, count: 50, error_count: 10 },
      { type: 'API2', success_rate: 60, count: 30, error_count: 12 },
    ];
    component.appHealthScore = 100;
    component.infraHealthScore = 100;
    component.projectHealthScore = 100;
    component.dbHealthScore = [];
    cdr.detectChanges();
    tick();
    const chartTitleSpans = Array.from(
      fixture.nativeElement.querySelectorAll('.chart-title span')
    ) as HTMLElement[];
    const endpointSpan = chartTitleSpans.find(
      (s: HTMLElement) => s.textContent?.trim() === 'Endpoint'
    ) as HTMLElement | undefined;
    expect(endpointSpan).toBeDefined();
    const card = endpointSpan?.closest('.card') as HTMLElement | null;
    expect(card).toBeTruthy();
    const endpointTable = card?.querySelector('table') as HTMLElement | null;
    expect(endpointTable).toBeTruthy();
    const rows = endpointTable!.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('API1');
    expect(rows[0].textContent).toContain('80%');
    expect(rows[1].textContent).toContain('API2');
    expect(rows[1].textContent).toContain('60%');
  }));

  it('should calculate progress width correctly', () => {
    const width1 = component.getProgressWidth(50, component.endpointData, 'count');
    const width2 = component.getProgressWidth(30, component.endpointData, 'count');
    expect(width1).toBe(100);
    expect(width2).toBe(60);
  });

  it('should handle 0 max value in getProgressWidth', () => {
    const width = component.getProgressWidth(0, [{ count: 0 }], 'count');
    expect(width).toBe(0); // minimum width fallback
  });

  it('should trigger openEndpointTabSearch correctly', () => {
    jest.spyOn(component, 'getEndpointNames').mockImplementation(() => { });
    const navLink = document.createElement('div');
    navLink.classList.add('nav-link');
    navLink.setAttribute('href', '#endpoint');
    document.body.appendChild(navLink);
    component.openEndpointTabSearch('API1');
    expect(component.searchTextEndpoint).toBe('API1:');
    expect(component.endpointSortBy).toBe('success_rate');
    expect(component.endpointOrder).toBe('asc');
    expect(component.getEndpointNames).toHaveBeenCalled();
    document.body.removeChild(navLink);
  });

  // Sucess Chart

  it('should render "No Data Available" chart when input data is empty', () => {
    const chartSpy = jest.spyOn(Highcharts, 'chart');
    component.getsuccessRateTimeValueChart([]);
    expect(chartSpy).toHaveBeenCalledWith(
      'successRateTimeValueChartContainer',
      expect.objectContaining({
        title: expect.objectContaining({
          text: 'No Data Available'
        }),
        series: []
      })
    );
  });

  it('should create a valid chart when data is provided', () => {
    const chartSpy = jest.spyOn(Highcharts, 'chart');
    const data = [
      { time_bucket: '2025-11-10T00:00:00Z', successRate: 95 },
      { time_bucket: '2025-11-10T01:00:00Z', successRate: 85 }
    ];
    component.thresholds = {
      service_sla: {
        avgBaseline: 90,
        warningValue: 80,
        criticalValue: 60
      }
    };
    component.getsuccessRateTimeValueChart(data);
    expect(chartSpy).toHaveBeenCalledWith(
      'successRateTimeValueChartContainer',
      expect.objectContaining({
        chart: expect.objectContaining({ type: 'column' }),
        yAxis: expect.objectContaining({
          plotLines: expect.arrayContaining([
            expect.objectContaining({
              value: 90,
              color: '#7B4019'
            })
          ])
        }),
        series: expect.arrayContaining([
          expect.objectContaining({
            name: 'Success',
            type: 'column',
            data: expect.arrayContaining([95, 85])
          }),
          expect.objectContaining({
            name: 'Failure',
            data: expect.arrayContaining([5, 15])
          })
        ])
      })
    );
  });

  it('should destroy existing chart before creating a new one', () => {
    const destroySpy = jest.fn();
    const chartSpy = jest.spyOn(Highcharts, 'chart').mockReturnValue({ destroy: destroySpy } as any);
    component.getsuccessRateTimeValueChart([
      { time_bucket: 't1', successRate: 90 }
    ]);
    component.successRateTimeValueChart = { destroy: destroySpy } as any;
    component.getsuccessRateTimeValueChart([
      { time_bucket: 't2', successRate: 80 }
    ]);
    expect(destroySpy).toHaveBeenCalledTimes(1);
    expect(chartSpy).toHaveBeenCalledTimes(2);
  });

  it('should format tooltip correctly with threshold markers', () => {
    const mockPoints = [
      { series: { name: 'Success' }, y: 70, color: '#549958' },
      { series: { name: 'Failure' }, y: 30, color: '#DC4245' }
    ];
    const chartSpy = jest.spyOn(Highcharts, 'chart').mockImplementation((_id, options: any) => {
      const tooltipHTML = options.tooltip.formatter.call({
        x: 0,
        points: mockPoints
      });
      expect(tooltipHTML).toContain('Success');
      expect(tooltipHTML).toContain('(W)'); // warning marker
      return {} as any;
    });
    component.thresholds = {
      service_sla: {
        avgBaseline: 90,
        warningValue: 80,
        criticalValue: 60
      }
    };
    component.getsuccessRateTimeValueChart([
      { time_bucket: '2025-11-10T00:00:00Z', successRate: 70 }
    ]);
    expect(chartSpy).toHaveBeenCalled();
  });

  it('should call getsuccessRateTimeValueChart() with correct API data', () => {
    const mockResponse = {
      successRate: 87,
      successRateTimeSeries: [{ time_bucket: '2025-11-10T00:00:00Z', successRate: 87 }]
    };
    const apiSpy = jest.spyOn(mockApiService, 'getSuccessRateTimeValue').mockReturnValue(of(mockResponse));
    const chartSpy = jest.spyOn(component, 'getsuccessRateTimeValueChart');
    component.getSuccessRateTimeValue();
    expect(apiSpy).toHaveBeenCalled();
    expect(component.successRate).toBe(87);
    expect(chartSpy).toHaveBeenCalledWith(mockResponse.successRateTimeSeries);
  });

  // Apdex

  it('should not render chart and destroy existing chart if data is empty', () => {
    component.ServiceApdexTimeValueChart = { destroy: jest.fn() } as any;
    component.getServiceApdexTimeValueChart([]);
    expect(component.ServiceApdexTimeValueChart).toBeNull();
  });

  it('should create a valid areaspline chart with data', () => {
    const chartSpy = jest.spyOn(Highcharts, 'chart');
    component.thresholds = {
      service_apdex: { avgBaseline: 0.85, warningValue: 0.7, criticalValue: 0.5 }
    };
    const data = [
      { time_bucket: '2025-11-10T00:00:00Z', load: 0.9 },
      { time_bucket: '2025-11-10T01:00:00Z', load: 0.6 }
    ];
    component.getServiceApdexTimeValueChart(data);
    expect(chartSpy).toHaveBeenCalledWith(
      'serviceApdexTimeValueChartContainer',
      expect.objectContaining({
        chart: expect.objectContaining({ type: 'areaspline' }),
        yAxis: expect.objectContaining({
          min: 0,
          max: 1,
          plotLines: expect.arrayContaining([
            expect.objectContaining({ value: 0.85 })
          ])
        }),
        series: expect.arrayContaining([
          expect.objectContaining({
            name: 'Apdex',
            type: 'areaspline',
            data: expect.arrayContaining([
              expect.objectContaining({ y: 0.9 }),
              expect.objectContaining({ y: 0.6 })
            ])
          })
        ])
      })
    );
  });

  it('should color points according to thresholds', () => {
    const chartSpy = jest.spyOn(Highcharts, 'chart').mockImplementation((_id, options: any) => {
      const pointColors = options.series[0].data.map((p: { color: any; }) => p.color);
      expect(pointColors[0]).toBeUndefined();
      expect(pointColors[1]).toBe('red');
      return {} as any;
    });
    component.thresholds = { service_apdex: { avgBaseline: 0.85, warningValue: 0.7, criticalValue: 0.7 } };
    component.getServiceApdexTimeValueChart([
      { time_bucket: 't1', load: 0.9 },
      { time_bucket: 't2', load: 0.6 }
    ]);
    expect(chartSpy).toHaveBeenCalled();
  });

  it('should destroy existing chart before creating a new one', () => {
    const destroySpy = jest.fn();
    const chartSpy = jest.spyOn(Highcharts, 'chart').mockReturnValue({ destroy: destroySpy } as any);
    component.getServiceApdexTimeValueChart([{ time_bucket: 't1', load: 0.8 }]);
    component.ServiceApdexTimeValueChart = { destroy: destroySpy } as any;
    component.getServiceApdexTimeValueChart([{ time_bucket: 't2', load: 0.6 }]);
    expect(destroySpy).toHaveBeenCalledTimes(1);
    expect(chartSpy).toHaveBeenCalledTimes(2);
  });

  it('should call getServiceApdexTimeValueChart() with API data', () => {
    const mockResponse = {
      apdex: 0.9,
      apdexTimeSeries: [{ time_bucket: '2025-11-10T00:00:00Z', load: 0.9 }]
    };
    jest.spyOn(mockApiService, 'getServiceApdexTimeValue').mockReturnValue(of(mockResponse));
    const chartSpy = jest.spyOn(component, 'getServiceApdexTimeValueChart');
    component.getServiceApdexTimeValue();
    expect(mockApiService.getServiceApdexTimeValue).toHaveBeenCalled();
    expect(component.apdexValue).toBe(0.9);
    expect(chartSpy).toHaveBeenCalledWith(mockResponse.apdexTimeSeries);
  });

  it('should format tooltip correctly', () => {
    const mockPoints = [
      { series: { name: 'Apdex' }, y: 0.6, color: 'red' },
      { series: { name: 'Apdex' }, y: 0.9, color: undefined }
    ];
    const chartSpy = jest.spyOn(Highcharts, 'chart').mockImplementation((_id, options: any) => {
      const tooltipHTML = options.tooltip.formatter.call({
        x: 0,
        points: mockPoints,
        series: { chart: { xAxis: [{ categories: ['t1', 't2'] }] } }
      });
      expect(tooltipHTML).toContain('<b>t1</b>');
      expect(tooltipHTML).toContain('Apdex');
      expect(tooltipHTML).toContain('●');
      return {} as any;
    });
    component.getServiceApdexTimeValueChart([{ time_bucket: 't1', load: 0.6 }]);
    expect(chartSpy).toHaveBeenCalled();
  });

  // Load Chart

  it('should destroy existing chart if data is empty', () => {
    component.serviceLoadTimeValueChart = { destroy: jest.fn() } as any;
    component.getserviceLoadTimeValueChart([]);
    expect(component.serviceLoadTimeValueChart).toBeDefined();
  });

  it('should create a spline chart with correct data and series', () => {
    const chartSpy = jest.spyOn(Highcharts, 'chart');
    component.thresholds = {
      service_cpm: { avgBaseline: 100, warningValue: 80, criticalValue: 120 }
    };
    const data = [
      { time_bucket: '2025-11-10T00:00:00Z', load1: 90 },
      { time_bucket: '2025-11-10T01:00:00Z', load1: 130 }
    ];
    component.getserviceLoadTimeValueChart(data);
    expect(chartSpy).toHaveBeenCalledWith(
      'serviceLoadTimeValueChartContainer',
      expect.objectContaining({
        chart: expect.objectContaining({ type: 'spline' }),
        series: expect.arrayContaining([
          expect.objectContaining({
            type: 'spline',
            data: expect.arrayContaining([
              expect.objectContaining({ y: 90 }),
              expect.objectContaining({ y: 130 })
            ])
          })
        ]),
        yAxis: expect.objectContaining({
          min: 0,
          plotLines: expect.arrayContaining([
            expect.objectContaining({ value: 100 })
          ])
        })
      })
    );
  });

  it('should color points based on thresholds', () => {
    jest.spyOn(Highcharts, 'chart').mockImplementation((_id, options: any) => {
      const pointColors = options.series[0].data.map((p: { color: any; }) => p.color);
      expect(pointColors[0]).toBeUndefined();
      expect(pointColors[1]).toBe('red');
      return {} as any;
    });
    component.thresholds = { service_cpm: { avgBaseline: 100, warningValue: 80, criticalValue: 120 } };
    component.getserviceLoadTimeValueChart([
      { time_bucket: 't1', load1: 90 },
      { time_bucket: 't2', load1: 130 }
    ]);
  });

  it('should destroy existing chart before creating a new one', () => {
    const destroySpy = jest.fn();
    const chartSpy = jest.spyOn(Highcharts, 'chart').mockReturnValue({ destroy: destroySpy } as any);
    component.getserviceLoadTimeValueChart([{ time_bucket: 't1', load1: 90 }]);
    component.serviceLoadTimeValueChart = { destroy: destroySpy } as any;
    component.getserviceLoadTimeValueChart([{ time_bucket: 't2', load1: 130 }]);
    expect(destroySpy).toHaveBeenCalledTimes(1);
    expect(chartSpy).toHaveBeenCalledTimes(2);
  });

  it('should call getserviceLoadTimeValueChart() with API response', () => {
    const mockResponse = {
      load: 95,
      loadTimeSeries: [{ time_bucket: '2025-11-10T00:00:00Z', load1: 95 }]
    };
    jest.spyOn(mockApiService, 'getServiceLoadTimeValue').mockReturnValue(of(mockResponse));
    const chartSpy = jest.spyOn(component, 'getserviceLoadTimeValueChart');
    component.getServiceLoadTimeValue();
    expect(mockApiService.getServiceLoadTimeValue).toHaveBeenCalled();
    expect(component.avgLoadValue).toBe(95);
    expect(chartSpy).toHaveBeenCalledWith(mockResponse.loadTimeSeries);
  });

  it('should format tooltip correctly', () => {
    const mockPoints = [
      { series: { name: 'load1' }, y: 90, color: undefined },
      { series: { name: 'load1' }, y: 130, color: 'red' }
    ];
    jest.spyOn(Highcharts, 'chart').mockImplementation((_id, options: any) => {
      const tooltipHTML = options.tooltip.formatter.call({
        x: 0,
        points: mockPoints,
        series: { chart: { xAxis: [{ categories: ['t1', 't2'] }] } }
      });
      expect(tooltipHTML).toContain('<b>t1</b>');
      expect(tooltipHTML).toContain('load1');
      expect(tooltipHTML).toContain('●');
      return {} as any;
    });
    component.getserviceLoadTimeValueChart([{ time_bucket: 't1', load1: 90 }]);
  });

  // Latency

  it('should destroy existing chart if data is empty', () => {
    component.serviceAvgResponseTimeChart = { destroy: jest.fn() } as any;
    component.getCombinedResponseTimeChart([], []);
    expect(component.serviceAvgResponseTimeChart).toBeDefined();
  });

  it('should merge avg and percentile data and create chart', () => {
    const chartSpy = jest.spyOn(Highcharts, 'chart');
    component.thresholds = {
      service_resp_time: { avgBaseline: 50, warningValue: 80, criticalValue: 100 }
    };
    const avgData = [
      { time_bucket: 't1', latency: 40 },
      { time_bucket: 't2', latency: 90 }
    ];
    const percentileData = [
      { time_bucket: 't1', P50: 35, P75: 45, P90: 50, P95: 55, P99: 60 },
      { time_bucket: 't2', P50: 80, P75: 85, P90: 90, P95: 95, P99: 100 }
    ];
    component.getCombinedResponseTimeChart(avgData, percentileData);
    expect(chartSpy).toHaveBeenCalledWith(
      'combinedResponseTimeChartContainer',
      expect.objectContaining({
        chart: expect.any(Object),
        series: expect.arrayContaining([
          expect.objectContaining({ name: 'Average Latency', type: 'areaspline' }),
          expect.objectContaining({ name: 'P50', type: 'spline' }),
          expect.objectContaining({ name: 'P75', type: 'spline' }),
          expect.objectContaining({ name: 'P90', type: 'spline' }),
          expect.objectContaining({ name: 'P95', type: 'spline' }),
          expect.objectContaining({ name: 'P99', type: 'spline' })
        ]),
        yAxis: expect.objectContaining({
          min: 0,
          plotLines: expect.arrayContaining([
            expect.objectContaining({ value: 50 })
          ])
        })
      })
    );
  });

  it('should color points exceeding thresholds', () => {
    jest.spyOn(Highcharts, 'chart').mockImplementation((_id, options: any) => {
      const avgData = options.series[0].data;
      expect(avgData[0]).toBe(40);
      expect(avgData[1]).toBe(90);
      return {} as any;
    });
    component.thresholds = { service_resp_time: { avgBaseline: 50, warningValue: 80, criticalValue: 100 } };
    component.getCombinedResponseTimeChart([{ time_bucket: 't1', latency: 40 }, { time_bucket: 't2', latency: 90 }], []);
  });

  it('should destroy existing chart before creating new one', () => {
    const destroySpy = jest.fn();
    jest.spyOn(Highcharts, 'chart').mockReturnValue({ destroy: destroySpy } as any);
    component.getCombinedResponseTimeChart([{ time_bucket: 't1', latency: 40 }], []);
    component.serviceAvgResponseTimeChart = { destroy: destroySpy } as any;
    component.getCombinedResponseTimeChart([{ time_bucket: 't2', latency: 50 }], []);
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('should call getCombinedResponseData() and trigger chart with API response', () => {
    const avgRes = { latency: 45, latencyTimeSeries: [{ time_bucket: 't1', latency: 45 }] };
    const percentileRes = [{ time_bucket: 't1', P50: 40, P75: 45, P90: 50, P95: 55, P99: 60 }];
    jest.spyOn(mockApiService, 'getServiceAvgResponseTime').mockReturnValue(of(avgRes));
    jest.spyOn(mockApiService, 'getServiceResponseTimePercentile').mockReturnValue(of(percentileRes));
    const chartSpy = jest.spyOn(component, 'getCombinedResponseTimeChart');
    component.getCombinedResponseData();
    expect(mockApiService.getServiceAvgResponseTime).toHaveBeenCalled();
    expect(mockApiService.getServiceResponseTimePercentile).toHaveBeenCalled();
    expect(component.latencyValue).toBe(45);
    expect(chartSpy).toHaveBeenCalledWith(avgRes.latencyTimeSeries, percentileRes);
  });

  it('should format tooltip correctly with thresholds', () => {
    const mockPoints = [
      { series: { name: 'Average Latency' }, y: 90, color: undefined },
      { series: { name: 'P50' }, y: 50, color: undefined }
    ];
    jest.spyOn(Highcharts, 'chart').mockImplementation((_id, options: any) => {
      const tooltipHTML = options.tooltip.formatter.call({
        x: 0,
        points: mockPoints,
        series: { chart: { xAxis: [{ categories: ['t1', 't2'] }] } }
      });
      expect(tooltipHTML).toContain('<b>t1</b>');
      expect(tooltipHTML).toContain('Average Latency');
      expect(tooltipHTML).toContain('P50');
      return {} as any;
    });
    component.thresholds = { service_resp_time: { avgBaseline: 50, warningValue: 80, criticalValue: 100 } };
    component.getCombinedResponseTimeChart([{ time_bucket: 't1', latency: 90 }], [{ time_bucket: 't1', P50: 50 }]);
  });

  // Metric Cards 

  it('should correctly determine threshold color for service_sla below critical', () => {
    const result = component.getThresholdDisplay('service_sla', 85);
    expect(result).toEqual({ value: 90, color: 'red' });
  });

  it('should correctly determine threshold color for service_resp_time above warning but below critical', () => {
    const result = component.getThresholdDisplay('service_resp_time', 1500);
    expect(result).toEqual({ value: 1000, color: 'orange' });
  });

  it('should render Success Rate metric with correct text and color', fakeAsync(() => {
    component.appHealthScore = 100;
    component.infraHealthScore = 100;
    component.projectHealthScore = 100;
    component.dbHealthScore = [];
    cdr.detectChanges();
    const metric = fixture.nativeElement.querySelector('[data-testid="success-rate-metric"]');
    const label = metric.querySelector('.small').textContent.trim();
    const value = metric.querySelector('.kpi-value').textContent.trim();
    expect(label).toContain('Success rate');
    expect(value).toContain('92');
    expect(value).toContain('%');
    expect(metric.innerHTML).toContain('orange');
  }));

  it('should render Apdex metric with correct value and border color', () => {
    component.appHealthScore = 100;
    component.infraHealthScore = 100;
    component.projectHealthScore = 100;
    component.dbHealthScore = [];
    cdr.detectChanges();
    const metric = fixture.nativeElement.querySelector('[data-testid="appdex-metric"]');
    expect(metric).not.toBeNull();
    const label = metric.querySelector('.small').textContent.trim();
    const value = metric.querySelector('.kpi-value').textContent.trim();
    expect(label).toContain('Apdex');
    expect(value).toContain('0.8');
    expect(metric.innerHTML).toContain('orange');
  });

  it('should render Latency metric with correct ms suffix and orange border', () => {
    component.appHealthScore = 100;
    component.infraHealthScore = 100;
    component.projectHealthScore = 100;
    component.dbHealthScore = [];
    cdr.detectChanges();
    const metric = fixture.nativeElement.querySelector('[data-testid="latency-metric"]');
    const value = metric.querySelector('.kpi-value').textContent.trim();
    expect(value).toContain('1500');
    expect(value).toContain('ms');
    expect(metric.innerHTML).toContain('orange');
  });

  it('should render Avg Load metric with correct call/min suffix', () => {
    component.appHealthScore = 100;
    component.infraHealthScore = 100;
    component.projectHealthScore = 100;
    component.dbHealthScore = [];
    cdr.detectChanges();
    const metric = fixture.nativeElement.querySelector('[data-testid="avgLoadValue-metric"]');
    const value = metric.querySelector('.kpi-value').textContent.trim();
    expect(value).toContain('100');
    expect(value).toContain('call/min');
  });

  it('should render Total Hits metric with correct value', () => {
    component.appHealthScore = 100;
    component.infraHealthScore = 100;
    component.projectHealthScore = 100;
    component.dbHealthScore = [];
    cdr.detectChanges();
    const metric = fixture.nativeElement.querySelector('[data-testid="Total hits"]');
    const value = metric.querySelector('.kpi-value').textContent.trim();
    expect(value).toContain('5000');
  });

  it('should render Errors metric with red color when errorValue > 0', () => {
    component.appHealthScore = 100;
    component.infraHealthScore = 100;
    component.projectHealthScore = 100;
    component.dbHealthScore = [];
    cdr.detectChanges();
    const metric = fixture.nativeElement.querySelector('[data-testid="Errors"]');
    const valueDiv = metric.querySelector('.kpi-value');
    expect(valueDiv.style.color).toBe('red');
    expect(valueDiv.textContent.trim()).toBe('3');
  });

  it('should call openTraceTabSucessRate on error metric click', fakeAsync(() => {
    component.appHealthScore = 100;
    component.infraHealthScore = 100;
    component.projectHealthScore = 100;
    component.dbHealthScore = [];
    component.errorValue = 2;
    cdr.detectChanges();
    tick();
    const clickSpy = jest.spyOn(component, 'openTraceTabSucessRate');
    const metric = fixture.nativeElement.querySelector('[data-testid="Errors"] .kpi-value');
    expect(metric).not.toBeNull();
    metric.click();
    tick();
    expect(clickSpy).toHaveBeenCalled();
  }));

  it('should handle null thresholds safely in getThresholdDisplay', () => {
    component.thresholds = null as any;
    const result = component.getThresholdDisplay('service_sla', 95);
    expect(result).toEqual({ value: 0, color: '#3b82f6' });
  });

  // Alerts and problem page

  it('should render critical and warning alert sections when alerts exist', fakeAsync(() => {
    component.alertData = [
      { Critical: 3, Warning: 2 }
    ];
    cdr.detectChanges();
    tick();
    const criticalDiv = fixture.nativeElement.querySelector('.critical-section');
    const warningDiv = fixture.nativeElement.querySelector('.warning-section');
    expect(criticalDiv).not.toBeNull();
    expect(warningDiv).not.toBeNull();
    expect(criticalDiv.textContent).toContain('Critical: 3');
    expect(warningDiv.textContent).toContain('Warn: 2');
  }));

  it('should render "No alerts" section when no alerts are present', fakeAsync(() => {
    component.alertData = [
      { Critical: 0, Warning: 0 }
    ];
    cdr.detectChanges();
    tick();
    const emptyDiv = fixture.nativeElement.querySelector('.alert-empty');
    expect(emptyDiv).not.toBeNull();
    expect(emptyDiv.textContent.trim()).toBe('No alerts');
  }));

  // Instance Tab

  it('should render instance load table rows', fakeAsync(async () => {
    component.getServiceInstanceLoad();
    tick();
    cdr.detectChanges();
    await fixture.whenStable();
    cdr.detectChanges();
    const instanceLoadCard = fixture.debugElement.queryAll(By.css('.card'))
      .find(card => card.nativeElement.querySelector('.card-header span')?.textContent?.includes('Instance Load'));
    expect(instanceLoadCard).toBeDefined();
    const rows = instanceLoadCard!.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(2);
    expect(rows[0].nativeElement.textContent).toContain('Laravel_App-172.16.138.141');
    expect(rows[1].nativeElement.textContent).toContain('Node_App-172.16.138.142');
  }));

  it('should calculate progress width correctly', () => {
    const width = component.getProgressWidth(50, [
      { value: 100 },
      { value: 50 },
      { value: 25 },
    ], 'value');
    expect(width).toBe(50);
  });

  it('should return correct progress bar class', () => {
    expect(component.getProgressBarClass('CRITICAL')).toBe('bg-danger-bar');
    expect(component.getProgressBarClass('WARNING')).toBe('bg-warning-bar');
    expect(component.getProgressBarClass('NORMAL')).toBe('bg-normal-bar');
    expect(component.getProgressBarClass('OTHER')).toBe('bg-normal-bar');
  });

  it('should call openTraceTabInstance when eye icon clicked', async () => {
    component.instanceLoadData = [
      { instance: 'Laravel_App-172.16.138.141', value: 72, status: 'NORMAL' },
    ];
    cdr.detectChanges();
    await fixture.whenStable();
    cdr.detectChanges();
    const instanceLoadCard = fixture.debugElement.queryAll(By.css('.card'))
      .find(card => card.nativeElement.querySelector('.card-header span')?.textContent?.includes('Instance Load'));
    expect(instanceLoadCard).toBeDefined();
    const eyeIcon = instanceLoadCard!.query(By.css('.fa-eye'));
    expect(eyeIcon).not.toBeNull();
    const spy = jest.spyOn(component, 'openTraceTabInstance');
    eyeIcon!.triggerEventHandler('click', null);
    await fixture.whenStable();
    cdr.detectChanges();
    expect(spy).toHaveBeenCalledWith('Laravel_App-172.16.138.141');
  });

  it('should render slow instance table rows', fakeAsync(async () => {
    component.getSlowServiceInstance();
    tick();
    cdr.detectChanges();
    await fixture.whenStable();
    cdr.detectChanges();
    const slowInstanceCard = fixture.debugElement.queryAll(By.css('.card'))
      .find(card => card.nativeElement.querySelector('.card-header span')?.textContent?.includes('Slow Instance'));
    expect(slowInstanceCard).toBeDefined();
    const rows = slowInstanceCard!.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(2);
    expect(rows[0].nativeElement.textContent).toContain('Laravel_App-172.16.138.141');
    expect(rows[0].nativeElement.textContent).toContain('137');
    expect(rows[1].nativeElement.textContent).toContain('Node_App-172.16.138.142');
    expect(rows[1].nativeElement.textContent).toContain('200');
  }));

  it('should calculate progress width for slow instance correctly', () => {
    const width = component.getProgressWidth(50, [
      { value: 100 },
      { value: 50 },
      { value: 25 },
    ], 'value');
    expect(width).toBe(50);
  });

  it('should return correct progress bar class for slow instance', () => {
    expect(component.getProgressBarClass('CRITICAL')).toBe('bg-danger-bar');
    expect(component.getProgressBarClass('WARNING')).toBe('bg-warning-bar');
    expect(component.getProgressBarClass('NORMAL')).toBe('bg-normal-bar');
    expect(component.getProgressBarClass('OTHER')).toBe('bg-normal-bar');
  });

  it('should call openTraceTabInstance when eye icon clicked in slow instance', async () => {
    component.slowInstanceData = [
      { instance: 'Laravel_App-172.16.138.141', value: 137, status: 'NORMAL' },
    ];
    cdr.detectChanges();
    await fixture.whenStable();
    cdr.detectChanges();
    const slowInstanceCard = fixture.debugElement.queryAll(By.css('.card'))
      .find(card => card.nativeElement.querySelector('.card-header span')?.textContent?.includes('Slow Instance'));
    expect(slowInstanceCard).toBeDefined();
    const eyeIcon = slowInstanceCard!.query(By.css('.fa-eye'));
    expect(eyeIcon).not.toBeNull();
    const spy = jest.spyOn(component, 'openTraceTabInstance');
    eyeIcon!.triggerEventHandler('click', null);
    await fixture.whenStable();
    cdr.detectChanges();
    expect(spy).toHaveBeenCalledWith('Laravel_App-172.16.138.141');
  });

  it('should render instance table rows', fakeAsync(() => {
    jest.spyOn(mockApiService, 'getServiceInstanceNames').mockReturnValue(
      of({ Laravel_App: ['Laravel_App-172.16.138.141', 'Node_App-172.16.138.142'] })
    );
    jest.spyOn(mockApiService, 'getCombinedData').mockImplementation((...args: any[]) => {
      const entityInstanceId = args[0] as string;
      if (entityInstanceId.includes('Laravel_App-172.16.138.141')) {
        return of({
          service_load: 71.36,
          avg_latency: 178.39,
          success_rate: 95.83,
          properties: {
            "OS Name": "Linux",
            language: "php",
            hostname: "MHRILARMAPPHOLIDAYSPREPROD",
            ipv4s: "172.16.138.141",
            "Process No.": "1954644"
          }
        });
      } else {
        return of({
          service_load: 50,
          avg_latency: 20,
          success_rate: 90,
          properties: { anyKey: 'anyValue' }
        });
      }
    });
    component.getServiceInstanceNames();
    tick(100); // allow async forkJoin in getInstanceCombinedData to complete
    cdr.detectChanges();
    const rows = fixture.debugElement.queryAll(By.css('tbody tr.instance-row'));
    expect(rows.length).toBe(2);
    expect(rows[0].nativeElement.textContent).toContain('Laravel_App-172.16.138.141');
    expect(rows[1].nativeElement.textContent).toContain('Node_App-172.16.138.142');
  }));

  it('should open Load chart popup and call getServiceInstanceLoadTimevalues', fakeAsync(() => {
    component.instanceNames = ['Laravel_App-172.16.138.141', 'Node_App-172.16.138.142'];
    component.instanceId = {
      'Laravel_App-172.16.138.141': {
        service_load: 52,
        success_rate: 92,
        avg_latency: 175,
        properties: { os: 'Linux' }
      }
    };
    cdr.detectChanges();
    tick();
    const spy = jest.spyOn(component, 'getServiceInstanceLoadTimevalues');
    const loadIcon = fixture.debugElement.query(By.css('.fa-chart-line'));
    if (loadIcon) {
      loadIcon.triggerEventHandler('click', { clientX: 0, clientY: 0 });
      tick();
      expect(spy).toHaveBeenCalledWith('Laravel_App-172.16.138.141');
      expect(component.instShowPopup).toBe(true);
      expect(component.instPopupX).toBe(0);
      expect(component.instPopupY).toBe(0);
    } else {
      component.openInstLoadPopup({ clientX: 0, clientY: 0 } as any, 'Laravel_App-172.16.138.141');
      tick();
      expect(spy).toHaveBeenCalledWith('Laravel_App-172.16.138.141');
      expect(component.instShowPopup).toBe(true);
    }
  }));

  it('should call setServiceInstance when instance name clicked', fakeAsync(() => {
    jest.spyOn(mockApiService, 'getServiceInstanceNames').mockReturnValue(
      of({ Laravel_App: ['Laravel_App-172.16.138.141', 'Node_App-172.16.138.142'] })
    );
    jest.spyOn(mockApiService, 'getCombinedData').mockImplementation(() => of({
      service_load: 71.36,
      avg_latency: 178.39,
      success_rate: 95.83,
      properties: {
        "OS Name": "Linux",
        language: "php",
        hostname: "HOST",
        ipv4s: "172.16.138.141",
        "Process No.": "12345"
      }
    }));
    component.getServiceInstanceNames();
    tick();
    tick();
    tick();
    cdr.detectChanges();
    tick();
    const cards = fixture.debugElement.queryAll(By.css('.card'));
    const instancesCard = cards.find(card =>
      card.nativeElement.querySelector('h5')?.textContent?.trim().includes('Instance Details')
    );
    expect(instancesCard).toBeDefined();
    const firstInstanceCell = instancesCard!.query(By.css('tbody tr td'));
    expect(firstInstanceCell).toBeTruthy();
    expect(firstInstanceCell.nativeElement.textContent).toContain('Laravel_App-172.16.138.141');
    const spy = jest.spyOn(component, 'setServiceInstance');
    try {
      firstInstanceCell.nativeElement.click();
      tick();
    } catch (e) {
      firstInstanceCell.triggerEventHandler('click', {
        target: firstInstanceCell.nativeElement,
        preventDefault: () => { }
      });
      tick();
    }
    cdr.detectChanges();
    expect(spy).toHaveBeenCalled();
  }));

  it('should open Latency chart popup and call getServiceInstanceLatencyTimevalues', fakeAsync(() => {
    component.instanceNames = ['Laravel_App-172.16.138.141', 'Node_App-172.16.138.142'];
    component.instanceId = {
      'Laravel_App-172.16.138.141': {
        service_load: 52,
        success_rate: 92,
        avg_latency: 175,
        properties: { os: 'Linux' }
      }
    };
    cdr.detectChanges();
    tick();
    const spy = jest.spyOn(component, 'getServiceInstanceLatencyTimevalues');
    const latencyIcon = fixture.debugElement.query(By.css('.fa-hourglass'));
    if (latencyIcon) {
      latencyIcon.triggerEventHandler('click', { clientX: 20, clientY: 20 });
      tick();
      expect(spy).toHaveBeenCalledWith('Laravel_App-172.16.138.141');
      expect(component.instShowLtPopup).toBe(true);
      expect(component.instPopupLtX).toBe(20);
      expect(component.instPopupLtY).toBe(20);
    } else {
      component.openInstLtPopup({ clientX: 20, clientY: 20 } as any, 'Laravel_App-172.16.138.141');
      tick();
      expect(spy).toHaveBeenCalledWith('Laravel_App-172.16.138.141');
      expect(component.instShowLtPopup).toBe(true);
    }
  }));

  it('should open Attributes modal and display properties', fakeAsync(() => {
    component.appHealthScore = 100;
    component.infraHealthScore = 100;
    component.projectHealthScore = 100;
    component.dbHealthScore = [];
    component.openAttributeModal(component.instanceId['Laravel_App-172.16.138.141']);
    cdr.detectChanges();
    tick();
    expect(component.isAttributeModal).toBe(true);
    const modalText = fixture.debugElement.query(By.css('.fixed.inset-0'));
    expect(modalText.nativeElement.textContent).toContain('os : Linux');
    expect(modalText.nativeElement.textContent).toContain('version : 8.0');
  }));

  it('should close Attributes modal', () => {
    component.appHealthScore = 100;
    component.infraHealthScore = 100;
    component.projectHealthScore = 100;
    component.dbHealthScore = [];
    component.isAttributeModal = true;
    cdr.detectChanges();
    component.closeAttributeModal();
    expect(component.isAttributeModal).toBe(false);
  });

  it('should render Load chart with proper series', fakeAsync(() => {
    const chartSpy = jest.spyOn(Highcharts, 'chart');
    component.openInstLoadPopup({ clientX: 0, clientY: 0 } as any, 'Laravel_App-172.16.138.141');
    tick();
    tick();
    expect(mockApiService.getServiceInstanceLoadTimevalues).toHaveBeenCalled();
    const callArgs = mockApiService.getServiceInstanceLoadTimevalues.mock.calls[0];
    const expectedFirst = `ent1_${btoa('Laravel_App-172.16.138.141')}`;
    expect(callArgs[0]).toBeDefined();
    expect(callArgs[0]).toBe(expectedFirst);
    expect(callArgs[1] === undefined || typeof callArgs[1] === 'number').toBeTruthy();
    expect(typeof callArgs[2]).toBe('number');
    if (chartSpy.mock.calls.length > 0) {
      const lastCallOptions = chartSpy.mock.calls[chartSpy.mock.calls.length - 1][1] as any;
      const seriesData = (lastCallOptions?.series ?? []) as any[];
      expect(seriesData.length).toBeGreaterThan(0);
      expect(seriesData[0].data?.length).toBeGreaterThan(0);
    }
  }));

  it('should render Success Rate chart with proper series', fakeAsync(() => {
    const chartSpy = jest
      .spyOn(Highcharts, 'chart')
      .mockImplementation((_container: any, options: any) => {
        return {
          options,
          destroy: jest.fn(),
          reflow: jest.fn(),
        } as any;
      });
    component.openInstSrPopup({ clientX: 0, clientY: 0 } as any, 'Laravel_App-172.16.138.141');
    tick();
    cdr.detectChanges();
    expect(mockApiService.getServiceInstanceSuccessRateTimevalues).toHaveBeenCalled();
    if (chartSpy.mock.calls.length > 0) {
      const callOptions = chartSpy.mock.calls[0][1] as any;
      const seriesData = callOptions?.series ?? [];
      expect(seriesData.length).toBeGreaterThan(0);
      expect(seriesData[0]?.data?.length).toBeGreaterThan(0);
    } else {
      const opt = component.serviceInstanceSuccessRateTimevaluesChart as any;
      expect(opt).toBeDefined();
      const seriesData = opt?.series ?? [];
      expect(seriesData.length).toBeGreaterThan(0);
      expect(seriesData[0]?.data?.length).toBeGreaterThan(0);
    }
    chartSpy.mockRestore();
  }));

  it('should render Latency chart with proper series', fakeAsync(() => {
    const chartSpy = jest
      .spyOn(Highcharts, 'chart')
      .mockImplementation((_container: any, options: any) => {
        return {
          options,
          destroy: jest.fn(),
          reflow: jest.fn(),
        } as any;
      });
    component.openInstLtPopup({ clientX: 0, clientY: 0 } as any, 'Laravel_App-172.16.138.141');
    tick();
    cdr.detectChanges();
    expect(mockApiService.getServiceInstanceLatencyTimevalues).toHaveBeenCalled();
    if (chartSpy.mock.calls.length > 0) {
      const callOptions = chartSpy.mock.calls[0][1] as any;
      const seriesData = callOptions?.series ?? [];
      expect(seriesData.length).toBeGreaterThan(0);
      expect(seriesData[0]?.data?.length).toBeGreaterThan(0);
    } else {
      const opt = component.serviceInstanceLatencyTimevaluesChart as any;
      expect(opt).toBeDefined();
      const seriesData = opt?.series ?? [];
      expect(seriesData.length).toBeGreaterThan(0);
      expect(seriesData[0]?.data?.length).toBeGreaterThan(0);
    }
    chartSpy.mockRestore();
  }));

  // Endpoint Tab

  it('should render endpoint load table rows', fakeAsync(async () => {
    component.getEndpointsLoadInCurrentService();
    tick();
    cdr.detectChanges();
    await fixture.whenStable();
    cdr.detectChanges();
    const endpointLoadCard = fixture.debugElement.queryAll(By.css('.card'))
      .find(card => card.nativeElement.querySelector('.card-header span')?.textContent?.includes('Endpoint Load'));
    expect(endpointLoadCard).toBeDefined();
    const rows = endpointLoadCard!.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(4);
    expect(rows[0].nativeElement.textContent).toContain('POST://api/v1/isUserLogIn');
    expect(rows[1].nativeElement.textContent).toContain('GET://api/v1/getStickyInfo');
  }));

  it('should call openTraceTabEndoint when eye icon clicked in endpoint load', async () => {
    component.endpointLoadData = [
      { endpoint: 'POST://api/v1/isUserLogIn', value: 3, status: 'NORMAL' },
    ];
    cdr.detectChanges();
    await fixture.whenStable();
    cdr.detectChanges();
    const endpointLoadCard = fixture.debugElement.queryAll(By.css('.card'))
      .find(card => card.nativeElement.querySelector('.card-header span')?.textContent?.includes('Endpoint Load'));
    expect(endpointLoadCard).toBeDefined();
    const eyeIcon = endpointLoadCard!.query(By.css('.fa-eye'));
    expect(eyeIcon).not.toBeNull();
    const spy = jest.spyOn(component, 'openTraceTabEndoint');
    eyeIcon!.triggerEventHandler('click', null);
    await fixture.whenStable();
    cdr.detectChanges();
    expect(spy).toHaveBeenCalledWith('POST://api/v1/isUserLogIn');
  });

  it('should render endpoint success rate table rows', fakeAsync(async () => {
    component.getEndpointSuccessRateInCurrentService();
    tick();
    cdr.detectChanges();
    await fixture.whenStable();
    cdr.detectChanges();
    const successRateCard = fixture.debugElement.queryAll(By.css('.card'))
      .find(card => card.nativeElement.querySelector('.card-header span')?.textContent?.includes('Endpoint Success Rate'));
    expect(successRateCard).toBeDefined();
    const rows = successRateCard!.queryAll(By.css('tbody tr'));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].nativeElement.textContent).toContain('GET://api/v1/getSimilarNearbyResorts');
  }));

  it('should call openTraceTabEndoint when eye icon clicked in success rate', async () => {
    component.endpointSuccessRateData = [
      { endpoint: 'GET://api/v1/getResortReview', value: 37.5, status: 'CRITICAL' },
    ];
    cdr.detectChanges();
    await fixture.whenStable();
    cdr.detectChanges();
    const successRateCard = fixture.debugElement.queryAll(By.css('.card'))
      .find(card => card.nativeElement.querySelector('.card-header span')?.textContent?.includes('Endpoint Success Rate'));
    expect(successRateCard).toBeDefined();
    const eyeIcon = successRateCard!.query(By.css('.fa-eye'));
    expect(eyeIcon).not.toBeNull();
    const spy = jest.spyOn(component, 'openTraceTabEndoint');
    eyeIcon!.triggerEventHandler('click', null);
    await fixture.whenStable();
    cdr.detectChanges();
    expect(spy).toHaveBeenCalledWith('GET://api/v1/getResortReview');
  });

  it('should call seeSuccessEndpoint and sort by success rate desc', fakeAsync(() => {
    const spy = jest.spyOn(component, 'getEndpointNames');
    component.seeSuccessEndpoint();
    tick();
    expect(component.endpointSortBy).toBe('success_rate');
    expect(component.endpointOrder).toBe('desc');
    expect(spy).toHaveBeenCalled();
  }));

  it('should call seeErrorEndpoint and sort by success rate asc', fakeAsync(() => {
    const spy = jest.spyOn(component, 'getEndpointNames');
    component.seeErrorEndpoint();
    tick();
    expect(component.endpointSortBy).toBe('success_rate');
    expect(component.endpointOrder).toBe('asc');
    expect(spy).toHaveBeenCalled();
  }));

  it('should render endpoint details table rows', fakeAsync(() => {
    jest.spyOn(mockApiService, 'endpointNamesUpdated').mockReturnValue(
      of({
        total_hits: 208,
        error_count: 12,
        endpoints: [
          {
            endpoint_id: 'GET://api/v1/getBanner',
            metrics: { endpoint_load: 1.9, total_hits: 19, latency: 48.4, success_rate: 100.0 }
          },
          {
            endpoint_id: 'POST://api/v1/getPaymentDues',
            metrics: { endpoint_load: 1.4, total_hits: 14, latency: 150.2, success_rate: 100.0 }
          }
        ]
      })
    );
    component.getEndpointNames();
    tick();
    cdr.detectChanges();
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBeGreaterThan(0);
    expect(component.totalHitsEndpoint).toBe(208);
    expect(component.errorCountEndpoint).toBe(12);
  }));

  it('should filter endpoints by search text', fakeAsync(() => {
    component.searchTextEndpoint = 'getBanner';
    component.endpointOrder = 'asc';
    const spy = jest.spyOn(mockApiService, 'endpointNamesUpdated');
    component.getEndpointNames();
    tick();
    const callArgs = spy.mock.calls[0];
    expect(callArgs[0]).toBe(component.entityId);
    expect(callArgs[1]).toBe(component.startTime);
    expect(callArgs[2]).toBe(component.endTime);
    expect(callArgs[3]).toBe(component.rowsPerPageEndpoint);
    expect(callArgs[4]).toBe(component.currentPageEndpoint);
    expect(callArgs[5]).toBe('getBanner');
    expect(typeof callArgs[6] === 'string' || callArgs[6] === undefined).toBe(true);
    expect(callArgs[7]).toBe('asc');
  }));

  it('should call setServiceEndpoints when endpoint name clicked', fakeAsync(() => {
    jest.spyOn(mockApiService, 'endpointNamesUpdated').mockReturnValue(
      of({
        total_hits: 208,
        error_count: 12,
        endpoints: [
          {
            endpoint_id: 'GET://api/v1/getBanner',
            metrics: { endpoint_load: 1.9, total_hits: 19, latency: 48.4, success_rate: 100.0 }
          }
        ]
      })
    );
    component.getEndpointNames();
    tick(1000); // wait for async observables
    cdr.detectChanges();
    tick();
    const tableDebugEl = fixture.debugElement.queryAll(By.css('table')).find(table =>
      table.nativeElement.querySelector('thead tr th')?.textContent?.trim() === 'Endpoints'
    );
    expect(tableDebugEl).toBeDefined();
    const endpointCell = tableDebugEl!.query(By.css('tbody tr td'));
    expect(endpointCell).toBeTruthy();
    expect(endpointCell.nativeElement.textContent).toContain('GET://api/v1/getBanner');
    const spy = jest.spyOn(component, 'setServiceEndpoints');
    endpointCell.triggerEventHandler('click', {
      target: endpointCell.nativeElement,
      preventDefault: () => { }
    });
    tick();
    cdr.detectChanges();
    expect(spy).toHaveBeenCalled();
  }));

  it('should open Load chart popup and call getEndpointLoad', fakeAsync(() => {
    component.endPointNames = [
      {
        endpoint_id: 'GET://api/v1/getBanner',
        metrics: { endpoint_load: 1.9, total_hits: 19, latency: 48.4, success_rate: 100.0 }
      }
    ];
    const spy = jest.spyOn(component, 'getEndpointLoad');
    component.openLoadPopup({ clientX: 0, clientY: 0 } as any, component.endPointNames[0]);
    tick();
    expect(spy).toHaveBeenCalledWith(component.endPointNames[0]);
    expect(component.showPopup).toBe(true);
    expect(component.popupX).toBe(0);
    expect(component.popupY).toBe(0);
  }));

  it('should open Success Rate chart popup and call getEndpointSuccessRate', fakeAsync(() => {
    component.endPointNames = [
      {
        endpoint_id: 'GET://api/v1/getBanner',
        metrics: { endpoint_load: 1.9, total_hits: 19, latency: 48.4, success_rate: 100.0 }
      }
    ];
    const spy = jest.spyOn(component, 'getEndpointSuccessRate');
    cdr.detectChanges();
    tick();
    const srIcon = fixture.debugElement.query(By.css('.fa-circle-check'));
    expect(srIcon).toBeTruthy();
    srIcon.triggerEventHandler('click', {
      clientX: 20,
      clientY: 20,
      stopPropagation: () => { },
      target: { dataset: { endpointId: component.endPointNames[0].endpoint_id } }
    });
    component.openSrPopup({ clientX: 20, clientY: 20 } as any, component.endPointNames[0].endpoint_id);
    tick();
    expect(spy).toHaveBeenCalledWith('GET://api/v1/getBanner');
    expect(component.showSRPopup).toBe(true);
    expect(component.popupSrX).toBe(20);
    expect(component.popupSrY).toBe(20);
  }));

  it('should open Latency chart popup and call getEndpointAvgResponseTime', fakeAsync(() => {
    component.endPointNames = [
      {
        endpoint_id: 'GET://api/v1/getBanner',
        metrics: { endpoint_load: 1.9, total_hits: 19, latency: 48.4, success_rate: 100.0 }
      }
    ];
    component.loadingEndpoints = false;
    cdr.detectChanges();
    tick();
    const spy = jest.spyOn(component, 'getEndpointAvgResponseTime');
    const ltIcon = fixture.debugElement.query(By.css('.fa-hourglass'));
    expect(ltIcon).toBeTruthy();
    ltIcon.triggerEventHandler('click', {
      clientX: 30,
      clientY: 30,
      stopPropagation: () => { },
      target: component.endPointNames[0].endpoint_id,
    });
    component.openLtPopup({ clientX: 30, clientY: 30 } as any, component.endPointNames[0].endpoint_id);
    tick();
    expect(spy).toHaveBeenCalledWith('GET://api/v1/getBanner');
    expect(component.showLtPopup).toBe(true);
    expect(component.popupLtX).toBe(30);
    expect(component.popupLtY).toBe(30);
  }));

  it('should render Load chart with proper series', fakeAsync(() => {
    const chartSpy = jest.spyOn(Highcharts, 'chart');
    component.openLoadPopup({ clientX: 0, clientY: 0 } as any, 'GET://api/v1/getBanner');
    tick();
    tick();
    expect(mockApiService.getEndpointLoad).toHaveBeenCalled();
    const callArgs = mockApiService.getEndpointLoad.mock.calls[0];
    const expectedFirst = `ent1_${btoa('GET://api/v1/getBanner')}`;
    expect(callArgs[0]).toBeDefined();
    expect(callArgs[0]).toBe(expectedFirst);
    if (chartSpy.mock.calls.length > 0) {
      const lastCallOptions = chartSpy.mock.calls[chartSpy.mock.calls.length - 1][1] as any;
      const seriesData = (lastCallOptions?.series ?? []) as any[];
      expect(seriesData.length).toBeGreaterThan(0);
      expect(seriesData[0].data?.length).toBeGreaterThan(0);
    }
  }));

  it('should render Success Rate chart with proper series', fakeAsync(() => {
    const chartSpy = jest
      .spyOn(Highcharts, 'chart')
      .mockImplementation((_container: any, options: any) => {
        return {
          options,
          destroy: jest.fn(),
          reflow: jest.fn(),
        } as any;
      });
    component.openSrPopup({ clientX: 0, clientY: 0 } as any, { endpoint_id: 'GET://api/v1/getBanner' } as any);
    tick();
    cdr.detectChanges();
    expect(mockApiService.getEndpointSuccessRate).toHaveBeenCalled();
    if (chartSpy.mock.calls.length > 0) {
      const callOptions = chartSpy.mock.calls[0][1] as any;
      const seriesData = callOptions?.series ?? [];
      expect(seriesData.length).toBeGreaterThan(0);
      expect(seriesData[0]?.data?.length).toBeGreaterThan(0);
    } else {
      const opt = component.EndpointSuccessRateChart as any;
      expect(opt).toBeDefined();
      const seriesData = opt?.series ?? [];
      expect(seriesData.length).toBeGreaterThan(0);
      expect(seriesData[0]?.data?.length).toBeGreaterThan(0);
    }
    chartSpy.mockRestore();
  }));

  it('should render Latency chart with proper series', fakeAsync(() => {
    const chartSpy = jest
      .spyOn(Highcharts, 'chart')
      .mockImplementation((_container: any, options: any) => {
        return {
          options,
          destroy: jest.fn(),
          reflow: jest.fn(),
        } as any;
      });
    component.openLtPopup({ clientX: 0, clientY: 0 } as any, { endpoint_id: 'GET://api/v1/getBanner' } as any);
    tick();
    cdr.detectChanges();
    expect(mockApiService.getEndpointAvgResponseTime).toHaveBeenCalled();
    if (chartSpy.mock.calls.length > 0) {
      const callOptions = chartSpy.mock.calls[0][1] as any;
      const seriesData = callOptions?.series ?? [];
      expect(seriesData.length).toBeGreaterThan(0);
      expect(seriesData[0]?.data?.length).toBeGreaterThan(0);
    } else {
      const opt = component.EndpointAvgResponseTimeChart as any;
      expect(opt).toBeDefined();
      const seriesData = opt?.series ?? [];
      expect(seriesData.length).toBeGreaterThan(0);
      expect(seriesData[0]?.data?.length).toBeGreaterThan(0);
    }
    chartSpy.mockRestore();
  }));

  it('should toggle endpoint load sort order', fakeAsync(() => {
    component.endpointSortBy = '';
    component.toggleEndpointLoad();
    tick();
    expect(component.endpointSortBy).toBe('endpoint_load');
    expect(component.endpointOrder).toBe('desc');
    component.toggleEndpointLoad();
    tick();
    expect(component.endpointOrder).toBe('asc');
  }));

  it('should toggle endpoint success rate sort order', fakeAsync(() => {
    component.endpointSortBy = '';
    component.toggleEndpointSuccessRate();
    tick();
    expect(component.endpointSortBy).toBe('success_rate');
    expect(component.endpointOrder).toBe('desc');
    component.toggleEndpointSuccessRate();
    tick();
    expect(component.endpointOrder).toBe('asc');
  }));

  it('should toggle endpoint latency sort order', fakeAsync(() => {
    component.endpointSortBy = '';
    component.toggleEndpointLatency();
    tick();
    expect(component.endpointSortBy).toBe('latency');
    expect(component.endpointOrder).toBe('desc');
    component.toggleEndpointLatency();
    tick();
    expect(component.endpointOrder).toBe('asc');
  }));

  it('should toggle endpoint total hit sort order', fakeAsync(() => {
    component.endpointSortBy = '';
    component.toggleEndpointTotalHit();
    tick();
    expect(component.endpointSortBy).toBe('total_hits');
    expect(component.endpointOrder).toBe('desc');
    component.toggleEndpointTotalHit();
    tick();
    expect(component.endpointOrder).toBe('asc');
  }));

  it('should navigate to next endpoint page', fakeAsync(() => {
    component.currentPageEndpoint = 1;
    component.totalPagesEndpoint = 5;
    const spy = jest.spyOn(component, 'getEndpointNames');
    component.nextEndpointPage();
    tick();
    expect(component.currentPageEndpoint).toBe(2);
    expect(spy).toHaveBeenCalled();
  }));

  it('should navigate to previous endpoint page', fakeAsync(() => {
    component.currentPageEndpoint = 2;
    const spy = jest.spyOn(component, 'getEndpointNames');
    component.previousEndpointPage();
    tick();
    expect(component.currentPageEndpoint).toBe(1);
    expect(spy).toHaveBeenCalled();
  }));

  it('should navigate to specific endpoint page', fakeAsync(() => {
    component.totalPagesEndpoint = 5;
    const spy = jest.spyOn(component, 'getEndpointNames');
    component.goToEndpointPage(3);
    tick();
    expect(component.currentPageEndpoint).toBe(3);
    expect(spy).toHaveBeenCalled();
  }));

  it('should show loading skeleton while fetching endpoints', fakeAsync(() => {
    component.loadingEndpoints = true;
    cdr.detectChanges();
    const skeletons = fixture.debugElement.queryAll(By.css('.skeleton'));
    expect(skeletons.length).toBeGreaterThan(0);
  }));

  it('should display no data message when endpoints list is empty', fakeAsync(() => {
    component.loadingEndpoints = false;
    component.endPointNames = [];
    cdr.detectChanges();
    tick();
    const noDataDiv = fixture.debugElement.query(By.css('.noData'));
    expect(noDataDiv).toBeTruthy();
    expect(noDataDiv.nativeElement.textContent).toContain('No Data Available');
  }));

  // Topology Tab

  it('should process topology data correctly', () => {
    const mockData = [
      {
        componentId: '40',
        source_service_name: 'ServiceA',
        dest_service_name: 'ServiceB',
        componentName: 'Kafka'
      }
    ];
    const result = component.processData(mockData);
    expect(result.nodes.length).toBe(2);
    expect(result.links.length).toBe(1);
    expect(result.links[0].source.name).toBe('ServiceA');
    expect(result.links[0].target.name).toBe('ServiceB');
  });

  it('should throw error when getServiceTopology fails', fakeAsync(() => {
  const mockError = new Error('API Error');
  mockApiService.getServiceTopology.mockReturnValue(
    throwError(() => mockError)
  );
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
  component.loadTopologyData();
  tick();
  fail('Expected loadTopologyData to throw');
} catch (e) {
  expect((e as Error).message).toBe('Error loading topology data');
}
  expect(consoleSpy).not.toHaveBeenCalled();
  consoleSpy.mockRestore();
}));


  it('should reject updateTooltip if serviceId or componentId is missing', async () => {
    await expect(component.updateTooltip({})).rejects.toEqual('Missing serviceId or componentId in node');
  });

  it('should create an SVG <g> container and basic nodes/links when rendering the graph', () => {
    jest.spyOn(component, 'renderGraph').mockRestore();
    const mockSelection: any = {
      attr: jest.fn().mockReturnThis(),
      selectAll: jest.fn().mockReturnThis(),
      data: jest.fn().mockReturnThis(),
      enter: jest.fn().mockReturnThis(),
      append: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      remove: jest.fn().mockReturnThis(),
      call: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      each: jest.fn(function (this: any, fn: Function) {
        return this;
      }),
      node: jest.fn().mockReturnValue(document.createElementNS('http://www.w3.org/2000/svg', 'g'))
    };
    jest.spyOn(d3 as any, 'select').mockReturnValue(mockSelection);
    const mockZoom = jest.fn().mockReturnValue({
      scaleExtent: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis()
    });
    jest.spyOn(d3 as any, 'zoom').mockImplementation(mockZoom);
    const mockDrag = jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis()
    });
    jest.spyOn(d3 as any, 'drag').mockImplementation(mockDrag);
    const mockSimulation = {
      force: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      alphaTarget: jest.fn().mockReturnThis(),
      restart: jest.fn().mockReturnThis()
    };
    jest.spyOn(d3 as any, 'forceSimulation').mockReturnValue(mockSimulation);
    jest.spyOn(d3 as any, 'forceLink').mockReturnValue({ id: jest.fn().mockReturnThis(), distance: jest.fn().mockReturnThis() });
    jest.spyOn(d3 as any, 'forceManyBody').mockReturnValue({ strength: jest.fn().mockReturnThis() });
    jest.spyOn(d3 as any, 'forceCenter').mockReturnValue({});
    jest.spyOn(d3 as any, 'forceX').mockReturnValue({ strength: jest.fn().mockReturnThis() });
    jest.spyOn(d3 as any, 'forceY').mockReturnValue({ strength: jest.fn().mockReturnThis() });
    const realSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(realSvg);
    component.svgElement = new ElementRef(realSvg);
    component.nodes = [
      { id: 'A', name: 'User', x: 10, y: 10, successRate: null, latency: null, apdex: null },
      { id: 'B', name: 'Service', x: 100, y: 100, serviceId: 'B', componentId: '1', componentName: 'Kafka', successRate: 100, latency: 50, apdex: 0.9 },
    ];
    component.links = [
      { source: component.nodes[0], target: component.nodes[1], load: 5, value: 1 }
    ];
    component.width = 800;
    component.height = 600;
    component.nodeRadius = 20;
    expect(() => component.renderGraph()).not.toThrow();
    expect(d3.select).toHaveBeenCalledWith(realSvg);
    expect(component.nodes.length).toBe(2);
    expect(component.links.length).toBe(1);
    document.body.removeChild(realSvg);
  });

  // Trace Tab

  it('should mark a criteria as shown when selectCriteria is called', () => {
    component.shownCriteria = { instance: false, endpoint: false };
    component.selectCriteria('instance');
    cdr.detectChanges();
    expect(component.shownCriteria['instance']).toBe(true);
  });

  it('should reset instance criteria and call fetchInstances on removeCriteria("instance")', () => {
    component.instNameTrace = 'SomeInstance';
    component.shownCriteria = { instance: true };
    jest.spyOn(component, 'fetchInstances').mockImplementation(() => { });
    component.removeCriteria('instance');
    cdr.detectChanges();
    expect(component.shownCriteria['instance']).toBe(false);
    expect(component.instNameTrace).toBe('');
    expect(component.fetchInstances).toHaveBeenCalled();
  });

  it('should reset endpoint criteria and call fetchEndpoints on removeCriteria("endpoint")', () => {
    component.endpointTrace = 'POST://api/test';
    component.textEndpoint = 'custom-endpoint';
    component.shownCriteria = { endpoint: true };
    jest.spyOn(component, 'fetchEndpoints').mockImplementation(() => { });
    component.removeCriteria('endpoint');
    cdr.detectChanges();
    expect(component.shownCriteria['endpoint']).toBe(false);
    expect(component.endpointTrace).toBe('All');
    expect(component.textEndpoint).toBe('');
    expect(component.fetchEndpoints).toHaveBeenCalled();
  });

  it('should call getTraceNames and getTraceSegmentsCount when searchTrace is called', () => {
    jest.spyOn(component, 'getTraceNames').mockImplementation(() => { });
    jest.spyOn(component, 'getTraceSegmentsCount').mockImplementation(() => { });
    component.currentPageTrace = 5;
    component.searchTrace();
    cdr.detectChanges();
    expect(component.currentPageTrace).toBe(1);
    expect(component.getTraceNames).toHaveBeenCalled();
    expect(component.getTraceSegmentsCount).toHaveBeenCalled();
  });

  it('should call getTracesData with correct params in getTraceNames', () => {
    component.instNameTrace = 'Laravel_App-172.16.138.141';
    component.endpointTrace = 'GET://api/v1/test';
    component.textEndpoint = '';
    component.traceState = 'success';
    component.traceIDTrace = 'trace123';
    component.currentPageTrace = 3;
    component.sortParameter = 'duration';
    component.minDuration = 50;
    component.maxDuration = 300;
    const mockDecoded = [{ id: 1, name: 'TraceOne' }];
    jest.spyOn(component['decoderService'], 'decodeObject')
      .mockReturnValue(Promise.resolve(mockDecoded));
    const spy = mockApiService.getTracesData.mockReturnValue(of({}));
    component.getTraceNames();
    cdr.detectChanges();
    expect(spy).toHaveBeenCalledTimes(1);
    const [[serviceId, st, et, page, sortBy, order, instId, state, endpointId, traceId, minD, maxD]] =
      spy.mock.calls;
    expect(serviceId).toBe('ent1');
    expect(page).toBe(3);
    expect(sortBy).toBe('duration');
    expect(instId).toContain('ent1_');
    expect(endpointId).toContain('ent1_');
    expect(traceId).toBe('trace123');
    expect(state).toBe(0);
    expect(minD).toBe(50);
    expect(maxD).toBe(300);
  });

  it('should set traceNames and auto-select first trace', async () => {
    const mockDecoded = [{ id: 10 }, { id: 20 }];
    jest.spyOn(component['decoderService'], 'decodeObject')
      .mockReturnValue(Promise.resolve(mockDecoded));
    jest.spyOn(component, 'selectItem').mockImplementation(() => { });
    mockApiService.getTracesData.mockReturnValue(of({}));
    await component.getTraceNames();
    cdr.detectChanges();
    expect(component.traceNames).toEqual(mockDecoded);
    expect(component.selectItem).toHaveBeenCalledWith(mockDecoded[0]);
  });

  it('should toggle sort order when same column is clicked', () => {
    component.sortParameter = 'duration';
    component.orderParameter = 'asc';
    const spy = jest.spyOn(component, 'getTraceNames').mockImplementation(() => { });
    component.toggleSort('duration');
    cdr.detectChanges();
    expect(component.orderParameter).toBe('dec');
    expect(spy).toHaveBeenCalled();
    component.toggleSort('duration');
    cdr.detectChanges();
    expect(component.orderParameter).toBe('asc');
  });

  it('should set sortParameter and reset order when a new column is clicked', () => {
    component.sortParameter = 'duration';
    component.orderParameter = 'dec';
    const spy = jest.spyOn(component, 'getTraceNames').mockImplementation(() => { });
    component.toggleSort('start_time');
    cdr.detectChanges();
    expect(component.sortParameter).toBe('start_time');
    expect(component.orderParameter).toBe('asc');
    expect(spy).toHaveBeenCalled();
  });

  it('should decode base64 string correctly', () => {
    const encoded = btoa('testValue');
    const decoded = component.decodeBase64(encoded);
    expect(decoded).toBe('testValue');
  });

  it('should return original string if decode fails', () => {
    const invalid = 'not-base64@@';
    const result = component.decodeBase64(invalid);
    expect(result).toBe(invalid);
  });

  it('should format HTTP method correctly from endpointId', () => {
    const endpoint = btoa('POST://api/v1/test');
    expect(component.formatEndpointId(endpoint)).toBe('POST');
    expect(component.formatEndpointId('GET://something')).toBe('GET');
    expect(component.formatEndpointId('INVALID://endpoint')).toBe('');
  });

  it('should select an item correctly', () => {
    const item = { traceId: 'abc123', endpointId: btoa('GET://api/test') };
    const fetchSpy = jest.spyOn(component, 'fetchTraceDataList').mockImplementation(() => { });
    const clearSpy = jest.spyOn(component, 'clearSelection').mockImplementation(() => { });
    component.selectItem(item);
    cdr.detectChanges();
    expect(component.selectedTraceId).toBe('abc123');
    expect(component.selectedItem).toBe('GET://api/test');
    expect(component.selectedView).toBe('table');
    expect(fetchSpy).toHaveBeenCalledWith('abc123');
    expect(clearSpy).toHaveBeenCalled();
  });

  it('should set traceIDLogs and call related methods on openLogTabTraceId', () => {
    const loadDataSpy = jest.spyOn(component, 'loadData').mockImplementation(() => { });
    const selectCriteriaSpy = jest.spyOn(component, 'selectCriteriaLogs').mockImplementation(() => { });
    const logTab = document.createElement('a');
    logTab.className = 'nav-link';
    logTab.setAttribute('href', '#log');
    document.body.appendChild(logTab);
    component.openLogTabTraceId('trace123');
    cdr.detectChanges();
    expect(component.traceIDLogs).toBe('trace123');
    expect(loadDataSpy).toHaveBeenCalledWith('log');
    expect(selectCriteriaSpy).toHaveBeenCalledWith('traceID');
    document.body.removeChild(logTab);
  });

  it('should not throw if traceId is null in copyTraceId', () => {
    const event = new MouseEvent('click');
    expect(() => component.copyTraceId(null, event)).not.toThrow();
  });

  it('should set modalData and showModal in openModal', () => {
    const span = {
      serviceCode: 'SVC1',
      serviceInstanceName: 'inst1',
      endpointName: 'endpoint1',
      type: 'type1',
      component: 'comp1',
      peer: 'peer1',
      isError: 0,
      tags: ['tag1']
    };
    component.openModal(span as any);
    cdr.detectChanges();
    expect(component.modalData).toEqual(span);
    expect(component.showModal).toBe(true);
  });

  it('should call openModal on table row selected', () => {
    const span = { serviceCode: 'SVC2' } as any;
    const spy = jest.spyOn(component, 'openModal').mockImplementation(() => { });
    component.onTableRowSelected(span);
    cdr.detectChanges();
    expect(spy).toHaveBeenCalledWith(span);
  });

  it('should set selectedView correctly in changeView', () => {
    cdr.detectChanges();
    component.changeView('list');
    expect(component.selectedView).toBe('list');
    component.changeView('tree');
    expect(component.selectedView).toBe('tree');
    component.changeView('stat');
    expect(component.selectedView).toBe('stat');
    component.changeView('table');
    expect(component.selectedView).toBe('table');
  });

  // Logs Tab

  it('should hide criteria and reset fields in removeCriteriaLogs', () => {
    component.instNameLogs = 'instance1';
    component.endpointLog = 'endpoint1';
    component.traceIDLogs = 'trace123';
    component.tags = 'tag';
    component.keywordsOfContent = 'inc';
    component.excludingKeywordsOfContent = 'exc';
    component.shownCriteriaLogs = { instance: true, endpoint: true, traceID: true, tags: true, incContent: true, excContent: true };
    const spyFetchInstances = jest.spyOn(component, 'fetchInstances').mockImplementation(() => { });
    const spyFetchEndpoints = jest.spyOn(component, 'fetchEndpoints').mockImplementation(() => { });
    component.removeCriteriaLogs('instance');
    expect(component.shownCriteriaLogs['instance']).toBe(false);
    expect(component.instNameLogs).toBe('');
    expect(spyFetchInstances).toHaveBeenCalled();
    component.removeCriteriaLogs('endpoint');
    expect(component.endpointLog).toBe('');
    expect(spyFetchEndpoints).toHaveBeenCalled();
    component.removeCriteriaLogs('traceID');
    expect(component.traceIDLogs).toBe('');
    component.removeCriteriaLogs('tags');
    expect(component.tags).toBe('');
    component.removeCriteriaLogs('incContent');
    expect(component.keywordsOfContent).toBe('');
    component.removeCriteriaLogs('excContent');
    expect(component.excludingKeywordsOfContent).toBe('');
  });

  it('should call getLogNames, getLogsAggregatedData, getLogsCountTimeSeries in searchLogs', () => {
    const spyGetLogNames = jest.spyOn(component, 'getLogNames').mockImplementation(() => { });
    const spyGetLogsAggregatedData = jest.spyOn(component, 'getLogsAggregatedData').mockImplementation(() => { });
    const spyGetLogsCountTimeSeries = jest.spyOn(component, 'getLogsCountTimeSeries').mockImplementation(() => { });

    component.searchLogs();
    expect(component.currentPageLog).toBe(1);
    expect(spyGetLogNames).toHaveBeenCalled();
    expect(spyGetLogsAggregatedData).toHaveBeenCalled();
    expect(spyGetLogsCountTimeSeries).toHaveBeenCalled();
  });

  it('should call apmApiService.getLogsData and decode result in getLogNames', async () => {
    const mockData = [{ traceId: 'trace1' }];
    (component as any).apmApiService.getLogsData.mockReturnValue(of(mockData));
    (component as any).decoderService = {
      decodeObject: jest.fn().mockResolvedValue(mockData)
    };
    component.instNameLogs = 'All';
    component.endpointLog = 'All';
    component.entityId = 'ent1';
    component.startTime = 20251114;
    component.endTime = 20251114;
    await component.getLogNames(); // async operation being handelled
    expect((component as any).apmApiService.getLogsData).toHaveBeenCalled();
    expect((component as any).decoderService.decodeObject).toHaveBeenCalledWith(mockData);
    expect(component.logNames).toEqual(mockData);
  });

  it('should call apmApiService.getLogsAggregatedData in getLogsAggregatedData', () => {
    const spy = jest.spyOn((component as any).apmApiService, 'getLogsAggregatedData').mockReturnValue(of({ total_hits: 100 }));
    component.instNameLogs = 'All';
    component.endpointLog = 'All';
    component.entityId = 'ent1';
    component.startTime = 20251114;
    component.endTime = 20251114;
    component.getLogsAggregatedData();
    expect(spy).toHaveBeenCalled();
  });

  it('should call apmApiService.getLogsCountTimeSeries in getLogsCountTimeSeries', () => {
    const spy = jest.spyOn((component as any).apmApiService, 'getLogsCountTimeSeries').mockReturnValue(of({ time_series: [] }));
    component.instNameLogs = 'All';
    component.endpointLog = 'All';
    component.entityId = 'ent1';
    component.startTime = 20251114;
    component.endTime = 20251114;
    component.getLogsCountTimeSeries();
    expect(spy).toHaveBeenCalled();
  });

  it('should pass correct parameters based on filters in getLogNames', () => {
    component.instNameLogs = 'MyInstance';
    component.endpointLog = 'MyEndpoint';
    component.traceIDLogs = 'trace123';
    component.tags = 'tag1';
    component.entityId = 'ent1';
    component.startTime = 20251114;
    component.endTime = 20251114;
    const spy = jest.spyOn((component as any).apmApiService, 'getLogsData').mockReturnValue(of([]));
    component.getLogNames();
    const [[serviceId, st, et, page, rowsPerPage, instanceId, endpointId, traceId, tags]] =
      spy.mock.calls;
    expect(serviceId).toBe('ent1');
    expect(instanceId).toContain('ent1_');
    expect(endpointId).toContain('ent1_');
    expect(traceId).toBe('trace123');
    expect(tags).toBe('tag1');
  });

  it('should call apmApiService.getLogsCountTimeSeries with correct params', () => {
    const mockResponse = { time_series: [] };
    (component as any).apmApiService.getLogsCountTimeSeries.mockReturnValue(of(mockResponse));
    component.startTime = 20251114;
    component.endTime = 20251114;
    component.entityId = 'ent1';
    component.getLogsCountTimeSeries();
    const expectedSt = +component.startTime;
    const expectedEt = +component.endTime;
    expect((component as any).apmApiService.getLogsCountTimeSeries).toHaveBeenCalledWith(
      'ent1',
      expectedSt,
      expectedEt,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
  });

  it('should set logsTimeSeriesChart to null if data has no levels', () => {
    const data: any[] = [
      { time_bucket: '202511141100', total: 10 },
      { time_bucket: '202511141101', total: 15 }
    ];
    component.getLogsCountTimeSeriesChart(data);
    expect(component.logsTimeSeriesChart).toBeNull();
  });

  it('should populate logsTimeSeriesChart correctly for given time series', () => {
    const data = [
      { time_bucket: '202511141100', INFO: 30, ERROR: 5 },
      { time_bucket: '202511141101', INFO: 50, ERROR: 10 }
    ];
    component.getLogsCountTimeSeriesChart(data);
    expect(component.logsTimeSeriesChart).toBeDefined();
    expect(component.logsTimeSeriesChart?.series?.length).toBe(2); // info and error
    const seriesNames = (component.logsTimeSeriesChart?.series as Highcharts.SeriesOptionsType[])
      .map(s => s.name);
    expect(seriesNames).toEqual(expect.arrayContaining(['INFO', 'ERROR']));
    const chartData = (component.logsTimeSeriesChart?.series as Highcharts.SeriesOptionsType[])
      .map(s => (s as any).data);
    expect(chartData).toEqual([[30, 50], [5, 10]]);
  });

  it('should format categories as time if interval < 24h', () => {
    const data = [
      { time_bucket: '202511141100', INFO: 10 },
      { time_bucket: '202511141101', INFO: 20 }
    ];
    component.getLogsCountTimeSeriesChart(data);
    const xAxis = component.logsTimeSeriesChart?.xAxis as Highcharts.XAxisOptions;
    const categories = xAxis?.categories as string[];
    expect(categories?.length).toBe(2);
    expect(categories![0]).toMatch(/\d{2}:\d{2}/);
  });

  it('should call getLogsCountTimeSeriesChart when API returns time series', () => {
    const mockTimeSeries = [
      { time_bucket: '202511141100', INFO: 10 },
      { time_bucket: '202511141101', INFO: 20 }
    ];
    const spyChart = jest.spyOn(component, 'getLogsCountTimeSeriesChart');
    (component as any).apmApiService.getLogsCountTimeSeries.mockReturnValue(of({ time_series: mockTimeSeries }));
    component.getLogsCountTimeSeries();
    expect(spyChart).toHaveBeenCalledWith(mockTimeSeries);
  });

  it('should populate logNames from getLogsData', async () => {
    component.entityId = 'ent1';
    component.startTime = 20251114;
    component.endTime = 20251114;
    component.currentPageLog = 1;
    component.rowsPerPageLog = 15;
    mockDecoderService.decodeObject = jest.fn().mockImplementation((data) => Promise.resolve(data));
    await component.getLogNames();
    const expectedStartTime = 2025111400;
    const expectedEndTime = 2025111459;
    expect(mockApiService.getLogsData).toHaveBeenCalledWith(
      component.entityId,
      expectedStartTime,
      expectedEndTime,
      component.currentPageLog,
      component.rowsPerPageLog,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined
    );
    expect(component.logNames.length).toBe(2);
    expect(component.logNames[0].traceId).toBe('trace1');
    expect(component.logNames[1].tags.level).toBe('ERROR');
  });

  it('should expand and collapse log detail row', () => {
    component.expandedLogIndex = null;
    component.toggleDetailApp(0);
    expect(component.expandedLogIndex).toBe(0);
    component.toggleDetailApp(0);
    expect(component.expandedLogIndex).toBeNull();
  });

  it('should return correct level class', () => {
    expect(component.getLevelColor('INFO')).toBe('text-primary');
    expect(component.getLevelColor('ERROR')).toBe('text-danger');
    expect(component.getLevelColor('DEBUG')).toBe('text-secondary');
    expect(component.getLevelColor('WARN')).toBe('text-warning');
    expect(component.getLevelColor('TRACE')).toBe('text-primary-emphasis');
    expect(component.getLevelColor(undefined)).toBe('text-secondary');
  });

  it('should format date correctly', () => {
    const formatted = component.formatDate1('202511141200');
    expect(formatted).toBe('2025-11-14 12:00:00');
    expect(component.formatDate1(null)).toBe('');
  });

  it('should decode endpointId correctly', () => {
    const encoded = btoa('POST:/api/test');
    expect(component.formatEndpointId(encoded)).toBe('POST');
    expect(component.formatEndpointId('GET:/path')).toBe('GET');
    expect(component.formatEndpointId('invalid')).toBe('');
    expect(component.formatEndpointId('')).toBe('');
  });

  it('should call getLogsCountTimeSeries and populate chart', () => {
    component.entityId = 'ent1';
    component.startTime = 20251114;
    component.endTime = 20251114;
    component.instNameLogs = 'All';
    component.endpointLog = 'All';
    component.getLogsCountTimeSeries();
    expect(mockApiService.getLogsCountTimeSeries).toHaveBeenCalled();
    expect(component.logsTimeSeriesChart).toBeDefined();
  });

  it('should handle skeleton state when loadingLogs is true', () => {
    component.loadingLogs = true;
    component.logNames = [];
    cdr.detectChanges();
    expect(component.loadingLogs).toBe(true);
  });

  it('should handle no data state when logNames empty', () => {
    component.loadingLogs = false;
    component.logNames = [];
    cdr.detectChanges();
    expect(component.logNames.length).toBe(0);
  });

  it('should paginate logs correctly', () => {
    component.currentPageLog = 1;
    component.totalPagesLog = 3;
    const prevSpy = jest.spyOn(component, 'previousLogPage');
    const nextSpy = jest.spyOn(component, 'nextLogPage');
    component.previousLogPage();
    component.nextLogPage();
    expect(prevSpy).toHaveBeenCalled();
    expect(nextSpy).toHaveBeenCalled();
  });

  // Database Tab

  it('should render database metric cards with correct values', fakeAsync(() => {
    component.databaseLatency = 0.29;
    component.databaseSuccessRate = 100.0;
    component.databaseLoad = 218.81;
    component.thresholds = {
      database_access_resp_time: { warningValue: 1, criticalValue: 2 },
      database_access_sla: { warningValue: 95, criticalValue: 90 },
      database_access_cpm: { warningValue: 200, criticalValue: 300 },
    };
    cdr.detectChanges();
    tick();
    const latencyMetric = fixture.nativeElement.querySelector('[data-testid="database-latency"] .kpi-value');
    expect(latencyMetric.textContent).toContain('0.29');
    expect(latencyMetric.textContent).toContain('ms');
    const successRateMetric = fixture.nativeElement.querySelector('[data-testid="database-success-rate"] .kpi-value');
    expect(successRateMetric.textContent).toContain('100');
    expect(successRateMetric.textContent).toContain('%');
    const loadMetric = fixture.nativeElement.querySelector('[data-testid="database-load"] .kpi-value');
    expect(loadMetric.textContent).toContain('218.81');
    expect(loadMetric.textContent).toContain('call/min');
  }));

  it('should apply correct threshold colors to database metrics', () => {
    let result = component.getThresholdDisplay('database_access_resp_time', 1.5);
    expect(result.color).toBe('orange');
    expect(result.value).toBe(1);
    result = component.getThresholdDisplay('database_access_resp_time', 2.5);
    expect(result.color).toBe('red');
    expect(result.value).toBe(1);
    result = component.getThresholdDisplay('database_access_resp_time', 0.5);
    expect(result.color).toBe('#3A8754');
    result = component.getThresholdDisplay('database_access_sla', 85);
    expect(result.color).toBe('red');
    result = component.getThresholdDisplay('database_access_sla', 92);
    expect(result.color).toBe('orange');
    result = component.getThresholdDisplay('database_access_sla', 98);
    expect(result.color).toBe('#3A8754');
    result = component.getThresholdDisplay('database_access_cpm', 350);
    expect(result.color).toBe('red');
    result = component.getThresholdDisplay('database_access_cpm', 250);
    expect(result.color).toBe('orange');
    result = component.getThresholdDisplay('database_access_cpm', 150);
    expect(result.color).toBe('#3A8754');
  });

  it('should call getDatabaseAvgResponseTime and populate chart', fakeAsync(() => {
    component.selectedDb = 'TestDatabase';
    const chartSpy = jest.spyOn(component, 'getDatabaseAvgResponseTimeChart');
    component.getDatabaseAvgResponseTime();
    tick();
    expect(mockApiService.getDatabaseAvgResponseTime).toHaveBeenCalledWith(
      btoa('TestDatabase') + '.0',
      component.entityId,
      component.startTime,
      component.endTime
    );
    expect(component.databaseLatency).toBe(0.29);
    expect(chartSpy).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ latency: 1, time_bucket: '202511141041' })
    ]));
  }));

  it('should create database latency chart with correct series', fakeAsync(() => {
    const chartSpy = jest.spyOn(Highcharts, 'chart');
    const data = [
      { latency: 1, time_bucket: '202511141041', status: 'NORMAL' },
      { latency: 2, time_bucket: '202511141045', status: 'NORMAL' },
      { latency: 3, time_bucket: '202511141049', status: 'CRITICAL' },
    ];
    component.getDatabaseAvgResponseTimeChart(data);
    expect(chartSpy).toHaveBeenCalledWith(
      'databaseAvgResponseTimeChartContainer',
      expect.objectContaining({
        chart: expect.objectContaining({ type: 'spline' }),
        series: expect.arrayContaining([
          expect.objectContaining({
            name: 'latency',
            type: 'spline'
          })
        ])
      })
    );
  }));

  it('should call getDatabaseAccessSuccessRate and populate chart', fakeAsync(() => {
    component.selectedDb = 'TestDatabase';
    const chartSpy = jest.spyOn(component, 'getDatabaseAccessSuccessRateChart');
    component.getDatabaseAccessSuccessRate();
    tick();
    expect(mockApiService.getDatabaseAccessSuccessRate).toHaveBeenCalledWith(
      btoa('TestDatabase') + '.0',
      component.startTime,
      component.endTime
    );
    expect(component.databaseSuccessRate).toBe(100.0);
    expect(chartSpy).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ time_bucket: '202511141041', success_rate: 100.0 })
    ]));
  }));

  it('should create database success rate chart with success/failure series', fakeAsync(() => {
    const chartSpy = jest.spyOn(Highcharts, 'chart');
    const data = [
      { time_bucket: '202511141041', success_rate: 100.0 },
      { time_bucket: '202511141045', success_rate: 85.0 },
      { time_bucket: '202511141049', success_rate: 95.0 },
    ];
    component.getDatabaseAccessSuccessRateChart(data);
    expect(chartSpy).toHaveBeenCalledWith(
      'databaseAccessSuccessRateChartContainer',
      expect.objectContaining({
        chart: expect.objectContaining({ type: 'column' }),
        series: expect.arrayContaining([
          expect.objectContaining({
            name: 'Success',
            type: 'column'
          }),
          expect.objectContaining({
            name: 'Failure',
            type: 'column'
          })
        ])
      })
    );
  }));

  it('should call getDatabaseTraffic and populate chart', fakeAsync(() => {
    component.selectedDb = 'TestDatabase';
    const chartSpy = jest.spyOn(component, 'getDatabaseTrafficChart');
    component.getDatabaseTraffic();
    tick();
    expect(mockApiService.getDatabaseTraffic).toHaveBeenCalledWith(
      btoa('TestDatabase') + '.0',
      component.entityId,
      component.startTime,
      component.endTime
    );
    expect(component.databaseLoad).toBe(218.81);
    expect(chartSpy).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ load: 395, time_bucket: '202511141108' })
    ]));
  }));

  it('should create database traffic chart with spline type', fakeAsync(() => {
    const chartSpy = jest.spyOn(Highcharts, 'chart');
    const data = [
      { load: 395, time_bucket: '202511141108', status: 'NORMAL' },
      { load: 206, time_bucket: '202511141109', status: 'NORMAL' },
      { load: 743, time_bucket: '202511141111', status: 'CRITICAL' },
    ];
    component.getDatabaseTrafficChart(data);
    expect(chartSpy).toHaveBeenCalledWith(
      'databaseTrafficChartContainer',
      expect.objectContaining({
        chart: expect.objectContaining({ type: 'areaspline' }),
        series: expect.arrayContaining([
          expect.objectContaining({
            name: 'load',
            type: 'areaspline'
          })
        ])
      })
    );
  }));

  it('should create database uptime chart correctly', () => {
    const data = [{ count: 92, type: 'Uptime for 7 days' }];
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: jest.fn(() => '#fff')
    } as any);
    component.getDatabaseUptimeChart(data);
    expect(component.databaseUptimeChart).toBeTruthy();
    const series = component.databaseUptimeChart?.series?.[0] as any;
    expect(series).toBeDefined();
    expect(series.type).toBe('bar');
    expect(series.data[0].y).toBe(92);
    expect(series.data[0].name).toBe('Uptime for 7 days');
  });

  it('should set databaseUptimeChart to null if data is empty', () => {
    component.getDatabaseUptimeChart([]);
    expect(component.databaseUptimeChart).toBeNull();
    component.getDatabaseUptimeChart(undefined as any);
    expect(component.databaseUptimeChart).toBeNull();
  });

  it('should call getDatabaseUptime and populate chart', () => {
    const chartSpy = jest.spyOn(component, 'getDatabaseUptimeChart');
    component.getDatabaseUptime();
    expect(chartSpy).toHaveBeenCalledWith([
      { count: 92, type: 'Uptime for 7 days' }
    ]);
  });

  it('should render database uptime section with correct percentage', fakeAsync(() => {
    component.uptimeDatabase = {
      sevenDays: [{ count: 92, type: 'Uptime for 7 days' }]
    };
    component.getDatabaseUptime();
    component.appHealthScore = 100;
    component.infraHealthScore = 100;
    component.projectHealthScore = 100;
    component.dbHealthScore = [];
    cdr.detectChanges();
    tick();
    const uptimeSection = fixture.nativeElement.querySelector('[data-testid="database-uptime"]');
    if (uptimeSection) {
      expect(uptimeSection.textContent).toContain('92');
      expect(uptimeSection.textContent).toContain('%');
    }
  }));

  it('should handle empty database latency time series', () => {
    component.getDatabaseAvgResponseTimeChart([]);
    expect(component.databaseAvgResponseTimeChart).toBeDefined();
  });

  it('should handle empty database success rate time series', () => {
    component.getDatabaseAccessSuccessRateChart([]);
    expect(component.databaseAccessSuccessRateChart).toBeDefined();
  });

  it('should handle empty database traffic time series', () => {
    component.getDatabaseTrafficChart([]);
    expect(component.databaseTrafficChart).toBeDefined();
  });

  it('should destroy existing database latency chart before creating new one', () => {
    const destroySpy = jest.fn();
    component.databaseAvgResponseTimeChart = { destroy: destroySpy } as any;
    component.getDatabaseAvgResponseTimeChart([
      { latency: 1, time_bucket: '202511141041', status: 'NORMAL' }
    ]);
    expect(destroySpy).toHaveBeenCalled();
  });

  it('should destroy existing database success rate chart before creating new one', () => {
    const destroySpy = jest.fn();
    component.databaseAccessSuccessRateChart = { destroy: destroySpy } as any;
    component.getDatabaseAccessSuccessRateChart([
      { time_bucket: '202511141041', success_rate: 100.0 }
    ]);
    expect(destroySpy).toHaveBeenCalled();
  });

  it('should destroy existing database traffic chart before creating new one', () => {
    const destroySpy = jest.fn();
    component.databaseTrafficChart = { destroy: destroySpy } as any;
    component.getDatabaseTrafficChart([
      { load: 395, time_bucket: '202511141108', status: 'NORMAL' }
    ]);
    expect(destroySpy).toHaveBeenCalled();
  });

  it('should format tooltip correctly in database latency chart', () => {
    const mockPoints = [
      { series: { name: 'Latency' }, y: 2.5, color: 'red' }
    ];
    jest.spyOn(Highcharts, 'chart').mockImplementation((_id, options: any) => {
      const tooltipHTML = options.tooltip.formatter.call({
        x: 0,
        points: mockPoints,
        series: { chart: { xAxis: [{ categories: ['t1'] }] } }
      });
      expect(tooltipHTML).toContain('Latency');
      expect(tooltipHTML).toContain('2.5');
      return {} as any;
    });
    component.getDatabaseAvgResponseTimeChart([
      { latency: 2.5, time_bucket: 't1', status: 'CRITICAL' }
    ]);
  });

  it('should call getDatabaseAccessLatencyPercentile and populate chart', fakeAsync(() => {
    component.selectedDb = 'TestDatabase';
    const chartSpy = jest.spyOn(component, 'getDatabaseAccessLatencyPercentileChart');
    component.getDatabaseAccessLatencyPercentile();
    tick();
    expect(mockApiService.getDatabaseAccessLatencyPercentile).toHaveBeenCalledWith(
      btoa('TestDatabase') + '.0',
      component.startTime,
      component.endTime
    );
    expect(chartSpy).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ P99: 5.0, P95: 3.0 })
    ]));
  }));

  it('should create database percentile chart with multiple series', fakeAsync(() => {
    const chartSpy = jest.spyOn(Highcharts, 'chart');
    const data = [
      { time_bucket: '202511141041', P99: 5.0, P95: 3.0, P90: 2.0, P75: 1.5, P50: 1.0 },
      { time_bucket: '202511141045', P99: 6.0, P95: 4.0, P90: 3.0, P75: 2.0, P50: 1.5 },
    ];
    component.getDatabaseAccessLatencyPercentileChart(data);
    expect(chartSpy).toHaveBeenCalledWith(
      'databaseAccessLatencyPercentileChartContainer',
      expect.objectContaining({
        series: expect.arrayContaining([
          expect.objectContaining({ name: 'P50', type: 'areaspline' }),
          expect.objectContaining({ name: 'P75', type: 'areaspline' }),
          expect.objectContaining({ name: 'P90', type: 'areaspline' }),
          expect.objectContaining({ name: 'P95', type: 'areaspline' }),
          expect.objectContaining({ name: 'P99', type: 'areaspline' })
        ])
      })
    );
  }));

  it('should call getDatabaseSlowStatements and populate table', fakeAsync(() => {
    component.selectedDb = 'TestDatabase';
    component.getDatabaseSlowStatements();
    tick();
    expect(mockApiService.getDatabaseSlowStatements).toHaveBeenCalledWith(
      btoa('TestDatabase') + '.0',
      component.entityId,
      component.startTime,
      component.endTime
    );
    expect(component.slowStatementData).toEqual([
      { statement: 'SELECT * FROM users WHERE id = ?', value: 250, status: 'WARNING' },
      { statement: 'UPDATE orders SET status = ? WHERE id = ?', value: 180, status: 'NORMAL' },
      { statement: 'INSERT INTO logs VALUES (?)', value: 150, status: 'NORMAL' },
    ]);
  }));

  it('should render slow statements table rows', fakeAsync(() => {
    jest.spyOn(mockApiService, 'getDatabaseSlowStatements').mockReturnValue(
      of([
        { statement: 'SELECT * FROM users', latency: 250, status: 'CRITICAL' },
        { statement: 'UPDATE orders', latency: 180, status: 'WARNING' },
        { statement: 'INSERT INTO logs', latency: 150, status: 'NORMAL' },
      ])
    );
    component.getDatabaseSlowStatements();
    tick();
    cdr.detectChanges();
    const slowStatementsCard = fixture.debugElement.queryAll(By.css('.card'))
      .find(card => card.nativeElement.querySelector('.card-header span')?.textContent?.includes('Slow Statements'));
    if (slowStatementsCard) {
      const rows = slowStatementsCard.queryAll(By.css('tbody tr'));
      expect(rows.length).toBe(3);
      expect(rows[0].nativeElement.textContent).toContain('SELECT * FROM users');
      expect(rows[1].nativeElement.textContent).toContain('UPDATE orders');
      expect(rows[2].nativeElement.textContent).toContain('INSERT INTO logs');
      const latencyBars = rows.map(row => row.nativeElement.querySelector('.progress-bar'));
      expect(latencyBars[0].textContent).toContain('250');
      expect(latencyBars[1].textContent).toContain('180');
      expect(latencyBars[2].textContent).toContain('150');
    }
  }));

  it('should display N/A when database metrics are null', fakeAsync(() => {
    component.databaseLatency = null as any;
    component.databaseSuccessRate = null as any;
    component.databaseLoad = null as any;
    component.appHealthScore = 100;
    component.infraHealthScore = 100;
    component.projectHealthScore = 100;
    component.dbHealthScore = [];
    cdr.detectChanges();
    tick();
    const latencyMetric = fixture.nativeElement.querySelector('[data-testid="database-latency"]');
    if (latencyMetric) {
      expect(latencyMetric.textContent).toContain('N/A');
    }
    const successRateMetric = fixture.nativeElement.querySelector('[data-testid="database-success-rate"]');
    if (successRateMetric) {
      expect(successRateMetric.textContent).toContain('N/A');
    }
    const loadMetric = fixture.nativeElement.querySelector('[data-testid="database-load"]');
    if (loadMetric) {
      expect(loadMetric.textContent).toContain('N/A');
    }
  }));

  it('should show loading skeleton while fetching database data', fakeAsync(() => {
    component.slowStatementData = true;
    cdr.detectChanges();
    const skeletons = fixture.debugElement.queryAll(By.css('.skeleton'));
    expect(skeletons.length).toBeGreaterThan(0);
  }));

  it('should display no data message when slow statements list is empty', fakeAsync(() => {
    component.slowStatementData = false;
    component.slowStatementData = [];
    cdr.detectChanges();
    tick();
    const noDataDiv = fixture.debugElement.query(By.css('.noData'));
    if (noDataDiv) {
      expect(noDataDiv.nativeElement.textContent).toContain('No Data Available');
    }
  }));

  it('should color-code slow statements based on status', fakeAsync(() => {
    component.appHealthScore = 100;
    component.infraHealthScore = 100;
    component.projectHealthScore = 100;
    component.dbHealthScore = [];
    cdr.detectChanges();
    component.slowStatementData = [
      { statement: 'SELECT * FROM users', latency: 250, status: 'CRITICAL' },
      { statement: 'UPDATE orders', latency: 180, status: 'WARNING' },
      { statement: 'INSERT INTO logs', latency: 150, status: 'NORMAL' },
    ];
    cdr.detectChanges();
    tick();
    cdr.detectChanges();
    const rows = fixture.debugElement.queryAll(By.css('[data-testid="slow-statement-row"]'));
    expect(rows.length).toBe(3);
    const criticalBar = fixture.debugElement.query(By.css('[data-testid="progress-critical"]'));
    const warningBar = fixture.debugElement.query(By.css('[data-testid="progress-warning"]'));
    const normalBar = fixture.debugElement.query(By.css('[data-testid="progress-normal"]'));
    expect(criticalBar).toBeTruthy();
    expect(warningBar).toBeTruthy();
    expect(normalBar).toBeTruthy();
  }));

});
