import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationStart, RouterModule } from '@angular/router';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { ApplicationService } from '../../../services/application.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { DateService } from '../../../services/date.service';
import { LoggerService } from '../../../services/logger.service';
import { Session } from '../../../models/session';
import { User } from '../../../models/user';
import { ServiceIdService } from '../../../services/service-id.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
export let browserRefresh = false;

@Component({
  standalone: true,
  selector: 'app-rds',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
  ],
  templateUrl: './rds.component.html',
  styleUrls: ['./rds.component.css']
})
export class RdsComponent implements OnInit, OnDestroy {
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

  currentPage = 1;
  itemsPerPage = 25;
  totalPages = 0;

  serviceIdRds!: any;
  filteredServiceId: any[] = [];
  pagedServiceId: any[] = [];

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';


  constructor(
    private router: Router,
    private dateService: DateService,
    private loggerService: LoggerService,
    private serviceIdService: ServiceIdService,
    private authService: AuthenticationService,
    private applicationService: ApplicationService,
  ) { }

  ngOnInit(): void {
    sessionStorage.setItem('featureType', 'RDS');
    this.authService.currentUser.subscribe((x) => (this.currentUser = x));
    this.subscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        browserRefresh = !this.router.navigated;
      }
    });
    this.dateService.setActiveComponent('RdsComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'RdsComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.getServiceName();
      });
  }

  ngOnDestroy(): void {
    this.datesubscription.unsubscribe();
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  setServiceId(serviceId: string): void {
    if (serviceId) {
      this.serviceIdService.setServiceId(serviceId);
      const encodedId = this.serviceIdService.getEncodedServiceId();
      sessionStorage.setItem('encodedServiceIdForRds', encodedId);
      sessionStorage.setItem('serviceIdForRds', serviceId);
      this.router.navigate(['/rds/rds-service']);
    } else {
      console.error('Service ID is undefined or empty');
    }
  }

  onSearch(): void {
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      this.filteredServiceId = this.serviceIdRds.filter((container: any) => {
        const containerMatch = container.applicationName?.toLowerCase().includes(query);
        return containerMatch;
      });
    } else {
      this.filteredServiceId = [...this.serviceIdRds];
    }
    this.calculatePagination();
  }

  getServiceName(): void {
    if (this.currentUser) {
      this.user = this.currentUser;
    }
    this.user.sessionDTO = this.sessionObject;

    this.sessionObject.featureName = "RUAMBOT";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

    const featureType = sessionStorage.getItem('featureType') ?? '';
    this.applicationService.getFullApplicationData(this.user.userId, featureType, this.sessionObject).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.serviceIdRds = data.serviceResponse?.applications || [];
      this.filteredServiceId = [...this.serviceIdRds];
      this.pagedServiceId = [...this.filteredServiceId];

      this.calculatePagination();
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

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredServiceId.length / this.itemsPerPage);
    this.pagedServiceId = this.filteredServiceId.slice(
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
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredServiceId.length);
  }

  onSort(column: 'item'): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredServiceId.sort((a, b) => {
      let valA: any;
      let valB: any;

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
