import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import { KubernetesService } from '../../../../services/kubernetes.service';
import { filter, Subject, Subscription, switchMap } from 'rxjs';
import { DateService } from '../../../../services/date.service';

@Component({
    selector: 'app-nodes-dashboard',
    imports: [CommonModule, HighchartsChartModule],
    templateUrl: './nodes-dashboard.component.html',
    styleUrl: './nodes-dashboard.component.css'
})
export class NodesDashboardComponent implements OnInit {

  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;
  selectedService!: string;
  serviceId!: string;

  Highcharts: typeof Highcharts = Highcharts;

  /* ================= CHART OPTIONS ================= */

  cpuChartOptions: Highcharts.Options | null = null;
  memoryChartOptions: Highcharts.Options | null = null;
  workingSetChartOptions: Highcharts.Options | null = null;
  networkInChartOptions: Highcharts.Options | null = null;
  networkOutChartOptions: Highcharts.Options | null = null;
  filesystemChartOptions: Highcharts.Options | null = null;
  inodeChartOptions: Highcharts.Options | null = null;

  /* ================= TABLE DATA ================= */

  nodeMetadataList: any[] = [];
  paginatedNodeMetadata: any[] = [];
  nodeCurrentPage: number = 1;
  nodeItemsPerPage: number = 5;
  nodeTotalPages: number = 0;
  nodePages: number[] = [];

  podsAllocationList: any[] = [];
  paginatedPodsAllocation: any[] = [];
  podCurrentPage: number = 1;
  podItemsPerPage: number = 5;
  podTotalPages: number = 0;
  podPages: number[] = [];

  // time range
  st = '202601081800';
  et = '202601081815';
  hostName = '';

  constructor(private k8sService: KubernetesService, private dateService: DateService) { }

  ngOnInit(): void {
    this.hostName = sessionStorage.getItem('selectedNode')!;
    this.selectedService = sessionStorage.getItem('serviceIdForNodesDashboard')!;
    this.serviceId = sessionStorage.getItem('encodedServiceIdForNodesDashboard')!;
    this.dateService.setActiveComponent('NodesDashboardComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'NodesDashboardComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);



        // charts
        this.loadCpu();
        this.loadMemory();
        this.loadWorkingSet();
        this.loadNetworkRx();
        this.loadNetworkTx();
        this.loadFilesystem();
        this.loadInodes();

        // tables
        this.loadNodeMetadata();
        this.loadPodsAllocation();


      });

  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  /* ================= TABLE LOADERS ================= */

  loadNodeMetadata() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    this.k8sService.getNodeMetadata(st, et, this.hostName)
      .subscribe(res => {
        this.nodeMetadataList = Object.keys(res).map(node => ({
          node,
          ...res[node]
        }));
        this.updatePaginatedNodeMetadata();
      });
  }

  updatePaginatedNodeMetadata() {
    this.nodeTotalPages = Math.ceil(this.nodeMetadataList.length / this.nodeItemsPerPage);
    this.nodePages = Array.from({ length: this.nodeTotalPages }, (_, i) => i + 1);
    const startIndex = (this.nodeCurrentPage - 1) * this.nodeItemsPerPage;
    const endIndex = startIndex + this.nodeItemsPerPage;
    this.paginatedNodeMetadata = this.nodeMetadataList.slice(startIndex, endIndex);
  }

  nextPageNode() {
    if (this.nodeCurrentPage < this.nodeTotalPages) {
      this.nodeCurrentPage++;
      this.updatePaginatedNodeMetadata();
    }
  }

  prevPageNode() {
    if (this.nodeCurrentPage > 1) {
      this.nodeCurrentPage--;
      this.updatePaginatedNodeMetadata();
    }
  }

  loadPodsAllocation() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    this.k8sService.getNodePodsAllocatedAllocatable(st, et, this.hostName)
      .subscribe(res => {
        this.podsAllocationList = Object.keys(res).map(node => ({
          node,
          pods_running: res[node].pods_running,
          pods_allocatable: res[node].pods_allocatable
        }));
        this.updatePaginatedPodsAllocation();
      });
  }

  updatePaginatedPodsAllocation() {
    this.podTotalPages = Math.ceil(this.podsAllocationList.length / this.podItemsPerPage);
    this.podPages = Array.from({ length: this.podTotalPages }, (_, i) => i + 1);
    const startIndex = (this.podCurrentPage - 1) * this.podItemsPerPage;
    const endIndex = startIndex + this.podItemsPerPage;
    this.paginatedPodsAllocation = this.podsAllocationList.slice(startIndex, endIndex);
  }

  nextPagePod() {
    if (this.podCurrentPage < this.podTotalPages) {
      this.podCurrentPage++;
      this.updatePaginatedPodsAllocation();
    }
  }

  prevPagePod() {
    if (this.podCurrentPage > 1) {
      this.podCurrentPage--;
      this.updatePaginatedPodsAllocation();
    }
  }

  /* ================= CHART LOADERS ================= */

  loadCpu() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    this.k8sService.getNodeCpuMetrics(st, et, this.hostName)
      .subscribe(res =>
        this.cpuChartOptions = this.createNodeChart(
          'CPU Usage',
          'CPU usage %',
          res,
          'cpu_usage_pct'
        )
      );
  }

  loadMemory() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    this.k8sService.getNodeMemoryMetrics(st, et, this.hostName)
      .subscribe(res =>
        this.memoryChartOptions = this.createNodeChart(
          'Memory Usage',
          'Memory usage %',
          res,
          'memory_usage_pct'
        )
      );
  }

  loadWorkingSet() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    this.k8sService.getNodeMemoryWorkingSetMetrics(st, et, this.hostName)
      .subscribe(res =>
        this.workingSetChartOptions = this.createNodeChart(
          'Working Set Memory',
          'Working set memory %',
          res,
          'memory_workingset_pct'
        )
      );
  }

  loadNetworkRx() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    this.k8sService.getNodeNetworkRxMetrics(st, et, this.hostName)
      .subscribe(res =>
        this.networkInChartOptions = this.createNodeChart(
          'Network RX',
          'Network RX (KB/s)',
          res,
          'network_rx_kbps'
        )
      );
  }

  loadNetworkTx() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    this.k8sService.getNodeNetworkTxMetrics(st, et, this.hostName)
      .subscribe(res =>
        this.networkOutChartOptions = this.createNodeChart(
          'Network TX',
          'Network TX (KB/s)',
          res,
          'network_tx_kbps'
        )
      );
  }

  loadFilesystem() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    this.k8sService.getNodeFilesystemMetrics(st, et, this.hostName)
      .subscribe(res =>
        this.filesystemChartOptions = this.createNodeChart(
          'Filesystem Usage',
          'Filesystem usage %',
          res,
          'filesystem_usage_pct'
        )
      );
  }

  loadInodes() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    this.k8sService.getNodeInodeMetrics(st, et, this.hostName)
      .subscribe(res =>
        this.inodeChartOptions = this.createNodeChart(
          'Inodes Usage',
          'Inodes usage %',
          res,
          'inode_usage_pct'
        )
      );
  }

  /* ================= REUSABLE CHART FACTORY ================= */

  private createNodeChart(
    title: string,
    yAxisTitle: string,
    res: any,
    valueKey: string
  ): Highcharts.Options | null {

    if (!res) return null;

    const seriesData: Highcharts.SeriesOptionsType[] = [];
    const nodeNames = Object.keys(res);
    if (nodeNames.length === 0) return null;

    let hasMinutes = false;

    nodeNames.forEach(nodeName => {

      const data = res[nodeName];
      if (!data || data.length === 0) return;

      if (String(data[0].time_bucket).length >= 12) {
        hasMinutes = true;
      }

      const points = data.map((d: any) => {
        const tb = String(d.time_bucket);

        return {
          x: Date.UTC(
            +tb.slice(0, 4),
            +tb.slice(4, 6) - 1,
            +tb.slice(6, 8),
            tb.length >= 10 ? +tb.slice(8, 10) : 0,
            tb.length >= 12 ? +tb.slice(10, 12) : 0
          ),
          y: d[valueKey] ?? null,
          custom: d
        };
      });

      seriesData.push({
        type: 'line',
        name: nodeName,
        data: points
      });
    });



    if (seriesData.length === 0) return null;

    return {
      chart: { height: 250, backgroundColor: 'transparent' },
      title: { text: undefined },
      xAxis: { type: 'datetime' },
      yAxis: { title: { text: yAxisTitle }, min: 0 },
      legend: {
        enabled: true,
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',

        maxHeight: 140,
        itemWidth: 130,
        itemMarginBottom: 4,

        itemStyle: {
          fontSize: '10px',
          color: '#64748b',
          whiteSpace: 'nowrap'
        }
      },
      plotOptions: {
        line: {
          lineWidth: 1,            // 🔹 thinner line
          marker: {
            enabled: true,
            radius: 2,             // 🔹 smaller marker
            symbol: 'circle'
          },
          states: {
            hover: {
              lineWidth: 1.5       // slightly thicker on hover
            }
          }
        }
      },
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
          const formattedDate = Highcharts.dateFormat('%d-%m %H:%M', ctx.x);

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
              ${formattedDate}
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

  downloadPodsAllocation() {
    this.downloadCSV(
      'pods-allocation.csv',
      ['node', 'pods_running', 'pods_allocatable'],
      this.podsAllocationList
    );
  }

  downloadNodeMetadata() {
    this.downloadCSV(
      'node-metadata.csv',
      ['node', 'arch', 'os', 'hostname', 'ready', 'unschedulable', 'disk_pressure', 'memory_pressure'],
      this.nodeMetadataList
    );
  }

}
