import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'keyValue',
  standalone: true
})
export class KeyValuePipe implements PipeTransform {
  transform(value: any, args?: string[]): any {
    const keys: any[] = [];
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        keys.push({ key: key, value: value[key] });
      }
    }
    return keys;
  }
}

