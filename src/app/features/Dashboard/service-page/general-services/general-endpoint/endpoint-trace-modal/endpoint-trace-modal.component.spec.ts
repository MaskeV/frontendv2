import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EndpointTraceModalComponent } from './endpoint-trace-modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('EndpointTraceModalComponent', () => {
  let component: EndpointTraceModalComponent;
  let fixture: ComponentFixture<EndpointTraceModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EndpointTraceModalComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EndpointTraceModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
