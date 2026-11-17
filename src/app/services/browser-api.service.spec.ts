import { TestBed } from '@angular/core/testing';

import { BrowserApiService } from './browser-api.service';

describe('BrowserApiService', () => {
  let service: BrowserApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BrowserApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
