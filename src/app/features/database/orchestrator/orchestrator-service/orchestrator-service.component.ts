import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../../../services/database-api.service';
import { ServiceResponse } from '../../../../models/common/ServiceResponse';
import { ServiceStatus } from '../../../../models/enums/ServiceStatus';
import { HotToastService } from '@ngxpert/hot-toast';
import { Subject, takeUntil } from 'rxjs';

export interface OrchestratorService {
  id: number;
  name: string;
  baseUrl: string;
  environment: string;
  region: string;
}

@Component({
  selector: 'app-orchestrator-service',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orchestrator-service.component.html',
  styleUrl: './orchestrator-service.component.css'
})
export class OrchestratorServiceComponent {

  searchQuery = '';

  services: OrchestratorService[] = [];
  private destroy$ = new Subject<void>();

  constructor(private router: Router, private databaseService: DatabaseService, private toast: HotToastService) { }

  ngOnInit() {
    this.clearSessionStorage();
    this.services = [];
    this.getOrchestratorServices();
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getOrchestratorServices() {
    this.databaseService.getOrchestratorServices()
      .pipe(takeUntil(this.destroy$)).subscribe((response: ServiceResponse<any>) => {
        if (response.serviceStatus === ServiceStatus.SUCCESS) {
          this.services = response.serviceResponse?.content as OrchestratorService[] || [];
        } else {
          this.toast.error('Failed to fetch orchestrator services');
        }
      }, error => {
        this.toast.error(error?.error?.serviceError || 'An error occurred while fetching orchestrator services');
      });
  }

  get filteredServices() {
    const query = (this.searchQuery || '').toLowerCase().trim();

    if (!query) return this.services;

    return this.services.filter(s => {
      return (
        s.name?.toLowerCase().includes(query) ||
        s.environment?.toLowerCase().includes(query) ||
        s.region?.toLowerCase().includes(query) ||
        s.baseUrl?.toLowerCase().includes(query)
      );
    });
  }

  clearSessionStorage() {
    sessionStorage.removeItem('orchestrator');
  }

  goToOverview(service: OrchestratorService) {
    sessionStorage.setItem('orchestrator', JSON.stringify(service));
    this.router.navigate(['/database/orchestrator/overview']);
  }
}