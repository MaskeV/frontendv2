import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'highlight',
  standalone: true
})
export class HighlightPipe implements PipeTransform {

  transform(value: any, args: any): any {
    if (!args) {
      return value;
    }
    var re = new RegExp(args, 'gi'); 
    const match = value.match(re);
    if (!match) {
      return value;
    }

    return value.replace(re, `<span class='highlight-text'>${match[0]}</span>`);
  }

}
