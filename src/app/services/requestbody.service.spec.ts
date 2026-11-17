import { TestBed } from '@angular/core/testing';

import { RequestbodyService } from './requestbody.service';

describe('RequestbodyService', () => {
  let service: RequestbodyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RequestbodyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
