import { Component, ChangeDetectionStrategy, inject, OnInit, Signal, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { User } from '../../../../models/user';
import { Session } from '../../../../models/session';
import { AuthenticationService } from '../../../../services/authentication.service';
import { ServiceIdService } from '../../../../services/service-id.service';
import { LoggerService } from '../../../../services/logger.service';
import { DatabaseService } from '../../../../services/database-api.service';
import { ApplicationService } from '../../../../services/application.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { SearchPipe } from "../../../../pipes/search.pipe";
import { SortPipe } from "../../../../pipes/sort.pipe";

@Component({
    selector: 'app-mssql-monitoring',
    imports: [CommonModule, FormsModule, SearchPipe, SortPipe],
    templateUrl: './mssql.component.html',
    styleUrls: ['./mssql.component.css']
})
export class MssqlComponent implements OnInit {


  user: User = new User();
  currentUser: User | null = null;
  sessionObject: Session = new Session();

  // Signals for reactive state
  ServiceNames: string[] = [];
  fullServiceData: any[] = [];
  pagedServiceData: any[] = [];

  searchText: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 6;
  totalPages: number = 0;
  sortparam: any;
  sortDirection = 'asc';
  page: number = 1;

  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private serviceIdService: ServiceIdService,
    private loggerService: LoggerService,
    private databaseService: DatabaseService,
    private applicationService: ApplicationService
  ) { }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => this.currentUser = user);
    this.getServiceName();
  }

  getServiceName(): void {
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

    this.applicationService.getFullApplicationData(
      this.user.userId, 'RELATIONAL', this.sessionObject
    ).subscribe({
      next: (data: any) => {
        if (data && data.serviceStatus === 'Success') {
          const apps = (data.serviceResponse?.applications || [])
            .filter((app: any) => (app.applicationTechnology || '').toUpperCase() === 'MSSQL');
          this.ServiceNames = apps.map((app: any) => app.applicationName);
        } else {
          this.ServiceNames = [];
        }
        this.fullServiceData = this.ServiceNames.map(name => this.generateMockData(name));
        this.calculatePagination();
      },
      error: (err) => {
        console.error('Error fetching MSSQL applications:', err);
        this.ServiceNames = [];
        this.fullServiceData = [];
        this.calculatePagination();
      }
    });
  }

  generateMockData(name: string): any {
    const random = (min: number, max: number, suffix = '') => {
      const val = Math.random() * (max - min) + min;
      return suffix === 'percent' ? `${val.toFixed(0)}%` : `${val.toFixed(2)} ${suffix}`;
    };

    const memoryGiB = parseFloat(random(6, 40, 'GiB').split(' ')[0]);
    return {
      name,
      status: 'UP',
      cpu: random(0, 20, 'percent'),
      memory: `${memoryGiB.toFixed(0)} GiB`,
      memoryUsage: Math.min(100, Math.floor((memoryGiB / 40) * 100)),
      tx: random(0.5, 100, 'KiB'),
      rx: random(0.5, 100, 'KiB'),
      started: `${Math.floor(Math.random() * 25) + 1} days`
    };
  }

  setServiceId(serviceId: string): void {
    this.serviceIdService.setServiceId(serviceId);
    const encodedId = this.serviceIdService.getEncodedServiceId();
    sessionStorage.setItem('databaseServiceId', serviceId);
    sessionStorage.setItem('encodedDatabaseServiceId', encodedId);
    this.router.navigate(['/database/mssql/service']);
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.fullServiceData.length / this.itemsPerPage);
    this.pagedServiceData = this.fullServiceData.slice(
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
  goToPage(page: number): void {
    this.currentPage = page;
    this.calculatePagination();
  }


  get totalPagesArray(): number[] {
    const visiblePages = 5;
    let start = Math.max(1, this.currentPage - Math.floor(visiblePages / 2));
    let end = Math.min(this.totalPages, start + visiblePages - 1);
    start = Math.max(1, end - visiblePages + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }


  sortBy(value: string) {
    if (this.sortparam === value) {
      // Same column clicked -> toggle direction
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New column clicked -> set new param and default to ascending
      this.sortparam = value;
      this.sortDirection = 'asc';
    }
  }


}
