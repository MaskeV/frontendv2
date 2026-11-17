import { TestBed } from '@angular/core/testing';

import { NginxService } from './nginx.service';

describe('NginxService', () => {
  let service: NginxService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NginxService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
