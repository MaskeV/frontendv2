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
import { filter, from, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { Session } from '../../../../models/session';
import { LoggerService } from '../../../../services/logger.service';
import { ApplicationService } from '../../../../services/application.service';
import { DecoderService } from '../../../../services/decoder.service';
import { ServiceResponse } from '../../../../models/common/ServiceResponse';
import { HotToastService } from "@ngxpert/hot-toast";
import { ServiceStatus } from '../../../../models/enums/ServiceStatus';

export interface KafkaCluster {
  name: string | undefined;
  brokers: number;
  topics: number;
  partitions: number;
  messages: number;
  applicationTechnology?: string;
  applicationType?: string;
}

@Component({
    selector: 'app-kafka-service',
    imports: [CommonModule, FormsModule, ObjectFilterPipe, PaginatePipe, SortPipe, ShortNumberPipe],
    templateUrl: './kafka-service.component.html',
    styleUrl: './kafka-service.component.css'
})

export class KafkaServiceComponent implements OnInit, OnDestroy {
  clusters: KafkaCluster[] = [];

  // Current User
  currentUser!: User;
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
    private toast: HotToastService
  ) { }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.currentUser = user;
      }
    });

    this.dateService.setActiveComponent('KafkaServiceComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'KafkaServiceComponent'),
      switchMap(() => this.dateService.date$)).subscribe((dates: any) => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.currentUser.sessionDTO = this.sessionObject;

        this.sessionObject.featureName = 'RUAMBOT';
        this.sessionObject.requestURI = this.router.url.split('?')[0];
        this.sessionObject.userId = this.currentUser.userId;
        this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
        this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
        this.sessionObject.browserName =
          this.loggerService.getBrowserNameAndVersion().name;
        this.sessionObject.browserVersion =
          this.loggerService.getBrowserNameAndVersion().version;

        this.getKafkaClusters();
      });
  }

  ngOnDestroy(): void {
    this.datesubscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  getKafkaClusters() {
    this.clusters = [];
    this.resetPagination(this.clusters);
    this.isLoading = true;

    // First get the KAFKA applications for this user
    const featureType = sessionStorage.getItem("featureType") ?? '';
    this.applicationService.getFullApplicationData(
      this.currentUser.userId, featureType, this.sessionObject
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (appData: any) => {
        if (appData && appData.serviceStatus === 'Success') {
          const apps = appData.serviceResponse?.applications || [];
          const clusterNames = apps.map((app: any) => app.applicationName);

          if (clusterNames.length > 0) {
            // Fetch cluster details from MQ-SERVICE via existing API
            this.applicationService
              .getKafkaClustersByUserID(this.currentUser, featureType.toUpperCase(), this.startTime, this.endTime)
              .pipe(
                switchMap((data) => from(this.decoderService.decodeObject(data))),
                takeUntil(this.destroy$)
              )
              .subscribe({
                next: (response: ServiceResponse<any>) => {
                  this.isLoading = false;
                  if (response.serviceStatus === ServiceStatus.SUCCESS) {
                    this.clusters = (response.serviceResponse || []).map((cluster: any) => {
                      const matchedApp = apps.find((app: any) => app.applicationName === cluster.name);
                      return {
                        ...cluster,
                        applicationTechnology: matchedApp?.applicationTechnology,
                        applicationType: matchedApp?.applicationType
                      };
                    });
                    this.resetPagination(this.clusters);
                  } else {
                    // MQ-SERVICE may be down, show basic cluster list from app names
                    this.clusters = apps.map((app: any) => ({
                      name: app.applicationName,
                      brokers: 0,
                      topics: 0,
                      partitions: 0,
                      messages: 0,
                      applicationTechnology: app.applicationTechnology,
                      applicationType: app.applicationType
                    }));
                    this.resetPagination(this.clusters);
                  }
                },
                error: () => {
                  this.isLoading = false;
                  // Fallback: show basic cluster list from app names
                  this.clusters = apps.map((app: any) => ({
                    name: app.applicationName,
                    brokers: 0,
                    topics: 0,
                    partitions: 0,
                    messages: 0,
                    applicationTechnology: app.applicationTechnology,
                    applicationType: app.applicationType
                  }));
                  this.resetPagination(this.clusters);
                }
              });
          } else {
            this.isLoading = false;
            this.showToast('No Kafka clusters found', 'error');
          }
        } else {
          this.isLoading = false;
          this.showToast(ServiceStatus.SOMETHING_WENT_WRONG, 'error');
        }
      },
      error: () => {
        this.isLoading = false;
        this.showToast(ServiceStatus.SOMETHING_WENT_WRONG, 'error');
      }
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

  setServiceId(event: MouseEvent, serviceName: string): void {
    event.preventDefault();
    const serviceId = serviceName.trim();
    if (serviceId) {
      this.serviceIdService.setServiceId(serviceId);
      const encodedId = this.serviceIdService.getEncodedServiceId();
      sessionStorage.setItem('encodedServiceId', encodedId);
      this.goToOverviewPage(encodedId);
    } else {
      console.error('Service ID is undefined or empty');
    }
  }

  goToOverviewPage(clusterID: string): void {
    this.router.navigate(['/message-queue/kafka-service/cluster', clusterID], { queryParams: { 'tab': 'overview' }, queryParamsHandling: 'merge' });
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

  // Support functions for Date service
  formatDate(date: string) {
    date = date.replace(/-/g, '');
    date = date.replace(/:/g, '');
    date = date.replace(' ', '');
    return parseInt(date);
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

}
