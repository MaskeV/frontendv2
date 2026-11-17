import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import { KubernetesService } from '../../../../services/kubernetes.service';
import { filter, forkJoin, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-daemonsets-dashboard',
    imports: [CommonModule, HighchartsChartModule, FormsModule],
    templateUrl: './daemonsets-dashboard.component.html',
    styleUrl: './daemonsets-dashboard.component.css'
})
export class DaemonsetsDashboardComponent implements OnInit {

  Highcharts: typeof Highcharts = Highcharts;
  replicasChartOptions!: Highcharts.Options;

  /* ===== TOP METRICS ===== */
  replicasDesired = 0;
  replicasAvailable = 0;
  replicasUnavailable = 0;
  replicasReady = 0;

  /* ===== FILTERS ===== */
  isFilterOpen = false;
  activeDropdown: 'namespace' | 'daemonset' | null = null;

  namespaces: string[] = [];
  
  daemonSetNames: string[] = [];

  namespaceSearch = '';
  daemonSetNameSearch = '';

  selectedNamespaces = new Set<string>();
  selectedDaemonSetNames = new Set<string>();

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
    if (!this.isFilterOpen) {
      this.activeDropdown = null;
    }
  }

  toggleDropdown(type: 'namespace' | 'daemonset') {
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

  filteredDaemonSetNames() {
    return this.daemonSetNames.filter(d =>
      d.toLowerCase().includes(this.daemonSetNameSearch.toLowerCase())
    );
  }

  get totalSelected(): number {
    return this.selectedNamespaces.size + this.selectedDaemonSetNames.size;
  }

  resetFilters() {
    this.selectedNamespaces.clear();
    this.selectedDaemonSetNames.clear();
    this.namespaceSearch = '';
    this.daemonSetNameSearch = '';
  }

  applyFilters() {
    this.loadTopMetrics();
    this.loadReplicasChart();
    this.isFilterOpen = false;
    this.activeDropdown = null;
  }

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;
  selectedService!: string;
  serviceId!: string;

  private hostName = '';
  private st = '202601081800';
  private et = '202601081815';

  constructor(private k8s: KubernetesService, private dateService: DateService) { }

  ngOnInit(): void {
    this.hostName = sessionStorage.getItem('selectedNode')!;
    this.selectedService = sessionStorage.getItem('serviceIdForDaemonsetsDashboard')!;
    this.serviceId = sessionStorage.getItem('encodedServiceIdForDaemonsetsDashboard')!;
    this.dateService.setActiveComponent('DaemonsetsDashboardComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'DaemonsetsDashboardComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);




        this.fetchNamespaces();
        this.fetchDaemonSetsNames();
        //console.log("this.namespaces", this.namespaces);
        //console.log("this.daemonSetNames", this.daemonSetNames);
        this.loadTopMetrics();
        this.loadReplicasChart();


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

  fetchDaemonSetsNames(){
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    
    this.k8s.getDaemonSetsNames(this.hostName, st, et).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        if (data && data.buckets) {
             this.daemonSetNames = data.buckets.map((item: any) => item.key).filter((n: any) => !!n);
          } else {
             this.daemonSetNames = [];
          }
      },
      error: (err) => {
        console.error('Error fetching daemonset names:', err);
      }
    });
  }

  /* ===================================================
     TOP METRICS (SAME AS DEPLOYMENT)
  =================================================== */
  private loadTopMetrics(): void {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();

    const nsParam = this.selectedNamespaces.size > 0 
      ? Array.from(this.selectedNamespaces).join(',') 
      : undefined;
    
    const dsParam = this.selectedDaemonSetNames.size > 0
      ? Array.from(this.selectedDaemonSetNames).join(',')
      : undefined;

    forkJoin({
      desired: this.k8s.getDaemonSetReplicasDesired(this.hostName, st, et, nsParam, dsParam),
      available: this.k8s.getDaemonSetReplicasAvailable(this.hostName, st, et, nsParam, dsParam),
      unavailable: this.k8s.getDaemonSetReplicasUnavailable(this.hostName, st, et, nsParam, dsParam),
      ready: this.k8s.getDaemonSetReplicasReady(this.hostName, st, et, nsParam, dsParam)
    }).subscribe(res => {
      
      const keys = Object.keys(res.desired);

      // Populate filters on initial load
      // if (this.daemonSetNames.length === 0) {
      //   this.daemonSetNames = [...keys];
      // }

      this.replicasDesired =
        keys.reduce((s, k) => s + (res.desired[k]?.desired_replicas ?? 0), 0);

      this.replicasAvailable =
        keys.reduce((s, k) => s + (res.available[k]?.available_replicas ?? 0), 0);

      this.replicasUnavailable =
        keys.reduce((s, k) => s + (res.unavailable[k]?.unavailable_replicas ?? 0), 0);

      this.replicasReady =
        keys.reduce((s, k) => s + (res.ready[k]?.ready_replicas ?? 0), 0);
    });
  }

  /* ===================================================
     MAIN CHART (STACKED – SUMMARY)
  =================================================== */
  private loadReplicasChart(): void {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();

    const nsParam = this.selectedNamespaces.size > 0 
      ? Array.from(this.selectedNamespaces).join(',') 
      : undefined;
    
    const dsParam = this.selectedDaemonSetNames.size > 0
      ? Array.from(this.selectedDaemonSetNames).join(',')
      : undefined;

    this.k8s.getDaemonSetReplicasSummary(this.hostName, st, et, nsParam, dsParam)
      .subscribe(res => {

        const names = Object.keys(res).filter(name => {
          const d = res[name];
          return (
            (d?.desired_replicas ?? 0) +
            (d?.available_replicas ?? 0) +
            (d?.unavailable_replicas ?? 0)
          ) > 0;
        });

        const desired = names.map(n => res[n].desired_replicas ?? 0);
        const available = names.map(n => res[n].available_replicas ?? 0);
        const unavailable = names.map(n => res[n].unavailable_replicas ?? 0);

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
            title: { text: 'DaemonSet Name' },
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
              stacking: 'normal',
              borderRadius: 3
            }
          },

          series: [
            {
              type: 'column',
              name: 'Desired',
              data: desired,
              color: '#60a5fa'
            },
            {
              type: 'column',
              name: 'Available',
              data: available,
              color: '#14b8a6'
            },
            {
              type: 'column',
              name: 'Unavailable',
              data: unavailable,
              color: '#f87171'
            }
          ],

          credits: { enabled: false }
        };
      });
  }
}
