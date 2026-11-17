import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: 'grdFilter',
  standalone: true
})
export class GrdFilterPipe implements PipeTransform {

  transform<T extends Record<string, any>>(
    items: T[] | null,
    filter: any,
    defaultFilter: boolean = false
  ): T[] {

    if (!items || !Array.isArray(items) || !filter) {
      return items ?? [];
    }

    const filterKeys = Object.keys(filter);

    if (defaultFilter) {
      return items.filter(item =>
        filterKeys.every(key =>
          !filter[key] || new RegExp(filter[key], 'gi').test(item[key])
        )
      );
    }

    return items.filter(item =>
      filterKeys.some(key =>
        !filter[key] || new RegExp(filter[key], 'gi').test(item[key])
      )
    );
  }
}
