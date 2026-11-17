import { TestBed } from '@angular/core/testing';

import { TableChartService } from './table-chart.service';

describe('TableChartService', () => {
  let service: TableChartService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TableChartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
