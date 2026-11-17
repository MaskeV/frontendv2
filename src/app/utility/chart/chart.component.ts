import { CommonModule } from '@angular/common';
import { Component, inject, Input, SimpleChanges } from '@angular/core';
import * as Highcharts from 'highcharts';
import {HighchartsChartModule } from 'highcharts-angular';
import 'highcharts/modules/accessibility';

@Component({
    selector: 'app-chart',
    templateUrl: './chart.component.html',
    styleUrls: ['./chart.component.css'],
    imports: [CommonModule,
        HighchartsChartModule
    ]
})
export class ChartComponent {
  @Input() chartType: 'line' | 'tilemap' | 'area' | 'bar' | 'column'| 'scatter' | 'spline' = 'line';
  @Input() title = '';

  // Unified Highcharts inputs
    @Input()
 lineChartOptions: Highcharts.Options = {
  title: { text: '' },
  xAxis: { categories: [] },
  series: []
};
  @Input() tilemapChartOptions!: Highcharts.Options;
  @Input() areaChartOptions!: Highcharts.Options;
  @Input() barChartOptions!: Highcharts.Options;
  @Input() columnChartOptions! : Highcharts.Options;
  @Input() scatterChartOptions! : Highcharts.Options;
  @Input() splineChartOptions! : Highcharts.Options;


  Highcharts = Highcharts;
  static component: any;
  chart?: Highcharts.Chart;

 ngOnChanges(changes: SimpleChanges): void {
  if (changes['chartType']) {
    // Optional logic for chartType change
  }

  if (changes['lineChartOptions'] && this.chartType === 'line' && this.chart) {
    this.chart.update(this.lineChartOptions);
  }

  if (changes['tilemapChartOptions'] && this.chartType === 'tilemap' && this.chart) {
    this.chart.update(this.tilemapChartOptions);
  }
}

chartCallback = (chart: Highcharts.Chart) => {
  this.chart = chart;
}

}

