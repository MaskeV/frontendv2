import { TestBed } from '@angular/core/testing';

import { LinuxReportService } from './linux-report.service';

describe('LinuxReportService', () => {
  let service: LinuxReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LinuxReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
