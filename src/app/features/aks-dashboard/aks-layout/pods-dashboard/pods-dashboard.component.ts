import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import { KubernetesService } from '../../../../services/kubernetes.service';
import { filter, forkJoin, Subject, Subscription, switchMap } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-pods-dashboard',
    imports: [CommonModule, HighchartsChartModule, FormsModule],
    templateUrl: './pods-dashboard.component.html',
    styleUrl: './pods-dashboard.component.css'
})
export class PodsDashboardComponent implements OnInit {
  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;
  selectedService!: string;
  serviceId!: string;

  Highcharts: typeof Highcharts = Highcharts;

  cpuChartOptions: Highcharts.Options | null = null;
  memoryChartOptions: Highcharts.Options | null = null;
  cpuLimitChartOptions: Highcharts.Options | null = null;
  memoryLimitChartOptions: Highcharts.Options | null = null;
  memoryWorkingSetLimitChartOptions: Highcharts.Options | null = null;
  networkTxChartOptions: Highcharts.Options | null = null;
  networkRxChartOptions: Highcharts.Options | null = null;

  // Subscriptions for race condition handling
  private statusSub?: Subscription;
  private cpuSub?: Subscription;
  private memorySub?: Subscription;
  private cpuLimitSub?: Subscription;
  private memoryLimitSub?: Subscription;
  private memoryWorkingSub?: Subscription;
  private netTxSub?: Subscription;
  private netRxSub?: Subscription;

  podStatusList: any[] = [];
  paginatedPodStatusList: any[] = [];
  currentPage = 1;
  pageSize = 6;
  totalPages = 0;


  /* ===== FILTERS ===== */
  isFilterOpen = false;
  activeDropdown: 'namespace' | 'pod' | null = null;
  
  namespaces: string[] = [];
  podNames: string[] = [];

  namespaceSearch = '';
  podNameSearch = '';

  selectedNamespaces = new Set<string>();
  selectedPodNames = new Set<string>();

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
    if (!this.isFilterOpen) {
      this.activeDropdown = null;
    }
  }

  toggleDropdown(type: 'namespace' | 'pod') {
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

  filteredPodNames() {
    return this.podNames.filter(p =>
      p.toLowerCase().includes(this.podNameSearch.toLowerCase())
    );
  }

  get totalSelected(): number {
    return this.selectedNamespaces.size + this.selectedPodNames.size;
  }

  resetFilters() {
    this.selectedNamespaces.clear();
    this.selectedPodNames.clear();
    this.namespaceSearch = '';
    this.podNameSearch = '';
  }

  applyFilters() {
    this.loadPodStatus();
    this.loadAllMetrics();
    this.isFilterOpen = false;
    this.activeDropdown = null;
  }

  private loadAllMetrics() {
    this.loadPodCpuMetrics();
    this.loadPodMemoryMetrics();
    this.loadPodCpuLimitMetrics();
    this.loadPodMemoryLimitMetrics();
    this.loadPodMemoryWorkingSetLimitMetrics();
    this.loadPodNetworkTxMetrics();
    this.loadPodNetworkRxMetrics();
  }

  private getFilterParams() {
    const nsParam = this.selectedNamespaces.size > 0 
      ? Array.from(this.selectedNamespaces).join(',') 
      : undefined;
    
    const podParam = this.selectedPodNames.size > 0
      ? Array.from(this.selectedPodNames).join(',')
      : undefined;
    return { nsParam, podParam };
  }
  // Hardcoded for now as per user request example
  // st = '202601081800';
  // et = '202601081815';
  hostName = '';

  constructor(private k8sService: KubernetesService, private dateService: DateService) { }

  ngOnInit(): void {
    this.hostName = sessionStorage.getItem('selectedNode')!;
    this.selectedService = sessionStorage.getItem('serviceIdForPodsDashboard')!;
    this.serviceId = sessionStorage.getItem('encodedServiceIdForPodsDashboard')!;
    this.dateService.setActiveComponent('PodsDashboardComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'PodsDashboardComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);



        this.fetchNamespaces();
        this.loadPodCpuMetrics();
        this.loadPodMemoryMetrics();
        this.loadPodMemoryMetrics();
        this.loadPodCpuLimitMetrics();
        this.loadPodMemoryLimitMetrics();
        this.loadPodMemoryWorkingSetLimitMetrics();
        this.loadPodNetworkTxMetrics();
        this.loadPodNetworkRxMetrics();
        this.loadPodStatus();


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
    
    this.k8sService.getUniqueNamespaces(this.hostName, st, et).subscribe({
      next: (data) => {
        this.namespaces = data.map((item: any) => item.key).filter((n: any) => !!n);
      },
      error: (err) => {
        console.error('Error fetching namespaces:', err);
      }
    });
  }

  loadPodStatus(): void {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    
    // Note: status also needs filtering if backend supports it, assuming yes as per plan
    const { nsParam, podParam } = this.getFilterParams();

    this.statusSub?.unsubscribe();
    this.statusSub = this.k8sService.getPodStatus(st, et, this.hostName, nsParam, podParam).subscribe({
      next: (res) => {
        this.podStatusList = res || [];
        
        // Populate pod names for filter if empty (initial load)
        if (this.podNames.length === 0) {
          const names = this.podStatusList.map((p: any) => p.pod_name).filter(n => !!n);
          // Unique names just in case
          this.podNames = [...new Set(names)];
        }

        this.totalPages = Math.ceil(this.podStatusList.length / this.pageSize);
        this.updatePaginatedList();
      },
      error: (err) => console.error('Error loading pod status:', err)
    });
  }

  updatePaginatedList(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedPodStatusList = this.podStatusList.slice(startIndex, endIndex);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedList();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedList();
    }
  }

  loadPodCpuMetrics(): void {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    const { nsParam, podParam } = this.getFilterParams();

    this.cpuSub?.unsubscribe();
    this.cpuSub = this.k8sService.getPodCpuMetrics(st, et, this.hostName, nsParam, podParam).subscribe({
      next: (res) => {
        this.cpuChartOptions = this.createChartOptions('CPU Usage', 'CPU Usage', res, 'cpu_usage');
      },
      error: (err) => console.error('Error loading pod CPU metrics:', err)
    });
  }

  loadPodMemoryMetrics(): void {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    const { nsParam, podParam } = this.getFilterParams();

    this.memorySub?.unsubscribe();
    this.memorySub = this.k8sService.getPodMemoryMetrics(st, et, this.hostName, nsParam, podParam).subscribe({
      next: (res) => {
        this.memoryChartOptions = this.createChartOptions('Memory Usage', 'Memory Usage (Gi)', res, 'memory_usage');
      },
      error: (err) => console.error('Error loading pod Memory metrics:', err)
    });
  }

  loadPodCpuLimitMetrics(): void {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    const { nsParam, podParam } = this.getFilterParams();

    this.cpuLimitSub?.unsubscribe();
    this.cpuLimitSub = this.k8sService.getPodCpuLimitMetrics(st, et, this.hostName, nsParam, podParam).subscribe({
      next: (res) => {
        this.cpuLimitChartOptions = this.createChartOptions('CPU Limit Usage', 'CPU Limit Usage', res, 'cpu_limit_usage');
      },
      error: (err) => console.error('Error loading pod CPU Limit metrics:', err)
    });
  }

  loadPodMemoryLimitMetrics(): void {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    const { nsParam, podParam } = this.getFilterParams();

    this.memoryLimitSub?.unsubscribe();
    this.memoryLimitSub = this.k8sService.getPodMemoryLimitMetrics(st, et, this.hostName, nsParam, podParam).subscribe({
      next: (res) => {
        this.memoryLimitChartOptions = this.createChartOptions('Memory Limit Usage', 'Memory Limit Usage (Gi)', res, 'memory_limit_usage');
      },
      error: (err) => console.error('Error loading pod Memory Limit metrics:', err)
    });
  }

  loadPodMemoryWorkingSetLimitMetrics(): void {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    const { nsParam, podParam } = this.getFilterParams();

    this.memoryWorkingSub?.unsubscribe();
    this.memoryWorkingSub = this.k8sService.getPodMemoryWorkingSetLimitMetrics(st, et, this.hostName, nsParam, podParam).subscribe({
      next: (res) => {
        this.memoryWorkingSetLimitChartOptions = this.createChartOptions('Memory Working Set Limit', 'Usage', res, 'memory_working_set_limit_usage');
      },
      error: (err) => console.error('Error loading pod Memory Working Set Limit metrics:', err)
    });
  }

  loadPodNetworkTxMetrics(): void {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    const { nsParam, podParam } = this.getFilterParams();

    this.netTxSub?.unsubscribe();
    this.netTxSub = this.k8sService.getPodNetworkTxMetrics(st, et, this.hostName, nsParam, podParam).subscribe({
      next: (res) => {
        this.networkTxChartOptions = this.createChartOptions('Network TX', 'Network TX (GB)', res, 'network_tx_bytes', true);
      },
      error: (err) => console.error('Error loading pod Network TX metrics:', err)
    });
  }

  loadPodNetworkRxMetrics(): void {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    const { nsParam, podParam } = this.getFilterParams();

    this.netRxSub?.unsubscribe();
    this.netRxSub = this.k8sService.getPodNetworkRxMetrics(st, et, this.hostName, nsParam, podParam).subscribe({
      next: (res) => {
        this.networkRxChartOptions = this.createChartOptions('Network RX', 'Network RX (GB)', res, 'network_rx_bytes', true);
      },
      error: (err) => console.error('Error loading pod Network RX metrics:', err)
    });
  }

  private createChartOptions(title: string, yAxisTitle: string, res: any, valueKey: string, convertToGB: boolean = false): Highcharts.Options | null {
    if (!res) return null;

    const seriesData: Highcharts.SeriesOptionsType[] = [];
    const podNames = Object.keys(res);

    if (podNames.length === 0) return null;

    let hasMinutes = false;

    podNames.forEach(podName => {
      const data = res[podName];
      if (data && data.length > 0) {
        if (data[0].time_bucket.length >= 12) {
          hasMinutes = true;
        }

        const seriesPoints: [number, number | null][] = data.map((d: any) => {
          const tb = String(d.time_bucket);
          const year = +tb.slice(0, 4);
          const month = +tb.slice(4, 6) - 1;
          const day = +tb.slice(6, 8);
          const hour = tb.length >= 10 ? +tb.slice(8, 10) : 0;
          const minute = tb.length >= 12 ? +tb.slice(10, 12) : 0;

          const ts = Date.UTC(year, month, day, hour, minute);
          let value = d[valueKey] ?? null;

          if (convertToGB && value !== null) {
            value = value / (1024 * 1024 * 1024);
          }

          return [ts, value];
        });

        seriesData.push({
          type: 'line',
          name: podName,
          data: seriesPoints
        });
      }
    });

    return {
      chart: {
        height: 250,
        backgroundColor: 'transparent'
      },
      title: { text: undefined },
      xAxis: {
        type: 'datetime',
        tickInterval: hasMinutes ? 60 * 1000 : 60 * 60 * 1000,
        labels: {
          format: hasMinutes ? '{value:%H:%M}' : '{value:%H}',
          style: { fontSize: '10px', color: '#64748b' }
        }
      },
      yAxis: {
        title: { text: yAxisTitle },
        min: 0,
        labels: {
          style: { fontSize: '10px', color: '#64748b' }
        }
      },
      legend: {
        enabled: true,
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',

        maxHeight: 120,
        itemWidth: 120,
        itemMarginBottom: 4,

        itemStyle: {
          fontSize: '10px',
          color: '#64748b',
          whiteSpace: 'nowrap'
        }
      },
      tooltip: {
        shared: true,
        useHTML: true,
        outside: false,
        stickOnContact: true,
        hideDelay: 200,

        /* 👇 Visual polish */
        backgroundColor: '#ffffff',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 10,
        shadow: false,

        formatter: function () {
          const dateLabel = Highcharts.dateFormat(
            hasMinutes ? '%d-%m %H:%M' : '%d-%m %H',
            this.x as number
          );

          let html = `
      <div style="
        max-height: 160px;
        overflow-y: auto;
        padding: 8px 10px;
        font-size: 11.5px;
        font-family: Inter, system-ui, sans-serif;
        color: #0f172a;

        /* 👇 Enterprise shadow */
        border-radius: 10px;
        box-shadow:
          0 8px 20px rgba(0,0,0,0.08),
          0 2px 6px rgba(0,0,0,0.04);
      ">
        <div style="
          font-weight: 600;
          margin-bottom: 8px;
          color: #1e293b;
        ">
          ${dateLabel}
        </div>
    `;

          this.points?.forEach((p: any) => {
            const val =
              p.y !== null && p.y !== undefined
                ? (convertToGB ? p.y.toFixed(4) + ' GB' : p.y)
                : '--';

            html += `
        <div style="
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        ">
          <span style="
            color:${p.color};
            font-size: 12px;
            line-height: 1;
          ">●</span>

          <span style="white-space: nowrap;">
            ${p.series.name}:
            <b>${val}</b>
          </span>
        </div>
      `;
          });

          html += `</div>`;
          return html;
        }
      },

      plotOptions: {
        series: {
          connectNulls: false,
          lineWidth: 2,
          marker: { radius: 2 }
        }
      },
      series: seriesData,
      credits: { enabled: false }
    };
  }

  // download
  private downloadCSV(filename: string, headers: string[], rows: any[]) {
    const csvContent = [
      headers.join(','),
      ...rows.map(r =>
        headers.map(h => `"${r[h] ?? ''}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }

  downloadPodStatus() {
    this.downloadCSV(
      'pod-status.csv',
      ['pod_name', 'phase', 'ready', 'scheduled'],
      this.podStatusList
    );
  }

}
