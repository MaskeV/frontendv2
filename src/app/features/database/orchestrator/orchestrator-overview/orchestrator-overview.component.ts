import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { DatabaseService } from '../../../../services/database-api.service';
import { Subject } from 'rxjs';
import { OrchestratorService } from '../orchestrator-service/orchestrator-service.component';
import { HotToastService } from '@ngxpert/hot-toast';
import { ServiceResponse } from '../../../../models/common/ServiceResponse';
import { ServiceStatus } from '../../../../models/enums/ServiceStatus';
import { Route, Router, RouterModule } from '@angular/router';
import { error } from 'console';

export interface Cluster {
  ClusterName: string;
  ClusterAlias: string;
  ClusterDomain: string;
  CountInstances: number;
  HeuristicLag: number;
  HasAutomatedMasterRecovery: boolean;
  HasAutomatedIntermediateMasterRecovery: boolean;
}

@Component({
  selector: 'app-orchestrator-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './orchestrator-overview.component.html',
  styleUrls: ['./orchestrator-overview.component.css']
})
export class OrchestratorOverviewComponent {

  searchTerm = '';
  clusters: Cluster[] = [];
  orchestrator: OrchestratorService | null = null;
  private destroy$ = new Subject<void>();

  constructor(private router: Router, private databaseService: DatabaseService, private toast: HotToastService) { }

  ngOnInit() {
    this.clusters = [];
    this.clearSessionStorage();
    try {
      const raw = sessionStorage.getItem('orchestrator');
      this.orchestrator = raw ? JSON.parse(raw) : null;
      if (!this.orchestrator) {
        this.toast.error('No orchestrator selected');
        this.router.navigate(['/database/orchestrator/service']);
        return;
      }
      this.getClusters();
    } catch (e) {
      this.orchestrator = null;
      console.error('Invalid session data', e);
    }
  }

  getClusters() {
    if (!this.orchestrator) {
      this.toast.error('Failed to fetch orchestrator details');
      return;
    }
    this.databaseService.getOrchestratorClusters(this.orchestrator.id).subscribe((response: ServiceResponse<Cluster[]>) => {
      if (response.serviceStatus === ServiceStatus.SUCCESS) {
        this.clusters = response.serviceResponse || [];
      } else {
        this.toast.error(response.serviceError || 'Failed to fetch clusters');
      }
    }, error => {
      console.error('API error', error);
      this.toast.error( error?.error?.serviceError || 'Failed to fetch clusters');
    });
  }

  ngonDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  get totalInstances() {
    return this.clusters.reduce((sum, c) => sum + c.CountInstances, 0);
  }

  getRecoveryClass(c: any): string {
    if (c.HasAutomatedMasterRecovery && c.HasAutomatedIntermediateMasterRecovery) return 'green';
    if (c.HasAutomatedMasterRecovery) return 'yellow';
    return 'red';
  }

  getRecoveryText(c: any): string {
    if (c.HasAutomatedMasterRecovery && c.HasAutomatedIntermediateMasterRecovery) return 'Full Auto';
    if (c.HasAutomatedMasterRecovery) return 'Partial Auto';
    return 'Manual';
  }

  get filteredClusters() {
    const query = (this.searchTerm || '').toLowerCase().trim();

    if (!query) return this.clusters;

    return this.clusters.filter(c =>
      c.ClusterName?.toLowerCase().includes(query) ||
      c.ClusterAlias?.toLowerCase().includes(query) ||
      c.ClusterDomain?.toLowerCase().includes(query) ||
      c.CountInstances?.toString().includes(query)
    );
  }

  clearSessionStorage() {
    sessionStorage.removeItem('orchestrator-cluster');
  }

  goToCluster(cluster: Cluster) {
    sessionStorage.setItem('orchestrator-cluster', JSON.stringify(cluster));
    this.router.navigate(['/database/orchestrator/cluster']);
  }

}