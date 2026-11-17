import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx-js-style';
import * as FileSaver from 'file-saver';
import { SmReportsApiService } from '../../../services/sm-reports-api.service';

@Component({
    selector: 'app-sm-reports',
    imports: [
        CommonModule,
        FormsModule,
    ],
    templateUrl: './sm-reports.component.html',
    styleUrl: './sm-reports.component.css'
})
export class SmReportsComponent implements OnInit {

  applicationReports: any[] = [];
  filteredReports: any[] = [];
  pagedReports: any[] = [];

  searchQuery = '';
  showSearch = false;

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  currentPage = 1;
  itemsPerPage = 25;
  totalPages = 0;

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
  itemsPerPage2 = 10;
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

  constructor(
    private smReportsApiService: SmReportsApiService,
  ) { }

  ngOnInit(): void {
    this.getAllSoftwares();
    this.getAllHosts()
  }

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

    this.currentPage = 1;
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
    this.totalPages = Math.ceil(this.filteredReports.length / this.itemsPerPage);
    this.pagedReports = this.filteredReports.slice(
      (this.currentPage - 1) * this.itemsPerPage,
      this.currentPage * this.itemsPerPage
    );
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.calculatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.calculatePagination();
    }
  }

  goToPage(page: any): void {
    this.currentPage = page;
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


  selectedAppName: string = '';
  selectedAppId!: number;

  showAppDetail(ip: string, id: number) {
    this.selectedAppName = ip;
    this.selectedAppId = id;
    this.getSoftwareDetailsById();
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

  // ip reports total

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

  selectedIpAddress: string = '';
  selectedId!: number;

  showIpDetail(id: number, ip: string) {
    this.selectedId = id;
    this.selectedIpAddress = ip;

    const triggerEl = document.querySelector('[href="#host_detailed_reports"]');
    if (triggerEl) {
      (triggerEl as HTMLElement).click();
    }
    this.getHostDetailsById();
    this.getSoftwaresForHost();
    this.getUsersDetailsByHostId();
    this.getHostUserEmails();
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
