import { TestBed } from '@angular/core/testing';
import { InfraService } from './infra.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('InfraService', () => {
  let service: InfraService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(InfraService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
