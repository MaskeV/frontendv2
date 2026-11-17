import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { OverviewService } from '../../../../services/overview.service';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import * as Highcharts from 'highcharts';
import 'highcharts/highcharts-more';
import 'highcharts/modules/heatmap';
import 'highcharts/modules/tilemap';
import { CommonModule } from '@angular/common';
import { ChartComponent } from '../../../../utility/chart/chart.component';
import { HighchartsChartModule } from 'highcharts-angular';
import { User } from '../../../../models/user';
import { DateService } from '../../../../services/date.service';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DecoderService } from '../../../../services/decoder.service';
import { SharedService } from '../../../../services/shared.service';
import { MatTooltip } from '@angular/material/tooltip';
import * as bootstrap from 'bootstrap';

declare global {
  interface Window {
    angularComponentRef: any;
  }
}

export interface HexTileData {
  x: number;
  y: number;
  value: number;
  name: string;
  custom?: {
    latency?: number;
  };
}

export interface ServiceErrorTileData {
  name: string;
  totalErrorEntries: number;
}

interface ServiceErrorData {
  [encodedServiceName: string]: number;
}

interface CustomSeriesOptions extends Highcharts.SeriesColumnOptions {
  decodedOuterKey: string;
}

@Component({
    selector: 'app-technical',
    templateUrl: './technical.component.html',
    styleUrl: './technical.component.css',
    imports: [
        CommonModule,
        RouterModule,
        ChartComponent,
        HighchartsChartModule,
        MatTooltip
    ]
})
export class TechnicalComponent implements OnInit, OnDestroy, AfterViewInit {
  Highcharts: typeof Highcharts = Highcharts;
  @ViewChild('serviceErrorChartContainer', { static: false }) serviceErrorChartContainer!: ElementRef;

  // Chart options
  hostHealthChartOptions!: Highcharts.Options;
  serviceHealthChartOptions!: Highcharts.Options;
  databaseHealthChartOptions!: Highcharts.Options;
  webAppRequestsChartOptions!: Highcharts.Options;
  networkTrafficChartOptions!: Highcharts.Options;
  webAppTrafficChartOptions!: Highcharts.Options;
  serviceErrorChartOptions!: Highcharts.Options;
  totalNetworkChartOptions!: Highcharts.Options;
  cpuUsageChartOptions!: Highcharts.Options;
  memoryUsageChartOptions!: Highcharts.Options;
  diskUsageChartOptions!: Highcharts.Options;
  serviceEndpointErrorChartOptions!: Highcharts.Options;
  logsErrorChartOptions!: Highcharts.Options;
  slowDBQueriesChartOptions!: Highcharts.Options;
  criticalFlowChartOptions!: Highcharts.Options;
  applicationLatencyChartOptions!: Highcharts.Options;
  networktrafficchart_!:Highcharts.Chart;

  chartTitles: { [key: string]: string } = {
    networkLatency: 'Network Metrics',
    webAppRequests: 'Web App Requests /min',
    hostHealth: 'Host Health',
    serviceHealth: 'Service Health',
    databaseHealth: 'Database Health',
    totalNetworkUsage: 'Total Network Usage (Bytes)',
    webAppTraffic: 'Top Web Applications',
    serviceError: 'Service Error Count',
    cpuUsage: 'Cpu Usage %',
    memoryUsage: 'Memory Usage(mb)',
    diskUsage: 'Disk Usage %',
    serviceEndpointError: 'Endpoint Errors (counts)',
    logsError: 'Log Errors (counts)',
    slowDBQueries: 'Slow DB Queries',
    criticalFlow: 'Critical Flow',
    applicationLatency: 'Latency (ms)',
    networkTraffic: 'Network Traffic (Bytes)',
  };

  tabs: string[] = ['technical', 'application-overview', 'infra-group'];
  tabLabels: { [key: string]: string } = {
    'technical': 'Technical',
    'application-overview': 'Application Overview',
    'infra-group': 'Infra Group'
  };
  selectedTab: string = 'Technical';

  // You can optionally define configs for each hex chart
  hostHealthConfig = {};
  serviceHealthConfig = {};
  databaseHealthConfig = {};

  // Define consistent chart sizes
  readonly TILE_CHART_WIDTH = 220;
  readonly TILE_CHART_HEIGHT = 200;
  readonly LINE_CHART_HEIGHT = 175;
  userId: any;
  selectedService!: string | null;
  endTime!: number;
  startTime!: number;
  userDetails: User | null = null;
  datemodel: any;
  private subscription: Subscription = new Subscription();
  ngZone: any;
  series: any;
  cachedNetworkTrafficSeries: any[] = [];
  cachedTotalNetworkTrafficSeries: any[] = [];
  cachedMemoryusageSeries: any[] = [];
  cachedCpuUsageSeries: any[] = [];
  cachedDiskusageSeries: any[] = [];
  cachedServiceErrorSeries: any[] = [];
  cachedServiceEndpointSeries: any[] = [];
  cachedLogsErrorSeries: any[] = [];
  cachedSlowDBSeries: any[] = [];
  cachedCriticalFlowSeries: any[] = [];
  cachedApplicationLatencySeries: any[] = [];
  themeObserver!: MutationObserver;
  private destroy$ = new Subject<void>();

  constructor(
    private overviewService: OverviewService,
    private router: Router,
    private route: ActivatedRoute,
    private dateService: DateService,
    private decoderService: DecoderService,
    private sharedService : SharedService,
  ) {
    Highcharts.setOptions({
      plotOptions: {
        series: {
          cursor: 'pointer'
        }
      }
    });
  }

  @Input() lineChartOptions!: Highcharts.Options;

  ngOnInit(): void {
    // Handle tab selection from route
    this.route.params.subscribe(params => {
      const tab = params['tab'];
      if (tab && this.tabs.includes(tab)) {
        this.selectedTab = tab;
      }
    });
    this.themeObserver = new MutationObserver(() => {
      this.refreshAllCharts();
    });
    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme', 'theme-switch']
    });
    // Hex chart data generation and configuration
    const hostHealth = this.overviewService.generateHostHealthData(12);
    this.hostHealthChartOptions = this.getHexChartConfig(
      hostHealth,
      this.chartTitles['hostHealth'],
      this.hostHealthConfig,
      this.TILE_CHART_HEIGHT,
      this.TILE_CHART_WIDTH
    );

    const databaseHealth = this.overviewService.generateDatabaseHealthData(3);
    this.databaseHealthChartOptions = this.getHexChartConfig(
      databaseHealth,
      this.chartTitles['databaseHealth'],
      this.databaseHealthConfig,
      this.TILE_CHART_HEIGHT,
      this.TILE_CHART_WIDTH
    );

    // Line charts mock chart
    const webAppMetrics = this.overviewService.generateWebAppMetrics();
    this.webAppRequestsChartOptions = this.getLineChartConfig(
      webAppMetrics,
      'Webapp Requests',
      'Webapp Requests',
      this.LINE_CHART_HEIGHT
    );

    this.selectedService = sessionStorage.getItem('SelectedServiceId');
    this.dateService.setActiveComponent('TechnicalComponent');
    this.subscription = this.dateService.activeComponent$.pipe(
      filter((activeComponent) => activeComponent === 'TechnicalComponent'),
      switchMap(() => this.dateService.date$)
    ).subscribe(dates => {
      this.datemodel = dates;
      this.startTime = this.formatDate(this.datemodel.startdateTime);
      this.endTime = this.formatDate(this.datemodel.enddateTime);
      this.refreshAllCharts();
    });
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
  }

  ngAfterViewInit(): void {
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el: any) => {
      new bootstrap.Tooltip(el);
    });
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  refreshAllCharts(){
    this.getNetworkTraffic();
    this.getServiceError();
    this.getTotalNetworkTraffic();
    this.getCpuUsage();
    this.getMemoryUsage();
    this.getDiskUsage();
    this.getServiceEndpointError();
    this.getLogsError();
    this.getSlowDBQueries();
    this.getFeatureFlow();
    this.getApplicationLatency();
    this.observeThemeChange();
  }

  getServiceError(): void {
    this.userDetails = sessionStorage.getItem('currentUser')
      ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!))
      : null;
    this.userId = this.userDetails?.userId;
  
    this.overviewService
      .generateServiceError(this.userId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$))
      .subscribe((data: ServiceErrorData) => {
        const tiles: Array<{ name: string; totalErrorEntries: number }> = [];
  
        for (const key in data) {
          if (!data.hasOwnProperty(key)) continue;
  
          const decodedKey = atob(key.split('.')[0]); // Decode the base64-encoded name
          const value = data[key]; // Total error count for this key
          tiles.push({ name: decodedKey, totalErrorEntries: value });
        }
  
        this.cachedServiceErrorSeries = tiles;
  
        // ✅ Use actual container size if available
        setTimeout(() => {
          if (this.serviceErrorChartContainer) {
            const rect = this.serviceErrorChartContainer.nativeElement.getBoundingClientRect();
            const height = rect.height;
            const width = rect.width;
  
            this.serviceErrorChartOptions = this.getServiceErrorChartConfig(tiles, height, width);
          } else {
            // fallback if ViewChild is not ready yet
            this.serviceErrorChartOptions = this.getServiceErrorChartConfig(
              tiles,
              this.TILE_CHART_HEIGHT,
              this.TILE_CHART_WIDTH
            );
          }
        });
      });
  }

  getServiceErrorChartConfig(
    data: ServiceErrorTileData[],
    containerHeight: number,
    containerWidth: number
  ): Highcharts.Options {
    const tileCount = data.length;
  
    // Sort biggest in center
    const sortedData = [...data].sort((a, b) => b.totalErrorEntries - a.totalErrorEntries);
  
    const generateSpiralCoords = (tileCount: number): [number, number][] => {
      const coords: [number, number][] = [[0, 0]];
      if (tileCount === 1) return coords;
  
      if (tileCount === 2) {
        coords.push([1, 0]); // side by side
        return coords;
      }
  
      const directions: [number, number][] = [
        [1, 0], [1, -1], [0, -1],
        [-1, 0], [-1, 1], [0, 1]
      ];
  
      let layer = 1;
      while (coords.length < tileCount) {
        let q = -layer;
        let r = layer;
  
        for (const [dq, dr] of directions) {
          for (let i = 0; i < layer; i++) {
            if (coords.length >= tileCount) return coords;
            coords.push([q, r]);
            q += dq;
            r += dr;
          }
        }
        layer++;
      }
      return coords;
    };
  
    const spiralCoords = generateSpiralCoords(tileCount);
  
    const getColorForErrorCount = (count: number): string => {
      if (count <= 3) return '#4CAF50';
      if (count <= 7) return '#00cc44';
      if (count <= 100) return '#e3c119';
      if (count <= 300) return '#FF9800';
      return '#F44336';
    };
  
    const positionedData = spiralCoords.map(([q, r], index) => {
      const col = q;
      const row = r + ((q & 1) ? (q - 1) / 2 : q / 2);
      return {
        ...sortedData[index],
        x: col,
        y: -row,
        name: sortedData[index].name,
        value: sortedData[index].totalErrorEntries,
        color: getColorForErrorCount(sortedData[index].totalErrorEntries)
      };
    });
  
    // 👉 Dynamic bounds to control tile size:
    const xVals = positionedData.map(p => p.x);
    const yVals = positionedData.map(p => p.y);
    const minX = Math.min(...xVals) - 1;
    const maxX = Math.max(...xVals) + 1;
    const minY = Math.min(...yVals) - 1;
    const maxY = Math.max(...yVals) + 1;
  
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim() || '#fff';
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim() || '#222';
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim() || '#fff';
  
    return {
      chart: {
        type: 'tilemap',
        height: containerHeight,
        width: containerWidth,
        backgroundColor: 'transparent',
        marginTop: 0,
        marginLeft : 0,
        plotBorderWidth: 0,
        style: {
          fontFamily: 'Roboto, sans-serif'
        }
      },
      title: {
        text: undefined,
        align: 'left',
        style: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '14px'
        }
      },
      xAxis: {
        min: minX,
        max: maxX,
        visible: false
      },
      yAxis: {
        min: minY,
        max: maxY,
        visible: false
      },
      colorAxis: {
        labels: { enabled: false }
      } as Highcharts.ColorAxisOptions,
      legend: { enabled: false },
      plotOptions: {
        tilemap: {
          borderWidth: 0,
          tileShape: 'hexagon',
          dataLabels: {
            enabled: true,
            style: {
              color : '#ffffff',
              textOutline: 'none',
              fontWeight: 'bold'
            }
          },
          pointPadding: 1,
          states: { hover: { enabled: true } }
        }
      },
      tooltip: {
        useHTML: true,
        headerFormat: '',
        backgroundColor: tooltipBgColor,
        pointFormatter: function () {
          const val = this.value ?? 0;
          let status = 'Unknown';
          if (val <= 3) status = 'Low';
          else if (val <= 7) status = 'Medium';
          else if (val <= 100) status = 'High';
          else if (val <= 300) status = 'Higher';
          else status = 'Severe';
  
          return `
            <b>${this.name}</b><br>
            <b>Error Count:</b> ${val}<br>
            <b>Status:</b> ${status}`;
        },
        style: {
          color: tooltipTextColor,
          whiteSpace: 'nowrap',
        }
      },
      series: [
        {
          type: 'tilemap',
          tileShape: 'hexagon',
          data: positionedData
        } as Highcharts.SeriesTilemapOptions
      ],
      credits: { enabled: false },
      exporting: { enabled: false }
    };
  }

  getTotalNetworkTraffic(): void {
    this.userDetails = sessionStorage.getItem('currentUser') ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!)) : null;
    this.userId = this.userDetails?.userId;
    const host = 'linux';

    this.overviewService
      .getTotalNetworkTraffic(this.userId, this.startTime, this.endTime, host).pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const baseColors = [
          '#47CEB7', // Bright Blue
          '#4CAF50', // Bright Green
          '#FFEB3B', // Bright Yellow
          '#FF9800', // Bright Orange
          '#F44336'  // Light Red 
        ];
        let serverIndex = 0;
        const seriesData = [];
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            const decodedKey = atob(key.split('.')[0]);
            const totalPoints: { x: number; y: any; additionalData: { total: any; transmittedBytes: null; receivedBytes: null; }; }[] = [];
            data[key]
              .filter((point: { total: undefined; time_bucket: undefined; }) =>
                point.time_bucket !== undefined &&
                point.total !== undefined)
              .forEach((point: { time_bucket: string; meter_vm_network_receive: any; meter_vm_network_transmit: any; total: any }) => {
                const timestamp = this.convertTimebucket(point.time_bucket);
                totalPoints.push({
                  x: timestamp,
                  y: point.total,
                  additionalData: {
                    total: point.total,
                    transmittedBytes: null,
                    receivedBytes: null
                  }
                });
              });
            const baseColor = baseColors[serverIndex % baseColors.length];
            const totalColor = baseColor;

            if (totalPoints.length > 0) {
              seriesData.push({
                name: `${decodedKey} - Total`,
                data: totalPoints.sort((a, b) => a.x - b.x),
                type: 'line',
                color: totalColor,
                fillOpacity: 0.001,
                lineWidth: 1,
                dashStyle: 'Solid',
                shadow: {
                  color: '#FFC107',
                  width: 1,
                  opacity: 0.1
                }
              });
            }
            serverIndex++;
          }
        }
        this.cachedTotalNetworkTrafficSeries = seriesData;
        this.totalNetworkChartOptions = this.totalNetworkChart(seriesData);
      });
  }

  totalNetworkChart(seriesData: any[]): Highcharts.Options {
    seriesData.forEach(series => {
      series.marker = { radius: 2 };
      series.type = 'line';
    });
  
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
  
    return {
      chart: {
        type: 'line',
        backgroundColor: 'transparent',
        style: { fontFamily: 'Roboto, sans-serif' }
      },
      title: {
        text: undefined,
        align: 'left',
        x: -10,
        style: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '14px'
        }
      },
      credits: { enabled: false },
      exporting: { enabled: false },
      xAxis: {
        type: 'datetime',
        lineColor: labelColor,
        tickColor: labelColor,
        title: {
          text: null,
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '12px'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor:gridColor
      },
      yAxis: {
        tickAmount: 5,
        tickWidth: 0.9,
        lineColor: labelColor,
        tickColor: labelColor,
        title: {
          text: "",
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '8.5px'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor:gridColor
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: tooltipBgColor,
        formatter: function () {
          let content = `<b>Time:</b> ${Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x)}<br/>`;
          this.points?.forEach((p: any) => {
            const info = p.point.additionalData || {};
            let value: any = null;
            if (info.total !== null && info.total !== undefined) value = info.total;
            else if (info.receivedBytes !== null && info.receivedBytes !== undefined) value = info.receivedBytes;
            else if (info.transmittedBytes !== null && info.transmittedBytes !== undefined) value = info.transmittedBytes;
            const formattedValue = (typeof value === 'number') ? value.toFixed(3) : value;
            content += `<b>${p.series.name}:</b> ${formattedValue}<br/>`;
          });
          return content;
        },
        style: {
          whiteSpace: 'nowrap',
          color: tooltipTextColor
        }
      },
      legend: {
        enabled: true,
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        y: -20,
        itemStyle: {
          fontSize: '10px',
          fontWeight: 'normal',
          color: labelColor
        },
        itemHoverStyle: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '10.1px',
          cursor: 'pointer'
        },
        symbolHeight: 6,
        symbolWidth: 6,
        symbolRadius: 2,
        itemMarginTop: 2,
        itemMarginBottom: 2,
        padding: 4,
        itemDistance: 10,
        width: 128,
        maxHeight: 150
      },
      plotOptions: {
        line: {
          marker: { enabled: false, radius: 2 },
          lineWidth: 1,
          states: { hover: { lineWidth: 1.2 } }
        },
        series: { cursor: 'pointer' }
      },
      series: seriesData
    };
  }

  getCpuUsage(): void {
    this.userDetails = sessionStorage.getItem('currentUser') ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!)) : null;
    this.userId = this.userDetails?.userId;
    this.overviewService
      .getServiceDashboardCpuUsage(this.userId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const seriesData = [];
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            const decodedKey = atob(key.split('.')[0]); // Decode IP part
            const cpuPoints = data[key]
              .filter((point: { cpuUsage: undefined; }) => point.cpuUsage !== undefined)
              .map((point: { time_bucket: string; cpuUsage: any; system: any; softirq: any; idle: any; steal: any; irq: any; iowait: any; user: any; nice: any; }) => {
                const timestamp = this.convertTimebucket(point.time_bucket);
                return {
                  x: timestamp,
                  y: point.cpuUsage,
                  additionalInfo: {
                    system: point.system,
                    softirq: point.softirq,
                    idle: point.idle,
                    steal: point.steal,
                    irq: point.irq,
                    iowait: point.iowait,
                    user: point.user,
                    nice: point.nice
                  }
                };
              })
              .sort((a: { x: number; }, b: { x: number; }) => a.x - b.x);

            seriesData.push({
              name: decodedKey,
              data: cpuPoints,
              type: 'line'
            });
          }
        }
        this.cachedCpuUsageSeries= seriesData;
        this.cpuUsageChartOptions = this.cpuUsageChart(seriesData);
      });
  }

  cpuUsageChart(seriesData: any[]): Highcharts.Options {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
  
    seriesData.forEach(series => {
      series.marker = {
        radius: 2
      };
      series.type = 'line';
    });
    return {
      colors: [
        '#5FB3B3', // Soft Teal
        '#A3BE8C', // Muted Green
        '#EBCB8B', // Soft Amber
        '#BF616A', // Muted Red
        '#B48EAD', // Soft Purple
        '#81A1C1', // Dusty Blue
        '#D8DEE9'  // Light Gray
      ],
      chart: {
        type: 'line',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Roboto, sans-serif'
        }
      },
      title: {
        text: undefined,
        align: 'left',
        x: -10,
        style: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '14px'
        }
      },
      xAxis: {
        type: 'datetime',
        lineColor: labelColor,
        tickColor: labelColor,
        title: {
          text: null,
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '12px'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor : gridColor
      },
      yAxis: {
        tickAmount: 5,
        tickWidth: 0.9,
        lineColor: labelColor,
        tickColor: labelColor,
        title: {
          text: "",
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '8.5px'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor : gridColor
      },
      tooltip: {
        shared: false,
        useHTML: true,
        formatter: function (this: Highcharts.Point) {
          const info = (this as any).point?.additionalInfo || {};

          return `
            <b>${this.series.name}</b><br/>
            <b>Time:</b> ${Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x)}</br>
            <b>CPU Usage:</b> ${this.y}<br/>
            <b>System:</b> ${info.system ?? '-'}<br/>
            <b>User:</b> ${info.user ?? '-'}<br/>
            <b>Idle:</b> ${info.idle ?? '-'}<br/>
            <b>Nice:</b> ${info.nice ?? '-'}<br/>
            <b>SoftIRQ:</b> ${info.softirq ?? '-'}<br/>
            <b>IRQ:</b> ${info.irq ?? '-'}<br/>
            <b>IOWait:</b> ${info.iowait ?? '-'}<br/>
            <b>Steal:</b> ${info.steal ?? '-'}
          `;
        },
        backgroundColor: tooltipBgColor,
        style: {
          color: tooltipTextColor,
          whiteSpace: 'nowrap'
        },
      },
      plotOptions: {
        series: {
          cursor: 'pointer',
          point: {
            events: {
              click: function () {
                const infraName = this.series.name;
                const chartComponent = window['angularComponentRef'];
                if (chartComponent) {
                  sessionStorage.setItem('cpuUsageStartTime', chartComponent.component.startTime.toString());
                  sessionStorage.setItem('cpuUsageEndTime', chartComponent.component.endTime.toString());
                  chartComponent.setHostInfraId(infraName);
                  chartComponent.ngZone.run(() => {
                    chartComponent.router.navigate(['/infra/linux-service']);
                  });
                }
              }
            }
          }
        }
      },
      legend: {
        enabled: true,
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        y: -20,
        x: 40,
        itemStyle: {
          fontSize: '10px',
          fontWeight: 'normal',
          color: labelColor,
        },
        itemHoverStyle: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '10.1px',
          cursor: 'pointer'
        },
        symbolHeight: 6,
        symbolWidth: 6,
        symbolRadius: 2,
        itemMarginTop: 2,
        itemMarginBottom: 2,
        padding: 4,
        itemDistance: 10,
        width: 128,
        maxHeight: 150,
      },
      series: seriesData,
      credits: {
        enabled: false
      }
    };
  }

  getMemoryUsage(): void {
    this.userDetails = sessionStorage.getItem('currentUser') ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!)) : null;
    this.userId = this.userDetails?.userId;
    this.overviewService
      .getMemoryUsage(this.userId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const seriesData = [];
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            const decodedKey = atob(key.split('.')[0]);
            const cpuPoints = data[key]
              .filter((point: { meter_vm_memory_used: number; }) => point.meter_vm_memory_used !== 0)
              .map((point: { time_bucket: string; meter_vm_memory_used: any; meter_vm_memory_total: any; meter_vm_memory_available: any; meter_vm_memory_buff_cache: any; }) => {
                const timestamp = this.convertTimebucket(point.time_bucket);
                return {
                  x: timestamp,
                  y: point.meter_vm_memory_used,
                  memodata: {
                    totalMemo: point.meter_vm_memory_total,
                    usedMemo: point.meter_vm_memory_used,
                    availMemo: point.meter_vm_memory_available,
                    cache: point.meter_vm_memory_buff_cache
                  }
                };
              })
              .sort((a: any, b: any) => a.x - b.x);

            seriesData.push({
              name: decodedKey,
              data: cpuPoints,
              type: 'bar'
            });
          }
        }
        this.cachedMemoryusageSeries = seriesData;
        this.memoryUsageChartOptions = this.memoryUsageChart(seriesData);
      });
  }

  memoryUsageChart(seriesData: any[]): Highcharts.Options {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
  
    return {
      colors: [
        '#00B8D9', // Teal blue
        '#36B37E', // Green
        '#FFAB00', // Amber
        '#FF5630', // Red-Orange
        '#6554C0', // Purple
        '#0065FF', // Strong Blue
        '#172B4D'  // Soft dark gray-blue
      ],
      chart: {
        type: 'bar',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Roboto, sans-serif'
        }
      },
      title: {
        text: undefined,
        align: 'left',
        x: -10,
        style: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '14px'
        }
      },
      xAxis: {
        type: 'datetime',
        lineColor: labelColor,
        tickColor: labelColor,
        title: {
          text: null,
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '12px'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor:gridColor
      },
      yAxis: {
        tickAmount: 5,
        tickWidth: 0.9,
        lineColor: labelColor,
        tickColor: labelColor,
        title: {
          text: "",
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '12'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor:gridColor
      },
      tooltip: {
        useHTML: true,
        shared: false,
        backgroundColor: tooltipBgColor,
        style: {
          color: tooltipTextColor,
          whiteSpace: 'nowrap'
        },
        formatter: function (this: Highcharts.Point) {
          const info = (this as any).point?.memodata || {};
          return `
            <b>${this.series.name}</b><br/>
            <b>Time:</b> ${Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x)}<br/>
            <b>Total Memory:</b> ${info.totalMemo ?? '-'}<br/>
            <b>Used Memory:</b> ${this.y}<br/>
            <b>Available Memory:</b> ${info.availMemo ?? '-'}<br/>
            <b>Cache:</b> ${info.cache ?? '-'}<br/>
          `;
        }
      },
      plotOptions: {
        series: {
          cursor: 'pointer',
          point: {
            events: {
              click: function () {
                const infraName = this.series.name;
                const chartComponent = window['angularComponentRef'];
                if (chartComponent) {
                  sessionStorage.setItem('memoUsageStartTime', chartComponent.component.startTime.toString());
                  sessionStorage.setItem('memoUsageEndTime', chartComponent.component.endTime.toString());
                  chartComponent.setHostInfraId(infraName);
                  chartComponent.ngZone.run(() => {
                    chartComponent.router.navigate(['/linux-service']);
                  });
                }
              }
            }
          }
        },
        bar: {
          pointWidth: 0.1,
          borderRadius: 0.5,
          borderWidth: 0,
          borderColor: 'transparent'
        }
      },
      legend: {
        enabled: true,
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        y: -20,
        x: 40,
        itemStyle: {
          fontSize: '10px',
          fontWeight: 'normal',
          color: labelColor,
        },
        itemHoverStyle: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '10.1px',
          cursor: 'pointer'
        },
        symbolHeight: 6,
        symbolWidth: 6,
        symbolRadius: 2,
        itemMarginTop: 2,
        itemMarginBottom: 2,
        padding: 4,
        itemDistance: 10,
        width: 128,
        maxHeight: 150,
      },
      series: seriesData,
      credits: {
        enabled: false
      },
      exporting: {
        enabled: false
      },
    };
  }

  getDiskUsage(): void {
    this.userDetails = sessionStorage.getItem('currentUser') ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!)) : null;
    this.userId = this.userDetails?.userId;
    this.overviewService
      .getDiskUsage(this.userId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const seriesData = [];
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            const decodedKey = atob(key.split('.')[0]);
            const diskPoints = data[key]
              .filter((point: { [x: string]: undefined; }) => point['/'] !== undefined)
              .map((point: { [x: string]: any; time_bucket: string; }) => {
                const timestamp = this.convertTimebucket(point.time_bucket);
                return {
                  x: timestamp,
                  y: point['/'],
                  diskData: {
                    part1: point['/'],
                    part2: point['/run'],
                    part3: point['/run/lock'],
                    part4: point['/run/user/1000'],
                    part5: point['/run/user/1001']
                  }
                };
              })
              .sort((a: any, b: any) => a.x - b.x);

            seriesData.push({
              name: decodedKey,
              data: diskPoints,
              type: 'column'
            });
          }
        }
        this.cachedDiskusageSeries = seriesData;
        this.diskUsageChartOptions = this.diskUsageChart(seriesData);
      });
  }

  diskUsageChart(seriesData: any[]): Highcharts.Options {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
    
    return {
      colors: [
        '#00B8D9', // Teal blue
        '#36B37E', // Green
        '#FFAB00', // Amber
        '#FF5630', // Red-Orange
        '#6554C0', // Purple
        '#0065FF', // Strong Blue
        '#172B4D'  // Soft dark gray-blue
      ],
      chart: {
        type: 'column',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Roboto, sans-serif'
        }
      },
      title: {
        text: undefined,
        align: 'left',
        x: -10,
        style: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '14px'
        }
      },
      xAxis: {
        lineColor: labelColor,
        tickColor: labelColor,
        tickAmount: 10,
        tickWidth: 0.2,
        type: 'datetime',
        title: {
          text: null,
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '12px'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor : gridColor
      },
      yAxis: {
        tickAmount: 5,
        tickWidth: 0,
        lineColor: labelColor,
        tickColor: labelColor,
        title: {
          text: "",
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '12'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor : gridColor
      },
      tooltip: {
        useHTML: true,
        backgroundColor : tooltipBgColor,
        style : {
          color : tooltipTextColor,
          whiteSpace : 'nowrap'
        },
        formatter: function (this: Highcharts.Point) {
          const info = (this as any).point?.diskData || {};
          return `
            <b>${this.series.name}</b><br/>
            <b>Time:</b> ${Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x)}<br/>
            <b>/:</b> ${this.y}<br/>
            <b>/run:</b> ${info.part2 ?? '-'}<br/>
            <b>/run/lock:</b> ${info.part3 ?? '-'}<br/>
            <b>/run/user/1000:</b> ${info.part4 ?? '-'}<br/>
            <b>/run/user/1001:</b> ${info.part5 ?? '-'}<br/>
          `;
        }
      },
      legend: {
        enabled: true,
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        y: -20,
        x: 40,
        itemStyle: {
          fontSize: '10px',
          fontWeight: 'normal',
          color: labelColor,
        },
        itemHoverStyle: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '10.1px',
          cursor: 'pointer'
        },
        symbolHeight: 6,
        symbolWidth: 6,
        symbolRadius: 2,
        itemMarginTop: 2,
        itemMarginBottom: 2,
        padding: 4,
        itemDistance: 10,
        width: 128,
        maxHeight: 150,
      },
      plotOptions: {
        series: {
          cursor: 'pointer',
          point: {
            events: {
              click: (event)=> {
                const fullSeriesName = event.point.series.name;
                const tabName = 'overview';
                this.chartClickHandlerHost(fullSeriesName,this.startTime,this.endTime,tabName);
              }
            }
          }
        },
        column: {
          pointWidth: 0.1,
          borderRadius: 1,
          borderWidth: 0,
          borderColor: 'transparent'
        }
      },
      series: seriesData,
      credits: {
        enabled: false
      }
    };
  }

  getNetworkTraffic(): void {
    this.userDetails = sessionStorage.getItem('currentUser')
      ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!))
      : null;
    this.userId = this.userDetails?.userId;
    const host = 'linux';
    this.overviewService
      .getTotalNetworkTraffic(this.userId, this.startTime, this.endTime, host).pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const baseColors = [
          '#47CEB7', // Bright Blue
          '#4CAF50', // Bright Green
          '#FFEB3B', // Bright Yellow
          '#FF9800', // Bright Orange
          '#F44336'  // Light Red 
        ];
        const totalColor = ['#FFC107'];
        let serverIndex = 0;
        const seriesData = [];
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            const decodedKey = atob(key.split('.')[0]);
            const receivedPoints: { x: number; y: any; additionalData: { total: null; receivedBytes: any; transmittedBytes: null; }; }[] = [];
            const transmittedPoints: { x: number; y: any; additionalData: { total: null; transmittedBytes: any; receivedBytes: null; }; }[] = [];
            const totalPoints: { x: number; y: any; additionalData: { total: any; transmittedBytes: null; receivedBytes: null; }; }[] = [];
            data[key]
              .filter((point: { meter_vm_network_receive: undefined; meter_vm_network_transmit: undefined; total: undefined; time_bucket: undefined; }) => point.meter_vm_network_receive !== undefined &&
                point.meter_vm_network_transmit !== undefined &&
                point.time_bucket !== undefined &&
                point.total !== undefined)
              .forEach((point: { time_bucket: string; meter_vm_network_receive: any; meter_vm_network_transmit: any; total: any }) => {
                const timestamp = this.convertTimebucket(point.time_bucket);
                receivedPoints.push({
                  x: timestamp,
                  y: point.meter_vm_network_receive,
                  additionalData: {
                    total: null,
                    receivedBytes: point.meter_vm_network_receive,
                    transmittedBytes: null
                  }
                });

                transmittedPoints.push({
                  x: timestamp,
                  y: point.meter_vm_network_transmit,
                  additionalData: {
                    total: null,
                    transmittedBytes: point.meter_vm_network_transmit,
                    receivedBytes: null
                  }
                });
                totalPoints.push({
                  x: timestamp,
                  y: point.total,
                  additionalData: {
                    total: point.total,
                    transmittedBytes: null,
                    receivedBytes: null
                  }
                });
              });
            const baseColor = baseColors[serverIndex % baseColors.length];
            const receivedColor = this.darkenColor(baseColor, 20);
            const transmittedColor = baseColor;

            if (totalPoints.length > 0) {
              seriesData.push({
                name: `${decodedKey} - Total`,
                data: totalPoints.sort((a, b) => a.x - b.x),
                type: 'area',
                color: totalColor[0],
                fillOpacity: 0.001,
                lineWidth: 1,
                dashStyle: 'Solid',
                shadow: {
                  color: '#FFC107',
                  width: 1,
                  opacity: 0.1
                }
              });
              if (transmittedPoints.length > 0) {
                seriesData.push({
                  name: `${decodedKey} - Transmitted`,
                  data: transmittedPoints.sort((a, b) => a.x - b.x),
                  type: 'area',
                  color: transmittedColor
                });

                if (receivedPoints.length > 0) {
                  seriesData.push({
                    name: `${decodedKey} - Received`,
                    data: receivedPoints.sort((a, b) => a.x - b.x),
                    type: 'area',
                    color: receivedColor
                  });
                }
              }
            }
            serverIndex++;
          }
        }
        this.cachedNetworkTrafficSeries = seriesData;
        this.networkTrafficChartOptions = this.networkTrafficChart(seriesData);
      });
  }

  networkTrafficChart(seriesData: any[]): Highcharts.Options {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
  
    seriesData.forEach(series => {
      series.marker = { radius: 1 };
    });
  
    return {
      chart: {
        type: 'area',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Roboto, sans-serif'
        }
      },
      title: {
        text: undefined,
        align: 'left',
        x: -10,
        style: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '14px'
        }
      },
      credits: { enabled: false },
      exporting: { enabled: false },
      xAxis: {
        type: 'datetime',
        tickColor: labelColor,
        lineColor: labelColor,
        title: { text: null },
        labels: {
          style: { color: labelColor, fontSize: '8.5px' }
        },
        gridLineColor: gridColor
      },
      yAxis: {
        tickAmount: 5,
        tickWidth: 0.9,
        lineColor: labelColor,
        tickColor: labelColor,
        title: { text: "" },
        labels: {
          style: { color: labelColor, fontSize: '8.5px' }
        },
        gridLineColor: gridColor
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: tooltipBgColor,
        style: {
          color: tooltipTextColor,
          whiteSpace: 'nowrap'
        },
        formatter: function () {
          let content = `<b>Time:</b> ${Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x)}<br/>`;
          this.points?.forEach((p: any) => {
            const info = p.point.additionalData || {};
            let value: any = null;
            if (info.total != null) value = info.total;
            else if (info.receivedBytes != null) value = info.receivedBytes;
            else if (info.transmittedBytes != null) value = info.transmittedBytes;
  
            const formatted = typeof value === 'number' ? value.toFixed(3) : value;
            content += `<b>${p.series.name}:</b> ${formatted}<br/>`;
          });
          return content;
        }
      },
      legend: {
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        y: -20,
        x: 10,
        itemStyle: {
          fontSize: '10px',
          fontWeight: 'normal',
          color: labelColor
        },
        itemHoverStyle: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '10.1px',
          cursor: 'pointer'
        },
        symbolHeight: 6,
        symbolWidth: 6,
        symbolRadius: 2,
        itemMarginTop: 2,
        itemMarginBottom: 2,
        padding: 4,
        itemDistance: 10,
        width: 128,
        maxHeight: 150,
      },
      plotOptions: {
        area: {
          stacking: undefined,
          fillOpacity: 0.2,
          marker: { enabled: false, radius: 2 },
          lineWidth: 1,
          states: { hover: { lineWidth: 1 } },
          threshold: 0
        },
        series: { cursor: 'pointer' }
      },
      series: seriesData
    };
  }

  getServiceEndpointError(): void {
    this.userDetails = sessionStorage.getItem('currentUser') ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!)) : null;
    this.userId = this.userDetails?.userId;
    this.overviewService.getServiceEndpointError(this.userId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const seriesData = [];
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const decodedKey = atob(key.split('.')[0]);
          const errorPoints = data[key]
            .filter((point: { error_count: undefined; time_bucket: string | undefined; }) => point.error_count !== undefined && point.time_bucket !== undefined
              && !isNaN(this.convertTimebucket(point.time_bucket))
            )
            .map((point: { time_bucket: string; error_count: any; }) => {
              const timestamp = this.convertTimebucket(point.time_bucket);
              return {
                x: timestamp,
                y: point.error_count,
                serError: {
                  error: point.error_count
                }
              };
            })
            .sort((a: { x: number; }, b: { x: number; }) => a.x - b.x);

          if (errorPoints.length > 0) {
            seriesData.push({
              name: decodedKey,
              data: errorPoints,
              type: 'line'
            });
          }
        }
      }
      this.cachedServiceEndpointSeries = seriesData;
      this.serviceEndpointErrorChartOptions = this.serviceErrorChart(seriesData);
    });
  }

  serviceErrorChart(seriesData: any[]): Highcharts.Options {
    seriesData.forEach(series => {
      series.marker = {
        radius: 1
      };
    });

    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

    return {
      colors: ['#47CEB7', // Bright Blue
        '#4CAF50', // Bright Green
        '#FFEB3B', // Bright Yellow
        '#FF9800', // Bright Orange
        '#F44336'], // Light Red
      chart: {
        type: 'line',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Roboto, sans-serif'
        }
      },
      title: {
        text: undefined,
        align : 'left',
        x:-10,
        style: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '14px'
        }
      },
      xAxis: {
        lineColor: labelColor,
        tickColor: labelColor,
        type: 'datetime',
        title: {
          text: null,
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '12'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor : gridColor
      },
      yAxis: {
        tickAmount: 6,
        lineColor: labelColor,
        tickColor: labelColor,
        title: {
          text: "",
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '12'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor : gridColor
      },
      tooltip: {
        useHTML: true,
        formatter: function (this: Highcharts.Point) {
          const info = (this as any).point?.serError || {};
          return `
            <b>${this.series.name}</b><br/>
            <b>Time:</b> ${Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x)}<br/>
            <b>Error Counts: </b> ${info.error ?? '-'}<br/>
          `;
        },
        backgroundColor : tooltipBgColor,
        style: {
          color : tooltipTextColor,
          whiteSpace: 'nowrap'
        },
      },
      legend: {
        enabled: true,
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        y: -20,
        x: 10,
        itemStyle: {
          fontSize: '10px',
          fontWeight: 'normal',
          color: labelColor,
        },
        itemHoverStyle: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '10.1px',
          cursor: 'pointer'
        },
        symbolHeight: 6,
        symbolWidth: 6,
        symbolRadius: 2,
        itemMarginTop: 2,
        itemMarginBottom: 2,
        padding: 2,
        itemDistance: 10,
        width: 128,
        maxHeight: 150,
      },
      plotOptions: {
        series: {
          cursor: 'pointer',
          point: {
              events: {
              click: (event) => {
                const fullSeriesName = event.point.series.name;
                const tabName = 'trace';
                this.chartClickHandler(fullSeriesName,this.startTime,this.endTime,tabName);
              }
            }
          }
        },
      },
      series: seriesData,
      credits: {
        enabled: false
      }
    };
  }

  getLogsError(): void {
    this.userDetails = sessionStorage.getItem('currentUser')
      ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!))
      : null;
    this.userId = this.userDetails?.userId;
  
    this.overviewService.getServiceLogError(this.userId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const timeBuckets: string[] = [];
      const services: string[] = [];
      const heatmapData: [number, number, number][] = [];
  
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const decodedKey = atob(key.split('.')[0]);
          if (!services.includes(decodedKey)) {
            services.push(decodedKey);
          }
  
          data[key].forEach((point: { error_logCount: number; time_bucket: string; }) => {
            if (point.error_logCount !== undefined && point.time_bucket !== undefined) {
              if (!timeBuckets.includes(point.time_bucket)) {
                timeBuckets.push(point.time_bucket);
              }
            }
          });
        }
      }
  
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const decodedKey = atob(key.split('.')[0]);
          const yIdx = services.indexOf(decodedKey);
          if (yIdx === -1) continue;
  
          data[key].forEach((point: { error_logCount: number; time_bucket: string; }) => {
            const xIdx = timeBuckets.indexOf(point.time_bucket);
            if (xIdx === -1) return;
  
            heatmapData.push([xIdx, yIdx, point.error_logCount]);
          });
        }
      }
  
      this.logsErrorChartOptions = this.serviceLogsErrorHeatmap(heatmapData, timeBuckets, services);
    });
  }

  serviceLogsErrorHeatmap(
    heatmapData: [number, number, number][],
    timeBuckets: string[],
    services: string[]
  ): Highcharts.Options {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
  
    return {
      chart: {
        type: 'heatmap',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Roboto, sans-serif'
        }
      },
      title: {
        text: undefined,
        align: 'left',
        x: -10,
        style: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '14px'
        }
      },
      xAxis: {
        categories: timeBuckets,
        title: {
          text: 'Time Buckets',
          style: {
            color: labelColor
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor: gridColor
      },
      yAxis: {
        categories: services,
        title: {
          text: 'Services',
          style: {
            color: labelColor
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor: gridColor
      },
      colorAxis: {
        min: 0,
        minColor: '#FFFFFF',
        maxColor: '#F44336'
      },
      legend: {
        align: 'right',
        layout: 'vertical',
        margin: 0,
        verticalAlign: 'middle',
        symbolHeight: 200
      },
      tooltip: {
        useHTML: true,
        backgroundColor: tooltipBgColor,
        style: {
          color: tooltipTextColor
        },
        formatter: function (this: Highcharts.Point) {
          const point = this as any;
          const series = this.series;
      
          return `
            <b>Service:</b> ${series.yAxis?.categories[point.y]}<br/>
            <b>Time:</b> ${series.xAxis?.categories[point.x]}<br/>
            <b>Error Count:</b> ${point.value}
          `;
        }
      },
      series: [{
        type: 'heatmap',
        name: 'Error Count',
        borderWidth: 1,
        data: heatmapData,
        dataLabels: {
          enabled: false
        }
      }],
      credits: {
        enabled: false
      }
    };
  }

  getSlowDBQueries(): void {
    this.userDetails = sessionStorage.getItem('currentUser') ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!)) : null;
    this.userId = this.userDetails?.userId;
    this.overviewService
      .getSlowStatementByDBLatency(this.userId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const seriesData: CustomSeriesOptions[] = [];
        for (const outerKey in data) {
          if (data.hasOwnProperty(outerKey)) {
            const outerBase = outerKey.split('.')[0];
            const decodedOuterKey = atob(outerBase);
            const innerData = data[outerKey];

            for (const innerKey in innerData) {
              if (innerData.hasOwnProperty(innerKey)) {
                const innerBase = innerKey.split('.')[0];
                const decodedInnerKey = atob(innerBase);

                const slowDBPoints = innerData[innerKey]
                  .filter((point: { latency: undefined; time_bucket: undefined; trace_id: undefined; statement: undefined; }) =>
                    point.latency !== undefined &&
                    point.time_bucket !== undefined &&
                    point.trace_id !== undefined &&
                    point.statement !== undefined
                  )
                  .map((point: { time_bucket: string; latency: any; statement: any; }) => {
                    const timestamp = this.convertTimebucket(point.time_bucket);
                    return {
                      x: timestamp,
                      y: point.latency,
                      slowDBInfo: {
                        dbLatency: point.latency,
                        query: point.statement
                      }
                    };
                  })
                  .sort((a: { x: number; }, b: { x: number; }) => a.x - b.x);

                seriesData.push({
                  name: decodedInnerKey,
                  data: slowDBPoints,
                  type: 'column',
                  decodedOuterKey: decodedOuterKey
                });
              }
            }
          }
        }
        this.cachedSlowDBSeries = seriesData;
        this.slowDBQueriesChartOptions = this.dbQueriesChart(seriesData);
      });
  }

  dbQueriesChart(seriesData: any[]): Highcharts.Options {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

    return {
      colors: ['#47CEB7', // Bright Blue
        '#4CAF50', // Bright Green
        '#FFEB3B', // Bright Yellow
        '#FF9800', // Bright Orange
        '#F44336'], // Light Red     
      chart: {
        type: 'column',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Roboto, sans-serif'
        }
      },
      title: {
        text: undefined,
        align: 'left',
        x: -10,
        style: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '14px'
        }
      },
      xAxis: {
        lineColor: labelColor,
        tickColor: labelColor,
        type: 'datetime',
        title: {
          text: null,
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '12'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor : gridColor
      },
      yAxis: {
        tickAmount: 6,
        lineColor: labelColor,
        tickColor: labelColor,
        title: {
          text: "",
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '12'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor : gridColor
      },
      tooltip: {
        backgroundColor : tooltipBgColor,
        style : {
          color : tooltipTextColor,
          whiteSpace : 'nowrap',
        },
        useHTML: true,
        formatter: function (this: Highcharts.Point) {
          return `
            <b>${this.series.name}</b><br/>
            <b>Time:</b> ${Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x)}<br/>
            <b>DB Latency</b> ${this.y}<br/>
          `;
        }
      },
      legend: {
        enabled: true,
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        y: -20,
        x: 40,
        itemStyle: {
          fontSize: '10px',
          fontWeight: 'normal',
          color: labelColor,
        },
        itemHoverStyle: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '10.1px',
          cursor: 'pointer'
        },
        symbolHeight: 6,
        symbolWidth: 6,
        symbolRadius: 2,
        itemMarginTop: 2,
        itemMarginBottom: 2,
        padding: 4,
        itemDistance: 10,
        width: 128,
        maxHeight: 150,
      },
      plotOptions: {
        series: {
          cursor: 'pointer',
          point: {
            events: {
              click: (event) => {
                const seriesOptions = event.point.series.options as CustomSeriesOptions;
                const decodedDbName: string = seriesOptions.decodedOuterKey;
                const tabName = 'db';
                this.chartClickHandlerDb(decodedDbName, this.startTime, this.endTime, tabName);
              }
            }
          }
        }
      },
      series: seriesData,
      credits: {
        enabled: false
      }
    };
  }

  getFeatureFlow(): void {
    this.userDetails = sessionStorage.getItem('currentUser') ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!)) : null;
    this.userId = this.userDetails?.userId;
    this.overviewService.getFeatureFlow(this.userId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const seriesData = [];
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const decodedKey = key;
          const featureFlowPoints = data[key]
            .filter((point: { step_order: undefined; stepName: undefined; }) => point.step_order !== undefined && point.stepName !== undefined)
            .map((point: { step_order: any; latency: any; success_rate: number; stepName: any; application_name: any; endpoint_load: any; total_hits: any; }) => {
              return {
                x: point.step_order,
                y: point.latency,
                marker: {
                  fillColor: point.success_rate < 100 ? '#780000' : '#FFFFFF',
                  lineColor: point.success_rate < 100 ? '#fb8500' : '#219ebc',
                  lineWidth: 1,
                  radius: 2.5,
                  symbol: 'circle',
                  enabled: true
                },
                featureFlow: {
                  step_order: point.step_order,
                  stepName: point.stepName,
                  application_name: point.application_name,
                  endpoint_load: point.endpoint_load,
                  total_hits: point.total_hits,
                  latency: point.latency,
                  success_rate: point.success_rate
                }
              };
            })
            .sort((a: { x: number; }, b: { x: number; }) => a.x - b.x);

          if (featureFlowPoints.length > 0) {
            seriesData.push({
              name: decodedKey,
              data: featureFlowPoints,
              type: 'spline'
            });
          }
        }
      }
      this.cachedCriticalFlowSeries = seriesData;
      this.criticalFlowChartOptions = this.criticalFlowChart(seriesData);
    });
  }

  criticalFlowChart(seriesData: any[]): Highcharts.Options {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

    return {
      colors: ['#47CEB7', // Bright Blue
        '#4CAF50', // Bright Green
        '#FFEB3B', // Bright Yellow
        '#FF9800', // Bright Orange
        '#F44336'], // Light Red   
      chart: {
        type: 'spline',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Roboto,sans-serif'
        }
      },
      title: {
        text: undefined,
        align: 'left',
        x: -10,
        style: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '14px'
        }
      },
      xAxis: {
        lineColor: labelColor,
        tickColor: labelColor,
        type: 'category',
        title: {
          text: null,
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '12'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor : gridColor
      },
      yAxis: {
        lineColor: labelColor,
        tickColor: labelColor,
        tickAmount: 6,
        title: {
          text: "",
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '12'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor : gridColor
      },
      tooltip: {
        useHTML: true,
        backgroundColor : tooltipBgColor,
        style:{
          color : tooltipTextColor,
          whiteSpace : 'nowrap'
        },
        formatter: function (this: Highcharts.Point) {
          const info = (this as any).point?.featureFlow || {};
          return `
            <b>${this.series.name}</b><br/>
            <b>Step: </b> ${info.step_order ?? '-'}<br/>
            <b>Step Name: </b> ${info.stepName ?? '-'}<br/>
            <b>Application Name: </b> ${info.application_name ?? '-'}<br/>
            <b>Endpoint Load: </b> ${info.endpoint_load ?? '-'}<br/>
            <b>Total Hits: </b> ${info.total_hits ?? '-'}<br/>
            <b>Latency: </b> ${info.latency ?? '-'}<br/>
            <b>Success Rate: </b> ${info.success_rate ?? '-'}<br/>
          `;
        }
      },
      legend: {
        enabled: true,
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        y: -20,
        x: 40,
        itemStyle: {
          fontSize: '10px',
          fontWeight: 'normal',
          color: labelColor,
        },
        itemHoverStyle: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '10.1px',
          cursor: 'pointer'
        },
        symbolHeight: 6,
        symbolWidth: 6,
        symbolRadius: 2,
        itemMarginTop: 2,
        itemMarginBottom: 2,
        padding: 4,
        itemDistance: 10,
        width: 128,
        maxHeight: 150,
      },
      plotOptions: {
        series: {
          cursor: 'pointer',
          point: {
            events: {
              click: function () {
                const serviceName = this.series.name;
                const chartComponent = window['angularComponentRef'];
                if (chartComponent) {
                }
              }
            }
          }
        }
      },
      series: seriesData,
      credits: {
        enabled: false
      }
    };
  }

  getApplicationLatency(): void {
    this.userDetails = sessionStorage.getItem('currentUser') ? <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!)) : null;
    this.userId = this.userDetails?.userId;
    this.overviewService
      .getApplicationLatency(this.userId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const seriesData = [];
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            const decodedAppName = atob(key.split('.')[0]);
            const latencyPoints = data[key]
              .filter((point: { latency: undefined; time_bucket: undefined; }) => point.latency !== undefined && point.time_bucket !== undefined)
              .map((point: { time_bucket: string; latency: any; }) => {
                const timestamp = this.convertTimebucket(point.time_bucket);
                return {
                  x: timestamp,
                  y: point.latency,
                  latencyInfo: {
                    latency: point.latency
                  }
                };
              })
              .sort((a: { x: number; }, b: { x: number; }) => a.x - b.x);

            seriesData.push({
              name: decodedAppName,
              data: latencyPoints,
              type: 'line'
            });
          }
        }
        this.cachedApplicationLatencySeries = seriesData;
        this.applicationLatencyChartOptions = this.applicationLatencyChart(seriesData);
      });
  }

  applicationLatencyChart(seriesData: any[]): Highcharts.Options {
    seriesData.forEach(series => {
      series.marker = {
        radius: 2
      };
    });

    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

    return {
      colors: ['#47CEB7', // Bright Blue
        '#4CAF50', // Bright Green
        '#FFEB3B', // Bright Yellow
        '#FF9800', // Bright Orange
        '#F44336'], // Light Red
      chart: {
        type: 'line',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Roboto,sans-serif'
        }
      },
      title: {
        text: undefined,
        align: 'left',
        x: -10,
        style: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '14px'
        }
      },
      xAxis: {
        lineColor: labelColor,
        tickColor: labelColor,
        type: 'datetime',
        title: {
          text: null,
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '12'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor : gridColor
      },
      yAxis: {
        tickAmount: 6,
        lineColor: labelColor,
        tickColor: labelColor,
        title: {
          text: "",
          style: {
            color: labelColor,
            fontWeight: 'normal',
            fontSize: '12'
          }
        },
        labels: {
          style: {
            color: labelColor,
            fontSize: '8.5px'
          }
        },
        gridLineColor : gridColor
      },
      tooltip: {
        useHTML: true,
        backgroundColor : tooltipBgColor,
        style : {
          color : tooltipTextColor,
          whiteSpace : 'nowrap',
        },
        formatter: function (this: Highcharts.Point) {
          return `
            <b>${this.series.name}</b><br/>
            <b>Time:</b> ${Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x)}<br/>
            <b>Latency:</b> ${this.y}<br/>
          `;
        }
      },
      legend: {
        enabled: true,
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        y: -20,
        x: 10,
        itemStyle: {
          fontSize: '10px',
          fontWeight: 'normal',
          color: labelColor,
        },
        itemHoverStyle: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '10.1px',
          cursor: 'pointer'
        },
        symbolHeight: 6,
        symbolWidth: 6,
        symbolRadius: 2,
        itemMarginTop: 2,
        itemMarginBottom: 2,
        padding: 4,
        itemDistance: 10,
        width: 128,
        maxHeight: 150,
      },
      plotOptions: {
        series: {
          cursor: 'pointer',
          point: {
            events: {
              click: (event) => {
                const fullSeriesName = event.point.series.name;
                const tabName = 'overview';
                this.chartClickHandler(fullSeriesName,this.startTime,this.endTime,tabName);
              }
            }
          }
        }
      },
      series: seriesData,
      credits: {
        enabled: false
      }
    };
  }

  getHexChartConfig(
    data: HexTileData[],
    title: string,
    healthConfig: any,
    containerHeight: number,
    containerWidth: number
  ): Highcharts.Options {
    const tileCount = data.length;
    const hexHeightFactor = Math.sqrt(3) / 2;
  
    let bestCols = 1, bestRows = 1;
  
    if (tileCount === 1) {
      bestCols = 1; bestRows = 1;
    } else if (tileCount === 2) {
      bestCols = 2; bestRows = 1;
    } else if (tileCount === 3) {
      bestCols = 2; bestRows = 2;
    } else if (tileCount === 4) {
      bestCols = 2; bestRows = 2;
    } else if (tileCount === 5) {
      bestCols = 3; bestRows = 2;
    } else {
      bestCols = Math.ceil(Math.sqrt(tileCount));
      bestRows = Math.ceil(tileCount / bestCols);
    }
  
    const tileSizeByWidth = containerWidth / (bestCols + 0.5);
    const tileSizeByHeight = containerHeight / (bestRows * hexHeightFactor + 0.5);
    const tileSize = Math.min(tileSizeByWidth, tileSizeByHeight);
  
    const positionedData = data.map((point, index) => {
      const col = index % bestCols;
      const row = Math.floor(index / bestCols);
      return {
        ...point,
        x: col,
        y: -row
      };
    });
  
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim() || '#fff';
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim() || '#222';
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim() || '#fff';
  
    return {
      chart: {
        type: 'tilemap',
        backgroundColor: 'transparent',
        height: containerHeight,
        width: containerWidth,
        plotBorderWidth: 0,
        style: {
          fontFamily: 'Roboto, sans-serif'
        }
      },
      title: {
        text: title,
        align: 'left',
        style: {
          color: labelColor,
          fontWeight: 'bold',
          fontSize: '14px'
        }
      },
      xAxis: { visible: false },
      yAxis: { visible: false },
      colorAxis: {
        min: 0,
        max: 100,
        stops: [
          [0, '#F44336'],
          [0.5, '#d9d909'],
          [1, '#4CAF50']
        ],
        labels: { enabled: false }
      } as Highcharts.ColorAxisOptions,
      legend: { enabled: false },
      plotOptions: {
        tilemap: {
          borderWidth: 0,
          borderColor: '#1f2a3a',
          tileShape: 'hexagon',
          dataLabels: {
            enabled: true,
            color: labelColor,
            style: {
              color: labelColor,
              textOutline: 'none',
              fontWeight: 'bold'
            }
          },
          pointPadding: 1,
          states: { hover: { enabled: true } }
        }
      },
      tooltip: {
        headerFormat: '',
        backgroundColor: tooltipBgColor,
        pointFormatter: function () {
          const val = this.value ?? 0;
          let status = 'Unknown';
          if (val <= 25) status = 'Critical';
          else if (val <= 50) status = 'Poor';
          else if (val <= 75) status = 'Moderate';
          else status = 'Good';
          return `<b>${this.name}</b><br>Status: <b>${status}</b><br>Health: ${val}%`;
        },
        style: {
          color: tooltipTextColor,
          whiteSpace: 'nowrap'
        }
      },
      series: [
        {
          type: 'tilemap',
          name: healthConfig.seriesName,
          tileShape: 'hexagon',
          data: positionedData
        } as Highcharts.SeriesTilemapOptions
      ],
      credits: { enabled: false },
      exporting: { enabled: false },
      navigation: {
        buttonOptions: {
          enabled: true,
          height: 22,
          width: 20,
          symbolSize: 10,
          symbolX: 10,
          symbolY: 13,
          symbolStrokeWidth: 1,
          buttonSpacing: 10
        }
      },
    };
  }
  
  getLineChartConfig(data: number[], label: string, title: string, height: number): Highcharts.Options {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim() || '#fff';
  
    return {
      chart: {
        type: 'line',
        height: height,
        backgroundColor: '',
      },
      title: {
        text: 'Web App Requests /min',
        align: 'left',
        style: {
          color: labelColor,
          fontSize: '14px',
          fontWeight: 'bold'
        }
      },
      xAxis: {
        categories: data.map((_, i) => `T-${data.length - i}`),
        labels: {
          style: {
            color: '#a0a9b8',
            fontSize: '10px',
            fontFamily: 'netraa'
          }
        },
        lineColor: '#ffffff',
        tickColor: '#ffffff',
        gridLineColor: '#2a3a4a'
      },
      yAxis: {
        lineColor: '#ffffff',
        tickColor: '#ffffff',
        labels: {
          style: {
            color: '#a0a9b8',
            fontSize: '10px',
            fontFamily: 'netraa'
          }
        },
        gridLineColor: '#2a3a4a',
        min: 0
      },
      legend: {
        enabled: false,
        align: 'center',
        verticalAlign: 'top',
        layout: 'horizontal'
      },
      tooltip: {
        shared: true,
        valueSuffix: ''
      },
      series: [
        {
          name: label,
          data: data,
          type: 'line',
          color: 'rgb(71, 206, 183)',
          lineWidth: 1,
          marker: {
            radius: 1.5,
            fillColor: 'white',
            lineColor: '#ffffff',
            lineWidth: 1
          },
        }
      ],
      credits: { enabled: false },
      plotOptions: {
        series: {
          marker: {
            enabled: true
          },
          lineWidth: 1
        }
      },
      exporting: {
        enabled: true,
      },
      navigation: {
        buttonOptions: {
          enabled: true,
          height: 18,
          width: 20,
          symbolSize: 10,
          symbolX: 10,
          symbolY: 9,
          symbolStrokeWidth: 1,
          buttonSpacing: 10
        }
      },
    };
  }

  convertTimebucket(timebucket: string) {
    timebucket = timebucket.toString();
    const year = parseInt(timebucket.slice(0, 4), 10);
    const month = parseInt(timebucket.slice(4, 6), 10) - 1;
    const day = parseInt(timebucket.slice(6, 8), 10);
    const hour = parseInt(timebucket.slice(8, 10), 10);
    const minute = parseInt(timebucket.slice(10, 12), 10);
    const date = new Date(Date.UTC(year, month, day, hour, minute));
    return date.getTime();
  }

  darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    let r = (num >> 16) - Math.round(2.55 * percent);
    let g = ((num >> 8) & 0x00FF) - Math.round(2.55 * percent);
    let b = (num & 0x0000FF) - Math.round(2.55 * percent);

    r = Math.max(0, r);
    g = Math.max(0, g);
    b = Math.max(0, b);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b)
      .toString(16)
      .slice(1)
      .toUpperCase()}`;
  }

  chartClickHandler(fullSeriesName: string, startTime: number, endTime: number,tabName: string) {
    this.sharedService.setServiceId(fullSeriesName);    
    sessionStorage.setItem('traceStartTime', startTime.toString());
    sessionStorage.setItem('traceEndTime', endTime.toString());
    sessionStorage.setItem('selectedTab', tabName); 
  
    this.router.navigate(['/service-page/general-service']);
  } 
  
  chartClickHandlerHost(fullSeriesName: string, startTime: number, endTime: number,tabName: string) {
    this.sharedService.setServiceId(fullSeriesName);    
    sessionStorage.setItem('traceStartTime', startTime.toString());
    sessionStorage.setItem('traceEndTime', endTime.toString());
    sessionStorage.setItem('selectedTab', tabName); 
  
    this.router.navigate(['/infra/linux-service']);
  } 
  
  chartClickHandlerDb(decodedDbName: string, startTime: number, endTime: number,tabName: string) {
    this.sharedService.setServiceId(decodedDbName);    
    sessionStorage.setItem('traceStartTime', startTime.toString());
    sessionStorage.setItem('traceEndTime', endTime.toString());
    sessionStorage.setItem('selectedTab', tabName); 
  
    this.router.navigate(['/service-page/general-service']);
  }

  observeThemeChange(): void {
    this.themeObserver = new MutationObserver(() => {
      requestAnimationFrame(() => {
        if (this.cachedNetworkTrafficSeries.length > 0) {
          this.networkTrafficChartOptions = this.networkTrafficChart(this.cachedNetworkTrafficSeries);
          this.totalNetworkChartOptions = this.totalNetworkChart(this.cachedTotalNetworkTrafficSeries);
          this.memoryUsageChartOptions = this.memoryUsageChart(this.cachedMemoryusageSeries);
          this.cpuUsageChartOptions = this.cpuUsageChart(this.cachedCpuUsageSeries);
          this.diskUsageChartOptions = this.diskUsageChart(this.cachedDiskusageSeries);
          this.serviceEndpointErrorChartOptions = this.serviceErrorChart(this.cachedServiceEndpointSeries);
          this.logsErrorChartOptions = this.serviceErrorChart(this.cachedLogsErrorSeries);
          this.slowDBQueriesChartOptions = this.dbQueriesChart(this.cachedSlowDBSeries);
          this.criticalFlowChartOptions = this.criticalFlowChart(this.cachedCriticalFlowSeries);
          this.applicationLatencyChartOptions = this.applicationLatencyChart(this.cachedApplicationLatencySeries);
  
          if (this.serviceErrorChartContainer) {
            const containerRect = this.serviceErrorChartContainer.nativeElement.getBoundingClientRect();
            const chartHeight = containerRect.height;
            const chartWidth = containerRect.width;
  
            this.serviceErrorChartOptions = this.getServiceErrorChartConfig(
              this.cachedServiceErrorSeries,
              chartHeight,
              chartWidth
            );
          }
        }
      });
    });
  
    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  } 
}
