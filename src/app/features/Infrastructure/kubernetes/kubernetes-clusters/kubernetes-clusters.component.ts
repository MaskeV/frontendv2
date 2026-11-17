import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { KubernetesTabHeaderComponent } from '../kubernetes-tab-header/kubernetes-tab-header.component';
import { ExportService, ExportColumn } from '../../../../services/export.service';

/* ---------- Interfaces ---------- */
interface Plot {
  l: number;
  r: number;
  t: number;
  b: number;
}

interface TrendChart {
  id: string;
  title: string;
  tipTitle: string;
  infoText: string;
  kind: 'cpu' | 'mem' | 'rst';
  group: 'trend' | 'rst';
  color: string;
  vbW: number;
  vbH: number;
  plot: Plot;
  labelY: number;
  line: string;
  area: string;
  yTicks: { label: string; y: number }[];
  xTicks: { label: string; x: number }[];
  end: { x: number; y: number };
  values: number[];
  yMax: number;
  /* hover state */
  hovered: boolean;
  hoverX: number;
  hoverY: number;
  hoverTime: string;
  hoverBig: string;
  hoverRows: { label: string; value: string }[];
  hoverNote: string;
  tooltipPct: number;
  flip: boolean;
}

interface TrendConfig {
  id: string;
  title: string;
  tipTitle: string;
  infoText: string;
  kind: 'cpu' | 'mem' | 'rst';
  group: 'trend' | 'rst';
  color: string;
  values: number[];
  yMax: number;
  yStep: number;
  suffix: string;
  vbW: number;
  vbH: number;
  plot: Plot;
  labelY: number;
}

interface ConsumerRow {
  name: string;
  namespace: string;
  value: string;
  pct: number;
  bar: number;
  request: string;
  limit: string;
}

interface ConsumerPanel {
  title: string;
  infoText: string;
  kind: 'CPU' | 'Memory';
  unit: string;
  usageHeader: string;
  color: string;
  items: ConsumerRow[];
}

interface NamespaceRow {
  name: string;
  value: string | number;
  percent: number;
}

interface NamespaceMeta {
  usageLabel: string;
  shareLabel: string;
  totalLabel: string;
  total: string;
  note: string;
}

interface NodeItem {
  name: string;
  status: string;
  pods: number;
  podsCapacity: number;
  cpu: number;
  memory: number;
  cpuUsed: string;
  cpuCap: string;
  memUsed: string;
  memCap: string;
}

export interface ClusterMetaInfo {
  name: string;
  provider: string;
  providerCode: 'azure' | 'aws' | 'gcp' | 'generic';
  type: string;
  version: string;
  status: 'Healthy' | 'Issues';
  badgeColor: string;
}

export interface ClusterEvent {
  time: string;
  type: 'Normal' | 'Warning';
  reason: string;
  object: string;
  namespace: string;
  message: string;
}

/* ---------- Chart helpers ---------- */
const SPAN_MIN = 40; // chart time window (10:00 -> 10:40)

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function buildPath(
  values: number[], x0: number, x1: number, y0: number, y1: number, min: number, max: number
): { line: string; area: string } {
  const n = values.length;
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = x0 + (i * (x1 - x0)) / Math.max(1, n - 1);
    const y = y1 - ((v - min) / span) * (y1 - y0);
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const line = 'M' + pts.join(' L');
  const area = `${line} L${x1} ${y1} L${x0} ${y1} Z`;
  return { line, area };
}

function buildTrend(cfg: TrendConfig): TrendChart {
  const { plot, values, yMax, yStep, suffix } = cfg;
  const { line, area } = buildPath(values, plot.l, plot.r, plot.t, plot.b, 0, yMax);

  const yTicks: { label: string; y: number }[] = [];
  for (let t = 0; t <= yMax; t += yStep) {
    yTicks.push({ label: `${t}${suffix}`, y: plot.b - (t / yMax) * (plot.b - plot.t) });
  }

  const xTicks = [0, 10, 20, 30].map(m => ({
    label: `10:${pad2(m)}`,
    x: plot.l + (m / SPAN_MIN) * (plot.r - plot.l)
  }));

  const last = values[values.length - 1];
  const end = { x: plot.r, y: plot.b - (last / yMax) * (plot.b - plot.t) };

  return {
    id: cfg.id,
    title: cfg.title,
    tipTitle: cfg.tipTitle,
    infoText: cfg.infoText,
    kind: cfg.kind,
    group: cfg.group,
    color: cfg.color,
    vbW: cfg.vbW,
    vbH: cfg.vbH,
    plot,
    labelY: cfg.labelY,
    line, area, yTicks, xTicks, end,
    values, yMax,
    hovered: false,
    hoverX: end.x,
    hoverY: end.y,
    hoverTime: '10:40',
    hoverBig: '',
    hoverRows: [],
    hoverNote: '',
    tooltipPct: 50,
    flip: false
  };
}

@Component({
  selector: 'app-kubernetes-clusters',
  standalone: true,
  imports: [CommonModule, FormsModule, KubernetesTabHeaderComponent],
  templateUrl: './kubernetes-clusters.component.html',
  styleUrls: ['./kubernetes-clusters.component.css']
})
export class KubernetesClustersComponent implements OnInit {
  selectedCluster = 'aks-live';
  clusters = ['aks-live', 'eks-live', 'gke-live', 'demo-kspm'];

  readonly clusterMetaMap: Record<string, ClusterMetaInfo> = {
    'aks-live': {
      name: 'aks-live',
      provider: 'Azure',
      providerCode: 'azure',
      type: 'Azure AKS',
      version: 'v1.28.7',
      status: 'Issues',
      badgeColor: '#0078d4'
    },
    'eks-live': {
      name: 'eks-live',
      provider: 'AWS',
      providerCode: 'aws',
      type: 'AWS EKS',
      version: 'v1.29.2',
      status: 'Healthy',
      badgeColor: '#ff9900'
    },
    'gke-live': {
      name: 'gke-live',
      provider: 'GCP',
      providerCode: 'gcp',
      type: 'Google GKE',
      version: 'v1.28.6',
      status: 'Healthy',
      badgeColor: '#4285f4'
    },
    'demo-kspm': {
      name: 'demo-kspm',
      provider: 'Self-managed',
      providerCode: 'generic',
      type: 'Kubernetes',
      version: 'v1.27.4',
      status: 'Healthy',
      badgeColor: '#326ce5'
    }
  };

  get currentClusterInfo(): ClusterMetaInfo {
    return this.clusterMetaMap[this.selectedCluster] || {
      name: this.selectedCluster || 'aks-live',
      provider: 'Kubernetes',
      providerCode: 'generic',
      type: 'Cluster',
      version: 'v1.28.0',
      status: 'Healthy',
      badgeColor: '#326ce5'
    };
  }

  constructor(private route: ActivatedRoute, private router: Router, private exportService: ExportService) { }

  goToNodes(nodeName?: string): void {
    this.router.navigate(['/kubernetes-node'], {
      queryParams: { cluster: this.selectedCluster || 'aks-live' }
    });
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

  onClusterChange(cluster: string): void {
    this.selectedCluster = cluster;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
      queryParams: { cluster: this.selectedCluster }
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['cluster']) {
        this.selectedCluster = params['cluster'];
      }
    });
  }

  /* ---------- Info tooltip placement (fixed, so it never gets clipped) ---------- */
  placeTip(ev: MouseEvent): void {
    const host = ev.currentTarget as HTMLElement;
    const tip = host.querySelector('.tile-tip') as HTMLElement | null;
    if (!tip) { return; }

    const r = host.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const cx = r.left + r.width / 2;

    const left = Math.max(8, Math.min(window.innerWidth - w - 8, cx - 28));
    let top = r.top - h - 10;
    const below = top < 8;
    if (below) { top = r.bottom + 10; }

    tip.classList.toggle('below', below);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.style.setProperty('--ax', `${cx - left}px`);
  }

  /* ---------- Summary tiles (unchanged data) ---------- */
  readonly clusterSummaryMap: Record<string, {
    totalNodes: number;
    totalPods: number;
    podsRunning: number;
    podsPending: number;
    podsFailed: number;
    namespaces: number;
    deployments: number;
    deploymentsHealthy: number;
    deploymentsUnhealthy: number;
    services: number;
    health: string;
  }> = {
      'aks-live': {
        totalNodes: 2,
        totalPods: 420,
        podsRunning: 408,
        podsPending: 8,
        podsFailed: 4,
        namespaces: 13,
        deployments: 57,
        deploymentsHealthy: 52,
        deploymentsUnhealthy: 5,
        services: 34,
        health: 'Healthy'
      },
      'eks-live': {
        totalNodes: 4,
        totalPods: 620,
        podsRunning: 615,
        podsPending: 3,
        podsFailed: 2,
        namespaces: 15,
        deployments: 90,
        deploymentsHealthy: 88,
        deploymentsUnhealthy: 2,
        services: 63,
        health: 'Healthy'
      },
      'gke-live': {
        totalNodes: 3,
        totalPods: 310,
        podsRunning: 305,
        podsPending: 4,
        podsFailed: 1,
        namespaces: 13,
        deployments: 55,
        deploymentsHealthy: 54,
        deploymentsUnhealthy: 1,
        services: 11,
        health: 'Healthy'
      },
      'demo-kspm': {
        totalNodes: 3,
        totalPods: 98,
        podsRunning: 96,
        podsPending: 2,
        podsFailed: 0,
        namespaces: 6,
        deployments: 12,
        deploymentsHealthy: 12,
        deploymentsUnhealthy: 0,
        services: 4,
        health: 'Healthy'
      }
    };

  get clusterSummary() {
    return this.clusterSummaryMap[this.selectedCluster] || this.clusterSummaryMap['aks-live'];
  }

  get deploymentsHealthyPct(): number {
    const total = this.clusterSummary.deployments;
    if (!total) return 100;
    return Math.round((this.clusterSummary.deploymentsHealthy / total) * 100);
  }

  /* ---------- Row 1: CPU & Memory utilization ---------- */
  private readonly bigPlot: Plot = { l: 48, r: 592, t: 12, b: 184 };

  trendCharts: TrendChart[] = [
    buildTrend({
      id: 'g-cpu', title: 'CPU Utilization', tipTitle: 'CPU Utilization',
      infoText: 'Cluster-wide CPU usage as a percentage of total allocatable CPU.',
      kind: 'cpu', group: 'trend', color: '#3b82f6',
      values: [36, 38, 35, 40, 39, 43, 46, 52, 50, 57, 61, 57, 50, 45, 38, 35, 38],
      yMax: 100, yStep: 25, suffix: '%',
      vbW: 600, vbH: 220, plot: this.bigPlot, labelY: 207
    }),
    buildTrend({
      id: 'g-mem', title: 'Memory Utilization', tipTitle: 'Memory Utilization',
      infoText: 'Cluster-wide memory usage as a percentage of total allocatable memory.',
      kind: 'mem', group: 'trend', color: '#22c55e',
      values: [47, 48, 47, 50, 52, 51, 55, 56, 58, 59, 60, 66, 64, 65, 66, 68, 71],
      yMax: 100, yStep: 25, suffix: '%',
      vbW: 600, vbH: 220, plot: this.bigPlot, labelY: 207
    })
  ];

  get cpuMemCharts(): TrendChart[] {
    return this.trendCharts;
  }

  /* ---------- Row 2: Top consumers ---------- */
  private withBars(items: Omit<ConsumerRow, 'bar'>[]): ConsumerRow[] {
    const max = Math.max(...items.map(i => parseFloat(i.value)));
    return items.map(i => ({ ...i, bar: Math.round((parseFloat(i.value) / (max * 2)) * 100) }));
  }

  consumers: ConsumerPanel[] = [
    {
      title: 'Top CPU Consumers', kind: 'CPU', unit: 'cores', usageHeader: 'CPU Usage (Cores)', color: '#2563eb',
      infoText: 'Workloads using the most CPU cores across the cluster.',
      items: this.withBars([
        { name: 'payment-service', namespace: 'production', value: '2.33', pct: 38, request: '3.00 cores', limit: '4.00 cores' },
        { name: 'order-service', namespace: 'production', value: '1.28', pct: 21, request: '2.00 cores', limit: '3.00 cores' },
        { name: 'notification-service', namespace: 'staging', value: '0.86', pct: 14, request: '1.00 cores', limit: '2.00 cores' },
        { name: 'api-gateway', namespace: 'production', value: '0.55', pct: 9, request: '1.00 cores', limit: '1.50 cores' },
        { name: 'user-service', namespace: 'qa', value: '0.34', pct: 6, request: '0.50 cores', limit: '1.00 cores' }
      ])
    },
    {
      title: 'Top Memory Consumers', kind: 'Memory', unit: 'GiB', usageHeader: 'Memory Usage (GiB)', color: '#22c55e',
      infoText: 'Workloads using the most memory across the cluster.',
      items: this.withBars([
        { name: 'payment-service', namespace: 'production', value: '36.8', pct: 31, request: '48.0 GiB', limit: '64.0 GiB' },
        { name: 'search-service', namespace: 'production', value: '26.1', pct: 22, request: '32.0 GiB', limit: '48.0 GiB' },
        { name: 'order-service', namespace: 'production', value: '20.3', pct: 17, request: '24.0 GiB', limit: '32.0 GiB' },
        { name: 'monitoring', namespace: 'monitoring', value: '14.6', pct: 12, request: '16.0 GiB', limit: '24.0 GiB' },
        { name: 'auth-service', namespace: 'staging', value: '9.8', pct: 8, request: '12.0 GiB', limit: '16.0 GiB' }
      ])
    }
  ];

  /* ---------- Row 3: Top namespaces ---------- */
  nsTabs = ['Pods', 'CPU', 'Memory', 'Restarts'];
  activeNsTab = 'Pods';

  private nsData: Record<string, NamespaceRow[]> = {
    Pods: [
      { name: 'production', value: 120, percent: 28 },
      { name: 'payments', value: 86, percent: 20 },
      { name: 'monitoring', value: 64, percent: 15 },
      { name: 'staging', value: 52, percent: 12 },
      { name: 'default', value: 38, percent: 9 }
    ],
    CPU: [
      { name: 'production', value: '3.1 vCPU', percent: 43 },
      { name: 'payments', value: '1.8 vCPU', percent: 25 },
      { name: 'monitoring', value: '1.1 vCPU', percent: 15 },
      { name: 'staging', value: '0.7 vCPU', percent: 10 },
      { name: 'default', value: '0.5 vCPU', percent: 7 }
    ],
    Memory: [
      { name: 'production', value: '11.2 GB', percent: 41 },
      { name: 'payments', value: '6.9 GB', percent: 25 },
      { name: 'monitoring', value: '4.4 GB', percent: 16 },
      { name: 'staging', value: '3.1 GB', percent: 11 },
      { name: 'default', value: '1.8 GB', percent: 7 }
    ],
    Restarts: [
      { name: 'production', value: 9, percent: 38 },
      { name: 'payments', value: 7, percent: 29 },
      { name: 'monitoring', value: 4, percent: 17 },
      { name: 'staging', value: 3, percent: 12 },
      { name: 'default', value: 1, percent: 4 }
    ]
  };

  private nsMetaData: Record<string, NamespaceMeta> = {
    Pods: {
      usageLabel: 'Pods in Namespace', shareLabel: 'Share of Total Pods', totalLabel: 'Total Pods in Cluster',
      total: '420', note: "Percent shows this namespace's share of total pods in the cluster."
    },
    CPU: {
      usageLabel: 'CPU in Namespace', shareLabel: 'Share of Total CPU', totalLabel: 'Total CPU in Cluster',
      total: '7.2 vCPU', note: "Percent shows this namespace's share of total CPU usage in the cluster."
    },
    Memory: {
      usageLabel: 'Memory in Namespace', shareLabel: 'Share of Total Memory', totalLabel: 'Total Memory in Cluster',
      total: '27.4 GB', note: "Percent shows this namespace's share of total memory usage in the cluster."
    },
    Restarts: {
      usageLabel: 'Restarts in Namespace', shareLabel: 'Share of Total Restarts', totalLabel: 'Total Restarts in Cluster',
      total: '24', note: "Percent shows this namespace's share of total restarts in the cluster."
    }
  };

  get nsRows(): NamespaceRow[] {
    return this.nsData[this.activeNsTab] || [];
  }

  get nsMeta(): NamespaceMeta {
    return this.nsMetaData[this.activeNsTab] || this.nsMetaData['Pods'];
  }

  /* ---------- Row 3: Nodes ---------- */
  podsPerNode: NodeItem[] = [
    {
      name: 'aks-node-1', status: 'Ready', pods: 198, podsCapacity: 200, cpu: 38, memory: 62,
      cpuUsed: '3.80', cpuCap: '10.00', memUsed: '99.2', memCap: '160.0'
    },
    {
      name: 'aks-node-2', status: 'Ready', pods: 222, podsCapacity: 250, cpu: 81, memory: 74,
      cpuUsed: '8.10', cpuCap: '10.00', memUsed: '118.4', memCap: '160.0'
    }
  ];

  podPct(node: NodeItem): number {
    return Math.round((node.pods / node.podsCapacity) * 100);
  }

  /* ---------- Row 3: Pod restarts trend ---------- */
  restartsChart: TrendChart = buildTrend({
    id: 'g-rst', title: 'Pod Restarts Trend', tipTitle: 'Pod Restarts',
    infoText: 'Number of pod / container restarts recorded over time.',
    kind: 'rst', group: 'rst', color: '#ef4444',
    values: [3, 5, 4, 7, 9, 12, 16, 19, 18, 22, 21, 17, 14, 10, 8, 6, 5],
    yMax: 30, yStep: 10, suffix: '',
    vbW: 420, vbH: 200, plot: { l: 36, r: 412, t: 12, b: 168 }, labelY: 190
  });

  /* ---------- Interactive hover & synchronized crosshair ---------- */
  private get allCharts(): TrendChart[] {
    return [...this.trendCharts, this.restartsChart];
  }

  private applyHover(c: TrendChart, pct: number, time: string): void {
    const n = c.values.length;
    const f = pct * (n - 1);
    const lo = Math.floor(f);
    const hi = Math.min(n - 1, Math.ceil(f));
    const frac = f - lo;
    const val = c.values[lo] * (1 - frac) + c.values[hi] * frac;

    c.hovered = true;
    c.hoverX = Number((c.plot.l + pct * (c.plot.r - c.plot.l)).toFixed(1));
    c.hoverY = Number((c.plot.b - (val / c.yMax) * (c.plot.b - c.plot.t)).toFixed(1));
    c.hoverTime = time;
    c.tooltipPct = Number(((c.hoverX / c.vbW) * 100).toFixed(1));
    c.flip = pct > 0.5;

    if (c.kind === 'cpu') {
      c.hoverBig = `${Math.round(val)}%`;
      c.hoverRows = [
        { label: 'CPU Usage', value: `${((val / 100) * 10).toFixed(2)} cores` },
        { label: 'CPU Capacity (Allocatable)', value: '10.00 cores' },
        { label: 'Scope', value: 'Cluster-wide' }
      ];
      c.hoverNote = 'Percentage = Total CPU usage / Total allocatable CPU in cluster.';
    } else if (c.kind === 'mem') {
      c.hoverBig = `${Math.round(val)}%`;
      c.hoverRows = [
        { label: 'Memory Usage', value: `${((val / 100) * 180).toFixed(1)} GiB` },
        { label: 'Memory Capacity (Allocatable)', value: '180.0 GiB' },
        { label: 'Scope', value: 'Cluster-wide' }
      ];
      c.hoverNote = 'Percentage = Total memory usage / Total allocatable memory in cluster.';
    } else {
      const restarts = Math.round(val);
      const cumulative = 1155 + c.values.slice(0, lo + 1).reduce((s, v) => s + v, 0);
      const affected = Math.max(1, Math.round(val / 3));
      c.hoverBig = '';
      c.hoverRows = [
        { label: 'Restarts in this interval', value: `${restarts}` },
        { label: 'Cumulative restarts', value: cumulative.toLocaleString('en-US') },
        { label: 'Affected pods', value: `${affected}` },
        { label: 'Affected containers', value: `${affected}` }
      ];
      c.hoverNote = 'Shows the number of pod/container restarts recorded in this time interval.';
    }
  }

  onChartMouseMove(event: MouseEvent, chart: TrendChart): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * chart.vbW;
    const x = Math.max(chart.plot.l, Math.min(chart.plot.r, svgX));
    const pct = (x - chart.plot.l) / (chart.plot.r - chart.plot.l);
    const time = `10:${pad2(Math.round(pct * SPAN_MIN))}`;

    // CPU & Memory share one crosshair; restarts chart is independent
    this.allCharts
      .filter(c => c.group === chart.group)
      .forEach(c => this.applyHover(c, pct, time));
  }

  onChartMouseLeave(chart: TrendChart): void {
    this.allCharts
      .filter(c => c.group === chart.group)
      .forEach(c => (c.hovered = false));
  }

  /* ---------- Row 4: Cluster Events ---------- */
  readonly clusterEventsMap: Record<string, ClusterEvent[]> = {
    'aks-live': [
      { time: '2024-09-24 15:06:12', type: 'Normal', reason: 'ScalingReplicaSet', object: 'Deployment/netraa-apm', namespace: 'aks-live', message: 'Scaled up replica set netraa-apm-d5bf5484 to 3' },
      { time: '2024-09-24 15:05:00', type: 'Normal', reason: 'NodeReady', object: 'Node/aks-node-1', namespace: 'kube-system', message: 'Node aks-node-1 status is now NodeReady' },
      { time: '2024-09-24 14:58:22', type: 'Normal', reason: 'Scheduled', object: 'Pod/frontend-7d4b9c8b74-2l9xm', namespace: 'astroshop', message: 'Successfully assigned astroshop/frontend-7d4b9c8b74-2l9xm to aks-node-2' },
      { time: '2024-09-24 14:56:18', type: 'Normal', reason: 'Pulled', object: 'Pod/payment-service-856c4d9f-wql92', namespace: 'production', message: 'Successfully pulled image "registry.netraa.io/payments/api:v2.4.1"' },
      { time: '2024-09-24 14:52:10', type: 'Normal', reason: 'Created', object: 'Pod/payment-service-856c4d9f-wql92', namespace: 'production', message: 'Created container payment-api' },
      { time: '2024-09-24 14:48:02', type: 'Warning', reason: 'BackOff', object: 'Pod/flagd-restart-zz7kx', namespace: 'astroshop', message: 'Back-off restarting failed container in pod flagd-restart-zz7kx' },
      { time: '2024-09-24 14:35:45', type: 'Warning', reason: 'FailedScheduling', object: 'Pod/elasticsearch-master-0', namespace: 'monitoring', message: '0/2 nodes are available: insufficient memory (requested 8GiB)' },
      { time: '2024-09-24 14:30:11', type: 'Normal', reason: 'Started', object: 'Pod/order-service-6d8b945c-qp42z', namespace: 'production', message: 'Started container order-worker' },
      { time: '2024-09-24 14:25:30', type: 'Normal', reason: 'Killing', object: 'Pod/auth-service-75b89cc4-9k21p', namespace: 'staging', message: 'Stopping container auth-service due to deployment rollout' },
      { time: '2024-09-24 14:18:04', type: 'Warning', reason: 'Unhealthy', object: 'Pod/notification-service-58d7-7l4qz', namespace: 'staging', message: 'Readiness probe failed: HTTP probe failed with statuscode: 503' },
      { time: '2024-09-24 14:10:52', type: 'Normal', reason: 'SuccessfulCreate', object: 'ReplicaSet/cart-648b7d9-x14', namespace: 'astroshop', message: 'Created pod: cart-648b7d9-x14-mn89p' },
      { time: '2024-09-24 14:02:18', type: 'Normal', reason: 'NodeAllocatableEnforced', object: 'Node/aks-node-2', namespace: 'kube-system', message: 'Updated Node Allocatable limit across cgroups' }
    ],
    'eks-live': [
      { time: '2024-09-24 15:10:04', type: 'Normal', reason: 'ScalingReplicaSet', object: 'Deployment/checkout-api', namespace: 'production', message: 'Scaled up replica set checkout-api-7b89f to 4' },
      { time: '2024-09-24 15:02:30', type: 'Normal', reason: 'NodeReady', object: 'Node/ip-192-168-10-42.ec2.internal', namespace: 'kube-system', message: 'Node ip-192-168-10-42.ec2.internal is ready' },
      { time: '2024-09-24 14:55:12', type: 'Normal', reason: 'Pulled', object: 'Pod/auth-service-9d8f7-q4x', namespace: 'staging', message: 'Successfully pulled image "602401143452.dkr.ecr.us-east-1.amazonaws.com/auth:v1.9"' },
      { time: '2024-09-24 14:46:18', type: 'Warning', reason: 'BackOff', object: 'Pod/metrics-exporter-5k99-wz', namespace: 'monitoring', message: 'Back-off restarting failed container' },
      { time: '2024-09-24 14:38:00', type: 'Normal', reason: 'Scheduled', object: 'Pod/order-processor-4f21-lm', namespace: 'production', message: 'Successfully assigned production/order-processor to ip-192-168-10-42' },
      { time: '2024-09-24 14:29:45', type: 'Normal', reason: 'Started', object: 'Pod/order-processor-4f21-lm', namespace: 'production', message: 'Started container order-processor' },
      { time: '2024-09-24 14:15:20', type: 'Normal', reason: 'NodeAllocatableEnforced', object: 'Node/ip-192-168-10-88.ec2.internal', namespace: 'kube-system', message: 'Updated Node Allocatable limit' }
    ],
    'gke-live': [
      { time: '2024-09-24 15:08:44', type: 'Normal', reason: 'ScalingReplicaSet', object: 'Deployment/catalog-service', namespace: 'production', message: 'Scaled up replica set catalog-service-58dc to 2' },
      { time: '2024-09-24 14:59:10', type: 'Normal', reason: 'NodeReady', object: 'Node/gke-cluster-default-pool-a1', namespace: 'kube-system', message: 'Node gke-cluster-default-pool-a1 is ready' },
      { time: '2024-09-24 14:48:32', type: 'Warning', reason: 'Unhealthy', object: 'Pod/search-indexer-8c9f-pj', namespace: 'production', message: 'Liveness probe failed: connection refused' },
      { time: '2024-09-24 14:36:15', type: 'Normal', reason: 'Scheduled', object: 'Pod/frontend-web-77bc-k2', namespace: 'default', message: 'Successfully assigned default/frontend-web to gke-cluster-default-pool-b2' },
      { time: '2024-09-24 14:22:50', type: 'Normal', reason: 'Pulled', object: 'Pod/frontend-web-77bc-k2', namespace: 'default', message: 'Successfully pulled image "gcr.io/netraa-prod/web:v3.1"' }
    ],
    'demo-kspm': [
      { time: '2024-09-24 14:50:11', type: 'Normal', reason: 'Scheduled', object: 'Pod/demo-agent-88df-pq', namespace: 'default', message: 'Successfully assigned demo-agent to k8s-worker-1' },
      { time: '2024-09-24 14:45:00', type: 'Normal', reason: 'NodeReady', object: 'Node/k8s-worker-1', namespace: 'kube-system', message: 'Node k8s-worker-1 is ready' },
      { time: '2024-09-24 14:30:22', type: 'Normal', reason: 'Started', object: 'Pod/demo-agent-88df-pq', namespace: 'default', message: 'Started container demo-agent' }
    ]
  };

  get events(): ClusterEvent[] {
    return this.clusterEventsMap[this.selectedCluster] || this.clusterEventsMap['aks-live'] || [];
  }

  evSearch = '';
  evTypeFilter = 'All';
  evItemsPerPage = 10;
  evPage = 1;
  exportMenuOpen = false;

  get filteredEvents(): ClusterEvent[] {
    const q = this.evSearch.trim().toLowerCase();
    const type = this.evTypeFilter;
    return this.events.filter(e => {
      if (type !== 'All' && e.type !== type) return false;
      if (!q) return true;
      return (
        e.time.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        e.reason.toLowerCase().includes(q) ||
        e.object.toLowerCase().includes(q) ||
        e.namespace.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q)
      );
    });
  }

  get evTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredEvents.length / (this.evItemsPerPage || 10)));
  }

  get pagedEvents(): ClusterEvent[] {
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

  toggleExportMenu(): void {
    this.exportMenuOpen = !this.exportMenuOpen;
  }

  exportEvents(format: 'xlsx' | 'csv'): void {
    this.exportMenuOpen = false;
    const data = this.filteredEvents;
    const columns: ExportColumn<ClusterEvent>[] = [
      { header: 'Timestamp', field: 'time' },
      { header: 'Type', field: 'type' },
      { header: 'Reason', field: 'reason' },
      { header: 'Involved Object', field: 'object' },
      { header: 'Namespace', field: 'namespace' },
      { header: 'Message', field: 'message' }
    ];
    const filename = `Cluster_Events_${this.selectedCluster || 'cluster'}`;
    if (format === 'xlsx') {
      this.exportService.exportToExcel(data, columns, filename);
    } else {
      this.exportService.exportToCsv(data, columns, filename);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.exportMenuOpen && !target.closest('.k8s-export-wrap')) {
      this.exportMenuOpen = false;
    }
  }
}