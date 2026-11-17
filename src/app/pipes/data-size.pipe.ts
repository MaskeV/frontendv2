import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dataSize',
  standalone: true
})
export class DataSizePipe implements PipeTransform {

  transform(value: number | null, decimals: number = 2): string {
    if (value === null || value === undefined || isNaN(value)) return '0 MB';

    // All values are in MB
    const units = ['MB', 'GB', 'TB', 'PB', 'EB'];
    let size = value;
    let unitIndex = 0;

    // Keep dividing by 1024 until it fits
    while (size >= 1024 && unitIndex < units.length - 1) {
      size = size / 1024;
      unitIndex++;
    }

    return `${size.toFixed(decimals)} ${units[unitIndex]}`;
  }
}
