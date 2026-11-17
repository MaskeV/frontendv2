import { TestBed } from '@angular/core/testing';
import { LogServiceService } from './log-service.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('LogServiceService', () => {
  let service: LogServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(LogServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
