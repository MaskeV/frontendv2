import { TestBed } from '@angular/core/testing';
import { OracleApiService } from './oracle-api.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('OracleApiService', () => {
  let service: OracleApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(OracleApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
