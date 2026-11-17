import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { from, Subject, switchMap, takeUntil } from 'rxjs';
import { ApplicationService } from '../../../services/application.service';
import { User } from '../../../models/user';
import { Session } from '../../../models/session';
import { DecoderService } from '../../../services/decoder.service';
import { LoggerService } from '../../../services/logger.service';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../../services/authentication.service';
import { SmReportsApiService } from '../../../services/sm-reports-api.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReportGeneratorService } from '../../../services/report-generator.service';
import * as bootstrap from 'bootstrap';
import { LinuxReportService } from '../../../utility/report-service/linux-report.service';
import { WindowsReportService } from '../../../utility/report-service/windows-report.service';
import { ApmReportService } from '../../../utility/report-service/apm-report.service';
import { MysqlReportService } from '../../../utility/report-service/mysql-report.service';
import { MssqlReportService } from '../../../utility/report-service/mssql-report.service';
import { OracleReportService } from '../../../utility/report-service/oracle-report.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RoleService } from '../../../services/role.service';

@Component({
  selector: 'app-html-report',
  imports: [CommonModule, FormsModule],
  templateUrl: './html-report.component.html',
  styleUrl: './html-report.component.css'
})
export class HtmlReportComponent implements OnInit, OnDestroy, AfterViewInit {

  user = new User();
  currentUser: User = new User();
  sessionObject: Session = new Session();

  destroy$ = new Subject<void>();

  isLoading = false;

  selectedAppType = '';
  technology: any = ""
  applicationNames: any[] = [];
  productList: string[] = [];
  technologyList: { technologyType: string; id: number }[] = [];
  selectedAppId: any = '';
  selectedApps: any[] = [];

  ipAddresses: any[] = [];
  selectedIp: any = '';

  startTime: any;
  endTime: any;

  reportResponse: any;
  generatedReportHtml = '';
  safeReportUrl!: SafeResourceUrl;

  checkReportButton = true;
  reportStatus: boolean | null = null;
  disablePreviewButton: boolean = true;
  showTimeSelector = false;
  isRegenerating = false;

  constructor(
    private decoderService: DecoderService,
    private applicationService: ApplicationService,
    private loggerService: LoggerService,
    private router: Router,
    private authService: AuthenticationService,
    private smReportsApiService: SmReportsApiService,
    private linuxReportService: LinuxReportService,
    private windowsReportService: WindowsReportService,
    private mysqlReportService: MysqlReportService,
    private mssqlReportService: MssqlReportService,
    private apmReportService: ApmReportService,
    private oracleReportService: OracleReportService,
    private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar,
    private roleService: RoleService
  ) {
    this.authService.currentUser.subscribe(
      x => this.currentUser = x || new User()
    );
  }

  ngOnInit(): void {
    this.user = this.decoderService.decryptJson(
      JSON.parse(sessionStorage.getItem('currentUser')!)
    ) as User;

    this.sessionObject.featureName = 'HTML Report';
    this.sessionObject.requestURI = this.router.url.split('?')[0];
    this.sessionObject.userId = this.currentUser.userId;
    this.sessionObject.loginTime = sessionStorage.getItem('loginTime');
    this.sessionObject.sessionId = sessionStorage.getItem('sessionId');

    const browser = this.loggerService.getBrowserNameAndVersion();
    this.sessionObject.browserName = browser.name;
    this.sessionObject.browserVersion = browser.version;

    this.currentUser.sessionDTO = this.sessionObject;
    this.loadProducts()
  }

  ngAfterViewInit(): void {
    Array.from(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    ).forEach(el => new bootstrap.Tooltip(el as any));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /*  COMMON UTILITIES */

  showSnack(message: string) {
    this.snackBar.open(message, '', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  formatDateTime(value: string): string {
    const d = new Date(value);
    return (
      d.getFullYear().toString() +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0') +
      String(d.getHours()).padStart(2, '0') +
      String(d.getMinutes()).padStart(2, '0')
    );
  }

  wrapSeries(arr: any[], valueKey: string) {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(v => v?.timeBucket)
      .map(v => ({
        timeBucket: v.timeBucket,
        value: v[valueKey] != null ? Number(v[valueKey]) : null
      }));
  }

getReportType(): string {
  const appType = this.selectedAppType?.toLowerCase();
  const tech = this.technology?.toLowerCase();

  if (appType === 'host' || appType === 'relational') {
    return tech || '';
  }

  return this.selectedAppType?.toLowerCase();
}

  isResetDisabled(): boolean {
    return !this.selectedAppType &&
      !this.technology &&
      !this.selectedAppId &&
      !this.selectedIp &&
      !this.startTime &&
      !this.endTime &&
      this.selectedApps.length === 0 &&
      !this.generatedReportHtml;
  }

  /*  RESET / CHIP ACTIONS */

  onReset() {
    this.selectedAppType = '';
    this.selectedAppId = '';
    this.selectedApps = [];
    this.applicationNames = [];
    this.technology = '';
    this.technologyList = [];
    this.ipAddresses = [];
    this.selectedIp = '';
    this.startTime = '';
    this.endTime = '';
    this.generatedReportHtml = '';
    this.checkReportButton = true;
    this.reportStatus = null;
    this.showTimeSelector = false;
    this.isRegenerating = false;
    this.disablePreviewButton = true;
  }

  removeApp(appToRemove: any) {
    this.selectedApps = this.selectedApps.filter(app => app !== appToRemove);
    this.selectedAppId = '';
    this.selectedIp = '';
  }

  /*  APPLICATION SELECTION */

  onAppTypeChange() {

    this.loadTechnology(this.selectedAppType);
    this.technology = ''

  }

  onAppNameSelect() {
    if (!this.selectedAppId) return;

    const selectedApp = this.applicationNames.find(
      a => a.applicationId === this.selectedAppId
    );
    if (!selectedApp) return;

    this.reportStatus = null;
    this.startTime = '';
    this.endTime = '';

    // DEFAULT
    if (this.selectedAppType.toUpperCase() !== 'HOST') {
      this.selectedApps = [selectedApp];
      this.disablePreviewButton = true;
      this.checkReportStatus();
      return;
    }

    // INFRA = SPECIAL CASE
    const payload = {
      applicationID: this.selectedAppId,
      sessionDTO: this.currentUser
    };

    this.reportStatus = null;

    this.applicationService.getAllIpAddressByAppId(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.ipAddresses = res.serviceResponse;
        this.disablePreviewButton = true;
      },
      error: err => console.error(err)
    });
  }

  onInfraIpSelect() {
    if (!this.selectedIp) return;

    this.startTime = '';
    this.endTime = '';
    this.reportStatus = null;

    const host = this.ipAddresses.find(
      ip => ip.ipAddrID === this.selectedIp
    );

    if (host) {
      this.selectedApps = [host];
      this.disablePreviewButton = true;
      this.checkReportStatus();
    }
  }

  /*  REPORT STATUS */

  checkReportStatus() {
    const applicationName =
      this.selectedAppType.toUpperCase() === 'HOST' ? this.selectedApps.map(a => a.ipAddress) + '_' + this.selectedAppType : this.selectedApps.map(a => a.applicationName);

    const reportType = this.getReportType();
    this.smReportsApiService.isReportFileExists(applicationName, this.user.userType, reportType).subscribe({
      next: (res: boolean) => {
        this.reportStatus = res;
        this.checkReportButton = false;

        if (res) {
          this.showSnack('Report already exists. You can preview it.');
          this.showTimeSelector = false;
        } else {
          this.showSnack('Please select time range and generate report.');
          this.showTimeSelector = true;
        }
      },
      error: () => console.error('Status check failed')
    });
  }

  onClickRegenerate() {
    this.isRegenerating = true;
    this.showTimeSelector = true;
    this.disablePreviewButton = true;
  }

  onCancelRegenerate() {
    this.isRegenerating = false;
    this.showTimeSelector = false;
    this.disablePreviewButton = false;
  }

  /*  GENERATE REPORT */

  generateReport() {
    if (!this.selectedApps.length) return;

    const applicationName =
      this.selectedAppType.toUpperCase() === 'HOST' ? this.selectedApps.map(a => a.ipAddress) + '_' + this.selectedAppType : this.selectedApps.map(a => a.applicationName);

    const st = this.formatDateTime(this.startTime);
    const et = this.formatDateTime(this.endTime);

    const reportType = this.getReportType();

    this.smReportsApiService.getApplicationReport(this.user.id, this.user.userType, applicationName, st, et, reportType).subscribe({
      next: (res: any) => {
        if (res?.serviceStatus === 'Success') {
          this.disablePreviewButton = false;
        }
      },
      error: () => {
        console.log("Error occurred!");
        this.disablePreviewButton = false;
      }
    });
  }


  /*  PREVIEW REPORT (CORE) */

  previewReport() {
    if (!this.selectedApps.length) return;

    this.isLoading = true;
    this.generatedReportHtml = '';

    const applicationName =
      this.selectedAppType.toUpperCase() === 'HOST' ? this.selectedApps.map(a => a.ipAddress) + '_' + this.selectedAppType : this.selectedApps.map(a => a.applicationName);

    const st = this.formatDateTime(this.startTime);
    const et = this.formatDateTime(this.endTime);

    const reportType = this.getReportType();

    this.smReportsApiService.readReportFile(applicationName, this.user.userType, reportType).subscribe({
      next: (response: any) => {

        /* ========= APM ========= */
        if (this.selectedAppType === 'Service') {
          const res = response.serviceResponse;
          const appName = applicationName[0];

          this.generatedReportHtml = this.apmReportService.getApmHtmlTemplate();

          const payload = {
            dataByApm: {
              [appName]: {
                successRateData: this.wrapSeries(res.serviceSuccessRate.data || [], 'percentage'),
                apdexData: this.wrapSeries(res.serviceApdex.data || [], 'int_value'),
                loadData: this.wrapSeries(res.serviceLoad.data || [], 'value'),
                latencyData: this.wrapSeries(res.serviceResponseTime.data || [], 'value'),
                latencyPercentileData: res.servicePercentile,
                sourceAgg: res.serviceAggregation,
                kpis: {
                  apdexAvg: res.serviceApdex.avg,
                  successRateAvg: res.serviceSuccessRate.avg,
                  loadAvg: res.serviceLoad.avg,
                  latencyAvg: res.serviceResponseTime.avg,
                  errorHit: res.hitsAndErrors.errorHits,
                  totalHit: res.hitsAndErrors.allHits
                },
                meta: { startTime: res.startTime, endTime: res.endTime },
                thresholds: { thresholdData: res.thresholds },
                topology: res.topology,
                rcaProblems: res.rcaProblems || []
              }
            }
          };

          this.generatedReportHtml =
            this.generatedReportHtml.replace(
              '%%REPORT_PAYLOAD_SCRIPT_BLOCK%%',
              `window.REPORT_DATA=${JSON.stringify(payload)};var reportPayload=window.REPORT_DATA;`
            );
        }

        /* ========= LINUX ========= */
        else if (this.technology.toUpperCase() === 'LINUX') {
          const res = response.serviceResponse;
          const ip = res.ipAddress;

          this.generatedReportHtml = this.linuxReportService.getLinuxHtmlTemplate();

          // Average
          const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

          const memRamData = res.memoryRamData || [];
          const memSwapData = res.memorySwapData || [];
          const cpuLoadData = res.avgCpuLoadData || [];

          const totalMemRam = memRamData[0]?.meter_vm_memory_total || 0;
          const totalMemSwap = memSwapData[0]?.meter_vm_memory_swap_total || 0;

          // extract values
          const cpuLoad1 = cpuLoadData.map((d: any) => d.meter_vm_cpu_load1 || 0);
          const cpuLoad5 = cpuLoadData.map((d: any) => d.meter_vm_cpu_load5 || 0);
          const cpuLoad15 = cpuLoadData.map((d: any) => d.meter_vm_cpu_load15 || 0);

          const availableMemRam = memRamData.map((d: any) => d.meter_vm_memory_available || 0);
          const usedMemRam = memRamData.map((d: any) => d.meter_vm_memory_used || 0);
          const buffCacheMemRam = memRamData.map((d: any) => d.meter_vm_memory_buff_cache || 0);

          const availableMemSwap = memSwapData.map((d: any) => d.meter_vm_memory_swap_free || 0);
          const usedMemSwap = memSwapData.map((d: any) => (d.meter_vm_memory_swap_total - d.meter_vm_memory_swap_free) || 0);

          const logicalCore = res.hostProperties.logical_cores;


          // thresholds
          const thresholds = {
            meter_vm_cpu_load1: {
              warning: logicalCore * 0.75,
              critical: logicalCore * 1.0,
              avg: avg(cpuLoad1)
            },
            meter_vm_cpu_load5: {
              warning: logicalCore * 0.75,
              critical: logicalCore * 1.0,
              avg: avg(cpuLoad5)
            },
            meter_vm_cpu_load15: {
              warning: logicalCore * 0.75,
              critical: logicalCore * 1.0,
              avg: avg(cpuLoad15)
            },

            // Memory RAM
            meter_vm_memory_available: {
              warning: totalMemRam * 0.20,
              critical: totalMemRam * 0.10,
              avg: avg(availableMemRam)
            },
            meter_vm_memory_used: {
              warning: totalMemRam * 0.80,
              critical: totalMemRam * 0.90,
              avg: avg(usedMemRam)
            },
            meter_vm_memory_buff_cache: {
              warning: null,
              critical: null,
              avg: avg(buffCacheMemRam)
            },

            // Memory Swap
            meter_vm_memory_swap_free: {
              warning: totalMemSwap * 0.30,
              critical: totalMemSwap * 0.10,
              avg: avg(availableMemSwap)
            },
            meter_vm_memory_swap_used: {
              warning: totalMemSwap * 0.70,
              critical: totalMemSwap * 0.90,
              avg: avg(usedMemSwap)
            }
          };

          console.log("thresholds: ", thresholds);

          const payload = {
            ips: [ip],
            dataByIp: {
              [ip]: {
                kpiData: res.kpiData,
                hostProperties: res.hostProperties,

                avgCpuUsageData: res.avgCpuUsageData,
                avgCpuLoadData: res.avgCpuLoadData,
                memoryRamData: res.memoryRamData,
                memorySwapData: res.memorySwapData,
                fileSystemData: res.fileSystemData,
                diskIoData: res.diskIoData,
                networkBandwidthData: res.networkBandwidthData,
                networkStatusData: res.networkStatusData,
                fileFdData: res.fileFdData,

                processTableData: res.processTableData,

                meta: { startTime: res.startTime, endTime: res.endTime },
                thresholds: thresholds
              }
            }
          };

          this.generatedReportHtml = this.generatedReportHtml.replace(
            '%%REPORT_PAYLOAD_SCRIPT_BLOCK%%',
            `window.REPORT_DATA=${JSON.stringify(payload)};var reportPayload=window.REPORT_DATA;`
          );
        }

        /* ========= WINDOWS ========= */
        else if (this.technology.toUpperCase() === 'WINDOWS') {
          const res = response.serviceResponse;
          const ip = res.ipAddress;

          this.generatedReportHtml = this.windowsReportService.getWindowsHtmlTemplate();

          const payload = {
            ips: [ip],
            dataByIp: {
              [ip]: {
                kpiData: res.kpiData,
                hostProperties: res.hostProperties,

                avgCpuUsageData: res.avgCpuUsageData,
                avgCpuLoadData: res.avgCpuLoadData,
                memoryRamData: res.memoryRamData,
                memorySwapData: res.memorySwapData,
                fileSystemData: res.fileSystemData,
                diskIoData: res.diskIoData,
                networkBandwidthData: res.networkBandwidthData,
                networkStatusData: res.networkStatusData,
                fileFdData: res.fileFdData,

                processTableData: res.processTableData,

                meta: { startTime: res.startTime, endTime: res.endTime },
                thresholds: { thresholdData: res.thresholds }
              }
            }
          };

          this.generatedReportHtml = this.generatedReportHtml.replace(
            '%%REPORT_PAYLOAD_SCRIPT_BLOCK%%',
            `window.REPORT_DATA=${JSON.stringify(payload)};var reportPayload=window.REPORT_DATA;`
          );
        }

        /* ========= MYSQL ========= */
        else if (this.technology.toUpperCase() === 'MYSQL') {
          const res = response.serviceResponse;
          const appName = applicationName[0];

          this.generatedReportHtml = this.mysqlReportService.getMysqlHtmlTemplate();

          const payload = {
            dataByDb: {
              [appName]: {
                QpsData: res.QPS.data,
                TpsData: res.TPS.data,
                slowQueryRateData: res.slowQueryRate.data,
                readQueryData: res.startRate.data,
                writeQueryData: res.writeQueryTrend.data,
                threadTrendData: res.threadTrend.data,
                connectionErrorData: res.connectionError.data,
                connectsTrendData: res.connectsTrend.data,

                kpis: {
                  avgQps: res.QPS.avg,
                  avgTps: res.TPS.avg,
                  avgConnection: res.connectsTrend.avg,
                },
                meta: { startTime: res.startTime, endTime: res.endTime }
              }
            }
          };

          this.generatedReportHtml = this.generatedReportHtml.replace(
            '%%REPORT_PAYLOAD_SCRIPT_BLOCK%%',
            `window.REPORT_DATA=${JSON.stringify(payload)};var reportPayload=window.REPORT_DATA;`
          );
        }

        /* ========= MSSQL ========= */
        else if (this.technology.toUpperCase() === 'MSSQL') {
          const res = response.serviceResponse;
          const appName = applicationName[0];

          this.generatedReportHtml = this.mssqlReportService.getMssqlHtmlTemplate();

          const payload = {
            dataByDb: {
              [appName]: {
                QpsData: res.QPS.data,
                slowQueryRateData: res.slowQueryRate.data,
                readQueryData: res.startRate.data,
                writeQueryData: res.writeQueryTrend.data,
                threadTrendData: res.threadTrend.data,
                connectionErrorData: res.connectionError.data,
                connectsTrendData: res.connectsTrend.data,

                kpis: {
                  avgQps: res.QPS.avg,
                  avgConnection: res.threadTrend.avg,
                },
                meta: { startTime: res.startTime, endTime: res.endTime }
              }
            }
          };

          this.generatedReportHtml = this.generatedReportHtml.replace(
            '%%REPORT_PAYLOAD_SCRIPT_BLOCK%%',
            `window.REPORT_DATA=${JSON.stringify(payload)};var reportPayload=window.REPORT_DATA;`
          );
        }

        /* ========= ORACLE ========= */
        else if (this.technology.toUpperCase() === 'ORACLE') {
          const res = response.serviceResponse;
          const appName = applicationName[0];

          this.generatedReportHtml = this.oracleReportService.getOracleHtmlTemplate();

          const payload = {
            dataByDb: {
              [appName]: {
                QpsData: res.qps.data,
                staleQueriesData: res.staleQueries.data,
                slowQueryRateData: res.slowQueriesCount.data,

                bufferCacheHitRatio: res.bufferCacheHitRatio.data,
                openCursorData: res.openCursors.data,
                processDetailsData: res.processTrend.data,
                connectionData: res.connectionDetails.data,
                commandTrendData: res.commandsTrend.data,
                locksDetailsData: res.locksDetails.data,

                sessionDetailsData: res.sessionDetails.data,
                sessionUtilizationData: res.sessionUtilization.data,

                userErrorData: res.UserErrors.data,
                connectionErrorData: res.connectionErrors.data,
                deadlockData: res.deadlocks.data,

                procedureDetailsData: res.proceduresDetails.data,
                functionDetailsData: res.functionsDetails.data,
                packagesDetailsData: res.packagesDetails.data,
                procedureExecutionData: res.procedureExecution.data,
                procedureErrorData: res.procedureError.data,

                kpis: {
                  avgQps: res.qps.avg,
                  maxSession: res.sessionUtilization.avg,
                  maxProcess: res.processTrend.avg,
                },
                meta: { startTime: res.startTime, endTime: res.endTime }
              }
            }
          };

          this.generatedReportHtml = this.generatedReportHtml.replace(
            '%%REPORT_PAYLOAD_SCRIPT_BLOCK%%',
            `window.REPORT_DATA=${JSON.stringify(payload)};var reportPayload=window.REPORT_DATA;`
          );
        }

        const blob = new Blob([this.generatedReportHtml], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        this.safeReportUrl =
          this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);

        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  /* DOWNLOAD */

  downloadHtmlReport() {
    const blob = new Blob([this.generatedReportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const appType = this.selectedAppType?.toUpperCase();
    const techType = this.technology?.toUpperCase();

    const a = document.createElement('a');
    a.href = url;

    if(techType){
      a.download = `${appType} (${techType}) Report-${new Date().toISOString().slice(0, 10)}.html`;
    }else{
      a.download = `${appType} Report-${new Date().toISOString().slice(0, 10)}.html`;
    }
    
    a.click();

    URL.revokeObjectURL(url);
  }

  loadApp() {

    this.selectedAppId = '';
    this.ipAddresses = [];
    this.selectedIp = '';
    this.startTime = '';
    this.endTime = '';
    this.generatedReportHtml = '';
    this.checkReportButton = true;
    this.reportStatus = null;
    this.showTimeSelector = false;
    this.isRegenerating = false;
    this.disablePreviewButton = true;

    this.applicationService
      .getFullApplicationData(
        this.currentUser.userId,
        this.selectedAppType,
        this.sessionObject
      )
      .pipe(
        switchMap((data: any) => from(this.decoderService.decodeObject(data)))
      )
      .subscribe((response: any) => {
        this.applicationNames = response?.serviceResponse?.applications || [];
      });
  }

  onTechChange(selectedValue: string): void {

    this.selectedAppId = '';
    this.ipAddresses = [];
    this.selectedIp = '';
    this.startTime = '';
    this.endTime = '';
    this.generatedReportHtml = '';
    this.checkReportButton = true;
    this.reportStatus = null;
    this.showTimeSelector = false;
    this.isRegenerating = false;
    this.disablePreviewButton = true;
    this.technology = selectedValue;

    this.applicationService
      .getFullApplicationData(
        this.currentUser.userId,
        this.selectedAppType,
        this.sessionObject,
        selectedValue
      )
      .pipe(
        switchMap((data: any) => from(this.decoderService.decodeObject(data)))
      )
      .subscribe((response: any) => {
        this.applicationNames = response?.serviceResponse?.applications || [];
      });

  }

  loadTechnology(appType: string): void {
    this.applicationService.getTechnologyBySubFeature(appType).subscribe({
      next: (res: any) => {
        this.technologyList = res?.serviceResponse || [];

        if (this.technologyList.length == 0) {
          this.loadApp();
        }
      },
      error: () => {
        this.technologyList = [];
        this.loadApp();
      }
    });
  }

  // loadProducts(): void {
  //   const user = this.authService.currentUserValue;
  //   if (user) {
  //     const userId = user.userId;
  //     const userType = user.userType;
  //     const tool = sessionStorage.getItem('tool') || 'APM';

  //     this.roleService.findAppType(userId, userType, tool).subscribe({
  //       next: (res: any) => {
  //         this.productList = res.products || [];
  //       },
  //       error: () => {
  //         this.productList = [];
  //       }
  //     });
  //   }
  // }

  loadProducts(): void {
    const user = this.authService.currentUserValue;

    if (user) {
      const userId = user.userId;
      const userType = user.userType;
      const tool = sessionStorage.getItem('tool') || 'APM';

      this.roleService.findAppType(userId, userType, tool).subscribe({
        next: (res: any) => {
          const allowedProducts = ['Host', 'Relational', 'Service'];

          this.productList = (res.products || [])
            .filter((p: string) => allowedProducts.includes(p));
        },
        error: () => {
          this.productList = [];
        }
      });
    }
  }
}
