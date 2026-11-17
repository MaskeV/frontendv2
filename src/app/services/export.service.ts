import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface ExportColumn<T = any> {
  header: string;
  field?: keyof T | string;
  valueFormatter?: (item: T) => string | number | null | undefined;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  /**
   * Export dataset to Excel (.xlsx)
   */
  exportToExcel<T>(data: T[], columns: ExportColumn<T>[], filename: string): void {
    if (!data || data.length === 0) {
      console.warn('Export dataset is empty');
      return;
    }
    const formattedData = this.formatData(data, columns);
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(formattedData);

    const colWidths = columns.map(col => ({
      wch: Math.max(col.header.length + 4, 15)
    }));
    worksheet['!cols'] = colWidths;

    const sheetName = filename.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 31);
    const workbook: XLSX.WorkBook = {
      Sheets: { [sheetName]: worksheet },
      SheetNames: [sheetName]
    };

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });
    saveAs(blob, `${filename}_${this.getTimestamp()}.xlsx`);
  }

  /**
   * Export dataset to CSV (.csv)
   */
  exportToCsv<T>(data: T[], columns: ExportColumn<T>[], filename: string): void {
    if (!data || data.length === 0) {
      console.warn('Export dataset is empty');
      return;
    }
    const formattedData = this.formatData(data, columns);
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(formattedData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}_${this.getTimestamp()}.csv`);
  }

  private formatData<T>(data: T[], columns: ExportColumn<T>[]): Record<string, any>[] {
    return data.map(item => {
      const row: Record<string, any> = {};
      for (const col of columns) {
        if (col.valueFormatter) {
          row[col.header] = col.valueFormatter(item);
        } else if (col.field) {
          const val = (item as any)[col.field];
          row[col.header] = val !== undefined && val !== null ? val : '';
        }
      }
      return row;
    });
  }

  private getTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  }
}

