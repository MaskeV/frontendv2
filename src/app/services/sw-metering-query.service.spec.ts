import { TestBed } from '@angular/core/testing';
import { SwMeteringQueryService } from './sw-metering-query.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('SwMeteringQueryService', () => {
  let service: SwMeteringQueryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(SwMeteringQueryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
