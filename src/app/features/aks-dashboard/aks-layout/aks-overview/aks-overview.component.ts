import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, Subscription, of } from 'rxjs';
import { filter, switchMap, takeUntil, catchError } from 'rxjs/operators';

import { DateService } from '../../../../services/date.service';
import { KubernetesService } from '../../../../services/kubernetes.service';
import { AuthenticationService } from '../../../../services/authentication.service';
import { LoggerService } from '../../../../services/logger.service';

import { User } from '../../../../models/user';
import { Session } from '../../../../models/session';

/* =======================
   INTERFACES
======================= */
interface Dashboard {
  name: string;
  slug: string;
  description: string;
  updated: string;
  tags: string[];
  managed: boolean;
}

interface NodeOverviewData {
  nodeName: string;
  nodeOverviews?: NodeOverviewData[];

  totalDeployments: number;
  totalVolumes: number;
  totalDaemonSets: number;
  totalPods: number;
  totalStatefulSets: number;
  totalServices: number;
  totalReplicaSets: number;
  totalPVs: number;
  totalNodes: number;
  totalPVCs: number;

  infoLogs: number;
  warnLogs: number;
  errorLogs: number;
}

type MetricConfig = {
  key?: keyof NodeOverviewData;
  label: string;
  isCombined?: boolean;
};

/* =======================
   COMPONENT
======================= */
@Component({
    selector: 'app-aks-overview',
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './aks-overview.component.html',
    styleUrl: './aks-overview.component.css'
})
export class AksOverviewComponent implements OnInit, OnDestroy {

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dateService: DateService,
    private k8sService: KubernetesService,
    private authService: AuthenticationService,
    private loggerService: LoggerService
  ) {}

  /* =======================
     STATE
  ======================= */
  searchText = '';
  sortAsc = true;
  isLoading = false;
  nodeData: NodeOverviewData | null = null;

  startTime: number = 0;
  endTime: number = 0;
  datemodel: any;

  currentUser: User | null = null;
  user: User = new User();
  sessionObject: Session = new Session();

  private destroy$ = new Subject<void>();
  private dateSubscription = new Subscription();

  /* =======================
     METRIC CONFIG
  ======================= */
  private metricConfig: Record<string, MetricConfig> = {
    deployments:  { key: 'totalDeployments', label: 'Deployments' },
    volumes:      { key: 'totalVolumes', label: 'Volumes' },
    daemonsets:   { key: 'totalDaemonSets', label: 'DaemonSets' },
    pods:         { key: 'totalPods', label: 'Pods' },
    statefulsets: { key: 'totalStatefulSets', label: 'StatefulSets' },
    services:     { key: 'totalServices', label: 'Services' },
    nodes:        { key: 'totalNodes', label: 'Nodes' },
    replicasets:  { key: 'totalReplicaSets', label: 'ReplicaSets' },

    'pv-pvc':     { label: 'PV + PVC', isCombined: true },
    logs:         { label: 'Logs' }
  };

  /* =======================
     DASHBOARDS
  ======================= */
  dashboards: Dashboard[] = [
    { name: '[Metrics Kubernetes] API Server', slug: 'api-server', description: 'Kubernetes API server metrics', updated: 'last week', tags: ['Kubernetes'], managed: true },
    { name: '[Metrics Kubernetes] Cluster Overview', slug: 'cluster-overview', description: 'Overview of Kubernetes cluster metrics', updated: 'last week', tags: ['Kubernetes'], managed: true },
    { name: '[Metrics Kubernetes] DaemonSets', slug: 'daemonsets', description: 'Metrics about DaemonSets', updated: 'last week', tags: ['Kubernetes'], managed: true },
    { name: '[Metrics Kubernetes] Deployments', slug: 'deployments', description: 'Metrics about Deployments', updated: 'last week', tags: ['Kubernetes'], managed: true },
    { name: '[Metrics Kubernetes] Nodes', slug: 'nodes', description: 'Metrics about Nodes', updated: 'last week', tags: ['Kubernetes'], managed: true },
    { name: '[Metrics Kubernetes] PV / PVC', slug: 'pv-pvc', description: 'Metrics about Persistent Volumes and Claims', updated: 'last week', tags: ['Kubernetes'], managed: true },
    { name: '[Metrics Kubernetes] Pods', slug: 'pods', description: 'Metrics about Pods', updated: 'last week', tags: ['Kubernetes'], managed: true },
    { name: '[Metrics Kubernetes] Proxy', slug: 'proxy', description: 'Kubernetes Proxy metrics', updated: 'last week', tags: ['Kubernetes'], managed: true },
    { name: '[Metrics Kubernetes] Services', slug: 'services', description: 'Metrics about Services', updated: 'last week', tags: ['Kubernetes'], managed: true },
    { name: '[Metrics Kubernetes] StatefulSets', slug: 'statefulsets', description: 'Metrics about StatefulSets', updated: 'last week', tags: ['Kubernetes'], managed: true },
    { name: '[Metrics Kubernetes] Volumes', slug: 'volumes', description: 'Metrics about Volumes', updated: 'last week', tags: ['Kubernetes'], managed: true },
    { name: '[Metrics Kubernetes] Logs', slug: 'logs', description: 'Cluster logs', updated: 'last week', tags: ['Kubernetes'], managed: true }
  ];

  /* =======================
     LIFECYCLE
  ======================= */
  ngOnInit(): void {
    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => this.currentUser = user);

    this.dateService.setActiveComponent('AksOverviewComponent');

    this.dateSubscription = this.dateService.activeComponent$.pipe(
      filter(active => active === 'AksOverviewComponent'),
      switchMap(() => this.dateService.date$),
      takeUntil(this.destroy$)
    ).subscribe(dates => this.handleDateChange(dates));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.dateSubscription.unsubscribe();
  }

  /* =======================
     DATE HANDLER
  ======================= */
  private handleDateChange(dates: any): void {
    if (!dates) return;

    this.datemodel = dates;
    this.startTime = this.formatDate(dates.startdateTime);
    this.endTime   = this.formatDate(dates.enddateTime);

    this.prepareSession();
    this.fetchData();
  }

  /* =======================
     SESSION SETUP
  ======================= */
  private prepareSession(): void {
    if (this.currentUser) {
      this.user = this.currentUser;
    }

    this.user.sessionDTO = this.sessionObject;

    this.sessionObject.featureName = 'RUAMBOT';
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');

    const browser = this.loggerService.getBrowserNameAndVersion();
    this.sessionObject.browserName = browser.name;
    this.sessionObject.browserVersion = browser.version;
  }

  /* =======================
     API
  ======================= */
  private fetchData(): void {
    const hostname = this.route.snapshot.paramMap.get('hostname');
    if (!hostname) return;

    this.isLoading = true;

    this.k8sService.getClusterNodeOverview(
      hostname,
      this.startTime.toString(),
      this.endTime.toString()
    ).pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('API Error:', err);
        return of(null);
      })
    ).subscribe(data => {
      this.isLoading = false;
      this.nodeData = this.extractNodeData(data);
    });
  }

  private extractNodeData(data: unknown): NodeOverviewData | null {
    if (!data || typeof data !== 'object') return null;

    const typed = data as NodeOverviewData;

    if (typed.nodeOverviews && typed.nodeOverviews.length > 0) {
      return typed.nodeOverviews[0];
    }

    return typed;
  }

  /* =======================
     METRICS
  ======================= */
getMetricForSlug(slug: string): number | null {
  if (!this.nodeData) return null;

  const config = this.metricConfig[slug];
  if (!config) return null;

  if (config.isCombined) {
    return (this.nodeData.totalPVs || 0) + (this.nodeData.totalPVCs || 0);
  }

  if (!config.key) return null;

  const value = this.nodeData[config.key];

  return typeof value === 'number' ? value : 0;
}

  getSlugLabel(slug: string): string {
    return this.metricConfig[slug]?.label ?? '';
  }

  getLogMetrics(): { type: string; value: number }[] {
    if (!this.nodeData) return [];

    return [
      { type: 'info',  value: this.nodeData.infoLogs || 0 },
      { type: 'warn',  value: this.nodeData.warnLogs || 0 },
      { type: 'error', value: this.nodeData.errorLogs || 0 }
    ];
  }

  hasCriticalLogs(): boolean {
    return (this.nodeData?.errorLogs || 0) > 0;
  }

  /* =======================
     HELPERS
  ======================= */
  formatDate(date: string): number {
    if (!date) return 0;

    const clean = date.replace(/[^0-9]/g, '').slice(0, 12);
    return Number(clean) || 0;
  }

  getDisplayName(name: string): string {
    return name.replace(/^\[.*?\]\s*/, '').trim();
  }

  toggleSort(): void {
    this.sortAsc = !this.sortAsc;
  }

  trackBySlug(index: number, item: Dashboard): string {
    return item.slug;
  }

  /* =======================
     FILTER + SORT
  ======================= */
  get filteredDashboards(): Dashboard[] {
    const search = this.searchText.toLowerCase();

    return this.dashboards
      .filter(d => d.name.toLowerCase().includes(search))
      .sort((a, b) =>
        this.sortAsc
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      );
  }
}