import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

interface StatCard {
  icon: string;
  tone: string;
  title: string;
  value: string;
  sub: string;
  danger?: boolean;
}

interface PortRow {
  name: string;
  port: string;
  protocol: string;
  targetPort: string;
  nodePort: string;
  appProtocol: string;
}

interface EndpointRow {
  ip: string;
  port: string;
  ready: boolean;
  node: string;
  pod: string;
}

interface PodRow {
  name: string;
  namespace: string;
  status: string;
  age: string;
  node: string;
  ip: string;
  ready: string;
}

interface RelatedServiceRow {
  name: string;
  type: string;
  clusterIp: string;
  externalIp: string;
  ports: string;
}

interface EventRow {
  timestamp: string;
  type: string;
  reason: string;
  message: string;
}

export interface NetworkHoverState {
  hovered: boolean;
  cursorX: number;
  time: string;
  tooltipLeft: number;
  incomingY: number;
  incomingVal: number;
  outgoingY: number;
  outgoingVal: number;
}

export interface SingleMetricHoverState {
  hovered: boolean;
  cursorX: number;
  time: string;
  tooltipLeft: number;
  y: number;
  val: number | string;
}

@Component({
  selector: 'app-service-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-details.component.html',
  styleUrls: ['./service-details.component.css']
})
export class ServiceDetailsComponent implements OnInit {
  breadcrumbs = ['Kubernetes', 'aks-live', 'Namespaces', 'astroshop', 'Kubernetes services'];
  currentPage = 'astroshop-postgresql-external';

  clusterSelector = 'aks-live';
  timeRange = 'Last 2 hours';

  serviceName = 'astroshop-postgresql-external';
  status = 'Active';
  namespace = 'astroshop';
  type = 'LoadBalancer';
  clusterIp = '10.0.88.232';
  externalIp = '20.232.218.150';
  created = '2024-07-12 10:24';
  age = '38 d 2 h';
  labels = 'app=postgresql,env=uat';

  constructor(private route: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const name = params.get('name') || params.get('service');
      if (name) {
        this.serviceName = name;
        this.currentPage = name;
      }
      const ns = params.get('namespace');
      if (ns) {
        this.namespace = ns;
        if (this.breadcrumbs && this.breadcrumbs.length >= 4) {
          this.breadcrumbs[3] = ns;
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/workload-details']);
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

  onBreadcrumbClick(crumb: string): void {
    if (crumb === 'Kubernetes') {
      this.router.navigate(['/kubernetes']);
    } else if (crumb === 'aks-live') {
      this.router.navigate(['/kubernetes-cluster'], { queryParams: { cluster: 'aks-live' } });
    } else if (crumb === 'Namespaces') {
      this.router.navigate(['/kubernetes-namespace'], { queryParams: { cluster: 'aks-live' } });
    } else if (crumb === 'astroshop' || crumb === this.namespace) {
      this.router.navigate(['/namespace-details'], {
        queryParams: { namespace: this.namespace || 'astroshop', name: this.namespace || 'astroshop' }
      });
    } else if (crumb === 'Kubernetes services' || crumb === 'Services' || crumb === 'Workloads') {
      this.router.navigate(['/kubernetes-workload'], { queryParams: { cluster: 'aks-live' } });
    }
  }

  statCards: StatCard[] = [
    {
      icon: 'endpoints',
      tone: 'tone-green',
      title: 'Endpoints',
      value: '1 / 1',
      sub: 'Ready'
    },
    {
      icon: 'pods',
      tone: 'tone-blue',
      title: 'Served pods',
      value: '1',
      sub: 'Running'
    },
    {
      icon: 'arrow-down',
      tone: 'tone-blue',
      title: 'Traffic (in)',
      value: '12.4 Mbps',
      sub: '↑ 12% vs last 2h'
    },
    {
      icon: 'arrow-up',
      tone: 'tone-purple',
      title: 'Traffic (out)',
      value: '8.1 Mbps',
      sub: '↑ 8% vs last 2h'
    },
    {
      icon: 'connections',
      tone: 'tone-blue',
      title: 'Connections',
      value: '125',
      sub: '↑ 5% vs last 2h'
    },
    {
      icon: 'alert',
      tone: 'tone-green',
      title: 'Errors',
      value: '0',
      sub: 'No errors'
    }
  ];

  viewAsOption = 'Absolute value';
  aggregationOption = 'No aggregation';

  timeLabels = ['13:30', '13:45', '14:00', '14:15', '14:30', '14:45', '15:00', '15:15'];

  ports: PortRow[] = [
    { name: '-', port: '5432', protocol: 'TCP', targetPort: '5432', nodePort: '30785', appProtocol: '-' }
  ];

  endpoints: EndpointRow[] = [
    { ip: '10.244.1.26', port: '5432', ready: true, node: 'aks-default-24770023-vmss0...', pod: 'postgresql-795947c995-5llgg' }
  ];

  servedPods: PodRow[] = [
    { name: 'postgresql-795947c995-5llgg', namespace: 'astroshop', status: 'Running', age: '1 d 6 h', node: 'aks-default-24770023...', ip: '10.244.1.26', ready: '1/1' }
  ];

  relatedServices: RelatedServiceRow[] = [
    { name: 'astroshop-postgresql', type: 'ClusterIP', clusterIp: '10.0.118.229', externalIp: '-', ports: '5432/TCP' }
  ];

  events: EventRow[] = [
    { timestamp: '2024-09-24 15:06:12', type: 'Normal', reason: 'EnsuredLoadBalancer', message: 'Ensured load balancer' },
    { timestamp: '2024-09-24 14:56:21', type: 'Normal', reason: 'Updated', message: 'Service updated' },
    { timestamp: '2024-09-24 14:27:44', type: 'Normal', reason: 'EndpointsUpdated', message: 'Endpoints updated' },
    { timestamp: '2024-09-24 14:22:10', type: 'Normal', reason: 'Created', message: 'Created service' }
  ];

  // Ports pagination
  portSearch = '';
  get filteredPorts() {
    const q = this.portSearch.trim().toLowerCase();
    if (!q) return this.ports;
    return this.ports.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.port.toLowerCase().includes(q) ||
      p.protocol.toLowerCase().includes(q) ||
      p.targetPort.toLowerCase().includes(q) ||
      p.nodePort.toLowerCase().includes(q) ||
      p.appProtocol.toLowerCase().includes(q)
    );
  }
  portItemsPerPage = 10;
  portPage = 1;
  get portTotalPages(): number { return Math.max(1, Math.ceil(this.filteredPorts.length / (this.portItemsPerPage || 10))); }
  get pagedPorts() {
    const ps = this.portItemsPerPage && this.portItemsPerPage > 0 ? this.portItemsPerPage : 10;
    return this.filteredPorts.slice((this.portPage - 1) * ps, this.portPage * ps);
  }
  get portStartIndex(): number {
    const ps = this.portItemsPerPage && this.portItemsPerPage > 0 ? this.portItemsPerPage : 10;
    return this.filteredPorts.length === 0 ? 0 : (this.portPage - 1) * ps + 1;
  }
  get portEndIndex(): number {
    const ps = this.portItemsPerPage && this.portItemsPerPage > 0 ? this.portItemsPerPage : 10;
    return Math.min(this.portPage * ps, this.filteredPorts.length);
  }
  onPortItemsPerPageChange(): void { if (!this.portItemsPerPage || this.portItemsPerPage < 1) this.portItemsPerPage = 10; this.portPage = 1; }
  previousPortPage(): void { if (this.portPage > 1) this.portPage--; }
  nextPortPage(): void { if (this.portPage < this.portTotalPages) this.portPage++; }
  goToPortPage(p: any): void { if (p !== '...') this.portPage = p; }
  get portTotalPagesArray(): (number | string)[] {
    const v = 3; let p: (number | string)[] = [];
    if (this.portTotalPages <= v + 2) p = Array.from({ length: this.portTotalPages }, (_, i) => i + 1);
    else if (this.portPage <= v) p = [...Array.from({ length: v }, (_, i) => i + 1), '...', this.portTotalPages];
    else if (this.portPage >= this.portTotalPages - v + 1) p = [1, '...', ...Array.from({ length: v }, (_, i) => this.portTotalPages - v + i + 1)];
    else p = [1, '...', this.portPage - 1, this.portPage, this.portPage + 1, '...', this.portTotalPages];
    return p;
  }

  // Endpoints pagination
  epSearch = '';
  get filteredEndpoints() {
    const q = this.epSearch.trim().toLowerCase();
    if (!q) return this.endpoints;
    return this.endpoints.filter(e =>
      e.ip.toLowerCase().includes(q) ||
      e.port.toLowerCase().includes(q) ||
      e.node.toLowerCase().includes(q) ||
      e.pod.toLowerCase().includes(q)
    );
  }
  epItemsPerPage = 10;
  epPage = 1;
  get epTotalPages(): number { return Math.max(1, Math.ceil(this.filteredEndpoints.length / (this.epItemsPerPage || 10))); }
  get pagedEndpoints() {
    const ps = this.epItemsPerPage && this.epItemsPerPage > 0 ? this.epItemsPerPage : 10;
    return this.filteredEndpoints.slice((this.epPage - 1) * ps, this.epPage * ps);
  }
  get epStartIndex(): number {
    const ps = this.epItemsPerPage && this.epItemsPerPage > 0 ? this.epItemsPerPage : 10;
    return this.filteredEndpoints.length === 0 ? 0 : (this.epPage - 1) * ps + 1;
  }
  get epEndIndex(): number {
    const ps = this.epItemsPerPage && this.epItemsPerPage > 0 ? this.epItemsPerPage : 10;
    return Math.min(this.epPage * ps, this.filteredEndpoints.length);
  }
  onEpItemsPerPageChange(): void { if (!this.epItemsPerPage || this.epItemsPerPage < 1) this.epItemsPerPage = 10; this.epPage = 1; }
  previousEpPage(): void { if (this.epPage > 1) this.epPage--; }
  nextEpPage(): void { if (this.epPage < this.epTotalPages) this.epPage++; }
  goToEpPage(p: any): void { if (p !== '...') this.epPage = p; }
  get epTotalPagesArray(): (number | string)[] {
    const v = 3; let p: (number | string)[] = [];
    if (this.epTotalPages <= v + 2) p = Array.from({ length: this.epTotalPages }, (_, i) => i + 1);
    else if (this.epPage <= v) p = [...Array.from({ length: v }, (_, i) => i + 1), '...', this.epTotalPages];
    else if (this.epPage >= this.epTotalPages - v + 1) p = [1, '...', ...Array.from({ length: v }, (_, i) => this.epTotalPages - v + i + 1)];
    else p = [1, '...', this.epPage - 1, this.epPage, this.epPage + 1, '...', this.epTotalPages];
    return p;
  }

  // Served pods pagination
  spSearch = '';
  get filteredServedPods() {
    const q = this.spSearch.trim().toLowerCase();
    if (!q) return this.servedPods;
    return this.servedPods.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.namespace.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q) ||
      p.node.toLowerCase().includes(q) ||
      p.ip.toLowerCase().includes(q)
    );
  }
  spItemsPerPage = 10;
  spPage = 1;
  get spTotalPages(): number { return Math.max(1, Math.ceil(this.filteredServedPods.length / (this.spItemsPerPage || 10))); }
  get pagedServedPods() {
    const ps = this.spItemsPerPage && this.spItemsPerPage > 0 ? this.spItemsPerPage : 10;
    return this.filteredServedPods.slice((this.spPage - 1) * ps, this.spPage * ps);
  }
  get spStartIndex(): number {
    const ps = this.spItemsPerPage && this.spItemsPerPage > 0 ? this.spItemsPerPage : 10;
    return this.filteredServedPods.length === 0 ? 0 : (this.spPage - 1) * ps + 1;
  }
  get spEndIndex(): number {
    const ps = this.spItemsPerPage && this.spItemsPerPage > 0 ? this.spItemsPerPage : 10;
    return Math.min(this.spPage * ps, this.filteredServedPods.length);
  }
  onSpItemsPerPageChange(): void { if (!this.spItemsPerPage || this.spItemsPerPage < 1) this.spItemsPerPage = 10; this.spPage = 1; }
  previousSpPage(): void { if (this.spPage > 1) this.spPage--; }
  nextSpPage(): void { if (this.spPage < this.spTotalPages) this.spPage++; }
  goToSpPage(p: any): void { if (p !== '...') this.spPage = p; }
  get spTotalPagesArray(): (number | string)[] {
    const v = 3; let p: (number | string)[] = [];
    if (this.spTotalPages <= v + 2) p = Array.from({ length: this.spTotalPages }, (_, i) => i + 1);
    else if (this.spPage <= v) p = [...Array.from({ length: v }, (_, i) => i + 1), '...', this.spTotalPages];
    else if (this.spPage >= this.spTotalPages - v + 1) p = [1, '...', ...Array.from({ length: v }, (_, i) => this.spTotalPages - v + i + 1)];
    else p = [1, '...', this.spPage - 1, this.spPage, this.spPage + 1, '...', this.spTotalPages];
    return p;
  }

  // Related services pagination
  rsSearch = '';
  get filteredRelatedServices() {
    const q = this.rsSearch.trim().toLowerCase();
    if (!q) return this.relatedServices;
    return this.relatedServices.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.type.toLowerCase().includes(q) ||
      s.clusterIp.toLowerCase().includes(q) ||
      s.externalIp.toLowerCase().includes(q) ||
      s.ports.toLowerCase().includes(q)
    );
  }
  rsItemsPerPage = 10;
  rsPage = 1;
  get rsTotalPages(): number { return Math.max(1, Math.ceil(this.filteredRelatedServices.length / (this.rsItemsPerPage || 10))); }
  get pagedRelatedServices() {
    const ps = this.rsItemsPerPage && this.rsItemsPerPage > 0 ? this.rsItemsPerPage : 10;
    return this.filteredRelatedServices.slice((this.rsPage - 1) * ps, this.rsPage * ps);
  }
  get rsStartIndex(): number {
    const ps = this.rsItemsPerPage && this.rsItemsPerPage > 0 ? this.rsItemsPerPage : 10;
    return this.filteredRelatedServices.length === 0 ? 0 : (this.rsPage - 1) * ps + 1;
  }
  get rsEndIndex(): number {
    const ps = this.rsItemsPerPage && this.rsItemsPerPage > 0 ? this.rsItemsPerPage : 10;
    return Math.min(this.rsPage * ps, this.filteredRelatedServices.length);
  }
  onRsItemsPerPageChange(): void { if (!this.rsItemsPerPage || this.rsItemsPerPage < 1) this.rsItemsPerPage = 10; this.rsPage = 1; }
  previousRsPage(): void { if (this.rsPage > 1) this.rsPage--; }
  nextRsPage(): void { if (this.rsPage < this.rsTotalPages) this.rsPage++; }
  goToRsPage(p: any): void { if (p !== '...') this.rsPage = p; }
  get rsTotalPagesArray(): (number | string)[] {
    const v = 3; let p: (number | string)[] = [];
    if (this.rsTotalPages <= v + 2) p = Array.from({ length: this.rsTotalPages }, (_, i) => i + 1);
    else if (this.rsPage <= v) p = [...Array.from({ length: v }, (_, i) => i + 1), '...', this.rsTotalPages];
    else if (this.rsPage >= this.rsTotalPages - v + 1) p = [1, '...', ...Array.from({ length: v }, (_, i) => this.rsTotalPages - v + i + 1)];
    else p = [1, '...', this.rsPage - 1, this.rsPage, this.rsPage + 1, '...', this.rsTotalPages];
    return p;
  }

  // Events pagination
  evSearch = '';
  get filteredEvents() {
    const q = this.evSearch.trim().toLowerCase();
    if (!q) return this.events;
    return this.events.filter(e =>
      e.timestamp.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      e.reason.toLowerCase().includes(q) ||
      e.message.toLowerCase().includes(q)
    );
  }
  evItemsPerPage = 10;
  evPage = 1;
  get evTotalPages(): number { return Math.max(1, Math.ceil(this.filteredEvents.length / (this.evItemsPerPage || 10))); }
  get pagedEvents() {
    const ps = this.evItemsPerPage && this.evItemsPerPage > 0 ? this.evItemsPerPage : 10;
    return this.filteredEvents.slice((this.evPage - 1) * ps, this.evPage * ps);
  }
  get evStartIndex(): number {
    const ps = this.evItemsPerPage && this.evItemsPerPage > 0 ? this.evItemsPerPage : 10;
    return this.filteredEvents.length === 0 ? 0 : (this.evPage - 1) * ps + 1;
  }
  get evEndIndex(): number {
    const ps = this.evItemsPerPage && this.evItemsPerPage > 0 ? this.evItemsPerPage : 10;
    return Math.min(this.evPage * ps, this.filteredEvents.length);
  }
  onEvItemsPerPageChange(): void { if (!this.evItemsPerPage || this.evItemsPerPage < 1) this.evItemsPerPage = 10; this.evPage = 1; }
  previousEvPage(): void { if (this.evPage > 1) this.evPage--; }
  nextEvPage(): void { if (this.evPage < this.evTotalPages) this.evPage++; }
  goToEvPage(p: any): void { if (p !== '...') this.evPage = p; }
  get evTotalPagesArray(): (number | string)[] {
    const v = 3; let p: (number | string)[] = [];
    if (this.evTotalPages <= v + 2) p = Array.from({ length: this.evTotalPages }, (_, i) => i + 1);
    else if (this.evPage <= v) p = [...Array.from({ length: v }, (_, i) => i + 1), '...', this.evTotalPages];
    else if (this.evPage >= this.evTotalPages - v + 1) p = [1, '...', ...Array.from({ length: v }, (_, i) => this.evTotalPages - v + i + 1)];
    else p = [1, '...', this.evPage - 1, this.evPage, this.evPage + 1, '...', this.evTotalPages];
    return p;
  }

  // Chart coordinate data for exact interpolation
  readonly chartXCoords = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420];
  readonly netIncomingY = [150, 140, 145, 130, 138, 120, 132, 110, 125, 105, 118, 100, 115, 98, 108];
  readonly netOutgoingY = [60, 70, 55, 72, 58, 68, 50, 65, 48, 62, 45, 60, 42, 58, 40];
  readonly connectionsY = [85, 90, 80, 88, 78, 86, 76, 84, 74, 82, 72, 80, 70, 78, 72];
  readonly requestsY = [120, 110, 118, 105, 115, 100, 112, 95, 108, 92, 105, 90, 102, 88, 98];

  // Independent hover states for each graph (hovering one does not activate the others)
  networkHover: NetworkHoverState = {
    hovered: false,
    cursorX: 0,
    time: '',
    tooltipLeft: 0,
    incomingY: 0,
    incomingVal: 0,
    outgoingY: 0,
    outgoingVal: 0
  };

  connectionsHover: SingleMetricHoverState = {
    hovered: false,
    cursorX: 0,
    time: '',
    tooltipLeft: 0,
    y: 0,
    val: 0
  };

  requestsHover: SingleMetricHoverState = {
    hovered: false,
    cursorX: 0,
    time: '',
    tooltipLeft: 0,
    y: 0,
    val: 0
  };

  onNetworkMouseMove(event: MouseEvent): void {
    const svgX = this.getSvgX(event);
    const incomingY = this.interpolate(svgX, this.netIncomingY);
    const outgoingY = this.interpolate(svgX, this.netOutgoingY);

    this.networkHover = {
      hovered: true,
      cursorX: +svgX.toFixed(1),
      time: this.getTimeLabel(svgX),
      tooltipLeft: this.getTooltipLeft(svgX),
      incomingY: +incomingY.toFixed(1),
      incomingVal: Math.max(0, +(((150 - incomingY) / 150) * 300).toFixed(1)),
      outgoingY: +outgoingY.toFixed(1),
      outgoingVal: Math.max(0, +(((150 - outgoingY) / 150) * 300).toFixed(1))
    };
  }

  onNetworkMouseLeave(): void {
    this.networkHover.hovered = false;
  }

  onConnectionsMouseMove(event: MouseEvent): void {
    const svgX = this.getSvgX(event);
    const y = this.interpolate(svgX, this.connectionsY);

    this.connectionsHover = {
      hovered: true,
      cursorX: +svgX.toFixed(1),
      time: this.getTimeLabel(svgX),
      tooltipLeft: this.getTooltipLeft(svgX),
      y: +y.toFixed(1),
      val: Math.max(0, Math.round(((150 - y) / 150) * 300))
    };
  }

  onConnectionsMouseLeave(): void {
    this.connectionsHover.hovered = false;
  }

  onRequestsMouseMove(event: MouseEvent): void {
    const svgX = this.getSvgX(event);
    const y = this.interpolate(svgX, this.requestsY);

    this.requestsHover = {
      hovered: true,
      cursorX: +svgX.toFixed(1),
      time: this.getTimeLabel(svgX),
      tooltipLeft: this.getTooltipLeft(svgX),
      y: +y.toFixed(1),
      val: Math.max(0, +(((150 - y) / 150) * 120).toFixed(1))
    };
  }

  onRequestsMouseLeave(): void {
    this.requestsHover.hovered = false;
  }

  private getSvgX(event: MouseEvent): number {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clientX = event.clientX - rect.left;
    const width = rect.width;
    if (width <= 0) return 0;
    const svgX = (clientX / width) * 420;
    return Math.max(0, Math.min(420, svgX));
  }

  private interpolate(svgX: number, yCoords: readonly number[]): number {
    if (svgX <= this.chartXCoords[0]) return yCoords[0];
    if (svgX >= this.chartXCoords[this.chartXCoords.length - 1]) return yCoords[yCoords.length - 1];
    for (let i = 0; i < this.chartXCoords.length - 1; i++) {
      if (svgX >= this.chartXCoords[i] && svgX <= this.chartXCoords[i + 1]) {
        const t = (svgX - this.chartXCoords[i]) / (this.chartXCoords[i + 1] - this.chartXCoords[i]);
        return yCoords[i] * (1 - t) + yCoords[i + 1] * t;
      }
    }
    return yCoords[0];
  }

  private getTimeLabel(svgX: number): string {
    const pct = svgX / 420;
    const totalMins = Math.round(13 * 60 + 30 + pct * 105);
    const hh = Math.floor(totalMins / 60);
    const mm = totalMins % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `2024-09-24, ${pad(hh)}:${pad(mm)}`;
  }

  private getTooltipLeft(svgX: number): number {
    const pct = svgX / 420;
    if (pct > 0.58) {
      return Math.max(2, Math.round((pct * 100 - 40) * 10) / 10);
    } else {
      return Math.min(64, Math.round((pct * 100 + 4) * 10) / 10);
    }
  }
}