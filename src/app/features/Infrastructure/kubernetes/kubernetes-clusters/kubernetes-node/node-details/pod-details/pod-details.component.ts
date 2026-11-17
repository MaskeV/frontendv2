import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

interface Container {
  name: string;
  image: string;
  state: string;
  ready: string;
  restarts: number;
  cpuUsage: string;
  memUsage: string;
}

interface ProcessRow {
  pid: number;
  process: string;
  cpu: string;
  memory: string;
  cpuPct: string;
  memPct: string;
}

interface VolumeMount {
  name: string;
  path: string;
  type: string;
  source: string;
  readOnly: string;
}

interface PodEvent {
  timestamp: string;
  type: string;
  reason: string;
  message: string;
}

interface LogRow {
  timestamp: string;
  message: string;
}

interface DonutSegment {
  label: string;
  value: string;
  pct: number;
  color: string;
}

@Component({
  selector: 'app-pod-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pod-details.component.html',
  styleUrls: ['./pod-details.component.css']
})
export class PodDetailsComponent implements OnInit {
  breadcrumbs = ['Kubernetes', 'aks-live', 'Namespaces', 'astroshop', 'Pods'];
  podName = 'flagd-6c6c6c5bdf-qxnlr';

  constructor(private route: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const name = params.get('name') || params.get('pod');
      if (name) {
        this.podName = name;
      }
      const ns = params.get('namespace');
      if (ns) {
        this.podMeta.namespace = ns;
        if (this.breadcrumbs && this.breadcrumbs.length >= 4) {
          this.breadcrumbs[3] = ns;
        }
      }
    });
  }

  onBreadcrumbClick(crumb: string): void {
    if (crumb === 'Kubernetes') {
      this.router.navigate(['/kubernetes']);
    } else if (crumb === 'aks-live') {
      this.router.navigate(['/kubernetes-cluster'], { queryParams: { cluster: 'aks-live' } });
    } else if (crumb === 'Namespaces') {
      this.router.navigate(['/kubernetes-namespace'], { queryParams: { cluster: 'aks-live' } });
    } else if (crumb === 'astroshop' || crumb === this.podMeta.namespace) {
      this.router.navigate(['/namespace-details'], {
        queryParams: { namespace: this.podMeta.namespace || 'astroshop', name: this.podMeta.namespace || 'astroshop' }
      });
    } else if (crumb === 'Pods' || crumb === 'Workloads') {
      this.router.navigate(['/kubernetes-workload'], { queryParams: { cluster: 'aks-live' } });
    }
  }

  onNamespaceClick(nsName: string): void {
    this.router.navigate(['/namespace-details'], {
      queryParams: { namespace: nsName, name: nsName, cluster: 'aks-live' }
    });
  }

  podMeta = {
    namespace: 'astroshop',
    workload: 'flagd',
    type: 'Deployment',
    node: 'aks-default-24770023-vmss00001w',
    ip: '10.244.1.23',
    created: '32d 4h ago',
    age: '29 min 26 s'
  };

  tabs = ['Overview', 'Containers', 'Processes', 'Events', 'Logs', 'YAML'];
  activeTab = 'Overview';

  // ---- Summary cards ----
  cpuAllocated = { value: '300', unit: 'mCores', usagePct: 28.3 };
  memAllocated = { value: '512', unit: 'MiB', usagePct: 47.9 };
  containersSummary = { ready: 2, total: 2, status: 'Running' };
  restarts = { count: 0, window: 'Last 24 hours' };
  status = { state: 'Running', detail: 'Ready' };
  node = { name: 'aks-default-24770023-vmss00001w', ip: '10.224.0.7' };

  // ---- Line chart series (values are % of allocated, plotted on a 0-360 scale) ----
  cpuUsageSeries = [22, 24, 30, 26, 23, 25, 33, 28, 24, 22, 26, 30, 25, 23, 27, 24, 22, 25, 29, 26];
  cpuRequestsLine = 100; // dashed purple reference line (%)
  cpuLimitsLine = 300; // dashed pink reference line (%)
  cpuYMax = 360;
  cpuYTicks = [0, 120, 240, 360];

  memUsageSeries = [46, 45, 47, 48, 46, 45, 47, 49, 46, 45, 47, 48, 46, 47, 45, 46, 48, 47, 46, 47];
  memRequestsLine = 65;
  memLimitsLine = 180;
  memYMax = 180;
  memYTicks = [0, 60, 120, 180];

  networkIncoming = [95, 105, 100, 110, 98, 108, 102, 96, 112, 104, 99, 107, 101, 109, 97, 103, 110, 100, 106, 102];
  networkOutgoing = [18, 22, 15, 20, 17, 24, 19, 16, 21, 18, 23, 17, 20, 19, 22, 16, 21, 18, 20, 19];
  networkYMax = 200;
  networkYTicks = [0, 100, 200];

  xLabels = ['13:30', '13:45', '14:00', '14:15', '14:30', '14:45', '15:00', '15:15'];

  // ---- Hover tooltips state ----
  chartHover = {
    hovered: false,
    hoverCursorX: 0,
    time: '',
    tooltipLeft: 0,
    activeChart: 'cpu' as 'cpu' | 'mem' | 'net',
    cpu: {
      usage: 0,
      requests: 100,
      limits: 300,
      y: 0
    },
    mem: {
      usage: 0,
      requests: 65,
      limits: 180,
      y: 0
    },
    net: {
      incoming: 0,
      outgoing: 0,
      incomingY: 0,
      outgoingY: 0
    }
  };

  onChartMouseMove(event: MouseEvent, chartType: 'cpu' | 'mem' | 'net'): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, mouseX / (rect.width || 1)));

    const W = 500;
    const svgX = +((pct * W).toFixed(1));
    const timeLabel = this.getTimeLabelForPct(pct);

    let tooltipPct = pct * 100;
    if (pct > 0.5) {
      tooltipPct = Math.max(2, pct * 100 - 44);
    } else {
      tooltipPct = Math.min(56, pct * 100 + 4);
    }

    this.chartHover.hovered = true;
    this.chartHover.activeChart = chartType;
    this.chartHover.hoverCursorX = svgX;
    this.chartHover.time = timeLabel;
    this.chartHover.tooltipLeft = tooltipPct;

    // CPU interpolated
    const cpuVal = this.interpolateSeries(this.cpuUsageSeries, pct);
    this.chartHover.cpu.usage = +(cpuVal.toFixed(1));
    this.chartHover.cpu.y = +(this.lineY(this.chartHover.cpu.usage, this.cpuYMax).toFixed(1));

    // Mem interpolated
    const memVal = this.interpolateSeries(this.memUsageSeries, pct);
    this.chartHover.mem.usage = +(memVal.toFixed(1));
    this.chartHover.mem.y = +(this.lineY(this.chartHover.mem.usage, this.memYMax).toFixed(1));

    // Net incoming & outgoing interpolated
    const inVal = this.interpolateSeries(this.networkIncoming, pct);
    const outVal = this.interpolateSeries(this.networkOutgoing, pct);
    this.chartHover.net.incoming = +(inVal.toFixed(1));
    this.chartHover.net.outgoing = +(outVal.toFixed(1));
    this.chartHover.net.incomingY = +(this.lineY(this.chartHover.net.incoming, this.networkYMax).toFixed(1));
    this.chartHover.net.outgoingY = +(this.lineY(this.chartHover.net.outgoing, this.networkYMax).toFixed(1));
  }

  onChartMouseLeave(): void {
    this.chartHover.hovered = false;
  }

  private interpolateSeries(series: number[], pct: number): number {
    if (!series || series.length === 0) return 0;
    if (series.length === 1) return series[0];
    const idxFloat = pct * (series.length - 1);
    const idxLow = Math.floor(idxFloat);
    const idxHigh = Math.min(series.length - 1, Math.ceil(idxFloat));
    const fraction = idxFloat - idxLow;
    return series[idxLow] * (1 - fraction) + series[idxHigh] * fraction;
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

  // ---- Donuts ----
  cpuBreakdown: DonutSegment[] = [
    { label: 'User', value: '45 mCores (15.0%)', pct: 15.0, color: '#2E6BE6' },
    { label: 'System', value: '28 mCores (9.3%)', pct: 9.3, color: '#7C3AED' },
    { label: 'I/O Wait', value: '8 mCores (2.7%)', pct: 2.7, color: '#F97316' },
    { label: 'Idle', value: '219 mCores (72.7%)', pct: 72.7, color: '#D9E2EC' }
  ];
  cpuBreakdownCenter = { value: '85', unit: 'mCores', pct: '(28.3%)' };

  memBreakdown: DonutSegment[] = [
    { label: 'Used', value: '245 MiB (47.9%)', pct: 47.9, color: '#22A06B' },
    { label: 'Cache', value: '86 MiB (16.8%)', pct: 16.8, color: '#2E6BE6' },
    { label: 'Buffers', value: '32 MiB (6.3%)', pct: 6.3, color: '#7C3AED' },
    { label: 'Free', value: '249 MiB (49.0%)', pct: 29.0, color: '#D9E2EC' }
  ];
  memBreakdownCenter = { value: '245', unit: 'MiB', pct: '(47.9%)' };

  filesystemBreakdown: DonutSegment[] = [
    { label: 'Used', value: '8.2 GiB (32.1%)', pct: 32.1, color: '#2E6BE6' },
    { label: 'Available', value: '17.4 GiB (67.9%)', pct: 67.9, color: '#BBD3F5' },
    { label: 'Capacity', value: '25.6 GiB (100%)', pct: 0, color: '#EDF1F7' }
  ];
  filesystemCenter = { value: '8.2', unit: 'GiB', pct: '(32.1%)' };

  // ---- Containers table ----
  containers: Container[] = [
    { name: 'flagd', image: 'ghcr.io/open-feature/flagd:latest', state: 'Running', ready: '1/1', restarts: 0, cpuUsage: '62 mCores (20.7%)', memUsage: '142 MiB (55.5%)' },
    { name: 'flagd-ui', image: 'ghcr.io/open-feature/flagd-ui:latest', state: 'Running', ready: '1/1', restarts: 0, cpuUsage: '23 mCores (7.6%)', memUsage: '103 MiB (40.2%)' }
  ];

  // ---- Processes table ----
  processes: ProcessRow[] = [
    { pid: 1, process: '/flagd', cpu: '18.2 mCores', memory: '64 MiB', cpuPct: '20.7%', memPct: '25.6%' },
    { pid: 14, process: '/flagd-ui', cpu: '12.6 mCores', memory: '48 MiB', cpuPct: '14.3%', memPct: '18.8%' },
    { pid: 27, process: 'node', cpu: '6.1 mCores', memory: '32 MiB', cpuPct: '6.9%', memPct: '12.5%' },
    { pid: 38, process: 'nginx', cpu: '3.4 mCores', memory: '21 MiB', cpuPct: '3.8%', memPct: '8.2%' },
    { pid: 51, process: '/bin/sh', cpu: '1.2 mCores', memory: '8 MiB', cpuPct: '1.3%', memPct: '3.1%' }
  ];

  // ---- Volume mounts ----
  volumeMounts: VolumeMount[] = [
    { name: 'config', path: '/etc/flagd', type: 'ConfigMap', source: 'flagd-config', readOnly: 'Yes' },
    { name: 'data', path: '/var/lib/flagd', type: 'EmptyDir', source: '-', readOnly: 'No' }
  ];

  // ---- Pod events ----
  podEvents: PodEvent[] = [
    { timestamp: '2024-09-24 15:06:12', type: 'Normal', reason: 'Pulled', message: 'Successfully pulled image "ghcr.io/..."' },
    { timestamp: '2024-09-24 15:06:21', type: 'Normal', reason: 'Created', message: 'Created container flagd' },
    { timestamp: '2024-09-24 15:06:22', type: 'Normal', reason: 'Started', message: 'Started container flagd' },
    { timestamp: '2024-09-24 15:06:22', type: 'Normal', reason: 'Pulled', message: 'Successfully pulled image "ghcr.io/..."' },
    { timestamp: '2024-09-24 15:06:23', type: 'Normal', reason: 'Created', message: 'Created container flagd-ui' }
  ];

  // ---- Logs ----
  logContainer = 'flagd';
  logs: LogRow[] = [
    { timestamp: '2025-15:02', message: '{"level":"info","msg":"server started","port":8013}' },
    { timestamp: '2025-15:03', message: '{"level":"info","msg":"configuration loaded"}' },
    { timestamp: '2025-15:05', message: '{"level":"debug","msg":"watching config changes"}' },
    { timestamp: '2025-15:07', message: '{"level":"info","msg":"feature store initialized"}' },
    { timestamp: '2025-15:10', message: '{"level":"info","msg":"health check passed"}' }
  ];

  // Containers pagination
  containerSearch = '';
  get filteredContainers() {
    const q = this.containerSearch.trim().toLowerCase();
    if (!q) return this.containers;
    return this.containers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.image.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q) ||
      c.cpuUsage.toLowerCase().includes(q) ||
      c.memUsage.toLowerCase().includes(q)
    );
  }
  containerItemsPerPage = 10;
  containerPage = 1;
  get totalContainerPages(): number { return Math.max(1, Math.ceil(this.filteredContainers.length / (this.containerItemsPerPage || 10))); }
  get pagedContainers() {
    const ps = this.containerItemsPerPage && this.containerItemsPerPage > 0 ? this.containerItemsPerPage : 10;
    return this.filteredContainers.slice((this.containerPage - 1) * ps, this.containerPage * ps);
  }
  get containerStartIndex(): number {
    const ps = this.containerItemsPerPage && this.containerItemsPerPage > 0 ? this.containerItemsPerPage : 10;
    return this.filteredContainers.length === 0 ? 0 : (this.containerPage - 1) * ps + 1;
  }
  get containerEndIndex(): number {
    const ps = this.containerItemsPerPage && this.containerItemsPerPage > 0 ? this.containerItemsPerPage : 10;
    return Math.min(this.containerPage * ps, this.filteredContainers.length);
  }
  onContainerItemsPerPageChange(): void { if (!this.containerItemsPerPage || this.containerItemsPerPage < 1) this.containerItemsPerPage = 10; this.containerPage = 1; }
  previousContainerPage(): void { if (this.containerPage > 1) this.containerPage--; }
  nextContainerPage(): void { if (this.containerPage < this.totalContainerPages) this.containerPage++; }
  goToContainerPage(p: any): void { if (p !== '...') this.containerPage = p; }
  get containerTotalPagesArray(): (number | string)[] {
    const v = 3; let p: (number | string)[] = [];
    if (this.totalContainerPages <= v + 2) p = Array.from({ length: this.totalContainerPages }, (_, i) => i + 1);
    else if (this.containerPage <= v) p = [...Array.from({ length: v }, (_, i) => i + 1), '...', this.totalContainerPages];
    else if (this.containerPage >= this.totalContainerPages - v + 1) p = [1, '...', ...Array.from({ length: v }, (_, i) => this.totalContainerPages - v + i + 1)];
    else p = [1, '...', this.containerPage - 1, this.containerPage, this.containerPage + 1, '...', this.totalContainerPages];
    return p;
  }

  // Processes pagination
  procSearch = '';
  get filteredProcesses() {
    const q = this.procSearch.trim().toLowerCase();
    if (!q) return this.processes;
    return this.processes.filter(p =>
      p.process.toLowerCase().includes(q) ||
      p.pid.toString().includes(q) ||
      p.cpu.toLowerCase().includes(q) ||
      p.memory.toLowerCase().includes(q)
    );
  }
  procItemsPerPage = 10;
  procPage = 1;
  get totalProcPages(): number { return Math.max(1, Math.ceil(this.filteredProcesses.length / (this.procItemsPerPage || 10))); }
  get pagedProcesses() {
    const ps = this.procItemsPerPage && this.procItemsPerPage > 0 ? this.procItemsPerPage : 10;
    return this.filteredProcesses.slice((this.procPage - 1) * ps, this.procPage * ps);
  }
  get procStartIndex(): number {
    const ps = this.procItemsPerPage && this.procItemsPerPage > 0 ? this.procItemsPerPage : 10;
    return this.filteredProcesses.length === 0 ? 0 : (this.procPage - 1) * ps + 1;
  }
  get procEndIndex(): number {
    const ps = this.procItemsPerPage && this.procItemsPerPage > 0 ? this.procItemsPerPage : 10;
    return Math.min(this.procPage * ps, this.filteredProcesses.length);
  }
  onProcItemsPerPageChange(): void { if (!this.procItemsPerPage || this.procItemsPerPage < 1) this.procItemsPerPage = 10; this.procPage = 1; }
  previousProcPage(): void { if (this.procPage > 1) this.procPage--; }
  nextProcPage(): void { if (this.procPage < this.totalProcPages) this.procPage++; }
  goToProcPage(p: any): void { if (p !== '...') this.procPage = p; }
  get procTotalPagesArray(): (number | string)[] {
    const v = 3; let p: (number | string)[] = [];
    if (this.totalProcPages <= v + 2) p = Array.from({ length: this.totalProcPages }, (_, i) => i + 1);
    else if (this.procPage <= v) p = [...Array.from({ length: v }, (_, i) => i + 1), '...', this.totalProcPages];
    else if (this.procPage >= this.totalProcPages - v + 1) p = [1, '...', ...Array.from({ length: v }, (_, i) => this.totalProcPages - v + i + 1)];
    else p = [1, '...', this.procPage - 1, this.procPage, this.procPage + 1, '...', this.totalProcPages];
    return p;
  }

  // Volume mounts pagination
  vmSearch = '';
  get filteredVolumeMounts() {
    const q = this.vmSearch.trim().toLowerCase();
    if (!q) return this.volumeMounts;
    return this.volumeMounts.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.path.toLowerCase().includes(q) ||
      v.type.toLowerCase().includes(q) ||
      v.source.toLowerCase().includes(q)
    );
  }
  vmItemsPerPage = 10;
  vmPage = 1;
  get totalVmPages(): number { return Math.max(1, Math.ceil(this.filteredVolumeMounts.length / (this.vmItemsPerPage || 10))); }
  get pagedVolumeMounts() {
    const ps = this.vmItemsPerPage && this.vmItemsPerPage > 0 ? this.vmItemsPerPage : 10;
    return this.filteredVolumeMounts.slice((this.vmPage - 1) * ps, this.vmPage * ps);
  }
  get vmStartIndex(): number {
    const ps = this.vmItemsPerPage && this.vmItemsPerPage > 0 ? this.vmItemsPerPage : 10;
    return this.filteredVolumeMounts.length === 0 ? 0 : (this.vmPage - 1) * ps + 1;
  }
  get vmEndIndex(): number {
    const ps = this.vmItemsPerPage && this.vmItemsPerPage > 0 ? this.vmItemsPerPage : 10;
    return Math.min(this.vmPage * ps, this.filteredVolumeMounts.length);
  }
  onVmItemsPerPageChange(): void { if (!this.vmItemsPerPage || this.vmItemsPerPage < 1) this.vmItemsPerPage = 10; this.vmPage = 1; }
  previousVmPage(): void { if (this.vmPage > 1) this.vmPage--; }
  nextVmPage(): void { if (this.vmPage < this.totalVmPages) this.vmPage++; }
  goToVmPage(p: any): void { if (p !== '...') this.vmPage = p; }
  get vmTotalPagesArray(): (number | string)[] {
    const v = 3; let p: (number | string)[] = [];
    if (this.totalVmPages <= v + 2) p = Array.from({ length: this.totalVmPages }, (_, i) => i + 1);
    else if (this.vmPage <= v) p = [...Array.from({ length: v }, (_, i) => i + 1), '...', this.totalVmPages];
    else if (this.vmPage >= this.totalVmPages - v + 1) p = [1, '...', ...Array.from({ length: v }, (_, i) => this.totalVmPages - v + i + 1)];
    else p = [1, '...', this.vmPage - 1, this.vmPage, this.vmPage + 1, '...', this.totalVmPages];
    return p;
  }

  // Pod events pagination
  peSearch = '';
  get filteredPodEvents() {
    const q = this.peSearch.trim().toLowerCase();
    if (!q) return this.podEvents;
    return this.podEvents.filter(e =>
      e.timestamp.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      e.reason.toLowerCase().includes(q) ||
      e.message.toLowerCase().includes(q)
    );
  }
  peItemsPerPage = 10;
  pePage = 1;
  get totalPePages(): number { return Math.max(1, Math.ceil(this.filteredPodEvents.length / (this.peItemsPerPage || 10))); }
  get pagedPodEvents() {
    const ps = this.peItemsPerPage && this.peItemsPerPage > 0 ? this.peItemsPerPage : 10;
    return this.filteredPodEvents.slice((this.pePage - 1) * ps, this.pePage * ps);
  }
  get peStartIndex(): number {
    const ps = this.peItemsPerPage && this.peItemsPerPage > 0 ? this.peItemsPerPage : 10;
    return this.filteredPodEvents.length === 0 ? 0 : (this.pePage - 1) * ps + 1;
  }
  get peEndIndex(): number {
    const ps = this.peItemsPerPage && this.peItemsPerPage > 0 ? this.peItemsPerPage : 10;
    return Math.min(this.pePage * ps, this.podEvents.length);
  }
  onPeItemsPerPageChange(): void { if (!this.peItemsPerPage || this.peItemsPerPage < 1) this.peItemsPerPage = 10; this.pePage = 1; }
  previousPePage(): void { if (this.pePage > 1) this.pePage--; }
  nextPePage(): void { if (this.pePage < this.totalPePages) this.pePage++; }
  goToPePage(p: any): void { if (p !== '...') this.pePage = p; }
  get peTotalPagesArray(): (number | string)[] {
    const v = 3; let p: (number | string)[] = [];
    if (this.totalPePages <= v + 2) p = Array.from({ length: this.totalPePages }, (_, i) => i + 1);
    else if (this.pePage <= v) p = [...Array.from({ length: v }, (_, i) => i + 1), '...', this.totalPePages];
    else if (this.pePage >= this.totalPePages - v + 1) p = [1, '...', ...Array.from({ length: v }, (_, i) => this.totalPePages - v + i + 1)];
    else p = [1, '...', this.pePage - 1, this.pePage, this.pePage + 1, '...', this.totalPePages];
    return p;
  }

  // Logs pagination
  logSearch = '';
  get filteredLogs() {
    const q = this.logSearch.trim().toLowerCase();
    if (!q) return this.logs;
    return this.logs.filter(l =>
      l.timestamp.toLowerCase().includes(q) ||
      l.message.toLowerCase().includes(q)
    );
  }
  logItemsPerPage = 10;
  logPage = 1;
  get totalLogPages(): number { return Math.max(1, Math.ceil(this.filteredLogs.length / (this.logItemsPerPage || 10))); }
  get pagedLogs() {
    const ps = this.logItemsPerPage && this.logItemsPerPage > 0 ? this.logItemsPerPage : 10;
    return this.filteredLogs.slice((this.logPage - 1) * ps, this.logPage * ps);
  }
  get logStartIndex(): number {
    const ps = this.logItemsPerPage && this.logItemsPerPage > 0 ? this.logItemsPerPage : 10;
    return this.filteredLogs.length === 0 ? 0 : (this.logPage - 1) * ps + 1;
  }
  get logEndIndex(): number {
    const ps = this.logItemsPerPage && this.logItemsPerPage > 0 ? this.logItemsPerPage : 10;
    return Math.min(this.logPage * ps, this.filteredLogs.length);
  }
  onLogItemsPerPageChange(): void { if (!this.logItemsPerPage || this.logItemsPerPage < 1) this.logItemsPerPage = 10; this.logPage = 1; }
  previousLogPage(): void { if (this.logPage > 1) this.logPage--; }
  nextLogPage(): void { if (this.logPage < this.totalLogPages) this.logPage++; }
  goToLogPage(p: any): void { if (p !== '...') this.logPage = p; }
  get logTotalPagesArray(): (number | string)[] {
    const v = 3; let p: (number | string)[] = [];
    if (this.totalLogPages <= v + 2) p = Array.from({ length: this.totalLogPages }, (_, i) => i + 1);
    else if (this.logPage <= v) p = [...Array.from({ length: v }, (_, i) => i + 1), '...', this.totalLogPages];
    else if (this.logPage >= this.totalLogPages - v + 1) p = [1, '...', ...Array.from({ length: v }, (_, i) => this.totalLogPages - v + i + 1)];
    else p = [1, '...', this.logPage - 1, this.logPage, this.logPage + 1, '...', this.totalLogPages];
    return p;
  }

  // ---- Helpers ----
  buildPolyline(series: number[], yMax: number, width = 500, height = 150): string {
    const step = width / (series.length - 1);
    return series
      .map((v, i) => {
        const x = i * step;
        const y = height - (v / yMax) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  buildAreaPath(series: number[], yMax: number, width = 500, height = 150): string {
    const step = width / (series.length - 1);
    const pts = series.map((v, i) => {
      const x = i * step;
      const y = height - (v / yMax) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M0,${height} L${pts.join(' L')} L${width},${height} Z`;
  }

  lineY(value: number, yMax: number, height = 150): number {
    return height - (value / yMax) * height;
  }

  conicGradient(segments: DonutSegment[]): string {
    let acc = 0;
    const parts = segments.map(s => {
      const start = acc;
      acc += s.pct;
      return `${s.color} ${start}% ${acc}%`;
    });
    return `conic-gradient(${parts.join(', ')})`;
  }
}