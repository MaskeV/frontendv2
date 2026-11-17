import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sort',
  standalone: true
})
export class SortPipe implements PipeTransform {

  transform<T extends Record<string, any>>(
    value: T[] | null,
    args: [string, 'asc' | 'desc']
  ): T[] {

    if (!value || !args?.length) {
      return value ?? [];
    }

    const [sortField, sortDirection] = args;
    const multiplier = sortDirection === 'desc' ? -1 : 1;

    return [...value].sort((a, b) => {
      if (a[sortField] < b[sortField]) return -1 * multiplier;
      if (a[sortField] > b[sortField]) return 1 * multiplier;
      return 0;
    });
  }
}


