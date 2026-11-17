import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bytes',
  standalone: true
})
export class BytesPipe implements PipeTransform {

  transform(value: number | null | undefined, valueOnly: boolean = false, unitOnly: boolean = false, extra: string | undefined = undefined, precision: number = 2, noData: string = 'No Data'): string {
    if (value == null || !Number.isFinite(value)) {
      return noData;
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let bytes = Math.abs(value);
    let unitIndex = 0;

    while (bytes >= 1024 && unitIndex < units.length - 1) {
      bytes /= 1024;
      unitIndex++;
    }

    if (unitOnly) {
      return units[unitIndex]+ (extra ?? '');
    }

    if (valueOnly) {
      return Number.isInteger(bytes) ? bytes.toString() : bytes.toFixed(precision);
    }

    if (Number.isInteger(bytes)) {
      return `${bytes.toString()} ${units[unitIndex]}${extra ?? ''}`;
    }

    return `${bytes.toFixed(precision)} ${units[unitIndex]}${extra ?? ''}`;
  }

}
