import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'networkSearch',
  standalone: true
})
export class NetworkSearchPipe implements PipeTransform {

  transform(items: any[], searchText: string): any[] {
    if (!items || !searchText) {
      return items;
    }

    searchText = searchText.toLowerCase(); // Case-insensitive search

    return items.filter(item => 
      Object.values(item).some(val => 
        val && val.toString().toLowerCase().includes(searchText)
      )
    );
  }

}
