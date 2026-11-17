import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { HotToastService } from "@ngxpert/hot-toast";
import { AuthenticationService } from '../../../../services/authentication.service';
import { ApplicationService } from '../../../../services/application.service';
import { ServiceIdService } from '../../../../services/service-id.service';
import { DateService } from '../../../../services/date.service';
import { RabbitmqService } from '../../../../services/rabbitmq.service';
import { ServiceResponse } from '../../../../models/common/ServiceResponse';
import { ServiceStatus } from '../../../../models/enums/ServiceStatus';
import { User } from '../../../../models/user';
import { SortPipe } from '../../../../pipes/sort.pipe';
import { ObjectFilterPipe } from '../../../../pipes/object-filter.pipe';
import { PaginatePipe } from '../../../../pipes/paginate.pipe';
import { ShortNumberPipe } from '../../../../pipes/short-number.pipe';
import { Session } from '../../../../models/session';
import { LoggerService } from '../../../../services/logger.service';

export interface RabbitmqCluster {
  name: string | undefined;
  nodes: number;
  queues: number;
  channels: number;
  connections: number;
  messages: number;
  applicationTechnology?: string;
  applicationType?: string;
}

@Component({
    selector: 'app-rabbitmq-service',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, SortPipe, ObjectFilterPipe, PaginatePipe, ShortNumberPipe],
    templateUrl: './rabbitmq-service.component.html',
    styleUrl: './rabbitmq-service.component.css'
})
export class RabbitmqServiceComponent implements OnInit, OnDestroy {
  clusters: RabbitmqCluster[] = [];
  currentUser!: User;
  
  startTime!: string;
  endTime!: string;
  subscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();
  
  searchText = '';
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' | 'none' = 'none';
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  inputPage: number = 1;
  totalItems: number = 0;
  sessionObject: Session = new Session();
  isLoading = false;
  skeletonRows = Array(10).fill(0);

  constructor(
    private authService: AuthenticationService,
    private applicationService: ApplicationService,
    private serviceIdService: ServiceIdService,
    private dateService: DateService,
    private rabbitmqService: RabbitmqService,
    private router: Router,
    private toast: HotToastService,
    private loggerService: LoggerService,
  ) { }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.currentUser = user;
      }
    });

    this.dateService.setActiveComponent('RabbitmqServiceComponent');
    this.subscription.add(
      this.dateService.activeComponent$.pipe(
        filter(activeComponent => activeComponent === 'RabbitmqServiceComponent'),
        switchMap(() => this.dateService.date$)
      ).subscribe((datemodel: any) => {
        this.startTime = this.formatDate(datemodel.startdateTime).toString();
        this.endTime = this.formatDate(datemodel.enddateTime).toString();
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
        if (this.currentUser) {
          this.getRabbitmqClusters();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatDate(date: any): number {
    return Number(date.toString().replace(/-/g, '').replace(/:/g, '').replace(' ', '').substring(0, 12));
  }

  getRabbitmqClusters() {
    this.isLoading = true;
    const featureType = sessionStorage.getItem("featureType") ?? 'RABBITMQ';
    
    this.applicationService.getFullApplicationData(this.currentUser.userId, featureType,this.sessionObject)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (appData: any) => {
          if (appData && appData.serviceStatus === 'Success') {
            const apps = appData.serviceResponse?.applications || [];
            const clusterNames = apps.map((app: any) => app.applicationName);
            if (clusterNames.length > 0) {
                this.getClusterDetails(clusterNames, apps);
            } else {
                this.clusters = [];
                this.isLoading = false;
            }
          } else {
            this.isLoading = false;
          }
        },
        error: () => this.isLoading = false
      });
  }

  getClusterDetails(clusterNames: string[], apps: any[] = []) {
    this.rabbitmqService.getAllClusterDetails(clusterNames, this.startTime, this.endTime)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (response: ServiceResponse<any>) => {
                if (response.serviceStatus === ServiceStatus.SUCCESS) {
                    this.clusters = (response.serviceResponse || []).map((cluster: any) => {
                        const matchedApp = apps.find((app: any) => app.applicationName === cluster.name);
                        return {
                            ...cluster,
                            applicationTechnology: matchedApp?.applicationTechnology,
                            applicationType: matchedApp?.applicationType
                        };
                    });
                } else {
                    // Fallback to basic cluster list from app names
                    this.clusters = apps.map((app: any) => ({
                        name: app.applicationName,
                        nodes: 0,
                        queues: 0,
                        channels: 0,
                        connections: 0,
                        messages: 0,
                        applicationTechnology: app.applicationTechnology,
                        applicationType: app.applicationType
                    }));
                }
                this.calculatePagination(this.clusters, this.searchText, ['name']);
                this.inputPage = this.currentPage;
                this.isLoading = false;
            },
            error: () => {
                // Fallback to basic cluster list from app names
                this.clusters = apps.map((app: any) => ({
                    name: app.applicationName,
                    nodes: 0,
                    queues: 0,
                    channels: 0,
                    connections: 0,
                    messages: 0,
                    applicationTechnology: app.applicationTechnology,
                    applicationType: app.applicationType
                }));
                this.calculatePagination(this.clusters, this.searchText, ['name']);
                this.inputPage = this.currentPage;
                this.isLoading = false;
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
    this.serviceIdService.setServiceId(serviceName);
    const encodedId = this.serviceIdService.getEncodedServiceId();
    this.router.navigate(['/message-queue/rabbitmq-service/cluster', encodedId], { queryParams: { 'tab': 'overview' } });
  }

  sortData(columnName: string) {
    if (this.sortColumn === columnName) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = columnName;
      this.sortDirection = 'asc';
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.inputPage = this.currentPage;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.inputPage = this.currentPage;
    }
  }

  goToPage() {
    let page = Number(this.inputPage);
    if (isNaN(page) || page < 1) page = 1;
    else if (page > this.totalPages) page = this.totalPages;

    this.currentPage = page;
    this.inputPage = page;
  }
  resetCurrentPage(data: any[], search: string, fields: string[]) {
    this.currentPage = 1;
    this.inputPage = 1;
    this.calculatePagination(data, search, fields);
  }

  calculatePagination(data: any[], search: string, fields: string[]) {
    if (!data) return;
    let filtered = data;
    if (search && fields.length > 0) {
      const lowerSearch = search.toLowerCase();
      filtered = data.filter(item =>
        fields.some(field => {
          const val = item[field];
          return val && val.toString().toLowerCase().includes(lowerSearch);
        })
      );
    }
    this.totalItems = filtered.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }
}
