import { TestBed } from '@angular/core/testing';

import { InterfaceConfigurationService } from './interface-configuration.service';

describe('InterfaceConfigurationService', () => {
  let service: InterfaceConfigurationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InterfaceConfigurationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
