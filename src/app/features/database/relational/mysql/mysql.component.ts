import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin, of, catchError, map } from 'rxjs';

import { User } from '../../../../models/user';
import { Session } from '../../../../models/session';
import { AuthenticationService } from '../../../../services/authentication.service';
import { ServiceIdService } from '../../../../services/service-id.service';
import { LoggerService } from '../../../../services/logger.service';
import { DatabaseService } from '../../../../services/database-api.service';
import { ApplicationService } from '../../../../services/application.service';
import { DateService } from '../../../../services/date.service';
import { DaysFormatPipe } from "../../../../pipes/days-format-pipe.pipe";

@Component({
  selector: 'app-mysql-monitoring',
  imports: [CommonModule, FormsModule, DaysFormatPipe],
  templateUrl: './mysql.component.html',
  styleUrls: ['./mysql.component.css']
})
export class MysqlComponent implements OnInit, OnDestroy {
  user: User = new User();
  currentUser: User | null = null;
  sessionObject: Session = new Session();

  private destroy$ = new Subject<void>();

  fullServiceData: any[] = [];
  pagedServiceData: any[] = [];
  searchText: string = '';

  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPages: number = 0;
  sortParam: string = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';
  startTime!: number;
  endTime!: number;
  dateSubscription: any;
  featureType: string = 'Relational';

  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private serviceIdService: ServiceIdService,
    private loggerService: LoggerService,
    private databaseService: DatabaseService,
    private applicationService: ApplicationService,
    private dateService: DateService

  ) { }

  ngOnInit(): void {
    this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
      if (user) { this.initializeComponent(); }
    });
    sessionStorage.setItem('featureType', this.featureType);
    // Subscribe to date changes
    this.dateSubscription = this.dateService.date$
      .pipe(takeUntil(this.destroy$))
      .subscribe(datemodel => {
        this.startTime = this.formatDate(datemodel.startdateTime);
        this.endTime = this.formatDate(datemodel.enddateTime);

        this.fetchUptimeMetrics();
      });

  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.dateSubscription) this.dateSubscription.unsubscribe();
    sessionStorage.removeItem('featureType');
  }


  private _prepareUserForServiceCall(): void {
    if (!this.currentUser) {
      console.error('No current user');
      return;
    }
    this.user = this.currentUser;
    this.user.sessionDTO = this.sessionObject;
    this.sessionObject.featureName = "RUAMBOT";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;
  }

  initializeComponent(): void {

    this._prepareUserForServiceCall();

    this.applicationService.getFullApplicationData(
      this.user.userId, this.featureType.toUpperCase(), this.sessionObject
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (data && data.serviceStatus === 'Success') {
          const apps = data.serviceResponse?.applications || [];
          this.fullServiceData = apps.map((app: any) => {
            const tech = (app.applicationTechnology || '').toUpperCase();
            let type: 'MYSQL' | 'MSSQL' | 'ORACLE' = 'MYSQL';
            if (tech === 'MSSQL') type = 'MSSQL';
            else if (tech === 'ORACLE') type = 'ORACLE';
            return {
              ...this.generateMockData(app.applicationName, type),
              applicationTechnology: app.applicationTechnology,
              applicationType: app.applicationType,
              applicationId: app.applicationId
            };
          });
        } else {
          this.fullServiceData = [];
        }

        if (this.startTime && this.endTime) {
          this.fetchUptimeMetrics();
        }

        this.updateDisplayData();
      },
      error: (err) => {
        console.error('Error fetching RELATIONAL applications:', err);
        this.fullServiceData = [];
        this.updateDisplayData();
      }
    });

  }

  private fetchUptimeMetrics(): void {
    const mysqlServiceNames = this.fullServiceData
      .filter(s => s.type === 'MYSQL')
      .map(s => s.name);
    const mssqlServiceNames = this.fullServiceData
      .filter(s => s.type === 'MSSQL')
      .map(s => s.name);
    const oracleServiceNames = this.fullServiceData
      .filter(s => s.type === 'ORACLE')
      .map(s => s.name);

    if ((!mysqlServiceNames.length && !mssqlServiceNames.length && !oracleServiceNames.length) || !this.startTime || !this.endTime) return;

    const mysqlUptime$ = mysqlServiceNames.length
      ? this.databaseService.getUptimeMetrics(mysqlServiceNames, this.startTime, this.endTime, 'MYSQL')
      : of({ serviceResponse: {} });

    const mssqlUptime$ = mssqlServiceNames.length
      ? this.databaseService.getUptimeMetrics(mssqlServiceNames, this.startTime, this.endTime, 'MSSQL')
      : of({ serviceResponse: {} });
    const oracleUptime$ = oracleServiceNames.length
      ? this.databaseService.getUptimeMetrics(oracleServiceNames, this.startTime, this.endTime, 'ORACLE')
      : of({ serviceResponse: {} });

    forkJoin([mysqlUptime$, mssqlUptime$, oracleUptime$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (responses: any[]) => {
          const [mysqlResponse, mssqlResponse, oracleResponse] = responses;

          const combinedResponse = {
            serviceResponse: {
              ...(mysqlResponse?.serviceResponse || {}),
              ...(mssqlResponse?.serviceResponse || {}),
              ...(oracleResponse?.serviceResponse || {})
            }
          };

          this.processUptimeResponse(combinedResponse);
        },
        (err) => console.error('Error fetching uptime metrics:', err)
      );
  }


  private processUptimeResponse(uptimeResponse: any): void {
    const serviceResponse = uptimeResponse?.serviceResponse || {};

    this.fullServiceData = this.fullServiceData.map(service => {
      const data = serviceResponse[service.name];
      if (data) {
        // Convert uptime (in seconds) → days (decimal)
        const uptimeInDays = data.uptime ? data.uptime / 86400 : 0;
        return {
          ...service,
          started: uptimeInDays,
          status: data.status ? 'UP' : 'DOWN'
        };
      }
      return service;
    });

    this.updateDisplayData();
  }

  formatDate(date: string) {
    date = date.replace(/-/g, '');
    date = date.replace(/:/g, '');
    date = date.replace(' ', '');
    return parseInt(date);
  }





  updateDisplayData(): void {
    const filteredData = this.fullServiceData.filter(item =>
      item.name.toLowerCase().includes(this.searchText.toLowerCase())
    );

    filteredData.sort((a, b) => {
      const valA = a[this.sortParam];
      const valB = b[this.sortParam];
      const comparison = valA > valB ? 1 : valA < valB ? -1 : 0;
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.totalPages = Math.ceil(filteredData.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.pagedServiceData = filteredData.slice(startIndex, startIndex + this.itemsPerPage);
  }

  sortBy(value: string): void {
    if (this.sortParam === value) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortParam = value;
      this.sortDirection = 'asc';
    }
    this.updateDisplayData();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateDisplayData();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateDisplayData();
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.updateDisplayData();
  }

  get totalPagesArray(): number[] {
    const visiblePages = 5;
    let start = Math.max(1, this.currentPage - Math.floor(visiblePages / 2));
    let end = Math.min(this.totalPages, start + visiblePages - 1);
    start = Math.max(1, end - visiblePages + 1);
    if (this.totalPages === 0) return [];
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  get startIndex(): number {
    return ((this.currentPage - 1) * this.itemsPerPage) + 1;
  }

  get endIndex(): number {
    return Math.min(
      this.currentPage * this.itemsPerPage,
      this.fullServiceData.filter(item => item.name.toLowerCase().includes(this.searchText.toLowerCase())).length
    );
  }

  get totalItems(): number {
    return this.fullServiceData.filter(item =>
      item.name.toLowerCase().includes(this.searchText.toLowerCase())
    ).length;
  }

  generateMockData(name: string, type: 'MYSQL' | 'MSSQL' | 'ORACLE'): any {
    const random = (min: number, max: number, suffix = '') => {
      const val = Math.random() * (max - min) + min;
      return suffix === 'percent' ? `${val.toFixed(0)}%` : `${val.toFixed(2)} ${suffix}`;
    };
    const memoryGiB = parseFloat(random(6, 40, 'GB').split(' ')[0]);
    return {
      name,
      status: 'Loading...',    // placeholder until API responds
      cpu: random(0, 20, 'percent'),
      memory: `${memoryGiB.toFixed(0)} GB`,
      memoryUsage: Math.min(100, Math.floor((memoryGiB / 40) * 100)),
      tx: random(0.5, 100, 'KB'),
      rx: random(0.5, 100, 'KB'),
      started: '...',          // placeholder
      type: type
    };
  }


  setServiceId(serviceId: string, dbType: 'MYSQL' | 'MSSQL' | 'ORACLE', appId?: any): void {
    this.serviceIdService.setServiceId(serviceId);
    const encodedId = this.serviceIdService.getEncodedServiceId();

    if (dbType === 'MYSQL') {
      sessionStorage.setItem('databaseServiceId', serviceId);
      sessionStorage.setItem('mySqlId', appId);
      sessionStorage.setItem('encodedDatabaseServiceId', encodedId);
      this.router.navigate(['/database/service']);
    } else if (dbType === 'MSSQL') {
      sessionStorage.setItem('databaseServiceId', serviceId);
      sessionStorage.setItem('msSqlId', appId);
      sessionStorage.setItem('encodedDatabaseServiceId', encodedId);
      this.router.navigate(['/database/mssql/service']);
    } else if (dbType === 'ORACLE') {
      sessionStorage.setItem('serviceIdForOracle', serviceId);
      sessionStorage.setItem('oracleId', appId);
      sessionStorage.setItem('encodedServiceIdForOracle', encodedId);
      this.router.navigate(['/oracle-monitoring/service']);
    }
  }

  getImagePath(tech: string | undefined | null, appType: string | undefined | null): string {
    const t = tech ? tech.trim().toLowerCase() : '';
    const a = appType ? appType.trim().toLowerCase() : '';
    return 'assets/images/' + (t || a || 'undefined') + '.png';
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/img/technologies/UNDEFINED.png';
  }

}