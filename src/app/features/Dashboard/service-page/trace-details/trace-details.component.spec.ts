import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TraceDetailsComponent } from './trace-details.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('TraceDetailsComponent', () => {
  let component: TraceDetailsComponent;
  let fixture: ComponentFixture<TraceDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TraceDetailsComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TraceDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
