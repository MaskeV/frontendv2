import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ExportService, ExportColumn } from '../../../../../../services/export.service';

interface Series {
  name: string;
  color: string;
  dash?: boolean;
  area?: boolean;
  data: number[];
  path?: string;
  areaPath?: string;
  hoverVal?: number;
  hoverY?: number;
}
interface Chart {
  title: string;
  icon: string;
  iconColor: string;
  max: number;
  unit: string;
  ticks: number[];
  series: Series[];
  yTicks?: { y: number; label: string }[];
  xTicks?: { x: number; label: string }[];
  hovered?: boolean;
  hoverCursorX?: number;
  hoverTime?: string;
  tooltipLeft?: number;
}

@Component({
  selector: 'app-node-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './node-details.component.html',
  styleUrls: ['./node-details.component.css']
})
export class NodeDetailsComponent implements OnInit {
  node = {
    name: 'aks-default-24770023-vmss00001w', status: 'Healthy', cluster: 'aks-live', ip: '10.224.0.7',
    kubelet: 'v1.36.3', created: '32d 4h ago', podCount: 31
  };

  tabs = ['Overview', 'Pods', 'Node events', 'Logs', 'YAML'];
  activeTab = 'Overview';

  icons: Record<string, string> = {
    cpu: 'M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM10 10h4v4h-4z',
    memory: 'M3 7h18v10H3zM7 10v4M11 10v4M15 10v4M19 10v4',
    pods: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
    network: 'M12 6.5a2 2 0 1 0 .01 0M6 17a2 2 0 1 0 .01 0M18 17a2 2 0 1 0 .01 0M11 8.3L7 15.2M13 8.3l4 6.9',
    disk: 'M5 4h14v16H5zM5 14h14M9 17h.01',
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
    bell: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    search: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M21 21l-4.35-4.35',
    refresh: 'M23 4v6h-6 M1 20v-6h6 M3.5 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.65 4.36A9 9 0 0 0 20.5 15',
    thumb: 'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3',
    chevDown: 'M6 9l6 6 6-6',
    helm: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v6 M12 16v6 M2 12h6 M16 12h6',
    more: 'M5 12h.01 M12 12h.01 M19 12h.01'
  };

  kpis: any[] = [
    { icon: 'cpu', label: 'CPU (Allocatable)', value: '12 Cores', sub: 'Usage 28.3%', tone: 'tone-blue', pct: 28.3 },
    { icon: 'memory', label: 'Memory (Allocatable)', value: '22.4 GiB', sub: 'Usage 47.9%', tone: 'tone-purple', pct: 47.9 },
    { icon: 'pods', label: 'Pods', value: '78 / 110', sub: 'Current / Allocatable', tone: 'tone-blue', pct: 70.9 },
    { icon: 'network', label: 'Network I/O', value: '125 Mbps', sub: '↓ 68 Mbps  ↑ 57 Mbps', tone: 'tone-orange', pct: 62 },
    { icon: 'disk', label: 'Disk Usage (Root)', value: '32.1%', sub: '21.4 GiB / 66.8 GiB', tone: 'tone-blue', pct: 32.1 },
    { icon: 'check', label: 'Node Conditions', value: '14 / 14', sub: 'All healthy', tone: 'tone-green' }
  ];

  charts: Chart[] = [];
  donuts: any[] = [];

  conditions = [
    { name: 'Ready', status: 'True', since: '32d 4h' },
    { name: 'MemoryPressure', status: 'False', since: '32d 4h' },
    { name: 'DiskPressure', status: 'False', since: '32d 4h' },
    { name: 'PIDPressure', status: 'False', since: '32d 4h' },
    { name: 'NetworkUnavailable', status: 'False', since: '32d 4h' }
  ];

  pods = [
    { name: 'flagd-6c6c6c5bdf-qxnlr', ns: 'astroshop', status: 'Running', ready: '2/2', restarts: 0, cpu: '28.2 mCores', mem: '71 MiB', age: '29 min 26 s' },
    { name: 'flagd-restart-zz7kx', ns: 'astroshop', status: 'Pending', ready: '0/1', restarts: 0, cpu: '0 mCores', mem: '0 MiB', age: '29 min 29 s' },
    { name: 'flagd-6c6c6c5bdf-p46m4', ns: 'astroshop', status: 'Failed', ready: '0/2', restarts: 0, cpu: '0 mCores', mem: '0 MiB', age: '1 h 2 min' },
    { name: 'azure-wi-webhook-controller-6f7f6', ns: 'kube-system', status: 'Running', ready: '1/1', restarts: 0, cpu: '12.5 mCores', mem: '96 MiB', age: '6 h 46 min' },
    { name: 'load-generator-fc8f6b4d-pqj6c', ns: 'smartfreight', status: 'Running', ready: '1/1', restarts: 0, cpu: '15.3 mCores', mem: '64 MiB', age: '6 d' },
    { name: 'coredns-78fcd69978-8vqw2', ns: 'kube-system', status: 'Running', ready: '1/1', restarts: 0, cpu: '8.4 mCores', mem: '32 MiB', age: '32 d' },
    { name: 'coredns-78fcd69978-hpmc5', ns: 'kube-system', status: 'Running', ready: '1/1', restarts: 0, cpu: '9.1 mCores', mem: '34 MiB', age: '32 d' },
    { name: 'konnectivity-agent-6b8764f6-k7q', ns: 'kube-system', status: 'Running', ready: '1/1', restarts: 0, cpu: '14.2 mCores', mem: '48 MiB', age: '32 d' },
    { name: 'ama-metrics-node-2pql8', ns: 'kube-system', status: 'Running', ready: '2/2', restarts: 0, cpu: '24.1 mCores', mem: '112 MiB', age: '32 d' },
    { name: 'azure-cni-networkmonitor-5xwqz', ns: 'kube-system', status: 'Running', ready: '1/1', restarts: 0, cpu: '5.6 mCores', mem: '28 MiB', age: '32 d' },
    { name: 'frontend-7d4b9c8b74-2l9xm', ns: 'astroshop', status: 'Running', ready: '1/1', restarts: 0, cpu: '34.8 mCores', mem: '142 MiB', age: '14 d' },
    { name: 'redis-cart-5f569b95dc-x9wql', ns: 'astroshop', status: 'Running', ready: '1/1', restarts: 0, cpu: '18.7 mCores', mem: '88 MiB', age: '22 d' }
  ];

  events = [
    { time: '2024-09-24 15:05', type: 'Normal', reason: 'NodeReady', msg: 'Node aks-default-24770023-vmss00001w is ready' },
    { time: '2024-09-24 14:58', type: 'Normal', reason: 'Starting', msg: 'Starting kubelet.' },
    { time: '2024-09-24 14:27', type: 'Warning', reason: 'ImageGCFailed', msg: 'Failed to garbage collect images: context...' },
    { time: '2024-09-24 13:55', type: 'Normal', reason: 'NodeHasSufficientMemory', msg: 'Node has sufficient memory available' },
    { time: '2024-09-24 13:41', type: 'Normal', reason: 'NodeHasNoDiskPressure', msg: 'Node has no disk pressure' },
    { time: '2024-09-24 13:10', type: 'Normal', reason: 'NodeAllocatableEnforced', msg: 'Updated Node Allocatable limit' },
    { time: '2024-09-24 12:45', type: 'Normal', reason: 'NodeHasSufficientPID', msg: 'Node has sufficient PID available' },
    { time: '2024-09-24 11:30', type: 'Normal', reason: 'RegisteredNode', msg: 'Node aks-default-24770023-vmss00001w registered successfully' },
    { time: '2024-09-24 10:15', type: 'Warning', reason: 'FreeDiskSpaceFailed', msg: 'Failed to find disk space to free' },
    { time: '2024-09-24 09:00', type: 'Normal', reason: 'Starting', msg: 'Starting kube-proxy.' },
    { time: '2024-09-24 08:30', type: 'Normal', reason: 'NodeReady', msg: 'Node joined cluster successfully' },
    { time: '2024-09-24 07:15', type: 'Normal', reason: 'KubeletStarted', msg: 'Kubelet daemon active' }
  ];

  search = '';
  statusFilter = 'All';
  nsFilter = 'All';

  // Pods pagination
  podItemsPerPage = 10;
  podPage = 1;

  // Backward compatibility alias for page
  get page(): number { return this.podPage; }
  set page(val: number) { this.podPage = val; }

  get filteredPods() {
    const q = this.search.trim().toLowerCase();
    return this.pods.filter(p =>
      (!q || p.name.toLowerCase().includes(q)) &&
      (this.statusFilter === 'All' || p.status === this.statusFilter) &&
      (this.nsFilter === 'All' || p.ns === this.nsFilter));
  }

  get podTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredPods.length / (this.podItemsPerPage || 10)));
  }

  get pagedPods() {
    const pageSize = this.podItemsPerPage && this.podItemsPerPage > 0 ? this.podItemsPerPage : 10;
    const start = (this.podPage - 1) * pageSize;
    return this.filteredPods.slice(start, start + pageSize);
  }

  get podStartIndex(): number {
    const pageSize = this.podItemsPerPage && this.podItemsPerPage > 0 ? this.podItemsPerPage : 10;
    return this.filteredPods.length === 0 ? 0 : (this.podPage - 1) * pageSize + 1;
  }

  get podEndIndex(): number {
    const pageSize = this.podItemsPerPage && this.podItemsPerPage > 0 ? this.podItemsPerPage : 10;
    return Math.min(this.podPage * pageSize, this.filteredPods.length);
  }

  onPodItemsPerPageChange(): void {
    if (this.podItemsPerPage === null || this.podItemsPerPage === undefined || this.podItemsPerPage < 1) {
      this.podItemsPerPage = 10;
    }
    this.podPage = 1;
  }

  previousPodPage(): void {
    if (this.podPage > 1) {
      this.podPage--;
    }
  }

  nextPodPage(): void {
    if (this.podPage < this.podTotalPages) {
      this.podPage++;
    }
  }

  goToPodPage(p: any): void {
    if (p !== '...') {
      this.podPage = p;
    }
  }

  get podTotalPagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.podTotalPages <= visiblePages + 2) {
      pages = Array.from({ length: this.podTotalPages }, (_, i) => i + 1);
    } else {
      if (this.podPage <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.podTotalPages];
      } else if (this.podPage >= this.podTotalPages - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.podTotalPages - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.podPage - 1, this.podPage, this.podPage + 1, '...', this.podTotalPages];
      }
    }
    return pages;
  }

  // Node Events pagination
  evSearch = '';
  get filteredEvents() {
    const q = this.evSearch.trim().toLowerCase();
    if (!q) return this.events;
    return this.events.filter(e => e.time.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.reason.toLowerCase().includes(q) || e.msg.toLowerCase().includes(q));
  }
  evItemsPerPage = 10;
  evPage = 1;

  get evTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredEvents.length / (this.evItemsPerPage || 10)));
  }

  get pagedEvents() {
    const pageSize = this.evItemsPerPage && this.evItemsPerPage > 0 ? this.evItemsPerPage : 10;
    const start = (this.evPage - 1) * pageSize;
    return this.filteredEvents.slice(start, start + pageSize);
  }

  get evStartIndex(): number {
    const pageSize = this.evItemsPerPage && this.evItemsPerPage > 0 ? this.evItemsPerPage : 10;
    return this.filteredEvents.length === 0 ? 0 : (this.evPage - 1) * pageSize + 1;
  }

  get evEndIndex(): number {
    const pageSize = this.evItemsPerPage && this.evItemsPerPage > 0 ? this.evItemsPerPage : 10;
    return Math.min(this.evPage * pageSize, this.filteredEvents.length);
  }

  onEvItemsPerPageChange(): void {
    if (this.evItemsPerPage === null || this.evItemsPerPage === undefined || this.evItemsPerPage < 1) {
      this.evItemsPerPage = 10;
    }
    this.evPage = 1;
  }

  previousEvPage(): void {
    if (this.evPage > 1) {
      this.evPage--;
    }
  }

  nextEvPage(): void {
    if (this.evPage < this.evTotalPages) {
      this.evPage++;
    }
  }

  goToEvPage(p: any): void {
    if (p !== '...') {
      this.evPage = p;
    }
  }

  get evTotalPagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.evTotalPages <= visiblePages + 2) {
      pages = Array.from({ length: this.evTotalPages }, (_, i) => i + 1);
    } else {
      if (this.evPage <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.evTotalPages];
      } else if (this.evPage >= this.evTotalPages - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.evTotalPages - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.evPage - 1, this.evPage, this.evPage + 1, '...', this.evTotalPages];
      }
    }
    return pages;
  }

  // Node conditions pagination
  condSearch = '';
  get filteredConditions() {
    const q = this.condSearch.trim().toLowerCase();
    if (!q) return this.conditions;
    return this.conditions.filter(c => c.name.toLowerCase().includes(q) || c.status.toLowerCase().includes(q) || c.since.toLowerCase().includes(q));
  }
  condItemsPerPage = 10;
  condPage = 1;

  get condTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredConditions.length / (this.condItemsPerPage || 10)));
  }

  get pagedConditions() {
    const pageSize = this.condItemsPerPage && this.condItemsPerPage > 0 ? this.condItemsPerPage : 10;
    const start = (this.condPage - 1) * pageSize;
    return this.filteredConditions.slice(start, start + pageSize);
  }

  get condStartIndex(): number {
    const pageSize = this.condItemsPerPage && this.condItemsPerPage > 0 ? this.condItemsPerPage : 10;
    return this.filteredConditions.length === 0 ? 0 : (this.condPage - 1) * pageSize + 1;
  }

  get condEndIndex(): number {
    const pageSize = this.condItemsPerPage && this.condItemsPerPage > 0 ? this.condItemsPerPage : 10;
    return Math.min(this.condPage * pageSize, this.filteredConditions.length);
  }

  onCondItemsPerPageChange(): void {
    if (this.condItemsPerPage === null || this.condItemsPerPage === undefined || this.condItemsPerPage < 1) {
      this.condItemsPerPage = 10;
    }
    this.condPage = 1;
  }

  previousCondPage(): void {
    if (this.condPage > 1) {
      this.condPage--;
    }
  }

  nextCondPage(): void {
    if (this.condPage < this.condTotalPages) {
      this.condPage++;
    }
  }

  goToCondPage(p: any): void {
    if (p !== '...') {
      this.condPage = p;
    }
  }

  get condTotalPagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.condTotalPages <= visiblePages + 2) {
      pages = Array.from({ length: this.condTotalPages }, (_, i) => i + 1);
    } else {
      if (this.condPage <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.condTotalPages];
      } else if (this.condPage >= this.condTotalPages - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.condTotalPages - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.condPage - 1, this.condPage, this.condPage + 1, '...', this.condTotalPages];
      }
    }
    return pages;
  }

  openExportMenu: string | null = null;

  constructor(private route: ActivatedRoute, private router: Router, private exportService: ExportService) { }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.openExportMenu && !target.closest('.k8s-export-wrap')) {
      this.openExportMenu = null;
    }
  }

  toggleExportMenu(name: string): void {
    this.openExportMenu = this.openExportMenu === name ? null : name;
  }

  exportConditions(format: 'xlsx' | 'csv'): void {
    this.openExportMenu = null;
    const data = this.filteredConditions;
    const columns: ExportColumn<any>[] = [
      { header: 'Condition', field: 'name' },
      { header: 'Status', field: 'status' },
      { header: 'Last Transition', field: 'since' }
    ];
    const filename = `Conditions_${this.node.name || 'node'}`;
    if (format === 'xlsx') {
      this.exportService.exportToExcel(data, columns, filename);
    } else {
      this.exportService.exportToCsv(data, columns, filename);
    }
  }

  exportPods(format: 'xlsx' | 'csv'): void {
    this.openExportMenu = null;
    const data = this.filteredPods;
    const columns: ExportColumn<any>[] = [
      { header: 'Pod Name', field: 'name' },
      { header: 'Namespace', field: 'ns' },
      { header: 'Status', field: 'status' },
      { header: 'Ready', field: 'ready' },
      { header: 'Restarts', field: 'restarts' },
      { header: 'CPU Usage', field: 'cpu' },
      { header: 'Memory Usage', field: 'mem' },
      { header: 'Age', field: 'age' }
    ];
    const filename = `Pods_${this.node.name || 'node'}`;
    if (format === 'xlsx') {
      this.exportService.exportToExcel(data, columns, filename);
    } else {
      this.exportService.exportToCsv(data, columns, filename);
    }
  }

  exportEvents(format: 'xlsx' | 'csv'): void {
    this.openExportMenu = null;
    const data = this.filteredEvents;
    const columns: ExportColumn<any>[] = [
      { header: 'Timestamp', field: 'time' },
      { header: 'Type', field: 'type' },
      { header: 'Reason', field: 'reason' },
      { header: 'Message', field: 'msg' }
    ];
    const filename = `Events_${this.node.name || 'node'}`;
    if (format === 'xlsx') {
      this.exportService.exportToExcel(data, columns, filename);
    } else {
      this.exportService.exportToCsv(data, columns, filename);
    }
  }

  resetFilters() {
    this.search = '';
    this.statusFilter = 'All';
    this.nsFilter = 'All';
    this.podPage = 1;
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const name = params.get('name') || params.get('node');
      if (name) {
        this.node.name = name;
        if (this.events && this.events.length > 0) {
          this.events[0].msg = `Node ${name} is ready`;
        }
      }
      const status = params.get('status');
      if (status) {
        this.node.status = status;
      }
      const kubelet = params.get('version');
      if (kubelet) {
        this.node.kubelet = kubelet;
      }
      const podsUsed = params.get('podsUsed');
      const podsTotal = params.get('podsTotal');
      if (podsUsed) {
        this.node.podCount = Number(podsUsed) || this.node.podCount;
        if (podsTotal && this.kpis && this.kpis[2]) {
          this.kpis[2].value = `${podsUsed} / ${podsTotal}`;
          const used = Number(podsUsed);
          const tot = Number(podsTotal);
          if (tot > 0) {
            this.kpis[2].pct = Math.round((used / tot) * 1000) / 10;
          }
        }
      }
    });

    const blue = '#38a5e8', purple = '#a855f7', green = '#12b76a', orange = '#f97316', teal = '#22b8cf';
    const n = 90;
    const wave = (base: number, amp: number, seed: number) =>
      Array.from({ length: n }, (_, i) => base + amp * (Math.sin(i * 0.35 + seed) * 0.6 + Math.sin(i * 0.93 + seed * 2) * 0.4));
    const flat = (v: number) => [v, v];

    this.charts = [
      {
        title: 'CPU Usage (% of allocatable)', icon: 'cpu', iconColor: '#1d8fe1', max: 360, unit: ' %', ticks: [0, 120, 240, 360], series: [
          { name: 'CPU usage (% of allocatable)', color: blue, area: true, data: wave(112, 6, 1) },
          { name: 'CPU requests (% of allocatable)', color: purple, dash: true, data: flat(200) },
          { name: 'CPU limits (% of allocatable)', color: '#3b82f6', dash: true, data: flat(335) }]
      },
      {
        title: 'Memory Usage (% of allocatable)', icon: 'memory', iconColor: green, max: 180, unit: ' %', ticks: [0, 60, 120, 180], series: [
          { name: 'Memory usage (% of allocatable)', color: green, area: true, data: wave(94, 4, 3) },
          { name: 'Memory requests (% of allocatable)', color: purple, dash: true, data: flat(118) },
          { name: 'Memory limits (% of allocatable)', color: '#3b82f6', dash: true, data: flat(168) }]
      },
      {
        title: 'Pods', icon: 'pods', iconColor: '#7c3aed', max: 120, unit: '', ticks: [0, 40, 80, 120], series: [
          { name: 'Running pods', color: blue, area: true, data: wave(83, 2.5, 5) },
          { name: 'Allocatable pods', color: purple, dash: true, data: flat(110) }]
      },
      {
        title: 'Network I/O', icon: 'network', iconColor: '#1d8fe1', max: 200, unit: ' Mbps', ticks: [0, 100, 200], series: [
          { name: 'Incoming (Mbps)', color: orange, data: wave(98, 10, 2) },
          { name: 'Outgoing (Mbps)', color: teal, data: wave(135, 10, 4) }]
      },
      {
        title: 'Filesystem Usage', icon: 'disk', iconColor: '#1d8fe1', max: 100, unit: ' %', ticks: [0, 50, 100], series: [
          { name: '/ (Root)', color: '#3b82f6', data: wave(33, 1.2, 1) },
          { name: '/var', color: green, data: wave(40, 1.2, 2) },
          { name: '/var/log', color: purple, data: wave(52, 1.5, 3) },
          { name: '/kubelet', color: orange, data: wave(8, 0.5, 4) }]
      }
    ];
    this.charts.forEach(c => this.buildChart(c));

    const C = 2 * Math.PI * 44;
    const dash = (p: number) => `${(p / 100) * C} ${C}`;
    this.donuts = [
      {
        title: 'CPU Breakdown', icon: 'cpu', iconColor: '#1d8fe1', color: '#2f80ed', dash: dash(28.3), center: '12', unit: 'Cores', rows: [
          { label: 'Used', value: '3.40 (28.3%)', color: '#2f80ed' }, { label: 'Requested', value: '10.53 (87.7%)', color: '#8b3ff0' },
          { label: 'Available', value: '8.60 (71.7%)', color: '#c9ced6' }, { label: 'Allocatable', value: '12.00 (100%)', color: '#8f98a6' }]
      },
      {
        title: 'Memory Breakdown', icon: 'memory', iconColor: '#1d8fe1', color: '#12b76a', dash: dash(47.9), center: '22.4', unit: 'GiB', rows: [
          { label: 'Used', value: '10.74 (47.9%)', color: '#12b76a' }, { label: 'Requested', value: '16.05 (71.6%)', color: '#8b3ff0' },
          { label: 'Available', value: '11.66 (52.1%)', color: '#c9ced6' }, { label: 'Allocatable', value: '22.40 (100%)', color: '#8f98a6' }]
      },
      {
        title: 'Disk Usage (Root Filesystem)', icon: 'disk', iconColor: '#1d8fe1', color: '#2f80ed', dash: dash(32.1), center: '32.1%', unit: 'Used', small: true, rows: [
          { label: 'Used', value: '21.4 GiB (32.1%)', color: '#2f80ed' }, { label: 'Available', value: '45.4 GiB (67.9%)', color: '#c9ced6' },
          { label: 'Capacity', value: '66.8 GiB (100%)', color: '#8f98a6' }]
      }
    ];
  }

  private buildChart(c: Chart): void {
    const L = 48, R = 436, T = 8, B = 118, W = R - L, H = B - T;
    const y = (v: number) => B - (v / c.max) * H;
    c.yTicks = c.ticks.map(t => ({ y: y(t), label: t + c.unit }));
    const labels = ['13:30', '13:45', '14:00', '14:15', '14:30', '14:45', '15:00', '15:15'];
    c.xTicks = labels.map((label, i) => ({ x: L + 14 + i * ((W - 28) / 7), label }));
    c.series.forEach(s => {
      const pts = s.data.map((v, i) => `${(L + (i * W) / (s.data.length - 1)).toFixed(1)} ${y(v).toFixed(1)}`);
      s.path = 'M' + pts.join(' L');
      s.areaPath = `${s.path} L${R} ${B} L${L} ${B} Z`;
    });
  }

  onChartMouseMove(event: MouseEvent, hoveredChart: Chart): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, mouseX / rect.width));

    const L = 48, W = 388;
    const svgX = +((L + pct * W).toFixed(1));
    const timeLabel = this.getTimeLabelForPct(pct);

    let tooltipPct = pct * 100;
    if (pct > 0.5) {
      tooltipPct = Math.max(2, pct * 100 - 46);
    } else {
      tooltipPct = Math.min(54, pct * 100 + 4);
    }

    // Synchronize hover state across charts in the same row
    let targetCharts: Chart[];
    if (hoveredChart === this.charts[0] || hoveredChart === this.charts[1]) {
      targetCharts = [this.charts[0], this.charts[1]];
    } else if (hoveredChart === this.charts[2]) {
      targetCharts = [this.charts[2]];
    } else {
      targetCharts = this.charts.slice(3);
    }

    targetCharts.forEach(c => {
      c.hovered = true;
      c.hoverCursorX = svgX;
      c.hoverTime = timeLabel;
      c.tooltipLeft = tooltipPct;

      c.series.forEach(s => {
        let val: number;
        if (!s.data || s.data.length === 0) {
          val = 0;
        } else if (s.data.length === 1 || s.data.length === 2) {
          val = s.data[0];
        } else {
          const idxFloat = pct * (s.data.length - 1);
          const idxLow = Math.floor(idxFloat);
          const idxHigh = Math.min(s.data.length - 1, Math.ceil(idxFloat));
          const fraction = idxFloat - idxLow;
          val = s.data[idxLow] * (1 - fraction) + s.data[idxHigh] * fraction;
        }
        s.hoverVal = +(val.toFixed(1));
        s.hoverY = Math.max(6, Math.min(120, +((118 - (s.hoverVal / c.max) * 110).toFixed(1))));
      });
    });
  }

  onChartMouseLeave(): void {
    this.charts.forEach(c => {
      c.hovered = false;
    });
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

  goToKubernetes(): void {
    this.router.navigate(['/kubernetes']);
  }

  goToCluster(): void {
    this.router.navigate(['/kubernetes-cluster'], { queryParams: { cluster: this.node.cluster || 'aks-live' } });
  }

  goBackToNodes(): void {
    this.router.navigate(['/kubernetes-node']);
  }

  onPodClick(podName: string): void {
    this.router.navigate(['/pod-details'], { queryParams: { pod: podName, name: podName } });
  }

  onNamespaceClick(nsName: string): void {
    this.router.navigate(['/namespace-details'], { queryParams: { namespace: nsName, name: nsName } });
  }
}