import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KubernetesService } from '../../../../services/kubernetes.service';
import { filter, Subject, Subscription, switchMap, forkJoin } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-volumes-dashboard',
    imports: [CommonModule, FormsModule],
    templateUrl: './volumes-dashboard.component.html',
    styleUrl: './volumes-dashboard.component.css'
})
export class VolumesDashboardComponent implements OnInit {

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;
  selectedService!: string;
  serviceId!: string;

  hostName!: string;

  // Filters
  isFilterOpen = false;
  activeDropdown: 'namespace' | 'pod' | 'volume' | null = null;
  
  namespaces: string[] = [];
  podNames: string[] = [];
  volumeNames: string[] = [];
  
  namespaceSearch = '';
  podNameSearch = '';
  volumeNameSearch = '';

  selectedNamespaces = new Set<string>();
  selectedPodNames = new Set<string>();
  selectedVolumes = new Set<string>();

  // Subscriptions for race conditions
  private volumeUsageSub?: Subscription;
  private inodesSub?: Subscription;
  private fsInfoSub?: Subscription;

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
    if (!this.isFilterOpen) {
      this.activeDropdown = null;
    }
  }

  toggleDropdown(type: 'namespace' | 'pod' | 'volume') {
    this.activeDropdown = this.activeDropdown === type ? null : type;
  }

  toggleSelection(value: string, set: Set<string>) {
    set.has(value) ? set.delete(value) : set.add(value);
  }

  filteredNamespaces() {
    return this.namespaces.filter(n => n.toLowerCase().includes(this.namespaceSearch.toLowerCase()));
  }

  filteredPodNames() {
    return this.podNames.filter(n => n.toLowerCase().includes(this.podNameSearch.toLowerCase()));
  }

  filteredVolumeNames() {
    return this.volumeNames.filter(n => n.toLowerCase().includes(this.volumeNameSearch.toLowerCase()));
  }

  get totalSelected(): number {
    return this.selectedNamespaces.size + this.selectedPodNames.size + this.selectedVolumes.size;
  }

  resetFilters() {
    this.selectedNamespaces.clear();
    this.selectedPodNames.clear();
    this.selectedVolumes.clear();
    this.namespaceSearch = '';
    this.podNameSearch = '';
    this.volumeNameSearch = '';
  }

  applyFilters() {
    this.fetchVolumeUsage();
    this.fetchFilesystemInodes();
    this.fetchVolumeFsInfo();
    this.isFilterOpen = false;
    this.activeDropdown = null;
  }

  private getFilterParams() {
    const nsParam = this.selectedNamespaces.size > 0 
      ? Array.from(this.selectedNamespaces).join(',') 
      : undefined;
    
    const podParam = this.selectedPodNames.size > 0
      ? Array.from(this.selectedPodNames).join(',')
      : undefined;

    const volParam = this.selectedVolumes.size > 0
      ? Array.from(this.selectedVolumes).join(',')
      : undefined;

    return { nsParam, podParam, volParam };
  }

  constructor(
    private k8sService: KubernetesService, private dateService: DateService
  ) { }

  /* ================= VOLUME USAGE PER POD ================= */
  /* ================= VOLUME USAGE PER POD ================= */
  volumeUsagePerPod: any[] = [];
  currentPage = 1;
  itemsPerPage = 7;

  get paginatedVolumeUsage() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.volumeUsagePerPod.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.volumeUsagePerPod.length / this.itemsPerPage);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  ngOnInit(): void {
    this.hostName = sessionStorage.getItem('selectedNode')!;
    this.selectedService = sessionStorage.getItem('serviceIdForVolumesDashboard')!;
    this.serviceId = sessionStorage.getItem('encodedServiceIdForVolumesDashboard')!;
    this.dateService.setActiveComponent('VolumesDashboardComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'VolumesDashboardComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);



        this.fetchNamespaces();
        this.fetchVolumeUsage();
        this.fetchFilesystemInodes();
        this.fetchVolumeFsInfo();
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
        // Response format: [{ "doc_count": 76680, "key": "kube-system" }, ...]
        this.namespaces = data.map((item: any) => item.key).filter((n: any) => !!n);
      },
      error: (err) => {
        console.error('Error fetching namespaces:', err);
      }
    });
  }

  fetchVolumeUsage() {
    // Hardcoded time window for now as per request/example
    // In a real scenario, these might come from a shared service or route params
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    const { nsParam, podParam, volParam } = this.getFilterParams();

    this.volumeUsageSub?.unsubscribe();
    this.volumeUsageSub = this.k8sService.getVolumeUsagePerPod(this.hostName, st, et, nsParam, podParam, volParam).subscribe({
      next: (data) => {
        
        // Populate filters if empty (and if data available)
        // Since we are fetching all 3 endpoints roughly same time, populating from here or others is fine.
        // We accumulate unique values.
        if (this.podNames.length === 0 || this.volumeNames.length === 0) {
            this.populateFilters(data);
        }

        this.volumeUsagePerPod = data.map((item: any) => ({
          podName: item.pod_name,
          volume: item.volume_name,
          usedPercent: item.volume_used_pct.toFixed(2) + '%',
          usedBytes: this.formatBytes(item.used_bytes),
          volumeSize: (item.volume_size / (1024 * 1024 * 1024)).toFixed(2) + 'GB'
        }));
      },
      error: (err) => {
        console.error('Error fetching volume usage:', err);
      }
    });
  }

  private populateFilters(data: any[]) {
      const pods = new Set(this.podNames);
      const vols = new Set(this.volumeNames);
      
      data.forEach(item => {
          if (item.pod_name) pods.add(item.pod_name);
          if (item.volume_name) vols.add(item.volume_name);
      });
      
      this.podNames = Array.from(pods);
      this.volumeNames = Array.from(vols);
      // Namespaces are fetched separately now
  }

  formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))}${sizes[i]}`;
  }


  /* ================= FILESYSTEM INODES ================= */
  filesystemInodes: any[] = [];
  inodesCurrentPage = 1;
  inodesItemsPerPage = 7;

  get paginatedFilesystemInodes() {
    const startIndex = (this.inodesCurrentPage - 1) * this.inodesItemsPerPage;
    return this.filesystemInodes.slice(startIndex, startIndex + this.inodesItemsPerPage);
  }

  get inodesTotalPages() {
    return Math.ceil(this.filesystemInodes.length / this.inodesItemsPerPage);
  }

  nextInodesPage() {
    if (this.inodesCurrentPage < this.inodesTotalPages) {
      this.inodesCurrentPage++;
    }
  }

  prevInodesPage() {
    if (this.inodesCurrentPage > 1) {
      this.inodesCurrentPage--;
    }
  }

  fetchFilesystemInodes() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    const { nsParam, podParam, volParam } = this.getFilterParams();

    this.inodesSub?.unsubscribe();
    this.inodesSub = this.k8sService.getVolumeFileInodes(this.hostName, st, et, nsParam, podParam, volParam).subscribe({
      next: (data) => {
        
        // Also try populate filters from here if needed
        if (this.volumeNames.length === 0) this.populateFilters(data);

        this.filesystemInodes = data.map((item: any) => ({
          volume: item.volume_name,
          totalInodes: item.inodes_count.toLocaleString(),
          freeInodes: item.inodes_free.toLocaleString(),
          usedInodes: item.inodes_used.toLocaleString()
        }));
      },
      error: (err) => {
        console.error('Error fetching filesystem inodes:', err);
      }
    });
  }


  /* ================= FILESYSTEM USAGE ================= */
  filesystemUsage: any[] = [];
  fsInfoCurrentPage = 1;
  fsInfoItemsPerPage = 7;

  get paginatedFilesystemUsage() {
    const startIndex = (this.fsInfoCurrentPage - 1) * this.fsInfoItemsPerPage;
    return this.filesystemUsage.slice(startIndex, startIndex + this.fsInfoItemsPerPage);
  }

  get fsInfoTotalPages() {
    return Math.ceil(this.filesystemUsage.length / this.fsInfoItemsPerPage);
  }

  nextFsInfoPage() {
    if (this.fsInfoCurrentPage < this.fsInfoTotalPages) {
      this.fsInfoCurrentPage++;
    }
  }

  prevFsInfoPage() {
    if (this.fsInfoCurrentPage > 1) {
      this.fsInfoCurrentPage--;
    }
  }

  fetchVolumeFsInfo() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    const { nsParam, podParam, volParam } = this.getFilterParams();

    this.fsInfoSub?.unsubscribe();
    this.fsInfoSub = this.k8sService.getVolumeFsInfo(this.hostName, st, et, nsParam, podParam, volParam).subscribe({
      next: (data) => {
         // Also try populate filters from here if needed
         if (this.volumeNames.length === 0) this.populateFilters(data);

        this.filesystemUsage = data.map((item: any) => ({
          volume: item.volume_name,
          available: this.formatBytes(item.fs_available_bytes),
          capacity: this.formatBytes(item.fs_capacity_bytes),
          used: this.formatBytes(item.fs_used_bytes),
          usagePercent: item.fs_usage_pct.toFixed(2) + '%'
        }));
      },
      error: (err) => {
        console.error('Error fetching filesystem usage:', err);
      }
    });
  }

  // download methods
  private downloadCSV(filename: string, headers: string[], rows: any[]) {
  const csvContent = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
downloadVolumeUsagePerPod() {
  this.downloadCSV(
    'volume-usage-per-pod.csv',
    ['podName', 'volume', 'usedPercent', 'usedBytes', 'volumeSize'],
    this.volumeUsagePerPod
  );
}
downloadFilesystemInodes() {
  this.downloadCSV(
    'filesystem-inodes.csv',
    ['volume', 'totalInodes', 'freeInodes', 'usedInodes'],
    this.filesystemInodes
  );
}
downloadFilesystemUsage() {
  this.downloadCSV(
    'filesystem-usage.csv',
    ['volume', 'available', 'capacity', 'used', 'usagePercent'],
    this.filesystemUsage
  );
}


}
