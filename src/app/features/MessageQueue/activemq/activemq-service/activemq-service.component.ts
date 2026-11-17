import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ObjectFilterPipe } from '../../../../pipes/object-filter.pipe';
import { PaginatePipe } from '../../../../pipes/paginate.pipe';
import { ServiceIdService } from '../../../../services/service-id.service';
import { Router } from '@angular/router';
import { SortPipe } from '../../../../pipes/sort.pipe';
import { ShortNumberPipe } from '../../../../pipes/short-number.pipe';
import { User } from '../../../../models/user';
import { AuthenticationService } from '../../../../services/authentication.service';
import { DateService } from '../../../../services/date.service';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { Session } from '../../../../models/session';
import { LoggerService } from '../../../../services/logger.service';
import { ApplicationService } from '../../../../services/application.service';
import { DecoderService } from '../../../../services/decoder.service';
import { HotToastService } from "@ngxpert/hot-toast";
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

export interface ActiveMQCluster {
  name: string | undefined;
  brokers: number;
  topics: number;
  partitions: number;
  messages: number;
}

import { ActivemqService } from '../../../../services/activemq.service';
import { DatabaseService } from '../../../../services/database-api.service';

@Component({
    selector: 'app-activemq-service',
    imports: [CommonModule, FormsModule, ObjectFilterPipe, PaginatePipe, SortPipe, ShortNumberPipe],
    templateUrl: './activemq-service.component.html',
    styleUrl: './activemq-service.component.css'
})
export class ActivemqServiceComponent implements OnInit, OnDestroy {

  clusters: ActiveMQCluster[] = [];
  servicesList: any[] = []; 
  featureType: string = "ActiveMQ";

  private baseUrl = environment.baseUrl;

  // Current User
  user: User = new User();
  currentUser: User | null = null;
  sessionObject: Session = new Session();

  // Date Utils
  startTime!: number;
  endTime!: number;
  datemodel!: any;
  private datesubscription: Subscription = new Subscription();

  // Common variables
  private destroy$ = new Subject<void>();
  searchText = '';
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' | 'none' = 'none';
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  inputPage: number = 1;
  totalItems: number = 0;
  apiResponse: any;
  serviceResponseList: any[] = [];
  brokerCounts: { [key: string]: number } = {};
  destinationCounts: { [key: string]: number | string } = {};
  threadCounts: { [key: string]: number | string } = {};
  memoryUsages: { [key: string]: number | string } = {};

  // Skeleton View
  isLoading = false;
  skeletonRows = Array(10).fill(0);

  constructor(private serviceIdService: ServiceIdService,
    private router: Router,
    private authService: AuthenticationService,
    private dateService: DateService,
    private loggerService: LoggerService,
    private applicationService: ApplicationService,
    private decoderService: DecoderService,
    private toast: HotToastService,
    private activemqService: ActivemqService,
    private databaseService: DatabaseService,
    private httpClient: HttpClient
  ) { }

  ngOnInit(): void {
    sessionStorage.setItem('featureType', this.featureType);

    this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.currentUser = user;
      }
    });

    this.dateService.setActiveComponent("ActivemqServiceComponent");
    this.datesubscription = this.dateService.activeComponent$
      .pipe(
        filter((activeComponent) => activeComponent === "ActivemqServiceComponent"),
        switchMap(() => this.dateService.date$),
        takeUntil(this.destroy$)
      )
      .subscribe((dates) => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        
        if (this.currentUser) {
          this.getActiveMQClusters();
        }
      });
  }

  getActiveMQClusters() {
    this._prepareUserForServiceCall();
    this.isLoading = true;
    this.serviceResponseList = [];
    this.resetPagination(this.serviceResponseList);

    this.applicationService
      .getFullApplicationData(this.user.userId, this.featureType, this.user.sessionDTO)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response && response.serviceStatus?.toUpperCase() === 'SUCCESS') {
            this.apiResponse = response;
            this.serviceResponseList = response.serviceResponse.applications || [];
            this.resetPagination(this.serviceResponseList);
            this.loadData();
          } else {
            this.apiResponse = response || {
              serviceResponse: [],
              serviceStatus: "Failed",
              serviceError: "Empty response"
            };
            this.serviceResponseList = [];
            this.resetPagination(this.serviceResponseList);
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error("Failed to load app/ip list:", err);
          this.apiResponse = {
            serviceResponse: [],
            serviceStatus: "Failed",
            serviceError: "API error"
          };
          this.serviceResponseList = [];
          this.resetPagination(this.serviceResponseList);
        }
      });
  }

  loadData() {
    this.serviceResponseList.forEach(service => {
      const serviceName = typeof service === 'object' ? service.applicationName : service;
      const entityId = btoa(serviceName.trim()) + '.1';

      // Initialize defaults to show loading or '-' state before API returns
      this.brokerCounts[serviceName] = 0;
      this.destinationCounts[serviceName] = '-';
      this.threadCounts[serviceName] = '-';
      this.memoryUsages[serviceName] = '-';

      // Fetch Broker Count
      this.activemqService.getBrokerNames(entityId, this.startTime, this.endTime).subscribe({
        next: (data) => {
          if (data && data.broker_names && Array.isArray(data.broker_names)) {
            this.brokerCounts[serviceName] = data.broker_names.length;
          }
        },
        error: () => this.brokerCounts[serviceName] = 0
      });

      // Fetch Destination Count
      this.activemqService.getDestinationNames(entityId, this.startTime, this.endTime).subscribe({
        next: (data) => {
          if (data && data.destination_endpoints && Array.isArray(data.destination_endpoints)) {
            this.destinationCounts[serviceName] = data.destination_endpoints.length;
          }
        },
        error: () => this.destinationCounts[serviceName] = '-'
      });

      // Fetch Thread Count
      this.activemqService.getThreadCount(entityId, this.startTime, this.endTime).subscribe({
        next: (data) => {
          if (data && data.metrics && data.metrics.length > 0) {
            // Get the latest metric value in the array
            this.threadCounts[serviceName] = data.metrics[data.metrics.length - 1].value;
          }
        },
        error: () => this.threadCounts[serviceName] = '-'
      });

      // Fetch Heap Memory Usage
      this.activemqService.getHeapMemoryUsage(entityId, this.startTime, this.endTime).subscribe({
        next: (data) => {
          if (data && data.metrics && data.metrics.length > 0) {
            let memoryMB = data.metrics[data.metrics.length - 1].value;
            // Assuming the backend returns MB, format to 2 decimal places if needed
            this.memoryUsages[serviceName] = typeof memoryMB === 'number' ? memoryMB.toFixed(2) + ' MB' : memoryMB + ' MB';
          }
        },
        error: () => this.memoryUsages[serviceName] = '-'
      });

    });
  }

  getImagePath(tech: string | undefined | null, appType: string | undefined | null): string {
    const t = tech ? tech.trim().toLowerCase() : '';
    const a = appType ? appType.trim().toLowerCase() : '';
    return 'assets/images/' + (t || a || 'undefined') + '.png';
  }

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/img/technologies/UNKNOWN_CLOUD.png';
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "");
    return parseInt(date);
  }

  getServiceNames() {
    this.isLoading = true;
    this.activemqService.getServiceNames().subscribe({
      next: (data: any) => {
        this.isLoading = false;
        this.servicesList = [];
        if (data) {
          for (const [group, names] of Object.entries(data)) {
            if (Array.isArray(names)) {
              names.forEach((name: any) => {
                this.servicesList.push({ group: group, name: name });
              });
            }
          }
        }
        this.resetPagination(this.servicesList);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error fetching service names', err);
        this.showToast('Failed to load services', 'error');
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
  }

  setServiceId(event: MouseEvent, service: any): void {
    event.preventDefault();
    const serviceName = service?.applicationName || '';
    const serviceId = serviceName.trim();
    if (serviceId) {
      this.serviceIdService.setServiceId(serviceId);
      const encodedId = this.serviceIdService.getEncodedServiceId();
      sessionStorage.setItem('encodedActiveMQServiceId', encodedId);
      sessionStorage.setItem('activemqApplicationType', service.applicationType || '');
      sessionStorage.setItem('activemqApplicationTechnology', service.applicationTechnology || '');
      this.goToOverviewPage(encodedId);
    } else {
      console.error('Service ID is undefined or empty');
    }
  }

  goToOverviewPage(clusterID: string): void {
    this.router.navigate(['/activemq/overview'], { queryParams: { 'tab': 'overview' }, queryParamsHandling: 'merge' });
  }

  // Toast Util
  showToast(message: string, type: "success" | "error") {
    if (type === 'error') {
      this.toast.error(message, {
        dismissible: true,
        duration: 2500
      });
    } else if (type === 'success') {
      this.toast.success(message, {
        dismissible: true,
        duration: 2500,
        iconTheme: {
          primary: 'var(--sideBar-bg-color1)',
          secondary: '#FFFAEE',
        }
      });
    }
  }

  // Support functions for pagination
  sortData(columnName: string) {
    this.sortColumn = columnName;
    this.sortDirection = this.sortDirection == 'asc' ? 'desc' : (this.sortDirection == 'desc' ? 'none' : 'asc');
  }
  resetPagination(resultArray: any[]) {
    this.currentPage = 1;
    this.totalPages = 1;
    this.inputPage = 1;
    this.totalItems = resultArray.length;
    if (resultArray && resultArray.length > 0 && this.pageSize > 0) {
      this.totalPages = Math.ceil(resultArray.length / this.pageSize);
    }
  }

  resetCurrentPage(data: any[], searchText: string, keys: string[]) {
    this.resetPagination(this.filter(data, searchText, keys));
  }

  filter(items: any[], searchText: string, keys: string[]): any[] {
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
}