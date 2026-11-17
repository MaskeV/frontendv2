import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "objectFilter",
  standalone: true,
})
export class ObjectFilterPipe implements PipeTransform {
  transform(items: any[], searchText: string, keys: string[]): any[] {
    if (!items || !searchText || !keys || keys.length === 0) {
      return items;
    }

    const lowerSearch = searchText.toLowerCase();

    return items.filter((item) =>
      keys.some((key) => {
        const value = item[key];
        return value && value.toString().toLowerCase().includes(lowerSearch);
      })
    );
  }
}
