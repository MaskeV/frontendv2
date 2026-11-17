import { TestBed } from '@angular/core/testing';
import { DataDiscoverService } from './data-discover.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('DataDiscoverService', () => {
  let service: DataDiscoverService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(DataDiscoverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
