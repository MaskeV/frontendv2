import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WindowDashboardComponent } from './window-dashboard.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('WindowDashboardComponent', () => {
  let component: WindowDashboardComponent;
  let fixture: ComponentFixture<WindowDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WindowDashboardComponent, HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            // Mock the data, whatever the component expects from ActivatedRoute
            params: of({ id: '123' }),
            queryParams: of({}),
            snapshot: { data: {} }
          }
        }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(WindowDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
