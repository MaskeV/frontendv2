import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filterAll',
    standalone: false
})
export class FilterAllPipe implements PipeTransform {

   transform(items: any[], searchText: string): any[] {
    if(!items) return [];
    if(!searchText) return items;
    searchText = searchText.toLowerCase();
    if(searchText.includes(":")){
      let v=[];
      v=searchText.split(":");
      let k=v[0];
      v.shift();
      v.join('');
      return items.filter(function (it:any) {
        if(it[k]!=undefined)
          return it[k].toLowerCase().includes(v);
      });
    }
    else{
      return items.filter(function (it:any) {
        if(it.message!=undefined)
          return it.message.toLowerCase().includes(searchText);
      });
    }
    
    
   }
}
