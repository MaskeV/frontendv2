import { Component, Input, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more.js';
import SolidGauge from 'highcharts/modules/solid-gauge.js';

// Initialize modules
(HighchartsMore as any).default?.(Highcharts);
(SolidGauge as any).default?.(Highcharts);

@Component({
    selector: 'app-network-speed-chart',
    imports: [CommonModule, HighchartsChartModule],
    template: `
    <div class="gauge-container">
      <highcharts-chart
        [Highcharts]="Highcharts"
        [options]="chartOptions"
        style="width:100%; height:100%; display:block;">
      </highcharts-chart>
    </div>
  `,
    styleUrls: ['./network-speed-chart.component.css']
})
export class NetworkSpeedChartComponent {
  Highcharts = Highcharts;

  @Input() value: number | null = 0;
  @Input() unit: string = 'KBps';

  updateFlag = false;
  dynamicMax: any;

  chartOptions: Highcharts.Options = {
    chart: { type: 'gauge', height: '110%' },
    title: undefined,
    pane: {
      startAngle: -90,
      endAngle: 90,
      background: [{
        outerRadius: '100%',
        innerRadius: '60%',
        shape: 'arc',
        backgroundColor: '#eee'
      }]
    },
    tooltip: { enabled: false },
    yAxis: {
      min: 0,
      max: 10,   // default, will be recalculated in ngOnChanges
      tickAmount: 2,
      lineWidth: 0,
      tickWidth: 0,
      labels: { y: 16 }
    },
    series: [{
      type: 'gauge',
      data: [0],
      dial: {
        radius: '100%',
        backgroundColor: '#3f51b5',
        baseWidth: 6,
        topWidth: 1,
        baseLength: '90%',
      },
      dataLabels: {
        format: `<div style="text-align:center">
                   <span style="font-size:20px">{y:.2f} Kbps</span>
                 </div>`
      }
    }]
  };

  ngOnChanges(changes: SimpleChanges) {
    if (this.value && this.value > 0) {
      const exponent = Math.ceil(Math.log10(this.value));
      this.dynamicMax = Math.pow(10, exponent); 
    } else {
      this.dynamicMax = 10;
    }

    if (changes['value'] || changes['unit']) {
      this.chartOptions = {
        ...this.chartOptions,
        yAxis: {
          ...this.chartOptions.yAxis,
          max: this.dynamicMax
        },
        series: [{
          type: 'gauge',
          data: [this.value ?? 0],
          dial: {
            radius: '100%',
            backgroundColor: '#3f51b5',
            baseWidth: 6,
            topWidth: 1,
            baseLength: '90%',
          },
          dataLabels: {
            format: `<div style="text-align:center">
                       <span style="font-size:12px">{y:.2f} ${this.unit}</span>
                     </div>`
          }
        }]
      };

      this.updateFlag = true;
    }
  }

}
