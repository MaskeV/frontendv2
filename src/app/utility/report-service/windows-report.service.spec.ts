import { TestBed } from '@angular/core/testing';

import { WindowsReportService } from './windows-report.service';

describe('WindowsReportService', () => {
  let service: WindowsReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WindowsReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
