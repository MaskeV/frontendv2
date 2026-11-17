import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MySqlServiceComponent } from './mysql-service.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import type * as HighchartsType from 'highcharts';
import { DatabaseService } from '../../../../services/database-api.service';
import { ServiceResponse } from '../../../../models/common/ServiceResponse';
import { By } from '@angular/platform-browser';
import { InstanceData } from '../../../../models/instanceData';
import { RouterTestingModule } from '@angular/router/testing';
import { MySQLSlowStatement } from '../../../../models/MySqlSlowStatements';
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
} as unknown as Highcharts.Chart;

// Core Mock 

// jest.mock('highcharts', () => ({
//   chart: jest.fn(() => mockChartInstance),
//   dateFormat: jest.fn((_, x) => new Date(x).toISOString()),
//   addEvent: jest.fn(),
//   removeEvent: jest.fn(),
//   numberFormat: jest.fn(),
// }));

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

interface MockInstanceData extends Partial<InstanceData> {
  instanceName: string;
  upTime: string;
  memory?: string;
  memoryUsage?: number;
  ram?: string;
  ramUsage?: number;
}

interface MySQLSlowStatementMock extends MySQLSlowStatement {
  instanceName: string;
}

describe('MysqlServiceComponent', () => {
  let component: MySqlServiceComponent;
  let fixture: ComponentFixture<MySqlServiceComponent>;
  let dbService: jest.Mocked<DatabaseService>;
  let mockRouter: any;
  let mockThreshold: any;

  const mockSlowStatements = [
    { user: 'alice', query: 'SELECT * FROM a', host: 'host1', state: 'running', duration: 100, originalIndex: 1 },
    { user: 'bob', query: 'UPDATE b SET x=1', host: 'host2', state: 'sleep', duration: 50, originalIndex: 2 },
    { user: 'charlie', query: 'DELETE FROM c', host: 'host1', state: 'running', duration: 200, originalIndex: 3 },
  ];

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

  beforeEach(async () => {
    dbService = {
      getServiceCurrentQPS: jest.fn(() => of({
        serviceResponse: [
          { qps: 2, time_bucket: '202511040946' },
          { qps: 2, time_bucket: '202511040947' },
        ],
        serviceStatus: 'Success',
        serviceError: ''
      })),
      getServiceCurrentTPS: jest.fn(() => of(mockTPSResponse)),
      getServiceSlowQueriesRate: jest.fn(() => of(getSlowQueriesRate)),
      getServiceCommandTrends: jest.fn(() => of(mockCommandResponse)),
      getServiceThreads: jest.fn(() => of(mockThreadResponse)),
      getServiceConnects: jest.fn(() => of(mockConnectsResponse)),
      getServiceConnectionErrors: jest.fn(() => of(mockConnectsErrorsResponse)),
    } as unknown as jest.Mocked<DatabaseService>;

    mockThreshold = {
      getThreshold: jest.fn().mockReturnValue(of(mockGetThreshold)),
    }

    await TestBed.configureTestingModule({
      imports: [MySqlServiceComponent, HttpClientTestingModule, RouterTestingModule.withRoutes([])],
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

    fixture = TestBed.createComponent(MySqlServiceComponent);
    component = fixture.componentInstance;
    dbService = TestBed.inject(DatabaseService) as jest.Mocked<DatabaseService>;
    (Highcharts.chart as jest.Mock).mockClear();
    (Highcharts as any).charts = [];
    jest.clearAllMocks();
    const router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    component.databaseSlowStatements = [...mockSlowStatements];
    component.filteredSlowStatements = [...mockSlowStatements];
    // fixture.detectChanges();
  });

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => { });
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Metric Cards

  // it('should display "RDS service status" metric box with correct value', () => {
  //   const metricBox = fixture.debugElement.queryAll(By.css('.metric-box'))[0];
  //   const label = metricBox.query(By.css('.small')).nativeElement.textContent.trim();
  //   const value = metricBox.query(By.css('.fw-bold')).nativeElement.textContent.trim();
  //   expect(label).toContain('RDS service status');
  //   expect(value).toBe('15');
  // });

  // it('should display "Rows Read" metric box with correct value', () => {
  //   const metricBox = fixture.debugElement.queryAll(By.css('.metric-box'))[1];
  //   const label = metricBox.query(By.css('.small')).nativeElement.textContent.trim();
  //   const value = metricBox.query(By.css('.fw-bold')).nativeElement.textContent.trim();
  //   expect(label).toContain('Rows Read');
  //   expect(value).toBe('23');
  // });

  it('should return red color when actualValue >= criticalValue', () => {
    component.thresholds = {
      meter_mysql_qps: { warningValue: 70, criticalValue: 100 }
    };
    const result = component.getThresholdDisplay('meter_mysql_qps', 120);
    expect(result).toEqual({ value: 100, color: 'red' });
  });

  it('should return orange color when actualValue >= warningValue but < criticalValue', () => {
    component.thresholds = {
      meter_mysql_qps: { warningValue: 70, criticalValue: 100 }
    };
    const result = component.getThresholdDisplay('meter_mysql_qps', 80);
    expect(result).toEqual({ value: 70, color: 'orange' });
  });

  it('should return green when value is safe (below warningValue)', () => {
    component.thresholds = {
      meter_mysql_qps: { warningValue: 70, criticalValue: 100 }
    };
    const result = component.getThresholdDisplay('meter_mysql_qps', 50);
    expect(result).toEqual({ value: 70, color: 'green' });
  });

  it('should return default blue when thresholds missing or null', () => {
    component.thresholds = null as any;
    const result = component.getThresholdDisplay('meter_mysql_qps', 80);
    expect(result).toEqual({ value: 0, color: '#3b82f6' });
  });

  // it('should display "MySQL Downtime" metric box with correct value', () => {
  //   const metricBoxes = fixture.debugElement.queryAll(By.css('.metric-box'));
  //   const downtimeBox = metricBoxes.find(box =>
  //     box.nativeElement.textContent.includes('MySQL Downtime')
  //   );
  //   expect(downtimeBox).toBeTruthy();
  //   const label = downtimeBox!.query(By.css('.small')).nativeElement.textContent.trim();
  //   const value = downtimeBox!.query(By.css('.fw-bold')).nativeElement.textContent.trim();
  //   expect(label).toContain('MySQL Downtime');
  //   expect(value).toBe('2');
  // });

  // QPS

  it('should call getServiceCurrentQPS and initialize_currentQPS_graph on success', async () => {
    const spyInit = jest.spyOn(component, 'initialize_currentQPS_graph');
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadCurrentQPSgraph();
    await fixture.whenStable();
    expect(dbService.getServiceCurrentQPS).toHaveBeenCalledWith('1', 1000, 2000);
    expect(component.currentQPSdata).toEqual([
      { qps: 2, time_bucket: '202511040946' },
      { qps: 2, time_bucket: '202511040947' }
    ]);
    expect(spyInit).toHaveBeenCalled();
    expect(component.avgqps).toBeGreaterThanOrEqual(0);
  });

  it('should handle error response from getServiceCurrentQPS gracefully', fakeAsync(() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    dbService.getServiceCurrentQPS.mockReturnValueOnce(of({
      serviceStatus: 'FAILURE',
      serviceResponse: [],
      serviceError: 'Some error occurred'
    } as unknown as ServiceResponse<any[]>));
    component.serviceId = '1';
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
    dbService.getServiceCurrentQPS.mockReturnValueOnce(
      new Observable(subscriber => {
        subscriber.error(new Error('Observable failed'));
      })
    );
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadCurrentQPSgraph();
    tick();
    expect(component.currentQPSdata).toEqual([]);
    expect(destroySpy).toHaveBeenCalled();
  }));

  // TPS

  it('should call getServiceCurrentTPS and initialize_currentTPS_graph on success', fakeAsync(() => {
    const spyInit = jest.spyOn(component, 'initialize_currentTPS_graph');
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadCurrentTPSgraph();
    tick();
    expect(dbService.getServiceCurrentTPS).toHaveBeenCalledWith('1', 1000, 2000);
    expect(component.currentTPSdata).toEqual(mockTPSResponse.serviceResponse);
    expect(spyInit).toHaveBeenCalled();
  }));

  it('should handle error response gracefully', fakeAsync(() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    dbService.getServiceCurrentTPS.mockReturnValueOnce(of({
      serviceResponse: [],
      serviceStatus: 'FAILURE',
      serviceError: 'TPS error'
    } as unknown as ServiceResponse<any[]>));
    component.serviceId = '1';
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
    dbService.getServiceCurrentTPS.mockReturnValueOnce(
      new Observable(subscriber => subscriber.error(new Error('Observable failed')))
    );
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadCurrentTPSgraph();
    tick();
    expect(component.currentTPSdata).toEqual([]);
    expect(destroySpy).toHaveBeenCalled();
  }));

  it('should create TPS chart with correct series data', () => {
    const spyInit = jest.spyOn(component, 'initialize_currentTPS_graph');
    const mockTPSData = [
      { tps: 0, time_bucket: '202511040946' },
      { tps: 0, time_bucket: '202511040947' },
      { tps: 0, time_bucket: '202511040948' },
    ];
    component.currentTPSdata = mockTPSData;
    component.initialize_currentTPS_graph();
    expect(spyInit).toHaveBeenCalled();
    expect(Highcharts.chart).toHaveBeenCalled();
    const chartOptions = (Highcharts.chart as jest.Mock).mock.calls[0][0];
    expect(chartOptions.chart?.renderTo).toBe('current_tps_graph');
    expect(chartOptions.series?.[0].data).toEqual(
      mockTPSData.map(d => ({ x: component.convertTimebucket(d.time_bucket), y: d.tps }))
    );
    expect(chartOptions.series?.[0].name).toBe('TPS');
  });

  // Slow Queries

  it('should call getServiceSlowQueriesRate and initialize_slow_queries_trend_graph on success', fakeAsync(() => {
    const spyInit = jest.spyOn(component, 'initialize_slow_queries_trend_graph');
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadSlowQueriesTrendGraph();
    tick();
    expect(dbService.getServiceSlowQueriesRate).toHaveBeenCalledWith('1', 1000, 2000);
    expect(component.slowQueriesTrendData).toEqual(getSlowQueriesRate.serviceResponse);
    expect(spyInit).toHaveBeenCalled();
  }));

  it('should handle error response from getServiceSlowQueriesRate gracefully', fakeAsync(() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    dbService.getServiceSlowQueriesRate.mockReturnValueOnce(of({
      serviceResponse: [],
      serviceStatus: 'FAILURE',
      serviceError: 'Slow queries error'
    } as unknown as ServiceResponse<any[]>));
    component.serviceId = '1';
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
    dbService.getServiceSlowQueriesRate.mockReturnValueOnce(
      new Observable(subscriber => subscriber.error(new Error('Observable failed')))
    );
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadSlowQueriesTrendGraph();
    tick();
    expect(component.slowQueriesTrendData).toEqual([]);
    expect(destroySpy).toHaveBeenCalled();
  }));

  it('should create slow queries chart with correct series data', () => {
    // Clear previous mock calls from beforeEach
    (Highcharts.chart as jest.Mock).mockClear();

    const chartConstructorSpy = jest.spyOn(Highcharts as any, 'chart').mockReturnValue(mockChartInstance);
    const mockSlowQueriesData = [
      { slow_queries_rate: 0, time_bucket: '202511041321' },
      { slow_queries_rate: 2, time_bucket: '202511041322' },
      { slow_queries_rate: 5, time_bucket: '202511041323' },
    ];
    component.slowQueriesTrendData = mockSlowQueriesData;
    component.thresholds = {
      meter_mysql_slow_queries_rate: {
        avgBaseline: 1,
        warningValue: 3,
        criticalValue: 10
      }
    };
    component.initialize_slow_queries_trend_graph();
    expect(chartConstructorSpy).toHaveBeenCalled();
    const chartOptions = chartConstructorSpy.mock.calls[0][0] as Highcharts.Options;
    expect(chartOptions.chart?.renderTo).toBe('slow_queries_trend');
    expect(chartOptions.series?.[0].name).toBe('Slow Queries Rate');
    const series = chartOptions.series?.[0] as Highcharts.SeriesSplineOptions;
    expect(series.data).toHaveLength(3);
    chartConstructorSpy.mockRestore();
  });

  it('should mark points with warning color when value exceeds warning threshold', () => {
    (Highcharts.chart as jest.Mock).mockClear();
    const chartConstructorSpy = jest.spyOn(Highcharts as any, 'chart').mockReturnValue(mockChartInstance);
    const mockSlowQueriesData = [
      { slow_queries_rate: 1, time_bucket: '202511041321' },
      { slow_queries_rate: 4, time_bucket: '202511041322' },
      { slow_queries_rate: 2, time_bucket: '202511041323' },
    ];
    component.slowQueriesTrendData = mockSlowQueriesData;
    component.thresholds = {
      meter_mysql_slow_queries_rate: {
        avgBaseline: 1,
        warningValue: 3,
        criticalValue: 10
      }
    };
    component.isSlowQueriesBreached = false;
    component.initialize_slow_queries_trend_graph();
    const chartOptions = chartConstructorSpy.mock.calls[0][0] as Highcharts.Options;
    const chartSeries = chartOptions.series?.[0] as Highcharts.SeriesSplineOptions;
    const chartData = chartSeries.data as Highcharts.PointOptionsObject[];
    expect(chartData[1].marker?.fillColor).toBe('orange');
    expect(component.isSlowQueriesBreached).toBe(true);
    chartConstructorSpy.mockRestore();
  });

  it('should mark points with critical color when value exceeds critical threshold', () => {
    (Highcharts.chart as jest.Mock).mockClear();
    const chartConstructorSpy = jest.spyOn(Highcharts as any, 'chart').mockReturnValue(mockChartInstance);
    const mockSlowQueriesData = [
      { slow_queries_rate: 1, time_bucket: '202511041321' },
      { slow_queries_rate: 12, time_bucket: '202511041322' },
      { slow_queries_rate: 2, time_bucket: '202511041323' },
    ];
    component.slowQueriesTrendData = mockSlowQueriesData;
    component.thresholds = {
      meter_mysql_slow_queries_rate: {
        avgBaseline: 1,
        warningValue: 3,
        criticalValue: 10
      }
    };
    component.isSlowQueriesBreached = false;
    component.initialize_slow_queries_trend_graph();
    const chartOptions = chartConstructorSpy.mock.calls[0][0] as Highcharts.Options;
    const chartSeries = chartOptions.series?.[0] as Highcharts.SeriesSplineOptions;
    const chartData = chartSeries.data as Highcharts.PointOptionsObject[];
    expect(chartData[1].marker?.fillColor).toBe('red');
    expect(component.isSlowQueriesBreached).toBe(true);
    chartConstructorSpy.mockRestore();
  });

  it('should not mark points when values are below thresholds', () => {
    const chartConstructorSpy = jest.spyOn(Highcharts as any, 'chart').mockReturnValue(mockChartInstance);
    const mockSlowQueriesData = [
      { slow_queries_rate: 0, time_bucket: '202511041321' },
      { slow_queries_rate: 1, time_bucket: '202511041322' },
      { slow_queries_rate: 2, time_bucket: '202511041323' },
    ];
    component.slowQueriesTrendData = mockSlowQueriesData;
    component.thresholds = {
      meter_mysql_slow_queries_rate: {
        avgBaseline: 1,
        warningValue: 3,
        criticalValue: 10
      }
    };
    component.isSlowQueriesBreached = false;
    component.initialize_slow_queries_trend_graph();
    const chartOptions = chartConstructorSpy.mock.calls[0][0] as Highcharts.Options;
    const chartSeries = chartOptions.series?.[0] as Highcharts.SeriesSplineOptions;
    const chartData = chartSeries.data as Highcharts.PointOptionsObject[];
    expect(chartData[0].marker?.fillColor).toBeUndefined();
    expect(chartData[1].marker?.fillColor).toBeUndefined();
    expect(chartData[2].marker?.fillColor).toBeUndefined();
    expect(component.isSlowQueriesBreached).toBe(false);
    chartConstructorSpy.mockRestore();
  });

  it('should handle slow queries chart initialization with no thresholds', () => {
    const chartConstructorSpy = jest.spyOn(Highcharts as any, 'chart').mockReturnValue(mockChartInstance);
    const mockSlowQueriesData = [
      { slow_queries_rate: 5, time_bucket: '202511041321' },
    ];
    component.slowQueriesTrendData = mockSlowQueriesData;
    component.thresholds = undefined;
    component.initialize_slow_queries_trend_graph();
    expect(chartConstructorSpy).toHaveBeenCalled();
    const chartOptions = chartConstructorSpy.mock.calls[0][0] as Highcharts.Options;
    const chartSeries = chartOptions.series?.[0] as Highcharts.SeriesSplineOptions;
    const chartData = chartSeries.data as Highcharts.PointOptionsObject[];
    expect(chartData[0].marker?.fillColor).toBeUndefined();
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

  it('should initialize command trend graph with correct series data and colors', () => {
    (Highcharts.chart as jest.Mock).mockClear();
    component.commandTrendData = [
      { time_bucket: '202511040946', select_rate: 2 },
      { time_bucket: '202511040947', select_rate: 5 },
    ];
    component.thresholds = {
      meter_mysql_commands_select_rate: {
        avgBaseline: 1,
        warningValue: 3,
        criticalValue: 6
      }
    };
    const chartSpy = jest.spyOn(Highcharts as any, 'chart').mockReturnValue({} as any);
    component.initialize_commands_trend_graph();
    expect(chartSpy).toHaveBeenCalled();
    const chartOptions = chartSpy.mock.calls[0][0] as Highcharts.Options;
    expect(chartOptions.chart?.renderTo).toBe('commands_trend');
    expect(chartOptions.series?.[0].name).toBe('select rate');
    const seriesData = chartOptions.series?.[0] as any;
    expect(seriesData.data.length).toBe(2);
    chartSpy.mockRestore();
  });

  it('should apply no marker colors when thresholds are undefined', () => {
    component.commandTrendData = [
      { time_bucket: '202511040946', select_rate: 1 },
    ];
    component.thresholds = undefined;
    component.initialize_commands_trend_graph();
    const chartOptions = (Highcharts.chart as jest.Mock).mock.calls[0][0] as Highcharts.Options;
    const series = chartOptions.series?.[0] as Highcharts.SeriesSplineOptions;
    const data = series.data as Highcharts.PointOptionsObject[];
    expect(data[0].marker?.fillColor).toBeUndefined();
  });

  it('should handle errors during command trend graph initialization gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const chartConstructorSpy = jest.spyOn(Highcharts as any, 'chart').mockImplementation(() => {
      throw new Error('Chart creation failed');
    });
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

  it('should call getServiceThreads and initialize_trends_graph on success', fakeAsync(() => {
    const spyInit = jest.spyOn(component, 'initialize_trends_graph');
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadTrendsGraph();
    tick();
    expect(dbService.getServiceThreads).toHaveBeenCalledWith('1', 1000, 2000);
    expect(component.trendsData.length).toBeGreaterThan(0);
    expect(spyInit).toHaveBeenCalled();
  }));

  it('should handle service failure correctly', fakeAsync(() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    dbService.getServiceThreads.mockReturnValueOnce(of({
      serviceResponse: [],
      serviceStatus: 'FAILURE',
      serviceError: 'Threads error'
    } as unknown as ServiceResponse<any[]>));
    component.serviceId = '1';
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
    dbService.getServiceThreads.mockReturnValueOnce(
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

  it('should initialize trends graph with correct series data', () => {
    (Highcharts.chart as jest.Mock).mockClear();
    const chartSpy = jest.spyOn(Highcharts, 'chart').mockReturnValue({} as any);
    component.trendsData = [
      { threads_running: 1, threads_connected: 2, threads_cached: 3, threads_created: 4, time_bucket: '202511041321' },
      { threads_running: 2, threads_connected: 3, threads_cached: 4, threads_created: 5, time_bucket: '202511041322' },
    ];
    component.initialize_trends_graph();
    expect(chartSpy).toHaveBeenCalled();
    const chartOptions = chartSpy.mock.calls[0][0] as Highcharts.Options;
    expect(chartOptions.chart?.renderTo).toBe('trends');
    expect(Array.isArray(chartOptions.series)).toBe(true);
    expect(chartOptions.series?.length).toBeGreaterThan(0);
    const firstSeries = chartOptions.series?.[0] as any;
    expect(firstSeries.data.length).toBe(2);
    expect(firstSeries.data[0].x).toBeDefined();
    expect(firstSeries.data[0].y).toBeDefined();
    chartSpy.mockRestore();
  });

  // Connects

  it('should call getServiceConnects and initialize_connects_graph on success', fakeAsync(() => {
    const spyInit = jest.spyOn(component, 'initialize_connects_graph');
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadConnectsGraph();
    tick();
    expect(dbService.getServiceConnects).toHaveBeenCalledWith('1', 1000, 2000);
    expect(component.connectsData).toEqual(mockConnectsResponse.serviceResponse);
    expect(spyInit).toHaveBeenCalled();
  }));

  it('should handle failure response correctly', fakeAsync(() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    dbService.getServiceConnects.mockReturnValueOnce(of({
      serviceResponse: [],
      serviceStatus: 'FAILURE',
      serviceError: 'Connects error'
    } as unknown as ServiceResponse<any[]>));
    component.serviceId = '1';
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
    dbService.getServiceConnects.mockReturnValueOnce(
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

  it('should initialize connects graph with correct series data', () => {
    (Highcharts.chart as jest.Mock).mockClear();
    const chartSpy = jest.spyOn(Highcharts, 'chart').mockReturnValue({} as any);
    const mockData = [
      { connects_available: 4922, connects_aborted: 1, time_bucket: '202511041321' },
      { connects_available: 4932, connects_aborted: 0, time_bucket: '202511041322' },
    ];
    component.connectsData = mockData;
    component.initialize_connects_graph();
    expect(chartSpy).toHaveBeenCalled();
    const chartOptions = chartSpy.mock.calls[0][0] as Highcharts.Options;
    expect(chartOptions.chart?.renderTo).toBe('connects');
    expect(chartOptions.series?.length).toBeGreaterThan(0);
    const firstSeries = chartOptions.series?.[0] as any;
    expect(firstSeries.data.length).toBe(mockData.length);
    chartSpy.mockRestore();
  });

  // Connects Error

  it('should call getServiceConnectionErrors and initialize_connection_errors_graph on success', fakeAsync(() => {
    const spyInit = jest.spyOn(component, 'initialize_connection_errors_graph');
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadConnectionErrorsGraph();
    tick();
    expect(dbService.getServiceConnectionErrors).toHaveBeenCalledWith('1', 1000, 2000);
    expect(component.connectionErrorsData).toEqual(mockConnectsErrorsResponse.serviceResponse);
    expect(spyInit).toHaveBeenCalled();
  }));

  it('should handle failure response gracefully', fakeAsync(() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    dbService.getServiceConnectionErrors.mockReturnValueOnce(of({
      serviceResponse: [],
      serviceStatus: 'FAILURE',
      serviceError: 'Connection Errors test failure'
    } as unknown as ServiceResponse<any[]>));
    component.serviceId = '1';
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
    dbService.getServiceConnectionErrors.mockReturnValueOnce(
      new Observable(subscriber => subscriber.error(new Error('Observable failed')))
    );
    component.serviceId = '1';
    component.startTime = 1000;
    component.endTime = 2000;
    component.loadConnectionErrorsGraph();
    tick();
    expect(component.connectionErrorsData).toEqual([]);
    expect(destroySpy).toHaveBeenCalled();
  }));

  it('should create connection errors chart with correct series data', () => {
    (Highcharts.chart as jest.Mock).mockClear();
    const chartSpy = jest.spyOn(Highcharts, 'chart').mockReturnValue({} as any);
    const mockData = [
      { internal: 4922, max_connections: 0, accept: 0, tcpwrap: 0, time_bucket: '202511041321' },
      { internal: 4932, max_connections: 1, accept: 0, tcpwrap: 0, time_bucket: '202511041322' },
    ];
    component.connectionErrorsData = mockData;
    component.initialize_connection_errors_graph();
    expect(chartSpy).toHaveBeenCalled();
    const chartOptions = chartSpy.mock.calls[0][0] as Highcharts.Options;
    expect(chartOptions.chart?.renderTo).toBe('connection_errors');
    expect(chartOptions.series?.length).toBe(4);
    const firstSeries = chartOptions.series?.[0] as any;
    expect(firstSeries.name).toBe('Internal Errors');
    expect(firstSeries.data.length).toBe(mockData.length);
    const firstPoint = firstSeries.data[0];
    expect(firstPoint).toHaveProperty('x');
    expect(firstPoint).toHaveProperty('y', mockData[0].internal);
    chartSpy.mockRestore();
  });

  // Instance Tab

  it('should render instance rows when instanceList has data', () => {
    component.instanceList = [
      { instanceName: 'db1', upTime: '5', memory: '2GB', memoryUsage: 70, ram: '4GB', ramUsage: 50 },
      { instanceName: 'db2', upTime: '10', memory: '3GB', memoryUsage: 80, ram: '6GB', ramUsage: 60 },
    ] as MockInstanceData[];
    component.metricThresholdList = {
      meter_mysql_threads_connected: {
        warningValue: 0,
        criticalValue: 0
      }
    };
    fixture.detectChanges();
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(5);
    expect(rows[0].nativeElement.textContent).toContain('db1');
  });

  it('should show "No Data" message when instanceList is empty', () => {
    component.instanceList = [];
    component.metricThresholdList = {
      meter_mysql_threads_connected: {
        warningValue: 0,
        criticalValue: 0
      }
    };
    fixture.detectChanges();
    const noData = fixture.debugElement.query(By.css('strong'));
    expect(noData.nativeElement.textContent).toContain('No Data');
  });

  it('should toggle sorting order and update sortparam', () => {
    component.databaseSlowStatements = [
      { instanceName: 'z' },
      { instanceName: 'a' },
    ] as any;
    component.sortBy('instanceName');
    expect(component.sortparam).toBe('instanceName');
    expect(component.sortDirection).toBe('asc');
    component.sortBy('instanceName');
    expect(component.sortDirection).toBe('desc');
  });

  it('should sort databaseSlowStatements alphabetically when sorting by instanceName', () => {
    component.databaseSlowStatements = [
      { instanceName: 'z' },
      { instanceName: 'a' },
    ] as MySQLSlowStatementMock[];
    component.sortBy('instanceName');
    expect((component.databaseSlowStatements[0] as MySQLSlowStatementMock).instanceName).toBe('a');
  });

  it('should call setServiceInstance, store data in sessionStorage, and navigate', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    const instanceName = 'myInstance';
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    component.setServiceInstance(instanceName);
    expect(setItemSpy).toHaveBeenCalledWith('databaseInstanceId', instanceName);
    expect(setItemSpy).toHaveBeenCalledWith(
      'encodedDatabaseInstanceId',
      component.serviceId + '_' + btoa(instanceName)
    );
    expect(navigateSpy).toHaveBeenCalledWith(['/database/instance']);
    setItemSpy.mockRestore();
  });

  // Slow Statements Tab

  it('should filter slow statements by search query', () => {
    component.searchQuery = 'alice';
    component.onSearchSlowStatements();
    expect(component.filteredSlowStatements.length).toBe(1);
    expect(component.filteredSlowStatements[0].user).toBe('alice');
    component.searchQuery = 'host1';
    component.onSearchSlowStatements();
    expect(component.filteredSlowStatements.length).toBe(2);
    component.searchQuery = '';
    component.onSearchSlowStatements();
    expect(component.filteredSlowStatements.length).toBe(3);
  });

  it('should sort slow statements by a given field', () => {
    component.sortBy('duration'); // ascending
    expect(component.databaseSlowStatements.map(s => s.duration)).toEqual([50, 100, 200]);
    component.sortBy('duration'); // descending
    expect(component.databaseSlowStatements.map(s => s.duration)).toEqual([200, 100, 50]);
    component.sortBy('user'); // ascending alphabetical
    expect(component.databaseSlowStatements.map(s => s.user)).toEqual(['alice', 'bob', 'charlie']);
  });

   // Error handling

  it("should handle invalid structure and NOT call initializeCharts", () => {
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  const initSpy = jest.spyOn(component, "initializeCharts");
  const badResponse = { wrong: "data" }; 
  mockThreshold.getThreshold.mockReturnValue(of(badResponse));
  component.getThreshold("MYSQL");
  expect(consoleSpy).toHaveBeenCalledWith(
    "Missing or invalid 'baselineList' in threshold response:",
    badResponse
  );
  expect(initSpy).not.toHaveBeenCalled();
});

it("should detect negative values and NOT call initializeCharts", () => {
  const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  const initSpy = jest.spyOn(component, "initializeCharts");
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
  expect(initSpy).not.toHaveBeenCalled();
});

it("should accept valid response and call initializeCharts", () => {
  const initSpy = jest.spyOn(component, "initializeCharts");
  mockThreshold.getThreshold.mockReturnValue(of(mockGetThreshold));
  component.getThreshold("MYSQL");
  expect(initSpy).toHaveBeenCalled();
  expect(component.thresholds).toEqual(mockGetThreshold);
});

});
