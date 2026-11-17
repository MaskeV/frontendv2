import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { KubernetesTabHeaderComponent } from "../../kubernetes-tab-header/kubernetes-tab-header.component";
import { ExportService, ExportColumn } from '../../../../../services/export.service';

type Severity = 'high' | 'med' | '';
type AlertLevel = 'critical' | 'warning' | 'none';

interface Metric {
  value: number;
  sev: Severity;
}

interface NamespaceRow {
  name: string;
  cluster: string;
  status: 'Healthy' | 'Warning';
  podsUsed: number;
  podsTotal: number;
  deployments: number;
  services: number;
  cpu: number;
  memory: number;
  storage: number;
  restarts: Metric;
  unhealthyPods: Metric;
  cpuThrottling: Metric;
  oomKills: Metric;
  alerts: number;
  alertLevel: AlertLevel;
}

@Component({
  selector: 'app-kubernetes-namespace',
  standalone: true,
  imports: [CommonModule, FormsModule, KubernetesTabHeaderComponent],
  templateUrl: './kubernetes-namespace.component.html',
  styleUrls: ['./kubernetes-namespace.component.css']
})
export class KubernetesNamespaceComponent implements OnInit {
  selectedCluster = 'aks-live';
  searchTerm = '';
  statusFilter = 'All';
  statusMenuOpen = false;
  statusOptions = ['All', 'Healthy', 'Warning'];
  labelFilter = 'All';
  rowsPerPage = 10;
  itemsPerPage = 10;
  currentPage = 1;
  pageSizeOptions = [5, 10, 20, 50];

  timeRanges = ['Last 15 minutes', 'Last 30 minutes', 'Last 1 hour', 'Last 6 hours', 'Last 24 hours'];
  timeRange = 'Last 30 minutes';

  columnsMenuOpen = false;
  columns = [
    { key: 'pods', label: 'Pods' },
    { key: 'deployments', label: 'Deployments' },
    { key: 'services', label: 'Services' },
    { key: 'cpu', label: 'CPU Usage' },
    { key: 'memory', label: 'Memory Usage' },
    { key: 'restarts', label: 'Restarts' },
    { key: 'unhealthy', label: 'Unhealthy Pods' },
    { key: 'throttling', label: 'CPU Throttling' },
    { key: 'oom', label: 'OOM Kills' },
    { key: 'alerts', label: 'Alerts' }
  ];
  visibleCols: Record<string, boolean> = {
    pods: true, deployments: true, services: true, cpu: true, memory: true,
    restarts: true, unhealthy: true, throttling: true, oom: true, alerts: true
  };

  exportMenuOpen = false;

  constructor(private route: ActivatedRoute, private router: Router, private exportService: ExportService) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['cluster']) {
        this.selectedCluster = params['cluster'];
      }
    });
  }

  onNamespaceClick(ns: NamespaceRow): void {
    this.router.navigate(['/namespace-details'], {
      queryParams: {
        namespace: ns.name,
        name: ns.name,
        cluster: ns.cluster || this.selectedCluster || 'aks-live',
        status: ns.status,
        podsUsed: ns.podsUsed,
        podsTotal: ns.podsTotal,
        cpu: ns.cpu,
        memory: ns.memory,
        storage: ns.storage
      }
    });
  }

  toggleStatusMenu(): void {
    this.statusMenuOpen = !this.statusMenuOpen;
    this.columnsMenuOpen = false;
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.statusMenuOpen = false;
    this.currentPage = 1;
  }

  toggleColumnsMenu(): void {
    this.columnsMenuOpen = !this.columnsMenuOpen;
    this.statusMenuOpen = false;
  }

  toggleColumn(key: string): void {
    this.visibleCols[key] = !this.visibleCols[key];
  }

  toggleExportMenu(): void {
    this.exportMenuOpen = !this.exportMenuOpen;
    this.statusMenuOpen = false;
    this.columnsMenuOpen = false;
  }

  exportNamespaces(format: 'xlsx' | 'csv'): void {
    this.exportMenuOpen = false;
    const fullDataset = this.filteredNamespaces;
    const columns: ExportColumn<NamespaceRow>[] = [
      { header: 'Namespace Name', field: 'name' },
      { header: 'Cluster', field: 'cluster' },
      { header: 'Status', field: 'status' },
      { header: 'Pods Allocated', valueFormatter: ns => `${ns.podsUsed} / ${ns.podsTotal}` },
      { header: 'Deployments', field: 'deployments' },
      { header: 'Services', field: 'services' },
      { header: 'CPU Usage (%)', field: 'cpu' },
      { header: 'Memory Usage (%)', field: 'memory' },
      { header: 'Storage Usage (%)', field: 'storage' },
      { header: 'Restarts', valueFormatter: ns => ns.restarts?.value ?? 0 },
      { header: 'Unhealthy Pods', valueFormatter: ns => ns.unhealthyPods?.value ?? 0 },
      { header: 'CPU Throttling (%)', valueFormatter: ns => ns.cpuThrottling?.value ?? 0 },
      { header: 'OOM Kills', valueFormatter: ns => ns.oomKills?.value ?? 0 },
      { header: 'Alerts', field: 'alerts' }
    ];

    const fileName = `Namespaces_${this.selectedCluster || 'cluster'}`;
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
    if (this.columnsMenuOpen && !target.closest('.columns-wrap')) {
      this.columnsMenuOpen = false;
    }
    if (this.exportMenuOpen && !target.closest('.k8s-export-wrap')) {
      this.exportMenuOpen = false;
    }
  }

  // Stat tiles
  totalNamespaces = 13;
  namespacesWithIssues = 1;
  issuesPercent = 7.7;

  totalPods = 420;
  runningPods = 390;
  pendingPods = 8;
  failedPods = 4;
  podsUsagePercent = 61;

  cpuUsagePercent = 42;
  cpuDetail = '7.2 / 17 vCPU';
  memoryUsagePercent = 68;
  memoryDetail = '27.4 / 40 GB';
  storageUsagePercent = 53;
  storageDetail = '265 / 500 GB';

  namespaces: NamespaceRow[] = [
    {
      name: 'aks-live', cluster: 'aks-live', status: 'Healthy', podsUsed: 420, podsTotal: 500, deployments: 57, services: 34,
      cpu: 62, memory: 68, storage: 58,
      restarts: { value: 12, sev: 'high' }, unhealthyPods: { value: 4, sev: 'high' },
      cpuThrottling: { value: 2.1, sev: 'high' }, oomKills: { value: 1, sev: 'high' }, alerts: 2, alertLevel: 'critical'
    },
    {
      name: 'demo-kspm', cluster: 'aks-live', status: 'Healthy', podsUsed: 98, podsTotal: 120, deployments: 12, services: 4,
      cpu: 41, memory: 52, storage: 33,
      restarts: { value: 2, sev: '' }, unhealthyPods: { value: 0, sev: '' },
      cpuThrottling: { value: 0.4, sev: '' }, oomKills: { value: 0, sev: '' }, alerts: 0, alertLevel: 'none'
    },
    {
      name: 'eks-live', cluster: 'eks-live', status: 'Healthy', podsUsed: 620, podsTotal: 700, deployments: 90, services: 63,
      cpu: 75, memory: 72, storage: 68,
      restarts: { value: 18, sev: 'high' }, unhealthyPods: { value: 6, sev: 'high' },
      cpuThrottling: { value: 4.2, sev: 'high' }, oomKills: { value: 3, sev: 'high' }, alerts: 3, alertLevel: 'critical'
    },
    {
      name: 'gke-live', cluster: 'gke-live', status: 'Healthy', podsUsed: 310, podsTotal: 400, deployments: 55, services: 11,
      cpu: 48, memory: 53, storage: 47,
      restarts: { value: 6, sev: '' }, unhealthyPods: { value: 2, sev: 'med' },
      cpuThrottling: { value: 1.0, sev: '' }, oomKills: { value: 0, sev: '' }, alerts: 1, alertLevel: 'warning'
    },
    {
      name: 'default', cluster: 'aks-live', status: 'Warning', podsUsed: 0, podsTotal: 50, deployments: 2, services: 1,
      cpu: 12, memory: 19, storage: 9,
      restarts: { value: 4, sev: '' }, unhealthyPods: { value: 4, sev: 'high' },
      cpuThrottling: { value: 0.2, sev: '' }, oomKills: { value: 0, sev: '' }, alerts: 1, alertLevel: 'warning'
    },
    {
      name: 'kube-system', cluster: 'aks-live', status: 'Healthy', podsUsed: 245, podsTotal: 300, deployments: 28, services: 14,
      cpu: 62, memory: 70, storage: 55,
      restarts: { value: 8, sev: '' }, unhealthyPods: { value: 1, sev: 'high' },
      cpuThrottling: { value: 1.8, sev: '' }, oomKills: { value: 0, sev: '' }, alerts: 1, alertLevel: 'warning'
    },
    {
      name: 'monitoring', cluster: 'aks-live', status: 'Healthy', podsUsed: 180, podsTotal: 220, deployments: 26, services: 10,
      cpu: 56, memory: 61, storage: 48,
      restarts: { value: 3, sev: '' }, unhealthyPods: { value: 0, sev: '' },
      cpuThrottling: { value: 0.6, sev: '' }, oomKills: { value: 0, sev: '' }, alerts: 0, alertLevel: 'none'
    },
    {
      name: 'ingress-nginx', cluster: 'eks-live', status: 'Healthy', podsUsed: 120, podsTotal: 150, deployments: 18, services: 9,
      cpu: 32, memory: 44, storage: 37,
      restarts: { value: 5, sev: '' }, unhealthyPods: { value: 0, sev: '' },
      cpuThrottling: { value: 0.9, sev: '' }, oomKills: { value: 1, sev: 'high' }, alerts: 1, alertLevel: 'warning'
    },
    {
      name: 'dev', cluster: 'gke-live', status: 'Healthy', podsUsed: 90, podsTotal: 100, deployments: 14, services: 7,
      cpu: 28, memory: 36, storage: 21,
      restarts: { value: 1, sev: '' }, unhealthyPods: { value: 0, sev: '' },
      cpuThrottling: { value: 0.3, sev: '' }, oomKills: { value: 0, sev: '' }, alerts: 0, alertLevel: 'none'
    },
    {
      name: 'prod', cluster: 'aks-live', status: 'Healthy', podsUsed: 145, podsTotal: 180, deployments: 32, services: 12,
      cpu: 47, memory: 58, storage: 46,
      restarts: { value: 7, sev: '' }, unhealthyPods: { value: 1, sev: 'high' },
      cpuThrottling: { value: 1.1, sev: '' }, oomKills: { value: 0, sev: '' }, alerts: 1, alertLevel: 'warning'
    },
    {
      name: 'staging', cluster: 'eks-live', status: 'Healthy', podsUsed: 77, podsTotal: 100, deployments: 10, services: 5,
      cpu: 22, memory: 31, storage: 28,
      restarts: { value: 2, sev: '' }, unhealthyPods: { value: 0, sev: '' },
      cpuThrottling: { value: 0.3, sev: '' }, oomKills: { value: 0, sev: '' }, alerts: 0, alertLevel: 'none'
    },
    {
      name: 'qa', cluster: 'gke-live', status: 'Healthy', podsUsed: 65, podsTotal: 80, deployments: 8, services: 4,
      cpu: 18, memory: 24, storage: 20,
      restarts: { value: 1, sev: '' }, unhealthyPods: { value: 0, sev: '' },
      cpuThrottling: { value: 0.2, sev: '' }, oomKills: { value: 0, sev: '' }, alerts: 0, alertLevel: 'none'
    },
    {
      name: 'logging', cluster: 'aks-live', status: 'Healthy', podsUsed: 50, podsTotal: 60, deployments: 6, services: 3,
      cpu: 35, memory: 41, storage: 32,
      restarts: { value: 3, sev: '' }, unhealthyPods: { value: 0, sev: '' },
      cpuThrottling: { value: 0.5, sev: '' }, oomKills: { value: 0, sev: '' }, alerts: 0, alertLevel: 'none'
    }
  ];

  get filteredNamespaces(): NamespaceRow[] {
    return this.namespaces.filter(ns => {
      const matchesSearch = ns.name.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = this.statusFilter === 'All' || ns.status === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredNamespaces.length / (this.itemsPerPage || 10)));
  }

  get pagedNamespaces(): NamespaceRow[] {
    const pageSize = this.itemsPerPage && this.itemsPerPage > 0 ? this.itemsPerPage : 10;
    const start = (this.currentPage - 1) * pageSize;
    return this.filteredNamespaces.slice(start, start + pageSize);
  }

  get startIndex(): number {
    const pageSize = this.itemsPerPage && this.itemsPerPage > 0 ? this.itemsPerPage : 10;
    return this.filteredNamespaces.length === 0 ? 0 : (this.currentPage - 1) * pageSize + 1;
  }

  get endIndex(): number {
    const pageSize = this.itemsPerPage && this.itemsPerPage > 0 ? this.itemsPerPage : 10;
    return Math.min(this.currentPage * pageSize, this.filteredNamespaces.length);
  }

  onItemsPerPageChange(): void {
    if (this.itemsPerPage === null || this.itemsPerPage === undefined || this.itemsPerPage < 1) {
      this.itemsPerPage = 10;
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

  downloadCsv(): void {
    const header = [
      'Namespace', 'Status', 'Pods', 'Deployments', 'Services', 'CPU %', 'Memory %',
      'Restarts', 'Unhealthy Pods', 'CPU Throttling %', 'OOM Kills', 'Alerts'
    ];
    const rows = this.filteredNamespaces.map(ns => [
      ns.name, ns.status, `${ns.podsUsed}/${ns.podsTotal}`, ns.deployments, ns.services, ns.cpu, ns.memory,
      ns.restarts.value, ns.unhealthyPods.value, ns.cpuThrottling.value, ns.oomKills.value, ns.alerts
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'namespaces.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'All';
    this.labelFilter = 'All';
    this.selectedCluster = 'aks-live';
    this.currentPage = 1;
  }
}