import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as FileSaver from 'file-saver';
import * as Highcharts from 'highcharts';
import 'highcharts/modules/no-data-to-display';
import { HighchartsChartModule } from 'highcharts-angular';
import { filter, Subscription, switchMap, map, Subject, takeUntil } from 'rxjs';
import 'highcharts/modules/heatmap';
import 'highcharts/modules/tilemap';
import 'highcharts/modules/exporting';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MatDialogModule } from '@angular/material/dialog';
import * as XLSX from 'xlsx-js-style';
import { QueryTabComponent } from './query-tab-component/query-tab-component';
import { DateService } from '../../../services/date.service';
import { SmReportsApiService } from '../../../services/sm-reports-api.service';
import { MeteringConfigService } from '../../../services/metering-config.service';
import { User } from '../../../models/user';
import { UpdateMeteringConfig } from '../../../models/updateMeteringConfig';
import { TimeConversionPipe } from '../../../pipes/time-conversion.pipe';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ServiceResponse } from '../../../models/common/ServiceResponse';
import { ServiceStatus } from '../../../models/enums/ServiceStatus';
import { ApplicationService } from '../../../services/application.service';
import { Session } from '../../../models/session';
import { DecoderService } from '../../../services/decoder.service';
import { Router } from '@angular/router';
import { LoggerService } from '../../../services/logger.service';

interface CustomSeriesOptions extends Highcharts.SeriesColumnOptions {
  decodedOuterKey?: string;
}

@Component({
    selector: 'app-software-metering',
    imports: [
        CommonModule,
        FormsModule,
        HighchartsChartModule,
        MatDialogModule,
        QueryTabComponent,
        TimeConversionPipe,
        ScrollingModule
    ],
    templateUrl: './software-metering.component.html',
    styleUrl: './software-metering.component.css'
})
export class SoftwareMeteringComponent implements OnInit {
  @ViewChild('deviceDetailsModal') deviceDetailsModal: any;

  // For Query Tab
  selectedTab: string | undefined = 'dashboard';
  leastUsedProcessesTable: any;
  mostUsedProcessesTable: any;
  dnddTableData: any;
  dnddCardData: any;
  hostLastSeenData: any;
  osUsageTableData: any;
  dormantHostData!: { hostName: any; count: number; hostId: number }[];
  processPerHostUsage: any;
  hostUserIdMap: Record<number, string> | any = {};
  timePipe = new TimeConversionPipe();
  totalHostMonitored: number = 0;
  totalProcessMonitored: number = 0;
  totalUnusedApps: number = 0;
  notMonitoredProcesses: string[] = [];
  filteredProcesses: string[] = [];
  processSearchTerm: string = '';
  @ViewChild('unusedAppsCard') unusedAppsCard!: ElementRef;
  @ViewChild('dormantDatesModal', { static: true }) dormantDatesModalRef!: TemplateRef<any>;
  modalDormantDates: Date[] = [];

  isCardHighlighted = false;
  isTableHighlighted = false;
  highlightTimeout: any;
  totalOsTypes: number = 0;
  totalEnrolledDevices: number = 0;
  defaultData: any[] = [];
  hostUsernames: any = {};




  constructor(
    private dateService: DateService,
    private smReportsApiService: SmReportsApiService,
    private meteringConfigService: MeteringConfigService,
    private applicationService: ApplicationService,
    private decoderService: DecoderService,
    private router: Router,
    private loggerService: LoggerService,
    private modalService: NgbModal
  ) {

  }
  kpiThreshold: number = 7;

  applicationReports: any[] = [];
  filteredReports: any[] = [];
  pagedReports: any[] = [];
  searchQuery = '';
  showSearch = false;
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  itemsPerPage = 15;
  totalPages = 0;
  selectedAppName: string = '';
  selectedAppId!: number;
  monitoringStatus!: boolean;
  alertMessage: string | null = null;
  alertType: 'success' | 'error' | null = null;
  showAlert = false;
  selectedReport: any = {};
  zoneList: any[] = [];
  groupList: any[] = [];
  totalZones: number = 0;
  totalGroups: number = 0;

  selectedZoneId: number | null = null;   // Default: All Zones
  selectedGroupId: number | null = null;  // Default: All Groups
  allZones: any[] = []; // Holds all zone data
  totalDormantDevices: number = 0;
  selectedDate: string = '';
  modalDeviceDetails: any[] = [];
  fullServiceResponse: any = {};






  // Dashboard Part

  Highcharts: typeof Highcharts = Highcharts;

  cpuUsageChartOptions!: Highcharts.Options;
  dbQueriesChartOptions: Highcharts.Options = {};
  serviceErrorChartOptions: Highcharts.Options = {};
  applicationLatencyChartOptions: Highcharts.Options = {};
  osUsagePieChartOptions!: Highcharts.Options;
  unusedSoftwareChartOptions!: Highcharts.Options;
  usageTrendChartOptions!: Highcharts.Options;
  inactiveUsersChartOptions!: Highcharts.Options;
  topUsedSoftwareHeatMapChartOptions!: Highcharts.Options;
  nddChartOptions!: Highcharts.Options;
  leastUsedSoftwareHeatMapChartOptions!: Highcharts.Options;
  dormantDevicesChartOptions!: Highcharts.Options;
  user = new User();
  currentUser!: User;
  sessionObject: Session = new Session();
  userId: any;
  selectedService!: string | null;
  endTime!: number;
  startTime!: number;
  initialStartTime!: number;
  startDate!: number;
  endDate!: number;
  private subscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();

  datemodel: any;
  selectedDept: string = '';
  selectedDept1: string = '';
  selectedDept2: string = '';
  selectedDept3: string = '';
  day1: string = '';
  nddDay: string = ''
  nddDayList: string[] = ['7', '10', '14']
  dayList1: string[] = ['180', '60', '30'];
  day2: string = '';
  dayList2: string[] = ['180', '60', '30'];
  deptList: string[] = ['IT', 'APM'];
  deptList1: string[] = ['IT', 'APM'];
  deptList2: string[] = ['IT', 'APM'];
  deptList3: string[] = ['IT', 'APM'];
  applicationReports2: any[] = [];
  filteredReports2: any[] = [];
  pagedReports2: any[] = [];
  searchQuery2 = '';
  showSearch2 = false;
  sortColumn2: string = '';
  sortDirection2: 'asc' | 'desc' = 'asc';
  currentPage2 = 1;
  itemsPerPage2 = 25;
  totalPages2 = 0;
  allSeriesVisible = true;
  chartRef: any; // to hold chart instance
  hasOsData: any;
  themeObserver!: MutationObserver;
  applicationReports_1: any[] = [];
  hostActiveDetailsChartOptions!: Highcharts.Options;
  itemsPerPage_1: number = 10;
  currentPage_1: number = 1;
  totalPages_1: number = 1;
  pagedReports_1: any[] = [];
  filteredReports_1: any[] = [];

  pageInput: number = 1;
  pageInput_1: number = 1;

  sortColumn_1: string = '';
  sortDirection_1: 'asc' | 'desc' = 'asc';
  lastDormantApiResponse: any = null;
  selectedDeviceName: string = '';
  networkIOChart: Highcharts.Options | null = null;
  networkIoPerServerChart: Highcharts.Options | null = null;
  selectedProcessName: string = ''
  hostDetailsRaw: any = {};
  zoneRBACList: any[] = [];







  ngOnInit(): void {
    this.user = this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!)) as User;
    this.currentUser = this.currentUser ?? {} as User;

    this.user.sessionDTO = this.sessionObject;

    this.sessionObject.featureName = 'RUAMBOT';
    // this.sessionObject.menu = "Alert";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    this.currentUser.sessionDTO = this.sessionObject;
    this.getAllHostUsernames();
    // this.getAllSoftwares();
    // this.getAllHosts();
    // this.getNotMonitoredProcesses();

    this.loadZoneRBAC();

    // this.selectedZoneId = -1;
    // this.selectedGroupId = -1;
    // this.loadZoneData();

    this.themeObserver = new MutationObserver(() => {
      this.refreshCharts();
    });
    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme', 'theme-switch']
    });
    this.selectedService = sessionStorage.getItem('SelectedServiceId');
    this.dateService.setActiveComponent('SoftwareMeteringComponent');
    this.subscription = this.dateService.activeComponent$.pipe(
      filter((activeComponent) => activeComponent === 'SoftwareMeteringComponent'),
      switchMap(() => this.dateService.date$)
    ).subscribe((dates: any) => {
      this.datemodel = dates;
      this.startTime = this.formatDate(this.datemodel.startdateTime);
      this.endTime = this.formatDate(this.datemodel.enddateTime);
      this.startDate = this.formatDate(this.datemodel.startdateTime);
      this.endDate = this.formatDate(this.datemodel.enddateTime);
      this.refreshCharts();
      if (!this.initialStartTime) {
        this.initialStartTime = this.startTime;
      }
    });
  }

  loadZoneRBAC(): void {
  if (this.user) {
    this.applicationService
      .getSoftwareMeteringZoneAndTeamList(this.user)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.zoneRBACList = res?.serviceResponse || [];

          // skip index 0 ("Others") for dropdown
          this.zoneList = this.zoneRBACList;
          // console.log("ZonelistRBAC",JSON.stringify(this.zoneRBACList,null,2));
          // console.log("Zonelist",JSON.stringify(this.zoneList,null,2));

          // totalZones
          this.totalZones = this.zoneList.length;

          this.zoneRBACList.forEach(zone => { this.totalGroups += (zone.groups ? zone.groups.length : 0); });

          // Preselect first zone (index 0 of zoneList, which is index 1 of zoneRBACList)
          if (this.zoneList.length > 0) {
            const firstZone = this.zoneList[0];
            this.selectedZoneId = Number(firstZone.id);

            // populate groupList for the first zone
            this.groupList = firstZone.groups || [];

            // preselect first group
            if (this.groupList.length > 0) {
              this.selectedGroupId = Number(this.groupList[0].id);
            } else {
              this.selectedGroupId = null;
            }
          }

          // load data dependent on selection
          this.loadDataForSelectedGroup();
        },
        error: (err) => {
          console.error('Error loading zone RBAC:', err);
          this.zoneRBACList = [];
          this.zoneList = [];
          this.groupList = [];
          this.selectedZoneId = null;
          this.selectedGroupId = null;
          this.totalZones = 0;
          this.totalGroups = 0;
        }
      });
  } else {
    console.error('User details are not available.');
    this.zoneRBACList = [];
    this.zoneList = [];
    this.groupList = [];
    this.selectedZoneId = null;
    this.selectedGroupId = null;
    this.totalZones = 0;
    this.totalGroups = 0;
  }
}




  loadZoneData(): void {
    this.smReportsApiService.getZoneData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.zoneList = res?.serviceResponse || [];
          this.allZones = [...this.zoneList];

          // ✅ Preselect zone at index 1 if it exists
          if (this.zoneList.length > 1) {
            this.selectedZoneId = this.zoneList[1].id;
          } else if (this.zoneList.length > 0) {
            // fallback to the first if only one zone
            this.selectedZoneId = this.zoneList[0].id;
          }

          // Now load groups for the selected zone
          this.smReportsApiService
            .getGroupData(this.selectedZoneId!)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (groupRes) => {
                this.groupList = groupRes?.serviceResponse || [];

                // ✅ Preselect first group for that zone
                if (this.groupList.length > 0) {
                  this.selectedGroupId = this.groupList[0].id;
                }
              },
              error: (err) => {
                console.error('Error loading groups:', err);
                this.groupList = [];
              }
            });
        },
        error: (err) => {
          console.error('Failed to load zones:', err);
          this.zoneList = [];
        }
      });
  }



  handleZoneChange(): void {
  const zoneId = this.selectedZoneId;

  // Compute totalZones dynamically
  // this.totalZones = this.zoneRBACList.length > 1 ? this.zoneRBACList.length - 1 : 0;

  if (zoneId !== null) {
    this.smReportsApiService.getGroupData(zoneId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.groupList = res?.serviceResponse || [];

        // Preselect first group if available
        this.selectedGroupId = this.groupList.length > 0 ? this.groupList[0].id : null;

        // Compute totalGroups from the selected zone in zoneRBACList
        // const selectedZone = this.zoneRBACList.find(z => z.id === zoneId);
        // this.totalGroups = selectedZone?.groups?.length || 0;

        this.loadDataForSelectedGroup();
      },
      error: (err) => {
        console.error('Error loading groups:', err);
        this.groupList = [];
        this.selectedGroupId = null;
        this.totalGroups = 0;
      }
    });
  }
}





  handleGroupChange(): void {
    // Update totalGroups based on current selection
    // this.totalGroups = this.selectedGroupId === -1 ? this.groupList.length : 1;
    this.loadDataForSelectedGroup();
  }




  loadDataForSelectedGroup(): void {
    if (this.selectedTab == 'dashboard' && this.selectedZoneId !== null && this.selectedGroupId !== null) {
      this.getSoftwareUsage(this.selectedZoneId, this.selectedGroupId);
      this.getOsUsagePie(this.selectedZoneId, this.selectedGroupId);
      this.getDailyNewDeviceDiscovery(this.selectedZoneId, this.selectedGroupId);
      this.getDormantHosts(this.selectedZoneId, this.selectedGroupId);
      this.getNetworkIO();
      this.getNetworkIoPerServer();
      this.getHostsActiveDetails();
      this.getAllHosts(this.selectedZoneId, this.selectedGroupId);
      this.getHostsLastSeen(this.selectedZoneId, this.selectedGroupId);
    }
  }



  refreshCharts(): void {
    if (this.selectedZoneId !== null && this.selectedGroupId !== null) {
      this.getSoftwareUsage(this.selectedZoneId, this.selectedGroupId);
      this.getOsUsagePie(this.selectedZoneId, this.selectedGroupId);
      this.getDailyNewDeviceDiscovery(this.selectedZoneId, this.selectedGroupId);
      this.getDormantHosts(this.selectedZoneId, this.selectedGroupId);
      this.getNetworkIO();
      this.getNetworkIoPerServer();
      this.getHostsActiveDetails();
      this.getAllHosts(this.selectedZoneId, this.selectedGroupId);
      this.getHostsLastSeen(this.selectedZoneId, this.selectedGroupId);
    }
  }

  // loadTechnicalCharts(): void {
  //   this.getOsUsagePie(this.selectedZoneId, this.selectedGroupId);
  //   this.getSoftwareUsage(this.selectedZoneId, this.selectedGroupId);
  //   this.getDormantHosts(this.selectedZoneId, this.selectedGroupId);
  //   this.getHostsLastSeen(this.selectedZoneId, this.selectedGroupId);
  //   this.getDailyNewDeviceDiscovery(this.selectedZoneId, this.selectedGroupId);
  //   this.getNetworkIO();
  //   this.getNetworkIoPerServer();
  //   this.getHostsActiveDetails();
  // }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.searchQuery = '';
      this.filteredReports = [...this.applicationReports];
    }
  }

  scrollToProcessTable(): void {
    const element = document.getElementById('not-monitored-processes-table');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      element.classList.add('glow-effect');
      setTimeout(() => {
        element.classList.remove('glow-effect');
      }, 2000);
    }
  }

  scrollToNewDevicesTable() {
    const element = document.getElementById('daily-new-devices-table');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Add glow
      element.classList.add('glow-effect');

      // Remove glow after 2 seconds
      setTimeout(() => {
        element.classList.remove('glow-effect');
      }, 2000);
    }
  }


  ngOnDestroy() {
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
  }

  onSearch(): void {
    const query = this.searchQuery?.toLowerCase().trim();

    if (query) {
      this.filteredReports = this.applicationReports.filter(app => {
        return Object.keys(app).some(key => {
          const value = app[key];
          return value != null && value.toString().toLowerCase().includes(query);
        });
      });
    } else {
      this.filteredReports = [...this.applicationReports];
    }

    // Reset to first page after filtering
    this.currentPage = 1;
    this.pageInput = this.currentPage
    this.calculatePagination();
  }

  getAllHostUsernames(): void {
    this.smReportsApiService.getHostUsernames().subscribe({
      next: (data: ServiceResponse<any>) => {
        if (data.serviceStatus == ServiceStatus.SUCCESS) {
          this.hostUsernames = data.serviceResponse;
        }
      }
    })
  }


  getAllSoftwares(): void {
    this.smReportsApiService.getAllSoftwares().pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const responseData = data?.serviceResponse;

      if (Array.isArray(responseData)) {
        this.applicationReports = responseData;
      } else {
        this.applicationReports = [];
      }

      this.filteredReports = [...this.applicationReports];
      this.calculatePagination();
    });
  }

  // getNotMonitoredProcesses(): void {
  //   this.smReportsApiService.getSoftwareUsage2().subscribe({
  //     next: (data: any) => {
  //       const unusedList = data?.UnusedProcess || [];

  //       this.notMonitoredProcesses = unusedList;
  //       this.filteredProcesses = [...unusedList];
  //       this.totalUnusedApps = unusedList.length;
  //     },
  //     error: (error) => {
  //       console.error("Failed to fetch not monitored processes", error);
  //       this.notMonitoredProcesses = [];
  //       this.filteredProcesses = [];
  //       this.totalUnusedApps = 0;
  //     }
  //   });
  // }


  // Add this to your component to handle search filtering
  filterProcesses(): void {
    if (!this.processSearchTerm) {
      this.filteredProcesses = [...this.notMonitoredProcesses];
      return;
    }

    const searchTerm = this.processSearchTerm.toLowerCase();
    this.filteredProcesses = this.notMonitoredProcesses
      .filter(process => process.toLowerCase().includes(searchTerm))
      .sort((a: string, b: string) => a.localeCompare(b));
  }



  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredReports.sort((a, b) => {
      const valueA = a[column];
      const valueB = b[column];

      if (valueA == null || valueB == null) return 0;

      let comparison: number;

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        comparison = valueA - valueB;
      } else {
        comparison = valueA.toString().localeCompare(valueB.toString(), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.currentPage = 1;
    this.calculatePagination();
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredReports.length / this.itemsPerPage) || 1;

    // 🔹 Clamp currentPage so it never exceeds totalPages
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    this.pagedReports = this.filteredReports.slice(
      (this.currentPage - 1) * this.itemsPerPage,
      this.currentPage * this.itemsPerPage
    );

    if (this.pagedReports.length > 0) {
      this.getSoftwareDetailsDefault(this.pagedReports[0].id);
    }
  }


  previousPage(): void {
    if (this.currentPage > 1) {
      this.pageInput = --this.currentPage;
      // this.pageInput--;
      this.calculatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.pageInput = ++this.currentPage;
      // this.pageInput++
      this.calculatePagination();
    }
  }

  // goToPage(page: any): void {
  //   this.currentPage = page;
  //   this.calculatePagination();
  // }
  goToPage(page: any): void {
    let pageNumber = Number(page);

    if (!pageNumber || pageNumber < 1) pageNumber = 1;
    else if (pageNumber > this.totalPages) pageNumber = this.totalPages;

    this.currentPage = pageNumber;
    this.pageInput = pageNumber; // reset input to clamped value
    this.calculatePagination();
  }


  get totalPagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.totalPages <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    } else {
      if (this.currentPage <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPages];
      } else if (this.currentPage >= this.totalPages - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPages - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPage - 1, this.currentPage, this.currentPage + 1, '...', this.totalPages];
      }
    }
    return pages;
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.applicationReports.length);
  }

  downloadReport(): void {
    const fileName = 'application_list.xlsx';

    const worksheetData = this.applicationReports.map((report, index) => ({
      '#': index + 1,
      'Software Name': report.name,
      'Version': report.version,
      'Source': report.source,
      'Host Count': report.hostCount,
      'Monitoring': report.enabled ? 'Yes' : 'No',
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(worksheetData);
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 10 }
    ];
    const borderStyle = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };

    const headerStyle = {
      font: { bold: true },
      border: borderStyle,
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    const cellStyle = {
      border: borderStyle,
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    const headerKeys = Object.keys(worksheetData[0]);
    const numCols = headerKeys.length;
    const numRows = worksheetData.length + 1; // +1 for header row

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellRef];
        if (!cell) continue;
        cell.s = r === 0 ? headerStyle : cellStyle;
      }
    }

    const workbook: XLSX.WorkBook = {
      Sheets: { 'Report': worksheet },
      SheetNames: ['Report']
    };

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    FileSaver.saveAs(data, fileName);
  }

  showAppDetail(ip: string, id: number, status: boolean) {
    this.clearSelection();
    this.selectedAppName = ip;
    this.selectedAppId = id;
    this.monitoringStatus = status;
    this.getSoftwareDetailsById();
    this.getSoftwareDetailsById2();
  }

  getSoftwareDetailsById(): void {
    this.smReportsApiService.getSoftwareDetailsById(this.selectedAppId).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const responseData = data?.serviceResponse;
      // console.log(responseData)
      if (Array.isArray(responseData) && responseData.length > 0) {
        this.selectedReport = responseData[0];
      } else {
        this.selectedReport = {
          hostname: '',
          source: '',
          installedPath: '',
          version: '',
        };
      }
    });
  }

  // Metering

  clearSelection() {
    this.selectedReport = null;
  }

  saveMeteringRules(): void {
    const config: UpdateMeteringConfig = {
      id: this.selectedAppId,
      enabled: this.monitoringStatus
    };

    this.smReportsApiService.updateMeteringConfig(config).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {

        this.alertMessage = 'Monitoring configuration saved successfully.';
        this.alertType = 'success';
        this.showAlert = true;

        this.selectedReport = null;
        this.applicationReports = [];
        this.getAllSoftwares();

        setTimeout(() => this.showAlert = false, 1000); // auto-close after 1 sec
      },
      error: (err: any) => {

        this.alertMessage = 'Failed to save monitoring configuration.';
        this.alertType = 'error';
        this.showAlert = true;

        setTimeout(() => this.showAlert = false, 1000); // auto-close after 1 sec
      }
    });
  }

  // Dashboard Part

  onDepartmentChange3(): void {
    if (this.selectedDept3) {
      this.getDormantDevicesByDepartment(this.selectedDept3);
    }
  }


  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  convertTimebucket(timebucket: number | string): number {
    const tbStr = timebucket.toString();
    const year = parseInt(tbStr.slice(0, 4), 10);
    const month = parseInt(tbStr.slice(4, 6), 10) - 1;
    const day = parseInt(tbStr.slice(6, 8), 10);
    const hour = tbStr.length >= 10 ? parseInt(tbStr.slice(8, 10), 10) : 0;
    const minute = tbStr.length >= 12 ? parseInt(tbStr.slice(10, 12), 10) : 0;
    const date = new Date(Date.UTC(year, month, day, hour, minute));
    return date.getTime();
  }

  formatDateFromDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    const hour = pad(date.getUTCHours());
    const minute = pad(date.getUTCMinutes());
    return `${year}${month}${day}${hour}${minute}`;
  }

  cpuUsageChart(seriesData: any[]): void {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
    seriesData.forEach(series => {
      series.marker = {
        radius: 1
      };
    });
    this.cpuUsageChartOptions = {
      chart: {
        type: 'line',
        backgroundColor: 'transparent'
      },
      title: {
        text: undefined,
        style: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '14'
        }
      },
      xAxis: {
        type: 'datetime',
        title: {
          text: "",
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '10'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '10'
          }
        },
        gridLineColor: gridColor,
        lineColor: gridColor,
      },
      yAxis: {
        min: 0, // adjust as needed
        max: 100,
        tickAmount: 6,
        title: {
          text: "",
          style: {
            color: '#ffffff',
            fontWeight: 'normal',
            fontSize: '10'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '10'
          },
          x: -5
        },
        gridLineColor: gridColor,
        lineColor: gridColor,
      },
      tooltip: {
        useHTML: true,
        backgroundColor: tooltipBgColor,
        style: {
          color: tooltipTextColor,
        },
        formatter: function (this: any) {
          const point: any = this.point;
          const info = point.additionalInfo || {};
          return `
            <b>${this.series.name}</b><br/>
            <b>Time:</b> ${Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x)}<br/>
            <b>CPU Usage:</b> ${this.y}<br/>
            <b>System:</b> ${info.system ?? '-'}<br/>
            <b>User:</b> ${info.user ?? '-'}<br/>
            <b>Idle:</b> ${info.idle ?? '-'}<br/>
            <b>Nice:</b> ${info.nice ?? '-'}<br/>
            <b>SoftIRQ:</b> ${info.softirq ?? '-'}<br/>
            <b>IRQ:</b> ${info.irq ?? '-'}<br/>
            <b>IOWait:</b> ${info.iowait ?? '-'}<br/>
            <b>Steal:</b> ${info.steal ?? '-'}
          `;
        }
      },
      plotOptions: {
        series: {
          cursor: 'pointer',
          point: {
            events: {
              click: function () {
                //const clickedTimestamp = this.x;
                // let intervalMs = 60 * 1000; // default
                const infraName = this.series.name;
                const chartComponent = (window as any)['angularComponentRef'];

                // const endTime = clickedTimestamp + intervalMs;
                if (chartComponent) {
                  // const formattedStart = chartComponent.formatToCustomString(clickedTimestamp);
                  // const formattedEnd = chartComponent.formatToCustomString(endTime);
                  sessionStorage.setItem('cpuUsageStartTime', chartComponent.component.startTime.toString());
                  sessionStorage.setItem('cpuUsageEndTime', chartComponent.component.endTime.toString());
                  chartComponent.setHostInfraId(infraName);
                  chartComponent.ngZone.run(() => {
                    chartComponent.router.navigate(['/linux-service']);
                  });
                }
              }
            }
          }
        }
      },
      legend: {
        enabled: false,
        layout: 'horizontal',
        align: 'left',
        verticalAlign: 'bottom',
        itemStyle: {
          fontSize: '9px',
          fontWeight: 'normal',
          color: 'white'
        },
        symbolHeight: 6,
        symbolWidth: 6,
        symbolRadius: 2,
        itemMarginTop: -1,
        itemMarginBottom: -1,
        padding: 2,
        itemDistance: 10,
        width: 75,
        maxHeight: 120
      },
      series: seriesData,
      credits: {
        enabled: false
      }
    };
  }

  getOsUsagePie(zoneId: number, groupId: number): void {
    this.smReportsApiService.getHostCountByOS2(zoneId, groupId).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const serviceResponse = data?.serviceResponse;
      const pieChartData = Object.entries(serviceResponse).map(([host, count]: [string, any]) => ({
        name: host.charAt(0).toUpperCase() + host.slice(1),
        y: +count
      }));
      this.hasOsData = pieChartData;
      this.osUsageChartPie(pieChartData);

      const total = Object.values(serviceResponse).reduce((sum: number, count: any) => sum + Number(count), 0);

      this.osUsageTableData = Object.entries(serviceResponse).map(([name, count]: [string, any]) => {
        const percentage = total === 0 ? 0 : (Number(count) / total) * 100;
        return {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          distribution: Number(percentage.toFixed(2)),
          count: Number(count)
        };
      });
      this.filteredOsUsageTableData = [...this.osUsageTableData];

    });
  }

  osUsageChartPie(pieChartData: any[]): void {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

    // New soothing and professional color palette
    const soothingPalette = [
      '#0096c7',  // Soft blue
      '#F28E2B',  // Vibrant orange
      '#E15759',  // Coral red
      '#76B7B2',  // Teal
      '#EDC948',  // Gold
      '#B07AA1',  // Purple
      '#FF9DA7',  // Pink
      '#9C755F',  // Brown
      '#BAB0AC'   // Gray
    ];

    this.osUsagePieChartOptions = {
      chart: {
        type: 'pie',
        backgroundColor: 'transparent'
      },
      colors: soothingPalette, // Assign the new color palette here
      title: {
        text: undefined,
        style: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '14'
        }
      },
      tooltip: {
        backgroundColor: tooltipBgColor,
        pointFormat: '{point.y:.1f} count<br>{point.percentage:.1f}%',
        style: {
          fontSize: '12px',
          color: tooltipTextColor,
        }
      },
      plotOptions: {
        pie: {
          ...({
            colorByPoint: true,
            allowPointSelect: true,
            cursor: 'pointer',
            borderWidth: 0,
            dataLabels: {
              enabled: false
            },
            showInLegend: true
          } as any)
        },
        series: {
          point: {
            events: {
              click: function (this: any) {
                const element = document.getElementById('osPieTable');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  element.classList.add('glow-highlight');
                  setTimeout(() => {
                    element.classList.remove('glow-highlight');
                    element.classList.add('fade-out-shadow');
                    setTimeout(() => {
                      element.classList.remove('fade-out-shadow');
                    }, 1000);
                  }, 1000);
                }
              }
            }
          },
        },
      },
      legend: {
        enabled: true,
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        itemStyle: {
          fontSize: '9px',
          fontWeight: 'normal',
          color: labelColor
        },
        symbolHeight: 6,
        symbolWidth: 6,
        symbolRadius: 2,
        itemMarginTop: -1,
        itemMarginBottom: -1,
        padding: 2,
        itemDistance: 10,
        floating: false,
      },
      series: [{
        type: 'pie',
        name: 'CPU Breakdown',
        data: pieChartData
      }],
      credits: {
        enabled: false
      },
      exporting: {
        enabled: false
      }
    };
  }

  getApplicationUsageTrend(): void {
    const softwares = ['Chrome', 'VSCode', 'Slack', 'Zoom', 'Figma', 'Postman', 'Jira', 'Outlook', 'Teams', 'Notion'];
    const dates = ['2025-05-31', '2025-06-01', '2025-06-02', '2025-06-03', '2025-06-04', '2025-06-05', '2025-06-06'];

    const seriesData = softwares.map(software => {
      const data = dates.map(date => {
        return [
          new Date(date).getTime(),
          Math.floor(Math.random() * 50) + 1 // Usage in hours (1–5)
        ];
      });

      return {
        name: software,
        data,
        type: 'line'
      };
    });

    this.usageTrendChart(seriesData);
  }

  sortKey: string = 'name';
  sortAsc: boolean = true;

  onSort3(key: 'name' | 'usedFor'): void {
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;  // toggle sort order
    } else {
      this.sortKey = key;
      this.sortAsc = true; // default ascending when changing key
    }

    this.leastUsedProcessesTable.sort((a: { name: string; usedFor: number; }, b: { name: any; usedFor: number; }) => {
      let comp = 0;
      if (key === 'name') {
        comp = a.name.localeCompare(b.name);
      } else if (key === 'usedFor') {
        comp = a.usedFor - b.usedFor;
      }
      return this.sortAsc ? comp : -comp;
    });
  }

  sortKey2: string = 'name';
  sortAsc2: boolean = true;

  onSort4(key: 'name' | 'usedFor' | 'srNo'): void {
    if (this.sortKey2 === key) {
      this.sortAsc2 = !this.sortAsc2;
    } else {
      this.sortKey2 = key;
      this.sortAsc2 = true;
    }

    this.filteredMostUsedProcessesTable.sort((a: { name: string; usedFor: number }, b: { name: string; usedFor: number }) => {
      let comp = 0;

      if (key === 'name') {
        comp = a.name.localeCompare(b.name);
      } else if (key === 'usedFor') {
        comp = a.usedFor - b.usedFor;
      } else if (key === 'srNo') {
        // Compare based on original array index
        const indexA = this.filteredMostUsedProcessesTable.indexOf(a);
        const indexB = this.filteredMostUsedProcessesTable.indexOf(b);
        comp = indexA - indexB;
      }

      return this.sortAsc2 ? comp : -comp;
    });
  }


  sortField: string = '';
  sortAsc3: boolean = true;

  onSort5(field: 'count' | 'enrolledOn'): void {
    if (this.sortField === field) {
      this.sortAsc3 = !this.sortAsc3; // Toggle sort direction
    } else {
      this.sortField = field;
      this.sortAsc3 = true;
    }

    this.filtereDnddTableData.sort((a: { [x: string]: any; }, b: { [x: string]: any; }) => {
      let aValue = a[field];
      let bValue = b[field];

      // Convert to number if sorting by count
      if (field === 'count') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }

      // Convert to timestamp if sorting by enrolledOn
      if (field === 'enrolledOn') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      const compare = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return this.sortAsc3 ? compare : -compare;
    });
  }

  sortField6: string = '';
  sortAsc6: boolean = true;

  onSort6(field: 'hostname' | 'seen_time'): void {
    if (this.sortField6 === field) {
      this.sortAsc6 = !this.sortAsc6; // Toggle sort direction
    } else {
      this.sortField6 = field;
      this.sortAsc6 = true;
    }

    this.hostLastSeenData.sort((a: { [x: string]: any; }, b: { [x: string]: any; }) => {
      let aValue = a[field];
      let bValue = b[field];

      if (field === 'hostname') {
        aValue = String(aValue) || 0;
        bValue = String(bValue) || 0;
      }

      // Convert to timestamp if sorting by enrolledOn
      if (field === 'seen_time') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      const compare = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return this.sortAsc6 ? compare : -compare;
    });
  }

  sortKey7: string = 'name';
  sortAsc7: boolean = true;

  onSort7(key: 'name' | 'count' | 'distribution'): void {
    if (this.sortKey7 === key) {
      this.sortAsc7 = !this.sortAsc7;
    } else {
      this.sortKey7 = key;
      this.sortAsc7 = true;
    }

    this.filteredOsUsageTableData.sort((a: { name: string; count: number; }, b: { name: any; count: number; }) => {
      let comp = 0;
      if (key === 'name') {
        comp = a.name.localeCompare(b.name);
      } else if (key === 'count') {
        comp = a.count - b.count;
      }
      return this.sortAsc7 ? comp : -comp;
    });
  }

  sortKey8: string = 'name';
  sortAsc8: boolean = true;

  onSort8(key: 'hostName' | 'count'): void {
    if (this.sortKey8 === key) {
      this.sortAsc8 = !this.sortAsc8;
    } else {
      this.sortKey8 = key;
      this.sortAsc8 = true;
    }

    this.filteredDormantDevices.sort((a: { hostName: string; count: number; }, b: { hostName: any; count: number; }) => {
      let comp = 0;
      if (key === 'hostName') {
        comp = a.hostName.localeCompare(b.hostName);
      } else if (key === 'count') {
        comp = a.count - b.count;
      }
      return this.sortAsc8 ? comp : -comp;
    });
  }

  dormantChartLimit: number = 10;
  dormantTableLimit: number = -1;

  getDormantHosts(zoneId: number, groupId: number): void {
    this.smReportsApiService.getDormantHosts2(this.startTime, this.endTime, zoneId, groupId).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const deviceDetailsByDate = data?.serviceResponse?.deviceDetailsByDate;
      const deviceCountByDate = data?.serviceResponse?.deviceCountByDate;
      this.lastDormantApiResponse = data;

      this.totalDormantDevices = data?.serviceResponse?.deviceCount;


      const hostIdMap = data?.serviceResponse?.hostUserIdMap ?? {};
      const dormantByDevice: Record<string, number[]> = data?.serviceResponse?.dormantByDevice ?? {};

      // Set data for the table
      this.dormantHostData = Object.entries(dormantByDevice).map(([hostId, dates]) => ({
        hostName: this.hostUsernames[hostId] ?? hostIdMap[hostId],
        count: dates.length,
        hostId: Number(hostId)
      }));
      this.filteredDormantDevices = [...this.dormantHostData];

      // Process chart data (date-wise counts)
      const chartData = Object.entries(deviceCountByDate).map(([dateStr, count]) => {
        // First, parse the YYYYMMDD string into a Date object
        const year = dateStr.slice(0, 4);
        const month = dateStr.slice(4, 6);
        const day = dateStr.slice(6, 8);
        const dateObj = new Date(`${year}-${month}-${day}`);

        // Then, format the date object to show month name and day
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          month: 'short', // 'long' for full month name (e.g., 'August'), 'short' for abbreviated (e.g., 'Aug')
          day: 'numeric'  // 'numeric' for day of the month (e.g., 4)
        });

        return { name: formattedDate, y: count as number };
      });

      // Set chart with date-wise data
      this.dormantDevicesChart(chartData);
    });
  }

  scrollToDormantTable(): void {
    const element = document.getElementById('dormant-devices-table');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Add glow
      element.classList.add('glow-effect');

      // Remove glow after 2 seconds
      setTimeout(() => {
        element.classList.remove('glow-effect');
      }, 2000);
    }
  }


  openDormantDatesModal(hostId: number): void {
    const hostIdMap = this.lastDormantApiResponse?.serviceResponse?.hostUserIdMap ?? {};
    const dormantByDevice: Record<string, number[]> = this.lastDormantApiResponse?.serviceResponse?.dormantByDevice ?? {};
    const dormantDates: Date[] = dormantByDevice[hostId].map(bucket => {
      const year = Math.floor(bucket / 10000);
      const month = Math.floor((bucket % 10000) / 100);
      const day = bucket % 100;
      return new Date(year, month - 1, day)
    })
    this.modalDormantDates = dormantDates.sort((a, b) => a.getTime() - b.getTime());
    this.selectedDeviceName = this.hostUsernames[hostId] ?? hostIdMap[hostId];
    this.modalService.open(this.dormantDatesModalRef, { size: 'md', centered: true });
  }



  getHostsLastSeen(zoneId: number, groupId: number): void {
    this.smReportsApiService.getHostsLastSeen2(zoneId, groupId).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const responseData = data?.serviceResponse;
      this.hostLastSeenData = responseData;
    });
  }


  getSoftwareUsage(zoneId: number, groupId: number): void {
    this.smReportsApiService.getSoftwareUsage2(this.startTime, this.endTime, zoneId, groupId).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const response = data.serviceResponse;
      this.totalHostMonitored = response.totalHostMonitored || 0;
      this.totalProcessMonitored = response.totalProcessMonitored || 0;

      const unusedList: string[] = response?.UnusedProcess || [];

      this.notMonitoredProcesses = unusedList;
      this.filteredProcesses = [...unusedList];  // for search/filtering use
      this.totalUnusedApps = unusedList.length;
      // Process mostUsedByDay for line chart
      const mostUsedByDay = response.mostUsedByDay;
      const seriesData: any[] = [];

      for (const processName in mostUsedByDay) {
        const usageByDate = mostUsedByDay[processName];
        const dataPoints = Object.keys(usageByDate).map((dateStr: string) => {
          const timestamp = this.convertTimebucket(dateStr);
          return {
            x: timestamp,
            y: Number((usageByDate[dateStr] / 60).toFixed(2)),
            additionalInfo: {
              time: dateStr,
              count: usageByDate[dateStr] / 60,
            }
          };
        }).sort((a, b) => a.x - b.x);

        seriesData.push({
          name: processName,
          data: dataPoints,
          type: 'line'
        });
      }
      this.usageTrendChart(seriesData);

      // Process leastUsedProcesses for column chart (reuse same data)
      const leastUsedProcesses = response.leastUsedProcesses;
      const leastUsedSeriesData = Object.entries(leastUsedProcesses).map(([name, count]) => ({
        name,
        y: count
      }));

      this.unusedSoftwareChart(leastUsedSeriesData);

      const leastUsedHeatmap = response.leastUsedProcessPCT;
      const leastUsedHeatmapData = Object.entries(leastUsedHeatmap).map(([name, value], index) => {
        const numericValue = Number(value);
        const percentValue = isNaN(numericValue) ? 0 : numericValue;
        return {
          name,
          x: index % 5,
          y: Math.floor(index / 5),
          value: Number(percentValue.toFixed(3))
        };
      });
      this.leastUsedSoftwareHeatMap(leastUsedHeatmapData);

      const topUsedHeatmap = response.mostUsedProcessPCT;
      const topUsedHeatmapData = Object.entries(topUsedHeatmap).map(([name, value], index) => {
        const numericValue = Number(value);
        const percentValue = isNaN(numericValue) ? 0 : numericValue;
        return {
          name,
          x: index % 5,
          y: Math.floor(index / 5),
          value: Number(percentValue.toFixed(3))
        };
      });
      this.topUsedSoftwareHeatMap(topUsedHeatmapData);

      this.leastUsedProcessesTable = Object.entries(response.leastUsedProcesses).map(([name, usedFor]) => ({
        name,
        usedFor
      }));
      this.mostUsedProcessesTable = Object.entries(response.processList).map(([name, usedFor]) => ({
        name,
        usedFor
      }));
      this.filteredMostUsedProcessesTable = [...this.mostUsedProcessesTable];
      this.processPerHostUsage = response.processPerHostUsage;
      this.hostUserIdMap = response.hostUserIdMap;
    });
  }

  topUsedSoftwareHeatMap(seriesData: any[]): void {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
    this.topUsedSoftwareHeatMapChartOptions = {
      chart: {
        type: 'heatmap',
        backgroundColor: 'transparent',
        marginTop: 20,
        marginBottom: 20
      },
      title: {
        text: undefined,
        style: {
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '14'
        }
      },
      xAxis: {
        categories: ['1', '2', '3', '4', '5'],
        title: {
          text: ""
        },
        labels: {
          enabled: false
        },
        gridLineWidth: 0,
        gridLineColor: gridColor,
        lineColor: gridColor,

      },
      yAxis: {
        categories: ['A', 'B'],
        title: {
          text: ""
        },
        labels: {
          enabled: false
        },
        gridLineWidth: 0,
        gridLineColor: gridColor,
        lineColor: gridColor,
        reversed: true
      },
      colorAxis: {
        min: 0,
        max: 100,
        stops: [
          [0, '#99c2ff'],   // softest blue
          [0.02, '#8bbaff'],   // between soft and med-light
          [0.04, '#7db2ff'],
          [0.06, '#70aaff'],
          [0.08, '#66a3ff'],   // medium-light blue
          [0.12, '#5c99f2'],
          [0.16, '#528fe6'],
          [0.20, '#4785d9'],
          [0.25, '#3385ff'],   // standard blue
          [0.35, '#2673e6'],
          [0.50, '#1a61cc'],
          [0.65, '#0d4fb2'],
          [0.75, '#0066cc'],   // deep blue
          [0.85, '#004c99'],
          [1, '#003366']    // navy blue
        ],
      },
      legend: {
        enabled: false
      },
      tooltip: {
        useHTML: true,
        backgroundColor: tooltipBgColor,
        style: {
          color: tooltipTextColor,
        },
        formatter: function (this: any) {
          return `
          <b>${this.point.name}</b><br/>
          Usage: <b>${this.point.value}%</b>
        `;
        }
      },
      plotOptions: {
        series: {
          borderWidth: 0,
          borderColor: '#ffffff',
          dataLabels: {
            enabled: true,
            color: '#fff',
            style: {
              fontSize: '9px',
              textOutline: 'none'
            },
            formatter: function (this: any) {
              const name = this.point.name || '';
              const value = this.point.value || 0;

              const wrappedName = name.length > 10
                ? name.match(/.{1,10}/g)?.join('<br/>')
                : name;

              return `${wrappedName}<br/>${value}%`;
            }
          },
          point: {
            events: {
              click: function (this: any) {
                const element = document.getElementById('mostUsedTable');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  // Add glow effect
                  element.classList.add('glow-highlight');
                  // Remove after a few seconds
                  setTimeout(() => {
                    element.classList.remove('glow-highlight');
                    element.classList.add('fade-out-shadow');
                    // Optionally remove the fade-out class after animation ends
                    setTimeout(() => {
                      element.classList.remove('fade-out-shadow');
                    }, 1000); // match this duration with your CSS transition
                  }, 1000); // show glow for 2 seconds
                }
              }
            }
          }
        }
      },
      series: [{
        name: 'Software Usage',
        type: 'heatmap',
        borderWidth: 0,
        data: seriesData,
        dataLabels: {
          enabled: true
        }
      }],
      credits: {
        enabled: false
      },
      exporting: {
        enabled: false
      }
    };
  }

  applySortingAndScroll(): void {
    this.filteredMostUsedProcessesTable.sort((a: { name: string; usedFor: number; }, b: { name: any; usedFor: number; }) => {
      let comp = 0;
      if (this.sortKey2 === 'name') {
        comp = a.name.localeCompare(b.name);
      } else if (this.sortKey2 === 'usedFor') {
        comp = a.usedFor - b.usedFor;
      }
      return this.sortAsc2 ? comp : -comp;
    });

    this.filteredMostUsedProcessesTable = [...this.filteredMostUsedProcessesTable];

    const element = document.getElementById('softwareUsageTable');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      element.classList.add('glow-highlight');
      setTimeout(() => {
        element.classList.remove('glow-highlight');
        element.classList.add('fade-out-shadow');
        setTimeout(() => element.classList.remove('fade-out-shadow'), 1000);
      }, 1000);
    }
  }


  usageTrendChart(seriesData: any[]): void {

    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

    this.usageTrendChartOptions = {
      colors: ['#a78a7f', '#b8b8ff', '#8fa998', '#ef8354', '#ffd8be', '#edc9ff', '#97cba9', '#d6a2e8', '#d08c60', '#8da0cb'],
      chart: {
        type: 'line',
        backgroundColor: 'transparent'
      },
      title: {
        text: undefined,
      },
      xAxis: {
        type: 'datetime',
        labels: {
          enabled: true,
          style: {
            color: labelColor,
            fontSize: '10'
          }
        },
        lineWidth: 0,
        tickLength: 0,
        gridLineColor: gridColor,
        lineColor: gridColor,
      },
      yAxis: {
        min: 0,
        tickAmount: 6,
        title: {
          text: ""
        },
        labels: {
          enabled: true,
          style: {
            color: labelColor,
            fontSize: '10'
          },
          x: -5
        },
        gridLineWidth: 1,
        gridLineColor: gridColor,
        lineColor: gridColor,
      },
      // tooltip: {
      //   useHTML: true,
      //   shared: true,
      //   formatter: function (this: any) {
      //     let s = `<b>Date:</b> ${Highcharts.dateFormat('%Y-%m-%d', this.x)}<br/>`;
      //     this.points.forEach((point: any) => {
      //       s += `<b>${point.series.name}:</b> ${point.y} hrs<br/>`;
      //     });
      //     return s;
      //   }
      // },      
      tooltip: {
        shared: true,
        backgroundColor: tooltipBgColor,
        style: { color: tooltipTextColor, fontSize: '10px' }
      },
      legend: {
        enabled: true,
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        itemStyle: {
          fontSize: '10px',
          fontWeight: 'normal',
          color: labelColor
        },
        symbolHeight: 6,
        symbolWidth: 6,
        symbolRadius: 2,
        itemMarginTop: -1,
        itemMarginBottom: -1,
        padding: 2,
        itemDistance: 10,
        maxHeight: 120,

        itemWidth: 90,          // Approx width per item (tweak as needed)
        width: 280,              // Total width (3 * itemWidth + spacing)
        useHTML: false           // Use false to keep SVG layout
      },
      plotOptions: {
        line: {
          lineWidth: 1,
          marker: {
            enabled: true,
            radius: 1  // smaller radius
          }
        },
        series: {
          point: {
            events: {
              click: () => {
                this.sortKey2 = 'usedFor';
                this.sortAsc2 = false;  // Descending order for usage trend
                this.applySortingAndScroll();
              }
            }
          }
        }
      },
      series: seriesData,
      credits: {
        enabled: false
      },
      exporting: {
        enabled: false,
        filename: 'usage-trend-chart',
        buttons: {
          contextButton: {
            symbol: 'menu',
            // menuItems: [
            //   'downloadPNG',
            //   'downloadJPEG',
            //   'downloadPDF',
            //   'downloadSVG'
            // ],
            theme: {
              fill: 'transparent',
              stroke: 'none',
            }
          }
        },
        accessibility: {
          enabled: true
        }
      }
    };
  }

  unusedSoftwareChart(seriesData: any[]): void {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
    const timePipe = this.timePipe; // capture the pipe in closure
    const sortedData = [...seriesData].sort((a, b) => a.y - b.y);
    const colors = [
      '#4E79A7',  // Soft blue
      '#F28E2B',  // Vibrant orange
      '#E15759',  // Coral red
      '#76B7B2',  // Teal
      '#59A14F',  // Green
      '#EDC948',  // Gold
      '#B07AA1',  // Purple
      '#FF9DA7',  // Pink
      '#9C755F',  // Brown
      '#BAB0AC'   // Gray
    ];

    this.unusedSoftwareChartOptions = {
      colors: colors,
      chart: {
        type: 'bar',
        backgroundColor: 'transparent'
      },
      title: {
        text: undefined,
        style: {
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '14'
        }
      },
      xAxis: {
        categories: seriesData.map(item => item.name),
        title: {
          text: 'Software',
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '10'
          }
        },
        labels: {
          enabled: false,
          style: {
            color: labelColor,
            fontSize: '10',
            letterSpacing: '0.5px'
          }
        },
        gridLineColor: gridColor,
        lineColor: gridColor,
      },
      yAxis: {
        min: 0,
        tickAmount: 6,
        title: {
          text: "",
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '10'
          }
        },
        labels: {

          style: {
            color: labelColor,
            fontSize: '10'
          },
          x: -5
        },
        gridLineColor: gridColor,
        lineColor: gridColor,
      },
      tooltip: {
        useHTML: true,
        backgroundColor: tooltipBgColor,
        style: {
          color: tooltipTextColor,
          fontSize: '10px',
          pointerEvents: 'none'
        },
        formatter: function (this: any) {
          const formattedTime = timePipe.transform(this.y, 'mins'); // convert mins to proper string
          return `<b>${this.key}</b><br/><b>${formattedTime}</b>`;
        }
      },
      legend: {
        enabled: false
      },
      plotOptions: {
        column: {
          colorByPoint: true,
          borderWidth: 0
        },
        series: {
          dataLabels: {
            enabled: true,
            useHTML: false,
            format: '{point.name}',
            x: 10,
            y: -2,
            style: {
              fontSize: '8px', // Smaller font size
              letterSpacing: '1px',
              fontWeight: '500',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: labelColor,
              textOutline: 'none'
            }
          },

          point: {
            events: {
              click: () => {
                this.sortKey2 = 'usedFor';
                this.sortAsc2 = true;
                this.applySortingAndScroll();
              }
            }
          }
        }
      },

      series: [{
        type: 'column',
        name: 'Unused Days',
        data: sortedData
      }],
      credits: {
        enabled: false
      },
      exporting: {
        enabled: false
      }
    };
  }

  leastUsedSoftwareHeatMap(seriesData: any[]): void {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
    this.leastUsedSoftwareHeatMapChartOptions = {
      chart: {
        type: 'heatmap',
        backgroundColor: 'transparent',
        marginTop: 20,
        marginBottom: 20
      },
      title: {
        text: undefined,
        style: {
          color: '#ffffff',
          fontWeight: 'normal',
          fontSize: '10'
        }
      },
      xAxis: {
        categories: ['1', '2', '3', '4', '5'],
        title: {
          text: ""
        },
        labels: {
          enabled: false
        },
        gridLineWidth: 0,
        gridLineColor: gridColor,
        lineColor: gridColor,
      },
      yAxis: {
        categories: ['A', 'B'],
        title: {
          text: ""
        },
        labels: {
          enabled: false
        },
        gridLineWidth: 0,
        reversed: true,
        gridLineColor: gridColor,
        lineColor: gridColor,

      },
      colorAxis: {
        min: 0,
        max: 100,
        stops: [
          [0, '#ffe066'],  // selective-yellow pastel
          [0.00003, '#ffd666'],  // orange-web pastel
          [0.00006, '#ffcd66'],  // orange-peel pastel
          [0.00009, '#ffc466'],  // princeton-orange pastel
          [0.00012, '#ffba66'],  // ut-orange pastel
          [0.00015, '#ffb066'],  // safety-orange pastel
          [0.00018, '#ffa766'],  // pumpkin pastel
          [0.00021, '#ff9e66'],  // orange-pantone-2 pastel
          [0.00024, '#ff9466'],  // orange-pantone pastel
          [0.00027, '#ff8a66'],  // tangelo pastel
          [0.0003, '#ff8a66']   // tangelo pastel cap
        ]
        ,
      },
      legend: {
        enabled: false
      },
      tooltip: {
        useHTML: true,
        backgroundColor: tooltipBgColor,
        style: {
          color: tooltipTextColor,
        },
        formatter: function (this: any) {
          return `
          <b>${this.point.name}</b><br/>
          Usage: <b>${this.point.value}%</b>
        `;
        }
      },
      plotOptions: {
        series: {
          borderWidth: 0,
          borderColor: '#ffffff',
          dataLabels: {
            enabled: true,
            color: '#ffffff',
            style: {
              fontSize: '9px',
              textOutline: 'none'
            },
            formatter: function (this: any) {
              const name = this.point.name || '';
              const value = this.point.value || 0;

              const wrappedName = name.length > 10
                ? name.match(/.{1,10}/g)?.join('<br/>')
                : name;

              return `${wrappedName}<br/>${value}%`;
            }
          },
          point: {
            events: {
              click: function (this: any) {
                const element = document.getElementById('leastUsedTable');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  element.classList.add('glow-highlight');
                  setTimeout(() => {
                    element.classList.remove('glow-highlight');
                    element.classList.add('fade-out-shadow');
                    setTimeout(() => {
                      element.classList.remove('fade-out-shadow');
                    }, 1000);
                  }, 1000);
                }
              }
            }
          }
        }
      },
      series: [{
        name: 'Software Usage',
        type: 'heatmap',
        borderWidth: 0,
        data: seriesData,
        dataLabels: {
          enabled: true
        }
      }],
      credits: {
        enabled: false
      },
      exporting: {
        enabled: false
      }
    };
  }

  getDailyNewDeviceDiscovery(zoneId: number, groupId: number): void {
    const st = this.startTime;
    const et = this.endTime;

    this.smReportsApiService.getNewDeviceAddedDetails(st, et, zoneId, groupId).pipe(takeUntil(this.destroy$)).subscribe(response => {
      const serviceResponse = response?.serviceResponse || {};
      this.fullServiceResponse = serviceResponse; // Save for later use in modal
      this.dnddCardData = response.metaData;

      // Convert to array for main table
      const processedData = Object.keys(serviceResponse).map(date => ({
        enrolledOn: date,
        count: serviceResponse[date]?.length || 0
      }));

      this.dnddTableData = processedData;
      this.filtereDnddTableData = [...processedData];
      this.totalEnrolledDevices = processedData.reduce((sum, item) => sum + item.count, 0);
    });
  }

  openDeviceDetailsModal(date: string): void {
    this.selectedDate = date;
    this.modalDeviceDetails = this.fullServiceResponse[date] || [];
    this.modalService.open(this.deviceDetailsModal, { size: 'md', centered: true }); // Assumes NgbModal
  }


  getHostsActiveDetails(): void {
    if (this.selectedZoneId !== null && this.selectedGroupId !== null) {
      this.smReportsApiService.getHostsActiveDetails(this.startTime, this.endTime, this.selectedZoneId, this.selectedGroupId, 10).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
        this.hostDetailsRaw = data.serviceResponse.hostActiveTimePerHost;
        const rawData = data.serviceResponse.totalActiveTimePerHost;
        const hostUserIdMap = data.serviceResponse.hostUserIdMap;
        const seriesData = Object.entries(rawData).map(([key, value]) => {
          return {
            name: hostUserIdMap[key],
            y: value,
            hostId: key,
            username: this.hostUsernames[key]
          }
        });
        this.hostsActiveDetailsChart(seriesData);
      });
    }
  }

  hostsActiveDetailsChart(seriesData: any[]): void {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
    const timePipe = this.timePipe; // capture the pipe in closure
    const sortedData = [...seriesData].sort((a, b) => b.y - a.y);
    const colors = [
      '#4E79A7',  // Soft blue
      '#F28E2B',  // Vibrant orange
      '#E15759',  // Coral red
      '#76B7B2',  // Teal
      '#59A14F',  // Green
      '#EDC948',  // Gold
      '#B07AA1',  // Purple
      '#FF9DA7',  // Pink
      '#9C755F',  // Brown
      '#BAB0AC'   // Gray
    ];

    this.hostActiveDetailsChartOptions = {
      colors: colors,
      chart: {
        type: 'bar',
        backgroundColor: 'transparent'
      },
      title: {
        text: undefined,
        style: {
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '14'
        }
      },
      xAxis: {
        categories: seriesData.map(item => item.name),
        title: {
          text: 'Software',
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '10'
          }
        },
        labels: {
          enabled: false,
          style: {
            color: labelColor,
            fontSize: '10',
            letterSpacing: '0.5px'
          }
        },
        gridLineColor: gridColor,
        lineColor: gridColor,
      },
      yAxis: {
        min: 0,
        tickAmount: 6,
        title: {
          text: "",
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '10'
          }
        },
        labels: {

          style: {
            color: labelColor,
            fontSize: '10'
          },
          x: -5
        },
        gridLineColor: gridColor,
        lineColor: gridColor,
      },
      tooltip: {
        useHTML: true,
        backgroundColor: tooltipBgColor,
        style: {
          color: tooltipTextColor,
          fontSize: '10px',
          pointerEvents: 'none'
        },
        formatter: function (this: any) {
          const formattedTime = timePipe.transform(this.y, 'mins');
          const finalKey = this.username ? this.username : this.key;
          return `<b>${finalKey}</b><br/><b>${formattedTime}</b>`;
        }
      },
      legend: {
        enabled: false
      },
      plotOptions: {
        column: {
          colorByPoint: true,
          borderWidth: 0
        },
        series: {
          dataLabels: {
            enabled: true,
            useHTML: false,
            format: '{point.name}',
            x: 10,
            y: -2,
            style: {
              fontSize: '8px',
              letterSpacing: '1px',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: labelColor,
              textOutline: 'none',
              fontWeight: '500'
            }
          },
          point: {
            events: {
              click: (event: Highcharts.PointClickEventObject) => {
                const point = event.point as any;
                const hostName = point.username ?? point.key;
                const hostId = point.hostId;
                const hostData = this.hostDetailsRaw[hostId] || [];
                this.openModal2(hostName, hostData);
              }
            }
          }

        }
      },
      series: [{
        type: 'column',
        name: 'Unused Days',
        data: sortedData
      }],
      credits: {
        enabled: false
      },
      exporting: {
        enabled: false
      }
    };
  }

  isModalVisible = false;

  selectedHostName: string = '';
  selectedHostData: any[] = [];

  openModal2(hostName: any, hostData: any[]) {
    this.selectedHostName = hostName;
    this.selectedHostData = hostData;
    this.isModalVisible = true;
  }

  closeModal2() {
    this.isModalVisible = false;
  }

  formatDate2(timeBucket: number): string {
    const str = timeBucket.toString();
    if (str.length !== 8) return 'Invalid date';

    // const year = +str.substring(0, 4);
    // const month = +str.substring(4, 6) - 1;
    // const day = +str.substring(6, 8);

    // const date = new Date(year, month, day);
    // return date.toISOString().slice(0, 10);
    return str.substring(0, 4) + '-' + str.substring(4, 6) + '-' + str.substring(6, 8);
  }

  sortOn: string = '';
  sortDirn: 'asc' | 'desc' = 'asc';


  sortData(field: string) {
    if (this.sortOn === field) {
      this.sortDirn = this.sortDirn === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortOn = field;
      this.sortDirn = 'asc';
    }

    const multiplier = this.sortDirn === 'desc' ? -1 : 1;

    const extractValue = (val: any) => {
      if (typeof val === 'string') {
        const num = parseFloat(val.replace(/[^\d.]/g, ''));
        return isNaN(num) ? val : num;
      }
      return val;
    };

    this.selectedHostData.sort((a, b) => {
      const aValue = extractValue(a[field]);
      const bValue = extractValue(b[field]);

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1 * multiplier;
      if (bValue == null) return -1 * multiplier;

      if (aValue < bValue) return -1 * multiplier;
      if (aValue > bValue) return 1 * multiplier;
      return 0;
    });
  }




  getDormantDevicesByDepartment(selectedDepartment: string): void {
    // Simulated dormant device stats per department
    const dormantDeviceData: { [key: string]: { department: string; dormantCount: number }[] } = {
      IT: [
        { department: 'IT', dormantCount: 160, },
        { department: 'APM', dormantCount: 110, },
        { department: 'RND', dormantCount: 180, },
        { department: 'FT', dormantCount: 90, },
        { department: 'PT', dormantCount: 75, },
        { department: 'Dev', dormantCount: 75, },
        { department: 'HR', dormantCount: 75, },
        { department: 'DevOps', dormantCount: 75, }
      ],
      APM: [
        { department: 'IT', dormantCount: 160, },
        { department: 'APM', dormantCount: 110, },
        { department: 'RND', dormantCount: 180, },
        { department: 'FT', dormantCount: 90, },
        { department: 'PT', dormantCount: 75, },
        { department: 'Dev', dormantCount: 75, },
        { department: 'HR', dormantCount: 75, },
        { department: 'DevOps', dormantCount: 75, }
      ]
    };
    const selectedData = dormantDeviceData[selectedDepartment] || [];
    const seriesData = selectedData.map(item => ({
      name: item.department,
      y: item.dormantCount,
    }));


    this.dormantDevicesChart(seriesData);
  }

  dormantDevicesChart(seriesData: any[]): void {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
    this.dormantDevicesChartOptions = {
      colors: ['#a78a7f', '#b8b8ff', '#8fa998', '#ef8354', '#ffd8be'],
      chart: {
        type: 'column',
        backgroundColor: 'transparent'
      },
      title: {
        text: undefined,
        style: {
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '14'
        }
      },
      xAxis: {
        categories: seriesData.map(item => item.name),
        title: {
          text: undefined,
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '10',

          }
        },
        labels: {
          enabled: true,
          style: {
            color: labelColor,
            fontSize: '8',
            letterSpacing: '0.5px'
          }
        },
        gridLineColor: gridColor,
        lineColor: gridColor,


      },
      yAxis: {
        min: 0,
        tickAmount: 6,
        title: {
          text: undefined,
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '10'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '10'
          },
          x: -5
        },
        gridLineColor: gridColor,
        lineColor: gridColor,
      },
      tooltip: {
        useHTML: true,
        backgroundColor: tooltipBgColor,
        style: {
          color: tooltipTextColor,
        },
        formatter: function (this: any) {
          const appCount = this.point.appCount || 0;
          return `
          <b>${this.key}</b><br/>
          Dormant Device Count <b>${this.y}</b><br/>
          
        `;
        }
      },
      legend: {
        enabled: false
      },
      plotOptions: {
        column: {
          colorByPoint: true,
          borderWidth: 0
        },
        series: {
          point: {
            events: {
              click: function (this: any) {
                const element = document.getElementById('dormantDeviceTable');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  // Add glow effect
                  element.classList.add('glow-highlight');
                  // Remove after a few seconds
                  setTimeout(() => {
                    element.classList.remove('glow-highlight');
                    element.classList.add('fade-out-shadow');
                    // Optionally remove the fade-out class after animation ends
                    setTimeout(() => {
                      element.classList.remove('fade-out-shadow');
                    }, 1000); // match this duration with your CSS transition
                  }, 1000); // show glow for 2 seconds
                }
              }
            }
          }
        }
      },
      series: [{
        type: 'column',
        name: 'Dormant Days',
        data: seriesData
      }],
      credits: {
        enabled: false
      },
      exporting: {
        enabled: false
      }
    };
  }

  generateReports2(count: number): any[] {
    const systemIp = ['192.168.0.', '10.0.0.', '172.16.0.'];
    const systemType = ['router', 'computer', 'unknown', 'unclassified', 'network'];
    const systemNames = ['asgard', 'auto-119', 'auto-132', 'auto-107', 'centos5', 'centos6'];
    const systemDomain = ['open-audit.local', '', 'closed-audit.local'];
    const systemIdentification = ['Router', 'Device Running SSH', 'Vendor, Apple, Inc.', 'No information'];

    return Array.from({ length: count }, (_, i) => ({
      systemId: `${Math.floor(Math.random() * 100)}`,
      systemType: systemType[i % systemType.length],
      systemNames: systemNames[i % systemNames.length],
      systemDomain: systemDomain[i % systemDomain.length],
      systemIp: `${systemIp[i % systemIp.length]}${100 + i}`,
      systemIdentification: systemIdentification[i % systemIdentification.length],
    }));
  }

  onSort2(column: string): void {
    if (this.sortColumn2 === column) {
      this.sortDirection2 = this.sortDirection2 === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn2 = column;
      this.sortDirection2 = 'asc';
    }

    this.filteredReports2.sort((a, b) => {
      const valueA = a[column];
      const valueB = b[column];

      if (valueA == null || valueB == null) return 0;

      let comparison: number;

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        comparison = valueA - valueB;
      } else {
        comparison = valueA.toString().localeCompare(valueB.toString(), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return this.sortDirection2 === 'asc' ? comparison : -comparison;
    });

    this.currentPage2 = 1;
    this.calculatePagination2();
  }

  downloadReport2(): void {
    const fileName = 'system_details.xlsx';

    // Map data to desired Excel format
    const worksheetData = this.applicationReports2.map((report, index) => ({
      '#': index + 1,
      'System Name': report.hostname,
      'IP Address': report.publicIp,
      'System UUID': report.uuid,
      'System Type': report.platform,
      'System Vendor': report.hardwareVendor,
      'System Model': report.hardwareModel,
      'Complaince Score': report.score
    }));

    // Generate worksheet and workbook
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(worksheetData);
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 15 },
      { wch: 35 },
      { wch: 12 },
      { wch: 15 },
      { wch: 30 },
      { wch: 18 },
    ];
    const borderStyle = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };

    const headerStyle = {
      font: { bold: true },
      border: borderStyle,
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    const cellStyle = {
      border: borderStyle,
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    const headerKeys = Object.keys(worksheetData[0]);
    const numCols = headerKeys.length;
    const numRows = worksheetData.length + 1; // +1 for header row

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellRef];
        if (!cell) continue;
        cell.s = r === 0 ? headerStyle : cellStyle;
      }
    }
    const workbook: XLSX.WorkBook = {
      Sheets: { 'Report': worksheet },
      SheetNames: ['Report']
    };

    // Write workbook to binary array
    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    // Save the file using FileSaver
    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    FileSaver.saveAs(data, fileName);
  }

  toggleSearch2(): void {
    this.showSearch2 = !this.showSearch2;
    if (!this.showSearch2) {
      this.searchQuery2 = '';
      this.filteredReports2 = [...this.applicationReports2];
    }
  }

  // onSearch2(): void {
  //   if (this.searchQuery2) {
  //     const query = this.searchQuery2.toLowerCase();
  //     this.filteredReports2 = this.applicationReports2.filter(app =>
  //       app.name.toLowerCase().includes(query)
  //     );
  //   } else {
  //     this.filteredReports2 = [...this.applicationReports2];
  //   }
  //   this.calculatePagination2();
  // }

  onSearch2(): void {
    const query = this.searchQuery2?.toLowerCase() || '';

    if (query) {
      this.filteredReports2 = this.applicationReports2.filter(app =>
        Object.values(app).some(value =>
          (value ?? '').toString().toLowerCase().includes(query)
        )
      );
    } else {
      this.filteredReports2 = [...this.applicationReports2];
    }

    this.currentPage2 = 1;
    this.calculatePagination2();
  }



  calculatePagination2(): void {
    this.totalPages2 = Math.ceil(this.filteredReports2.length / this.itemsPerPage2);
    this.pagedReports2 = this.filteredReports2.slice(
      (this.currentPage2 - 1) * this.itemsPerPage2,
      this.currentPage2 * this.itemsPerPage2
    );
  }

  previousPage2(): void {
    if (this.currentPage2 > 1) {
      this.currentPage2--;
      this.calculatePagination2();
    }
  }

  nextPage2(): void {
    if (this.currentPage2 < this.totalPages2) {
      this.currentPage2++;
      this.calculatePagination2();
    }
  }

  goToPage2(page: any): void {
    this.currentPage2 = page;
    this.calculatePagination2();
  }

  get totalPagesArray2(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.totalPages2 <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPages2 }, (_, i) => i + 1);
    } else {
      if (this.currentPage2 <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPages2];
      } else if (this.currentPage2 >= this.totalPages2 - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPages2 - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPage2 - 1, this.currentPage2, this.currentPage2 + 1, '...', this.totalPages2];
      }
    }
    return pages;
  }

  get startIndex2(): number {
    return (this.currentPage2 - 1) * this.itemsPerPage2;
  }

  get endIndex2(): number {
    return Math.min(this.currentPage2 * this.itemsPerPage2, this.applicationReports2.length);
  }

  getAllHosts(zoneId: number, groupId: number): void {
    this.smReportsApiService.getAllHostDetails2(zoneId, groupId).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const responseData = data?.serviceResponse;

      if (Array.isArray(responseData)) {
        this.applicationReports2 = responseData;
      } else {
        this.applicationReports2 = [];
      }

      this.filteredReports2 = [...this.applicationReports2];
      this.calculatePagination2();
    });
  }

  toggleAllSeries() {
    if (this.chartRef) {
      const shouldShow = !this.allSeriesVisible;
      this.chartRef.series.forEach((series: any) => {
        shouldShow ? series.show() : series.hide();
      });
      this.allSeriesVisible = shouldShow;
    }
  }

  // onNddDayChange(): void {
  //   if (this.nddDay) {
  //     const dayCount = parseInt(this.nddDay, 10);

  //     // Convert the fixed original start time to timestamp
  //     const fixedEndTimestamp = this.convertTimebucket(this.initialStartTime.toString());

  //     // Subtract selected days from fixed end timestamp
  //     const newStartDate = new Date(fixedEndTimestamp - (dayCount * 24 * 60 * 60 * 1000));

  //     // Format start and end dates
  //     const formattedNewStart = this.formatDateFromDate(newStartDate);
  //     const formattedFixedEnd = this.formatDateFromDate(new Date(fixedEndTimestamp));

  //     this.startTime = parseInt(formattedNewStart);
  //     this.endTime = parseInt(formattedFixedEnd);
  //   }

  //   this.getDailyNewDeviceDiscovery();
  // }

  // SUOT

  searchQuerySUOT = '';
  showSearchSUOT = false;
  filteredMostUsedProcessesTable: any;

  downloadSoftwareUsageOverTime(): void {
    const fileName = 'software_usage_trend_over_time.xlsx';
    const worksheetData: any[][] = [
      ['#', 'Software Name', 'Total Usage', 'Host', 'Host Usage', 'Last Seen']
    ];
    const merges: XLSX.Range[] = [];
    let rowIndex = 1;

    this.filteredMostUsedProcessesTable.forEach((report: { name: any; usedFor: any; }, index: number) => {
      const processNumber = index + 1;
      const processName = report.name;
      const totalFormatted = this.formatTime(Number(report.usedFor));
      const hostUsageMap = this.processPerHostUsage?.[processName];
      const hostEntries = hostUsageMap ? Object.entries(hostUsageMap) : [['N/A', 0]];
      const startRow = rowIndex;

      hostEntries.forEach(([host, usageObj]) => {
        const usageValue = Number((usageObj as any).usage || 0);
        const rawDate = (usageObj as any).date?.toString() || ''; // e.g., "20250616"
        let formattedDate = 'N/A';

        if (rawDate.length === 8) {
          const year = Number(rawDate.substring(0, 4));
          const month = Number(rawDate.substring(4, 6)) - 1; // JS months are 0-based
          const day = Number(rawDate.substring(6, 8));
          const dateObj = new Date(year, month, day);
          formattedDate = dateObj.toLocaleDateString(); // You can use other formats too
        }

        worksheetData.push([
          processNumber,
          processName,
          totalFormatted,
          host,
          this.formatTime(usageValue),
          formattedDate
        ]);
        rowIndex++;
      });

      if (hostEntries.length > 1) {
        merges.push(
          { s: { r: startRow, c: 0 }, e: { r: rowIndex - 1, c: 0 } },
          { s: { r: startRow, c: 1 }, e: { r: rowIndex - 1, c: 1 } },
          { s: { r: startRow, c: 2 }, e: { r: rowIndex - 1, c: 2 } }
        );
      }
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!merges'] = merges;

    // Adjust column widths
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 }
    ];

    // Define header style
    const headerStyle: XLSX.CellStyle = {
      font: { bold: true },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    };

    const cellStyle: XLSX.CellStyle = {
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    };

    // Apply styles to each cell
    worksheetData.forEach((row, rowIdx) => {
      row.forEach((_, colIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
        const cell = worksheet[cellRef];
        if (!cell) return;
        cell.s = rowIdx === 0 ? headerStyle : cellStyle;
      });
    });

    const workbook: XLSX.WorkBook = {
      Sheets: { 'Report': worksheet },
      SheetNames: ['Report']
    };

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    FileSaver.saveAs(data, fileName);
  }

  formatTime(minutes: number): string {
    if (minutes === 0) {
      return '< 1 min';
    }
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const parts = [];
    if (hrs > 0) parts.push(`${hrs} hr`);
    if (mins > 0 || hrs === 0) parts.push(`${mins} min`);
    return parts.join(' ');
  }

  toggleSearchSUOT(): void {
    this.showSearchSUOT = !this.showSearchSUOT;
    if (!this.showSearchSUOT) {
      this.searchQuerySUOT = '';
      this.filteredMostUsedProcessesTable = [...this.mostUsedProcessesTable];
    }
  }

  onSearchSUOT(): void {
    if (this.searchQuerySUOT) {
      const query = this.searchQuerySUOT.toLowerCase();
      this.filteredMostUsedProcessesTable = this.mostUsedProcessesTable.filter((app: { name: string; }) =>
        app.name.toLowerCase().includes(query)
      );
    } else {
      this.filteredMostUsedProcessesTable = [...this.mostUsedProcessesTable];
    }
  }

  // DNDD

  searchQueryDNDD = '';
  showSearchDNDD = false;
  filtereDnddTableData: any;

  downloadDailyNewDeviceDiscovery(): void {
    const fileName = 'daily_new_device_discovery.xlsx';

    const worksheetData = this.filtereDnddTableData.map((report: { enrolledOn: any; count: any; }, index: number) => ({
      '#': index + 1,
      'Discovered Date': report.enrolledOn,
      'Device Count': report.count || '0'
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(worksheetData);
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 20 },
      { wch: 15 }
    ];
    const borderStyle = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };

    const headerStyle = {
      font: { bold: true },
      border: borderStyle,
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    const cellStyle = {
      border: borderStyle,
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    const headerKeys = Object.keys(worksheetData[0]);
    const numCols = headerKeys.length;
    const numRows = worksheetData.length + 1; // +1 for header row

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellRef];
        if (!cell) continue;
        cell.s = r === 0 ? headerStyle : cellStyle;
      }
    }
    const workbook: XLSX.WorkBook = {
      Sheets: { 'Report': worksheet },
      SheetNames: ['Report']
    };

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    FileSaver.saveAs(data, fileName);
  }

  toggleSearchDNDD(): void {
    this.showSearchDNDD = !this.showSearchDNDD;
    if (!this.showSearchDNDD) {
      this.searchQueryDNDD = '';
      this.filtereDnddTableData = [...this.dnddTableData];
    }
  }

  onSearchDNDD(): void {
    if (this.searchQueryDNDD) {
      const query = this.searchQueryDNDD.toLowerCase();
      this.filtereDnddTableData = this.dnddTableData.filter((app: { enrolledOn: string; }) =>
        app.enrolledOn.toLowerCase().includes(query)
      );
    } else {
      this.filtereDnddTableData = [...this.dnddTableData];
    }
  }

  // Dormant Devices

  searchQueryDD = '';
  showSearchDD = false;
  filteredDormantDevices: any;

  downloadDormantDevices(): void {
    const fileName = 'dormant_devices.xlsx';
    if (this.dormantHostData.length == 0) {
      return;
    }
    const worksheetData = this.dormantHostData.map((report: { hostName: string; count: number; hostId: number }, index: number) => ({
      '#': index + 1,
      'Host Name': report.hostName,
      'Count': report.count
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(worksheetData);
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 20 },
      { wch: 15 }
    ];
    const borderStyle = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };

    const headerStyle = {
      font: { bold: true },
      border: borderStyle,
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    const cellStyle = {
      border: borderStyle,
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    const headerKeys = Object.keys(worksheetData[0]);
    const numCols = headerKeys.length;
    const numRows = worksheetData.length + 1; // +1 for header row

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellRef];
        if (!cell) continue;
        cell.s = r === 0 ? headerStyle : cellStyle;
      }
    }
    const workbook: XLSX.WorkBook = {
      Sheets: { 'Report': worksheet },
      SheetNames: ['Report']
    };

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    FileSaver.saveAs(data, fileName);
  }

  toggleSearchDD(): void {
    this.showSearchDD = !this.showSearchDD;
    if (!this.showSearchDD) {
      this.searchQueryDD = '';
      this.filteredDormantDevices = [...this.dormantHostData];
    }
  }

  onSearchDD(): void {
    if (this.searchQueryDD) {
      const query = this.searchQueryDD.toLowerCase();
      this.filteredDormantDevices = this.dormantHostData.filter((app: { hostName: string; }) =>
        app.hostName.toLowerCase().includes(query)
      );
    } else {
      this.filteredDormantDevices = [...this.dormantHostData];
    }
  }

  // DEvice By Operating System

  searchQueryDOS = '';
  showSearchDOS = false;
  filteredOsUsageTableData: any;

  downloadDeviceByOperatingSystem(): void {
    const fileName = 'device_by_operating_system.xlsx';

    const worksheetData = this.filteredOsUsageTableData.map((report: { name: any; count: any; }, index: number) => ({
      '#': index + 1,
      'OS System': report.name,
      'Distribution (%)': report.count
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(worksheetData);
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 20 },
      { wch: 15 }
    ];
    const borderStyle = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };

    const headerStyle = {
      font: { bold: true },
      border: borderStyle,
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    const cellStyle = {
      border: borderStyle,
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    const headerKeys = Object.keys(worksheetData[0]);
    const numCols = headerKeys.length;
    const numRows = worksheetData.length + 1; // +1 for header row

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellRef];
        if (!cell) continue;
        cell.s = r === 0 ? headerStyle : cellStyle;
      }
    }
    const workbook: XLSX.WorkBook = {
      Sheets: { 'Report': worksheet },
      SheetNames: ['Report']
    };

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    FileSaver.saveAs(data, fileName);
  }

  toggleSearchDOS(): void {
    this.showSearchDOS = !this.showSearchDOS;
    if (!this.showSearchDOS) {
      this.searchQueryDOS = '';
      this.filteredOsUsageTableData = [...this.osUsageTableData];
    }
  }

  onSearchDOS(): void {
    const query = this.searchQueryDOS?.toLowerCase() || '';

    if (query) {
      this.filteredOsUsageTableData = this.osUsageTableData.filter((app: any) =>
        Object.values(app).some(value =>
          (value ?? '').toString().toLowerCase().includes(query)
        )
      );
    } else {
      this.filteredOsUsageTableData = [...this.osUsageTableData];
    }
  }

  capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }



  modalProcessName!: string;
  modalHostUsages: { host: string; username: string; usage: number; date: Date | null }[] = [];

  openModal(template: TemplateRef<any>, processName: string) {
    this.modalProcessName = processName;
    this.selectedProcessName = this.capitalizeFirstLetter(processName);

    const usageMap = this.processPerHostUsage?.[processName] as Record<string, { usage: number; date: number }>;

    if (usageMap) {
      this.modalHostUsages = Object.entries(usageMap).map(([hostId, usageObj]) => {
        const hostname = this.hostUserIdMap[hostId];
        const username = this.hostUsernames[hostId];
        const rawDate = usageObj?.date?.toString?.();

        let dateObj: Date | null = null;
        if (rawDate && rawDate.length >= 8) {
          const year = Number(rawDate.substring(0, 4));
          const month = Number(rawDate.substring(4, 6)) - 1;
          const day = Number(rawDate.substring(6, 8));
          dateObj = new Date(year, month, day);
        }

        return {
          host: hostname,
          username: username,
          usage: usageObj?.usage ?? 0,
          date: dateObj
        };
      });
    }

    this.modalService.open(template, {
      backdrop: 'static',
      centered: true,
      keyboard: true,
    });
  }

  changeTab(tab: string) {
    this.selectedTab = tab;
    this.refreshCharts();
  }

  // Application Report

  getSoftwareDetailsById2(): void {
    this.smReportsApiService.getSoftwareDetailsById(this.selectedAppId).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const responseData = data?.serviceResponse;

      if (Array.isArray(responseData)) {
        this.filteredReports_1 = responseData;
      } else {
        this.filteredReports_1 = [];
      }
      this.calculatePagination_1();
    });
  }

  getSoftwareDetailsDefault(id: number) {
    this.smReportsApiService.getSoftwareDetailsById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.defaultData = data?.serviceResponse || [];
        // initialize filtered reports and calculate pagination
        this.filteredReports_1 = [...this.defaultData];
        this.currentPage_1 = 1;        // reset to first page
        this.calculatePagination_1();  // update pagedReports_1
      });
  }

  onSort_1(column: string): void {
    if (this.sortColumn_1 === column) {
      this.sortDirection_1 = this.sortDirection_1 === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn_1 = column;
      this.sortDirection_1 = 'asc';
    }

    this.filteredReports_1.sort((a, b) => {
      const valueA = a[column];
      const valueB = b[column];

      if (valueA == null || valueB == null) return 0;

      let comparison: number;

      const dateRegex = /^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/;
      const isDate = dateRegex.test(valueA) && dateRegex.test(valueB);

      if (isDate) {
        const parseDate = (value: string) => {
          const [datePart, timePart] = value.split(', ');
          const [day, month, year] = datePart.split('/').map(Number);
          const [hour, minute, second] = timePart.split(':').map(Number);
          return new Date(year, month - 1, day, hour, minute, second);
        };
        const dateA = parseDate(valueA);
        const dateB = parseDate(valueB);
        comparison = dateA.getTime() - dateB.getTime();
      } else if (typeof valueA === 'number' && typeof valueB === 'number') {
        comparison = valueA - valueB;
      } else {
        comparison = valueA.toString().localeCompare(valueB.toString(), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return this.sortDirection_1 === 'asc' ? comparison : -comparison;
    });

    this.currentPage_1 = 1;
    this.calculatePagination_1();
  }

  calculatePagination_1(): void {
    this.totalPages_1 = Math.ceil(this.filteredReports_1.length / this.itemsPerPage_1) || 1;

    // 🔹 Clamp currentPage_1 so it never exceeds totalPages_1
    if (this.currentPage_1 > this.totalPages_1) {
      this.currentPage_1 = this.totalPages_1;
    }
    if (this.currentPage_1 < 1) {
      this.currentPage_1 = 1;
    }

    this.pagedReports_1 = this.filteredReports_1.slice(
      (this.currentPage_1 - 1) * this.itemsPerPage_1,
      this.currentPage_1 * this.itemsPerPage_1
    );
  }

  previousPage_1(): void {
    if (this.currentPage_1 > 1) {
      this.pageInput_1 = --this.currentPage_1;
      //  this.pageInput_1--
      this.calculatePagination_1();
    }
  }

  nextPage_1(): void {
    if (this.currentPage_1 < this.totalPages_1) {
      this.pageInput_1 = ++this.currentPage_1;
      // this.pageInput_1++
      this.calculatePagination_1();
    }
  }


  goToPage_1(page: any): void {
    let pageNumber = Number(page);

    if (!pageNumber || pageNumber < 1) pageNumber = 1;
    else if (pageNumber > this.totalPages_1) pageNumber = this.totalPages_1;

    this.currentPage_1 = pageNumber;
    this.pageInput_1 = pageNumber;
    this.calculatePagination_1();
  }

  get totalPagesArray_1(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.totalPages_1 <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPages_1 }, (_, i) => i + 1);
    } else {
      if (this.currentPage_1 <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPages_1];
      } else if (this.currentPage_1 >= this.totalPages_1 - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPages_1 - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPage_1 - 1, this.currentPage_1, this.currentPage_1 + 1, '...', this.totalPages_1];
      }
    }
    return pages;
  }

  get startIndex_1(): number {
    return (this.currentPage_1 - 1) * this.itemsPerPage_1;
  }

  get endIndex_1(): number {
    return Math.min(this.currentPage_1 * this.itemsPerPage_1, this.applicationReports_1.length);
  }

  getSafeValue(value: any): string {
    return value?.trim() ? value : '-';
  }




  parseTimeBucket(bucket: string): Date {
    const year = +bucket.slice(0, 4);
    const month = +bucket.slice(4, 6) - 1; // 0-based index
    const day = +bucket.slice(6, 8);
    const hour = +bucket.slice(8, 10);
    const minute = +bucket.slice(10, 12);
    return new Date(year, month, day, hour, minute);
  }

  isTimeInput: boolean = false;
  startTime1: string = '00:00';
  endTime1: string = '23:59';

  onTimeChange(): void {
    if (this.startTime && this.endTime && this.startDate && this.endDate) {
      this.getNetworkIO();
    }
  }

  isTimeInput2: boolean = false;
  startTime2: string = '00:00';;
  endTime2: string = '23:59';;

  onTimeChange2(): void {
    if (this.startTime2 && this.endTime2 && this.startDate && this.endDate) {
      this.getNetworkIoPerServer();
    }
  }

  private formatTimeToHHMM(time: string): string {
    return time.replace(':', '').padStart(4, '0'); // Ensures 4-digit string like "0613"
  }

  getNetworkIO(): void {
    const st = Number(`${this.startDate}${this.formatTimeToHHMM(this.startTime1)}`);
    const et = Number(`${this.endDate}${this.formatTimeToHHMM(this.endTime1)}`);
    if (this.selectedZoneId !== null && this.selectedGroupId !== null) {
      this.smReportsApiService.getNetworkDetailsAll(st, et, this.selectedZoneId, this.selectedGroupId).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
        this.chartNetworkIO(data.serviceResponse);
      });
    }
  }

  public convertNetworkValue(valueInBytesPerSecond: number, targetUnit: 'KBps' | 'MBps'): number {
    if (targetUnit === 'MBps') {
      return valueInBytesPerSecond / (1024 * 1024); // Convert bytes to MBps
    }
    return valueInBytesPerSecond / 1024; // Convert bytes to KBps
  }

  // Helper method to format values with appropriate decimals
  public formatNetworkValue(value: number, unit: 'KBps' | 'MBps'): string {
    if (unit === 'MBps') {
      return value.toFixed(2);
    }
    return value.toFixed(2); // Show 2 decimals for KBps as well since values might be small
  }

  isTimeInputNetwork: boolean = false;
  startTimeNetwork: string = '00:00';
  endTimeNetwork: string = '23:59';
  onTimeChangeNetwork(): void {
    if (this.startTimeNetwork && this.endTimeNetwork && this.startDate && this.endDate) {
      this.getNetworkIO();
    }
  }



  public threshold_value_network: number = 0;
  public inputValueNetwork: string = '';
  public showAboveThresholdNetwork: boolean = true;
  currentUnitNetwork: string = 'KBps';
  public thresholdUnitNetwork: 'KBps' | 'MBps' = 'KBps';
  updateThresholdNetwork(): void {
    const parsedValue = parseFloat(this.inputValueNetwork);

    if (!isNaN(parsedValue)) {
      let newThresholdInKBps: number;
      if (this.thresholdUnitNetwork === 'MBps') {
        newThresholdInKBps = parsedValue * 1024;
      } else {
        newThresholdInKBps = parsedValue;
      }
      this.threshold_value_network = newThresholdInKBps;
      console.log('Threshold value updated to:', this.threshold_value_network, 'KBps');

      // Re-draw chart with filtered data
      this.getNetworkIO();
    } else {
      console.warn('Invalid input for threshold value:', this.inputValueNetwork);
    }
  }

  setFilterDirectionNetwork(isAbove: boolean): void {
    if (this.showAboveThresholdNetwork !== isAbove) {
      this.showAboveThresholdNetwork = isAbove;
      // Re-draw chart with new filter direction
      this.getNetworkIO();
    }
  }

  chartNetworkIO(data: { timeBucket: string;[key: string]: any }[]): void {
    try {
      if (data.length === 0) {
        this.networkIOChart = null;
        return;
      }

      // Store component reference for use in tooltip formatter
      const componentRef = this;

      // First, filter out entries with null throughput values
      let filteredData = data.filter(item => item['throughput'] !== null && item['throughput'] !== undefined);

      if (filteredData.length === 0) {
        this.networkIOChart = null;
        return;
      }

      // Apply threshold filtering on data that already has valid throughput values
      if (this.threshold_value_network > 0) {
        filteredData = filteredData.filter(item => {
          const throughputInBytesPerSecond = item['throughput'];
          // Convert threshold from input unit to bytes per second for comparison
          let thresholdInBytesPerSecond: number;
          if (this.thresholdUnitNetwork === 'MBps') {
            thresholdInBytesPerSecond = this.threshold_value_network * 1024 * 1024;
          } else {
            thresholdInBytesPerSecond = this.threshold_value_network * 1024;
          }

          if (this.showAboveThresholdNetwork) {
            return throughputInBytesPerSecond >= thresholdInBytesPerSecond;
          } else {
            return throughputInBytesPerSecond < thresholdInBytesPerSecond;
          }
        });
      }

      // Filter by time range if time inputs are provided
      if (this.isTimeInputNetwork && this.startTimeNetwork && this.endTimeNetwork) {
        filteredData = filteredData.filter(item => {
          const itemTime = this.parseTimeBucket(item.timeBucket);
          const itemTimeString = itemTime.toTimeString().substring(0, 5); // HH:MM format
          return itemTimeString >= this.startTimeNetwork && itemTimeString <= this.endTimeNetwork;
        });
      }

      if (filteredData.length === 0) {
        this.networkIOChart = null;
        return;
      }

      filteredData.sort((a, b) => {
        const dateA = this.parseTimeBucket(a.timeBucket).getTime();
        const dateB = this.parseTimeBucket(b.timeBucket).getTime();
        return dateA - dateB;
      });

      const parsedDates = filteredData.map(item => this.parseTimeBucket(item.timeBucket));

      let format: 'date' | 'time' = 'date';
      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--border-color').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      // Convert throughput data to selected unit for display
      const throughputData = filteredData.map(d => {
        const throughputInBytesPerSecond = d['throughput']; // No need for fallback since null values are already filtered
        return this.convertNetworkValue(throughputInBytesPerSecond, this.thresholdUnitNetwork);
      });

      const series: Highcharts.SeriesLineOptions[] = [{
        name: `Throughput (${this.thresholdUnitNetwork})`,
        data: throughputData,
        type: 'line',
        marker: { radius: 2 },
        lineWidth: 1
      }];

      this.networkIOChart = {
        chart: {
          type: 'line',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: `Throughput (${this.thresholdUnitNetwork})` },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          useHTML: true,
          backgroundColor: tooltipBgColor,
          style: {
            color: tooltipTextColor,
            fontSize: '10px',
            pointerEvents: 'auto'
          },
          formatter: function (this: any) {
            const point = this.points?.[0];
            if (!point || point.index === undefined) return '';

            const dataIndex = point.index;
            const rawData = filteredData[dataIndex];
            const excludedKeys = ['timeBucket', 'throughput'];

            // Convert throughput to selected unit for tooltip
            const throughputInBytesPerSecond = rawData['throughput']; // No fallback needed since null values are filtered
            const convertedThroughput = componentRef.convertNetworkValue(throughputInBytesPerSecond, componentRef.thresholdUnitNetwork);
            const formattedThroughput = componentRef.formatNetworkValue(convertedThroughput, componentRef.thresholdUnitNetwork);

            // Convert other network-related values to selected unit
            const otherDataRows = Object.keys(rawData)
              .filter(k => !excludedKeys.includes(k))
              .map(k => {
                const value = rawData[k];
                if (typeof value === 'number' && value > 0) {
                  // Assume other numeric values are also network throughput values in bytes per second
                  const convertedValue = componentRef.convertNetworkValue(value, componentRef.thresholdUnitNetwork);
                  const formattedValue = componentRef.formatNetworkValue(convertedValue, componentRef.thresholdUnitNetwork);
                  return `<div>${k}: ${formattedValue} ${componentRef.thresholdUnitNetwork}</div>`;
                }
                return `<div>${k}: ${value}</div>`;
              })
              .join('');

            return `
              <div style="max-height: 120px; overflow-y: auto;">
                <div style="font-weight: bold; margin-bottom: 4px;">${categories[dataIndex]}</div>
                <div style="margin-bottom: 4px;">
                  <span style="font-weight: bold;">Throughput</span>: <span>${formattedThroughput} ${componentRef.thresholdUnitNetwork}</span>
                </div>
                ${otherDataRows}
              </div>
            `;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      };
    } catch (e) {
      console.log("Error Occurred ", e);
    }
  }

  tooltipLocked = false;

  // getNetworkIoPerServer(): void {
  //   const st = Number(`${this.startDate}${this.formatTimeToHHMM(this.startTime2)}`);
  //   const et = Number(`${this.endDate}${this.formatTimeToHHMM(this.endTime2)}`);

  //   this.smReportsApiService.getNetworkDetails(st, et, this.selectedZoneId, this.selectedGroupId).pipe(takeUntil(this.destroy$))
  //     .subscribe((response: any) => {
  //       const serviceResponse = response?.serviceResponse || {};
  //       const timeMap: { [time: string]: any } = {};

  //       for (const [server, entries] of Object.entries(serviceResponse)) {
  //         for (const entry of entries as any[]) {
  //           const time = entry.timeBucket;
  //           if (!timeMap[time]) timeMap[time] = { time_bucket: time };

  //           timeMap[time][server] = {
  //             throughput: entry.throughput,
  //             bytesSentPerSec: entry.bytesSentPerSec,
  //             bytesRecvPerSec: entry.bytesRecvPerSec
  //           };
  //         }
  //       }

  //       const transformedData = Object.values(timeMap).sort(
  //         (a: any, b: any) => Number(a.time_bucket) - Number(b.time_bucket)
  //       );

  //       this.chartNetworkIoPerServer(transformedData);
  //     });
  // }

  // chartNetworkIoPerServer(data: { time_bucket: string;[key: string]: any }[]): void {
  //   try {
  //     const keys = Object.keys(data[0]).filter(k => k !== 'time_bucket');
  //     if (keys.length === 0) {
  //       this.networkIoPerServerChart = null;
  //       return;
  //     }

  //     const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));
  //     let format: 'date' | 'time' = 'date';

  //     if (parsedDates.length > 1) {
  //       const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
  //       format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
  //     }

  //     const categories = parsedDates.map(date =>
  //       format === 'date'
  //         ? date.toLocaleDateString()
  //         : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  //     );

  //     const styles = getComputedStyle(document.body);
  //     const labelColor = styles.getPropertyValue('--text-color').trim();
  //     const gridColor = styles.getPropertyValue('--border-color').trim();
  //     const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
  //     const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

  //     const self = this;

  //     const series: Highcharts.SeriesLineOptions[] = keys.map(key => ({
  //       name: key,
  //       data: data.map(d => d[key]?.throughput ?? null),
  //       type: 'line',
  //       marker: { radius: 2 },
  //       lineWidth: 1,
  //       events: {
  //         click() {
  //           self.tooltipLocked = true; 
  //         }
  //       }
  //     }));

  //     this.networkIoPerServerChart = {
  //       chart: {
  //         type: 'line',
  //         backgroundColor: 'transparent',
  //         spacing: [5, 5, 5, 5],
  //         style: { fontSize: '10px' },
  //         events: {
  //           load() {
  //             const chart = this;

  //             const originalRefresh = chart.tooltip.refresh;
  //             chart.tooltip.refresh = function (pointOrPoints, mouseEvent) {
  //               if (!self.tooltipLocked) {
  //                 originalRefresh.call(this, pointOrPoints, mouseEvent);
  //               }
  //             };

  //             chart.container.addEventListener('click', (evt) => {
  //               const target = evt.target as HTMLElement;
  //               if (!target.closest('.highcharts-point') && self.tooltipLocked) {
  //                 self.tooltipLocked = false;
  //                 chart.tooltip.hide(0);
  //               }
  //             });
  //           }
  //         }
  //       },
  //       title: { text: undefined },
  //       xAxis: {
  //         categories,
  //         title: { text: "" },
  //         labels: { style: { color: labelColor, fontSize: '9px' } },
  //         gridLineColor: gridColor
  //       },
  //       yAxis: {
  //         min: 0,
  //         tickAmount: 6,
  //         title: { text: "" },
  //         labels: { style: { color: labelColor, fontSize: '9px' } },
  //         gridLineColor: gridColor
  //       },
  //       tooltip: {
  //         shared: true,
  //         useHTML: true,
  //         backgroundColor: tooltipBgColor,
  //         style: {
  //           color: tooltipTextColor,
  //           fontSize: '10px',
  //           pointerEvents: 'auto',
  //         },
  //         formatter: function () {
  //           const chart = (this as any).chart;

  //           if (!this.points || this.points.length === 0) return '';

  //           const dataIndex = this.points[0].index;
  //           const timeFormatted = categories[dataIndex];
  //           const rawEntry = data[dataIndex];

  //           const rows = this.points.map(point => {
  //             const server = point.series.name;
  //             const serverData = rawEntry[server] || {};
  //             const throughput = serverData.throughput ?? 'N/A';
  //             const bytesSent = serverData.bytesSentPerSec ?? 'N/A';
  //             const bytesRecv = serverData.bytesRecvPerSec ?? 'N/A';

  //             return `
  //             <div style="margin-bottom: 6px;">
  //               <span style="color:${point.color}; font-weight: bold;">●</span>
  //               <strong>${server}</strong><br/>
  //               Throughput: ${throughput}<br/>
  //               Bytes Sent: ${bytesSent}<br/>
  //               Bytes Received: ${bytesRecv}<br/>
  //             </div>
  //           `;
  //           }).join('');

  //           setTimeout(() => {
  //             const tooltipEl = chart.container.parentElement?.querySelector('.highcharts-tooltip') as HTMLElement;
  //             if (tooltipEl) {
  //               tooltipEl.style.pointerEvents = 'auto';
  //               tooltipEl.style.overflowY = 'auto';
  //               tooltipEl.style.maxHeight = '150px';

  //               if (!tooltipEl.getAttribute('data-mouseleave-bound')) {
  //                 tooltipEl.addEventListener('mouseleave', () => {
  //                   if (self.tooltipLocked) {
  //                     self.tooltipLocked = false;
  //                     chart.tooltip.hide(0);
  //                   }
  //                 });
  //                 tooltipEl.setAttribute('data-mouseleave-bound', 'true');
  //               }
  //             }
  //           }, 0);

  //           return `
  //           <div style="max-height: 150px; overflow-y: auto;">
  //             <div style="font-weight: bold; margin-bottom: 8px;">${timeFormatted}</div>
  //             ${rows}
  //           </div>
  //         `;
  //         }
  //       },
  //       legend: { enabled: false },
  //       series: series as Highcharts.SeriesOptionsType[],
  //       credits: { enabled: false },
  //       exporting: { enabled: false }
  //     };

  //   } catch (e) {
  //     console.error("Error Occurred", e);
  //   }
  // }

  private rawNetworkIoPerServerData: any[] = [];

  getNetworkIoPerServer(): void {
    const st = Number(`${this.startDate}${this.formatTimeToHHMM(this.startTime2)}`);
    const et = Number(`${this.endDate}${this.formatTimeToHHMM(this.endTime2)}`);
    if (this.selectedZoneId !== null && this.selectedGroupId !== null) {
      this.smReportsApiService.getNetworkDetails(st, et, this.selectedZoneId, this.selectedGroupId)
        .pipe(takeUntil(this.destroy$))
        .subscribe((response: any) => {
          const serviceResponse = response?.serviceResponse || {};
          const timeMap: { [time: string]: any } = {};

          for (const [server, entries] of Object.entries(serviceResponse)) {
            for (const entry of entries as any[]) {
              const time = entry.timeBucket;
              if (!timeMap[time]) timeMap[time] = { time_bucket: time };

              timeMap[time][server] = {
                throughput: entry.throughput,
                bytesSentPerSec: entry.bytesSentPerSec,
                bytesRecvPerSec: entry.bytesRecvPerSec
              };
            }
          }

          const transformedData = Object.values(timeMap).sort(
            (a: any, b: any) => Number(a.time_bucket) - Number(b.time_bucket)
          );

          // store original unfiltered data
          this.rawNetworkIoPerServerData = transformedData;

          // draw chart with unfiltered data initially
          this.chartNetworkIoPerServer(transformedData);
        });
    }
  }

  chartNetworkIoPerServer(data: { time_bucket: string;[key: string]: any }[]): void {
    try {
      // Apply threshold filtering before chart creation
      if (this.threshold_value > 0) {
        data = data.map(entry => {
          const filteredEntry: any = { time_bucket: entry.time_bucket };
          for (const [key, value] of Object.entries(entry)) {
            if (key !== 'time_bucket' && value && typeof value === 'object') {
              const throughputKBps = value.throughput ?? 0;
              const passes = (this.showAboveThreshold && throughputKBps >= this.threshold_value) ||
                (!this.showAboveThreshold && throughputKBps <= this.threshold_value);
              // Keep the server key but null the point if it doesn't pass
              filteredEntry[key] = passes ? value : { throughput: null, bytesSentPerSec: null, bytesRecvPerSec: null };
            }
          }
          return filteredEntry;
        });
      }


      const keys = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item).filter(k => k !== 'time_bucket' && k !== 'total'))
        )
      );
      if (keys.length === 0) {
        this.networkIoPerServerChart = null;
        return;
      }

      const parsedDates = data.map(item => this.parseTimeBucket(item.time_bucket));
      let format: 'date' | 'time' = 'date';

      if (parsedDates.length > 1) {
        const timeDiff = Math.abs(parsedDates[1].getTime() - parsedDates[0].getTime());
        format = timeDiff >= 24 * 60 * 60 * 1000 ? 'date' : 'time';
      }

      const categories = parsedDates.map(date =>
        format === 'date'
          ? date.toLocaleDateString()
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--border-color').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const self = this;

      const series: Highcharts.SeriesLineOptions[] = keys.map(key => ({
        name: key,
        data: data.map(d => {
          const throughputBytes = d[key]?.throughput ?? null;
          if (throughputBytes === null) return null;

          if (this.thresholdUnit === 'MBps') {
            return throughputBytes / (1024 * 1024);  // Bytes → MBps
          } else {
            return throughputBytes / 1024;           // Bytes → KBps
          }
        }),
        type: 'line',
        marker: { radius: 2 },
        lineWidth: 1,
        events: {
          click() {
            self.tooltipLocked = true;
          }
        }
      }));

      this.networkIoPerServerChart = {
        chart: {
          type: 'line',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' },
          events: {
            load() {
              const chart = this;

              const originalRefresh = chart.tooltip.refresh;
              chart.tooltip.refresh = function (pointOrPoints, mouseEvent) {
                if (!self.tooltipLocked) {
                  originalRefresh.call(this, pointOrPoints, mouseEvent);
                }
              };

              chart.container.addEventListener('click', (evt) => {
                const target = evt.target as HTMLElement;
                if (!target.closest('.highcharts-point') && self.tooltipLocked) {
                  self.tooltipLocked = false;
                  chart.tooltip.hide(0);
                }
              });
            }
          }
        },
        title: { text: undefined },
        xAxis: {
          categories,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: this.thresholdUnit },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          useHTML: true,
          backgroundColor: tooltipBgColor,
          style: {
            color: tooltipTextColor,
            fontSize: '10px',
            pointerEvents: 'auto',
          },
          formatter: function () {
            const chart = (this as any).chart;

            if (!this.points || this.points.length === 0) return '';

            const dataIndex = this.points[0].index;
            const timeFormatted = categories[dataIndex];
            const rawEntry = data[dataIndex];

            const rows = this.points.map(point => {
              const server = point.series.name;
              const serverData = rawEntry[server] || {};
              let throughput = serverData.throughput ?? 'N/A';
              let bytesSent = serverData.bytesSentPerSec ?? 'N/A';
              let bytesRecv = serverData.bytesRecvPerSec ?? 'N/A';

              if (bytesSent !== 'N/A' && bytesRecv !== 'N/A') {
                if (self.thresholdUnit === 'MBps') {
                  throughput = (throughput / (1024 * 1024)).toFixed(2) + ' MBps';
                  bytesSent = (bytesSent / (1024 * 1024)).toFixed(2) + ' MBps';
                  bytesRecv = (bytesRecv / (1024 * 1024)).toFixed(2) + ' MBps';
                } else {
                  throughput = (throughput / 1024).toFixed(2) + ' KBps';
                  bytesSent = (bytesSent / 1024).toFixed(2) + ' KBps';
                  bytesRecv = (bytesRecv / 1024).toFixed(2) + ' KBps';
                }
              }

              return `
              <div style="margin-bottom: 6px;">
                <span style="color:${point.color}; font-weight: bold;">●</span>
                <strong>${server}</strong><br/>
                Throughput: ${throughput}<br/>
                Bytes Sent: ${bytesSent}<br/>
                Bytes Received: ${bytesRecv}<br/>
              </div>
            `;
            }).join('');

            setTimeout(() => {
              const tooltipEl = chart.container.parentElement?.querySelector('.highcharts-tooltip') as HTMLElement;
              if (tooltipEl) {
                tooltipEl.style.pointerEvents = 'auto';
                tooltipEl.style.overflowY = 'auto';
                tooltipEl.style.maxHeight = '150px';

                if (!tooltipEl.getAttribute('data-mouseleave-bound')) {
                  tooltipEl.addEventListener('mouseleave', () => {
                    if (self.tooltipLocked) {
                      self.tooltipLocked = false;
                      chart.tooltip.hide(0);
                    }
                  });
                  tooltipEl.setAttribute('data-mouseleave-bound', 'true');
                }
              }
            }, 0);

            return `
            <div style="max-height: 150px; overflow-y: auto;">
              <div style="font-weight: bold; margin-bottom: 8px;">${timeFormatted}</div>
              ${rows}
            </div>
          `;
          }
        },
        legend: { enabled: false },
        series: series as Highcharts.SeriesOptionsType[],
        credits: { enabled: false },
        exporting: { enabled: false }
      };

    } catch (e) {
      console.error("Error Occurred", e);
    }
  }

  public threshold_value: number = 0;
  public inputValue: string = '';
  public showAboveThreshold: boolean = true;
  currentUnit: string = 'KBps';
  public thresholdUnit: 'KBps' | 'MBps' = 'KBps';

  updateThreshold(): void {
    const parsedValue = parseFloat(this.inputValue);

    if (!isNaN(parsedValue)) {
      let newThresholdInKBps: number;
      if (this.thresholdUnit === 'MBps') {
        newThresholdInKBps = parsedValue * 1024 * 1024;
      } else {
        newThresholdInKBps = parsedValue * 1024;
      }
      this.threshold_value = newThresholdInKBps;
      console.log('Threshold value updated to:', this.threshold_value, 'KBps');

      // re-draw chart using stored original data
      this.chartNetworkIoPerServer(this.rawNetworkIoPerServerData);
    } else {
      console.warn('Invalid input for threshold value:', this.inputValue);
    }
  }

  setFilterDirection(isAbove: boolean): void {
    if (this.showAboveThreshold !== isAbove) {
      this.showAboveThreshold = isAbove;
      this.chartNetworkIoPerServer(this.rawNetworkIoPerServerData);
    }
  }

}
