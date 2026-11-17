import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numberAbbreviate',
  standalone: true
})
export class NumberAbbreviatePipe implements PipeTransform {

  transform(value: number | null, decimals: number = 3, isDays: boolean = false): string {
    if (value === null || value === undefined || isNaN(value)) return '0';

    // Handle Days case
    if (isDays) {
      const days = Math.floor(value); // whole days
      const hours = (value - days) * 24; // fractional part in hours
      return `${days} days ${hours.toFixed(1)} hrs`;
    }

    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    const units = ['K', 'M', 'B', 'T'];
    let unit = '';
    let num = value;

    for (let i = units.length - 1; i >= 0; i--) {
      const size = Math.pow(10, (i + 1) * 3);
      if (abs >= size) {
        num = value / size;
        unit = units[i];
        break;
      }
    }

    // Instead of rounding, truncate to required decimals
    const factor = Math.pow(10, decimals);
    num = Math.trunc(num * factor) / factor;

    return sign + num + unit;
  }
}
