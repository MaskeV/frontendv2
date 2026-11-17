import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ExportService, ExportColumn } from '../../../../../../services/export.service';

interface Series {
  name: string;
  color: string;
  d: string;
  data?: number[];
  max?: number;
  hoverVal?: number | string;
  hoverY?: number;
  areaD?: string;
  dashed?: boolean;
  marker?: boolean;
}

interface LineChart {
  title: string;
  icon: string;
  color: string;
  unit?: string;
  y: string[];
  x: string[];
  series: Series[];
  hovered?: boolean;
  hoverCursorX?: number;
  hoverTime?: string;
  tooltipLeft?: number;
}

interface DonutSeg {
  color: string;
  dash: string;
  offset: string;
}

interface DonutChart {
  title: string;
  icon: string;
  color: string;
  big: string;
  unit: string;
  sub: string;
  segs: DonutSeg[];
  legend: { label: string; value: string; color: string }[];
}

/* ---------- chart helpers ---------- */
const POINTS = 60;
const CIRCUMFERENCE = 2 * Math.PI * 40;

const wave = (base: number, amp: number, seed: number): number[] =>
  Array.from(
    { length: POINTS },
    (_, i) =>
      base +
      amp * Math.sin(i * 0.7 + seed) +
      amp * 0.55 * Math.sin(i * 1.9 + seed * 2.3) +
      amp * 0.3 * Math.cos(i * 3.1 + seed),
  );

const flat = (v: number): number[] => Array(POINTS).fill(v);

const linePath = (vals: number[], max: number): string =>
  vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * 100;
      const y = 100 - Math.min(Math.max(v / max, 0), 1) * 100;
      return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

const makeSeries = (
  name: string,
  color: string,
  vals: number[],
  max: number,
  opts: { dashed?: boolean; area?: boolean; marker?: boolean } = {},
): Series => {
  const d = linePath(vals, max);
  return {
    name,
    color,
    d,
    data: vals,
    max,
    dashed: opts.dashed,
    marker: opts.marker,
    areaD: opts.area ? `${d} L100,100 L0,100 Z` : undefined,
  };
};

const makeSegs = (parts: { v: number; color: string }[]): DonutSeg[] => {
  let acc = 0;
  return parts.map((p) => {
    const len = (p.v / 100) * CIRCUMFERENCE;
    const seg = {
      color: p.color,
      dash: `${len.toFixed(2)} ${(CIRCUMFERENCE - len).toFixed(2)}`,
      offset: (-(acc / 100) * CIRCUMFERENCE).toFixed(2),
    };
    acc += p.v;
    return seg;
  });
};

const TIMES = ['13:30', '13:45', '14:00', '14:15', '14:30', '14:45', '15:00', '15:15'];

@Component({
  selector: 'app-namespace-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './namespace-details.component.html',
  styleUrls: ['./namespace-details.component.css'],
})
export class NamespaceDetailsComponent implements OnInit {
  gridLines = [0, 33.33, 66.66, 100];

  crumbs = ['Kubernetes', 'aks-live', 'Namespaces'];

  ns = {
    name: 'astroshop',
    status: 'Active',
    cluster: 'aks-live',
    created: '2024-07-12 10:24',
    age: '38 d 2 h',
    labels: 'app=astroshop, env=uat',
  };

  get labelList(): { key: string; val: string }[] {
    if (!this.ns?.labels) return [];
    return this.ns.labels.split(',').map(l => {
      const parts = l.trim().split('=');
      return {
        key: parts[0]?.trim() || '',
        val: parts.slice(1).join('=')?.trim() || ''
      };
    }).filter(item => item.key.length > 0);
  }

  /* ---------- summary cards ---------- */
  stats = [
    { label: 'Total Pods', value: '24 / 24', sub: 'Running', ok: true, icon: 'cube', bg: '#e6f1fd', color: '#1e88e5', bar: '#1e88e5', pct: 100 },
    { label: 'Deployments', value: '8 / 8', sub: 'Ready', ok: true, icon: 'layers', bg: '#e3f7ea', color: '#22a45d', bar: '#8b3ff0', pct: 100 },
    { label: 'StatefulSets', value: '2 / 2', sub: 'Ready', ok: true, icon: 'database', bg: '#fdeee0', color: '#f28c28', bar: '#f28c28', pct: 100 },
    { label: 'DaemonSets', value: '0 / 0', sub: '-', ok: false, icon: 'gear', bg: '#f1e8fd', color: '#8b3ff0', bar: '#d3dae6', pct: 100 },
    { label: 'Jobs / CronJobs', value: '3 / 3', sub: 'Completed', ok: true, icon: 'calendarCheck', bg: '#e3f7ea', color: '#22a45d', bar: '#0d9bd8', pct: 100 },
    { label: 'Services', value: '6', sub: '4 ClusterIP, 2 LoadBalancer', ok: false, icon: 'network', bg: '#e6f1fd', color: '#1e88e5', bar: '', pct: 0 },
    { label: 'Persistent Volume Claims', value: '5', sub: '42.6 GiB / 100 GiB', ok: true, icon: 'database', bg: '#e3f7ea', color: '#22a45d', bar: '#22a45d', pct: 45 },
  ];

  /* ---------- line charts ---------- */
  cpuChart: LineChart = {
    title: 'CPU Usage (% of allocatable)',
    icon: 'cpu',
    color: '#1e88e5',
    unit: '%',
    y: ['360 %', '240 %', '120 %', '0 %'],
    x: TIMES,
    series: [
      makeSeries('CPU usage (% of allocatable)', '#38a9f0', wave(50, 10, 1), 360, { area: true }),
      makeSeries('CPU requests (% of allocatable)', '#a23cf0', flat(150), 360, { dashed: true }),
      makeSeries('CPU limits (% of allocatable)', '#2f80ed', flat(300), 360, { dashed: true }),
    ],
  };

  memChart: LineChart = {
    title: 'Memory Usage (% of allocatable)',
    icon: 'memory',
    color: '#22a45d',
    unit: '%',
    y: ['180 %', '120 %', '60 %', '0 %'],
    x: TIMES,
    series: [
      makeSeries('Memory usage (% of allocatable)', '#2fc26f', wave(92, 6, 2), 180, { area: true }),
      makeSeries('Memory requests (% of allocatable)', '#a23cf0', flat(118), 180, { dashed: true }),
      makeSeries('Memory limits (% of allocatable)', '#2f80ed', flat(160), 180, { dashed: true }),
    ],
  };

  podsChart: LineChart = {
    title: 'Pods',
    icon: 'cube',
    color: '#8b3ff0',
    unit: '',
    y: ['24', '16', '8', '0'],
    x: TIMES,
    series: [
      makeSeries('Desired pods', '#9b3cf0', flat(24), 24, { marker: true }),
      makeSeries('Running pods', '#1fc3e6', wave(1.2, 0.15, 3), 24, { marker: true }),
    ],
  };

  netChart: LineChart = {
    title: 'Network I/O',
    icon: 'network',
    color: '#1e88e5',
    unit: 'Mbps',
    y: ['300 Mbps', '200 Mbps', '100 Mbps', '0 Mbps'],
    x: ['14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45'],
    series: [
      makeSeries('Incoming (Mbps)', '#f59e0b', wave(180, 24, 4), 300, { marker: true }),
      makeSeries('Outgoing (Mbps)', '#2f80ed', wave(240, 28, 5), 300, { marker: true }),
    ],
  };

  /* ---------- donut charts ---------- */
  cpuDonut: DonutChart = {
    title: 'CPU Breakdown',
    icon: 'cpu',
    color: '#1e88e5',
    big: '28.2',
    unit: 'mCores',
    sub: '(18.8%)',
    segs: makeSegs([
      { v: 44.0, color: '#2f80ed' },
      { v: 28.7, color: '#f59e0b' },
      { v: 8.2, color: '#ec4899' },
      { v: 19.1, color: '#cbd5e1' },
    ]),
    legend: [
      { label: 'User', value: '12.4 mCores (44.0%)', color: '#2f80ed' },
      { label: 'System', value: '8.1 mCores (28.7%)', color: '#f59e0b' },
      { label: 'I/O Wait', value: '2.3 mCores (8.2%)', color: '#ec4899' },
      { label: 'Idle', value: '5.4 mCores (19.1%)', color: '#cbd5e1' },
    ],
  };

  memDonut: DonutChart = {
    title: 'Memory Breakdown',
    icon: 'memory',
    color: '#1e88e5',
    big: '47.9',
    unit: 'MiB',
    sub: '(37.4%)',
    segs: makeSegs([
      { v: 37.4, color: '#10b981' },
      { v: 29.8, color: '#2f80ed' },
      { v: 9.4, color: '#a855f7' },
      { v: 23.4, color: '#cbd5e1' },
    ]),
    legend: [
      { label: 'Used', value: '47.9 MiB (37.4%)', color: '#10b981' },
      { label: 'Cache', value: '38.2 MiB (29.8%)', color: '#2f80ed' },
      { label: 'Buffers', value: '12.1 MiB (9.4%)', color: '#a855f7' },
      { label: 'Free', value: '30.4 MiB (23.4%)', color: '#cbd5e1' },
    ],
  };

  fsDonut: DonutChart = {
    title: 'Filesystem Usage',
    icon: 'disk',
    color: '#1e88e5',
    big: '1.2',
    unit: 'GiB',
    sub: '(24.0%)',
    segs: makeSegs([
      { v: 24.0, color: '#2f80ed' },
      { v: 76.0, color: '#cbd5e1' },
    ]),
    legend: [
      { label: 'Used', value: '1.2 GiB (24.0%)', color: '#2f80ed' },
      { label: 'Available', value: '3.8 GiB (76.0%)', color: '#cbd5e1' },
      { label: 'Capacity', value: '5.0 GiB (100%)', color: '#94a3b8' },
    ],
  };

  /* ---------- tables ---------- */
  workloadTotal = 13;
  wlItemsPerPage = 5;
  wlPage = 1;

  // Backward compatibility
  get wlPages(): number[] { return [1, 2, 3]; }

  workloads = [
    { name: 'accounting', type: 'Deployment', ready: '1/1', pods: 1, cpu: '28.2 mCores', mem: '47.93 MiB', age: '32 d 4 h', status: 'Running' },
    { name: 'ad', type: 'Deployment', ready: '1/1', pods: 1, cpu: '5.2 mCores', mem: '33.02 MiB', age: '32 d 4 h', status: 'Running' },
    { name: 'cart', type: 'Deployment', ready: '1/1', pods: 1, cpu: '8.95 mCores', mem: '62.11 MiB', age: '32 d 4 h', status: 'Running' },
    { name: 'checkout', type: 'Deployment', ready: '1/1', pods: 1, cpu: '28.1 mCores', mem: '120.21 MiB', age: '32 d 4 h', status: 'Running' },
    { name: 'currency', type: 'Deployment', ready: '1/1', pods: 1, cpu: '5.11 mCores', mem: '41.03 MiB', age: '32 d 4 h', status: 'Running' },
    { name: 'email', type: 'Deployment', ready: '1/1', pods: 1, cpu: '4.8 mCores', mem: '36.5 MiB', age: '32 d 4 h', status: 'Running' },
    { name: 'frontend', type: 'Deployment', ready: '2/2', pods: 2, cpu: '38.6 mCores', mem: '156.4 MiB', age: '32 d 4 h', status: 'Running' },
    { name: 'loadgenerator', type: 'Deployment', ready: '1/1', pods: 1, cpu: '16.4 mCores', mem: '58.2 MiB', age: '32 d 4 h', status: 'Running' },
    { name: 'payment', type: 'Deployment', ready: '1/1', pods: 1, cpu: '7.2 mCores', mem: '45.1 MiB', age: '32 d 4 h', status: 'Running' },
    { name: 'productcatalog', type: 'Deployment', ready: '1/1', pods: 1, cpu: '11.8 mCores', mem: '68.9 MiB', age: '32 d 4 h', status: 'Running' },
    { name: 'recommendation', type: 'Deployment', ready: '1/1', pods: 1, cpu: '14.2 mCores', mem: '74.3 MiB', age: '32 d 4 h', status: 'Running' },
    { name: 'redis-cart', type: 'StatefulSet', ready: '1/1', pods: 1, cpu: '19.5 mCores', mem: '92.1 MiB', age: '32 d 4 h', status: 'Running' },
    { name: 'shipping', type: 'Deployment', ready: '1/1', pods: 1, cpu: '6.4 mCores', mem: '39.8 MiB', age: '32 d 4 h', status: 'Running' },
  ];

  serviceTotal = 6;
  svcItemsPerPage = 5;
  svcPage = 1;

  // Backward compatibility
  get svcPages(): number[] { return [1, 2]; }

  services = [
    { name: 'ad', type: 'ClusterIP', clusterIp: '10.0.118.229', externalIp: '-', ports: '8080/TCP', age: '38 d' },
    { name: 'astroshop-postgresql-external', type: 'LoadBalancer', clusterIp: '10.0.88.232', externalIp: '20.232.218.150', ports: '5432:30785/TCP', age: '38 d' },
    { name: 'cart', type: 'ClusterIP', clusterIp: '10.0.127.114', externalIp: '-', ports: '8080/TCP', age: '38 d' },
    { name: 'checkout', type: 'ClusterIP', clusterIp: '10.0.147.164', externalIp: '-', ports: '8080/TCP', age: '38 d' },
    { name: 'currency', type: 'ClusterIP', clusterIp: '10.0.183.59', externalIp: '-', ports: '8080/TCP', age: '38 d' },
    { name: 'email', type: 'ClusterIP', clusterIp: '10.0.195.42', externalIp: '-', ports: '8080/TCP', age: '38 d' },
  ];

  // Workloads pagination
  wlSearch = '';
  get filteredWorkloads() {
    const q = this.wlSearch.trim().toLowerCase();
    if (!q) return this.workloads;
    return this.workloads.filter(w => w.name.toLowerCase().includes(q) || w.type.toLowerCase().includes(q) || w.status.toLowerCase().includes(q));
  }

  get wlTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredWorkloads.length / (this.wlItemsPerPage || 5)));
  }

  get pagedWorkloads() {
    const pageSize = this.wlItemsPerPage && this.wlItemsPerPage > 0 ? this.wlItemsPerPage : 5;
    const start = (this.wlPage - 1) * pageSize;
    return this.filteredWorkloads.slice(start, start + pageSize);
  }

  get wlStartIndex(): number {
    const pageSize = this.wlItemsPerPage && this.wlItemsPerPage > 0 ? this.wlItemsPerPage : 5;
    return this.filteredWorkloads.length === 0 ? 0 : (this.wlPage - 1) * pageSize + 1;
  }

  get wlEndIndex(): number {
    const pageSize = this.wlItemsPerPage && this.wlItemsPerPage > 0 ? this.wlItemsPerPage : 5;
    return Math.min(this.wlPage * pageSize, this.filteredWorkloads.length);
  }

  onWlItemsPerPageChange(): void {
    if (this.wlItemsPerPage === null || this.wlItemsPerPage === undefined || this.wlItemsPerPage < 1) {
      this.wlItemsPerPage = 5;
    }
    this.wlPage = 1;
  }

  previousWlPage(): void {
    if (this.wlPage > 1) {
      this.wlPage--;
    }
  }

  nextWlPage(): void {
    if (this.wlPage < this.wlTotalPages) {
      this.wlPage++;
    }
  }

  goToWlPage(p: any): void {
    if (p !== '...') {
      this.wlPage = p;
    }
  }

  get wlTotalPagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.wlTotalPages <= visiblePages + 2) {
      pages = Array.from({ length: this.wlTotalPages }, (_, i) => i + 1);
    } else {
      if (this.wlPage <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.wlTotalPages];
      } else if (this.wlPage >= this.wlTotalPages - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.wlTotalPages - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.wlPage - 1, this.wlPage, this.wlPage + 1, '...', this.wlTotalPages];
      }
    }
    return pages;
  }

  // Services pagination
  svcSearch = '';
  get filteredServices() {
    const q = this.svcSearch.trim().toLowerCase();
    if (!q) return this.services;
    return this.services.filter(s => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.clusterIp.toLowerCase().includes(q) || s.ports.toLowerCase().includes(q));
  }

  get svcTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredServices.length / (this.svcItemsPerPage || 5)));
  }

  get pagedServices() {
    const pageSize = this.svcItemsPerPage && this.svcItemsPerPage > 0 ? this.svcItemsPerPage : 5;
    const start = (this.svcPage - 1) * pageSize;
    return this.filteredServices.slice(start, start + pageSize);
  }

  get svcStartIndex(): number {
    const pageSize = this.svcItemsPerPage && this.svcItemsPerPage > 0 ? this.svcItemsPerPage : 5;
    return this.filteredServices.length === 0 ? 0 : (this.svcPage - 1) * pageSize + 1;
  }

  get svcEndIndex(): number {
    const pageSize = this.svcItemsPerPage && this.svcItemsPerPage > 0 ? this.svcItemsPerPage : 5;
    return Math.min(this.svcPage * pageSize, this.filteredServices.length);
  }

  onSvcItemsPerPageChange(): void {
    if (this.svcItemsPerPage === null || this.svcItemsPerPage === undefined || this.svcItemsPerPage < 1) {
      this.svcItemsPerPage = 5;
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

  // Events pagination
  evSearch = '';
  get filteredEvents() {
    const q = this.evSearch.trim().toLowerCase();
    if (!q) return this.events;
    return this.events.filter(e => e.time.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.reason.toLowerCase().includes(q) || e.message.toLowerCase().includes(q));
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

  pvcs = [
    { name: 'postgresql', status: 'Bound', capacity: '50 GiB', used: '32.4 GiB (64.8%)', storageClass: 'gp2', age: '38 d' },
    { name: 'redis', status: 'Bound', capacity: '10 GiB', used: '4.2 GiB (42.0%)', storageClass: 'gp2', age: '38 d' },
    { name: 'uploads', status: 'Bound', capacity: '20 GiB', used: '6.1 GiB (30.5%)', storageClass: 'gp2', age: '38 d' },
    { name: 'logs', status: 'Bound', capacity: '10 GiB', used: '3.9 GiB (39.0%)', storageClass: 'gp2', age: '38 d' },
    { name: 'data', status: 'Bound', capacity: '10 GiB', used: '2.0 GiB (20.0%)', storageClass: 'gp2', age: '38 d' },
  ];

  quotas = [
    { name: 'compute-resources', type: 'Pod', used: '18', hard: '50' },
    { name: 'memory-requests', type: 'Memory', used: '6.1 GiB', hard: '20 GiB' },
    { name: 'memory-limits', type: 'Memory', used: '8.3 GiB', hard: '40 GiB' },
    { name: 'cpu-requests', type: 'CPU', used: '950 mCores', hard: '4000 mCores' },
    { name: 'cpu-limits', type: 'CPU', used: '1800 mCores', hard: '8000 mCores' },
    { name: 'pods', type: 'Pod', used: '24', hard: '50' },
  ];

  eventTotal = 20;
  events = [
    { time: '2024-09-24 15:06:12', type: 'Normal', reason: 'ScalingReplicaSet', message: 'Scaled up replicaset frontend to 3' },
    { time: '2024-09-24 14:56:21', type: 'Normal', reason: 'Pulled', message: 'Successfully pulled image' },
    { time: '2024-09-24 14:27:44', type: 'Warning', reason: 'FailedScheduling', message: '0/5 nodes are available: insufficient cpu' },
    { time: '2024-09-24 14:22:10', type: 'Normal', reason: 'Started', message: 'Started container checkout' },
    { time: '2024-09-24 13:50:03', type: 'Normal', reason: 'Killing', message: 'Stopping container cart' },
  ];

  logs = [
    { time: '2024-09-24 15:15:02', msg: '{"level":"info","msg":"Namespace synced"}' },
    { time: '2024-09-24 14:56:21', msg: '{"level":"info","msg":"Deployment updated"}' },
    { time: '2024-09-24 14:14:33', msg: '{"level":"warn","msg":"Failed to collect metrics"}' },
    { time: '2024-09-24 15:14:12', msg: '{"level":"info","msg":"Pod started"}' },
    { time: '2024-09-24 15:13:59', msg: '{"level":"info","msg":"Service updated"}' },
  ];

  // PVCs pagination
  pvcSearch = '';
  get filteredPvcs() {
    const q = this.pvcSearch.trim().toLowerCase();
    if (!q) return this.pvcs;
    return this.pvcs.filter(p => p.name.toLowerCase().includes(q) || p.status.toLowerCase().includes(q) || p.capacity.toLowerCase().includes(q) || p.storageClass.toLowerCase().includes(q));
  }
  pvcItemsPerPage = 10;
  pvcPage = 1;

  get pvcTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredPvcs.length / (this.pvcItemsPerPage || 10)));
  }

  get pagedPvcs() {
    const pageSize = this.pvcItemsPerPage && this.pvcItemsPerPage > 0 ? this.pvcItemsPerPage : 10;
    const start = (this.pvcPage - 1) * pageSize;
    return this.filteredPvcs.slice(start, start + pageSize);
  }

  get pvcStartIndex(): number {
    const pageSize = this.pvcItemsPerPage && this.pvcItemsPerPage > 0 ? this.pvcItemsPerPage : 10;
    return this.filteredPvcs.length === 0 ? 0 : (this.pvcPage - 1) * pageSize + 1;
  }

  get pvcEndIndex(): number {
    const pageSize = this.pvcItemsPerPage && this.pvcItemsPerPage > 0 ? this.pvcItemsPerPage : 10;
    return Math.min(this.pvcPage * pageSize, this.filteredPvcs.length);
  }

  onPvcItemsPerPageChange(): void {
    if (this.pvcItemsPerPage === null || this.pvcItemsPerPage === undefined || this.pvcItemsPerPage < 1) {
      this.pvcItemsPerPage = 10;
    }
    this.pvcPage = 1;
  }

  previousPvcPage(): void {
    if (this.pvcPage > 1) {
      this.pvcPage--;
    }
  }

  nextPvcPage(): void {
    if (this.pvcPage < this.pvcTotalPages) {
      this.pvcPage++;
    }
  }

  goToPvcPage(p: any): void {
    if (p !== '...') {
      this.pvcPage = p;
    }
  }

  get pvcTotalPagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.pvcTotalPages <= visiblePages + 2) {
      pages = Array.from({ length: this.pvcTotalPages }, (_, i) => i + 1);
    } else {
      if (this.pvcPage <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.pvcTotalPages];
      } else if (this.pvcPage >= this.pvcTotalPages - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.pvcTotalPages - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.pvcPage - 1, this.pvcPage, this.pvcPage + 1, '...', this.pvcTotalPages];
      }
    }
    return pages;
  }

  // Quotas pagination
  quotaSearch = '';
  get filteredQuotas() {
    const q = this.quotaSearch.trim().toLowerCase();
    if (!q) return this.quotas;
    return this.quotas.filter(qObj => qObj.name.toLowerCase().includes(q) || qObj.type.toLowerCase().includes(q));
  }
  quotaItemsPerPage = 10;
  quotaPage = 1;

  get quotaTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredQuotas.length / (this.quotaItemsPerPage || 10)));
  }

  get pagedQuotas() {
    const pageSize = this.quotaItemsPerPage && this.quotaItemsPerPage > 0 ? this.quotaItemsPerPage : 10;
    const start = (this.quotaPage - 1) * pageSize;
    return this.filteredQuotas.slice(start, start + pageSize);
  }

  get quotaStartIndex(): number {
    const pageSize = this.quotaItemsPerPage && this.quotaItemsPerPage > 0 ? this.quotaItemsPerPage : 10;
    return this.filteredQuotas.length === 0 ? 0 : (this.quotaPage - 1) * pageSize + 1;
  }

  get quotaEndIndex(): number {
    const pageSize = this.quotaItemsPerPage && this.quotaItemsPerPage > 0 ? this.quotaItemsPerPage : 10;
    return Math.min(this.quotaPage * pageSize, this.filteredQuotas.length);
  }

  onQuotaItemsPerPageChange(): void {
    if (this.quotaItemsPerPage === null || this.quotaItemsPerPage === undefined || this.quotaItemsPerPage < 1) {
      this.quotaItemsPerPage = 10;
    }
    this.quotaPage = 1;
  }

  previousQuotaPage(): void {
    if (this.quotaPage > 1) {
      this.quotaPage--;
    }
  }

  nextQuotaPage(): void {
    if (this.quotaPage < this.quotaTotalPages) {
      this.quotaPage++;
    }
  }

  goToQuotaPage(p: any): void {
    if (p !== '...') {
      this.quotaPage = p;
    }
  }

  get quotaTotalPagesArray(): (number | string)[] {
    const visiblePages = 3;
    let pages: (number | string)[] = [];
    if (this.quotaTotalPages <= visiblePages + 2) {
      pages = Array.from({ length: this.quotaTotalPages }, (_, i) => i + 1);
    } else {
      if (this.quotaPage <= visiblePages) {
        pages = [...Array.from({ length: visiblePages }, (_, i) => i + 1), '...', this.quotaTotalPages];
      } else if (this.quotaPage >= this.quotaTotalPages - visiblePages + 1) {
        pages = [1, '...', ...Array.from({ length: visiblePages }, (_, i) => this.quotaTotalPages - visiblePages + i + 1)];
      } else {
        pages = [1, '...', this.quotaPage - 1, this.quotaPage, this.quotaPage + 1, '...', this.quotaTotalPages];
      }
    }
    return pages;
  }

  // Logs pagination
  logSearch = '';
  get filteredLogs() {
    const q = this.logSearch.trim().toLowerCase();
    if (!q) return this.logs;
    return this.logs.filter(l => l.time.toLowerCase().includes(q) || l.msg.toLowerCase().includes(q));
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

  /* ---------- icon paths (24x24, stroke based) ---------- */
  icons: Record<string, string> = {
    cube: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.3 7l8.7 5 8.7-5 M12 22V12',
    layers: 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
    database: 'M3 5c0-1.1 4-2 9-2s9 .9 9 2-4 2-9 2-9-.9-9-2z M3 5v14c0 1.1 4 2 9 2s9-.9 9-2V5 M3 12c0 1.1 4 2 9 2s9-.9 9-2',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    calendar: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    calendarCheck: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M9 16l2 2 4-4',
    network: 'M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M5 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M19 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M12 9v3 M12 12l-5.5 3.5 M12 12l5.5 3.5',
    cpu: 'M6 6h12v12H6z M9 9h6v6H9z M9 2v4 M15 2v4 M9 18v4 M15 18v4 M2 9h4 M2 15h4 M18 9h4 M18 15h4',
    memory: 'M3 6h18v12H3z M7 10h1 M12 10h1 M17 10h0 M7 18v3 M12 18v3 M17 18v3',
    drive: 'M22 12H2 M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z M6 16h.01 M10 16h.01',
    disk: 'M5 4h14v16H5zM5 14h14M9 17h.01',
    pie: 'M21.21 15.89A10 10 0 1 1 8 2.83 M22 12A10 10 0 0 0 12 2v10z',
    bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
    search: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M21 21l-4.35-4.35',
    refresh: 'M23 4v6h-6 M1 20v-6h6 M3.5 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.65 4.36A9 9 0 0 0 20.5 15',
    thumb: 'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3',
    helm: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v6 M12 16v6 M2 12h6 M16 12h6 M4.9 4.9l4.3 4.3 M14.8 14.8l4.3 4.3 M19.1 4.9l-4.3 4.3 M9.2 14.8l-4.3 4.3',
    play: 'M6 4l13 8-13 8z',
    more: 'M5 12h.01 M12 12h.01 M19 12h.01',
    chevDown: 'M6 9l6 6 6-6',
    chevRight: 'M9 18l6-6-6-6',
    chevLeft: 'M15 18l-6-6 6-6',
  };

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

  exportWorkloads(format: 'xlsx' | 'csv'): void {
    this.openExportMenu = null;
    const data = this.filteredWorkloads;
    const columns: ExportColumn<any>[] = [
      { header: 'Workload Name', field: 'name' },
      { header: 'Type', field: 'type' },
      { header: 'Status', field: 'status' },
      { header: 'Ready', field: 'ready' },
      { header: 'Pods', field: 'pods' },
      { header: 'CPU', field: 'cpu' },
      { header: 'Memory', field: 'mem' },
      { header: 'Age', field: 'age' }
    ];
    const filename = `Workloads_${this.ns.name || 'namespace'}`;
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
    const filename = `Services_${this.ns.name || 'namespace'}`;
    if (format === 'xlsx') {
      this.exportService.exportToExcel(data, columns, filename);
    } else {
      this.exportService.exportToCsv(data, columns, filename);
    }
  }

  exportPvcs(format: 'xlsx' | 'csv'): void {
    this.openExportMenu = null;
    const data = this.filteredPvcs;
    const columns: ExportColumn<any>[] = [
      { header: 'PVC Name', field: 'name' },
      { header: 'Status', field: 'status' },
      { header: 'Capacity', field: 'capacity' },
      { header: 'Used', field: 'used' },
      { header: 'Storage Class', field: 'storageClass' },
      { header: 'Age', field: 'age' }
    ];
    const filename = `PVCs_${this.ns.name || 'namespace'}`;
    if (format === 'xlsx') {
      this.exportService.exportToExcel(data, columns, filename);
    } else {
      this.exportService.exportToCsv(data, columns, filename);
    }
  }

  exportQuotas(format: 'xlsx' | 'csv'): void {
    this.openExportMenu = null;
    const data = this.filteredQuotas;
    const columns: ExportColumn<any>[] = [
      { header: 'Quota Name', field: 'name' },
      { header: 'Resource Type', field: 'type' },
      { header: 'Used', field: 'used' },
      { header: 'Hard Limit', field: 'hard' }
    ];
    const filename = `Quotas_${this.ns.name || 'namespace'}`;
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
    const filename = `Events_${this.ns.name || 'namespace'}`;
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
      { header: 'Log Message', field: 'msg' }
    ];
    const filename = `Logs_${this.ns.name || 'namespace'}`;
    if (format === 'xlsx') {
      this.exportService.exportToExcel(data, columns, filename);
    } else {
      this.exportService.exportToCsv(data, columns, filename);
    }
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const name = params.get('name') || params.get('namespace');
      if (name) {
        this.ns.name = name;
        this.ns.labels = `app=${name}, env=uat`;
      }
      const cluster = params.get('cluster');
      if (cluster) {
        this.ns.cluster = cluster;
      }
      const status = params.get('status');
      if (status) {
        this.ns.status = (status === 'Healthy' || status === 'Active') ? 'Active' : status;
      }
      this.crumbs = ['Kubernetes', this.ns.cluster || 'aks-live', 'Namespaces'];

      const podsUsed = params.get('podsUsed');
      const podsTotal = params.get('podsTotal');
      if (podsUsed && podsTotal) {
        if (this.stats && this.stats[0]) {
          this.stats[0].value = `${podsUsed} / ${podsTotal}`;
        }
      }
      const cpu = params.get('cpu');
      if (cpu) {
        const cpuNum = parseFloat(cpu);
        if (!isNaN(cpuNum) && this.cpuDonut) {
          this.cpuDonut.sub = `(${cpuNum}%)`;
        }
      }
      const mem = params.get('memory');
      if (mem) {
        const memNum = parseFloat(mem);
        if (!isNaN(memNum) && this.memDonut) {
          this.memDonut.sub = `(${memNum}%)`;
        }
      }
      const storage = params.get('storage');
      if (storage && this.fsDonut) {
        const stNum = parseFloat(storage);
        if (!isNaN(stNum)) {
          this.fsDonut.sub = `(${stNum}%)`;
        }
      }
    });
  }

  onBreadcrumbClick(c: string): void {
    if (c === 'Kubernetes') {
      this.router.navigate(['/kubernetes']);
    } else if (c === 'Namespaces') {
      this.router.navigate(['/kubernetes-namespace'], { queryParams: { cluster: this.ns.cluster || 'aks-live' } });
    } else if (c === this.ns.cluster || c === 'aks-live' || c === 'eks-live' || c === 'gke-live') {
      this.router.navigate(['/kubernetes-cluster'], { queryParams: { cluster: this.ns.cluster || 'aks-live' } });
    }
  }

  onWorkloadClick(w: any): void {
    this.router.navigate(['/workload-details'], {
      queryParams: {
        workload: w.name,
        name: w.name,
        type: w.type,
        status: w.status,
        pods: w.pods,
        namespace: this.ns.name,
        cluster: this.ns.cluster
      }
    });
  }

  onServiceClick(s: any): void {
    this.router.navigate(['/service-details'], {
      queryParams: {
        service: s.name,
        name: s.name,
        namespace: this.ns.name,
        cluster: this.ns.cluster
      }
    });
  }

  onChartMouseMove(event: MouseEvent, chart: LineChart): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, mouseX / rect.width));
    const svgX = +((pct * 100).toFixed(1));
    const startMins = chart === this.netChart ? 840 : 810;
    const timeLabel = this.getTimeLabelForPct(pct, startMins);

    let tooltipPct = pct * 100;
    if (pct > 0.5) {
      tooltipPct = Math.max(2, pct * 100 - 58);
    } else {
      tooltipPct = Math.min(48, pct * 100 + 4);
    }

    // Synchronize CPU Usage and Memory Usage graphs simultaneously at the same time view
    if (chart === this.cpuChart || chart === this.memChart) {
      this.podsChart.hovered = false;
      this.netChart.hovered = false;
      [this.cpuChart, this.memChart].forEach(c => this.updateChartHoverState(c, pct, svgX, timeLabel, tooltipPct));
    } else {
      // Keep pods separate (and netChart separate)
      this.cpuChart.hovered = false;
      this.memChart.hovered = false;
      if (chart === this.podsChart) {
        this.netChart.hovered = false;
      } else {
        this.podsChart.hovered = false;
      }
      this.updateChartHoverState(chart, pct, svgX, timeLabel, tooltipPct);
    }
  }

  onChartMouseLeave(chart: LineChart): void {
    if (chart === this.cpuChart || chart === this.memChart) {
      this.cpuChart.hovered = false;
      this.memChart.hovered = false;
    } else {
      chart.hovered = false;
    }
  }

  private updateChartHoverState(c: LineChart, pct: number, svgX: number, timeLabel: string, tooltipPct: number): void {
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
      s.hoverVal = c.unit ? +(val.toFixed(1)) : (val >= 10 ? Math.round(val) : +(val.toFixed(1)));
      const max = s.max || 100;
      s.hoverY = Math.max(3, Math.min(97, +((100 - Math.min(Math.max(val / max, 0), 1) * 100).toFixed(1))));
    });
  }

  private getTimeLabelForPct(pct: number, startMins: number = 810): string {
    const totalMins = Math.round(startMins + pct * 105);
    const hh = Math.floor(totalMins / 60);
    const mm = totalMins % 60;
    const nextMm = (mm + 1) % 60;
    const nextHh = mm + 1 >= 60 ? (hh + 1) % 24 : hh;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `2024-09-24, ${pad(hh)}:${pad(mm)} – ${pad(nextHh)}:${pad(nextMm)}`;
  }
}