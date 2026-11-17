import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'stringData',
  standalone: true
})
export class StringDataPipe implements PipeTransform {

  transform(value: string | null | undefined, fallback: string = 'No Data', capitalize: boolean = false): string {

    if (value == null) {
      return fallback;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }

    if (!capitalize) {
      return trimmed;
    }

    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

}
