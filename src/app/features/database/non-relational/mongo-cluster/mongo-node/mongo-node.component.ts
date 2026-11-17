import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DateService } from '../../../../../services/date.service';
import { MongoService } from '../../../../../services/mongo.service';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import * as Highcharts from 'highcharts';
import { NumericDataPipe } from '../../../../../pipes/numeric-data.pipe';
import { ShortNumberPipe } from '../../../../../pipes/short-number.pipe';

type AssertKey =
  | 'msg'
  | 'tripwire'
  | 'warning'
  | 'rollovers'
  | 'user'
  | 'regular';

@Component({
    selector: 'app-mongo-node',
    imports: [CommonModule, NumericDataPipe, ShortNumberPipe],
    templateUrl: './mongo-node.component.html',
    styleUrl: './mongo-node.component.css'
})
export class MongoNodeComponent implements OnInit, OnDestroy {

  subscription!: Subscription;
  private datesubscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();

  datemodel: any;
  startTime!: any;
  endTime!: any;

  selectedMongoService: any;
  decodedSelectedMongoService: any;
  selectedMongoInstance: any;
  decodedSelectedMongoInstance: any;

  entityId: any;
  nodeUptime: any;
  displayMain = '';
  displayRest = '';
  sinceDate: any;

  nodeQPS: any;
  nodeAvgLatency: any;
  nodeMemoryUsage: any;

  private cpuUsageChartInstance?: Highcharts.Chart;
  private nodeConnectionsChartInstance?: Highcharts.Chart;
  private nodeConnectionsResizeBound = false;
  private documentQpsChartInstance?: Highcharts.Chart;
  private documentQpsResizeBound = false;
  private operationQpsChartInstance?: Highcharts.Chart;
  private operationQpsResizeBound = false;
  private replOperationQpsChartInstance?: Highcharts.Chart;
  private replOperationQpsResizeBound = false;
  private cursorChartInstance?: Highcharts.Chart;
  private cursorResizeBound = false;
  private replBufferCountChartInstance?: Highcharts.Chart;
  private replBufferCountResizeBound = false;
  private writeWaitTimeChartInstance?: Highcharts.Chart;
  private writeWaitTimeResizeBound = false;
  private networkBytesChartInstance?: Highcharts.Chart;
  private networkBytesResizeBound = false;
  private memoryChartInstance?: Highcharts.Chart;
  private memoryResizeBound = false;
  private fsChartInstance?: Highcharts.Chart;
  private fsResizeBound = false;
  private activeConnectionsChartInstance?: Highcharts.Chart;
  private activeConnectionsResizeBound = false;
  private transactionsChartInstance?: Highcharts.Chart;
  private transactionsResizeBound = false;
  private latencyOpChartInstance?: Highcharts.Chart;
  private latencyOpResizeBound = false;
  private serverMemoryChartInstance?: Highcharts.Chart;
  private serverMemoryResizeBound = false;
  private assertsChartInstance?: Highcharts.Chart;
  private assertsResizeBound = false;
  private replBufferChartInstance?: Highcharts.Chart;
  private replBufferResizeBound = false;
  private queuedOperationsChartInstance?: Highcharts.Chart;
  private queuedOperationsResizeBound = false;
  private writeWaitChartInstance?: Highcharts.Chart;
  private writeWaitResizeBound = false;

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
    this.selectedMongoInstance = sessionStorage.getItem("encodedDatabaseInstanceId");
    this.decodedSelectedMongoInstance = sessionStorage.getItem("databaseInstanceId");
    this.entityId = this.selectedMongoService + "_" + this.selectedMongoInstance;
    this.dateService.setActiveComponent('MongoNodeComponent');
    this.datesubscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'MongoNodeComponent'),
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
    this.getNodeUptime();
    this.getNodeQPS();
    this.getNodeAvgLatency();
    this.getNodeMemoryUsage();
    this.getNodeCpuTotalPercentage();
    this.getNodeConnections();
    this.getNodeDocumentQPS();
    this.getNodeOperationQPS();
    this.getNodeReplOperationQPS();
    this.getNodeCursor();
    this.getNodeReplBufferCount();
    this.getNodeWriteWaitTime();
    this.getNodeNetworkBytes();
    this.getNodeMemoryFreeGB();
    this.getNodeDiskGB();
    this.getNodeActiveClients();
    this.getNodeTransactions();
    this.getNodeOperationLatency();
    this.getNodeServerStatusMemory();
    this.getNodeAsserts();
    this.getNodeReplBufferSize();
    this.getNodeQueuedOperation();
    this.getNodeWriteWaitNum();
  }

  getNodeUptime(): void {
    this.mongoService
      .getNodeUptime(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.nodeUptime = response.uptime;
        const days = Math.floor(this.nodeUptime / 86400);
        const hours = Math.floor((this.nodeUptime % 86400) / 3600);
        const minutes = Math.floor((this.nodeUptime % 3600) / 60);
        const seconds = this.nodeUptime % 60;

        if (days > 0) {
          this.displayMain = `${days}d`;
          this.displayRest = `${hours}h ${minutes}m ${seconds}s`;
        } else {
          this.displayMain = `${hours}h`;
          this.displayRest = `${minutes}m ${seconds}s`;
        }

        this.sinceDate = new Date(Date.now() - this.nodeUptime * 1000);
      });
  }

  getNodeQPS(): void {
    this.mongoService
      .getNodeQps(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.nodeQPS = response.qps;
      });
  }

  getNodeAvgLatency(): void {
    this.mongoService
      .getNodeAvgLatency(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.nodeAvgLatency = response.avgLatency;
      });
  }

  getNodeMemoryUsage(): void {
    this.mongoService
      .getNodeMemoryUsage(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.nodeMemoryUsage = response.memoryUsage;
      });
  }

  getNodeCpuTotalPercentage(): void {
    this.mongoService
      .getNodeCpuTotalPercentage(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.chartCpuUsage(response.cpuTotalPercentageTimeSeries);
      });
  }

  getNodeConnections(): void {
    this.mongoService
      .getNodeConnections(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.chartNodeConnections(response.connectionsTimeSeries);
      });
  }

  getNodeDocumentQPS(): void {
    this.mongoService
      .getNodeDocumentQPS(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.chartNodeDocumentQPS(response.documentQpsTimeSeries);
      });
  }

  getNodeOperationQPS(): void {
    this.mongoService
      .getNodeOperationQPS(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.chartNodeOperationQPS(response.operationQpsTimeSeries);
      });
  }

  getNodeReplOperationQPS(): void {
    this.mongoService
      .getNodeReplOperationQPS(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.chartNodeReplOperationQPS(response.replOperationQpsTimeSeries);
      });
  }

  getNodeCursor(): void {
    this.mongoService
      .getNodeCursor(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.chartNodeCursor(response.cursorTimeSeries);
      });
  }

  getNodeReplBufferCount(): void {
    this.mongoService
      .getNodeReplBufferCount(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.chartNodeReplBufferCount(response.replBufferCountTimeSeries);
      });
  }

  getNodeWriteWaitTime(): void {
    this.mongoService
      .getNodeWriteWaitTime(this.entityId, this.startTime, this.endTime).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        this.chartNodeWriteWaitTime(response.writeWaitTimeTimeSeries);
      });
  }

  getNodeNetworkBytes(): void {
    this.mongoService
      .getNodeNetworkBytes(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.chartNodeNetworkBytes(response.networkBytesTimeSeries);
      });
  }

  getNodeMemoryFreeGB(): void {
    this.mongoService
      .getNodeMemoryFreeKb(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.chartNodeMemoryFreeGB(response.memoryTimeSeries);
      });
  }

  getNodeDiskGB(): void {
    this.mongoService
      .getNodeDiskKb(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.chartNodeDiskGB(response.fsTimeSeries);
      });
  }

  getNodeActiveClients(): void {
    this.mongoService
      .getNodeActiveClients(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.chartNodeActiveConnections(response.activeTimeSeries);
      });
  }

  getNodeTransactions(): void {
    this.mongoService
      .getNodeTransactions(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.chartNodeTransactions(response.transactionsTimeSeries);
      });
  }

  getNodeOperationLatency(): void {
    this.mongoService
      .getNodeOperationLatency(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.chartNodeOperationLatency(response.operationLatencyTimeSeries);
      });
  }

  getNodeServerStatusMemory(): void {
    this.mongoService
      .getNodeServerStatusMemory(
        this.entityId,
        this.startTime,
        this.endTime
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {

        this.chartServerMemory(response.memoryTimeSeries);
      });
  }

  getNodeAsserts(): void {
    this.mongoService
      .getNodeAsserts(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.chartNodeAsserts(response.assertsTimeSeries);
      });
  }

  getNodeReplBufferSize(): void {
    this.mongoService
      .getNodeReplBufferSize(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.chartNodeReplBuffer(response.replBufferMergedTimeSeries);
      });
  }

  getNodeQueuedOperation(): void {
    this.mongoService
      .getNodeQueuedOperation(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.chartNodeQueuedOperations(response.queuedOperationTimeSeries);
      });
  }

  getNodeWriteWaitNum(): void {
    this.mongoService
      .getNodeWriteWaitNum(this.entityId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response: any) => {
        this.chartNodeWriteWaitMetrics(response.timeSeries);
      });
  }


  // CHARTS

  chartCpuUsage(
    data: { time_bucket: string; cpu_total_percentage: number | null }[]): void {

    const seriesData = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.cpu_total_percentage === 'number'
        ? d.cpu_total_percentage
        : null
    }));

    const options: Highcharts.Options = {
      chart: {
        type: 'spline',
        backgroundColor: 'transparent',
        animation: false,
        reflow: false,
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
        tickAmount: 4,
        maxPadding: 0.05,
        minPadding: 0.05,

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
        pointFormat: '<span style="color:{series.color}">\u25CF</span> ' + '<b>cpu_usage: {point.y:.1f}</b><br/>'
      },

      plotOptions: {
        spline: {
          linecap: 'round',
          states: {
            inactive: {
              opacity: 1
            }
          }
        }
      },

      legend: { enabled: false },

      series: [
        {
          name: 'cpu_usage',
          type: 'spline',
          data: seriesData,

          color: '#6fb3ff',
          lineWidth: 1.5,
          marker: {
            enabled: true,
            radius: 1.5,
            symbol: 'circle'
          },
          states: {
            hover: {
              lineWidth: 2
            }
          }
        }
      ],

      credits: { enabled: false }
    };

    if (!this.cpuUsageChartInstance) {
      this.cpuUsageChartInstance = Highcharts.chart('cpuUsageChart', options);
    } else {
      this.cpuUsageChartInstance.update(options, true, true);
    }
  }

  chartNodeConnections(
    data: { time_bucket: string; connections: number | null }[]): void {

    const seriesData = (data || []).map(d => ({
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
        tickAmount: 4,
        maxPadding: 0.05,
        minPadding: 0.05,

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
        pointFormat: '<span style="color:{series.color}">\u25CF</span> ' + '<b>connections: {point.y}</b><br/>'
      },

      plotOptions: {
        spline: {
          linecap: 'round',
          states: {
            inactive: {
              opacity: 1
            }
          }
        }
      },

      legend: { enabled: false },

      series: [
        {
          name: 'Connections',
          type: 'spline',
          data: seriesData,

          color: '#6fb3ff',
          lineWidth: 1.5,
          marker: {
            enabled: true,
            radius: 1.5,
            symbol: 'circle'
          },
          states: {
            hover: {
              lineWidth: 2
            }
          }
        }
      ],

      credits: { enabled: false }
    };

    if (!this.nodeConnectionsChartInstance) {
      this.nodeConnectionsChartInstance = Highcharts.chart('nodeConnections', options);
    } else {
      this.nodeConnectionsChartInstance.update(options, true, true);
    }

    if (!this.nodeConnectionsResizeBound) {
      this.nodeConnectionsResizeBound = true;

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

  chartNodeDocumentQPS(
    data: { time_bucket: string; document_qps: number | null }[]): void {

    const seriesData = (data || []).map(d => ({
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
        tickAmount: 4,
        maxPadding: 0.05,
        minPadding: 0.05,

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
        pointFormat: '<span style="color:{series.color}">\u25CF</span> ' + '<b>document_qps: {point.y}</b><br/>'
      },

      plotOptions: {
        spline: {
          linecap: 'round',
          states: {
            inactive: {
              opacity: 1
            }
          }
        }
      },

      legend: { enabled: false },

      series: [
        {
          name: 'Document QPS',
          type: 'spline',
          data: seriesData,

          color: '#6fb3ff',
          lineWidth: 1.5,
          marker: {
            enabled: true,
            radius: 1.5,
            symbol: 'circle'
          },
          states: {
            hover: {
              lineWidth: 2
            }
          }
        }
      ],

      credits: { enabled: false }
    };

    if (!this.documentQpsChartInstance) {
      this.documentQpsChartInstance = Highcharts.chart('documentQps', options);
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

  chartNodeOperationQPS(
    data: { time_bucket: string; operation_qps: number | null }[]): void {

    const seriesData = (data || []).map(d => ({
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
        tickAmount: 4,
        maxPadding: 0.05,
        minPadding: 0.05,

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
        pointFormat: '<span style="color:{series.color}">\u25CF</span> ' + '<b>operation_qps: {point.y}</b><br/>'
      },

      plotOptions: {
        spline: {
          linecap: 'round',
          states: {
            inactive: {
              opacity: 1
            }
          }
        }
      },

      legend: { enabled: false },

      series: [
        {
          name: 'Operation QPS',
          type: 'spline',
          data: seriesData,

          color: '#6fb3ff',
          lineWidth: 1.5,
          marker: {
            enabled: true,
            radius: 1.5,
            symbol: 'circle'
          },
          states: {
            hover: {
              lineWidth: 2
            }
          }
        }
      ],

      credits: { enabled: false }
    };

    if (!this.operationQpsChartInstance) {
      this.operationQpsChartInstance = Highcharts.chart('operationQps', options);
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

  chartNodeReplOperationQPS(
    data: { time_bucket: string; repl_operation_qps: number | null }[]): void {

    const seriesData = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.repl_operation_qps === 'number'
        ? d.repl_operation_qps
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
        tickAmount: 4,
        maxPadding: 0.05,
        minPadding: 0.05,

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
        pointFormat: '<span style="color:{series.color}">\u25CF</span> ' + '<b>repl_operation_qps: {point.y}</b><br/>'
      },

      plotOptions: {
        spline: {
          linecap: 'round',
          states: {
            inactive: {
              opacity: 1
            }
          }
        }
      },

      legend: { enabled: false },

      series: [
        {
          name: 'Repl Operation QPS',
          type: 'spline',
          data: seriesData,

          color: '#6fb3ff',
          lineWidth: 1.5,
          marker: {
            enabled: true,
            radius: 1.5,
            symbol: 'circle'
          },
          states: {
            hover: {
              lineWidth: 2
            }
          }
        }
      ],

      credits: { enabled: false }
    };

    if (!this.replOperationQpsChartInstance) {
      this.replOperationQpsChartInstance = Highcharts.chart('replOperationQps', options);
    } else {
      this.replOperationQpsChartInstance.update(options, true, true);
    }

    if (!this.replOperationQpsResizeBound) {
      this.replOperationQpsResizeBound = true;

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

  chartNodeCursor(
    data: { time_bucket: string; cursor: number | null }[]): void {

    const seriesData = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.cursor === 'number'
        ? d.cursor
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
        tickAmount: 4,
        maxPadding: 0.05,
        minPadding: 0.05,

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
        pointFormat: '<span style="color:{series.color}">\u25CF</span> ' + '<b>cursor: {point.y}</b><br/>'
      },

      plotOptions: {
        spline: {
          linecap: 'round',
          states: {
            inactive: {
              opacity: 1
            }
          }
        }
      },

      legend: { enabled: false },

      series: [
        {
          name: 'Cursor',
          type: 'spline',
          data: seriesData,

          color: '#6fb3ff',
          lineWidth: 1.5,
          marker: {
            enabled: true,
            radius: 1.5,
            symbol: 'circle'
          },
          states: {
            hover: {
              lineWidth: 2
            }
          }
        }
      ],

      credits: { enabled: false }
    };

    if (!this.cursorChartInstance) {
      this.cursorChartInstance = Highcharts.chart('cursor', options);
    } else {
      this.cursorChartInstance.update(options, true, true);
    }

    if (!this.cursorResizeBound) {
      this.cursorResizeBound = true;

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

  chartNodeReplBufferCount(
    data: { time_bucket: string; repl_buffer_count: number | null }[]): void {

    const seriesData = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.repl_buffer_count === 'number'
        ? d.repl_buffer_count
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
        tickAmount: 4,
        maxPadding: 0.05,
        minPadding: 0.05,

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
        pointFormat: '<span style="color:{series.color}">\u25CF</span> ' + '<b>repl_buffer_count: {point.y}</b><br/>'
      },

      plotOptions: {
        spline: {
          linecap: 'round',
          states: {
            inactive: {
              opacity: 1
            }
          }
        }
      },

      legend: { enabled: false },

      series: [
        {
          name: 'Repl Buffer Count',
          type: 'spline',
          data: seriesData,

          color: '#6fb3ff',
          lineWidth: 1.5,
          marker: {
            enabled: true,
            radius: 1.5,
            symbol: 'circle'
          },
          states: {
            hover: {
              lineWidth: 2
            }
          }
        }
      ],

      credits: { enabled: false }
    };

    if (!this.replBufferCountChartInstance) {
      this.replBufferCountChartInstance = Highcharts.chart('replBufferCount', options);
    } else {
      this.replBufferCountChartInstance.update(options, true, true);
    }

    if (!this.replBufferCountResizeBound) {
      this.replBufferCountResizeBound = true;

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

  chartNodeWriteWaitTime(
    data: { time_bucket: string; writeWaitTime: number | null }[]): void {

    const seriesData = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof (d as any).value === 'number'
        ? (d as any).value
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
        tickAmount: 4,
        maxPadding: 0.05,
        minPadding: 0.05,

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
        pointFormat: '<span style="color:{series.color}">\u25CF</span> ' + '<b>write_wait_time: {point.y}</b><br/>'
      },

      plotOptions: {
        spline: {
          linecap: 'round',
          states: {
            inactive: {
              opacity: 1
            }
          }
        }
      },

      legend: { enabled: false },

      series: [
        {
          name: 'Write wait time',
          type: 'spline',
          data: seriesData,

          color: '#6fb3ff',
          lineWidth: 1.5,
          marker: {
            enabled: true,
            radius: 1.5,
            symbol: 'circle'
          },
          states: {
            hover: {
              lineWidth: 2
            }
          }
        }
      ],

      credits: { enabled: false }
    };

    if (!this.writeWaitTimeChartInstance) {
      this.writeWaitTimeChartInstance = Highcharts.chart('writeWaitTime', options);
    } else {
      this.writeWaitTimeChartInstance.update(options, true, true);
    }

    if (!this.writeWaitTimeResizeBound) {
      this.writeWaitTimeResizeBound = true;

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

  chartNodeNetworkBytes(
    data: {
      time_bucket: string;
      network_bytes_in: number | null;
      network_bytes_out: number | null;
    }[]
  ): void {

    const inSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.network_bytes_in === 'number'
        ? d.network_bytes_in
        : null
    }));

    const outSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.network_bytes_out === 'number'
        ? d.network_bytes_out
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
        tickAmount: 4,
        maxPadding: 0.05,
        minPadding: 0.05,
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
        pointFormat:
          '<span style="color:{series.color}">\u25CF</span> ' +
          '<b>{series.name}</b>: <b>{point.y}</b><br/>',
        style: {
          fontSize: '11px'
        }
      },

      plotOptions: {
        spline: {
          linecap: 'round',
          states: {
            inactive: { opacity: 1 }
          }
        }
      },

      legend: {
        enabled: false,
      },

      series: [
        {
          name: 'in',
          type: 'spline',
          data: inSeries,
          color: '#6fb3ff',
          lineWidth: 1.5,
          marker: {
            enabled: true,
            radius: 1.5
          }
        },
        {
          name: 'out',
          type: 'spline',
          data: outSeries,
          color: '#ff8c69',
          lineWidth: 1.5,
          marker: {
            enabled: true,
            radius: 1.5
          }
        }
      ],

      credits: { enabled: false }
    };

    if (!this.networkBytesChartInstance) {
      this.networkBytesChartInstance =
        Highcharts.chart('networkBytes', options);
    } else {
      this.networkBytesChartInstance.update(options, true, true);
    }

    if (!this.networkBytesResizeBound) {
      this.networkBytesResizeBound = true;

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

  chartNodeMemoryFreeGB(
    data: {
      time_bucket: string;
      memory_free_kb: number | null;
      swap_memory_free_kb: number | null;
    }[]
  ): void {

    const memorySeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.memory_free_kb === 'number'
        ? +(d.memory_free_kb / (1024 * 1024)).toFixed(2)
        : null
    }));

    const swapSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.swap_memory_free_kb === 'number'
        ? +(d.swap_memory_free_kb / (1024 * 1024)).toFixed(2)
        : null
    }));

    const options: Highcharts.Options = {
      chart: {
        type: 'column',
        backgroundColor: 'transparent',
        animation: false,
        spacing: [4, 6, 6, 6]
      },

      title: { text: undefined },

      xAxis: {
        type: 'datetime',
        tickAmount: 3,
        tickLength: 4,
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
        tickAmount: 4,
        title: {
          text: undefined,
          style: {
            fontSize: '9px'
          }
        },
        labels: {
          style: {
            fontSize: '9px',
            color: '#000000'
          }
        },
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
          '<b>{series.name}</b>: <b> {point.y} </b> <br/>'
      },

      plotOptions: {
        column: {
          borderRadius: 2,
          pointWidth: 5,
          pointPadding: 0.1,
          groupPadding: 0.15
        }
      },

      legend: {
        enabled: false,
      },

      series: [
        {
          name: 'memory',
          type: 'column',
          data: memorySeries,
          color: '#b795cb'
        },
        {
          name: 'swap',
          type: 'column',
          data: swapSeries,
          color: '#0077b6'
        }
      ],

      credits: { enabled: false }
    };

    if (!this.memoryChartInstance) {
      this.memoryChartInstance = Highcharts.chart('memoryFree', options);
    } else {
      this.memoryChartInstance.update(options, true, true);
    }

    if (!this.memoryResizeBound) {
      this.memoryResizeBound = true;

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

  chartNodeDiskGB(
    data: {
      time_bucket: string;
      fs_used_size: number | null;
      fs_total_size: number | null;
    }[]
  ): void {

    const fsUsedSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.fs_used_size === 'number'
        ? +(d.fs_used_size / (1024 * 1024 * 1024)).toFixed(2)
        : null
    }));

    const fsTotalSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.fs_total_size === 'number'
        ? +(d.fs_total_size / (1024 * 1024 * 1024)).toFixed(2)
        : null
    }));

    const options: Highcharts.Options = {
      chart: {
        type: 'area',
        backgroundColor: 'transparent',
        animation: false,
        spacing: [4, 6, 6, 6]
      },

      title: { text: undefined },

      xAxis: {
        type: 'datetime',
        tickAmount: 3,
        tickLength: 4,
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
        tickAmount: 4,
        title: { text: undefined },
        labels: {
          style: {
            fontSize: '9px',
            color: '#000000'
          }
        },
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
        area: {
          stacking: undefined,
          lineWidth: 1.5,
          fillOpacity: 0.25,
          marker: {
            enabled: false,
            radius: 1.5
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
          name: 'used',
          type: 'area',
          data: fsUsedSeries,
          color: '#b795cb'
        },
        {
          name: 'total',
          type: 'area',
          data: fsTotalSeries,
          color: '#0077b6'
        }
      ],

      credits: { enabled: false }
    };

    if (!this.fsChartInstance) {
      this.fsChartInstance = Highcharts.chart('diskGb', options);
    } else {
      this.fsChartInstance.update(options, true, true);
    }

    if (!this.fsResizeBound) {
      this.fsResizeBound = true;

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

  chartNodeActiveConnections(
    data: {
      time_bucket: string;
      active_total_num: number | null;
      active_reader_num: number | null;
      active_writer_num: number | null;
    }[]
  ): void {

    const totalSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.active_total_num === 'number'
        ? d.active_total_num
        : null
    }));

    const readerSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.active_reader_num === 'number'
        ? d.active_reader_num
        : null
    }));

    const writerSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.active_writer_num === 'number'
        ? d.active_writer_num
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
            radius: 1.5,
            symbol: 'circle'
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
          name: 'total',
          type: 'spline',
          data: totalSeries,
          color: '#6fb3ff',
          lineWidth: 2
        },
        {
          name: 'reader',
          type: 'spline',
          data: readerSeries,
          color: '#b795cb'
        },
        {
          name: 'writer',
          type: 'spline',
          data: writerSeries,
          color: '#ff8c69'
        }
      ],

      credits: { enabled: false }
    };

    if (!this.activeConnectionsChartInstance) {
      this.activeConnectionsChartInstance =
        Highcharts.chart('activeConnections', options);
    } else {
      this.activeConnectionsChartInstance.update(options, true, true);
    }

    if (!this.activeConnectionsResizeBound) {
      this.activeConnectionsResizeBound = true;

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

  chartNodeTransactions(
    data: {
      time_bucket: string;
      transactions_active: number | null;
      transactions_inactive: number | null;
    }[]
  ): void {

    const activeSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.transactions_active === 'number'
        ? d.transactions_active
        : null
    }));

    const inactiveSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.transactions_inactive === 'number'
        ? d.transactions_inactive
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
          name: 'active',
          type: 'spline',
          data: activeSeries,
          color: '#6fb3ff',
          lineWidth: 2
        },
        {
          name: 'inactive',
          type: 'spline',
          data: inactiveSeries,
          color: '#ff8c69'
        }
      ],

      credits: { enabled: false }
    };

    if (!this.transactionsChartInstance) {
      this.transactionsChartInstance =
        Highcharts.chart('transactions', options);
    } else {
      this.transactionsChartInstance.update(options, true, true);
    }

    if (!this.transactionsResizeBound) {
      this.transactionsResizeBound = true;

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

  chartNodeOperationLatency(
    data: {
      time_bucket: string;
      reads?: number | null;
      writes?: number | null;
      commands?: number | null;
      transactions?: number | null;
    }[]
  ): void {

    const toX = (tb: string) => this.convertTimebucket(tb);

    const rowByX = new Map<number, {
      reads?: number | null;
      writes?: number | null;
      commands?: number | null;
      transactions?: number | null;
    }>();

    (data || []).forEach(d => {
      rowByX.set(toX(d.time_bucket), d);
    });

    const hasRealData = (data || []).some(d =>
      typeof d.reads === 'number' ||
      typeof d.writes === 'number' ||
      typeof d.commands === 'number' ||
      typeof d.transactions === 'number'
    );

    const mkLineSeries = (
      key: 'reads' | 'writes' | 'commands' | 'transactions',
      name: string,
      color: string
    ): Highcharts.SeriesSplineOptions => ({
      name,
      type: 'spline',
      color,
      data: (data || []).map(d => ({
        x: toX(d.time_bucket),
        y: typeof d[key] === 'number' ? d[key] : null
      }))
    });

    const hoverSeries: Highcharts.SeriesScatterOptions = {
      type: 'scatter',
      showInLegend: false,
      enableMouseTracking: true,
      marker: { radius: 0 },
      data: (data || []).map(d => ({
        x: toX(d.time_bucket),
        y: 0
      }))
    };

    const SERIES_COLOR: Record<string, string> = {
      commands: '#6fb3ff',
      reads: '#b795cb',
      transactions: '#ff8c69',
      writes: '#2ec4b6'
    };

    const NULL_COLOR = '#9aa0a6';

    const options: Highcharts.Options = {
      chart: {
        type: 'spline',
        backgroundColor: 'transparent',
        animation: false,
        reflow: true,
        spacingBottom: 6
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
        title: { text: undefined },
        tickAmount: 4,
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
        shared: false,
        useHTML: true,
        formatter: function () {
          const x = this.x as number;
          const row = rowByX.get(x);

          if (!row) return '';

          const fmt = (v?: number | null) =>
            typeof v === 'number' ? v.toFixed(3) : 'NaN';

          const line = (
            label: string,
            value: number | null | undefined,
            color: string
          ) => {
            const dotColor =
              typeof value === 'number' ? color : NULL_COLOR;

            return `
        <span style="color:${dotColor}">●</span>
        <b>${label}</b>: <b>${fmt(value)}</b><br/>
      `;
          };

          return `
      <b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', x)}</b><br/>
      ${line('op_type-commands', row.commands, SERIES_COLOR['commands'])}
      ${line('op_type-reads', row.reads, SERIES_COLOR['reads'])}
      ${line('op_type-transactions', row.transactions, SERIES_COLOR['transactions'])}
      ${line('op_type-writes', row.writes, SERIES_COLOR['writes'])}
    `;
        }
      },


      plotOptions: {
        series: {
          connectNulls: false,
          states: {
            inactive: { opacity: 1 }
          }
        },
        spline: {
          linecap: 'round',
          lineWidth: 1.5,
          marker: {
            enabled: true,
            radius: 1.5,
            symbol: 'circle'
          },
          states: {
            inactive: {
              opacity: 1
            }
          }
        }
      },

      legend: { enabled: false },

      series: hasRealData
        ? [
          hoverSeries,
          mkLineSeries('commands', 'op_type-commands', '#6fb3ff'),
          mkLineSeries('reads', 'op_type-reads', '#b795cb'),
          mkLineSeries('transactions', 'op_type-transactions', '#ff8c69'),
          mkLineSeries('writes', 'op_type-writes', '#2ec4b6')
        ]
        : []
      ,

      credits: { enabled: false }
    };

    if (!this.latencyOpChartInstance) {
      this.latencyOpChartInstance =
        Highcharts.chart('latencyOpRate', options);
    } else {
      this.latencyOpChartInstance.update(options, true, true);
    }

    if (!this.latencyOpResizeBound) {
      this.latencyOpResizeBound = true;

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

  chartServerMemory(
    data: {
      time_bucket: string;
      virtual_memory_mb: number | null;
      resident_memory_mb: number | null;
    }[]
  ): void {

    const virtualSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.virtual_memory_mb === 'number'
        ? d.virtual_memory_mb
        : null
    }));

    const residentSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.resident_memory_mb === 'number'
        ? d.resident_memory_mb
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
          },
          formatter() {
            return `${this.value}`;
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
          name: 'virtual',
          type: 'spline',
          data: virtualSeries,
          color: '#6fb3ff',
          lineWidth: 2
        },
        {
          name: 'resident',
          type: 'spline',
          data: residentSeries,
          color: '#52c41a'
        }
      ],

      credits: { enabled: false }
    };

    if (!this.serverMemoryChartInstance) {
      this.serverMemoryChartInstance =
        Highcharts.chart('serverMemory', options);
    } else {
      this.serverMemoryChartInstance.update(options, true, true);
    }

    if (!this.serverMemoryResizeBound) {
      this.serverMemoryResizeBound = true;

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

  chartNodeAsserts(
    data: {
      time_bucket: string;
      asserts: {
        msg?: { count: number | null };
        tripwire?: { count: number | null };
        warning?: { count: number | null };
        rollovers?: { count: number | null };
        user?: { count: number | null };
        regular?: { count: number | null };
      } | null;
    }[]
  ): void {

    const mapSeries = (key: AssertKey) =>
      (data || []).map(d => {
        const assertEntry = d.asserts?.[key];

        return {
          x: this.convertTimebucket(d.time_bucket),
          y:
            assertEntry && typeof assertEntry.count === 'number'
              ? assertEntry.count
              : null
        };
      });


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
        tickAmount: 4,
        title: { text: undefined },
        labels: {
          style: { fontSize: '9px', color: '#000' }
        },
        gridLineColor: 'rgba(0,0,0,0.06)'
      },

      tooltip: {
        shared: true,
        xDateFormat: '%Y-%m-%d %H:%M',
        style: {
          fontSize: '11px'
        },
        pointFormat:
          '<span style="color:{series.color}">●</span> ' +
          '<b>{series.name}</b>: <b>{point.y}</b><br/>'
      },

      plotOptions: {
        spline: {
          lineWidth: 1.5,
          marker: { enabled: true, radius: 2 },
          states: {
            inactive: { opacity: 1 }
          }
        }
      },

      legend: {
        enabled: false
      },

      series: [
        { name: 'msg', type: 'spline', data: mapSeries('msg'), color: '#6fb3ff' },
        { name: 'tripwire', type: 'spline', data: mapSeries('tripwire'), color: '#ff8c69' },
        { name: 'warning', type: 'spline', data: mapSeries('warning'), color: '#ffc107' },
        { name: 'rollovers', type: 'spline', data: mapSeries('rollovers'), color: '#9c27b0' },
        { name: 'user', type: 'spline', data: mapSeries('user'), color: '#4caf50' },
        { name: 'regular', type: 'spline', data: mapSeries('regular'), color: '#607d8b' }
      ],

      credits: { enabled: false }
    };

    if (!this.assertsChartInstance) {
      this.assertsChartInstance = Highcharts.chart('asserts', options);
    } else {
      this.assertsChartInstance.update(options, true, true);
    }

    if (!this.assertsResizeBound) {
      this.assertsResizeBound = true;

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

  chartNodeReplBuffer(
    data: {
      time_bucket: string;
      repl_buffer_size: number | null;
      repl_buffer_size_max: number | null;
    }[]
  ): void {

    const bufferSizeSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.repl_buffer_size === 'number'
        ? d.repl_buffer_size / (1024 * 1024)
        : null
    }));

    const bufferSizeMaxSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.repl_buffer_size_max === 'number'
        ? d.repl_buffer_size_max / (1024 * 1024)
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
        tickAmount: 4,
        title: { text: undefined },
        labels: {
          style: { fontSize: '9px', color: '#000' }
        },
        gridLineColor: 'rgba(0,0,0,0.06)'
      },

      tooltip: {
        shared: true,
        xDateFormat: '%Y-%m-%d %H:%M',
        style: { fontSize: '11px' },
        pointFormat:
          '<span style="color:{series.color}">●</span> ' +
          '<b>{series.name}</b>: <b>{point.y}</b><br/>'
      },

      plotOptions: {
        spline: {
          lineWidth: 1.5,
          marker: { enabled: true, radius: 2 },
          states: {
            inactive: { opacity: 1 }
          }
        }
      },

      legend: {
        enabled: false
      },

      series: [
        {
          name: 'current',
          type: 'spline',
          data: bufferSizeSeries,
          color: '#6fb3ff'
        },
        {
          name: 'max',
          type: 'spline',
          data: bufferSizeMaxSeries,
          color: '#ff8c69'
        }
      ],

      credits: { enabled: false }
    };

    if (!this.replBufferChartInstance) {
      this.replBufferChartInstance =
        Highcharts.chart('replBuffer', options);
    } else {
      this.replBufferChartInstance.update(options, true, true);
    }

    if (!this.replBufferResizeBound) {
      this.replBufferResizeBound = true;

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

  chartNodeQueuedOperations(
    data: {
      time_bucket: string;
      value: {
        total: number | null;
        readers: number | null;
        writers: number | null;
      };
    }[]
  ): void {

    const totalSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.value?.total === 'number' ? d.value.total : null
    }));

    const readersSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.value?.readers === 'number' ? d.value.readers : null
    }));

    const writersSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y: typeof d.value?.writers === 'number' ? d.value.writers : null
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
            radius: 1.5
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
          name: 'total',
          type: 'spline',
          data: totalSeries,
          color: '#6fb3ff',
          lineWidth: 2
        },
        {
          name: 'readers',
          type: 'spline',
          data: readersSeries,
          color: '#4caf50'
        },
        {
          name: 'writers',
          type: 'spline',
          data: writersSeries,
          color: '#ff8c69'
        }
      ],

      credits: { enabled: false }
    };

    if (!this.queuedOperationsChartInstance) {
      this.queuedOperationsChartInstance =
        Highcharts.chart('queued-operations', options);
    } else {
      this.queuedOperationsChartInstance.update(options, true, true);
    }

    if (!this.queuedOperationsResizeBound) {
      this.queuedOperationsResizeBound = true;

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

  chartNodeWriteWaitMetrics(
    data: {
      time_bucket: string;
      writeWait: { value: number | null } | null;
      writeWaitTimeout: { value: number | null } | null;
    }[]
  ): void {

    const writeWaitSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y:
        typeof d.writeWait?.value === 'number'
          ? d.writeWait.value
          : null
    }));

    const writeWaitTimeoutSeries = (data || []).map(d => ({
      x: this.convertTimebucket(d.time_bucket),
      y:
        typeof d.writeWaitTimeout?.value === 'number'
          ? d.writeWaitTimeout.value
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
            radius: 1.5
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
          name: 'total',
          type: 'spline',
          data: writeWaitSeries,
          color: '#6fb3ff',
          lineWidth: 2
        },
        {
          name: 'timeout',
          type: 'spline',
          data: writeWaitTimeoutSeries,
          color: '#ff8c69'
        }
      ],

      credits: { enabled: false }
    };

    if (!this.writeWaitChartInstance) {
      this.writeWaitChartInstance =
        Highcharts.chart('write-wait-metrics', options);
    } else {
      this.writeWaitChartInstance.update(options, true, true);
    }

    if (!this.writeWaitResizeBound) {
      this.writeWaitResizeBound = true;

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


  // ROUTES

  goToNonRelational() {
    this.router.navigate(['/database/non-relational'], { queryParams: { from: 'database' } });
  }

  goToMongoCluster() {
    this.router.navigate(['/database/non-relational/mongoCluster'], { queryParams: { from: 'database' } });
  }

  getImagePath(): string {
    return 'assets/images/mongo.png';
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.datesubscription.unsubscribe();
  }

}
