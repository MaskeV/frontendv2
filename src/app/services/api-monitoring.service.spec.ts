import { TestBed } from '@angular/core/testing';
import { ApiMonitoringService } from './api-monitoring.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ApiMonitoringService', () => {
  let service: ApiMonitoringService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ApiMonitoringService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
