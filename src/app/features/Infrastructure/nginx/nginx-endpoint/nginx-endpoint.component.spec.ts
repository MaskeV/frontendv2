import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NginxEndpointComponent } from './nginx-endpoint.component';

describe('NginxEndpointComponent', () => {
  let component: NginxEndpointComponent;
  let fixture: ComponentFixture<NginxEndpointComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NginxEndpointComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NginxEndpointComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
