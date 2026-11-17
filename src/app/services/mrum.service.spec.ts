import { TestBed } from '@angular/core/testing';

import { MrumService } from './mrum.service';

describe('MrumService', () => {
  let service: MrumService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MrumService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
