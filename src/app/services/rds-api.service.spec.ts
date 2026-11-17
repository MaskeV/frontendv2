import { TestBed } from '@angular/core/testing';

import { RdsApiService } from './rds-api.service';

describe('RdsApiService', () => {
  let service: RdsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RdsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
