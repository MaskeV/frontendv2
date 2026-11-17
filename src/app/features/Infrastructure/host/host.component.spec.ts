import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HostComponent } from './host.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { DateService } from '../../../services/date.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { ApplicationService } from '../../../services/application.service';
import { InfraService } from '../../../services/infra.service';
import { ChangeDetectorRef, NO_ERRORS_SCHEMA } from '@angular/core';


describe('HostComponent', () => {
  let component: HostComponent;
  let fixture: ComponentFixture<HostComponent>;

  let mockApplicationService: any;
  let mockInfraService: any;
  let cdr: ChangeDetectorRef;

  const mockAuthService = {
    currentUser: of({ name: 'testUser', userId: 'u1' })
  };

  const mockRouter = {
    url: '/infrastructure/host?param=1',
    events: of({}),
    navigated: true,
    navigate: jest.fn().mockResolvedValue(true)
  };

  const mockDateService = {
    setActiveComponent: jest.fn(),
    activeComponent$: of('HostComponent'),
    date$: of({
      startdateTime: new Date(),
      enddateTime: new Date()
    })
  };

  const mockTypes = {
    serviceResponse: [
      {
        ipAddressId: 1276,
        applicationName: "Sahara_UAT_Auditor_Server",
        ipAddress: "10.20.3.231",
        ipType: "LINUX"
      },
      {
        ipAddressId: 2850,
        applicationName: "testry",
        ipAddress: "12.6.8.9",
        ipType: "LINUX"
      },
      {
        ipAddressId: 2822,
        applicationName: "abhishek_windows",
        ipAddress: "127.0.0.2",
        ipType: "WINDOWS"
      },
    ],
    serviceStatus: "Success",
    serviceError: ""
  };

  const mockInfraMetrics = [
    {
      ip: "10.20.3.231",
      memory_ram_usage: 0.0,
      health_score: 0.0,
      disk_usage: 0,
      type: "linux",
      cpu_usage: 0.0
    },
    {
      ip: "12.6.8.9",
      memory_ram_usage: 0.0,
      health_score: 0.0,
      disk_usage: 0,
      type: "linux",
      cpu_usage: 0.0
    },
    {
      ip: "127.0.0.2",
      memory_ram_usage: 0.0,
      health_score: 0.0,
      disk_usage: 0,
      type: "windows",
      cpu_usage: 0.0
    },
  ]

  const mockDisk = [
    {
      " used": "56.00 ",
      " total": "102.00 ",
      "name": "/data ",
      " free": "47.00"
    },
    {
      " used": "86.00 ",
      " total": "188.00 ",
      "name": "total ",
      " free": "102.00"
    },
    {
      " used": "0.00 ",
      " total": "1.60 ",
      "name": "/run/user/0 ",
      " free": "1.60"
    },
  ]

  const mockSystemProp = {
    "logical_cores": "8",
    "board_name": "440BX Desktop Reference Platform",
    "chassis_vendor": "No Enclosure",
    "bios_vendor": "Phoenix Technologies LTD",
    "hostname": "docker02",
    "kernel_version": "3.10.0-1160.119.1.el7.x86_64",
    "system_uptime": "210:20:22:36",
    "os_version": "Linux",
    "bios_version": "6.00",
    "product_name": "VMware Virtual Platform",
    "board_vendor": "Intel Corporation",
    "system_vendor": "unknown"
  }

  beforeEach(async () => {

    mockApplicationService = {
      getAppIpInfoListByTypes: jest.fn().mockReturnValue(of(mockTypes)),
    }

    mockInfraService = {
      getInfraMetricsForAllHosts: jest.fn().mockReturnValue(of(mockInfraMetrics)),
      getDiscSpace: jest.fn().mockReturnValue(of(mockDisk)),
      getSystemProperties: jest.fn().mockReturnValue(of(mockSystemProp)),
    }

    await TestBed.configureTestingModule({
      imports: [HostComponent, HttpClientTestingModule, FormsModule],
      providers: [
        { provide: AuthenticationService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: DateService, useValue: mockDateService },
        { provide: ApplicationService, useValue: mockApplicationService },
        { provide: InfraService, useValue: mockInfraService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    jest.spyOn(HostComponent.prototype, 'formatDate').mockImplementation(() => 0);
    jest.spyOn(HostComponent.prototype, 'formatForThresholdDate').mockImplementation(() => 0);
    jest.spyOn(HostComponent.prototype as any, 'getServiceName').mockImplementation(() => { });
    jest.spyOn(HostComponent.prototype as any, 'ngAfterViewInit').mockImplementation(() => { });

    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;


    component.cpu_usage_arr = { '192.168.0.1': 50, '10.0.0.2': 75, '172.16.0.3': 20 };
    component.ram_arr = { '192.168.0.1': 4096, '10.0.0.2': 8192, '172.16.0.3': 2048 };
    component.disk_arr = { '192.168.0.1': 200, '10.0.0.2': 500, '172.16.0.3': 100 };
    component.infraHealthScore = { '192.168.0.1': 'Good', '10.0.0.2': 'Fair' };

    component.itemsPerPage = 2;
    component.currentPage = 1;

    component.cpu_usage_arr = {
      '192.168.0.1': '30',
      '10.0.0.2': '70',
      '172.16.0.3': '50',
    };

    component.currentUser = {
      userId: 123,
      sessionDTO: {},
    } as any;

    component.filteredHostName = [...component.serviceHosts];
    //  component.isLoadingHost = false;
    cdr = fixture.componentRef.injector.get(ChangeDetectorRef);

  });

  it('should create (without running problematic lifecycle code)', () => {
    expect(component).toBeTruthy();
  });

  it('should reset filteredHostName when searchQuery is empty', () => {
    component.searchQuery = '';
    component.onSearch();
    expect(component.filteredHostName).toEqual(component.serviceHosts);
    expect(component.totalPages).toBe(2);
  });

  it('should filter by IP address', () => {
    component.searchQuery = '192.168';
    component.onSearch();
    expect(component.filteredHostName.length).toBe(1);
    expect(component.filteredHostName[0].ipAddress).toBe('192.168.0.1');
  });

  it('should filter by application name (case-insensitive)', () => {
    component.searchQuery = 'apptwo';
    component.onSearch();
    expect(component.filteredHostName.length).toBe(1);
    expect(component.filteredHostName[0].applicationName).toBe('AppTwo');
  });

  it('should filter by CPU usage', () => {


    component.cpu_usage_arr = {
      '192.168.0.1': 50,
      '10.0.0.2': 75,
      '172.16.0.3': 20,
    };

    component.filteredHostName = [...component.serviceHosts];
    component.searchQuery = '75';
    component.onSearch();

    expect(component.filteredHostName.length).toBe(1);
    expect(component.filteredHostName[0].ipAddress).toBe('10.0.0.2');
  });


  it('should filter by RAM', () => {
    component.searchQuery = '4096';
    component.onSearch();
    expect(component.filteredHostName.length).toBe(1);
    expect(component.filteredHostName[0].ipAddress).toBe('192.168.0.1');
  });

  it('should filter by Disk', () => {
    component.searchQuery = '500';
    component.onSearch();
    expect(component.filteredHostName.length).toBe(1);
    expect(component.filteredHostName[0].ipAddress).toBe('10.0.0.2');
  });

  it('should calculate pagination correctly', () => {
    component.filteredHostName = [...component.serviceHosts];
    component.calculatePagination();
    expect(component.totalPages).toBe(2);
    expect(component.pagedHostName.length).toBe(2);

    component.currentPage = 2;
    component.calculatePagination();
    expect(component.pagedHostName.length).toBe(1);
  });

  it('can run change detection safely if lifecycle methods are NOOP', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement).toBeTruthy();
  });

  //Verification of the onSort() function
  it('should call onSort when table header clicked', () => {
    jest.spyOn(component, 'onSort');
    fixture.detectChanges();

    const headers = fixture.nativeElement.querySelectorAll('th');
    (headers[0] as HTMLElement).click(); // click "Service Name"

    expect(component.onSort).toHaveBeenCalledWith('item');
  });

  it('should toggle sortDirection when clicking the same header twice', () => {
    component.onSort('cpu');
    expect(component.sortColumn).toBe('cpu');
    expect(component.sortDirection).toBe('asc');

    component.onSort('cpu');
    expect(component.sortColumn).toBe('cpu');
    expect(component.sortDirection).toBe('desc');
  });

  it('should reset to ascending when sorting a different column', () => {
    component.onSort('cpu'); // first sort by CPU
    component.onSort('ram'); // change to RAM
    expect(component.sortColumn).toBe('ram');
    expect(component.sortDirection).toBe('asc');
  });

  it('should sort filteredHostName ascending by CPU', () => {
    component.onSort('cpu');
    const result = component.filteredHostName.map((h) => h.ipAddress);
    expect(result).toEqual(['192.168.0.1', '172.16.0.3', '10.0.0.2']); // 30, 50, 70
  });

  it('should sort filteredHostName descending by CPU', () => {
    component.onSort('cpu');
    component.onSort('cpu'); // toggle to desc
    const result = component.filteredHostName.map((h) => h.ipAddress);
    expect(result).toEqual(['10.0.0.2', '172.16.0.3', '192.168.0.1']);
  });


  it('should render correct icon for current sort column', () => {
    component.onSort('cpu');
    fixture.detectChanges();

    const cpuHeader = fixture.nativeElement.querySelectorAll('th')[2];
    const icon = cpuHeader.querySelector('i.fa');
    expect(icon.classList.contains('fa-arrow-up')).toBe(true);

    component.onSort('cpu');
    fixture.detectChanges();
    expect(icon.classList.contains('fa-arrow-down')).toBe(true);
  });

  // Verifying if the skeleton css is working fine with the isLoadingHost state change
  it('should display 12 skeleton rows when isLoadingHost is true', () => {
    component.isLoadingHost = true;
    fixture.detectChanges();

    const tbody = fixture.nativeElement.querySelector('tbody');
    expect(tbody).toBeTruthy();

    const rows = tbody.querySelectorAll('tr');
    expect(rows.length).toBe(12);

    // Verify each row has 8 skeleton <td> cells
    rows.forEach((row: HTMLTableRowElement) => {
      const cells = row.querySelectorAll('td .skeleton');
      expect(cells.length).toBe(7);
    });
  });

  it('should not display loading skeleton when isLoadingHost is false', () => {
    component.isLoadingHost = false;
    fixture.detectChanges();

    const tbody = fixture.nativeElement.querySelector('tbody');
    expect(tbody).toBeTruthy();

    const rows = tbody.querySelectorAll('tr');
    expect(rows.length).toBe(0);
  });

  // Verifying for the data binding of the table
  it('should render host rows when isLoadingHost is false', async () => {
    component.isLoadingHost = false;
    component.pagedHostName = [
      { ipAddress: '192.168.0.1', applicationName: 'AppOne', ipAddressId: 'id1', ipType: 'LINUX' },
      { ipAddress: '10.0.0.2', applicationName: 'AppTwo', ipAddressId: 'id2', ipType: 'WINDOWS' },
    ];
    fixture.detectChanges();

    await fixture.whenStable(); // Wait for async template rendering

    const tbody = fixture.nativeElement.querySelector('tbody');
    expect(tbody).toBeTruthy();

    const rows = tbody.querySelectorAll('tr');
    expect(rows.length).toBe(2);

    const firstRowCells = rows[0].querySelectorAll('td');
    expect(firstRowCells[0].textContent).toContain('192.168.0.1');
    expect(firstRowCells[1].textContent).toContain('AppOne');

    const secondRowCells = rows[1].querySelectorAll('td');
    expect(secondRowCells[0].textContent).toContain('10.0.0.2');
    expect(secondRowCells[1].textContent).toContain('AppTwo');
  });


  it('should show Linux image for LINUX host and Windows image for WINDOWS host', async () => {
    component.isLoadingHost = false;
    component.pagedHostName = [
      {
        ipAddress: '192.168.0.1',
        applicationName: 'AppOne',
        ipAddressId: 'id1',
        ipType: 'LINUX',
        lastUpdated: '2025-10-15 10:00:00',
      },
      {
        ipAddress: '10.0.0.2',
        applicationName: 'AppTwo',
        ipAddressId: 'id2',
        ipType: 'WINDOWS',
        lastUpdated: '2025-10-15 11:00:00',
      },
    ];
    fixture.detectChanges();
    await fixture.whenStable();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const linuxImg = rows[0].querySelector('img[alt="Linux"]');
    expect(linuxImg).toBeTruthy();
    expect(linuxImg.getAttribute('src')).toContain('assets/images/linux.png');
    const windowsImg = rows[1].querySelector('img[alt="Windows"]');
    expect(windowsImg).toBeTruthy();
    expect(windowsImg.getAttribute('src')).toContain('assets/images/windows.png');
  });


  it('should call setServiceId when clicking on LINUX host IP', async () => {
    component.isLoadingHost = false;
    component.pagedHostName = [
      {
        ipAddress: '192.168.0.1',
        applicationName: 'AppOne',
        ipAddressId: 'id1',
        ipType: 'LINUX',
        lastUpdated: '2025-10-15 10:00:00',
      },
      {
        ipAddress: '10.0.0.2',
        applicationName: 'AppTwo',
        ipAddressId: 'id2',
        ipType: 'WINDOWS',
        lastUpdated: '2025-10-15 11:00:00',
      },
    ];
    fixture.detectChanges();
    await fixture.whenStable();
    const setServiceIdSpy = jest.spyOn(component, 'setServiceId');
    const row = fixture.nativeElement.querySelectorAll('tbody tr')[0];
    const ipCell = row.querySelector('td.text-link span');

    ipCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(setServiceIdSpy).toHaveBeenCalledWith(expect.any(MouseEvent), '192.168.0.1', 'id1');
  });

  it('should call setServiceIdWindows when clicking on WINDOWS host IP', async () => {
    component.isLoadingHost = false;
    component.pagedHostName = [
      {
        ipAddress: '192.168.0.1',
        applicationName: 'AppOne',
        ipAddressId: 'id1',
        ipType: 'LINUX',
        lastUpdated: '2025-10-15 10:00:00',
      },
      {
        ipAddress: '10.0.0.2',
        applicationName: 'AppTwo',
        ipAddressId: 'id2',
        ipType: 'WINDOWS',
        lastUpdated: '2025-10-15 11:00:00',
      },
    ];
    fixture.detectChanges();
    await fixture.whenStable();
    const setServiceIdWindowsSpy = jest.spyOn(component, 'setServiceIdWindows');
    const row = fixture.nativeElement.querySelectorAll('tbody tr')[1];
    const ipCell = row.querySelector('td.text-link span');

    ipCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(setServiceIdWindowsSpy).toHaveBeenCalledWith(expect.any(MouseEvent));
  });

  //Verfying the NO Data sentence 
  it('should show "No Data Available" message when no hosts are loaded', () => {
    component.isLoadingHost = false;
    component.pagedHostName = [];

    fixture.detectChanges();

    const noDataDiv = fixture.nativeElement.querySelector('.noData');
    expect(noDataDiv).toBeTruthy();
    expect(noDataDiv.textContent).toContain('No Data Available');
  });

  it('should NOT show "No Data Available" message when hosts are present', () => {
    component.isLoadingHost = false;
    component.pagedHostName = [
      { ipAddress: '192.168.1.10', applicationName: 'App1', ipAddressId: '1', ipType: 'LINUX', lastUpdated: '2025-10-15 10:00:00' }
    ];

    fixture.detectChanges();

    const noDataDiv = fixture.nativeElement.querySelector('.noData');
    expect(noDataDiv).toBeFalsy();
  });

  //Checking the pagination
  it('should display correct endIndex and total filtered hosts count', () => {
    component.filteredHostName = [
      { ipAddress: '192.168.0.1', applicationName: 'AppOne' },
      { ipAddress: '10.0.0.2', applicationName: 'AppTwo' },
      { ipAddress: '172.16.0.3', applicationName: 'AppThree' },
    ];
    component.itemsPerPage = 2;
    component.currentPage = 1;
    component.calculatePagination(); // compute totalPages, pagedHostName, etc.

    fixture.detectChanges();

    const infoDiv = fixture.nativeElement.querySelector('.mx-2.pt-1');
    expect(infoDiv.textContent.trim()).toBe(`${component.endIndex}/${component.filteredHostName.length}`);
  });

  it('should disable previous button when currentPage is 1', () => {
    component.currentPage = 1;
    component.totalPages = 3;
    fixture.detectChanges();

    const prevBtn = fixture.nativeElement.querySelector('button[aria-label="Previous page"], button i.fa-angle-left')?.closest('button');
    expect(prevBtn?.disabled).toBe(true);
  });

  it('should disable next button when on last page', () => {
    component.totalPages = 3;
    component.currentPage = 3;
    fixture.detectChanges();

    const nextBtn = fixture.nativeElement.querySelector('button i.fa-angle-right')?.closest('button');
    expect(nextBtn?.disabled).toBe(true);
  });

  it('should call previousPage() when previous button clicked', () => {
    const prevSpy = jest.spyOn(component, 'previousPage');
    component.currentPage = 2;
    component.totalPages = 3;

    fixture.detectChanges();

    const prevBtn = fixture.nativeElement.querySelector('button i.fa-angle-left').closest('button');
    prevBtn.click();

    expect(prevSpy).toHaveBeenCalled();
  });

  it('should call nextPage() when next button clicked', () => {
    const nextSpy = jest.spyOn(component, 'nextPage');
    component.currentPage = 1;
    component.totalPages = 3;

    fixture.detectChanges();

    const nextBtn = fixture.nativeElement.querySelector('button i.fa-angle-right').closest('button');
    nextBtn.click();

    expect(nextSpy).toHaveBeenCalled();
  });

  it('should call goToPage() when pressing Enter in page number input', () => {
    const goSpy = jest.spyOn(component, 'goToPage');
    component.currentPage = 1;
    component.totalPages = 5;

    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input.page-input');
    input.value = '3';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(goSpy).toHaveBeenCalled();
  });

  it('should update pagination when nextPage() called', () => {
    component.filteredHostName = [
      { ipAddress: '192.168.0.1', applicationName: 'App1' },
      { ipAddress: '10.0.0.2', applicationName: 'App2' },
      { ipAddress: '172.16.0.3', applicationName: 'App3' },
    ];
    component.itemsPerPage = 1;
    component.totalPages = 3;
    component.currentPage = 1;

    component.calculatePagination();
    component.nextPage();

    expect(component.currentPage).toBe(2);
    expect(component.pagedHostName.length).toBe(1);
  });

  it('should not go to previous page if already on first page', () => {
    component.currentPage = 1;
    component.totalPages = 3;

    const spy = jest.spyOn(component, 'calculatePagination');
    component.previousPage();

    expect(component.currentPage).toBe(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should use "custom-modal-left" class when hasData is true', () => {
    component.hostName = 'some-host';
    fixture.detectChanges();

    const dialogDiv = fixture.nativeElement.querySelector('.modal-dialog');
    expect(dialogDiv.classList.contains('custom-modal-left')).toBe(true);
    expect(dialogDiv.classList.contains('custom-modal-small')).toBe(false);
  });

  it('should use "custom-modal-small" class when hasData is false', () => {
    component.hostName = '';
    component.osVersion = '';
    component.chassisVendor = '';
    component.boardName = '';
    component.boardVendor = '';
    component.productName = '';
    component.kernelVersion = '';
    component.biosVendor = '';
    component.biosVersion = '';
    component.systemVendor = '';
    component.systemUptime = '';
    component.logicalCores = '';
    fixture.detectChanges();

    const dialogDiv = fixture.nativeElement.querySelector('.modal-dialog');
    expect(dialogDiv.classList.contains('custom-modal-small')).toBe(true);
    expect(dialogDiv.classList.contains('custom-modal-left')).toBe(false);
  });

  it('should render list of attributes when any data field is defined', () => {
    component.hostName = 'test-host';
    component.osVersion = 'Ubuntu 22.04';
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector('ul.list-body');
    expect(list).toBeTruthy();

    const items = list.querySelectorAll('li');
    expect(items.length).toBeGreaterThan(0);
    expect(list.textContent).toContain('Host Name');
    expect(list.textContent).toContain('Ubuntu 22.04');
  });

  it('should display "No data available" message when all fields are empty', () => {
    component.hostName = '';
    component.osVersion = '';
    component.chassisVendor = '';
    component.boardName = '';
    component.boardVendor = '';
    component.productName = '';
    component.kernelVersion = '';
    component.biosVendor = '';
    component.biosVersion = '';
    component.systemVendor = '';
    component.systemUptime = '';
    component.logicalCores = '';
    fixture.detectChanges();

    const noData = fixture.nativeElement.querySelector('.text-center.text-muted');
    expect(noData).toBeTruthy();
    expect(noData.textContent).toContain('No data available');
  });

  it('should show Close button when data is present', () => {
    component.hostName = 'test-host';
    fixture.detectChanges();

    const closeButton = fixture.nativeElement.querySelector('.modal-body .btn-primary');
    expect(closeButton).toBeTruthy();
    expect(closeButton.textContent.trim()).toBe('Close');
  });

  it('should not show Close button when there is no data', () => {
    component.hostName = '';
    component.osVersion = '';
    component.logicalCores = '';
    fixture.detectChanges();

    const closeButton = fixture.nativeElement.querySelector('.modal-body .btn-primary');
    expect(closeButton).toBeFalsy();
  });

});

describe("HostComponent (getServiceName error handling tests)", () => {
  let fixture: ComponentFixture<HostComponent>;
  let component: HostComponent;

  let mockApplicationService: any;
  let mockInfraService: any;

  const mockTypes = {
    serviceResponse: [
      {
        ipAddressId: 1276,
        applicationName: "Sahara_UAT_Auditor_Server",
        ipAddress: "10.20.3.231",
        ipType: "LINUX"
      },
      {
        ipAddressId: 2850,
        applicationName: "testry",
        ipAddress: "12.6.8.9",
        ipType: "LINUX"
      },
      {
        ipAddressId: 2822,
        applicationName: "abhishek_windows",
        ipAddress: "127.0.0.2",
        ipType: "WINDOWS"
      },
    ],
    serviceStatus: "Success",
    serviceError: ""
  };

  const mockInfraMetrics = [
    {
      ip: "10.20.3.231",
      memory_ram_usage: 0.0,
      health_score: 0.0,
      disk_usage: 0,
      type: "linux",
      cpu_usage: 0.0
    },
    {
      ip: "12.6.8.9",
      memory_ram_usage: 0.0,
      health_score: 0.0,
      disk_usage: 0,
      type: "linux",
      cpu_usage: 0.0
    },
    {
      ip: "127.0.0.2",
      memory_ram_usage: 0.0,
      health_score: 0.0,
      disk_usage: 0,
      type: "windows",
      cpu_usage: 0.0
    },
  ]

  const mockDisk = [
    {
      " used": "56.00 ",
      " total": "102.00 ",
      "name": "/data ",
      " free": "47.00"
    },
    {
      " used": "86.00 ",
      " total": "188.00 ",
      "name": "total ",
      " free": "102.00"
    },
    {
      " used": "0.00 ",
      " total": "1.60 ",
      "name": "/run/user/0 ",
      " free": "1.60"
    },
  ]

  const mockSystemProp = {
    "logical_cores": "8",
    "board_name": "440BX Desktop Reference Platform",
    "chassis_vendor": "No Enclosure",
    "bios_vendor": "Phoenix Technologies LTD",
    "hostname": "docker02",
    "kernel_version": "3.10.0-1160.119.1.el7.x86_64",
    "system_uptime": "210:20:22:36",
    "os_version": "Linux",
    "bios_version": "6.00",
    "product_name": "VMware Virtual Platform",
    "board_vendor": "Intel Corporation",
    "system_vendor": "unknown"
  }

  beforeEach(async () => {

    mockApplicationService = {
      getAppIpInfoListByTypes: jest.fn().mockReturnValue(of(mockTypes)),
    }

    mockInfraService = {
      getInfraMetricsForAllHosts: jest.fn().mockReturnValue(of(mockInfraMetrics)),
      getDiscSpace: jest.fn().mockReturnValue(of(mockDisk)),
      getSystemProperties: jest.fn().mockReturnValue(of(mockSystemProp)),
    }

    await TestBed.configureTestingModule({
      imports: [HostComponent, HttpClientTestingModule, FormsModule],
      providers: [
        { provide: ApplicationService, useValue: mockApplicationService },
        { provide: InfraService, useValue: mockInfraService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    jest.restoreAllMocks();

    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;

    component.ngOnInit();
    jest.spyOn(HostComponent.prototype, 'getServiceName').mockRestore();
    jest.spyOn(HostComponent.prototype, 'ngAfterViewInit').mockRestore();
    jest.spyOn(HostComponent.prototype, 'ngOnInit').mockRestore();

  });

  // Error Handling

  // getServiceName

  it("should log error and reset lists when host list is NOT an array", () => {
    const invalidHostResp = { serviceResponse: "not-array" };
    mockApplicationService.getAppIpInfoListByTypes
      .mockReturnValue(of(invalidHostResp));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid host list response:",
      invalidHostResp
    );
    expect(component.serviceHosts).toEqual([]);
    expect(component.filteredHostName).toEqual([]);
    expect(component.pagedHostName).toEqual([]);
    expect(component.isLoadingHost).toBe(false);
    consoleSpy.mockRestore();
  });

  it("should log error when host list contains negative value", () => {
    const invalidHostResp = {
      serviceResponse: [
        { ipAddressId: 1, ipAddress: "1.1.1.1", applicationName: "X", ipType: "LINUX", bad: -10 }
      ]
    };
    mockApplicationService.getAppIpInfoListByTypes
      .mockReturnValue(of(invalidHostResp));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative values found in host list. Ignoring response:",
      invalidHostResp.serviceResponse
    );
    expect(component.serviceHosts).toEqual([]);
    expect(component.isLoadingHost).toBe(false);
    consoleSpy.mockRestore();
  });

  it("should log error when infra metrics response is NOT an array", () => {
    mockApplicationService.getAppIpInfoListByTypes
      .mockReturnValue(of(mockTypes));
    mockInfraService.getInfraMetricsForAllHosts
      .mockReturnValue(of({ invalid: true }));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid infra metrics response:",
      { invalid: true }
    );
    expect(component.isLoadingHost).toBe(false);
    consoleSpy.mockRestore();
  });

  it("should log error when infra metrics contains negative values", () => {
    mockApplicationService.getAppIpInfoListByTypes
      .mockReturnValue(of(mockTypes));
    mockInfraService.getInfraMetricsForAllHosts
      .mockReturnValue(of([
        { ip: "1.1.1.1", cpu_usage: -5 }
      ]));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative values found in infra metrics. Ignoring response:",
      [{ ip: "1.1.1.1", cpu_usage: -5 }]
    );
    expect(component.isLoadingHost).toBe(false);
    consoleSpy.mockRestore();
  });

  it("should log error when infra metrics API throws error", () => {
    mockApplicationService.getAppIpInfoListByTypes
      .mockReturnValue(of(mockTypes));
    mockInfraService.getInfraMetricsForAllHosts
      .mockReturnValue(throwError(() => "API FAILED"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load infra metrics:",
      "API FAILED"
    );
    expect(component.isLoadingHost).toBe(false);
    consoleSpy.mockRestore();
  });

  // getDiscPercent

  it("should log error and set diskPercent = 0 when response is invalid", () => {
    mockInfraService.getDiscSpace.mockReturnValue(of(null));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
    component.getDiscPercent("123");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid disk space response:",
      null
    );
    expect(component.diskPercent).toBe(0);
    consoleSpy.mockRestore();
  });

  it("should log error when partitions are missing or invalid", () => {
    mockInfraService.getDiscSpace.mockReturnValue(of({}));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
    component.getDiscPercent("123");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Disk partitions missing or invalid:",
      []
    );
    expect(component.diskPercent).toBe(0);
    consoleSpy.mockRestore();
  });

  it("should log error when negative values are found in disk data", () => {
    const negativeDisk = {
      a: { " used": "-10", " total": "100", name: "/" }
    };
    mockInfraService.getDiscSpace.mockReturnValue(of(negativeDisk));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
    component.getDiscPercent("123");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative values found in disk data. Ignoring response:",
      Object.values(negativeDisk)
    );
    expect(component.diskPercent).toBe(0);
    consoleSpy.mockRestore();
  });

  it("should log error when root partition '/' is not found", () => {
    const noRoot = {
      x: { " used": "10", " total": "100", name: "/data" }
    };
    mockInfraService.getDiscSpace.mockReturnValue(of(noRoot));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
    component.getDiscPercent("123");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Root partition '/' not found in disk response."
    );
    expect(component.diskPercent).toBe(0);
    consoleSpy.mockRestore();
  });

  it("should log error when getDiscSpace API throws error", () => {
    mockInfraService.getDiscSpace.mockReturnValue(
      throwError(() => "DISK API FAILED")
    );
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
    component.getDiscPercent("123");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load disk space:",
      "DISK API FAILED"
    );
    expect(component.diskPercent).toBe(0);
    consoleSpy.mockRestore();
  });

  // getSystemProperties

  it("should log error when system properties response is NOT an object", () => {
    const invalidResp = "not-an-object";
    mockInfraService.getSystemProperties
      .mockReturnValue(of(invalidResp));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    component.getSystemProperties("abc", "LINUX");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid system properties response:",
      invalidResp
    );
    consoleSpy.mockRestore();
  });

  it("should log error when system properties has negative values", () => {
    const negativeResp = {
      hostname: "server1",
      logical_cores: "-8"
    };
    mockInfraService.getSystemProperties
      .mockReturnValue(of(negativeResp));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    component.getSystemProperties("abc", "LINUX");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Negative values found in system properties. Ignoring response:",
      negativeResp
    );
    consoleSpy.mockRestore();
  });

  it("should log error when system properties API throws error", () => {
    const errObj = new Error("Boom");
    mockInfraService.getSystemProperties
      .mockReturnValue(throwError(() => errObj));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    component.getSystemProperties("abc", "LINUX");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load system properties:",
      errObj
    );
    consoleSpy.mockRestore();
  });

});

