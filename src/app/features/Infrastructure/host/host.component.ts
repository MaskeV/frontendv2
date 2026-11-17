import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { AuthenticationService } from '../../../services/authentication.service';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { DateService } from '../../../services/date.service';
import { filter, forkJoin, map, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { User } from '../../../models/user';
import { Session } from '../../../models/session';
import { LoggerService } from '../../../services/logger.service';
import { InfraService } from '../../../services/infra.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceIdService } from '../../../services/service-id.service';
import { ApplicationService } from '../../../services/application.service';
import { ApmApiService } from '../../../services/apm-api.service';
import * as bootstrap from 'bootstrap';

export let browserRefresh = false;

@Component({
  selector: 'app-host',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
  ],
  templateUrl: './host.component.html',
  styleUrl: './host.component.css'
})
export class HostComponent implements OnInit, OnDestroy, AfterViewInit {

  isLoading: boolean = true;

  user: User = new User();
  currentUser: User | null = null;

  sessionObject: Session = new Session();

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;
  thresholdst!: number;

  searchQuery = '';
  showSearch = false;

  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 0;

  serviceNameLinux!: any;
  cpu_usage_arr: { [key: string]: any } = {};
  ram_arr: { [key: string]: any } = {};
  disk_arr: { [key: string]: any } = {};

  filteredHostName: any[] = [];
  pagedHostName: any[] = [];

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  searchQuery2 = '';
  showSearch2 = false;

  currentPage2 = 1;
  itemsPerPage2 = 25;
  totalPages2 = 0;

  serviceNameWindows!: any;
  cpu_usage_arr2: { [key: string]: any } = {};

  filteredWindowName: any[] = [];
  pagedWindowName: any[] = [];

  sortColumn2: string = '';
  sortDirection2: 'asc' | 'desc' = 'asc';

  applicationNameMap: any;
  applicationNameMapWindows: any;

  osVersion: string | undefined;
  chassisVendorion: string | undefined;
  boardName: string | undefined;
  boardVendor: string | undefined;
  kernelVersion: string | undefined;
  biosVendor: string | undefined;
  biosVersion: string | undefined;
  hostName: string | undefined;
  chassisVendor: string | undefined
  systemVendor: string | undefined;
  productName: string | undefined;
  systemUptime: string | undefined;
  logicalCores: string | undefined;

  diskPercent: any;
  isSystemPropertiesLoading: boolean = false;
  systemPropertiesList: { label: string, value: any }[] = [];
  entityId!: string | null;
  serviceId!: string | null;
  infraId: string = '';
  infraHealthScore: { [key: string]: any } = {};

  healthScoreTitle: string = "Project Health Score = (Σ weightedScores of all metrics) / (Σ metricWeights), rounded to two decimal places. The weighted score is each metric’s status (Normal, Warning, Critical) weight multiplied by its metric weight."

  serviceHosts: { appId: string, ipAddressId: string, ipAddress: string, applicationName: string, ipType: string }[] = [];
  featureType: string = 'Host';

  constructor(
    private router: Router,
    private dateService: DateService,
    private infraService: InfraService,
    private loggerService: LoggerService,
    private serviceIdService: ServiceIdService,
    private authService: AuthenticationService,
    private applicationService: ApplicationService,
    private apmApiService: ApmApiService,
  ) { }

  ngOnInit(): void {
    this.authService.currentUser.subscribe((x) => (this.currentUser = x));
    this.subscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        browserRefresh = !this.router.navigated;
      }
    });
    this.dateService.setActiveComponent('HostComponent');
    sessionStorage.setItem('featureType', this.featureType);
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'HostComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.thresholdst = this.formatForThresholdDate(this.datemodel.startdateTime);
        this.getServiceName();
      });
  }

  ngOnDestroy(): void {
    this.datesubscription.unsubscribe();
    sessionStorage.removeItem('featureType');
  }

  ngAfterViewInit(): void {
    // this.getServiceName();
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  formatForThresholdDate(dateStr: string): number {
    const yyyy = parseInt(dateStr.substring(0, 4));
    const MM = parseInt(dateStr.substring(4, 6)) - 1;
    const dd = parseInt(dateStr.substring(6, 8));
    const hh = parseInt(dateStr.substring(8, 10));
    const mm = parseInt(dateStr.substring(10, 12));

    let inputDate = new Date(yyyy, MM, dd, hh, mm);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(inputDate);
    checkDate.setHours(0, 0, 0, 0);
    if (checkDate.getTime() === today.getTime()) {
      inputDate.setDate(inputDate.getDate() - 1);
    }

    const newYYYY = inputDate.getFullYear();
    const newMM = String(inputDate.getMonth() + 1).padStart(2, "0");
    const newDD = String(inputDate.getDate()).padStart(2, "0");
    const newHH = String(inputDate.getHours()).padStart(2, "0");
    const newMMm = String(inputDate.getMinutes()).padStart(2, "0");

    return parseInt(`${newYYYY}${newMM}${newDD}${newHH}${newMMm}`);
  }

  goToLinuxService(): void {
    this.router.navigate(['/infra/linux-service']);
  }

  setServiceId(event: any, ipAddress: string, ipAddressId: string): void {
    event.preventDefault();
    if (ipAddress && ipAddressId) {
      this.serviceIdService.setServiceId(ipAddress);
      const encodedId = this.serviceIdService.getEncodedServiceId();
      sessionStorage.setItem('encodedServiceIdForInfra', encodedId);
      sessionStorage.setItem('serviceIdForInfra', ipAddress);
      sessionStorage.setItem('ipAddressId', ipAddressId);
      sessionStorage.removeItem('serviceIdForWindow');
      if (this.logicalCores) {
        localStorage.setItem('logicalCores', this.logicalCores);
      }
      this.goToLinuxService();
    } else {
      console.error('Service ID is undefined or empty');
    }
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.searchQuery = '';
      this.filteredHostName = [...this.serviceNameLinux];
      this.calculatePagination();
    }
  }

  onSearch(): void {
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();

      this.filteredHostName = this.serviceHosts.filter((host: any) => {
        const ipMatch = host.ipAddress?.toLowerCase().includes(query);
        const appMatch = (host.applicationName || '').toLowerCase().includes(query);

        // Convert RAM and Disk values to string for searching
        const cpuValue = (this.cpu_usage_arr[host.ipAddress] || '').toString().toLowerCase();
        const ramValue = (this.ram_arr[host.ipAddress] || '').toString().toLowerCase();
        const diskValue = (this.disk_arr[host.ipAddress] || '').toString().toLowerCase();

        const cpuMatch = cpuValue.includes(query);
        const ramMatch = ramValue.includes(query);
        const diskMatch = diskValue.includes(query);

        return ipMatch || appMatch || cpuMatch || ramMatch || diskMatch;
      });
    } else {
      this.filteredHostName = [...this.serviceHosts];
    }
    this.calculatePagination();
  }

  getImagePath(tech: string | undefined | null, appType: string | undefined | null, ipType?: string | null): string {
    const t = tech ? tech.trim().toLowerCase() : '';
    const a = appType ? appType.trim().toLowerCase() : '';
    const ip = ipType ? ipType.trim().toLowerCase() : '';
    return 'assets/images/' + (t || ip || a || 'undefined') + '.png';
  }

  isLoadingHost: boolean = false;

  getServiceName(): void {
    this.isLoading = true;
    this.isLoadingHost = true;

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

    this.applicationService.getFullApplicationData(this.user.userId, featureType, this.user.sessionDTO)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (appData: any) => {
          if (!appData || appData.serviceStatus?.toUpperCase() !== 'SUCCESS') {
            console.error("Failed to load host applications:", appData);
            this.isLoadingHost = false;
            return;
          }

          const applications = appData.serviceResponse?.applications;
          const ipList = appData.serviceResponse?.ipList;

          if (!Array.isArray(applications) || applications.length === 0) {
            console.error("No applications found:", appData);
            this.isLoadingHost = false;
            return;
          }

          const appMap = new Map<number, any>();
          applications.forEach((app: any) => {
            appMap.set(app.applicationId, app);
          });

          this.serviceHosts = (ipList || [])
            .filter((ip: any) => appMap.has(ip.applicationId))
            .map((ip: any) => {
              const app = appMap.get(ip.applicationId);
              return {
                appId: ip.applicationId,
                ipAddressId: ip.ipAddressId,
                ipAddress: ip.ipAddress,
                applicationName: ip.applicationName || app?.applicationName || 'Unknown',
                ipType: ip.ipType ?? app?.applicationTechnology ?? 'LINUX',
                applicationTechnology: app?.applicationTechnology,
                applicationType: app?.applicationType
              };
            });

          this.filteredHostName = [...this.serviceHosts];
          this.pagedHostName = [...this.serviceHosts];
          this.calculatePagination();

          if (this.serviceHosts.length === 0) {
            this.isLoadingHost = false;
            return;
          }

          // Step 3: Fetch metrics for all hosts
          const hostList = this.serviceHosts.map(host => ({
            appId: host.appId,
            infraId: host.ipAddressId,
            ip: host.ipAddress,
            type: host.ipType.toLowerCase()
          }));

          this.infraService
            .getInfraMetricsForAllHosts(hostList, this.startTime, this.endTime)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (metricsList: any[]) => {
                if (Array.isArray(metricsList)) {
                  metricsList.forEach(item => {
                    const ip = item.ip;
                    this.setCpuUsage(ip, item.cpu_usage ?? 0);
                    this.setRam(ip, item.memory_ram_usage?.toFixed(2) ?? null);
                    this.setDisk(ip, item.disk_usage ?? 0);
                    this.infraHealthScore[ip] = item.health_score ?? 'No Data';
                  });
                }
                this.isLoadingHost = false;
              },
              error: (err: any) => {
                console.error("Failed to load infra metrics:", err);
                this.isLoadingHost = false;
              }
            });
        },
        error: (err: any) => {
          console.error("Failed to load host data:", err);
          this.isLoadingHost = false;
        }
      });
  }

  getDiscPercent(serviceId: any): void {
    let service_id = btoa(serviceId) + '.1';

    this.infraService.getDiscSpace(service_id, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (!data || typeof data !== "object") {
            console.error("Invalid disk space response:", data);
            this.diskPercent = 0;
            return;
          }

          const partitions: any[] = Object.values(data);

          if (!Array.isArray(partitions) || partitions.length === 0) {
            console.error("Disk partitions missing or invalid:", partitions);
            this.diskPercent = 0;
            return;
          }

          const hasNegative = partitions.some((item: any) =>
            Object.values(item).some(
              (val) =>
                (typeof val === "string" &&
                  !isNaN(Number(val)) &&
                  Number(val) < 0) ||
                (typeof val === "number" && val < 0)
            )
          );

          if (hasNegative) {
            console.error("Negative values found in disk data. Ignoring response:", partitions);
            this.diskPercent = 0;
            return;
          }

          // ✔ Find root partition
          const rootPartition = partitions.find(
            (item: any) => item.name?.trim() === "/"
          );

          if (rootPartition) {
            const used = Number(rootPartition[" used"]?.trim());
            const total = Number(rootPartition[" total"]?.trim());
            this.diskPercent = Math.round((used / total) * 100);
          } else {
            console.error("Root partition '/' not found in disk response.");
            this.diskPercent = 0;
          }
        },
        error: (err) => {
          console.error("Failed to load disk space:", err);
          this.diskPercent = 0;
        }
      });
  }

  formatSystemPropertyKey(key: string): string {
    const specialMap: { [key: string]: string } = {
      hostname: 'Host Name',
      os_version: 'OS Version',
      kernel_version: 'Kernel Version',
      system_uptime: 'System Uptime',
      logical_cores: 'Logical Cores',
      cpu_model: 'CPU Model',
      physical_cores: 'Physical Cores',
      ip_address: 'IP Address',
      architecture: 'Architecture',
      location: 'Location',
      board_name: 'Board Name',
      board_vendor: 'Board Vendor',
      product_name: 'Product Name',
      bios_vendor: 'BIOS Vendor',
      bios_version: 'BIOS Version',
      system_vendor: 'System Vendor',
      chassis_vendor: 'Chassis Vendor'
    };

    if (specialMap[key]) {
      return specialMap[key];
    }
    const lowerKey = key.toLowerCase();
    if (specialMap[lowerKey]) {
      return specialMap[lowerKey];
    }

    return key
      .split('_')
      .map(word => {
        if (['cpu', 'os', 'bios', 'ip', 'ram'].includes(word.toLowerCase())) {
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  getSystemProperties(serviceId: any, type: any): void {
    this.isSystemPropertiesLoading = true;
    this.systemPropertiesList = [];

    // Clear old values to prevent stale display
    this.hostName = undefined;
    this.osVersion = undefined;
    this.chassisVendor = undefined;
    this.boardName = undefined;
    this.boardVendor = undefined;
    this.productName = undefined;
    this.kernelVersion = undefined;
    this.biosVendor = undefined;
    this.biosVersion = undefined;
    this.systemVendor = undefined;
    this.systemUptime = undefined;
    this.logicalCores = undefined;

    if (type === 'LINUX') {
      let service_id = btoa(serviceId) + '.1';
      this.infraService
        .getSystemProperties(service_id, this.startTime, this.endTime, "linux")
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data: any) => {
            this.isSystemPropertiesLoading = false;
            // Validate structure
            if (!data || typeof data !== "object" || Array.isArray(data)) {
              console.error("Invalid system properties response:", data);
              return;
            }

            // Detect negative values (only numeric-looking fields)
            const hasNegative = Object.values(data).some(val =>
              (typeof val === "number" && val < 0) ||
              (typeof val === "string" && !isNaN(Number(val)) && Number(val) < 0)
            );

            if (hasNegative) {
              console.error("Negative values found in system properties. Ignoring response:", data);
              return;
            }

            this.hostName = data.hostname;
            this.osVersion = data.os_version;
            this.chassisVendor = data.chassis_vendor;
            this.boardName = data.board_name;
            this.boardVendor = data.board_vendor;
            this.productName = data.product_name;
            this.kernelVersion = data.kernel_version;
            this.biosVendor = data.bios_vendor;
            this.biosVersion = data.bios_version;
            this.systemVendor = data.system_vendor;
            this.systemUptime = data.system_uptime;
            this.logicalCores = data.logical_cores;

            // Populate dynamic list
            for (const key of Object.keys(data)) {
              const value = data[key];
              if (value !== null && value !== undefined && String(value).trim() !== '') {
                this.systemPropertiesList.push({
                  label: this.formatSystemPropertyKey(key),
                  value: value
                });
              }
            }
          },
          error: (err) => {
            this.isSystemPropertiesLoading = false;
            console.error("Failed to load system properties:", err);
          }
        });
    }
    else if (type === 'WINDOWS') {
      let service_id = btoa(serviceId) + '.1';
      this.infraService
        .getSystemProperties(service_id, this.startTime, this.endTime, "windows")
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data: any) => {
            this.isSystemPropertiesLoading = false;
            // Validate structure
            if (!data || typeof data !== "object" || Array.isArray(data)) {
              console.error("Invalid system properties response:", data);
              return;
            }

            // Detect negative values
            const hasNegative = Object.values(data).some(val =>
              (typeof val === "number" && val < 0) ||
              (typeof val === "string" && !isNaN(Number(val)) && Number(val) < 0)
            );

            if (hasNegative) {
              console.error("Negative values found in system properties. Ignoring response:", data);
              return;
            }

            this.hostName = data.hostname;
            this.osVersion = data.os_version;
            this.chassisVendor = data.chassis_vendor;
            this.boardName = data.board_name;
            this.boardVendor = data.board_vendor;
            this.productName = data.product_name;
            this.kernelVersion = data.kernel_version;
            this.biosVendor = data.bios_vendor;
            this.biosVersion = data.bios_version;
            this.systemVendor = data.system_vendor;
            this.systemUptime = data.system_uptime;
            this.logicalCores = data.logical_cores;

            // Populate dynamic list
            for (const key of Object.keys(data)) {
              const value = data[key];
              if (value !== null && value !== undefined && String(value).trim() !== '') {
                this.systemPropertiesList.push({
                  label: this.formatSystemPropertyKey(key),
                  value: value
                });
              }
            }
          },
          error: (err) => {
            this.isSystemPropertiesLoading = false;
            console.error("Failed to load system properties:", err);
          }
        });
    }
  }

  get hasData(): boolean {
    return this.isSystemPropertiesLoading || this.systemPropertiesList.length > 0;
  }


  setCpuUsage(serviceName: string, usage: number | null | undefined): void {
    this.cpu_usage_arr[serviceName] = (usage !== null && usage !== undefined) ? usage.toFixed(2) : 'No Data';
  }

  setRam(serviceName: string, usage: string | null | undefined): void {
    this.ram_arr[serviceName] = (usage !== null && usage !== undefined) ? usage : 'No Data';
  }

  setDisk(serviceName: string, usage: string | null | undefined): void {
    this.disk_arr[serviceName] = (usage !== null && usage !== undefined) ? usage : 'No Data';
  }


  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredHostName.length / this.itemsPerPage);
    this.pagedHostName = this.filteredHostName.slice(
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

  get startIndex(): number {
    return ((this.currentPage - 1) * this.itemsPerPage) + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredHostName.length);
  }

  onSort(column: 'item' | 'cpu' | 'applicationName' | 'ram' | 'disk' | 'healthScore'): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredHostName.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (column === 'cpu') {
        valA = parseFloat(this.cpu_usage_arr[a.ipAddress]) || 0;
        valB = parseFloat(this.cpu_usage_arr[b.ipAddress]) || 0;
        return this.sortDirection === 'asc' ? valA - valB : valB - valA;

      } else if (column === 'applicationName') {
        valA = a.applicationName || '';
        valB = b.applicationName || '';

      } else if (column === 'ram') {
        valA = parseFloat(this.ram_arr[a.ipAddress]) || 0;
        valB = parseFloat(this.ram_arr[b.ipAddress]) || 0;
        return this.sortDirection === 'asc' ? valA - valB : valB - valA;

      } else if (column === 'disk') {
        valA = parseFloat(this.disk_arr[a.ipAddress]) || 0;
        valB = parseFloat(this.disk_arr[b.ipAddress]) || 0;
        return this.sortDirection === 'asc' ? valA - valB : valB - valA;

      } else if (column === 'healthScore') {
        valA = parseFloat(this.infraHealthScore[a.ipAddress]) || 0;
        valB = parseFloat(this.infraHealthScore[b.ipAddress]) || 0;
        return this.sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      else {
        valA = a.ipAddress || '';
        valB = b.ipAddress || '';
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

  goToWindowService(): void {
    this.router.navigate(['/infra/window-service']);
  }

  setServiceIdWindows(event: MouseEvent, ipAddressId: string): void {
    event.preventDefault();
    const aElement = event.target as HTMLElement;
    const serviceId = aElement.textContent?.trim();

    if (serviceId) {
      this.serviceIdService.setServiceId(serviceId);
      const encodedId = this.serviceIdService.getEncodedServiceId();
      sessionStorage.setItem('encodedServiceIdForWindow', encodedId);
      sessionStorage.setItem('serviceIdForWindow', serviceId);
      sessionStorage.setItem('ipAddressId', ipAddressId);
      sessionStorage.removeItem('serviceIdForInfra');
      this.goToWindowService();
    } else {
      console.error('Service ID is undefined or empty');

    }
  }



}
