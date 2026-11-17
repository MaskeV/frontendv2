import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { RedisListComponent } from './redis-list.component';
import { of, Subject, throwError } from 'rxjs';
import { DateService } from '../../../../services/date.service';
import { RedisService } from '../../../../services/redis.service';
import { AuthenticationService } from '../../../../services/authentication.service';
import { DatabaseService } from '../../../../services/database-api.service';
import { LoggerService } from '../../../../services/logger.service';
import { Router } from '@angular/router';

describe('RedisListComponent', () => {
  let component: RedisListComponent;
  let fixture: ComponentFixture<RedisListComponent>;

  let mockDateService: any;
  let mockRedisService: any;
  let mockAuthService: any;
  let mockDatabaseService: any;
  let mockLoggerService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockDateService = {
      setActiveComponent: jest.fn(),
      activeComponent$: new Subject(),
      date$: new Subject()
    };

    mockAuthService = {
      currentUser: of({ userId: 'u1' })
    };

    mockRedisService = {
      getRedisListsAPI: jest.fn().mockReturnValue(of([{ redis: { meter_redis_connected_clients: 3 } }]))
    };

    mockDatabaseService = {
      // getAllAppListAndIpListByUserID: jest.fn().mockReturnValue(
      //   of({
      //     serviceResponse: ['redis-01'],
      //     serviceStatus: 'OK',
      //     serviceError: ''
      //   })
      // )
    };

    mockLoggerService = {
      getBrowserNameAndVersion: jest.fn().mockReturnValue({ name: 'Chrome', version: '123' })
    };

    mockRouter = {
      navigate: jest.fn(),
      url: '/redis'
    };

    await TestBed.configureTestingModule({
      imports: [RedisListComponent],
      providers: [
        { provide: DateService, useValue: mockDateService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: AuthenticationService, useValue: mockAuthService },
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: Router, useValue: mockRouter }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(RedisListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call initializeComponent() when date changes', fakeAsync(() => {
    const initSpy = jest.spyOn(component, 'initializeComponent');
    fixture.detectChanges();
    mockDateService.activeComponent$.next('RedisListComponent');
    mockDateService.date$.next({
      startdateTime: '2025-01-01 10:00:00',
      enddateTime: '2025-01-01 11:00:00'
    });
    tick();
    expect(initSpy).toHaveBeenCalled();
  }));

  it('should format date correctly', () => {
    const result = component.formatDate('2025-01-01 10:20:30');
    expect(result).toBe(20250101102030);
  });

  it('should load redis metrics data', fakeAsync(() => {
    component.startTime = 202501011000;
    component.endTime = 202501011100;
    component.serviceResponseList = ['redis-01'];
    component.loadData();
    tick();
    expect(mockRedisService.getRedisListsAPI).toHaveBeenCalledWith(
      202501011000,
      202501011100,
      ['redis-01']
    );
    expect(component.metricsData.length).toBe(1);
  }));

  it('should navigate to redis details on click', () => {
    component.gotoRedisDetails('redis-key-001');
    expect(sessionStorage.getItem('redis')).toBe('redis-key-001');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/redis/details']);
  });

  it('should paginate correctly', () => {
    component.filteredProcessList = Array.from({ length: 60 }, (_, i) => `item-${i}`);
    component.calculatePagination();
    expect(component.totalPages).toBe(3);
    expect(component.pagedProcessList.length).toBe(25);
  });

  it('should format uptime properly', () => {
    expect(component.formatUptime(0)).toBe('0m');
    expect(component.formatUptime(60)).toBe('1m');
    expect(component.formatUptime(3600)).toBe('1h');
    expect(component.formatUptime(90061)).toBe('1d 1h 1m');
  });

  it('should initialize component and load service list', fakeAsync(() => {
    const loadSpy = jest.spyOn(component, 'loadData');
    fixture.detectChanges();
    mockDateService.activeComponent$.next('RedisListComponent');
    mockDateService.date$.next({
      startdateTime: '2025-01-01 10:00:00',
      enddateTime: '2025-01-01 11:00:00'
    });
    tick();
    // expect(mockDatabaseService.getAllAppListAndIpListByUserID).toHaveBeenCalled();
    expect(loadSpy).toHaveBeenCalled();
  }));

  // Error Handling

  it('should handle error in getRedisLists() and set metricsData to empty array', fakeAsync(() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    mockRedisService.getRedisListsAPI.mockReturnValueOnce(
      throwError(() => "API Error")
    );
    component.getRedisLists();
    tick();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load Redis lists:",
      "API Error"
    );
    expect(component.metricsData).toEqual([]);
    consoleSpy.mockRestore();
  }));

  it('should handle error in initializeComponent() and set fallback values', fakeAsync(() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    // mockDatabaseService.getAllAppListAndIpListByUserID.mockReturnValueOnce(
    //   throwError(() => "DB API Failed")
    // );
    const loadSpy = jest.spyOn(component, 'loadData');
    component.initializeComponent();
    tick();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load app/ip list:",
      "DB API Failed"
    );
    expect(component.apiResponse).toEqual({
      serviceResponse: [],
      serviceStatus: "Failed",
      serviceError: "API error"
    });
    expect(component.serviceResponseList).toEqual([]);
    expect(loadSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  }));

  it('should filter metricsData based on searchQuery in onSearch()', () => {
    component.allMetricsData = [
      { 'redis-server-1': { meter_redis_connected_clients: 3 } },
      { 'redis-server-2': { meter_redis_connected_clients: 5 } },
      { 'other-server': { meter_redis_connected_clients: 1 } }
    ];
    component.metricsData = [...component.allMetricsData];

    // Search for "redis"
    component.searchQuery = 'redis';
    component.onSearch();
    expect(component.metricsData.length).toBe(2);
    expect(Object.keys(component.metricsData[0])[0]).toBe('redis-server-1');
    expect(Object.keys(component.metricsData[1])[0]).toBe('redis-server-2');

    // Search for "server-1"
    component.searchQuery = 'server-1';
    component.onSearch();
    expect(component.metricsData.length).toBe(1);
    expect(Object.keys(component.metricsData[0])[0]).toBe('redis-server-1');

    // Search for nothing (empty query)
    component.searchQuery = '';
    component.onSearch();
    expect(component.metricsData.length).toBe(3);

    // Search for non-existent
    component.searchQuery = 'xyz';
    component.onSearch();
    expect(component.metricsData.length).toBe(0);
  });

  it('should return correct image path', () => {
    expect(component.getImagePath('REDIS')).toContain('REDIS.png');
    expect(component.getImagePath('unknown')).toContain('UNDEFINED.png');
  });

  it('should fallback image on error', () => {
    const event = { target: { src: '' } } as any;
    component.onImageError(event);
    expect(event.target.src).toContain('UNDEFINED.png');
  });

});
