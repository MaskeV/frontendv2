import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TechnicalComponent } from './technical.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { OverviewService } from '../../../../services/overview.service';
import { DecoderService } from '../../../../services/decoder.service';
import { ChartComponent } from '../../../../utility/chart/chart.component';
import { GeneralServicesComponent } from '../general-services/general-services.component';

Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
  configurable: true,
  value: 1000,
});
Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
  configurable: true,
  value: 500,
});

// Mocked services
const mockOverviewService = {
  generateServiceError: jest.fn().mockReturnValue(of({
    [btoa('ServiceA') + '.suffix']: 5,
    [btoa('ServiceB') + '.suffix']: 3
  })),
  generateHostHealthData: jest.fn().mockReturnValue([
    { name: 'Host A', value: 80, x: 0, y: 0 },
    { name: 'Host B', value: 65, x: 1, y: 0 },
    { name: 'Host C', value: 30, x: 2, y: 0 }
  ]),
  generateDatabaseHealthData: jest.fn().mockReturnValue([
    { name: 'DB-001', value: 70, x: 0, y: 0 }
  ]),
  generateWebAppMetrics: jest.fn().mockReturnValue([
    120, 140, 110, 160
  ]),
  generateNetworkTrafficData: jest.fn().mockReturnValue(
    of({
      [btoa('192.168.12.108') + '.linux']: [
        {
          meter_vm_network_receive: 91.379,
          meter_vm_network_transmit: 81.7,
          time_bucket: '202508041149',
          total: 173.08
        },
        {
          meter_vm_network_receive: 116.447,
          meter_vm_network_transmit: 79.945,
          time_bucket: '202508041150',
          total: 196.39
        },
        {
          meter_vm_network_receive: 166.462,
          meter_vm_network_transmit: 151.822,
          time_bucket: '202508041151',
          total: 318.28
        }
      ]
    })
  ),
  getTotalNetworkTraffic: jest.fn().mockReturnValue(
    of({
      [btoa('192.168.12.108') + '.linux']: [
        {
          meter_vm_network_receive: 91.379,
          meter_vm_network_transmit: 81.7,
          time_bucket: '202508041149',
          total: 173.08
        },
        {
          meter_vm_network_receive: 116.447,
          meter_vm_network_transmit: 79.945,
          time_bucket: '202508041150',
          total: 196.39
        },
        {
          meter_vm_network_receive: 166.462,
          meter_vm_network_transmit: 151.822,
          time_bucket: '202508041151',
          total: 318.28
        }
      ]
    })
  ),
  getServiceDashboardCpuUsage: jest.fn().mockReturnValue(
    of({
      [btoa('192.168.12.108') + '.cpu']: [
        {
          cpuUsage: 30,
          system: 10,
          softirq: 2,
          idle: 365,
          steal: 0,
          time_bucket: "202508041153",
          irq: 0,
          iowait: 1,
          user: 18,
          nice: 0
        },
        {
          cpuUsage: 28,
          system: 10,
          softirq: 2,
          idle: 364,
          steal: 0,
          time_bucket: "202508041154",
          irq: 0,
          iowait: 1,
          user: 16,
          nice: 1
        },
        {
          cpuUsage: 28,
          system: 10,
          softirq: 2,
          idle: 365,
          steal: 0,
          time_bucket: "202508041155",
          irq: 0,
          iowait: 1,
          user: 15,
          nice: 0
        }
      ]
    })
  ),
  getMemoryUsage: jest.fn().mockReturnValue(
    of({
      [btoa('192.168.12.108') + '.memory']: [
        {
          meter_vm_memory_total: 7821.059,
          time_bucket: "202508041200",
          meter_vm_memory_available: 3247.77,
          meter_vm_memory_buff_cache: 2561.815,
          meter_vm_memory_used: 4573.289
        },
        {
          meter_vm_memory_total: 7821.059,
          time_bucket: "202508041201",
          meter_vm_memory_available: 3248.065,
          meter_vm_memory_buff_cache: 2561.837,
          meter_vm_memory_used: 4572.993
        },
        {
          meter_vm_memory_total: 7821.059,
          time_bucket: "202508041202",
          meter_vm_memory_available: 3249.886,
          meter_vm_memory_buff_cache: 2561.849,
          meter_vm_memory_used: 4571.172
        }
      ]
    })
  ),
  getDiskUsage: jest.fn().mockReturnValue(
    of({
      [btoa('192.168.12.108') + '.disk']: [
        {
          "/boot": 36,
          "/run/user/0": 0,
          "time_bucket": "202508041158",
          "/run": 10,
          "/data": 100,
          "/": 33,
          "/run/lock": 5,
          "/run/user/1000": 1,
          "/run/user/1001": 0
        },
        {
          "/boot": 36,
          "/run/user/0": 0,
          "time_bucket": "202508041159",
          "/run": 10,
          "/data": 100,
          "/": 33,
          "/run/lock": 5,
          "/run/user/1000": 1,
          "/run/user/1001": 0
        },
        {
          "/boot": 36,
          "/run/user/0": 0,
          "time_bucket": "202508041200",
          "/run": 10,
          "/data": 100,
          "/": 33,
          "/run/lock": 5,
          "/run/user/1000": 1,
          "/run/user/1001": 0
        }
      ]
    })
  ),
  getServiceEndpointError: jest.fn().mockReturnValue(
    of({
      [btoa('192.168.12.108') + '.service']: [
        { time_bucket: '202508041231', error_count: 26 },
        { time_bucket: '202508041232', error_count: 26 },
        { time_bucket: '202508041233', error_count: 52 }
      ]
    })
  ),
  getServiceLogError: jest.fn().mockReturnValue(
    of({
      [btoa('192.168.12.108') + '.service']: [
        { error_logCount: 6, time_bucket: '202508041215' },
        { error_logCount: 5, time_bucket: '202508041216' },
        { error_logCount: 3, time_bucket: '202508041217' }
      ]
    })
  ),
  getSlowStatementByDBLatency: jest.fn().mockReturnValue(
    of({
      [btoa('Shine_PROD') + '.someSuffix']: {
        [btoa('192.168.12.109:3306') + '.anotherSuffix']: [
          { trace_id: '...', latency: 1308, statement: '...', time_bucket: '20250804121651' },
          { trace_id: '...', latency: 1296, statement: '...', time_bucket: '20250804122700' },
          { trace_id: '...', latency: 1181, statement: '...', time_bucket: '20250804122538' }
        ]
      }
    })
  ),
  getFeatureFlow: jest.fn().mockReturnValue(
    of({
      "Apply Leave": [
        { step_order: 1, stepName: "login page", application_name: "Ishine_PROD", endpoint: "POST:/employeeportal/api/authenticateUserWithOTP", latency: 150, success_rate: 100 },
        { step_order: 2, stepName: "Leave page", application_name: "Ishine_PROD", endpoint: "POST:/employeeportal/api/getAllMyLeaveApplicationsByEmpId", latency: 200, success_rate: 95 },
        { step_order: 3, stepName: "Apply Leave Button", application_name: "Ishine_PROD", endpoint: "POST:/employeeportal/api/applyLeave", latency: 180, success_rate: 100 },
        { step_order: 4, stepName: "logout", application_name: "Ishine_PROD", endpoint: "POST:/employeeportal/api/logoutUser", latency: 120, success_rate: 100 }
      ]
    })
  ),
  getApplicationLatency: jest.fn().mockReturnValue(
    of({
      "UnVhbWJvdDo6QXBwbGljYXRpb25fU2VydmljZQ==.1": [
        { time_bucket: "202508041208" },
        { time_bucket: "202508041209" },
        { time_bucket: "202508041210" }
      ],
      "UnVhbWJvdDo6Q2xvdWRfR2F0ZXdheV9TZXJ2aWNl.1": [
        { latency: 9, time_bucket: "202508041208" },
        { latency: 13, time_bucket: "202508041209" },
        { latency: 6, time_bucket: "202508041210" }
      ]
    })
  ),
};

const mockDecoderService = {
  decryptJson: jest.fn().mockReturnValue({ userId: 'test-user-id' })
};

describe('TechnicalComponent', () => {
  let component: TechnicalComponent;
  let fixture: ComponentFixture<TechnicalComponent>;

  beforeEach(async () => {
    sessionStorage.setItem('currentUser', JSON.stringify({ userId: 'test-user-id' }));

    await TestBed.configureTestingModule({
      imports: [TechnicalComponent, HttpClientTestingModule, ChartComponent],
      providers: [
        { provide: OverviewService, useValue: mockOverviewService },
        { provide: DecoderService, useValue: mockDecoderService },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: '123' }),
            queryParams: of({}),
            snapshot: { data: {} }
          }
        }
      ]
    })
      .overrideComponent(GeneralServicesComponent, {
        set: {
          template: '<div id="container" #chartContainer></div>',
        }
      }).compileComponents();

    fixture = TestBed.createComponent(TechnicalComponent);
    component = fixture.componentInstance;
    component.startTime = Date.now() - 100000;
    component.endTime = Date.now();
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call generateServiceError and populate chart options', () => {
    component.getServiceError();
    expect(mockOverviewService.generateServiceError).toHaveBeenCalledWith('test-user-id', component.startTime, component.endTime);
  });

  it('should call getServiceDashboardCpuUsage and process CPU data', () => {
    component.getCpuUsage();
    expect(mockOverviewService.getServiceDashboardCpuUsage).toHaveBeenCalledWith('test-user-id', component.startTime, component.endTime);
    expect(component.cachedCpuUsageSeries.length).toBeGreaterThan(0);
    expect(component.cpuUsageChartOptions).toBeDefined();
  });

  it('should call getMemoryUsage and process memory data', () => {
    component.getMemoryUsage();
    expect(mockOverviewService.getMemoryUsage).toHaveBeenCalledWith('test-user-id', component.startTime, component.endTime);
    expect(component.cachedMemoryusageSeries.length).toBeGreaterThan(0);
    expect(component.memoryUsageChartOptions).toBeDefined();
  });

  it('should call getDiskUsage and process disk usage data', () => {
    component.getDiskUsage();
    expect(mockOverviewService.getDiskUsage).toHaveBeenCalledWith('test-user-id', component.startTime, component.endTime);
    expect(component.cachedDiskusageSeries.length).toBeGreaterThan(0);
    expect(component.diskUsageChartOptions).toBeDefined();
  });

  it('should call getServiceEndpointError and process error data', () => {
    component.getServiceEndpointError();
    expect(mockOverviewService.getServiceEndpointError).toHaveBeenCalledWith('test-user-id', component.startTime, component.endTime);
    expect(component.cachedServiceEndpointSeries.length).toBeGreaterThan(0);
    expect(component.serviceEndpointErrorChartOptions).toBeDefined();
  });

  it('should call getServiceLogError and process logs error heatmap', () => {
    component.getLogsError();
    expect(mockOverviewService.getServiceLogError).toHaveBeenCalledWith('test-user-id', component.startTime, component.endTime);
    expect(component.logsErrorChartOptions).toBeDefined();
  });
});
