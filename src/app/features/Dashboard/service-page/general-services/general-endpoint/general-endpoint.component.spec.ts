import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { GeneralEndpointComponent } from './general-endpoint.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { catchError, of, throwError } from 'rxjs';
import type * as HighchartsType from 'highcharts';
import { ChangeDetectorRef, NO_ERRORS_SCHEMA } from '@angular/core';
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

// jest.mock('bootstrap', () => ({
//   Tab: jest.fn().mockImplementation(() => ({
//     show: jest.fn()
//   }))
// }));

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

describe('GeneralEndpointComponent', () => {
  let component: GeneralEndpointComponent;
  let fixture: ComponentFixture<GeneralEndpointComponent>;
  capturedChartOptions = null;
  let cdr: ChangeDetectorRef;
  let mockApiService: any;
  let mockDecoderService: any;

  const invalidInstanceResponse = {
    Laravel_App: ["", "   ", 123]
  };
  beforeEach(async () => {
    mockApiService = {
      getServiceInstanceNames: jest.fn().mockReturnValue(of(invalidInstanceResponse)),
      getEndpointSuccessRate: jest.fn().mockReturnValue(of({
        successRate: 100.0,
        successRateTimeSeries: [
          {
            "time_bucket": "202511201033",
            "success_rate": 100.0
          },
          {
            "time_bucket": "202511201034",
            "success_rate": 100.0
          },
          {
            "time_bucket": "202511201035",
            "success_rate": 100.0
          },
          {
            "time_bucket": "202511201036",
            "success_rate": 100.0
          },
        ]
      })),
      getEndpointLoad: jest.fn().mockReturnValue(of({
        load: 100.0,
        loadTimeSeries: [
          {
            "load": 6,
            "time_bucket": "202511201055",
            "status": "NORMAL"
          },
          {
            "load": 6,
            "time_bucket": "202511201056",
            "status": "NORMAL"
          },
        ]
      })),
      getEndpointAvgResponseTime: jest.fn().mockReturnValue(of({
        latency: 1747.63,
        latencyTimeSeries: [
          {
            "latency": 1609,
            "time_bucket": "202511201348",
            "status": "NORMAL"
          },
          {
            "latency": 1579,
            "time_bucket": "202511201349",
            "status": "NORMAL"
          },
          {
            "latency": 1554,
            "time_bucket": "202511201350",
            "status": "NORMAL"
          },
        ]
      })),
      getEndpointResponseTimePercentile: jest.fn().mockReturnValue(of([
        {
          "P99": 3370.0,
          "P90": 3110.0,
          "time_bucket": "202511201415",
          "P50": 0.0,
          "P95": 3110.0,
          "P75": 3060.0
        },
        {
          "P99": 3630.0,
          "P90": 3560.0,
          "time_bucket": "202511201416",
          "P50": 0.0,
          "P95": 3560.0,
          "P75": 3130.0
        },
      ])),
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
      getTraceSegmentsCount: jest.fn().mockReturnValue(of(78260)),
      getLogsData: jest.fn().mockReturnValue(of([
        { traceId: 'trace1', instance: 'Inst1', endpointId: 'EP1', content: 'content1', tags: { level: 'INFO' } },
        { traceId: 'trace2', instance: 'Inst2', endpointId: 'EP2', content: 'content2', tags: { level: 'ERROR' } },
      ])),
      getLogsAggregatedData: jest.fn().mockReturnValue(of({ total_hits: 2 })),
      getLogsAggregatedData2: jest.fn().mockReturnValue(of({ total_hits: 2 })),
      getLogsCountTimeSeries: jest.fn().mockReturnValue(of({
        time_series: [
          { total: 1, time_bucket: '202511141100', INFO: 1 },
          { total: 1, time_bucket: '202511141101', INFO: 1 }
        ]
      })),
      getEndpoint: jest.fn(),
    };
    mockDecoderService = {
      decodeObject: jest.fn().mockImplementation((data: any) => Promise.resolve(data))
    };
    (window as any).bootstrap = {
      Tooltip: jest.fn().mockImplementation(function (this: any, element: any, options?: any) {
        return {
          dispose: jest.fn()
        };
      })
    };
    await TestBed.configureTestingModule({
      imports: [GeneralEndpointComponent, HttpClientTestingModule],
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

    fixture = TestBed.createComponent(GeneralEndpointComponent);
    component = fixture.componentInstance;
    component.entityEndpointId = '123';
    component.startTime = Date.now();
    component.endTime = Date.now();
    // component.size = 10;

    component.thresholds = {
      service_cpm: {
        criticalValue: 100,
        warningValue: 50,
        avgBaseline: 10
      },
      service_sla: { criticalValue: 70, warningValue: 85, avgBaseline: 90 },
      service_resp_time: { criticalValue: 500, warningValue: 100, avgBaseline: 300 },
    };
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

  // Metric Card

  it('should render metric cards with correct Success Rate, Load and Latency values', fakeAsync(() => {
    mockApiService.getEndpointSuccessRate = jest.fn().mockReturnValue(of({
      successRate: 100.0,
      successRateTimeSeries: []
    }));
    mockApiService.getEndpointLoad = jest.fn().mockReturnValue(of({
      load: 6.0,
      loadTimeSeries: []
    }));
    mockApiService.getEndpointAvgResponseTime = jest.fn().mockReturnValue(of({
      latency: 1729.61,
      latencyTimeSeries: []
    }));
    jest.spyOn(component, 'initialize_EndpointSuccessRate_graph').mockImplementation(() => { });
    jest.spyOn(component, 'initialize_EndpointLoad_graph').mockImplementation(() => { });
    jest.spyOn(component, 'initialize_EndpointAvgResponseTime_graph').mockImplementation(() => { });
    component.getEndpointSuccessRate();
    component.getEndpointLoad();
    component.getEndpointAvgResponseTime();
    cdr.detectChanges();
    tick();
    cdr.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('100');
    expect(compiled.textContent).toContain('%');
    expect(compiled.textContent).toContain('6');
    expect(compiled.textContent).toContain('call/min');
    expect(compiled.textContent).toContain('1729.61');
    expect(compiled.textContent).toContain('ms');
  }));

  it('should display N/A when successRate, loadValue or latencyValue are null', fakeAsync(() => {
    component.successRate = null;
    component.loadValue = null;
    component.latencyValue = null;
    cdr.detectChanges();
    tick();
    cdr.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('N/A');
    expect(compiled.textContent).toContain('N/A');
    expect(compiled.textContent).toContain('N/A');
  }));

  it('should call API methods and assign successRate, loadValue & latencyValue properly', fakeAsync(() => {
    const successSpy = jest.fn().mockReturnValue(of({
      successRate: 100,
      successRateTimeSeries: []
    }));
    const loadSpy = jest.fn().mockReturnValue(of({
      load: 6,
      loadTimeSeries: []
    }));
    const latencySpy = jest.fn().mockReturnValue(of({
      latency: 1729.61,
      latencyTimeSeries: []
    }));
    mockApiService.getEndpointSuccessRate = successSpy;
    mockApiService.getEndpointLoad = loadSpy;
    mockApiService.getEndpointAvgResponseTime = latencySpy;
    jest.spyOn(component, 'initialize_EndpointSuccessRate_graph').mockImplementation(() => { });
    jest.spyOn(component, 'initialize_EndpointLoad_graph').mockImplementation(() => { });
    jest.spyOn(component, 'initialize_EndpointAvgResponseTime_graph').mockImplementation(() => { });
    component.getEndpointSuccessRate();
    component.getEndpointLoad();
    component.getEndpointAvgResponseTime();
    tick();
    expect(component.successRate).toBe(100);
    expect(component.loadValue).toBe(6);
    expect(component.latencyValue).toBe(1729.61);
    expect(successSpy).toHaveBeenCalled();
    expect(loadSpy).toHaveBeenCalled();
    expect(latencySpy).toHaveBeenCalled();
  }));

  // Charts

  it('should call getEndpointSuccessRate API and initialize chart with correct data', fakeAsync(() => {
    component.entityEndpointId = '123';
    component.startTime = 0;
    component.endTime = 999999;
    mockApiService.getEndpointSuccessRate = jest.fn().mockReturnValue(
      of({
        successRate: 100.0,
        successRateTimeSeries: [
          { time_bucket: '202511201033', success_rate: 100.0 },
          { time_bucket: '202511201034', success_rate: 100.0 },
        ]
      })
    );
    jest.spyOn(component, 'initialize_EndpointSuccessRate_graph').mockImplementation(() => { });
    component.getEndpointSuccessRate();
    tick();
    expect(mockApiService.getEndpointSuccessRate)
      .toHaveBeenCalledWith('123', 0, 999999);
    expect(component.successRate).toBe(100.0);
    expect(component.initialize_EndpointSuccessRate_graph).toHaveBeenCalled();
  }));

  it('should handle empty successRateTimeSeries gracefully and destroy existing chart', fakeAsync(() => {
    mockApiService.getEndpointSuccessRate = jest.fn().mockReturnValue(
      of({
        successRate: 100,
        successRateTimeSeries: []
      })
    );
    component.EndpointSuccessRateChart = mockChartInstance;
    const destroySpy = jest.spyOn(mockChartInstance, 'destroy');
    component.getEndpointSuccessRate();
    tick();
    expect(destroySpy).toHaveBeenCalled();
    expect(component.EndpointSuccessRateChart).toBeNull();
  }));

  it('should update successRate properly when API returns data', fakeAsync(() => {
    mockApiService.getEndpointSuccessRate = jest.fn().mockReturnValue(
      of({
        successRate: 100.0,
        successRateTimeSeries: [
          { time_bucket: '202511201033', success_rate: 100.0 }
        ]
      })
    );
    jest.spyOn(component, 'initialize_EndpointSuccessRate_graph').mockImplementation(() => { });
    component.getEndpointSuccessRate();
    tick();
    expect(component.successRate).toBe(100.0);
  }));

  it('should initialize chart with correct series and xAxis categories', fakeAsync(() => {
    component.entityEndpointId = '123';
    component.startTime = 0;
    component.endTime = 999999;
    component.parseTimeBucket = jest.fn().mockImplementation(() => {
      return new Date(2025, 10, 20, 10, 33);
    });
    const parseMock = component.parseTimeBucket as jest.Mock;
    component.charts = [];
    component.getEndpointSuccessRate();
    cdr.detectChanges();
    tick();
    cdr.detectChanges();
    expect(component.EndpointSuccessRateChart).toBeDefined();
    const chartMock = (Highcharts.chart as unknown) as jest.Mock;
    expect(chartMock).toBeDefined();
    expect(chartMock.mock.calls.length).toBeGreaterThan(0);
    const lastCallIndex = chartMock.mock.calls.length - 1;
    const options = chartMock.mock.calls[lastCallIndex][1];
    expect(options).toBeDefined();
    expect(options.series).toBeDefined();
    expect(options.series.length).toBe(2);
    expect(options.series[0].name).toBe('Failure');
    expect(options.series[1].name).toBe('Success');
    expect(options.xAxis.categories.length).toBe((component.parseTimeBucket as jest.Mock).mock.calls.length);
  }));

  it('should call getEndpointLoad API and initialize chart with correct data', fakeAsync(() => {
    component.entityEndpointId = '123';
    component.startTime = 0;
    component.endTime = 999999;
    component.getEndpointLoad();
    jest.spyOn(component, 'initialize_EndpointLoad_graph').mockImplementation(() => { });
    component.getEndpointLoad();
    tick();
    expect(mockApiService.getEndpointLoad)
      .toHaveBeenCalledWith('123', 0, 999999);
    expect(component.loadValue).toBe(100.0);
    expect(component.initialize_EndpointLoad_graph).toHaveBeenCalled();
  }));

  it('should handle empty loadTimeSeries gracefully and destroy existing chart', fakeAsync(() => {
    mockApiService.getEndpointLoad = jest.fn().mockReturnValue(
      of({
        load: 6.0,
        loadTimeSeries: []
      })
    );
    component.EndpointLoadChart = mockChartInstance;
    const destroySpy = jest.spyOn(mockChartInstance, 'destroy');
    component.getEndpointLoad();
    tick();
    expect(destroySpy).toHaveBeenCalled();
    expect(component.EndpointLoadChart).toBeNull();
  }));

  it('should update loadValue properly when API returns data', fakeAsync(() => {
    mockApiService.getEndpointLoad = jest.fn().mockReturnValue(
      of({
        load: 6.0,
        loadTimeSeries: []
      })
    );
    jest.spyOn(component, 'initialize_EndpointLoad_graph').mockImplementation(() => { });
    component.getEndpointLoad();
    tick();
    expect(component.loadValue).toBe(6.0);
  }));

  it('should initialize chart with correct series and xAxis categories', fakeAsync(() => {
    component.entityEndpointId = '123';
    component.startTime = 0;
    component.endTime = 999999;
    component.parseTimeBucket = jest.fn().mockImplementation(() => {
      return new Date(2025, 10, 20, 10, 33);
    });
    const parseMock = component.parseTimeBucket as jest.Mock;
    component.charts = [];
    component.getEndpointLoad();
    cdr.detectChanges();
    tick();
    cdr.detectChanges();
    expect(component.EndpointLoadChart).toBeDefined();
    const chartMock = (Highcharts.chart as unknown) as jest.Mock;
    expect(chartMock).toBeDefined();
    expect(chartMock.mock.calls.length).toBeGreaterThan(0);
    const lastCallIndex = chartMock.mock.calls.length - 1;
    const options = chartMock.mock.calls[lastCallIndex][1];
    expect(options).toBeDefined();
    expect(options.series).toBeDefined();
    expect(options.series.length).toBe(1);
    expect(options.series[0].name).toBe('Load');
    expect(options.xAxis.categories.length).toBe((component.parseTimeBucket as jest.Mock).mock.calls.length);
  }));

  it('should call getEndpointAvgResponseTime API and initialize chart with correct data', fakeAsync(() => {
    component.entityEndpointId = '123';
    component.startTime = 0;
    component.endTime = 999999;
    component.getEndpointAvgResponseTime();
    jest.spyOn(component, 'initialize_EndpointAvgResponseTime_graph').mockImplementation(() => { });
    component.getEndpointAvgResponseTime();
    tick();
    expect(mockApiService.getEndpointAvgResponseTime)
      .toHaveBeenCalledWith('123', 0, 999999);
    expect(component.latencyValue).toBe(1747.63);
    expect(component.initialize_EndpointAvgResponseTime_graph).toHaveBeenCalled();
  }));

  it('should handle empty latencyTimeSeries gracefully and destroy existing chart', fakeAsync(() => {
    mockApiService.getEndpointAvgResponseTime = jest.fn().mockReturnValue(
      of({
        latency: 1747.63,
        latencyTimeSeries: []
      })
    );
    component.EndpointAvgResponseTimeChart = mockChartInstance;
    const destroySpy = jest.spyOn(mockChartInstance, 'destroy');
    component.getEndpointAvgResponseTime();
    tick();
    expect(destroySpy).toHaveBeenCalled();
    expect(component.EndpointAvgResponseTimeChart).toBeNull();
  }));

  it('should update latencyValue properly when API returns data', fakeAsync(() => {
    mockApiService.getEndpointAvgResponseTime = jest.fn().mockReturnValue(
      of({
        latency: 1747.63,
        latencyTimeSeries: []
      })
    );
    jest.spyOn(component, 'initialize_EndpointAvgResponseTime_graph').mockImplementation(() => { });
    component.getEndpointAvgResponseTime();
    tick();
    expect(component.latencyValue).toBe(1747.63);
  }));

  it('should initialize chart with correct series and xAxis categories', fakeAsync(() => {
    component.entityEndpointId = '123';
    component.startTime = 0;
    component.endTime = 999999;
    component.parseTimeBucket = jest.fn().mockImplementation(() => {
      return new Date(2025, 10, 20, 10, 33);
    });
    const parseMock = component.parseTimeBucket as jest.Mock;
    component.charts = [];
    component.getEndpointAvgResponseTime();
    cdr.detectChanges();
    tick();
    cdr.detectChanges();
    expect(component.EndpointAvgResponseTimeChart).toBeDefined();
    const chartMock = (Highcharts.chart as unknown) as jest.Mock;
    expect(chartMock).toBeDefined();
    expect(chartMock.mock.calls.length).toBeGreaterThan(0);
    const lastCallIndex = chartMock.mock.calls.length - 1;
    const options = chartMock.mock.calls[lastCallIndex][1];
    expect(options).toBeDefined();
    expect(options.series).toBeDefined();
    expect(options.series.length).toBe(2);
    expect(options.series[0].name).toBe('latency');
    expect(options.series[1].name).toBe('status');
    expect(options.xAxis.categories.length).toBe((component.parseTimeBucket as jest.Mock).mock.calls.length);
  }));

  it('should call getEndpointResponseTimePercentile API and initialize chart with correct data', fakeAsync(() => {
    component.entityEndpointId = '123';
    component.startTime = 0;
    component.endTime = 999999;
    component.getEndpointResponseTimePercentile();
    jest.spyOn(component, 'initialize_EndpointResponseTimePercentile_graph').mockImplementation(() => { });
    component.getEndpointResponseTimePercentile();
    tick();
    expect(mockApiService.getEndpointResponseTimePercentile)
      .toHaveBeenCalledWith('123', 0, 999999);
    expect(component.initialize_EndpointResponseTimePercentile_graph).toHaveBeenCalled();
  }));

  it('should handle empty data gracefully and destroy existing chart', fakeAsync(() => {
    mockApiService.getEndpointResponseTimePercentile = jest.fn().mockReturnValue(
      of([
        {}
      ]));
    component.EndpointResponseTimePercentileChart = mockChartInstance;
    const destroySpy = jest.spyOn(mockChartInstance, 'destroy');
    component.getEndpointResponseTimePercentile();
    tick();
    expect(destroySpy).toHaveBeenCalled();
    expect(component.EndpointResponseTimePercentileChart).toBeNull();
  }));

  it('should initialize chart with correct series and xAxis categories', fakeAsync(() => {
    component.entityEndpointId = '123';
    component.startTime = 0;
    component.endTime = 999999;
    component.parseTimeBucket = jest.fn().mockImplementation(() => {
      return new Date(2025, 10, 20, 10, 33);
    });
    const parseMock = component.parseTimeBucket as jest.Mock;
    component.charts = [];
    component.getEndpointResponseTimePercentile();
    cdr.detectChanges();
    tick();
    cdr.detectChanges();
    expect(component.EndpointResponseTimePercentileChart).toBeDefined();
    const chartMock = (Highcharts.chart as unknown) as jest.Mock;
    expect(chartMock).toBeDefined();
    expect(chartMock.mock.calls.length).toBeGreaterThan(0);
    const lastCallIndex = chartMock.mock.calls.length - 1;
    const options = chartMock.mock.calls[lastCallIndex][1];
    expect(options).toBeDefined();
    expect(options.series).toBeDefined();
    expect(options.series.length).toBe(5);
    expect(options.series[0].name).toBe('P99');
    expect(options.series[1].name).toBe('P90');
    expect(options.series[2].name).toBe('P50');
    expect(options.series[3].name).toBe('P95');
    expect(options.series[4].name).toBe('P75');
    expect(options.xAxis.categories.length).toBe((component.parseTimeBucket as jest.Mock).mock.calls.length);
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

    component.traceState = 'error';
    component.traceIDTrace = 'trace123';
    component.minDuration = 100;
    component.maxDuration = 500;

    // Only spy on EXISTING functions
    jest.spyOn(component, 'fetchInstances').mockImplementation(() => { });

    // STATUS
    component.removeCriteria('status');
    expect(component.shownCriteria['status']).toBe(false);
    expect(component.traceState).toBe('');

    // TRACE ID
    component.removeCriteria('traceID');
    expect(component.shownCriteria['traceID']).toBe(false);
    expect(component.traceIDTrace).toBe('');

    // MIN DURATION
    component.removeCriteria('minDuration');
    expect(component.shownCriteria['minDuration']).toBe(false);
    expect(component.minDuration).toBeNull();

    // MAX DURATION
    component.removeCriteria('maxDuration');
    expect(component.shownCriteria['maxDuration']).toBe(false);
    expect(component.maxDuration).toBeNull();

    // ENDPOINT — component does nothing except hide it
    component.removeCriteria('endpoint');
    expect(component.shownCriteria['endpoint']).toBe(false);
  });

  it('should call getTraceNames and select first item when search is called', fakeAsync(() => {
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
    mockDecoderService.decodeObject = jest.fn().mockResolvedValue(mockTraceData);
    jest.spyOn(component, 'getTraceNames');
    jest.spyOn(component, 'selectItem');
    (component as any).traceDetailsSection = {
      nativeElement: { scrollIntoView: jest.fn() }
    };
    component.searchTrace();
    tick();
    expect(component.currentPageTrace).toBe(1);
    expect(component.getTraceNames).toHaveBeenCalled();
    expect(component.selectItem).toHaveBeenCalledWith(mockTraceData[0]);
  }));

  it('should toggle sort parameters correctly', fakeAsync(() => {
    jest.spyOn(component, 'getTraceNames').mockImplementation(() => { });
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
    expect(component.getTraceNames).toHaveBeenCalledTimes(3);
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
    expect(component.selectedView).toBe('table');
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
    expect(component.getStatusColorClass(2)).toBe('bg-primary');
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

  it('should extract HTTP method correctly', () => {
    const encoded = btoa('GET:/api/users');
    const formatted = component.formatEndpointId(encoded);
    expect(formatted).toBe('GET');
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
    component.traceIDLogs = mockTraceId;
    component.searchLogs();
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
      tags: []
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
    jest.spyOn(component, 'clearSelection').mockImplementation(() => { });
    jest.spyOn(component['decoderService'], 'decodeObject')
      .mockResolvedValue(mockTraceData);
    component.entityId = 'service1';
    component.instNameTrace = 'instance1';
    component.startTime = 202511191550;
    component.endTime = 202511191600;
    component.entityEndpointId = 'GET:/api/test';
    component.traceState = 'error';
    component.traceIDTrace = 'trace123';
    component.minDuration = 100;
    component.maxDuration = 500;
    component.currentPageTrace = 1;
    component.sortParameter = 'duration';
    component.orderParameter = 'asc';
    jest.spyOn(component, 'encodeBase64').mockReturnValue('encoded');
    component.getTraceNames();
    tick();
    expect(mockApiService.getTracesData).toHaveBeenCalledWith(
      'service1',
      20251119155000,
      20251119160059,
      1,
      'duration',
      'asc',
      'service1_' + btoa('instance1'),
      1,
      'GET:/api/test',
      'trace123',
      100,
      500
    );
    expect(component.traceNames).toEqual(mockTraceData);
  }));

  // Logs Tab

  it('should load logs when log tab is selected', () => {
    const spy1 = jest.spyOn(component, 'getLogNames');
    const spy2 = jest.spyOn(component, 'getLogsAggregatedData2');
    const spy3 = jest.spyOn(component, 'getLogsCountTimeSeries');
    const spy4 = jest.spyOn(component, 'getLogsAggregatedData');
    component.loadData('log');
    expect(spy1).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();
    expect(spy3).toHaveBeenCalled();
    expect(spy4).toHaveBeenCalled();
  });

  it('should fetch traces with all parameters and populate traceNames', fakeAsync(() => {
    const mockData = [
      { traceId: 'T1', endpointId: 'EP', isError: 0, latency: 100, startTime: 123, timeBucket: 20250101, instance: 'I1' }
    ];
    jest.spyOn(component, 'encodeBase64').mockReturnValue('encoded');
    jest.spyOn(component, 'selectItem').mockImplementation(() => { });
    component.traceDetailsSection = { nativeElement: { scrollIntoView: jest.fn() } } as any;
    mockApiService.getTracesData.mockReturnValue(of(mockData));
    component.entityId = 'S1';
    component.instNameTrace = 'I1';
    component.entityEndpointId = 'GET:/test';
    component.startTime = 202501011200;
    component.endTime = 202501011259;
    component.currentPageTrace = 1;
    component.sortParameter = 'duration';
    component.orderParameter = 'asc';
    component.getTraceNames();
    tick();
    expect(component.traceNames).toEqual(mockData);
    expect(component.selectItem).toHaveBeenCalledWith(mockData[0]);
  }));

  it('should open trace log tab with trace ID and trigger click, loadData and selectCriteria', fakeAsync(() => {
    const mockClick = jest.fn();
    jest.spyOn(document, 'querySelector').mockReturnValue({ click: mockClick } as any);
    jest.spyOn(component, 'loadData').mockImplementation(() => { });
    jest.spyOn(component, 'selectCriteria').mockImplementation(() => { });
    component.openTraceTabLogs('trace123');
    expect(mockClick).toHaveBeenCalled();
    tick(110);
    expect(component.traceIDTrace).toBe('trace123');
    expect(component.loadData).toHaveBeenCalledWith('traces');
    expect(component.selectCriteria).toHaveBeenCalledWith('traceID');
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

  // Error Handling

  it("should log an error when endpoint metrics contain negative values", fakeAsync(() => {
    const invalidEndpointResponse = {
      endpoints: [
        {
          endpoint_id: "GET:/apm/api/service/combinedData",
          metrics: {
            endpoint_load: -10,
            total_hits: 100,
            latency: 30,
            success_rate: 100
          }
        }
      ]
    };
    mockApiService.getEndpoint.mockReturnValue(of(invalidEndpointResponse));
    mockDecoderService.decodeObject.mockReturnValue(Promise.resolve(invalidEndpointResponse));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    component.getEndpointNames();
    tick();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative values found in endpoint metrics. Ignoring response:",
      invalidEndpointResponse
    );
    expect(component.endPointNames).toEqual([]);
    consoleSpy.mockRestore();
  }));

  it("should log an error when endpoint loadTimeSeries contains negative values", fakeAsync(() => {
    const invalidEndpointLoad = {
      load: 50,
      loadTimeSeries: [
        { load: 6, time_bucket: "202511201055", status: "NORMAL" },
        { load: -3, time_bucket: "202511201056", status: "NORMAL" }
      ]
    };
    mockApiService.getEndpointLoad.mockReturnValue(of(invalidEndpointLoad));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    const graphSpy = jest.spyOn(component, "initialize_EndpointLoad_graph").mockImplementation(() => { });
    component.getEndpointLoad();
    tick();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative load found in 'loadTimeSeries'. Ignoring endpoint load:",
      invalidEndpointLoad
    );
    expect(component.loadValue).toBeUndefined();
    expect(graphSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
    graphSpy.mockRestore();
  }));

  it("should log an error when endpoint response time percentiles contain invalid/negative values", fakeAsync(() => {
    const invalidPercentileData = [
      {
        P99: 3370.0,
        P90: 3110.0,
        time_bucket: "202511201415",
        P50: 0.0,
        P95: 3110.0,
        P75: 3060.0
      },
      {
        P99: 3630.0,
        P90: -10.0,
        time_bucket: "202511201416",
        P50: 0.0,
        P95: 3560.0,
        P75: 3130.0
      }
    ];
    mockApiService.getEndpointResponseTimePercentile.mockReturnValue(of(invalidPercentileData));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    const initSpy = jest.spyOn(component, "initialize_EndpointResponseTimePercentile_graph").mockImplementation(() => { });
    component.getEndpointResponseTimePercentile();
    tick();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid or negative percentile values found in endpoint response time data:",
      invalidPercentileData
    );
    expect(initSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
    initSpy.mockRestore();
  }));

  it("should log an error when endpoint success rate contains negative values", fakeAsync(() => {
    const invalidSuccessRateResponse = {
      successRate: 100.0,
      successRateTimeSeries: [
        { success_rate: 100.0, time_bucket: "202512031331" },
        { success_rate: -5, time_bucket: "202512031332" },
        { success_rate: 100.0, time_bucket: "202512031333" }
      ]
    };
    mockApiService.getEndpointSuccessRate.mockReturnValue(of(invalidSuccessRateResponse));
    mockDecoderService.decodeObject.mockReturnValue(
      Promise.resolve(invalidSuccessRateResponse)
    );
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    component.getEndpointSuccessRate();
    tick();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative success_rate found in endpoint time series:",
      invalidSuccessRateResponse
    );
    expect(component.EndpointSuccessRateChart).toBeNull();
    consoleSpy.mockRestore();
  }));

  it("should log an error when instance list contains invalid entries", fakeAsync(() => {
    const invalidInstanceResponse = {
      Laravel_App: ["", "   ", 123]
    };
    mockApiService.getServiceInstanceNames.mockReturnValue(of(invalidInstanceResponse));

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    component.entityId = "service123";
    component.startTime = 123;
    component.endTime = 456;
    component.fetchInstances();
    tick();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid entries found in instance list. Ignoring response:",
      invalidInstanceResponse
    );
    expect(component.instancesTraces).toBeUndefined();
    expect(component.instancesLogs).toBeUndefined();
    consoleSpy.mockRestore();
  }));


});
