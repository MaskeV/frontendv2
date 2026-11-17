// src/setup-jest-highcharts.ts
import * as Highcharts from 'highcharts';

// Use require() so it works in Jest’s CommonJS transform
const HighchartsMore = require('highcharts/highcharts-more');
const SolidGauge = require('highcharts/modules/solid-gauge');
const Exporting = require('highcharts/modules/exporting');
const ExportData = require('highcharts/modules/export-data');

// Initialize modules
if (typeof HighchartsMore === 'function') {
  HighchartsMore(Highcharts);
}
if (typeof SolidGauge === 'function') {
  SolidGauge(Highcharts);
}
if (typeof Exporting === 'function') {
  Exporting(Highcharts);
}
if (typeof ExportData === 'function') {
  ExportData(Highcharts);
}

(global as any).Highcharts = Highcharts;
