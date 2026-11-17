import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ServicePageComponent } from './features/Dashboard/service-page/service-page.component';
import { GeneralServicesComponent } from './features/Dashboard/service-page/general-services/general-services.component';
import { HostComponent } from './features/Infrastructure/host/host.component';
import { LinuxDashboardComponent } from './features/Infrastructure/host/linux-dashboard/linux-dashboard.component';
import { GeneralInstanceComponent } from './features/Dashboard/service-page/general-services/general-instance/general-instance.component';
import { WindowDashboardComponent } from './features/Infrastructure/host/window-dashboard/window-dashboard.component';
import { ContainerMonitoringComponent } from './features/Infrastructure/container-monitoring/container-monitoring.component';
import { ContainerStatusComponent } from './features/Infrastructure/container-monitoring/container-status/container-status.component';
import { ContainerDashboardComponent } from './features/Infrastructure/container-monitoring/container-status/container-dashboard/container-dashboard.component';
import { GeneralEndpointComponent } from './features/Dashboard/service-page/general-services/general-endpoint/general-endpoint.component';
import { NetworkComponent } from './features/Infrastructure/network/network.component';
import { NetworkDataComponent } from './features/Infrastructure/network/network-data/network-data.component';
import { CapacityPlannerComponent } from './features/Infrastructure/capacity-planner/capacity-planner.component';
import { AlertComponent } from './features/Alert/alert/alert.component';
import { CustomAlertComponent } from './features/Alert/custom-alert/custom-alert.component';
import { LicenseComponent } from './features/license/license.component';
import { AwsApiGatewayComponent } from './features/Cloud/aws-api-gateway/aws-api-gateway.component';
import { EksComponent } from './features/Cloud/eks/eks.component';
import { RdsComponent } from './features/Cloud/rds/rds.component';
import { ScheduledReportsComponent } from './features/Report/sm-reports/scheduled-reports/scheduled-reports.component';
import { StandardReportsComponent } from './features/Report/sm-reports/standard-reports/standard-reports.component';
import { CustomReportFormComponent } from './features/Report/sm-reports/custom-report/custom-report-form/custom-report-form.component';
import { CustomReportComponent } from './features/Report/sm-reports/custom-report/custom-report.component';
import { MetricConfigComponent } from './features/Configuration/metric-config/metric-config.component';
import { NetworkSpeedChartComponent } from './features/Infrastructure/host/linux-dashboard/network-speed-chart/network-speed-chart.component';
import { NetworkInterfaceComponent } from './features/Infrastructure/network/network-data/network-interface/network-interface.component';
import { RedisComponent } from './features/Infrastructure/redis/redis.component';
import { RedisListComponent } from './features/Infrastructure/redis/redis-list/redis-list.component';
import { RedisInstanceComponent } from './features/Infrastructure/redis/redis-instance/redis-instance.component';
import { AdminConfigComponent } from './features/Configuration/admin-config/admin-config.component';
import { RoleComponent } from './features/Configuration/admin-config/role/role.component';
import { UserComponent } from './features/Configuration/admin-config/user/user.component';
import { ApplicationIpMappingComponent } from './features/Configuration/admin-config/application-ip-mapping/application-ip-mapping.component';
import { NginxListComponent } from './features/Infrastructure/nginx/nginx-list/nginx-list.component';
import { NginxComponent } from './features/Infrastructure/nginx/nginx.component';
import { NginxInstanceComponent } from './features/Infrastructure/nginx/nginx-instance/nginx-instance.component';
import { NginxEndpointComponent } from './features/Infrastructure/nginx/nginx-endpoint/nginx-endpoint.component';
import { ProblemPageComponent } from './features/Dashboard/problem-page/problem-page.component';
import { BrowserMonitoringComponent } from './features/Browser/browser-monitoring/browser-monitoring.component';
import { BrowserServiceComponent } from './features/Browser/browser-monitoring/browser-service/browser-service.component';
import { BrowserVersionComponent } from './features/Browser/browser-monitoring/browser-version/browser-version.component';
import { BrowserPageComponent } from './features/Browser/browser-monitoring/browser-page/browser-page.component';
import { FaqBotComponent } from './features/faq-bot/faq-bot.component';
import { KafkaServiceComponent } from './features/MessageQueue/kafka/kafka-service/kafka-service.component';
import { KafkaBrokerComponent } from './features/MessageQueue/kafka/kafka-broker/kafka-broker.component';
import { KafkaOverviewComponent } from './features/MessageQueue/kafka/kafka-overview/kafka-overview.component';
import { IisMonitoringComponent } from './features/Cloud/iis-monitoring/iis-monitoring.component';
import { IisServiceComponent } from './features/Cloud/iis-monitoring/iis-service/iis-service.component';
import { HtmlReportComponent } from './features/Report/html-report/html-report.component';
import { RdsServiceComponent } from './features/Cloud/rds/rds-service/rds-service.component';
import { AwsGatewayServiceComponent } from './features/Cloud/aws-api-gateway/aws-gateway-service/aws-gateway-service.component';
import { AwsGatewayEndpointComponent } from './features/Cloud/aws-api-gateway/aws-gateway-endpoint/aws-gateway-endpoint.component';
import { EksServiceComponent } from './features/Cloud/eks/eks-service/eks-service.component';
import { EksInstnanceListComponent } from './features/Cloud/eks/eks-service/eks-instnance-list/eks-instnance-list.component';
import { EksEndpointListComponent } from './features/Cloud/eks/eks-service/eks-endpoint-list/eks-endpoint-list.component';
import { FeaturesComponent } from './features/Configuration/admin-config/features/features.component';
import { ApplicationIpMappingNewComponent } from './features/Configuration/admin-config/application-ip-mapping-new/application-ip-mapping-new.component';
import { InterfaceConfigComponent } from './features/Configuration/admin-config/interface-config/interface-config.component';
import { ControlZoneComponent } from './features/Configuration/admin-config/control-zone/control-zone.component';
import { DatasourceComponent } from './features/Configuration/admin-config/datasource/datasource.component';
import { NetworkConfigComponent } from './features/Configuration/admin-config/network-config/network-config.component';
import { ActivemqOverviewComponent } from './features/MessageQueue/activemq/activemq-overview/activemq-overview.component';
import { ActivemqBrokerComponent } from './features/MessageQueue/activemq/activemq-broker/activemq-broker.component';
import { ActivemqDestinationComponent } from './features/MessageQueue/activemq/activemq-destination/activemq-destination.component';
import { ActivemqServiceComponent } from './features/MessageQueue/activemq/activemq-service/activemq-service.component';
import { RabbitmqServiceComponent } from './features/MessageQueue/rabbitmq/rabbitmq-service/rabbitmq-service.component';
import { RabbitmqOverviewComponent } from './features/MessageQueue/rabbitmq/rabbitmq-overview/rabbitmq-overview.component';
import { RabbitmqNodeComponent } from './features/MessageQueue/rabbitmq/rabbitmq-node/rabbitmq-node.component';
import { DashboardConfigComponent } from './features/Dashboard/customDashboard/dashboard-config/dashboard-config.component';
import { DynamicDashboardComponent } from './features/Dashboard/customDashboard/dynamic-dashboard/dynamic-dashboard.component';
import { NonRelationalComponent } from './features/database/non-relational/non-relational.component';
import { MongoClusterComponent } from './features/database/non-relational/mongo-cluster/mongo-cluster.component';
import { MongoNodeComponent } from './features/database/non-relational/mongo-cluster/mongo-node/mongo-node.component';
import { OracleServiceComponent } from './features/database/relational/oracle/oracle-service/oracle-service.component';
import { OracleInstanceComponent } from './features/database/relational/oracle/oracle-instance/oracle-instance.component';
import { MssqlServiceComponent } from './features/database/relational/mssql/mssql-service/mssql-service.component';
import { MssqlInstanceComponent } from './features/database/relational/mssql/mssql-instance/mssql-instance.component';
import { MssqlComponent } from './features/database/relational/mssql/mssql.component';
import { MysqlComponent } from './features/database/relational/mysql/mysql.component';
import { MySqlServiceComponent } from './features/database/relational/mysql/mysql-service/mysql-service.component';
import { MysqlInstanceComponent } from './features/database/relational/mysql/mysql-instance/mysql-instance.component';
import { MrumMonitoringComponent } from './features/rum/mrum-monitoring/mrum-monitoring.component';
import { MrumOverviewComponent } from './features/rum/mrum-monitoring/mrum-overview/mrum-overview.component';
import { MrumVersionsComponent } from './features/rum/mrum-monitoring/mrum-versions/mrum-versions.component';
import { ScreensOverviewComponent } from './features/rum/mrum-monitoring/mrum-screens/screens-overview/screens-overview.component';
import { ScreenDetailComponent } from './features/rum/mrum-monitoring/mrum-screens/screen-detail/screen-detail.component';
import { ActionsOverviewComponent } from './features/rum/mrum-monitoring/mrum-actions/actions-overview/actions-overview.component';
import { ActionDetailComponent } from './features/rum/mrum-monitoring/mrum-actions/action-detail/action-detail.component';
import { ActionWaterfallComponent } from './features/rum/mrum-monitoring/mrum-actions/action-waterfall/action-waterfall.component';
import { MrumSessionsComponent } from './features/rum/mrum-monitoring/mrum-sessions/mrum-sessions.component';
import { ErrorsListComponent } from './features/rum/mrum-monitoring/mrum-errors-crashes/errors-list/errors-list.component';
import { MrumDependeciesComponent } from './features/rum/mrum-monitoring/mrum-dependecies/mrum-dependecies.component';
import { SessionOverviewComponent } from './features/rum/mrum-monitoring/mrum-sessions/session-overview/session-overview.component';
import { UserDetailsComponent } from './features/rum/mrum-monitoring/mrum-sessions/mrum-users/user-details/user-details.component';
import { ErrorDetailComponent } from './features/rum/mrum-monitoring/mrum-errors-crashes/error-detail/error-detail.component';
import { ClientComponent } from './features/Configuration/admin-config/client/client.component';
import { AddClientComponent } from './features/Configuration/admin-config/client/add-client/add-client.component';
import { ClientAppMappingComponent } from './features/Configuration/admin-config/client/client-app-mapping/client-app-mapping.component';
import { ResourceMappingComponent } from './features/Configuration/admin-config/resource-mapping/resource-mapping.component';
import { AuthGuard } from './utility/guards/auth.guard';
import { SrgDashboardComponent } from './features/Dashboard/srg-dashboard/srg-dashboard.component';
import { AksDashboardModule } from './features/aks-dashboard/aks-dashboard.module';
import { OrchestratorClusterComponent } from './features/database/orchestrator/orchestrator-cluster/orchestrator-cluster.component';
import { OrchestratorOverviewComponent } from './features/database/orchestrator/orchestrator-overview/orchestrator-overview.component';
import { OrchestratorServiceComponent } from './features/database/orchestrator/orchestrator-service/orchestrator-service.component';
import { AllProblemsComponent } from './features/Dashboard/all-problems/all-problems.component';
import { LicenseGenerationComponent } from './features/license-generation/license-generation.component';
import { ProxyConfigurationComponent } from './features/Configuration/admin-config/proxy-configuration/proxy-configuration.component';
import { LogRetentionArchivingComponent } from './features/Configuration/admin-config/log-retention-archiving/log-retention-archiving.component';
import { CustomDashboardPageComponent } from './features/Dashboard/customDashboard/custom-dashboard-page/custom-dashboard-page.component';
import { ProblemDetailComponent } from './features/Dashboard/all-problems/problem-detail/problem-detail.component';
import { ElasticsearchClusterComponent } from './features/database/non-relational/elasticsearch-cluster/elasticsearch-cluster.component';
import { ElasticsearchNodeComponent } from './features/database/non-relational/elasticsearch-cluster/elasticsearch-node/elasticsearch-node.component';
import { ElasticsearchIndexComponent } from './features/database/non-relational/elasticsearch-cluster/elasticsearch-index/elasticsearch-index.component';
import { CriticalFlowComponent } from './features/Configuration/admin-config/critical-flow/critical-flow.component';
import { KubernetesComponent } from './features/Infrastructure/kubernetes/kubernetes.component';
import { KubernetesClustersComponent } from './features/Infrastructure/kubernetes/kubernetes-clusters/kubernetes-clusters.component';
import { KubernetesNamespaceComponent } from './features/Infrastructure/kubernetes/kubernetes-clusters/kubernetes-namespace/kubernetes-namespace.component';
import { KubernetesWorkloadComponent } from './features/Infrastructure/kubernetes/kubernetes-clusters/kubernetes-workload/kubernetes-workload.component';
import { KubernetesNodeComponent } from './features/Infrastructure/kubernetes/kubernetes-clusters/kubernetes-node/kubernetes-node.component';
import { NamespaceDetailsComponent } from './features/Infrastructure/kubernetes/kubernetes-clusters/kubernetes-namespace/namespace-details/namespace-details.component';
import { NodeDetailsComponent } from './features/Infrastructure/kubernetes/kubernetes-clusters/kubernetes-node/node-details/node-details.component';
import { WorkloadDetailsComponent } from './features/Infrastructure/kubernetes/kubernetes-clusters/kubernetes-workload/workload-details/workload-details.component';
import { PodDetailsComponent } from './features/Infrastructure/kubernetes/kubernetes-clusters/kubernetes-node/node-details/pod-details/pod-details.component';
import { ServiceDetailsComponent } from './features/Infrastructure/kubernetes/kubernetes-clusters/kubernetes-workload/workload-details/service-details/service-details.component';

export const routes: Routes = [

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'service-page', children: [
      { path: '', component: ServicePageComponent, canActivate: [AuthGuard] },
      {
        path: 'general-service', children: [
          { path: '', component: GeneralServicesComponent, canActivate: [AuthGuard] },
          { path: 'general-instance', component: GeneralInstanceComponent, canActivate: [AuthGuard] },
          { path: 'general-endpoint', component: GeneralEndpointComponent, canActivate: [AuthGuard] }
        ]
      }
    ],
  },

  {
    path: 'srg', children: [
      { path: '', component: SrgDashboardComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'tab-panel',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/Dashboard/srg-dashboard/tab-panel/tab-panel.component').then(m => m.TabPanelComponent),
  },
  {
    path: 'sm-reports',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/Report/sm-reports/sm-reports.component').then(m => m.SmReportsComponent),
  },
  {
    path: 'html-report', children: [
      { path: '', component: HtmlReportComponent, canActivate: [AuthGuard], },
    ],
  },
  {
    path: 'softwareMetering',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/Infrastructure/software-metering/software-metering.component').then(m => m.SoftwareMeteringComponent),
  },

  {
    path: 'metering-config',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/Configuration/metering-config/metering-config.component').then(m => m.MeteringConfigComponent),
  },

  {
    path: 'infra', children: [
      { path: '', component: HostComponent, canActivate: [AuthGuard] },
      {
        path: 'linux-service', children: [
          { path: '', component: LinuxDashboardComponent, canActivate: [AuthGuard] },
          { path: 'container-dashboard', component: ContainerDashboardComponent, canActivate: [AuthGuard] }]
      },
      {
        path: 'window-service', component: WindowDashboardComponent, canActivate: [AuthGuard]
      }
    ],
  },

  {
    path: 'container0', children: [
      { path: '', component: ContainerMonitoringComponent, canActivate: [AuthGuard] },
      {
        path: 'container-status', component: ContainerStatusComponent, canActivate: [AuthGuard]
      },
      {
        path: 'container-dashboard', component: ContainerDashboardComponent, canActivate: [AuthGuard]
      },
    ],
  },

  {
    path: 'network',
    children: [
      { path: '', component: NetworkComponent, canActivate: [AuthGuard] },
      {
        path: 'network-data',
        component: NetworkDataComponent, canActivate: [AuthGuard],
        children: [
          { path: '', component: NetworkDataComponent, canActivate: [AuthGuard] },
        ]
      }
    ]
  }
  , {
    path: 'network/network-data/network-interface', children: [
      { path: '', component: NetworkInterfaceComponent, canActivate: [AuthGuard] },
    ],
  },
  {
    path: 'message-queue', children: [
      {
        path: 'kafka-service',
        children: [
          {
            path: '', component: KafkaServiceComponent, canActivate: [AuthGuard]
          },
          {
            path: 'cluster', children: [
              {
                path: '', component: KafkaServiceComponent, canActivate: [AuthGuard]
              },
              {
                path: ':clusterId', component: KafkaOverviewComponent, canActivate: [AuthGuard]
              },
              {
                path: 'broker/:brokerId', component: KafkaBrokerComponent, canActivate: [AuthGuard]
              }
            ]
          }
        ]
      },
      {
        path: 'rabbitmq-service',
        children: [
          {
            path: '', component: RabbitmqServiceComponent, canActivate: [AuthGuard]
          },
          {
            path: 'cluster', children: [
              {
                path: '', component: RabbitmqServiceComponent, canActivate: [AuthGuard]
              },
              {
                path: ':clusterId', component: RabbitmqOverviewComponent, canActivate: [AuthGuard]
              },
              {
                path: 'node/:nodeId', component: RabbitmqNodeComponent, canActivate: [AuthGuard]
              }
            ]
          }
        ]
      }
    ]
  },


  {
    path: 'mrum', children: [
      { path: '', component: MrumMonitoringComponent },
      { path: 'mrum-overview', component: MrumOverviewComponent },
      { path: 'mrum-version', component: MrumVersionsComponent },
      { path: 'screens', component: ScreensOverviewComponent },
      { path: 'screens/:screenId', component: ScreenDetailComponent },
      { path: 'actions', component: ActionsOverviewComponent },
      { path: 'actions/:actionName', component: ActionDetailComponent },
      { path: 'action-waterfall', component: ActionWaterfallComponent },
      { path: 'mrum-session', component: MrumSessionsComponent },
      { path: 'sessions-overview', component: SessionOverviewComponent },
      { path: 'users-overview', component: SessionOverviewComponent },
      { path: 'users/:userId', component: UserDetailsComponent },
      { path: 'mrum-errors-list', component: ErrorsListComponent },
      { path: 'mrum-error-crashes/:errorId', component: ErrorDetailComponent },
      { path: 'mrum-dependencies', component: MrumDependeciesComponent },
    ],
  },



  {
    path: 'nginx',
    children: [
      { path: '', component: NginxListComponent, canActivate: [AuthGuard] },
      { path: 'overview', component: NginxComponent, canActivate: [AuthGuard] },
      { path: 'instance/:entityId', component: NginxInstanceComponent, canActivate: [AuthGuard] },
      { path: 'endpoint/:entityId', component: NginxEndpointComponent, canActivate: [AuthGuard] },
    ]
  },

  {
    path: 'capacity-planner', children: [
      { path: '', component: CapacityPlannerComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'kubernetes', children: [
      { path: '', component: KubernetesComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'kubernetes-cluster', children: [
      { path: '', component: KubernetesClustersComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'kubernetes-clusters', children: [
      { path: '', component: KubernetesClustersComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'kubernetes-namespace', children: [
      { path: '', component: KubernetesNamespaceComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'kubernetes-workload', children: [
      { path: '', component: KubernetesWorkloadComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'workload-details', children: [
      { path: '', component: WorkloadDetailsComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'service-details', children: [
      { path: '', component: ServiceDetailsComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'kubernetes-node', children: [
      { path: '', component: KubernetesNodeComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'namespace-details', children: [
      { path: '', component: NamespaceDetailsComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'node-details', children: [
      { path: '', component: NodeDetailsComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'pod-details', children: [
      { path: '', component: PodDetailsComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'alert-custom', children: [
      { path: '', component: CustomAlertComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'alert-notification',
    data: { hideControlZone: true },
    children: [
      { path: '', component: AlertComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'database', children: [
      { path: '', component: MysqlComponent, canActivate: [AuthGuard] },
      { path: 'service', component: MySqlServiceComponent, canActivate: [AuthGuard] },
      { path: 'instance', component: MysqlInstanceComponent, canActivate: [AuthGuard] },


    ],
  },
  {
    path: 'database/mssql', children: [
      { path: '', component: MssqlComponent, canActivate: [AuthGuard] },
      { path: 'service', component: MssqlServiceComponent, canActivate: [AuthGuard] },
      { path: 'instance', component: MssqlInstanceComponent, canActivate: [AuthGuard] },

    ],
  },

  {
    path: 'oracle-monitoring', children: [
      { path: 'service', component: OracleServiceComponent, canActivate: [AuthGuard] },
      { path: 'instance', component: OracleInstanceComponent, canActivate: [AuthGuard] },

    ],
  },

  {
    path: 'license', children: [
      { path: '', component: LicenseComponent },
    ],
  },

  {
    path: 'aws-gateway', component: AwsApiGatewayComponent, canActivate: [AuthGuard]
  },

  {
    path: 'aws-gateway', children: [
      { path: '', component: AwsApiGatewayComponent, canActivate: [AuthGuard] },
      { path: 'aws-service', component: AwsGatewayServiceComponent, canActivate: [AuthGuard] },
      { path: 'aws-service/aws-endpoint', component: AwsGatewayEndpointComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'eks', component: EksComponent, canActivate: [AuthGuard]
  },

  {
    path: 'eks', children: [
      { path: '', component: EksComponent, canActivate: [AuthGuard] },
      {
        path: 'eks-service', children: [
          { path: '', component: EksServiceComponent, canActivate: [AuthGuard] },
          { path: 'eks-instance', component: EksInstnanceListComponent, canActivate: [AuthGuard] },
          { path: 'eks-endpoint', component: EksEndpointListComponent, canActivate: [AuthGuard] },
        ]
      },
    ],
  },

  {
    path: 'rds', children: [
      { path: '', component: RdsComponent, canActivate: [AuthGuard] },
      { path: 'rds-service', component: RdsServiceComponent, canActivate: [AuthGuard] },
    ],
  },

  {
    path: 'custom-reports',
    children: [
      { path: '', component: CustomReportComponent, canActivate: [AuthGuard] },
      { path: 'custom-report-form', component: CustomReportFormComponent, canActivate: [AuthGuard] }
    ]
  },

  {
    path: 'standard-reports',
    children: [
      { path: '', component: StandardReportsComponent, canActivate: [AuthGuard] },
    ]
  },
  {
    path: 'scheduled-reports',
    children: [
      { path: '', component: ScheduledReportsComponent, canActivate: [AuthGuard] },
    ]
  },
  {
    path: 'set-threshold',
    children: [
      { path: '', component: MetricConfigComponent, canActivate: [AuthGuard] }

    ]
  },
  {
    path: 'networkSpeed', children: [
      { path: '', component: NetworkSpeedChartComponent, canActivate: [AuthGuard] },
    ],
  },
  {
    path: 'redis',
    children: [
      { path: '', component: RedisListComponent, canActivate: [AuthGuard] },
      { path: 'details', component: RedisComponent, canActivate: [AuthGuard] },
      { path: 'instance-details', component: RedisInstanceComponent, canActivate: [AuthGuard] },
    ]
  },
  {
    path: 'activemq',
    children: [
      { path: '', component: ActivemqServiceComponent, canActivate: [AuthGuard] },
      { path: 'overview', component: ActivemqOverviewComponent, canActivate: [AuthGuard] },
      { path: 'broker', component: ActivemqBrokerComponent, canActivate: [AuthGuard] },
      { path: 'destination', component: ActivemqDestinationComponent, canActivate: [AuthGuard] }
    ]
  },

  {
    path: 'admin-config',
    component: AdminConfigComponent,
    canActivate: [AuthGuard],
    data: { hideControlZone: true },
    children: [
      { path: '', redirectTo: 'application-ip-mapping', pathMatch: 'full' },

      { path: 'user', component: UserComponent, canActivate: [AuthGuard] },
      {
        path: 'role',
        children: [
          { path: '', component: RoleComponent, canActivate: [AuthGuard], canActivateChild: [AuthGuard], },
          {
            path: 'role-management',
            loadComponent: () => import('./features/Configuration/admin-config/role/role-management/role-management.component').then(m => m.RoleManagementComponent)
          },
          {
            path: 'role-management/role-updation/:id',
            loadComponent: () => import('./features/Configuration/admin-config/role/role-updation/role-updation.component').then(m => m.RoleUpdationComponent)
          }
        ]
      },
      { path: 'features', component: FeaturesComponent },
      { path: 'interface-config', component: InterfaceConfigComponent },
      { path: 'control-zone', component: ControlZoneComponent },
      { path: 'datasource', component: DatasourceComponent },
      { path: 'network-config', component: NetworkConfigComponent },
      { path: 'application-ip-mapping', component: ApplicationIpMappingNewComponent },
      { path: 'proxy-config', component: ProxyConfigurationComponent },
      {
        path: 'client', component: ClientComponent,
        children: [
          { path: '', redirectTo: 'addclient', pathMatch: 'full' },
          { path: 'addclient', component: AddClientComponent },
          { path: 'clientappmapping', component: ClientAppMappingComponent },
        ]
      },
      { path: 'license-generation', component: LicenseGenerationComponent },
      { path: 'resource-mapping', component: ResourceMappingComponent },
      { path: 'log-retention-archiving', component: LogRetentionArchivingComponent },
      { path: 'critical-flow', component: CriticalFlowComponent, canActivate: [AuthGuard] },
      { path: 'feature-graph-mapping', loadComponent: () => import('./features/Configuration/admin-config/feature-graph-mapping/feature-graph-mapping.component').then(m => m.FeatureGraphMappingComponent) }
    ]
  },



  {
    path: 'problemPage',
    component: ProblemPageComponent, canActivate: [AuthGuard]
  },
  {
    path: 'allProblems',
    component: AllProblemsComponent, canActivate: [AuthGuard]
  },
  {
    path: 'allProblems/:pid',
    component: ProblemDetailComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'database/non-relational',
    component: NonRelationalComponent, canActivate: [AuthGuard]
  },
  {
    path: 'database/non-relational/mongoCluster',
    component: MongoClusterComponent, canActivate: [AuthGuard]
  },
  {
    path: 'database/non-relational/mongoCluster/mongoNode',
    component: MongoNodeComponent, canActivate: [AuthGuard]
  },
  {
    path: 'database/non-relational/elasticsearchCluster',
    component: ElasticsearchClusterComponent, canActivate: [AuthGuard]
  },
  {
    path: 'database/non-relational/elasticsearchCluster/elasticsearchNode',
    component: ElasticsearchNodeComponent, canActivate: [AuthGuard]
  },
  {
    path: 'database/non-relational/elasticsearchCluster/elasticsearchIndex',
    component: ElasticsearchIndexComponent, canActivate: [AuthGuard]
  },
  {
    path: 'database/orchestrator/overview',
    component: OrchestratorOverviewComponent, canActivate: [AuthGuard]
  },
  {
    path: 'database/orchestrator/service',
    component: OrchestratorServiceComponent, canActivate: [AuthGuard]
  },
  {
    path: 'database/orchestrator/cluster',
    component: OrchestratorClusterComponent, canActivate: [AuthGuard]
  },
  {
    path: 'browser', children: [
      { path: '', component: BrowserMonitoringComponent, canActivate: [AuthGuard] },
      {
        path: 'browser-service', children: [
          { path: '', component: BrowserServiceComponent, canActivate: [AuthGuard] },
          { path: 'browser-version', component: BrowserVersionComponent, canActivate: [AuthGuard] },
          { path: 'browser-page', component: BrowserPageComponent, canActivate: [AuthGuard] }
        ]
      }
    ],
  },
  {
    path: 'faqBot',
    component: FaqBotComponent, canActivate: [AuthGuard]
  },
  {
    path: 'aks',
    loadChildren: () => import('./features/aks-dashboard/aks-dashboard.module').then(m => m.AksDashboardModule), canActivate: [AuthGuard]
  },
  {
    path: 'iis-monitoring',
    component: IisMonitoringComponent, canActivate: [AuthGuard]
  },
  {
    path: 'iis-monitoring/iis-service',
    component: IisServiceComponent, canActivate: [AuthGuard]
  },
  {
    path: 'custom-dashboard',
    component: CustomDashboardPageComponent, canActivate: [AuthGuard]
  },
  {
    path: 'technical-dashboard',
    loadComponent: () =>
      import('./features/Dashboard/service-page/technical/technical.component')
        .then(m => m.TechnicalComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'application-dashboard',
    loadComponent: () =>
      import('./features/Dashboard/service-page/application-overview/application-overview.component')
        .then(m => m.ApplicationOverviewComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'dynamic-dashboard',
    component: DynamicDashboardComponent, canActivate: [AuthGuard]
  },
  // {
  //   path: 'license-generation',
  //   component: LicenseGenerationComponent, canActivate: [AuthGuard]
  // },
  { path: '**', loadComponent: () => import('./features/page-not-found/page-not-found.component').then(m => m.PageNotFoundComponent), canActivate: [AuthGuard] }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload' })],
  exports: [RouterModule,]
})
export class AppRoutingModule { }
