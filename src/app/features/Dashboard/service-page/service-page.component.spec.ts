import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServicePageComponent } from './service-page.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../../../services/application.service';
import { DecoderService } from '../../../services/decoder.service';
import { of, throwError } from 'rxjs';
import { ApmApiService } from '../../../services/apm-api.service';

describe('ServicePageComponent', () => {
  let component: ServicePageComponent;
  let fixture: ComponentFixture<ServicePageComponent>;

  let mockApplicationService: any;
  let mockDecoderService: any;
  let mockApmService: any;

  const mockValidServiceResponse = {
    serviceResponse: [
      {
        appID: 967,
        applicationName: "Ishine_PROD",
        applicationType: "SERVICE",
        createdOn: "2024-09-26 19:26:09",
        updatedOn: "2025-09-25 17:15:49",
        createdBy: 19,
        updatedBy: 19,
        applicationDetails: {
          detailsId: 1,
          logoPath: "JAVA_Logo.png",
          techstack: "java",
          hibernateLazyInitializer: {}
        },
        createdByUserName: null
      },
      {
        appID: 968,
        applicationName: "APTMT_Prod",
        applicationType: "SERVICE",
        createdOn: "2024-09-26 19:27:07",
        updatedOn: "2024-09-26 19:27:07",
        createdBy: 19,
        updatedBy: 19,
        applicationDetails: null,
        createdByUserName: null
      },
      {
        appID: 981,
        applicationName: "SMaaS_Prod",
        applicationType: "SERVICE",
        createdOn: "2024-12-19 12:28:43",
        updatedOn: "2024-12-19 12:28:43",
        createdBy: 9148,
        updatedBy: 9148,
        applicationDetails: null,
        createdByUserName: null
      }
    ],
    serviceStatus: "Success",
    serviceError: ""
  };

  const mockValidLoadTimeResponse = {
    load: 14.5,
    loadTimeSeries: [
      { load: 9, time_bucket: "202512031331", status: "NORMAL" },
      { time_bucket: "202512031332" },
      { load: 20, time_bucket: "202512031333", status: "NORMAL" },
      { time_bucket: "202512031334" },
    ]
  };

  const mockSuccessRateTimeValue = {
    successRate: 100.0,
    successRateTimeSeries: [
      { success_rate: 100.0, time_bucket: "202512031331" },
      { time_bucket: "202512031332" },
      { success_rate: 100.0, time_bucket: "202512031333" },
      { time_bucket: "202512031334" },
    ]
  };

  const mockServiceTableResponse = {
    service_load: 13.44,
    total_count: 0,
    critical_count: 0,
    latency: 179.22,
    service_apdex: 0.9,
    warning_count: 0,
    infra_ip: "172.16.138.141",
    success_rate: 96.84
  };

  beforeEach(async () => {
    mockApplicationService = {
      getAllApplicationsByUserIDFeatureType: jest.fn().mockReturnValue(of(mockValidServiceResponse)),

    };

    mockApmService = {
      getServiceLoadTimeValue: jest.fn().mockReturnValue(of(mockValidLoadTimeResponse)),
      getServiceTableData: jest.fn().mockReturnValue(of(mockServiceTableResponse)),
      getSuccessRateTimeValue: jest.fn().mockReturnValue(of(mockSuccessRateTimeValue)),
    };

    mockDecoderService = {
      decodeObject: jest.fn().mockImplementation((data: any) => Promise.resolve(data))
    };

    await TestBed.configureTestingModule({
      imports: [ServicePageComponent, HttpClientTestingModule, FormsModule],
      providers: [
        { provide: ApplicationService, useValue: mockApplicationService },
        { provide: DecoderService, useValue: mockDecoderService },
        { provide: ApmApiService, useValue: mockApmService }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ServicePageComponent);
    component = fixture.componentInstance;

    // mock table data
    component.tableData = [
      {
        serviceName: 'ServiceOne',
        appID: 0,
        load: null,
        latency: null,
        apdex: null,
        successRate: null,
        infra: null,
        alerts: null,
        logo: null
      },
      {
        serviceName: 'ServiceTwo',
        appID: 0,
        load: null,
        latency: null,
        apdex: null,
        successRate: null,
        infra: null,
        alerts: null,
        logo: null
      },
      {
        serviceName: 'AnotherService',
        appID: 0,
        load: null,
        latency: null,
        apdex: null,
        successRate: null,
        infra: null,
        alerts: null,
        logo: null
      },
    ];
    component.availableColumns = [
      { key: 'load', label: 'Load (calls/min)' },
      { key: 'latency', label: 'Latency (ms)' },
    ];
    component.itemsPerPage = 2;
    component.currentPage = 1;
    jest.spyOn(component, 'getCellValue').mockImplementation((row, col) => row[col]);
    jest.spyOn(component, 'calculatePagination').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should reset filteredTableData when search text is empty', () => {
    component.searchText = '';
    component.applySearchFilter();
    expect(component.filteredTableData).toEqual(component.tableData);
  });

  it('should toggle column modal and set modal coordinates', () => {
    const mockIcon = { getBoundingClientRect: () => ({ right: 100, top: 50 }) } as any;
    component.showColumnModal = false;
    component.toggleColumnModal(mockIcon);
    expect(component.modalX).toBe(110);
    expect(component.modalY).toBe(50);
    expect(component.showColumnModal).toBe(true);
  });

  it('should open value filter modal and populate unique column values', () => {
    component.tableData = [
      {
        serviceName: 'App1', load: 10,
        appID: 0,
        latency: null,
        apdex: null,
        successRate: null,
        infra: null,
        alerts: null,
        logo: null
      },
      {
        serviceName: 'App2', load: 20,
        appID: 0,
        latency: null,
        apdex: null,
        successRate: null,
        infra: null,
        alerts: null,
        logo: null
      },
      {
        serviceName: 'App3', load: 10,
        appID: 0,
        latency: null,
        apdex: null,
        successRate: null,
        infra: null,
        alerts: null,
        logo: null
      },
    ];
    jest.spyOn(component, 'getCellValue').mockImplementation((row, col) => row[col]);
    component.valueFilterMap = {};
    component.openValueFilterModal('load');
    expect(component.currentFilterColumn).toBe('load');
    expect(component.valueFilterMap['load']).toEqual([]);
    expect(component.columnValues.sort()).toEqual([10, 20]);
    expect(component.showValueFilterModal).toBe(true);
  });

  it('should return column label if found', () => {
    component.availableColumns = [{ key: 'load', label: 'Load (calls/min)' }];
    expect(component.getColumnLabel('load')).toBe('Load (calls/min)');
  });

  it('should return key as label if not found', () => {
    component.availableColumns = [{ key: 'apdex', label: 'Apdex' }];
    expect(component.getColumnLabel('latency')).toBe('latency');
  });

  it('should sort table ascending and descending by string column', () => {
    component.filteredTableData = [
      {
        serviceName: 'Zebra',
        appID: 0,
        load: null,
        latency: null,
        apdex: null,
        successRate: null,
        infra: null,
        alerts: null,
        logo: null
      },
      {
        serviceName: 'Alpha',
        appID: 0,
        load: null,
        latency: null,
        apdex: null,
        successRate: null,
        infra: null,
        alerts: null,
        logo: null
      },
    ];
    component.sortTable('serviceName');
    expect(component.filteredTableData.map(d => d.serviceName)).toEqual(['Alpha', 'Zebra']);
    expect(component.sortDirection).toBe('asc');
    component.sortTable('serviceName');
    expect(component.filteredTableData.map(d => d.serviceName)).toEqual(['Zebra', 'Alpha']);
    expect(component.sortDirection).toBe('desc');
  });

  it('should sort table ascending and descending by numeric column', () => {
    component.filteredTableData = [
      {
        load: 30,
        appID: 0,
        serviceName: '',
        latency: null,
        apdex: null,
        successRate: null,
        infra: null,
        alerts: null,
        logo: null
      },
      {
        load: 10,
        appID: 0,
        serviceName: '',
        latency: null,
        apdex: null,
        successRate: null,
        infra: null,
        alerts: null,
        logo: null
      },
      {
        load: 20,
        appID: 0,
        serviceName: '',
        latency: null,
        apdex: null,
        successRate: null,
        infra: null,
        alerts: null,
        logo: null
      },
    ];
    component.sortTable('load');
    expect(component.filteredTableData.map(d => d.load)).toEqual([10, 20, 30]);
    expect(component.sortDirection).toBe('asc');
    component.sortTable('load');
    expect(component.filteredTableData.map(d => d.load)).toEqual([30, 20, 10]);
    expect(component.sortDirection).toBe('desc');
  });

  // Popup Container

  it('should close load popup and clear global click unlistener', () => {
    const mockUnlistener = jest.fn();
    component.showPopup = true;
    (component as any).globalClickUnlistener = mockUnlistener;
    component.closePopup();
    expect(component.showPopup).toBeFalsy();
    expect(mockUnlistener).toHaveBeenCalled();
    expect((component as any).globalClickUnlistener).toBeNull();
  });

  it('should close success rate popup and clear unlistener', () => {
    const mockUnlistener = jest.fn();
    component.showSRPopup = true;
    (component as any).globalClickUnlistener = mockUnlistener;
    component.closeSRPopup();
    expect(component.showSRPopup).toBeFalsy();
    expect(mockUnlistener).toHaveBeenCalled();
    expect((component as any).globalClickUnlistener).toBeNull();
  });

  it('should close latency popup and clear unlistener', () => {
    const mockUnlistener = jest.fn();
    component.showLatencyPopup = true;
    (component as any).globalClickUnlistener = mockUnlistener;
    component.closeLatencyPopup();
    expect(component.showLatencyPopup).toBeFalsy();
    expect(mockUnlistener).toHaveBeenCalled();
    expect((component as any).globalClickUnlistener).toBeNull();
  });

  it('should close apdex popup and clear unlistener', () => {
    const mockUnlistener = jest.fn();
    component.showApdexPopup = true;
    (component as any).globalClickUnlistener = mockUnlistener;
    component.closeApdexPopup();
    expect(component.showApdexPopup).toBeFalsy();
    expect(mockUnlistener).toHaveBeenCalled();
    expect((component as any).globalClickUnlistener).toBeNull();
  });

  it('should handle closePopup when no unlistener is set', () => {
    component.showPopup = true;
    (component as any).globalClickUnlistener = null;
    component.closePopup();
    expect(component.showPopup).toBeFalsy();
    expect((component as any).globalClickUnlistener).toBeNull();
  });

  // Filter Modal

  it('should deselect all columns and reset filters when deselectAllColumns is called', () => {
    component.selectedColumnFilters = ['load', 'latency'];
    component.valueFilterMap = { load: ['10'], latency: ['200'] };
    const applyValueFiltersSpy = jest.spyOn(component, 'applyValueFilters');
    component.deselectAllColumns();
    expect(component.selectedColumnFilters).toEqual([]);
    expect(component.valueFilterMap).toEqual({});
    expect(applyValueFiltersSpy).toHaveBeenCalled();
  });

  it('should add a column to selectedColumnFilters when it is not selected', () => {
    component.selectedColumnFilters = ['load'];
    const applyValueFiltersSpy = jest.spyOn(component, 'applyValueFilters');
    component.toggleColumnSelection('latency');
    expect(component.selectedColumnFilters).toEqual(['load', 'latency']);
    expect(applyValueFiltersSpy).toHaveBeenCalled();
  });

  it('should remove a column from selectedColumnFilters when it is already selected', () => {
    component.selectedColumnFilters = ['load', 'latency'];
    const applyValueFiltersSpy = jest.spyOn(component, 'applyValueFilters');
    component.toggleColumnSelection('latency');
    expect(component.selectedColumnFilters).toEqual(['load']);
    expect(applyValueFiltersSpy).toHaveBeenCalled();
  });

  // Filter2 Modal

  it('should return the correct filter label from currentFilterColumn', () => {
    component.currentFilterColumn = 'load';
    expect(component.getCurrentFilterLabel()).toBe('Load (calls/min)');
  });

  it('should return an empty string if column not found', () => {
    component.currentFilterColumn = 'nonexistent';
    expect(component.getCurrentFilterLabel()).toBe('');
  });

  it('should add a value when toggleValueSelection is called for unselected value', () => {
    component.currentFilterColumn = 'load';
    component.valueFilterMap = { load: ['10'] };
    component.toggleValueSelection('20');
    expect(component.valueFilterMap['load']).toEqual(['10', '20']);
  });

  it('should remove a value when toggleValueSelection is called for an already selected value', () => {
    component.currentFilterColumn = 'load';
    component.valueFilterMap = { load: ['10', '20'] };
    component.toggleValueSelection('10');
    expect(component.valueFilterMap['load']).toEqual(['20']);
  });

  it('should not throw if toggleValueSelection is called without currentFilterColumn', () => {
    component.currentFilterColumn = null as any;
    expect(() => component.toggleValueSelection('10')).not.toThrow();
  });

  it('should correctly filter tableData when applyValueFilters is called', () => {
    component.tableData = [
      {
        serviceName: 'App1', load: 10, latency: 100,
        appID: 0,
        apdex: null,
        successRate: null,
        infra: null,
        alerts: null,
        logo: null
      },
      {
        serviceName: 'App2', load: 20, latency: 200,
        appID: 0,
        apdex: null,
        successRate: null,
        infra: null,
        alerts: null,
        logo: null
      },
      {
        serviceName: 'App3', load: 10, latency: 300,
        appID: 0,
        apdex: null,
        successRate: null,
        infra: null,
        alerts: null,
        logo: null
      },
    ];
    component.selectedColumnFilters = ['load'];
    component.valueFilterMap = { load: ['10'] };
    component.applyValueFilters();
    expect(component.filteredTableData).toEqual([
      { serviceName: 'App1', load: 10, latency: 100, appID: 0, apdex: null, successRate: null, infra: null, alerts: null, logo: null },
      { serviceName: 'App3', load: 10, latency: 300, appID: 0, apdex: null, successRate: null, infra: null, alerts: null, logo: null },
    ]);
  });

  it('should include all rows when no filters are selected', () => {
    component.selectedColumnFilters = ['load'];
    component.valueFilterMap = { load: [] };
    component.applyValueFilters();
    expect(component.filteredTableData.length).toBe(3);
  });

  it('should exclude rows with null values when filtering', () => {
    component.tableData = [
      { serviceName: 'App1', load: null, appID: 0, latency: null, apdex: null, successRate: null, infra: null, alerts: null, logo: null },
      { serviceName: 'App2', load: 10, appID: 0, latency: null, apdex: null, successRate: null, infra: null, alerts: null, logo: null },
    ];
    component.selectedColumnFilters = ['load'];
    component.valueFilterMap = { load: ['10'] };
    component.applyValueFilters();

    expect(component.filteredTableData).toEqual([
      { serviceName: 'App2', load: 10, appID: 0, latency: null, apdex: null, successRate: null, infra: null, alerts: null, logo: null }
    ]);
  });

  // Error Handling

  // getservicenames

  it('should log an error when response structure is invalid', async () => {
    const invalidResponse = null;
    mockApplicationService.getAllApplicationsByUserIDFeatureType.mockReturnValue(of({}));
    mockDecoderService.decodeObject.mockReturnValue(Promise.resolve(invalidResponse));
    component.getservicenames();
    await fixture.whenStable();
    expect(console.error).toHaveBeenCalledWith(
      "Invalid service response structure:",
      invalidResponse
    );
  });

  it('should log an error when serviceResponse is missing or not an array', async () => {
    const badStructure = { serviceResponse: null };
    mockApplicationService.getAllApplicationsByUserIDFeatureType.mockReturnValue(of({}));
    mockDecoderService.decodeObject.mockReturnValue(Promise.resolve(badStructure));
    component.getservicenames();
    await fixture.whenStable();
    expect(console.error).toHaveBeenCalledWith(
      "Missing or invalid 'serviceResponse' list:",
      badStructure
    );
  });

  it('should log an error when serviceResponse contains negative values', async () => {
    const negativeData = {
      serviceResponse: [
        { appID: -5, applicationName: "BadService" }
      ]
    };
    mockApplicationService.getAllApplicationsByUserIDFeatureType.mockReturnValue(of({}));
    mockDecoderService.decodeObject.mockReturnValue(Promise.resolve(negativeData));
    component.getservicenames();
    await fixture.whenStable();
    expect(console.error).toHaveBeenCalledWith(
      "Negative numeric values found in serviceResponse. Ignoring response:",
      negativeData
    );
  });

  it('should log an error when API call fails', () => {
    const apiError = { status: 500 };
    mockApplicationService.getAllApplicationsByUserIDFeatureType.mockReturnValue(
      throwError(() => apiError)
    );
    component.getservicenames();
    expect(console.error).toHaveBeenCalledWith(
      "Failed to load service names:",
      apiError
    );
  });

  // getServiceLoadTimeValue

  it("should log an error when load value is invalid or negative", () => {
    const badLoad = { load: -10, loadTimeSeries: [] };
    mockApmService.getServiceLoadTimeValue.mockReturnValue(of(badLoad));
    component.getServiceLoadTimeValue("TestService").subscribe(res => {
      expect(res).toBeNull();
    });
    expect(console.error).toHaveBeenCalledWith(
      "Invalid or negative 'load' value:",
      badLoad
    );
  });

  it("should log an error when loadTimeSeries is missing or invalid", () => {
    const badSeries = { load: 10, loadTimeSeries: null };
    mockApmService.getServiceLoadTimeValue.mockReturnValue(of(badSeries));
    component.getServiceLoadTimeValue("TestService").subscribe(res => {
      expect(res).toBeNull();
    });
    expect(console.error).toHaveBeenCalledWith(
      "Missing or invalid 'loadTimeSeries':",
      badSeries
    );
  });

  it("should log an error when loadTimeSeries has negative values", () => {
    const negativeSeries = {
      load: 10,
      loadTimeSeries: [
        { load: 5 },
        { load: -1 }
      ]
    };
    mockApmService.getServiceLoadTimeValue.mockReturnValue(of(negativeSeries));
    component.getServiceLoadTimeValue("TestService").subscribe(res => {
      expect(res).toBeNull();
    });
    expect(console.error).toHaveBeenCalledWith(
      "Negative load value found in loadTimeSeries:",
      negativeSeries
    );
  });

  it("should log an error when API call fails", () => {
    const apiError = { status: 500 };

    mockApmService.getServiceLoadTimeValue.mockReturnValue(
      throwError(() => apiError)
    );
    component.getServiceLoadTimeValue("TestService").subscribe(res => {
      expect(res).toBeNull();
    });
    expect(console.error).toHaveBeenCalledWith(
      "Failed to load service load time:",
      apiError
    );
  });

  // getSuccessRateTimeValue

  it("should log an error when successRate is invalid or negative", () => {
    const badSuccessRate = { successRate: -5, successRateTimeSeries: [] };
    mockApmService.getSuccessRateTimeValue.mockReturnValue(of(badSuccessRate));
    component.getSuccessRateTimeValue("Test").subscribe(res => {
      expect(res).toBeNull();
    });
    expect(console.error).toHaveBeenCalledWith(
      "Invalid or negative 'successRate' value:",
      badSuccessRate
    );
  });

  it("should log an error when successRateTimeSeries is missing or invalid", () => {
    const missingSeries = { successRate: 99, successRateTimeSeries: null };
    mockApmService.getSuccessRateTimeValue.mockReturnValue(of(missingSeries));
    component.getSuccessRateTimeValue("Test").subscribe(res => {
      expect(res).toBeNull();
    });
    expect(console.error).toHaveBeenCalledWith(
      "Missing or invalid 'successRateTimeSeries':",
      missingSeries
    );
  });

  it("should log an error when successRateTimeSeries contains negative values", () => {
    const negativeSeries = {
      successRate: 100,
      successRateTimeSeries: [
        { success_rate: 90 },
        { success_rate: -5 }
      ]
    };
    mockApmService.getSuccessRateTimeValue.mockReturnValue(of(negativeSeries));
    component.getSuccessRateTimeValue("Test").subscribe(res => {
      expect(res).toBeNull();
    });
    expect(console.error).toHaveBeenCalledWith(
      "Negative success_rate value found in successRateTimeSeries:",
      negativeSeries
    );
  });

  it("should log an error when API fails", () => {
    const apiErr = { status: 500 };
    mockApmService.getSuccessRateTimeValue.mockReturnValue(
      throwError(() => apiErr)
    );
    component.getSuccessRateTimeValue("Test").subscribe(res => {
      expect(res).toBeNull();
    });
    expect(console.error).toHaveBeenCalledWith(
      "Failed to load service success rate:",
      apiErr
    );
  });

});
