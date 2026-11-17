import { CommonModule } from '@angular/common';
import { ApplicationRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MrumBreadcrumbComponent, BreadcrumbItem } from '../../shared/components/mrum-breadcrumb/mrum-breadcrumb.component';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import Highcharts from 'highcharts';
import { DateService } from '../../../../services/date.service';
import { AutoRefreshService } from '../../../../services/auto-refresh.service';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { SearchPipe } from "../../../../pipes/search.pipe";
import { MrumService } from '../../../../services/mrum.service';
import { MrumParams } from '../../../../models/mrum/mrum-params';
import { HighchartsChartModule } from 'highcharts-angular';
import { MetricData } from '../../../../models/mrum/metric-data';

export let browserRefresh = false;
@Component({
    selector: 'app-mrum-dependecies',
    imports: [CommonModule, RouterModule, NgbDropdownModule, FormsModule, SearchPipe, HighchartsChartModule, MrumBreadcrumbComponent],
    templateUrl: './mrum-dependecies.component.html',
    styleUrl: './mrum-dependecies.component.css'
})
export class MrumDependeciesComponent implements OnInit, OnDestroy {

  @ViewChild('svgElement', { static: true }) svgElement!: ElementRef;

  Highcharts: typeof Highcharts = Highcharts;

  constructor(
    private router: Router,
    private mrumService: MrumService,
    private dateService: DateService,
    private autoRefresh: AutoRefreshService,
    private route: ActivatedRoute,
  ) {

  }

  private storageSub!: Subscription;
  private destroy$ = new Subject<void>();
  private subscription: Subscription = new Subscription();
  subscriptions: Subscription = new Subscription();
  private refreshIntervalId: any;
  startTime!: number;
  endTime!: number;
  datemodel: any;
  isAutoRefreshEnabled!: boolean;
  refreshInterval!: number;

  latencyMetricData: MetricData = {
    timeSeries: [],
    aggregated: null
  };
  apdexMetricData: MetricData = {
    timeSeries: [],
    aggregated: null
  };
  throughputMetricData: MetricData = {
    timeSeries: [],
    aggregated: null
  };

  failureRateMetricData: MetricData = {
    timeSeries: [],
    aggregated: null
  };

  dependencyFilters: MrumParams = {
    osVersion: '',
    appVersion: '',
    device: '',
  };

  breadcrumbData: BreadcrumbItem[] = [];



  chartRefs: Record<string, Highcharts.Chart | undefined> = {};
  hasUrlDate = false;
  firstDateUpdateDone = false;

  ngOnInit(): void {

    this.route.queryParams.subscribe(params => {
      const serviceId = params['serviceId'];
      const dependency = params['dep'];
      if (!serviceId) {
        this.router.navigate(['/mrum']);
        return;
      }

      if (params['st'] && params['et']) {
        this.startTime = params['st'];
        this.endTime = params['et'];
        this.hasUrlDate = true;
      }

      if (!dependency) {
        this.router.navigate(['/mrum/mrum-overview'], {
          queryParams: {
            serviceId: serviceId,
            st: this.startTime,
            et: this.endTime
          }
        });
        return;
      }



      this.dependencyFilters.appName = serviceId;
      this.dependencyFilters.appVersion = params['appVersion'] || '';
      this.dependencyFilters.osVersion = params['osVersion'] || '';
      this.dependencyFilters.device = params['device'] || '';
      this.dependencyFilters.filter = dependency;
      this.updateBreadcrumbs();
      this.getDependenciesMetrics();
    });

    this.dateService.setActiveComponent('MrumDependeciesComponent');

    this.subscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'MrumDependeciesComponent'),
      switchMap(() => this.dateService.date$)
    ).subscribe(dates => {
      this.datemodel = dates;
      if (this.hasUrlDate && !this.firstDateUpdateDone) {
        this.firstDateUpdateDone = true;
        return;
      }

      this.startTime = this.formatDate(this.datemodel.startdateTime);
      this.endTime = this.formatDate(this.datemodel.enddateTime);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { st: this.startTime, et: this.endTime },
        queryParamsHandling: 'merge'
      });
      
      this.getDependenciesMetrics();
    });

    this.loadInitialValues();
    try {
      this.storageSub = this.autoRefresh.getStorageSub().subscribe((data) => {
        if (data?.key === 'RefreshEnability') {
          this.isAutoRefreshEnabled = JSON.parse(data.value);
        }
        else if (data?.key === 'RefreshInterval') {
          this.refreshInterval = Number(data.value);
        }
      });
    }
    catch {
    }

    this.manageAutoRefresh();

  }

  ngOnDestroy(): void {
    if (this.storageSub) {
      this.storageSub.unsubscribe();
    }
    this.clearAutoRefresh();
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
  }


  private clearAutoRefresh() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }



  convertTimebucket(timebucket: any) {
    timebucket = timebucket.toString();
    const year = parseInt(timebucket.slice(0, 4), 10);
    const month = parseInt(timebucket.slice(4, 6), 10) - 1;
    const day = parseInt(timebucket.slice(6, 8), 10);
    const hour = parseInt(timebucket.slice(8, 10), 10);
    const minute = parseInt(timebucket.slice(10, 12), 10);
    const date = new Date(Date.UTC(year, month, day, hour, minute));
    return date.getTime();
  }


  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  private loadInitialValues() {
    const storedState = this.autoRefresh.getItem('RefreshEnability');
    const storedInterval = this.autoRefresh.getItem('RefreshInterval');
    if (storedState !== null) {
      this.isAutoRefreshEnabled = JSON.parse(storedState);
    }
    if (storedInterval !== null) {
      this.refreshInterval = Number(storedInterval);
    }
  }

  private manageAutoRefresh() {
    this.clearAutoRefresh();

    if (this.isAutoRefreshEnabled) {
      this.refreshIntervalId = setInterval(() => {
        this.reloadPage();
      }, this.refreshInterval * 1000);
    }
  }

  reloadPage() {
    this.dateService.triggerFunctionCall();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'NORMAL':
        return '#ffffff';
      case 'WARNING':
        return '#FCA510'; //ED9C40 //#FCA510 //B4892A
      case 'CRITICAL':
        return '#EF5350'; // E94F3D
      default:
        return '#ffffff';
    }
  }

  getStatusColor1(status: string): string {
    switch (status) {
      case 'NORMAL':
        return '#a7a7a7';
      case 'WARNING':
        return '#FCA510'; //ED9C40 //#FCA510 //B4892A
      case 'CRITICAL':
        return '#EF5350'; // E94F3D
      default:
        return '#ffffff';
    }
  }

  updateBreadcrumbs() {
    this.breadcrumbData = [
      { label: 'MRUM', url: '/mrum' },
      { 
        label: this.dependencyFilters.appName || 'ecom-app', 
        url: '/mrum/mrum-overview', 
        queryParams: { serviceId: this.dependencyFilters.appName || 'ecom-app', tab: 'overview', st: this.startTime, et: this.endTime } 
      },
      { 
        label: 'Dependencies', 
        url: '/mrum/mrum-overview',
        queryParams: { serviceId: this.dependencyFilters.appName || 'ecom-app', tab: 'dependencies', st: this.startTime, et: this.endTime } 
      }
    ];
    
    if (this.dependencyFilters.filter) {
      let truncatedFilter = this.dependencyFilters.filter;
      if (truncatedFilter.length > 50) {
        truncatedFilter = truncatedFilter.slice(0, 50) + '...';
      }
      this.breadcrumbData.push({ label: truncatedFilter });
    }
  }

  getDependenciesMetrics(): void {
    const mrumParams: MrumParams = {
      st: this.startTime?.toString(),
      et: this.endTime?.toString(),
      appName: this.dependencyFilters.appName,
      appVersion: this.dependencyFilters.appVersion?.trim(),
      osVersion: this.dependencyFilters.osVersion?.trim(),
      device: this.dependencyFilters.device?.trim(),
      filter: this.dependencyFilters.filter
    };

    this.mrumService.getDependencyApdex(mrumParams).subscribe((data: any) => {
      if (data.serviceStatus === 'Success' && data.serviceResponse.time_series.length > 0) {
        this.apdexMetricData.timeSeries = data.serviceResponse.time_series;
        this.apdexMetricData.aggregated = data.serviceResponse.aggregated;
        setTimeout(() => {
          this.renderChartById('apdexChartContainer', 'Apdex', this.apdexMetricData.timeSeries, 'apdex');
        }, 0);
      } else {
        this.apdexMetricData.timeSeries = [];
        this.apdexMetricData.aggregated = null;
      }
    });

    this.mrumService.getDependencyLatency(mrumParams).subscribe((data: any) => {
      if (data.serviceStatus === 'Success' && data.serviceResponse.time_series.length > 0) {
        this.latencyMetricData.timeSeries = data.serviceResponse.time_series;
        this.latencyMetricData.aggregated = data.serviceResponse.aggregated;
        setTimeout(() => {
          this.renderChartById('latencyChartContainer', 'Latency', this.latencyMetricData.timeSeries, 'avgLatencyMs');
        }, 0);
      } else {
        this.latencyMetricData.timeSeries = [];
        this.latencyMetricData.aggregated = null;
      }
    });
    this.mrumService.getDependencyThroughPut(mrumParams).subscribe((data: any) => {
      if (data.serviceStatus === 'Success' && data.serviceResponse.time_series.length > 0) {
        this.throughputMetricData.timeSeries = data.serviceResponse.time_series;
        this.throughputMetricData.aggregated = data.serviceResponse.aggregated;
        setTimeout(() => {
          this.renderChartById('throughputChartContainer', 'Throughput', this.throughputMetricData.timeSeries, 'throughput');
        }, 0);
      } else {
        this.throughputMetricData.timeSeries = [];
        this.throughputMetricData.aggregated = null;
      }
    });

    this.mrumService.getDependencyFailedTxRate(mrumParams).subscribe((data: any) => {
      if (data.serviceStatus === 'Success' && data.serviceResponse.time_series.length > 0) {
        this.failureRateMetricData.timeSeries = data.serviceResponse.time_series;
        this.failureRateMetricData.aggregated = data.serviceResponse.aggregated;
        setTimeout(() => {
          this.renderChartById('failureRateChartContainer', 'Failure Rate', this.failureRateMetricData.timeSeries, 'failureRate');
        }, 0);
      } else {
        this.failureRateMetricData.timeSeries = [];
        this.failureRateMetricData.aggregated = null;
      }
    });
  }


  renderChartById(
    containerId: string,
    title: string,
    timeSeries: any[],
    valueKey: string,
    statusKey: string = 'status',
    timeKey: string = 'time_bucket'
  ): void {
    console.log('Rendering chart for container:', containerId, 'with title:', title);
    if (this.chartRefs && this.chartRefs[containerId]) {
      this.chartRefs[containerId]!.destroy();
      this.chartRefs[containerId] = undefined;
    }

    const chartOptions = this.getTimeSeriesGraph(title, timeSeries, valueKey, statusKey, timeKey);
    this.chartRefs[containerId] = Highcharts.chart(containerId, chartOptions);
  }

 
getTimeSeriesGraph(
  title: string,
  timeSeries: any[],
  valueKey: string,
  statusKey: string = 'status',
  timeKey: string = 'time_bucket'
): Highcharts.Options {
 
  const statusColors: Record<string, string> = {
    CRITICAL: '#d32f2f',
    WARNING:  '#f9a825',
    NORMAL:   '#1976d2'
  };
 
  const allTimeBuckets: number[] = [];
  const seriesPoints: { x: number; y: number | null; color: string }[] = [];
 
  timeSeries.forEach(item => {
    const time = this.convertTimebucket(item[timeKey] ?? item.timestamp);
 
    if (!allTimeBuckets.includes(time)) {
      allTimeBuckets.push(time);
    }
 
    const value  = item[valueKey];
    const status = item[statusKey];
    const color  = statusColors[status] || '#1976d2';
 
    seriesPoints.push({ x: time, y: value, color });
  });
 
  const completeSeries = allTimeBuckets
    .sort((a, b) => a - b)
    .map(time => {
      const point = seriesPoints.find(p => p.x === time);
      return point ? point : { x: time, y: null, color: '#90caf9' };
    });
 
  return {
    chart: {
      type: 'spline',
      backgroundColor: 'transparent',
      height: 230,
      spacingTop: 8,
      spacingBottom: 12,
      marginBottom: 55
    },
 
    title:    { text: undefined },
    credits:  { enabled: false },
    exporting:{ enabled: false },
    legend:   { enabled: false },
 
    xAxis: {
      type: 'datetime',
      lineColor: '#d0d0d0',
      tickColor: '#d0d0d0',
      labels: {
        style: { color: '#555', fontSize: '10px' },
        y: 18
      }
    },
 
    yAxis: {
      min: 0,
      tickAmount: 5,
      title: { text: undefined },
      gridLineColor: '#eeeeee',
      labels: {
        style: { color: '#555', fontSize: '10px' },
        x: -5
      },
      startOnTick: true,
      endOnTick: false
    },
 
    tooltip: {
      useHTML: true,
      backgroundColor: '#ffffff',
      borderColor: '#d9d9d9',
      borderRadius: 6,
      shadow: true,
      style: { color: '#333', fontSize: '12px' },
      formatter: function () {
        return `
          <div style="font-size:12px;">
            <div style="font-weight:600; margin-bottom:4px;">
              ${Highcharts.dateFormat('%e %b, %H:%M', this.x as number)}
            </div>
            <div><b>${this.y ?? 0}</b></div>
          </div>
        `;
      }
    },
 
    plotOptions: {
      spline: {
        lineWidth: 2,
        marker: {
          radius: 2,
          symbol: 'circle'
        },
        states: {
          hover: { lineWidth: 2 }
        }
      }
    },
 
    series: [{
      name: title,
      type: 'spline',
      data: completeSeries,
      marker: { enabled: true }
    }]
  };
}
 

}