import { TestBed } from '@angular/core/testing';
import { MeteringConfigService } from './metering-config.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('MeteringConfigService', () => {
  let service: MeteringConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(MeteringConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
