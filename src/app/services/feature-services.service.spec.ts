import { TestBed } from '@angular/core/testing';

import { FeatureService } from './feature-services.service';

describe('FeatureServicesService', () => {
  let service: FeatureService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FeatureService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
