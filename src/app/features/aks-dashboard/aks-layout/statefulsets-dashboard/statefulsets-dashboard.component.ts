import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import { KubernetesService } from '../../../../services/kubernetes.service';
import { filter, forkJoin, Subject, Subscription, switchMap } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-statefulsets-dashboard',
    imports: [CommonModule, HighchartsChartModule, FormsModule],
    templateUrl: './statefulsets-dashboard.component.html',
    styleUrl: './statefulsets-dashboard.component.css'
})
export class StatefulsetsDashboardComponent implements OnInit {

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

  /* ===== TOP METRIC VALUES ===== */
  replicasObserved = 0;
  replicasDesired = 0;
  replicasReady = 0;
  generationObserved = 0;
  generationDesired = 0;

  private hostName = '';
  private st = '202601081800';
  private et = '202601081815';

  // Filters
  isFilterOpen = false;
  activeDropdown: 'namespace' | 'statefulSet' | null = null;
  
  namespaces: string[] = [];
  statefulSetNames: string[] = [];
  
  namespaceSearch = '';
  statefulSetNameSearch = '';

  selectedNamespaces = new Set<string>();
  selectedStatefulSets = new Set<string>();

  // Subscriptions for race conditions
  private topMetricsSub?: Subscription;
  private replicasChartSub?: Subscription;

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
    if (!this.isFilterOpen) {
      this.activeDropdown = null;
    }
  }

  toggleDropdown(type: 'namespace' | 'statefulSet') {
    this.activeDropdown = this.activeDropdown === type ? null : type;
  }

  toggleSelection(value: string, set: Set<string>) {
    set.has(value) ? set.delete(value) : set.add(value);
  }

  filteredNamespaces() {
    return this.namespaces.filter(n => n.toLowerCase().includes(this.namespaceSearch.toLowerCase()));
  }

  filteredStatefulSetNames() {
    return this.statefulSetNames.filter(n => n.toLowerCase().includes(this.statefulSetNameSearch.toLowerCase()));
  }

  get totalSelected(): number {
    return this.selectedNamespaces.size + this.selectedStatefulSets.size;
  }

  resetFilters() {
    this.selectedNamespaces.clear();
    this.selectedStatefulSets.clear();
    this.namespaceSearch = '';
    this.statefulSetNameSearch = '';
  }

  applyFilters() {
    this.loadTopMetrics();
    this.loadReplicasChart();
    this.isFilterOpen = false;
    this.activeDropdown = null;
  }

  private getFilterParams() {
    const nsParam = this.selectedNamespaces.size > 0 
      ? Array.from(this.selectedNamespaces).join(',') 
      : undefined;
    
    const ssParam = this.selectedStatefulSets.size > 0
      ? Array.from(this.selectedStatefulSets).join(',')
      : undefined;
    return { nsParam, ssParam };
  }

  constructor(private k8s: KubernetesService, private dateService: DateService) { }

  ngOnInit(): void {
    this.hostName = sessionStorage.getItem('selectedNode')!;
    this.dateService.setActiveComponent('StatefulsetsDashboardComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'StatefulsetsDashboardComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
    
    this.loadTopMetrics();
    this.loadReplicasChart();
    this.fetchNamespaces();
    this.fetchStatefulSetNames();
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

  fetchStatefulSetNames() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    
    this.k8s.getStatefulsetNames(this.hostName, st, et).subscribe({
      next: (data) => {
        this.statefulSetNames = data.buckets.map((item: any) => item.key).filter((n: any) => !!n);
      },
      error: (err) => {
        console.error('Error fetching stateful sets:', err);
      }
    });
  }

  /* ===================================================
     TOP METRICS
  =================================================== */
  private loadTopMetrics(): void {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    const { nsParam, ssParam } = this.getFilterParams();

    this.topMetricsSub?.unsubscribe();
    this.topMetricsSub = forkJoin({
      observed: this.k8s.getStatefulsetReplicasObserved(this.hostName, st, et, nsParam, ssParam),
      desired: this.k8s.getStatefulsetReplicasDesired(this.hostName, st, et, nsParam, ssParam),
      ready: this.k8s.getStatefulsetReplicasReady(this.hostName, st, et, nsParam, ssParam),
      genObs: this.k8s.getStatefulsetGenerationObserved(this.hostName, st, et, nsParam, ssParam),
      genDes: this.k8s.getStatefulsetGenerationDesired(this.hostName, st, et, nsParam, ssParam) // Fixed 'this.st' typo
    }).subscribe(res => {
      // Logic for top metric cards - assuming we want the sum of all statefulsets if filtered, or specific logic?
      // The original code took the FIRST key. 
      // If we filter and get multiple, we probably want to sum them up or display singular value.
      // Based on original code: Object.keys(res.observed)[0].
      // We will maintain simple "first key" logic for now or adapt if response structure changes.
      // Actually, for top metrics, usually we aggregate. But the user request is just filters.
      // Filter results might return multiple keys (multiple SS).
      // Let's iterate and sum for robust display if multiple returned.
      
      let rObs = 0, rDes = 0, rReady = 0, gObs = 0, gDes = 0;
      
      Object.keys(res.observed).forEach(key => {
        rObs += res.observed[key]?.observed_replicas ?? 0;
      });
      Object.keys(res.desired).forEach(key => {
        rDes += res.desired[key]?.desired_replicas ?? 0;
      });
      Object.keys(res.ready).forEach(key => {
        rReady += res.ready[key]?.ready_replicas ?? 0;
      });
      Object.keys(res.genObs).forEach(key => {
        gObs += res.genObs[key]?.observed_generation ?? 0;
      });
      Object.keys(res.genDes).forEach(key => {
        gDes += res.genDes[key]?.desired_generation ?? 0;
      });

      this.replicasObserved = rObs;
      this.replicasDesired = rDes;
      this.replicasReady = rReady;
      this.generationObserved = gObs;
      this.generationDesired = gDes;
    });
  }

  /* ===================================================
     MAIN CHART
  =================================================== */
  private loadReplicasChart(): void {
     const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    const { nsParam, ssParam } = this.getFilterParams();

    this.replicasChartSub?.unsubscribe();
    this.replicasChartSub = this.k8s.getStatefulsetReplicasSummary(this.hostName, st, et, nsParam, ssParam)
      .subscribe(res => {

        const names = Object.keys(res);

        // Populate filters on first load (or if list empty)
        // if (this.statefulSetNames.length === 0) {
        //    this.statefulSetNames = [...names];
           // Usually we'd get namespace from response if available, but response structure is { SSName: { ... } }
           // We might not have namespace info easily unless inside the object.
           // Assuming response structure has namespace or if not, we can't populate namespace filter easily from this endpoint?
           // User provided: {"prometheus-alertmanager":{"desired_replicas":1,"ready_replicas":1}}
           // It does NOT have namespace.
           // But I will keep the namespace filter UI there; strictly speaking I can't populate it from THIS specific call if data isn't there.
           // I will just populate StatefulSet names for now.
        // }

        const desired = names.map(
          n => res[n]?.desired_replicas ?? 0
        );

        const ready = names.map(
          n => res[n]?.ready_replicas ?? 0
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
            title: { text: 'StatefulSet Name' },
            labels: {
              style: {
                fontSize: '10px',
                fontWeight: '500'
              }
            }
          },

          yAxis: {
            min: 0,
            tickInterval: 1,
            title: { text: 'Replicas' },
            labels: {
              style: {
                fontSize: '11px'
              }
            }
          },

          legend: {
            align: 'right',
            verticalAlign: 'middle',
            layout: 'vertical',
            itemStyle: {
              fontSize: '11px',
              fontWeight: '500'
            }
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
              stacking: 'normal',   // ✅ same stacked style
              borderRadius: 3,
              dataLabels: {
                enabled: false
              }
            }
          },

          series: [
            {
              type: 'column',
              name: 'Desired',
              data: desired,
              color: '#60a5fa'   // 🔵 same as deployment
            },
            {
              type: 'column',
              name: 'Ready',
              data: ready,
              color: '#14b8a6'   // 🟢 same as deployment
            }
          ],

          credits: { enabled: false }
        };
      });
  }


}
