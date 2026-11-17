import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bytesToGb',
  standalone: true
})
export class BytesToGbPipe implements PipeTransform {
  transform(value: number | null, decimals = 2): number | null {
    if (value == null) return null;
    return +(value / (1024 ** 3)).toFixed(decimals);
  }
}