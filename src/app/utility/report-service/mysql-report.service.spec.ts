import { TestBed } from '@angular/core/testing';

import { MysqlReportService } from './mysql-report.service';

describe('MysqlReportService', () => {
  let service: MysqlReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MysqlReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
