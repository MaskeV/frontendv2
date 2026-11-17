import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService } from '../../../../services/database-api.service';
import { HotToastService } from '@ngxpert/hot-toast';
import { MatIcon } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { DateService } from '../../../../services/date.service';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { OrchestratorService } from '../orchestrator-service/orchestrator-service.component';
import { Cluster } from '../orchestrator-overview/orchestrator-overview.component';
import { Router } from '@angular/router';
import { ServiceStatus } from '../../../../models/enums/ServiceStatus';
import { error } from 'jquery';

interface InstanceKey {
  Hostname: string;
  Port: number;
}

interface BinlogCoordinates {
  LogFile: string;
  LogPos: number;
  Type: number;
}

interface NullableInt64 {
  Int64: number;
  Valid: boolean;
}

interface MySQLInstance {
  Key: InstanceKey;
  InstanceAlias: string;
  Uptime: number;
  ServerID: number;
  ServerUUID: string;
  Version: string;
  VersionComment: string;
  FlavorName: string;
  ReadOnly: boolean;
  Binlog_format: string;
  BinlogRowImage: string;
  LogBinEnabled: boolean;
  LogSlaveUpdatesEnabled: boolean;
  LogReplicationUpdatesEnabled: boolean;
  SelfBinlogCoordinates: BinlogCoordinates;
  MasterKey: InstanceKey;
  MasterUUID: string;
  AncestryUUID: string;
  IsDetachedMaster: boolean;
  Slave_SQL_Running: boolean;
  ReplicationSQLThreadRuning: boolean;
  Slave_IO_Running: boolean;
  ReplicationIOThreadRuning: boolean;
  ReplicationSQLThreadState: number;
  ReplicationIOThreadState: number;
  HasReplicationFilters: boolean;
  GTIDMode: string;
  SupportsOracleGTID: boolean;
  UsingOracleGTID: boolean;
  UsingMariaDBGTID: boolean;
  UsingPseudoGTID: boolean;
  ReadBinlogCoordinates: BinlogCoordinates;
  ExecBinlogCoordinates: BinlogCoordinates;
  IsDetached: boolean;
  LastSQLError: string;
  LastIOError: string;
  SecondsBehindMaster: NullableInt64;
  SQLDelay: number;
  ExecutedGtidSet: string;
  GtidErrant: string;
  SlaveLagSeconds: NullableInt64;
  ReplicationLagSeconds: NullableInt64;
  SlaveHosts: InstanceKey[];
  Replicas: InstanceKey[];
  ClusterName: string;
  SuggestedClusterAlias: string;
  DataCenter: string;
  Region: string;
  ReplicationDepth: number;
  IsCoMaster: boolean;
  HasReplicationCredentials: boolean;
  SemiSyncEnforced: boolean;
  SemiSyncMasterEnabled: boolean;
  SemiSyncReplicaEnabled: boolean;
  SemiSyncMasterStatus: boolean;
  SemiSyncMasterClients: number;
  SemiSyncReplicaStatus: boolean;
  LastSeenTimestamp: string;
  IsLastCheckValid: boolean;
  IsUpToDate: boolean;
  IsRecentlyChecked: boolean;
  SecondsSinceLastSeen: NullableInt64;
  IsCandidate: boolean;
  PromotionRule: string;
  IsDowntimed: boolean;
  DowntimeReason: string;
  DowntimeOwner: string;
  DowntimeEndTimestamp: string,
  ElapsedDowntime: number,
  Problems: string[];
  AllowTLS: boolean;
  LastDiscoveryLatency: number;
}

interface ServiceResponse {
  serviceResponse: MySQLInstance[];
  serviceStatus: string;
  serviceError: string;
}

interface ClusterNode {
  instance: MySQLInstance;
  isMaster: boolean;
  replicas: MySQLInstance[];
}

interface DowntimeForm {
  owner: string,
  reason: string,
  duration: string
};

@Component({
  selector: 'app-orchestrator',
  standalone: true,
  imports: [CommonModule, MatIcon, FormsModule],
  templateUrl: './orchestrator-cluster.component.html',
  styleUrl: './orchestrator-cluster.component.css'
})
export class OrchestratorClusterComponent implements OnInit {

  orchestrator: string = 'netraa-lh-cluster';
  // orchestrator: string = 'local_cluster';
  orId: number = 2;
  // orId: number = 1;

  orchestratorService: OrchestratorService | null = null;
  cluster: Cluster | null = null;


  instances: MySQLInstance[] = [];
  masterNode: MySQLInstance | null = null;
  replicaNodes: MySQLInstance[] = [];
  selectedInstance: MySQLInstance | null = null;
  isLoading = true;
  serviceStatus = '';
  clusterAlias = '';

  private destroy$ = new Subject<void>();
  private datesubscription: Subscription = new Subscription();

  downtimeForm: DowntimeForm = {
    owner: '',
    reason: '',
    duration: '10m'
  };

  constructor(
    private router: Router,
    private databaseService: DatabaseService,
    private toast: HotToastService,
    private dateService: DateService
  ) {
  }

  ngOnInit(): void {
    try {
      const rawOrchestrator = sessionStorage.getItem('orchestrator');
      this.orchestratorService = rawOrchestrator ? JSON.parse(rawOrchestrator) : null;
      const rawCluster = sessionStorage.getItem('orchestrator-cluster');
      this.cluster = rawCluster ? JSON.parse(rawCluster) : null;
      if (!this.orchestratorService || !this.cluster) {
        this.toast.error('Missing orchestrator or cluster details');
        this.router.navigate(['/database/orchestrator/overview']);
        return;
      }
    } catch (e) {
      this.orchestratorService = null;
      this.cluster = null;
      console.error('Invalid session data', e);
    }
    this.dateService.setActiveComponent('OrchestratorComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'OrchestratorComponent'),
      switchMap(() => this.dateService.date$)).subscribe((dates: any) => {
        this.refresh();
      });
  }

  ngOnDestroy(): void {
    this.datesubscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack() {
    this.router.navigate(['/database/orchestrator/overview']);
  }

  resetDowntimeForm() {
    this.downtimeForm = {
      owner: '',
      reason: '',
      duration: '10m'
    };
  }

  isDowntimeFormValid(): boolean {
    return !!(
      this.downtimeForm.owner?.trim() &&
      this.downtimeForm.reason?.trim() &&
      this.downtimeForm.duration
    );
  }

  endDowntime(instance: MySQLInstance) {
    const metaData = {
      "host": instance.Key.Hostname,
      "port": instance.Key.Port
    }

    this.databaseService.endDowntime(this.orchestratorService?.id!, metaData)
      .pipe(takeUntil(this.destroy$)).subscribe(() => {
        console.log('Downtime ended');
        this.refresh();
      }, error => {
        console.error('Failed to end downtime', error);
      });
  }

  startDowntime(instance: MySQLInstance) {
    if (!this.isDowntimeFormValid()) {
      this.toast.error('Please fill all downtime details');
      return;
    }
    const metaData = {
      "host": instance.Key.Hostname,
      "port": instance.Key.Port,
      "owner": this.downtimeForm.owner,
      "reason": this.downtimeForm.reason,
      "downTime": this.downtimeForm.duration
    }

    this.databaseService.beginDowntime(this.orchestratorService?.id!, metaData)
      .pipe(takeUntil(this.destroy$)).subscribe(() => {
        console.log('Downtime started');
        this.refresh();
      }, error => {
        console.error('Failed to start downtime', error);
      });
  }

  startReplication(selectedInstance: MySQLInstance): void {
    const metaData = { "host": selectedInstance.Key.Hostname, "port": selectedInstance.Key.Port }
    this.databaseService.startReplication(this.orchestratorService?.id!, metaData)
      .pipe(takeUntil(this.destroy$)).subscribe(res => {
        console.log('Replication started', res);
        this.refresh();
      });
  }

  loadClusterDetails(): void {
    this.isLoading = true;
    this.databaseService.getClusterDetails(this.orchestratorService?.id!, this.cluster?.ClusterName!)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (response: ServiceResponse) => {
          this.isLoading = false;
          this.serviceStatus = response.serviceStatus;
          this.instances = response.serviceResponse;
          this.parseTopology();
          if (this.selectedInstance?.ServerUUID) {
            const serverUUID = this.selectedInstance.ServerUUID;

            this.selectedInstance = this.instances.find(
              instance => instance.ServerUUID === serverUUID
            ) || null;
          }
        },
        error: (err: any) => {
          this.isLoading = false;
          this.toast.error('Failed to load cluster details');
          console.error(err);
        }
      });
  }

  parseTopology(): void {
    // Master = ReplicationDepth 0, replicas = depth 1+
    this.masterNode = this.instances.find(i => i.ReplicationDepth === 0) ?? null;
    this.replicaNodes = this.instances.filter(i => i.ReplicationDepth > 0);
    this.clusterAlias = this.instances[0]?.SuggestedClusterAlias ?? this.cluster?.ClusterAlias ?? this.cluster?.ClusterName ?? '';
  }

  selectInstance(instance: MySQLInstance): void {
    this.selectedInstance = instance;
    this.resetDowntimeForm();
  }

  selectedReplicaToPromote: any = null;

  promoteReplica() {
    if (!this.selectedReplicaToPromote) return;

    const host = this.selectedReplicaToPromote.Key.Hostname;
    const port = this.selectedReplicaToPromote.Key.Port;

    const confirmAction = confirm(
      `Promote ${host}:${port} to PRIMARY?\nThis will trigger failover.`
    );

    if (!confirmAction) return;
    const metaData = {
      "name": this.cluster?.ClusterAlias || this.cluster?.ClusterName,
      "designatedHost": host,
      "designatedPort": port
    }
    this.databaseService.promoteMaster(this.orchestratorService?.id!, metaData)
      .pipe(takeUntil(this.destroy$)).subscribe(res => {
        if(res.serviceStatus === ServiceStatus.SUCCESS) {
          this.toast.success(`Promotion initiated for ${host}:${port}`);
        } else {          
          this.toast.error(`Failed to promote replica: ${res.serviceError}`);
        }
        this.refresh();
      }, error => {        
        console.error('Promotion failed', error);
        this.toast.error('Failed to promote replica');
        this.refresh();
      });
  }

  closeDetail(): void {
    this.selectedInstance = null;
  }

  getNodeLabel(instance: MySQLInstance): string {
    return `${instance.Key.Hostname}:${instance.Key.Port}`;
  }

  getNodeSubtitle(instance: MySQLInstance): string {
    return `${instance.Version} ${instance.Binlog_format}/${instance.BinlogRowImage}, ${instance.FlavorName}`;
  }

  getLagDisplay(instance: MySQLInstance): string {
    if (!instance.SlaveLagSeconds.Valid) return '0s lag';
    return `${instance.SlaveLagSeconds.Int64}s lag`;
  }

  isReplicating(instance: MySQLInstance): boolean {
    return instance.Slave_IO_Running && instance.Slave_SQL_Running;
  }

  getHealthStatus(instance: MySQLInstance): 'healthy' | 'warning' | 'error' {
    if (!instance.IsLastCheckValid) return 'error';
    if (instance.Problems.length > 0) return 'warning';
    if (instance.ReplicationDepth > 0 && !this.isReplicating(instance)) return 'error';
    return 'healthy';
  }

  getUptimeDisplay(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  getLatencyDisplay(ns: number): string {
    if (ns < 1000) return `${ns}ns`;
    if (ns < 1_000_000) return `${(ns / 1000).toFixed(1)}µs`;
    return `${(ns / 1_000_000).toFixed(1)}ms`;
  }

  refresh(): void {
    this.selectedReplicaToPromote = null;
    this.resetDowntimeForm();
    this.loadClusterDetails();
    // this.toast.success('Refreshing cluster data...');
  }
}