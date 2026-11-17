import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "paginate",
  standalone: true,
})
export class PaginatePipe implements PipeTransform {
  transform<T>(
    array: T[],
    currentPage: number = 1,
    pageSize: number = 10
  ): T[] {
    if (!Array.isArray(array) || currentPage < 1 || pageSize < 1) {
      return array;
    }

    const start = (currentPage - 1) * pageSize;
    return array.slice(start, start + pageSize);
  }
}
