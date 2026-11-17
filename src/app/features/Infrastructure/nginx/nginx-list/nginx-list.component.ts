import { AfterViewInit, Component, OnDestroy, OnInit } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { DateService } from "../../../../services/date.service";
import { filter, Subject, Subscription, switchMap, takeUntil } from "rxjs";

import { CommonModule } from "@angular/common";
import { User } from "../../../../models/user";
import { ApplicationService } from "../../../../services/application.service";
import { AuthenticationService } from "../../../../services/authentication.service";
import { NginxService } from "../../../../services/nginx.service";
import { FormsModule } from "@angular/forms";
import { Session } from "../../../../models/session";
import { LoggerService } from "../../../../services/logger.service";
import { ObjectFilterPipe } from "../../../../pipes/object-filter.pipe";
import { PaginatePipe } from "../../../../pipes/paginate.pipe";
import { SortPipe } from "../../../../pipes/sort.pipe";
import { ShortNumberPipe } from "../../../../pipes/short-number.pipe";
import * as bootstrap from 'bootstrap';

@Component({
    selector: 'app-nginx-list',
    imports: [RouterModule, CommonModule, FormsModule, ObjectFilterPipe, PaginatePipe, SortPipe, ShortNumberPipe],
    templateUrl: './nginx-list.component.html',
    styleUrl: './nginx-list.component.css'
})

export class NginxListComponent implements OnInit, OnDestroy, AfterViewInit {
  user: User = new User();
  currentUser: User | null = null;
  private destroy$ = new Subject<void>();
  private datesubscription: Subscription = new Subscription();
  datemodel: any;
  startTime!: number;
  endTime!: number;
  metricsData: any[] = [];
  searchQuery: string = '';
  sessionObject: Session = new Session();
  apiResponse: any;
  serviceResponseList: any;
  objectKeys = Object.keys;
  tool: string = 'APM';
  featureType: string = 'NGINX';
  appTypeMap = new Map<string, any>();

  // Kafka-style Pagination & Sorting
  searchText: string = '';
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' | 'none' = 'none';
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  inputPage: number = 1;
  totalItems: number = 0;

  // Skeleton View
  isLoading: boolean = false;
  skeletonRows = Array(10).fill(0);

  constructor(
    private router: Router,
    private dateService: DateService,
    private nginxService: NginxService,
    private authService: AuthenticationService,
    private applicationService: ApplicationService,
    private loggerService: LoggerService
  ) { }

  ngOnInit(): void {
    // First get the current user
    this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
      this.tool = sessionStorage.getItem('tool') || '';
      if (user) {
        this.initializeComponent();
      }
    });
    sessionStorage.setItem('featureType', this.featureType);
    // Then subscribe to date changes
    this.dateService.setActiveComponent("NginxListComponent");
    this.datesubscription = this.dateService.activeComponent$
      .pipe(
        filter((activeComponent) => activeComponent === "NginxListComponent"),
        switchMap(() => this.dateService.date$)
      )
      .subscribe((dates) => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.loadData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
    sessionStorage.removeItem('featureType');
  }

  ngAfterViewInit(): void {
    this.initializeTooltips();
  }

  private initializeTooltips(): void {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
  }

  gotoNginxDetails(key: any) {
    let service_id = btoa(key) + ".1";
    sessionStorage.setItem("nginx", key);
    this.router.navigate(["/nginx/overview"]);
  }

  loadData() {
    // Only call API when both serviceResponseList and dates are ready
    if (this.serviceResponseList && this.startTime && this.endTime) {
      this.getNginxLists();
    }
  }

  getNginxLists() {
    this.isLoading = true;
    this.nginxService.getNginxListsAPI(this.startTime, this.endTime, this.serviceResponseList).subscribe({
      next: (data: any) => {
        this.isLoading = false;
        console.log('NGINX metrics response:', data);
        const metricsMap = new Map<string, any>();

        if (Array.isArray(data)) {
          data.forEach(item => {
            const key = Object.keys(item)[0];
            if (key) {
              metricsMap.set(key, item[key]);
            }
          });
        }

        const mergedData: any[] = [];
        if (this.serviceResponseList?.length) {
          this.serviceResponseList.forEach((appName: string) => {
            const metrics = metricsMap.get(appName);
            const appDetails = this.appTypeMap.get(appName) || { technology: '', type: this.featureType };
            mergedData.push({
              name: appName,
              applicationTechnology: appDetails.technology,
              applicationType: appDetails.type,
              http_requests_total: metrics?.http_requests_total ?? '-',
              http_bandwidth_total_kb: metrics?.http_bandwidth_total_kb ?? '-',
              http_connections_avg: metrics?.http_connections_avg ?? '-',
              http_4xx_percent: metrics?.http_4xx_percent ?? 0,
              http_5xx_percent: metrics?.http_5xx_percent ?? 0
            });
          });
        } else {
          metricsMap.forEach((value, key) => {
            mergedData.push({
              name: key,
              ...value
            });
          });
        }

        this.metricsData = mergedData;
        this.resetPagination(this.metricsData);
        setTimeout(() => this.initializeTooltips(), 0);
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Error fetching NGINX metrics:', err);
        const defaultData: any[] = [];
        if (this.serviceResponseList?.length) {
          this.serviceResponseList.forEach((appName: string) => {
            const appDetails = this.appTypeMap.get(appName) || { technology: '', type: this.featureType};
            defaultData.push({
              name: appName,
              applicationTechnology: appDetails.technology,
              applicationType: appDetails.type,
              http_requests_total: '-',
              http_bandwidth_total_kb: '-',
              http_connections_avg: '-'
            });
          });
        }
        this.metricsData = defaultData;
        this.resetPagination(this.metricsData);
      },
    });
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "").replace(/:/g, "").replace(" ", "");
    return parseInt(date);
  }

  getImagePath(tech: string | undefined | null, appType: string | undefined | null): string {
    const t = tech ? tech.trim().toLowerCase() : '';
    const a = appType ? appType.trim().toLowerCase() : '';
    return 'assets/images/' + (t || a || 'undefined') + '.png';
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/img/technologies/UNDEFINED.png';
  }

  initializeComponent(): void {
    this._prepareUserForServiceCall();
    this.applicationService.getFullApplicationData(
      this.user.userId, this.featureType.toUpperCase(), this.sessionObject
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data && data.serviceStatus === 'Success') {
          const apps = data.serviceResponse?.applications || [];
          this.appTypeMap = new Map<string, any>();
          apps.forEach((app: any) => {
            this.appTypeMap.set(app.applicationName, {
              technology: app.applicationTechnology,
              type: app.applicationType
            });
          });
          this.serviceResponseList = apps.map((app: any) => app.applicationName);
        } else {
          this.serviceResponseList = [];
        }
        this.apiResponse = data;
        this.loadData();
      },
      error: (err: any) => {
        console.error('Error fetching NGINX applications:', err);
        this.serviceResponseList = [];
        this.loadData();
      }
    });
  }


  private _prepareUserForServiceCall(): void {
    if (!this.currentUser) {
      console.error("No current user");
      return;
    }
    this.user = this.currentUser;
    this.user.sessionDTO = this.sessionObject;
    this.sessionObject.featureName = "RUAMBOT";
    this.sessionObject.requestURI = this.router.url.split("?")[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem("loginTime");
    this.sessionObject.sessionId = sessionStorage.getItem("sessionId");
    this.sessionObject.browserName =
      this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion =
      this.loggerService.getBrowserNameAndVersion().version;
  }

  // Kafka-style Support functions
  sortData(columnName: string) {
    this.sortColumn = columnName;
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : (this.sortDirection === 'desc' ? 'none' : 'asc');
  }

  resetPagination(resultArray: any[]) {
    this.currentPage = 1;
    this.totalPages = 1;
    this.inputPage = 1;
    this.totalItems = resultArray?.length || 0;
    if (resultArray && resultArray.length > 0 && this.pageSize > 0) {
      this.totalPages = Math.ceil(resultArray.length / this.pageSize);
    }
  }

  resetCurrentPage(data: any[], searchText: string, keys: string[]) {
    this.resetPagination(this.filterData(data, searchText, keys));
  }

  filterData(items: any[], searchText: string, keys: string[]): any[] {
    if (!items || !searchText || !keys || keys.length === 0) {
      return items;
    }
    const lowerSearch = searchText.toLowerCase();
    return items.filter((item) =>
      keys.some((key) => {
        const value = item[key];
        return value && value.toString().toLowerCase().includes(lowerSearch);
      })
    );
  }

  goToPage() {
    let page = Number(this.inputPage);
    if (isNaN(page) || page < 1) page = 1;
    else if (page > this.totalPages) page = this.totalPages;
    this.currentPage = page;
    this.inputPage = page;
  }

  previousPage() {
    this.currentPage = this.currentPage - 1;
    this.inputPage = this.currentPage;
  }

  nextPage() {
    this.currentPage = this.currentPage + 1;
    this.inputPage = this.currentPage;
  }

  getSuccessRate(item: any): string {
    if (!item || (item.http_4xx_percent === undefined && item.http_5xx_percent === undefined)) return 'N/A';
    const error4xx = item.http_4xx_percent || 0;
    const error5xx = item.http_5xx_percent || 0;
    const successRate = 100 - (Number(error4xx) + Number(error5xx));
    return successRate.toFixed(2);
  }

}


