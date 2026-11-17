import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationStart, RouterModule } from '@angular/router';
import { Subject, Subscription, forkJoin, of } from 'rxjs';
import { filter, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Session } from '../../../models/session';
import { User } from '../../../models/user';
import { AuthenticationService } from '../../../services/authentication.service';
import { BrowserApiService } from '../../../services/browser-api.service';
import { DateService } from '../../../services/date.service';
import { LoggerService } from '../../../services/logger.service';
import { ServiceIdService } from '../../../services/service-id.service';
import { ApplicationService } from '../../../services/application.service';

export let browserRefresh = false;

@Component({
  selector: 'app-browser-monitoring',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, RouterModule, MatTooltipModule],
  templateUrl: './browser-monitoring.component.html',
  styleUrls: ['./browser-monitoring.component.css']
})
export class BrowserMonitoringComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  private datesubscription!: Subscription;
  private subscription!: Subscription;

  ServiceNames: string[] = [];
  filteredServiceNames: string[] = [];
  pagedTableData: any[] = [];
  combinedData: Record<string, any> = {};
  searchText = '';
  currentPage = 1;
  itemsPerPage = 15;
  totalPages = 0;
  startTime!: number;
  endTime!: number;

  currentUser!: User;
  user: User = new User();
  sessionObject: Session = new Session();
  datemodel: any;
  featureType: string = 'BRUM';
  appTechMap = new Map<string, any>();

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  isLoading: boolean = false;

  constructor(
    private browserApiService: BrowserApiService,
    private dateService: DateService,
    private router: Router,
    private authService: AuthenticationService,
    private loggerService: LoggerService,
    private serviceIdService: ServiceIdService,
    private applicationService: ApplicationService
  ) { }

  ngOnInit(): void {
    sessionStorage.setItem('featureType', 'BRUM');
    this.featureType = 'BRUM';

    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.currentUser = user ?? new User();
      });

    this.subscription = this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          browserRefresh = !this.router.navigated;
        }
      });

    this.dateService.setActiveComponent('BrowserMonitoringComponent');
    this.datesubscription = this.dateService.activeComponent$
      .pipe(
        filter(active => active === 'BrowserMonitoringComponent'),
        switchMap(() => this.dateService.date$),
        takeUntil(this.destroy$)
      )
      .subscribe((dates) => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);

        this.user = this.currentUser;
        this.user.sessionDTO = this.sessionObject;

        this.sessionObject.featureName = 'RUAMBOT';
        this.sessionObject.requestURI = this.router.url.split('?')[0];
        this.sessionObject.userId = this.user.userId || '';
        this.sessionObject.loginTime = sessionStorage.getItem('loginTime') || '';
        this.sessionObject.sessionId = sessionStorage.getItem('sessionId') || '';
        this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
        this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

        this.getServiceNames();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription?.unsubscribe();
    this.subscription?.unsubscribe();
  }

  formatDate(date: string): number {
    if (!date) return 0;
    return parseInt(date.replace(/[-:\s]/g, ''), 10);
  }

  getServiceNames(): void {
    this.isLoading = true;

    this.applicationService
      .getFullApplicationData(this.currentUser.userId, this.featureType, this.currentUser.sessionDTO)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        if (response && response.serviceStatus?.toUpperCase() === 'SUCCESS') {
          const apps = response.serviceResponse.applications || [];
          this.appTechMap = new Map<string, any>();
          apps.forEach((app: any) => {
            this.appTechMap.set(app.applicationName, {
              technology: app.applicationTechnology,
              type: app.applicationType
            });
          });
          this.ServiceNames = apps.map((app: any) => app.applicationName);
        } else {
          this.ServiceNames = [];
        }

        const requests = this.ServiceNames.map((serviceName: string) => {
          const service_id = btoa(serviceName) + '.1';
          return this.browserApiService.getCombinedDataService(service_id, this.startTime, this.endTime)
            .pipe(
              takeUntil(this.destroy$),
              catchError(err => {
                console.error(`Error fetching data for ${serviceName}:`, err);
                return of(null);
              })
            );
        });

        forkJoin(requests).subscribe((results: any[]) => {
          results.forEach((res, index) => {
            const serviceName = this.ServiceNames[index];
            const details = this.appTechMap.get(serviceName) || { technology: '', type: '' };
            this.combinedData[serviceName] = {
              errorRate: res?.error_rate ?? null,
              pv: res?.pv ?? null,
              serviceName,
              applicationTechnology: details.technology,
              applicationType: details.type
            };
          });

          this.applySearchFilter();
          this.isLoading = false;
        });
      });
  }

  applySearchFilter(): void {
    if (this.searchText.trim()) {
      this.filteredServiceNames = this.ServiceNames.filter(name =>
        name.toLowerCase().includes(this.searchText.toLowerCase())
      );
    } else {
      this.filteredServiceNames = [...this.ServiceNames];
    }
    this.currentPage = 1;

    if (this.sortColumn) {
      this.filteredServiceNames.sort((a, b) => {
        const valA = this.combinedData[a]?.[this.sortColumn];
        const valB = this.combinedData[b]?.[this.sortColumn];

        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;

        const compare = valA.toString().localeCompare(valB.toString(), undefined, { numeric: true, sensitivity: 'base' });
        return this.sortDirection === 'asc' ? compare : -compare;
      });
    }

    this.calculatePagination();
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredServiceNames.length / this.itemsPerPage);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = this.currentPage * this.itemsPerPage;
    this.pagedTableData = this.filteredServiceNames.slice(start, end).map(name => this.combinedData[name]);
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
    const p = parseInt(page, 10);
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
      this.calculatePagination();
    }
  }

  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredServiceNames.sort((a, b) => {
      const valA = this.combinedData[a]?.[column];
      const valB = this.combinedData[b]?.[column];

      if (!valA && !valB) return 0;
      if (!valA) return 1;
      if (!valB) return -1;

      const compare = valA.toString().localeCompare(valB.toString(), undefined, { numeric: true, sensitivity: 'base' });
      return this.sortDirection === 'asc' ? compare : -compare;
    });

    this.currentPage = 1;
    this.calculatePagination();
  }

  get startIndex(): number {
    return this.filteredServiceNames.length === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredServiceNames.length);
  }

  setServiceId(serviceName: string): void {
    this.serviceIdService.setServiceId(serviceName);
    const encodedId = this.serviceIdService.getEncodedServiceId();
    sessionStorage.setItem('encodedServiceIdforBrowser', encodedId);
    this.router.navigate(['browser/browser-service']);
  }

  getLogoPath(tech: string | undefined | null, appType: string | undefined | null): string {
    const t = tech ? tech.trim().toLowerCase() : '';
    const a = appType ? appType.trim().toLowerCase() : '';
    return (t || a || 'undefined') + '.png';
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/img/technologies/UNDEFINED.png';
  }
}