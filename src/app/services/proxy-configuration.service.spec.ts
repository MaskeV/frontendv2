import { TestBed } from '@angular/core/testing';

import { ProxyConfigurationService } from './proxy-configuration.service';

describe('ProxyConfigurationService', () => {
  let service: ProxyConfigurationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProxyConfigurationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
