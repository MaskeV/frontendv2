import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationIpMappingComponent } from './application-ip-mapping.component';

describe('ApplicationIpMappingComponent', () => {
  let component: ApplicationIpMappingComponent;
  let fixture: ComponentFixture<ApplicationIpMappingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationIpMappingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplicationIpMappingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
