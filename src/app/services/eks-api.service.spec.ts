import { TestBed } from '@angular/core/testing';

import { EksApiService } from './eks-api.service';

describe('EksApiService', () => {
  let service: EksApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EksApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
