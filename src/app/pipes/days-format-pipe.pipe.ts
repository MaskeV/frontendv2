import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'daysFormat',
  standalone: true
})
export class DaysFormatPipe implements PipeTransform {

  transform(value: number | string | null): string {
    // 1. Handle Null/Undefined
    if (value === null || value === undefined) return '0d';

    // 2. Parse input (assuming input is in Decimal Days based on your logic)
    let numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '0d';

    // 3. Calculation Logic
    const days = Math.floor(numValue);
    const totalHours = (numValue - days) * 24;
    const hours = Math.floor(totalHours);
    // Use Math.round for minutes to avoid precision issues like 39.9999m
    const minutes = Math.round((totalHours - hours) * 60);

    // 4. Build the Shorthand String
    const parts: string[] = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    // 5. Join with a single space or return '0m' if everything is zero
    return parts.length > 0 ? parts.join(' ') : '0m';
  }
}
