import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import 'highcharts/modules/heatmap';
import 'highcharts/modules/treemap';
import 'highcharts/modules/tilemap';
import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { User } from '../../../../models/user';
import { Session } from '../../../../models/session';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import { AuthenticationService } from '../../../../services/authentication.service';
import { NetworkService } from '../../../../services/network.service';
import { NetworkSearchPipe } from '../../../../pipes/network-search.pipe';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { FormatKbpsPipe } from '../../../../pipes/FormatKbpsPipe.pipe';

export let browserRefresh = false;

interface TopSrcDest {
  src_dst: string;
  count: number;
  packetLength: number;
  showFull?: boolean;
}

interface MetricBox {
  title: string;       // Metric name (e.g., "Rows Read")
  value: number | string; // Metric value
  tooltip?: string;    // Optional tooltip text
}

interface MetricsData {
  logo?: {
    src: string;
    alt?: string;
    label?: string;
  } | null;   // <-- allow null
  metrics: MetricBox[];
}



@Component({
  selector: 'app-network-data',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HighchartsChartModule,
    NetworkSearchPipe,
    MatTooltipModule,
    MatButtonModule,
    FormatKbpsPipe,
  ],
  templateUrl: './network-data.component.html',
  styleUrl: './network-data.component.css'
})

export class NetworkDataComponent implements OnInit, OnDestroy {
  private themeObserver: MutationObserver | undefined;
  Highcharts: any = Highcharts;
  chartOptionsSankey: any = {};


  user: User = new User();
  currentUser: User | null = null;

  sessionObject: Session = new Session();

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  serviceId!: string;

  datemodel: any;
  startTime!: number;
  endTime!: number;

  portData: any[] = [];
  selectedTagName: any;

  networkGraphItemsData: any;
  chartOptions: any[] = [];
  selectedPort: any = null;

  executingPortChart: boolean = true;
  executingChartLoad: boolean = true;
  skeletonArray = Array(8);

  networkMetricData: any;
  chartOptions2: any[] = [];
  graphData: any[] = [];
  executingMetricChart: boolean = true;
  executingChartLoad2: boolean = true;
  skeletonArray2 = Array(8);

  networkPropertiesData: any;
  additionalGraphData: any;
  searchText!: string;
  showSearch = false;

  // Filter variables
  selectedWeight: 'count' | 'packetLength' = 'packetLength';
  topN: number = 10;
  selectedSrc: string = '';
  selectedDst: string = '';
  minThreshold: number = 0;
  sankyHeight: number = 400;

  uniqueSources: string[] = [];
  uniqueDestinations: string[] = [];

  maxCount: number = 0;
  maxPacketLength: number = 0;
  topSrcDestCountsSorted: TopSrcDest[] = [];
  sortFlowColumn: string = '';
  sortFlowDirection: 'desc' | 'asc' = 'desc';

  sortTopSrcIPColumn: string = '';
  sortTopSrcIPDirection: 'desc' | 'asc' = 'desc';

  sortTopDstIPColumn: string = '';
  sortTopDstIPDirection: 'desc' | 'asc' = 'desc';

  // log

  activeTab: string = 'port';  // default tab

  // Inside your component class
  metricsData: MetricsData = {
    logo: undefined,   // Initially empty
    metrics: []        // Initially empty array
  };



  topSrcDestCounts: any[] = [];
  topSrcAndDestCounts: any = {
    src_ips: [],
    dst_ips: []
  };

  logs: any[] = [];
  dynamicFilters: any[] = [];
  newFilter: any = { field: '', value: '' };
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  pagesArray: number[] = [];

  filterOptions = [
    { key: 'srcIp', label: 'Src IP' },
    { key: 'dstIp', label: 'Dst IP' },
    { key: 'srcPort', label: 'Src Port' },
    { key: 'dstPort', label: 'Dst Port' },
    { key: 'protocol', label: 'Protocol' },
    { key: 'ruleResult', label: 'Action' },
    { key: 'ruleAction', label: 'Rule Action' },
    { key: 'direction', label: 'Direction' },
    { key: 'interfaceName', label: 'Interface' },
  ];
  isEditing = false;
  editingIndex: number | null = null;

  constructor(
    private router: Router,
    private dateService: DateService,
    private networkService: NetworkService,
    private authService: AuthenticationService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.authService.currentUser.subscribe((x) => (this.currentUser = x));
    this.serviceId = sessionStorage.getItem('HostName')!;
    this.setMetricsData();
    window.addEventListener('resize', this.resizeHandler);
    this.subscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        browserRefresh = !this.router.navigated;
      }
    });
    this.dateService.setActiveComponent('NetworkDataComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'NetworkDataComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        //  const activeTab = $('#network-nav .nav-link.active').attr('href')?.replace('#', '');
        if (this.activeTab) {
          this.loadData(this.activeTab);
        }
      });
  }

  ngOnDestroy(): void {
    this.datesubscription.unsubscribe();
    window.removeEventListener('resize', this.resizeHandler);
  }


  formatDate(date: string) {
    date = date.replace(/-/g, "");
    date = date.replace(/:/g, "");
    date = date.replace(" ", "")
    return parseInt(date);
  }


  // loadData(): void {
  //   this.observeThemeChange();
  //   this.getGraphItemsByHost();
  //   this.getGraphAdditionalItemsByHost();
  //   this.getPropertiesItemsByHost();
  // }

  loadData(tabName: string): void {
    this.destroy$.next();
    this.observeThemeChange();
    switch (tabName) {
      case 'port':
        console.log('Calling port API');
        this.getGraphItemsByHost(this.serviceId);
        break;
      case 'metric':
        console.log('Calling metric API');
        this.getGraphAdditionalItemsByHost(this.serviceId)
        break;
      case 'properties':
        console.log('Calling properties API');
        this.getPropertiesItemsByHost(this.serviceId)
        break;
      case 'log':
        console.log('Calling logs API');
        this.fetchPaginatedLogs()
        this.loadTopSrcAndDestCounts();
        this.loadTopSrcDestCounts();
        break;

    }
    console.log("service ID : ", this.serviceId)
  }


  observeThemeChange() {
    this.themeObserver = new MutationObserver(() => {

      // Reset flags to show skeletons
      this.executingPortChart = true;
      this.executingMetricChart = true;
      this.executingChartLoad = true;
      this.executingChartLoad2 = true;

      // Clear existing chartOptions (optional, to remove stale content)
      this.chartOptions = [];
      this.chartOptions2 = [];

      // Trigger fresh fetch
      this.getGraphItemsByHost(this.serviceId);
      this.getGraphAdditionalItemsByHost(this.serviceId);
      this.getPropertiesItemsByHost(this.serviceId);
    });

    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  convertTimestamp(timebucket: string) {
    timebucket = timebucket.toString();
    const year = parseInt(timebucket.slice(0, 4), 10);
    const month = parseInt(timebucket.slice(4, 6), 10) - 1;
    const day = parseInt(timebucket.slice(6, 8), 10);
    const hour = parseInt(timebucket.slice(8, 10), 10);
    const minute = parseInt(timebucket.slice(10, 12), 10);
    return new Date(year, month, day, hour, minute).getTime();
  }

  getGraphItemsByHost(hostName: string) {
    this.networkService.getGraphItemsByHostAndDT(hostName, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.networkGraphItemsData = data.serviceResponse ? data.serviceResponse : [];

        // ✅ AUTO RE-RENDER: diagram mode mein hai toh tilemap update karo
        if (this.portViewMode === 'diagram') {
          this.renderPortTilemap();
        }

        const overlay = document.getElementById('tilemapFullscreenOverlay');
        if (overlay && (overlay.style.display === 'flex' || overlay.classList.contains('active'))) { this.openTilemapFullscreen(); }
      });
  }
  onPortChange() {
    if (this.selectedPort) {
      const selected = this.portData.find(p => p.tagName === this.selectedPort);
      if (selected) {
        this.selectedTagName = selected;
        this.fetchGraphData(selected.tagName, selected.graphData);
      }
    }
  }

  fetchGraphData(hostName: string, graphData: string | any[]) {
    setTimeout(() => {
      let parsedGraphData: any[] = [];

      if (typeof graphData === 'string') {
        try {
          parsedGraphData = JSON.parse(graphData);
        } catch {
          console.warn('Invalid JSON string for graphData');
          return;
        }
      } else if (Array.isArray(graphData)) {
        parsedGraphData = graphData;
      }

      if (!parsedGraphData.length) {
        console.warn('== No graphData available, API not called');
        return;
      }

      const requestData = {
        host: this.serviceId,
        startTime: this.startTime,
        endTime: this.endTime,
        graphData: parsedGraphData
      };

      this.networkService.getGraphData(requestData).pipe(takeUntil(this.destroy$)).subscribe(
        (response) => {
          this.networkGraphItemsData = response.body.serviceResponse ? response.body.serviceResponse : [];
          this.processGraphData(response.body.serviceResponse);
        },
        (error) => {
          console.error('API Error:', error);
        }
      );
      this.executingChartLoad = false;
    }, 500);
  }

  processGraphData(serviceResponse: any[]) {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();
    this.chartOptions = serviceResponse.map(item => {

      const seriesData = item.timeSeriesData
        .filter((point: { value: any }) => point.value !== null)
        .map((point: { timeStamp: string, value: number }) => [this.convertTimestamp(point.timeStamp), point.value]);
      return {
        chart: {
          type: 'line',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' },
        },
        title: { text: null },
        credits: {
          enabled: false
        },
        exporting: {
          enabled: false
        },
        xAxis: {
          type: 'datetime',
          title: { text: null },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        yAxis: {
          title: { text: null },
          min: 0,
          tickAmount: 6,
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        legend: { enabled: false },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        series: [{
          name: item.itemName,
          data: seriesData
        }],
        min: item.min,
        max: item.max,
        avg: item.avg,
        last: item.last,
        itemName: item.itemName,
        hasData: seriesData.length > 0,
        description: item.description
      };
    });
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.searchText = '';
    }
  }
  private chartTypeMapping: { [key: string]: string } = {
    // Existing mappings
    "DHCP server status": "column",
    "DNS server status": "column",
    "State of nginx process": "line",
    "Packets with bad offset": "line",
    "Fragmented packets": "column",
    "Packets matched a filter rule": "column",
    "Packets dropped due to memory limitation": "line",
    "Normalized packets": "area",
    "Short packets": "spline",
    "Packet filter running status": "spline",
    "Firewall rules count": "spline",
    "Source tracking table current": "area",
    "Source tracking table limit": "area",
    "Source tracking table utilization in %": "area",
    "States table current": "line",
    "States table limit": "line",
    "States table utilization in %": "line",
    "SNMP agent availability": "column",

    // New items from your serviceResponse
    "ICMP ping": "line",
    "ICMP loss": "column",
    "ICMP response time": "spline",
    "CPU utilization": "area",
    // "SNMP agent availability": "column"
    // ⚡ Skipped repetitions like "Network interfaces discovery", 
    // "System description", "System location", "System name", "System object ID", "Uptime"
    // because they are displayType: History, not Graph
  };

  getGraphAdditionalItemsByHost(serviceId: any) {
    this.executingMetricChart = true;

    // detect service type once and store it
    const idLower = (serviceId || '').toLowerCase();
    if (idLower.includes('firewall')) this.currentServiceType = 'firewall';
    else if (idLower.includes('switch')) this.currentServiceType = 'switch';
    else if (idLower.includes('router')) this.currentServiceType = 'router';
    else this.currentServiceType = 'unknown';

    this.networkService.getGraphAdditionalItemsByHost(serviceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.networkMetricData = data.serviceResponse;
        if (this.networkMetricData.length > 0) {
          const graphItems = this.networkMetricData.filter((item: { displayType: string; }) => item.displayType === 'Graph');
          this.executingChartLoad2 = true;
          this.fetchGraphData2(graphItems);
          this.graphData = graphItems;
        }
        this.executingMetricChart = false;
      }, error => {
        console.error(error);
        this.executingMetricChart = false;
        this.executingChartLoad2 = false;
      });
  }


  fetchGraphData2(graphData: string | any[]) {
    setTimeout(() => {
      if (!graphData.length) {
        console.warn('No graphData available, API not called');
        return;
      }
      const requestData = {
        host: this.serviceId,
        startTime: this.startTime,
        endTime: this.endTime,
        graphData: graphData
      };
      this.networkService.getAdditionalGraphData(requestData).pipe(takeUntil(this.destroy$)).subscribe(
        (response) => {
          this.processGraphData2(response.body.serviceResponse);
        },
        (error) => {
          console.error('API Error:', error);
        }
      );

      this.executingChartLoad2 = false;
    }, 1000);
  }

  processGraphData2(serviceResponse: any[]) {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

    this.chartOptions2 = serviceResponse.map(item => {
      let unit = this.graphData.find(graphItem => graphItem.itemName === item.itemName)?.unit || '';

      if (unit === "bps") {
        item.timeSeriesData = item.timeSeriesData.map((point: any) => ({
          ...point,
          value: point.value ? parseFloat((point.value / 1000).toFixed(3)) : 0
        }));
        unit = "Kbps";
      }

      const seriesData = item.timeSeriesData
        .filter((point: { value: any }) => point.value !== null)
        .map((point: { timeStamp: string, value: number }) => [
          this.convertTimestamp(point.timeStamp),
          point.value
        ]);

      // Pick chart type from mapping (fallback: line)
      const chartType = this.chartTypeMapping[item.itemName] || "line";
      const isCone = item.itemName === "Packets matched a filter rule" || "SNMP agent availability"; // ✅ check by name (or ID)


      return {
        chart: {
          type: chartType,
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: null },
        plotOptions: {
          column: isCone ? { cone: true } : {}
        },
        credits: { enabled: false },
        exporting: { enabled: false },
        xAxis: {
          type: 'datetime',
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        yAxis: {
          title: { text: unit },
          min: 0,
          tickAmount: 6,
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        legend: { enabled: false },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' },
          valueSuffix: ' ' + unit,
          formatter: function (this: any) {
            const parts = this.series.name.split(':');
            const label = parts.length > 1 ? parts[1] : this.series.name;
            return `<b>${label}</b><br/>Value: ${this.y} ${unit}`;
          }
        },
        series: [{
          name: `${item.itemName} (${unit})`,
          data: seriesData
        }],
        min: item.min,
        max: item.max,
        avg: item.avg,
        last: item.last,
        itemName: item.itemName,
        hasData: seriesData.length > 0,
        description: item.description || item.itemName

      };
    });
    this.setMetricsData();
    this.groupChartsByServiceType(this.currentServiceType, this.chartOptions2);



  }


  getPropertiesItemsByHost(serviceId: any) {
    this.networkService.getGraphAdditionalItemsByHost(serviceId).pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      this.networkPropertiesData = data.serviceResponse;

      const historyItems = this.networkPropertiesData.filter((item: { displayType: string; }) => item.displayType === 'History');
      this.fetchPropertiesData(historyItems);
    });
  }

  fetchPropertiesData(graphData: any[]) {
    if (!graphData.length) {
      console.warn('API not called');
      return;
    }

    const requestData = {
      host: this.serviceId,
      startTime: this.startTime,
      endTime: this.endTime,
      graphData: graphData
    };

    this.networkService.getAdditionalGraphData(requestData).pipe(takeUntil(this.destroy$)).subscribe(
      (response) => {
        this.additionalGraphData = response.body.serviceResponse.reduce((acc: { [x: string]: any; }, item: { itemName: string | number; value: any; }) => {
          acc[item.itemName] = item.value;
          return acc;
        }, {});
      },
      (error) => {
        console.error('API Error:', error);
      }
    );
  }

  getItemValue(itemName: string): any {
    return this.additionalGraphData?.[itemName] ?? 'N/A';
  }


  fetchPaginatedLogs() {
    const logFilter: any = {};
    this.dynamicFilters.forEach(f => {
      if (f.field && f.value) logFilter[f.field] = f.value.trim();
    });

    const requestBody = {
      host: this.serviceId,
      st: this.startTime,
      et: this.endTime,
      page: this.currentPage,
      pageSize: this.pageSize,
      logFilter: logFilter
    };

    this.networkService.getPaginatedLogs(requestBody)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.logs = data.body.serviceResponse?.logs || [];
        const totalItems = data.body.serviceResponse?.total || 0;
        this.totalPages = Math.ceil(totalItems / this.pageSize);
        this.pagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
        console.log("logs fetched", this.logs);
      });
  }






  // loadTopSrcDestCounts() {
  //   const pageSize = 10;
  //   this.networkService.getTopSrcDestIpCounts(this.serviceId, this.startTime, this.endTime, pageSize)
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe((data: any) => {
  //       this.topSrcDestCounts = data.serviceResponse ? data.serviceResponse : [];
  //     });
  // }


  sortFlowTable(column: 'count' | 'packetLength') {
    if (this.sortFlowColumn === column) {
      // Toggle direction if clicked again
      this.sortFlowDirection = this.sortFlowDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new column and default to ascending
      this.sortFlowColumn = column;
      this.sortFlowDirection = 'asc';
    }

    this.topSrcDestCountsSorted.sort((a, b) => {
      let valueA = a[column];
      let valueB = b[column];

      if (this.sortFlowDirection === 'asc') {
        return valueA - valueB;
      } else {
        return valueB - valueA;
      }
    });
  }

  sortTopSrcIPTable(column: 'count' | 'packetLength') {
    if (this.sortTopSrcIPColumn === column) {
      // Toggle direction if clicked again
      this.sortTopSrcIPDirection = this.sortTopSrcIPDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new column and default to ascending
      this.sortTopSrcIPColumn = column;
      this.sortTopSrcIPDirection = 'asc';
    }

    this.topSrcAndDestCounts?.src_ips.sort((a: { [x: string]: any; }, b: { [x: string]: any; }) => {
      let valueA = a[column];
      let valueB = b[column];

      if (this.sortTopSrcIPDirection === 'asc') {
        return valueA - valueB;
      } else {
        return valueB - valueA;
      }
    });
  }

  sortTopDstIPTable(column: 'count' | 'packetLength') {
    if (this.sortTopDstIPColumn === column) {
      // Toggle direction if clicked again
      this.sortTopDstIPDirection = this.sortTopDstIPDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new column and default to ascending
      this.sortTopDstIPColumn = column;
      this.sortTopDstIPDirection = 'asc';
    }

    this.topSrcAndDestCounts?.dst_ips.sort((a: { [x: string]: any; }, b: { [x: string]: any; }) => {
      let valueA = a[column];
      let valueB = b[column];

      if (this.sortTopDstIPDirection === 'asc') {
        return valueA - valueB;
      } else {
        return valueB - valueA;
      }
    });
  }
  resetFilters() {
    this.selectedWeight = 'packetLength';
    this.topN = 10;
    this.selectedSrc = '';
    this.selectedDst = '';
    this.minThreshold = 0;

    // Trigger chart update with defaults
    this.updateSankey();
  }

  isDefaultFilters(): boolean {
    return this.selectedWeight === 'packetLength' &&
      this.topN === 10 &&
      this.selectedSrc === '' &&
      this.selectedDst === '' &&
      this.minThreshold === 0;
  }



  loadTopSrcDestCounts(): void {
    this.networkService
      .getTopSrcDestIpCounts(this.serviceId, this.startTime, this.endTime, 50) // get enough for TopN
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const response: TopSrcDest[] = data.serviceResponse || [];
        this.topSrcDestCounts = response;

        this.maxCount = Math.max(...response.map(r => Number(r.count) || 0), 1);
        this.maxPacketLength = Math.max(...response.map(r => Number(r.packetLength) || 0), 1);
        this.topSrcDestCountsSorted = [...response].sort((a, b) => b.count - a.count);

        // Get unique source/destination lists for filters
        this.uniqueSources = Array.from(new Set(response.map(r => r.src_dst.split('->')[0].trim())));
        this.uniqueDestinations = Array.from(new Set(response.map(r => r.src_dst.split('->')[1].trim())));

        this.updateSankey();
      });
  }

  updateSankey(): void {
    if (!this.topSrcDestCounts) return;

    // Filter by source/destination
    let filtered = this.topSrcDestCounts.filter(item => {
      const [src, dst] = item.src_dst.split('->').map((s: string) => s.trim());
      return (!this.selectedSrc || src === this.selectedSrc) &&
        (!this.selectedDst || dst === this.selectedDst);
    });

    // Aggregate flows based on selected weight
    const flowMap: { [key: string]: number } = {};
    filtered.forEach(item => {
      const key = item.src_dst.trim();
      const value = this.selectedWeight === 'count' ? Number(item.count) || 1 : Number(item.packetLength) || 1;
      flowMap[key] = (flowMap[key] || 0) + value;
    });

    // Apply Top-N & min threshold
    const sankeyData: [string, string, number][] = Object.entries(flowMap)
      .map(([k, v]) => {
        const [src, dst] = k.split('->').map(s => s.trim());
        return [src, dst, v] as [string, string, number];
      })
      .filter(([src, dst, val]) => val >= this.minThreshold)
      .sort((a, b) => b[2] - a[2])
      .slice(0, this.topN);

    this.renderSankeyChart(sankeyData);
  }


  renderSankeyChart(sankeyData: [string, string, number][]): void {
    Highcharts.chart('sankeyContainer', {
      chart: { type: 'sankey', height: this.sankyHeight },
      title: {
        text: `Network Traffic Flow by ${this.selectedWeight === 'count' ? 'Count' : 'Packet Length'}`,
        align: 'left'
      },
      tooltip: {
        pointFormat:
          '<b>{point.fromNode.name}</b> → <b>{point.toNode.name}</b><br/>' +
          `${this.selectedWeight === 'count' ? 'Count' : 'Bytes'}: <b>{point.weight}</b>`
      },
      credits: { enabled: false },

      series: [{
        keys: ['from', 'to', 'weight'],
        data: sankeyData,
        type: 'sankey',
        name: 'Traffic Flow',
        colorByPoint: true,
        dataLabels: {
          enabled: true,
          format: '{point.fromNode.name} → {point.toNode.name}: {point.weight}'
        }
      }],

      // Show message when no data
      lang: { noData: 'No data to display' },
      noData: {
        style: { fontWeight: 'bold', fontSize: '16px', color: '#666' }
      }
    });

    this.cdr.detectChanges();
  }




  loadTopSrcAndDestCounts() {
    const pageSize = 10;
    this.networkService.getTopSrcAndDestIpCounts(this.serviceId, this.startTime, this.endTime, pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.topSrcAndDestCounts = data.serviceResponse ? data.serviceResponse : [];
      });
  }

  isFilterSelected(field: any): boolean {
    return this.dynamicFilters.some(f => f.field === field.key);
  }

  isEditingFilter(field: any): boolean {
    return this.isEditing && this.newFilter.field?.key === field.key;
  }

  addFilter(filter: any) {
    if (filter.field && filter.value) {
      const exists = this.dynamicFilters.find(f => f.field === filter.field.key);
      if (!exists) {
        this.dynamicFilters.push({
          field: filter.field.key,
          value: filter.value
        });
      }
      this.newFilter = { field: '', value: '' };
    }
  }

  editFilter(index: number) {
    this.isEditing = true;
    this.editingIndex = index;
    const f = this.dynamicFilters[index];
    const option = this.filterOptions.find(opt => opt.key === f.field);
    this.newFilter = { field: option, value: f.value };
  }

  saveFilter() {
    if (this.isEditing && this.editingIndex !== null) {
      this.dynamicFilters[this.editingIndex] = {
        field: this.newFilter.field.key,
        value: this.newFilter.value
      };
      this.isEditing = false;
      this.editingIndex = null;
    } else {
      this.addFilter(this.newFilter);
    }
    this.newFilter = { field: '', value: '' };
  }

  removeFilter(index: number) {
    this.dynamicFilters.splice(index, 1);
    if (this.editingIndex === index) {
      this.isEditing = false;
      this.newFilter = { field: '', value: '' };
    }
  }


  applyFilters() {
    this.currentPage = 1;
    this.fetchPaginatedLogs();
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.fetchPaginatedLogs();
  }


  ngAfterViewInit() {
    const nav = document.getElementById('network-nav');
    if (nav) {
      nav.addEventListener('shown.bs.tab', (event: any) => {
        const tabId = event.target.getAttribute('href')?.replace('#', '');
        if (tabId) {
          this.activeTab = tabId;
          this.loadData(tabId);
        }
      });
    }

    // Load default active tab
    this.loadData(this.activeTab);
  }

  navigateWithGraphData(item: any) {
    this.router.navigate(['/network/network-data/network-interface'], {
      queryParams: {
        tagName: item.tagName,
        graphData: JSON.stringify(item.graphData)  // works here
      }
    });
  }

  initResize(event: MouseEvent, colIndex: number) {
    event.preventDefault();

    const th = (event.target as HTMLElement).parentElement!;
    const startX = event.pageX;
    const startWidth = th.offsetWidth;

    const minWidth = 50;   // minimum column width
    const maxWidth = 250;  // maximum column width

    const mouseMoveHandler = (e: MouseEvent) => {
      let newWidth = startWidth + (e.pageX - startX);

      // clamp the width between minWidth and maxWidth
      if (newWidth < minWidth) {
        newWidth = minWidth;
      } else if (newWidth > maxWidth) {
        newWidth = maxWidth;
      }

      th.style.width = newWidth + 'px';
    };

    const mouseUpHandler = () => {
      window.removeEventListener('mousemove', mouseMoveHandler);
      window.removeEventListener('mouseup', mouseUpHandler);
    };

    window.addEventListener('mousemove', mouseMoveHandler);
    window.addEventListener('mouseup', mouseUpHandler);
  }


  setMetricsData(): void {
    if (!this.serviceId) return;

    let serviceType = 'unknown';

    const idLower = this.serviceId.toLowerCase();
    if (idLower.includes('firewall')) {
      serviceType = 'firewall';
    } else if (idLower.includes('router')) {
      serviceType = 'router';
    } else if (idLower.includes('switch')) {
      serviceType = 'switch';
    }

    switch (serviceType) {
      case 'firewall':
        const firewallMetricMapping: { [key: string]: 'last' | 'avg' } = {
          'SNMP agent availability': 'last',
          'States table utilization in %': 'avg',
          'Firewall rules count': 'last',
          'Packet filter running status': 'last',
          'CPU utilization': 'avg',
          'Memory utilization': 'avg'
        };

        // Filter only metrics we want to show
        const firewallItems = this.chartOptions2.filter(item =>
          Object.keys(firewallMetricMapping).includes(item.itemName)
        );

        // Map to metricsData format for HTML
        const firewallmetricsArray = firewallItems.map(item => {
          const valueType = firewallMetricMapping[item.itemName];
          const value = valueType === 'last' ? item.last : item.avg;
          return {
            title: item.itemName,
            value: value ?? 0,
            tooltip: item.description || item.itemName
          };
        });
        this.metricsData = {
          logo: { src: 'assets/images/firewall.png', alt: 'Firewall', label: 'Firewall' },
          metrics: firewallmetricsArray
        };
        break;


      case 'router':
        const routerMetricMapping: { [key: string]: 'last' | 'avg' } = {
          'SNMP agent availability': 'last',
          'CPU utilization': 'avg',
          'ICMP loss': 'last',
        };
        const routerItems = this.chartOptions2.filter(item =>
          Object.keys(routerMetricMapping).includes(item.itemName)
        );

        // Map to metricsData format for HTML
        const routermetricsArray = routerItems.map(item => {
          const valueType = routerMetricMapping[item.itemName];
          const value = valueType === 'last' ? item.last : item.avg;
          return {
            title: item.itemName,
            value: value ?? 0,
            tooltip: item.description || item.itemName
          };
        });
        this.metricsData = {
          logo: { src: 'assets/images/wifi-router.png', alt: 'router', label: 'Router' },
          metrics: routermetricsArray
        };
        break;

      case 'switch':
        const switchMetricMapping: { [key: string]: 'last' | 'avg' } = {
          'SNMP agent availability': 'last',
          'CPU utilization': 'avg',
          'ICMP loss': 'last',
        };

        // Filter relevant metrics
        const switchItems = this.chartOptions2.filter(item =>
          Object.keys(switchMetricMapping).includes(item.itemName)
        );

        // ✅ Deduplicate using Map (keeps only unique itemName)
        const uniqueSwitchItems = Array.from(
          new Map(switchItems.map(item => [item.itemName, item])).values()
        );

        // Map to metricsData format for HTML
        const switchmetricsArray = uniqueSwitchItems.map(item => {
          const valueType = switchMetricMapping[item.itemName];
          const value = valueType === 'last' ? item.last : item.avg;
          return {
            title: item.itemName,
            value: value ?? 0,
            tooltip: item.description || item.itemName
          };
        });

        this.metricsData = {
          logo: { src: 'assets/images/switch.png', alt: 'switch', label: 'Switch' },
          metrics: switchmetricsArray
        };
        break;


      default:
        // fallback: empty metrics and optional logo
        this.metricsData = { metrics: [] };
    }
  }

  // grouping map (firewall + switch)
  private chartGroupingMap: { [service: string]: { [group: string]: string[] } } = {
    firewall: {
      "Server Status": [
        "DHCP server status",
        "DNS server status",
        "State of nginx process"
      ],
      "Packet Statistics": [
        "Packets with bad offset",
        "Fragmented packets",
        "Packets matched a filter rule",
        "Packets dropped due to memory limitation",
        "Normalized packets",
        "Short packets",
        "Packet filter running status",

      ],
      "Firewall Rules": [
        "Firewall rules count"
      ],
      "Source Tracking": [
        "Source tracking table current",
        "Source tracking table limit",
        "Source tracking table utilization in %"
      ],
      "States Table": [
        "States table current",
        "States table limit",
        "States table utilization in %"
      ],
      "SNMP Agent": [
        "SNMP agent availability",
      ],
      "ICMP": [
        "ICMP ping",
        "ICMP loss",
        "ICMP response time"
      ],
      "Performance": [
        "Memory capacity",
        "Memory utilization",
        "CPU utilization"
      ],
      "Service": [
        "Service apache status",
        "Service AS status",
        "Service AV status",
        "Service database status",
        "Service Dgd status",
        "Service dns status",
        "Service drouting status",
        "Service FTP status",
        "Service garner status",
        "Service HTTP status",
        "Service IMAP4 status",
        "Service IP-Sec VPN status",
        "Service IPS status",

      ]
    },
    switch: {
      "Network Health": [
        "ICMP ping",
        "ICMP loss",
        "ICMP response time"
      ],
      "System Resources": [
        "CPU utilization",
        "#{#SNMPVALUE}: Memory utilization"
      ],
      "Hardware Health": [
        "#{#SNMPVALUE}: Fan status",
        "#{#SNMPVALUE}: Power supply status",
        "#{#SNMPVALUE}: Temperature"
      ],
      "SNMP Agent": [
        "SNMP agent availability"
      ]
    }
  };

  // runtime grouped charts + order
  groupedCharts: { [groupName: string]: any[] } = {};
  groupOrder: string[] = [];          // keeps ordering for rendering
  currentServiceType: 'firewall' | 'switch' | 'router' | 'unknown' = 'unknown';

  // Utility: Compute similarity between two strings (Levenshtein ratio)
  private stringSimilarity(a: string, b: string): number {
    a = a.toLowerCase();
    b = b.toLowerCase();
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1 // deletion
            )
          );
        }
      }
    }

    const distance = matrix[b.length][a.length];
    const maxLen = Math.max(a.length, b.length);
    return 1 - distance / maxLen; // similarity ratio between 0 and 1
  }

  private getCombinedMappingForCharts(charts: any[], preferredType?: string) {
    const typesToUse: string[] = [];

    // Step 1: Detect service type
    if (preferredType && (preferredType === 'firewall' || preferredType === 'switch')) {
      typesToUse.push(preferredType);
    } else {
      if (charts.some(c => this.chartGroupingMap['firewall'] &&
        Object.values(this.chartGroupingMap['firewall']).flat().includes(c.itemName))) {
        typesToUse.push('firewall');
      }
      if (charts.some(c => this.chartGroupingMap['switch'] &&
        Object.values(this.chartGroupingMap['switch']).flat().includes(c.itemName))) {
        typesToUse.push('switch');
      }
    }

    // Step 2: Merge mappings
    const combined: { [group: string]: string[] } = {};
    for (const t of typesToUse) {
      const map = this.chartGroupingMap[t] || {};
      for (const [group, names] of Object.entries(map)) {
        combined[group] = combined[group]
          ? Array.from(new Set([...combined[group], ...names]))
          : [...names];
      }
    }

    // Step 3: Known names and unknown charts
    const knownChartNames = Object.values(combined).flat();
    const unknownCharts = charts
      .map(c => c.itemName)
      .filter(name => !knownChartNames.includes(name));

    // Step 4: Smart fuzzy matching for unknown charts
    for (const unknown of unknownCharts) {
      let bestGroup: string | null = null;
      let bestScore = 0;

      for (const [group, existingNames] of Object.entries(combined)) {
        for (const known of existingNames) {
          const score = this.stringSimilarity(unknown, known);

          // Match either chart name or group name itself
          const groupScore = this.stringSimilarity(unknown, group);
          const finalScore = Math.max(score, groupScore);

          if (finalScore > bestScore) {
            bestScore = finalScore;
            bestGroup = group;
          }
        }
      }

      // Step 5: Threshold - if not confident enough, send to Additional Graphs
      if (bestScore >= 0.6 && bestGroup) {
        combined[bestGroup].push(unknown);
      } else {
        if (!combined['Additional Graphs']) combined['Additional Graphs'] = [];
        combined['Additional Graphs'].push(unknown);
      }
    }

    return combined;
  }



  // In your component class
  getRowsCount(groupName: string): number {
    if (!this.groupedCharts[groupName]) return 1;
    const count = this.groupedCharts[groupName].length;
    return Math.ceil(count / 3); // 3 charts per row
  }

  // Calculate total section height dynamically
  getSectionHeight(groupName: string): number {
    const rowCount = this.getRowsCount(groupName);
    const rowHeight = 150; // per row height (chart + padding/margin)
    return rowCount * rowHeight;
  }

  // Height per chart row in pixels
  chartRowHeight = 205; // adjust based on chart + margin

  getSectionHeaderHeight(charts: any[]): number {
    if (!charts?.length) return this.chartRowHeight;

    // Each row has 3 charts

    const numRows = Math.ceil(charts.length / 3);
    if (numRows > 1) {
      return numRows * this.chartRowHeight + (12 * numRows - 1);
    }
    else {
      return numRows * this.chartRowHeight
    }
  }



  // Ensure group charts have placeholders to complete last row
  // Replace existing groupChartsByServiceType with this version
  groupChartsByServiceType(preferredType: 'firewall' | 'switch' | 'router' | 'unknown', charts: any[]) {
    this.groupedCharts = {};
    this.groupOrder = [];

    if (!charts || !charts.length) return;

    const mapping = this.getCombinedMappingForCharts(charts, preferredType);

    for (const groupName of Object.keys(mapping)) {
      // Find items that match this group's known names
      let groupItems = charts.filter(item => mapping[groupName].includes(item.itemName));

      // If no real charts matched this group, skip it entirely
      if (!groupItems || groupItems.length === 0) {
        continue; // <-- important: do not create an empty group
      }

      // add placeholders to complete last row (so layout stays consistent)
      const remainder = groupItems.length % 3;
      if (remainder) {
        for (let i = 0; i < 3 - remainder; i++) {
          // keep placeholder indicator so rendering template can detect them
          groupItems.push({ isPlaceholder: true });
        }
      }

      // Defensive: if after adding placeholders the group contains only placeholders,
      // skip it (shouldn't happen because we skipped empty groups above, but safe)
      if (groupItems.every(item => item.isPlaceholder)) {
        continue;
      }

      this.groupedCharts[groupName] = groupItems;
      this.groupOrder.push(groupName);
    }

    // optional: always keep “Additional Graphs” at the end (only if it exists)
    this.groupOrder = this.groupOrder.sort((a, b) => {
      if (a === 'Additional Graphs') return 1;
      if (b === 'Additional Graphs') return -1;
      return 0;
    });
  }
  // ============================================================
  //  PORT TILEMAP — FINAL RESPONSIVE VERSION
  //  ✔ Responsive fullscreen columns
  //  ✔ Proper honeycomb layout
  //  ✔ No shrinking issue
  //  ✔ Vertical overflow support
  //  ✔ 4K / ultrawide friendly
  //  ✔ Existing bindings untouched
  // ============================================================

  portViewMode: 'table' | 'diagram' | 'cards' = 'table';

  // ─────────────────────────────────────────────────────────────
  //  CORE BUILD FUNCTION
  // ─────────────────────────────────────────────────────────────
  private buildTilemapConfig(
    containerId: string,
    height: number,
    isFullscreen = false,
    cols = 8
  ): void {

    const formatKbps = (kbps: string | number): string => {
      const val = parseFloat(kbps as string) || 0;
      if (val >= 1000000) return (val / 1000000).toFixed(2) + ' Gbps';
      if (val >= 1000) return (val / 1000).toFixed(2) + ' Mbps';
      return val + ' Kbps';
    };

    // ───────────────────────────────────────────────────────────
    //  RESPONSIVE SCALE
    // ───────────────────────────────────────────────────────────
    const vw = window.innerWidth;

    const scale = Math.max(
      1,
      Math.min(vw / 1920, 1.25)
    );

    // ───────────────────────────────────────────────────────────
    //  RESPONSIVE STYLES
    // ───────────────────────────────────────────────────────────
    const nameFontSize =
      `${Math.round(11 * scale)}px`;

    const labelFontSize =
      `${Math.round(10 * scale)}px`;

    const thruFontSize =
      `${Math.round(13 * scale)}px`;

    const dynamicTileWidth = Math.max(
      70,
      Math.min(
        isFullscreen ? window.innerWidth / cols - 28 : 78,
        150
      )
    );

    const tileWidth = `${dynamicTileWidth}px`;
    const gridGap = '3px';

    const cellPadding = isFullscreen
      ? '3px 5px'
      : '3px 4px';

    const mbName = isFullscreen ? '5px' : '4px';

    const maxLen = isFullscreen ? 9999 : 10;

    const whiteSpace = isFullscreen
      ? 'normal'
      : 'nowrap';

    const wordBreak = isFullscreen
      ? 'break-word'
      : 'normal';

    // ───────────────────────────────────────────────────────────
    //  DATA MAPPING
    // ───────────────────────────────────────────────────────────
    const tilemapData = (this.networkGraphItemsData || []).map(
      (item: any, index: number) => {

        const status = item?.status || 'Unknown';

        const throughput =
          parseFloat(item?.total) || 0;

        const tileColor =
          status === 'Down'
            ? '#5f6b7a' // enterprise slate gray
            : status === 'Up' && throughput === 0
              ? '#d64545' // enterprise alert red
              : status === 'Up' && throughput > 0
                ? '#1f9d73' // enterprise emerald green
                : '#d9a441'; // enterprise amber

        return {
          name: item?.tagName || 'NA',

          x: index % cols,

          y: Math.floor(index / cols),

          value: parseFloat(item?.total) || 0,

          color: tileColor,

          send: item?.send || '0',

          receive: item?.receive || '0',

          total: item?.total || '0',

          status
        };
      }
    );

    // ───────────────────────────────────────────────────────────
    //  DESTROY OLD CHART
    // ───────────────────────────────────────────────────────────
    const oldChart = Highcharts.charts.find(
      (c: any) => c && c.renderTo.id === containerId
    );

    if (oldChart) {
      oldChart.destroy();
    }

    // ───────────────────────────────────────────────────────────
    //  CHART CONFIG
    // ───────────────────────────────────────────────────────────
    Highcharts.chart(containerId, {

      chart: {

        type: 'tilemap',

        inverted: false,

        height,

        reflow: true,

        backgroundColor: 'transparent',

        margin: isFullscreen
          ? [20, 20, 20, 20]
          : [10, 10, 10, 10],

        spacing: isFullscreen
          ? [10, 10, 10, 10]
          : [8, 8, 8, 8]
      },

      title: {
        text: null
      },

      credits: {
        enabled: false
      },

      exporting: {
        enabled: false
      },

      xAxis: {
        visible: false
      },

      yAxis: {
        visible: false
      },

      colorAxis: undefined as any,

      legend: {
        enabled: false
      },

      plotOptions: {

        tilemap: {

          pointPadding: isFullscreen ? 3 : 1,

          colsize: 1,

          rowsize: 1,

          states: {
            hover: {
              brightness: 0.15,
              borderColor: '#ffffff',
              borderWidth: 2
            }
          },

          dataLabels: {

            enabled: true,

            useHTML: true,

            overflow: 'allow',

            crop: false,

            allowOverlap: true,

            padding: 0,

            formatter: function (this: any): string {

              const p = this.point;

              const displayName =
                p.name.length > maxLen
                  ? p.name.substring(0, maxLen) + '…'
                  : p.name;

              return `
            <div style="
              text-align:center;
              font-family:'Segoe UI',system-ui,sans-serif;
              pointer-events:none;
              width:${tileWidth};
            ">

              <div style="
                font-size:${nameFontSize};
                font-weight:700;
                color:#fff;
                white-space:${whiteSpace};
                word-break:${wordBreak};
                overflow-wrap:break-word;
                max-width:${tileWidth};
                margin-bottom:${mbName};
                letter-spacing:0.2px;
                line-height:1.25;
              " title="${p.name}">
                ${displayName}
              </div>

              <div style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:${gridGap};
                width:${tileWidth};
              ">

                <div style="
                  background:rgba(0,0,0,0.25);
                  border-radius:4px;
                  padding:${cellPadding};
                  grid-column:span 2;
                ">

                  <div style="
                    font-size:${labelFontSize};
                    color:rgba(255,255,255,0.75);
                    letter-spacing:0.4px;
                  ">
                    THROUGHPUT
                  </div>

                  <div style="
                    font-size:${thruFontSize};
                    font-weight:700;
                    color:#fff;
                    line-height:1.2;
                  ">
                    ${formatKbps(p.total)}
                  </div>

                </div>

              </div>

            </div>`;
            }
          }
        }
      } as any,

      series: [{
        type: 'tilemap',
        name: 'Network Ports',
        tileShape: 'hexagon',
        data: tilemapData,
        borderWidth: 3,
        borderColor: '#f0f0f0'
      }] as any,

      tooltip: {

        useHTML: true,

        outside: !isFullscreen,

        shadow: false,

        borderWidth: 0,

        backgroundColor: 'transparent',

        padding: 0,

        formatter: function (this: any): string {

          const p = this.point;

          const isUp = p.status === 'Up';

          const isDown = p.status === 'Down';

          const throughput =
            parseFloat(p.total) || 0;

          const statusBg =
            p.status === 'Down'
              ? '#5f6b7a'
              : p.status === 'Up' && throughput === 0
                ? '#d64545'
                : p.status === 'Up' && throughput > 0
                  ? '#1f9d73'
                  : '#d9a441';

          const statusIcon =
            isUp
              ? '↑'
              : isDown
                ? '↓'
                : '—';

          return `
        <div style="
          background:#fff;
          border-radius:12px;
          min-width:210px;
          box-shadow:0 12px 32px rgba(0,0,0,0.18);
          font-family:'Segoe UI',system-ui,sans-serif;
          overflow:hidden;
        ">

          <div style="
            background:${statusBg};
            padding:10px 14px;
            display:flex;
            align-items:center;
            gap:8px;
          ">

            <div style="flex:1;min-width:0;">
              <div style="
                font-size:12px;
                font-weight:700;
                color:#fff;
                overflow:hidden;
                text-overflow:ellipsis;
                white-space:nowrap;
              ">
                ${p.name}
              </div>
            </div>

            <span style="
              background:rgba(255,255,255,0.22);
              color:#fff;
              padding:2px 8px;
              border-radius:20px;
              font-size:10px;
              font-weight:700;
            ">
              ${statusIcon} ${p.status}
            </span>

          </div>

          <div style="
            padding:10px 12px;
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:6px;
          ">

            <div style="
              background:#f0f7ff;
              border-radius:8px;
              padding:7px 10px;
            ">
              <div style="
                font-size:8px;
                color:#888;
                margin-bottom:3px;
              ">
                SEND
              </div>

              <div style="
                font-size:13px;
                font-weight:700;
                color:#0d6efd;
              ">
                ${formatKbps(p.send)}
              </div>
            </div>

            <div style="
              background:#f5f0ff;
              border-radius:8px;
              padding:7px 10px;
            ">
              <div style="
                font-size:8px;
                color:#888;
                margin-bottom:3px;
              ">
                RECEIVE
              </div>

              <div style="
                font-size:13px;
                font-weight:700;
                color:#7c3aed;
              ">
                ${formatKbps(p.receive)}
              </div>
            </div>

            <div style="
              background:#f0faf8;
              border-radius:8px;
              padding:7px 10px;
              grid-column:span 2;
            ">
              <div style="
                font-size:8px;
                color:#888;
                margin-bottom:3px;
              ">
                THROUGHPUT
              </div>

              <div style="
                display:flex;
                align-items:baseline;
                gap:4px;
              ">
                <span style="
                  font-size:15px;
                  font-weight:700;
                  color:#0f9b6e;
                ">
                  ${formatKbps(p.total)}
                </span>
              </div>
            </div>

          </div>

        </div>`;
        }
      }

    } as any);
  }

  // ─────────────────────────────────────────────────────────────
  //  INLINE VIEW
  // ─────────────────────────────────────────────────────────────
  renderPortTilemap(): void {

    setTimeout(() => {

      if (!this.networkGraphItemsData?.length) return;

      const container =
        document.getElementById('portTilemapContainer');

      if (!container) return;

      const rows =
        Math.ceil(this.networkGraphItemsData.length / 8);

      const chartHeight =
        Math.max(250, rows * 95 + 70);

      container.style.height =
        chartHeight + 'px';

      this.buildTilemapConfig(
        'portTilemapContainer',
        chartHeight,
        false,
        8
      );

    }, 150);
  }

  // ─────────────────────────────────────────────────────────────
  //  FULLSCREEN VIEW
  // ─────────────────────────────────────────────────────────────
  openTilemapFullscreen(): void {

    const overlay =
      document.getElementById('tilemapFullscreenOverlay');

    if (!overlay) return;

    overlay.style.display = 'flex';
    overlay.classList.add('active');

    const el = overlay as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      mozRequestFullScreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };

    const requestFS =
      el.requestFullscreen?.bind(el) ||
      el.webkitRequestFullscreen?.bind(el) ||
      el.mozRequestFullScreen?.bind(el) ||
      el.msRequestFullscreen?.bind(el);

    if (requestFS) {

      requestFS().catch((err: any) => {
        console.warn('Fullscreen request denied:', err);
      });
    }

    setTimeout(() => {

      if (!this.networkGraphItemsData?.length) return;

      const fsContainer =
        document.getElementById('portTilemapFullscreen');

      if (!fsContainer) return;

      const total =
        this.networkGraphItemsData.length;

      const availW =
        window.innerWidth;

      // ─────────────────────────────────────────────────────────
      //  RESPONSIVE COLUMN COUNT
      // ─────────────────────────────────────────────────────────
      // AUTO RESPONSIVE GRID
      const containerPadding = 80;

      const usableWidth =
        window.innerWidth - containerPadding;

      const usableHeight =
        window.innerHeight - 140;

      // Dynamic tile size
      const tileSize = Math.max(
        90,
        Math.min(140, usableWidth / 10)
      );

      // Auto columns based on width
      const bestCols = Math.max(
        4,
        Math.floor(usableWidth / tileSize)
      );

      // Auto rows
      const rows = Math.ceil(total / bestCols);

      // Auto height
      const fsHeight = Math.max(
        usableHeight,
        rows * (tileSize * 0.95)
      );

      // ─────────────────────────────────────────────────────────
      //  CONTAINER STYLING
      // ─────────────────────────────────────────────────────────
      fsContainer.style.height =
        fsHeight + 'px';

      fsContainer.style.width =
        '100%';

      fsContainer.style.maxWidth =
        '2600px';

      fsContainer.style.margin =
        '0 auto';

      fsContainer.style.padding =
        '20px';

      this.buildTilemapConfig(
        'portTilemapFullscreen',
        fsHeight,
        true,
        bestCols
      );

    }, 260);
  }

  // ─────────────────────────────────────────────────────────────
  //  CLOSE FULLSCREEN
  // ─────────────────────────────────────────────────────────────
  closeTilemapFullscreen(): void {

    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void>;
      mozCancelFullScreen?: () => Promise<void>;
      msExitFullscreen?: () => Promise<void>;
    };

    const exitFS =
      doc.exitFullscreen?.bind(doc) ||
      doc.webkitExitFullscreen?.bind(doc) ||
      doc.mozCancelFullScreen?.bind(doc) ||
      doc.msExitFullscreen?.bind(doc);

    if (document.fullscreenElement && exitFS) {

      exitFS().catch((err: any) =>
        console.warn('Exit fullscreen error:', err)
      );
    }

    const overlay =
      document.getElementById('tilemapFullscreenOverlay');

    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('active');

    }

  }
  private resizeHandler = () => {

    if (this.portViewMode === 'diagram') {
      this.renderPortTilemap();
    }

    const overlay =
      document.getElementById('tilemapFullscreenOverlay');

    if (
      overlay &&
      (
        overlay.style.display === 'flex' ||
        overlay.classList.contains('active')
      )
    ) {
      this.openTilemapFullscreen();
    }
  };


}


