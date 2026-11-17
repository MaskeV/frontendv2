import { TestBed } from '@angular/core/testing';

import { CustomDashboardThemeService } from './custom-dashboard-theme.service';

describe('CustomDashboardThemeService', () => {
  let service: CustomDashboardThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomDashboardThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
