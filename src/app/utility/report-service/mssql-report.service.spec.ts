import { TestBed } from '@angular/core/testing';

import { MssqlReportService } from './mssql-report.service';

describe('MssqlReportService', () => {
  let service: MssqlReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MssqlReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
