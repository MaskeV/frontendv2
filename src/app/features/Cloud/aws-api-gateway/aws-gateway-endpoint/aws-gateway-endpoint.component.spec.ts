import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AwsGatewayEndpointComponent } from './aws-gateway-endpoint.component';

describe('AwsGatewayEndpointComponent', () => {
  let component: AwsGatewayEndpointComponent;
  let fixture: ComponentFixture<AwsGatewayEndpointComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AwsGatewayEndpointComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AwsGatewayEndpointComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
