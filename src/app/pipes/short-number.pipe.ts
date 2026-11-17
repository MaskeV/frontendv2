import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'shortNumber',
  standalone: true
})
export class ShortNumberPipe implements PipeTransform {

  transform(value: number | null | undefined, decimals: number = 1, noData: string = 'No Data', extra: string | undefined = ''): string {

    if (value == null || !Number.isFinite(value)) {
      return noData;
    }

    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    const format = (num: number): string =>
      Number.isInteger(num) ? num.toString() : num.toFixed(decimals);

    if (abs < 1_000) {
      return format(value) + extra;
    }

    if (abs < 1_000_000) {
      const v = abs / 1_000;
      return `${sign}${format(v)}K` + extra;
    }

    if (abs < 1_000_000_000) {
      const v = abs / 1_000_000;
      return `${sign}${format(v)}M` + extra;
    }

    const v = abs / 1_000_000_000;
    return `${sign}${format(v)}B` + extra;
  }


}
