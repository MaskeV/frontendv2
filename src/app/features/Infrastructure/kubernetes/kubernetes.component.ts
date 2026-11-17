import { Component, ElementRef, ViewChild, AfterViewChecked, HostBinding, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExportService, ExportColumn } from '../../../services/export.service';

interface Cluster {
  name: string;
  meta: string;
  status: 'Issues' | 'Healthy';
  provider: string;
  providerIcon: 'azure' | 'gcp' | 'aws' | 'generic';
  clusterIcon: 'aks' | 'gke' | 'eks' | 'cube';
  version: string;
  namespaces: number;
  workloads: number;
  services: number;
  nodes: number;
  pods: number;
  alertsCount: number;
  alertsDetail: string;
  resourcePressure: {
    status: 'normal' | 'pressure';
    text: string;
  };
  telemetry: 'Reporting' | 'Stale';
}

type ColumnKey = 'provider' | 'version' | 'namespaces' | 'workloads' | 'services' | 'alerts' | 'resourcePressure' | 'telemetry' | 'nodes' | 'pods';

interface ColumnDef {
  key: ColumnKey;
  label: string;
  visible: boolean;
}

type SortKey = 'name' | 'status' | 'version' | 'namespaces' | 'workloads' | 'services' | 'alertsCount' | string;

@Component({
  selector: 'app-kubernetes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kubernetes.component.html',
  styleUrls: ['./kubernetes.component.css']
})
export class KubernetesComponent implements AfterViewChecked {
  @HostBinding('class.dark-theme') get isDark() {
    return this.theme === 'dark';
  }

  @ViewChild('selectAllCheckbox') selectAllCheckboxRef?: ElementRef<HTMLInputElement>;

  theme: 'light' | 'dark' = 'light';
  viewMode: 'list' | 'grid' = 'list';
  exportMenuOpen = false;

  constructor(private router: Router, private exportService: ExportService) {}

  goToCluster(clusterName: string): void {
    this.router.navigate(['/kubernetes-cluster'], { queryParams: { cluster: clusterName } });
  }

  goToNamespaces(clusterName: string): void {
    this.router.navigate(['/kubernetes-namespace'], { queryParams: { cluster: clusterName } });
  }

  goToWorkloads(clusterName: string): void {
    this.router.navigate(['/kubernetes-workload'], { queryParams: { cluster: clusterName } });
  }

  goToNodes(clusterName: string): void {
    this.router.navigate(['/kubernetes-node'], { queryParams: { cluster: clusterName } });
  }

  toggleTheme(): void {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
  }

  clusters: Cluster[] = [
    {
      name: 'aks-live',
      meta: 'prod | Azure AKS',
      status: 'Issues',
      provider: 'Azure',
      providerIcon: 'azure',
      clusterIcon: 'aks',
      version: 'v1.28.7',
      namespaces: 13,
      workloads: 57,
      services: 34,
      nodes: 2,
      pods: 420,
      alertsCount: 2,
      alertsDetail: '1 C / 1 W',
      resourcePressure: { status: 'pressure', text: 'CPU 82%' },
      telemetry: 'Reporting'
    },
    {
      name: 'demo-kspm',
      meta: 'non-prod | Generic',
      status: 'Healthy',
      provider: 'Self-managed',
      providerIcon: 'generic',
      clusterIcon: 'cube',
      version: 'v1.27.4',
      namespaces: 6,
      workloads: 12,
      services: 4,
      nodes: 3,
      pods: 98,
      alertsCount: 1,
      alertsDetail: '1 W',
      resourcePressure: { status: 'normal', text: 'Normal' },
      telemetry: 'Reporting'
    },
    {
      name: 'eks-live',
      meta: 'prod | EKS',
      status: 'Healthy',
      provider: 'AWS',
      providerIcon: 'aws',
      clusterIcon: 'eks',
      version: 'v1.29.2',
      namespaces: 15,
      workloads: 90,
      services: 63,
      nodes: 4,
      pods: 620,
      alertsCount: 0,
      alertsDetail: '-',
      resourcePressure: { status: 'normal', text: 'Normal' },
      telemetry: 'Reporting'
    },
    {
      name: 'gke-live',
      meta: 'prod | GKE',
      status: 'Healthy',
      provider: 'GCP',
      providerIcon: 'gcp',
      clusterIcon: 'gke',
      version: 'v1.28.6',
      namespaces: 13,
      workloads: 55,
      services: 11,
      nodes: 3,
      pods: 310,
      alertsCount: 0,
      alertsDetail: '-',
      resourcePressure: { status: 'normal', text: 'Normal' },
      telemetry: 'Reporting'
    }
  ];

  // ---- Stats (derived so they stay correct as clusters change) ----
  get totalClusters(): number {
    return this.clusters.length;
  }
  get healthyClusters(): number {
    return this.clusters.filter(c => c.status === 'Healthy').length;
  }
  get issueClusters(): number {
    return this.clusters.filter(c => c.status === 'Issues').length;
  }
  get healthyPercent(): number {
    return this.totalClusters ? Math.round((this.healthyClusters / this.totalClusters) * 100) : 0;
  }
  get issuePercent(): number {
    return this.totalClusters ? Math.round((this.issueClusters / this.totalClusters) * 100) : 0;
  }
  get totalNodes(): number {
    return this.clusters.reduce((sum, c) => sum + c.nodes, 0);
  }
  get totalPods(): number {
    return this.clusters.reduce((sum, c) => sum + c.pods, 0);
  }

  alertingClusters = 2;
  criticalAlerts = 1;
  warningAlerts = 3;

  resourcePressureClusters = 1;
  cpuPressureCount = 1;
  memoryPressureCount = 1;
  diskPressureCount = 0;

  staleTelemetryClusters = 0;

  // ---- Search ----
  searchTerm = '';

  // ---- Column visibility ----
  columns: ColumnDef[] = [
    { key: 'provider', label: 'Provider', visible: true },
    { key: 'version', label: 'Version', visible: true },
    { key: 'namespaces', label: 'Namespaces', visible: true },
    { key: 'workloads', label: 'Workloads', visible: true },
    { key: 'services', label: 'Services', visible: true },
    { key: 'nodes', label: 'Nodes', visible: true },
    { key: 'pods', label: 'Pods', visible: true }
  ];
  columnsMenuOpen = false;

  toggleColumnsMenu(): void {
    this.columnsMenuOpen = !this.columnsMenuOpen;
    this.statusMenuOpen = false;
    this.providerMenuOpen = false;
  }

  isColumnVisible(key: ColumnKey): boolean {
    return this.columns.find(c => c.key === key)?.visible ?? true;
  }

  toggleColumn(key: ColumnKey): void {
    const col = this.columns.find(c => c.key === key);
    if (col) {
      col.visible = !col.visible;
    }
  }

  // ---- Status & Provider Filters ----
  statusFilter = 'All';
  statusMenuOpen = false;
  statusOptions = ['All', 'Healthy', 'Issues'];

  providerFilter = 'All';
  providerMenuOpen = false;
  providerOptions = ['All', 'Azure', 'AWS', 'GCP', 'Self-managed'];

  toggleStatusMenu(): void {
    this.statusMenuOpen = !this.statusMenuOpen;
    this.providerMenuOpen = false;
    this.columnsMenuOpen = false;
  }

  setStatusFilter(status?: string): void {
    if (status !== undefined) {
      this.statusFilter = status;
    }
    this.statusMenuOpen = false;
    this.currentPage = 1;
  }

  toggleProviderMenu(): void {
    this.providerMenuOpen = !this.providerMenuOpen;
    this.statusMenuOpen = false;
    this.columnsMenuOpen = false;
  }

  setProviderFilter(provider?: string): void {
    if (provider !== undefined) {
      this.providerFilter = provider;
    }
    this.providerMenuOpen = false;
    this.currentPage = 1;
  }

  toggleExportMenu(): void {
    this.exportMenuOpen = !this.exportMenuOpen;
  }

  exportClusters(format: 'xlsx' | 'csv'): void {
    this.exportMenuOpen = false;
    const fullDataset = this.sortedClusters;
    const columns: ExportColumn<Cluster>[] = [
      { header: 'Cluster Name', field: 'name' },
      { header: 'Environment', field: 'meta' },
      { header: 'Status', field: 'status' },
      { header: 'Provider', field: 'provider' },
      { header: 'Version', field: 'version' },
      { header: 'Namespaces', field: 'namespaces' },
      { header: 'Workloads', field: 'workloads' },
      { header: 'Services', field: 'services' },
      { header: 'Nodes', field: 'nodes' },
      { header: 'Pods', field: 'pods' },
      { header: 'Alerts', valueFormatter: c => `${c.alertsCount || 0} (${c.alertsDetail || ''})` },
      { header: 'Resource Pressure', valueFormatter: c => c.resourcePressure?.text || c.resourcePressure?.status || 'Normal' },
      { header: 'Telemetry', field: 'telemetry' }
    ];

    if (format === 'xlsx') {
      this.exportService.exportToExcel(fullDataset, columns, 'Kubernetes_Clusters');
    } else {
      this.exportService.exportToCsv(fullDataset, columns, 'Kubernetes_Clusters');
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.columnsMenuOpen && !target.closest('.columns-dropdown')) {
      this.columnsMenuOpen = false;
    }
    if (this.statusMenuOpen && !target.closest('.status-filter-wrap')) {
      this.statusMenuOpen = false;
    }
    if (this.providerMenuOpen && !target.closest('.provider-filter-wrap')) {
      this.providerMenuOpen = false;
    }
    if (this.exportMenuOpen && !target.closest('.k8s-export-wrap')) {
      this.exportMenuOpen = false;
    }
  }

  // ---- Sorting ----
  sortColumn: SortKey = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';

  toggleSort(column: SortKey): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  ngAfterViewChecked(): void { }

  // ---- Derived list: filter -> sort -> paginate ----
  get filteredClusters(): Cluster[] {
    const term = (this.searchTerm || '').trim().toLowerCase();
    return this.clusters.filter(c => {
      const matchesSearch = !term ||
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.meta && c.meta.toLowerCase().includes(term)) ||
        (c.provider && c.provider.toLowerCase().includes(term));

      const matchesStatus = !this.statusFilter || this.statusFilter === 'All' ||
        (c.status && c.status.trim().toLowerCase() === this.statusFilter.trim().toLowerCase());
      const matchesProvider = !this.providerFilter || this.providerFilter === 'All' ||
        (c.provider && c.provider.trim().toLowerCase() === this.providerFilter.trim().toLowerCase());

      return matchesSearch && matchesStatus && matchesProvider;
    });
  }

  get sortedClusters(): Cluster[] {
    const list = [...this.filteredClusters];
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    const key = this.sortColumn;
    return list.sort((a, b) => {
      const av = a[key as keyof Cluster];
      const bv = b[key as keyof Cluster];
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  // ---- Pagination ----
  currentPage = 1;
  rowsPerPage = 10;
  rowsPerPageOptions = [5, 10, 25, 50];

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredClusters.length / (this.rowsPerPage || 10)));
  }

  get pagedClusters(): Cluster[] {
    const pageSize = this.rowsPerPage && this.rowsPerPage > 0 ? this.rowsPerPage : 10;
    const start = (this.currentPage - 1) * pageSize;
    return this.sortedClusters.slice(start, start + pageSize);
  }

  get rangeStart(): number {
    const pageSize = this.rowsPerPage && this.rowsPerPage > 0 ? this.rowsPerPage : 10;
    return this.filteredClusters.length === 0 ? 0 : (this.currentPage - 1) * pageSize + 1;
  }

  get rangeEnd(): number {
    const pageSize = this.rowsPerPage && this.rowsPerPage > 0 ? this.rowsPerPage : 10;
    return Math.min(this.currentPage * pageSize, this.filteredClusters.length);
  }

  onRowsPerPageChange(value?: any): void {
    if (value !== undefined) {
      this.rowsPerPage = Number(value);
    }
    this.currentPage = 1;
  }

  onItemsPerPageChange(): void {
    if (this.rowsPerPage === null || this.rowsPerPage === undefined || this.rowsPerPage < 1) {
      this.rowsPerPage = 10;
    }
    this.currentPage = 1;
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  goToPage(page: any): void {
    if (page !== '...') {
      this.currentPage = page;
    }
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

  prevPage(): void {
    this.previousPage();
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  // ---- Add cluster ----
  addFormOpen = false;
  newCluster = {
    name: '',
    environment: 'prod',
    provider: 'Azure' as 'Azure' | 'GCP' | 'AWS' | 'Self-managed',
    version: ''
  };

  toggleAddForm(): void {
    this.addFormOpen = !this.addFormOpen;
    this.columnsMenuOpen = false;
  }

  private providerMeta: Record<string, { icon: Cluster['providerIcon']; cluster: Cluster['clusterIcon'] }> = {
    Azure: { icon: 'azure', cluster: 'aks' },
    GCP: { icon: 'gcp', cluster: 'gke' },
    AWS: { icon: 'aws', cluster: 'eks' },
    'Self-managed': { icon: 'generic', cluster: 'cube' }
  };

  submitAddCluster(): void {
    if (!this.newCluster.name.trim()) {
      return;
    }
    const meta = this.providerMeta[this.newCluster.provider];
    this.clusters = [
      ...this.clusters,
      {
        name: this.newCluster.name.trim(),
        meta: `${this.newCluster.environment} | ${this.newCluster.provider}`,
        status: 'Healthy',
        provider: this.newCluster.provider,
        providerIcon: meta.icon,
        clusterIcon: meta.cluster,
        version: this.newCluster.version.trim() || 'v1.29.0',
        namespaces: 1,
        workloads: 0,
        services: 0,
        nodes: 1,
        pods: 0,
        alertsCount: 0,
        alertsDetail: '-',
        resourcePressure: { status: 'normal', text: 'Normal' },
        telemetry: 'Reporting'
      }
    ];
    this.newCluster = { name: '', environment: 'prod', provider: 'Azure', version: '' };
    this.addFormOpen = false;
  }
}