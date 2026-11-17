import { TestBed } from '@angular/core/testing';

import { IisMonitoringApiService } from './iis-monitoring-api.service';

describe('IisMonitoringApiService', () => {
  let service: IisMonitoringApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IisMonitoringApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
