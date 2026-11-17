import { Component, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { User } from '../../../models/user';
import { Session } from '../../../models/session';
import { first, forkJoin, of, Subject, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Router, RouterModule } from '@angular/router';
import { LoggerService } from '../../../services/logger.service';
import { ApplicationService } from '../../../services/application.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DecoderService } from '../../../services/decoder.service';
import { UserTypeCrudMapObject } from '../../../models/UserTypeCrudMapObject';
import { NetworkService } from '../../../services/network.service';
import { filter, switchMap, takeUntil } from 'rxjs/operators';
import { DateService } from '../../../services/date.service';



@Component({
  selector: 'app-network',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
  ],
  templateUrl: './network.component.html',
  styleUrl: './network.component.css'
})
export class NetworkComponent implements OnInit, OnDestroy {

  user: User = new User();
  currentUser: User | null = null;
  userTypeCrudMap = new UserTypeCrudMapObject();

  sessionObject: Session = new Session();

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;

  searchQuery = '';
  showSearch = false;

  currentPage = 1;
  itemsPerPage = 25;
  totalPages = 0;

  networkData!: any;

  selectedRow: string | null = null;
  errorModalRef: any;

  showErrorModal = false;

  filteredNetworkName: any[] = [];
  pagedNetworkName: any[] = [];

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  iconMap: { [key: string]: string } = {
    firewall: 'assets/images/firewall.png',
    router: 'assets/images/wifi-router.png',
    switch: 'assets/images/switch.png',

  };


  constructor(
    private router: Router,
    private loggerService: LoggerService,
    private applicationService: ApplicationService,
    private decoderService: DecoderService,
    private networkService: NetworkService,
    private dateService: DateService,


  ) { }
  ngOnInit(): void {

    this.user = this.decoderService.decryptJson(
      JSON.parse(sessionStorage.getItem('currentUser')!)
    ) as User;

    this.currentUser = this.currentUser ?? {} as User;

    this.currentUser.userId = this.user.userId;

    this.sessionObject.featureName = "Network";
    this.sessionObject.menu = "Infrastructure";
    this.sessionObject.configTab = "Network Monitoring";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName =
      this.loggerService.getBrowserNameAndVersion().name;

    this.sessionObject.browserVersion =
      this.loggerService.getBrowserNameAndVersion().version;

    // ✅ SAME DATE FLOW AS NETWORK-DATA COMPONENT

    this.dateService.setActiveComponent('NetworkComponent');

    this.datesubscription = this.dateService.activeComponent$
      .pipe(
        filter(activeComponent => activeComponent === 'NetworkComponent'),
        switchMap(() => this.dateService.date$),
        takeUntil(this.destroy$)
      )
      .subscribe((dates: any) => {

        this.datemodel = dates;

        this.startTime =
          this.formatDate(this.datemodel.startdateTime);

        this.endTime =
          this.formatDate(this.datemodel.enddateTime);

        console.log('NETWORK PAGE START:', this.startTime);
        console.log('NETWORK PAGE END:', this.endTime);

        if (this.userTypeCrudMap.view) {
          this.getAllNetworkHost();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
  }

  // Last 30 min ka default window — yyyyMMddHHmm format
  setDefaultDateRange(): void {
    const now = new Date();
    const past = new Date(now.getTime() - 30 * 60 * 1000); // 30 min pehle

    const toNum = (d: Date): number => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const str = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}00`;
      return parseInt(str);
    };

    this.startTime = toNum(past);
    this.endTime = toNum(now);
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  goToNetworkData(): void {
    this.router.navigate(['/network/network-data']);
  }

  setServiceId(event: MouseEvent): void {
    event.preventDefault();
    const aElement = event.target as HTMLElement;
    const serviceId = aElement.textContent?.trim();

    if (serviceId) {
      sessionStorage.setItem('HostName', serviceId);
      this.goToNetworkData();
    } else {
      console.error('Service ID is undefined or empty');
    }
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.searchQuery = '';
      this.filteredNetworkName = [...this.networkData];
      this.calculatePagination();
    }
  }

  onSearch(): void {
    const query = this.searchQuery?.toLowerCase() || '';
    this.filteredNetworkName = query
      ? this.networkData.filter((network: any) => network.name.toLowerCase().includes(query))
      : [...this.networkData];
    this.calculatePagination();
  }

  getAllNetworkHost(): void {
    if (this.currentUser === null) {
      console.error('Error: currentUser is null');
      return;
    }

    this.currentUser.sessionDTO = this.sessionObject;

    this.applicationService.getAllNetworkHost(this.currentUser)
      .pipe(first())
      .subscribe((response: any) => {
        if (response.serviceStatus === 'Success') {
          const hostList = response.serviceResponse || [];

          // Step 1: pehle saare hosts map karo — existing flow same
          const mappedList = hostList.map((item: any) => ({
            ...item,
            name: item.name || item.host || item.ipAddress,
            overallHealth: 'Loading...'
          }));

          this.networkData = mappedList;
          this.filteredNetworkName = [...this.networkData];
          this.pagedNetworkName = [...this.filteredNetworkName];
          this.calculatePagination();

          // Step 2: koi host nahi toh return
          if (mappedList.length === 0) return;

          // Step 3: parallel forkJoin — har host ke liye getGraphItemsByHostAndDT
          const healthRequests = mappedList.map((item: any) =>
            this.networkService
              .getGraphItemsByHostAndDT(item.name, this.startTime, this.endTime)
              .pipe(
                map((res: any) => {
                  const ports: any[] = res?.serviceResponse || [];
                  const hasDown = ports.some(
                    (p: any) => (p.status || '').toLowerCase() === 'down'
                  );
                  const upCount = ports.filter(
                    (p: any) => (p.status || '').toLowerCase() === 'up'
                  ).length;

                  const downCount = ports.filter(
                    (p: any) => (p.status || '').toLowerCase() === 'down'
                  ).length;

                  const unknownCount = ports.filter(
                    (p: any) => {
                      const s = (p.status || '').toLowerCase();
                      return s !== 'up' && s !== 'down';
                    }
                  ).length;

                  const hasIdlePort = ports.some(
                    (p: any) => (p.status || '').toLowerCase() === 'up' && (parseFloat(p.total) || 0) === 0
                  );

                  let overallHealth: string;
                  if (ports.length === 0) {
                    overallHealth = 'Unknown';
                  } else if (downCount > 0) {
                    overallHealth = 'Down';
                  } else if (hasIdlePort) {
                    overallHealth = 'Up-Idle'; // koi bhi ek port Up + total 0
                  } else if (upCount > 0) {
                    overallHealth = 'Up-Active'; // sab Up aur sab active
                  } else {
                    overallHealth = 'Unknown';
                  }
                  return { name: item.name, overallHealth, upCount, downCount, unknownCount };
                }),
                catchError(() =>
                  of({ name: item.name, overallHealth: 'Unknown' })
                )
              )
          );

          forkJoin(healthRequests).subscribe((results: unknown) => {
            const typedResults = results as any[];

            // overallHealth inject karo — baaki sab untouched
            const healthMap: { [name: string]: string } = {};
            typedResults.forEach((r: any) => healthMap[r.name] = r.overallHealth);

            this.networkData = this.networkData.map((item: any) => {

              const health = typedResults.find(
                (x: any) => x.name === item.name
              );

              return {
                ...item,

                overallHealth:
                  health?.overallHealth ?? 'Unknown',

                upCount:
                  health?.upCount ?? 0,

                downCount:
                  health?.downCount ?? 0,

                unknownCount:
                  health?.unknownCount ?? 0
              };
            });

            this.filteredNetworkName = [...this.networkData];
            this.filteredNetworkName.sort((a: any, b: any) => {

              const order: any = {
                'Down': 1,
                'Up-Active': 2,
                'Up-Idle': 3,
                'Unknown': 4
              };

              return order[a.overallHealth] - order[b.overallHealth];
            });
            this.pagedNetworkName = this.filteredNetworkName.slice(
              (this.currentPage - 1) * this.itemsPerPage,
              this.currentPage * this.itemsPerPage
            );
          });

        } else {
          this.networkData = [];
          this.filteredNetworkName = [];
          this.pagedNetworkName = [];
          this.calculatePagination();
        }
      }, (error) => {
        console.error('Error fetching network data:', error);
        this.networkData = [];
        this.filteredNetworkName = [];
        this.pagedNetworkName = [];
        this.calculatePagination();
      });
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredNetworkName.length / this.itemsPerPage);
    this.pagedNetworkName = this.filteredNetworkName.slice(
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
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredNetworkName.length);
  }

  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredNetworkName.sort((a, b) => {
      const valueA = a[column];
      const valueB = b[column];

      if (valueA == null || valueB == null) return 0;

      let comparison: number;

      const dateRegex = /^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/;
      const isDate = dateRegex.test(valueA) && dateRegex.test(valueB);

      if (isDate) {
        const parseDate = (value: string) => {
          const [datePart, timePart] = value.split(', ');
          const [day, month, year] = datePart.split('/').map(Number);
          const [hour, minute, second] = timePart.split(':').map(Number);
          return new Date(year, month - 1, day, hour, minute, second);
        };
        const dateA = parseDate(valueA);
        const dateB = parseDate(valueB);
        comparison = dateA.getTime() - dateB.getTime();
      } else if (typeof valueA === 'number' && typeof valueB === 'number') {
        comparison = valueA - valueB;
      } else {
        comparison = valueA.toString().localeCompare(valueB.toString(), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.currentPage = 1;
    this.calculatePagination();
  }

  openErrorModal(errorDetails: string) {
    this.selectedRow = errorDetails;
    this.showErrorModal = true;
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.selectedRow = null;
  }

  reset(): void {
    this.selectedRow = null; // Clear the selected command
  }

  getRowIcon(name: string): string {
    if (name.toLowerCase().includes("firewall")) {
      return this.iconMap["firewall"];
    } else if (name.toLowerCase().includes("router")) {
      return this.iconMap["router"];
    } else if (name.toLowerCase().includes("switch")) {
      return this.iconMap["switch"];
    }
    return 'assets/img/technologies/default.png'; // fallback
  }

}