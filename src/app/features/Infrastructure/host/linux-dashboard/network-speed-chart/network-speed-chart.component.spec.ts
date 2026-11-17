import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NetworkSpeedChartComponent } from './network-speed-chart.component';
import type * as HighchartsType from 'highcharts';
import { NO_ERRORS_SCHEMA } from '@angular/core';

// Extension Mocks
jest.mock('highcharts/highcharts-more.js', () => jest.fn());
jest.mock('highcharts/modules/solid-gauge.js', () => jest.fn());
jest.mock('highcharts/modules/exporting.js', () => jest.fn());
jest.mock('highcharts/modules/export-data.js', () => jest.fn());
jest.mock('highcharts/modules/accessibility.js', () => jest.fn());

const Highcharts = require('highcharts') as typeof HighchartsType;

(global as any).bootstrap = {
  Tooltip: jest.fn(() => ({ dispose: jest.fn() }))
};

describe('NetworkSpeedChartComponent', () => {
  let component: NetworkSpeedChartComponent;
  let fixture: ComponentFixture<NetworkSpeedChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NetworkSpeedChartComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(NetworkSpeedChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize chartOptions with default data', () => {
    const series = component.chartOptions.series?.[0] as HighchartsType.SeriesGaugeOptions;
    expect(series.data).toEqual([0]);
    expect(component.updateFlag).toBe(false);
  });

  it('should update chartOptions series when input value changes', () => {
    component.value = 5.5;
    component.ngOnChanges({
      value: { currentValue: 5.5, previousValue: 0, firstChange: false, isFirstChange: () => false }
    });
    fixture.detectChanges();

    const series = component.chartOptions.series?.[0] as HighchartsType.SeriesGaugeOptions;
    expect(series.data).toEqual([5.5]);
    expect(component.updateFlag).toBe(true);
  });

  it('should handle null input value gracefully', () => {
    component.value = null;
    component.ngOnChanges({
      value: { currentValue: null, previousValue: 0, firstChange: false, isFirstChange: () => false }
    });
    fixture.detectChanges();

    const series = component.chartOptions.series?.[0] as HighchartsType.SeriesGaugeOptions;
    expect(series.data).toEqual([0]);
    expect(component.updateFlag).toBe(true);
  });
});
