import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { KubernetesTabHeaderComponent } from "../../kubernetes-tab-header/kubernetes-tab-header.component";
import { ExportService, ExportColumn } from '../../../../../services/export.service';


type WorkloadType = 'Deployment' | 'StatefulSet' | 'DaemonSet' | 'Job' | 'CronJob' | 'ReplicaSet';
type WorkloadStatus = 'Healthy' | 'Degraded' | 'Completed' | 'Updating';
type Tone = 'blue' | 'green' | 'orange' | 'purple';

interface StatCard {
  label: string;
  value: string;
  sub: string;
  tone: Tone;
  icon: 'cube' | 'check' | 'alert' | 'refresh' | 'database';
  danger?: boolean;
}

interface TypeStat {
  label: string;
  type: WorkloadType;
  count: number;
  color: string;
}

interface StatusStat {
  label: string;
  count: number;
  color: string;
}

interface NamespaceStat {
  name: string;
  workloads: number;
  color: string;
}

interface TypeTab {
  label: string;
  type: WorkloadType | null;
  count: number;
}

interface Workload {
  name: string;
  type: WorkloadType;
  namespace: string;
  status: WorkloadStatus;
  pods: string;
  cpu: number;
  memory: number;
  age: string;
  version: string;
}

@Component({
  selector: 'app-kubernetes-workload',
  standalone: true,
  imports: [CommonModule, FormsModule, KubernetesTabHeaderComponent],
  templateUrl: './kubernetes-workload.component.html',
  styleUrls: ['./kubernetes-workload.component.css']
})
export class KubernetesWorkloadComponent implements OnInit {
  // ---- Header ----
  readonly clusters = ['aks-live', 'eks-live', 'gke-live'];
  selectedCluster = 'aks-live';
  searchTerm = '';

  // ---- Summary data (replace with API data) ----
  readonly totalWorkloads = 178;

  readonly stats: StatCard[] = [
    { label: 'Total Workloads', value: '178', sub: 'Across all namespaces', tone: 'blue', icon: 'cube' },
    { label: 'Healthy Workloads', value: '152', sub: '85.4% of total', tone: 'green', icon: 'check' },
    { label: 'Workloads with Issues', value: '18', sub: '10.1% of total', tone: 'orange', icon: 'alert', danger: true },
    { label: 'Updating Workloads', value: '8', sub: '4.5% of total', tone: 'purple', icon: 'refresh' },
    { label: 'Total Pods', value: '1448', sub: 'Running 1381 | Pending 59 | Failed 8', tone: 'blue', icon: 'database' }
  ];

  readonly typeStats: TypeStat[] = [
    { label: 'Deployments', type: 'Deployment', count: 57, color: '#2f6df6' },
    { label: 'StatefulSets', type: 'StatefulSet', count: 8, color: '#1fb85b' },
    { label: 'DaemonSets', type: 'DaemonSet', count: 12, color: '#8b5cf6' },
    { label: 'Jobs', type: 'Job', count: 34, color: '#f7941d' },
    { label: 'CronJobs', type: 'CronJob', count: 6, color: '#ef3b3b' },
    { label: 'ReplicaSets', type: 'ReplicaSet', count: 61, color: '#cbd2df' }
  ];

  readonly statusStats: StatusStat[] = [
    { label: 'Running', count: 152, color: '#1fb85b' },
    { label: 'Pending', count: 12, color: '#f7941d' },
    { label: 'Failed', count: 6, color: '#ef3b3b' },
    { label: 'Updating', count: 8, color: '#8b5cf6' }
  ];

  readonly namespaces: NamespaceStat[] = [
    { name: 'aks-live', workloads: 52, color: '#2f6df6' },
    { name: 'eks-live', workloads: 38, color: '#1fb85b' },
    { name: 'gke-live', workloads: 28, color: '#f7941d' },
    { name: 'demo-kspm', workloads: 18, color: '#8b5cf6' },
    { name: 'default', workloads: 12, color: '#cbd2df' }
  ];

  // ---- Donut ----
  private readonly circumference = 2 * Math.PI * 51;
  readonly donutSegments = this.buildDonut();

  // ---- Type tabs ----
  readonly tabs: TypeTab[] = [
    { label: 'All Types', type: null, count: this.totalWorkloads },
    ...this.typeStats.map(t => ({ label: t.label, type: t.type, count: t.count }))
  ];
  activeType: WorkloadType | null = null;

  // ---- Table data (replace with API data) ----
  private readonly workloads: Workload[] = [
    { name: 'netraa-apm', type: 'Deployment', namespace: 'aks-live', status: 'Healthy', pods: '5 / 5', cpu: 42, memory: 68, age: '12d', version: 'v1.2.8' },
    { name: 'elasticsearch', type: 'StatefulSet', namespace: 'logging', status: 'Degraded', pods: '2 / 3', cpu: 78, memory: 72, age: '15d', version: 'v8.12.2' },
    { name: 'fluent-bit', type: 'DaemonSet', namespace: 'logging', status: 'Healthy', pods: '6 / 6', cpu: 21, memory: 35, age: '30d', version: 'v1.14.4' },
    { name: 'backup-job', type: 'Job', namespace: 'backup', status: 'Completed', pods: '0 / 0', cpu: 0, memory: 0, age: '2h', version: 'v1.0.0' },
    { name: 'log-cleanup', type: 'CronJob', namespace: 'system', status: 'Healthy', pods: '1 / 1', cpu: 12, memory: 18, age: '5d', version: 'v1.0.1' },
    { name: 'netraa-ui', type: 'Deployment', namespace: 'aks-live', status: 'Healthy', pods: '3 / 3', cpu: 28, memory: 45, age: '8d', version: 'v1.1.4' },
    { name: 'kube-state-metrics', type: 'Deployment', namespace: 'monitoring', status: 'Healthy', pods: '1 / 1', cpu: 16, memory: 22, age: '20d', version: 'v2.10.1' },
    { name: 'prometheus', type: 'StatefulSet', namespace: 'monitoring', status: 'Healthy', pods: '2 / 2', cpu: 36, memory: 52, age: '20d', version: 'v2.51.0' },
    { name: 'cert-manager', type: 'Deployment', namespace: 'security', status: 'Updating', pods: '1 / 2', cpu: 60, memory: 58, age: '15d', version: 'v1.14.4' },
    { name: 'grafana', type: 'Deployment', namespace: 'monitoring', status: 'Healthy', pods: '1 / 1', cpu: 18, memory: 32, age: '20d', version: 'v10.4.1' }
  ];

  // ---- Sorting / pagination state ----
  sortDir: 'asc' | 'desc' | null = null;
  readonly pageSizes = [10, 25, 50, 100];
  pageSize = 10;
  page = 1;

  get itemsPerPage(): number {
    return this.pageSize;
  }
  set itemsPerPage(val: number) {
    this.pageSize = val;
  }

  get currentPage(): number {
    return this.page;
  }
  set currentPage(val: number) {
    this.page = val;
  }

  rows: Workload[] = [];
  total = this.totalWorkloads;

  exportMenuOpen = false;

  constructor(private route: ActivatedRoute, private router: Router, private exportService: ExportService) {
    this.applyFilters();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['cluster']) {
        this.selectedCluster = params['cluster'];
        this.applyFilters();
      }
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / (this.pageSize || 10)));
  }

  get rangeStart(): number {
    const size = this.pageSize && this.pageSize > 0 ? this.pageSize : 10;
    return this.total === 0 ? 0 : (this.page - 1) * size + 1;
  }

  get rangeEnd(): number {
    const size = this.pageSize && this.pageSize > 0 ? this.pageSize : 10;
    return Math.min(this.page * size, this.total);
  }

  get totalPagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.totalPages <= visiblePages + 2) {
      pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    } else {
      if (this.page <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.totalPages];
      } else if (this.page >= this.totalPages - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.totalPages - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.page - 1, this.page, this.page + 1, '...', this.totalPages];
      }
    }
    return pages;
  }

  onItemsPerPageChange(): void {
    if (this.pageSize === null || this.pageSize === undefined || this.pageSize < 1) {
      this.pageSize = 10;
    }
    this.page = 1;
    this.applyFilters();
  }

  // ---- Handlers ----
  onClusterChange(cluster: string): void {
    this.selectedCluster = cluster;
    // TODO: reload workloads for the selected cluster
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.page = 1;
    this.applyFilters();
  }

  selectType(type: WorkloadType | null): void {
    this.activeType = type;
    this.page = 1;
    this.applyFilters();
  }

  toggleSort(): void {
    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  onPageSizeChange(value: string): void {
    this.pageSize = +value;
    this.page = 1;
    this.applyFilters();
  }

  previousPage(): void {
    if (this.page > 1) {
      this.page--;
      this.applyFilters();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.applyFilters();
    }
  }

  goToPage(page: any): void {
    if (page !== '...') {
      this.page = page;
      this.applyFilters();
    }
  }

  prevPage(): void {
    this.previousPage();
  }

  onAddWorkload(): void {
    // TODO: open the add-workload flow
  }

  goToNamespace(nsName: string): void {
    this.router.navigate(['/namespace-details'], {
      queryParams: {
        namespace: nsName,
        name: nsName,
        cluster: this.selectedCluster || 'aks-live'
      }
    });
  }

  onViewDetails(workload: Workload): void {
    this.router.navigate(['/workload-details'], {
      queryParams: {
        workload: workload.name,
        name: workload.name,
        type: workload.type,
        namespace: workload.namespace,
        status: workload.status,
        pods: workload.pods,
        age: workload.age
      }
    });
  }

  usageClass(value: number, base: 'cpu' | 'memory'): string {
    return value >= 70 ? 'danger' : base;
  }

  trackByName(_: number, workload: Workload): string {
    return workload.name;
  }

  statusFilter: string = 'All';
  statusMenuOpen: boolean = false;
  readonly statusOptions: string[] = ['All', 'Healthy', 'Degraded', 'Completed', 'Updating'];

  typeMenuOpen: boolean = false;
  readonly typeOptions: string[] = ['All', 'Deployment', 'StatefulSet', 'DaemonSet', 'Job', 'CronJob', 'ReplicaSet'];

  toggleStatusMenu(): void {
    this.statusMenuOpen = !this.statusMenuOpen;
    if (this.statusMenuOpen) {
      this.typeMenuOpen = false;
    }
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.statusMenuOpen = false;
    this.page = 1;
    this.applyFilters();
  }

  toggleTypeMenu(): void {
    this.typeMenuOpen = !this.typeMenuOpen;
    if (this.typeMenuOpen) {
      this.statusMenuOpen = false;
    }
  }

  setTypeFilter(type: string): void {
    this.typeMenuOpen = false;
    this.selectType(type === 'All' ? null : (type as WorkloadType));
  }

  toggleExportMenu(): void {
    this.exportMenuOpen = !this.exportMenuOpen;
  }

  exportWorkloads(format: 'xlsx' | 'csv'): void {
    this.exportMenuOpen = false;
    const fullDataset = this.getFilteredWorkloads();
    const columns: ExportColumn<Workload>[] = [
      { header: 'Workload Name', field: 'name' },
      { header: 'Type', field: 'type' },
      { header: 'Namespace', field: 'namespace' },
      { header: 'Status', field: 'status' },
      { header: 'Pods', field: 'pods' },
      { header: 'CPU Usage (%)', field: 'cpu' },
      { header: 'Memory Usage (%)', field: 'memory' },
      { header: 'Age', field: 'age' },
      { header: 'Version', field: 'version' }
    ];

    const fileName = `Workloads_${this.selectedCluster || 'cluster'}`;
    if (format === 'xlsx') {
      this.exportService.exportToExcel(fullDataset, columns, fileName);
    } else {
      this.exportService.exportToCsv(fullDataset, columns, fileName);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.statusMenuOpen && !target.closest('.status-filter-wrap')) {
      this.statusMenuOpen = false;
    }
    if (this.typeMenuOpen && !target.closest('.type-filter-wrap')) {
      this.typeMenuOpen = false;
    }
    if (this.exportMenuOpen && !target.closest('.k8s-export-wrap')) {
      this.exportMenuOpen = false;
    }
  }

  // ---- Internals ----
  getFilteredWorkloads(): Workload[] {
    const term = this.searchTerm.trim().toLowerCase();

    const filtered = this.workloads
      .filter(w => !this.activeType || w.type === this.activeType)
      .filter(w => this.statusFilter === 'All' || w.status === this.statusFilter)
      .filter(w => !term || [w.name, w.namespace, w.type].some(v => v.toLowerCase().includes(term)));

    if (this.sortDir) {
      const dir = this.sortDir === 'asc' ? 1 : -1;
      filtered.sort((a, b) => a.name.localeCompare(b.name) * dir);
    }
    return filtered;
  }

  private applyFilters(): void {
    const filtered = this.getFilteredWorkloads();
    this.total = filtered.length;

    const start = (this.page - 1) * this.pageSize;
    this.rows = filtered.slice(start, start + this.pageSize);
  }

  hoveredType: WorkloadType | null = null;

  onSegmentHover(type: WorkloadType): void {
    this.hoveredType = type;
  }

  onSegmentLeave(): void {
    this.hoveredType = null;
  }

  get displayedCount(): number {
    if (this.hoveredType) {
      const stat = this.typeStats.find(t => t.type === this.hoveredType);
      return stat ? stat.count : this.totalWorkloads;
    }
    return this.totalWorkloads;
  }

  get displayedLabel(): string {
    if (this.hoveredType) {
      const stat = this.typeStats.find(t => t.type === this.hoveredType);
      return stat ? stat.label : 'Total';
    }
    return 'Total';
  }

  private buildDonut(): { color: string; dash: string; offset: number; type: WorkloadType; label: string; count: number }[] {
    const gap = 2;
    let travelled = 0;

    return this.typeStats.map(t => {
      const length = (t.count / this.totalWorkloads) * this.circumference;
      const segment = {
        color: t.color,
        dash: `${Math.max(length - gap, 0)} ${this.circumference}`,
        offset: -(travelled + gap / 2),
        type: t.type,
        label: t.label,
        count: t.count
      };
      travelled += length;
      return segment;
    });
  }
}