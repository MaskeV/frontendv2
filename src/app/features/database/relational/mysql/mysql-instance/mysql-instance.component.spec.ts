import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MysqlInstanceComponent } from './mysql-instance.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import type * as HighchartsType from 'highcharts';
import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { DatabaseService } from '../../../../services/database-api.service';
import { ServiceResponse } from '../../../../models/common/ServiceResponse';
import { StatusColors } from '../../../../models/enums/StatusColors';
import { ThresholdService } from '../../../../services/threshold.service';

@NgModule({})
class MockHighchartsChartModule { }

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

const mockTPSResponse: ServiceResponse<{ tps: number; time_bucket: string }[]> = {
  serviceResponse: [
    { tps: 0, time_bucket: '202511040946' },
    { tps: 0, time_bucket: '202511040947' },
    { tps: 0, time_bucket: '202511040948' },
  ],
  serviceStatus: 'Success',
  serviceError: '',
  STATUS_FAIL: 'Fail',
  STATUS_SUCCESS: 'Success',
  PUBLISHED: 'PUBLISHED',
  DATA_NOT_FOUND: 'Data Not Found',
  SOMETHING_WENT_WRONG: 'Something Went Wrong'
};

const getSlowQueriesRate: ServiceResponse<any[]> = {
  serviceResponse: [
    {
      slow_queries_rate: 4,
      time_bucket: '202511040949'
    }
  ],
  serviceStatus: 'Success',
  serviceError: '',
  STATUS_FAIL: 'Fail',
  STATUS_SUCCESS: 'Success',
  PUBLISHED: 'PUBLISHED',
  DATA_NOT_FOUND: 'Data Not Found',
  SOMETHING_WENT_WRONG: 'Something Went Wrong'
};

const mockCommandResponse: ServiceResponse<{
  select_rate: number;
  insert_rate: number;
  update_rate: number;
  delete_rate: number;
  time_bucket: string;
}[]> = {
  serviceResponse: [
    { select_rate: 1, delete_rate: 0, update_rate: 0, insert_rate: 0, time_bucket: '202511041321' },
    { select_rate: 1, delete_rate: 0, update_rate: 0, insert_rate: 0, time_bucket: '202511041322' },
    { select_rate: 1, delete_rate: 0, update_rate: 0, insert_rate: 0, time_bucket: '202511041323' },
    { select_rate: 1, delete_rate: 0, update_rate: 0, insert_rate: 0, time_bucket: '202511041324' },
  ],
  serviceStatus: 'Success',
  serviceError: '',
  STATUS_FAIL: 'Fail',
  STATUS_SUCCESS: 'Success',
  PUBLISHED: 'PUBLISHED',
  DATA_NOT_FOUND: 'Data Not Found',
  SOMETHING_WENT_WRONG: 'Something Went Wrong'
};

const mockThreadResponse: ServiceResponse<{
  threads_running: number,
  threads_connected: number,
  threads_cached: number,
  time_bucket: String,
  threads_created: number
}[]> = {
  serviceResponse: [
    { threads_running: 1, threads_connected: 0, threads_cached: 0, threads_created: 0, time_bucket: '202511041321' },
    { threads_running: 2, threads_connected: 0, threads_cached: 0, threads_created: 0, time_bucket: '202511041321' },
    { threads_running: 4, threads_connected: 0, threads_cached: 0, threads_created: 0, time_bucket: '202511041321' },
    { threads_running: 1, threads_connected: 0, threads_cached: 0, threads_created: 0, time_bucket: '202511041321' }
  ],
  serviceStatus: 'Success',
  serviceError: '',
  STATUS_FAIL: 'Fail',
  STATUS_SUCCESS: 'Success',
  PUBLISHED: 'PUBLISHED',
  DATA_NOT_FOUND: 'Data Not Found',
  SOMETHING_WENT_WRONG: 'Something Went Wrong'
};

const mockConnectsResponse: ServiceResponse<{
  connects_available: number,
  connects_aborted: number,
  time_bucket: String
}[]> = {
  serviceResponse: [
    { connects_available: 4922, connects_aborted: 0, time_bucket: '202511041321' },
    { connects_available: 4932, connects_aborted: 0, time_bucket: '202511041321' },
    { connects_available: 4952, connects_aborted: 0, time_bucket: '202511041321' },
    { connects_available: 4992, connects_aborted: 0, time_bucket: '202511041321' }
  ],
  serviceStatus: 'Success',
  serviceError: '',
  STATUS_FAIL: 'Fail',
  STATUS_SUCCESS: 'Success',
  PUBLISHED: 'PUBLISHED',
  DATA_NOT_FOUND: 'Data Not Found',
  SOMETHING_WENT_WRONG: 'Something Went Wrong'
};

const mockConnectsErrorsResponse: ServiceResponse<{
  internal: number,
  max_connections: number,
  accept: number,
  tcpwrap: number,
  time_bucket: String
}[]> = {
  serviceResponse: [
    { internal: 4922, max_connections: 0, time_bucket: '202511041321', accept: 0, tcpwrap: 0 },
    { internal: 4932, max_connections: 0, time_bucket: '202511041321', accept: 0, tcpwrap: 0 },
    { internal: 4952, max_connections: 0, time_bucket: '202511041321', accept: 0, tcpwrap: 0 },
    { internal: 4992, max_connections: 0, time_bucket: '202511041321', accept: 0, tcpwrap: 0 }
  ],
  serviceStatus: 'Success',
  serviceError: '',
  STATUS_FAIL: 'Fail',
  STATUS_SUCCESS: 'Success',
  PUBLISHED: 'PUBLISHED',
  DATA_NOT_FOUND: 'Data Not Found',
  SOMETHING_WENT_WRONG: 'Something Went Wrong'
};

const mockGetThreshold = {
  meter_mysql_connection_errors_internal: {
    criticalValue: 0.0,
    avgBaseline: 0.0,
    critical: 0.0,
    warningValue: 0.0,
    warning: 0.0
  },
  meter_mysql_commands_delete_rate: {
    criticalValue: 5.19,
    avgBaseline: 3.61,
    critical: 0.0,
    warningValue: 4.67,
    warning: 0.0
  },
  meter_mysql_commands_update_rate: {
    criticalValue: 1.0,
    avgBaseline: 1.0,
    critical: 0.0,
    warningValue: 1.0,
    warning: 0.0
  },
  meter_mysql_threads_created: {
    criticalValue: 408706.79,
    avgBaseline: 212916.38,
    critical: 0.0,
    warningValue: 343443.32,
    warning: 0.0
  },
  meter_mysql_commands_select_rate: {
    criticalValue: 674.96,
    avgBaseline: 223.79,
    critical: 0.0,
    warningValue: 524.57,
    warning: 0.0
  },
  meter_mysql_threads_cached: {
    criticalValue: 44.18,
    avgBaseline: 40.2,
    critical: 0.0,
    warningValue: 42.85,
    warning: 0.0
  },
  meter_mysql_slow_queries_rate: {
    criticalValue: 2.06,
    avgBaseline: 0.58,
    critical: 0.0,
    warningValue: 1.57,
    warning: 0.0
  },
  meter_mysql_qps: {
    criticalValue: 696.59,
    avgBaseline: 242.67,
    critical: 0.0,
    warningValue: 545.28,
    warning: 0.0
  },
  meter_mysql_commands_insert_rate: {
    criticalValue: 6.42,
    avgBaseline: 4.72,
    critical: 0.0,
    warningValue: 5.85,
    warning: 0.0
  },
  meter_mysql_threads_connected: {
    criticalValue: 224.96,
    avgBaseline: 168.2,
    critical: 0.0,
    warningValue: 206.04,
    warning: 0.0
  },
  meter_mysql_threads_running: {
    criticalValue: 21.1,
    avgBaseline: 3.67,
    critical: 0.0,
    warningValue: 15.29,
    warning: 0.0
  },

  baselineList: [
    {
      metric_table: "meter_mysql_qps",
      critical: 696.59,
      granularity: "day_of_week",
      service_id: "bXlzcWw6Ok1vbml0b3JpbmdfREI=.1",
      time_bucket: 20251127,
      warning: 545.28,
      baseline: 242.67,
      standard_deviation: 151.31,
      entity_id: "bXlzcWw6Ok1vbml0b3JpbmdfREI=.1"
    },
  ]
};

describe('MysqlInstanceComponent', () => {
  let component: MysqlInstanceComponent;
  let fixture: ComponentFixture<MysqlInstanceComponent>;
  let dbService: jest.Mocked<DatabaseService>;
  let mockThreshold: any;

  beforeEach(async () => {
    dbService = {
      getInstanceCurrentQPS: jest.fn(() => of({
        serviceResponse: [
          { qps: 2, time_bucket: '202511040946' },
          { qps: 2, time_bucket: '202511040947' },
        ],
        serviceStatus: 'Success',
        serviceError: ''
      })),
      getInstanceCurrentTPS: jest.fn(() => of(mockTPSResponse)),
      getInstanceSlowQueriesRate: jest.fn(() => of(getSlowQueriesRate)),
      getServiceCommandTrends: jest.fn(() => of(mockCommandResponse)),
      getInstanceThreads: jest.fn(() => of(mockThreadResponse)),
      getInstanceConnects: jest.fn(() => of(mockConnectsResponse)),
      getInnoDbBufferPoolUsage: jest.fn(() => of(mockConnectsErrorsResponse)),
    } as unknown as jest.Mocked<DatabaseService>;

    mockThreshold = {
      getThreshold: jest.fn().mockReturnValue(of(mockGetThreshold)),
    }

    await TestBed.configureTestingModule({
      imports: [MysqlInstanceComponent, HttpClientTestingModule],
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
        { provide: DatabaseService, useValue: dbService },
        { provide: ThresholdService, useValue: mockThreshold },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .compileComponents();

    fixture = TestBed.createComponent(MysqlInstanceComponent);
    component = fixture.componentInstance;
    dbService = TestBed.inject(DatabaseService) as jest.Mocked<DatabaseService>;
    (Highcharts.chart as jest.Mock).mockClear();
    (Highcharts as any).charts = [];
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => { });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // QPS

  it('should call getInstanceCurrentQPS and initialize_currentQPS_graph on success', async () => {
    const spyInit = jest.spyOn(component, 'initialize_currentQPS_graph');
    component.instanceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadCurrentQPSgraph();
    await fixture.whenStable();
    expect(dbService.getInstanceCurrentQPS).toHaveBeenCalledWith('1', 1000, 2000);
    expect(component.currentQPSdata).toEqual([
      { qps: 2, time_bucket: '202511040946' },
      { qps: 2, time_bucket: '202511040947' }
    ]);
    expect(spyInit).toHaveBeenCalled();
    expect(component.avgqps).toBeGreaterThanOrEqual(0);
  });

  it('should handle error response from getInstanceCurrentQPS gracefully', fakeAsync(() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    dbService.getInstanceCurrentQPS.mockReturnValueOnce(of({
      serviceStatus: 'FAILURE',
      serviceResponse: [],
      serviceError: 'Some error occurred'
    } as unknown as ServiceResponse<any[]>));
    component.instanceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.graphCurrentQPS = mockChartInstance;
    const destroySpy = jest.spyOn(component.graphCurrentQPS, 'destroy');
    component.loadCurrentQPSgraph();
    tick();
    expect(component.currentQPSdata).toEqual([]);
    expect(destroySpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Some error occurred');
    consoleSpy.mockRestore();
  }));

  it('should destroy graph on observable error', fakeAsync(() => {
    component.graphCurrentQPS = mockChartInstance;
    const destroySpy = jest.spyOn(component.graphCurrentQPS, 'destroy');
    dbService.getInstanceCurrentQPS.mockReturnValueOnce(
      new Observable(subscriber => {
        subscriber.error(new Error('Observable failed'));
      })
    );
    component.instanceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadCurrentQPSgraph();
    tick();
    expect(component.currentQPSdata).toEqual([]);
    expect(destroySpy).toHaveBeenCalled();
  }));

  // TPS

  it('should call getInstanceCurrentTPS and initialize_currentTPS_graph on success', fakeAsync(() => {
    const spyInit = jest.spyOn(component, 'initialize_currentTPS_graph');
    component.instanceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadCurrentTPSgraph();
    tick();
    expect(dbService.getInstanceCurrentTPS).toHaveBeenCalledWith('1', 1000, 2000);
    expect(component.currentTPSdata).toEqual(mockTPSResponse.serviceResponse);
    expect(spyInit).toHaveBeenCalled();
  }));

  it('should handle error response gracefully', fakeAsync(() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    dbService.getInstanceCurrentTPS.mockReturnValueOnce(of({
      serviceResponse: [],
      serviceStatus: 'FAILURE',
      serviceError: 'TPS error'
    } as unknown as ServiceResponse<any[]>));
    component.instanceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.graphCurrentTPS = mockChartInstance;
    const destroySpy = jest.spyOn(component.graphCurrentTPS, 'destroy');
    component.loadCurrentTPSgraph();
    tick();
    expect(component.currentTPSdata).toEqual([]);
    expect(destroySpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('TPS error');
    consoleSpy.mockRestore();
  }));

  it('should destroy TPS chart on observable error', fakeAsync(() => {
    component.graphCurrentTPS = mockChartInstance;
    const destroySpy = jest.spyOn(component.graphCurrentTPS, 'destroy');
    dbService.getInstanceCurrentTPS.mockReturnValueOnce(
      new Observable(subscriber => subscriber.error(new Error('Observable failed')))
    );
    component.instanceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadCurrentTPSgraph();
    tick();
    expect(component.currentTPSdata).toEqual([]);
    expect(destroySpy).toHaveBeenCalled();
  }));

  it('should create TPS chart with correct series data', () => {
    (Highcharts.chart as jest.Mock).mockClear();
    const mockTPSData = [
      { tps: 10, time_bucket: '202511040946' },
      { tps: 20, time_bucket: '202511040947' },
      { tps: 30, time_bucket: '202511040948' },
    ];
    component.currentTPSdata = mockTPSData;
    component.initialize_currentTPS_graph();
    expect(Highcharts.chart).toHaveBeenCalled();
    const chartCalls = (Highcharts.chart as jest.Mock).mock.calls;
    expect(chartCalls.length).toBeGreaterThan(0);
    const chartOptions = chartCalls[chartCalls.length - 1][0];
    expect(chartOptions.chart?.renderTo).toBe('current_tps_graph');
    expect(chartOptions.series).toBeDefined();
    expect(chartOptions.series.length).toBeGreaterThan(0);
    expect(chartOptions.series[0].name).toBe('TPS');
    expect(chartOptions.series[0].data).toBeDefined();
    expect(chartOptions.series[0].data.length).toBe(mockTPSData.length);
    chartOptions.series[0].data.forEach((dataPoint: any, index: number) => {
      expect(dataPoint).toHaveProperty('x');
      expect(dataPoint).toHaveProperty('y');
      expect(dataPoint).toHaveProperty('color');
      expect(dataPoint.y).toBe(mockTPSData[index].tps);
    });
  });

  // Slow Queries

  it('should call getInstanceSlowQueriesRate and initialize_slow_queries_trend_graph on success', fakeAsync(() => {
    const spyInit = jest.spyOn(component, 'initialize_slow_queries_trend_graph');
    component.instanceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadSlowQueriesTrendGraph();
    tick();
    expect(dbService.getInstanceSlowQueriesRate).toHaveBeenCalledWith('1', 1000, 2000);
    expect(component.slowQueriesTrendData).toEqual(getSlowQueriesRate.serviceResponse);
    expect(spyInit).toHaveBeenCalled();
  }));

  it('should handle error response from getInstanceSlowQueriesRate gracefully', fakeAsync(() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    dbService.getInstanceSlowQueriesRate.mockReturnValueOnce(of({
      serviceResponse: [],
      serviceStatus: 'FAILURE',
      serviceError: 'Slow queries error'
    } as unknown as ServiceResponse<any[]>));
    component.instanceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.graphSlowQueriesTrend = mockChartInstance;
    const destroySpy = jest.spyOn(component.graphSlowQueriesTrend, 'destroy');
    component.loadSlowQueriesTrendGraph();
    tick();
    expect(component.slowQueriesTrendData).toEqual([]);
    expect(destroySpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Slow queries error');
    consoleSpy.mockRestore();
  }));

  it('should destroy slow queries chart on observable error', fakeAsync(() => {
    component.graphSlowQueriesTrend = mockChartInstance;
    const destroySpy = jest.spyOn(component.graphSlowQueriesTrend, 'destroy');
    dbService.getInstanceSlowQueriesRate.mockReturnValueOnce(
      new Observable(subscriber => subscriber.error(new Error('Observable failed')))
    );
    component.instanceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadSlowQueriesTrendGraph();
    tick();
    expect(component.slowQueriesTrendData).toEqual([]);
    expect(destroySpy).toHaveBeenCalled();
  }));

  it('should create slow queries chart with correct series data', () => {
    const chartConstructorSpy = jest.spyOn(Highcharts as any, 'chart').mockReturnValue(mockChartInstance);
    const mockSlowQueriesData = [
      { slow_queries_rate: 0, time_bucket: '202511041321', status: false, color: 'NORMAL' },
      { slow_queries_rate: 2, time_bucket: '202511041322', status: false, color: 'NORMAL' },
      { slow_queries_rate: 5, time_bucket: '202511041323', status: true, color: 'WARNING' },
    ];
    component.slowQueriesTrendData = mockSlowQueriesData;
    component.thresholds = {
      baselineList: [],
      meter_mysql_slow_queries_rate: {
        avgBaseline: 1,
        warningValue: 3,
        criticalValue: 10
      }
    };
    component.initialize_slow_queries_trend_graph();
    expect(chartConstructorSpy).toHaveBeenCalled();
    const callIndex = chartConstructorSpy.mock.calls.length - 1; // or 0
    const chartOptions = chartConstructorSpy.mock.calls[callIndex][0] as Highcharts.Options;
    expect(chartOptions.chart?.renderTo).toBe('slow_queries_trend');
    expect(chartOptions.series?.[0].name).toBe('Slow Queries Rate');
    const series = chartOptions.series?.[0] as Highcharts.SeriesSplineOptions;
    expect(series.data).toHaveLength(3);
    chartConstructorSpy.mockRestore();
  });

  it('should handle slow queries chart initialization with no thresholds', () => {
    const getChartOptionSpy = jest.spyOn(component as any, 'getChartOption');
    const chartConstructorSpy = jest.spyOn(Highcharts as any, 'chart').mockReturnValue(mockChartInstance);
    const mockSlowQueriesData = [
      { slow_queries_rate: 5, time_bucket: '202511041321', status: false, color: 'NORMAL' },
    ];
    component.slowQueriesTrendData = mockSlowQueriesData;
    component.thresholds = undefined;
    component.initialize_slow_queries_trend_graph();
    expect(chartConstructorSpy).toHaveBeenCalled();
    expect(getChartOptionSpy).toHaveBeenCalled();
    const seriesDataPassedIn = getChartOptionSpy.mock.calls[0][2] as Array<{
      name: string;
      data: Highcharts.PointOptionsObject[];
      marker?: any;
    }>;
    const chartData = seriesDataPassedIn[0].data as Highcharts.PointOptionsObject[];
    expect(chartData).toHaveLength(1);
    expect(chartData[0].marker?.fillColor).toBe(StatusColors.NORMAL);
    getChartOptionSpy.mockRestore();
    chartConstructorSpy.mockRestore();
  });

  it('should destroy existing chart before creating new slow queries chart', () => {
    const existingChart = {
      ...mockChartInstance,
      destroy: jest.fn()
    };
    const destroySpy = jest.spyOn(existingChart, 'destroy');
    component.graphSlowQueriesTrend = existingChart as any;
    const chartConstructorSpy = jest.spyOn(Highcharts as any, 'chart').mockReturnValue(mockChartInstance);
    component.slowQueriesTrendData = [
      { slow_queries_rate: 1, time_bucket: '202511041321' }
    ];
    component.initialize_slow_queries_trend_graph();
    expect(destroySpy).toHaveBeenCalled();
    expect(chartConstructorSpy).toHaveBeenCalled();
    chartConstructorSpy.mockRestore();
  });

  it('should handle error during slow queries chart initialization', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const chartConstructorSpy = jest
      .spyOn(Highcharts, 'chart')
      .mockImplementation(() => {
        throw new Error('Chart creation failed');
      });
    component.slowQueriesTrendData = [
      { slow_queries_rate: 1, time_bucket: '202511041321' }
    ];
    component.initialize_slow_queries_trend_graph();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error Occurred!',
      expect.any(Error)
    );
    chartConstructorSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  // Read Chart

  it('should load command trend data and initialize command trend graphs on success', fakeAsync(() => {
    const spyInit = jest.spyOn(component, 'initialize_commands_trend_graph');
    const spyInitWrite = jest.spyOn(component, 'initialize_commands_trend_write_graph');
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadCommandTrendGraph();
    tick();
    expect(dbService.getServiceCommandTrends).toHaveBeenCalledWith('1', 1000, 2000);
    expect(component.commandTrendData).toEqual(mockCommandResponse.serviceResponse.map(item => ({
      time_bucket: item.time_bucket,
      select_rate: item['select_rate']
    })));
    expect(component.commandTrendWriteData).toEqual(mockCommandResponse.serviceResponse.map(item => ({
      time_bucket: item.time_bucket,
      insert_rate: item['insert_rate'],
      delete_rate: item['delete_rate'],
      update_rate: item['update_rate'],
    })));
    expect(spyInit).toHaveBeenCalled();
    expect(spyInitWrite).toHaveBeenCalled();
  }));

  it('should destroy existing command trend graphs on error', fakeAsync(() => {
    component.graphCommandTrend = mockChartInstance;
    component.graphCommandTrendWrite = mockChartInstance;
    const destroySpy1 = jest.spyOn(component.graphCommandTrend, 'destroy');
    const destroySpy2 = jest.spyOn(component.graphCommandTrendWrite, 'destroy');
    dbService.getServiceCommandTrends.mockReturnValueOnce(
      new Observable(subscriber => subscriber.error(new Error('Observable failed')))
    );
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadCommandTrendGraph();
    tick();
    expect(destroySpy1).toHaveBeenCalled();
    expect(destroySpy2).toHaveBeenCalled();
  }));

  it('should handle errors during command trend graph initialization gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const chartConstructorSpy = jest
      .spyOn(Highcharts as any, 'Chart')
      .mockImplementation(() => { throw new Error('Chart creation failed'); });

    component.commandTrendData = [
      { time_bucket: '202511040946', select_rate: 1 },
    ];
    component.thresholds = {
      meter_mysql_commands_select_rate: {
        avgBaseline: 1,
        warningValue: 3,
        criticalValue: 10
      }
    };

    component.initialize_commands_trend_graph();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error occurred while initializing command trend graph:',
      expect.any(Error)
    );

    chartConstructorSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  //  Threads

  it('should call getInstanceThreads and initialize_trends_graph on success', fakeAsync(() => {
    const spyInit = jest.spyOn(component, 'initialize_trends_graph');
    component.instanceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadTrendsGraph();
    tick();
    expect(dbService.getInstanceThreads).toHaveBeenCalledWith('1', 1000, 2000);
    expect(component.trendsData.length).toBeGreaterThan(0);
    expect(spyInit).toHaveBeenCalled();
  }));

  it('should handle service failure correctly', fakeAsync(() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    dbService.getInstanceThreads.mockReturnValueOnce(of({
      serviceResponse: [],
      serviceStatus: 'FAILURE',
      serviceError: 'Threads error'
    } as unknown as ServiceResponse<any[]>));
    component.instanceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.graphTrends = mockChartInstance;
    const destroySpy = jest.spyOn(component.graphTrends, 'destroy');
    component.loadTrendsGraph();
    tick();
    expect(component.trendsData).toEqual([]);
    expect(destroySpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Threads error');
    consoleSpy.mockRestore();
  }));

  it('should destroy graph on observable error', fakeAsync(() => {
    component.graphTrends = mockChartInstance;
    const destroySpy = jest.spyOn(component.graphTrends, 'destroy');
    dbService.getInstanceThreads.mockReturnValueOnce(
      new Observable(subscriber => subscriber.error(new Error('Observable failed')))
    );
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadTrendsGraph();
    tick();
    expect(component.trendsData).toEqual([]);
    expect(destroySpy).toHaveBeenCalled();
  }));

  // Connects

  it('should call getInstanceConnects and initialize_connects_graph on success', fakeAsync(() => {
    const spyInit = jest.spyOn(component, 'initialize_connects_graph');
    component.instanceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadConnectsGraph();
    tick();
    expect(dbService.getInstanceConnects).toHaveBeenCalledWith('1', 1000, 2000);
    expect(component.connectsData).toEqual(mockConnectsResponse.serviceResponse);
    expect(spyInit).toHaveBeenCalled();
  }));

  it('should handle failure response correctly', fakeAsync(() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    dbService.getInstanceConnects.mockReturnValueOnce(of({
      serviceResponse: [],
      serviceStatus: 'FAILURE',
      serviceError: 'Connects error'
    } as unknown as ServiceResponse<any[]>));
    component.instanceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.graphConnects = mockChartInstance;
    const destroySpy = jest.spyOn(component.graphConnects, 'destroy');
    component.loadConnectsGraph();
    tick();
    expect(component.connectsData).toEqual([]);
    expect(destroySpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Connects error');
    consoleSpy.mockRestore();
  }));

  it('should destroy connects chart on observable error', fakeAsync(() => {
    component.graphConnects = mockChartInstance;
    const destroySpy = jest.spyOn(component.graphConnects, 'destroy');
    dbService.getInstanceConnects.mockReturnValueOnce(
      new Observable(subscriber => subscriber.error(new Error('Observable failed')))
    );
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadConnectsGraph();
    tick();
    expect(component.connectsData).toEqual([]);
    expect(destroySpy).toHaveBeenCalled();
  }));

  // Connects Error

  it('should call getInnoDbBufferPoolUsage and initialize_connection_errors_graph on success', fakeAsync(() => {
    const spyInit = jest.spyOn(component, 'initialize_connection_errors_graph');
    component.instanceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadConnectionErrorsGraph();
    tick();
    expect(dbService.getInnoDbBufferPoolUsage).toHaveBeenCalledWith('1', 1000, 2000);
    expect(component.connectionErrorsData).toEqual(mockConnectsErrorsResponse.serviceResponse);
    expect(spyInit).toHaveBeenCalled();
  }));

  it('should handle failure response gracefully', fakeAsync(() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    dbService.getInnoDbBufferPoolUsage.mockReturnValueOnce(of({
      serviceResponse: [],
      serviceStatus: 'FAILURE',
      serviceError: 'Connection Errors test failure'
    } as unknown as ServiceResponse<any[]>));
    component.instanceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.graphConnectionErrors = mockChartInstance;
    const destroySpy = jest.spyOn(component.graphConnectionErrors, 'destroy');
    component.loadConnectionErrorsGraph();
    tick();
    expect(component.connectionErrorsData).toEqual([]);
    expect(destroySpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Connection Errors test failure');
    consoleSpy.mockRestore();
  }));


  it('should destroy connection errors chart on observable error', fakeAsync(() => {
    component.graphConnectionErrors = mockChartInstance;
    const destroySpy = jest.spyOn(component.graphConnectionErrors, 'destroy');
    dbService.getInnoDbBufferPoolUsage.mockReturnValueOnce(
      new Observable(subscriber => subscriber.error(new Error('Observable failed')))
    );
    component.instanceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadConnectionErrorsGraph();
    tick();
    expect(component.connectionErrorsData).toEqual([]);
    expect(destroySpy).toHaveBeenCalled();
  }));

  // Error Handling

  it("should handle invalid structure and NOT call graph loaders", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    const qpsSpy = jest.spyOn(component, "loadCurrentQPSgraph");
    const slowSpy = jest.spyOn(component, "loadSlowQueriesTrendGraph");
    const cmdSpy = jest.spyOn(component, "loadCommandTrendGraph");
    const badResponse = { wrong: "data" };
    mockThreshold.getThreshold.mockReturnValue(of(badResponse));
    component.getThreshold("MYSQL");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Missing or invalid 'baselineList' in threshold response:",
      badResponse
    );
    expect(qpsSpy).not.toHaveBeenCalled();
    expect(slowSpy).not.toHaveBeenCalled();
    expect(cmdSpy).not.toHaveBeenCalled();
  });

  it("should detect negative values and NOT call graph loaders", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    const qpsSpy = jest.spyOn(component, "loadCurrentQPSgraph");
    const slowSpy = jest.spyOn(component, "loadSlowQueriesTrendGraph");
    const cmdSpy = jest.spyOn(component, "loadCommandTrendGraph");
    const negativeResponse = {
      baselineList: [],
      meter_mysql_qps: { criticalValue: -10 }
    };
    mockThreshold.getThreshold.mockReturnValue(of(negativeResponse));
    component.getThreshold("MYSQL");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative values found in threshold response. Ignoring response:",
      negativeResponse
    );
    expect(qpsSpy).not.toHaveBeenCalled();
    expect(slowSpy).not.toHaveBeenCalled();
    expect(cmdSpy).not.toHaveBeenCalled();
  });

  it("should accept valid response and call all graph loaders", () => {
    const qpsSpy = jest.spyOn(component, "loadCurrentQPSgraph");
    const slowSpy = jest.spyOn(component, "loadSlowQueriesTrendGraph");
    const cmdSpy = jest.spyOn(component, "loadCommandTrendGraph");
    mockThreshold.getThreshold.mockReturnValue(of(mockGetThreshold));
    component.getThreshold("MYSQL");
    expect(qpsSpy).toHaveBeenCalled();
    expect(slowSpy).toHaveBeenCalled();
    expect(cmdSpy).toHaveBeenCalled();
    expect(component.thresholds).toEqual(mockGetThreshold);
  });

});