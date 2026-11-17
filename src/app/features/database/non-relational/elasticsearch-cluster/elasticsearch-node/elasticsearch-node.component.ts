import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DateService } from '../../../../../services/date.service';
import * as Highcharts from 'highcharts';
import { NumericDataPipe } from '../../../../../pipes/numeric-data.pipe';
import { ShortNumberPipe } from '../../../../../pipes/short-number.pipe';
import { ElasticsearchService } from '../../../../../services/elasticsearch.service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-elasticsearch-node',
  imports: [CommonModule, NumericDataPipe, ShortNumberPipe, MatTooltipModule],
  templateUrl: './elasticsearch-node.component.html',
  styleUrl: './elasticsearch-node.component.css'
})
export class ElasticsearchNodeComponent implements OnInit, OnDestroy {

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: any;
  endTime!: any;

  selectedElasticService: any;
  decodedSelectedElasticService: any;
  selectedElasticInstance: any;
  decodedSelectedElasticInstance: any;

  entityId: any;
  totalKpis: any = {};
  
  // To store chart instances to clean up/reflow
  private chartInstances: Highcharts.Chart[] = [];
  private resizeBound = false;

  // Chart configs to render dynamically
  graphs: { id: string; title: string; category: string }[] = [];

  constructor(
    private router: Router,
    private elasticsearchService: ElasticsearchService,
    private dateService: DateService
  ) {
    Highcharts.setOptions({
      lang: { noData: 'No data available' },
      noData: {
        style: { fontWeight: '500', fontSize: '12px', color: '#81888e' }
      }
    });
  }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.selectedElasticService = sessionStorage.getItem("encodedDatabaseServiceId");
    this.decodedSelectedElasticService = sessionStorage.getItem("databaseServiceId");
    this.selectedElasticInstance = sessionStorage.getItem("encodedDatabaseInstanceId");
    this.decodedSelectedElasticInstance = sessionStorage.getItem("databaseInstanceId");
    
    // SkyWalking entity_id for node metrics is formatted as: {base64(service)}_{base64(node)} (Service already includes the .1)
    this.entityId = `${this.selectedElasticService}_${this.selectedElasticInstance}`; 
    
    this.dateService.setActiveComponent('ElasticsearchNodeComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'ElasticsearchNodeComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.loadData();
      });
  }

  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }

  loadData(): void {
    // Clear old charts
    this.chartInstances.forEach(c => c.destroy());
    this.chartInstances = [];
    this.graphs = [];

    this.getNodeTotalKpis();
    this.getNodeCpuAndLoadGraphs();
    this.getNodeJvmAndGcGraphs();
    this.getNodeReqRateIndexingSearchingGraphs();
    this.getNodeTranslogAndBreakerGraphs();
    this.getNodeDocumentGraphs();
    this.getNodeSegmentAndNetworkGraphs();
    this.getNodeDiskGraphs();
  }

  getNodeTotalKpis(): void {
    this.elasticsearchService.getNodeTotalKpis(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.totalKpis = response || {};
        
        // Format Node Rules from Datatable Object
        if (this.totalKpis && this.totalKpis.rules && typeof this.totalKpis.rules === 'object') {
          const rules = [];
          for (const [role, isActive] of Object.entries(this.totalKpis.rules)) {
            rules.push({ name: role, value: isActive });
          }
          this.totalKpis.formattedRules = rules;
        }
      });
  }

  private processGraphResponse(response: any, category: string) {
    if (!response) return;
    
    // Convert map to charts
    Object.keys(response).forEach((graphName, index) => {
      const data = response[graphName];
      if (!data) return;
      
      const chartId = `chart_${category}_${index}_${Math.random().toString(36).substr(2, 9)}`;
      this.graphs.push({ id: chartId, title: graphName, category: category });
      
      // Delay chart rendering to allow Angular to create the DOM element
      setTimeout(() => {
        this.renderGenericChart(chartId, data, graphName);
      }, 100);
    });
  }

  getNodeCpuAndLoadGraphs(): void {
    this.elasticsearchService.getNodeCpuAndLoadGraphs(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$)).subscribe((res: any) => this.processGraphResponse(res, 'cpu_load'));
  }

  getNodeJvmAndGcGraphs(): void {
    this.elasticsearchService.getNodeJvmAndGcGraphs(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$)).subscribe((res: any) => this.processGraphResponse(res, 'jvm_gc'));
  }

  getNodeReqRateIndexingSearchingGraphs(): void {
    this.elasticsearchService.getNodeReqRateIndexingSearchingGraphs(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$)).subscribe((res: any) => this.processGraphResponse(res, 'req_rate'));
  }

  getNodeTranslogAndBreakerGraphs(): void {
    this.elasticsearchService.getNodeTranslogAndBreakerGraphs(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$)).subscribe((res: any) => this.processGraphResponse(res, 'translog'));
  }

  getNodeDocumentGraphs(): void {
    this.elasticsearchService.getNodeDocumentGraphs(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$)).subscribe((res: any) => this.processGraphResponse(res, 'documents'));
  }

  getNodeSegmentAndNetworkGraphs(): void {
    this.elasticsearchService.getNodeSegmentAndNetworkGraphs(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$)).subscribe((res: any) => this.processGraphResponse(res, 'segments'));
  }

  getNodeDiskGraphs(): void {
    this.elasticsearchService.getNodeDiskGraphs(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$)).subscribe((res: any) => this.processGraphResponse(res, 'disk'));
  }

  convertTimebucket(timeBucket: number | string): number {
    if (timeBucket == null) return new Date().getTime();
    const timeStr = timeBucket.toString();
    if (timeStr.length === 14) { // yyyyMMddHHmmss
      const year = parseInt(timeStr.substring(0, 4));
      const month = parseInt(timeStr.substring(4, 6)) - 1;
      const day = parseInt(timeStr.substring(6, 8));
      const hour = parseInt(timeStr.substring(8, 10));
      const minute = parseInt(timeStr.substring(10, 12));
      const second = parseInt(timeStr.substring(12, 14));
      return new Date(year, month, day, hour, minute, second).getTime();
    }
    if (timeStr.length === 12) { // yyyyMMddHHmm
      const year = parseInt(timeStr.substring(0, 4));
      const month = parseInt(timeStr.substring(4, 6)) - 1;
      const day = parseInt(timeStr.substring(6, 8));
      const hour = parseInt(timeStr.substring(8, 10));
      const minute = parseInt(timeStr.substring(10, 12));
      return new Date(year, month, day, hour, minute).getTime();
    }
    if (timeStr.length === 10) { // yyyyMMddHH
      const year = parseInt(timeStr.substring(0, 4));
      const month = parseInt(timeStr.substring(4, 6)) - 1;
      const day = parseInt(timeStr.substring(6, 8));
      const hour = parseInt(timeStr.substring(8, 10));
      return new Date(year, month, day, hour).getTime();
    }
    if (timeStr.length === 8) { // yyyyMMdd
      const year = parseInt(timeStr.substring(0, 4));
      const month = parseInt(timeStr.substring(4, 6)) - 1;
      const day = parseInt(timeStr.substring(6, 8));
      return new Date(year, month, day).getTime();
    }
    return Number(timeBucket); // fallback
  }

  renderGenericChart(containerId: string, rawData: any[], graphTitle: string = '') {
    if (!document.getElementById(containerId)) return;

    // Extract series names (keys other than 'time_bucket' and 'time')
    let seriesNames = new Set<string>();
    rawData.forEach(d => {
      Object.keys(d).forEach(k => {
        if (k !== 'time_bucket' && k !== 'time') seriesNames.add(k);
      });
    });

    const isBar = graphTitle.includes('GC Count') || graphTitle.includes('Count Of Index Segments');
    const isArea = graphTitle.includes('Memory') || graphTitle.includes('Pool');
    const chartType = isBar ? 'column' : (isArea ? 'areaspline' : 'spline');

    const colorPalette = [
      { base: '#023e8a', rgb: '2, 62, 138' },
      { base: '#480ca8', rgb: '72, 12, 168' },
      { base: '#679436', rgb: '103, 148, 54' },
      { base: '#5390d9', rgb: '83, 144, 217' },
      { base: '#7d8597', rgb: '125, 133, 151' },
      { base: '#7dc8fe', rgb: '125, 200, 254' }
    ];

    const startMs = this.convertTimebucket(this.startTime);
    const endMs = this.convertTimebucket(this.endTime);
    const timeRangeMs = endMs - startMs;
    
    let bucketSize = 60000; // 1 min
    if (timeRangeMs > 3 * 24 * 3600 * 1000) {
      bucketSize = 24 * 3600 * 1000; // 1 day
    } else if (timeRangeMs > 12 * 3600 * 1000) {
      bucketSize = 3600000; // 1 hour
    }

    const aggregatedDataMap = new Map<number, any>();
    rawData.forEach(d => {
      const rawTime = d.time || d.time_bucket;
      const timeMs = this.convertTimebucket(rawTime);
      const bucketMs = Math.floor(timeMs / bucketSize) * bucketSize;
      
      if (!aggregatedDataMap.has(bucketMs)) {
        const initialBucket: any = { time: bucketMs, count: 0 };
        seriesNames.forEach(name => initialBucket[name] = 0);
        aggregatedDataMap.set(bucketMs, initialBucket);
      }
      
      const bucket = aggregatedDataMap.get(bucketMs);
      let added = false;
      seriesNames.forEach(name => {
        if (typeof d[name] === 'number') {
           bucket[name] += d[name];
           added = true;
        }
      });
      if (added) bucket.count++;
    });

    const data = Array.from(aggregatedDataMap.values()).map(bucket => {
       if (bucket.count > 0) {
          seriesNames.forEach(name => {
             bucket[name] = bucket[name] / bucket.count;
          });
       }
       return bucket;
    }).sort((a, b) => a.time - b.time);

    let minGap = Infinity;
    for (let i = 0; i < data.length - 1; i++) {
      const gap = data[i + 1].time - data[i].time;
      if (gap > 0 && gap < minGap) minGap = gap;
    }
    if (minGap === Infinity) minGap = 60000;

    const dataWithNulls: any[] = [];
    for (let i = 0; i < data.length; i++) {
      dataWithNulls.push(data[i]);
      if (i < data.length - 1) {
        const gap = data[i + 1].time - data[i].time;
        if (gap > minGap * 1.5) {
          dataWithNulls.push({ time: data[i].time + minGap });
        }
      }
    }

    const seriesData: Highcharts.SeriesOptionsType[] = Array.from(seriesNames).map((name, idx) => {
      const pts = dataWithNulls.map(d => ({
        x: d.time, // already converted to ms
        y: typeof d[name] === 'number' ? d[name] : null
      }));
      const palette = colorPalette[idx % colorPalette.length];
      return {
        name: name,
        type: chartType,
        data: pts,
        lineWidth: 1,
        color: palette.base,
        fillColor: isBar ? palette.base : (isArea ? {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, `rgba(${palette.rgb}, 0.3)`],
            [1, `rgba(${palette.rgb}, 0.05)`]
          ]
        } : undefined),
        marker: { 
          enabled: true, 
          radius: 2, 
          symbol: 'circle', 
          states: { hover: { radius: 3, halo: { size: 4, opacity: 0.15 } } } 
        }
      } as Highcharts.SeriesOptionsType;
    });

    const options: Highcharts.Options = {
      lang: { noData: 'No data available' },
      noData: { style: { fontSize: '12px', fontWeight: '500', color: '#9ca3af' } },
      chart: { type: chartType as any, backgroundColor: 'transparent', animation: false, reflow: true, spacing: [5, 5, 5, 5] },
      title: { text: undefined },
      xAxis: { 
        type: 'datetime', 
        minRange: 1800000, // 30 minutes minimum range to prevent millisecond zooming
        crosshair: { width: 1, color: 'blue', dashStyle: 'ShortDot' },
        gridLineWidth: 0,
        lineColor: '#cccccc', 
        tickColor: '#cccccc', 
        tickLength: 5, 
        tickWidth: 1,
        labels: { 
          style: { color: '#6B7280', fontSize: '9px' }
        } 
      },
      yAxis: { 
        title: { text: undefined }, 
        min: 0,
        tickAmount: 6,
        gridLineWidth: 1, 
        gridLineColor: '#ede8e8',
        labels: { style: { color: '#6B7280', fontSize: '9px' } } 
      },
      tooltip: { 
        shared: true, 
        useHTML: true,
        backgroundColor: '#ffffff', 
        borderColor: '#e5e7eb',
        borderRadius: 4,
        borderWidth: 1,
        shadow: true,
        style: { color: '#030303', fontSize: '10px' },
        xDateFormat: '%Y-%m-%d %H:%M', 
        formatter: function() {
          const ctx = this as any;
          let tooltipHtml = `<div style="padding: 2px;"><b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', ctx.x)}</b><br/>`;
          ctx.points?.forEach((p: any) => {
            const val = p.y === null || p.y === undefined ? 'No Data' : Number(p.y.toFixed(4));
            tooltipHtml += `<span style="color:${p.series.color}">●</span> ${p.series.name}: <b>${val}</b><br/>`;
          });
          tooltipHtml += `</div>`;
          return tooltipHtml;
        }
      },
      plotOptions: { 
        column: { 
          borderWidth: 0, 
          pointPadding: 0.1, 
          groupPadding: 0.1, 
          stacking: 'normal' as any 
        },
        areaspline: { threshold: null as any },
        spline: { threshold: null as any }
      },
      legend: { enabled: false },
      series: seriesData,
      credits: { enabled: false }
    };

    const chart = Highcharts.chart(containerId, options);
    this.chartInstances.push(chart);
    this.syncCharts(this.chartInstances);

    if (!this.resizeBound) {
      this.resizeBound = true;
      const reflowCharts = () => {
        this.chartInstances.forEach(c => {
          if (c) c.reflow();
        });
      };
      window.addEventListener('resize', reflowCharts);
      document.addEventListener('visibilitychange', reflowCharts);
    }
  }

  getGraphsByCategory(category: string) {
    return this.graphs.filter(g => g.category === category);
  }

  goToNonRelational() {
    this.router.navigate(['/database/non-relational'], { queryParams: { from: 'database' } });
  }

  goToElasticsearchCluster() {
    this.router.navigate(['/database/non-relational/elasticsearchCluster'], { queryParams: { from: 'database' } });
  }

  getImagePath(): string {
    return 'assets/images/Elastic Search.png';
  }

  syncCharts(charts: (Highcharts.Chart | undefined)[]) {
    let lastXValue: number | null = null;

    const throttleRAF = (func: Function) => {
      let ticking = false;
      return (...args: any[]) => {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(() => {
            func(...args);
            ticking = false;
          });
        }
      };
    };

    const updateChartsForX = (xValue: number, event: Highcharts.PointerEventObject) => {
      charts.forEach((chart) => {
        if (!chart) return;
        const tooltipPoints: Highcharts.Point[] = [];
        chart.series?.forEach((s) => {
          const point = s.searchPoint(event, true);
          if (point) {
            const pTyped = point as Highcharts.Point & { state?: string };
            if (pTyped.state !== 'hover') pTyped.setState('hover');
            tooltipPoints.push(pTyped);
          }
        });

        if (tooltipPoints.length) {
          chart.tooltip?.refresh(tooltipPoints);
          chart.xAxis?.forEach((axis) => {
            const axisPoint = tooltipPoints.find((p) => p.series?.xAxis === axis);
            if (axisPoint) axis.drawCrosshair(event, axisPoint);
          });
        }
      });
    };

    const handleMouseMove = (e: MouseEvent, chart: Highcharts.Chart) => {
      if (!chart?.pointer) return;
      const event = chart.pointer.normalize(e);
      const points = chart.series
        ?.map((s) => s.searchPoint(event, true))
        ?.filter((p): p is Highcharts.Point => !!p) ?? [];

      if (!points.length) return;
      const xValue = points[0].x;
      if (xValue === lastXValue) return;
      lastXValue = xValue;
      updateChartsForX(xValue, event);
    };

    const throttledHandleMouseMove = throttleRAF(handleMouseMove);

    charts.forEach((chart) => {
      if (!chart?.container || (chart as any).isSynced) return;
      (chart as any).isSynced = true;

      chart.container.addEventListener('mousemove', (e) => throttledHandleMouseMove(e as MouseEvent, chart), { passive: true });
      chart.container.addEventListener('click', (e) => {
        if (!chart?.pointer) return;
        const event = chart.pointer.normalize(e as MouseEvent);
        const points = chart.series?.map((s) => s.searchPoint(event, true))?.filter((p): p is Highcharts.Point => !!p) ?? [];
        if (!points.length) return;
        updateChartsForX(points[0].x, event);
      });

      chart.container.addEventListener('mouseleave', () => {
        lastXValue = null;
        window.requestAnimationFrame(() => {
          charts.forEach((c) => {
            if (!c) return;
            c.tooltip?.hide();
            c.xAxis?.forEach((axis) => axis.hideCrosshair());
            c.series?.forEach((s) => {
              s.points?.forEach((p) => {
                const pTyped = p as Highcharts.Point & { state?: string };
                if (pTyped.state) {
                  window.requestAnimationFrame(() => pTyped.setState());
                }
              });
            });
          });
        });
      }, { passive: true });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chartInstances.forEach(c => c.destroy());
    if (this.datesubscription) this.datesubscription.unsubscribe();
  }
}
