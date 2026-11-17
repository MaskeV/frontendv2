import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KubernetesService } from '../../../../services/kubernetes.service';
import { filter, Subject, Subscription, switchMap } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-services-dashboard',
    imports: [CommonModule, FormsModule],
    templateUrl: './services-dashboard.component.html',
    styleUrl: './services-dashboard.component.css'
})
export class ServicesDashboardComponent implements OnInit {

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;
  selectedService!: string;
  serviceId!: string;

  services: any[] = [];
  paginatedServices: any[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  pages: number[] = [];

  st = '202601081800';
  et = '202601081815';
  hostName = '';

  // Filters
  isFilterOpen = false;
  activeDropdown: 'namespace' | 'service' | null = null;
  
  namespaces: string[] = [];
  serviceNames: string[] = [];
  
  namespaceSearch = '';
  serviceNameSearch = '';

  selectedNamespaces = new Set<string>();
  selectedServices = new Set<string>();

  // Subscriptions for race conditions
  private servicesSub?: Subscription;

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
    if (!this.isFilterOpen) {
      this.activeDropdown = null;
    }
  }

  toggleDropdown(type: 'namespace' | 'service') {
    this.activeDropdown = this.activeDropdown === type ? null : type;
  }

  toggleSelection(value: string, set: Set<string>) {
    set.has(value) ? set.delete(value) : set.add(value);
  }

  filteredNamespaces() {
    return this.namespaces.filter(n => n.toLowerCase().includes(this.namespaceSearch.toLowerCase()));
  }

  filteredServiceNames() {
    return this.serviceNames.filter(n => n.toLowerCase().includes(this.serviceNameSearch.toLowerCase()));
  }

  get totalSelected(): number {
    return this.selectedNamespaces.size + this.selectedServices.size;
  }

  resetFilters() {
    this.selectedNamespaces.clear();
    this.selectedServices.clear();
    this.namespaceSearch = '';
    this.serviceNameSearch = '';
  }

  applyFilters() {
    this.loadServices();
    this.isFilterOpen = false;
    this.activeDropdown = null;
  }

  private getFilterParams() {
    const nsParam = this.selectedNamespaces.size > 0 
      ? Array.from(this.selectedNamespaces).join(',') 
      : undefined;
    
    const svcParam = this.selectedServices.size > 0
      ? Array.from(this.selectedServices).join(',')
      : undefined;
    return { nsParam, svcParam };
  }

  constructor(private k8sService: KubernetesService, private dateService: DateService) { }

  ngOnInit(): void {
    this.hostName = sessionStorage.getItem('selectedNode')!;
    this.selectedService = sessionStorage.getItem('serviceIdForServicesDashboard')!;
    this.serviceId = sessionStorage.getItem('encodedServiceIdForServicesDashboard')!;
    this.dateService.setActiveComponent('ServicesDashboardComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'ServicesDashboardComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);



        this.loadServices();
        this.fetchNamespaces();
        this.fetchServiceNames();

      });

  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  fetchNamespaces() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    
    this.k8sService.getUniqueNamespaces(this.hostName, st, et).subscribe({
      next: (data) => {
        this.namespaces = data.map((item: any) => item.key).filter((n: any) => !!n);
      },
      error: (err) => {
        console.error('Error fetching namespaces:', err);
      }
    });
  }

  fetchServiceNames() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    
    this.k8sService.getServiceNames(this.hostName, st, et).subscribe({
      next: (data) => {
        this.serviceNames = data.buckets.map((item: any) => item.key).filter((n: any) => !!n);
      },
      error: (err) => {
        console.error('Error fetching service names:', err);
      }
    });
  }

  loadServices() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    const { nsParam, svcParam } = this.getFilterParams();

    this.servicesSub?.unsubscribe();
    this.servicesSub = this.k8sService
      .getServicesMetaData(st, et, this.hostName, nsParam, svcParam)
      .subscribe(res => {
        const keys = Object.keys(res);

        // Populate filters if empty
        // if (this.serviceNames.length === 0) {
        //   const svcNames = keys;
        //   this.serviceNames = [...svcNames];
        // }

        this.services = keys.map(serviceName => {
          const svc = res[serviceName];

          return {
            name: serviceName,
            namespace: svc.namespace?.[0] ?? '-',
            type: svc.service_type?.[0] ?? '-',
            clusterIp: svc.cluster_ip?.[0] ?? '-',
            ingressIp: svc.ingress_ip ?? '(null)',
            created: svc.created_at
          };
        });
        this.updatePaginatedServices();

      });
  }

  updatePaginatedServices() {
    this.totalPages = Math.ceil(this.services.length / this.itemsPerPage);
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedServices = this.services.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedServices();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedServices();
    }
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedServices();
    }
  }

  // download

  private downloadCSV(filename: string, headers: string[], rows: any[]) {
    const csvContent = [
      headers.join(','),
      ...rows.map(r =>
        headers.map(h => `"${r[h] ?? ''}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }

  downloadServices() {
    this.downloadCSV(
      'services-metadata.csv',
      ['name', 'namespace', 'type', 'clusterIp', 'ingressIp', 'created'],
      this.services
    );
  }


}
