import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MongoService } from '../../../../services/mongo.service';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import { FormsModule } from '@angular/forms';
import { SortPipe } from '../../../../pipes/sort.pipe';
import { ObjectFilterPipe } from '../../../../pipes/object-filter.pipe';
import { PaginatePipe } from '../../../../pipes/paginate.pipe';
import { NumericDataPipe } from '../../../../pipes/numeric-data.pipe';
import { ShortNumberPipe } from '../../../../pipes/short-number.pipe';
import { CommonModule } from '@angular/common';
import Highcharts from 'highcharts';

interface MongoNode {
  nodeName: string;
  entityId: string;
  uptimeSeconds: number;
  qps: number;
  memoryUsagePercent: number;
  avgLatency: number;
}

interface MongoNodeResponse {
  nodes: MongoNode[];
}

@Component({
  selector: 'app-mongo-cluster',
  imports: [CommonModule, FormsModule, SortPipe, ObjectFilterPipe, PaginatePipe, NumericDataPipe, ShortNumberPipe],
  templateUrl: './mongo-cluster.component.html',
  styleUrl: './mongo-cluster.component.css'
})
export class MongoClusterComponent implements OnInit, OnDestroy {

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();

  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: any;
  endTime!: any;

  selectedMongoService: any;
  decodedSelectedMongoService: any;

  nodeNamesData: MongoNode[] = [];
  filteredNodeNamesData: any[] = [];

  clusterUptime: any;
  displayMain = '';
  displayRest = '';
  sinceDate: any;
  clusterDataSize: any;
  clusterCollectionCount: any;
  clusterObjectCount: any;

  // Pagination & Search
  searchText = '';
  sortColumn = '';
  sortDirection: 'asc' | 'desc' | 'none' = 'none';
  currentPage = 1;
  pageSize = 5;
  totalPages = 1;
  inputPage = 1;
  totalItems = 0;
  isLoading = false;
  skeletonRows = Array(5).fill(0);

  private documentQpsChartInstance?: Highcharts.Chart;
  private documentQpsResizeBound = false;
  private operationQpsChartInstance?: Highcharts.Chart;
  private operationQpsResizeBound = false;
  private connectionsChartInstance?: Highcharts.Chart;
  private connectionsQpsResizeBound = false;
  private cursorTotalChartInstance?: Highcharts.Chart;
  private cursorTotalQpsResizeBound = false;

  constructor(
    private router: Router,
    private mongoService: MongoService,
    private dateService: DateService
  ) {
    Highcharts.setOptions({
      lang: {
        noData: 'No data available'
      },
      noData: {
        style: {
          fontWeight: '500',
          fontSize: '12px',
          color: '#81888e'
        }
      },
      plotOptions: {
        series: {
          cursor: 'pointer'
        }
      }
    });
  }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    this.selectedMongoService = sessionStorage.getItem("encodedDatabaseServiceId");
    this.decodedSelectedMongoService = sessionStorage.getItem("databaseServiceId");
    this.dateService.setActiveComponent('MongoClusterComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'MongoClusterComponent'),
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

    //OVERVIEW TAB
    this.getClusterUptime();
    this.getClusterDataSize();
    this.getClusterCollectionCount();
    this.getClusterObjectCount();
    this.getClusterDocumentTotalQPS();
    this.getClusterOperationTotalQPS();
    this.getClusterConnections();
    this.getClusterCursorTotal();

    // NODE TAB
    this.getUniqueNodeNames();

  }

  // OVERVIEW TAB

  getClusterUptime(): void {
    this.mongoService
      .getClusterUptime(this.selectedMongoService, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.clusterUptime = response.uptime;
        const days = Math.floor(this.clusterUptime / 86400);
        const hours = Math.floor((this.clusterUptime % 86400) / 3600);
        const minutes = Math.floor((this.clusterUptime % 3600) / 60);
        const seconds = this.clusterUptime % 60;

        if (days > 0) {
          this.displayMain = `${days}d`;
          this.displayRest = `${hours}h ${minutes}m ${seconds}s`;
        } else {
          this.displayMain = `${hours}h`;
          this.displayRest = `${minutes}m ${seconds}s`;
        }

        this.sinceDate = new Date(Date.now() - this.clusterUptime * 1000);
      });
  }

  getClusterDataSize(): void {
    this.mongoService
      .getClusterDataSize(this.selectedMongoService, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.clusterDataSize = response.dataSize;
        if (response.dataSize) {
          this.clusterDataSize = this.clusterDataSize / 1024 / 1024 / 1024; //GB
        }
      });
  }

  getClusterCollectionCount(): void {
    this.mongoService
      .getClusterCollectionCount(this.selectedMongoService, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.clusterCollectionCount = response.collectionCount;
      });
  }

  getClusterObjectCount(): void {
    this.mongoService
      .getClusterObjectCount(this.selectedMongoService, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.clusterObjectCount = response.objectCount;
      });
  }

  getClusterDocumentTotalQPS(): void {
    this.mongoService
      .getClusterDocumentTotalQPS(this.selectedMongoService, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.chartClusterDocumentTotalQPS(response.documentQpsTimeSeries);
      });
  }

  getClusterOperationTotalQPS(): void {
    this.mongoService
      .getClusterOperationTotalQPS(this.selectedMongoService, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.chartClusterOperationTotalQPS(response.operationQpsTimeSeries);
      });
  }

  getClusterConnections(): void {
    this.mongoService
      .getClusterConnections(this.selectedMongoService, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.chartClusterConnections(response.connectionsTimeSeries);
      });
  }

  getClusterCursorTotal(): void {
    this.mongoService
      .getClusterCursorTotal(this.selectedMongoService, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.chartClusterCursorTotal(response.cursorTotalTimeSeries);
      });
  }


  // CHARTS

  chartClusterDocumentTotalQPS(
    data: {
      time_bucket: string;
      document_qps: number | null;
    }[]
  ): void {

    const documentSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.document_qps === 'number'
        ? d.document_qps
        : null
    }));

    const options: Highcharts.Options = {
      chart: {
        type: 'spline',
        backgroundColor: 'transparent',
        animation: false,
        reflow: true,
        spacing: [4, 6, 6, 6]
      },

      title: { text: undefined },

      xAxis: {
        type: 'datetime',
        tickAmount: 3,
        tickLength: 4,
        gridLineWidth: 0,
        labels: {
          style: {
            fontSize: '9px',
            color: '#000000'
          }
        },
        lineColor: 'rgba(0, 0, 0, 0.1)',
        tickColor: 'rgba(0, 0, 0, 0.1)'
      },

      yAxis: {
        min: 0,
        minPadding: 0.1,
        maxPadding: 0.1,
        tickAmount: 4,
        title: { text: undefined },
        labels: {
          style: {
            fontSize: '9px',
            color: '#000000'
          }
        },
        gridLineWidth: 1,
        gridLineColor: 'rgba(0,0,0,0.06)'
      },

      tooltip: {
        shared: true,
        xDateFormat: '%Y-%m-%d %H:%M',
        style: {
          fontSize: '11px'
        },
        pointFormat:
          '<span style="color:{series.color}">\u25CF</span> ' +
          '<b>{series.name}</b>: <b>{point.y}</b><br/>'
      },

      plotOptions: {
        spline: {
          linecap: 'round',
          lineWidth: 1.5,
          marker: {
            enabled: true,
            radius: 2
          },
          states: {
            inactive: {
              opacity: 1
            }
          }
        }
      },

      legend: {
        enabled: false
      },

      series: [
        {
          name: 'document_qps',
          type: 'spline',
          data: documentSeries,
          color: '#6fb3ff',
          lineWidth: 2
        }
      ],

      credits: { enabled: false }
    };

    if (!this.documentQpsChartInstance) {
      this.documentQpsChartInstance =
        Highcharts.chart('documentQps', options);
    } else {
      this.documentQpsChartInstance.update(options, true, true);
    }

    if (!this.documentQpsResizeBound) {
      this.documentQpsResizeBound = true;

      const reflowCharts = () => {
        Highcharts.charts.forEach(chart => {
          if (chart) {
            chart.reflow();
          }
        });
      };

      window.addEventListener('resize', reflowCharts);
      document.addEventListener('visibilitychange', reflowCharts);
    }
  }

  chartClusterOperationTotalQPS(
    data: {
      time_bucket: string;
      operation_qps: number | null;
    }[]
  ): void {

    const documentSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.operation_qps === 'number'
        ? d.operation_qps
        : null
    }));

    const options: Highcharts.Options = {
      chart: {
        type: 'spline',
        backgroundColor: 'transparent',
        animation: false,
        reflow: true,
        spacing: [4, 6, 6, 6]
      },

      title: { text: undefined },

      xAxis: {
        type: 'datetime',
        tickAmount: 3,
        tickLength: 4,
        gridLineWidth: 0,
        labels: {
          style: {
            fontSize: '9px',
            color: '#000000'
          }
        },
        lineColor: 'rgba(0, 0, 0, 0.1)',
        tickColor: 'rgba(0, 0, 0, 0.1)'
      },

      yAxis: {
        min: 0,
        minPadding: 0.1,
        maxPadding: 0.1,
        tickAmount: 4,
        title: { text: undefined },
        labels: {
          style: {
            fontSize: '9px',
            color: '#000000'
          }
        },
        gridLineWidth: 1,
        gridLineColor: 'rgba(0,0,0,0.06)'
      },

      tooltip: {
        shared: true,
        xDateFormat: '%Y-%m-%d %H:%M',
        style: {
          fontSize: '11px'
        },
        pointFormat:
          '<span style="color:{series.color}">\u25CF</span> ' +
          '<b>{series.name}</b>: <b>{point.y}</b><br/>'
      },

      plotOptions: {
        spline: {
          linecap: 'round',
          lineWidth: 1.5,
          marker: {
            enabled: true,
            radius: 2
          },
          states: {
            inactive: {
              opacity: 1
            }
          }
        }
      },

      legend: {
        enabled: false
      },

      series: [
        {
          name: 'operation_qps',
          type: 'spline',
          data: documentSeries,
          color: '#6fb3ff',
          lineWidth: 2
        }
      ],

      credits: { enabled: false }
    };

    if (!this.operationQpsChartInstance) {
      this.operationQpsChartInstance =
        Highcharts.chart('operationQps', options);
    } else {
      this.operationQpsChartInstance.update(options, true, true);
    }

    if (!this.operationQpsResizeBound) {
      this.operationQpsResizeBound = true;

      const reflowCharts = () => {
        Highcharts.charts.forEach(chart => {
          if (chart) {
            chart.reflow();
          }
        });
      };

      window.addEventListener('resize', reflowCharts);
      document.addEventListener('visibilitychange', reflowCharts);
    }
  }

  chartClusterConnections(
    data: {
      time_bucket: string;
      connections: number | null;
    }[]
  ): void {

    const documentSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.connections === 'number'
        ? d.connections
        : null
    }));

    const options: Highcharts.Options = {
      chart: {
        type: 'spline',
        backgroundColor: 'transparent',
        animation: false,
        reflow: true,
        spacing: [4, 6, 6, 6]
      },

      title: { text: undefined },

      xAxis: {
        type: 'datetime',
        tickAmount: 3,
        tickLength: 4,
        gridLineWidth: 0,
        labels: {
          style: {
            fontSize: '9px',
            color: '#000000'
          }
        },
        lineColor: 'rgba(0, 0, 0, 0.1)',
        tickColor: 'rgba(0, 0, 0, 0.1)'
      },

      yAxis: {
        min: 0,
        minPadding: 0.1,
        maxPadding: 0.1,
        tickAmount: 4,
        title: { text: undefined },
        labels: {
          style: {
            fontSize: '9px',
            color: '#000000'
          }
        },
        gridLineWidth: 1,
        gridLineColor: 'rgba(0,0,0,0.06)'
      },

      tooltip: {
        shared: true,
        xDateFormat: '%Y-%m-%d %H:%M',
        style: {
          fontSize: '11px'
        },
        pointFormat:
          '<span style="color:{series.color}">\u25CF</span> ' +
          '<b>{series.name}</b>: <b>{point.y}</b><br/>'
      },

      plotOptions: {
        spline: {
          linecap: 'round',
          lineWidth: 1.5,
          marker: {
            enabled: true,
            radius: 2
          },
          states: {
            inactive: {
              opacity: 1
            }
          }
        }
      },

      legend: {
        enabled: false
      },

      series: [
        {
          name: 'connections',
          type: 'spline',
          data: documentSeries,
          color: '#6fb3ff',
          lineWidth: 2
        }
      ],

      credits: { enabled: false }
    };

    if (!this.connectionsChartInstance) {
      this.connectionsChartInstance =
        Highcharts.chart('connections', options);
    } else {
      this.connectionsChartInstance.update(options, true, true);
    }

    if (!this.connectionsQpsResizeBound) {
      this.connectionsQpsResizeBound = true;

      const reflowCharts = () => {
        Highcharts.charts.forEach(chart => {
          if (chart) {
            chart.reflow();
          }
        });
      };

      window.addEventListener('resize', reflowCharts);
      document.addEventListener('visibilitychange', reflowCharts);
    }
  }

  chartClusterCursorTotal(
    data: {
      time_bucket: string;
      cursor_total: number | null;
    }[]
  ): void {

    const documentSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.cursor_total === 'number'
        ? d.cursor_total
        : null
    }));

    const options: Highcharts.Options = {
      chart: {
        type: 'spline',
        backgroundColor: 'transparent',
        animation: false,
        reflow: true,
        spacing: [4, 6, 6, 6]
      },

      title: { text: undefined },

      xAxis: {
        type: 'datetime',
        tickAmount: 3,
        tickLength: 4,
        gridLineWidth: 0,
        labels: {
          style: {
            fontSize: '9px',
            color: '#000000'
          }
        },
        lineColor: 'rgba(0, 0, 0, 0.1)',
        tickColor: 'rgba(0, 0, 0, 0.1)'
      },

      yAxis: {
        min: 0,
        minPadding: 0.1,
        maxPadding: 0.1,
        tickAmount: 4,
        title: { text: undefined },
        labels: {
          style: {
            fontSize: '9px',
            color: '#000000'
          }
        },
        gridLineWidth: 1,
        gridLineColor: 'rgba(0,0,0,0.06)'
      },

      tooltip: {
        shared: true,
        xDateFormat: '%Y-%m-%d %H:%M',
        style: {
          fontSize: '11px'
        },
        pointFormat:
          '<span style="color:{series.color}">\u25CF</span> ' +
          '<b>{series.name}</b>: <b>{point.y}</b><br/>'
      },

      plotOptions: {
        spline: {
          linecap: 'round',
          lineWidth: 1.5,
          marker: {
            enabled: true,
            radius: 2
          },
          states: {
            inactive: {
              opacity: 1
            }
          }
        }
      },

      legend: {
        enabled: false
      },

      series: [
        {
          name: 'cursor_total',
          type: 'spline',
          data: documentSeries,
          color: '#6fb3ff',
          lineWidth: 2
        }
      ],

      credits: { enabled: false }
    };

    if (!this.cursorTotalChartInstance) {
      this.cursorTotalChartInstance =
        Highcharts.chart('cursor_total', options);
    } else {
      this.cursorTotalChartInstance.update(options, true, true);
    }

    if (!this.cursorTotalQpsResizeBound) {
      this.cursorTotalQpsResizeBound = true;

      const reflowCharts = () => {
        Highcharts.charts.forEach(chart => {
          if (chart) {
            chart.reflow();
          }
        });
      };

      window.addEventListener('resize', reflowCharts);
      document.addEventListener('visibilitychange', reflowCharts);
    }
  }


  // NODE TAB

  getUniqueNodeNames(): void {
    this.mongoService
      .getNodesWithData(this.selectedMongoService, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: MongoNodeResponse) => {
        this.nodeNamesData = response.nodes;
        this.filteredNodeNamesData = [...this.nodeNamesData];
        this.totalItems = this.nodeNamesData.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        console.log(" NODE NAMES DATA :", this.nodeNamesData);
      });
  }

  // Pagination Methods
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.inputPage = this.currentPage;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.inputPage = this.currentPage;
    }
  }

  goToPage() {
    if (this.inputPage >= 1 && this.inputPage <= this.totalPages) {
      this.currentPage = this.inputPage;
    } else {
      this.inputPage = this.currentPage;
    }
  }

  resetCurrentPage(data: any[], searchText: string, fields: string[]) {
    this.currentPage = 1;
    this.inputPage = 1;
    const filtered = new ObjectFilterPipe().transform(data, searchText, fields);
    this.totalItems = filtered.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
  }

  sortData(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  // ROUTERS

  goToNonRelational() {
    this.router.navigate(['/database/non-relational'], { queryParams: { from: 'database' } });
  }

  goToMongoNode(instance: string) {
    sessionStorage.setItem("databaseInstanceId", instance);
    const encodedDatabaseInstance = btoa(instance);
    sessionStorage.setItem('encodedDatabaseInstanceId', encodedDatabaseInstance);
    this.router.navigate(['/database/non-relational/mongoCluster/mongoNode'], { queryParams: { from: 'database' } });
  }

  getImagePath(): string {
    return 'assets/images/mongo.png';
  }

  getImagePath2(): string {
    return 'assets/images/MongoLogo.png';
  }

  convertSeconds(seconds: number): string {
    if (!seconds || seconds <= 0) return '-';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    return `${hours}h ${minutes}m`;
  }

  convertTimebucket(timebucket: any) {
    timebucket = timebucket.toString();
    const year = parseInt(timebucket.slice(0, 4), 10);
    const month = parseInt(timebucket.slice(4, 6), 10) - 1;
    const day = parseInt(timebucket.slice(6, 8), 10);
    const hour = parseInt(timebucket.slice(8, 10), 10);
    const minute = parseInt(timebucket.slice(10, 12), 10);

    return new Date(year, month, day, hour, minute).getTime();
  }

  onSearch(event: any): void {
    const searchTerm = event.target.value.toLowerCase().trim();

    if (!searchTerm) {
      this.filteredNodeNamesData = [...this.nodeNamesData];
      return;
    }

    this.filteredNodeNamesData = this.nodeNamesData.filter(node => {

      const formattedNode = {
        ...node,
        avgLatency: Number(node.avgLatency).toFixed(3),
        uptimeFormatted: this.convertSeconds(node.uptimeSeconds)
      };

      return Object.values(formattedNode)
        .join(' ')
        .toLowerCase()
        .includes(searchTerm);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
  }

}
