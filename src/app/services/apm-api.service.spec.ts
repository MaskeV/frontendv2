import { TestBed } from '@angular/core/testing';
import { ApmApiService } from './apm-api.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ApmApiService', () => {
  let service: ApmApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ApmApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
