import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AwsGatewayServiceComponent } from './aws-gateway-service.component';

describe('AwsGatewayServiceComponent', () => {
  let component: AwsGatewayServiceComponent;
  let fixture: ComponentFixture<AwsGatewayServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AwsGatewayServiceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AwsGatewayServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
