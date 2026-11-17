import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, Subject, filter, switchMap, takeUntil, catchError, finalize, forkJoin, map, of } from 'rxjs';
import { Session } from '../../../models/session';
import { User } from '../../../models/user';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { ApplicationService } from '../../../services/application.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { DateService } from '../../../services/date.service';
import { InfraService } from '../../../services/infra.service';
import { ServiceIdService } from '../../../services/service-id.service';
import * as bootstrap from 'bootstrap';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoggerService } from '../../../services/logger.service';
import { IisMonitoringApiService } from '../../../services/iis-monitoring-api.service';
export let browserRefresh = false;

@Component({
    selector: 'app-iis-monitoring',
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
    ],
    templateUrl: './iis-monitoring.component.html',
    styleUrl: './iis-monitoring.component.css'
})
export class IisMonitoringComponent implements OnInit, OnDestroy, AfterViewInit {

  user: User = new User();
  currentUser: User | null = null;

  sessionObject: Session = new Session();

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;

  searchQuery = '';
  applicationNames: any;
  allTableData: any[] = [];
  filteredTableData: any[] = [];
  pagedTableData: any[] = [];

  currentPage = 1;
  itemsPerPage = 25;
  totalPages = 0;

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  isLoading: boolean = false;

  featureType: string = 'IIS';


  constructor(
    private router: Router,
    private dateService: DateService,
    private iisMonitoringApiService: IisMonitoringApiService,
    private loggerService: LoggerService,
    private authService: AuthenticationService,
    private applicationService: ApplicationService,
  ) { }

  ngOnInit(): void {
    this.authService.currentUser.subscribe((x) => (this.currentUser = x));
    this.subscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        browserRefresh = !this.router.navigated;
      }
    });
    this.dateService.setActiveComponent('IisMonitoringComponent');
    sessionStorage.setItem('featureType', this.featureType);
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'IisMonitoringComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        // this.getServiceName();
        this.getFullApplicationData();
      });
  }

  ngOnDestroy(): void {
    this.datesubscription.unsubscribe();
    sessionStorage.removeItem('featureType');
  }

  ngAfterViewInit(): void {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  onSearch(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (query === '') {
      this.filteredTableData = [...this.allTableData];
    } else {
      this.filteredTableData = this.allTableData.filter(item =>
        (item.ipAddress && item.ipAddress.toLowerCase().includes(query)) ||
        (item.applicationName && item.applicationName.toLowerCase().includes(query))
      );
    }
    this.currentPage = 1;
    this.calculatePagination();
  }

  setServiceId(item: any): void {
    if (item) {
      const encodedServiceId = btoa(item) + '.1'
      sessionStorage.setItem('serviceIdForIis', item);
      sessionStorage.setItem('encodedServiceIdForIis', encodedServiceId);
      this.router.navigate(['/iis-monitoring/iis-service']);
    } else {
      console.error('Service ID is undefined or empty');
    }
  }

  getFullApplicationData(): void {
    if (this.currentUser) {
      this.user = this.currentUser;
    }

    const cached = sessionStorage.getItem('featureType');
    let featureType = cached;

    if (!featureType && this.currentUser?.subFeatures?.length) {
      const dashboard = this.currentUser.subFeatures.find(f => f.name === 'Dashboard');
      featureType = dashboard?.subFeature?.[0]?.name ?? dashboard?.name ?? '';
      if (featureType) sessionStorage.setItem('featureType', featureType);
    }

    featureType = featureType ?? '';

    const browser = this.loggerService.getBrowserNameAndVersion();
    this.user.sessionDTO = this.sessionObject;

    Object.assign(this.sessionObject, {
      featureName: 'RUAMBOT',
      requestURI: this.router.url.split('?')[0],
      userId: this.user.userId,
      loginTime: sessionStorage.getItem('loginTime'),
      sessionId: sessionStorage.getItem('sessionId'),
      browserName: browser.name,
      browserVersion: browser.version,
    });

    this.applicationService
      .getFullApplicationData(this.currentUser?.userId, featureType, this.currentUser!.sessionDTO)
      .pipe(
        takeUntil(this.destroy$),
        switchMap((data: any) => {
          this.applicationNames = data.serviceResponse?.applications?.map((app: any) => ({
            applicationName: app.applicationName,
            applicationTechnology: app.applicationTechnology,
            applicationType: app.applicationType,
            ipAddress: data.serviceResponse?.ipList?.find(
              (ip: any) => ip.applicationId === app.applicationId
            )?.ipAddress ?? null,
          })) ?? [];

          const requests = this.applicationNames.map((item: any) =>
            this.iisMonitoringApiService
              .getCombinedData(`${btoa(item.ipAddress)}.1`, this.startTime, this.endTime)
              .pipe(
                map((combinedData: any) => ({ ...item, combinedData })),
                catchError(err => {
                  console.error('API Error:', err);
                  return of({ ...item, combinedData: null });
                })
              )
          );

          return forkJoin(requests);
        }),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: (rows: any) => {
          this.allTableData = rows;
          this.filteredTableData = [...rows];
          this.currentPage = 1;
          this.calculatePagination();
        },
        error: (err) => console.error('Unexpected Error:', err),
      });
  }

  convertSeconds(sec: number): string {
    if (sec == null || isNaN(sec)) return 'N/A';

    const days = Math.floor(sec / 86400);          // 24 * 60 * 60
    const hours = Math.floor((sec % 86400) / 3600);
    const minutes = Math.floor((sec % 3600) / 60);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ${hours} hr`;
    }

    return `${hours} hr ${minutes} min`;
  }

  getImagePath(tech: string | undefined | null, appType: string | undefined | null): string {
    const t = tech ? tech.trim().toLowerCase() : '';
    const a = appType ? appType.trim().toLowerCase() : '';
    return 'assets/images/' + (t || a || 'undefined') + '.png';
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredTableData.length / this.itemsPerPage);
    this.pagedTableData = this.filteredTableData.slice(
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
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredTableData.length);
  }

  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredTableData.sort((a, b) => {
      let valA: any = a[column];
      let valB: any = b[column];

      if (column === 'status') {
        valA = a.combinedData?.app_pool_state === 1 ? 'Up' : 'Down';
        valB = b.combinedData?.app_pool_state === 1 ? 'Up' : 'Down';
      } else if (column === 'uptime') {
        valA = a.combinedData?.app_pool_st ?? 0;
        valB = b.combinedData?.app_pool_st ?? 0;
      }

      if (valA == null) valA = '';
      if (valB == null) valB = '';

      const compare = this.alphanumericCompare(valA.toString(), valB.toString());
      return this.sortDirection === 'asc' ? compare : -compare;
    });

    this.currentPage = 1;
    this.calculatePagination();
  }

  alphanumericCompare(a: string, b: string): number {
    const re = /(\d+|\D+)/g;
    const aParts = a.match(re) || [];
    const bParts = b.match(re) || [];

    const len = Math.min(aParts.length, bParts.length);
    for (let i = 0; i < len; i++) {
      const aPart = aParts[i];
      const bPart = bParts[i];

      const aNum = parseInt(aPart, 10);
      const bNum = parseInt(bPart, 10);

      const bothNumeric = !isNaN(aNum) && !isNaN(bNum);
      if (bothNumeric) {
        if (aNum !== bNum) return aNum - bNum;
      } else {
        const cmp = aPart.localeCompare(bPart, undefined, { sensitivity: 'base' });
        if (cmp !== 0) return cmp;
      }
    }

    return aParts.length - bParts.length;
  }

}
