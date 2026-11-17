import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ExportService, ExportColumn } from '../../../../../../services/export.service';

interface Segment { label: string; text: string; pct: number; color: string; }

interface UsageSeries {
  name: string;
  color: string;
  dashed: boolean;
  data: number[];
  hoverVal?: number;
  hoverY?: number;
}

interface UsageChart {
  title: string;
  icon: string;
  color: string;
  series: UsageSeries[];
  hovered?: boolean;
  hoverCursorX?: number;
  hoverTime?: string;
  tooltipLeft?: number;
}

@Component({
  selector: 'app-workload-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workload-details.component.html',
  styleUrls: ['./workload-details.component.css'],
})
export class WorkloadDetailsComponent implements OnInit {
  breadcrumbs = ['Kubernetes', 'aks-live', 'Namespaces', 'astroshop', 'Workloads', 'dynatrace-operator'];

  workload = {
    name: 'dynatrace-operator',
    status: 'Running',
    kind: 'Deployment',
    namespace: 'astoshop',
    replicas: '1 / 1',
    age: '16 d 6 h',
    labels: 'app=dynatrace-operator, env=uat',
    selector: 'app=dynatrace-operator',
  };

  times = ['14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45'];

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
    more: 'M5 12h.01 M12 12h.01 M19 12h.01',
    cube: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.3 7l8.7 5 8.7-5 M12 22V12',
    layers: 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
    copy: 'M8 4v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2z M4 8H2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
    expand: 'M15 3h6v6 M9 21H3v-6 M21 3l-7 7 M3 21l7-7',
    check: 'M20 6L9 17l-5-5',
    close: 'M18 6L6 18 M6 6l12 12',
    arrowLeft: 'M19 12H5 M12 19l-7-7 7-7'
  };

  kpis = [
    { label: 'Replicas', value: '1 / 1', icon: 'cube', tone: 'tone-blue', sub: 'Available', danger: false },
    { label: 'Total Pods', value: '1', icon: 'pods', tone: 'tone-blue', sub: 'Running 1 | Failed 0', danger: false },
    { label: 'CPU Usage (avg)', value: '28.2 mCores', icon: 'cpu', tone: 'tone-blue', sub: '↓ 12% vs last 2h', danger: false },
    { label: 'Memory Usage (avg)', value: '47.9 MiB', icon: 'memory', tone: 'tone-purple', sub: '↓ 8% vs last 2h', danger: false },
    { label: 'Restarts (total)', value: '4', icon: 'refresh', tone: 'tone-orange', sub: 'Last 7 days', danger: false },
    { label: 'Workload Status', value: 'Healthy', icon: 'check', tone: 'tone-green', sub: 'All checks passing', danger: false },
  ];

  usageCharts: UsageChart[] = [
    {
      title: 'CPU Usage (% of allocated)', icon: 'cpu', color: '#0ea5e9',
      series: [
        { name: 'CPU usage', color: '#38bdf8', dashed: false, data: this.wave(60, 28, 3, 7) },
        { name: 'CPU requests', color: '#2f80ed', dashed: true, data: Array(60).fill(150) },
        { name: 'CPU limits', color: '#c026d3', dashed: true, data: Array(60).fill(90) },
      ],
    },
    {
      title: 'Memory Usage (% of allocated)', icon: 'memory', color: '#16a34a',
      series: [
        { name: 'Memory usage', color: '#38bdf8', dashed: false, data: this.wave(60, 30, 3, 9) },
        { name: 'Memory requests', color: '#c026d3', dashed: true, data: Array(60).fill(90) },
        { name: 'Memory limits', color: '#2f80ed', dashed: true, data: Array(60).fill(150) },
      ],
    },
  ];

  donuts: { title: string; icon: string; center: string; unit: string; pct: string; segments: Segment[] }[] = [
    {
      title: 'CPU Breakdown', icon: 'cpu', center: '28.2', unit: 'mCores', pct: '18.8%',
      segments: [
        { label: 'User', text: '12.4 mCores (44.0%)', pct: 44, color: '#2f80ed' },
        { label: 'System', text: '8.1 mCores (28.7%)', pct: 28.7, color: '#f59e0b' },
        { label: 'I/O Wait', text: '2.3 mCores (8.2%)', pct: 8.2, color: '#ec4899' },
        { label: 'Idle', text: '5.4 mCores (19.1%)', pct: 19.1, color: '#cbd5e1' },
      ],
    },
    {
      title: 'Memory Breakdown', icon: 'memory', center: '47.9', unit: 'MiB', pct: '37.4%',
      segments: [
        { label: 'Used', text: '47.9 MiB (37.4%)', pct: 37.4, color: '#10b981' },
        { label: 'Cache', text: '38.2 MiB (29.8%)', pct: 29.8, color: '#2f80ed' },
        { label: 'Buffers', text: '12.1 MiB (9.4%)', pct: 9.4, color: '#a855f7' },
        { label: 'Free', text: '30.4 MiB (23.4%)', pct: 23.4, color: '#cbd5e1' },
      ],
    },
  ];

  openExportMenu: string | null = null;

  constructor(private route: ActivatedRoute, private router: Router, private exportService: ExportService) {
    this.updateYaml();
    this.donuts.push({
      title: 'Filesystem Usage', icon: 'disk', center: '1.2', unit: 'GiB', pct: '24.0%',
      segments: [
        { label: 'Used', text: '1.2 GiB (24.0%)', pct: 24, color: '#2f80ed' },
        { label: 'Available', text: '3.8 GiB (76.0%)', pct: 76, color: '#cbd5e1' },
        { label: 'Capacity', text: '5.0 GiB (100%)', pct: 0, color: '#94a3b8' },
      ],
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const name = params.get('name') || params.get('workload');
      if (name) {
        this.workload.name = name;
        if (this.breadcrumbs && this.breadcrumbs.length > 0) {
          this.breadcrumbs[this.breadcrumbs.length - 1] = name;
        }
        this.workload.labels = `app=${name}, env=uat`;
        this.workload.selector = `app=${name}`;
        this.pods = [
          {
            name: `${name}-d5bf5484-k4z8c`, status: 'Running', ready: '1/1', restarts: 0, age: '16 d 6 h',
            node: 'aks-default-24770...', ip: '10.244.1.133', cpu: '28.2 mCores', mem: '47.9 MiB',
          },
          {
            name: `${name}-d5bf5484-9r2pl`, status: 'Running', ready: '1/1', restarts: 0, age: '16 d 6 h',
            node: 'aks-default-24771...', ip: '10.244.1.134', cpu: '24.1 mCores', mem: '42.3 MiB',
          }
        ];
        this.podsList = this.pods.map(p => p.name);
        this.selectedLogPod = this.podsList[0];
        if (this.services && this.services.length > 0) {
          this.services[0].name = name;
        }
        this.updateYaml();
      }
      const kind = params.get('type') || params.get('kind');
      if (kind) {
        this.workload.kind = kind;
        this.updateYaml();
      }
      const ns = params.get('namespace');
      if (ns) {
        this.workload.namespace = ns;
        if (this.breadcrumbs && this.breadcrumbs.length >= 4) {
          this.breadcrumbs[3] = ns;
        }
        this.updateYaml();
      }
      const status = params.get('status');
      if (status) {
        this.workload.status = status;
      }
      const pods = params.get('pods');
      if (pods) {
        this.workload.replicas = pods;
        if (this.kpis && this.kpis[0]) {
          this.kpis[0].value = pods;
        }
      }
      const age = params.get('age');
      if (age) {
        this.workload.age = age;
        if (this.pods && this.pods.length > 0) {
          this.pods[0].age = age;
        }
      }
    });
  }

  netIn = this.wave(40, 200, 25, 11);
  netOut = this.wave(40, 160, 25, 12);

  netChart: UsageChart = {
    title: 'Network I/O',
    icon: 'network',
    color: '#2f80ed',
    series: [
      { name: 'Incoming', color: '#f59e0b', dashed: false, data: this.netOut },
      { name: 'Outgoing', color: '#2f80ed', dashed: false, data: this.netIn },
    ],
  };

  pods = [
    {
      name: 'netraa-apm-d5bf5484-k4z8c', status: 'Running', ready: '1/1', restarts: 0, age: '16 d 6 h',
      node: 'aks-default-24770...', ip: '10.244.1.133', cpu: '28.2 mCores', mem: '47.9 MiB',
    },
    {
      name: 'netraa-apm-d5bf5484-9r2pl', status: 'Running', ready: '1/1', restarts: 0, age: '16 d 6 h',
      node: 'aks-default-24771...', ip: '10.244.1.134', cpu: '24.1 mCores', mem: '42.3 MiB',
    }
  ];
  podsList: string[] = ['netraa-apm-d5bf5484-k4z8c', 'netraa-apm-d5bf5484-9r2pl'];
  selectedLogPod = 'netraa-apm-d5bf5484-k4z8c';
  logFilterText = '';
  selectedLogLevel = 'All';
  isQueryRunning = false;

  services = [{
    name: 'netraa-apm', type: 'ClusterIP', clusterIp: '10.0.195.11', externalIp: '-',
    ports: '443/TCP, 80/TCP', age: '16 d',
  }];

  events = [
    { time: '2024-09-24 15:01:22', type: 'Normal', reason: 'ScalingReplicaSet', message: 'Scaled up replica set netraa-apm-d5bf5484 to 1' },
    { time: '2024-09-24 14:56:18', type: 'Normal', reason: 'Pulled', message: 'Successfully pulled image "registry.netraa.io/apm/operator:v1.2.3"' },
    { time: '2024-09-24 14:56:17', type: 'Normal', reason: 'Created', message: 'Created container netraa-apm' },
    { time: '2024-09-24 14:56:17', type: 'Normal', reason: 'Started', message: 'Started container netraa-apm' },
    { time: '2024-09-24 14:52:10', type: 'Normal', reason: 'Scheduled', message: 'Successfully assigned aks-live/netraa-apm to node aks-default-24770' },
    { time: '2024-09-24 14:48:02', type: 'Warning', reason: 'BackOff', message: 'Back-off restarting failed container in pod netraa-apm' },
    { time: '2024-09-24 14:40:15', type: 'Normal', reason: 'Killing', message: 'Stopping container netraa-apm-old' }
  ];

  logs = [
    { time: '2024-09-24 15:15:02', pod: 'netraa-apm-d5bf5484-k4z8c', level: 'INFO', msg: '[INFO ] Starting Dynatrace Operator v1.2.3' },
    { time: '2024-09-24 15:15:03', pod: 'netraa-apm-d5bf5484-k4z8c', level: 'INFO', msg: '[INFO ] Configuration loaded successfully from configmap' },
    { time: '2024-09-24 15:15:05', pod: 'netraa-apm-d5bf5484-k4z8c', level: 'INFO', msg: '[INFO ] Reconciling DynaKube custom resources' },
    { time: '2024-09-24 15:15:06', pod: 'netraa-apm-d5bf5484-k4z8c', level: 'DEBUG', msg: '[DEBUG] Watching Kubernetes events on cluster astoshop' },
    { time: '2024-09-24 15:15:10', pod: 'netraa-apm-d5bf5484-k4z8c', level: 'INFO', msg: '[INFO ] Reconcile completed in 2.3s' },
    { time: '2024-09-24 15:15:15', pod: 'netraa-apm-d5bf5484-k4z8c', level: 'INFO', msg: '[INFO ] All components are healthy' },
    { time: '2024-09-24 15:16:01', pod: 'netraa-apm-d5bf5484-k4z8c', level: 'WARN', msg: '[WARN ] Webhook certificate expires in 14 days' },
    { time: '2024-09-24 15:16:22', pod: 'netraa-apm-d5bf5484-k4z8c', level: 'DEBUG', msg: '[DEBUG] Active connection pool: 8 active, 12 idle' },
    { time: '2024-09-24 15:17:00', pod: 'netraa-apm-d5bf5484-9r2pl', level: 'INFO', msg: '[INFO ] Worker pod netraa-apm-d5bf5484-9r2pl initialized' },
    { time: '2024-09-24 15:17:05', pod: 'netraa-apm-d5bf5484-9r2pl', level: 'DEBUG', msg: '[DEBUG] Heartbeat sent to control plane' },
    { time: '2024-09-24 15:17:40', pod: 'netraa-apm-d5bf5484-9r2pl', level: 'ERROR', msg: '[ERROR] Failed to fetch metric stream: timeout 5000ms' }
  ];

  // Pods pagination
  podSearch = '';
  get filteredPods() {
    const q = this.podSearch.trim().toLowerCase();
    if (!q) return this.pods;
    return this.pods.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q) ||
      p.node.toLowerCase().includes(q) ||
      p.ip.toLowerCase().includes(q)
    );
  }
  podItemsPerPage = 10;
  podPage = 1;

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

  // Services pagination
  svcSearch = '';
  get filteredServices() {
    const q = this.svcSearch.trim().toLowerCase();
    if (!q) return this.services;
    return this.services.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.type.toLowerCase().includes(q) ||
      s.clusterIp.toLowerCase().includes(q) ||
      s.externalIp.toLowerCase().includes(q) ||
      s.ports.toLowerCase().includes(q)
    );
  }
  svcItemsPerPage = 10;
  svcPage = 1;

  get svcTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredServices.length / (this.svcItemsPerPage || 10)));
  }

  get pagedServices() {
    const pageSize = this.svcItemsPerPage && this.svcItemsPerPage > 0 ? this.svcItemsPerPage : 10;
    const start = (this.svcPage - 1) * pageSize;
    return this.filteredServices.slice(start, start + pageSize);
  }

  get svcStartIndex(): number {
    const pageSize = this.svcItemsPerPage && this.svcItemsPerPage > 0 ? this.svcItemsPerPage : 10;
    return this.filteredServices.length === 0 ? 0 : (this.svcPage - 1) * pageSize + 1;
  }

  get svcEndIndex(): number {
    const pageSize = this.svcItemsPerPage && this.svcItemsPerPage > 0 ? this.svcItemsPerPage : 10;
    return Math.min(this.svcPage * pageSize, this.filteredServices.length);
  }

  onSvcItemsPerPageChange(): void {
    if (this.svcItemsPerPage === null || this.svcItemsPerPage === undefined || this.svcItemsPerPage < 1) {
      this.svcItemsPerPage = 10;
    }
    this.svcPage = 1;
  }

  previousSvcPage(): void {
    if (this.svcPage > 1) {
      this.svcPage--;
    }
  }

  nextSvcPage(): void {
    if (this.svcPage < this.svcTotalPages) {
      this.svcPage++;
    }
  }

  goToSvcPage(p: any): void {
    if (p !== '...') {
      this.svcPage = p;
    }
  }

  get svcTotalPagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.svcTotalPages <= visiblePages + 2) {
      pages = Array.from({ length: this.svcTotalPages }, (_, i) => i + 1);
    } else {
      if (this.svcPage <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.svcTotalPages];
      } else if (this.svcPage >= this.svcTotalPages - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.svcTotalPages - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.svcPage - 1, this.svcPage, this.svcPage + 1, '...', this.svcTotalPages];
      }
    }
    return pages;
  }

  // Events pagination & filtering
  evSearch = '';
  evTypeFilter = 'All';
  expandedEventIndex: number | null = null;

  toggleEventExpand(idx: number): void {
    this.expandedEventIndex = this.expandedEventIndex === idx ? null : idx;
  }

  get filteredEvents() {
    const q = this.evSearch.trim().toLowerCase();
    const type = this.evTypeFilter;
    return this.events.filter(e => {
      if (type !== 'All' && e.type.toLowerCase() !== type.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      return (
        e.time.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        e.reason.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q)
      );
    });
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

  // Logs pagination & filtering
  logSearch = '';

  onLogPodChange(): void {
    this.logPage = 1;
  }

  runLogQuery(): void {
    this.isQueryRunning = true;
    this.logPage = 1;
    setTimeout(() => {
      this.isQueryRunning = false;
    }, 350);
  }

  get filteredLogs() {
    const qTop = this.logSearch.trim().toLowerCase();
    const qInline = this.logFilterText.trim().toLowerCase();
    const level = this.selectedLogLevel;
    const pod = this.selectedLogPod;

    return this.logs.filter(l => {
      if (pod && l.pod && l.pod !== pod) {
        return false;
      }
      if (level !== 'All') {
        if (l.level && l.level !== level) {
          return false;
        }
        if (!l.level && !l.msg.toUpperCase().includes(`[${level}`)) {
          return false;
        }
      }
      if (qInline && !l.msg.toLowerCase().includes(qInline) && !l.time.toLowerCase().includes(qInline)) {
        return false;
      }
      if (qTop && !l.msg.toLowerCase().includes(qTop) && !l.time.toLowerCase().includes(qTop)) {
        return false;
      }
      return true;
    });
  }
  logItemsPerPage = 10;
  logPage = 1;

  get logTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLogs.length / (this.logItemsPerPage || 10)));
  }

  get pagedLogs() {
    const pageSize = this.logItemsPerPage && this.logItemsPerPage > 0 ? this.logItemsPerPage : 10;
    const start = (this.logPage - 1) * pageSize;
    return this.filteredLogs.slice(start, start + pageSize);
  }

  get logStartIndex(): number {
    const pageSize = this.logItemsPerPage && this.logItemsPerPage > 0 ? this.logItemsPerPage : 10;
    return this.filteredLogs.length === 0 ? 0 : (this.logPage - 1) * pageSize + 1;
  }

  get logEndIndex(): number {
    const pageSize = this.logItemsPerPage && this.logItemsPerPage > 0 ? this.logItemsPerPage : 10;
    return Math.min(this.logPage * pageSize, this.filteredLogs.length);
  }

  onLogItemsPerPageChange(): void {
    if (this.logItemsPerPage === null || this.logItemsPerPage === undefined || this.logItemsPerPage < 1) {
      this.logItemsPerPage = 10;
    }
    this.logPage = 1;
  }

  previousLogPage(): void {
    if (this.logPage > 1) {
      this.logPage--;
    }
  }

  nextLogPage(): void {
    if (this.logPage < this.logTotalPages) {
      this.logPage++;
    }
  }

  goToLogPage(p: any): void {
    if (p !== '...') {
      this.logPage = p;
    }
  }

  get logTotalPagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.logTotalPages <= visiblePages + 2) {
      pages = Array.from({ length: this.logTotalPages }, (_, i) => i + 1);
    } else {
      if (this.logPage <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.logTotalPages];
      } else if (this.logPage >= this.logTotalPages - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.logTotalPages - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.logPage - 1, this.logPage, this.logPage + 1, '...', this.logTotalPages];
      }
    }
    return pages;
  }

  yaml: string[] = [];
  copiedYaml = false;
  private copyTimeout: any;
  isYamlFullscreen = false;

  copyYaml(): void {
    const text = this.yaml.join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.triggerCopiedState();
      }).catch(() => {
        this.fallbackCopyText(text);
      });
    } else {
      this.fallbackCopyText(text);
    }
  }

  private fallbackCopyText(text: string): void {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.triggerCopiedState();
    } catch (e) {
      console.error('Failed to copy YAML: ', e);
    }
  }

  private triggerCopiedState(): void {
    this.copiedYaml = true;
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
    this.copyTimeout = setTimeout(() => {
      this.copiedYaml = false;
    }, 2000);
  }

  downloadYaml(): void {
    const text = this.yaml.join('\n');
    const blob = new Blob([text], { type: 'text/yaml;charset=utf-8;' });
    const filename = `${this.workload.name || 'manifest'}.yaml`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  isEventsFullscreen = false;
  isLogsFullscreen = false;

  toggleFullscreenYaml(): void {
    this.isYamlFullscreen = !this.isYamlFullscreen;
  }

  closeFullscreenYaml(): void {
    this.isYamlFullscreen = false;
  }

  toggleFullscreenEvents(): void {
    this.isEventsFullscreen = !this.isEventsFullscreen;
  }

  closeFullscreenEvents(): void {
    this.isEventsFullscreen = false;
  }

  toggleFullscreenLogs(): void {
    this.isLogsFullscreen = !this.isLogsFullscreen;
  }

  closeFullscreenLogs(): void {
    this.isLogsFullscreen = false;
  }

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

  exportPods(format: 'xlsx' | 'csv'): void {
    this.openExportMenu = null;
    const data = this.filteredPods;
    const columns: ExportColumn<any>[] = [
      { header: 'Pod Name', field: 'name' },
      { header: 'Status', field: 'status' },
      { header: 'Ready', field: 'ready' },
      { header: 'Restarts', field: 'restarts' },
      { header: 'Age', field: 'age' },
      { header: 'Node', field: 'node' },
      { header: 'IP', field: 'ip' },
      { header: 'CPU', field: 'cpu' },
      { header: 'Memory', field: 'mem' }
    ];
    const filename = `Pods_${this.workload.name || 'workload'}`;
    if (format === 'xlsx') {
      this.exportService.exportToExcel(data, columns, filename);
    } else {
      this.exportService.exportToCsv(data, columns, filename);
    }
  }

  exportServices(format: 'xlsx' | 'csv'): void {
    this.openExportMenu = null;
    const data = this.filteredServices;
    const columns: ExportColumn<any>[] = [
      { header: 'Service Name', field: 'name' },
      { header: 'Type', field: 'type' },
      { header: 'Cluster IP', field: 'clusterIp' },
      { header: 'External IP', field: 'externalIp' },
      { header: 'Ports', field: 'ports' },
      { header: 'Age', field: 'age' }
    ];
    const filename = `Services_${this.workload.name || 'workload'}`;
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
      { header: 'Message', field: 'message' }
    ];
    const filename = `Events_${this.workload.name || 'workload'}`;
    if (format === 'xlsx') {
      this.exportService.exportToExcel(data, columns, filename);
    } else {
      this.exportService.exportToCsv(data, columns, filename);
    }
  }

  exportLogs(format: 'xlsx' | 'csv'): void {
    this.openExportMenu = null;
    const data = this.filteredLogs;
    const columns: ExportColumn<any>[] = [
      { header: 'Timestamp', field: 'time' },
      { header: 'Pod', field: 'pod' },
      { header: 'Level', field: 'level' },
      { header: 'Log Message', field: 'msg' }
    ];
    const filename = `Logs_${this.workload.name || 'workload'}`;
    if (format === 'xlsx') {
      this.exportService.exportToExcel(data, columns, filename);
    } else {
      this.exportService.exportToCsv(data, columns, filename);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isYamlFullscreen) {
      this.closeFullscreenYaml();
    }
    if (this.isEventsFullscreen) {
      this.closeFullscreenEvents();
    }
    if (this.isLogsFullscreen) {
      this.closeFullscreenLogs();
    }
  }

  updateYaml(): void {
    const name = this.workload.name || 'netraa-apm';
    const kind = this.workload.kind || 'Deployment';
    const ns = this.workload.namespace || 'aks-live';
    this.yaml = [
      'apiVersion: apps/v1',
      `kind: ${kind}`,
      'metadata:',
      `  name: ${name}`,
      `  namespace: ${ns}`,
      '  labels:',
      `    app: ${name}`,
      `    app.kubernetes.io/name: ${name}`,
      '    app.kubernetes.io/version: "1.2.3"',
      '    app.kubernetes.io/managed-by: Helm',
      'spec:',
      '  replicas: 1',
      '  strategy:',
      '    type: RollingUpdate',
      '    rollingUpdate:',
      '      maxSurge: 1',
      '      maxUnavailable: 0',
      '  selector:',
      '    matchLabels:',
      `      app: ${name}`,
      '  template:',
      '    metadata:',
      '      labels:',
      `        app: ${name}`,
      '    spec:',
      '      containers:',
      `      - name: ${name}`,
      `        image: registry.netraa.io/apm/${name}:v1.2.3`,
      '        imagePullPolicy: IfNotPresent',
      '        ports:',
      '        - containerPort: 8080',
      '          name: http',
      '          protocol: TCP',
      '        - containerPort: 8443',
      '          name: metrics',
      '          protocol: TCP',
      '        resources:',
      '          limits:',
      '            cpu: "500m"',
      '            memory: "512Mi"',
      '          requests:',
      '            cpu: "100m"',
      '            memory: "128Mi"',
      '        livenessProbe:',
      '          httpGet:',
      '            path: /healthz',
      '            port: 8080',
      '          initialDelaySeconds: 15',
      '          periodSeconds: 20',
      '        readinessProbe:',
      '          httpGet:',
      '            path: /readyz',
      '            port: 8080',
      '          initialDelaySeconds: 5',
      '          periodSeconds: 10'
    ];
  }

  /** Deterministic pseudo-random wave used for placeholder chart data. */
  private wave(n: number, base: number, amp: number, seed: number): number[] {
    return Array.from({ length: n }, (_, i) =>
      base + Math.sin(i * 0.9 + seed) * amp * 0.6 + Math.cos(i * 2.3 + seed * 2) * amp * 0.4);
  }

  line(data: number[], w: number, h: number, min?: number, max?: number): string {
    const lo = min ?? Math.min(...data) - 1;
    const hi = max ?? Math.max(...data) + 1;
    const step = w / (data.length - 1);
    return data.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - lo) / (hi - lo)) * h).toFixed(1)}`).join(' ');
  }

  area(data: number[], w: number, h: number, min?: number, max?: number): string {
    return `0,${h} ${this.line(data, w, h, min, max)} ${w},${h}`;
  }

  gradient(segments: Segment[]): string {
    const filled = segments.filter(s => s.pct > 0);
    let acc = 0;
    const stops = filled.map(s => {
      const from = acc;
      acc += s.pct;
      return `${s.color} ${from}% ${acc}%`;
    });
    if (acc < 100) stops.push(`#e2e8f0 ${acc}% 100%`);
    return `conic-gradient(${stops.join(', ')})`;
  }

  onChartMouseMove(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, mouseX / rect.width));

    const svgX = +((pct * 700).toFixed(1));
    const timeLabel = this.getTimeLabelForPct(pct);

    let tooltipPct = pct * 100;
    if (pct > 0.5) {
      tooltipPct = Math.max(2, pct * 100 - 46);
    } else {
      tooltipPct = Math.min(54, pct * 100 + 4);
    }

    this.netChart.hovered = false;
    // Synchronize hover state across both CPU Usage and Memory Usage graphs simultaneously
    this.usageCharts.forEach(c => {
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
        s.hoverY = Math.max(4, Math.min(116, +((120 - (s.hoverVal / 180) * 120).toFixed(1))));
      });
    });
  }

  onChartMouseLeave(): void {
    this.usageCharts.forEach(c => {
      c.hovered = false;
    });
  }

  onNetMouseMove(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, mouseX / rect.width));

    const svgX = +((pct * 300).toFixed(1));
    const timeLabel = this.getTimeLabelForPct(pct);

    let tooltipPct = pct * 100;
    if (pct > 0.45) {
      tooltipPct = Math.max(2, pct * 100 - 58);
    } else {
      tooltipPct = Math.min(48, pct * 100 + 4);
    }

    this.usageCharts.forEach(c => (c.hovered = false));

    this.netChart.hovered = true;
    this.netChart.hoverCursorX = svgX;
    this.netChart.hoverTime = timeLabel;
    this.netChart.tooltipLeft = tooltipPct;

    this.netChart.series.forEach(s => {
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
      s.hoverY = Math.max(3, Math.min(97, +((100 - (val / 300) * 100).toFixed(1))));
    });
  }

  onNetMouseLeave(): void {
    this.netChart.hovered = false;
  }

  private getTimeLabelForPct(pct: number): string {
    const totalMins = Math.round(840 + pct * 105);
    const hh = Math.floor(totalMins / 60);
    const mm = totalMins % 60;
    const nextMm = (mm + 1) % 60;
    const nextHh = mm + 1 >= 60 ? (hh + 1) % 24 : hh;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `2024-09-24, ${pad(hh)}:${pad(mm)} – ${pad(nextHh)}:${pad(nextMm)}`;
  }

  goBack(): void {
    this.router.navigate(['/kubernetes-workload']);
  }

  onBreadcrumbClick(crumb: string): void {
    if (crumb === 'Kubernetes') {
      this.router.navigate(['/kubernetes']);
    } else if (crumb === 'aks-live') {
      this.router.navigate(['/kubernetes-cluster'], { queryParams: { cluster: 'aks-live' } });
    } else if (crumb === 'Namespaces') {
      this.router.navigate(['/kubernetes-namespace'], { queryParams: { cluster: 'aks-live' } });
    } else if (crumb === 'Workloads') {
      this.router.navigate(['/kubernetes-workload'], { queryParams: { cluster: 'aks-live' } });
    } else if (crumb === this.workload.namespace || crumb === 'astroshop' || crumb === 'astoshop') {
      this.router.navigate(['/namespace-details'], {
        queryParams: { namespace: this.workload.namespace || 'astroshop', name: this.workload.namespace || 'astroshop' }
      });
    }
  }

  onNodeClick(nodeName: string): void {
    this.router.navigate(['/node-details'], { queryParams: { node: nodeName, name: nodeName } });
  }

  onServiceClick(serviceName: string): void {
    this.router.navigate(['/service-details'], { queryParams: { service: serviceName, name: serviceName } });
  }

  onPodClick(podName: string): void {
    this.router.navigate(['/pod-details'], { queryParams: { pod: podName, name: podName } });
  }

  onNamespaceClick(nsName: string): void {
    this.router.navigate(['/namespace-details'], {
      queryParams: {
        namespace: nsName,
        name: nsName,
        cluster: 'aks-live'
      }
    });
  }
}