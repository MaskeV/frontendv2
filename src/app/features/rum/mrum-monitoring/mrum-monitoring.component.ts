import { Component, OnDestroy, OnInit, ElementRef, ViewChild, Renderer2, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Session } from '../../../models/session';
import { AuthenticationService } from '../../../services/authentication.service';
import { filter, switchMap, debounceTime, distinctUntilChanged, Subscription, Subject, takeUntil, forkJoin, Observable, map, of, catchError } from 'rxjs';
import { DateService } from '../../../services/date.service';
import { LoggerService } from '../../../services/logger.service';
import { SharedService } from '../../../services/shared.service';
import { User } from '../../../models/user';
import { ApplicationService } from '../../../services/application.service';
import { MrumParams } from '../../../models/mrum/mrum-params';
import { MrumService } from '../../../services/mrum.service';
import { MrumTableData } from '../../../models/mrum/mrum-table-data';
import Highcharts from 'highcharts';
import { param } from 'jquery';

export let browserRefresh = false;

@Component({
  selector: 'app-mrum-monitoring',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    RouterModule
  ],
  templateUrl: './mrum-monitoring.component.html',
  styleUrl: './mrum-monitoring.component.css'
})
export class MrumMonitoringComponent implements OnInit, OnDestroy {
  @ViewChild('datePicker') datePickerRef!: ElementRef;
  @ViewChild('popupContainer') popupRef!: ElementRef;
  @ViewChild('columnModal') columnModalRef!: ElementRef;
  @ViewChild('popupContainerForThroughput') popupContainerThroughputRef!: ElementRef;
  @ViewChild('popupContainerForFailedTransactionRate') popupContainerFailedRef!: ElementRef;
  @ViewChild('popupContainerForLatency') popupContainerLatencyRef!: ElementRef;
  @ViewChild('popupContainerForApdex') popupContainerApdexRef!: ElementRef;


  private globalClickUnlistener: (() => void) | null = null;
  sessionObject: Session = new Session();

  startTime!: number;
  endTime!: number;
  selectedApp: string = '';
  applications: any[] = [];
  filteredApplications: any[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  user: User = new User();
  currentUser: User | null = null;
  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();
  datemodel: any;
  searchTextChanged: Subject<string> = new Subject<string>();
  searchText: string = '';
  private destroy$ = new Subject<void>();
  viewMode: 'list' | 'grid' = 'list';
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  pagedTableData: MrumTableData[] = [];
  filteredTableData: MrumTableData[] = [];
  mrumTableData: MrumTableData[] = [];

  showColumnModal = false;
  modalX = 0;
  modalY = 0;
  filterModalX = 0;
  filterModalY = 0;

  availableColumns = [
    { label: 'Application Name', key: 'serviceName' },
    { label: 'OS Type', key: 'osType' },
    { label: 'Technology Type', key: 'technologyType' },
    { label: 'Apdex', key: 'apdex' },
    { label: 'Actions', key: 'throughput' },
    { label: 'Crashes', key: 'failure_rate' },
  ];

  isLoading: boolean = false;
  selectedColumnFilters: string[] = [];
  valueFilterMap: { [key: string]: string[] } = {};
  currentFilterColumn: string | null = null;
  showValueFilterModal = false;
  columnValues: string[] = [];
  private _searchTerm = '';



  filteredServiceNames!: string[];
  ServiceNames: string[] = [];
  pagedServiceNames: string[] = [];

  encodedServiceId!: string;

  serviceThroughputChart: any;
  popupX!: number;
  popupY!: number;
  showPopup!: boolean;

  failureRateTimeValueChart: any;
  showFailurePopup: boolean = false;
  showFailureRateGraph: boolean = false;
  popupSrX: number = 0;
  popupSrY: number = 0;


  serviceAvgResponseTimeChart!: any;
  showLatencyGraph: boolean = false;
  showLatencyPopup: boolean = false;
  popupLatencyX: number = 0;
  popupLatencyY: number = 0;

  serviceApdexTimeValueChart!: any;
  showApdexGraph: boolean = false;
  showApdexPopup: boolean = false;
  popupApdexX: number = 0;
  popupApdexY: number = 0;
  featureType: string = 'MRUM'



  constructor(private authService: AuthenticationService,
    private router: Router,
    private dateService: DateService,
    private loggerService: LoggerService,
    private renderer: Renderer2,
    private sharedService: SharedService,
    private applicationService: ApplicationService,
    private mrumService: MrumService,
  ) { }


  ngOnInit(): void {
    sessionStorage.setItem('featureType', 'MRUM');
    this.featureType = 'MRUM';
    this.authService.currentUser.subscribe((x) => (this.currentUser = x));
    this.subscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        browserRefresh = !this.router.navigated;
      }
    });
    this.dateService.setActiveComponent('MrumMonitoringComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'MrumMonitoringComponent'),
      switchMap(() => this.dateService.date$)).subscribe((dates) => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        if (this.currentUser) {
          this.user = this.currentUser;
        }
        this.user.sessionDTO = this.sessionObject;

        this.sessionObject.featureName = 'MRUM Monitoring';
        this.sessionObject.requestURI = this.router.url.split('?')[0];
        this.sessionObject.userId = this.user.userId;
        this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
        this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
        this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
        this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;
        this.getServiceName();
      });

    this.searchTextChanged
      .pipe(
        debounceTime(300), // wait 300ms after the last event before emitting the last event
        distinctUntilChanged() // only emit if the value is different from the last value
      )
      .subscribe((search) => {
        this.searchText = search;
      });
  }



  getServiceName(): void {
    if (this.currentUser) {
      this.user = this.currentUser;
    }

    this.isLoading = true;

    this.applicationService.getFullApplicationData(this.user.userId, this.featureType, this.sessionObject)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        const applications = response?.serviceResponse?.applications || [];
        this.applications = applications;

        const appRequests: Observable<MrumTableData>[] = applications.map((app: any) => {
          const name = app.applicationName;
          const mrumParams: MrumParams = {
            appName: name,
            st: this.startTime?.toString(),
            et: this.endTime?.toString()
          };

          return this.mrumService.getOverview(mrumParams).pipe(
            map(overviewRes => {
              let kpis: any = {};
              if (overviewRes && overviewRes.serviceStatus === 'Success' && overviewRes.serviceResponse) {
                kpis = overviewRes.serviceResponse.kpis || overviewRes.serviceResponse || {};
              }
              
              return {
                serviceName: name,
                osType: name.toLowerCase().includes('ios') ? 'iOS' : 'Android',
                technologyType: app.applicationTechnology || (name.toLowerCase().includes('reactnative') ? 'ReactNative' : (name.toLowerCase().includes('ios') ? 'Swift' : 'Kotlin')),
                failure_rate: kpis.crashRate != null ? kpis.crashRate : null,
                latency: null,
                throughput: kpis.totalActions != null ? kpis.totalActions : null,
                apdex: kpis.apdex != null ? kpis.apdex : null
              };
            }),
            catchError(() => {
              return of({
                serviceName: name,
                osType: name.toLowerCase().includes('ios') ? 'iOS' : 'Android',
                technologyType: app.applicationTechnology || (name.toLowerCase().includes('reactnative') ? 'ReactNative' : (name.toLowerCase().includes('ios') ? 'Swift' : 'Kotlin')),
                failure_rate: null,
                latency: null,
                throughput: null,
                apdex: null
              });
            })
          );
        });


        if (appRequests.length === 0) {
          this.mrumTableData = [];
          this.filteredTableData = [];
          this.calculatePagination();
          this.isLoading = false;
          return;
        }

        forkJoin(appRequests)
          .pipe(takeUntil(this.destroy$))
          .subscribe((results: MrumTableData[]) => {
            this.mrumTableData = results;
            this.filteredTableData = [...results];
            this.calculatePagination();
            this.isLoading = false;
          });
      });

    this.applySearchFilter();
  }




  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
    if (this.globalClickUnlistener) {
      this.globalClickUnlistener();
    }
  }

  formatDate(date: string) {
    date = date.replace(/-/g, '');
    date = date.replace(/:/g, '');
    date = date.replace(' ', '');
    return parseInt(date);
  }

  sortTable(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredTableData.sort((a: any, b: any) => {
      const valA = a[column] ?? '';
      const valB = b[column] ?? '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return this.sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        const numA = typeof valA === 'number' ? valA : -Infinity;
        const numB = typeof valB === 'number' ? valB : -Infinity;
        return this.sortDirection === 'asc'
          ? numA - numB
          : numB - numA;
      }
    });

    this.calculatePagination();
  }


  applySearchFilter(): void {
    const searchTextLower = this.searchText.toLowerCase();

    if (this.searchText) {
      this.filteredTableData = this.mrumTableData.filter(row =>
        row.serviceName.toLowerCase().includes(searchTextLower)
      );
    } else {
      this.filteredTableData = [...this.mrumTableData];
    }

    this.calculatePagination();
  }

  onItemsPerPageChange(): void {
    if (this.itemsPerPage === null || this.itemsPerPage === undefined || this.itemsPerPage < 1) {
      this.itemsPerPage = 10; // Fallback to 10 if invalid
    }
    this.currentPage = 1; // Reset to page 1 on items per page change
    this.calculatePagination();
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredTableData.length / this.itemsPerPage);

    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = this.currentPage * this.itemsPerPage;

    this.pagedTableData = this.filteredTableData.slice(start, end);
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
    return this.filteredTableData.length === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredTableData.length);
  }

  toggleColumnModal(iconElement: HTMLElement): void {
    const rect = iconElement.getBoundingClientRect();
    this.modalX = rect.right + 10;  // 10px right of icon
    this.modalY = rect.top;         // same vertical position
    this.showColumnModal = !this.showColumnModal;
  }

  applyColumnFilter(): void {
    this.showColumnModal = false;
  }

  toggleColumnSelection(columnKey: string): void {
    const index = this.selectedColumnFilters.indexOf(columnKey);
    if (index > -1) {
      this.selectedColumnFilters.splice(index, 1);
    } else {
      this.selectedColumnFilters.push(columnKey);
    }
    this.applyValueFilters();
  }

  get visibleColumns(): string[] {
    return this.selectedColumnFilters.length === 0
      ? this.availableColumns.map(col => col.key) // all visible initially
      : this.selectedColumnFilters;               // show only filtered ones
  }

  applyValueFilters(): void {
    this.filteredTableData = this.mrumTableData.filter(row =>
      this.selectedColumnFilters.every(column => {
        const selectedValues = this.valueFilterMap[column];
        if (!selectedValues || selectedValues.length === 0) return true;
        const value = this.getCellValue(row, column);
        if (value === null) return false;
        return selectedValues.includes(value);
      })
    );
    this.calculatePagination();
  }

  openValueFilterModal(event: MouseEvent, column: string): void {
    if (!this.mrumTableData.length) return;
    this.currentFilterColumn = column;
    this.searchTerm = '';

    const uniqueValues = Array.from(new Set(this.mrumTableData.map(row => this.getCellValue(row, column))))
      .filter(val => val !== null && val !== undefined && val !== '')
      .map(String);

    this.columnValues = uniqueValues;
    
    // Position the modal
    this.filterModalX = event.clientX;
    this.filterModalY = event.clientY + 20;

    this.showValueFilterModal = true;
  }

  getCellValue(row: any, column: string): string | null {
    switch (column) {
      case 'serviceName':
        return row.serviceName ?? null;
      case 'load':
        return row.throughput != null ? String(row.throughput) : null;
      case 'latency':
        return row.latency != null ? String(row.latency) : null;
      case 'apdex':
        return row.apdex != null ? String(row.apdex) : null;
      case 'successRate':
        return row.failure_rate != null ? String(row.failure_rate) : null;
      case 'osType':
        return row.osType ?? null;
      case 'technologyType':
        return row.technologyType ?? null;
      default:
        return null;
    }
  }

  get filteredColumnValues(): string[] {
    return this.columnValues
      .filter((value): value is string => typeof value === 'string' && value.trim() !== '') // Remove undefined/null/empty
      .filter(value =>
        value.toLowerCase().includes(this.searchTerm.toLowerCase())
      );

  }

  getColumnLabel(key: string): string {
    const found = this.availableColumns.find(c => c.key === key);
    return found ? found.label : key;
  }

  getCurrentFilterLabel(): string {
    const col = this.availableColumns.find(c => c.key === this.currentFilterColumn);
    return col ? col.label : '';
  }

  getApdexLabel(apdex: number | null | undefined): string {
    if (apdex === null || apdex === undefined || apdex === 0) return 'N/A';
    if (apdex >= 0.90) return 'Excellent';
    if (apdex >= 0.75) return 'Good';
    if (apdex >= 0.60) return 'Fair';
    if (apdex >= 0.40) return 'Poor';
    return 'Critical';
  }

  getApdexColor(apdex: number | null | undefined): string {
    if (apdex === null || apdex === undefined || apdex === 0) return '#e0e0e0';
    if (apdex >= 0.90) return '#059669'; // Dark Green
    if (apdex >= 0.75) return '#10b981'; // Light Green
    if (apdex >= 0.60) return '#eab308'; // Yellow
    if (apdex >= 0.40) return '#f97316'; // Orange
    return '#ef4444'; // Red
  }

  getApdexClass(apdex: number | null | undefined): string {
    if (apdex === null || apdex === undefined || apdex === 0) return 'apdex-none';
    if (apdex >= 0.90) return 'apdex-excellent';
    if (apdex >= 0.75) return 'apdex-good';
    if (apdex >= 0.60) return 'apdex-fair';
    if (apdex >= 0.40) return 'apdex-poor';
    return 'apdex-critical';
  }

  getApdexIcon(apdex: number | null | undefined): string {
    if (apdex === null || apdex === undefined || apdex === 0) return 'bi-dash-circle';
    if (apdex >= 0.90) return 'bi-emoji-smile';
    if (apdex >= 0.75) return 'bi-emoji-smile';
    if (apdex >= 0.60) return 'bi-emoji-neutral';
    if (apdex >= 0.40) return 'bi-emoji-frown';
    return 'bi-emoji-angry';
  }

  getApdexDescription(apdex: number | null | undefined): string {
    if (apdex === null || apdex === undefined || apdex === 0) return 'No data available';
    if (apdex >= 0.90) return 'Excellent user experience';
    if (apdex >= 0.75) return 'Good user experience';
    if (apdex >= 0.60) return 'Fair user experience';
    if (apdex >= 0.40) return 'Poor user experience';
    return 'Critical issues in experience';
  }

  toggleValueSelection(value: string): void {
    if (!this.currentFilterColumn) return;

    const selectedValues = this.valueFilterMap[this.currentFilterColumn] || [];

    if (selectedValues.includes(value)) {
      this.valueFilterMap[this.currentFilterColumn] = selectedValues.filter(v => v !== value);
    } else {
      this.valueFilterMap[this.currentFilterColumn] = [...selectedValues, value];
    }
  }

  get searchTerm(): string {
    return this._searchTerm;
  }
  set searchTerm(value: string) {
    this._searchTerm = value;

    // Call only if there's a search term
    if (value.trim() !== '') {
      this.autoSelectMatchingValues();
    }
  }

  autoSelectMatchingValues(): void {
    if (!this.currentFilterColumn || !this._searchTerm.trim()) return;

    const matchingValues = this.columnValues
      .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
      .filter(value => value.toLowerCase().includes(this._searchTerm.toLowerCase()));

    this.valueFilterMap[this.currentFilterColumn] = [...matchingValues];
  }


  deselectAllColumns(): void {
    this.selectedColumnFilters = [];
    this.valueFilterMap = {};
    this.applyValueFilters();
  }


  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.columnModalRef?.nativeElement.contains(event.target);
    const clickedFilterIcon = (event.target as HTMLElement).closest('.filter');
    if (!clickedInside && !clickedFilterIcon) {
      this.showColumnModal = false;
    }
  }

  setServiceId(row: any): void {
    this.router.navigate(['/mrum/mrum-overview'], {
      queryParams: { serviceId: row.serviceName, tech: row.technologyType, st: this.startTime, et: this.endTime }
    });
  }


  isValidData(value: any): boolean {
    return (
      value !== null && value !== undefined && value !== '' && !isNaN(value)
    );
  }

  openThrouputPopup(event: MouseEvent, serviceName: string): void {
    // Get the screen width and height
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const popupWidth = 320; // Adjust this width to match your popup size
    const popupHeight = 300; // Adjust this height to match your popup size
    // Calculate the desired position based on mouse event
    let newPopupX = event.clientX;
    let newPopupY = event.clientY;
    // Adjust position if the popup is going out of the screen
    if (newPopupX + popupWidth > screenWidth) {
      newPopupX = screenWidth - popupWidth - 10; // 10px padding from the edge
    }
    if (newPopupY + popupHeight > screenHeight) {
      newPopupY = screenHeight - popupHeight - 10; // 10px padding from the edge
    }
    // Set the new position
    this.popupX = newPopupX;
    this.popupY = newPopupY;
    this.showPopup = true;
    // Call to show the service success rate graph
    setTimeout(() => {
      this.globalClickUnlistener = this.renderer.listen('document', 'click', (event: MouseEvent) => {
        const popupEl = this.popupContainerThroughputRef?.nativeElement;
        if (this.showPopup && popupEl && !popupEl.contains(event.target)) {
          this.closePopup();
        }
      });
    });
    this.showThroughputGraph(serviceName);
  }

  closePopup(): void {
    this.showPopup = false;
    if (this.globalClickUnlistener) {
      this.globalClickUnlistener();
      this.globalClickUnlistener = null;
    }
  }

  showThroughputGraph(serviceName: string): void {
    this.getThroughput(serviceName).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data.serviceResponse && Array.isArray(data.serviceResponse.time_series) && data.serviceResponse.time_series.length > 0) {
          this.initialize_throughput_graph(data.serviceResponse);
        } else {
          console.log('No data available for', serviceName);
        }
      },
      error: (error: any) => {
        console.error('Error fetching service load data:', error);
      }
    });
  }

  getThroughput(serviceName: string): Observable<any> {
    const mrumParams: MrumParams = {
      appName: serviceName,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };
    return this.mrumService.getThroughput(mrumParams);
  }

  initialize_throughput_graph(data: any) {
    try {
      if (this.serviceThroughputChart) {
        this.serviceThroughputChart.destroy();
      }

      const ServiceThroughputTimeValue: any = {};
      const allTimeBuckets: any[] = [];
      const timeSeries = Array.isArray(data.time_series) ? data.time_series : [];

      // Extract all unique time buckets
      timeSeries.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.timestamp);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });

      allTimeBuckets.sort((a, b) => a - b);

      const statusColors: any = {
        'CRITICAL': '#E94F3D',
        'WARNING': '#ED9C40',
        'NORMAL': '#7CB5EC'
      };

      timeSeries.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.timestamp);
        const throughput = ele.throughput;
        // const status = ele.status;

        if (!ServiceThroughputTimeValue['Throughput']) {
          ServiceThroughputTimeValue['Throughput'] = [];
        }

        ServiceThroughputTimeValue['Throughput'].push({
          x: time,
          y: throughput,
          color: statusColors[status] || '#7CB5EC'
        });
      });

      const seriesData = [{
        name: 'Throughput',
        data: allTimeBuckets.map(time => {
          const point = ServiceThroughputTimeValue['Throughput'].find((p: any) => p.x === time);
          return point ? [time, point.y] : [time, null];  // Ensure proper [x, y] format
        }),
        marker: {
          radius: 2
        }
      }];

      const minTime = this.convertTimebucket(timeSeries[0].timestamp);

      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'ServiceThroughputTimeValue',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: 'white',
              fontSize: '9'
            }
          }
        },
        yAxis: {
          min: 0,
          tickAmount: 12,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: 'white',
              fontSize: '9'
            }
          },
          gridLineColor: '#30343f',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;
            this.points?.forEach((point: any) => {
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b> Throughput:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });
            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        series: seriesData
      };

      console.log('Initializing chart with options:', opts1);
      this.serviceThroughputChart = new Highcharts.Chart(opts1);
      console.log('Chart initialized:', this.serviceThroughputChart);
    } catch (error) {
      console.error("Error Occurred!", error);
    }
  }

  convertTimebucket(timebucket: any) {
    timebucket = timebucket.toString();
    const year = parseInt(timebucket.slice(0, 4), 10);
    const month = parseInt(timebucket.slice(4, 6), 10) - 1;
    const day = parseInt(timebucket.slice(6, 8), 10);
    const hour = parseInt(timebucket.slice(8, 10), 10);
    const minute = parseInt(timebucket.slice(10, 12), 10);
    const date = new Date(Date.UTC(year, month, day, hour, minute));
    return date.getTime();
  }

  openFailureRatePopup(event: MouseEvent, serviceName: string): void {
    // Get the screen width and height
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const popupWidth = 320; // Adjust this width to match your popup size
    const popupHeight = 300; // Adjust this height to match your popup size
    // Calculate the desired position based on mouse event
    let newPopupX = event.clientX;
    let newPopupY = event.clientY;
    // Adjust position if the popup is going out of the screen
    if (newPopupX + popupWidth > screenWidth) {
      newPopupX = screenWidth - popupWidth - 10; // 10px padding from the edge
    }
    if (newPopupY + popupHeight > screenHeight) {
      newPopupY = screenHeight - popupHeight - 10; // 10px padding from the edge
    }
    // Set the new position
    this.popupSrX = newPopupX;
    this.popupSrY = newPopupY;
    this.showFailurePopup = true;
    // Call to show the service success rate graph
    setTimeout(() => {
      this.globalClickUnlistener = this.renderer.listen('document', 'click', (event: MouseEvent) => {
        const popupEl = this.popupContainerFailedRef?.nativeElement;
        if (this.showPopup && popupEl && !popupEl.contains(event.target)) {
          this.closePopup();
        }
      });
    });
    this.showServiceFailureRateGraph(serviceName);
  }

  closeFailureRatePopup(): void {
    this.showFailurePopup = false;
    if (this.globalClickUnlistener) {
      this.globalClickUnlistener();
      this.globalClickUnlistener = null;
    }
  }

  showServiceFailureRateGraph(serviceName: string): void {
    this.showFailureRateGraph = true;
    this.getServiceFailureRate(serviceName).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data.serviceResponse && Array.isArray(data.serviceResponse.time_series) && data.serviceResponse.time_series.length > 0) {
          this.initialize_failure_rate_graph(data.serviceResponse);
        } else {
          console.log('No data available for', serviceName);
        }
      },
      error: (error) => {
        console.error('Error fetching service load data:', error);
      }
    });
  }

  getServiceFailureRate(serviceName: string): Observable<any> {
    const mrumParams: MrumParams = {
      appName: serviceName,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };
    return this.mrumService.getFailedTransactionRate(mrumParams);
  }

  initialize_failure_rate_graph(data: any) {

    try {
      if (this.failureRateTimeValueChart) {
        while (this.failureRateTimeValueChart.series.length > 0) {
          this.failureRateTimeValueChart.series[0].remove(false);
          this.failureRateTimeValueChart.showLoading('No Data');
        }

        this.failureRateTimeValueChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }



      const failureRateTimeValue: any = {};
      const allTimeBuckets: any[] = [];

      const timeSeries = Array.isArray(data.time_series) ? data.time_series : [];

      // Extract all unique time buckets
      timeSeries.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.timestamp);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });

      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);

      // Create file_System object with time buckets and corresponding data (or null if data is missing)
      timeSeries.forEach((ele: any) => {
        Object.keys(ele).forEach((key) => {
          if (key !== 'timestamp') {
            if (!failureRateTimeValue[key]) {
              failureRateTimeValue[key] = [];
            }

            // Find the corresponding time bucket for the current entry
            const time = this.convertTimebucket(ele.timestamp);

            // Push the value for the specific time bucket
            failureRateTimeValue[key].push([time, ele[key]]);
          }
        });
      });

      // Ensure missing data is represented as null in the series data
      const seriesData = Object.keys(failureRateTimeValue).map((key) => {
        const filledData = allTimeBuckets.map((time) => {
          const point = failureRateTimeValue[key].find((p: any) => p[0] === time);
          // return point ? point : [time, null];
          const pointValue = point ? point[1] : null;

          return {
            x: time,
            y: pointValue,
            color: pointValue !== null && pointValue !== 100 ? 'red' : undefined
          };
        });

        return {
          name: key,
          data: filledData,
          marker: {
            radius: 2
          }
        };
      });

      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(timeSeries[0].timestamp);

      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'FailureRateTimeValue',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          // max: this.convertTimebucket(this.endTime),
          labels: {
            style: {
              color: 'white',
              fontSize: '9'
            }
          }
        },
        yAxis: {
          min: 0,
          max: 100,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: 'white',
              fontSize: '9'
            }
          },
          gridLineColor: '#30343f',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;

            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>Failure Rate:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });

            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        series: seriesData
      };

      this.failureRateTimeValueChart = new Highcharts.Chart(opts1);
    }
    catch {
      console.log("Error Occured!");

    }
  }

  openLatencyPopup(event: MouseEvent, serviceName: string): void {
    console.log('Opening Service Load Graph for:', serviceName);

    // Get the screen width and height
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const popupWidth = 320; // Adjust this width to match your popup size
    const popupHeight = 300; // Adjust this height to match your popup size

    // Calculate the desired position based on mouse event
    let newPopupX = event.clientX;
    let newPopupY = event.clientY;

    // Adjust position if the popup is going out of the screen
    if (newPopupX + popupWidth > screenWidth) {
      newPopupX = screenWidth - popupWidth - 10; // 10px padding from the edge
    }

    if (newPopupY + popupHeight > screenHeight) {
      newPopupY = screenHeight - popupHeight - 10; // 10px padding from the edge
    }

    // Set the new position
    this.popupLatencyX = newPopupX;
    this.popupLatencyY = newPopupY;
    this.showLatencyPopup = true;

    // Call to show the service success rate graph
    setTimeout(() => {
      this.globalClickUnlistener = this.renderer.listen('document', 'click', (event: MouseEvent) => {
        const popupEl = this.popupContainerLatencyRef?.nativeElement;
        if (this.showPopup && popupEl && !popupEl.contains(event.target)) {
          this.closePopup();
        }
      });
    });
    this.showServiceLatencyGraph(serviceName);
  }

  closeLatencyPopup(): void {
    this.showLatencyPopup = false;
    if (this.globalClickUnlistener) {
      this.globalClickUnlistener();
      this.globalClickUnlistener = null;
    }
  }


  showServiceLatencyGraph(serviceName: string): void {
    this.showLatencyGraph = true;
    this.getServiceLatency(serviceName).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data.serviceResponse && Array.isArray(data.serviceResponse.time_series) && data.serviceResponse.time_series.length > 0) {
          this.initialize_serviceLatency_graph(data.serviceResponse);
        } else {
          console.log('No data available for', serviceName);
        }
      },
      error: (error) => {
        console.error('Error fetching service load data:', error);
      }
    });
  }
  getServiceLatency(serviceName: string): Observable<any> {
    const mrumParams: MrumParams = {
      appName: serviceName,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };
    return this.mrumService.getLatencyStats(mrumParams);
  }

  initialize_serviceLatency_graph(data: any) {
    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.serviceAvgResponseTimeChart) {
        while (this.serviceAvgResponseTimeChart.series.length > 0) {
          this.serviceAvgResponseTimeChart.series[0].remove(false);
          this.serviceAvgResponseTimeChart.showLoading('No Data');
        }

        this.serviceAvgResponseTimeChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }

      const serviceAverageResponseTime: any = {};
      const allTimeBuckets: any[] = [];

      const timeSeries = Array.isArray(data.time_series) ? data.time_series : [];

      // Extract all unique time buckets
      timeSeries.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.timestamp);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });

      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);

      // Map status to colors
      const statusColors: any = {
        'CRITICAL': '#E94F3D',
        'WARNING': '#ED9C40',
        'NORMAL': '#7CB5EC'
      };

      // Process data
      timeSeries.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.timestamp);
        const avgLatencyMs = ele.avgLatencyMs;
        const status = ele.status;

        if (!serviceAverageResponseTime['Latency']) {
          serviceAverageResponseTime['Latency'] = [];
        }

        serviceAverageResponseTime['Latency'].push({
          x: time,
          y: avgLatencyMs,
          color: statusColors[status] || '#7CB5EC' // Default color grey if status is unknown
        });
      });

      // Ensure missing data is represented as null in the series data
      const seriesData = [{
        name: 'Latency',
        data: allTimeBuckets.map(time => {
          const point = serviceAverageResponseTime['Latency'].find((p: any) => p.x === time);
          return point ? point : { x: time, y: null, color: '#7CB5EC' };
        }),
        marker: {
          radius: 2
        }
      }];

      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(timeSeries[0].timestamp);

      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'serviceAverageResponseTime',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          labels: {
            style: {
              color: 'white',
              fontSize: '9'
            }
          }
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: 'white',
              fontSize: '9'
            }
          },
          gridLineColor: '#30343f',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;

            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>Latency:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });

            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        series: seriesData
      };

      this.serviceAvgResponseTimeChart = new Highcharts.Chart(opts1);
    }
    catch {
      console.log("Error Occured!");
    }
  }

  openApdexPopup(event: MouseEvent, serviceName: string): void {
    console.log('Opening Service Load Graph for:', serviceName);

    // Get the screen width and height
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const popupWidth = 320; // Adjust this width to match your popup size
    const popupHeight = 300; // Adjust this height to match your popup size

    // Calculate the desired position based on mouse event
    let newPopupX = event.clientX;
    let newPopupY = event.clientY;

    // Adjust position if the popup is going out of the screen
    if (newPopupX + popupWidth > screenWidth) {
      newPopupX = screenWidth - popupWidth - 10; // 10px padding from the edge
    }

    if (newPopupY + popupHeight > screenHeight) {
      newPopupY = screenHeight - popupHeight - 10; // 10px padding from the edge
    }

    // Set the new position
    this.popupApdexX = newPopupX;
    this.popupApdexY = newPopupY;
    this.showApdexPopup = true;

    // Call to show the service success rate graph
    setTimeout(() => {
      this.globalClickUnlistener = this.renderer.listen('document', 'click', (event: MouseEvent) => {
        const popupEl = this.popupContainerApdexRef?.nativeElement;
        if (this.showPopup && popupEl && !popupEl.contains(event.target)) {
          this.closePopup();
        }
      });
    });
    this.showServiceAdexGraph(serviceName);
  }

  closeApdexPopup(): void {
    this.showApdexPopup = false;
    if (this.globalClickUnlistener) {
      this.globalClickUnlistener();
      this.globalClickUnlistener = null;
    }
  }


  showServiceAdexGraph(serviceName: string): void {
    this.showApdexGraph = true;
    this.getServiceApdexTimeValue(serviceName).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data.serviceResponse && Array.isArray(data.serviceResponse.time_series) && data.serviceResponse.time_series.length > 0) {
          this.initialize_ServiceApdexTimeValue_graph(data.serviceResponse);
        } else {
          console.log('No data available for', serviceName);
        }
      },
      error: (error) => {
        console.error('Error fetching service load data:', error);
      }
    });
  }
  getServiceApdexTimeValue(serviceName: string): Observable<any> {
    const params: MrumParams = {
      appName: serviceName,
      st: this.startTime?.toString(),
      et: this.endTime?.toString()
    };
    return this.mrumService.getApdexScore(params);
  }

  initialize_ServiceApdexTimeValue_graph(data: any) {

    try {
      // Check if chart exists and remove existing series to reset the chart
      if (this.serviceApdexTimeValueChart) {
        while (this.serviceApdexTimeValueChart.series.length > 0) {
          this.serviceApdexTimeValueChart.series[0].remove(false);
          this.serviceApdexTimeValueChart.showLoading('No Data');
        }

        this.serviceApdexTimeValueChart.update({
          xAxis: {
            categories: []
          },
          yAxis: {
            categories: []
          }
        }, false);
      }

      const serviceApdexTimeValue: any = {};
      const allTimeBuckets: any[] = [];

      const timeSeries = Array.isArray(data.time_series) ? data.time_series : [];

      // Extract all unique time buckets
      timeSeries.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.timestamp);
        if (!allTimeBuckets.includes(time)) {
          allTimeBuckets.push(time);
        }
      });

      // Sort the time buckets to ensure they're in order
      allTimeBuckets.sort((a, b) => a - b);

      // Map status to colors
      const statusColors: any = {
        'CRITICAL': '#E94F3D',
        'WARNING': '#ED9C40',
        'NORMAL': '#7CB5EC'
      };

      // Process data
      timeSeries.forEach((ele: any) => {
        const time = this.convertTimebucket(ele.timestamp);
        const apdex = ele.apdex;
        const status = ele.status;

        if (!serviceApdexTimeValue['Apdex']) {
          serviceApdexTimeValue['Apdex'] = [];
        }

        serviceApdexTimeValue['Apdex'].push({
          x: time,
          y: apdex,
          color: statusColors[status] || '#7CB5EC' // Default color grey if status is unknown
        });
      });

      // Ensure missing data is represented as null in the series data
      const seriesData = [{
        name: 'Apdex',
        data: allTimeBuckets.map(time => {
          const point = serviceApdexTimeValue['Apdex'].find((p: any) => p.x === time);
          return point ? point : { x: time, y: null, color: '#7CB5EC' };
        }),
        marker: {
          radius: 2
        }
      }];

      // Set min to the first time bucket from data[0]
      const minTime = this.convertTimebucket(timeSeries[0].timestamp);

      const opts1: any = {
        chart: {
          showAxes: true,
          type: 'spline',
          backgroundColor: 'transparent',
          renderTo: 'serviceApdexTimeValue',
        },
        title: {
          text: null
        },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        legend: {
          enabled: false,
          align: 'center',
          verticalAlign: 'top',
          layout: 'horizontal',
          itemStyle: {
            fontSize: '8px'
          }
        },
        xAxis: {
          type: 'datetime',
          title: {
            enabled: false
          },
          min: minTime,
          // max: this.convertTimebucket(this.endTime),
          labels: {
            style: {
              color: 'white',
              fontSize: '9'
            }
          }
        },
        yAxis: {
          min: 0,
          max: 1,
          tickAmount: 6,
          title: {
            enabled: false
          },
          labels: {
            style: {
              color: 'white',
              fontSize: '9'
            }
          },
          gridLineColor: '#30343f',
          endOnTick: false,
          startOnTick: true,
        },
        tooltip: {
          shared: true,
          useHTML: true,
          formatter: function (this: any) {
            let tooltipContent = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b><br/><br/><ul style="padding-left: 1em;">`;

            this.points.forEach((point: any) => {
              // Add a colored bullet point before the series name using the series color
              tooltipContent += `<li style="list-style-type: none;"><span style="color: ${point.color};">●</span> <b>Apdex:</b> ${point.y !== null ? point.y : 'No Data'}</li>`;
            });

            tooltipContent += '</ul>';
            return tooltipContent;
          }
        },
        series: seriesData
      };

      this.serviceApdexTimeValueChart = new Highcharts.Chart(opts1);
    }
    catch {
      console.log("Error Occured!");

    }
  }

}
