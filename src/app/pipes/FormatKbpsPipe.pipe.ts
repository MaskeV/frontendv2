import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatKbps',
  standalone: true
})
export class FormatKbpsPipe implements PipeTransform {
  transform(kbps: string | number): string {
    const val = parseFloat(kbps as string) || 0;
    if (val >= 1000000) return (val / 1000000).toFixed(2) + ' Gbps';
    if (val >= 1000)    return (val / 1000).toFixed(2) + ' Mbps';
    return val + ' Kbps';
  }
}