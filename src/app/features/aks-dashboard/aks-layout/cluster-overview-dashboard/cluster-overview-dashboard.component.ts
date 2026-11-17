import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import { KubernetesService } from '../../../../services/kubernetes.service';
import { DateService } from '../../../../services/date.service';
import { filter, Subject, Subscription, switchMap } from 'rxjs';

@Component({
    selector: 'app-cluster-overview-dashboard',
    imports: [CommonModule, HighchartsChartModule],
    templateUrl: './cluster-overview-dashboard.component.html',
    styleUrl: './cluster-overview-dashboard.component.css'
})
export class ClusterOverviewDashboardComponent implements OnInit {

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;
  selectedService!: string;
  serviceId!: string;
  private hostName = '';
  private selectedNamespace = '';

  constructor(private k8sService: KubernetesService, private dateService: DateService) { }

  Highcharts: typeof Highcharts = Highcharts;

  private COLORS = {
    primary: '#14b8a6', cpu: '#38bdf8', memory: '#22c55e', warning: '#ef4444', system: '#facc15'
  };
  private axisLabelStyle  = { fontSize: '11px', color: '#475569' };
  private legendItemStyle = { fontSize: '11px', fontWeight: '500', color: '#334155' };

  /* ===== TOP METRIC SUMMARIES ===== */
  nodesSummary: {
    total: number; notReady: number; readyPct: number;
  } | null = null;

podsSummary: {
    total: number;
    running: number; succeeded: number; failed: number; pending: number;
    runningPct: number; succeededPct: number; failedPct: number; pendingPct: number; // ← add
} | null = null;

  deploymentsSummary: { total: number; notReady: number; readyPct: number; } | null = null;
  daemonSetsSummary:  { total: number; notReady: number; readyPct: number; } | null = null;
  replicaSetsSummary: { total: number; notReady: number; readyPct: number; } | null = null;

  namespacePodsList: { namespace: string; count: number; pct: number }[] = [];
  runningPodsChartOptions: any = null;   // flag for *ngIf

  /* ===== MAIN CHARTS ===== */
  memoryUsageChartOptions!: Highcharts.Options;
  cpuUsageChartOptions!: Highcharts.Options;

  /* ===== BOTTOM CHARTS ===== */
  cpuNodeChart!: Highcharts.Options;
  cpuLimitChart!: Highcharts.Options;
  memoryNodeChart!: Highcharts.Options;
  memoryLimitChart!: Highcharts.Options;

  ngOnInit(): void {
    this.hostName      = sessionStorage.getItem('selectedNode')!;
    this.selectedService = sessionStorage.getItem('serviceIdForClusterOverview')!;
    this.serviceId     = sessionStorage.getItem('encodedServiceIdForClusterOverview')!;
    this.dateService.setActiveComponent('ClusterOverviewDashboardComponent');

    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(ac => ac === 'ClusterOverviewDashboardComponent'),
      switchMap(() => this.dateService.date$)
    ).subscribe(dates => {
      this.datemodel  = dates;
      this.startTime  = this.formatDate(this.datemodel.startdateTime);
      this.endTime    = this.formatDate(this.datemodel.enddateTime);

      this.fetchNodesStatus();
      this.fetchPodsStatus();
      this.fetchDeploymentsStatus();
      this.fetchDaemonSetsStatus();
      this.fetchReplicaSetsStatus();
      this.fetchRunningPods();
      this.fetchMemoryUsage();
      this.fetchCoreUsage();
      this.fetchTopCpuPods();
      this.fetchTopCpuLimitPods();
      this.fetchTopMemoryPods();
      this.fetchTopMemoryLimitPods();
    });
  }

  formatDate(date: string): number {
    return parseInt(date.replace(/-/g, '').replace(/:/g, '').replace(' ', ''));
  }

  /* ──────────── TOP ROW ──────────── */

  fetchNodesStatus(): void {
    const st = this.startTime.toString(), et = this.endTime.toString();
    // API: { Ready: 1, NotReady: 0 }
    this.k8sService.getClusterNodesStatus(this.hostName, st, et).subscribe({
      next: (data) => {
        const ready    = data.Ready    || 0;
        const notReady = data.NotReady || 0;
        const total    = ready + notReady;
        if (total === 0) { this.nodesSummary = null; return; }
        this.nodesSummary = {
          total, notReady,
          readyPct: Math.round((ready / total) * 100)
        };
      },
      error: (err) => console.error('Nodes status error:', err)
    });
  }

fetchPodsStatus(): void {
    const st = this.startTime.toString(), et = this.endTime.toString();
    this.k8sService.getClusterPodsStatus(this.hostName, st, et).subscribe({
      next: (data) => {
        const running   = data.Running   || 0;
        const succeeded = data.Succeeded || 0;
        const failed    = data.Failed    || 0;
        const pending   = data.Pending   || 0;
        const total     = running + succeeded + failed + pending;
        if (total === 0) { this.podsSummary = null; return; }
        this.podsSummary = {
          total, running, succeeded, failed, pending,
          runningPct:   Math.round((running   / total) * 100),
          succeededPct: Math.round((succeeded / total) * 100),
          failedPct:    Math.round((failed    / total) * 100),   // ← add
          pendingPct:   Math.round((pending   / total) * 100)    // ← add
        };
      },
      error: (err) => console.error('Pods status error:', err)
    });
  }

  fetchDeploymentsStatus(): void {
    const st = this.startTime.toString(), et = this.endTime.toString();
    // API: { Ready: 20.0, NotReady: 0.0 }
    this.k8sService.getClusterDeploymentsStatus(this.hostName, st, et).subscribe({
      next: (data) => {
        const ready    = Math.round(data.Ready    || 0);
        const notReady = Math.round(data.NotReady || 0);
        const total    = ready + notReady;
        if (total === 0) { this.deploymentsSummary = null; return; }
        this.deploymentsSummary = {
          total, notReady,
          readyPct: Math.round((ready / total) * 100)
        };
      },
      error: (err) => console.error('Deployments status error:', err)
    });
  }

  fetchDaemonSetsStatus(): void {
    const st = this.startTime.toString(), et = this.endTime.toString();
    // API: { Ready: 18.0, NotReady: 0.0 }
    this.k8sService.getClusterDaemonSetsStatus(this.hostName, st, et).subscribe({
      next: (data) => {
        const ready    = Math.round(data.Ready    || 0);
        const notReady = Math.round(data.NotReady || 0);
        const total    = ready + notReady;
        if (total === 0) { this.daemonSetsSummary = null; return; }
        this.daemonSetsSummary = {
          total, notReady,
          readyPct: Math.round((ready / total) * 100)
        };
      },
      error: (err) => console.error('DaemonSets status error:', err)
    });
  }

  fetchReplicaSetsStatus(): void {
    const st = this.startTime.toString(), et = this.endTime.toString();
    // API: { Ready: 26.0, NotReady: 0.0 }
    this.k8sService.getClusterReplicaSetsStatus(this.hostName, st, et).subscribe({
      next: (data) => {
        const ready    = Math.round(data.Ready    || 0);
        const notReady = Math.round(data.NotReady || 0);
        const total    = ready + notReady;
        if (total === 0) { this.replicaSetsSummary = null; return; }
        this.replicaSetsSummary = {
          total, notReady,
          readyPct: Math.round((ready / total) * 100)
        };
      },
      error: (err) => console.error('ReplicaSets status error:', err)
    });
  }

  fetchRunningPods(): void {
    const st = this.startTime.toString(), et = this.endTime.toString();
    // API: [{ running_pods_count: 28, namespace: "kube-system" }, ...]
    this.k8sService.getClusterRunningPods(this.hostName, st, et).subscribe({
      next: (data) => {
        if (!data || data.length === 0) {
          this.runningPodsChartOptions = null;
          this.namespacePodsList = [];
          return;
        }
        const maxCount = Math.max(...data.map((d: any) => d.running_pods_count || 0)) || 1;
        this.namespacePodsList = [...data]
          .sort((a: any, b: any) => b.running_pods_count - a.running_pods_count)
          .slice(0, 6)
          .map((d: any) => ({
            namespace: d.namespace,
            count: d.running_pods_count,
            pct: Math.round((d.running_pods_count / maxCount) * 100)
          }));
        this.runningPodsChartOptions = true;
      },
      error: (err) => console.error('Running pods error:', err)
    });
  }

  /* ──────────── MIDDLE CHARTS ──────────── */

  fetchMemoryUsage(): void {
    const st = this.startTime.toString(), et = this.endTime.toString();
    this.k8sService.getClusterMemoryUsage(this.hostName, st, et).subscribe({
      next: (data) => {
        const usedSeries: any[]  = [];
        const totalSeries: any[] = [];
        data.forEach((item: any) => {
          const ts = this.parseTimeBucket(item.time_bucket);
          if (ts === null) return;
          usedSeries.push([ts,  +(item.memory_used_bytes  / 1073741824).toFixed(2)]);
          totalSeries.push([ts, +(item.total_memory_bytes / 1073741824).toFixed(2)]);
        });
        usedSeries.sort((a, b)  => a[0] - b[0]);
        totalSeries.sort((a, b) => a[0] - b[0]);
        if (!usedSeries.length && !totalSeries.length) { this.memoryUsageChartOptions = undefined as any; return; }
        this.memoryUsageChartOptions = {
          chart: { type: 'area', height: 180, backgroundColor: 'transparent' },
          title: { text: undefined },
          time: { useUTC: false } as any,
          xAxis: { type: 'datetime', labels: { style: this.axisLabelStyle } },
          yAxis: { title: { text: undefined }, labels: { style: this.axisLabelStyle, format: '{value:.2f} GB' } },
          legend: { itemStyle: this.legendItemStyle },
          tooltip: this.buildSharedTooltip('GB'),
          plotOptions: { area: { fillOpacity: 0.3, marker: { enabled: false } }, series: { cursor: 'pointer' } },
          series: [
            { type: 'line', name: 'Total Memory', data: totalSeries, color: this.COLORS.memory },
            { type: 'area', name: 'Memory Used',  data: usedSeries,  color: this.COLORS.warning }
          ],
          credits: { enabled: false }
        };
      },
      error: (err) => console.error('Memory usage error:', err)
    });
  }

  fetchCoreUsage(): void {
    const st = this.startTime.toString(), et = this.endTime.toString();
    this.k8sService.getClusterCoreUsage(this.hostName, st, et).subscribe({
      next: (data) => {
        const usedSeries: any[]  = [];
        const totalSeries: any[] = [];
        data.forEach((item: any) => {
          const ts = this.parseTimeBucket(item.time_bucket);
          if (ts === null) return;
          usedSeries.push([ts,  +(item.cores_used_nanocores / 1_000_000_000).toFixed(2)]);
          totalSeries.push([ts, +item.total_cores_allocatable.toFixed(2)]);
        });
        usedSeries.sort((a, b)  => a[0] - b[0]);
        totalSeries.sort((a, b) => a[0] - b[0]);
        if (!usedSeries.length && !totalSeries.length) { this.cpuUsageChartOptions = undefined as any; return; }
        this.cpuUsageChartOptions = {
          chart: { type: 'area', height: 180, backgroundColor: 'transparent' },
          title: { text: undefined },
          time: { useUTC: false } as any,
          xAxis: { type: 'datetime', labels: { style: this.axisLabelStyle } },
          yAxis: { title: { text: undefined }, labels: { style: this.axisLabelStyle, format: '{value:.2f} Cores' } },
          legend: { itemStyle: this.legendItemStyle },
          tooltip: this.buildSharedTooltip('Cores'),
          plotOptions: { area: { fillOpacity: 0.3, marker: { enabled: false } }, series: { cursor: 'pointer' } },
          series: [
            { type: 'area', name: 'Cores Used',  data: usedSeries,  color: this.COLORS.warning },
            { type: 'line', name: 'Total Cores', data: totalSeries, color: this.COLORS.memory }
          ],
          credits: { enabled: false }
        };
      },
      error: (err) => console.error('Core usage error:', err)
    });
  }

  /* ──────────── BOTTOM BAR CHARTS ──────────── */

  fetchTopCpuPods(): void {
    this.fetchTopPods(
      this.k8sService.getTopCpuPods(this.hostName, this.startTime.toString(), this.endTime.toString()),
      'CPU Usage', 'Cores', this.COLORS.cpu, (o) => this.cpuNodeChart = o);
  }
  fetchTopCpuLimitPods(): void {
    this.fetchTopPods(
      this.k8sService.getTopCpuLimitPods(this.hostName, this.startTime.toString(), this.endTime.toString()),
      'CPU Limit', 'Cores', this.COLORS.cpu, (o) => this.cpuLimitChart = o);
  }
  fetchTopMemoryPods(): void {
    this.fetchTopPods(
      this.k8sService.getTopMemoryPods(this.hostName, this.startTime.toString(), this.endTime.toString()),
      'Memory Usage', 'GB', this.COLORS.cpu, (o) => this.memoryNodeChart = o);
  }
  fetchTopMemoryLimitPods(): void {
    this.fetchTopPods(
      this.k8sService.getTopMemoryLimitPods(this.hostName, this.startTime.toString(), this.endTime.toString()),
      'Memory Limit', 'GB', this.COLORS.cpu, (o) => this.memoryLimitChart = o);
  }

  private fetchTopPods(obs: any, seriesName: string, unit: string, color: string,
                       assign: (o: Highcharts.Options) => void): void {
    obs.subscribe({
      next: (data: any) => {
        const sorted     = Object.entries(data).sort((a: any, b: any) => b[1] - a[1]);
        const categories = sorted.map(e => e[0]);
        const seriesData = sorted.map(e => +(e[1] as number).toFixed(3));
        if (!seriesData.length) { assign(undefined as any); return; }
        assign({
          chart: { type: 'bar', height: 260, backgroundColor: 'transparent' },
          title: { text: undefined },
          xAxis: { categories, title: { text: undefined }, labels: { style: this.axisLabelStyle } },
          yAxis: { min: 0, title: { text: undefined }, labels: { style: this.axisLabelStyle } },
          legend: { enabled: false },
          plotOptions: {
            bar: { dataLabels: { enabled: true, style: { fontWeight: 'bold' } } },
            series: { cursor: 'pointer' }
          },
          tooltip: this.buildSingleTooltip(seriesName, unit),
          series: [{ type: 'bar', name: seriesName, data: seriesData, color }],
          credits: { enabled: false }
        });
      },
      error: (err: any) => console.error(`${seriesName} error:`, err)
    });
  }

  /* ──────────── HELPERS ──────────── */

  private parseTimeBucket(tb: string): number | null {
    let year = 0, month = 0, day = 0, hour = 0, minute = 0;
    if      (tb.length === 8)  { year=+tb.slice(0,4); month=+tb.slice(4,6)-1; day=+tb.slice(6,8); }
    else if (tb.length === 10) { year=+tb.slice(0,4); month=+tb.slice(4,6)-1; day=+tb.slice(6,8); hour=+tb.slice(8,10); }
    else if (tb.length === 12) { year=+tb.slice(0,4); month=+tb.slice(4,6)-1; day=+tb.slice(6,8); hour=+tb.slice(8,10); minute=+tb.slice(10,12); }
    else { console.warn('Unknown time_bucket:', tb); return null; }
    return new Date(year, month, day, hour, minute).getTime();
  }

  private buildSharedTooltip(unit: string): Highcharts.TooltipOptions {
    return {
      shared: true, useHTML: true, outside: false, stickOnContact: true, hideDelay: 200,
      backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 10, shadow: false,
      formatter: function () {
        const ctx: any = this;
        const time = ctx.points[0].series.chart.time.dateFormat('%Y-%m-%d %H:%M', ctx.x);
        let html = `<div style="padding:8px 10px;font-size:11.5px;font-family:Inter,system-ui,sans-serif;color:#0f172a;border-radius:10px;">
          <div style="font-weight:600;margin-bottom:8px">${time}</div>`;
        ctx.points.forEach((p: any) => {
          html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="color:${p.color}">●</span>
            <span>${p.series.name} : <b>${p.y} ${unit}</b></span></div>`;
        });
        return html + '</div>';
      }
    };
  }

  private buildSingleTooltip(label: string, unit: string): Highcharts.TooltipOptions {
    return {
      shared: false, useHTML: true, outside: false, stickOnContact: true, hideDelay: 200,
      backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 10, shadow: false,
      formatter: function () {
        const p: any = this;
        return `<div style="padding:8px 10px;font-size:11.5px;font-family:Inter,system-ui,sans-serif;color:#0f172a;border-radius:10px;">
          <div style="font-weight:600;margin-bottom:6px">${p.key}</div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="color:${p.color}">●</span>
            <span>${label} : <b>${p.y} ${unit}</b></span>
          </div></div>`;
      }
    };
  }
}