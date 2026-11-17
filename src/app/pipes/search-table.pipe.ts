import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'searchTable',
  standalone: true
})
export class SearchTablePipe implements PipeTransform {

 transform(items: any[], searchTableData: string, searchFields: string[]): any[] {
    if (!items) return [];
    if (!searchTableData) return items;

    searchTableData = searchTableData.toLowerCase(); // Make search case-insensitive

    return items.filter(item => {
      return searchFields.some(field => 
        item[field]?.toString().toLowerCase().includes(searchTableData)
      );
    });
  }
}
