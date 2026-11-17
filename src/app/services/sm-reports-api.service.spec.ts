import { TestBed } from '@angular/core/testing';
import { SmReportsApiService } from './sm-reports-api.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('SmReportsApiService', () => {
  let service: SmReportsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(SmReportsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
