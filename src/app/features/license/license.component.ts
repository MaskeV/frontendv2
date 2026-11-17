import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { User } from '../../models/user';
import { LicenseService } from '../../services/license.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DecoderService } from '../../services/decoder.service';
import { Router } from '@angular/router';
import Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';

@Component({
    selector: 'app-license',
    imports: [
        CommonModule,
        FormsModule,
        HighchartsChartModule,
    ],
    templateUrl: './license.component.html',
    styleUrl: './license.component.css'
})
export class LicenseComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  Highcharts: typeof Highcharts = Highcharts;

  user: User = new User();

  email: string = 'sales@apmosys.com';
  licenseModule: string = 'ApMoSys monitoring consuption is based on various types of monitoring units that are consumed by your ApMoSys environement during the monitoring of your applications and related services.';

  licenceDataUsed: any;
  licenceDetails: any;
  licenseKey!: string;

  unitCharts: any[] = [];

  unitTypes = ['fullstackAllocated', 'modulesAllocated', 'nduAllocated', 'usersAllocated'];
  unitConfig: any = {
    fullstackAllocated: { label: 'Fullstack Units', icon: 'fa-solid fa-layer-group' },
    modulesAllocated: { label: 'Modules Units', icon: 'fa-solid fa-cubes' },
    nduAllocated: { label: 'NDU Units', icon: 'fa-solid fa-microchip' },
    usersAllocated: { label: 'Users Units', icon: 'fa-solid fa-users' },
  };

  isLoading = true;

  constructor(
    private licenseService: LicenseService,
    public modalService: NgbModal,
    private decoderService: DecoderService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.user = <User>this.decoderService.decryptJson(JSON.parse(sessionStorage.getItem('currentUser')!))!;
    if (this.user.userType === 'Super Admin' || this.user.userType === 'Admin') {
      this.getLicenseDetails();
      this.getLicenseUnitsUsed();
    } else {
      this.router.navigate(['/error']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getLicenseUnitsUsed(): void {
    this.licenseService.getLicenseUnitsUsed().pipe(takeUntil(this.destroy$)).subscribe({
        next: (data: any) => {
          this.licenceDataUsed = data.serviceResponse;
          this.generateAllUnitData();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  getLicenseDetails(): void {
    this.licenseService.getLicenseDetails().pipe(takeUntil(this.destroy$)).subscribe({
        next: (data: any) => {
          this.licenceDetails = data.serviceResponse;
          this.generateAllUnitData();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  getUnitValues(unitType: string) {
    const used = this.licenceDataUsed?.[unitType] || 0;

    const mapping: any = {
      fullstackAllocated: 'fullstackUnits',
      modulesAllocated: 'modulesUnits',
      nduAllocated: 'nduUnits',
      usersAllocated: 'usersUnits'
    };

    const allotted = this.licenceDetails?.[mapping[unitType]] || 0;

    return { used, allotted };
  }

  generateAllUnitData(): void {
    if (!this.licenceDataUsed || !this.licenceDetails) return;

    this.unitCharts = [];

    this.unitTypes.forEach(unitType => {
      const { used, allotted } = this.getUnitValues(unitType);
      if (!allotted || allotted === 0) return;
      const config = this.unitConfig[unitType];

      this.unitCharts.push({
        type: unitType,
        label: config.label,
        chartOptions: this.generatePieChart(unitType, used, allotted)
      });

    });
  }

  generatePieChart(type: string, used: number, allotted: number) {
    const percentage = allotted > 0 ? (used / allotted) * 100 : 0;
    const iconClass = this.unitConfig[type]?.icon;

    return {
      chart: {
        type: 'pie',
        backgroundColor: 'transparent',
        height: 120,
        spacing: [0, 0, 0, 0],
        events: {
          render: function (this: Highcharts.Chart) {

            const chart = this as unknown as Highcharts.Chart & {
              centerIcon?: Highcharts.SVGElement
            };

            const centerX = chart.plotLeft + chart.plotWidth / 2;
            const centerY = chart.plotTop + chart.plotHeight / 2;

            const iconHTML = `
            <div style="text-align:center;">
              <i class="${iconClass}" style="font-size:20px;color:#333;"></i>
            </div>
          `;

            if (!chart.centerIcon) {
              chart.centerIcon = chart.renderer
                .label(iconHTML, centerX, centerY, undefined, undefined, undefined, true)
                .css({ textAlign: 'center' })
                .add();
            }

            chart.centerIcon.attr({
              x: centerX - chart.centerIcon.getBBox().width / 2,
              y: centerY - chart.centerIcon.getBBox().height / 2
            });
          }
        }
      },

      title: { text: '' },
      credits: { enabled: false },
      legend: { enabled: false },
      tooltip: { enabled: false },

      plotOptions: {
        pie: {
          innerSize: '82%',
          borderWidth: 0,
          dataLabels: { enabled: false }
        }
      },

      series: [{
        type: 'pie',
        data: [
          { y: percentage, color: this.getUsageColor(percentage) },
          { y: 100 - percentage, color: '#E6E6E6' }
        ]
      }]
    };
  }

  getUsageColor(percentage: number): string {
    if (percentage <= 60) {
      return '#1E88E5';
    } else if (percentage <= 90) {
      return '#FF9302';
    } else {
      return '#FF0202';
    }
  }

  // Renew License

  isModalVisible = false;

  openModal() {
    this.isModalVisible = true;
  }

  closeModal() {
    this.isModalVisible = false;
  }

  confirmLicense(): void {
    this.licenseService.activateLicense(this.licenseKey).subscribe({
      next: (res) => {
        console.log('License activated successfully', res);
        this.closeModal();
      },
      error: (err) => {
        console.error('Activation failed', err);
        this.closeModal();
      }
    });
  }

}

