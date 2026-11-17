
import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StandardFormComponent } from './standard-form/standard-form.component';
// import { NgxPaginationModule } from 'ngx-pagination';
import * as XLSX from 'xlsx-js-style';
import * as FileSaver from 'file-saver';
import { SmReportsApiService } from '../../../../services/sm-reports-api.service';
import { PaginatePipe } from '../../../../pipes/paginate.pipe';
import { StandardReportService } from '../../../../services/standard-report.service';
import { GenerateReport } from '../../../../models/GenerateReport';
import { User } from '../../../../models/user';
import { DecoderService } from '../../../../services/decoder.service';
import { filter, Subject, Subscription, switchMap } from 'rxjs';
import { DateService } from '../../../../services/date.service';


interface CriteriaRow {
  condition: string;
  column: string;
  type: string;
  value: string;
}


@Component({
    selector: 'app-standard-reports',
    imports: [StandardFormComponent,
        CommonModule,
        FormsModule,
        RouterModule,
        PaginatePipe
    ],
    templateUrl: './standard-reports.component.html',
    styleUrl: './standard-reports.component.css'
})


export class StandardReportsComponent {
  userDetails: User | null = null;
  userId: any;

  reportItems: any[] = []

  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  inputPage: number = 1;

  currentpageforReports: number = 1;
  totalPagesforReports: any = 1;

  addReport: boolean = false
  pageSizeOptions = [5, 10, 20];
  totalItems = 0;
  ReportData: any[] = [];
  pagedData: any[] = [];


  // SM REPORT

  applicationReports: any[] = [];
  filteredReports: any[] = [];
  pagedReports: any[] = [];

  searchQuery = '';
  showSearch = false;

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  currentPageReport = 1;
  itemsPerPageReport = 25;
  totalPagesReport = 0;

  applicationReports_1: any[] = [];
  filteredReports_1: any[] = [];
  pagedReports_1: any[] = [];

  sortColumn_1: string = '';
  sortDirection_1: 'asc' | 'desc' = 'asc';

  currentPage_1 = 1;
  itemsPerPage_1 = 25;
  totalPages_1 = 0;

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

  applicationReports3: any[] = [];
  filteredReports3: any[] = [];
  pagedReports3: any[] = [];

  searchQuery3 = '';
  showSearch3 = false;

  sortColumn3: string = '';
  sortDirection3: 'asc' | 'desc' = 'asc';

  currentPage3 = 1;
  itemsPerPage3 = 25;
  totalPages3 = 0;

  applicationReports4: any[] = [];
  filteredReports4: any[] = [];
  pagedReports4: any[] = [];

  searchQuery4 = '';
  showSearch4 = false;

  sortColumn4: string = '';
  sortDirection4: 'asc' | 'desc' = 'asc';

  currentPage4 = 1;
  itemsPerPage4 = 25;
  totalPages4 = 0;
  userEmail: any;
  userEmailSource: any;


  // Zone and Group

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();


  datemodel: any;
  startTime!: string;
  endTime!: string;

  zones: any[] = [];
  zoneId!: number;
  zonePage: number = -1;
  zoneSize: number = -1;

  teams: { [reportId: number]: any[] } = {};
  teamId!: number;
  groupPage: number = -1;
  groupSize: number = -1;

  generateReportMap: { [reportId: number]: GenerateReport } = {};

  toast = {
    visible: false,
    message: '',
    type: ''
  };

  reportHistoryData: any[] = [];

  zoneIdNameMap: { [id: number]: string } = {};
  teamIdNameMap: { [id: number]: string } = {};


  constructor(
    private dateService: DateService,
    private decoderService: DecoderService,
    private smReportsApiService: SmReportsApiService,
    private standardReportService: StandardReportService,
  ) { }

  ngOnInit() {
    this.userDetails = sessionStorage.getItem('currentUser')
      ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!))
      : null;
    this.userId = this.userDetails?.id;

    this.dateService.setActiveComponent('StandardReportsComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'StandardReportsComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate2(this.datemodel.startdateTime);
        this.endTime = this.formatDate2(this.datemodel.enddateTime);
        this.getGenerateReportHistory();
      });



    this.getAllSoftwares();
    this.getAllHosts();
    this.getZones();
    this.getAllReports();
  }

  ngOnDestroy(): void {
    this.datesubscription.unsubscribe();
  }

  formatDate2(date: string): string {
    if (!date || date.length < 12) return '';

    const yyyy = date.substring(0, 4);
    const MM = date.substring(4, 6);
    const dd = date.substring(6, 8);
    const HH = date.substring(8, 10);
    const mm = date.substring(10, 12);

    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:00`;
  }

  formatDate3(date: string): string {
    const d = new Date(date);

    const yyyy = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const dd = String(d.getDate()).padStart(2, '0');
    const HH = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');

    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
  }




  // Get All Zones

  getZones(): void {
    this.standardReportService.getZones(this.zonePage, this.zoneSize).subscribe((data: any) => {
      const responseData = data?.serviceResponse;
      this.zones = Array.isArray(responseData) ? responseData : [];

      this.zoneIdNameMap = {};
      this.zones.forEach(zone => {
        this.zoneIdNameMap[zone.id] = zone.name;
      });
    });
  }

  // Get All Team


  onZoneChange(zoneId: number, reportId: number): void {
    this.standardReportService.getAllGroupsByZone(zoneId, this.zonePage, this.zoneSize).subscribe((data: any) => {
      const responseData = data?.serviceResponse;
      this.teams[reportId] = Array.isArray(responseData) ? responseData : [];
      this.generateReportMap[reportId].teamId = 0; // reset selected group
    });
  }

  // GET ALL REPORT NAME

  getAllReports(): void {
    this.standardReportService.getAllReports().subscribe((data: any) => {
      const responseData = data?.serviceResponse;
      this.reportItems = Array.isArray(responseData) ? responseData : [];

      this.reportItems.forEach(item => {
        if (!this.generateReportMap[item.id]) {
          this.generateReportMap[item.id] = new GenerateReport();
          this.generateReportMap[item.id].reportId = item.id;
          this.generateReportMap[item.id].reportName = item.reportName;
          this.generateReportMap[item.id].zoneId = 0;
          this.generateReportMap[item.id].teamId = 0;
          this.generateReportMap[item.id].created_by = this.userId;
        }
      });
    });
  }

  generateReport(row: GenerateReport): void {
    row.created_by = Number(this.userId); // Ensure it's an integer
    row.zoneId = Number(row.zoneId);
    row.teamId = Number(row.teamId);

    const payload = {
      ...row,
      st: this.formatDate(row.st),
      et: this.formatDate(row.et)
    };

    this.standardReportService.generateReport(payload).subscribe(blob => {
      const fileName = `${payload.reportName.replace(/\s+/g, '_')}_${payload.st}.xlsx`;
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      this.showToast('Downloading report.', 'success');
      this.getGenerateReportHistory();
    }, error => {
      this.showToast('Error downloading report.', 'error');
      console.error('Error downloading report:', error);
    });
  }

  showToast(message: string, type: 'success' | 'error') {
    this.toast.message = message;
    this.toast.type = type;
    this.toast.visible = true;
    setTimeout(() => this.toast.visible = false, 3000);
  }


  formatDate(date: Date | string): string {
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;

    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');

    return `${year}${month}${day}`;
  }

  // GET REPORT HISTORY

  getGenerateReportHistory(): void {
    this.reportHistoryData = []
    this.standardReportService.getGenerateReportHistory(this.startTime, this.endTime).subscribe((data: any) => {
      const responseData = data?.serviceResponse;
      if (Array.isArray(responseData)) {
        this.reportHistoryData = responseData;
        this.loadAllTeamsFromHistory();
        this.paginationHistoryReport();
      } else {
        this.reportHistoryData = [];
        this.paginationHistoryReport();
      }
    });
  }

  loadAllTeamsFromHistory(): void {
    const uniqueZoneIds = new Set<number>();

    this.reportHistoryData.forEach(report => {
      if (report.zoneId) {
        uniqueZoneIds.add(Number(report.zoneId));
      }
    });

    uniqueZoneIds.forEach(zoneId => {
      this.standardReportService.getAllGroupsByZone(zoneId, this.zonePage, this.zoneSize)
        .subscribe((data: any) => {
          const responseData = data?.serviceResponse;
          if (Array.isArray(responseData)) {
            responseData.forEach((team: { id: number | string, name: string }) => {
              this.teamIdNameMap[Number(team.id)] = team.name;
            });
          }
        });
    });
  }


  paginationHistoryReport(): void {
    this.totalItems = this.reportHistoryData.length;
    this.totalPages = Math.ceil(this.reportHistoryData.length / this.pageSize);
    this.inputPage = this.currentPage;
    this.updatePagedData();
    this.pagedData = this.reportHistoryData
    this.pagedData = this.reportHistoryData
    this.totalPagesforReports = this.reportHistoryData.length
  }

  updatePagedData(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.pagedData = this.reportHistoryData.slice(startIndex, endIndex);
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagedData();
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.updatePagedData();
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }
  schedule(): void {
    this.addReport = true
  }

  handleCloseForm() {
    this.addReport = false;
  }

  onPageChange(page: number): void {
    this.currentpageforReports = page;
  }


  goToPage() {
    console.log(this.inputPage)
    let page = Number(this.inputPage);
    if (isNaN(page) || page < 1) page = 1;
    else if (page > this.totalPages) page = this.totalPages;

    this.currentPage = page;
    this.inputPage = page;
    console.log(this.currentPage)
  }


  //SM REPORTS

  // application report

  getAllSoftwares(): void {
    this.smReportsApiService.getAllSoftwares().subscribe((data: any) => {
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

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.currentPageReport = 1;
    this.calculatePagination();
  }

  downloadReport(): void {
    const fileName = 'application_report.xlsx';

    const worksheetData = this.applicationReports.map((report, index) => ({
      '#': index + 1,
      'Software Name': report.name,
      'Version': report.version,
      'Source': report.source,
      'Host Count': report.hostCount,
      'License': report.license,
      'Parameter': report.parameter,
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(worksheetData);
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 25 },
      { wch: 20 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
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

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.searchQuery = '';
      this.filteredReports = [...this.applicationReports];
    }
  }

  onSearch(): void {
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      this.filteredReports = this.applicationReports.filter(app =>
        app.name.toLowerCase().includes(query)
      );
    } else {
      this.filteredReports = [...this.applicationReports];
    }
    this.calculatePagination();
  }

  calculatePagination(): void {
    this.totalPagesReport = Math.ceil(this.filteredReports.length / this.itemsPerPageReport);
    this.pagedReports = this.filteredReports.slice(
      (this.currentPageReport - 1) * this.itemsPerPageReport,
      this.currentPageReport * this.itemsPerPageReport
    );
  }

  previousPage(): void {
    if (this.currentPageReport > 1) {
      this.currentPageReport--;
      this.calculatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPageReport < this.totalPagesReport) {
      this.currentPageReport++;
      this.calculatePagination();
    }
  }

  goToPageReport(page: any): void {
    this.currentPageReport = page;
    this.calculatePagination();
  }

  get totalPagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.totalPagesReport <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPagesReport }, (_, i) => i + 1);
    } else {
      if (this.currentPageReport <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPagesReport];
      } else if (this.currentPageReport >= this.totalPagesReport - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPagesReport - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPageReport - 1, this.currentPageReport, this.currentPageReport + 1, '...', this.totalPagesReport];
      }
    }
    return pages;
  }

  get startIndex(): number {
    return (this.currentPageReport - 1) * this.itemsPerPageReport;
  }

  get endIndex(): number {
    return Math.min(this.currentPageReport * this.itemsPerPageReport, this.applicationReports.length);
  }


  selectedAppName: string = '';
  selectedAppId!: number;

  showAppDetail(ip: string, id: number) {
    this.selectedAppName = ip;
    this.selectedAppId = id;
    this.getSoftwareDetailsById();
  }

  expandedAppName: number | null = null;

  toggleDetailApp(ip: string, id: number): void {
    if (this.expandedAppName === id) {
      // Collapse if already expanded
      this.expandedAppName = null;
      this.selectedAppName = '';
      this.selectedAppId = 0;
    } else {
      // Expand and fetch details
      this.expandedAppName = id;
      this.selectedAppName = ip;
      this.selectedAppId = id;

      // Load detailed data
      this.getSoftwareDetailsById();
    }
  }

  getSoftwareDetailsById(): void {
    this.smReportsApiService.getSoftwareDetailsById(this.selectedAppId).subscribe((data: any) => {
      const responseData = data?.serviceResponse;

      if (Array.isArray(responseData)) {
        this.filteredReports_1 = responseData;
      } else {
        this.filteredReports_1 = [];
      }
      this.calculatePagination_1();
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
    this.totalPages_1 = Math.ceil(this.filteredReports_1.length / this.itemsPerPage_1);
    this.pagedReports_1 = this.filteredReports_1.slice(
      (this.currentPage_1 - 1) * this.itemsPerPage_1,
      this.currentPage_1 * this.itemsPerPage_1
    );
  }

  previousPage_1(): void {
    if (this.currentPage_1 > 1) {
      this.currentPage_1--;
      this.calculatePagination_1();
    }
  }

  nextPage_1(): void {
    if (this.currentPage_1 < this.totalPages_1) {
      this.currentPage_1++;
      this.calculatePagination_1();
    }
  }

  goToPage_1(page: any): void {
    this.currentPage_1 = page;
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



  getAllHosts(): void {
    this.smReportsApiService.getAllHostDetails().subscribe((data: any) => {
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

      // Check for date format dd/MM/yyyy, HH:mm:ss
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/;
      const isDate = dateRegex.test(valueA) && dateRegex.test(valueB);

      if (isDate) {
        const parseDate = (value: string): Date => {
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

      return this.sortDirection2 === 'asc' ? comparison : -comparison;
    });

    this.currentPage2 = 1;
    this.calculatePagination2();
  }

  downloadReport2(): void {
    const fileName = 'host_total_report.xlsx';

    const worksheetData = this.applicationReports2.map((report, index) => ({
      '#': index + 1,
      'IP Address': report.publicIp,
      'Hostname': report.hostname,
      'Platform': report.platform,
      'OS Version': report.osVersion,
      'OS Query Version': report.osqueryVersion,
      'Avg Runtime (hr)': (report.uptime / (1000 * 1000 * 1000 * 60 * 60)).toFixed(2),
      'CPU Cores': report.cpuPhysicalCores,
      'Memory (GB)': (report.memory / (1024 * 1024 * 1024)).toFixed(2),
      'Vendor': report.hardwareVendor,
      'Last Enrolled At': report.lastEnrolledAt
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(worksheetData);
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 10 },
      { wch: 10 },
      { wch: 20 },
      { wch: 20 },
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

  toggleSearch2(): void {
    this.showSearch2 = !this.showSearch2;
    if (!this.showSearch2) {
      this.searchQuery2 = '';
      this.filteredReports2 = [...this.applicationReports2];
    }
  }

  onSearch2(): void {
    if (this.searchQuery2) {
      const query = this.searchQuery2.toLowerCase();
      this.filteredReports2 = this.applicationReports2.filter(app =>
        app.name.toLowerCase().includes(query)
      );
    } else {
      this.filteredReports2 = [...this.applicationReports2];
    }
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

  getHostDetailsById(): void {
    this.smReportsApiService.getHostDetailsById(this.selectedId).subscribe((data: any) => {
      const responseData = data?.serviceResponse;

      if (responseData && typeof responseData === 'object') {
        this.selectedReport = responseData;
      } else {
        this.selectedReport = [];
      }
    });
  }

  getHostUserEmails(): void {
    this.smReportsApiService.getHostUserEmails(this.selectedId).subscribe((data: any) => {
      const responseData = data?.serviceResponse;

      if (Array.isArray(responseData) && responseData.length > 0) {
        const emailEntry = responseData[0];
        this.userEmail = emailEntry.email;
        this.userEmailSource = emailEntry.source;
      } else {
        this.userEmail = '';
        this.userEmailSource = '';
      }
    });
  }

  selectedIpAddress: string = '';
  selectedId!: number;

  showIpDetail(id: number, ip: string) {
    this.selectedId = id;
    this.selectedIpAddress = ip;

    const triggerEl = document.querySelector('[href="#hostDetailedReport"]');
    if (triggerEl) {
      (triggerEl as HTMLElement).click();
    }
    this.getHostDetailsById();
    this.getSoftwaresForHost();
    this.getUsersDetailsByHostId();
    this.getHostUserEmails();
  }

  expandedReportId: number | null = null;

  toggleDetail(id: number, ip: string): void {
    if (this.expandedReportId === id) {
      // Collapse if already expanded
      this.expandedReportId = null;
      this.selectedId = 0;
      this.selectedIpAddress = '';
    } else {
      // Expand and fetch details
      this.expandedReportId = id;
      this.selectedId = id;
      this.selectedIpAddress = ip;

      // Load detailed data
      this.getHostDetailsById();
      this.getSoftwaresForHost();
      this.getUsersDetailsByHostId();
      this.getHostUserEmails();
    }
  }



  // ip details report

  selectedReport: any = [];

  toggleSearch3(): void {
    this.showSearch3 = !this.showSearch3;
    if (!this.showSearch3) {
      this.searchQuery3 = '';
      this.filteredReports3 = [...this.applicationReports3];
    }
  }

  onSearch3(): void {
    if (this.searchQuery3) {
      const query = this.searchQuery3.toLowerCase();
      this.filteredReports3 = this.applicationReports3.filter(app =>
        app.name.toLowerCase().includes(query)
      );
    } else {
      this.filteredReports3 = [...this.applicationReports3];
    }
    this.calculatePagination3();
  }

  getSoftwaresForHost(): void {
    this.smReportsApiService.getSoftwaresForHost(this.selectedId).subscribe((data: any) => {
      const responseData = data?.serviceResponse;
      if (Array.isArray(responseData)) {
        this.applicationReports3 = responseData;
        this.filteredReports3 = responseData;
      } else {
        this.filteredReports3 = [];
      }
      this.calculatePagination3();
    });
  }

  onSort3(column: string): void {
    if (this.sortColumn3 === column) {
      this.sortDirection3 = this.sortDirection3 === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn3 = column;
      this.sortDirection3 = 'asc';
    }

    this.filteredReports3.sort((a, b) => {
      const valueA = a[column];
      const valueB = b[column];

      if (valueA == null || valueB == null) return 0;

      let comparison: number;

      // Check for date format dd/MM/yyyy, HH:mm:ss
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/;
      const isDate = dateRegex.test(valueA) && dateRegex.test(valueB);

      if (isDate) {
        const parseDate = (value: string): Date => {
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

      return this.sortDirection3 === 'asc' ? comparison : -comparison;
    });

    this.currentPage3 = 1;
    this.calculatePagination3();
  }

  calculatePagination3(): void {
    this.totalPages3 = Math.ceil(this.filteredReports3.length / this.itemsPerPage3);
    this.pagedReports3 = this.filteredReports3.slice(
      (this.currentPage3 - 1) * this.itemsPerPage3,
      this.currentPage3 * this.itemsPerPage3
    );
  }

  previousPage3(): void {
    if (this.currentPage3 > 1) {
      this.currentPage3--;
      this.calculatePagination3();
    }
  }

  nextPage3(): void {
    if (this.currentPage3 < this.totalPages3) {
      this.currentPage3++;
      this.calculatePagination3();
    }
  }

  goToPage3(page: any): void {
    this.currentPage3 = page;
    this.calculatePagination3();
  }

  get totalPagesArray3(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.totalPages3 <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPages3 }, (_, i) => i + 1);
    } else {
      if (this.currentPage3 <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPages3];
      } else if (this.currentPage3 >= this.totalPages3 - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPages3 - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPage3 - 1, this.currentPage3, this.currentPage3 + 1, '...', this.totalPages3];
      }
    }
    return pages;
  }

  get startIndex3(): number {
    return (this.currentPage3 - 1) * this.itemsPerPage3;
  }

  get endIndex3(): number {
    return Math.min(this.currentPage3 * this.itemsPerPage3, this.applicationReports3.length);
  }

  downloadReport3(): void {
    const summary: any[][] = [
      ['Name', this.selectedReport?.hostname],
      ['Status', this.selectedReport?.status],
      ['IP', this.selectedReport?.publicIp],
      ['Environment', this.selectedReport?.env],
      ['Platform', this.selectedReport?.platform],
      ['CPU Type', this.selectedReport?.cpuType],
      ['CPU Brand', this.selectedReport?.cpuBrand],
      ['Model', this.selectedReport?.model],
      ['OS Version', this.selectedReport?.osVersion],
      ['Serial', this.selectedReport?.serial],
      ['Domain', this.selectedReport?.domain],
      ['Uptime', this.selectedReport?.uptime],
      ['Last Patch Update Name', this.selectedReport?.lastPatchUpdateName],
      ['Last Patch Update Date', this.selectedReport?.lastPatchUpdateDate],
      ['OS Install Date', this.selectedReport?.osInstallDate],
    ];
    const summarySheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(summary);

    const appList = this.applicationReports3.map(app => ({
      'Application Name': app.name,
      'Version': app.version
    }));

    const appSheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(appList);

    const userList = this.applicationReports4.map(app => ({
      'User Name': app.userName,
      'Group Name': app.groupName,
      'Shell': app.shell,
      'Last Login': app.login
    }));

    const userSheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(userList);

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(wb, appSheet, 'Applications');
    XLSX.utils.book_append_sheet(wb, userSheet, 'users');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `host_detailed_report_${this.selectedIpAddress}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  get formattedUptime(): string {
    const ns = this.selectedReport?.uptime || 0;
    const totalSeconds = Math.floor(ns / 1e9);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);

    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;

    let result = '';
    if (days > 0) {
      result += `${days} day${days > 1 ? 's' : ''} `;
    }
    result += `${hours} hr ${minutes} min`;
    return result;
  }

  getSafeValue(value: any): string {
    return value?.trim() ? value : '-';
  }

  getUsersDetailsByHostId(): void {
    this.smReportsApiService.getUsersDetailsByHostId(this.selectedId).subscribe((data: any) => {
      const responseData = data?.serviceResponse;

      if (Array.isArray(responseData)) {
        this.applicationReports4 = responseData;
        this.filteredReports4 = responseData;
      } else {
        this.filteredReports4 = [];
      }
      this.calculatePagination4();
    });
  }

  toggleSearch4(): void {
    this.showSearch4 = !this.showSearch4;
    if (!this.showSearch4) {
      this.searchQuery4 = '';
      this.filteredReports4 = [...this.applicationReports4];
    }
  }

  onSearch4(): void {
    if (this.searchQuery4) {
      const query = this.searchQuery4.toLowerCase();
      this.filteredReports4 = this.applicationReports4.filter(app =>
        app.userName.toLowerCase().includes(query)
      );
    } else {
      this.filteredReports4 = [...this.applicationReports4];
    }
    this.calculatePagination4();
  }


  onSort4(column: string): void {
    if (this.sortColumn4 === column) {
      this.sortDirection4 = this.sortDirection4 === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn4 = column;
      this.sortDirection4 = 'asc';
    }

    this.filteredReports4.sort((a, b) => {
      const valueA = a[column];
      const valueB = b[column];

      if (valueA == null || valueB == null) return 0;

      let comparison: number;

      // Check for date format dd/MM/yyyy, HH:mm:ss
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/;
      const isDate = dateRegex.test(valueA) && dateRegex.test(valueB);

      if (isDate) {
        const parseDate = (value: string): Date => {
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

      return this.sortDirection4 === 'asc' ? comparison : -comparison;
    });

    this.currentPage4 = 1;
    this.calculatePagination4();
  }

  calculatePagination4(): void {
    this.totalPages4 = Math.ceil(this.filteredReports4.length / this.itemsPerPage4);
    this.pagedReports4 = this.filteredReports4.slice(
      (this.currentPage4 - 1) * this.itemsPerPage4,
      this.currentPage4 * this.itemsPerPage4
    );
  }

  previousPage4(): void {
    if (this.currentPage4 > 1) {
      this.currentPage4--;
      this.calculatePagination4();
    }
  }

  nextPage4(): void {
    if (this.currentPage4 < this.totalPages4) {
      this.currentPage4++;
      this.calculatePagination4();
    }
  }

  goToPage4(page: any): void {
    this.currentPage4 = page;
    this.calculatePagination4();
  }

  get totalPagesArray4(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.totalPages4 <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPages4 }, (_, i) => i + 1);
    } else {
      if (this.currentPage4 <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPages4];
      } else if (this.currentPage4 >= this.totalPages4 - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPages4 - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.currentPage4 - 1, this.currentPage4, this.currentPage4 + 1, '...', this.totalPages4];
      }
    }
    return pages;
  }

  get startIndex4(): number {
    return (this.currentPage4 - 1) * this.itemsPerPage4;
  }

  get endIndex4(): number {
    return Math.min(this.currentPage4 * this.itemsPerPage4, this.applicationReports4.length);
  }



}
