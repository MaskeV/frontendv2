import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ServiceIdService } from '../../../../services/service-id.service';
import { CommonModule } from '@angular/common';
import { filter, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import * as Highcharts from 'highcharts';
import 'highcharts/modules/coloraxis';
import { FormsModule } from '@angular/forms';
import { SortPipe } from '../../../../pipes/sort.pipe';
import { ObjectFilterPipe } from '../../../../pipes/object-filter.pipe';
import { PaginatePipe } from '../../../../pipes/paginate.pipe';
import { KafkaService } from '../../../../services/kafka.service';
import { ServiceResponse } from '../../../../models/common/ServiceResponse';
import { ServiceStatus } from '../../../../models/enums/ServiceStatus';
import { HotToastService } from '@ngxpert/hot-toast';
import { NumericDataPipe } from '../../../../pipes/numeric-data.pipe';
import { SeriesOptionsType } from 'highcharts';
import 'highcharts/modules/no-data-to-display';
import { StringDataPipe } from '../../../../pipes/string-data.pipe';
import { MatIcon } from "@angular/material/icon";
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenu, MatMenuTrigger } from "@angular/material/menu";
import { ShortNumberPipe } from '../../../../pipes/short-number.pipe';

type BrokerHealth = 'HEALTHY' | 'HIGH LOAD' | 'CRITICAL';

interface KafkaBroker {
  host: string | undefined;
  brokerId: number;
  status: number;
  cpu: number;
  memory: number;
  messages: number;
  health?: BrokerHealth;
}

interface ClusterOverview {
  uptimePCT: number | null;
  downtime: number | null;
  controller?: BrokerMetricMap;
  topics?: BrokerMetricMap;
  partitions?: BrokerMetricMap;
  leaders?: BrokerMetricMap;
  totalBrokers: number | null;
}

interface BrokerMetricMap {
  total: number | null;
  [broker: string]: number | null;
}


@Component({
    selector: 'app-kafka-overview',
    imports: [RouterModule, CommonModule, FormsModule, SortPipe, ObjectFilterPipe, PaginatePipe, NumericDataPipe, StringDataPipe, ShortNumberPipe, MatIcon, MatTooltipModule, MatMenu, MatMenuTrigger],
    templateUrl: './kafka-overview.component.html',
    styleUrl: './kafka-overview.component.css'
})

export class KafkaOverviewComponent implements OnInit, OnDestroy {

  // Basic Variables
  clusterId: string | null
  clusterName!: string
  selectedTab: string | null = 'overview';
  AREA_COLORS = [
    { line: '#6366F1', stops: [[0, 'rgba(99,102,241,0.35)'], [1, 'rgba(99,102,241,0.08)']] },
    { line: '#F59E0B', stops: [[0, 'rgba(245,158,11,0.35)'], [1, 'rgba(245,158,11,0.08)']] },
    { line: '#3B82F6', stops: [[0, 'rgba(59,130,246,0.35)'], [1, 'rgba(59,130,246,0.08)']] },
    { line: '#10B981', stops: [[0, 'rgba(16,185,129,0.35)'], [1, 'rgba(16,185,129,0.08)']] },
    { line: '#8B5CF6', stops: [[0, 'rgba(139,92,246,0.35)'], [1, 'rgba(139,92,246,0.08)']] },
    { line: '#F43F5E', stops: [[0, 'rgba(244,63,94,0.35)'], [1, 'rgba(244,63,94,0.08)']] },
    { line: '#06B6D4', stops: [[0, 'rgba(6,182,212,0.35)'], [1, 'rgba(6,182,212,0.08)']] },
    { line: '#84CC16', stops: [[0, 'rgba(132,204,22,0.35)'], [1, 'rgba(132,204,22,0.08)']] },
    { line: '#14B8A6', stops: [[0, 'rgba(20,184,166,0.35)'], [1, 'rgba(20,184,166,0.08)']] },
    { line: '#EC4899', stops: [[0, 'rgba(236,72,153,0.35)'], [1, 'rgba(236,72,153,0.08)']] }
  ];

  LEADER_COLORS = [
    { line: '#10B981', stops: [[0, 'rgba(16,185,129,0.35)'], [1, 'rgba(16,185,129,0.08)']] },
    { line: '#3B82F6', stops: [[0, 'rgba(59,130,246,0.35)'], [1, 'rgba(59,130,246,0.08)']] },
    { line: '#6366F1', stops: [[0, 'rgba(99,102,241,0.35)'], [1, 'rgba(99,102,241,0.08)']] },
    { line: '#8B5CF6', stops: [[0, 'rgba(139,92,246,0.35)'], [1, 'rgba(139,92,246,0.08)']] },
    { line: '#F43F5E', stops: [[0, 'rgba(244,63,94,0.35)'], [1, 'rgba(244,63,94,0.08)']] },
    { line: '#06B6D4', stops: [[0, 'rgba(6,182,212,0.35)'], [1, 'rgba(6,182,212,0.08)']] },
    { line: '#F59E0B', stops: [[0, 'rgba(245,158,11,0.35)'], [1, 'rgba(245,158,11,0.08)']] },
    { line: '#84CC16', stops: [[0, 'rgba(132,204,22,0.35)'], [1, 'rgba(132,204,22,0.08)']] },
    { line: '#14B8A6', stops: [[0, 'rgba(20,184,166,0.35)'], [1, 'rgba(20,184,166,0.08)']] },
    { line: '#EC4899', stops: [[0, 'rgba(236,72,153,0.35)'], [1, 'rgba(236,72,153,0.08)']] }
  ];

  UNCLEAN_LEADER_COLORS = [
    { line: '#d5257dff', stops: [[0, 'rgba(236,72,153,0.35)'], [1, 'rgba(236,72,153,0.08)']] },
    { line: '#F43F5E', stops: [[0, 'rgba(244,63,94,0.35)'], [1, 'rgba(244,63,94,0.08)']] },
    { line: '#14B8A6', stops: [[0, 'rgba(20,184,166,0.35)'], [1, 'rgba(20,184,166,0.08)']] },
    { line: '#10B981', stops: [[0, 'rgba(16,185,129,0.35)'], [1, 'rgba(16,185,129,0.08)']] },
    { line: '#6366F1', stops: [[0, 'rgba(99,102,241,0.35)'], [1, 'rgba(99,102,241,0.08)']] },
    { line: '#84CC16', stops: [[0, 'rgba(132,204,22,0.35)'], [1, 'rgba(132,204,22,0.08)']] },
    { line: '#3B82F6', stops: [[0, 'rgba(59,130,246,0.35)'], [1, 'rgba(59,130,246,0.08)']] },
    { line: '#8B5CF6', stops: [[0, 'rgba(139,92,246,0.35)'], [1, 'rgba(139,92,246,0.08)']] },
    { line: '#06B6D4', stops: [[0, 'rgba(6,182,212,0.35)'], [1, 'rgba(6,182,212,0.08)']] },
    { line: '#F59E0B', stops: [[0, 'rgba(245,158,11,0.35)'], [1, 'rgba(245,158,11,0.08)']] },
  ];

  ELECTION_RATE_COLORS = [
    { line: '#3B82F6', stops: [[0, 'rgba(59,130,246,0.35)'], [1, 'rgba(59,130,246,0.08)']] },
    { line: '#84CC16', stops: [[0, 'rgba(132,204,22,0.35)'], [1, 'rgba(132,204,22,0.08)']] },
    { line: '#8B5CF6', stops: [[0, 'rgba(139,92,246,0.35)'], [1, 'rgba(139,92,246,0.08)']] },
    { line: '#EC4899', stops: [[0, 'rgba(236,72,153,0.35)'], [1, 'rgba(236,72,153,0.08)']] },
    { line: '#F43F5E', stops: [[0, 'rgba(244,63,94,0.35)'], [1, 'rgba(244,63,94,0.08)']] },
    { line: '#14B8A6', stops: [[0, 'rgba(20,184,166,0.35)'], [1, 'rgba(20,184,166,0.08)']] },
    { line: '#10B981', stops: [[0, 'rgba(16,185,129,0.35)'], [1, 'rgba(16,185,129,0.08)']] },
    { line: '#6366F1', stops: [[0, 'rgba(99,102,241,0.35)'], [1, 'rgba(99,102,241,0.08)']] },
    { line: '#06B6D4', stops: [[0, 'rgba(6,182,212,0.35)'], [1, 'rgba(6,182,212,0.08)']] },
    { line: '#F59E0B', stops: [[0, 'rgba(245,158,11,0.35)'], [1, 'rgba(245,158,11,0.08)']] },
  ];

  BAR_COLORS = [
    { line: '#84a98c', stops: [[0, '#EC489957'], [1, '#CFE2FF']] },
    { line: '#005f73', stops: [[0, '#005f73'], [1, '#CFE2FF']] },
    { line: '#43aa8b', stops: [[0, '#43aa8b'], [1, '#CFE2FF']] },
    { line: '#3B82F6', stops: [[0, '#3B82F6'], [1, '#CFE2FF']] },
    { line: '#6366F1', stops: [[0, '#6365f1'], [1, '#CFE2FF']] },
    { line: '#84CC16', stops: [[0, '#84CC16'], [1, '#CFE2FF']] },
    { line: '#10B981', stops: [[0, '#10B981'], [1, '#CFE2FF']] },
    { line: '#8B5CF6', stops: [[0, '#8B5CF6'], [1, '#CFE2FF']] },
    { line: '#F43F5E', stops: [[0, '#F43F5E'], [1, '#CFE2FF']] },
    { line: '#06B6D4', stops: [[0, '#06B6D4'], [1, '#CFE2FF']] },
  ];

  ACTIVE_CONTROLLER_COLORS = [
    { line: '#43aa8b', stops: [[0, '#51b698ff'], [1, '#CFE2FF']] },
    { line: '#6366F1', stops: [[0, '#5e5fcfff'], [1, '#CFE2FF']] },
    { line: '#005f73', stops: [[0, '#005f73'], [1, '#CFE2FF']] },
    { line: '#3B82F6', stops: [[0, '#3B82F6'], [1, '#CFE2FF']] },
    { line: '#84CC16', stops: [[0, '#84CC16'], [1, '#CFE2FF']] },
    { line: '#10B981', stops: [[0, '#10B981'], [1, '#CFE2FF']] },
    { line: '#512c76ff', stops: [[0, '#5a189a57'], [1, '#CFE2FF']] },
    { line: '#8B5CF6', stops: [[0, '#8B5CF6'], [1, '#CFE2FF']] },
    { line: '#F43F5E', stops: [[0, '#F43F5E'], [1, '#CFE2FF']] },
    { line: '#06B6D4', stops: [[0, '#06B6D4'], [1, '#CFE2FF']] },
  ];


  // Overview Tab
  clusterKPI: ClusterOverview = {
    uptimePCT: null,
    downtime: null,
    totalBrokers: null,
    controller: { total: null },
    topics: { total: null },
    partitions: { total: null },
    leaders: { total: null }
  };
  maxLagIndicator: string[] = [];
  partitionIndicator: string[] = [];
  leaderIndicator: string[] = [];
  uncleanLeaderIndicator: string[] = [];
  electionIndicator: string[] = [];
  underReplicatedPartitionIndicator: string[] = [];
  offlinePartitionIndicator: string[] = [];
  activeControllerIndicator: string[] = [];

  uncleanLeaderElectionsKPI?: number | null;
  electionRateKPI?: number | null;
  underReplicatedPartitionKPI?: number | null;
  offlinePartitionKPI?: number | null;
  activeControllerKPI?: number | null;


  // Graphs Declaration
  maxLagChart!: Highcharts.Chart;
  underReplicatedChart!: Highcharts.Chart;
  offlinePartitionChart!: Highcharts.Chart;
  partitionChart!: Highcharts.Chart;
  leaderCountChart!: Highcharts.Chart;
  activeControllerChart!: Highcharts.Chart;

  // Broker Tab
  brokers: KafkaBroker[] = [];

  // Common variables
  startTime!: number;
  endTime!: number;
  subscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();
  searchText = '';
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' | 'none' = 'none';
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;
  inputPage: number = 1;
  totalItems: number = 0;

  // Skeleton View
  isLoading = false;
  skeletonRows = Array(10).fill(0);

  constructor(private activatedRoute: ActivatedRoute, private serviceIdService: ServiceIdService, private router: Router, private dateService: DateService, private kafkaService: KafkaService, private toast: HotToastService) {
    this.clusterId = this.activatedRoute.snapshot.paramMap.get('clusterId');
    this.selectedTab = this.activatedRoute.snapshot.queryParamMap.get('tab');
  }

  ngOnInit(): void {
    Highcharts.setOptions({ time: { timezoneOffset: new Date().getTimezoneOffset() } });
    if (!this.clusterId) {
      this.clusterId = this.serviceIdService.getEncodedServiceId();
    }
    this.clusterName = atob(this.clusterId.split('.1')[0]);

    this.dateService.setActiveComponent('KafkaOverviewComponent');
    this.subscription.add(
      this.dateService.activeComponent$.pipe(
        filter(activeComponent => activeComponent === 'KafkaOverviewComponent'),
        switchMap(() => this.dateService.date$)
      ).subscribe((datemodel) => {
        this.startTime = this.formatDate(datemodel.startdateTime);
        this.endTime = this.formatDate(datemodel.enddateTime);
        this.loadData(this.selectedTab);
      })
    );
    this.subscription.add(
      this.activatedRoute.queryParamMap
        .pipe(takeUntil(this.destroy$))
        .subscribe(params => {
          const tab = params.get('tab');
          if (tab && tab !== this.selectedTab) {
            this.selectedTab = tab;
          }
        })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(tab: string | null) {
    switch (tab) {
      case 'overview':
        this.navigatePage(tab);
        this.loadClusterKPIs();
        this.getMaxLagData();
        this.getPartionCountData();
        this.getLeaderCountData();
        this.getUncleanLeaderElectionData();
        this.getElectionRateData();
        this.getUnderReplicatedPartitionData();
        this.getOfflinePartiotionData();
        this.getActiveControllerData();
        break;
      case 'broker':
        this.navigatePage(tab);
        this.getKafkaBrokers();
        break;
    }
  }

  // _______________Overview Tab_____________
  loadClusterKPIs() {
    this.clusterKPI = {
      uptimePCT: null,
      downtime: null,
      totalBrokers: null,
      controller: { total: null },
      topics: { total: null },
      partitions: { total: null },
      leaders: { total: null }
    };
    this.kafkaService.getClusterKPIs(this.clusterId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              this.clusterKPI = response.serviceResponse;
            } else {
              this.showToast(response.serviceResponse, 'error');
            }
          },
          error: (response: ServiceResponse<any>) => {
            console.error("Unable fetch ClusterKPI due to !!");
          }
        });
  }

  getMaxLagData() {
    this.maxLagIndicator = [];
    this.kafkaService.getMaxLag(this.clusterId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              this.renderMaxLagChart(response.serviceResponse, response.metaData);
              Object.entries(response?.metaData?.dataTable).forEach(([key, value]) => {
                const v = value as { max: number };
                this.maxLagIndicator.push(`${key} - ${this.numericData(v.max)}`);
              });
            } else {
              this.renderMaxLagChart([], undefined);
              console.error(response.serviceResponse, 'error');
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.renderMaxLagChart([], undefined);
            console.error("Unable fetch max Lag Data !!");
          }
        });
  }

  getPartionCountData() {
    this.partitionIndicator = [];
    this.kafkaService.getPartitionCount(this.clusterId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              this.renderPartitionChart(response.serviceResponse, response.metaData);
              Object.entries(response?.metaData?.dataTable).forEach(([key, value]) => {
                const v = value as { avg: number };
                this.partitionIndicator.push(`${key} - ${this.numericData(v.avg)}`);
              });
            } else {
              this.renderPartitionChart([], undefined);
              console.error(response.serviceResponse, 'error');
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.renderPartitionChart([], undefined);
            console.error("Unable fetch PartitionCount Data !!");
          }
        });
  }

  getLeaderCountData() {
    this.leaderIndicator = [];
    this.kafkaService.getLeaderCount(this.clusterId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              this.renderLeaderCountChart(response.serviceResponse, response.metaData);
              Object.entries(response?.metaData?.dataTable).forEach(([key, value]) => {
                const v = value as { avg: number };
                this.leaderIndicator.push(`${key} - ${this.numericData(v.avg)}`);
              });
            } else {
              this.renderLeaderCountChart([], undefined);
              console.error(response.serviceResponse, 'error');
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.renderLeaderCountChart([], undefined);
            console.error("Unable fetch LeaderCount Data !!");
          }
        });
  }

  getUncleanLeaderElectionData() {
    this.uncleanLeaderIndicator = [];
    this.uncleanLeaderElectionsKPI = null;
    this.kafkaService.getUncleanLeaderElectionsPerSecond(this.clusterId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              this.renderUnclearElectionChart(response.serviceResponse, response.metaData);
              this.uncleanLeaderElectionsKPI = 0;
              Object.entries(response?.metaData?.dataTable).forEach(([key, value]) => {
                const v = value as { max: number };
                if (this.uncleanLeaderElectionsKPI != null && (this.uncleanLeaderElectionsKPI < v.max)) {
                  this.electionRateKPI = v.max;
                }
                this.uncleanLeaderIndicator.push(`${key} -${this.numericData(v.max)}`);
              });
            } else {
              this.renderUnclearElectionChart([], undefined);
              console.error(response.serviceResponse, 'error');
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.renderUnclearElectionChart([], undefined);
            console.error("Unable fetch UncleanLeader Data !!");
          }
        });
  }

  getElectionRateData() {
    this.electionIndicator = [];
    this.electionRateKPI = null;
    this.kafkaService.getLeaderElectionRate(this.clusterId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              this.renderElectionRateChart(response.serviceResponse, response.metaData);
              this.electionRateKPI = 0;
              Object.entries(response?.metaData?.dataTable).forEach(([key, value]) => {
                const v = value as { max: number };
                if (this.electionRateKPI != null && (this.electionRateKPI < v.max)) {
                  this.electionRateKPI = v.max;
                }
                this.electionIndicator.push(`${key} - ${this.numericData(v.max)}`);
              });
            } else {
              this.renderElectionRateChart([], undefined);
              console.error(response.serviceResponse, 'error');
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.renderElectionRateChart([], undefined);
            console.error("Unable fetch ElectionRate Data !!");
          }
        });
  }

  getUnderReplicatedPartitionData() {
    this.underReplicatedPartitionIndicator = [];
    this.underReplicatedPartitionKPI = null;
    this.kafkaService.getUnderReplicatedPartitions(this.clusterId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              this.renderUnderReplicatedChart(response.serviceResponse, response.metaData);
              this.underReplicatedPartitionKPI = 0;
              Object.entries(response?.metaData?.dataTable).forEach(([key, value]) => {
                const v = value as { max: number };
                if (this.underReplicatedPartitionKPI != null && (this.underReplicatedPartitionKPI < v.max)) {
                  this.underReplicatedPartitionKPI = v.max;
                }
                this.underReplicatedPartitionIndicator.push(`${key} - ${v.max}`);
              });
            } else {
              this.renderUnderReplicatedChart([], undefined);
              console.error(response.serviceResponse, 'error');
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.renderUnderReplicatedChart([], undefined);
            console.error("Unable fetch UnderReplicated Data !!");
          }
        });
  }

  getOfflinePartiotionData() {
    this.offlinePartitionIndicator = [];
    this.offlinePartitionKPI = null;
    this.kafkaService.getOfflinePartitionsCount(this.clusterId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              this.renderOfflinePartitionChart(response.serviceResponse, response.metaData);
              this.offlinePartitionKPI = 0;
              Object.entries(response?.metaData?.dataTable).forEach(([key, value]) => {
                const v = value as { max: number };
                if (this.offlinePartitionKPI != null && (this.offlinePartitionKPI < v.max)) {
                  this.offlinePartitionKPI = v.max;
                }
                this.offlinePartitionIndicator.push(`${key} - ${v.max}`);
              });
            } else {
              this.renderOfflinePartitionChart([], undefined);
              console.error(response.serviceResponse, 'error');
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.renderOfflinePartitionChart([], undefined);
            console.error("Unable fetch offlinePartition Data !!");
          }
        });
  }

  getActiveControllerData() {
    this.activeControllerIndicator = [];
    this.activeControllerKPI = null;
    this.kafkaService.getActiveControllerCount(this.clusterId, this.startTime, this.endTime)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        {
          next: (response: ServiceResponse<any>) => {
            if (response.serviceStatus === ServiceStatus.SUCCESS) {
              this.renderActiveControllerChart(response.serviceResponse, response.metaData);
              this.activeControllerKPI = 0;
              Object.entries(response?.metaData?.dataTable).forEach(([key, value]) => {
                const v = value as { avg: number };
                this.activeControllerKPI != null && (this.activeControllerKPI += v.avg);
                this.activeControllerIndicator.push(`${key} - ${v.avg}`);
              });
            } else {
              this.renderActiveControllerChart([], undefined);
              console.error(response.serviceResponse, 'error');
            }
          },
          error: (response: ServiceResponse<any>) => {
            this.renderActiveControllerChart([], undefined);
            console.error("Unable fetch activeController Data !!");
          }
        });
  }


  renderMaxLagChart(responseData: any[], metaData: any) {
    const chartId = 'max-lag-chart';
    const seriesData = this.getSeriesData('areaspline', responseData, metaData);
    const chartOption = this.getMaxLagChartOption(seriesData);
    this.maxLagChart = new Highcharts.Chart(chartId, chartOption);
  }

  renderUnderReplicatedChart(responseData: any[], metaData: any) {
    const chartId = 'under-replicated-partition-chart';
    const seriesData = this.getSeriesData('spline', responseData, metaData);
    const chartOption = this.getUnderReplicatedChartOption(seriesData);
    this.underReplicatedChart = new Highcharts.Chart(chartId, chartOption);
  }

  renderOfflinePartitionChart(responseData: any[], metaData: any) {
    const chartId = 'offline-partition-chart';
    const seriesData = this.getSeriesData('spline', responseData, metaData, this.LEADER_COLORS);
    const chartOption = this.getOfflinePartitionChartOption(seriesData);
    this.offlinePartitionChart = new Highcharts.Chart(chartId, chartOption);
  }

  renderPartitionChart(responseData: any[], metaData: any) {
    const chartId = 'partition-chart';
    const seriesData = this.getSeriesData('column', responseData, metaData, this.BAR_COLORS);
    const chartOption = this.getColumnChartOption(seriesData);
    this.partitionChart = new Highcharts.Chart(chartId, chartOption);
  }

  renderLeaderCountChart(responseData: any[], metaData: any) {
    const chartId = 'leader-count-chart';
    const seriesData = this.getSeriesData('areaspline', responseData, metaData, this.LEADER_COLORS);
    const chartOption = this.getLeaderCountChartOption(seriesData);
    this.leaderCountChart = new Highcharts.Chart(chartId, chartOption);
  }

  renderUnclearElectionChart(responseData: any[], metaData: any) {
    const chartId = 'unclear-election-chart';
    const seriesData = this.getSeriesData('spline', responseData, metaData, this.UNCLEAN_LEADER_COLORS);
    const chartOption = this.getUnclearElectionChartOption(seriesData);
    this.leaderCountChart = new Highcharts.Chart(chartId, chartOption);
  }

  renderElectionRateChart(responseData: any[], metaData: any) {
    const chartId = 'election-rate-chart';
    const seriesData = this.getSeriesData('spline', responseData, metaData, this.ELECTION_RATE_COLORS);
    const chartOption = this.getElectionRateChartOption(seriesData);
    this.leaderCountChart = new Highcharts.Chart(chartId, chartOption);
  }

  renderActiveControllerChart(responseData: any[], metaData: any) {
    const chartId = 'active-controller-chart';
    const seriesData = this.getSeriesData('column', responseData, metaData, this.ACTIVE_CONTROLLER_COLORS);
    const chartOption = this.getColumnChartOption(seriesData);
    this.activeControllerChart = new Highcharts.Chart(chartId, chartOption);
  }


  // Charts Util

  getSeriesData(chartType: string, responseData: any[], metaData: any, colorCodes: any[] = this.AREA_COLORS) {
    if (!responseData?.length || !metaData?.dataTable) {
      return [];
    }
    const dataTable = metaData.dataTable;
    const seriesMap = new Map<string, { x: number; y: number }[]>();

    responseData.forEach(point => {
      const timestamp = this.convertTimebucket(point['time_bucket']);
      Object.keys(dataTable).forEach(key => {
        const series =
          seriesMap.get(key) ??
          (() => {
            const arr: { x: number; y: number }[] = [];
            seriesMap.set(key, arr);
            return arr;
          })();

        series.push({
          x: timestamp,
          y: Number(point[key] ?? undefined)
        });
      });
    });

    const seriesData: any[] = Array.from(
      seriesMap.entries(),
      ([name, data], index) => {
        const color = colorCodes[index % colorCodes.length];
        return {
          type: chartType,
          name,
          data,
          color: color.line,
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: color.stops
          }
        }
      }
    );
    return seriesData;
  }

  getChartOption(seriesData: Array<SeriesOptionsType>, chartColor: string): Highcharts.Options {
    const styles = getComputedStyle(document.body);
    const labelColor = styles.getPropertyValue('--text-color').trim();
    const gridColor = styles.getPropertyValue('--border-color').trim();
    const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
    const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();


    return {
      lang: {
        noData: 'No Data Available'
      },
      noData: {
        style: {
          fontSize: '14px',
          fontWeight: '500',
          color: '#9ca3af'
        }
      },
      chart: {
        backgroundColor: 'white',
      },
      title: { text: '' },
      credits: { enabled: false },
      exporting: { enabled: false },
      legend: { enabled: false },
      colors: [chartColor],
      xAxis: {
        type: 'datetime',
        lineWidth: 0,
        tickWidth: 0,
        tickLength: 0,

        gridLineWidth: 0,
        labels: {
          enabled: true,
          style: {
            color: '#6B7280',
            fontSize: '11px'
          }
        }
      },
      yAxis: {
        allowDecimals: false,
        min: 0,
        softMax: 5,
        gridLineColor: '#e5e7eb',
        title: { text: '' },
        labels: {
          style: {
            color: '#6B7280',
            fontSize: '11px'
          },
          enabled: true
        }
      },
      tooltip: {
        backgroundColor: tooltipBgColor,
        style: { color: tooltipTextColor, fontSize: '10px' },
        shared: true
      },
      plotOptions: {
        series: {
          marker: {
            enabled: true,
            radius: 3,
            lineWidth: 2,
          },
          lineWidth: 2.5
        },
        areaspline: {
          threshold: 0
        }
      },
      series: seriesData,
    };
  }

  getMaxLagChartOption(seriesData: Array<SeriesOptionsType>): Highcharts.Options {
    return {
      lang: {
        noData: 'No Data Available'
      },
      noData: {
        style: {
          fontSize: '14px',
          fontWeight: '500',
          color: '#9ca3af'
        }
      },
      chart: {
        backgroundColor: 'white'
      },
      title: { text: '' },
      xAxis: {
        type: 'datetime',
        lineWidth: 0,
        tickWidth: 0,
        tickLength: 0,

        gridLineWidth: 1,
        labels: {
          enabled: true,
          style: {
            color: '#6B7280',
            fontSize: '11px'
          }
        }
      },
      yAxis: {
        allowDecimals: false,
        min: 0,
        softMax: 5,
        gridLineColor: '#e5e7eb',
        title: { text: '' },
        labels: {
          style: {
            color: '#6B7280',
            fontSize: '11px'
          },
          enabled: true
        }
      },
      tooltip: {
        backgroundColor: '#ffffff',
        borderRadius: 6,
        shadow: true,
        valueDecimals: 0,
        shared: true
      },
      plotOptions: {
        series: {
          marker: {
            enabled: true,
            radius: 4,
            lineWidth: 2,
          },
          lineWidth: 2.5
        },
        areaspline: {
          threshold: 0
        }
      },
      series: seriesData,
      legend: {
        enabled: false
      },

      credits: { enabled: false }

    }

  }

  getUnderReplicatedChartOption(seriesData: Array<SeriesOptionsType>): Highcharts.Options {
    const chartOption = this.getChartOption(seriesData, '#FBAAAA');
    chartOption.xAxis = {
      type: 'datetime',
      lineWidth: 0,
      tickWidth: 0,
      tickLength: 0,

      gridLineWidth: 0,
      labels: {
        enabled: false,
      }
    };
    return chartOption;
  }

  getOfflinePartitionChartOption(seriesData: Array<SeriesOptionsType>): Highcharts.Options {
    return this.getChartOption(seriesData, '#2CB0EC');
  }

  getColumnChartOption(seriesData: Array<SeriesOptionsType>): Highcharts.Options {
    return {
      lang: {
        noData: 'No Data Available'
      },
      noData: {
        style: {
          fontSize: '14px',
          fontWeight: '500',
          color: '#9ca3af'
        }
      },
      chart: {
        type: 'column',
        backgroundColor: 'transparent'
      },
      legend: {
        enabled: false
      },

      title: { text: '' },

      xAxis: {
        type: 'datetime',
        lineWidth: 0,
        tickWidth: 0,
        tickLength: 0,
        labels: {
          enabled: true,
          style: {
            color: '#6B7280',
            fontSize: '11px'
          }
        }
      },
      yAxis: {
        allowDecimals: false,
        title: { text: '' },
        labels: {
          style: {
            color: '#6B7280',
            fontSize: '11px'
          },
          enabled: true
        }
      },

      plotOptions: {
        series: {
          stacking: 'normal'
        },
        column: {
          borderRadius: 4,
          pointPadding: 0.1,
          groupPadding: 0.05
        }
      },
      series: seriesData,
      credits: { enabled: false }
    };

  }

  getLeaderCountChartOption(seriesData: Array<SeriesOptionsType>): Highcharts.Options {

    return this.getChartOption(seriesData, '#8B5CF6');
  }

  getUnclearElectionChartOption(seriesData: Array<SeriesOptionsType>): Highcharts.Options {

    return this.getChartOption(seriesData, '#EF4444');
  }

  getElectionRateChartOption(seriesData: Array<SeriesOptionsType>): Highcharts.Options {

    return this.getChartOption(seriesData, '#22C55E');
  }


  // Date Utils
  formatDate(date: string) {
    date = date.replace(/-/g, '');
    date = date.replace(/:/g, '');
    date = date.replace(' ', '');
    return parseInt(date);
  }
  convertTimebucket(timebucket: string) {
    const year = parseInt(timebucket.slice(0, 4), 10);
    const month = parseInt(timebucket.slice(4, 6), 10) - 1;
    const day = parseInt(timebucket.slice(6, 8), 10);
    const hour = parseInt(timebucket.slice(8, 10), 10);
    const minute = parseInt(timebucket.slice(10, 12), 10);
    return new Date(year, month, day, hour, minute).getTime();
;
  }
  formatForThresholdDate(dateStr: string): number {
    const yyyy = parseInt(dateStr.substring(0, 4));
    const MM = parseInt(dateStr.substring(4, 6)) - 1;
    const dd = parseInt(dateStr.substring(6, 8));
    const hh = parseInt(dateStr.substring(8, 10));
    const mm = parseInt(dateStr.substring(10, 12));

    let inputDate = new Date(yyyy, MM, dd, hh, mm);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(inputDate);
    checkDate.setHours(0, 0, 0, 0);
    if (checkDate.getTime() === today.getTime()) {
      inputDate.setDate(inputDate.getDate() - 1);
    }

    const newYYYY = inputDate.getFullYear();
    const newMM = String(inputDate.getMonth() + 1).padStart(2, "0");
    const newDD = String(inputDate.getDate()).padStart(2, "0");
    const newHH = String(inputDate.getHours()).padStart(2, "0");
    const newMMm = String(inputDate.getMinutes()).padStart(2, "0");

    return parseInt(`${newYYYY}${newMM}${newDD}${newHH}${newMMm}`);
  }

  // Pagination Utils
  navigatePage(tab: string): void {
    this.router.navigate([], { queryParams: { tab }, queryParamsHandling: 'merge' });
  }




  // _________________Broker page__________________

  getKafkaBrokers() {
    this.brokers = [];
    this.resetPagination(this.brokers);
    this.isLoading = true;
    this.kafkaService.getInstancesData(this.clusterId, this.startTime, this.endTime).subscribe(
      {
        next: (response: ServiceResponse<any>) => {
          this.isLoading = false;
          if (response.serviceStatus === ServiceStatus.SUCCESS) {
            this.brokers = response.serviceResponse;
            this.brokers = this.brokers.map(broker => ({
              ...broker,
              health: this.getBrokerHealth(broker)
            }));
            this.resetPagination(this.brokers);
          } else {
            console.error(response.serviceResponse);
          }
        },
        error: (response: ServiceResponse<any>) => {
          this.isLoading = false;
          console.error(ServiceStatus.SOMETHING_WENT_WRONG);
        }
      });
  }

  setEntityId(event: MouseEvent, entityName: string): void {
    event.preventDefault();
    const entityId = entityName.trim();
    if (entityId) {
      const encodedEntityId = this.clusterId + '_' + btoa(entityId);
      sessionStorage.setItem('encodedEntityId', encodedEntityId);
      this.goToBrokerPage(encodedEntityId);
    } else {
      console.error('Service ID is undefined or empty');
    }
  }

  goToBrokerPage(brokerID: string): void {
    this.router.navigate(['/message-queue/kafka-service/cluster/broker', brokerID]);
  }

  getBrokerHealth(broker: KafkaBroker): BrokerHealth {
    if (broker.cpu >= 80 || broker.memory >= 80) {
      return 'CRITICAL';
    }

    if (broker.cpu >= 60 || broker.memory >= 60) {
      return 'HIGH LOAD';
    }

    return 'HEALTHY';
  }

  healthClassMap: { [key: string]: string } = {
    'HEALTHY': 'bg-success-subtle text-success border-success-subtle',
    'HIGH LOAD': 'bg-warning-subtle text-warning border-warning-subtle',
    'CRITICAL': 'bg-danger-subtle text-danger border-danger-subtle'
  };

  dotClassMap: { [key: string]: string } = {
    'HEALTHY': 'bg-success',
    'HIGH LOAD': 'bg-warning',
    'CRITICAL': 'bg-danger'
  };

  numericData(value: number | null | undefined, decimals: number = 2, hint: string = 'No Data'): string {
    if (value === null || value === undefined || isNaN(value)) {
      return 'No Data';
    }

    if (Number.isInteger(value)) {
      return value.toString();
    }

    return value.toFixed(decimals);
  }

  // Support functions for pagination
  sortData(columnName: string) {
    this.sortColumn = columnName;
    this.sortDirection = this.sortDirection == 'asc' ? 'desc' : (this.sortDirection == 'desc' ? 'none' : 'asc');
  }
  resetPagination(resultArray: any[]) {
    this.currentPage = 1;
    this.totalPages = 1;
    this.inputPage = 1;
    this.totalItems = resultArray.length;
    if (resultArray && resultArray.length > 0 && this.pageSize > 0) {
      this.totalPages = Math.ceil(resultArray.length / this.pageSize);
    }
  }

  resetCurrentPage(data: any[], searchText: string, keys: string[]) {
    this.resetPagination(this.filter(data, searchText, keys));
  }

  filter(items: any[], searchText: string, keys: string[]): any[] {
    if (!items || !searchText || !keys || keys.length === 0) {
      return items;
    }

    const lowerSearch = searchText.toLowerCase();

    return items.filter((item) =>
      keys.some((key) => {
        const value = item[key];
        return value && value.toString().toLowerCase().includes(lowerSearch);
      })
    );
  }

  goToPage() {
    let page = Number(this.inputPage);
    if (isNaN(page) || page < 1) page = 1;
    else if (page > this.totalPages) page = this.totalPages;

    this.currentPage = page;
    this.inputPage = page;
  }

  previousPage() {
    this.currentPage = this.currentPage - 1;
    this.inputPage = this.currentPage;
  }

  nextPage() {
    this.currentPage = this.currentPage + 1;
    this.inputPage = this.currentPage;
  }

  // Toast Util
  showToast(message: string, type: "success" | "error") {
    if (type === 'error') {
      this.toast.error(message, {
        dismissible: true,
        duration: 2500
      });
    } else if (type === 'success') {
      this.toast.success(message, {
        dismissible: true,
        duration: 2500,
        iconTheme: {
          primary: 'var(--sideBar-bg-color1)',
          secondary: '#FFFAEE',
        }
      });
    }
  }

}
