import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { KubernetesTabHeaderComponent } from "../../kubernetes-tab-header/kubernetes-tab-header.component"
import { ExportService, ExportColumn } from '../../../../../services/export.service';

interface NodeCondition {
  label: string;
  ready: number;
  total: number;
}

interface KubernetesNode {
  name: string;
  status: 'Ready' | 'Warning' | 'NotReady';
  role: string;
  version: string;
  podsUsed: number;
  podsTotal: number;
  cpuUsage: number;
  memoryUsage: number;
  cpuRequests: number;
  memoryRequests: number;
  condition: 'Ready' | 'MemoryPressure' | 'NotReady';
}

@Component({
  selector: 'app-kubernetes-node',
  standalone: true,
  imports: [CommonModule, FormsModule, KubernetesTabHeaderComponent],
  templateUrl: './kubernetes-node.component.html',
  styleUrls: ['./kubernetes-node.component.css']
})
export class KubernetesNodeComponent implements OnInit {
  totalNodes = 12;
  healthyNodes = 10;
  healthyNodesPct = 83.3;
  nodesWithIssues = 2;
  nodesWithIssuesPct = 16.7;
  totalPods = 1448;
  podsRunning = 1381;
  podsPending = 59;
  podsFailed = 8;
  podCapacity = 2000;
  podCapacityUtilizedPct = 72.4;

  cpuUsagePct = 42;
  cpuUsageUsed = 7.2;
  cpuUsageTotal = 17;

  memoryUsagePct = 68;
  memoryUsageUsed = 27.4;
  memoryUsageTotal = 40;

  podsPct = 72;
  podsUsed = 1448;
  podsTotal = 2000;

  cpuRequestsPct = 61;
  cpuRequestsUsed = 10.4;
  cpuRequestsTotal = 17;

  clusterCpu = '17 vCPU';
  clusterMemory = '40 GiB';
  clusterPods = 2000;

  nodeHealth = [
    { label: 'Ready', count: 10, total: 12, pct: 83.3, color: '#22c55e' },
    { label: 'NotReady', count: 1, total: 12, pct: 8.3, color: '#f97316' },
    { label: 'Unknown', count: 1, total: 12, pct: 8.3, color: '#ef4444' }
  ];

  nodeConditions: NodeCondition[] = [
    { label: 'Ready', ready: 10, total: 12 },
    { label: 'MemoryPressure', ready: 1, total: 12 },
    { label: 'DiskPressure', ready: 0, total: 12 },
    { label: 'PIDPressure', ready: 0, total: 12 }
  ];

  nodes: KubernetesNode[] = [
    { name: 'node-1', status: 'Ready', role: 'worker', version: 'v1.29.3', podsUsed: 198, podsTotal: 200, cpuUsage: 38, memoryUsage: 62, cpuRequests: 55, memoryRequests: 68, condition: 'Ready' },
    { name: 'node-2', status: 'Ready', role: 'worker', version: 'v1.29.3', podsUsed: 178, podsTotal: 200, cpuUsage: 41, memoryUsage: 71, cpuRequests: 62, memoryRequests: 73, condition: 'Ready' },
    { name: 'node-3', status: 'Ready', role: 'worker', version: 'v1.28.6', podsUsed: 160, podsTotal: 200, cpuUsage: 36, memoryUsage: 68, cpuRequests: 50, memoryRequests: 64, condition: 'Ready' },
    { name: 'node-4', status: 'Ready', role: 'worker', version: 'v1.29.2', podsUsed: 142, podsTotal: 200, cpuUsage: 29, memoryUsage: 54, cpuRequests: 48, memoryRequests: 56, condition: 'Ready' },
    { name: 'node-5', status: 'Warning', role: 'worker', version: 'v1.29.2', podsUsed: 120, podsTotal: 200, cpuUsage: 78, memoryUsage: 86, cpuRequests: 72, memoryRequests: 80, condition: 'MemoryPressure' },
    { name: 'node-6', status: 'NotReady', role: 'worker', version: 'v1.28.6', podsUsed: 0, podsTotal: 200, cpuUsage: 5, memoryUsage: 18, cpuRequests: 12, memoryRequests: 20, condition: 'NotReady' },
    { name: 'node-7', status: 'Ready', role: 'worker', version: 'v1.28.3', podsUsed: 165, podsTotal: 200, cpuUsage: 44, memoryUsage: 67, cpuRequests: 58, memoryRequests: 69, condition: 'Ready' },
    { name: 'node-8', status: 'Ready', role: 'worker', version: 'v1.28.7', podsUsed: 132, podsTotal: 200, cpuUsage: 33, memoryUsage: 49, cpuRequests: 46, memoryRequests: 52, condition: 'Ready' },
    { name: 'node-9', status: 'Ready', role: 'worker', version: 'v1.29.1', podsUsed: 190, podsTotal: 200, cpuUsage: 57, memoryUsage: 73, cpuRequests: 64, memoryRequests: 71, condition: 'Ready' },
    { name: 'node-10', status: 'Ready', role: 'worker', version: 'v1.29.1', podsUsed: 110, podsTotal: 200, cpuUsage: 28, memoryUsage: 41, cpuRequests: 38, memoryRequests: 49, condition: 'Ready' },
    { name: 'node-11', status: 'Ready', role: 'worker', version: 'v1.29.3', podsUsed: 155, podsTotal: 200, cpuUsage: 35, memoryUsage: 58, cpuRequests: 45, memoryRequests: 55, condition: 'Ready' },
    { name: 'node-12', status: 'Ready', role: 'worker', version: 'v1.29.2', podsUsed: 140, podsTotal: 200, cpuUsage: 30, memoryUsage: 52, cpuRequests: 40, memoryRequests: 50, condition: 'Ready' }
  ];

  selectedCluster = 'aks-live';
  clusters = ['aks-live', 'eks-live', 'gke-live'];
  clusterDropdownOpen = false;
  searchTerm = '';

  currentPage = 1;
  itemsPerPage = 10;

  statusFilter = 'All';
  statusMenuOpen = false;
  readonly statusOptions = ['All', 'Ready', 'Warning', 'NotReady'];

  exportMenuOpen = false;

  toggleStatusMenu(): void {
    this.statusMenuOpen = !this.statusMenuOpen;
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.statusMenuOpen = false;
    this.currentPage = 1;
  }

  toggleExportMenu(): void {
    this.exportMenuOpen = !this.exportMenuOpen;
  }

  exportNodes(format: 'xlsx' | 'csv'): void {
    this.exportMenuOpen = false;
    const fullDataset = this.filteredNodes;
    const columns: ExportColumn<KubernetesNode>[] = [
      { header: 'Node Name', field: 'name' },
      { header: 'Status', field: 'status' },
      { header: 'Condition', field: 'condition' },
      { header: 'Role', field: 'role' },
      { header: 'Version', field: 'version' },
      { header: 'Pods Allocated', valueFormatter: n => `${n.podsUsed} / ${n.podsTotal}` },
      { header: 'CPU Usage (%)', field: 'cpuUsage' },
      { header: 'CPU Requests (%)', field: 'cpuRequests' },
      { header: 'Memory Usage (%)', field: 'memoryUsage' },
      { header: 'Memory Requests (%)', field: 'memoryRequests' }
    ];

    const fileName = `Nodes_${this.selectedCluster || 'cluster'}`;
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
    if (this.exportMenuOpen && !target.closest('.k8s-export-wrap')) {
      this.exportMenuOpen = false;
    }
  }

  get filteredNodes(): KubernetesNode[] {
    return this.nodes.filter(n => {
      const matchesStatus = this.statusFilter === 'All' || n.status === this.statusFilter;
      if (!this.searchTerm?.trim()) {
        return matchesStatus;
      }
      const term = this.searchTerm.toLowerCase();
      const matchesSearch =
        n.name.toLowerCase().includes(term) ||
        n.role.toLowerCase().includes(term) ||
        n.version.toLowerCase().includes(term) ||
        n.status.toLowerCase().includes(term) ||
        n.condition.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredNodes.length / (this.itemsPerPage || 10)));
  }

  get pagedNodes(): KubernetesNode[] {
    const pageSize = this.itemsPerPage && this.itemsPerPage > 0 ? this.itemsPerPage : 10;
    const start = (this.currentPage - 1) * pageSize;
    return this.filteredNodes.slice(start, start + pageSize);
  }

  get startIndex(): number {
    const pageSize = this.itemsPerPage && this.itemsPerPage > 0 ? this.itemsPerPage : 10;
    return this.filteredNodes.length === 0 ? 0 : (this.currentPage - 1) * pageSize + 1;
  }

  get endIndex(): number {
    const pageSize = this.itemsPerPage && this.itemsPerPage > 0 ? this.itemsPerPage : 10;
    return Math.min(this.currentPage * pageSize, this.filteredNodes.length);
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

  // --- Resource Analysis Section ---
  resourceCollapsed = false;
  resourceMenuOpen = false;

  toggleResourceCollapsed(): void {
    this.resourceCollapsed = !this.resourceCollapsed;
  }

  toggleResourceMenu(): void {
    this.resourceMenuOpen = !this.resourceMenuOpen;
  }

  readonly resourceTimeLabels = ['13:30', '13:45', '14:00', '14:15', '14:30', '14:45', '15:00', '15:15'];

  // CPU chart configuration
  cpuMax = 360;
  cpuLimitsPct = 309.0;
  cpuRequestsPctVal = 87.7;
  cpuLimitsY = 37.7;
  cpuRequestsY = 114.6;

  // CPU Hover State
  cpuHovered = false;
  cpuHoverTime = '2024-09-24, 15:04 – 15:05';
  cpuHoverUsage = 18.2;
  cpuHoverUsageY = 138.7;
  cpuHoverCursorX = 457.4;
  cpuTooltipLeft = 40;

  // Memory chart configuration
  memMax = 180;
  memLimitsPct = 162.3;
  memRequestsPctVal = 71.6;
  memLimitsY = 32.3;
  memRequestsY = 95.3;

  // Memory Hover State
  memHovered = false;
  memHoverTime = '2024-09-24, 15:04 – 15:05';
  memHoverUsage = 52.4;
  memHoverUsageY = 108.6;
  memHoverCursorX = 493.4;
  memTooltipLeft = 45;

  cpuLinePath = '';
  cpuAreaPath = '';
  memLinePath = '';
  memAreaPath = '';

  readonly cpuVals = [
    38, 41, 40, 44, 46, 43, 41, 45, 42, 38,
    35, 33, 30, 27, 25, 27, 32, 34, 32, 29,
    27, 24, 28, 30, 26, 23, 20, 18.2, 22, 25,
    23, 24, 26
  ];

  readonly memVals = [
    62, 64, 63, 66, 65, 63, 62, 65, 66, 64,
    63, 65, 64, 63, 64, 65, 64, 63, 64, 65,
    63, 62, 64, 63, 62, 63, 61, 52.4, 58, 62,
    63, 64, 62
  ];

  initResourceCharts(): void {
    const startX = 52;
    const endX = 525;
    const bottomY = 145;
    const height = 125;

    const cpuStep = (endX - startX) / (this.cpuVals.length - 1);
    const cpuPts = this.cpuVals.map((v, i) => ({
      x: startX + i * cpuStep,
      y: bottomY - (v / 360) * height
    }));
    this.cpuLinePath = this.buildSmoothPath(cpuPts);
    this.cpuAreaPath = `${this.cpuLinePath} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;

    const memStep = (endX - startX) / (this.memVals.length - 1);
    const memPts = this.memVals.map((v, i) => ({
      x: startX + i * memStep,
      y: bottomY - (v / 180) * height
    }));
    this.memLinePath = this.buildSmoothPath(memPts);
    this.memAreaPath = `${this.memLinePath} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;
  }

  onChartMouseMove(event: MouseEvent, type: 'cpu' | 'mem'): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, mouseX / rect.width));

    const svgX = 52 + pct * (525 - 52);
    const timeLabel = this.getTimeLabelForPct(pct);

    let tooltipPct = pct * 100;
    if (pct > 0.52) {
      tooltipPct = Math.max(2, pct * 100 - 45);
    } else {
      tooltipPct = Math.min(58, pct * 100 + 4);
    }

    // Synchronize hover state across both charts simultaneously
    this.cpuHovered = true;
    this.memHovered = true;

    this.cpuHoverCursorX = svgX;
    this.memHoverCursorX = svgX;

    this.cpuHoverTime = timeLabel;
    this.memHoverTime = timeLabel;

    this.cpuTooltipLeft = tooltipPct;
    this.memTooltipLeft = tooltipPct;

    // Interpolate CPU usage value & Y position for this timestamp
    const cpuIdxFloat = pct * (this.cpuVals.length - 1);
    const cpuIdxLow = Math.floor(cpuIdxFloat);
    const cpuIdxHigh = Math.min(this.cpuVals.length - 1, Math.ceil(cpuIdxFloat));
    const cpuFraction = cpuIdxFloat - cpuIdxLow;
    const cpuVal = this.cpuVals[cpuIdxLow] * (1 - cpuFraction) + this.cpuVals[cpuIdxHigh] * cpuFraction;
    this.cpuHoverUsage = +(cpuVal.toFixed(1));
    this.cpuHoverUsageY = 145 - (this.cpuHoverUsage / 360) * 125;

    // Interpolate Memory usage value & Y position for this timestamp
    const memIdxFloat = pct * (this.memVals.length - 1);
    const memIdxLow = Math.floor(memIdxFloat);
    const memIdxHigh = Math.min(this.memVals.length - 1, Math.ceil(memIdxFloat));
    const memFraction = memIdxFloat - memIdxLow;
    const memVal = this.memVals[memIdxLow] * (1 - memFraction) + this.memVals[memIdxHigh] * memFraction;
    this.memHoverUsage = +(memVal.toFixed(1));
    this.memHoverUsageY = 145 - (this.memHoverUsage / 180) * 125;
  }

  onChartMouseLeave(): void {
    this.cpuHovered = false;
    this.memHovered = false;
  }

  private getTimeLabelForPct(pct: number): string {
    const totalMins = Math.round(810 + pct * 105);
    const hh = Math.floor(totalMins / 60);
    const mm = totalMins % 60;
    const nextMm = (mm + 1) % 60;
    const nextHh = mm + 1 >= 60 ? (hh + 1) % 24 : hh;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `2024-09-24, ${pad(hh)}:${pad(mm)} – ${pad(nextHh)}:${pad(nextMm)}`;
  }

  private buildSmoothPath(points: { x: number; y: number }[]): string {
    if (!points || points.length === 0) return '';
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }

  constructor(private route: ActivatedRoute, private router: Router, private exportService: ExportService) { }

  ngOnInit(): void {
    this.initResourceCharts();
    this.route.queryParamMap.subscribe(params => {
      const cluster = params.get('cluster');
      if (cluster) {
        this.selectedCluster = cluster;
      }
    });
  }

  toggleClusterDropdown(): void {
    this.clusterDropdownOpen = !this.clusterDropdownOpen;
  }

  selectedNode: KubernetesNode | null = null;

  onNodeClick(node: KubernetesNode): void {
    this.selectedNode = node;
    this.router.navigate(['/node-details'], {
      queryParams: {
        node: node.name,
        name: node.name,
        status: node.status,
        role: node.role,
        version: node.version,
        podsUsed: node.podsUsed,
        podsTotal: node.podsTotal
      }
    });
  }

  selectCluster(cluster: string): void {
    this.selectedCluster = cluster;
    this.clusterDropdownOpen = false;
  }

  getCircleDashoffset(pct: number): number {
    return 226.2 * (1 - pct / 100);
  }

  donutStyle(pct: number, color: string): { [key: string]: string } {
    const deg = (pct / 100) * 360;
    return {
      background: `conic-gradient(${color} 0deg ${deg}deg, #e5e7eb ${deg}deg 360deg)`
    };
  }

  cpuUsageBarColor(pct: number): string {
    return pct >= 75 ? '#ef4444' : '#3b82f6';
  }

  memoryUsageBarColor(pct: number): string {
    return pct >= 80 ? '#ef4444' : '#10b981';
  }

  cpuRequestsBarColor(pct: number): string {
    return pct >= 70 ? '#f97316' : '#3b82f6';
  }

  memoryRequestsBarColor(pct: number): string {
    return pct >= 75 ? '#ef4444' : '#3b82f6';
  }

  statusPillClass(status: string): string {
    switch (status) {
      case 'Ready':
        return 'status-ready';
      case 'Warning':
        return 'status-warning';
      case 'NotReady':
        return 'status-notready';
      default:
        return '';
    }
  }

  statusDotClass(status: string): string {
    switch (status) {
      case 'Ready':
        return 'dot-green';
      case 'Warning':
        return 'dot-orange';
      case 'NotReady':
        return 'dot-red';
      default:
        return '';
    }
  }

  conditionDotClass(condition: string): string {
    switch (condition) {
      case 'Ready':
      case 'DiskPressure':
      case 'PIDPressure':
        return 'dot-green';
      case 'MemoryPressure':
        return 'dot-orange';
      case 'NotReady':
        return 'dot-red';
      default:
        return 'dot-green';
    }
  }
}