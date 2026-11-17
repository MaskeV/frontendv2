import { TestBed } from '@angular/core/testing';
import { ThresholdService } from './threshold.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ThresholdService', () => {
  let service: ThresholdService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ThresholdService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
