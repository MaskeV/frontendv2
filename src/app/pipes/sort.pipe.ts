import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sort',
  standalone: true
})
export class SortPipe implements PipeTransform {
  transform(array: any[], sortField: string, sortDirection: string = 'asc'): any[] {
    if (!Array.isArray(array)) return array;

    const sortedArray = [...array];

    const multiplier = sortDirection === 'desc' ? -1 : 1;

    const extractValue = (val: any) => {
      if (typeof val === 'string') {
        const num = parseFloat(val.replace(/[^\d.]/g, ''));
        return isNaN(num) ? val : num;
      }
      return val;
    };
    
    sortedArray.sort((a, b) => {
      const aValue = extractValue(a[sortField]);
      const bValue = extractValue(b[sortField]);
    
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1 * multiplier;
      if (bValue == null) return -1 * multiplier;
    
      if (aValue < bValue) return -1 * multiplier;
      if (aValue > bValue) return 1 * multiplier;
      return 0;
    });
    

    return sortedArray;
  }
}