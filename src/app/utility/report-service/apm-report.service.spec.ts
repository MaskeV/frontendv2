import { TestBed } from '@angular/core/testing';

import { ApmReportService } from './apm-report.service';

describe('ApmReportService', () => {
  let service: ApmReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApmReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
