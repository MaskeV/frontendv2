import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'searchItem',
  standalone : true
})
export class SearchItemPipe implements PipeTransform {

  transform(items: any[], searchText: string, key: string): any[] {
    if (!items || !searchText || !key) return items;

    searchText = searchText.toLowerCase();

    return items.filter(item => {
      const fieldValue = item[key];
      return fieldValue && fieldValue.toString().toLowerCase().includes(searchText);
    });
  }

}
