import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HighchartsChartModule } from "highcharts-angular";
import * as Highcharts from "highcharts";
import { KubernetesService } from "../../../../services/kubernetes.service";
import { DateService } from "../../../../services/date.service";
import { filter, Subject, Subscription, switchMap } from "rxjs";

@Component({
    selector: "app-proxy-dashboard",
    imports: [CommonModule, HighchartsChartModule],
    templateUrl: "./proxy-dashboard.component.html",
    styleUrl: "./proxy-dashboard.component.css"
})
export class ProxyDashboardComponent implements OnInit {
  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: number;
  endTime!: number;
  selectedService!: string;
  serviceId!: string;
  hostName!: string;
  constructor(private k8sService: KubernetesService, private dateService: DateService) { }

  Highcharts: typeof Highcharts = Highcharts;

  rulesLatencyChart!: Highcharts.Options;
  syncRulesLatencyChart!: Highcharts.Options;

  residentMemoryChart!: Highcharts.Options;
  cpuIncreaseChart!: Highcharts.Options;

  requestLatencyChart!: Highcharts.Options;
  requestRateChart!: Highcharts.Options;
  clientErrorRateChart!: Highcharts.Options;

  proxyProcessTable: any[] = [];
  processCurrentPage: number = 1;
  processItemsPerPage: number = 5;

  private axisStyle = {
    fontSize: "11px",
    color: "#475569",
    fontWeight: "500",
  };

  private legendStyle = {
    fontSize: "11px",
    color: "#334155",
  };

  ngOnInit(): void {
    this.hostName = sessionStorage.getItem('selectedNode')!;
    this.selectedService = sessionStorage.getItem('serviceIdForProxyDashboard')!;
    this.serviceId = sessionStorage.getItem('encodedServiceIdForProxyDashboard')!;
    this.dateService.setActiveComponent('ProxyDashboardComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'ProxyDashboardComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);


        this.fetchProxyNetworkLatency();
        this.fetchSyncRulesLatency();
        this.fetchAvgResidentMemory();
        this.fetchCpuUsage();
        this.fetchRequestLatency();
        this.fetchRequestsRate();
        this.fetchClientErrorRate();
        this.fetchProxyProcessMetrics();


      });

  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }
  fetchProxyNetworkLatency() {
    const st = this.startTime.toString();
    const et = this.endTime.toString();

    if (!st || !et || st === 'undefined' || et === 'undefined') {
      console.error('Invalid start or end time:', { st, et });
      return;
    }

    this.k8sService.getProxyNetworkLatency(this.hostName, st, et).subscribe({
      next: (data) => {

        if (!data || data.length === 0) {
          this.rulesLatencyChart = undefined as any;
          return;
        }

        const seriesData = new Map<string, any[]>();

        data.forEach((item: any) => {
          const host = item.host_name;
          if (!seriesData.has(host)) {
            seriesData.set(host, []);
          }

          const tb = item.time_bucket;
          let year = 0, month = 0, day = 0, hour = 0, minute = 0;

          if (tb.length === 8) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
          } else if (tb.length === 10) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
            hour = +tb.slice(8, 10);
          } else if (tb.length === 12) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
            hour = +tb.slice(8, 10);
            minute = +tb.slice(10, 12);
          }

          const ts = new Date(year, month, day, hour, minute).getTime();
          seriesData.get(host)!.push([ts, item.latency_seconds]);
        });

        const series: Highcharts.SeriesLineOptions[] = [];
        seriesData.forEach((points, host) => {
          series.push({
            type: 'line',
            name: host,
            data: points.sort((a, b) => a[0] - b[0])
          });
        });

        this.rulesLatencyChart = {
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
            title: { text: 'Seconds' },
            labels: {
              style: { fontSize: '10px', color: '#64748b' }
            }
          },

          /* ================= LEGEND (SAME AS WATCH EVENT) ================= */
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
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                  <span style="color:${p.color};font-size:12px;">●</span>
                  <span>
                    ${p.series.name} :
                    <b>${p.y} s</b>
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
      },
      error: (err) => {
        console.error('Error fetching proxy network latency:', err);
      }
    });
  }
  fetchSyncRulesLatency() {
    const st = this.startTime.toString();
    const et = this.endTime.toString();

    if (!st || !et || st === 'undefined' || et === 'undefined') {
      console.error('Invalid start or end time:', { st, et });
      return;
    }

    this.k8sService.getProxySyncRulesLatency(this.hostName, st, et).subscribe({
      next: (data) => {
        if (!data || data.length === 0) {
          console.warn('No data received from API');
          this.syncRulesLatencyChart = undefined as any;
          return;
        }

        const seriesData = new Map<string, any[]>();

        data.forEach((item: any) => {
          const host = item.host_name;
          if (!seriesData.has(host)) {
            seriesData.set(host, []);
          }

          const tb = item.time_bucket;
          let year = 0, month = 0, day = 0, hour = 0, minute = 0;

          if (tb.length === 8) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
          } else if (tb.length === 10) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
            hour = +tb.slice(8, 10);
          } else if (tb.length === 12) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
            hour = +tb.slice(8, 10);
            minute = +tb.slice(10, 12);
          }

          const ts = new Date(year, month, day, hour, minute).getTime();
          seriesData.get(host)!.push([ts, item.latency_seconds]);
        });

        const series: Highcharts.SeriesLineOptions[] = [];
        seriesData.forEach((points, host) => {
          series.push({
            type: 'line',
            name: host,
            data: points.sort((a, b) => a[0] - b[0])
          });
        });

        this.syncRulesLatencyChart = {
          chart: {
            type: 'line',
            height: 260,
            backgroundColor: 'transparent',
            events: {
              click() {
                const c: any = this;
                c.tooltipLocked = false;
                c.tooltip.hide(0);
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
            title: {
              text: 'Sync Rules Latency (Seconds)',
              style: { fontSize: '11px', color: '#475569' }
            },
            labels: {
              style: { fontSize: '10px', color: '#64748b' }
            }
          },

          /* ===== LEGEND (ENTERPRISE – SAME AS CPU) ===== */
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

          /* ===== TOOLTIP (SCROLL + STICKY – SAME AS CPU) ===== */
          tooltip: {
            shared: true,
            useHTML: true,
            stickOnContact: true,
            hideDelay: 200,

            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            borderRadius: 10,
            shadow: false,

            formatter() {
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
                <div style="display:flex;gap:6px;margin-bottom:4px">
                  <span style="color:${p.color};font-size:12px;">●</span>
                  <span>
                    ${p.series.name} :
                    <b>${p.y} s</b>
                  </span>
                </div>
              `;
              });

              return html + `</div>`;
            }
          },

          /* ===== INTERACTION (CLICK-LOCK SAME AS CPU) ===== */
          plotOptions: {
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
                  click() {
                    const chart: any = this.series.chart;
                    chart.tooltipLocked = true;
                    chart.tooltip.refresh(this);
                  },
                  mouseOut() {
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
      },
      error: (err) => {
        console.error('Error fetching sync rules latency:', err);
        this.syncRulesLatencyChart = undefined as any;
      }
    });
  }

  fetchAvgResidentMemory() {
    const st = this.startTime.toString();
    const et = this.endTime.toString();

    this.k8sService.getProxyAvgResidentMemory(this.hostName, st, et).subscribe({
      next: (data) => {
        if (!data || data.length === 0) {
          console.warn('No data received from API');
          this.residentMemoryChart = undefined as any;
          return;
        }

        const seriesData = new Map<string, any[]>();

        data.forEach((item: any) => {
          const host = item.host_name;
          if (!seriesData.has(host)) {
            seriesData.set(host, []);
          }

          const tb = item.time_bucket;
          let year = 0, month = 0, day = 0, hour = 0, minute = 0;

          if (tb.length === 8) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
          } else if (tb.length === 10) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
            hour = +tb.slice(8, 10);
          } else if (tb.length === 12) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
            hour = +tb.slice(8, 10);
            minute = +tb.slice(10, 12);
          }

          const ts = new Date(year, month, day, hour, minute).getTime();
          const mb = +(item.memory_bytes / (1024 * 1024)).toFixed(2);

          seriesData.get(host)!.push([ts, mb]);
        });

        const series: Highcharts.SeriesLineOptions[] = [];
        seriesData.forEach((points, host) => {
          series.push({
            type: 'line',
            name: host,
            data: points.sort((a, b) => a[0] - b[0])
          });
        });

        this.residentMemoryChart = {
          chart: {
            type: 'line',
            height: 260,
            backgroundColor: 'transparent',
            events: {
              click() {
                const c: any = this;
                c.tooltipLocked = false;
                c.tooltip.hide(0);
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
            title: {
              text: 'Resident Memory (MB)',
              style: { fontSize: '11px', color: '#475569' }
            },
            labels: {
              style: { fontSize: '10px', color: '#64748b' }
            }
          },

          /* ===== LEGEND (same as CPU) ===== */
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

          /* ===== TOOLTIP (same design as CPU) ===== */
          tooltip: {
            shared: true,
            useHTML: true,
            stickOnContact: true,
            hideDelay: 200,

            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            borderRadius: 10,
            shadow: false,

            formatter() {
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
                <div style="display:flex;gap:6px;margin-bottom:4px">
                  <span style="color:${p.color};font-size:12px;">●</span>
                  <span>
                    ${p.series.name} :
                    <b>${p.y} MB</b>
                  </span>
                </div>
              `;
              });

              return html + `</div>`;
            }
          },

          /* ===== INTERACTION (same as CPU) ===== */
          plotOptions: {
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
                  click() {
                    const chart: any = this.series.chart;
                    chart.tooltipLocked = true;
                    chart.tooltip.refresh(this);
                  },
                  mouseOut() {
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
      },
      error: (err) => {
        console.error('Error fetching avg resident memory:', err);
        this.residentMemoryChart = undefined as any;
      }
    });
  }

  fetchCpuUsage() {
    const st = this.startTime.toString();
    const et = this.endTime.toString();

    this.k8sService.getProxyCpuUsage(this.hostName, st, et).subscribe({
      next: (data) => {
        if (!data || data.length === 0) {
          console.warn('No data received from API');
          this.cpuIncreaseChart = undefined as any;
          return;
        }

        const seriesData = new Map<string, any[]>();

        data.forEach((item: any) => {
          const host = item.host_name;
          if (!seriesData.has(host)) {
            seriesData.set(host, []);
          }

          const ts = this.toEpoch(item.time_bucket);
          seriesData.get(host)!.push([ts, item.cpu_usage_seconds]);
        });

        const series: Highcharts.SeriesLineOptions[] = [];
        seriesData.forEach((points, host) => {
          series.push({
            type: 'line',
            name: host,
            data: points.sort((a, b) => a[0] - b[0])
          });
        });

        this.cpuIncreaseChart = {
          chart: {
            type: 'line',
            height: 260,
            backgroundColor: 'transparent',
            events: {
              click() {
                const c: any = this;
                c.tooltipLocked = false;
                c.tooltip.hide(0);
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
            title: {
              text: 'CPU Usage (Seconds)',
              style: { fontSize: '11px', color: '#475569' }
            },
            labels: {
              style: { fontSize: '10px', color: '#64748b' }
            }
          },

          /* ================= LEGEND (ENTERPRISE) ================= */
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
            stickOnContact: true,
            hideDelay: 200,

            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            borderRadius: 10,
            shadow: false,

            formatter() {
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
                <div style="display:flex;gap:6px;margin-bottom:4px">
                  <span style="color:${p.color};font-size:12px;">●</span>
                  <span>
                    ${p.series.name} :
                    <b>${p.y} sec</b>
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
              marker: {
                enabled: true,
                radius: 2,
                states: {
                  hover: { enabled: true, radius: 4 }
                }
              },
              point: {
                events: {
                  click() {
                    const chart: any = this.series.chart;
                    chart.tooltipLocked = true;
                    chart.tooltip.refresh(this);
                  },
                  mouseOut() {
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
      },
      error: (err) => {
        console.error('Error fetching cpu usage:', err);
        this.cpuIncreaseChart = undefined as any;
      }
    });
  }
  private toEpoch(tb: string): number {
    let year = 0, month = 0, day = 0, hour = 0, minute = 0;

    if (tb.length === 8) {
      // YYYYMMDD
      year = +tb.substring(0, 4);
      month = +tb.substring(4, 6) - 1;
      day = +tb.substring(6, 8);
    }
    else if (tb.length === 10) {
      // YYYYMMDDHH
      year = +tb.substring(0, 4);
      month = +tb.substring(4, 6) - 1;
      day = +tb.substring(6, 8);
      hour = +tb.substring(8, 10);
    }
    else if (tb.length === 12) {
      // YYYYMMDDHHmm
      year = +tb.substring(0, 4);
      month = +tb.substring(4, 6) - 1;
      day = +tb.substring(6, 8);
      hour = +tb.substring(8, 10);
      minute = +tb.substring(10, 12);
    }

    return new Date(year, month, day, hour, minute).getTime();
  }
  fetchRequestLatency() {
    const st = this.startTime.toString();
    const et = this.endTime.toString();

    this.k8sService.getProxyRequestLatency(this.hostName, st, et).subscribe({
      next: (data) => {
        if (!data || data.length === 0) {
          this.requestLatencyChart = undefined as any;
          return;
        }

        const seriesData = new Map<string, any[]>();

        data.forEach((item: any) => {
          const host = item.host_name;
          if (!seriesData.has(host)) {
            seriesData.set(host, []);
          }

          const tb = item.time_bucket;
          let year = 0, month = 0, day = 0, hour = 0, minute = 0;

          if (tb.length === 8) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
          } else if (tb.length === 10) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
            hour = +tb.slice(8, 10);
          } else if (tb.length === 12) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
            hour = +tb.slice(8, 10);
            minute = +tb.slice(10, 12);
          }

          const ts = new Date(year, month, day, hour, minute).getTime();
          seriesData.get(host)!.push([ts, item.latency_ms]);
        });

        const series: Highcharts.SeriesLineOptions[] = [];
        seriesData.forEach((points, host) => {
          series.push({
            type: 'line',
            name: host,
            data: points.sort((a, b) => a[0] - b[0])
          });
        });

        this.requestLatencyChart = {
          chart: {
            type: 'line',
            height: 260,
            backgroundColor: 'transparent',
            events: {
              click() {
                const c: any = this;
                c.tooltipLocked = false;
                c.tooltip.hide(0);
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
            title: {
              text: 'Latency (ms)',
              style: { fontSize: '11px', color: '#475569' }
            },
            labels: {
              style: { fontSize: '10px', color: '#64748b' }
            }
          },

          /* ===== LEGEND (ENTERPRISE) ===== */
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

          /* ===== TOOLTIP (SCROLL + STICKY) ===== */
          tooltip: {
            shared: true,
            useHTML: true,
            stickOnContact: true,
            hideDelay: 200,

            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            borderRadius: 10,
            shadow: false,

            formatter() {
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
                <div style="display:flex;gap:6px;margin-bottom:4px">
                  <span style="color:${p.color};font-size:12px;">●</span>
                  <span>
                    ${p.series.name} :
                    <b>${p.y} ms</b>
                  </span>
                </div>
              `;
              });

              return html + `</div>`;
            }
          },

          /* ===== INTERACTION (CLICK-LOCK) ===== */
          plotOptions: {
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
                  click() {
                    const chart: any = this.series.chart;
                    chart.tooltipLocked = true;
                    chart.tooltip.refresh(this);
                  },
                  mouseOut() {
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
      },
      error: (err) => {
        console.error('Error fetching request latency:', err);
        this.requestLatencyChart = undefined as any;
      }
    });
  }

  fetchRequestsRate() {
    const st = this.startTime.toString();
    const et = this.endTime.toString();

    this.k8sService.getProxyRequestsRate(this.hostName, st, et).subscribe({
      next: (data) => {
        if (!data || data.length === 0) {
          this.requestRateChart = undefined as any;
          return;
        }

        const seriesData = new Map<string, any[]>();

        data.forEach((item: any) => {
          // Host › Code › Method  (NO CHANGE)
          const seriesName = `${item.host_name} \u203A ${item.code} \u203A ${item.method}`;

          if (!seriesData.has(seriesName)) {
            seriesData.set(seriesName, []);
          }

          const tb = item.time_bucket;

          let year = 0, month = 0, day = 0, hour = 0, minute = 0;

          if (tb.length === 8) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
          } else if (tb.length === 10) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
            hour = +tb.slice(8, 10);
          } else if (tb.length === 12) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
            hour = +tb.slice(8, 10);
            minute = +tb.slice(10, 12);
          }

          const timestamp = new Date(year, month, day, hour, minute).getTime();
          seriesData.get(seriesName)!.push([timestamp, item.request_rate_per_sec]);
        });

        const series: any[] = [];
        seriesData.forEach((points, name) => {
          series.push({
            type: 'line',
            name,
            data: points.sort((a, b) => a[0] - b[0])
          });
        });

        this.requestRateChart = {
          chart: {
            type: 'line',
            height: 260,
            backgroundColor: 'transparent',
            events: {
              click() {
                const c: any = this;
                c.tooltipLocked = false;
                c.tooltip.hide(0);
              }
            }
          },

          time: { useUTC: false } as any,
          title: { text: undefined },

          xAxis: {
            type: 'datetime',
            crosshair: true,
            labels: { style: this.axisStyle }
          },

          yAxis: {
            title: { text: 'Requests / sec', style: this.axisStyle },
            labels: { style: this.axisStyle }
          },

          /* ================= LEGEND (SCROLL SAFE) ================= */
          legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle',
            maxHeight: 140,
            itemWidth: 150,
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
                <div style="display:flex;gap:6px;margin-bottom:4px">
                  <span style="color:${p.color};font-size:12px;">●</span>
                  <span>
                    ${p.series.name} :
                    <b>${p.y} /s</b>
                  </span>
                </div>
              `;
              });

              return html + '</div>';
            }
          },

          /* ================= INTERACTION ================= */
          plotOptions: {
            series: {
              stickyTracking: false,
              cursor: 'pointer',
              marker: {
                enabled: true,
                radius: 2,
                states: {
                  hover: { radius: 4 }
                }
              },
              point: {
                events: {
                  click() {
                    const c: any = this.series.chart;
                    c.tooltipLocked = true;
                    c.tooltip.refresh(this);
                  },
                  mouseOut() {
                    const c: any = this.series.chart;
                    if (c.tooltipLocked) return false;
                    return true;
                  }
                }
              }
            }
          },

          series,
          credits: { enabled: false }
        };
      },
      error: (err) => {
        console.error('Error fetching requests rate:', err);
      }
    });
  }
  fetchClientErrorRate() {
    const st = this.startTime.toString();
    const et = this.endTime.toString();

    this.k8sService.getProxyClientErrorRate(this.hostName, st, et).subscribe({
      next: (data) => {
        if (!data || data.length === 0) {
          this.clientErrorRateChart = undefined as any;
          return;
        }

        const seriesData = new Map<string, any[]>();

        data.forEach((item: any) => {
          // Host › Code › Method  (NO CHANGE)
          const seriesName = `${item.host_name} \u203A ${item.code} \u203A ${item.method}`;

          if (!seriesData.has(seriesName)) {
            seriesData.set(seriesName, []);
          }

          const tb = item.time_bucket;

          let year = 0, month = 0, day = 0, hour = 0, minute = 0;

          if (tb.length === 8) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
          } else if (tb.length === 10) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
            hour = +tb.slice(8, 10);
          } else if (tb.length === 12) {
            year = +tb.slice(0, 4);
            month = +tb.slice(4, 6) - 1;
            day = +tb.slice(6, 8);
            hour = +tb.slice(8, 10);
            minute = +tb.slice(10, 12);
          }

          const timestamp = new Date(year, month, day, hour, minute).getTime();
          seriesData.get(seriesName)!.push([timestamp, item.request_rate_per_sec]);
        });

        const series: any[] = [];
        seriesData.forEach((points, name) => {
          series.push({
            type: 'line',
            name,
            data: points.sort((a, b) => a[0] - b[0])
          });
        });

        this.clientErrorRateChart = {
          chart: {
            type: 'line',
            height: 260,
            backgroundColor: 'transparent',
            events: {
              click() {
                const c: any = this;
                c.tooltipLocked = false;
                c.tooltip.hide(0);
              }
            }
          },

          time: { useUTC: false } as any,
          title: { text: undefined },

          xAxis: {
            type: 'datetime',
            crosshair: true,
            labels: { style: this.axisStyle }
          },

          yAxis: {
            title: { text: 'Requests / sec', style: this.axisStyle },
            labels: { style: this.axisStyle }
          },

          /* ================= LEGEND ================= */
          legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle',
            maxHeight: 140,
            itemWidth: 150,
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
                <div style="display:flex;gap:6px;margin-bottom:4px">
                  <span style="color:${p.color};font-size:12px;">●</span>
                  <span>
                    ${p.series.name} :
                    <b>${p.y} /s</b>
                  </span>
                </div>
              `;
              });

              return html + '</div>';
            }
          },

          /* ================= INTERACTION ================= */
          plotOptions: {
            series: {
              stickyTracking: false,
              cursor: 'pointer',
              marker: {
                enabled: true,
                radius: 2,
                states: {
                  hover: { radius: 4 }
                }
              },
              point: {
                events: {
                  click() {
                    const c: any = this.series.chart;
                    c.tooltipLocked = true;
                    c.tooltip.refresh(this);
                  },
                  mouseOut() {
                    const c: any = this.series.chart;
                    if (c.tooltipLocked) return false;
                    return true;
                  }
                }
              }
            }
          },

          series,
          credits: { enabled: false }
        };
      },
      error: (err) => {
        console.error('Error fetching client error rate:', err);
      }
    });
  }


  fetchProxyProcessMetrics() {
    const st = (this.startTime).toString();
    const et = (this.endTime).toString();

    this.k8sService.getProxyProcessMetrics(this.hostName, st, et).subscribe({
      next: (data) => {
        this.proxyProcessTable = data.map((item: any) => ({
          host: item.host_name,
          residentMemory: this.formatBytes(item.resident_memory_bytes),
          virtualMemory: this.formatBytes(item.virtual_memory_bytes),
          fdUsage: ((item.open_file_descriptors / item.max_file_descriptors) * 100).toFixed(2) + '%'
        }));
      },
      error: (err) => {
        console.error("Error fetching proxy process metrics:", err);
      }
    });
  }

  formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  get paginatedProcessMetrics(): any[] {
    const startIndex = (this.processCurrentPage - 1) * this.processItemsPerPage;
    return this.proxyProcessTable.slice(startIndex, startIndex + this.processItemsPerPage);
  }

  get processTotalPages(): number {
    return Math.ceil(this.proxyProcessTable.length / this.processItemsPerPage);
  }

  nextProcessPage() {
    if (this.processCurrentPage < this.processTotalPages) {
      this.processCurrentPage++;
    }
  }

  prevProcessPage() {
    if (this.processCurrentPage > 1) {
      this.processCurrentPage--;
    }
  }


  // download

  downloadProxyProcess() {
    const headers = ['host', 'residentMemory', 'virtualMemory', 'fdUsage'];

    const csv = [
      headers.join(','),
      ...this.proxyProcessTable.map(r =>
        headers.map(h => `"${r[h] ?? ''}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'proxy-process-metrics.csv';
    a.click();

    URL.revokeObjectURL(url);
  }

}
