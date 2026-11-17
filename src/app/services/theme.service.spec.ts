import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('setMyTheme()', () => {

    service.setMyTheme("orange");
    const result = sessionStorage.getItem("themeColour")
    expect(result).toBe("orange");
    console.log(result)

  });

  it('getMyTheme()', () => {
    service.setMyTheme("orange");
    const result = service.getMyTheme();
    expect(result).toBe("orange");
    console.log(result);

  });
});
