import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sortOracle',
  standalone: true
})
export class SortOraclePipe implements PipeTransform {

  transform(value: any[], sortField: string, sortDirection: string): any[] {
    // Prevent crash when value is undefined or not an array
    if (!Array.isArray(value)) {
      return [];
    }

    // No sort field? return original
    if (!sortField) {
      return value;
    }

    const multiplier = sortDirection === 'desc' ? -1 : 1;

    return value.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      // Handle null/undefined values
      if (valA == null || valB == null) {
        return 0;
      }

      if (valA < valB) return -1 * multiplier;
      if (valA > valB) return 1 * multiplier;
      return 0;
    });
  }

}
