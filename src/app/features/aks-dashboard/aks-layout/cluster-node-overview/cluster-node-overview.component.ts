import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DateService } from '../../../../services/date.service';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { switchMap, map, catchError, filter, takeUntil } from 'rxjs/operators';
import { of } from 'rxjs';
import { KubernetesService } from '../../../../services/kubernetes.service';
import { ApplicationService } from '../../../../services/application.service';
import { User } from '../../../../models/user';
import { Session } from '../../../../models/session';
import { AuthenticationService } from '../../../../services/authentication.service';
import { LoggerService } from '../../../../services/logger.service';

/* =======================
   MODELS
======================= */
interface NodeMetric {
  name: string;
  hostname: string;

  allocatedPods: number;
  allocatablePods: number;
  runningPods: number;

  deployments: number;
  daemonsets: number;
  replicasets: number;
}

interface ClusterRow {
  name: string;
  expanded: boolean;
  nodes: NodeMetric[];
  applicationTechnology?: string;
  applicationType?: string;
}

@Component({
  selector: 'app-cluster-node-overview',
  imports: [CommonModule],
  templateUrl: './cluster-node-overview.component.html',
  styleUrls: ['./cluster-node-overview.component.css']
})
export class ClusterNodeOverviewComponent implements OnInit, OnDestroy {

  clusters: ClusterRow[] = [];
  applicationTypeMap = new Map<string, any>();

  user: User = new User();
  currentUser: User | null = null;
  sessionObject: Session = new Session();

  subscription: Subscription = new Subscription();
  private datesubscription: Subscription = new Subscription();
  datemodel: any;
  startTime!: number;
  endTime!: number;

  private destroy$ = new Subject<void>();

  // st = '202601081800';
  // et = '202601081815';

  constructor(
    private k8sService: KubernetesService,
    private dateService: DateService,
    private applicationService: ApplicationService,
    private authService: AuthenticationService,
    private loggerService: LoggerService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.authService.currentUser.subscribe((x) => (this.currentUser = x));
    this.dateService.setActiveComponent('ClusterNodeOverviewComponent');

    // Shared load function
    const load = (dates: any) => {
      this.datemodel = dates;
      this.startTime = this.formatDate(this.datemodel.startdateTime);
      this.endTime = this.formatDate(this.datemodel.enddateTime);

      if (this.currentUser) {
        this.user = this.currentUser;
      }
      this.user.sessionDTO = this.sessionObject;
      this.sessionObject.featureName = 'RUAMBOT';
      this.sessionObject.requestURI = this.router.url.split('?')[0];
      this.sessionObject.userId = this.user.userId;
      this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
      this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
      this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
      this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;

      const featureType = sessionStorage.getItem('featureType') || 'AKS';
      this.applicationService.getFullApplicationData(this.user.userId, featureType, this.sessionObject).pipe(
        takeUntil(this.destroy$),
        switchMap((data: any) => {
          if (data && data.serviceStatus === 'Success') {
            const applications: any[] = data.serviceResponse?.applications || [];

            this.applicationTypeMap.clear();
            applications.forEach((app: any) => {
              this.applicationTypeMap.set(app.applicationName, {
                technology: app.applicationTechnology,
                type: app.applicationType
              });
            });

            // ① Seed clusters immediately so table is never blank
            this.clusters = applications.map((app: any, i: number) => ({
              name: app.applicationName,
              expanded: i === 0,
              nodes: [],
              applicationTechnology: app.applicationTechnology,
              applicationType: app.applicationType
            }));

            if (applications.length === 0) return of({});

            const payloadForK8s = applications.map((app: any) => `${app.applicationName},${app.applicationId}`);
            return this.k8sService.getNodesByAppId(payloadForK8s).pipe(
              catchError(() => of({}))
            );
          } else {
            return of({});
          }
        })
      ).subscribe((structure: any) => {
        if (structure && Object.keys(structure).length > 0) {
          this.loadClusterOverview(structure);
        }
        // else: clusters already seeded above, just leave them as-is
      });

    };

    // ① Load immediately with current date values
    this.dateService.date$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(dates => {
      load(dates);
    });

    // ② Also reload on active-component date changes (e.g. date picker changes)
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'ClusterNodeOverviewComponent'),
      switchMap(() => this.dateService.date$),
      takeUntil(this.destroy$)
    ).subscribe(dates => {
      load(dates);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
  }

  formatDate(date: string) {
    if (!date) return 0;
    date = date.replace(/[^0-9]/g, "");
    if (date.length > 12) {
      date = date.substring(0, 12);
    }
    return parseInt(date);
  }

  loadClusterOverview(structureData: any) {
    const st = this.startTime.toString();
    const et = this.endTime.toString();

    of(structureData).pipe(
      takeUntil(this.destroy$),
      // Step 1: Get the structure first
      switchMap((structure: any) => {
        const apiCalls: any[] = [];
        const nodeMapRef: any[] = [];

        const clusterNames = Object.keys(structure);

        clusterNames.forEach(cName => {
          const nodesData = structure[cName];
          nodesData.forEach((node: any) => {
            const call = this.k8sService.getClusterNodeOverview(node.hostName, st, et).pipe(
              takeUntil(this.destroy$),
              catchError(err => of(null))
            );

            apiCalls.push(call);

            nodeMapRef.push({
              clusterName: cName,
              nodeName: node.nodeName,
              hostName: node.hostName
            });
          });
        });

        if (apiCalls.length === 0) {
          return of({ structure, results: [], nodeMapRef });
        }

        return forkJoin(apiCalls).pipe(
          map(results => {
            return { structure, results, nodeMapRef };
          })
        );
      })
    ).subscribe(({ structure, results, nodeMapRef }: any) => {
      this.clusters = [];
      const clusterNames = Object.keys(structure);

      clusterNames.forEach((cName, i) => {
        const rawNodes = structure[cName];

        const nodes: NodeMetric[] = rawNodes.map((nd: any) => {

          const index = nodeMapRef.findIndex((ref: any) => ref.hostName === nd.hostName);
          const metricData = (index !== -1) ? results[index] : null;

          if (!metricData) {
            return this.createEmptyNode(nd.nodeName, nd.hostName);
          }

          let allocated = 0;
          let running = 0;
          let deps = 0, ds = 0, rs = 0;

          if (metricData.nodeOverviews && metricData.nodeOverviews.length > 0) {
            const match = metricData.nodeOverviews.find((m: any) => m.nodeName === nd.nodeName);
            if (match) {
              allocated = match.runningPods || 0;
              running = match.runningPods || 0;
              deps = match.deployments || 0;
              ds = match.daemonSets || 0;
              rs = match.replicaSets || 0;
            }
          }

          else {
            allocated = metricData.totalPods || 0;
            running = metricData.totalPods || 0;
            deps = metricData.totalDeployments || 0;
            ds = metricData.totalDaemonSets || 0;
            rs = metricData.totalReplicaSets || 0;
          }

          return {
            name: nd.nodeName,
            hostname: nd.hostName,
            allocatedPods: allocated,
            allocatablePods: 110,
            runningPods: running,
            deployments: deps,
            daemonsets: ds,
            replicasets: rs
          };
        });

        const appDetails = this.applicationTypeMap.get(cName) || { technology: '', type: '' };
        this.clusters.push({
          name: cName,
          expanded: i === 0,
          nodes: nodes,
          applicationTechnology: appDetails.technology,
          applicationType: appDetails.type
        });
      });
    });
  }

  getImagePath(tech: string | undefined | null, appType: string | undefined | null): string {
    const t = tech ? tech.trim().toLowerCase() : '';
    const a = appType ? appType.trim().toLowerCase() : '';
    return 'assets/images/' + (t || a || 'undefined') + '.png';
  }

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/img/technologies/UNKNOWN_CLOUD.png';
  }

  createEmptyNode(name: string, hostname: string): NodeMetric {
    return {
      name, hostname,
      allocatedPods: 0, allocatablePods: 110, runningPods: 0,
      deployments: 0, daemonsets: 0, replicasets: 0
    };
  }

  openNode(node: NodeMetric): void {
    sessionStorage.setItem('selectedNode', node.hostname);
    this.router.navigate(['/aks', node.hostname]);
  }

  /* =======================
     UI ACTIONS
  ======================= */
  toggle(cluster: ClusterRow): void {
    cluster.expanded = !cluster.expanded;
  }

  podPercent(node: NodeMetric): number {
    if (!node.allocatablePods) return 0;
    return Math.round(
      (node.allocatedPods / node.allocatablePods) * 100
    );
  }

  /* =======================
     CLUSTER AGGREGATES
  ======================= */
  totalPods(cluster: ClusterRow): number {
    return cluster.nodes.reduce(
      (s, n) => s + n.allocatedPods, 0
    );
  }

  totalDeployments(cluster: ClusterRow): number {
    return cluster.nodes.reduce(
      (s, n) => s + n.deployments, 0
    );
  }

  totalDaemonSets(cluster: ClusterRow): number {
    return cluster.nodes.reduce(
      (s, n) => s + n.daemonsets, 0
    );
  }

  totalReplicaSets(cluster: ClusterRow): number {
    return cluster.nodes.reduce(
      (s, n) => s + n.replicasets, 0
    );
  }
}
