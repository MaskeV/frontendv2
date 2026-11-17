import { TestBed } from '@angular/core/testing';
import { DatabaseService } from './database-api.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('DatabaseApiService', () => {
  let service: DatabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(DatabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
