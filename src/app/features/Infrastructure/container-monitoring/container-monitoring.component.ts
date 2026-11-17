import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { DateService } from '../../../services/date.service';
import { InfraService } from '../../../services/infra.service';
import { LoggerService } from '../../../services/logger.service';
import { ServiceIdService } from '../../../services/service-id.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { ApplicationService } from '../../../services/application.service';
import { User } from '../../../models/user';
import { Session } from '../../../models/session';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
export let browserRefresh = false;

@Component({
    selector: 'app-container-monitoring',
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
    ],
    templateUrl: './container-monitoring.component.html',
    styleUrl: './container-monitoring.component.css'
})
export class ContainerMonitoringComponent implements OnInit, OnDestroy {

  user: User = new User();
  currentUser: User | null = null;

  sessionObject: Session = new Session();

  // subscription!: Subscription;
  private subscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;

  searchQuery = '';
  showSearch = false;

  currentPage = 1;
  itemsPerPage = 25;
  totalPages = 0;

  serviceIdContainer!: any;
  applicationNameMap: any;
  cpu_usage_arr: { [key: string]: any } = {};

  filteredContainerId: any[] = [];
  pagedContainerId: any[] = [];

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private router: Router,
    private dateService: DateService,
    private infraService: InfraService,
    private loggerService: LoggerService,
    private serviceIdService: ServiceIdService,
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
    this.dateService.setActiveComponent('ContainerMonitoringComponent');
    this.subscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'ContainerMonitoringComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.getServiceName();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  goToContainerStatus(): void {
    this.router.navigate(['/container0/container-status']);
  }

  setServiceId(event: MouseEvent): void {
    event.preventDefault();
    const aElement = event.target as HTMLElement;
    const serviceId = aElement.textContent?.trim();

    if (serviceId) {
      this.serviceIdService.setServiceId(serviceId);
      const encodedId = this.serviceIdService.getEncodedServiceId();
      sessionStorage.setItem('encodedServiceIdForContainer', encodedId);
      sessionStorage.setItem('serviceIdForContainer', serviceId);
      this.goToContainerStatus();
    } else {
      console.error('Service ID is undefined or empty');
    }
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.searchQuery = '';
      this.filteredContainerId = [...this.serviceIdContainer];
      this.calculatePagination();
    }
  }

  onSearch(): void {
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      this.filteredContainerId = this.serviceIdContainer.filter((container: string) => {
        const containerMatch = container.toLowerCase().includes(query);
        const appName = this.applicationNameMap[container] || '';
        const appMatch = appName.toLowerCase().includes(query);
        return containerMatch || appMatch;
      });
    } else {
      this.filteredContainerId = [...this.serviceIdContainer];
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

   
  }

  setCpuUsage(serviceName: string, usage: number | null | undefined): void {
    this.cpu_usage_arr[serviceName] = (usage !== null && usage !== undefined) ? usage.toFixed(2) : 'No Data';
  }


  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredContainerId.length / this.itemsPerPage);
    this.pagedContainerId = this.filteredContainerId.slice(
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
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredContainerId.length);
  }

  onSort(column: 'item' | 'cpu' | 'applicationName'): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredContainerId.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (column === 'cpu') {
        valA = parseFloat(this.cpu_usage_arr[a]) || 0;
        valB = parseFloat(this.cpu_usage_arr[b]) || 0;
        return this.sortDirection === 'asc' ? valA - valB : valB - valA;

      } else if (column === 'applicationName') {
        valA = this.applicationNameMap[a] || '';
        valB = this.applicationNameMap[b] || '';
      } else {
        // column === 'item'
        valA = a || '';
        valB = b || '';
      }

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
