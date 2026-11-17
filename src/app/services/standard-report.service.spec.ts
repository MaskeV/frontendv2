import { TestBed } from '@angular/core/testing';
import { StandardReportService } from './standard-report.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('StandardReportService', () => {
  let service: StandardReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(StandardReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
