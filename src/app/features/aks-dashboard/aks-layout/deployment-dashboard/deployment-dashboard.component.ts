import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import { KubernetesService } from '../../../../services/kubernetes.service';
import { filter, forkJoin, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-deployment-dashboard',
    imports: [CommonModule, HighchartsChartModule, FormsModule],
    templateUrl: './deployment-dashboard.component.html',
    styleUrl: './deployment-dashboard.component.css'
})
export class DeploymentDashboardComponent implements OnInit {

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;
  selectedService!: string;
  serviceId!: string;

  Highcharts: typeof Highcharts = Highcharts;
  replicasChartOptions!: Highcharts.Options;

  /* ===== TOP METRICS ===== */
  replicasDesired = 0;
  replicasAvailable = 0;
  replicasUnavailable = 0;
  replicasUpdated = 0;

  /* ===== BACKGROUND VARS ===== */
  private hostName = '';
  private st = '202601081800';
  private et = '202601081815';

  /* ===== FILTERS ===== */
  isFilterOpen = false;
  activeDropdown: 'namespace' | 'status' | 'deployment' | null = null;

  namespaces: string[] = [];
  statuses = ['Running', 'Pending', 'Failed'];

  namespaceSearch = '';
  statusSearch = '';
  deploymentNameSearch = '';

  deploymentNames: string[] = [];

  selectedNamespaces = new Set<string>();

  selectedStatuses = new Set<string>();
  selectedDeploymentNames = new Set<string>();

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
    if (!this.isFilterOpen) {
      this.activeDropdown = null;
    }
  }

  toggleDropdown(type: 'namespace' | 'status' | 'deployment') {
    this.activeDropdown = this.activeDropdown === type ? null : type;
  }

  toggleSelection(value: string, set: Set<string>) {
    set.has(value) ? set.delete(value) : set.add(value);
  }

  filteredNamespaces() {
    return this.namespaces.filter(n =>
      n.toLowerCase().includes(this.namespaceSearch.toLowerCase())
    );
  }

  filteredStatuses() {
    return this.statuses.filter(s =>
      s.toLowerCase().includes(this.statusSearch.toLowerCase())
    );
  }

  filteredDeploymentNames() {
    return this.deploymentNames.filter(d =>
      d.toLowerCase().includes(this.deploymentNameSearch.toLowerCase())
    );
  }

  get totalSelected(): number {
    return this.selectedNamespaces.size + this.selectedStatuses.size + this.selectedDeploymentNames.size;
  }

  resetFilters() {
    this.selectedNamespaces.clear();
    this.selectedStatuses.clear();
    this.selectedDeploymentNames.clear();
    this.namespaceSearch = '';
    this.statusSearch = '';
    this.deploymentNameSearch = '';
  }

  applyFilters() {
    // console.log('Namespaces:', [...this.selectedNamespaces]);
    // console.log('Statuses:', [...this.selectedStatuses]);
    this.loadTopMetrics();
    this.loadReplicasChart();
    
    this.isFilterOpen = false;
    this.activeDropdown = null;
  }

  constructor(private k8s: KubernetesService, private dateService: DateService) { }

  ngOnInit(): void {
    this.hostName = sessionStorage.getItem('selectedNode')!;
    this.selectedService = sessionStorage.getItem('serviceIdForDeploymentDashboard')!;
    this.serviceId = sessionStorage.getItem('encodedServiceIdForDeploymentDashboard')!;
    this.dateService.setActiveComponent('DeploymentDashboardComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'DeploymentDashboardComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);




        this.fetchNamespaces();
        this.fetchDeploymentNames();
        this.loadTopMetrics();
        this.loadReplicasChart();


      });
  }

  /* ===================================================
     TOP METRICS
  =================================================== */
  private loadTopMetrics(): void {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();

    const nsParam = this.selectedNamespaces.size > 0 
      ? Array.from(this.selectedNamespaces).join(',') 
      : undefined;
    
    const dnParam = this.selectedDeploymentNames.size > 0
      ? Array.from(this.selectedDeploymentNames).join(',')
      : undefined;

    forkJoin({
      desired: this.k8s.getDeploymentReplicasDesired(this.hostName, st, et, nsParam, dnParam),
      available: this.k8s.getDeploymentReplicasAvailable(this.hostName, st, et, nsParam, dnParam),
      unavailable: this.k8s.getDeploymentReplicasUnavailable(this.hostName, st, et, nsParam, dnParam),
      updated: this.k8s.getDeploymentReplicasUpdated(this.hostName, st, et, nsParam, dnParam)
    }).subscribe(res => {
      
      const keys = Object.keys(res.desired).filter(k => k !== 'result');

      // Populate filters if this is the initial load (no filters applied yet)
      // if (this.deploymentNames.length === 0) {
      //   this.deploymentNames = [...keys];
      // }

      this.replicasDesired =
        keys.reduce((s, k) => s + (res.desired[k]?.desired_replicas ?? 0), 0);

      this.replicasAvailable =
        keys.reduce((s, k) => s + (res.available[k]?.available_replicas ?? 0), 0);

      this.replicasUnavailable =
        keys.reduce((s, k) => s + (res.unavailable[k]?.unavailable_replicas ?? 0), 0);

      this.replicasUpdated =
        keys.reduce((s, k) => s + (res.updated[k]?.updated_replicas ?? 0), 0);
    });
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  fetchNamespaces() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    
    this.k8s.getUniqueNamespaces(this.hostName, st, et).subscribe({
      next: (data) => {
        this.namespaces = data.map((item: any) => item.key).filter((n: any) => !!n);
      },
      error: (err) => {
        console.error('Error fetching namespaces:', err);
      }
    });
  }

  fetchDeploymentNames() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    
    this.k8s.getDeploymentNames(this.hostName, st, et).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.deploymentNames = data.buckets.map((item: any) => item.key).filter((n: any) => !!n);
      },
      error: (err) => {
        console.error('Error fetching deployment names:', err);
      }
    });
  }

  /* ===================================================
     MAIN CHART (STACKED)
  =================================================== */
  private loadReplicasChart(): void {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();

    const nsParam = this.selectedNamespaces.size > 0 
      ? Array.from(this.selectedNamespaces).join(',') 
      : undefined;
    
    const dnParam = this.selectedDeploymentNames.size > 0
      ? Array.from(this.selectedDeploymentNames).join(',')
      : undefined;

    this.k8s.getDeploymentReplicasSummary(this.hostName, st, et, nsParam, dnParam)
      .subscribe(res => {

        // ❌ remove summary key
        const names = Object.keys(res).filter(k => k !== 'result');

        const desired = names.map(
          n => res[n]?.desired_replicas ?? 0
        );

        const available = names.map(
          n => res[n]?.available_replicas ?? 0
        );

        const unavailable = names.map(
          n => res[n]?.unavailable_replicas ?? 0
        );

        if (names.length === 0) {
          this.replicasChartOptions = undefined as any;
          return;
        }

        this.replicasChartOptions = {
          chart: {
            type: 'column',
            height: 360
          },

          title: { text: undefined },

          xAxis: {
            categories: names,
            title: { text: 'Deployment Name' },
            labels: { style: { fontSize: '10px' } }
          },

          yAxis: {
            min: 0,
            tickInterval: 1,
            title: { text: 'Replicas' }
          },

          legend: {
            align: 'right',
            verticalAlign: 'middle',
            layout: 'vertical'
          },

          /* ================= SAME PREMIUM TOOLTIP ================= */
          tooltip: {
            shared: true,
            useHTML: true,
            outside: false,
            stickOnContact: true,
            hideDelay: 200,

            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            borderRadius: 10,
            shadow: false,

            formatter: function () {
              const ctx: any = this;

              let html = `
              <div style="
                max-height:160px;
                overflow-y:auto;
                padding:8px 10px;
                font-size:11.5px;
                font-family:Inter,system-ui,sans-serif;
                color:#0f172a;
                border-radius:10px;
                box-shadow:
                  0 8px 20px rgba(0,0,0,0.08),
                  0 2px 6px rgba(0,0,0,0.04);
              ">
                <div style="font-weight:600;margin-bottom:8px">
                  ${ctx.points[0].key}
                </div>
            `;

              ctx.points.forEach((p: any) => {
                html += `
                <div style="
                  display:flex;
                  align-items:center;
                  gap:6px;
                  margin-bottom:4px;
                ">
                  <span style="color:${p.color};font-size:12px;">●</span>
                  <span>
                    ${p.series.name} :
                    <b>${p.y}</b>
                  </span>
                </div>
              `;
              });

              return html + `</div>`;
            }
          },

          plotOptions: {
            column: {
              stacking: 'normal',   // ✅ ONE BAR, STACKED
              borderRadius: 3
            }
          },

          series: [
            {
              type: 'column',
              name: 'Desired',
              data: desired,
              color: '#60a5fa'      // blue
            },
            {
              type: 'column',
              name: 'Available',
              data: available,
              color: '#14b8a6'      // green
            },
            {
              type: 'column',
              name: 'Unavailable',
              data: unavailable,
              color: '#f87171'      // red
            }
          ],

          credits: { enabled: false }
        };
      });
  }

}
