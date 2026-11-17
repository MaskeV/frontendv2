import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import { KubernetesService } from '../../../../services/kubernetes.service';
import { filter, Subject, Subscription, switchMap } from 'rxjs';
import { DateService } from '../../../../services/date.service';

interface ResourceMetric {
  name: string;
  count: number;
}


@Component({
    selector: 'app-api-server-dashboard',
    imports: [CommonModule, HighchartsChartModule],
    templateUrl: './api-server-dashboard.component.html',
    styleUrl: './api-server-dashboard.component.css'
})
export class ApiServerDashboardComponent implements OnInit {

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;
  selectedService!: string;
  serviceId!: string;

  Highcharts: typeof Highcharts = Highcharts;

  requestRateChartOptions?: Highcharts.Options;
  watchEventChartOptions?: Highcharts.Options;
  resourceRequestChartOptions?: Highcharts.Options;
  storedObjectsChartOptions?: Highcharts.Options;

  private hostName = "";
  private st = '202601081800';
  private et = '202601081815';

  private tooltipLocked = false;

  constructor(private k8s: KubernetesService, private dateService: DateService) { }

  ngOnInit(): void {
    this.hostName = sessionStorage.getItem('selectedNode')!;
    this.selectedService = sessionStorage.getItem('serviceIdForApiServerDashboard')!;
    this.serviceId = sessionStorage.getItem('encodedServiceIdForApiServerDashboard')!;
    this.dateService.setActiveComponent('ApiServerDashboardComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'ApiServerDashboardComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);



        this.loadApiserverRequestRate();
        this.loadWatchEventSize();
        this.loadResourceRequestPercentage();
        this.loadStoredObjects();


      });
  }

  formatDate(date: string) {
    if (!date) return 0;
    date = date.replace(/[^0-9]/g, "");
    if (date.length > 12) {
      date = date.substring(0, 12);
    }
    return parseInt(date);
  }

  /* ===================================================
     UTIL
  =================================================== */
  private toEpoch(bucket: string): number {
    const y = +bucket.slice(0, 4);
    const m = +bucket.slice(4, 6) - 1;
    const d = +bucket.slice(6, 8);
    const h = +bucket.slice(8, 10);
    const min = +bucket.slice(10, 12);
    return new Date(y, m, d, h, min).getTime();
  }
  private loadApiserverRequestRate(): void {
    const st = this.startTime.toString();
    const et = this.endTime.toString();

    this.k8s.getApiserverRequestRate(this.hostName, st, et)
      .subscribe(res => {

        const series: Highcharts.SeriesLineOptions[] =
          Object.keys(res || {}).map(key => ({
            type: 'line',
            name: key,
            data: res[key].map((d: any) => ({
              x: this.toEpoch(d.time_bucket),
              y: d.request_rate ?? 0
            }))
          }));

        if (series.length === 0) {
          this.requestRateChartOptions = undefined;
          return;
        }

        this.requestRateChartOptions = {
          chart: {
            type: 'line',
            height: 260,
            backgroundColor: 'transparent',
            events: {
              click: function () {
                const chart: any = this;
                chart.tooltipLocked = false;
                chart.tooltip.hide(0);
              }
            }
          },

          time: { useUTC: false } as any,
          title: { text: undefined },

          xAxis: {
            type: 'datetime',
            labels: {
              style: { fontSize: '10px', color: '#64748b' }
            }
          },

          yAxis: {
            min: 0,
            title: { text: 'Requests / sec' },
            labels: {
              style: { fontSize: '10px', color: '#64748b' }
            }
          },

          /* ================= LEGEND (2 COLUMN) ================= */
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

          /* ================= TOOLTIP (SCROLL + STICKY) ================= */
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
              const chart = ctx.points[0].series.chart;

              const time = chart.time.dateFormat('%H:%M', ctx.x);

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
                  ${time}
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
                    <b>${p.y} /s</b>
                  </span>
                </div>
              `;
              });

              return html + `</div>`;
            }
          },

          /* ================= INTERACTION ================= */
          plotOptions: {
            series: {
              stickyTracking: false,
              cursor: 'pointer',
              lineWidth: 2,

              marker: {
                enabled: true,
                radius: 2,
                states: {
                  hover: { enabled: true, radius: 4 }
                }
              },

              point: {
                events: {
                  click: function () {
                    const chart: any = this.series.chart;
                    chart.tooltipLocked = true;
                    chart.tooltip.refresh(this);
                  },
                  mouseOut: function () {
                    const chart: any = this.series.chart;
                    if (chart.tooltipLocked) return false;
                    return true;
                  }
                }
              }
            }
          },

          series,
          credits: { enabled: false }
        };
      });
  }

  private loadWatchEventSize(): void {
    const st = this.startTime.toString();
    const et = this.endTime.toString();

    this.k8s.getApiserverWatchEventSize(this.hostName, st, et)
      .subscribe(res => {

        const series: Highcharts.SeriesAreaOptions[] =
          Object.keys(res || {}).map(key => ({
            type: 'area',
            name: key,
            data: res[key].map((d: any) => ({
              x: this.toEpoch(d.time_bucket),
              y: +(d.watch_events_bytes_sum / d.watch_events_bytes_count).toFixed(2)
            }))
          }));

        if (series.length === 0) {
          this.watchEventChartOptions = undefined;
          return;
        }

        this.watchEventChartOptions = {
          chart: {
            type: 'area',
            height: 260,
            backgroundColor: 'transparent',
            events: {
              click: function () {
                const chart: any = this;
                chart.tooltipLocked = false;
                chart.tooltip.hide(0);
              }
            }
          },

          time: { useUTC: false } as any,
          title: { text: undefined },

          xAxis: {
            type: 'datetime',
            labels: {
              style: { fontSize: '10px', color: '#64748b' }
            }
          },

          yAxis: {
            title: { text: 'Watch Event Size (Bytes)' },
            labels: {
              style: { fontSize: '10px', color: '#64748b' }
            }
          },

          /* ================= LEGEND (2 COLUMN) ================= */
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

          /* ================= TOOLTIP (SCROLL + STICKY) ================= */
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
              const chart = ctx.points[0].series.chart;
              const time = chart.time.dateFormat('%H:%M', ctx.x);

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
                  ${time}
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
                    <b>${p.y} B (Avg)</b>
                  </span>
                </div>
              `;
              });

              return html + `</div>`;
            }
          },

          /* ================= INTERACTION ================= */
          plotOptions: {
            area: { stacking: 'normal' },
            series: {
              stickyTracking: false,
              cursor: 'pointer',

              marker: {
                enabled: true,
                radius: 2,
                states: {
                  hover: { enabled: true, radius: 4 }
                }
              },

              point: {
                events: {
                  click: function () {
                    const chart: any = this.series.chart;
                    chart.tooltipLocked = true;
                    chart.tooltip.refresh(this);
                  },
                  mouseOut: function () {
                    const chart: any = this.series.chart;
                    if (chart.tooltipLocked) return false;
                    return true;
                  }
                }
              }
            }
          },

          series,
          credits: { enabled: false }
        };
      });
  }


  /* ===================================================
     3️⃣ REQUESTS PER RESOURCE (%) – BAR
  =================================================== */
  private loadResourceRequestPercentage(): void {
    const st = this.startTime.toString();
    const et = this.endTime.toString();

    this.k8s.getApiserverRawMetricsText(this.hostName, st, et)
      .subscribe(rawText => {

        const clean = rawText.replace(/^SearchResponse:\s*/, '');
        const res = JSON.parse(clean);

        const resourceMap = new Map<string, number>();
        const parents = res?.aggregations?.['sterms#0']?.buckets ?? [];

        parents.forEach((parent: any) => {
          const resources = parent?.['sterms#1']?.buckets ?? [];

          resources.forEach((r: any) => {
            const top =
              r?.['filter#2-bucket']
                ?.['top_metrics#2-metric']
                ?.top?.[0];

            if (!top) return;

            const count =
              top.metrics['kubernetes.apiserver.request.count'] ?? 0;

            resourceMap.set(
              r.key,
              (resourceMap.get(r.key) ?? 0) + count
            );
          });
        });

        const parsed: ResourceMetric[] =
          Array.from(resourceMap.entries())
            .map(([name, count]) => ({ name, count }))
            .filter(r => r.count > 0)
            .sort((a, b) => b.count - a.count);

        if (parsed.length === 0) {
          this.resourceRequestChartOptions = undefined;
          return;
        }

        const total = parsed.reduce((s, r) => s + r.count, 0);

        this.resourceRequestChartOptions = {
          chart: {
            type: 'bar',
            height: 310,
            backgroundColor: 'transparent'
          },

          title: { text: undefined },

          xAxis: {
            categories: parsed.map(r => r.name),
            labels: {
              style: { fontSize: '10px', color: '#64748b' }
            }
          },

          yAxis: {
            max: 100,
            title: { text: 'Request %' },
            labels: {
              style: { fontSize: '10px', color: '#64748b' }
            }
          },

          /* ✅ LEGEND COMPLETELY REMOVED */
          legend: {
            enabled: false
          },

          /* ================= TOOLTIP ================= */
          tooltip: {
            useHTML: true,
            shared: false,
            outside: false,
            stickOnContact: true,
            hideDelay: 200,

            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            borderRadius: 10,
            shadow: false,

            formatter: function () {
              const p: any = (this as any).point;
              const r = parsed[p.index];

              return `
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
                  ${r.name}
                </div>

                <div>
                  Requests:
                  <b>${r.count}</b>
                </div>

                <div>
                  Share:
                  <b>${(r.count / total * 100).toFixed(2)}%</b>
                </div>
              </div>
            `;
            }
          },

          /* ================= SERIES ================= */
          series: [{
            type: 'bar',
            name: 'Requests',
            data: parsed.map(r =>
              +(r.count / total * 100).toFixed(2)
            )
          }],

          credits: { enabled: false }
        };
      });
  }

  /* ===================================================
     4️⃣ STORED OBJECTS – PIE
  =================================================== */
  private loadStoredObjects(): void {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();
    this.k8s.getApiserverEtcdObjectCountText(this.hostName, st, et)
      .subscribe(rawText => {

        const clean = rawText.replace(/^SearchResponse:\s*/, '');
        const res = JSON.parse(clean);

        const buckets = res?.aggregations?.['sterms#0']?.buckets ?? [];

        const parsed: ResourceMetric[] =
          buckets.map((b: any) => {
            const top =
              b?.['filter#1-bucket']
                ?.['top_metrics#1-metric']
                ?.top?.[0];

            if (!top) return null;

            return {
              name: b.key,
              count:
                top.metrics['kubernetes.apiserver.etcd.object.count'] ?? 0
            };
          }).filter(Boolean) as ResourceMetric[];

        if (parsed.length === 0) {
          this.storedObjectsChartOptions = undefined;
          return;
        }

        this.storedObjectsChartOptions = {
          chart: { type: 'pie', height: 320 },
          title: { text: undefined },
          tooltip: {
            useHTML: true,
            formatter: function () {
              const p: any = (this as any).point;
              return `
                <div style="max-height:160px;overflow-y:auto">
                  <b>${p.name}</b><br/>
                  Objects: <b>${p.y}</b><br/>
                  Share: <b>${p.percentage.toFixed(2)}%</b>
                </div>
              `;
            }
          },
          series: [{
            type: 'pie',
            name: 'Stored Objects',
            data: parsed.map(r => ({
              name: `${r.name} (${r.count})`,
              y: r.count
            }))
          }],
          credits: { enabled: false }
        };
      });
  }
}
