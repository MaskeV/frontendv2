import { TestBed } from '@angular/core/testing';
import { LicenseService } from './license.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('LicenseService', () => {
  let service: LicenseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(LicenseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
