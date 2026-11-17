import { Component, OnInit } from '@angular/core';
import { ApplicationMaster } from '../../../models/application-master';
import { ApplicationService } from '../../../services/application.service';
import { filter, first, from, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { DecoderService } from '../../../services/decoder.service';
import { User } from '../../../models/user';
import { Session } from '../../../models/session';
import { Router } from '@angular/router';
import { LoggerService } from '../../../services/logger.service';
import { UserTypeCrudMapObject } from '../../../models/UserTypeCrudMapObject';
import { CommonModule } from '@angular/common';
import { CapacityPlannerService } from '../../../services/capacity-planner.service';
import { FormsModule } from '@angular/forms';
import { CapacityPlanner } from '../../../models/capacity-planner';
import { DateService } from '../../../services/date.service';
import Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';

@Component({
    selector: 'app-capacity-planner',
    imports: [
        CommonModule,
        FormsModule,
        HighchartsChartModule
    ],
    templateUrl: './capacity-planner.component.html',
    styleUrl: './capacity-planner.component.css'
})
export class CapacityPlannerComponent implements OnInit {
  Highcharts: typeof Highcharts = Highcharts;

  user: User = new User();
  currentUser = new User();

  sessionObject: Session = new Session();

  // subscription!: Subscription;
  private subscription: Subscription = new Subscription();
    private destroy$ = new Subject<void>();
  
  datemodel: any;

  userTypeCrudMap = new UserTypeCrudMapObject();

  applicationList!: ApplicationMaster[];
  ipAddress: string = '';
  ipAddressList: any;
  applicationNameID: string = '';
  dataSourceType: string = 'MetricBeat';

  startTime: any;
  endTime: any;
  capacityPlanner: CapacityPlanner = new CapacityPlanner();

  cpuHealthCharts: Highcharts.Options | null = null;
  memoryHealthCharts: Highcharts.Options | null = null;
  diskHealthCharts: Highcharts.Options | null = null;
  avgCpuValue: number = 0;
  peakCpuValue: number = 0;
  minCpuValue: number = 0;
  peakCpuValueTime: any;
  minCpuValueTime: any;
  avgMemoryValue: number = 0;
  peakMemoryValue: number = 0;
  minMemoryValue: number = 0;
  peakMemoryValueTime: any;
  minMemoryValueTime: any;
  avgDiskValue: number = 0;
  peakDiskValue: number = 0;
  minDiskValue: number = 0;
  peakDiskValueTime: any;
  minDiskValueTime: any;


  constructor(
    private router: Router,
    private decoderService: DecoderService,
    private loggerService: LoggerService,
    private dateService: DateService,
    private applicationService: ApplicationService,
    private capacityPlannerService: CapacityPlannerService,
  ) { }

  ngOnInit(): void {
    this.user = <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!))!;
    this.currentUser.userId = this.user.userId;
    this.sessionObject.featureName = "Capacity Planner";
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.user.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');
    this.sessionObject.browserName = this.loggerService.getBrowserNameAndVersion().name;
    this.sessionObject.browserVersion = this.loggerService.getBrowserNameAndVersion().version;
    if (this.userTypeCrudMap.view && !this.userTypeCrudMap.create) {
      this.getAllApplicationsByUserID();
    }

    this.dateService.setActiveComponent('CapacityPlannerComponent');
    this.subscription = this.dateService.activeComponent$.pipe(
      filter(activeComponent => activeComponent === 'CapacityPlannerComponent'),
      switchMap(() => this.dateService.date$)).subscribe(dates => {
        console.log('Raw date input:', dates);
        this.datemodel = dates;
        this.startTime = this.formatDate(this.datemodel.startdateTime);
        this.endTime = this.formatDate(this.datemodel.enddateTime);
        this.getCapacityPlannerData();
      });
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
  }

  formatDate(raw: string): string {
    if (!raw || raw.length !== 12) return '';
    const year = raw.substring(0, 4);
    const month = raw.substring(4, 6);
    const day = raw.substring(6, 8);
    const hour = raw.substring(8, 10);
    const minute = raw.substring(10, 12);

    return `${year}-${month}-${day} ${hour}:${minute}:00`;
  }

  getAllApplicationsByUserID() {
    this.currentUser.sessionDTO = this.sessionObject;
    this.applicationService.getAllApplicationsByUserID(this.currentUser).pipe(switchMap(data => from(this.decoderService.decodeObject(data))),takeUntil(this.destroy$)).subscribe((response: any) => {
      if (response.serviceStatus == 'Success') {
        this.applicationList = response.serviceResponse;
        this.applicationList.sort(function (a: { applicationName: string; }, b: { applicationName: string; }) {
          return a.applicationName.toLowerCase().localeCompare(b.applicationName.toLowerCase());
        });
      }
    });
  }

  getIPAddressByApplicationID() {
    this.ipAddressList = [];
    this.ipAddress = "undefined";
    const appObj = new ApplicationMaster;
    appObj.applicationID = this.applicationNameID;
    let applicationName = null;
    for (let x of this.applicationList) {
      if (x.appID == appObj.applicationID) {
        applicationName = x.applicationName;
      }
    }
    this.sessionObject.applicationName = applicationName;
    this.sessionObject.applicationIpAddress = null;
    this.sessionObject.datasource = null;
    appObj.sessionDTO = this.sessionObject;

    this.capacityPlannerService.getIPAddressByApplicationID(appObj).pipe(first(),takeUntil(this.destroy$)).subscribe((response: any) => {
      if (response.serviceStatus == "Success") {
        this.ipAddressList = response.serviceResponse;
        this.ipAddressList = Array.from(new Map(this.ipAddressList.map((item: { ipAddress: any; }) => [item.ipAddress, item])).values());
        this.ipAddressList.sort(function (a: { ipAddress: string; }, b: { ipAddress: string; }) {
          return a.ipAddress.toLowerCase().localeCompare(b.ipAddress.toLowerCase());
        });
      }
      else {
        this.ipAddressList = [];
      }
    });
  }

  refreshData() {
    console.log("Refresd Data");
  }

  getCapacityPlannerData() {
    if (this.ipAddress && this.startTime && this.endTime) {

      const cp = new CapacityPlanner();
      cp.ipaddress = this.ipAddress;
      cp.fromDate = this.startTime;
      cp.tillDate = this.endTime;
      cp.applicationID = this.applicationNameID;
      cp.dataSource = this.dataSourceType;

      let applicationName = null;
      for (let x of this.applicationList) {
        if (x.appID == cp.applicationID) {
          applicationName = x.applicationName;
        }
      }
      this.sessionObject.applicationName = applicationName;
      this.sessionObject.applicationIpAddress = cp.ipaddress;
      this.sessionObject.datasource = cp.dataSource;
      cp.sessionDTO = this.sessionObject;
      this.capacityPlannerService.getCapacityPlannerData(cp).pipe(first(),takeUntil(this.destroy$)).subscribe((response: any) => {
        if (response.serviceStatus == "Success") {
          this.capacityPlanner = response.serviceResponse;

          this.avgCpuValue = parseFloat(this.capacityPlanner?.cpuHealthData?.cpuAvg ?? '0');
          this.peakCpuValue = parseFloat(this.capacityPlanner?.cpuHealthData?.cpuMax ?? '0');
          this.minCpuValue = parseFloat(this.capacityPlanner?.cpuHealthData?.cpuMin ?? '0');
          this.peakCpuValueTime = this.capacityPlanner?.cpuHealthData?.cpuBussHrMax;
          this.minCpuValueTime = this.capacityPlanner?.cpuHealthData?.cpuBussHrMin;

          this.avgMemoryValue = parseFloat(this.capacityPlanner?.memoryHealthData?.cpuAvg ?? '0');
          this.peakMemoryValue = parseFloat(this.capacityPlanner?.memoryHealthData?.cpuMax ?? '0');
          this.minMemoryValue = parseFloat(this.capacityPlanner?.memoryHealthData?.cpuMin ?? '0');
          this.peakMemoryValueTime = this.capacityPlanner?.memoryHealthData?.cpuBussHrMax;
          this.minMemoryValueTime = this.capacityPlanner?.memoryHealthData?.cpuBussHrMin;

          this.avgDiskValue = parseFloat(this.capacityPlanner?.diskHealthData?.cpuAvg ?? '0');
          this.peakDiskValue = parseFloat(this.capacityPlanner?.diskHealthData?.cpuMax ?? '0');
          this.minDiskValue = parseFloat(this.capacityPlanner?.diskHealthData?.cpuMin ?? '0');
          this.peakDiskValueTime = this.capacityPlanner?.diskHealthData?.cpuBussHrMax;
          this.minDiskValueTime = this.capacityPlanner?.diskHealthData?.cpuBussHrMin;

          const cpuChartData = this.capacityPlanner?.cpuHealthData?.lineGraphData?.chartData;
          const cpuChartCategory = this.capacityPlanner?.cpuHealthData?.lineGraphData?.chartCategory;
          if (cpuChartData && cpuChartCategory) {
            this.getCpuHealthChart(cpuChartData, cpuChartCategory);
          } else {
            this.cpuHealthCharts = null;
          }
          const memoryChartData = this.capacityPlanner?.memoryHealthData?.lineGraphData?.chartData;
          const memoryChartCategory = this.capacityPlanner?.memoryHealthData?.lineGraphData?.chartCategory;
          if (memoryChartData && memoryChartCategory) {
            this.getMemoryHealthChart(memoryChartData, memoryChartCategory);
          } else {
            this.memoryHealthCharts = null;
          }

          const diskChartData = this.capacityPlanner?.diskHealthData?.lineGraphData?.chartData;
          const diskChartCategory = this.capacityPlanner?.diskHealthData?.lineGraphData?.chartCategory;
          if (diskChartData && diskChartCategory) {
            this.getDiskHealthChart(diskChartData, diskChartCategory);
          } else {
            this.diskHealthCharts = null;
          }

        }
        else {
          this.capacityPlanner = new CapacityPlanner();
          this.capacityPlanner.cpuHealthData.cpuAvg = "";
          this.capacityPlanner.memoryHealthData.cpuAvg = "";
          this.capacityPlanner.diskHealthData.cpuAvg = "";
        }
      }, (error: any) => {
        console.log("Error Occured" + error);
      });
    }
  }

  getCpuHealthChart(data: number[], categories: string[]): void {
    try {
      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--border-color').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const shortCategories = categories.map(cat => {
        const [datePart, timePart] = cat.split(' ');
        if (!datePart || !timePart) return cat;

        const monthDay = datePart.slice(5);
        const hourMinute = timePart.slice(0, 5);
        return `${monthDay} ${hourMinute}`;
      });

      this.cpuHealthCharts = {
        chart: {
          type: 'area',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories: shortCategories,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: [{
          name: 'CPU Usage',
          data: data,
          type: 'area',
          marker: { radius: 2 },
          lineWidth: 1,
          fillOpacity: 0.3
        }],
        credits: { enabled: false }
      };
    } catch (e) {
      console.log("Error Occurred in chart setup", e);
    }
  }

  getMemoryHealthChart(data: number[], categories: string[]): void {
    try {
      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--border-color').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const shortCategories = categories.map(cat => {
        const [datePart, timePart] = cat.split(' ');
        if (!datePart || !timePart) return cat;

        const monthDay = datePart.slice(5);
        const hourMinute = timePart.slice(0, 5);
        return `${monthDay} ${hourMinute}`;
      });

      this.memoryHealthCharts = {
        chart: {
          type: 'area',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories: shortCategories,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: [{
          name: 'CPU Usage',
          data: data,
          type: 'area',
          marker: { radius: 2 },
          lineWidth: 1,
          fillOpacity: 0.3
        }],
        credits: { enabled: false }
      };
    } catch (e) {
      console.log("Error Occurred in chart setup", e);
    }
  }

  getDiskHealthChart(data: number[], categories: string[]): void {
    try {
      const styles = getComputedStyle(document.body);
      const labelColor = styles.getPropertyValue('--text-color').trim();
      const gridColor = styles.getPropertyValue('--border-color').trim();
      const tooltipBgColor = styles.getPropertyValue('--tooltip-bg-color').trim();
      const tooltipTextColor = styles.getPropertyValue('--tooltip-text-color').trim();

      const shortCategories = categories.map(cat => {
        const [datePart, timePart] = cat.split(' ');
        if (!datePart || !timePart) return cat;

        const monthDay = datePart.slice(5);
        const hourMinute = timePart.slice(0, 5);
        return `${monthDay} ${hourMinute}`;
      });

      this.diskHealthCharts = {
        chart: {
          type: 'area',
          backgroundColor: 'transparent',
          spacing: [5, 5, 5, 5],
          style: { fontSize: '10px' }
        },
        title: { text: undefined },
        xAxis: {
          categories: shortCategories,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        yAxis: {
          min: 0,
          tickAmount: 6,
          title: { text: "" },
          labels: { style: { color: labelColor, fontSize: '9px' } },
          gridLineColor: gridColor
        },
        tooltip: {
          shared: true,
          backgroundColor: tooltipBgColor,
          style: { color: tooltipTextColor, fontSize: '10px' }
        },
        legend: { enabled: false },
        series: [{
          name: 'CPU Usage',
          data: data,
          type: 'area',
          marker: { radius: 2 },
          lineWidth: 1,
          fillOpacity: 0.3
        }],
        credits: { enabled: false }
      };
    } catch (e) {
      console.log("Error Occurred in chart setup", e);
    }
  }

}
