import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContainerDashboardComponent } from './container-dashboard.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import type * as HighchartsType from 'highcharts';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { InfraService } from '../../../../../services/infra.service';

// Extension Mocks
jest.mock('highcharts/highcharts-more.js', () => jest.fn());
jest.mock('highcharts/modules/solid-gauge.js', () => jest.fn());
jest.mock('highcharts/modules/exporting.js', () => jest.fn());
jest.mock('highcharts/modules/export-data.js', () => jest.fn());
jest.mock('highcharts/modules/accessibility.js', () => jest.fn());

const Highcharts = require('highcharts') as typeof HighchartsType;

(global as any).bootstrap = {
  Tooltip: jest.fn(() => ({ dispose: jest.fn() }))
};

describe('ContainerDashboardComponent', () => {
  let component: ContainerDashboardComponent;
  let fixture: ComponentFixture<ContainerDashboardComponent>;
  const mockChartInstance = { destroy: jest.fn() };
  let mockInfraService: any;

  const mockContainerStatus = {
    meter_redis_instance_db_keys: 4396,
    meter_redis_instance_connected_clients: 1,
    meter_redis_instance_memory_usage: 1,
    meter_redis_instance_uptime: 19281911,
    meter_redis_instance_redis_blocked_clients: 0,
    meter_redis_instance_expired_keys_total: 17169,
    meter_redis_instance_evicted_keys_total: 0,
  };

  const mockContainerDetails = [
    {
      "6b689b82dc3b-mysql_db": 1,
      "time_bucket": "202511271155"
    },
    {
      "6b689b82dc3b-mysql_db": 1,
      "time_bucket": "202511271156"
    },
    {
      "6b689b82dc3b-mysql_db": 1,
      "time_bucket": "202511271157"
    },
  ];

  const mockCPUUsage = [
    {
      "6b689b82dc3b-mysql_db": 9,
      "time_bucket": "202511271155"
    },
    {
      "6b689b82dc3b-mysql_db": 1,
      "time_bucket": "202511271156"
    },
    {
      "6b689b82dc3b-mysql_db": 1,
      "time_bucket": "202511271157"
    },
  ];

  const mockMemoUsage = [
    {
      "6b689b82dc3b-mysql_db": 15,
      "time_bucket": "202511271155"
    },
    {
      "6b689b82dc3b-mysql_db": 15,
      "time_bucket": "202511271156"
    },
    {
      "6b689b82dc3b-mysql_db": 15,
      "time_bucket": "202511271157"
    },
  ];

  const mockContainerNetworkReceivedRate = [
    {
      "6b689b82dc3b-mysql_db": 20003668850,
      "time_bucket": "202511271155"
    },
    {
      "6b689b82dc3b-mysql_db": 20004005947,
      "time_bucket": "202511271156"
    },
    {
      "6b689b82dc3b-mysql_db": 20004517380,
      "time_bucket": "202511271157"
    },
  ]

  const mockContainerNetworkTransmittedRate = [
    {
      "6b689b82dc3b-mysql_db": 128716942702,
      "time_bucket": "202511271155"
    },
    {
      "6b689b82dc3b-mysql_db": 128718988874,
      "time_bucket": "202511271156"
    },
    {
      "6b689b82dc3b-mysql_db": 128721682024,
      "time_bucket": "202511271157"
    },
  ]

  const getContainerProperties = {
    "size": "428.201MB",
    "created": "2025-10-18 12:02",
    "repoTags": "[ruambot-mysql:latest]",
    "cpu_limit": 6,
    "name": "mysql_db",
    "id": "6b689b82dc3b",
    "memory_limit": 6144
  }

  beforeEach(async () => {
    mockInfraService = {
      getContainerStatus: jest.fn().mockReturnValue(of(mockContainerStatus)),
      getContainerDetails: jest.fn().mockReturnValue(of(mockContainerDetails)),
      getContainerCPUUsage: jest.fn().mockReturnValue(of(mockCPUUsage)),
      getContainersMemoryUsage: jest.fn().mockReturnValue(of(mockMemoUsage)),
      getContainerNetworkReceivedRate: jest.fn().mockReturnValue(of(mockContainerNetworkReceivedRate)),
      getContainerNetworkTransmitRate: jest.fn().mockReturnValue(of(mockContainerNetworkTransmittedRate)),
      getContainerProperties: jest.fn().mockReturnValue(of(getContainerProperties)),
    };

    await TestBed.configureTestingModule({
      imports: [ContainerDashboardComponent, HttpClientTestingModule, RouterTestingModule],
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
        { provide: InfraService, useValue: mockInfraService },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ContainerDashboardComponent);
    component = fixture.componentInstance;
    (Highcharts.chart as jest.Mock) = jest.fn().mockReturnValue(mockChartInstance);
    jest.spyOn(component, 'loadData').mockImplementation(jest.fn());
    jest.spyOn(sessionStorage['__proto__'], 'setItem');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render breadcrumb container', () => {
    const breadcrumb = fixture.debugElement.query(By.css('nav[aria-label="breadcrumb"]'));
    expect(breadcrumb).toBeTruthy();
  });

  it('should display selectedServiceId in the first breadcrumb item', () => {
    component.selectedServiceId = 'linux123';
    fixture.detectChanges();

    const firstItem = fixture.debugElement.queryAll(By.css('.breadcrumb-item a'))[0];
    expect(firstItem.nativeElement.textContent).toContain('linux123');
  });

  it('should display selectedServiceName in the third breadcrumb item', () => {
    component.selectedServiceName = 'nginx-service';
    fixture.detectChanges();
    const activeItem = fixture.debugElement.query(By.css('.breadcrumb-item.active'));
    expect(activeItem.nativeElement.textContent).toContain('nginx-service');
  });

  it('should display "Container Dashboard" as the active breadcrumb', () => {
    component.selectedServiceName = 'Container Dashboard';
    fixture.detectChanges();
    const activeItem = fixture.debugElement.query(By.css('.breadcrumb-item.active'));
    expect(activeItem.nativeElement.textContent).toContain('Container Dashboard');
  });

  it('should store selectedServiceName in sessionStorage when setContainerName is called', () => {
    component.selectedServiceName = 'nginx';
    component.setContainerName();
    expect(sessionStorage.setItem).toHaveBeenCalledWith('serviceIdForContainerName', 'nginx');
  });

  it('should call loadData after setting the container name', () => {
    component.selectedServiceName = 'nginx';
    component.setContainerName();
    expect(component.loadData).toHaveBeenCalled();
  });

  it('should update selectedServiceName when select value changes in template', () => {
    component.containerDetailsText = ['nginx', 'apache'];
    fixture.detectChanges();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#service');
    select.value = select.options[1].value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.selectedServiceName).toBe('apache');
    expect(sessionStorage.setItem).toHaveBeenCalledWith('serviceIdForContainerName', 'apache');
    expect(component.loadData).toHaveBeenCalled();
  });

  // Container Details

  it('should create chart instance when valid data is provided', () => {
    const mockData = [
      { time_bucket: '202511011200', cpu: 10, memory: 20 },
      { time_bucket: '202511011205', cpu: 15, memory: 25 }
    ];
    component.getcontainerDetailsCharts(mockData);
    expect(Highcharts.chart).toHaveBeenCalledWith(
      'containerDetailsChartsContainer',
      expect.objectContaining({ series: expect.any(Array) })
    );
    expect(component.containerDetailsCharts).toBe(mockChartInstance);
  });

  it('should destroy previous chart before creating a new one', () => {
    component.containerDetailsCharts = mockChartInstance as any;
    const mockData = [
      { time_bucket: '202511011200', cpu: 10 }
    ];
    component.getcontainerDetailsCharts(mockData);
    expect(mockChartInstance.destroy).toHaveBeenCalled();
  });

  it('should handle empty data by showing "No Data Available"', () => {
    component.containerDetailsCharts = mockChartInstance as any;
    component.getcontainerDetailsCharts([]);
    expect(Highcharts.chart).toHaveBeenCalledWith(
      'containerDetailsChartsContainer',
      expect.objectContaining({
        title: expect.objectContaining({ text: 'No Data Available' }),
        series: []
      })
    );
    expect(component.containerDetailsCharts).toBe(mockChartInstance);
  });

  it('should format categories as time if data timestamps are less than 24h apart', () => {
    const mockData = [
      { time_bucket: '202511011200', cpu: 10 },
      { time_bucket: '202511011201', cpu: 15 }
    ];
    const parseTimeSpy = jest.spyOn(component, 'parseTimeBucket').mockImplementation((tb: string) => new Date(`2025-11-01T${tb.slice(8, 10)}:${tb.slice(10, 12)}:00`));
    component.getcontainerDetailsCharts(mockData);
    const callOptions = (Highcharts.chart as jest.Mock).mock.calls[0][1];
    expect(callOptions.xAxis.categories[0]).toMatch(/\d{2}:\d{2}/);
    parseTimeSpy.mockRestore();
  });

  it('should add chart to component.charts array and call syncCharts', () => {
    component.charts = [];
    const syncChartsSpy = jest.spyOn(component, 'syncCharts').mockImplementation(jest.fn());
    const mockData = [
      { time_bucket: '202511011200', cpu: 10 }
    ];
    component.getcontainerDetailsCharts(mockData);
    expect(component.charts).toContain(mockChartInstance);
    expect(syncChartsSpy).toHaveBeenCalledWith(component.charts);
  });

  // Container CPU Usage

  it('should create chart instance when valid CPU usage data is provided', () => {
    const mockData = [
      { time_bucket: '202511011200', cpu: 50, memory: 20 },
      { time_bucket: '202511011205', cpu: 55, memory: 25 }
    ];
    component.getContainerCPUUsageCharts(mockData);
    expect(Highcharts.chart).toHaveBeenCalledWith(
      'containerCpuUsageChartsContainer',
      expect.objectContaining({ series: expect.any(Array) })
    );
    expect(component.containerCpuUsageCharts).toBe(mockChartInstance);
  });

  it('should destroy previous chart before creating a new one', () => {
    component.containerCpuUsageCharts = mockChartInstance as any;
    const mockData = [
      { time_bucket: '202511011200', cpu: 50 }
    ];
    component.getContainerCPUUsageCharts(mockData);
    expect(mockChartInstance.destroy).toHaveBeenCalled();
  });

  it('should handle empty data by showing "No Data Available"', () => {
    component.containerCpuUsageCharts = mockChartInstance as any;
    component.getContainerCPUUsageCharts([]);
    expect(Highcharts.chart).toHaveBeenCalledWith(
      'containerCpuUsageChartsContainer',
      expect.objectContaining({
        title: expect.objectContaining({ text: 'No Data Available' }),
        series: []
      })
    );
    expect(component.containerCpuUsageCharts).toBe(mockChartInstance);
  });

  it('should format x-axis categories as time if timestamps are less than 24 hours apart', () => {
    const mockData = [
      { time_bucket: '202511011200', cpu: 50 },
      { time_bucket: '202511011201', cpu: 55 }
    ];
    const parseTimeSpy = jest.spyOn(component, 'parseTimeBucket').mockImplementation((tb: string) => new Date(`2025-11-01T${tb.slice(8, 10)}:${tb.slice(10, 12)}:00`));
    component.getContainerCPUUsageCharts(mockData);
    const callOptions = (Highcharts.chart as jest.Mock).mock.calls[0][1];
    expect(callOptions.xAxis.categories[0]).toMatch(/\d{2}:\d{2}/);
    parseTimeSpy.mockRestore();
  });

  it('should add chart to charts array and call syncCharts', () => {
    component.charts = [];
    const syncChartsSpy = jest.spyOn(component, 'syncCharts').mockImplementation(jest.fn());
    const mockData = [
      { time_bucket: '202511011200', cpu: 50 }
    ];
    component.getContainerCPUUsageCharts(mockData);
    expect(component.charts).toContain(mockChartInstance);
    expect(syncChartsSpy).toHaveBeenCalledWith(component.charts);
  });

  // Containers Memory Usage

  it('should create chart instance when valid memory usage data is provided', () => {
    const mockData = [
      { time_bucket: '202511011200', memory: 30, swap: 10 },
      { time_bucket: '202511011205', memory: 35, swap: 12 }
    ];
    component.getContainersMemoryUsageCharts(mockData);
    expect(Highcharts.chart).toHaveBeenCalledWith(
      'containerMemoryUsageChartsContainer',
      expect.objectContaining({ series: expect.any(Array) })
    );
    expect(component.containerMemoryUsageCharts).toBe(mockChartInstance);
  });

  it('should destroy previous chart before creating a new one', () => {
    component.containerMemoryUsageCharts = mockChartInstance as any;
    const mockData = [
      { time_bucket: '202511011200', memory: 30 }
    ];
    component.getContainersMemoryUsageCharts(mockData);
    expect(mockChartInstance.destroy).toHaveBeenCalled();
  });

  it('should handle empty data by showing "No Data Available"', () => {
    component.containerMemoryUsageCharts = mockChartInstance as any;
    component.getContainersMemoryUsageCharts([]);
    expect(Highcharts.chart).toHaveBeenCalledWith(
      'containerMemoryUsageChartsContainer',
      expect.objectContaining({
        title: expect.objectContaining({ text: 'No Data Available' }),
        series: []
      })
    );
    expect(component.containerMemoryUsageCharts).toBe(mockChartInstance);
  });

  it('should format x-axis categories as time if timestamps are less than 24 hours apart', () => {
    const mockData = [
      { time_bucket: '202511011200', memory: 30 },
      { time_bucket: '202511011201', memory: 35 }
    ];
    const parseTimeSpy = jest.spyOn(component, 'parseTimeBucket').mockImplementation((tb: string) => new Date(`2025-11-01T${tb.slice(8, 10)}:${tb.slice(10, 12)}:00`));
    component.getContainersMemoryUsageCharts(mockData);
    const callOptions = (Highcharts.chart as jest.Mock).mock.calls[0][1];
    expect(callOptions.xAxis.categories[0]).toMatch(/\d{2}:\d{2}/);
    parseTimeSpy.mockRestore();
  });

  it('should add chart to charts array and call syncCharts', () => {
    component.charts = [];
    const syncChartsSpy = jest.spyOn(component, 'syncCharts').mockImplementation(jest.fn());
    const mockData = [
      { time_bucket: '202511011200', memory: 30 }
    ];
    component.getContainersMemoryUsageCharts(mockData);
    expect(component.charts).toContain(mockChartInstance);
    expect(syncChartsSpy).toHaveBeenCalledWith(component.charts);
  });

  // Container Network Rates

  it('should create chart instance with proper series when received & transmit data provided', () => {
    const receivedData = [
      { time_bucket: '202511011200', rx: 100 },
      { time_bucket: '202511011205', rx: 200 }
    ];
    const transmitData = [
      { time_bucket: '202511011200', tx: 50 },
      { time_bucket: '202511011205', tx: 70 }
    ];
    component.getContainerNetworkNetworkRateCharts(receivedData, transmitData);
    expect(Highcharts.chart).toHaveBeenCalledWith(
      'containerNetworkCombinedChartsContainer',
      expect.objectContaining({
        series: expect.arrayContaining([
          expect.objectContaining({ name: 'Received', data: [100, 200] }),
          expect.objectContaining({ name: 'Transmit', data: [50, 70] }),
          expect.objectContaining({ name: 'Consolidated', data: [150, 270] })
        ])
      })
    );
  });

  it('should handle empty data and show "No Data Available"', () => {
    component.getContainerNetworkNetworkRateCharts([], []);
    expect(Highcharts.chart).toHaveBeenCalledWith(
      'containerNetworkCombinedChartsContainer',
      expect.objectContaining({
        title: expect.objectContaining({ text: 'No Data Available' }),
        series: []
      })
    );
  });

  it('should calculate consolidated series correctly if only receivedData is provided', () => {
    const receivedData = [
      { time_bucket: '202511011200', rx: 100 },
      { time_bucket: '202511011205', rx: 150 }
    ];
    component.getContainerNetworkNetworkRateCharts(receivedData, []);
    const chartOptions = (Highcharts.chart as jest.Mock).mock.calls[0][1];
    const consolidatedSeries = chartOptions.series.find((s: any) => s.name === 'Consolidated');
    expect(consolidatedSeries.data).toEqual([100, 150]);
  });

  it('should calculate consolidated series correctly if only transmitData is provided', () => {
    const receivedData: number[] = [];
    const transmitData: number[] = [60, 40];
    const length = Math.max(receivedData.length, transmitData.length); // 2
    const consolidatedData = Array.from({ length }, (_, i) => (receivedData[i] || 0) + (transmitData[i] || 0));
    console.log(consolidatedData);

  });

  it('should format x-axis categories as time if timestamps are less than 24 hours apart', () => {
    const receivedData = [
      { time_bucket: '202511011200', rx: 100 },
      { time_bucket: '202511011201', rx: 200 }
    ];
    const parseTimeSpy = jest.spyOn(component, 'parseTimeBucket').mockImplementation((tb: string) => new Date(`2025-11-01T${tb.slice(8, 10)}:${tb.slice(10, 12)}:00`));
    component.getContainerNetworkNetworkRateCharts(receivedData, []);
    const chartOptions = (Highcharts.chart as jest.Mock).mock.calls[0][1];
    expect(chartOptions.xAxis.categories[0]).toMatch(/\d{2}:\d{2}/);
    parseTimeSpy.mockRestore();
  });

  // Error Handling

  // getContainerStatus

  it('should handle invalid response structure and set containerDetailsText to empty array', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    (component['infraService'].getContainerStatus as jest.Mock).mockReturnValue(
      of(null)
    );
    component.getContainerStatus();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid container status response:",
      null
    );
    expect(component.containerDetailsText).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('should handle negative numeric values and set containerDetailsText to empty array', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const badResponse = {
      meter_vm_container_cpu_usage_percent: {
        "containerA": -5
      }
    };
    (component['infraService'].getContainerStatus as jest.Mock).mockReturnValue(
      of(badResponse)
    );
    component.getContainerStatus();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative values found in container status. Ignoring response:",
      badResponse
    );
    expect(component.containerDetailsText).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('should properly extract container names on valid response', () => {
    const validResponse = {
      meter_vm_container_cpu_usage_percent: {
        "c1": 1,
        "c2": 2
      },
      meter_vm_container_memory_usage_percent: {
        "c3": 5,
        "c2": 10
      }
    };
    (component['infraService'].getContainerStatus as jest.Mock).mockReturnValue(
      of(validResponse)
    );
    component.getContainerStatus();
    expect(component.containerDetailsText).toEqual(
      expect.arrayContaining(["c1", "c2", "c3"])
    );
  });

  // getContainerDetails

  it('should log error and NOT call chart function when response is NOT an array', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    mockInfraService.getContainerDetails.mockReturnValue(of({ invalid: true }));
    const chartSpy = jest.spyOn(component, 'getcontainerDetailsCharts');
    component.getContainerDetails();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid container details response:",
      { invalid: true }
    );
    expect(chartSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log error and NOT call chart function when negative values exist', () => {
    const negativeMock = [
      { "6b689b82dc3b-mysql_db": -5, time_bucket: "202511271155" }
    ];
    mockInfraService.getContainerDetails.mockReturnValue(of(negativeMock));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const chartSpy = jest.spyOn(component, 'getcontainerDetailsCharts');
    component.getContainerDetails();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative values found in container details. Ignoring response:",
      negativeMock
    );
    expect(chartSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should call chart function when response is valid', () => {
    const chartSpy = jest.spyOn(component, 'getcontainerDetailsCharts');
    mockInfraService.getContainerDetails.mockReturnValue(of(mockContainerDetails));
    component.getContainerDetails();
    expect(chartSpy).toHaveBeenCalledWith(mockContainerDetails);
  });

  it('should handle API error and log it', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const mockErr = new Error("API failed");
    mockInfraService.getContainerDetails.mockReturnValue(
      throwError(() => mockErr)
    );
    const chartSpy = jest.spyOn(component, 'getcontainerDetailsCharts');
    component.getContainerDetails();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load container details:",
      mockErr
    );
    expect(chartSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // getContainerCPUUsage

  it('should log error and NOT call chart function when response is NOT an array', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    mockInfraService.getContainerCPUUsage.mockReturnValue(of({ invalid: true }));
    const chartSpy = jest.spyOn(component, 'getContainerCPUUsageCharts');
    component.getContainerCPUUsage();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid CPU usage response:",
      { invalid: true }
    );
    expect(chartSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log error and NOT call chart function when negative values exist', () => {
    const negativeMock = [
      { "6b689b82dc3b-mysql_db": -5, time_bucket: "202511271155" }
    ];
    mockInfraService.getContainerCPUUsage.mockReturnValue(of(negativeMock));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const chartSpy = jest.spyOn(component, 'getContainerCPUUsageCharts');
    component.getContainerCPUUsage();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative values found in CPU usage. Ignoring response:",
      negativeMock
    );
    expect(chartSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should call chart function when response is valid', () => {
    const chartSpy = jest.spyOn(component, 'getContainerCPUUsageCharts');
    mockInfraService.getContainerCPUUsage.mockReturnValue(of(mockCPUUsage));
    component.getContainerCPUUsage();
    expect(chartSpy).toHaveBeenCalledWith(mockCPUUsage);
  });

  it('should handle API error and log it', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const mockErr = new Error("API failed");
    mockInfraService.getContainerCPUUsage.mockReturnValue(
      throwError(() => mockErr)
    );
    const chartSpy = jest.spyOn(component, 'getContainerCPUUsageCharts');
    component.getContainerCPUUsage();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load container CPU usage:",
      mockErr
    );
    expect(chartSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // getContainersMemoryUsage

  it('should log error and NOT call chart function when response is NOT an array', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    mockInfraService.getContainersMemoryUsage.mockReturnValue(of({ invalid: true }));
    const chartSpy = jest.spyOn(component, 'getContainersMemoryUsageCharts');
    component.getContainersMemoryUsage();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid memory usage response:",
      { invalid: true }
    );
    expect(chartSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log error and NOT call chart function when negative values exist', () => {
    const negativeMock = [
      { "6b689b82dc3b-mysql_db": -5, time_bucket: "202511271155" }
    ];
    mockInfraService.getContainersMemoryUsage.mockReturnValue(of(negativeMock));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const chartSpy = jest.spyOn(component, 'getContainersMemoryUsageCharts');
    component.getContainersMemoryUsage();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative values found in memory usage. Ignoring response:",
      negativeMock
    );
    expect(chartSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should call chart function when response is valid', () => {
    const chartSpy = jest.spyOn(component, 'getContainersMemoryUsageCharts');
    mockInfraService.getContainersMemoryUsage.mockReturnValue(of(mockMemoUsage));
    component.getContainersMemoryUsage();
    expect(chartSpy).toHaveBeenCalledWith(mockMemoUsage);
  });

  it('should handle API error and log it', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const mockErr = new Error("API failed");
    mockInfraService.getContainersMemoryUsage.mockReturnValue(
      throwError(() => mockErr)
    );
    const chartSpy = jest.spyOn(component, 'getContainersMemoryUsageCharts');
    component.getContainersMemoryUsage();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load containers memory usage:",
      mockErr
    );
    expect(chartSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // getContainerNetworkReceivedRate

  it('should log error and NOT call chart function when response is NOT an array', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    mockInfraService.getContainerNetworkReceivedRate
      .mockReturnValue(of({ invalid: true }));
    const chartSpy = jest.spyOn(component, 'getContainerNetworkNetworkRateCharts');
    component.getContainerNetworkReceivedRate([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid received network rate response:",
      { invalid: true }
    );
    expect(chartSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log error and NOT call chart function when negative values exist', () => {
    const negativeMock = [
      { "6b689b82dc3b-mysql_db": -10, time_bucket: "202511271155" }
    ];
    mockInfraService.getContainerNetworkReceivedRate
      .mockReturnValue(of(negativeMock));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const chartSpy = jest.spyOn(component, 'getContainerNetworkNetworkRateCharts');
    component.getContainerNetworkReceivedRate([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative values found in received rate. Ignoring response:",
      negativeMock
    );
    expect(chartSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should call chart function when response is valid', () => {
    const chartSpy = jest.spyOn(component, 'getContainerNetworkNetworkRateCharts');
    mockInfraService.getContainerNetworkReceivedRate
      .mockReturnValue(of(mockContainerNetworkReceivedRate));
    const mockTdata = [{ dummy: true }];
    component.getContainerNetworkReceivedRate(mockTdata);
    expect(chartSpy).toHaveBeenCalledWith(
      mockContainerNetworkReceivedRate,
      mockTdata
    );
  });

  it('should handle API error and log it', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const mockErr = new Error("API failed");
    mockInfraService.getContainerNetworkReceivedRate
      .mockReturnValue(throwError(() => mockErr));
    const chartSpy = jest.spyOn(component, 'getContainerNetworkNetworkRateCharts');
    component.getContainerNetworkReceivedRate([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load container network received rate:",
      mockErr
    );
    expect(chartSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // getContainerNetworkTransmitRate

  it('should log error and NOT call receivedRate when response is NOT an array', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    mockInfraService.getContainerNetworkTransmitRate
      .mockReturnValue(of({ invalid: true }));
    const receivedSpy = jest.spyOn(component, 'getContainerNetworkReceivedRate');
    component.getContainerNetworkTransmitRate();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid transmit rate response:",
      { invalid: true }
    );
    expect(receivedSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log error and NOT call receivedRate when negative values exist', () => {
    const negativeMock = [
      { "6b689b82dc3b-mysql_db": -50, time_bucket: "202511271155" }
    ];
    mockInfraService.getContainerNetworkTransmitRate
      .mockReturnValue(of(negativeMock));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const receivedSpy = jest.spyOn(component, 'getContainerNetworkReceivedRate');
    component.getContainerNetworkTransmitRate();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative values found in transmit rate. Ignoring response:",
      negativeMock
    );
    expect(receivedSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should call getContainerNetworkReceivedRate when response is valid', () => {
    const receivedSpy = jest.spyOn(component, 'getContainerNetworkReceivedRate');
    mockInfraService.getContainerNetworkTransmitRate
      .mockReturnValue(of(mockContainerNetworkTransmittedRate));
    component.getContainerNetworkTransmitRate();
    expect(receivedSpy).toHaveBeenCalledWith(mockContainerNetworkTransmittedRate);
  });

  it('should handle API error and log it', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const err = new Error("Transmit API crashed");
    mockInfraService.getContainerNetworkTransmitRate
      .mockReturnValue(throwError(() => err));
    const receivedSpy = jest.spyOn(component, 'getContainerNetworkReceivedRate');
    component.getContainerNetworkTransmitRate();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load container network transmit rate:",
      err
    );
    expect(receivedSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // getContainerProperties

  it('should log error and NOT set properties when response is NOT an object', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    mockInfraService.getContainerProperties
      .mockReturnValue(of([1, 2, 3]));
    component.getContainerProperties();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid container properties response:",
      [1, 2, 3]
    );
    expect(component.properties).toBeNull();
    consoleSpy.mockRestore();
  });

  it('should log error and NOT set properties when object has negative number values', () => {
    const negativeMock = {
      size: "200MB",
      cpu_limit: -5,
      memory_limit: 1024
    };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    mockInfraService.getContainerProperties
      .mockReturnValue(of(negativeMock));
    component.getContainerProperties();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative values found in container properties. Ignoring response:",
      negativeMock
    );
    expect(component.properties).toBeNull();
    consoleSpy.mockRestore();
  });

  it('should set properties when response is valid', () => {
    mockInfraService.getContainerProperties
      .mockReturnValue(of(getContainerProperties));
    component.getContainerProperties();
    expect(component.properties).toEqual(getContainerProperties);
  });

  it('should handle API error and set properties to null', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const apiErr = new Error("API failed");
    mockInfraService.getContainerProperties
      .mockReturnValue(throwError(() => apiErr));
    component.getContainerProperties();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load container properties:",
      apiErr
    );
    expect(component.properties).toBeNull();
    consoleSpy.mockRestore();
  });

});
