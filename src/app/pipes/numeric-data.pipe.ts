import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numericData',
  standalone: true
})
export class NumericDataPipe implements PipeTransform {

  transform(value: number | null | undefined, extra: string | undefined =undefined, decimals: number = 2, noData: string = 'No Data'): string {
    if (value === null || value === undefined || isNaN(value)) {
      return noData;
    }

    if (Number.isInteger(value)) {
      return value.toString() + `${extra ?? ''}`;
    }

    return value.toFixed(decimals) + `${extra ?? ''}`;
  }

}
