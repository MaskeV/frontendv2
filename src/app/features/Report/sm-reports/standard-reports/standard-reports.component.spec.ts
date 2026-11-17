import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StandardReportsComponent } from './standard-reports.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('StandardReportsComponent', () => {
  let component: StandardReportsComponent;
  let fixture: ComponentFixture<StandardReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StandardReportsComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StandardReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
