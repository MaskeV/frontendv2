import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SrgLogsComponent } from './srg-logs.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { AppComponent } from '../../../../../app.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

// Mock AppComponent to satisfy DI or template dependency
@Component({ selector: 'app-root', template: '' })
class MockAppComponent { }

describe('SrgLogsComponent', () => {
  let component: SrgLogsComponent;
  let fixture: ComponentFixture<SrgLogsComponent>;

  beforeEach(async () => {
    const mockUser = {
      userId: 'testUserId',
    };
    sessionStorage.setItem('currentUser', JSON.stringify(mockUser));
    await TestBed.configureTestingModule({
      imports: [SrgLogsComponent, HttpClientTestingModule],
      declarations: [MockAppComponent],                     // mock for selector usage
      providers: [
        { provide: AppComponent, useClass: MockAppComponent },
        {
          provide: ActivatedRoute,
          useValue: {
            // Mock the data, whatever the component expects from ActivatedRoute
            params: of({ id: '123' }),
            queryParams: of({}),
            snapshot: { data: {} }
          }
        }
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(SrgLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Clean up mock after each test to avoid side effects
    sessionStorage.removeItem('currentUser');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
