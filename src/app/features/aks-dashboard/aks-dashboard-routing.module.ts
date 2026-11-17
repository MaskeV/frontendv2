import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AksLayoutComponent } from './aks-layout/aks-layout.component';
import { AksOverviewComponent } from './aks-layout/aks-overview/aks-overview.component';
import { ApiServerDashboardComponent } from './aks-layout/api-server-dashboard/api-server-dashboard.component';
import { PodsDashboardComponent } from './aks-layout/pods-dashboard/pods-dashboard.component';
import { ClusterOverviewDashboardComponent } from './aks-layout/cluster-overview-dashboard/cluster-overview-dashboard.component';
import { DaemonsetsDashboardComponent } from './aks-layout/daemonsets-dashboard/daemonsets-dashboard.component';
import { DeploymentDashboardComponent } from './aks-layout/deployment-dashboard/deployment-dashboard.component';
import { NodesDashboardComponent } from './aks-layout/nodes-dashboard/nodes-dashboard.component';
import { PvPvcDashboardComponent } from './aks-layout/pv-pvc-dashboard/pv-pvc-dashboard.component';
import { ServicesDashboardComponent } from './aks-layout/services-dashboard/services-dashboard.component';
import { StatefulsetsDashboardComponent } from './aks-layout/statefulsets-dashboard/statefulsets-dashboard.component';
import { VolumesDashboardComponent } from './aks-layout/volumes-dashboard/volumes-dashboard.component';
import { ProxyDashboardComponent } from './aks-layout/proxy-dashboard/proxy-dashboard.component';
import { LogsDashboardComponent } from './aks-layout/logs-dashboard/logs-dashboard.component';
import { ClusterNodeOverviewComponent } from './aks-layout/cluster-node-overview/cluster-node-overview.component';

const routes: Routes = [

  /* STEP 1: /aks */
  {
    path: '',
    component: ClusterNodeOverviewComponent
  },

  /* STEP 2: /aks/:hostname */
  {
    path: ':hostname',
    component: AksLayoutComponent,
    children: [

      /* default dashboard */
      { path: '', component: AksOverviewComponent },

      { path: 'api-server', component: ApiServerDashboardComponent },
      { path: 'pods', component: PodsDashboardComponent },
      { path: 'cluster-overview', component: ClusterOverviewDashboardComponent },
      { path: 'daemonsets', component: DaemonsetsDashboardComponent },
      { path: 'deployments', component: DeploymentDashboardComponent },
      { path: 'nodes', component: NodesDashboardComponent },
      { path: 'pv-pvc', component: PvPvcDashboardComponent },
      { path: 'services', component: ServicesDashboardComponent },
      { path: 'statefulsets', component: StatefulsetsDashboardComponent },
      { path: 'volumes', component: VolumesDashboardComponent },
      { path: 'proxy', component: ProxyDashboardComponent },
      { path: 'logs', component: LogsDashboardComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AksDashboardRoutingModule { }
