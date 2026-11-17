import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AwsApiGatewayComponent } from './aws-api-gateway.component';

describe('AwsApiGatewayComponent', () => {
  let component: AwsApiGatewayComponent;
  let fixture: ComponentFixture<AwsApiGatewayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AwsApiGatewayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AwsApiGatewayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
