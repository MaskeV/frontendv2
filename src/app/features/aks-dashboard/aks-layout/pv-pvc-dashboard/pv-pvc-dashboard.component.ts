import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KubernetesService } from '../../../../services/kubernetes.service';
import { DateService } from '../../../../services/date.service';
import { filter, Subject, Subscription, switchMap } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-pv-pvc-dashboard',
    imports: [CommonModule, FormsModule],
    templateUrl: './pv-pvc-dashboard.component.html',
    styleUrl: './pv-pvc-dashboard.component.css'
})
export class PvPvcDashboardComponent implements OnInit {

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;
  selectedService!: string;
  serviceId!: string;

  persistentVolumes: any[] = [];
  paginatedPVs: any[] = [];
  pvCurrentPage: number = 1;
  pvItemsPerPage: number = 5;
  pvTotalPages: number = 0;
  pvPages: number[] = [];

  persistentVolumeClaims: any[] = [];
  paginatedPVCs: any[] = [];
  pvcCurrentPage: number = 1;
  pvcItemsPerPage: number = 5;

  pvcTotalPages: number = 0;
  pvcPages: number[] = [];

  // Filters
  isFilterOpen = false;
  activeDropdown: 'pv' | 'pvc' | null = null;
  
  namespaces: string[] = [];
  pvNames: string[] = [];
  pvcNames: string[] = [];
  
  pvNameSearch = '';
  pvcNameSearch = '';

  selectedPVs = new Set<string>();
  selectedPVCs = new Set<string>();

  // Subscriptions for race conditions
  private pvSub?: Subscription;
  private pvcSub?: Subscription;

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
    if (!this.isFilterOpen) {
      this.activeDropdown = null;
    }
  }

  toggleDropdown(type: 'pv' | 'pvc') {
    this.activeDropdown = this.activeDropdown === type ? null : type;
  }

  toggleSelection(value: string, set: Set<string>) {
    set.has(value) ? set.delete(value) : set.add(value);
  }

  filteredPVNames() {
    return this.pvNames.filter(n => n.toLowerCase().includes(this.pvNameSearch.toLowerCase()));
  }

  filteredPVCNames() {
    return this.pvcNames.filter(n => n.toLowerCase().includes(this.pvcNameSearch.toLowerCase()));
  }

  get totalSelected(): number {
    return this.selectedPVs.size + this.selectedPVCs.size;
  }

  resetFilters() {
    this.selectedPVs.clear();
    this.selectedPVCs.clear();
    this.pvNameSearch = '';
    this.pvcNameSearch = '';
  }

  applyFilters() {
    this.loadPersistentVolumes();
    this.loadPersistentVolumeClaims();
    this.isFilterOpen = false;
    this.activeDropdown = null;
  }

  private getFilterParams() {
    const pvParam = this.selectedPVs.size > 0 
      ? Array.from(this.selectedPVs).join(',') 
      : undefined;
    
    const pvcParam = this.selectedPVCs.size > 0
      ? Array.from(this.selectedPVCs).join(',')
      : undefined;
    return { pvParam, pvcParam };
  }

  private hostName = '';
  private st = '202601081800';
  private et = '202601081815';

  constructor(private k8s: KubernetesService, private dateService: DateService) { }

  ngOnInit(): void {
    this.hostName = sessionStorage.getItem('selectedNode')!;
    this.selectedService = sessionStorage.getItem('serviceIdForPvPvcDashboard')!;
    this.serviceId = sessionStorage.getItem('encodedServiceIdForPvPvcDashboard')!;
    this.dateService.setActiveComponent('PvPvcDashboardComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'PvPvcDashboardComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);




        this.fetchNamespaces();
        this.loadPersistentVolumes();
        this.loadPersistentVolumeClaims();


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
    
    this.k8s.getUniqueNamespaces(this.hostName, st, et).subscribe({
      next: (data) => {
        this.namespaces = data.map((item: any) => item.key).filter((n: any) => !!n);
      },
      error: (err) => {
        console.error('Error fetching namespaces:', err);
      }
    });
  }

  /* ===================================================
     PERSISTENT VOLUMES
  =================================================== */
  private loadPersistentVolumes(): void {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    const { pvParam, pvcParam } = this.getFilterParams();

    this.pvSub?.unsubscribe();
    this.pvSub = this.k8s.getPersistentVolumesInfo(this.hostName, st, et, pvParam, pvcParam)
      .subscribe(res => {
        
        const keys = Object.keys(res);

        // Populate filter if empty
        if (this.pvNames.length === 0) {
          this.pvNames = [...keys];
        }

        this.persistentVolumes = keys.map(name => ({
          name,
          phase: res[name]?.phase?.[0] ?? '-',
          capacity: this.formatBytes(
            res[name]?.capacity_bytes?.[0] ?? 0
          ),
          storageClass: res[name]?.storage_class?.[0] ?? '-'
        }));
        this.updatePaginatedPVs();
      });
  }

  updatePaginatedPVs() {
    this.pvTotalPages = Math.ceil(this.persistentVolumes.length / this.pvItemsPerPage);
    this.pvPages = Array.from({ length: this.pvTotalPages }, (_, i) => i + 1);
    const startIndex = (this.pvCurrentPage - 1) * this.pvItemsPerPage;
    const endIndex = startIndex + this.pvItemsPerPage;
    this.paginatedPVs = this.persistentVolumes.slice(startIndex, endIndex);
  }

  nextPagePV() {
    if (this.pvCurrentPage < this.pvTotalPages) {
      this.pvCurrentPage++;
      this.updatePaginatedPVs();
    }
  }

  prevPagePV() {
    if (this.pvCurrentPage > 1) {
      this.pvCurrentPage--;
      this.updatePaginatedPVs();
    }
  }

  /* ===================================================
     PERSISTENT VOLUME CLAIMS
  =================================================== */
  private loadPersistentVolumeClaims(): void {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    const { pvParam, pvcParam } = this.getFilterParams();

    this.pvcSub?.unsubscribe();
    this.pvcSub = this.k8s.getPersistentVolumeClaimsInfo(this.hostName, st, et, pvcParam, pvParam)
      .subscribe(res => {

        const keys = Object.keys(res);

        // Populate filter if empty
        if (this.pvcNames.length === 0) {
          const names = keys.filter(k => !!k); // ensure validity
          this.pvcNames = [...names];
        }

        this.persistentVolumeClaims = keys.map(name => ({
          name,
          phase: res[name]?.phase?.[0] ?? '-',
          volume: res[name]?.volume_name?.[0] ?? '-',
          capacity: this.formatBytes(
            res[name]?.request_storage_bytes?.[0] ?? 0
          ),
          accessMode: res[name]?.access_mode?.[0] ?? '-',
          storageClass: res[name]?.storage_class?.[0] ?? '-'
        }));
        this.updatePaginatedPVCs();
      });
  }

  updatePaginatedPVCs() {
    this.pvcTotalPages = Math.ceil(this.persistentVolumeClaims.length / this.pvcItemsPerPage);
    this.pvcPages = Array.from({ length: this.pvcTotalPages }, (_, i) => i + 1);
    const startIndex = (this.pvcCurrentPage - 1) * this.pvcItemsPerPage;
    const endIndex = startIndex + this.pvcItemsPerPage;
    this.paginatedPVCs = this.persistentVolumeClaims.slice(startIndex, endIndex);
  }

  nextPagePVC() {
    if (this.pvcCurrentPage < this.pvcTotalPages) {
      this.pvcCurrentPage++;
      this.updatePaginatedPVCs();
    }
  }

  prevPagePVC() {
    if (this.pvcCurrentPage > 1) {
      this.pvcCurrentPage--;
      this.updatePaginatedPVCs();
    }
  }

  /* ===================================================
     UTIL
  =================================================== */
  private formatBytes(bytes: number): string {
    if (!bytes) return '0 GB';
    return `${(bytes / (1024 ** 3)).toFixed(0)} GB`;
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
downloadPVs() {
  this.downloadCSV(
    'persistent-volumes.csv',
    ['name', 'phase', 'capacity', 'storageClass'],
    this.persistentVolumes
  );
}
downloadPVCs() {
  this.downloadCSV(
    'persistent-volume-claims.csv',
    ['name', 'phase', 'volume', 'capacity', 'accessMode', 'storageClass'],
    this.persistentVolumeClaims
  );
}

}
